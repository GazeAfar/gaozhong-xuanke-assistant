import {
  CombinationId,
  DraftState,
  PublicManifest,
  SavedReport,
} from '../lib/contracts/index';

const KEY_DRAFT = 'xuanke:v1:draft';
const KEY_REPORTS = 'xuanke:v1:reports';
const KEY_SETTINGS = 'xuanke:v1:settings';
const KEY_MANIFEST = 'xuanke:v1:publicManifest';
const KEY_COMPARE = 'xuanke:v1:compareSelection';
const KEY_SCROLL = 'xuanke:v1:assessmentScroll';

export const MAX_SAVED_REPORTS = 20;
const CURRENT_SCHEMA_VERSION = 1;

export interface AppSettings {
  schemaVersion: number;
  analyticsOptIn: boolean;
}

export function createEmptyDraft(provinceCode = 'JS', examYear: number | null = 2027): DraftState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    provinceCode,
    examYear,
    useReferenceData: false,
    advantage: {},
    interestEnabled: false,
    interest: {},
    noMajorDirection: true,
    preferredMajorIds: [],
    preferredMajorNames: {},
    preserveMajors: false,
    schoolRestrictionEnabled: false,
    allowedCombinationIds: [],
  };
}

function safeGetStorage<T>(key: string): T | null {
  try {
    const raw = wx.getStorageSync(key);
    if (!raw) return null;
    return raw as T;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: unknown): boolean {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(): DraftState | null {
  const data = safeGetStorage<DraftState>(KEY_DRAFT);
  if (!data || typeof data !== 'object' || data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return null;
  }
  return data;
}

export function saveDraft(draft: DraftState): boolean {
  const next: DraftState = {
    ...draft,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  return safeSetStorage(KEY_DRAFT, next);
}

export function clearDraft(): void {
  try {
    wx.removeStorageSync(KEY_DRAFT);
    wx.removeStorageSync(KEY_SCROLL);
  } catch {
    // ignore
  }
}

export function saveAssessmentScroll(scrollTop: number): void {
  safeSetStorage(KEY_SCROLL, scrollTop);
}

export function loadAssessmentScroll(): number {
  const val = safeGetStorage<number>(KEY_SCROLL);
  return typeof val === 'number' && val >= 0 ? val : 0;
}

export function loadReports(): SavedReport[] {
  const list = safeGetStorage<SavedReport[]>(KEY_REPORTS);
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && typeof item.id === 'string' && item.resultSnapshot);
}

export function getReportById(id: string): SavedReport | null {
  const list = loadReports();
  return list.find((r) => r.id === id) || null;
}

export function saveReport(report: SavedReport): {
  saved: boolean;
  trimmedOldest: boolean;
} {
  const existing = loadReports().filter((r) => r.id !== report.id);
  const next = [report, ...existing];
  let trimmedOldest = false;
  if (next.length > MAX_SAVED_REPORTS) {
    next.length = MAX_SAVED_REPORTS;
    trimmedOldest = true;
  }
  const saved = safeSetStorage(KEY_REPORTS, next);
  return { saved, trimmedOldest };
}

export function deleteReport(id: string): boolean {
  const next = loadReports().filter((r) => r.id !== id);
  return safeSetStorage(KEY_REPORTS, next);
}

export function clearAllReports(): void {
  try {
    wx.removeStorageSync(KEY_REPORTS);
  } catch {
    // ignore
  }
}

export function generateLocalId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `rpt_${Date.now().toString(36)}_${rand}`;
}

export function loadCompareSelection(): CombinationId[] {
  const list = safeGetStorage<CombinationId[]>(KEY_COMPARE);
  return Array.isArray(list) ? list.slice(0, 3) : [];
}

export function saveCompareSelection(ids: CombinationId[]): boolean {
  return safeSetStorage(KEY_COMPARE, ids.slice(0, 3));
}

export function loadCachedManifest(): PublicManifest | null {
  return safeGetStorage<PublicManifest>(KEY_MANIFEST);
}

export function saveCachedManifest(manifest: PublicManifest): boolean {
  return safeSetStorage(KEY_MANIFEST, manifest);
}

export function loadSettings(): AppSettings {
  const data = safeGetStorage<AppSettings>(KEY_SETTINGS);
  if (!data || typeof data !== 'object') {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, analyticsOptIn: false };
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    analyticsOptIn: Boolean(data.analyticsOptIn),
  };
}

export function saveSettings(settings: AppSettings): boolean {
  return safeSetStorage(KEY_SETTINGS, settings);
}
