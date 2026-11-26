// AUTO-SYNCED FROM packages/* — 请勿手动修改，运行 npm run sync:miniprogram 更新
import {
  ALL_SUBJECTS,
  COMBINATION_ORDER,
  CombinationDef,
  CombinationId,
  ElectiveSubjectCode,
  EngineValidationError,
  FirstSubjectCode,
  ProvinceRule,
  SUBJECT_LABELS,
  SUBJECT_SHORT_LABELS,
  SubjectCode,
} from '../contracts/index';

const ELECTIVE_PAIR_CODES: Record<string, string> = {
  'CHEMISTRY_BIOLOGY': 'CB',
  'CHEMISTRY_POLITICS': 'CP',
  'CHEMISTRY_GEOGRAPHY': 'CG',
  'BIOLOGY_POLITICS': 'BP',
  'BIOLOGY_GEOGRAPHY': 'BG',
  'POLITICS_GEOGRAPHY': 'PG',
};

const ELECTIVE_CANONICAL_ORDER: ElectiveSubjectCode[] = [
  'CHEMISTRY',
  'BIOLOGY',
  'POLITICS',
  'GEOGRAPHY',
];

function buildCombinationId(
  first: FirstSubjectCode,
  e1: ElectiveSubjectCode,
  e2: ElectiveSubjectCode
): CombinationId {
  const prefix = first === 'PHYSICS' ? 'P' : 'H';
  const sorted = [e1, e2].sort(
    (a, b) => ELECTIVE_CANONICAL_ORDER.indexOf(a) - ELECTIVE_CANONICAL_ORDER.indexOf(b)
  );
  const key = `${sorted[0]}_${sorted[1]}`;
  const suffix = ELECTIVE_PAIR_CODES[key];
  if (!suffix) {
    throw new EngineValidationError('INVALID_INPUT', `无法识别的再选科目组合: ${key}`);
  }
  return `${prefix}_${suffix}` as CombinationId;
}

/**
 * 根据省份配置生成合法组合，按固定 COMBINATION_ORDER 稳定排序。
 */
export function generateCombinations(provinceRule: ProvinceRule): CombinationDef[] {
  if (!provinceRule || provinceRule.mode !== '3+1+2') {
    throw new EngineValidationError(
      'UNSUPPORTED_PROVINCE',
      `暂不支持该省份或选科模式: ${provinceRule ? provinceRule.provinceCode : 'unknown'}`
    );
  }

  const map = new Map<CombinationId, CombinationDef>();
  const { firstSubjects, electiveSubjects, electivePickCount } = provinceRule;

  if (electivePickCount !== 2 || firstSubjects.length === 0 || electiveSubjects.length < 2) {
    throw new EngineValidationError('INVALID_INPUT', '省份选科规则配置不合法');
  }

  for (const first of firstSubjects) {
    for (let i = 0; i < electiveSubjects.length; i += 1) {
      for (let j = i + 1; j < electiveSubjects.length; j += 1) {
        const e1 = electiveSubjects[i];
        const e2 = electiveSubjects[j];
        const id = buildCombinationId(first, e1, e2);
        const subjects: [SubjectCode, SubjectCode, SubjectCode] = [first, e1, e2];
        const displayName = subjects.map((s) => SUBJECT_LABELS[s]).join(' · ');
        const shortName = subjects.map((s) => SUBJECT_SHORT_LABELS[s]).join('');
        map.set(id, { id, subjects, displayName, shortName });
      }
    }
  }

  const ordered: CombinationDef[] = [];
  for (const id of COMBINATION_ORDER) {
    const item = map.get(id);
    if (item) {
      ordered.push(item);
    }
  }
  return ordered;
}

/**
 * 校验任意三科是否构成当前省份的合法组合。
 */
export function validateThreeSubjects(
  subjects: SubjectCode[],
  provinceRule: ProvinceRule
): CombinationDef {
  if (!Array.isArray(subjects) || subjects.length !== 3) {
    throw new EngineValidationError('INVALID_INPUT', '选科组合必须包含恰好 3 门科目');
  }

  const unique = new Set(subjects);
  if (unique.size !== 3) {
    throw new EngineValidationError('INVALID_INPUT', '选科组合不能包含重复科目');
  }

  for (const s of subjects) {
    if (!ALL_SUBJECTS.includes(s)) {
      throw new EngineValidationError('INVALID_INPUT', `包含未知科目编码: ${String(s)}`);
    }
  }

  const validList = generateCombinations(provinceRule);
  const found = validList.find((combo) => combo.subjects.every((s) => unique.has(s)));
  if (!found) {
    throw new EngineValidationError(
      'INVALID_INPUT',
      `所选三科不符合 ${provinceRule.provinceName} ${provinceRule.mode} 选科规则`
    );
  }
  return found;
}
