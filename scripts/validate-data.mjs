import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VALID_SUBJECTS = new Set([
  'PHYSICS',
  'HISTORY',
  'CHEMISTRY',
  'BIOLOGY',
  'POLITICS',
  'GEOGRAPHY',
]);

const VALID_FIRST = new Set(['PHYSICS', 'HISTORY', 'ANY', 'UNKNOWN']);

/**
 * 校验标准化数据集与来源清单，严格防止演示数据或未复核 unknown 条目误入生产库。
 */
export function validateDatasetBundle(bundle, sources, options = {}) {
  const targetEnv = options.targetEnv || 'dev';
  const errors = [];
  const warnings = [];
  const sourceIds = new Set((sources || []).map((s) => s.id));

  if (!bundle || !bundle.dataset || !Array.isArray(bundle.offerings)) {
    return { valid: false, errors: ['数据集结构不完整，缺少 dataset 或 offerings'], warnings };
  }

  const { dataset, offerings } = bundle;

  if (!dataset.id || !dataset.provinceCode || !dataset.version) {
    errors.push('dataset 缺少必须字段（id / provinceCode / version）');
  }
  if (!Array.isArray(dataset.sourceIds) || dataset.sourceIds.length === 0) {
    errors.push('dataset 缺少来源追溯 sourceIds');
  } else {
    for (const sid of dataset.sourceIds) {
      if (!sourceIds.has(sid)) {
        errors.push(`dataset 引用了不存在的来源 ID: ${sid}`);
      }
    }
  }

  if (targetEnv === 'prod') {
    if (dataset.isDemo) {
      errors.push('生产环境禁止发布带有 isDemo=true 标记的演示数据集');
    }
    if (dataset.status !== 'published') {
      errors.push(`生产环境数据集状态必须为 published，当前为: ${dataset.status}`);
    }
  }

  const seenBusinessKeys = new Set();
  let unknownCount = 0;

  for (const item of offerings) {
    if (!item.id || !item.institutionCode || !item.institutionName || !item.majorName) {
      errors.push(`条目 ${item.id || '(无id)'} 缺少基础字段`);
      continue;
    }
    if (item.datasetId !== dataset.id) {
      errors.push(`条目 ${item.id} 的 datasetId (${item.datasetId}) 与数据集不一致`);
    }
    if (targetEnv === 'prod' && item.isDemo) {
      errors.push(`生产环境禁止包含演示条目: ${item.id}`);
    }
    if (!VALID_FIRST.has(item.firstSubject)) {
      errors.push(`条目 ${item.id} 的 firstSubject 不合法: ${item.firstSubject}`);
    }

    const tree = item.requirementTree;
    if (!tree || !['NONE', 'ALL', 'ANY', 'UNKNOWN'].includes(tree.type)) {
      errors.push(`条目 ${item.id} 的 requirementTree.type 不合法`);
    } else if (tree.type === 'ALL' || tree.type === 'ANY') {
      if (!Array.isArray(tree.subjects) || tree.subjects.length === 0) {
        errors.push(`条目 ${item.id} 的 requirementTree.subjects 不能为空`);
      } else {
        for (const s of tree.subjects) {
          if (!VALID_SUBJECTS.has(s)) {
            errors.push(`条目 ${item.id} 包含非法科目代码: ${s}`);
          }
        }
      }
    }

    if (item.reviewStatus === 'unknown' || tree?.type === 'UNKNOWN') {
      unknownCount += 1;
      if (targetEnv === 'prod') {
        errors.push(`生产发布阻止：条目 ${item.id} 处于 unknown 未复核状态`);
      } else {
        warnings.push(`条目 ${item.id} 处于 unknown 状态，需人工复核后方可进入生产库`);
      }
    }

    const bizKey = `${item.institutionCode}::${item.majorCode || ''}::${item.majorName}::${item.level}`;
    if (seenBusinessKeys.has(bizKey)) {
      errors.push(`检测到重复业务键: ${bizKey}`);
    }
    seenBusinessKeys.add(bizKey);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalOfferings: offerings.length,
      unknownCount,
      isDemo: Boolean(dataset.isDemo),
      completeness: dataset.completeness,
    },
  };
}

// CLI execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const targetArgIdx = process.argv.indexOf('--target');
  const targetEnv = targetArgIdx >= 0 ? process.argv[targetArgIdx + 1] : 'dev';
  const fileArgIdx = process.argv.indexOf('--file');
  const dataFile =
    fileArgIdx >= 0
      ? path.resolve(process.argv[fileArgIdx + 1])
      : path.join(rootDir, 'data', 'normalized', 'js-2027.json');

  const sources = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data', 'normalized', 'sources.json'), 'utf8')
  );
  const bundle = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const report = validateDatasetBundle(bundle, sources, { targetEnv });

  console.log(`[validate-data] target=${targetEnv} file=${path.basename(dataFile)}`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) {
    process.exitCode = 1;
  }
}
