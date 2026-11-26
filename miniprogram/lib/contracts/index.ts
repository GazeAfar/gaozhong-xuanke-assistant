// AUTO-SYNCED FROM packages/* — 请勿手动修改，运行 npm run sync:miniprogram 更新
export type FirstSubjectCode = 'PHYSICS' | 'HISTORY';
export type ElectiveSubjectCode = 'CHEMISTRY' | 'BIOLOGY' | 'POLITICS' | 'GEOGRAPHY';
export type SubjectCode = FirstSubjectCode | ElectiveSubjectCode;

export type CombinationId =
  | 'P_CB'
  | 'P_CP'
  | 'P_CG'
  | 'P_BP'
  | 'P_BG'
  | 'P_PG'
  | 'H_CB'
  | 'H_CP'
  | 'H_CG'
  | 'H_BP'
  | 'H_BG'
  | 'H_PG';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export type SubjectRatingMap = Record<SubjectCode, RatingValue | null>;
export type DraftRatingMap = Partial<Record<SubjectCode, RatingValue | null>>;

export const ALL_SUBJECTS: readonly SubjectCode[] = [
  'PHYSICS',
  'HISTORY',
  'CHEMISTRY',
  'BIOLOGY',
  'POLITICS',
  'GEOGRAPHY',
] as const;

export const FIRST_SUBJECTS: readonly FirstSubjectCode[] = ['PHYSICS', 'HISTORY'] as const;

export const ELECTIVE_SUBJECTS: readonly ElectiveSubjectCode[] = [
  'CHEMISTRY',
  'BIOLOGY',
  'POLITICS',
  'GEOGRAPHY',
] as const;

export const COMBINATION_ORDER: readonly CombinationId[] = [
  'P_CB',
  'P_CP',
  'P_CG',
  'P_BP',
  'P_BG',
  'P_PG',
  'H_CB',
  'H_CP',
  'H_CG',
  'H_BP',
  'H_BG',
  'H_PG',
] as const;

export const SUBJECT_LABELS: Record<SubjectCode, string> = {
  PHYSICS: '物理',
  HISTORY: '历史',
  CHEMISTRY: '化学',
  BIOLOGY: '生物学',
  POLITICS: '思想政治',
  GEOGRAPHY: '地理',
};

export const SUBJECT_SHORT_LABELS: Record<SubjectCode, string> = {
  PHYSICS: '物',
  HISTORY: '史',
  CHEMISTRY: '化',
  BIOLOGY: '生',
  POLITICS: '政',
  GEOGRAPHY: '地',
};

export const ADVANTAGE_LABELS: Record<RatingValue, string> = {
  1: '比较吃力',
  2: '稍有困难',
  3: '一般',
  4: '比较擅长',
  5: '很有优势',
};

export const INTEREST_LABELS: Record<RatingValue, string> = {
  1: '很不喜欢',
  2: '不太喜欢',
  3: '一般',
  4: '比较喜欢',
  5: '很喜欢',
};

export type ProvinceMode = '3+1+2';

export interface ProvinceRule {
  provinceCode: string;
  provinceName: string;
  mode: ProvinceMode;
  applicableYears: number[];
  firstSubjects: FirstSubjectCode[];
  electiveSubjects: ElectiveSubjectCode[];
  electivePickCount: number;
  version: string;
  status: 'published' | 'draft' | 'archived';
  sourceId: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  checkedAt: string;
  sha256: string;
  usageNote: string;
}

export type DatasetKind = 'subject_requirements' | 'annual_plan';
export type DatasetCompleteness = 'full' | 'partial';

export interface DatasetMeta {
  id: string;
  provinceCode: string;
  dataYear: number;
  applicableYears: number[];
  kind: DatasetKind;
  level: string;
  version: string;
  status: 'published' | 'draft' | 'archived';
  sourceIds: string[];
  completeness: DatasetCompleteness;
  scopeNote: string;
  isDemo?: boolean;
}

export type FirstSubjectRequirement = 'PHYSICS' | 'HISTORY' | 'ANY' | 'UNKNOWN';

export type RequirementTree =
  | { type: 'NONE' }
  | { type: 'ALL'; subjects: SubjectCode[] }
  | { type: 'ANY'; subjects: SubjectCode[] }
  | { type: 'UNKNOWN'; reason?: string };

export type MatchStatus = 'eligible' | 'ineligible' | 'unknown';

export interface OfferingRecord {
  id: string;
  datasetId: string;
  institutionCode: string;
  institutionName: string;
  majorCode: string | null;
  majorName: string;
  majorId?: string | null;
  level: string;
  firstSubject: FirstSubjectRequirement;
  requirementTree: RequirementTree;
  requirementRaw: string;
  reviewStatus: 'approved' | 'pending' | 'unknown';
  isDemo?: boolean;
}

export interface MajorCatalogItem {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  sourceId: string;
}

export interface CombinationDef {
  id: CombinationId;
  subjects: [SubjectCode, SubjectCode, SubjectCode];
  displayName: string;
  shortName: string;
}

export interface MajorMatchDetail {
  majorId: string;
  majorName: string;
  status: MatchStatus;
  eligibleCount: number;
  ineligibleCount: number;
  unknownCount: number;
  totalCount: number;
  isReferenceYear: boolean;
  referenceYear: number | null;
  dataYear: number | null;
  completeness: DatasetCompleteness | 'none';
  canHardFilter: boolean;
  summaryText: string;
}

export interface MajorMatchSummary {
  datasetVersion: string | null;
  dataYear: number | null;
  isReferenceYear: boolean;
  completeness: DatasetCompleteness | 'none';
  canHardFilter: boolean;
  scopeNote: string;
  isDemo?: boolean;
  byCombination: Record<string, Record<string, MajorMatchDetail>>;
}

export interface SelectionInput {
  provinceCode: string;
  examYear: number | null;
  advantage: SubjectRatingMap;
  interest: SubjectRatingMap | null;
  preferredMajorIds: string[];
  preferredMajorNames?: Record<string, string>;
  preserveMajors: boolean;
  allowedCombinationIds: CombinationId[] | null;
  useReferenceData?: boolean;
}

export interface EngineContext {
  algorithmVersion: string;
  provinceRule: ProvinceRule;
  majorMatchSummary?: MajorMatchSummary | null;
}

export type EngineStatus = 'ranked' | 'insufficient_input' | 'no_feasible_combination';
export type CombinationState = 'ranked' | 'needs_input' | 'excluded';
export type RecommendationLabel = '优先看看' | '也值得比较' | '信息待补充' | '已排除';

export interface CombinationEvaluation {
  id: CombinationId;
  subjects: [SubjectCode, SubjectCode, SubjectCode];
  displayName: string;
  shortName: string;
  state: CombinationState;
  internalScore: number | null;
  advantageScore: number | null;
  interestScore: number | null;
  usedInterest: boolean;
  rankGroup: number | null;
  isTiedWithPrevious: boolean;
  label: RecommendationLabel;
  reasons: string[];
  attentionNote: string | null;
  missingSubjects: SubjectCode[];
  excludedReasons: string[];
  majorStatuses: MajorMatchDetail[];
}

export interface RankGroup {
  groupIndex: number;
  topScore: number;
  combinationIds: CombinationId[];
  isTied: boolean;
}

export interface InputCompleteness {
  knownAdvantageCount: number;
  totalSubjects: number;
  unknownAdvantageSubjects: SubjectCode[];
  interestMode: 'full' | 'partial' | 'none';
  knownInterestCount: number;
  allAdvantageEqual: boolean;
}

export interface ResultVersions {
  algorithmVersion: string;
  provinceRuleVersion: string;
  datasetVersion: string | null;
  examYear: number | null;
  referenceYear: number | null;
}

export interface SelectionResult {
  status: EngineStatus;
  rankGroups: RankGroup[];
  recommendations: CombinationEvaluation[];
  extraTiedRecommendations: CombinationEvaluation[];
  allCombinations: CombinationEvaluation[];
  excludedReasons: Record<string, string[]>;
  conflicts: string[];
  inputCompleteness: InputCompleteness;
  warnings: string[];
  versions: ResultVersions;
}

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_PROVINCE'
  | 'YEAR_NOT_VERIFIED'
  | 'DATASET_NOT_FOUND'
  | 'DATASET_CHANGED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiRequest<TPayload = unknown> {
  action: string;
  requestId: string;
  payload: TPayload;
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

export interface ApiResponse<TData = unknown> {
  ok: boolean;
  data?: TData;
  error?: ApiErrorBody;
  requestId: string;
  schemaVersion: string;
}

export class EngineValidationError extends Error {
  public readonly code: ApiErrorCode;
  public readonly field?: string;

  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'EngineValidationError';
    this.code = code;
    this.field = field;
  }
}

export interface DraftState {
  schemaVersion: number;
  updatedAt: string;
  provinceCode: string;
  examYear: number | null;
  useReferenceData: boolean;
  advantage: DraftRatingMap;
  interestEnabled: boolean;
  interest: DraftRatingMap;
  noMajorDirection: boolean;
  preferredMajorIds: string[];
  preferredMajorNames: Record<string, string>;
  preserveMajors: boolean;
  schoolRestrictionEnabled: boolean;
  allowedCombinationIds: CombinationId[];
}

export interface SavedReport {
  schemaVersion: number;
  id: string;
  createdAt: string;
  provinceName: string;
  inputSnapshot: SelectionInput;
  resultSnapshot: SelectionResult;
  algorithmVersion: string;
  provinceRuleVersion: string;
  datasetVersion: string | null;
  examYear: number | null;
  referenceYear: number | null;
}

export interface PublicManifest {
  schemaVersion: number;
  updatedAt: string;
  supportedProvinces: Array<{
    provinceCode: string;
    provinceName: string;
    ruleVersion: string;
    availableYears: number[];
    defaultDatasetVersion: string | null;
    defaultDataYear: number | null;
  }>;
  featureFlags: {
    adEnabled: boolean;
    rewardedAdEnabled: boolean;
    demoDataMode: boolean;
  };
}
