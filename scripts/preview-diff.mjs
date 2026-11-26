import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 对比新旧两个版本的数据集差异；若条目数量变化超过 10%，标记人工复核告警。
 */
export function previewDatasetDiff(oldOfferings, newOfferings) {
  const oldMap = new Map((oldOfferings || []).map((o) => [o.id, o]));
  const newMap = new Map((newOfferings || []).map((o) => [o.id, o]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of newMap.entries()) {
    if (!oldMap.has(id)) {
      added.push(id);
    } else if (JSON.stringify(oldMap.get(id)) !== JSON.stringify(item)) {
      changed.push(id);
    }
  }
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) {
      removed.push(id);
    }
  }

  const oldCount = oldOfferings.length;
  const newCount = newOfferings.length;
  const deltaRatio = oldCount === 0 ? (newCount > 0 ? 1 : 0) : Math.abs(newCount - oldCount) / oldCount;
  const requiresManualReview = deltaRatio > 0.1;

  return {
    oldCount,
    newCount,
    addedCount: added.length,
    removedCount: removed.length,
    changedCount: changed.length,
    deltaRatio: Math.round(deltaRatio * 10000) / 10000,
    requiresManualReview,
    added,
    removed,
    changed,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const demoPath = path.join(rootDir, 'data', 'normalized', 'demo-offerings.json');
  const bundle = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
  const diff = previewDatasetDiff(bundle.offerings, bundle.offerings);
  console.log('[preview-diff] Self-diff check:', JSON.stringify(diff, null, 2));
}
