import {
  ALL_SUBJECTS,
  COMBINATION_ORDER,
  CombinationDef,
  CombinationEvaluation,
  CombinationId,
  EngineContext,
  EngineValidationError,
  InputCompleteness,
  MajorMatchDetail,
  RankGroup,
  RatingValue,
  SUBJECT_LABELS,
  SelectionInput,
  SelectionResult,
  SubjectCode,
  SubjectRatingMap,
} from '../../contracts';
import { generateCombinations } from './combinations';
import { buildCombinationReasons } from './explanations';

export const DEFAULT_ALGORITHM_VERSION = '1.0.0';
const ADVANTAGE_WEIGHT = 0.65;
const INTEREST_WEIGHT = 0.35;
const TIE_THRESHOLD = 2;
const EPSILON = 1e-9;
const MIN_KNOWN_ADVANTAGE_FOR_RANKING = 4;

function isValidRatingOrNull(value: unknown): value is RatingValue | null {
  if (value === null) return true;
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function validateInput(input: SelectionInput, context: EngineContext): CombinationDef[] {
  if (!input || typeof input !== 'object') {
    throw new EngineValidationError('INVALID_INPUT', '输入不能为空');
  }
  if (!context || !context.provinceRule) {
    throw new EngineValidationError('INVALID_INPUT', '缺少省份选科规则上下文');
  }
  if (!input.provinceCode || input.provinceCode !== context.provinceRule.provinceCode) {
    throw new EngineValidationError(
      'UNSUPPORTED_PROVINCE',
      `当前暂不支持该省份或规则不匹配: ${input.provinceCode || '未选择'}`,
      'provinceCode'
    );
  }
  if (context.provinceRule.status !== 'published') {
    throw new EngineValidationError('UNSUPPORTED_PROVINCE', '该省份规则尚未发布', 'provinceCode');
  }

  if (input.examYear !== null && (!Number.isInteger(input.examYear) || input.examYear < 2024 || input.examYear > 2040)) {
    throw new EngineValidationError('INVALID_INPUT', '预计高考年份格式不合法', 'examYear');
  }

  if (!input.advantage || typeof input.advantage !== 'object') {
    throw new EngineValidationError('INVALID_INPUT', '缺少六科学习优势自评', 'advantage');
  }

  for (const subject of ALL_SUBJECTS) {
    if (!(subject in input.advantage)) {
      throw new EngineValidationError(
        'INVALID_INPUT',
        `缺少 ${SUBJECT_LABELS[subject]} 的作答状态`,
        `advantage.${subject}`
      );
    }
    if (!isValidRatingOrNull(input.advantage[subject])) {
      throw new EngineValidationError(
        'INVALID_INPUT',
        `${SUBJECT_LABELS[subject]} 的优势档位必须为 1 至 5 或不了解`,
        `advantage.${subject}`
      );
    }
  }

  if (input.interest !== null) {
    if (typeof input.interest !== 'object') {
      throw new EngineValidationError('INVALID_INPUT', '兴趣数据结构不合法', 'interest');
    }
    for (const subject of ALL_SUBJECTS) {
      if (!(subject in input.interest)) {
        throw new EngineValidationError(
          'INVALID_INPUT',
          `缺少 ${SUBJECT_LABELS[subject]} 的兴趣作答状态`,
          `interest.${subject}`
        );
      }
      if (!isValidRatingOrNull(input.interest[subject])) {
        throw new EngineValidationError(
          'INVALID_INPUT',
          `${SUBJECT_LABELS[subject]} 的兴趣档位必须为 1 至 5 或不了解`,
          `interest.${subject}`
        );
      }
    }
  }

  if (!Array.isArray(input.preferredMajorIds)) {
    throw new EngineValidationError('INVALID_INPUT', '专业意向必须为数组', 'preferredMajorIds');
  }
  if (input.preferredMajorIds.length > 3) {
    throw new EngineValidationError('INVALID_INPUT', '专业意向最多选择 3 个', 'preferredMajorIds');
  }

  const allCombos = generateCombinations(context.provinceRule);
  const validComboSet = new Set<string>(allCombos.map((c) => c.id));

  if (input.allowedCombinationIds !== null) {
    if (!Array.isArray(input.allowedCombinationIds)) {
      throw new EngineValidationError('INVALID_INPUT', '学校开班组合限制格式不合法', 'allowedCombinationIds');
    }
    for (const cid of input.allowedCombinationIds) {
      if (!validComboSet.has(cid)) {
        throw new EngineValidationError('INVALID_INPUT', `包含非法组合编码: ${String(cid)}`, 'allowedCombinationIds');
      }
    }
  }

  return allCombos;
}

function normalizeRating(value: RatingValue): number {
  return (value - 1) / 4;
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function computeInputCompleteness(
  advantage: SubjectRatingMap,
  interest: SubjectRatingMap | null
): InputCompleteness {
  const knownAdvValues: RatingValue[] = [];
  const unknownAdvantageSubjects: SubjectCode[] = [];

  for (const subject of ALL_SUBJECTS) {
    const val = advantage[subject];
    if (val === null) {
      unknownAdvantageSubjects.push(subject);
    } else {
      knownAdvValues.push(val);
    }
  }

  let knownInterestCount = 0;
  if (interest !== null) {
    for (const subject of ALL_SUBJECTS) {
      if (interest[subject] !== null) {
        knownInterestCount += 1;
      }
    }
  }

  const interestMode: InputCompleteness['interestMode'] =
    knownInterestCount === ALL_SUBJECTS.length
      ? 'full'
      : knownInterestCount > 0
      ? 'partial'
      : 'none';

  const allAdvantageEqual =
    knownAdvValues.length === ALL_SUBJECTS.length &&
    knownAdvValues.every((v) => v === knownAdvValues[0]);

  return {
    knownAdvantageCount: knownAdvValues.length,
    totalSubjects: ALL_SUBJECTS.length,
    unknownAdvantageSubjects,
    interestMode,
    knownInterestCount,
    allAdvantageEqual,
  };
}

function getMajorStatusesForCombo(
  comboId: CombinationId,
  input: SelectionInput,
  context: EngineContext
): MajorMatchDetail[] {
  if (input.preferredMajorIds.length === 0) {
    return [];
  }

  const summary = context.majorMatchSummary;
  return input.preferredMajorIds.map((majorId) => {
    const fromSummary = summary?.byCombination?.[comboId]?.[majorId];
    if (fromSummary) {
      return fromSummary;
    }
    const fallbackName = input.preferredMajorNames?.[majorId] || majorId;
    return {
      majorId,
      majorName: fallbackName,
      status: 'unknown',
      eligibleCount: 0,
      ineligibleCount: 0,
      unknownCount: 0,
      totalCount: 0,
      isReferenceYear: summary ? summary.isReferenceYear : false,
      referenceYear: summary && summary.isReferenceYear ? summary.dataYear : null,
      dataYear: summary ? summary.dataYear : null,
      completeness: summary ? summary.completeness : 'none',
      canHardFilter: false,
      summaryText: '该方向资料尚不充分，暂无法判定',
    };
  });
}

/**
 * 选科推荐核心纯函数：确定性、无副作用、无网络/时钟依赖。
 */
export function evaluateSelection(
  input: SelectionInput,
  context: EngineContext
): SelectionResult {
  const allDefs = validateInput(input, context);
  const warnings: string[] = [];
  const conflicts: string[] = [];
  const excludedReasons: Record<string, string[]> = {};

  // 1. 省份规则与目标年份核实状态检查
  const provinceRule = context.provinceRule;
  const yearVerifiedByRule =
    input.examYear !== null && provinceRule.applicableYears.includes(input.examYear);

  if (input.examYear === null) {
    warnings.push('预计高考年份尚未确定，当前仅做科目组合比较，不输出当年可报结论');
  } else if (!yearVerifiedByRule) {
    const latestRuleYear = Math.max(...provinceRule.applicableYears);
    warnings.push(
      `目标为 ${input.examYear} 年高考，当前省份结构规则参考 ${latestRuleYear} 年公告，最终以当年官方政策为准`
    );
  }

  const majorSummary = context.majorMatchSummary || null;
  if (majorSummary?.isDemo) {
    warnings.push('当前专业选科数据为演示样例，仅供功能体验，不作为真实报考依据');
  }

  if (input.preferredMajorIds.length > 0) {
    if (!majorSummary || majorSummary.completeness === 'none') {
      warnings.push('当前暂无对应年份的专业选科库，专业意向仅作记录参考，不参与硬过滤');
    } else if (majorSummary.isReferenceYear && majorSummary.dataYear) {
      warnings.push(
        `当前专业选科条件参考 ${majorSummary.dataYear} 年资料，不作为目标年份的硬性排除条件`
      );
    } else if (majorSummary.completeness === 'partial') {
      warnings.push('当前专业库为局部收录范围，仅作提示参考，不据此排除专业方向');
    }
  }

  // 2. 应用学校开班限制和（满足条件时的）专业保留硬约束
  const allowedSet =
    input.allowedCombinationIds !== null ? new Set<CombinationId>(input.allowedCombinationIds) : null;

  const completeness = computeInputCompleteness(input.advantage, input.interest);
  const useInterestInScore = completeness.interestMode === 'full';

  if (completeness.interestMode === 'partial') {
    warnings.push('学科兴趣仅填写了部分科目，为保证比较公平，本次排序仅使用学习优势，已填兴趣保留在理由说明中');
  }

  const evaluations: CombinationEvaluation[] = allDefs.map((combo) => {
    const comboExcluded: string[] = [];
    const majorStatuses = getMajorStatusesForCombo(combo.id, input, context);

    // 学校开班限制
    if (allowedSet !== null && !allowedSet.has(combo.id)) {
      comboExcluded.push('学校未开设该选科组合');
    }

    // 专业保留硬约束（仅在目标年已核实、full 完整度且允许硬过滤时生效）
    if (input.preserveMajors && input.preferredMajorIds.length > 0) {
      for (const ms of majorStatuses) {
        if (ms.canHardFilter && !ms.isReferenceYear && ms.completeness === 'full') {
          if (ms.status === 'ineligible') {
            comboExcluded.push(`不满足保留方向「${ms.majorName}」的已知选科条件`);
          }
        }
      }
    }

    const missingSubjects = combo.subjects.filter((s) => input.advantage[s] === null);
    const { reasons, attentionNote } = buildCombinationReasons(
      combo,
      input.advantage,
      input.interest,
      majorStatuses
    );

    if (comboExcluded.length > 0) {
      excludedReasons[combo.id] = comboExcluded;
      return {
        id: combo.id,
        subjects: combo.subjects,
        displayName: combo.displayName,
        shortName: combo.shortName,
        state: 'excluded',
        internalScore: null,
        advantageScore: null,
        interestScore: null,
        usedInterest: false,
        rankGroup: null,
        isTiedWithPrevious: false,
        label: '已排除',
        reasons,
        attentionNote,
        missingSubjects,
        excludedReasons: comboExcluded,
        majorStatuses,
      };
    }

    if (
      completeness.knownAdvantageCount < MIN_KNOWN_ADVANTAGE_FOR_RANKING ||
      missingSubjects.length > 0
    ) {
      return {
        id: combo.id,
        subjects: combo.subjects,
        displayName: combo.displayName,
        shortName: combo.shortName,
        state: 'needs_input',
        internalScore: null,
        advantageScore: null,
        interestScore: null,
        usedInterest: false,
        rankGroup: null,
        isTiedWithPrevious: false,
        label: '信息待补充',
        reasons,
        attentionNote,
        missingSubjects,
        excludedReasons: [],
        majorStatuses,
      };
    }

    // 计算内部排序值（严格按 docs/03_rules_data.md 公式）
    const advNormAvg =
      combo.subjects.reduce((sum, s) => sum + normalizeRating(input.advantage[s] as RatingValue), 0) / 3;
    const advScore100 = roundScore(100 * advNormAvg);

    let intScore100: number | null = null;
    let internalScore = advScore100;

    if (useInterestInScore && input.interest !== null) {
      const intNormAvg =
        combo.subjects.reduce((sum, s) => sum + normalizeRating(input.interest![s] as RatingValue), 0) / 3;
      intScore100 = roundScore(100 * intNormAvg);
      internalScore = roundScore(100 * (ADVANTAGE_WEIGHT * advNormAvg + INTEREST_WEIGHT * intNormAvg));
    }

    return {
      id: combo.id,
      subjects: combo.subjects,
      displayName: combo.displayName,
      shortName: combo.shortName,
      state: 'ranked',
      internalScore,
      advantageScore: advScore100,
      interestScore: intScore100,
      usedInterest: useInterestInScore,
      rankGroup: null,
      isTiedWithPrevious: false,
      label: '也值得比较',
      reasons,
      attentionNote,
      missingSubjects: [],
      excludedReasons: [],
      majorStatuses,
    };
  });

  const versions = {
    algorithmVersion: context.algorithmVersion || DEFAULT_ALGORITHM_VERSION,
    provinceRuleVersion: provinceRule.version,
    datasetVersion: majorSummary ? majorSummary.datasetVersion : null,
    examYear: input.examYear,
    referenceYear: majorSummary && majorSummary.isReferenceYear ? majorSummary.dataYear : null,
  };

  // 3. 检查是否全部被硬约束排除 -> no_feasible_combination
  const nonExcluded = evaluations.filter((e) => e.state !== 'excluded');
  if (nonExcluded.length === 0) {
    if (allowedSet !== null && allowedSet.size === 0) {
      conflicts.push('当前学校开班限制中未勾选任何组合');
    } else if (allowedSet !== null && input.preserveMajors && input.preferredMajorIds.length > 0) {
      conflicts.push('学校开班限制与所选保留专业方向的选科要求存在冲突，没有同时满足的组合');
    } else if (input.preserveMajors && input.preferredMajorIds.length > 0) {
      conflicts.push('所选保留专业方向之间的选科要求存在冲突，没有同时满足的组合');
    } else {
      conflicts.push('当前设定的限制条件排除了全部组合');
    }

    return {
      status: 'no_feasible_combination',
      rankGroups: [],
      recommendations: [],
      extraTiedRecommendations: [],
      allCombinations: evaluations,
      excludedReasons,
      conflicts,
      inputCompleteness: completeness,
      warnings,
      versions,
    };
  }

  // 4. 检查是否有可排序的组合；若已知科目不足或剩余可行组合均含未知科目 -> insufficient_input
  const rankable = evaluations.filter((e) => e.state === 'ranked');
  if (completeness.knownAdvantageCount < MIN_KNOWN_ADVANTAGE_FOR_RANKING || rankable.length === 0) {
    warnings.push('已知优势科目不足以生成排序建议，请先补充标记为「还不了解」的科目');
    return {
      status: 'insufficient_input',
      rankGroups: [],
      recommendations: [],
      extraTiedRecommendations: [],
      allCombinations: evaluations,
      excludedReasons,
      conflicts,
      inputCompleteness: completeness,
      warnings,
      versions,
    };
  }

  // 5. 排序与并列分组（距离组最高分 <= 2 分放入同组，组内按 COMBINATION_ORDER 稳定排序）
  const orderIndex = new Map<CombinationId, number>(
    COMBINATION_ORDER.map((id, idx) => [id, idx])
  );

  rankable.sort((a, b) => {
    const diff = (b.internalScore ?? 0) - (a.internalScore ?? 0);
    if (Math.abs(diff) > EPSILON) {
      return diff;
    }
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });

  const rankGroups: RankGroup[] = [];
  for (const item of rankable) {
    const score = item.internalScore ?? 0;
    const currentGroup = rankGroups[rankGroups.length - 1];
    if (!currentGroup || currentGroup.topScore - score > TIE_THRESHOLD + EPSILON) {
      rankGroups.push({
        groupIndex: rankGroups.length + 1,
        topScore: score,
        combinationIds: [item.id],
        isTied: false,
      });
    } else {
      currentGroup.combinationIds.push(item.id);
      currentGroup.isTied = currentGroup.combinationIds.length > 1;
    }
  }

  // 组内再次按固定组合编码排序以保证绝对稳定
  const evalById = new Map<CombinationId, CombinationEvaluation>(
    evaluations.map((e) => [e.id, e])
  );

  const orderedRanked: CombinationEvaluation[] = [];
  for (const group of rankGroups) {
    group.combinationIds.sort(
      (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
    );
    group.combinationIds.forEach((id, idxInGroup) => {
      const ev = evalById.get(id)!;
      ev.rankGroup = group.groupIndex;
      ev.isTiedWithPrevious = idxInGroup > 0;
      ev.label = group.groupIndex === 1 ? '优先看看' : '也值得比较';
      orderedRanked.push(ev);
    });
  }

  // 6. 全部并列检测（如六科优势全部相同且未启用完整兴趣）
  if (rankGroups.length === 1 && rankGroups[0].combinationIds.length === rankable.length && rankable.length > 1) {
    warnings.push('这几组目前差异不明显，可以再看看学科兴趣和专业方向');
  }

  // 7. 生成前 3 个候选，以及第 3 候选所在并列组中的其余组合（不暗藏平局）
  const recommendations = orderedRanked.slice(0, 3);
  const extraTiedRecommendations: CombinationEvaluation[] = [];

  if (recommendations.length === 3) {
    const thirdGroupIndex = recommendations[2].rankGroup;
    const thirdGroup = rankGroups.find((g) => g.groupIndex === thirdGroupIndex);
    if (thirdGroup) {
      const recIds = new Set(recommendations.map((r) => r.id));
      for (const cid of thirdGroup.combinationIds) {
        if (!recIds.has(cid)) {
          const ev = evalById.get(cid);
          if (ev) {
            extraTiedRecommendations.push(ev);
          }
        }
      }
    }
  }

  // 8. 整理 allCombinations 顺序：ranked（按排名）→ needs_input（按固定编码）→ excluded（按固定编码）
  const needsInputList = evaluations.filter((e) => e.state === 'needs_input');
  const excludedList = evaluations.filter((e) => e.state === 'excluded');
  const allCombinations = [...orderedRanked, ...needsInputList, ...excludedList];

  return {
    status: 'ranked',
    rankGroups,
    recommendations,
    extraTiedRecommendations,
    allCombinations,
    excludedReasons,
    conflicts,
    inputCompleteness: completeness,
    warnings,
    versions,
  };
}
