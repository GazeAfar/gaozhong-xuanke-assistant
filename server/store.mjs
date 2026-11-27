import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCombinationMajorStats } from './advisor.mjs';
import { PROVINCE_REGISTRY, DEFAULT_PROVINCE_CODE, resolveProvince } from './provinces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * 多省份官方数据存储（启动轻量预加载 + 明细 LRU 按需懒加载）：
 * - 启动时仅加载各省规则与轻量 *-stats.json（约 15KB/省），毫秒级冷启动，不占大内存；
 * - 院校专业检索时按省懒加载全量 JSON，并通过有界 LRU 缓存（默认最多常驻 2 省）严控内存上限。
 */
export function createMemoryStore(options = {}) {
  const dataDir = options.dataDir || path.join(rootDir, 'data', 'normalized');
  const runtimeDir = options.runtimeDir || path.join(rootDir, 'data', 'runtime');
  const maxCachedDatasets = Math.max(1, Number(options.maxCachedDatasets) || 2);

  const sources = JSON.parse(fs.readFileSync(path.join(dataDir, 'sources.json'), 'utf8'));

  const rulesByCode = new Map();
  const datasetsByVersion = new Map();
  const datasetsById = new Map();
  const defaultDatasetByProvince = new Map();
  const offeringsCountByDataset = new Map();
  const bundlePathByDataset = new Map();
  const comboMajorStatsByProvince = new Map();

  // LRU 缓存：datasetId -> { indexed, byId, byMajor }，Map 迭代顺序按最近使用维护
  const datasetCache = new Map();

  const supportedProvinces = [];

  for (const prov of PROVINCE_REGISTRY) {
    const rulePath = path.join(dataDir, prov.ruleFile);
    if (!fs.existsSync(rulePath)) continue;
    const rule = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
    rulesByCode.set(prov.code, rule);

    let defaultDatasetVersion = null;
    let defaultDataYear = null;

    const bundlePath = path.join(dataDir, prov.bundleFile);
    const statsPath = prov.statsFile ? path.join(dataDir, prov.statsFile) : null;

    if (statsPath && fs.existsSync(statsPath) && fs.existsSync(bundlePath)) {
      const statsObj = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      const { dataset, offeringsCount, comboMajorStats } = statsObj;
      datasetsByVersion.set(`${dataset.provinceCode}::${dataset.version}`, dataset);
      datasetsById.set(dataset.id, dataset);
      defaultDatasetByProvince.set(prov.code, dataset);
      offeringsCountByDataset.set(dataset.id, offeringsCount);
      bundlePathByDataset.set(dataset.id, bundlePath);
      comboMajorStatsByProvince.set(prov.code, comboMajorStats);

      defaultDatasetVersion = dataset.version;
      defaultDataYear = dataset.dataYear;
    } else if (fs.existsSync(bundlePath)) {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
      const { dataset, offerings } = bundle;
      datasetsByVersion.set(`${dataset.provinceCode}::${dataset.version}`, dataset);
      datasetsById.set(dataset.id, dataset);
      defaultDatasetByProvince.set(prov.code, dataset);
      offeringsCountByDataset.set(dataset.id, offerings.length);
      bundlePathByDataset.set(dataset.id, bundlePath);
      comboMajorStatsByProvince.set(prov.code, buildCombinationMajorStats(offerings));

      defaultDatasetVersion = dataset.version;
      defaultDataYear = dataset.dataYear;
    }

    supportedProvinces.push({
      provinceCode: rule.provinceCode,
      provinceName: rule.provinceName,
      slug: prov.slug,
      mode: rule.mode,
      ruleVersion: rule.version,
      availableYears: rule.applicableYears,
      defaultDatasetVersion,
      defaultDataYear,
    });
  }

  const manifest = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    supportedProvinces,
    featureFlags: {
      adEnabled: false,
      rewardedAdEnabled: false,
      demoDataMode: false,
    },
  };

  // 滑动窗口限流表（仅存短期哈希，按 24h 自动清理）
  const rateBuckets = new Map();

  function stripInternalFields(item) {
    const { _searchMajor, _searchInst, ...clean } = item;
    return clean;
  }

  function resolveCode(provinceCode) {
    const prov = resolveProvince(provinceCode || DEFAULT_PROVINCE_CODE);
    return prov ? prov.code : DEFAULT_PROVINCE_CODE;
  }

  function getOrLoadDatasetCache(datasetId) {
    if (!datasetId) return null;
    if (datasetCache.has(datasetId)) {
      const entry = datasetCache.get(datasetId);
      // 刷新 LRU 顺序
      datasetCache.delete(datasetId);
      datasetCache.set(datasetId, entry);
      return entry;
    }

    const bundlePath = bundlePathByDataset.get(datasetId);
    if (!bundlePath || !fs.existsSync(bundlePath)) return null;

    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    const { offerings } = bundle;
    const indexed = offerings.map((item) => ({
      ...item,
      _searchMajor: (item.majorName || '').toLowerCase(),
      _searchInst: (item.institutionName || '').toLowerCase(),
    }));
    const byId = new Map();
    const byMajor = new Map();
    for (const item of indexed) {
      byId.set(item.id, item);
      const key = item.majorId || item.majorName;
      let bucket = byMajor.get(key);
      if (!bucket) {
        bucket = [];
        byMajor.set(key, bucket);
      }
      bucket.push(item);
    }

    const entry = { indexed, byId, byMajor };
    if (datasetCache.size >= maxCachedDatasets) {
      const oldestKey = datasetCache.keys().next().value;
      datasetCache.delete(oldestKey);
    }
    datasetCache.set(datasetId, entry);
    return entry;
  }

  return {
    getStats(provinceCode = DEFAULT_PROVINCE_CODE) {
      const code = resolveCode(provinceCode);
      const ds = defaultDatasetByProvince.get(code) || datasetsById.values().next().value;
      return {
        provinceCode: code,
        datasetVersion: ds ? ds.version : null,
        dataYear: ds ? ds.dataYear : null,
        offeringsCount: ds ? (offeringsCountByDataset.get(ds.id) || 0) : 0,
      };
    },

    getAllProvinceStats() {
      const result = {};
      for (const prov of PROVINCE_REGISTRY) {
        const ds = defaultDatasetByProvince.get(prov.code);
        result[prov.code] = {
          provinceCode: prov.code,
          provinceName: prov.name,
          slug: prov.slug,
          datasetVersion: ds ? ds.version : null,
          dataYear: ds ? ds.dataYear : null,
          offeringsCount: ds ? (offeringsCountByDataset.get(ds.id) || 0) : 0,
        };
      }
      return result;
    },

    getCacheInfo() {
      return {
        cachedDatasets: Array.from(datasetCache.keys()),
        maxCachedDatasets,
      };
    },

    getComboMajorStats(provinceCode = DEFAULT_PROVINCE_CODE) {
      const code = resolveCode(provinceCode);
      return comboMajorStatsByProvince.get(code) || {};
    },

    getAllSources() {
      return sources;
    },

    getSourcesForProvince(provinceCode = DEFAULT_PROVINCE_CODE) {
      const code = resolveCode(provinceCode);
      const ds = defaultDatasetByProvince.get(code);
      const ids = new Set(ds?.sourceIds || []);
      ids.add('S02');
      if (code === 'JS') ids.add('S01_PORTAL');
      return sources.filter((s) => ids.has(s.id));
    },

    async searchOfferingsFiltered({ provinceCode = DEFAULT_PROVINCE_CODE, q, level, offset, limit }) {
      const code = resolveCode(provinceCode);
      const ds = defaultDatasetByProvince.get(code) || datasetsById.values().next().value;
      if (!ds) return { items: [], total: 0, dataYear: null, datasetVersion: null, provinceCode: code };
      const cache = getOrLoadDatasetCache(ds.id);
      const list = cache ? cache.indexed : [];
      const lowered = (q || '').trim().toLowerCase();
      const matched = list.filter((item) => {
        if (level && level !== 'ALL' && item.level !== level) return false;
        if (!lowered) return true;
        return item._searchMajor.includes(lowered) || item._searchInst.includes(lowered);
      });
      return {
        items: matched.slice(offset, offset + limit).map(stripInternalFields),
        total: matched.length,
        dataYear: ds.dataYear,
        datasetVersion: ds.version,
        provinceCode: code,
      };
    },

    async getManifest() {
      return manifest;
    },

    async getProvinceRule(provinceCode, ruleVersion) {
      const rule = rulesByCode.get(String(provinceCode || '').toUpperCase());
      if (!rule) return null;
      if (ruleVersion && ruleVersion !== rule.version) return null;
      return rule;
    },

    async getSourceById(id) {
      return sources.find((s) => s.id === id) || null;
    },

    async getSourcesByIds(ids) {
      return sources.filter((s) => ids.includes(s.id));
    },

    async getDataset(provinceCode, version) {
      return datasetsByVersion.get(`${provinceCode}::${version}`) || null;
    },

    async getDatasetById(id) {
      return datasetsById.get(id) || null;
    },

    async searchOfferingsPage({ datasetId, q, offset, limit }) {
      const cache = getOrLoadDatasetCache(datasetId);
      const list = cache ? cache.indexed : [];
      const lowered = (q || '').toLowerCase();
      let matched = list;
      if (lowered) {
        matched = list.filter(
          (item) => item._searchMajor.includes(lowered) || item._searchInst.includes(lowered)
        );
      }
      const slice = matched.slice(offset, offset + limit).map(stripInternalFields);
      return { items: slice, total: matched.length };
    },

    async getOfferingsByMajorIds(datasetId, majorIds) {
      const cache = getOrLoadDatasetCache(datasetId);
      if (!cache) return [];
      const results = [];
      for (const mid of majorIds) {
        const bucket = cache.byMajor.get(mid);
        if (bucket) {
          for (const item of bucket) {
            results.push(stripInternalFields(item));
          }
        }
      }
      return results;
    },

    async getOfferingById(id, datasetVersion) {
      let targetDs = null;
      for (const ds of datasetsById.values()) {
        if (ds.version === datasetVersion) {
          targetDs = ds;
          break;
        }
      }
      if (!targetDs) return null;
      const cache = getOrLoadDatasetCache(targetDs.id);
      const found = cache?.byId.get(id);
      return found ? stripInternalFields(found) : null;
    },

    async checkRateLimit(rateKey, maxPerHour = 5) {
      const now = Date.now();
      const windowMs = 60 * 60 * 1000;
      const list = (rateBuckets.get(rateKey) || []).filter((ts) => now - ts < windowMs);
      if (list.length >= maxPerHour) {
        rateBuckets.set(rateKey, list);
        return false;
      }
      list.push(now);
      rateBuckets.set(rateKey, list);
      return true;
    },

    async saveFeedback(record) {
      fs.mkdirSync(runtimeDir, { recursive: true });
      const filePath = path.join(runtimeDir, 'feedback.jsonl');
      fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
    },
  };
}
