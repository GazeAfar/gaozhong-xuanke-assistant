import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStore } from '../server/store.mjs';
import { evaluateExamsForJiangsu } from '../server/advisor.mjs';
import { generateCareerOutlook } from '../server/ai-career.mjs';

const store = createMemoryStore();
const comboMajorStats = store.getComboMajorStats();

test('江苏 2027 真实全量库（79,753 条）12 组合覆盖率预计算准确', () => {
  assert.equal(Object.keys(comboMajorStats).length, 12);
  const pcb = comboMajorStats.P_CB;
  const hpg = comboMajorStats.H_PG;

  assert.equal(pcb.totalAll, 79753);
  assert.equal(pcb.totalUndergrad, 50465);
  assert.equal(pcb.totalVocational, 29288);
  assert.ok(pcb.undergradCoveragePct > 90, `物化生本科覆盖率应高于90%，实际 ${pcb.undergradCoveragePct}%`);
  assert.ok(pcb.undergradCoveragePct > hpg.undergradCoveragePct);
  assert.ok(pcb.strongTracks.length >= 4);
});

test('多次月考/期末成绩与排名分析：准确计算均分、百分位、趋势并推荐前三组', () => {
  const report = evaluateExamsForJiangsu(
    {
      studentName: '测试同学',
      examYear: 2028,
      exams: [
        {
          name: '高一上月考',
          type: '月考',
          totalStudents: 600,
          subjects: {
            PHYSICS: { score: 85, rank: 60 },
            HISTORY: { score: 70, rank: 300 },
            CHEMISTRY: { score: 88, rank: 45 },
            BIOLOGY: { score: 80, rank: 120 },
            POLITICS: { score: 68, rank: 360 },
            GEOGRAPHY: { score: 84, rank: 80 },
          },
        },
        {
          name: '高一上期末',
          type: '期末考试',
          totalStudents: 600,
          subjects: {
            PHYSICS: { score: 90, rank: 36 },
            HISTORY: { score: 69, rank: 320 },
            CHEMISTRY: { score: 91, rank: 30 },
            BIOLOGY: { score: 82, rank: 110 },
            POLITICS: { score: 66, rank: 380 },
            GEOGRAPHY: { score: 86, rank: 70 },
          },
        },
      ],
    },
    comboMajorStats
  );

  assert.equal(report.province, '江苏省');
  assert.equal(report.examYear, 2028);
  assert.equal(report.gradYear, 2032);
  assert.equal(report.recommendations.length, 3);
  assert.ok(['P_CG', 'P_CB'].includes(report.recommendations[0].id));
  assert.ok(report.warnings.some((w) => w.includes('2028')));

  const phyProfile = report.subjectProfiles.find((p) => p.code === 'PHYSICS');
  assert.equal(phyProfile.trend, '明显上升');
  assert.ok(phyProfile.avgTopPct < 10);
});

test('毕业年就业形势 AI 分析引擎（内置宏观模式）生成完整结构化预估', async () => {
  const report = evaluateExamsForJiangsu(
    {
      examYear: 2027,
      exams: [
        {
          name: '期末',
          type: '期末考试',
          totalStudents: 500,
          subjects: {
            PHYSICS: { score: 90, rank: 40 },
            HISTORY: { score: 72, rank: 250 },
            CHEMISTRY: { score: 88, rank: 50 },
            BIOLOGY: { score: 85, rank: 70 },
            POLITICS: { score: 70, rank: 280 },
            GEOGRAPHY: { score: 80, rank: 120 },
          },
        },
      ],
    },
    comboMajorStats
  );

  const outlook = await generateCareerOutlook(report, {});
  assert.equal(outlook.mode, 'builtin_macro');
  assert.ok(outlook.macroSummary.includes('2031'));
  assert.equal(outlook.byCombination.length, 3);
  assert.ok(outlook.byCombination[0].trackAnalyses.length > 0);
  // 第 2、3 备选不再机械复制第 1 名的全部赛道，而是优先展示特色差异方向
  assert.ok(outlook.byCombination[1].diffFromTop1.length > 0);
});

test('偏文科成绩学生：推荐历史首选组合，输出法学/中文/财会方向而非理工科模板', async () => {
  const report = evaluateExamsForJiangsu(
    {
      examYear: 2029,
      exams: [
        {
          name: '期中',
          type: '期中考试',
          classSize: 47,
          subjects: {
            PHYSICS: { score: 52, classRank: 42 },
            HISTORY: { score: 92, classRank: 3 },
            CHEMISTRY: { score: 55, classRank: 40 },
            BIOLOGY: { score: 70, classRank: 22 },
            POLITICS: { score: 91, classRank: 4 },
            GEOGRAPHY: { score: 89, classRank: 6 },
          },
        },
      ],
    },
    comboMajorStats
  );

  assert.equal(report.recommendations[0].id, 'H_PG');
  const outlook = await generateCareerOutlook(report, {});
  const topKeys = outlook.byCombination[0].trackAnalyses.map((t) => t.trackKey);
  assert.ok(topKeys.includes('law_pol') || topKeys.includes('edu_lit') || topKeys.includes('econ_fin'));
  assert.equal(topKeys.includes('ai_cs'), false);
  assert.equal(topKeys.includes('ee_auto'), false);
});
