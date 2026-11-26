import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUBJECT_NAME_TO_CODE = [
  ['思想政治', 'POLITICS'],
  ['政治', 'POLITICS'],
  ['生物学', 'BIOLOGY'],
  ['生物', 'BIOLOGY'],
  ['物理', 'PHYSICS'],
  ['历史', 'HISTORY'],
  ['化学', 'CHEMISTRY'],
  ['地理', 'GEOGRAPHY'],
];

/**
 * 解析官方选考科目要求原文，严格遵循 docs/03_rules_data.md：
 * - 江苏 S01 2027 公告中指定 2 或 3 科表示同时必选 -> ALL
 * - 仅当原文明确包含「或」「任选」「选考其中1门」时才解析为 ANY
 * - 原文无法明确解析时，绝不猜错，返回 UNKNOWN + reviewStatus='unknown'
 */
export function parseOfficialRequirement(rawText, firstSubjectRaw = '') {
  const raw = String(rawText || '').trim();
  const firstRaw = String(firstSubjectRaw || '').trim();

  let firstSubject = 'ANY';
  if (firstRaw) {
    if (firstRaw.includes('物理') && !firstRaw.includes('历史')) {
      firstSubject = 'PHYSICS';
    } else if (firstRaw.includes('历史') && !firstRaw.includes('物理')) {
      firstSubject = 'HISTORY';
    } else if (firstRaw.includes('不限') || firstRaw.includes('均可') || firstRaw.includes('物理或历史')) {
      firstSubject = 'ANY';
    } else {
      firstSubject = 'UNKNOWN';
    }
  }

  if (!raw) {
    return {
      firstSubject: firstSubject === 'ANY' ? 'UNKNOWN' : firstSubject,
      requirementTree: { type: 'UNKNOWN', reason: '选科要求原文为空' },
      reviewStatus: 'unknown',
    };
  }

  if (
    raw.includes('不提科目要求') ||
    raw.includes('不限') ||
    raw === '无' ||
    raw === '无要求'
  ) {
    return {
      firstSubject,
      requirementTree: { type: 'NONE' },
      reviewStatus: firstSubject === 'UNKNOWN' ? 'unknown' : 'approved',
    };
  }

  const matchedSubjects = [];
  let scan = raw;
  for (const [label, code] of SUBJECT_NAME_TO_CODE) {
    if (scan.includes(label)) {
      if (!matchedSubjects.includes(code)) {
        matchedSubjects.push(code);
      }
      scan = scan.split(label).join(' ');
    }
  }

  if (matchedSubjects.length === 0) {
    return {
      firstSubject: 'UNKNOWN',
      requirementTree: { type: 'UNKNOWN', reason: `无法从原文识别科目: ${raw}` },
      reviewStatus: 'unknown',
    };
  }

  // 若未单独提供首选科目列，但原文明确必选物理或历史（且非「或」条件），同步推断首选要求
  const isExplicitOr = /或|任选|选考其一|选考其中\s*1\s*门/.test(raw);
  if (!firstRaw && !isExplicitOr) {
    const hasPhy = matchedSubjects.includes('PHYSICS');
    const hasHis = matchedSubjects.includes('HISTORY');
    if (hasPhy && !hasHis) firstSubject = 'PHYSICS';
    else if (hasHis && !hasPhy) firstSubject = 'HISTORY';
  }

  const requirementTree = isExplicitOr
    ? { type: 'ANY', subjects: matchedSubjects }
    : { type: 'ALL', subjects: matchedSubjects };

  return {
    firstSubject,
    requirementTree,
    reviewStatus: firstSubject === 'UNKNOWN' ? 'unknown' : 'approved',
  };
}

/**
 * 简易 RFC 4180 CSV 行解析器（支持双引号内包含逗号）。
 */
export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function importOfficialCsvText(csvText, options) {
  const {
    provinceCode = 'JS',
    dataYear = 2027,
    version = `${provinceCode}-${dataYear}.1`,
    sourceId = 'S01',
    completeness = 'full',
    scopeNote = `${dataYear} 年官方公布的普通高校专业选考科目要求`,
  } = options || {};

  const sha256 = crypto.createHash('sha256').update(csvText, 'utf8').digest('hex');
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV 文件至少需要包含表头和一条数据记录');
  }

  const headers = parseCsvLine(lines[0]);
  const colIdx = (candidates, excludeIdx = -1) => {
    for (const c of candidates) {
      const idx = headers.findIndex((h, i) => i !== excludeIdx && h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxInstCode = colIdx(['院校代码', '学校代码', 'institutionCode']);
  const idxInstName = colIdx(['院校名称', '学校名称', '高校名称', 'institutionName']);
  const idxMajorCode = colIdx(['专业代码', 'majorCode']);
  const idxMajorName = colIdx(['专业名称', '专业(类)名称', '专业（类）名称', 'majorName']);
  const idxLevel = colIdx(['层次', '学历层次', 'level']);
  const idxFirst = colIdx(['首选科目要求', '首选科目', 'firstSubject']);
  const idxReq = colIdx(['选考科目要求', '再选科目要求', '科目要求', 'requirementRaw'], idxFirst);

  if (idxInstName < 0 || idxMajorName < 0 || idxReq < 0) {
    throw new Error(
      `CSV 表头缺少必要列（需包含 院校名称、专业名称、选考科目要求），当前表头：${headers.join(', ')}`
    );
  }

  const datasetId = `ds-${provinceCode.toLowerCase()}-${dataYear}-${version.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const offerings = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const institutionName = cols[idxInstName] || '';
    const majorName = cols[idxMajorName] || '';
    const requirementRaw = cols[idxReq] || '';
    if (!institutionName && !majorName) continue;

    const institutionCode = (idxInstCode >= 0 && cols[idxInstCode]) || `INST_${i}`;
    const majorCode = idxMajorCode >= 0 && cols[idxMajorCode] ? cols[idxMajorCode] : null;
    const level = (idxLevel >= 0 && cols[idxLevel]) || '本科';
    const firstRaw = idxFirst >= 0 ? cols[idxFirst] || '' : '';

    const parsed = parseOfficialRequirement(requirementRaw, firstRaw);
    offerings.push({
      id: `${provinceCode.toLowerCase()}_${dataYear}_${String(i).padStart(6, '0')}`,
      datasetId,
      institutionCode,
      institutionName,
      majorCode,
      majorName,
      majorId: majorName,
      level,
      firstSubject: parsed.firstSubject,
      requirementTree: parsed.requirementTree,
      requirementRaw,
      reviewStatus: parsed.reviewStatus,
    });
  }

  return {
    sha256,
    bundle: {
      dataset: {
        id: datasetId,
        provinceCode,
        dataYear: Number(dataYear),
        applicableYears: [Number(dataYear)],
        kind: 'subject_requirements',
        level: '本科/专科',
        version,
        status: 'published',
        sourceIds: [sourceId],
        completeness,
        scopeNote,
      },
      offerings,
    },
  };
}

// CLI execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback = '') => {
    const idx = args.indexOf(flag);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const inputFile = getArg('--input');
  if (!inputFile) {
    console.error(
      '用法: node scripts/import-official-csv.mjs --input data/raw/js-2027.csv [--province JS] [--year 2027] [--version JS-2027.1] [--completeness full]'
    );
    process.exit(1);
  }

  const provinceCode = getArg('--province', 'JS');
  const dataYear = Number(getArg('--year', '2027'));
  const version = getArg('--version', `${provinceCode}-${dataYear}.1`);
  const completeness = getArg('--completeness', 'full');

  const absInput = path.resolve(inputFile);
  const rawText = fs.readFileSync(absInput, 'utf8');
  const { sha256, bundle } = importOfficialCsvText(rawText, {
    provinceCode,
    dataYear,
    version,
    completeness,
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(
    __dirname,
    '..',
    'data',
    'normalized',
    `${provinceCode.toLowerCase()}-${dataYear}.json`
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), 'utf8');

  const unknownCount = bundle.offerings.filter((o) => o.reviewStatus === 'unknown').length;
  console.log(`[import-official-csv] 导入完成：${outPath}`);
  console.log(`  原始文件 SHA-256: ${sha256}`);
  console.log(`  总条目数: ${bundle.offerings.length}，待人工复核 (unknown): ${unknownCount}`);
}
