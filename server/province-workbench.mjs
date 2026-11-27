import { PROVINCE_REGISTRY } from './provinces.mjs';
import { COMBO_SEO_META } from './seo-pages.mjs';
import { COMBINATIONS } from './advisor.mjs';

const COMBINATION_NAME_BY_ID = new Map(COMBINATIONS.map((c) => [c.id, c.displayName]));
const DEFAULT_SITE_ORIGIN = 'https://xuanke.visc.cn';

function safeJsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDynamicExamYears() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const baseYear = m >= 9 ? y + 3 : y + 2;
  const labels = ['当前高一', '当前初三', '当前初二', '当前初一'];
  return labels.map((gradeLabel, offset) => ({
    year: baseYear + offset,
    label: `${baseYear + offset}年高考 · ${gradeLabel}`,
  }));
}

/**
 * 统一渲染各省完整选科分析工作台（/<province-slug>），
 * 新增 3+1+2 省份无需复制 500+ 行静态 HTML，自动注入省份配置与真实官方条数。
 */
export function renderProvinceWorkbenchPage(provinceMeta, store, siteOrigin = DEFAULT_SITE_ORIGIN) {
  const origin = String(siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  const stats = store.getStats(provinceMeta.code);
  const offeringsCount = stats.offeringsCount || 0;
  const offeringsStr = offeringsCount.toLocaleString('zh-CN');
  const slug = provinceMeta.slug;
  const name = provinceMeta.name;
  const fullName = provinceMeta.fullName;
  const shortGeo = provinceMeta.shortGeo;
  const mode = provinceMeta.mode;
  const authorityName = provinceMeta.authorityName;
  const authorityDept = provinceMeta.authorityDept;

  const canonicalUrl = `${origin}/${slug}`;
  const title = `${name}高中选科助手 - ${name}高一选科${mode}智能分析与专业覆盖率查询`;
  const description = `高中选科助手是面向高一学生与家长的免费新高考选科分析工具。${fullName}专区收录${authorityDept}公布的 ${offeringsStr} 条${shortGeo}招生高校专业选科要求，根据多次月考期中期末成绩与排名生成专属选科白皮书、组合覆盖率对比及毕业年就业趋势分析。`;
  const keywords = `高中选科,高一选科,高中选科助手,新高考选科,${mode}选科,${provinceMeta.keywordsExtra},选科专业覆盖率,物化生,物化地,物化政,史政地`;

  const provinceOptionsHtml = PROVINCE_REGISTRY.map(
    (p) =>
      `<option value="${escapeHtml(p.code)}" data-slug="${escapeHtml(p.slug)}"${
        p.code === provinceMeta.code ? ' selected' : ''
      }>${escapeHtml(p.fullName)} · ${escapeHtml(p.mode)}（已上线）</option>`
  ).join('\n              ');

  const examYearOptionsHtml = getDynamicExamYears()
    .map(
      (opt, idx) =>
        `<option value="${opt.year}"${idx === 0 ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
    )
    .join('\n              ');

  const gradeHeadersHtml = provinceMeta.grades
    .map((g) => `<th>${escapeHtml(g.grade)}</th>`)
    .join('\n                    ');
  const gradeRankHtml = provinceMeta.grades
    .map((g) => `<td>${escapeHtml(g.rankRange)}</td>`)
    .join('\n                    ');
  const gradeScoreHtml = provinceMeta.grades
    .map((g, i) => `<td>${i === 0 ? `<strong>${escapeHtml(g.scoreRange)}</strong>` : escapeHtml(g.scoreRange)}</td>`)
    .join('\n                    ');

  const comboLinksHtml = COMBO_SEO_META.map((m) => {
    const disp = COMBINATION_NAME_BY_ID.get(m.id) || m.shortName;
    return `<a href="/${escapeHtml(slug)}/${escapeHtml(m.slug)}" class="combo-link-card"><strong>${escapeHtml(m.shortName)}</strong><span>${escapeHtml(disp)}</span></a>`;
  }).join('\n            ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: '高中选科助手',
        alternateName: ['高一选科助手', `${name}高中选科助手`],
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: 'zh-CN',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CNY',
        },
        description: `面向高一学生与家长的免费新高考选科分析与专业覆盖率查询工具；${fullName}专区收录 ${offeringsStr} 条${shortGeo}招生高校专业选科要求，输出专属选科与就业白皮书。`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `高一选科${mode}应该怎么选最科学？`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: '建议结合高一多次月考、期中、期末的成绩与班级/年级排名百分位，同时对照目标省份高校专业选科覆盖率和未来本科毕业年份的就业趋势综合评估，避免只看单次原始分。',
            },
          },
          {
            '@type': 'Question',
            name: `${name}高中选科（${name}高一选科）12种组合中哪些专业覆盖率最高？`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `根据${fullName}公布的 ${offeringsStr} 条${shortGeo}招生高校专业选科要求，物理+化学+生物、物理+化学+地理、物理+化学+政治三种物理+化学组合的本科专业覆盖率均在95%以上，可报考绝大多数理工农医和文商科专业。`,
            },
          },
          {
            '@type': 'Question',
            name: `选历史方向（如史政地、史生地）在${name}能报考哪些大学专业？`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: '历史首选组合主要覆盖法学、汉语言文学、新闻传播、经济与金融财会、师范教育、公共管理及部分医药管理类专业；如包含思想政治，还可报考公安政法及部分限定政治学科的院校专业。',
            },
          },
        ],
      },
    ],
  };

  const clientConfig = {
    code: provinceMeta.code,
    slug: provinceMeta.slug,
    name: provinceMeta.name,
    fullName: provinceMeta.fullName,
    shortGeo: provinceMeta.shortGeo,
    mode: provinceMeta.mode,
    offeringsCount,
    offeringsStr,
    authorityName: provinceMeta.authorityName,
    authorityDept: provinceMeta.authorityDept,
    qrPath: provinceMeta.qrPath,
    storagePrefix: provinceMeta.storagePrefix,
    siteOrigin: origin,
    provinces: PROVINCE_REGISTRY.map((p) => ({
      code: p.code,
      slug: p.slug,
      name: p.name,
      fullName: p.fullName,
    })),
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta name="applicable-device" content="pc,mobile" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:site_name" content="高中选科助手" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(origin)}/logo.jpg?v=2" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <link rel="icon" type="image/jpeg" href="/logo.jpg?v=2" />
  <link rel="stylesheet" href="/styles.css?v=72" />
  <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-K9LT3P6G"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    window.__PROVINCE_CONFIG__ = ${safeJsonForScript(clientConfig)};
  </script>
  <script type="application/ld+json">${safeJsonForScript(jsonLd)}</script>
</head>
<body>
  <header class="topbar no-print" id="site-header">
    <div class="container topbar-inner">
      <a href="/${escapeHtml(slug)}" class="brand" id="province-brand-link" style="text-decoration:none;" title="返回${escapeHtml(name)}选科首页">
        <span class="brand-logo-wrap">
          <img class="brand-logo" src="/logo.jpg?v=2" alt="高中选科助手 Logo" width="52" height="52" />
        </span>
        <div class="brand-text">
          <h1>高中选科助手 · ${escapeHtml(name)}</h1>
          <p class="subtitle">${escapeHtml(fullName)} ${escapeHtml(mode)} 选科与就业分析 · ${escapeHtml(offeringsStr)} 个官方专业要求</p>
        </div>
      </a>

      <nav class="main-nav" id="main-nav" aria-label="主视图切换" role="tablist">
        <a href="/" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>首页</span>
        </a>
        <button type="button" class="nav-item nav-active" data-nav="section-input" role="tab" aria-selected="true">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>成绩录入</span>
        </button>
        <button type="button" class="nav-item" data-nav="report-root" role="tab" aria-selected="false">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>选科报告</span>
        </button>
        <button type="button" class="nav-item" data-nav="section-compare" role="tab" aria-selected="false">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>组合对比</span>
        </button>
        <button type="button" class="nav-item" data-nav="major-explorer" role="tab" aria-selected="false">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>院校专业</span>
        </button>
      </nav>

      <div class="topbar-actions">
        <button type="button" class="btn btn-secondary" id="btn-print-top" disabled>导出 PDF</button>
        <button
          type="button"
          class="nav-toggle portal-nav-toggle"
          id="btn-portal-nav-toggle"
          aria-label="展开站点导航"
          aria-expanded="false"
          aria-controls="portal-nav"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="main-nav portal-nav workbench-global-nav" id="portal-nav" aria-label="${escapeHtml(name)}选科导航">
        <a href="/" class="nav-item" style="text-decoration:none;">首页</a>
        <button type="button" class="nav-item nav-active" data-nav="section-input">成绩录入</button>
        <button type="button" class="nav-item" data-nav="report-root">选科报告</button>
        <button type="button" class="nav-item" data-nav="section-compare">组合对比</button>
        <button type="button" class="nav-item" data-nav="major-explorer">院校专业</button>
      </nav>
    </div>
  </header>

  <main class="container main-content">
    <section id="section-input" class="doc-sheet no-print view-panel" aria-label="成绩录入">
      <div class="section-header">
        <div>
          <h2>成绩录入</h2>
          <p class="hint">填写 1 次或多次月考/期中期末成绩，系统将结合${escapeHtml(fullName)}官方高校选科目录生成专属选科与就业白皮书</p>
        </div>
      </div>

      <div class="meta-grid">
        <label class="field">
          <span class="field-label">省份与模式</span>
          <div class="select-wrap" data-sheet-title="选择省份与模式">
            <select id="province-select" aria-label="选择高考省份">
              ${provinceOptionsHtml}
              <option value="MORE" disabled>更多省份陆续上线中（豫 / 浙 / 粤 / 鲁 / 湘 / 川等）</option>
            </select>
          </div>
        </label>

        <label class="field">
          <span class="field-label">高考年份</span>
          <div class="select-wrap" data-sheet-title="选择高考年份">
            <select id="exam-year">
              ${examYearOptionsHtml}
            </select>
          </div>
        </label>

        <label class="field">
          <span class="field-label">学生称呼（可选）</span>
          <input type="text" id="student-name" maxlength="20" placeholder="如：小明 / 高一2班" />
        </label>
      </div>

      <div class="exam-list-header">
        <h3>考试记录</h3>
        <button type="button" class="btn btn-secondary" id="btn-add-exam">+ 添加考试</button>
      </div>

      <div id="exams-container" class="exams-container"></div>

      <div class="exam-add-bottom">
        <button type="button" class="btn btn-add-dashed" id="btn-add-exam-bottom">+ 再添加一次考试成绩</button>
      </div>

      <div id="form-error" class="alert alert-error hidden" role="alert"></div>

      <div class="submit-bar">
        <span id="save-status" class="save-status" aria-live="polite"></span>
        <div class="submit-actions">
          <button type="button" class="btn btn-primary btn-lg" id="btn-generate">生成选科与就业白皮书</button>
          <div class="submit-sub-actions">
            <button type="button" class="btn btn-secondary" id="btn-save-draft">暂存成绩</button>
            <button type="button" class="btn btn-secondary hidden" id="btn-restore-snapshot">恢复暂存</button>
            <button type="button" class="btn btn-danger-text" id="btn-clear-all">清空全部</button>
          </div>
        </div>
      </div>
    </section>

    <section id="province-guide-section" class="guide-section no-print view-panel" aria-label="${escapeHtml(fullName)}新高考政策与选科常见问题">
      <div class="doc-sheet guide-sheet">
        <div class="guide-head">
          <div>
            <h2>${escapeHtml(fullName)}「${escapeHtml(mode)}」高考计分与赋分说明</h2>
            <p class="hint">帮${escapeHtml(name)}家长和同学用大白话看懂高考怎么算分、赋分制怎么换算以及高一选科常见问题</p>
          </div>
          <a href="/${escapeHtml(slug)}/fufenzhi" class="btn btn-secondary" style="text-decoration:none;">查看${escapeHtml(name)}等级赋分制详解 →</a>
        </div>

        <div class="policy-grid">
          <div class="policy-card policy-card-main">
            <h3>${escapeHtml(fullName)} ${escapeHtml(mode)} 怎么算总分（满分 750 分）</h3>
            <ul class="policy-list">
              <li><strong>「3」语数外（450 分 · 考多少算多少）</strong>：语文 150、数学 150、外语 150，直接按卷面原始分计入高考总分。</li>
              <li><strong>「1」物理或历史（100 分 · 考多少算多少）</strong>：物理和历史 2 选 1，也按卷面原始分计入，并分别划定「物理类」和「历史类」分数线。</li>
              <li><strong>「2」化/生/政/地 4 选 2（200 分 · 按全省排名赋分）</strong>：这两门不直接算卷面分，而是把全省选同一科的孩子从高到低排队后，按排名比例折算成 30~100 分。</li>
            </ul>
          </div>

          <div class="policy-card">
            <h3>${escapeHtml(name)}「五等级赋分制」是怎么算的？</h3>
            <p class="policy-desc">
              因为不同科目试卷难易不一样，${escapeHtml(name)}把每门再选科目的全省成绩分成 <strong>A / B / C / D / E 五个等级</strong>，再按等比例公式换算成最终高考分：
            </p>
            <div class="table-wrap" style="margin-top:10px;">
              <table class="data-table grade-table">
                <thead>
                  <tr>
                    <th>等级</th>
                    ${gradeHeadersHtml}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>全省排名</strong></td>
                    ${gradeRankHtml}
                  </tr>
                  <tr>
                    <td><strong>赋分区间(分)</strong></td>
                    ${gradeScoreHtml}
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="hint" style="margin-top:10px;">
              <strong>举个例子：</strong>假如化学卷子很难，孩子只考了 76 分，但全省大家都考得不高，孩子排在全省前 12%（进入 A 等级），最终赋分后反而能拿到 <strong>88 分</strong>左右。所以<strong>填写「班级排名 / 年级排名」比只填分数更准</strong>。
            </p>
          </div>
        </div>

        <div class="combo-links-block">
          <h3>${escapeHtml(name)} 12 种选科组合专业覆盖率详情</h3>
          <p class="hint" style="margin-bottom:12px;">点击任意组合，直接查看该组合在${escapeHtml(name)}可报考的本科/专科专业大类、代表专业与受限方向：</p>
          <div class="combo-links-grid">
            ${comboLinksHtml}
          </div>
        </div>

        <div class="faq-block">
          <h3>${escapeHtml(name)}高一选科常见问题</h3>
          <div class="faq-list">
            <details class="faq-item" open>
              <summary>${escapeHtml(name)} 12 种选科组合里，哪些能报的大学专业最多？</summary>
              <p>根据${escapeHtml(fullName)}公布的 ${escapeHtml(offeringsStr)} 条${escapeHtml(shortGeo)}招生高校专业选科要求，<strong>物化生、物化地、物化政</strong>三种「物理+化学」组合能报的本科专业都在 <strong>95% 以上</strong>，主流理工、医学和经管专业几乎都不受限制。</p>
            </details>
            <details class="faq-item">
              <summary>为什么建议多填几次月考或期中期末成绩？</summary>
              <p>高一单次考试偶然性比较大，填 2 次及以上成绩和排名后，系统能帮您看出孩子哪门课在<strong>稳步上升</strong>、哪门课波动较大，避免被一次考好或考砸误导。</p>
            </details>
            <details class="faq-item">
              <summary>物理实在学不进去，在${escapeHtml(name)}选历史方向好就业吗？</summary>
              <p>历史方向（如<strong>史政地、史生地</strong>）重点对应法学、汉语言文学、财会经管、师范与公共管理等专业；如果选了政治，还能报公安院校和部分限定政治的考公岗位，关键是把总分和学校层次拉上去。</p>
            </details>
            <details class="faq-item">
              <summary>在这里填写的孩子姓名和成绩会被别人看到吗？</summary>
              <p><strong>不会。</strong>您填写的成绩、排名和暂存记录都只保存在您自己的手机或电脑浏览器里，网站不会留存或备份您孩子的个人成绩，刷新不丢、点「清空全部」即可彻底删除。</p>
            </details>
          </div>
        </div>
      </div>
    </section>

    <article id="report-root" class="report-root view-panel hidden" aria-live="polite"></article>

    <section id="major-explorer" class="doc-sheet no-print view-panel hidden" aria-label="院校专业库">
      <div class="section-header">
        <div>
          <h2>${escapeHtml(shortGeo)}招生高校专业知识库</h2>
          <p class="hint">${escapeHtml(authorityDept)}公布 · 共 ${escapeHtml(offeringsStr)} 个高校专业选科要求</p>
        </div>
      </div>

      <div class="explorer-bar">
        <input type="search" id="major-search-input" placeholder="${escapeHtml(provinceMeta.sampleSearchPlaceholder)}" maxlength="50" />
        <div class="select-wrap explorer-select-wrap" data-sheet-title="选择选科组合">
          <select id="major-combo-filter" aria-label="按选科组合筛选"></select>
        </div>
        <div class="select-wrap explorer-select-wrap" data-sheet-title="选择学历层次">
          <select id="major-level-filter" aria-label="按学历层次筛选">
            <option value="本科">仅本科</option>
            <option value="专科">仅专科</option>
            <option value="ALL">全部层次</option>
          </select>
        </div>
        <button type="button" class="btn btn-primary" id="btn-search-majors">查询</button>
        <label class="switch-inline" for="major-only-eligible">
          <input type="checkbox" id="major-only-eligible" class="switch-input" checked />
          <span class="switch-track" aria-hidden="true"></span>
          <span class="switch-label">仅看可报</span>
        </label>
      </div>

      <div id="major-results-meta" class="hint" style="margin-bottom: 12px;"></div>
      <div class="mobile-scroll-hint no-print">← 左右滑动查看完整表格 →</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>院校</th>
              <th>层次</th>
              <th>专业名称</th>
              <th>选考要求</th>
              <th>匹配</th>
            </tr>
          </thead>
          <tbody id="major-results-body"></tbody>
        </table>
      </div>
      <div class="pager-bar">
        <button type="button" class="btn btn-secondary hidden" id="btn-load-more-majors">加载更多</button>
      </div>
    </section>

    <footer class="site-footer no-print" aria-label="网站底部信息">
      <div class="footer-grid">
        <div class="footer-brand-col">
          <div class="footer-brand-row">
            <img src="/logo.jpg?v=2" alt="高中选科助手" width="32" height="32" class="footer-logo" />
            <strong>高中选科助手</strong>
          </div>
          <p class="footer-desc">面向高一学生与家长的新高考选科决策与就业分析工具（支持 3+1+2 及规划中的 3+3 省份），基于官方高校专业选科目录提供免费、客观的数据参考。</p>
        </div>

        <div class="footer-links-col">
          <h4>选科专题与指南</h4>
          <ul>
            <li><a href="/${escapeHtml(slug)}" class="footer-link-btn">${escapeHtml(name)} ${escapeHtml(mode)} 选科分析</a></li>
            <li><a href="/${escapeHtml(slug)}/fufenzhi" class="footer-link-btn">${escapeHtml(name)}等级赋分制详解</a></li>
            <li><a href="/${escapeHtml(slug)}/wuhuadi" class="footer-link-btn">物化地专业覆盖率分析</a></li>
            <li><a href="/${escapeHtml(slug)}/wuhuasheng" class="footer-link-btn">物化生专业覆盖率分析</a></li>
            <li><a href="/${escapeHtml(slug)}/shizhengdi" class="footer-link-btn">史政地专业覆盖率分析</a></li>
          </ul>
        </div>

        <div class="footer-links-col">
          <h4>帮助与合规</h4>
          <ul>
            <li><a href="/privacy" class="footer-link-btn">隐私保护说明</a></li>
            <li><a href="/disclaimer" class="footer-link-btn">免责声明与数据来源</a></li>
            <li><a href="/contact" class="footer-link-btn">联系我们 / 意见反馈</a></li>
            <li><a href="/sitemap.xml" target="_blank" rel="noopener" class="footer-link-btn">站点地图（sitemap.xml）</a></li>
            <li><a href="/llms.txt" target="_blank" rel="noopener" class="footer-link-btn">AI 检索说明（llms.txt）</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© 2026 高中选科助手 · 保留所有权利</span>
        <span class="footer-bottom-note">本工具仅提供家庭选科决策数据参考，具体招生计划与选考要求请以${escapeHtml(authorityName)}当年正式公布为准。</span>
      </div>
    </footer>
  </main>

  <dialog id="confirm-dialog" class="confirm-dialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-desc">
    <div class="confirm-dialog-body">
      <div class="confirm-dialog-head">
        <h3 id="confirm-dialog-title" class="confirm-dialog-title">确认操作</h3>
        <button type="button" class="confirm-dialog-close" id="confirm-dialog-cancel" aria-label="关闭" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <p id="confirm-dialog-desc" class="confirm-dialog-desc"></p>
      <div class="confirm-dialog-actions">
        <button type="button" class="btn btn-primary" id="confirm-dialog-ok">确定</button>
      </div>
    </div>
  </dialog>

  <dialog id="mobile-select-sheet" class="bottom-sheet-dialog" aria-labelledby="mobile-select-sheet-title">
    <div class="bottom-sheet-panel">
      <div class="bottom-sheet-head">
        <h3 id="mobile-select-sheet-title" class="bottom-sheet-title">请选择</h3>
        <button type="button" class="confirm-dialog-close" id="mobile-select-sheet-close" aria-label="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div id="mobile-select-sheet-list" class="bottom-sheet-list" role="listbox"></div>
    </div>
  </dialog>

  <dialog id="pdf-guide-dialog" class="confirm-dialog" aria-labelledby="pdf-guide-title">
    <div class="confirm-dialog-body">
      <div class="confirm-dialog-head">
        <h3 id="pdf-guide-title" class="confirm-dialog-title">微信内如何保存白皮书 / 导出 PDF</h3>
        <button type="button" class="confirm-dialog-close" id="pdf-guide-close" aria-label="关闭" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <p class="confirm-dialog-desc" style="margin-bottom:12px;">
        微信内置浏览器不支持直接调用系统打印导出 PDF，你可以选择以下任意一种方式保存或分享：
      </p>
      <ol class="pdf-guide-steps">
        <li><strong>导出完整 PDF（自动带成绩）：</strong>保持本弹窗打开，直接点微信右上角 <strong>「···」</strong> → 选择 <strong>「在默认浏览器中打开」</strong>，系统会自动带入刚填好的全部成绩并生成白皮书，再点「导出 PDF」即可保存。</li>
        <li><strong>或复制专属链接 / 摘要：</strong>点击下方按钮复制带成绩的链接到手机浏览器打开，或直接复制文字摘要发到微信群。</li>
      </ol>
      <div id="pdf-copy-status" class="save-status" style="margin-bottom:12px;min-height:18px;" aria-live="polite"></div>
      <div class="pdf-guide-actions">
        <button type="button" class="btn btn-primary" id="btn-copy-page-link">复制带成绩链接</button>
        <button type="button" class="btn btn-secondary" id="btn-copy-summary">复制文字摘要</button>
      </div>
    </div>
  </dialog>

  <dialog id="share-report-dialog" class="confirm-dialog share-dialog" aria-labelledby="share-dialog-title">
    <div class="confirm-dialog-body share-dialog-body">
      <div class="confirm-dialog-head">
        <h3 id="share-dialog-title" class="confirm-dialog-title">分享选科报告</h3>
        <button type="button" class="confirm-dialog-close" id="share-dialog-close" aria-label="关闭" title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="share-tabs" role="tablist">
        <button type="button" class="share-tab is-active" data-share-tab="poster" role="tab" aria-selected="true">生成报告长图</button>
        <button type="button" class="share-tab" data-share-tab="link" role="tab" aria-selected="false">复制带成绩链接</button>
      </div>

      <div id="share-panel-poster" class="share-panel">
        <p class="share-tip">手机/微信端：<strong>长按下方图片</strong>即可直接「发送给朋友」或「保存到相册」</p>
        <div class="share-poster-wrap">
          <div id="share-poster-loading" class="hint" style="padding:24px 0;text-align:center;">正在生成高清报告长图...</div>
          <img id="share-poster-img" class="share-poster-img hidden" alt="${escapeHtml(name)}选科分析报告长图" />
        </div>
        <div class="share-panel-actions">
          <button type="button" class="btn btn-primary" id="btn-download-poster">下载高清图片</button>
          <button type="button" class="btn btn-secondary" id="btn-switch-to-link">改用链接分享</button>
        </div>
      </div>

      <div id="share-panel-link" class="share-panel hidden">
        <p class="share-tip">复制后直接粘贴发到微信群或另一半，对方点开即可<strong>自动带入全部成绩</strong>查看完整报告（成绩仅保存在链接本地片段中，网站不会留存）。</p>
        <pre id="share-link-preview" class="share-link-preview"></pre>
        <div id="share-copy-status" class="save-status" style="margin-bottom:10px;min-height:18px;" aria-live="polite"></div>
        <div class="share-panel-actions">
          <button type="button" class="btn btn-primary" id="btn-copy-share-bundle">一键复制标题与链接</button>
        </div>
      </div>
    </div>
  </dialog>

  <script src="/app.js?v=53"></script>
  <script>
    (function () {
      var btn = document.getElementById('btn-portal-nav-toggle');
      var nav = document.getElementById('portal-nav');
      var header = document.getElementById('site-header');
      if (!btn || !nav) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = nav.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (nav.classList.contains('nav-open') && header && !header.contains(e.target)) {
          nav.classList.remove('nav-open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    })();
  </script>
</body>
</html>`;
}
