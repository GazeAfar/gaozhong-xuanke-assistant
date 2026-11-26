/**
 * 毕业年就业形势 AI 分析与预估模块（家长大白话 + 国内政策与体制/央国企特色版）：
 * 既看市场化产业趋势，也结合国内特色的国家电网、铁路系统、央国企、公务员/选调生、事业单位、公立医院等稳健去向。
 */

const TRACK_MACRO_OUTLOOK = {
  ai_cs: {
    trend: '市场机会多，考公进央国企也抢手',
    chinaSpecial:
      '【国内特色去向】国家电网（信息通信类）、三大运营商（移动/电信/联通）、国有大行金融科技岗、以及江苏省考/国考的“计算机类”岗位——计算机常年是公务员、事业单位和央国企招录人数最多的工科大类之一。',
    degreeGate:
      '【学历门槛实话】本科能报：绝大多数省考/国考计算机岗位、银行地市分行科技岗、运营商市分公司、中小型科技/软件公司工程开发；起步要硕士：AI 大模型算法研发、一线大厂核心研发岗、省会电网信息中心及部委/省级科研院所。',
    outlook:
      '到孩子毕业时，人工智能、网络安全和各行各业的软件系统依然很需要人。不过，以前那种“学个皮毛、写写简单代码”就能拿高薪的时代已经过去了，简单活以后会被 AI 工具替代，企业更愿意招懂核心技术、能解决复杂问题的人。',
    risks: '普通学校如果只学点基础编程、又没做过像样的项目，进互联网大厂竞争会非常激烈。',
    advice: '适合数学好、愿意钻研的孩子；本科毕业就有考公和软件工程退路，如果想冲 AI 算法或省级电网核心岗，建议把读研纳入规划。',
  },
  ee_auto: {
    trend: '电网/铁路/央国企最对口，工作稳当',
    chinaSpecial:
      '【国内特色去向】国家电网（供电系统，电气工程是最核心王牌专业）、中国铁路局/城市地铁（信号通信、供电、自动化）、中国电科/中航/中船等军工央企科研院所，以及江苏本地（苏锡常、南京）大量高端制造与芯片企业。',
    degreeGate:
      '【学历门槛实话】本科能报：铁路局/城市地铁运维与信号岗、江苏部分县级供电局及电建/新能源企业、制造企业自动化工程师；起步要硕士：江苏电网省公司及南京/苏州/无锡等苏南市局核心岗、芯片设计核心研发、中电科/军工科研院所。',
    outlook:
      '咱们国家一直在重点发展特高压电网、高铁轨交、芯片、新能源汽车和智能制造，电子信息、自动化、电气工程、集成电路都是实打实的硬需求，而且“软硬件结合”非常不容易被 AI 取代。',
    risks: '大学课程偏难，对物理和数学要求高；想去苏南市级电网、顶尖芯片大厂或军工院所，基本绕不开考研。',
    advice: '如果家里看重“稳当 + 有技术含量”，电气、自动化、电子信息非常扎实；想进苏南电网或科研院所，大三就要准备考研。',
  },
  mech_energy: {
    trend: '铁路/能源/高端制造央国企招人稳',
    chinaSpecial:
      '【国内特色去向】中国铁路系统（中铁、铁路局机务/车辆段，车辆工程/交通运输/铁道工程非常对口）、中车/中核/三桶油/五大发电集团等能源与装备央企，以及江苏本地的新能源汽车与机器人制造龙头。',
    degreeGate:
      '【学历门槛实话】本科能报：各铁路局机务段/车辆段/工务段、发电厂一线运行与检修、车企与装备制造厂生产/工艺工程师（本科校招盘子很大）；起步要硕士：中车/车企总院研发岗、核电/能源集团总部及省会设计研究院。',
    outlook:
      '跟房地产挂钩的传统土木确实在走下坡路，但铁路轨交运维、新能源汽车、电池储能、核电风电和高端装备制造都是国家长期兜底的基础设施和战略产业，岗位供给一直比较稳。',
    risks: '本科进铁路段、电厂或制造厂很多要从一线基层或倒班干起；如果不愿去一线车间，就需要通过读研往研发和设计院走。',
    advice: '选专业时尽量避开传统土木和老旧机械，优先靠向车辆工程、交通运输、能源与动力、智能制造、机器人或新材料方向。',
  },
  medicine: {
    trend: '公立医院与养老刚需，越老越吃香',
    chinaSpecial:
      '【国内特色去向】各级公立三甲/二甲医院（医疗事业编）、疾控中心、卫健委及医保局公务员/事业单位、以及大型国有医药企业与医疗器械研发单位。',
    degreeGate:
      '【学历门槛实话】本科能报：县级以下基层医院、社区卫生服务中心、药企医药代表/注册/质检、医疗器械技术支持；起步要硕士（甚至博士）：地级市及以上公立三甲医院临床医生、省市疾控中心核心岗、医药研发岗——临床医学本科毕业几乎进不了大城市三甲医院。',
    outlook:
      '未来十年我国老年人越来越多，看病、康复、吃药和养老都是绕不开的刚需，受经济波动影响极小。只要熬过前期的培养阶段，社会地位和工作稳定性都非常高。',
    risks: '临床医学读书时间很长（本科 5 年，再加读研和医院规培通常要 8 到 11 年），前期投入大、非常辛苦。',
    advice: '想当三甲医院医生必须做好读研/读博准备；如果不想读那么多年，本科直接就业可重点看药学、医学检验、康复治疗或医疗器械方向。',
  },
  econ_fin: {
    trend: '银行/财税考公有优势，但更挑学校牌子',
    chinaSpecial:
      '【国内特色去向】国家税务局、财政局、审计局、人民银行及金融监管局的公务员/事业单位（会计、审计、财务管理、经济金融是国考省考的招录大户），以及国有六大行、央国企财务与风控部门。',
    degreeGate:
      '【学历门槛实话】本科能报：国考税务局/海关基层岗、省考区县财政/审计岗、国有六大行地市支行及企业财务会计（本科招录量仍然很大）；起步要硕士：人民银行省会分行、省级金融监管局、头部券商投行/基金投研及国有银行总行/省行管培生。',
    outlook:
      '普通银行柜员、简单记账这类基础岗位未来会被软件和 AI 大量替代，以前“闭眼报金融就高薪”的时代已经过去。但体制内的财税审计、国有银行核心岗，以及帮中国企业做海外生意的跨境财务风控依然有稳健机会。',
    risks: '高端金融岗位极度看重 985/211 硕士牌子和实习背景，普通本科纯学理论的经管专业，毕业找高薪工作压力会比较大。',
    advice: '如果报经济、金融或财会，本科就业优先瞄准“财会/审计 + 考税务/国企财务”，想进金融机构总部则建议规划读研。',
  },
  law_pol: {
    trend: '考公考编路子最宽，警校政法有政策加分',
    chinaSpecial:
      '【国内特色去向】公检法系统（法院、检察院、公安机关）、纪检监察、党政机关公务员与选调生、国企法务合规部；如果选考了「思想政治」，还能报考公安院校（入警率高）及部分限定政治学科的政法与体制内岗位。',
    degreeGate:
      '【学历门槛实话】本科能报：公安院校联考入警、区县法院/检察院/司法局基层公务员（须过法考 A 证）、普通律所实习律师；起步要硕士：省市级法院/检察院、省级党政机关定向选调生、大型央国企总部法务及红圈/涉外头部律所。',
    outlook:
      '法学和公共管理最大的底气就是体制内招录盘子大、岗位多；同时随着企业出海、知识产权和网络数据合规越来越受重视，懂外语或懂技术的律师以后也很吃香。',
    risks: '法律职业资格考试（法考）和江苏公务员考试竞争都非常激烈；普通律所刚入行的年轻律师前几年收入偏低，熬出头需要时间。',
    advice: '本科毕业过法考就能考基层公检法，但如果目标是省市级公检法或大企业法务，建议大学期间同时准备法考和考研。',
  },
  edu_lit: {
    trend: '考公文字岗需求稳，教师编竞争加大',
    chinaSpecial:
      '【国内特色去向】各级政府机关、党委宣传/办公厅的文字综合类公务员与选调生（汉语言文学常年是文科考公第一大户）、公办中小学教师编（含公费师范生）、高校行政/辅导员及国企党群宣传岗。',
    degreeGate:
      '【学历门槛实话】本科能报：区县及乡镇机关文字综合公务员、普通县市公办中小学教师（公费师范生更有保障）、新媒体/跨境电商运营；起步要硕士：南京/苏州等重点城市重点中学教师编、高校辅导员/行政编、省市级选调生及主流媒体采编。',
    outlook:
      '因为新生儿减少，未来中小学教师的新增编制确实会比前些年少、竞争变大；但政府和国企里“会写材料、懂沟通”的文字综合岗位一直很缺人，外语好的孩子在跨境电商和企业海外业务里也有不少机会。',
    risks: '纯文科在市场上的通用岗位起薪通常不如热门工科，而且大城市好学校老师如今普遍卷到硕士起步。',
    advice: '本科直接考公/公费师范是稳妥路子；如果想留苏南大城市进好学校或高校当辅导员，大概率需要读研。',
  },
  geo_env: {
    trend: '自然资源/环保事业单位与测绘国企稳当',
    chinaSpecial:
      '【国内特色去向】自然资源局、生态环境局、气象局、水利局等公务员与事业单位，以及国有测绘院、规划设计院、环保水务集团和地图导航科技公司。',
    degreeGate:
      '【学历门槛实话】本科能报：区县自然资源/环保/水利基层岗位、测绘与环保工程企业现场技术岗；起步要硕士：省市级规划设计院、省气象/环保科研事业单位及大型国企研发部门。',
    outlook:
      '传统地产规划受大环境影响较大，但国家在生态环保、水利防灾、卫星遥感测绘和智慧城市建设上一直有持续投入，相关事业单位和国企设计院岗位比较稳。',
    risks: '总体招聘人数不如计算机、电气或法学那么多，省市级好院所普遍要求硕士学历。',
    advice: '如果对地理或环境感兴趣，优先挑和遥感测绘、地理信息系统（GIS）、环境工程、水利结合紧密的偏工科方向。',
  },
};

function buildHeuristicCareerOutlook(report) {
  const { examYear, gradYear, masterGradYear, recommendations } = report;

  const macroSummary =
    `按时间算，孩子 ${examYear} 年参加江苏高考，大约 ${gradYear} 年本科毕业（如果读研，大约 ${masterGradYear} 年步入社会）。` +
    `无论是走国内市场化企业、出国/涉外发展，还是冲刺体制与央国企，未来 5–8 年的就业大盘都绕不开下面四个大方向：`;

  const macroPillars = [
    {
      icon: '🌍',
      theme: 'blue',
      title: '全球大势与国际机会',
      body: 'AI 工具会在全球范围内替掉大量简单重复的坐办公室工作，但会用 AI、懂核心技术或能做跨文化沟通的人更值钱；同时中国汽车、机电、光伏、消费品与软件都在加速“出海”，懂专业又懂英语的孩子在跨境贸易、海外项目、外企及涉外服务上有很广的路子。',
    },
    {
      icon: '🏭',
      theme: 'teal',
      title: '国内市场大盘（大多数普通人的主战场）',
      body: '全社会 80% 以上的就业岗位依然在民营和市场化企业。未来需求最稳的三大块：一是江苏本地（南京、苏锡常）底子极厚的新能源、电子信息、机器人、生物医药与高端制造；二是人工智能、工业软件与数字化服务；三是我国人口老龄化带来的医疗、康复、养老与健康消费。',
    },
    {
      icon: '🏛',
      theme: 'green',
      title: '国内特色稳健去向（央国企与体制内）',
      body: '国家电网（供电系统）、中国铁路与地铁、三大运营商、国有银行、公立医院、以及公务员和事业单位，抗经济周期能力最强，是很多家庭眼里的“压舱石”。这类岗位非常看重专业对口（如电气、轨交、计算机、法学、财会、中文、临床医学）。',
    },
    {
      icon: '🎓',
      theme: 'amber',
      title: '行业分化与学历门槛（提前看清现实）',
      body: '与传统房地产挂钩的行业及纯打杂文职机会会越来越少。同时要看清学历分化：苏南市级电网、大城市三甲医院、省市选调生、高校辅导员和核心芯片/AI 算法岗基本起步要硕士；但民营制造与科技企业工程岗、电商/运营、铁路与电厂一线、银行支行及国考省考基层岗位，本科毕业依然可以直接报名。',
    },
  ];

  const shownTrackKeys = new Set();
  const top1Rec = recommendations[0] || null;

  const byCombination = recommendations.map((rec, idx) => {
    const stats = rec.majorStats;
    const hasPhyChem = rec.subjects.includes('PHYSICS') && rec.subjects.includes('CHEMISTRY');
    const hasPhy = rec.subjects.includes('PHYSICS');
    const hasBio = rec.subjects.includes('BIOLOGY');
    const hasPol = rec.subjects.includes('POLITICS');
    const hasGeo = rec.subjects.includes('GEOGRAPHY');

    // 按组合的特色科目优先排序（避免物化地/物化生/物化政都机械地展示相同的3个赛道）
    const preferredOrder = [];
    if (hasPhyChem) {
      if (hasBio) preferredOrder.push('medicine');
      if (hasPol) preferredOrder.push('law_pol');
      if (hasGeo) preferredOrder.push('geo_env');
      preferredOrder.push('ee_auto', 'ai_cs', 'mech_energy', 'econ_fin');
    } else if (hasPhy) {
      if (hasPol) preferredOrder.push('law_pol');
      if (hasGeo) preferredOrder.push('geo_env');
      preferredOrder.push('econ_fin', 'edu_lit', 'ee_auto');
    } else {
      // 偏文科（历史首选）专属主赛道
      if (hasPol) preferredOrder.push('law_pol');
      preferredOrder.push('edu_lit', 'econ_fin');
      if (hasGeo) preferredOrder.push('geo_env');
      if (hasBio) preferredOrder.push('medicine');
    }

    const strongPool = [...(stats?.strongTracks || [])].sort((a, b) => {
      const ia = preferredOrder.indexOf(a.key);
      const ib = preferredOrder.indexOf(b.key);
      const pa = ia === -1 ? 99 : ia;
      const pb = ib === -1 ? 99 : ib;
      if (pa !== pb) return pa - pb;
      return b.eligibleUndergrad - a.eligibleUndergrad;
    });

    // 首选组合展示 3 个核心方向；第 2、3 备选优先展示「首选未展开的特色/新增方向」，避免大片重复复制粘贴
    let pickedTracks = [];
    let reusedTrackLabels = [];
    if (idx === 0) {
      pickedTracks = strongPool.slice(0, 3);
    } else {
      const novel = strongPool.filter((t) => !shownTrackKeys.has(t.key));
      const shared = strongPool.filter((t) => shownTrackKeys.has(t.key));
      pickedTracks = novel.slice(0, 2);
      reusedTrackLabels = shared.slice(0, 3).map((t) => t.label);
      if (pickedTracks.length === 0) {
        pickedTracks = strongPool.slice(0, 1);
      }
    }
    for (const t of pickedTracks) {
      shownTrackKeys.add(t.key);
    }

    const topTracks = pickedTracks.map((t) => {
      const info = TRACK_MACRO_OUTLOOK[t.key] || {
        trend: '看学校和个人能力',
        chinaSpecial: '【国内特色去向】可关注对应行业央国企及省市事业单位对口招录。',
        degreeGate: '【学历门槛实话】本科可报基层与企业应用岗，省市级核心研发/机关选调多要求硕士。',
        outlook: '不同学校和细分方向差距较大，需要结合孩子兴趣和学校优势学科具体挑。',
        risks: '只学皮毛容易面临较大竞争。',
        advice: '大学期间尽早确定职业方向，多积累实习和项目经验。',
      };
      return {
        trackKey: t.key,
        trackLabel: t.label,
        coveragePct: t.coveragePct,
        eligibleUndergrad: t.eligibleUndergrad,
        sampleMajors: t.sampleMajors,
        ...info,
      };
    });

    // 生成本组相比首选的“差异化亮点”一句话
    let diffFromTop1 = '';
    if (idx > 0 && top1Rec) {
      const added = rec.subjects.filter((s) => !top1Rec.subjects.includes(s));
      const removed = top1Rec.subjects.filter((s) => !rec.subjects.includes(s));
      const nameMap = {
        PHYSICS: '物理',
        HISTORY: '历史',
        CHEMISTRY: '化学',
        BIOLOGY: '生物学',
        POLITICS: '思想政治',
        GEOGRAPHY: '地理',
      };
      const addNames = added.map((s) => nameMap[s]).join('、');
      const remNames = removed.map((s) => nameMap[s]).join('、');
      let benefit = '';
      if (added.includes('BIOLOGY') && hasPhyChem) {
        benefit = '多打通临床医学、口腔、生物医药（公立医院/药企），几乎全专业可报';
      } else if (added.includes('POLITICS')) {
        benefit = '多打通公安院校（入警）、政法及限定政治的体制内岗位';
      } else if (added.includes('GEOGRAPHY')) {
        benefit = '兼顾测绘/遥感/环保，背诵与计算负担更均衡';
      } else if (added.includes('HISTORY')) {
        benefit = '转为偏文路线，避开物理计算，主攻法学/财会/考公';
      } else if (added.includes('CHEMISTRY') && hasPhy) {
        benefit = '补齐“物理+化学”，解锁绝大部分理工、电网、铁路与医学专业';
      } else {
        benefit = '可结合孩子实际学习手感与学校开班二选一';
      }
      diffFromTop1 = `${remNames} → ${addNames}：${benefit}`;
    }

    let strategicSummary = '';
    if (hasPhyChem) {
      strategicSummary =
        `选「${rec.shortName}」最大的好处是“体制内外两头通吃”：江苏 2027 官方专业表里 ${stats.undergradCoveragePct}% 的本科专业都能报。` +
        `不管是冲国家电网（电气）、铁路系统（轨交/车辆）、军工与能源央企，还是进人工智能、芯片和江苏本地高端制造企业，或者考公报计算机/财会/法学岗位，路子几乎全通` +
        (hasBio
          ? '；再加上选了生物，连公立医院对口的临床医学和生物医药也能全覆盖。'
          : hasPol
          ? '；再加上选了政治，连公安院校、政法类和限定政治的体制内岗位也能同时兼顾！'
          : '；地理兼顾测绘/环保/智慧城市方向，容错率非常高。');
    } else if (hasPhy) {
      strategicSummary =
        `选「${rec.shortName}」能避开化学的拿分压力，目前能报 ${stats.undergradCoveragePct}% 的本科专业。` +
        `但家长一定要提前想清楚：国家电网最核心的电气专业、铁路系统的多数工科、以及计算机/临床医学等热门专业，现在江苏几乎都要求“物理和化学一起选”。不选化学的话，这些理工央国企和医院对口专业会大幅受限，以后更偏向考公（财会/法学/经济）、银行金融和不限选科的专业。`;
    } else {
      strategicSummary =
        `选「${rec.shortName}」是偏文科的历史路线，能报 ${stats.undergradCoveragePct}% 的本科专业。` +
        `这条路在国内最稳的落脚点，是围绕公务员、选调生、事业单位、国有银行和国企职能岗提前布局（比如法学、会计审计、汉语言文学、经济金融）` +
        (hasPol ? '；选了思想政治是一大亮点，报考公安院校（入警）、公检法与部分体制内定向岗位更有优势' : '') +
        '。电网、铁路工程和临床医学等理工岗位则基本不在这条路线上。';
    }

    return {
      combinationId: rec.id,
      displayName: rec.displayName,
      shortName: rec.shortName,
      diffFromTop1,
      reusedTrackLabels,
      strategicSummary,
      trackAnalyses: topTracks,
    };
  });

  return {
    mode: 'builtin_macro',
    modelName: '内置家长易懂版就业分析（全球趋势 + 国内市场大盘 + 国内特色与学历门槛）',
    disclaimer:
      '温馨提示：以上就业前景结合了全球产业变化、国内市场化大盘与体制政策趋势做参考预估，不是“包就业”的保证。最终选科请结合孩子自己的兴趣、能考上的学校层次和学习承受力一起商量。',
    macroSummary,
    macroPillars,
    byCombination,
  };
}

/**
 * 尝试调用用户配置的外部 OpenAI 兼容大模型 API；失败或未配置时自动降级到内置大白话研判。
 */
export async function generateCareerOutlook(report, aiConfig = {}) {
  const fallback = buildHeuristicCareerOutlook(report);

  const apiKey = (aiConfig.apiKey || process.env.OPENAI_API_KEY || '').trim();
  const baseUrl = (aiConfig.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
  const model = (aiConfig.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

  if (!apiKey) {
    return fallback;
  }

  const topSummary = report.recommendations
    .map(
      (r) =>
        `${r.rank}. ${r.displayName}（成绩综合分 ${r.compositeScore}，江苏2027官方库本科可报 ${r.majorStats.eligibleUndergrad}/${r.majorStats.totalUndergrad} 条即 ${r.majorStats.undergradCoveragePct}%；优势专业方向：${r.majorStats.strongTracks.slice(0, 3).map((t) => t.label).join('、')}；受限方向：${r.majorStats.restrictedTracks.slice(0, 2).map((t) => t.label).join('、') || '极少'}）`
    )
    .join('\n');

  const coreLine = (report.coreProfiles || [])
    .filter((p) => p.hasData)
    .map((p) => `${p.name} ${p.avgScore ?? '—'}/150（${p.trend}）`)
    .join('、');

  const prompt = `你是一位经验丰富、说话接地气的江苏高中生涯规划老师，正在面对面给一位高中生家长讲解选科和未来就业。
孩子预计【${report.examYear}年参加江苏高考 → ${report.gradYear}年本科毕业（若读研约${report.masterGradYear}年）】。

孩子语数外情况：${coreLine || '未录入'}
系统根据成绩推荐的前三组选科及真实官方库可报专业情况：
${topSummary}

要求：
1. 全部用通俗易懂的家长大白话来写，不要用行业黑话或英文缩写。
2. 必须充分结合国内特色就业去向、政策和真实的学历门槛（明确区分哪些岗位本科毕业就能直接报，哪些岗位比如苏南市级电网、三甲医院、省市选调、核心研发起步就要硕士研究生）。
3. 严格返回合法 JSON（不要用 markdown 代码块包裹），结构为：
{
  "macroSummary": "160字左右，用大白话讲清楚到孩子毕业那几年，国内体制/央国企线与市场产业线分别怎么看",
  "byCombination": [
    {
      "combinationId": "组合编码如 P_CG",
      "strategicSummary": "140字左右，用大白话告诉家长选这三科在电网/铁路/央国企/考公/大厂/医院等方面分别能走哪些路、有哪些要注意的坑"
    }
  ]
}
4. 语气客观实在、不制造焦虑、不夸大承诺。`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: '你是说话通俗易懂的江苏高中选科与就业分析老师，熟悉国内电网、铁路、央国企、考公考编与产业政策，只输出合法 JSON。' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ...fallback,
        aiErrorNote: `外部 AI 接口返回 HTTP ${res.status}，已自动回退至内置家长易懂版分析。`,
      };
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || '';
    const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    const mergedCombos = fallback.byCombination.map((base) => {
      const llmItem = Array.isArray(parsed.byCombination)
        ? parsed.byCombination.find((x) => x.combinationId === base.combinationId)
        : null;
      return {
        ...base,
        strategicSummary: llmItem?.strategicSummary || base.strategicSummary,
      };
    });

    return {
      mode: 'live_llm',
      modelName: `实时 AI 大模型（${model}）`,
      disclaimer: fallback.disclaimer,
      macroSummary: parsed.macroSummary || fallback.macroSummary,
      macroPillars: fallback.macroPillars,
      byCombination: mergedCombos,
    };
  } catch (err) {
    return {
      ...fallback,
      aiErrorNote: `外部 AI 调用超时或解析失败（${err?.message || 'network'}），已自动回退至内置家长易懂版分析。`,
    };
  }
}
