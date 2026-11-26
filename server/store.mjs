import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCombinationMajorStats } from './advisor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * 加载官方标准化数据到内存并建立快速索引，支撑 7.9 万+ 条目毫秒级检索与匹配。
 */
export function createMemoryStore(options = {}) {
  const dataDir = options.dataDir || path.join(rootDir, 'data', 'normalized');
  const runtimeDir = options.runtimeDir || path.join(rootDir, 'data', 'runtime');

  const sources = JSON.parse(fs.readFileSync(path.join(dataDir, 'sources.json'), 'utf8'));
  const jsRule = JSON.parse(fs.readFileSync(path.join(dataDir, 'js-2027-rule.json'), 'utf8'));
  const jsBundlePath = path.join(dataDir, 'js-2027.json');

  const datasetsByVersion = new Map();
  const datasetsById = new Map();
  const offeringsByDataset = new Map();
  const offeringsById = new Map();
  const offeringsByMajor = new Map(); // datasetId -> Map<majorName, offering[]>

  let defaultDatasetVersion = null;
  let defaultDataYear = null;
  let comboMajorStats = {};

  if (fs.existsSync(jsBundlePath)) {
    const bundle = JSON.parse(fs.readFileSync(jsBundlePath, 'utf8'));
    const { dataset, offerings } = bundle;
    datasetsByVersion.set(`${dataset.provinceCode}::${dataset.version}`, dataset);
    datasetsById.set(dataset.id, dataset);

    const indexed = offerings.map((item) => ({
      ...item,
      _searchMajor: (item.majorName || '').toLowerCase(),
      _searchInst: (item.institutionName || '').toLowerCase(),
    }));
    offeringsByDataset.set(dataset.id, indexed);
    comboMajorStats = buildCombinationMajorStats(indexed);

    const majorMap = new Map();
    for (const item of indexed) {
      offeringsById.set(`${dataset.version}::${item.id}`, item);
      const key = item.majorId || item.majorName;
      let bucket = majorMap.get(key);
      if (!bucket) {
        bucket = [];
        majorMap.set(key, bucket);
      }
      bucket.push(item);
    }
    offeringsByMajor.set(dataset.id, majorMap);

    defaultDatasetVersion = dataset.version;
    defaultDataYear = dataset.dataYear;
  }

  const manifest = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    supportedProvinces: [
      {
        provinceCode: jsRule.provinceCode,
        provinceName: jsRule.provinceName,
        ruleVersion: jsRule.version,
        availableYears: jsRule.applicableYears,
        defaultDatasetVersion,
        defaultDataYear,
      },
    ],
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

  return {
    getStats() {
      const ds = datasetsById.values().next().value;
      return {
        datasetVersion: defaultDatasetVersion,
        dataYear: defaultDataYear,
        offeringsCount: ds ? (offeringsByDataset.get(ds.id)?.length || 0) : 0,
      };
    },

    getComboMajorStats() {
      return comboMajorStats;
    },

    getAllSources() {
      return sources;
    },

    async searchOfferingsFiltered({ q, level, offset, limit }) {
      const ds = datasetsById.values().next().value;
      if (!ds) return { items: [], total: 0, dataYear: null, datasetVersion: null };
      const list = offeringsByDataset.get(ds.id) || [];
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
      };
    },

    async getManifest() {
      return manifest;
    },

    async getProvinceRule(provinceCode, ruleVersion) {
      if (provinceCode !== jsRule.provinceCode) return null;
      if (ruleVersion && ruleVersion !== jsRule.version) return null;
      return jsRule;
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
      const list = offeringsByDataset.get(datasetId) || [];
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
      const majorMap = offeringsByMajor.get(datasetId);
      if (!majorMap) return [];
      const results = [];
      for (const mid of majorIds) {
        const bucket = majorMap.get(mid);
        if (bucket) {
          for (const item of bucket) {
            results.push(stripInternalFields(item));
          }
        }
      }
      return results;
    },

    async getOfferingById(id, datasetVersion) {
      const found = offeringsById.get(`${datasetVersion}::${id}`);
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
