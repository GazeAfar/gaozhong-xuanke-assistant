// AUTO-SYNCED FROM packages/* — 请勿手动修改，运行 npm run sync:miniprogram 更新
import {
  ADVANTAGE_LABELS,
  CombinationDef,
  INTEREST_LABELS,
  MajorMatchDetail,
  RatingValue,
  SUBJECT_LABELS,
  SubjectCode,
  SubjectRatingMap,
} from '../contracts/index';

/**
 * 根据真实用户输入生成确定性、可解释的推荐理由和关注点。
 * 严格避免“赋分容易”“最好学”等未经验证的断言。
 */
export function buildCombinationReasons(
  combo: CombinationDef,
  advantage: SubjectRatingMap,
  interest: SubjectRatingMap | null,
  majorStatuses: MajorMatchDetail[]
): { reasons: string[]; attentionNote: string | null } {
  const reasons: string[] = [];
  let attentionNote: string | null = null;

  const subjectFacts = combo.subjects.map((subject) => ({
    subject,
    name: SUBJECT_LABELS[subject],
    adv: advantage[subject],
    int: interest ? interest[subject] : null,
  }));

  // 1. 按优势从高到低挑选最相关的事实
  const knownAdv = subjectFacts
    .filter((f): f is { subject: SubjectCode; name: string; adv: RatingValue; int: RatingValue | null } => f.adv !== null)
    .sort((a, b) => b.adv - a.adv);

  for (const fact of knownAdv) {
    if (reasons.length >= 2) break;
    reasons.push(`你将${fact.name}的学习优势评为「${ADVANTAGE_LABELS[fact.adv]}」`);
  }

  // 2. 如果存在明确兴趣（包括部分填写的已知兴趣），补充兴趣事实或冲突提示
  const likedSubject = subjectFacts
    .filter((f): f is { subject: SubjectCode; name: string; adv: RatingValue | null; int: RatingValue } => f.int !== null && f.int >= 4)
    .sort((a, b) => b.int - a.int)[0];

  if (likedSubject) {
    const interestLine = `${likedSubject.name}是你「${INTEREST_LABELS[likedSubject.int]}」的科目`;
    if (reasons.length < 2) {
      reasons.push(interestLine);
    } else if (knownAdv.length > 0 && knownAdv[0].adv <= 3) {
      reasons[1] = interestLine;
    } else {
      reasons.push(interestLine);
    }
  }

  // 3. 检测优势与兴趣冲突，或某科相对吃力的关注点
  const conflictHighIntLowAdv = subjectFacts.find(
    (f) => f.int !== null && f.int >= 4 && f.adv !== null && f.adv <= 2
  );
  const conflictHighAdvLowInt = subjectFacts.find(
    (f) => f.adv !== null && f.adv >= 4 && f.int !== null && f.int <= 2
  );
  const weakAdv = subjectFacts.find((f) => f.adv !== null && f.adv <= 2);
  const missingAdv = subjectFacts.filter((f) => f.adv === null);

  if (conflictHighIntLowAdv && conflictHighIntLowAdv.adv !== null) {
    attentionNote = `你喜欢${conflictHighIntLowAdv.name}，但目前自评「${ADVANTAGE_LABELS[conflictHighIntLowAdv.adv]}」，可以进一步和老师确认学习负担`;
  } else if (conflictHighAdvLowInt && conflictHighAdvLowInt.int !== null) {
    attentionNote = `${conflictHighAdvLowInt.name}目前有优势，但兴趣偏低（${INTEREST_LABELS[conflictHighAdvLowInt.int]}），建议和孩子沟通长期学习意愿`;
  } else if (weakAdv && weakAdv.adv !== null) {
    attentionNote = `组合中的${weakAdv.name}目前自评「${ADVANTAGE_LABELS[weakAdv.adv]}」，可结合后续学习进度再评估`;
  } else if (missingAdv.length > 0) {
    const names = missingAdv.map((m) => m.name).join('、');
    attentionNote = `仍需补充${names}的学习情况，补充后可以更完整地比较`;
  }

  // 4. 专业意向的软提示（如未触发更紧急的关注点）
  if (!attentionNote && majorStatuses.length > 0) {
    const ineligibleMajor = majorStatuses.find((m) => m.status === 'ineligible');
    const unknownMajor = majorStatuses.find((m) => m.status === 'unknown');
    if (ineligibleMajor) {
      const yearPrefix =
        ineligibleMajor.isReferenceYear && ineligibleMajor.referenceYear
          ? `参考 ${ineligibleMajor.referenceYear} 年资料，`
          : '';
      attentionNote = `${yearPrefix}意向方向「${ineligibleMajor.majorName}」在当前收录条目中有不满足选科条件的情况，建议查看明细`;
    } else if (unknownMajor) {
      attentionNote = `意向方向「${unknownMajor.majorName}」的资料尚不充分，需以当年官方招生要求为准`;
    }
  }

  if (reasons.length === 0) {
    reasons.push('当前已知科目信息较少，补充更多科目的自评后可生成更具体依据');
  }

  return { reasons: reasons.slice(0, 3), attentionNote };
}
