# 高中选科助手 技术说明

版本：0.1　日期：2026年11月25日

## 技术选择建议

建议首版使用原生微信小程序加 TypeScript，科目推荐引擎在本机运行；公共规则与专业库通过云函数读取已发布数据。本机保存草稿和报告，不建立用户账号数据库。该选型服务于轻量和低维护目标，尚未作为用户最终决定。

云端建议微信云开发，使用云函数、数据库与文件存储。正式选定前验证账号可用性、配额、费用、环境地域、权限和隐私接口；当前微信开发文档页面未成功读取，不能把本说明视为已经验证的 SDK 接入指南。若已有后端基础设施，可评审独立 API 方案，但首版只落地一种，避免两套维护。

不引入微服务、支付、Redis、消息队列、AI API 或大型运营后台。数据发布采用受权限保护的本地维护脚本加发布命令，生产凭证不进入小程序包。

## 数据流

小程序读取公开 current 清单 → 缓存指定版本的省份规则 → 输入仅进入本机规则引擎 → 本机生成和保存报告。用户查询专业时，向云函数发送省份、资料年、查询关键词及可选组合；服务端只读取 published 数据。

自评和兴趣无需上传。专业意向在本机保存；服务器可以处理用户主动发起的搜索，但日志不保存原始检索词。微信云平台可能自动处理平台标识，具体字段和用途需在实现后核查隐私声明，不能宣称完全没有任何平台身份数据。

## 建议目录

| 路径 | 内容 |
| --- | --- |
| miniprogram/pages | 01 至 09 页面及各页 WXML WXSS TS JSON |
| miniprogram/components | 科目选择、组合卡片、来源标签、空状态 |
| miniprogram/services | 公共规则、专业查询、本机记录、埋点适配 |
| packages/rules-engine | 纯函数组合生成、约束、评分、解释 |
| packages/contracts | JSON Schema、类型、错误枚举 |
| cloudfunctions/public-api | 只读清单、专业搜索、详情 |
| cloudfunctions/feedback | 纠错写入与限流 |
| data/raw | 原始来源和使用说明，不进入客户端包 |
| data/normalized | 标准化数据及校验报告 |
| scripts | 导入、验证、预览差异、受控发布 |
| tests | 引擎真值表、接口、关键用户流程 |

## 引擎契约

evaluateSelection(input, context) 为同步纯函数。input 包含 provinceCode、examYear 可空、advantage 六科 1 至 5 或 null、interest 可空、preferredMajorIds、preserveMajors 布尔值、allowedCombinationIds 可空。未答与不了解在表单中区分，进入引擎时只允许已完成表单，null 表示显式不了解。

context 包含 algorithmVersion、provinceRule 和可选专业匹配摘要；网络、时钟和本机存储不允许出现在引擎内部。时间戳由调用者附加，不参与排序。只读引用类型和数值边界由 schema 校验。

输出包括 status、rankGroups、recommendations、allCombinations、excludedReasons、inputCompleteness、warnings 和版本。status 为 ranked、insufficient_input、no_feasible_combination 三种；无效输入抛结构化校验错误。allCombinations 中区分 ranked、needs_input、excluded；专业结论独立使用三态，不混成数值零分。

## 应用服务契约

下表为应用层 action 契约，建议通过一个 cloud.callFunction 调用封装传输，并非已部署的 HTTP 路由。所有请求包含 action、requestId 和 payload；响应为 ok、data 或 error、requestId、schemaVersion。服务端不信任客户端传入的身份或管理员标志。

| action | payload | data |
| --- | --- | --- |
| config.get | appVersion | supportedProvinces、availableYears、currentManifest、featureFlags |
| rules.get | provinceCode、ruleVersion | 已发布 ProvinceRule 及来源和哈希 |
| offerings.search | provinceCode、datasetVersion、q、combinationId 可空、cursor 可空、pageSize | items、nextCursor、scope、sourceSummary |
| offerings.get | id、datasetVersion | 条目原文、条件树、资料年、来源、审核状态 |
| offerings.match | provinceCode、datasetVersion、examYear、majorIds 最多 3 个、combinationIds 最多 12 个 | 各组合各目标的三态摘要、收录范围、完整度及可否作硬约束 |
| feedback.create | category、message、offeringId 可空、datasetVersion 可空 | feedbackId |

offerings.match 只接收用户主动查询的专业标识和组合，不接收优势、兴趣或整份报告。服务器应跨全部相关条目聚合，不能只看搜索首页就判定某个专业方向不满足。若资料完整度或目标年份状态不足，明确返回 cannotHardFilter，客户端仅展示参考提示。断网或查询失败时暂停该专业硬约束并提示用户选择重试或仅比较科目，不静默忽略。

pageSize 默认 20、最大 50；q 最大 50 字符，搜索去前后空格并限制通配符。cursor 为不透明值且绑定数据版本，版本失效返回 DATASET_CHANGED 并提示刷新。反馈 10 至 500 字，不收电话、成绩和孩子信息，提供原生平台反馈作为故障后备。

错误码：INVALID_INPUT、UNSUPPORTED_PROVINCE、YEAR_NOT_VERIFIED、DATASET_NOT_FOUND、DATASET_CHANGED、RATE_LIMITED、NETWORK_ERROR、INTERNAL_ERROR。未核实年份并不等于测算失败；客户端可切换为无专业库的科目比较模式。错误详情不泄露堆栈、凭证或数据库查询。

## 存储和版本

本机 key 使用 xuanke:v1:draft、reports、settings、publicManifest。数据带 schemaVersion，迁移失败只隔离对应旧数据并提示，不能清空全部记录。保存前检查大小，最多 20 份报告；用户输入不进入普通日志和崩溃信息。

报告包括本机 UUID、createdAt、inputSnapshot、resultSnapshot、algorithmVersion、provinceRuleVersion、datasetVersion 可空、examYear 和 referenceYear。重开旧报告读取快照；重算产生新 UUID。规则版本离线可用，专业服务在线查询；不把全量院校专业表塞入首包。

公共数据集合建议为 manifests、province_rules、datasets、offerings、sources，写权限仅发布服务身份。feedback 仅允许云函数校验后创建，客户端不可列举。索引先满足省份、版本、院校码与专业码过滤；小规模 MVP 使用标准化名称前缀及别名，不承诺任意全文检索。搜索性能不达标时再引入搜索服务。

## 安全和隐私

云端逐项白名单字段校验，数据库默认拒绝客户端直写。发布操作检查操作者身份、待发布哈希和审核状态，不能由普通小程序 action 触发。关键词做参数化处理，反馈中不执行 HTML；富文本来源经过过滤。

公开只读接口和反馈按环境可信上下文限流，限流细节不得依赖用户随意填写的 openid。限流键短期保存，用途及期限在上线前审查；建议最多 24 小时。反馈建议保留 90 天后删除；技术错误日志建议 7 天且不包含用户输入，均为待确定的保留策略。

非必要数据统计默认关闭；用户拒绝可选统计不阻挡核心功能。本机数据提供一键删除；云端匿名反馈通过反馈编号受控删除，不能公开按编号枚举内容。服务端自动备份和数据删除实际能力需在云环境验证并写入正式声明。

## 性能与成本目标

本机规则计算目标低端真机 100ms 内；已具备规则时从提交到报告首屏目标 1s 内；专业搜索目标 P95 2s 内。它们是待测的性能目标，不是已完成结果。首次联网加载单独衡量，禁止人为显示“分析中 10 秒”。

专业清单缓存以版本为单位，优先减少数据库重复读取。设置云费用告警和每日查询趋势；不在文档中虚构免费配额或月成本，待选定环境后按官方账单和试运行测算。成本过高时先关闭非核心分析与广告实验，不收紧已有免费报告。

## 构建与环境

使用开发、体验、生产三套配置或至少逻辑隔离，禁止测试数据进入正式发布指针。SDK 和工具版本在启动开发时依官方支持范围锁定并提交 lockfile，不预填猜测版本号。密钥经本机环境变量或云环境设置，仓库只保留变量名示例。

开发检查至少覆盖类型检查、格式检查、引擎测试、数据校验、小程序编译与真机流程。CI 必须阻止 unknown 未处理、测试样例误入正式库、来源缺失和版本不一致的数据发布。

## 微信平台待核查入口

云开发：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html

隐私授权：https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html

激励视频：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/ad/rewarded-video-ad.html

上述仅为官方复核入口；本次页面读取未成功，具体 API、基础库要求、隐私触发和广告资格仍需开发前或接入前验证，不将第三方教程当成已核实规范。
