// AUTO-SYNCED FROM packages/* — 请勿手动修改，运行 npm run sync:miniprogram 更新
import {
  FirstSubjectRequirement,
  MatchStatus,
  OfferingRecord,
  RequirementTree,
  SUBJECT_LABELS,
  SubjectCode,
} from '../contracts/index';

/**
 * 判断某选科组合是否满足单条院校专业选科要求。
 * 严格遵循三态（eligible / ineligible / unknown）与首选科目 AND 规则。
 */
export function matchRequirementTree(
  combinationSubjects: readonly SubjectCode[],
  firstSubjectReq: FirstSubjectRequirement,
  tree: RequirementTree,
  reviewStatus: OfferingRecord['reviewStatus'] = 'approved'
): MatchStatus {
  if (reviewStatus !== 'approved') {
    return 'unknown';
  }
  if (firstSubjectReq === 'UNKNOWN' || tree.type === 'UNKNOWN') {
    return 'unknown';
  }

  const subjectSet = new Set(combinationSubjects);

  // 1. 首先检查首选科目要求（独立保存并与要求树做 AND）
  if (firstSubjectReq === 'PHYSICS' && !subjectSet.has('PHYSICS')) {
    return 'ineligible';
  }
  if (firstSubjectReq === 'HISTORY' && !subjectSet.has('HISTORY')) {
    return 'ineligible';
  }

  // 2. 再检查再选/指定科目要求树
  if (tree.type === 'NONE') {
    return 'eligible';
  }

  if (tree.type === 'ALL') {
    if (!Array.isArray(tree.subjects) || tree.subjects.length === 0) {
      return 'unknown';
    }
    const allMet = tree.subjects.every((s) => subjectSet.has(s));
    return allMet ? 'eligible' : 'ineligible';
  }

  if (tree.type === 'ANY') {
    if (!Array.isArray(tree.subjects) || tree.subjects.length === 0) {
      return 'unknown';
    }
    const anyMet = tree.subjects.some((s) => subjectSet.has(s));
    return anyMet ? 'eligible' : 'ineligible';
  }

  return 'unknown';
}

export function matchOffering(
  combinationSubjects: readonly SubjectCode[],
  offering: OfferingRecord
): MatchStatus {
  return matchRequirementTree(
    combinationSubjects,
    offering.firstSubject,
    offering.requirementTree,
    offering.reviewStatus
  );
}

/**
 * 生成面向家长的标准化选科条件解释文案。
 */
export function describeRequirement(
  firstSubjectReq: FirstSubjectRequirement,
  tree: RequirementTree
): { firstSubjectText: string; reselectText: string; summaryText: string } {
  let firstSubjectText = '首选科目不限（物理或历史均可）';
  if (firstSubjectReq === 'PHYSICS') {
    firstSubjectText = '首选科目必选：物理';
  } else if (firstSubjectReq === 'HISTORY') {
    firstSubjectText = '首选科目必选：历史';
  } else if (firstSubjectReq === 'UNKNOWN') {
    firstSubjectText = '首选科目要求待核实';
  }

  let reselectText = '不提再选科目要求';
  if (tree.type === 'ALL') {
    const names = tree.subjects.map((s) => SUBJECT_LABELS[s]).join('、');
    reselectText = `${names}（这些科目都需要选）`;
  } else if (tree.type === 'ANY') {
    const names = tree.subjects.map((s) => SUBJECT_LABELS[s]).join('或');
    reselectText = `${names}（选考其中 1 门即可）`;
  } else if (tree.type === 'UNKNOWN') {
    reselectText = '选科条件原文暂无法自动确认，需人工核实';
  }

  let summaryText = '';
  if (firstSubjectReq === 'UNKNOWN' || tree.type === 'UNKNOWN') {
    summaryText = '选科条件待核实';
  } else if (tree.type === 'NONE') {
    summaryText =
      firstSubjectReq === 'ANY'
        ? '不提科目要求'
        : `仅限首选${SUBJECT_LABELS[firstSubjectReq]}，不提再选要求`;
  } else if (tree.type === 'ALL') {
    const names = tree.subjects.map((s) => SUBJECT_LABELS[s]).join('+');
    summaryText = `须同时选考：${names}`;
  } else {
    const names = tree.subjects.map((s) => SUBJECT_LABELS[s]).join('/');
    summaryText = `选考其一：${names}`;
  }

  return { firstSubjectText, reselectText, summaryText };
}
