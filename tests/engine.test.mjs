import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateSelection,
  generateCombinations,
  validateThreeSubjects,
  matchRequirementTree,
  DEFAULT_ALGORITHM_VERSION,
} from '../packages/rules-engine/dist/index.js';
import { EngineValidationError } from '../packages/contracts/dist/index.js';

const JIANGSU_RULE = {
  provinceCode: 'JS',
  provinceName: '江苏',
  mode: '3+1+2',
  applicableYears: [2027],
  firstSubjects: ['PHYSICS', 'HISTORY'],
  electiveSubjects: ['CHEMISTRY', 'BIOLOGY', 'POLITICS', 'GEOGRAPHY'],
  electivePickCount: 2,
  version: 'JS-2027.1',
  status: 'published',
  sourceId: 'S01',
};

function makeInput(overrides = {}) {
  return {
    provinceCode: 'JS',
    examYear: 2027,
    advantage: {
      PHYSICS: 4,
      HISTORY: 3,
      CHEMISTRY: 5,
      BIOLOGY: 3,
      POLITICS: 2,
      GEOGRAPHY: 4,
    },
    interest: null,
    preferredMajorIds: [],
    preserveMajors: false,
    allowedCombinationIds: null,
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    algorithmVersion: DEFAULT_ALGORITHM_VERSION,
    provinceRule: JIANGSU_RULE,
    majorMatchSummary: null,
    ...overrides,
  };
}

test('T01: 江苏 3+1+2 配置生成恰好 12 个无重复合法组合', () => {
  const combos = generateCombinations(JIANGSU_RULE);
  assert.equal(combos.length, 12);
  const ids = new Set(combos.map((c) => c.id));
  assert.equal(ids.size, 12);
  assert.deepEqual(
    combos.map((c) => c.id),
    ['P_CB', 'P_CP', 'P_CG', 'P_BP', 'P_BG', 'P_PG', 'H_CB', 'H_CP', 'H_CG', 'H_BP', 'H_BG', 'H_PG']
  );
});

test('T02: 非法三科或不支持省份明确校验失败，不生成伪结果', () => {
  assert.throws(
    () => validateThreeSubjects(['PHYSICS', 'HISTORY', 'CHEMISTRY'], JIANGSU_RULE),
    (err) => err instanceof EngineValidationError && err.code === 'INVALID_INPUT'
  );

  assert.throws(
    () => evaluateSelection(makeInput({ provinceCode: 'ZJ' }), makeContext()),
    (err) => err instanceof EngineValidationError && err.code === 'UNSUPPORTED_PROVINCE'
  );
});

test('T03: 六科优势完全相同且无兴趣，全部 12 组并列，不声称有唯一最优', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 3,
        HISTORY: 3,
        CHEMISTRY: 3,
        BIOLOGY: 3,
        POLITICS: 3,
        GEOGRAPHY: 3,
      },
      interest: null,
    }),
    makeContext()
  );

  assert.equal(result.status, 'ranked');
  assert.equal(result.inputCompleteness.allAdvantageEqual, true);
  assert.equal(result.rankGroups.length, 1);
  assert.equal(result.rankGroups[0].combinationIds.length, 12);
  assert.equal(result.rankGroups[0].isTied, true);
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.extraTiedRecommendations.length, 9);
  assert.ok(result.warnings.some((w) => w.includes('差异不明显')));
});

test('T04: 优势与兴趣均完整时按 03 公式计算，示例组合内部值为 75', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 4,
        HISTORY: 2,
        CHEMISTRY: 5,
        BIOLOGY: 3,
        POLITICS: 1,
        GEOGRAPHY: 2,
      },
      interest: {
        PHYSICS: 4,
        HISTORY: 2,
        CHEMISTRY: 3,
        BIOLOGY: 5,
        POLITICS: 1,
        GEOGRAPHY: 2,
      },
    }),
    makeContext()
  );

  const pcb = result.allCombinations.find((c) => c.id === 'P_CB');
  assert.ok(pcb);
  assert.equal(pcb.usedInterest, true);
  assert.equal(pcb.advantageScore, 75);
  assert.equal(pcb.interestScore, 75);
  assert.equal(pcb.internalScore, 75);
});

test('T05: 兴趣仅填写部分时全组合统一不用兴趣评分，但保留描述', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 4,
        HISTORY: 2,
        CHEMISTRY: 5,
        BIOLOGY: 3,
        POLITICS: 1,
        GEOGRAPHY: 2,
      },
      interest: {
        PHYSICS: 5,
        HISTORY: null,
        CHEMISTRY: null,
        BIOLOGY: 5,
        POLITICS: null,
        GEOGRAPHY: null,
      },
    }),
    makeContext()
  );

  assert.equal(result.inputCompleteness.interestMode, 'partial');
  for (const combo of result.allCombinations) {
    assert.equal(combo.usedInterest, false);
    if (combo.state === 'ranked') {
      assert.equal(combo.internalScore, combo.advantageScore);
    }
  }
  const pcb = result.allCombinations.find((c) => c.id === 'P_CB');
  assert.ok(pcb.reasons.some((r) => r.includes('很喜欢')));
});

test('T06: 优势已知仅三科时不排序，返回 insufficient_input 并列出待补充科目', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 5,
        HISTORY: null,
        CHEMISTRY: 4,
        BIOLOGY: 4,
        POLITICS: null,
        GEOGRAPHY: null,
      },
    }),
    makeContext()
  );

  assert.equal(result.status, 'insufficient_input');
  assert.equal(result.rankGroups.length, 0);
  assert.equal(result.recommendations.length, 0);
  assert.equal(result.inputCompleteness.knownAdvantageCount, 3);
  assert.deepEqual(result.inputCompleteness.unknownAdvantageSubjects, [
    'HISTORY',
    'POLITICS',
    'GEOGRAPHY',
  ]);
});

test('T07: 优势已知四科时只排序三科均已知的组合，其余进入 needs_input 且不赋零', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 5,
        HISTORY: null,
        CHEMISTRY: 4,
        BIOLOGY: 4,
        POLITICS: null,
        GEOGRAPHY: 3,
      },
    }),
    makeContext()
  );

  assert.equal(result.status, 'ranked');
  const rankedIds = result.allCombinations.filter((c) => c.state === 'ranked').map((c) => c.id);
  const needsIds = result.allCombinations.filter((c) => c.state === 'needs_input').map((c) => c.id);
  assert.deepEqual(rankedIds.sort(), ['P_BG', 'P_CB', 'P_CG']);
  assert.equal(needsIds.length, 9);
  for (const c of result.allCombinations.filter((x) => x.state === 'needs_input')) {
    assert.equal(c.internalScore, null);
    assert.ok(c.missingSubjects.length > 0);
  }
});

test('T07b: 已知四科但学校允许组合均含未知科目时，返回 insufficient_input 而非硬约束冲突', () => {
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 5,
        HISTORY: null,
        CHEMISTRY: 4,
        BIOLOGY: 4,
        POLITICS: null,
        GEOGRAPHY: 3,
      },
      allowedCombinationIds: ['H_PG', 'H_BP'],
    }),
    makeContext()
  );

  assert.equal(result.status, 'insufficient_input');
});

test('T08: 专业 ALL 物理 化学 -> 物化地满足，物生地不满足；首选科目与要求树做 AND', () => {
  const tree = { type: 'ALL', subjects: ['PHYSICS', 'CHEMISTRY'] };
  assert.equal(matchRequirementTree(['PHYSICS', 'CHEMISTRY', 'GEOGRAPHY'], 'PHYSICS', tree), 'eligible');
  assert.equal(matchRequirementTree(['PHYSICS', 'BIOLOGY', 'GEOGRAPHY'], 'PHYSICS', tree), 'ineligible');
  assert.equal(
    matchRequirementTree(['HISTORY', 'CHEMISTRY', 'BIOLOGY'], 'ANY', {
      type: 'ALL',
      subjects: ['CHEMISTRY', 'BIOLOGY'],
    }),
    'eligible'
  );
  assert.equal(
    matchRequirementTree(['PHYSICS', 'BIOLOGY', 'GEOGRAPHY'], 'HISTORY', { type: 'NONE' }),
    'ineligible'
  );
});

test('T09: 条件或来源无法解析时返回 unknown，不当作不满足', () => {
  assert.equal(
    matchRequirementTree(['PHYSICS', 'CHEMISTRY', 'BIOLOGY'], 'ANY', { type: 'UNKNOWN' }),
    'unknown'
  );
  assert.equal(
    matchRequirementTree(
      ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'],
      'PHYSICS',
      { type: 'ALL', subjects: ['PHYSICS'] },
      'pending'
    ),
    'unknown'
  );
});

test('T10: 目标年无数据仅有参考年时，不硬过滤专业方向，仅提示参考年份', () => {
  const byCombination = {};
  for (const cid of ['P_CB', 'P_CP', 'P_CG', 'P_BP', 'P_BG', 'P_PG', 'H_CB', 'H_CP', 'H_CG', 'H_BP', 'H_BG', 'H_PG']) {
    byCombination[cid] = {
      MAJ_CS: {
        majorId: 'MAJ_CS',
        majorName: '计算机科学与技术',
        status: cid.startsWith('P_C') ? 'eligible' : 'ineligible',
        eligibleCount: cid.startsWith('P_C') ? 5 : 0,
        ineligibleCount: cid.startsWith('P_C') ? 0 : 5,
        unknownCount: 0,
        totalCount: 5,
        isReferenceYear: true,
        referenceYear: 2027,
        dataYear: 2027,
        completeness: 'full',
        canHardFilter: false,
        summaryText: '参考 2027 年资料',
      },
    };
  }

  const result = evaluateSelection(
    makeInput({
      examYear: 2029,
      preferredMajorIds: ['MAJ_CS'],
      preserveMajors: true,
    }),
    makeContext({
      majorMatchSummary: {
        datasetVersion: 'JS-2027-demo',
        dataYear: 2027,
        isReferenceYear: true,
        completeness: 'full',
        canHardFilter: false,
        scopeNote: '参考 2027 年资料',
        byCombination,
      },
    })
  );

  assert.equal(result.status, 'ranked');
  assert.equal(result.allCombinations.filter((c) => c.state === 'excluded').length, 0);
  assert.ok(result.warnings.some((w) => w.includes('2027')));
});

test('T11: 学校限制与专业保留在已核实 full 库上冲突 -> no_feasible_combination，不自动放宽', () => {
  const byCombination = {};
  for (const cid of ['P_CB', 'P_CP', 'P_CG', 'P_BP', 'P_BG', 'P_PG', 'H_CB', 'H_CP', 'H_CG', 'H_BP', 'H_BG', 'H_PG']) {
    byCombination[cid] = {
      MAJ_CLINICAL: {
        majorId: 'MAJ_CLINICAL',
        majorName: '临床医学',
        status: cid.startsWith('P_C') ? 'eligible' : 'ineligible',
        eligibleCount: cid.startsWith('P_C') ? 3 : 0,
        ineligibleCount: cid.startsWith('P_C') ? 0 : 3,
        unknownCount: 0,
        totalCount: 3,
        isReferenceYear: false,
        referenceYear: null,
        dataYear: 2027,
        completeness: 'full',
        canHardFilter: true,
        summaryText: cid.startsWith('P_C') ? '满足已知选科条件' : '不满足该条条件',
      },
    };
  }

  const result = evaluateSelection(
    makeInput({
      preferredMajorIds: ['MAJ_CLINICAL'],
      preserveMajors: true,
      allowedCombinationIds: ['H_PG', 'H_BG'],
    }),
    makeContext({
      majorMatchSummary: {
        datasetVersion: 'JS-2027-verified',
        dataYear: 2027,
        isReferenceYear: false,
        completeness: 'full',
        canHardFilter: true,
        scopeNote: '2027 年已核实范围',
        byCombination,
      },
    })
  );

  assert.equal(result.status, 'no_feasible_combination');
  assert.equal(result.recommendations.length, 0);
  assert.ok(result.conflicts.length > 0);
  assert.equal(Object.keys(result.excludedReasons).length, 12);
});

test('T12: 同一输入和相同版本重复运行，结果、理由与排名完全一致', () => {
  const input = makeInput();
  const ctx = makeContext();
  const r1 = evaluateSelection(input, ctx);
  const r2 = evaluateSelection(input, ctx);
  assert.deepEqual(r1, r2);
});

test('T13: 第三候选所在并列组仍有其他组合时，放入 extraTiedRecommendations 供免费展开', () => {
  // 让 4 个组合同分并列第 1 组：PHYSICS=5, CHEMISTRY=4, BIOLOGY=4, POLITICS=4, GEOGRAPHY=4, HISTORY=1
  // P_CB, P_CP, P_CG, P_BP, P_BG, P_PG 全部都是 (5+4+4) 同分 -> 6 组并列第一组
  const result = evaluateSelection(
    makeInput({
      advantage: {
        PHYSICS: 5,
        HISTORY: 1,
        CHEMISTRY: 4,
        BIOLOGY: 4,
        POLITICS: 4,
        GEOGRAPHY: 4,
      },
    }),
    makeContext()
  );

  assert.equal(result.status, 'ranked');
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.extraTiedRecommendations.length, 3);
  assert.deepEqual(
    result.recommendations.map((r) => r.id),
    ['P_CB', 'P_CP', 'P_CG']
  );
  assert.deepEqual(
    result.extraTiedRecommendations.map((r) => r.id),
    ['P_BP', 'P_BG', 'P_PG']
  );
});
