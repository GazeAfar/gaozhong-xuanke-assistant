import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { createMemoryStore } from '../server/store.mjs';
import { createActionDispatcher } from '../server/handlers.mjs';

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
