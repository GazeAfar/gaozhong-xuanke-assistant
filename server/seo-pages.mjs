import { COMBINATIONS } from './advisor.mjs';

export const COMBO_SEO_META = [
  { id: 'P_CB', slug: 'wuhuasheng', shortName: '物化生', tag: '传统全理 · 专业最全' },
  { id: 'P_CG', slug: 'wuhuadi', shortName: '物化地', tag: '理工首选 · 记忆量适中' },
  { id: 'P_CP', slug: 'wuhuazheng', shortName: '物化政', tag: '理工 + 政法考公双通道' },
  { id: 'P_BG', slug: 'wushengdi', shortName: '物生地', tag: '偏理轻化学' },
  { id: 'P_BP', slug: 'wushengzheng', shortName: '物生政', tag: '物理 + 生物政法' },
  { id: 'P_PG', slug: 'wuzhengdi', shortName: '物政地', tag: '物理 + 偏文双科' },
  { id: 'H_PG', slug: 'shizhengdi', shortName: '史政地', tag: '传统纯文 · 考公法学首选' },
  { id: 'H_BG', slug: 'shishengdi', shortName: '史生地', tag: '偏文 + 生物地理' },
  { id: 'H_BP', slug: 'shishengzheng', shortName: '史生政', tag: '历史 + 政法生物' },
  { id: 'H_CG', slug: 'shihuadi', shortName: '史化地', tag: '历史 + 化学地理' },
  { id: 'H_CP', slug: 'shihuazheng', shortName: '史化政', tag: '历史 + 化学政治' },
  { id: 'H_CB', slug: 'shihuasheng', shortName: '史化生', shortNameAlt: '历化生', tag: '历史 + 化生' },
];

const COMBO_BY_SLUG = new Map(COMBO_SEO_META.map((m) => [m.slug, m]));
const COMBO_BY_ID = new Map(COMBO_SEO_META.map((m) => [m.id, m]));
const COMBINATION_NAME_BY_ID = new Map(COMBINATIONS.map((c) => [c.id, c.displayName]));

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_SITE_ORIGIN = 'https://xuanke.visc.cn';

function renderLayout({ title, description, keywords, jsonLd, bodyHtml, canonicalPath, siteOrigin = DEFAULT_SITE_ORIGIN }) {
  const origin = String(siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  const canonicalHref = `${origin}${canonicalPath}`;
  const isJiangsuPage = canonicalPath.startsWith('/jiangsu');

  const brandHref = isJiangsuPage ? '/jiangsu' : '/';
  const brandLinkTitle = isJiangsuPage ? '返回江苏选科首页' : '返回全国首页';
  const brandTitle = isJiangsuPage ? '高中选科助手 · 江苏' : '高中选科助手';
  const brandSubtitle = isJiangsuPage
    ? '江苏省 3+1+2 选科与就业分析 · 79,753 个官方专业要求'
    : '新高考智能选科、专业覆盖率与就业趋势分析';

  const headerNavHtml = isJiangsuPage
    ? `
      <nav class="main-nav" id="main-nav" aria-label="江苏选科导航">
        <a href="/" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>首页</span>
        </a>
        <a href="/jiangsu#section-input" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>成绩录入</span>
        </a>
        <a href="/jiangsu#report-root" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>选科报告</span>
        </a>
        <a href="/jiangsu#section-compare" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>组合对比</span>
        </a>
        <a href="/jiangsu#major-explorer" class="nav-item" style="text-decoration:none;">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>院校专业</span>
        </a>
      </nav>

      <div class="topbar-actions">
        <a href="/jiangsu" class="btn btn-primary" style="text-decoration:none;">去录入成绩</a>
        <button type="button" class="nav-toggle portal-nav-toggle" id="btn-portal-nav-toggle" aria-label="展开站点导航" aria-expanded="false" aria-controls="portal-nav">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="main-nav portal-nav workbench-global-nav" id="portal-nav" aria-label="江苏选科导航">
        <a href="/" class="nav-item" style="text-decoration:none;">首页</a>
        <a href="/jiangsu#section-input" class="nav-item" style="text-decoration:none;">成绩录入</a>
        <a href="/jiangsu#report-root" class="nav-item" style="text-decoration:none;">选科报告</a>
        <a href="/jiangsu#section-compare" class="nav-item" style="text-decoration:none;">组合对比</a>
        <a href="/jiangsu#major-explorer" class="nav-item" style="text-decoration:none;">院校专业</a>
      </nav>`
    : `
      <nav class="main-nav portal-nav" id="portal-nav" aria-label="专题导航">
        <a href="/" class="nav-item" style="text-decoration:none;">首页</a>
        <a href="/modes" class="nav-item ${canonicalPath === '/modes' ? 'nav-active' : ''}" style="text-decoration:none;">新高考模式</a>
        <a href="/fufenzhi" class="nav-item ${canonicalPath === '/fufenzhi' ? 'nav-active' : ''}" style="text-decoration:none;">赋分制详解</a>
        <a href="/contact" class="nav-item ${canonicalPath === '/contact' ? 'nav-active' : ''}" style="text-decoration:none;">联系我们</a>
      </nav>

      <div class="topbar-actions">
        <a href="/#province-picker" class="btn btn-primary" style="text-decoration:none;">选择省份测算</a>
        <button type="button" class="nav-toggle portal-nav-toggle" id="btn-portal-nav-toggle" aria-label="展开导航" aria-expanded="false" aria-controls="portal-nav">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>`;

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
  <link rel="canonical" href="${escapeHtml(canonicalHref)}" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:site_name" content="高中选科助手" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalHref)}" />
  <meta property="og:image" content="${escapeHtml(origin)}/logo.jpg?v=2" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" type="image/jpeg" href="/logo.jpg?v=2" />
  <link rel="stylesheet" href="/styles.css?v=71" />
  <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-K9LT3P6G"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
  </script>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <header class="topbar" id="site-header">
    <div class="container topbar-inner">
      <a href="${brandHref}" class="brand" style="text-decoration:none;" title="${escapeHtml(brandLinkTitle)}">
        <span class="brand-logo-wrap">
          <img class="brand-logo" src="/logo.jpg?v=2" alt="${escapeHtml(brandTitle)} Logo" width="52" height="52" />
        </span>
        <div class="brand-text">
          <h1>${escapeHtml(brandTitle)}</h1>
          <p class="subtitle">${escapeHtml(brandSubtitle)}</p>
        </div>
      </a>
      ${headerNavHtml}
    </div>
  </header>

  <main class="container main-content">
    ${bodyHtml}

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
            <li><a href="/jiangsu" class="footer-link-btn">江苏 3+1+2 选科专题</a></li>
            <li><a href="/fufenzhi" class="footer-link-btn">新高考等级赋分制详解</a></li>
            <li><a href="/jiangsu/wuhuadi" class="footer-link-btn">物化地专业覆盖率分析</a></li>
            <li><a href="/jiangsu/wuhuasheng" class="footer-link-btn">物化生专业覆盖率分析</a></li>
            <li><a href="/jiangsu/shizhengdi" class="footer-link-btn">史政地专业覆盖率分析</a></li>
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
        <span class="footer-bottom-note">本工具仅提供家庭选科决策数据参考，具体招生计划与选考要求请以各省教育考试院当年正式公布为准。</span>
      </div>
    </footer>
  </main>
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
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('nav-open');
          btn.setAttribute('aria-expanded', 'false');
        });
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

function renderJiangsuHubPage(store) {
  const statsMap = store.getComboMajorStats();
  const dsStats = store.getStats();

  const rowsHtml = COMBO_SEO_META.map((meta) => {
    const st = statsMap[meta.id];
    const displayName = COMBINATION_NAME_BY_ID.get(meta.id) || meta.shortName;
    if (!st) return '';
    return `
      <tr>
        <td><a href="/jiangsu/${meta.slug}" style="color:var(--primary-ink);font-weight:600;text-decoration:none;">${escapeHtml(displayName)}（${escapeHtml(meta.shortName)}）</a></td>
        <td>${escapeHtml(meta.tag)}</td>
        <td><strong class="${st.undergradCoveragePct >= 85 ? 'pct-high' : st.undergradCoveragePct >= 55 ? 'pct-mid' : 'pct-low'}">${st.undergradCoveragePct}%</strong> <span class="hint">(${st.eligibleUndergrad.toLocaleString()}/${st.totalUndergrad.toLocaleString()})</span></td>
        <td>${st.vocationalCoveragePct}% <span class="hint">(${st.eligibleVocational.toLocaleString()}/${st.totalVocational.toLocaleString()})</span></td>
        <td><a href="/jiangsu/${meta.slug}" class="btn btn-secondary" style="min-height:32px;padding:4px 12px;font-size:12.5px;text-decoration:none;">查看详情 →</a></td>
      </tr>
    `;
  }).join('');

  const title = '江苏高中选科与高一选科指南（3+1+2全12种组合专业覆盖率总览）- 高中选科助手';
  const description = `基于江苏省教育考试院公布的 ${dsStats.offeringsCount.toLocaleString()} 条在苏招生高校专业选科要求，全面对比江苏高中选科（江苏高一选科、南京高中选科）3+1+2 全部 12 种组合本科/专科专业覆盖率与选科建议。`;
  const keywords = '江苏高中选科,江苏高一选科,南京高中选科,南京高一选科,江苏3+1+2选科,江苏选科专业覆盖率,物化生,物化地,史政地';

  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">江苏高中选科（3+1+2）全 12 种组合指南</h2>
            <p class="hint">依据江苏省官方公布的 ${dsStats.offeringsCount.toLocaleString()} 条在苏招生高校专业选科要求实时统计</p>
          </div>
          <a href="/" class="btn btn-primary" style="text-decoration:none;">录入成绩生成白皮书 →</a>
        </div>
        <div class="report-meta-tags">
          <span class="pill pill-success">江苏省 3+1+2</span>
          <span class="pill">涵盖 ${dsStats.offeringsCount.toLocaleString()} 条官方专业</span>
          <span class="pill">适用于南京、苏州、无锡等江苏各地高一学生</span>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、江苏 12 种选科组合官方专业覆盖率总表</h3>
        <p class="policy-desc" style="margin-bottom:14px;">点击任意组合名称，可查看该组合可报考的具体专业大类、代表专业及受限方向详情：</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>选科组合</th>
                <th>组合特点</th>
                <th>本科可报比例</th>
                <th>专科可报比例</th>
                <th>详情页</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、江苏新高考 3+1+2 选科核心原则</h3>
        <div class="policy-grid" style="margin-bottom:0;">
          <div class="policy-card policy-card-main">
            <h3>物理类 vs 历史类怎么定？</h3>
            <p class="policy-desc">物理与历史按原始分计入总分，且招生时分开划线。若目标偏向计算机、人工智能、电子信息、电气自动化、临床医学或绝大多数工科专业，建议首选物理并搭配化学；若物理明显吃力、文史政表现突出，则首选历史，聚焦法学、汉语言、财会经管与体制内方向。</p>
          </div>
          <div class="policy-card">
            <h3>再选科目看「全省排位」而非绝对分</h3>
            <p class="policy-desc">化学、生物、政治、地理实行江苏省五等级等比例赋分制（A/B/C/D/E 对应 100~30 分）。想了解详细换算规则，请查看 <a href="/fufenzhi" style="color:var(--primary-ink);font-weight:600;">《江苏等级赋分制详解与对照表》</a>。</p>
          </div>
        </div>
      </section>
    </article>
  `;

  return renderLayout({
    title,
    description,
    keywords,
    canonicalPath: '/jiangsu',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      inLanguage: 'zh-CN',
      publisher: { '@type': 'Organization', name: '高中选科助手' },
    },
    bodyHtml,
  });
}

function renderJiangsuFufenzhiPage() {
  const title = '江苏省高考等级赋分制详解（3+1+2五等级比例、换算公式与实例）- 高中选科助手';
  const description =
    '专为江苏高一学生与家长整理的江苏省 3+1+2 等级赋分制详解：完整介绍化学、生物、政治、地理五等级（A/B/C/D/E）比例、100~30 分赋分区间、等比例转换计算公式及真题举例。';
  const keywords = '江苏等级赋分制,江苏赋分制怎么算,江苏3+1+2赋分对照表,江苏高考赋分公式,江苏高一选科';

  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <p class="hint" style="margin-bottom:6px;"><a href="/" style="color:var(--muted);text-decoration:none;">首页</a> / <a href="/jiangsu" style="color:var(--muted);text-decoration:none;">江苏选科分析</a> / 江苏等级赋分制详解</p>
            <h2 class="report-title">江苏省高考「等级赋分制」详解与换算实例</h2>
            <p class="hint">面向江苏高一学生与家长的大白话指南 · 搞懂化学、生物、政治、地理最终得分怎么来</p>
          </div>
          <a href="/jiangsu" class="btn btn-primary" style="text-decoration:none;">去江苏选科分析测算 →</a>
        </div>
      </div>

      <section class="doc-section">
        <h3 class="doc-h3">一、江苏高考 750 分里，哪些科目要赋分？</h3>
        <ul class="policy-list">
          <li><strong>不赋分（550 分 · 考多少算多少）</strong>：语文（150）、数学（150）、外语（150）以及首选科目「物理」或「历史」（100），全部直接按卷面原始分计入总分。</li>
          <li><strong>必须赋分（200 分 · 按全省排名折算）</strong>：在<strong>化学、生物学、思想政治、地理</strong> 4 门中选考的 2 门（每门满分 100 分），不按卷面分直接相加，而是按全省选考同一科目的考生排名进行五等级赋分。</li>
        </ul>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、江苏省五等级人数比例与赋分区间表</h3>
        <div class="table-wrap">
          <table class="data-table grade-table">
            <thead>
              <tr>
                <th>等级</th>
                <th>A 等级</th>
                <th>B 等级</th>
                <th>C 等级</th>
                <th>D 等级</th>
                <th>E 等级</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>全省排名比例</strong></td>
                <td>前 15%</td>
                <td>15% ~ 50%</td>
                <td>50% ~ 85%</td>
                <td>85% ~ 98%</td>
                <td>后 2%</td>
              </tr>
              <tr>
                <td><strong>转换赋分区间(分)</strong></td>
                <td><strong>100 ~ 86</strong></td>
                <td>85 ~ 71</td>
                <td>70 ~ 56</td>
                <td>55 ~ 41</td>
                <td>40 ~ 30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">三、江苏赋分是怎么一步步算出来的？（附真实例子）</h3>
        <p class="policy-desc" style="margin-bottom:12px;">
          江苏省采用<strong>等比例转换公式</strong>：先把全省同科考生的原始分按比例划进 A~E 五个等级，再根据孩子原始分在本等级里的相对位置，按比例映射到对应的赋分区间（四舍五入取整）。
        </p>
        <div class="policy-card policy-card-main">
          <h3>举个江苏家长一看就懂的例子</h3>
          <p class="policy-desc">
            假设某年江苏高考<strong>化学</strong>试卷偏难，全省选化学的考生中，前 15%（A 等级）的卷面原始分落在 <strong>74 分 ~ 96 分</strong>之间。孩子卷面考了 <strong>80 分</strong>（落在 A 等级内）：<br/>
            按照等比例公式换算：<code>(96 - 80) ÷ (80 - 74) = (100 - 最终赋分) ÷ (最终赋分 - 86)</code>，算出来最终高考化学得分约 <strong>90 分</strong>（比卷面还高了 10 分！）。<br/>
            反之，如果某门选考卷子特别简单，大家普遍考 90 分，卷面 85 分可能只排在 B 等级，赋分后反而会比卷面略低。
          </p>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">四、给江苏高一选科的 2 条实用建议</h3>
        <ul class="policy-list">
          <li><strong>看排名比看卷面分更靠谱</strong>：因为赋分看的是相对位次，在 <a href="/jiangsu" style="color:var(--primary-ink);font-weight:600;">江苏选科分析</a> 中录入孩子多次月考/期中期末的「班级排名 / 年级排名」，比只填分数更能反映真实赋分潜力。</li>
          <li><strong>兼顾专业覆盖率</strong>：如果孩子物理、化学排名稳健，优先保留「物理+化学」可覆盖江苏 95% 以上本科专业；也可查看 <a href="/fufenzhi" style="color:var(--primary-ink);font-weight:600;">全国各省赋分制对比</a> 了解更多模式差异。</li>
        </ul>
      </section>
    </article>
  `;

  return renderLayout({
    title,
    description,
    keywords,
    canonicalPath: '/jiangsu/fufenzhi',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      inLanguage: 'zh-CN',
      publisher: { '@type': 'Organization', name: '高中选科助手' },
    },
    bodyHtml,
  });
}

function renderFufenzhiPage() {
  const title = '新高考等级赋分制怎么算？全国3+1+2五等级与3+3各省赋分对照表详解 - 高中选科助手';
  const description =
    '全面解读全国新高考等级赋分制计算原理，包含江苏/广东/湖北等 3+1+2 省份通用的五等级（A/B/C/D/E，100-30分）赋分表，以及浙江、山东、北京、天津、上海、海南等 3+3 省市赋分档位差异对照。';
  const keywords = '等级赋分制,新高考赋分怎么算,3+1+2五等级赋分表,3+3赋分对照表,江苏赋分制,浙江赋分,山东赋分,高一选科赋分';

  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">新高考「等级赋分制」全国详解与各省对照表</h2>
            <p class="hint">一文搞懂 3+1+2 与 3+3 省份的赋分差异，以及为什么班级/年级排名比卷面分更重要</p>
          </div>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、每个省都是赋分制吗？哪些科目需要赋分？</h3>
        <ul class="policy-list">
          <li><strong>所有新高考省市（29 个）均实行等级赋分制</strong>，仅新疆、西藏等少数传统文理分科地区全部按原始分计分。</li>
          <li><strong>「3+1+2」省份（23 个省市区）</strong>：语文、数学、外语 + 首选科目（物理/历史）按<strong>原始分</strong>计入；仅 <strong>2 门再选科目</strong>（化、生、政、地 4 选 2）实行等级赋分。</li>
          <li><strong>「3+3」省市（6 个省市）</strong>：仅语数外按原始分计入；<strong>3 门选考科目全部实行等级赋分</strong>。</li>
        </ul>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、「3+1+2」省份通用：五等级等比例转换赋分表（含江苏等 23 省）</h3>
        <p class="policy-desc" style="margin-bottom:12px;">江苏、广东、湖北、湖南、河北、辽宁、福建、重庆、四川、安徽、江西、河南、陕西等 3+1+2 省市普遍采用五等级等比例转换赋分：</p>
        <div class="table-wrap">
          <table class="data-table grade-table">
            <thead>
              <tr>
                <th>等级</th>
                <th>A 等级</th>
                <th>B 等级</th>
                <th>C 等级</th>
                <th>D 等级</th>
                <th>E 等级</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>全省考生人数比例</strong></td>
                <td>前 15%</td>
                <td>15% ~ 50%（35%）</td>
                <td>50% ~ 85%（35%）</td>
                <td>85% ~ 98%（13%）</td>
                <td>后 2%</td>
              </tr>
              <tr>
                <td><strong>转换赋分区间</strong></td>
                <td><strong>100 ~ 86 分</strong></td>
                <td>85 ~ 71 分</td>
                <td>70 ~ 56 分</td>
                <td>55 ~ 41 分</td>
                <td>40 ~ 30 分</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="policy-desc" style="margin-top:14px;">
          <strong>白话举例：</strong>假设某年高考化学试卷很难，你卷面只考了 76 分，但因为全省大家考得都不高，你排在全省前 12%（进入 A 等级），最终赋分后可能拿到 <strong>88 分</strong>；反之如果某科试卷极简单，卷面 85 分却只排在全省前 40%（B 等级），最终赋分可能只有 <strong>78 分</strong>。
        </p>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">三、「3+3」省市等级赋分档位差异一览</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>省市</th>
                <th>选考模式</th>
                <th>赋分等级数</th>
                <th>单科赋分区间</th>
                <th>规则特点</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>浙江省</strong></td>
                <td>7 选 3</td>
                <td>20 个等级</td>
                <td><strong>100 ~ 40 分</strong></td>
                <td>相邻等级相差 3 分，起点分 40 分</td>
              </tr>
              <tr>
                <td><strong>山东省</strong></td>
                <td>6 选 3</td>
                <td>8 个等级</td>
                <td><strong>100 ~ 21 分</strong></td>
                <td>比例 3%/7%/16%/24%/24%/16%/7%/3%，等比例转换</td>
              </tr>
              <tr>
                <td><strong>北京市 / 天津市</strong></td>
                <td>6 选 3</td>
                <td>21 个等级</td>
                <td><strong>100 ~ 40 分</strong></td>
                <td>相邻等级相差 3 分，起点分 40 分</td>
              </tr>
              <tr>
                <td><strong>上海市</strong></td>
                <td>6 选 3</td>
                <td>11 个等级</td>
                <td><strong>70 ~ 40 分</strong></td>
                <td>单科满分 70 分，相邻等级相差 3 分</td>
              </tr>
              <tr>
                <td><strong>海南省</strong></td>
                <td>6 选 3</td>
                <td>标准分转换</td>
                <td>综合标准分</td>
                <td>按全省考生排位转换为标准分计入总分</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">四、对高一选科的实操建议</h3>
        <p class="policy-desc">
          无论 3+1+2 还是 3+3，等级赋分的核心都是看你在同科考生中的<strong>相对排位</strong>。因此在高一阶段评估选考科目时，不要只盯着单次卷面绝对分，建议在 <a href="/" style="color:var(--primary-ink);font-weight:600;">高中选科助手</a> 中选择所在省份，录入多次月考/期中期末的<strong>班级排名或年级排名</strong>，并结合 <a href="/modes" style="color:var(--primary-ink);font-weight:600;">全国新高考模式详解</a> 综合决策。
        </p>
      </section>
    </article>
  `;

  return renderLayout({
    title,
    description,
    keywords,
    canonicalPath: '/fufenzhi',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      inLanguage: 'zh-CN',
      publisher: { '@type': 'Organization', name: '高中选科助手' },
    },
    bodyHtml,
  });
}

function renderComboDetailPage(store, meta) {
  const statsMap = store.getComboMajorStats();
  const st = statsMap[meta.id];
  if (!st) return null;

  const displayName = COMBINATION_NAME_BY_ID.get(meta.id) || meta.shortName;
  const title = `江苏高一选科「${meta.shortName}」（${displayName}）可报专业覆盖率与选科分析 - 高中选科助手`;
  const description = `江苏高中选科选择「${displayName}（${meta.shortName}）」：本科专业覆盖率 ${st.undergradCoveragePct}%（可报 ${st.eligibleUndergrad.toLocaleString()} 条），专科覆盖率 ${st.vocationalCoveragePct}%。查看主要可报专业大类、受限方向与选科建议。`;
  const keywords = `${meta.shortName},江苏${meta.shortName},江苏高中选科${meta.shortName},${displayName}能报什么专业,江苏高一选科`;

  const strongTracksHtml = (st.strongTracks || [])
    .slice(0, 8)
    .map(
      (t) => `
      <div class="track-item">
        <div class="track-head">
          <span>${escapeHtml(t.label)}</span>
          <span class="track-pct-tag">${t.coveragePct}% 可报（${t.eligibleUndergrad} 条）</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${t.coveragePct >= 85 ? '' : 'progress-fill-blue'}" style="width:${Math.min(100, t.coveragePct)}%"></div>
        </div>
        <div class="track-samples">代表专业：${escapeHtml((t.sampleMajors || []).join('、') || '—')}</div>
      </div>
    `
    )
    .join('');

  const restrictedText =
    st.restrictedTracks && st.restrictedTracks.length > 0
      ? st.restrictedTracks.map((t) => `${t.label}（仅 ${t.coveragePct}% 可报）`).join('；')
      : '几乎无明显大类专业限制，绝大多数理工、医学与文商科专业均可报考。';

  const siblingLinks = COMBO_SEO_META.filter((m) => m.id !== meta.id)
    .map(
      (m) =>
        `<a href="/jiangsu/${m.slug}" class="pill" style="text-decoration:none;">${escapeHtml(m.shortName)}（${statsMap[m.id]?.undergradCoveragePct ?? '--'}%）</a>`
    )
    .join('');

  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <p class="hint" style="margin-bottom:6px;"><a href="/" style="color:var(--muted);text-decoration:none;">首页</a> / <a href="/jiangsu" style="color:var(--muted);text-decoration:none;">江苏 3+1+2 选科</a> / ${escapeHtml(meta.shortName)}</p>
            <h2 class="report-title">${escapeHtml(displayName)}（${escapeHtml(meta.shortName)}）选科分析</h2>
            <p class="hint">${escapeHtml(meta.tag)} · 基于江苏省官方在苏招生专业选科目录实时统计</p>
          </div>
          <a href="/jiangsu" class="btn btn-primary" style="text-decoration:none;">用我的成绩测算此组合 →</a>
        </div>
        <div class="report-meta-tags">
          <span class="pill pill-success">本科可报 ${st.undergradCoveragePct}%（${st.eligibleUndergrad.toLocaleString()} / ${st.totalUndergrad.toLocaleString()}）</span>
          <span class="pill">专科可报 ${st.vocationalCoveragePct}%（${st.eligibleVocational.toLocaleString()} / ${st.totalVocational.toLocaleString()}）</span>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、主要可报考专业大类与代表专业</h3>
        <div class="track-grid">${strongTracksHtml}</div>
        <div class="restricted-callout"><strong>受限方向提醒：</strong>${escapeHtml(restrictedText)}</div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、对比江苏其他 11 种选科组合</h3>
        <div class="report-meta-tags" style="margin-top:0;">${siblingLinks}</div>
      </section>
    </article>
  `;

  return renderLayout({
    title,
    description,
    keywords,
    canonicalPath: `/jiangsu/${meta.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      inLanguage: 'zh-CN',
      publisher: { '@type': 'Organization', name: '高中选科助手' },
    },
    bodyHtml,
  });
}

function renderModesPage() {
  const title = '全国新高考模式详解（3+1+2 与 3+3 区别、各省名单与选科规则）- 高中选科助手';
  const description =
    '全面对比全国新高考 3+1+2 与 3+3 两种主流模式的科目组合数量、原始分与等级赋分计分差异、物理类/历史类划线规则及全国各省市实行名单，帮高一学生与家长快速看懂新高考。';
  const keywords = '新高考模式,3+1+2和3+3区别,新高考各省模式一览表,高中选科模式,高一选科指南';

  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">全国新高考模式详解（3+1+2 与 3+3 全省对照）</h2>
            <p class="hint">一文看懂两种主流新高考选科规则、计分方式差异与各省市对应名单</p>
          </div>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、3+1+2 与 3+3 核心区别对照表</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>对比维度</th>
                <th>「3+1+2」模式</th>
                <th>「3+3」模式</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>必考统考科目</strong></td>
                <td>语文、数学、外语（各 150 分，原始分）</td>
                <td>语文、数学、外语（原始分，总分依各省规定）</td>
              </tr>
              <tr>
                <td><strong>选考科目规则</strong></td>
                <td>物理/历史 <strong>2 选 1</strong>（首选）+ 化/生/政/地 <strong>4 选 2</strong>（再选）</td>
                <td>物/化/生/政/史/地 <strong>6 选 3</strong>（浙江含技术为 7 选 3）</td>
              </tr>
              <tr>
                <td><strong>合法组合数量</strong></td>
                <td>共 <strong>12 种</strong>选科组合</td>
                <td>共 <strong>20 种</strong>（浙江省 35 种）选科组合</td>
              </tr>
              <tr>
                <td><strong>计分与赋分方式</strong></td>
                <td>语数外 + 首选科目按<strong>原始分</strong>；2 门再选科目按<strong>等级赋分</strong></td>
                <td>语数外按原始分；3 门选考科目<strong>全部按等级赋分</strong></td>
              </tr>
              <tr>
                <td><strong>招生划线方式</strong></td>
                <td>分「物理科目类」「历史科目类」分别划线录取</td>
                <td>不分文理科，合并划线，按高校专业选科要求投档</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、全国各省市新高考模式一览</h3>
        <div class="policy-grid" style="margin-bottom:0;">
          <div class="policy-card policy-card-main">
            <h3>实行「3+1+2」模式的省市</h3>
            <p class="policy-desc">
              <strong>江苏省（本站已上线）</strong>、广东省、湖北省、湖南省、河北省、辽宁省、福建省、重庆市、黑龙江省、吉林省、安徽省、江西省、广西壮族自治区、贵州省、甘肃省、山西省、内蒙古自治区、河南省、四川省、云南省、陕西省、青海省、宁夏回族自治区等。
            </p>
          </div>
          <div class="policy-card">
            <h3>实行「3+3」模式的省市</h3>
            <p class="policy-desc">
              浙江省（7 选 3）、上海市、北京市、天津市、山东省、海南省。不同省市在等级赋分档位（如浙江 20 档、山东 8 档、上海 11 档）及单科满分设置上略有差异。
            </p>
          </div>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">三、新高考选科与大学专业报考的关系</h3>
        <p class="policy-desc">
          教育部与各省高校目前普遍执行新版选考科目要求：绝大多数<strong>理学、工学、农学、医学</strong>核心本科专业要求「物理 + 化学」均须选考；部分政法、公安及马克思主义理论类专业要求必选「思想政治」。想进一步了解等级赋分如何换算，可阅读 <a href="/fufenzhi" style="color:var(--primary-ink);font-weight:600;">《新高考等级赋分制详解》</a>，或直接前往 <a href="/jiangsu" style="color:var(--primary-ink);font-weight:600;">江苏选科分析</a> 体验实时测算。
        </p>
      </section>
    </article>
  `;

  return renderLayout({
    title,
    description,
    keywords,
    canonicalPath: '/modes',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      inLanguage: 'zh-CN',
      publisher: { '@type': 'Organization', name: '高中选科助手' },
    },
    bodyHtml,
  });
}

function renderPrivacyPage() {
  const title = '隐私保护说明 - 高中选科助手';
  const description = '高中选科助手隐私保护说明：所有孩子的称呼、历次考试成绩、班级与年级排名均仅保存在您自己的手机或电脑浏览器中，我们不留存、不共享任何个人成绩信息。';
  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">隐私保护说明</h2>
            <p class="hint">生效日期：2026 年 · 适用于「高中选科助手」全部页面</p>
          </div>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、孩子的成绩只保存在您自己的设备里</h3>
        <p class="policy-desc">您在页面中填写的孩子称呼、历次月考/期中/期末成绩、班级排名、年级排名以及点击「暂存成绩」保存的内容，<strong>全部只保存在您当前使用的手机或电脑浏览器中</strong>，不会上传存成公开记录，也不会被任何其他家长或学生看到。</p>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、生成选科报告时会留存成绩吗？</h3>
        <p class="policy-desc">当您点击「生成选科与就业白皮书」时，系统只会即时计算本次所需的成绩趋势与高校专业匹配结果，并立刻返回给您查看，<strong>不会在网站上留存或备份您孩子的个人成绩</strong>。</p>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">三、随时可以一键清空</h3>
        <ul class="policy-list">
          <li>您可以随时点击成绩录入页右上角的「清空」按钮，清除当前填写的所有成绩。</li>
          <li>您也可以在浏览器设置中清除本站的浏览数据，彻底移除保存在您手机或电脑上的所有记录与报告。</li>
        </ul>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">四、隐私相关联系</h3>
        <p class="policy-desc">如对本隐私保护说明有任何疑问，欢迎发送邮件至 <a href="mailto:cs@visc.cn" style="color:var(--primary-ink);font-weight:600;">cs@visc.cn</a>。</p>
      </section>
    </article>
  `;
  return renderLayout({
    title,
    description,
    keywords: '高中选科助手隐私说明,学生成绩隐私保护',
    canonicalPath: '/privacy',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    bodyHtml,
  });
}

function renderDisclaimerPage(store) {
  const dsStats = store.getStats();
  const sources = store.getAllSources() || [];
  const sourceItems = sources
    .map((s) => `<li><strong>${escapeHtml(s.title)}</strong>（发布单位：${escapeHtml(s.publisher)}，发布时间：${escapeHtml(s.publishedAt)}）</li>`)
    .join('');

  const title = '免责声明与数据来源 - 高中选科助手';
  const description = '高中选科助手免责声明及官方高校专业选科要求数据来源说明，帮助家长与学生理性参考选科分析报告。';
  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">免责声明与数据来源</h2>
            <p class="hint">数据客观透明 · 仅供家庭选科决策参考</p>
          </div>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">一、官方数据来源</h3>
        <p class="policy-desc" style="margin-bottom:10px;">当前系统已收录江苏省共 <strong>${dsStats.offeringsCount.toLocaleString()}</strong> 条高校专业选考科目要求（数据版本：<code>${escapeHtml(dsStats.datasetVersion)}</code>），主要参考以下公开资料：</p>
        <ul class="policy-list">${sourceItems || '<li>各省教育考试院公开发布的普通高校本科/专科专业选考科目要求目录</li>'}</ul>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">二、使用免责声明</h3>
        <ul class="policy-list">
          <li>本工具生成的学科画像、选科组合推荐、专业覆盖率及毕业年就业趋势分析，均基于历史公开数据与通用规则模型，<strong>仅供家庭选科参考，不构成高考赋分预测、志愿填报承诺或大学录取保证</strong>。</li>
          <li>各高校在不同招生年份可能会动态调整专业选考科目要求与招生计划，最终请以学生参加高考当年所在省教育考试院及目标高校发布的正式招生章程为准。</li>
          <li>如您在核对过程中发现个别院校专业条目与官方最新公布存在差异，欢迎发邮件至 <a href="mailto:cs@visc.cn" style="color:var(--primary-ink);font-weight:600;">cs@visc.cn</a> 反馈，我们将及时核实修正。</li>
        </ul>
      </section>
    </article>
  `;
  return renderLayout({
    title,
    description,
    keywords: '高中选科助手免责声明,选科数据来源,高校专业选科要求',
    canonicalPath: '/disclaimer',
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description },
    bodyHtml,
  });
}

function renderContactPage() {
  const title = '联系我们与意见反馈 - 高中选科助手';
  const description = '联系高中选科助手团队：数据纠错、新省份上线需求、功能建议与合作咨询，请联系官方邮箱 cs@visc.cn。';
  const bodyHtml = `
    <article class="doc-sheet report-doc">
      <div class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">联系我们与意见反馈</h2>
            <p class="hint">欢迎家长、同学及高中老师提出宝贵建议</p>
          </div>
        </div>
      </div>

      <section class="doc-section" style="margin-top:20px;padding-top:20px;">
        <h3 class="doc-h3">官方联系邮箱</h3>
        <div class="policy-card policy-card-main" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">客服支持 / 数据纠错 / 商务合作</div>
            <div style="font-size:22px;font-weight:700;color:var(--primary-ink);">cs@visc.cn</div>
          </div>
          <a href="mailto:cs@visc.cn" class="btn btn-primary" style="text-decoration:none;">发送邮件 →</a>
        </div>
      </section>

      <section class="doc-section">
        <h3 class="doc-h3">我们期待收到以下反馈</h3>
        <ul class="policy-list">
          <li><strong>新省份上线申请</strong>：告诉我们您所在的省份（如浙江、广东、山东、湖北、湖南、四川等），我们会按需求热度优先接入对应省份官方专业目录。</li>
          <li><strong>专业数据纠错</strong>：若发现某所高校或专业的选考要求与最新官方文件不符，请附带院校名称与专业名，我们将尽快复核更新。</li>
          <li><strong>产品体验建议</strong>：任何关于成绩录入、白皮书解读或移动端体验的改进意见，均欢迎来信交流。</li>
        </ul>
      </section>
    </article>
  `;
  return renderLayout({
    title,
    description,
    keywords: '联系高中选科助手,意见反馈,cs@visc.cn',
    canonicalPath: '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: title,
      description,
      mainEntity: { '@type': 'Organization', name: '高中选科助手', email: 'cs@visc.cn' },
    },
    bodyHtml,
  });
}

export function renderSeoPage(urlPath, store) {
  const cleanPath = urlPath.replace(/\/+$/, '') || '/';
  if (cleanPath === '/modes') {
    return renderModesPage();
  }
  if (cleanPath === '/jiangsu') {
    return renderJiangsuHubPage(store);
  }
  if (cleanPath === '/fufenzhi') {
    return renderFufenzhiPage();
  }
  if (cleanPath === '/privacy') {
    return renderPrivacyPage();
  }
  if (cleanPath === '/disclaimer') {
    return renderDisclaimerPage(store);
  }
  if (cleanPath === '/contact') {
    return renderContactPage();
  }
  if (cleanPath === '/jiangsu/fufenzhi') {
    return renderJiangsuFufenzhiPage();
  }
  if (cleanPath.startsWith('/jiangsu/')) {
    const slug = cleanPath.slice('/jiangsu/'.length);
    const meta = COMBO_BY_SLUG.get(slug);
    if (meta) {
      return renderComboDetailPage(store, meta);
    }
  }
  return null;
}

export function renderSitemapXml(siteOrigin = DEFAULT_SITE_ORIGIN) {
  const base = String(siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
  const urls = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/modes', priority: '0.9', freq: 'monthly' },
    { loc: '/jiangsu', priority: '0.9', freq: 'weekly' },
    { loc: '/jiangsu/fufenzhi', priority: '0.85', freq: 'monthly' },
    { loc: '/fufenzhi', priority: '0.8', freq: 'monthly' },
    ...COMBO_SEO_META.map((m) => ({ loc: `/jiangsu/${m.slug}`, priority: '0.8', freq: 'monthly' })),
    { loc: '/privacy', priority: '0.5', freq: 'yearly' },
    { loc: '/disclaimer', priority: '0.5', freq: 'yearly' },
    { loc: '/contact', priority: '0.5', freq: 'yearly' },
    { loc: '/llms.txt', priority: '0.6', freq: 'monthly' },
  ];
  const entries = urls
    .map(
      (u) => `  <url>\n    <loc>${base}${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
