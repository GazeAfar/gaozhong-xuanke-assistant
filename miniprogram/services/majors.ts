import {
  CombinationId,
  DatasetMeta,
  MajorCatalogItem,
  MajorMatchSummary,
  MatchStatus,
  OfferingRecord,
  SourceRecord,
} from '../lib/contracts/index';
import {
  describeRequirement,
  generateCombinations,
  matchOffering,
} from '../lib/rules-engine/index';
import { callApiAction } from './api';
import {
  BUILTIN_JS_RULE,
  BUILTIN_SOURCES,
  OFFICIAL_JS_QUERY_URL,
  fetchPublicManifest,
} from './rules';

export const COMMON_MAJOR_OPTIONS: MajorCatalogItem[] = [
  { id: '计算机科学与技术', name: '计算机科学与技术', category: '工学', aliases: ['计算机'], sourceId: 'S01' },
  { id: '临床医学', name: '临床医学', category: '医学', aliases: ['医学'], sourceId: 'S01' },
  { id: '法学', name: '法学', category: '法学', aliases: ['法律'], sourceId: 'S01' },
  { id: '金融学', name: '金融学', category: '经济学', aliases: ['金融'], sourceId: 'S01' },
  { id: '生物科学', name: '生物科学', category: '理学', aliases: ['生物'], sourceId: 'S01' },
  { id: '汉语言文学', name: '汉语言文学', category: '文学', aliases: ['中文'], sourceId: 'S01' },
];

export interface SearchOfferingItem extends OfferingRecord {
  dataYear: number;
  requirementSummary: string;
  matchStatus: MatchStatus | null;
}

export type MajorServiceUnavailableReason =
  | 'NO_PUBLISHED_DATASET'
  | 'NETWORK_ERROR'
  | 'DATASET_CHANGED';

export interface SearchOfferingsResult {
  available: boolean;
  unavailableReason?: MajorServiceUnavailableReason;
  unavailableMessage?: string;
  officialPortalUrl: string;
  items: SearchOfferingItem[];
  nextCursor: string | null;
  totalMatched: number;
  scope: {
    datasetVersion: string | null;
    dataYear: number | null;
    completeness: 'full' | 'partial' | 'none';
    scopeNote: string;
  };
  sources: SourceRecord[];
}

async function resolveActiveDatasetVersion(provinceCode: string): Promise<{
  datasetVersion: string | null;
  dataYear: number | null;
}> {
  const { manifest } = await fetchPublicManifest();
  const province = manifest.supportedProvinces.find((p) => p.provinceCode === provinceCode);
  return {
    datasetVersion: province?.defaultDatasetVersion || null,
    dataYear: province?.defaultDataYear || null,
  };
}

/**
 * 通过自建阿里云 HTTPS API 查询真实官方专业选科库。
 */
export async function searchOfferings(params: {
  provinceCode: string;
  q: string;
  combinationId?: CombinationId | null;
  cursor?: string | null;
  pageSize?: number;
}): Promise<SearchOfferingsResult> {
  const { datasetVersion, dataYear } = await resolveActiveDatasetVersion(params.provinceCode);
  if (!datasetVersion) {
    return {
      available: false,
      unavailableReason: 'NO_PUBLISHED_DATASET',
      unavailableMessage: '服务端尚未发布该省份的正式专业选科库，请先使用官方查询系统。',
      officialPortalUrl: OFFICIAL_JS_QUERY_URL,
      items: [],
      nextCursor: null,
      totalMatched: 0,
      scope: { datasetVersion: null, dataYear, completeness: 'none', scopeNote: '' },
      sources: BUILTIN_SOURCES,
    };
  }

  const body = await callApiAction<{
    items: Array<OfferingRecord & { dataYear: number; matchStatus: MatchStatus | null }>;
    nextCursor: string | null;
    totalMatched: number;
    scope: {
      datasetVersion: string;
      dataYear: number;
      completeness: 'full' | 'partial';
      scopeNote: string;
    };
    sourceSummary: SourceRecord[];
  }>('offerings.search', {
    provinceCode: params.provinceCode,
    datasetVersion,
    q: (params.q || '').trim().slice(0, 50),
    combinationId: params.combinationId || null,
    cursor: params.cursor || null,
    pageSize: params.pageSize || 20,
  });

  if (!body.ok || !body.data) {
    const isChanged = body.error?.code === 'DATASET_CHANGED';
    return {
      available: false,
      unavailableReason: isChanged ? 'DATASET_CHANGED' : 'NETWORK_ERROR',
      unavailableMessage:
        body.error?.message || '无法连接专业查询服务，请检查网络后重试或使用官方查询入口。',
      officialPortalUrl: OFFICIAL_JS_QUERY_URL,
      items: [],
      nextCursor: null,
      totalMatched: 0,
      scope: { datasetVersion, dataYear, completeness: 'none', scopeNote: '' },
      sources: BUILTIN_SOURCES,
    };
  }

  const items: SearchOfferingItem[] = body.data.items.map((item) => {
    const desc = describeRequirement(item.firstSubject, item.requirementTree);
    return {
      ...item,
      requirementSummary: desc.summaryText,
    };
  });

  return {
    available: true,
    officialPortalUrl: OFFICIAL_JS_QUERY_URL,
    items,
    nextCursor: body.data.nextCursor,
    totalMatched: body.data.totalMatched,
    scope: body.data.scope,
    sources: body.data.sourceSummary.length > 0 ? body.data.sourceSummary : BUILTIN_SOURCES,
  };
}

export async function getOfferingDetail(
  id: string,
  datasetVersion: string,
  combinationId?: CombinationId | null
): Promise<{
  offering: OfferingRecord;
  dataset: DatasetMeta;
  sources: SourceRecord[];
  description: { firstSubjectText: string; reselectText: string; summaryText: string };
  matchStatus: MatchStatus | null;
} | null> {
  if (!datasetVersion) return null;

  const body = await callApiAction<{
    offering: OfferingRecord;
    dataset: DatasetMeta;
    sources: SourceRecord[];
  }>('offerings.get', { id, datasetVersion });

  if (!body.ok || !body.data?.offering) return null;

  const { offering, dataset, sources } = body.data;
  const description = describeRequirement(offering.firstSubject, offering.requirementTree);

  let matchStatus: MatchStatus | null = null;
  if (combinationId) {
    const combo = generateCombinations(BUILTIN_JS_RULE).find((c) => c.id === combinationId);
    if (combo) {
      matchStatus = matchOffering(combo.subjects, offering);
    }
  }

  return { offering, dataset, sources, description, matchStatus };
}

export async function matchMajorsForCombinations(params: {
  provinceCode: string;
  examYear: number | null;
  majorIds: string[];
}): Promise<MajorMatchSummary | null> {
  if (params.majorIds.length === 0) return null;

  const { datasetVersion } = await resolveActiveDatasetVersion(params.provinceCode);
  if (!datasetVersion) return null;

  const combinationIds = generateCombinations(BUILTIN_JS_RULE).map((c) => c.id);
  const body = await callApiAction<MajorMatchSummary>('offerings.match', {
    provinceCode: params.provinceCode,
    datasetVersion,
    examYear: params.examYear,
    majorIds: params.majorIds.slice(0, 3),
    combinationIds,
  });

  if (body.ok && body.data) {
    return body.data;
  }
  return null;
}

export async function submitFeedback(payload: {
  category: 'data_error' | 'flow_issue' | 'readability' | 'other';
  message: string;
  offeringId?: string | null;
  datasetVersion?: string | null;
}): Promise<{ ok: boolean; feedbackId?: string; errorMessage?: string }> {
  const cleaned = payload.message.trim();
  if (cleaned.length < 10 || cleaned.length > 500) {
    return { ok: false, errorMessage: '反馈内容需在 10 至 500 字之间' };
  }

  const res = await callApiAction<{ feedbackId: string }>('feedback.create', {
    category: payload.category,
    message: cleaned,
    offeringId: payload.offeringId || null,
    datasetVersion: payload.datasetVersion || null,
  });

  if (res.ok && res.data?.feedbackId) {
    return { ok: true, feedbackId: res.data.feedbackId };
  }
  return { ok: false, errorMessage: res.error?.message || '提交失败，请稍后重试' };
}
