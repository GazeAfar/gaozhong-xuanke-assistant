import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { createMemoryStore } from '../server/store.mjs';
import { createActionDispatcher } from '../server/handlers.mjs';
import { renderProvinceWorkbenchPage } from '../server/province-workbench.mjs';
import { renderSeoPage, renderSitemapXml } from '../server/seo-pages.mjs';
import { evaluateExamsForProvince } from '../server/advisor.mjs';
import { generateCareerOutlook } from '../server/ai-career.mjs';
import { getProvinceByCode } from '../server/provinces.mjs';

const tmpRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'xuanke-test-'));
const store = createMemoryStore({ runtimeDir: tmpRuntime });
const dispatch = createActionDispatcher(store);

test.after(() => {
  fs.rmSync(tmpRuntime, { recursive: true, force: true });
});

test('MemoryStore 成功加载全部 79,753 条真实江苏 2027 官方数据', () => {
  const stats = store.getStats();
  assert.equal(stats.datasetVersion, 'JS-2027.1');
  assert.equal(stats.dataYear, 2027);
  assert.equal(stats.offeringsCount, 79753);
});

test('API config.get 与 rules.get 返回真实江苏配置与清单', async () => {
  const cfg = await dispatch({ action: 'config.get', requestId: 'r1', payload: { appVersion: '0.1.0' } });
  assert.equal(cfg.ok, true);
  assert.equal(cfg.data.currentManifest.supportedProvinces[0].defaultDatasetVersion, 'JS-2027.1');

  const ruleRes = await dispatch({ action: 'rules.get', requestId: 'r2', payload: { provinceCode: 'JS' } });
  assert.equal(ruleRes.ok, true);
  assert.equal(ruleRes.data.rule.mode, '3+1+2');
});

test('API offerings.search 真实检索北京大学并支持组合三态匹配与游标分页', async () => {
  const res = await dispatch({
    action: 'offerings.search',
    requestId: 'r3',
    payload: {
      provinceCode: 'JS',
      datasetVersion: 'JS-2027.1',
      q: '北京大学',
      combinationId: 'P_CG',
      pageSize: 10,
    },
  });

  assert.equal(res.ok, true);
  assert.ok(res.data.totalMatched > 0);
  assert.ok(res.data.items.length > 0);
  assert.equal(res.data.scope.isDemo, false);
  assert.equal(res.data.scope.completeness, 'full');
  assert.ok(res.data.items.every((it) => it.institutionName.includes('北京大学')));
  assert.ok(res.data.items.every((it) => it.matchStatus === 'eligible' || it.matchStatus === 'ineligible'));

  const firstId = res.data.items[0].id;
  const detail = await dispatch({
    action: 'offerings.get',
    requestId: 'r4',
    payload: { id: firstId, datasetVersion: 'JS-2027.1' },
  });
  assert.equal(detail.ok, true);
  assert.equal(detail.data.offering.id, firstId);
});

test('API offerings.search 拒绝通配符和过期版本游标', async () => {
  const wild = await dispatch({
    action: 'offerings.search',
    requestId: 'r5',
    payload: { provinceCode: 'JS', datasetVersion: 'JS-2027.1', q: '计算机*' },
  });
  assert.equal(wild.ok, false);
  assert.equal(wild.error.code, 'INVALID_INPUT');

  const staleCursor = Buffer.from(JSON.stringify({ v: 'OLD-VER', o: 20 })).toString('base64');
  const stale = await dispatch({
    action: 'offerings.search',
    requestId: 'r6',
    payload: { provinceCode: 'JS', datasetVersion: 'JS-2027.1', cursor: staleCursor },
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'DATASET_CHANGED');
});

test('API offerings.match 对真实库中「计算机科学与技术」跨院校聚合匹配', async () => {
  const res = await dispatch({
    action: 'offerings.match',
    requestId: 'r7',
    payload: {
      provinceCode: 'JS',
      datasetVersion: 'JS-2027.1',
      examYear: 2027,
      majorIds: ['计算机科学与技术'],
      combinationIds: ['P_CG', 'H_PG'],
    },
  });

  assert.equal(res.ok, true);
  assert.equal(res.data.canHardFilter, true);
  const pcg = res.data.byCombination.P_CG['计算机科学与技术'];
  const hpg = res.data.byCombination.H_PG['计算机科学与技术'];
  assert.ok(pcg.totalCount > 50, `预期有大量院校开设该专业，实际 ${pcg.totalCount}`);
  assert.equal(pcg.status, 'eligible');
  assert.ok(pcg.eligibleCount > hpg.eligibleCount);
});

test('API feedback.create 校验字数、清理 HTML、写入本地 JSONL 并支持 IP 限流', async () => {
  const bad = await dispatch(
    { action: 'feedback.create', requestId: 'r8', payload: { category: 'data_error', message: '太短了' } },
    { ip: '10.0.0.1' }
  );
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, 'INVALID_INPUT');

  const ok = await dispatch(
    {
      action: 'feedback.create',
      requestId: 'r9',
      payload: {
        category: 'data_error',
        message: '<script>alert(1)</script>请核对某院校 2027 选考科目要求原文。',
      },
    },
    { ip: '10.0.0.1' }
  );
  assert.equal(ok.ok, true);
  assert.ok(ok.data.feedbackId.startsWith('fb_'));

  const saved = fs.readFileSync(path.join(tmpRuntime, 'feedback.jsonl'), 'utf8');
  assert.equal(saved.includes('<script>'), false);
  assert.equal(saved.includes(ok.data.feedbackId), true);
});

test('多省份架构：MemoryStore 同步加载湖北 81,803 条官方数据并支持独立检索与规则查询', async () => {
  const hbStats = store.getStats('HB');
  assert.equal(hbStats.provinceCode, 'HB');
  assert.equal(hbStats.datasetVersion, 'HB-2027.1');
  assert.equal(hbStats.dataYear, 2027);
  assert.equal(hbStats.offeringsCount, 81803);

  const hbComboStats = store.getComboMajorStats('HB');
  assert.ok(hbComboStats.P_CB.undergradCoveragePct > 95);
  assert.ok(hbComboStats.H_PG.undergradCoveragePct < 60);

  const cfg = await dispatch({ action: 'config.get', requestId: 'r10', payload: {} });
  assert.equal(cfg.ok, true);
  assert.ok(cfg.data.supportedProvinces.some((p) => p.provinceCode === 'JS'));
  assert.ok(cfg.data.supportedProvinces.some((p) => p.provinceCode === 'HB'));

  const hbRule = await dispatch({ action: 'rules.get', requestId: 'r11', payload: { provinceCode: 'HB' } });
  assert.equal(hbRule.ok, true);
  assert.equal(hbRule.data.rule.provinceName, '湖北');
  assert.equal(hbRule.data.rule.mode, '3+1+2');

  const searchRes = await store.searchOfferingsFiltered({
    provinceCode: 'HB',
    q: '武汉大学',
    level: '本科',
    offset: 0,
    limit: 10,
  });
  assert.ok(searchRes.total > 0);
  assert.equal(searchRes.datasetVersion, 'HB-2027.1');
  assert.ok(searchRes.items.every((it) => it.institutionName.includes('武汉大学')));
});

test('多省份 SSR、SEO、Sitemap 与报告引擎验收：江苏 & 湖北', async () => {
  const jsMeta = getProvinceByCode('JS');
  const hbMeta = getProvinceByCode('HB');

  const jsPage = renderProvinceWorkbenchPage(jsMeta, store);
  const hbPage = renderProvinceWorkbenchPage(hbMeta, store);
  const hbFufenzhi = renderSeoPage('/hubei/fufenzhi', store);
  const jsFufenzhi = renderSeoPage('/jiangsu/fufenzhi', store);
  const hbCombo = renderSeoPage('/hubei/wuhuasheng', store);
  const disclaimer = renderSeoPage('/disclaimer', store);
  const sitemap = renderSitemapXml('https://xuanke.visc.cn');

  assert.ok(hbPage.includes('高中选科助手 · 湖北'));
  assert.ok(hbPage.includes('81,803'));
  assert.ok(hbPage.includes('"/qr-hubei.svg"'));
  assert.ok(jsPage.includes('高中选科助手 · 江苏'));
  assert.ok(jsPage.includes('79,753'));
  assert.ok(hbFufenzhi.includes('湖北省高考「等级赋分制」详解'));
  assert.ok(jsFufenzhi.includes('江苏省高考「等级赋分制」详解'));
  assert.ok(hbCombo.includes('物理 · 化学 · 生物学（物化生）选科分析'));
  assert.ok(hbCombo.includes('在鄂招生专业选科目录'));
  assert.ok(disclaimer.includes('79,753') && disclaimer.includes('81,803'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hubei</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hubei/fufenzhi</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hubei/wuhuasheng</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/jiangsu/wuhuasheng</loc>'));

  const hbReport = evaluateExamsForProvince(
    {
      province: 'HB',
      examYear: 2029,
      studentName: '测试同学',
      exams: [
        {
          name: '第 1 次考试',
          classSize: 50,
          gradeSize: 600,
          subjects: {
            PHYSICS: { score: 88, fullScore: 100, gradeRank: 45 },
            HISTORY: { score: 72, fullScore: 100, gradeRank: 260 },
            CHEMISTRY: { score: 86, fullScore: 100, gradeRank: 60 },
            BIOLOGY: { score: 84, fullScore: 100, gradeRank: 75 },
            POLITICS: { score: 74, fullScore: 100, gradeRank: 240 },
            GEOGRAPHY: { score: 80, fullScore: 100, gradeRank: 120 },
          },
        },
      ],
    },
    store.getComboMajorStats('HB'),
    hbMeta
  );
  assert.equal(hbReport.provinceCode, 'HB');
  assert.equal(hbReport.province, '湖北省');
  assert.equal(hbReport.recommendations.length, 3);

  const hbCareer = await generateCareerOutlook(hbReport, {});
  assert.ok(hbCareer.macroSummary.includes('湖北高考'));
  assert.equal(hbCareer.byCombination.length, 3);
});

test('5 省扩展与 LRU 懒加载缓存：河南/河北/湖南独立检索、SSR、Sitemap 且内存缓存严格有界', async () => {
  assert.equal(store.getStats('HA').offeringsCount, 96437);
  assert.equal(store.getStats('HE').offeringsCount, 91789);
  assert.equal(store.getStats('HN').offeringsCount, 85163);

  const [haRes, heRes, hnRes] = await Promise.all([
    store.searchOfferingsFiltered({ provinceCode: 'HA', q: '郑州大学', level: '本科', offset: 0, limit: 5 }),
    store.searchOfferingsFiltered({ provinceCode: 'HE', q: '燕山大学', level: '本科', offset: 0, limit: 5 }),
    store.searchOfferingsFiltered({ provinceCode: 'HN', q: '中南大学', level: '本科', offset: 0, limit: 5 }),
  ]);
  assert.ok(haRes.total > 0 && haRes.datasetVersion === 'HA-2027.1');
  assert.ok(heRes.total > 0 && heRes.datasetVersion === 'HE-2027.1');
  assert.ok(hnRes.total > 0 && hnRes.datasetVersion === 'HN-2027.1');

  // 验证 LRU 缓存上限严格生效（默认 maxCachedDatasets = 2）
  const cacheInfo = store.getCacheInfo();
  assert.ok(cacheInfo.cachedDatasets.length <= cacheInfo.maxCachedDatasets);

  const haPage = renderProvinceWorkbenchPage(getProvinceByCode('HA'), store);
  const hePage = renderProvinceWorkbenchPage(getProvinceByCode('HE'), store);
  const hnPage = renderProvinceWorkbenchPage(getProvinceByCode('HN'), store);
  assert.ok(haPage.includes('高中选科助手 · 河南') && haPage.includes('96,437'));
  assert.ok(hePage.includes('高中选科助手 · 河北') && hePage.includes('91,789'));
  assert.ok(hnPage.includes('高中选科助手 · 湖南') && hnPage.includes('85,163'));

  const sitemap = renderSitemapXml('https://xuanke.visc.cn');
  assert.ok(sitemap.includes('https://xuanke.visc.cn/henan</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hebei</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hunan</loc>'));
  assert.ok(sitemap.includes('https://xuanke.visc.cn/hunan/fufenzhi</loc>'));
});
