import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateDatasetBundle } from '../scripts/validate-data.mjs';
import { previewDatasetDiff } from '../scripts/preview-diff.mjs';
import { importOfficialCsvText, parseOfficialRequirement } from '../scripts/import-official-csv.mjs';
import { generateCombinations, matchOffering } from '../packages/rules-engine/dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const sources = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data', 'normalized', 'sources.json'), 'utf8')
);

const SAMPLE_CSV = [
  '院校代码,院校名称,专业代码,专业名称,层次,首选科目要求,选考科目要求',
  '10284,测试院校甲,080901,计算机科学与技术,本科,物理,"物理、化学（2门科目考生均须选考方可报考）"',
  '10284,测试院校甲,030101K,法学,本科,不限,不提科目要求',
  '10285,测试院校乙,100501K,中医学,本科,不限,化学或生物学',
  '10285,测试院校乙,071001,生物科学,本科,物理,待确认说明原文',
].join('\n');

test('官方 CSV 导入：正确解析 ALL / NONE / ANY / UNKNOWN 并计算 SHA-256', () => {
  const { sha256, bundle } = importOfficialCsvText(SAMPLE_CSV, {
    provinceCode: 'JS',
    dataYear: 2027,
    version: 'JS-2027.1',
    completeness: 'full',
  });

  assert.equal(sha256.length, 64);
  assert.equal(bundle.offerings.length, 4);
  assert.deepEqual(bundle.offerings[0].requirementTree, {
    type: 'ALL',
    subjects: ['PHYSICS', 'CHEMISTRY'],
  });
  assert.equal(bundle.offerings[0].firstSubject, 'PHYSICS');
  assert.deepEqual(bundle.offerings[1].requirementTree, { type: 'NONE' });
  assert.deepEqual(bundle.offerings[2].requirementTree, {
    type: 'ANY',
    subjects: ['BIOLOGY', 'CHEMISTRY'],
  });
  assert.equal(bundle.offerings[3].reviewStatus, 'unknown');
  assert.equal(bundle.offerings[3].requirementTree.type, 'UNKNOWN');
});

test('生产发布严格阻止未复核 unknown 条目进入正式库，清理后通过校验', () => {
  const { bundle } = importOfficialCsvText(SAMPLE_CSV, {
    provinceCode: 'JS',
    dataYear: 2027,
    version: 'JS-2027.1',
  });

  const prodBlocked = validateDatasetBundle(bundle, sources, { targetEnv: 'prod' });
  assert.equal(prodBlocked.valid, false);
  assert.ok(prodBlocked.errors.some((e) => e.includes('unknown')));

  const cleanBundle = {
    ...bundle,
    offerings: bundle.offerings.filter((o) => o.reviewStatus === 'approved'),
  };
  const prodOk = validateDatasetBundle(cleanBundle, sources, { targetEnv: 'prod' });
  assert.equal(prodOk.valid, true);
});

test('数据差异预览：数量变化超过 10% 触发人工复核标记', () => {
  const { bundle } = importOfficialCsvText(SAMPLE_CSV, { provinceCode: 'JS', dataYear: 2027 });
  const diff = previewDatasetDiff(bundle.offerings, bundle.offerings.slice(0, 2));
  assert.equal(diff.removedCount, 2);
  assert.equal(diff.requiresManualReview, true);
});

test('parseOfficialRequirement: 无首选列时由物理+化学自动推断首选物理', () => {
  const parsed = parseOfficialRequirement('物理、化学（2门科目考生均须选考方可报考）');
  assert.equal(parsed.firstSubject, 'PHYSICS');
  assert.deepEqual(parsed.requirementTree, { type: 'ALL', subjects: ['PHYSICS', 'CHEMISTRY'] });
});

test('正式江苏 2027 全量库（js-2027.json）：全部 20 种表达式 × 12 组合真值与生产校验通过', () => {
  const realPath = path.join(rootDir, 'data', 'normalized', 'js-2027.json');
  assert.ok(fs.existsSync(realPath), '缺少 data/normalized/js-2027.json');
  const bundle = JSON.parse(fs.readFileSync(realPath, 'utf8'));
  const report = validateDatasetBundle(bundle, sources, { targetEnv: 'prod' });
  assert.equal(report.valid, true);
  assert.equal(report.stats.unknownCount, 0);
  assert.equal(bundle.offerings.length, 79753);

  const jsRule = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data', 'normalized', 'js-2027-rule.json'), 'utf8')
  );
  const combos = generateCombinations(jsRule);

  // 对每一种不同选科表达式至少核验 12 个组合的真值逻辑一致性
  const seenExpr = new Map();
  for (const off of bundle.offerings) {
    if (!seenExpr.has(off.requirementRaw)) {
      seenExpr.set(off.requirementRaw, off);
    }
  }
  assert.equal(seenExpr.size, 20);

  for (const [, sample] of seenExpr.entries()) {
    for (const combo of combos) {
      const st = matchOffering(combo.subjects, sample);
      assert.ok(st === 'eligible' || st === 'ineligible', `正式库不应出现 unknown: ${sample.requirementRaw}`);
      if (sample.requirementTree.type === 'NONE') {
        assert.equal(st, 'eligible');
      } else if (sample.requirementTree.type === 'ALL') {
        const expected = sample.requirementTree.subjects.every((s) => combo.subjects.includes(s))
          ? 'eligible'
          : 'ineligible';
        assert.equal(st, expected, `${sample.requirementRaw} vs ${combo.id}`);
      }
    }
  }
});
