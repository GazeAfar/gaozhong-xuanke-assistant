import {
  ProvinceRule,
  PublicManifest,
  SourceRecord,
} from '../lib/contracts/index';
import { callApiAction } from './api';
import { loadCachedManifest, saveCachedManifest } from './storage';

const KEY_RULE_PREFIX = 'xuanke:v1:rule:';

export const OFFICIAL_JS_QUERY_URL = 'https://gk.jseea.cn:5443/xkcx/';

export const BUILTIN_SOURCES: SourceRecord[] = [
  {
    id: 'S01',
    title: '省教育厅关于发布2027年拟在江苏招生的普通高校专业选考科目要求的公告',
    publisher: '江苏省教育考试院（转发省教育厅）',
    url: 'https://www.jseea.cn/webfile/index/index_zkxx/2025-02-20/7298268759544827904.html',
    publishedAt: '2025-02-20',
    checkedAt: '2026-11-25',
    sha256: '102914d344201306fe497094c77f65c02b74151b7c33be4123acbf60079ef5cd',
    usageNote: '已核查并导入 2027 年江苏 3+1+2 普通高校 79,753 条专业选考科目要求；实际招生以当年计划为准。',
  },
  {
    id: 'S01_PORTAL',
    title: '2027年拟在江苏招生的普通高校专业选考科目要求查询系统',
    publisher: '江苏省教育考试院',
    url: OFFICIAL_JS_QUERY_URL,
    publishedAt: '2025-02-20',
    checkedAt: '2026-11-25',
    sha256: 'online-query-portal',
    usageNote: '官方在线查询入口，可按院校、专业、考生选考科目或高校选科要求检索。',
  },
  {
    id: 'S02',
    title: '本科专业选考科目要求在哪里看',
    publisher: '中华人民共和国教育部',
    url: 'https://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2025/2025_zt10/wd/gkwd_zlhz/202506/t20250604_1192961.html',
    publishedAt: '2025-06-04',
    checkedAt: '2026-11-25',
    sha256: 'pending-raw-archive-hash',
    usageNote: '提示从本省教育考试院查询对应年份选考科目要求，不构成其他年份规则的证据。',
  },
];

export const BUILTIN_JS_RULE: ProvinceRule = {
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

export const BUILTIN_MANIFEST: PublicManifest = {
  schemaVersion: 1,
  updatedAt: '2026-11-25T00:00:00Z',
  supportedProvinces: [
    {
      provinceCode: 'JS',
      provinceName: '江苏',
      ruleVersion: 'JS-2027.1',
      availableYears: [2027],
      defaultDatasetVersion: 'JS-2027.1',
      defaultDataYear: 2027,
    },
  ],
  featureFlags: {
    adEnabled: false,
    rewardedAdEnabled: false,
    demoDataMode: false,
  },
};

export const PROVINCE_OPTIONS = [
  { code: 'JS', name: '江苏', supported: true },
  { code: 'ZJ', name: '浙江（准备中）', supported: false },
  { code: 'GD', name: '广东（准备中）', supported: false },
  { code: 'SD', name: '山东（准备中）', supported: false },
  { code: 'OTHER', name: '其他省份（准备中）', supported: false },
];

export const EXAM_YEAR_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: '2027 年高考', value: 2027 },
  { label: '2028 年高考', value: 2028 },
  { label: '2029 年高考', value: 2029 },
  { label: '2030 年高考', value: 2030 },
  { label: '还不确定', value: null },
];

export async function fetchPublicManifest(): Promise<{
  manifest: PublicManifest;
  fromCache: boolean;
}> {
  const app = getApp<{ globalData?: { appVersion?: string } }>();
  const res = await callApiAction<{ currentManifest: PublicManifest }>('config.get', {
    appVersion: app?.globalData?.appVersion || '0.1.0',
  });
  if (res.ok && res.data?.currentManifest) {
    saveCachedManifest(res.data.currentManifest);
    return { manifest: res.data.currentManifest, fromCache: false };
  }

  const cached = loadCachedManifest();
  if (cached) {
    return { manifest: cached, fromCache: true };
  }
  saveCachedManifest(BUILTIN_MANIFEST);
  return { manifest: BUILTIN_MANIFEST, fromCache: true };
}

export async function fetchProvinceRule(provinceCode: string): Promise<ProvinceRule | null> {
  if (provinceCode !== 'JS') {
    return null;
  }

  const cacheKey = `${KEY_RULE_PREFIX}${provinceCode}`;
  const res = await callApiAction<{ rule: ProvinceRule }>('rules.get', { provinceCode });
  if (res.ok && res.data?.rule) {
    try {
      wx.setStorageSync(cacheKey, res.data.rule);
    } catch {
      // ignore
    }
    return res.data.rule;
  }

  try {
    const cached = wx.getStorageSync(cacheKey) as ProvinceRule | undefined;
    if (cached && cached.provinceCode === provinceCode && cached.status === 'published') {
      return cached;
    }
  } catch {
    // ignore
  }

  try {
    wx.setStorageSync(cacheKey, BUILTIN_JS_RULE);
  } catch {
    // ignore
  }
  return BUILTIN_JS_RULE;
}

export function getSources(): SourceRecord[] {
  return BUILTIN_SOURCES;
}
