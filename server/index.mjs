import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryStore } from './store.mjs';
import { createActionDispatcher } from './handlers.mjs';
import { evaluateExamsForJiangsu, COMBINATIONS } from './advisor.mjs';
import { generateCareerOutlook } from './ai-career.mjs';
import { renderSeoPage, renderSitemapXml } from './seo-pages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '..', 'web');

const MAX_BODY_BYTES = 128 * 1024;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(maxRequests, windowMs) {
  const buckets = new Map();
  return (ip) => {
    const now = Date.now();
    const entry = buckets.get(ip);
    if (!entry || now >= entry.resetAt) {
      if (buckets.size > 5000) buckets.clear();
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxRequests) return false;
    entry.count += 1;
    return true;
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveStaticFile(res, urlPath) {
  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const resolved = path.resolve(webDir, '.' + safePath);
  if (!resolved.startsWith(webDir + path.sep) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return false;
  }
  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(resolved);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': buf.length,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(buf);
  return true;
}

function matchOfferingByComboId(offering, combinationId) {
  if (!combinationId) return null;
  const combo = COMBINATIONS.find((c) => c.id === combinationId);
  if (!combo) return null;
  if (offering.reviewStatus !== 'approved') return 'unknown';
  const set = new Set(combo.subjects);
  if (offering.firstSubject === 'PHYSICS' && !set.has('PHYSICS')) return 'ineligible';
  if (offering.firstSubject === 'HISTORY' && !set.has('HISTORY')) return 'ineligible';
  const tree = offering.requirementTree;
  if (!tree || tree.type === 'UNKNOWN') return 'unknown';
  if (tree.type === 'NONE') return 'eligible';
  if (tree.type === 'ALL') return tree.subjects.every((s) => set.has(s)) ? 'eligible' : 'ineligible';
  if (tree.type === 'ANY') return tree.subjects.some((s) => set.has(s)) ? 'eligible' : 'ineligible';
  return 'unknown';
}

export function createHttpServer(store) {
  const dispatch = createActionDispatcher(store);
  const checkReportRate = createRateLimiter(60, 60 * 1000);
  const checkMajorsRate = createRateLimiter(120, 60 * 1000);

  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const urlPath = parsedUrl.pathname;

    if (req.method === 'GET' && urlPath === '/healthz') {
      sendJson(res, 200, {
        ok: true,
        service: 'gaozhong-xuanke-web',
        ...store.getStats(),
      });
      return;
    }

    // 新 Web 主接口：根据江苏多次月考/期末成绩生成选科建议 + 真实可报专业 + 毕业年就业预估
    // 公开部署安全策略：忽略前端传入的任意 aiConfig，防止 SSRF；仅使用内置引擎或服务端环境变量配置
    if (req.method === 'POST' && urlPath === '/api/v1/report') {
      if (!checkReportRate(getClientIp(req))) {
        sendJson(res, 429, {
          ok: false,
          error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' },
        });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const report = evaluateExamsForJiangsu(body, store.getComboMajorStats());
        const serverAiConfig = {
          baseUrl: process.env.AI_BASE_URL || '',
          model: process.env.AI_MODEL || '',
          apiKey: process.env.AI_API_KEY || '',
        };
        const careerOutlook = await generateCareerOutlook(report, serverAiConfig);
        sendJson(res, 200, {
          ok: true,
          data: {
            report,
            careerOutlook,
            sources: store.getAllSources(),
            datasetStats: store.getStats(),
          },
        });
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          error: { code: 'INVALID_INPUT', message: err?.message || '请求参数有误' },
        });
      }
      return;
    }

    // 79,753 条真实江苏官方院校专业实时查询接口
    if (req.method === 'GET' && urlPath === '/api/v1/majors') {
      if (!checkMajorsRate(getClientIp(req))) {
        sendJson(res, 429, {
          ok: false,
          error: { code: 'RATE_LIMITED', message: '查询过于频繁，请稍后再试' },
        });
        return;
      }
      const q = (parsedUrl.searchParams.get('q') || '').trim().slice(0, 50);
      const combinationId = (parsedUrl.searchParams.get('combinationId') || '').trim();
      const level = (parsedUrl.searchParams.get('level') || '本科').trim();
      const onlyEligible = parsedUrl.searchParams.get('onlyEligible') === 'true';
      const offset = Math.max(0, Number(parsedUrl.searchParams.get('offset')) || 0);
      const limit = Math.min(50, Math.max(1, Number(parsedUrl.searchParams.get('limit')) || 20));

      const raw = await store.searchOfferingsFiltered({
        q,
        level,
        offset: onlyEligible && combinationId ? 0 : offset,
        limit: onlyEligible && combinationId ? 5000 : limit,
      });

      let items = raw.items.map((item) => ({
        ...item,
        matchStatus: matchOfferingByComboId(item, combinationId),
      }));

      let total = raw.total;
      if (onlyEligible && combinationId) {
        items = items.filter((it) => it.matchStatus === 'eligible');
        total = items.length;
        items = items.slice(offset, offset + limit);
      }

      sendJson(res, 200, {
        ok: true,
        data: {
          items,
          total,
          offset,
          limit,
          dataYear: raw.dataYear,
          datasetVersion: raw.datasetVersion,
        },
      });
      return;
    }

    // 保留原统一 action 接口兼容
    if (req.method === 'POST' && urlPath === '/api/v1/action') {
      try {
        const body = await readJsonBody(req);
        const forwarded = req.headers['x-forwarded-for'];
        const ip =
          typeof forwarded === 'string' && forwarded.trim()
            ? forwarded.split(',')[0].trim()
            : req.socket.remoteAddress || 'unknown';
        const result = await dispatch(body, { ip });
        sendJson(res, 200, result);
      } catch (err) {
        const msg = err?.message === 'PAYLOAD_TOO_LARGE' ? '请求体过大' : 'JSON 格式不合法';
        sendJson(res, 400, {
          ok: false,
          error: { code: 'INVALID_INPUT', message: msg },
          requestId: '',
          schemaVersion: '1.0',
        });
      }
      return;
    }

    // 动态站点地图（统一使用 https://xuanke.visc.cn 绝对路径，符合 Google/Baidu Search Console 规范）
    if (req.method === 'GET' && urlPath === '/sitemap.xml') {
      const siteOrigin = (process.env.SITE_URL || 'https://xuanke.visc.cn').replace(/\/+$/, '');
      const xml = renderSitemapXml(siteOrigin);
      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(xml),
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(xml);
      return;
    }

    // 动态 robots.txt（输出 https://xuanke.visc.cn/sitemap.xml）
    if (req.method === 'GET' && urlPath === '/robots.txt') {
      const siteOrigin = (process.env.SITE_URL || 'https://xuanke.visc.cn').replace(/\/+$/, '');
      const robots = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        'User-agent: Googlebot',
        'Allow: /',
        '',
        'User-agent: Baiduspider',
        'Allow: /',
        '',
        'User-agent: OAI-SearchBot',
        'Allow: /',
        '',
        'User-agent: GPTBot',
        'Allow: /',
        '',
        'User-agent: ChatGPT-User',
        'Allow: /',
        '',
        'User-agent: Bytespider',
        'Allow: /',
        '',
        'User-agent: PerplexityBot',
        'Allow: /',
        '',
        `Sitemap: ${siteOrigin}/sitemap.xml`,
        '',
      ].join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(robots),
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(robots);
      return;
    }

    // 江苏省独立完整选科工作台（/jiangsu）
    if (req.method === 'GET' && (urlPath === '/jiangsu' || urlPath === '/jiangsu/')) {
      if (serveStaticFile(res, '/jiangsu.html')) {
        return;
      }
    }

    // 独立服务端直出（SSR）SEO 专题页与合规页：/fufenzhi、/jiangsu/<combo>、/privacy、/disclaimer、/contact
    if (req.method === 'GET') {
      const seoHtml = renderSeoPage(urlPath, store);
      if (seoHtml) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': Buffer.byteLength(seoHtml),
          'Cache-Control': 'public, max-age=600',
        });
        res.end(seoHtml);
        return;
      }
    }

    // 静态 Web 页面服务
    if (req.method === 'GET' && serveStaticFile(res, urlPath)) {
      return;
    }

    sendJson(res, 404, {
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Not Found' },
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const store = createMemoryStore();
  const server = createHttpServer(store);
  server.listen(port, host, () => {
    const stats = store.getStats();
    console.log(
      `[xuanke-web] Running on http://${host}:${port} | dataset=${stats.datasetVersion} | offerings=${stats.offeringsCount}`
    );
  });
}
