const CORE_SUBJECTS = [
  { code: 'CHINESE', name: '语文' },
  { code: 'MATH', name: '数学' },
  { code: 'ENGLISH', name: '英语' },
];

const SUBJECTS = [
  { code: 'PHYSICS', name: '物理' },
  { code: 'HISTORY', name: '历史' },
  { code: 'CHEMISTRY', name: '化学' },
  { code: 'BIOLOGY', name: '生物学' },
  { code: 'POLITICS', name: '思想政治' },
  { code: 'GEOGRAPHY', name: '地理' },
];

const DEFAULT_COMBOS = [
  { id: 'P_CB', displayName: '物理 · 化学 · 生物学' },
  { id: 'P_CP', displayName: '物理 · 化学 · 思想政治' },
  { id: 'P_CG', displayName: '物理 · 化学 · 地理' },
  { id: 'P_BP', displayName: '物理 · 生物学 · 思想政治' },
  { id: 'P_BG', displayName: '物理 · 生物学 · 地理' },
  { id: 'P_PG', displayName: '物理 · 思想政治 · 地理' },
  { id: 'H_CB', displayName: '历史 · 化学 · 生物学' },
  { id: 'H_CP', displayName: '历史 · 化学 · 思想政治' },
  { id: 'H_CG', displayName: '历史 · 化学 · 地理' },
  { id: 'H_BP', displayName: '历史 · 生物学 · 思想政治' },
  { id: 'H_BG', displayName: '历史 · 生物学 · 地理' },
  { id: 'H_PG', displayName: '历史 · 思想政治 · 地理' },
];

const PROVINCE_CONFIG = Object.assign(
  {
    code: 'JS',
    slug: 'jiangsu',
    name: '江苏',
    fullName: '江苏省',
    shortGeo: '在苏',
    mode: '3+1+2',
    offeringsCount: 79753,
    offeringsStr: '79,753',
    authorityName: '江苏省教育考试院',
    authorityDept: '江苏省教育厅',
    qrPath: '/qr-jiangsu.svg',
    storagePrefix: 'js_xuanke_web',
    siteOrigin: 'https://xuanke.visc.cn',
    provinces: [
      { code: 'JS', slug: 'jiangsu', name: '江苏', fullName: '江苏省' },
      { code: 'HB', slug: 'hubei', name: '湖北', fullName: '湖北省' },
    ],
  },
  typeof window !== 'undefined' && window.__PROVINCE_CONFIG__ ? window.__PROVINCE_CONFIG__ : {}
);

const STORAGE_KEY = `${PROVINCE_CONFIG.storagePrefix}_v1`;
const SNAPSHOT_STORAGE_KEY = `${PROVINCE_CONFIG.storagePrefix}_snapshot_v1`;
const REPORT_STORAGE_KEY = `${PROVINCE_CONFIG.storagePrefix}_report_v1`;
const VIEW_STORAGE_KEY = `${PROVINCE_CONFIG.storagePrefix}_view_v1`;
const VALID_VIEWS = new Set(['section-input', 'report-root', 'section-compare', 'major-explorer']);

function getDynamicExamYearOptions() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  // 每年 9 月进入新学年：9-12 月当前高一对应 y+3 年高考；1-8 月当前高一对应 y+2 年高考
  const baseYear = m >= 9 ? y + 3 : y + 2;
  const labels = ['当前高一', '当前初三', '当前初二', '当前初一'];
  return labels.map((gradeLabel, offset) => {
    const examYear = baseYear + offset;
    return {
      year: examYear,
      label: `${examYear}年高考 · ${gradeLabel}`,
    };
  });
}

const DEFAULT_EXAM_YEAR = getDynamicExamYearOptions()[0].year;

const state = {
  province: PROVINCE_CONFIG.code,
  studentName: '',
  examYear: DEFAULT_EXAM_YEAR,
  exams: [],
  aiConfig: { baseUrl: '', model: '', apiKey: '' },
  lastReportData: null,
  activeView: 'section-input',
  majorSearchOffset: 0,
  majorSearchTotal: 0,
};

function switchView(targetId, { scrollTop = true } = {}) {
  const inputEl = document.getElementById('section-input');
  const provinceGuideEl = document.getElementById('province-guide-section');
  const reportEl = document.getElementById('report-root');
  const explorerEl = document.getElementById('major-explorer');
  const hasReport = Boolean(state.lastReportData);

  if (!VALID_VIEWS.has(targetId)) {
    targetId = 'section-input';
  }

  if ((targetId === 'report-root' || targetId === 'section-compare') && !hasReport) {
    showError('请先填写成绩并点击「生成选科与就业白皮书」，再查看报告或组合对比');
    targetId = 'section-input';
  }

  state.activeView = targetId;
  try {
    sessionStorage.setItem(VIEW_STORAGE_KEY, targetId);
  } catch {
    // ignore
  }
  if (window.location.hash !== `#${targetId}`) {
    try {
      history.replaceState(null, '', `#${targetId}`);
    } catch {
      // ignore
    }
  }

  inputEl?.classList.toggle('hidden', targetId !== 'section-input');
  provinceGuideEl?.classList.toggle('hidden', targetId !== 'section-input');
  explorerEl?.classList.toggle('hidden', targetId !== 'major-explorer');

  if (reportEl) {
    const showReportArea = targetId === 'report-root' || targetId === 'section-compare';
    reportEl.classList.toggle('hidden', !showReportArea);
    reportEl.classList.toggle('view-only-compare', targetId === 'section-compare');
  }

  document.querySelectorAll('.main-nav .nav-item').forEach((btn) => {
    const isMatch = btn.getAttribute('data-nav') === targetId;
    btn.classList.toggle('nav-active', isMatch);
    btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatComboOptionLabel(displayName, pct) {
  const compact = String(displayName || '')
    .replace(/\s*·\s*/g, '·')
    .replace(/生物学/g, '生物')
    .replace(/思想政治/g, '政治');
  if (pct !== undefined && pct !== null && pct !== '') {
    return `${compact} ${pct}%`;
  }
  return compact;
}

function sanitizeDecimalInput(raw) {
  const normalized = String(raw ?? '').replace(/[。．,，]/g, '.').replace(/[^\d.]/g, '');
  const dotIdx = normalized.indexOf('.');
  if (dotIdx === -1) return normalized;
  const intPart = normalized.slice(0, dotIdx);
  const decPart = normalized.slice(dotIdx + 1).replace(/\./g, '').slice(0, 2);
  return `${intPart}.${decPart}`;
}

function calcExamEnteredSum(exam) {
  let sum = 0;
  let count = 0;
  for (const c of CORE_SUBJECTS) {
    const raw = String(exam?.coreSubjects?.[c.code]?.score ?? '').trim();
    if (raw !== '' && !Number.isNaN(Number(raw))) {
      sum += Number(raw);
      count += 1;
    }
  }
  for (const s of SUBJECTS) {
    const raw = String(exam?.subjects?.[s.code]?.score ?? '').trim();
    if (raw !== '' && !Number.isNaN(Number(raw))) {
      sum += Number(raw);
      count += 1;
    }
  }
  if (count === 0) return null;
  return { sum: Math.round(sum * 100) / 100, count };
}

function formatExamSumHint(exam) {
  const res = calcExamEnteredSum(exam);
  if (!res) return '';
  return `已填 ${res.count} 科合计 ${res.sum} 分`;
}

function createEmptyExam(index) {
  const coreSubjects = {};
  for (const c of CORE_SUBJECTS) {
    coreSubjects[c.code] = { score: '', classRank: '', gradeRank: '' };
  }
  const subjects = {};
  for (const s of SUBJECTS) {
    subjects[s.code] = { score: '', classRank: '', gradeRank: '' };
  }
  return {
    id: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: index === 0 ? '高一上第一次月考' : `第 ${index + 1} 次考试`,
    type: index === 0 ? '月考' : '期末考试',
    classSize: '',
    gradeSize: '',
    totalScore: '',
    totalClassRank: '',
    totalGradeRank: '',
    coreSubjects,
    subjects,
  };
}

function formatTimeNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function updateSaveStatus(text, isError = false) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? 'var(--error)' : 'var(--success)';
}

function saveState(manual = false) {
  const payload = {
    studentName: state.studentName,
    examYear: state.examYear,
    exams: state.exams,
    savedAt: new Date().toISOString(),
  };

  let localOk = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localOk = true;
  } catch {
    localOk = false;
  }

  const timeStr = formatTimeNow();
  if (localOk) {
    updateSaveStatus(
      manual
        ? `✓ 已于 ${timeStr} 保存在本机浏览器（仅自己可见，刷新不丢失）`
        : `✓ 已自动保存至本机（${timeStr}）`
    );
    return true;
  }
  updateSaveStatus('⚠ 浏览器存储空间不足，无法自动保存草稿', true);
  return false;
}

function hasAnyEnteredScore(exams) {
  return (exams || []).some((exam) => {
    const totalFilled =
      String(exam.totalScore ?? '').trim() !== '' ||
      String(exam.totalClassRank ?? '').trim() !== '' ||
      String(exam.totalGradeRank ?? '').trim() !== '';
    const coreFilled = Object.values(exam.coreSubjects || {}).some((v) => String(v?.score ?? '').trim() !== '');
    const subjFilled = Object.values(exam.subjects || {}).some((v) => String(v?.score ?? '').trim() !== '');
    return totalFilled || coreFilled || subjFilled;
  });
}

function getSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.exams) && parsed.exams.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function updateRestoreButtonVisibility() {
  const btn = document.getElementById('btn-restore-snapshot');
  if (!btn) return;
  const snap = getSnapshot();
  if (snap) {
    btn.classList.remove('hidden');
    const label = snap.studentName ? `（${snap.studentName}）` : '';
    btn.title = `恢复暂存的成绩${label}`;
  } else {
    btn.classList.add('hidden');
  }
}

function saveSnapshot(reason = 'manual') {
  if (!hasAnyEnteredScore(state.exams) && !state.studentName.trim()) {
    return false;
  }
  const payload = {
    studentName: state.studentName,
    examYear: state.examYear,
    exams: JSON.parse(JSON.stringify(state.exams)),
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    updateRestoreButtonVisibility();
    if (reason === 'manual') {
      updateSaveStatus(`✓ 已于 ${formatTimeNow()} 暂存当前成绩（清空后可随时恢复）`);
    }
    return true;
  } catch {
    return false;
  }
}

function restoreSnapshot() {
  const snap = getSnapshot();
  if (!snap) {
    showError('暂无可恢复的暂存成绩');
    return;
  }
  state.studentName = snap.studentName || '';
  const validYears = new Set(getDynamicExamYearOptions().map((o) => o.year));
  const snapYear = Number(snap.examYear);
  state.examYear = validYears.has(snapYear) ? snapYear : DEFAULT_EXAM_YEAR;
  state.exams = JSON.parse(JSON.stringify(snap.exams));

  const nameInput = document.getElementById('student-name');
  const yearSelect = document.getElementById('exam-year');
  if (nameInput) nameInput.value = state.studentName;
  if (yearSelect) yearSelect.value = String(state.examYear);

  saveState();
  renderExams();
  showError('');
  updateSaveStatus(`✓ 已恢复暂存成绩${state.studentName ? `（${state.studentName}）` : ''}`);
}

const EXAM_TYPES = ['月考', '期中考试', '期末考试', '联考'];
const ALL_SHARE_CODES = [...CORE_SUBJECTS.map((c) => c.code), ...SUBJECTS.map((s) => s.code)];

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded) {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// 紧凑 v2 编码：大幅缩短网址长度（2次完整考试约 220 字符），确保微信完整识别为可点击链接
function encodeSharePayload() {
  const clean = (s) => String(s ?? '').replace(/[~;,|]/g, ' ').trim();
  const trimTrail = (arr) => {
    const out = arr.slice();
    while (out.length > 0 && out[out.length - 1] === '') out.pop();
    return out;
  };
  const header = `${state.examYear - 2000}|${clean(state.studentName)}`;
  const examChunks = (state.exams || []).slice(0, 8).map((ex) => {
    const typeIdx = EXAM_TYPES.indexOf(ex.type);
    const meta = trimTrail([
      clean(ex.name),
      typeIdx >= 0 ? String(typeIdx) : '',
      clean(ex.classSize),
      clean(ex.gradeSize),
      clean(ex.totalScore),
      clean(ex.totalClassRank),
      clean(ex.totalGradeRank),
    ]).join(',');

    const cells = trimTrail(
      ALL_SHARE_CODES.map((code, idx) => {
        const src = idx < CORE_SUBJECTS.length ? ex.coreSubjects?.[code] : ex.subjects?.[code];
        return trimTrail([clean(src?.score), clean(src?.classRank), clean(src?.gradeRank)]).join('|');
      })
    ).join(',');

    return `${meta};${cells}`;
  });
  return `2${toBase64Url(`${header}~${examChunks.join('~')}`)}`;
}

function decodeSharePayload(encoded) {
  if (!encoded || encoded.length > 16000) return null;
  const validYears = new Set(getDynamicExamYearOptions().map((o) => o.year));
  try {
    // v2 紧凑格式（以 "2" 开头）
    if (encoded.startsWith('2')) {
      const raw = fromBase64Url(encoded.slice(1));
      const parts = raw.split('~');
      if (parts.length < 2) return null;
      const [yOff, studentName = ''] = parts[0].split('|');
      const y = 2000 + Number(yOff);
      const exams = parts.slice(1, 9).map((chunk, idx) => {
        const ex = createEmptyExam(idx);
        const [metaStr = '', cellsStr = ''] = chunk.split(';');
        const meta = metaStr.split(',');
        if (meta[0]) ex.name = meta[0].slice(0, 40);
        if (meta[1] !== undefined && meta[1] !== '' && EXAM_TYPES[Number(meta[1])]) {
          ex.type = EXAM_TYPES[Number(meta[1])];
        }
        if (meta[2]) ex.classSize = meta[2];
        if (meta[3]) ex.gradeSize = meta[3];
        if (meta[4]) ex.totalScore = meta[4];
        if (meta[5]) ex.totalClassRank = meta[5];
        if (meta[6]) ex.totalGradeRank = meta[6];

        const cells = cellsStr ? cellsStr.split(',') : [];
        ALL_SHARE_CODES.forEach((code, ci) => {
          const item = (cells[ci] || '').split('|');
          const obj = {
            score: item[0] || '',
            classRank: item[1] || '',
            gradeRank: item[2] || '',
          };
          if (ci < CORE_SUBJECTS.length) ex.coreSubjects[code] = obj;
          else ex.subjects[code] = obj;
        });
        return ex;
      });
      return {
        studentName: String(studentName).slice(0, 20),
        examYear: validYears.has(y) ? y : DEFAULT_EXAM_YEAR,
        exams,
      };
    }

    // 兼容旧版 v1 JSON 格式
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || !Array.isArray(parsed.e) || parsed.e.length === 0) return null;
    const exams = parsed.e.slice(0, 12).map((item, idx) => {
      const ex = createEmptyExam(idx);
      if (item.n) ex.name = String(item.n).slice(0, 40);
      if (item.t) ex.type = String(item.t).slice(0, 20);
      if (item.cs) ex.classSize = String(item.cs);
      if (item.gs) ex.gradeSize = String(item.gs);
      if (item.ts) ex.totalScore = String(item.ts);
      if (item.tcr) ex.totalClassRank = String(item.tcr);
      if (item.tgr) ex.totalGradeRank = String(item.tgr);
      if (item.c && typeof item.c === 'object') {
        for (const c of CORE_SUBJECTS) {
          const arr = item.c[c.code];
          if (Array.isArray(arr)) {
            ex.coreSubjects[c.code] = {
              score: String(arr[0] ?? ''),
              classRank: String(arr[1] ?? ''),
              gradeRank: String(arr[2] ?? ''),
            };
          }
        }
      }
      if (item.s && typeof item.s === 'object') {
        for (const s of SUBJECTS) {
          const arr = item.s[s.code];
          if (Array.isArray(arr)) {
            ex.subjects[s.code] = {
              score: String(arr[0] ?? ''),
              classRank: String(arr[1] ?? ''),
              gradeRank: String(arr[2] ?? ''),
            };
          }
        }
      }
      return ex;
    });
    const y = Number(parsed.y);
    return {
      studentName: String(parsed.u || '').slice(0, 20),
      examYear: validYears.has(y) ? y : DEFAULT_EXAM_YEAR,
      exams,
    };
  } catch {
    return null;
  }
}

function buildCarryDataUrl() {
  const base = `${window.location.origin}${window.location.pathname}`;
  if (!hasAnyEnteredScore(state.exams)) return base;
  try {
    return `${base}#s=${encodeSharePayload()}`;
  } catch {
    return base;
  }
}

async function initApp() {
  const yearSelect = document.getElementById('exam-year');
  const yearOptions = getDynamicExamYearOptions();
  if (yearSelect) {
    yearSelect.innerHTML = yearOptions
      .map((opt) => `<option value="${opt.year}">${escapeHtml(opt.label)}</option>`)
      .join('');
  }

  // 检测是否从微信带着成绩链接跳转到系统浏览器（#s=...，纯本地解码不经过服务器）
  const rawHash = window.location.hash || '';
  const sharedMatch = rawHash.match(/^#s=([A-Za-z0-9_-]+)$/);
  const sharedData = sharedMatch ? decodeSharePayload(sharedMatch[1]) : null;

  if (sharedData) {
    state.studentName = sharedData.studentName;
    state.examYear = sharedData.examYear;
    state.exams = sharedData.exams;
    saveState();
  } else {
    loadState();
  }

  renderExams();
  bindEvents();
  updateRestoreButtonVisibility();

  // 初始化院校查询下拉框（即使未生成报告也能随时查院校专业）
  const comboSelect = document.getElementById('major-combo-filter');
  if (comboSelect && comboSelect.options.length === 0) {
    comboSelect.innerHTML = DEFAULT_COMBOS.map(
      (c) => `<option value="${c.id}">${escapeHtml(formatComboOptionLabel(c.displayName))}</option>`
    ).join('');
    comboSelect.value = 'P_CG';
  }

  if (sharedData) {
    try {
      history.replaceState(null, '', '#report-root');
    } catch {
      // ignore
    }
    await generateReport();
    return;
  }

  // 刷新后自动恢复上次生成的报告，无需重新点击生成
  let restored = false;
  try {
    const cachedReport = localStorage.getItem(REPORT_STORAGE_KEY);
    if (cachedReport) {
      const parsedReport = JSON.parse(cachedReport);
      if (parsedReport?.report && parsedReport?.careerOutlook) {
        renderReport(parsedReport);
        restored = true;
      }
    }
  } catch {
    // ignore corrupt cached report
  }

  if (!restored) {
    searchMajors(false);
  }

  // 进入 /jiangsu 时默认落在「成绩录入」；只有 URL 明确带有 #hash（如刷新当前 Tab 或直达链接）才恢复对应 Tab
  const hashView = window.location.hash.replace(/^#/, '');
  const initialView = VALID_VIEWS.has(hashView) ? hashView : 'section-input';
  const canOpenInitial =
    initialView === 'section-input' ||
    initialView === 'major-explorer' ||
    Boolean(state.lastReportData);
  switchView(canOpenInitial ? initialView : 'section-input', { scrollTop: false });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.studentName = parsed.studentName || '';
      const validYears = new Set(getDynamicExamYearOptions().map((o) => o.year));
      const parsedYear = Number(parsed.examYear);
      state.examYear = validYears.has(parsedYear) ? parsedYear : DEFAULT_EXAM_YEAR;
      state.exams = Array.isArray(parsed.exams) && parsed.exams.length > 0 ? parsed.exams : [createEmptyExam(0)];
      state.aiConfig = parsed.aiConfig || { baseUrl: '', model: '', apiKey: '' };
      return;
    }
  } catch {
    // ignore
  }
  state.exams = [createEmptyExam(0)];
}

function renderExams() {
  const container = document.getElementById('exams-container');
  container.innerHTML = '';

  state.exams.forEach((exam, idx) => {
    const card = document.createElement('div');
    card.className = 'exam-card';

    const coreHtml = CORE_SUBJECTS.map((c) => {
      const cell = exam.coreSubjects?.[c.code] || { score: '', classRank: '', gradeRank: '' };
      return `
        <div class="subj-cell">
          <div class="subj-cell-title">${escapeHtml(c.name)}</div>
          <div class="subj-inputs">
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              class="score-input"
              placeholder="分数 (0-150，支持小数)"
              value="${escapeHtml(cell.score)}"
              data-exam-idx="${idx}"
              data-core="${c.code}"
              data-field="score"
            />
            <div class="subj-rank-pair">
              <input
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                placeholder="班级排名"
                value="${escapeHtml(cell.classRank ?? '')}"
                data-exam-idx="${idx}"
                data-core="${c.code}"
                data-field="classRank"
              />
              <input
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                placeholder="年级排名"
                value="${escapeHtml(cell.gradeRank ?? '')}"
                data-exam-idx="${idx}"
                data-core="${c.code}"
                data-field="gradeRank"
              />
            </div>
          </div>
        </div>
      `;
    }).join('');

    const subjectHtml = SUBJECTS.map((s) => {
      const cell = exam.subjects?.[s.code] || { score: '', classRank: '', gradeRank: '' };
      return `
        <div class="subj-cell">
          <div class="subj-cell-title">${escapeHtml(s.name)}</div>
          <div class="subj-inputs">
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              class="score-input"
              placeholder="分数 (0-100，支持小数)"
              value="${escapeHtml(cell.score)}"
              data-exam-idx="${idx}"
              data-subj="${s.code}"
              data-field="score"
            />
            <div class="subj-rank-pair">
              <input
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                placeholder="班级排名"
                value="${escapeHtml(cell.classRank ?? '')}"
                data-exam-idx="${idx}"
                data-subj="${s.code}"
                data-field="classRank"
              />
              <input
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                placeholder="年级排名"
                value="${escapeHtml(cell.gradeRank ?? '')}"
                data-exam-idx="${idx}"
                data-subj="${s.code}"
                data-field="gradeRank"
              />
            </div>
          </div>
        </div>
      `;
    }).join('');

    const sumHintText = formatExamSumHint(exam);

    card.innerHTML = `
      <div class="exam-card-topbar">
        <span class="exam-card-index">第 ${idx + 1} 次考试</span>
        <button
          type="button"
          class="btn-icon-delete"
          data-remove-idx="${idx}"
          title="删除此次考试"
          aria-label="删除第 ${idx + 1} 次考试"
          ${state.exams.length <= 1 ? 'disabled' : ''}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
          </svg>
        </button>
      </div>
      <div class="exam-card-head">
        <label class="field field-exam-name">
          <span class="field-label">考试名称</span>
          <input type="text" value="${escapeHtml(exam.name)}" data-exam-idx="${idx}" data-meta="name" placeholder="例如：高一上期中考试" />
        </label>
        <label class="field field-exam-type">
          <span class="field-label">考试类型</span>
          <div class="select-wrap" data-sheet-title="选择考试类型">
            <select data-exam-idx="${idx}" data-meta="type">
              <option value="月考" ${exam.type === '月考' ? 'selected' : ''}>月考</option>
              <option value="期中考试" ${exam.type === '期中考试' ? 'selected' : ''}>期中考试</option>
              <option value="期末考试" ${exam.type === '期末考试' ? 'selected' : ''}>期末考试</option>
              <option value="联考" ${exam.type === '联考' ? 'selected' : ''}>联考</option>
            </select>
          </div>
        </label>
        <label class="field">
          <span class="field-label">班级人数</span>
          <input type="number" inputmode="numeric" min="1" step="1" value="${escapeHtml(exam.classSize ?? '')}" data-exam-idx="${idx}" data-meta="classSize" placeholder="如：47" />
        </label>
        <label class="field">
          <span class="field-label">年级人数</span>
          <input type="number" inputmode="numeric" min="1" step="1" value="${escapeHtml(exam.gradeSize ?? '')}" data-exam-idx="${idx}" data-meta="gradeSize" placeholder="如：600" />
        </label>
      </div>
      <div class="exam-total-band">
        <div class="exam-total-head">
          <span class="exam-total-title">本次考试总分与总排名（可选）</span>
          <span class="exam-sum-hint" data-sum-hint="${idx}">${escapeHtml(sumHintText)}</span>
        </div>
        <div class="exam-total-grid">
          <label class="field field-total-score">
            <span class="field-label">考试总分</span>
            <input type="text" inputmode="decimal" autocomplete="off" class="score-input" value="${escapeHtml(exam.totalScore ?? '')}" data-exam-idx="${idx}" data-meta="totalScore" placeholder="如：840.5（支持小数）" />
          </label>
          <label class="field">
            <span class="field-label">总分班级排名</span>
            <input type="number" inputmode="numeric" min="1" step="1" value="${escapeHtml(exam.totalClassRank ?? '')}" data-exam-idx="${idx}" data-meta="totalClassRank" placeholder="如：8" />
          </label>
          <label class="field">
            <span class="field-label">总分年级排名</span>
            <input type="number" inputmode="numeric" min="1" step="1" value="${escapeHtml(exam.totalGradeRank ?? '')}" data-exam-idx="${idx}" data-meta="totalGradeRank" placeholder="如：85" />
          </label>
        </div>
      </div>
      <div class="subj-group-label">统考主科</div>
      <div class="core-subjects-grid">${coreHtml}</div>
      <div class="subj-group-label">选考科目</div>
      <div class="subjects-grid">${subjectHtml}</div>
    `;

    container.appendChild(card);
  });
}

function openConfirmModal({ title, message, confirmText = '确定', danger = false }) {
  const dialog = document.getElementById('confirm-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    return Promise.resolve(window.confirm(message));
  }
  const titleEl = document.getElementById('confirm-dialog-title');
  const descEl = document.getElementById('confirm-dialog-desc');
  const okBtn = document.getElementById('confirm-dialog-ok');
  const cancelBtn = document.getElementById('confirm-dialog-cancel');

  titleEl.textContent = title;
  descEl.textContent = message;
  okBtn.textContent = confirmText;
  okBtn.className = danger ? 'btn btn-danger-solid' : 'btn btn-primary';

  return new Promise((resolve) => {
    const cleanup = (result) => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onBackdropClick);
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = (e) => {
      if (e) e.preventDefault();
      cleanup(false);
    };
    const onBackdropClick = (e) => {
      if (e.target === dialog) cleanup(false);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onBackdropClick);
    dialog.showModal();
  });
}

function showError(msg) {
  const el = document.getElementById('form-error');
  if (!msg) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function renderTrendBadge(trend) {
  if (trend === '明显上升') {
    return '<span class="trend-badge trend-up">↗ 上升</span>';
  }
  if (trend === '有所下滑') {
    return '<span class="trend-badge trend-down">↘ 下滑</span>';
  }
  if (trend === '保持稳定') {
    return '<span class="trend-badge trend-flat">→ 稳定</span>';
  }
  return `<span class="trend-badge trend-neutral">${escapeHtml(trend || '—')}</span>`;
}

function formatDegreeGateHtml(text) {
  const safe = escapeHtml(text || '');
  return safe
    .replace('【学历门槛实话】', '<strong>🎓 </strong>')
    .replace('本科能报：', '<span class="deg-bachelor">✓ 本科：</span>')
    .replace('起步要硕士（甚至博士）：', '<span class="deg-master">▲ 硕士/博士：</span>')
    .replace('起步要硕士：', '<span class="deg-master">▲ 硕士：</span>');
}

function formatChinaSpecialHtml(text) {
  return escapeHtml(text || '').replace('【国内特色去向】', '<strong>🏛 </strong>');
}

function renderScoreHistoryLine(p) {
  const history = Array.isArray(p?.scoreHistory) ? p.scoreHistory : [];
  if (history.length >= 2) {
    const seq = history.map((h) => escapeHtml(h.score)).join(' → ');
    return `<div class="profile-history">历次：${seq}</div>`;
  }
  return '';
}

function renderScoreTag(p) {
  const count = Array.isArray(p?.scoreHistory) ? p.scoreHistory.length : 0;
  if (count >= 2) return `<span class="profile-score-label">${count}次加权均分</span>`;
  if (count === 1) return `<span class="profile-score-label">本次成绩</span>`;
  return '';
}

function renderRankLines(p, totalExamCount = 1) {
  const lines = [];
  const classCount = Number(p.classRankCount || 0);
  const gradeCount = Number(p.gradeRankCount || 0);

  if (classCount >= 2) {
    if (p.avgClassTopPct !== null) {
      lines.push(
        `班级排名均位：前 <strong>${p.avgClassTopPct}%</strong> · 最近第 ${p.latestClassRank} 名`
      );
    } else if (p.latestClassRank !== null) {
      lines.push(`班级排名最近：第 <strong>${p.latestClassRank}</strong> 名`);
    }
  } else if (classCount === 1 && p.latestClassRank !== null) {
    const pctText = p.latestClassTopPct !== null ? `（前 ${p.latestClassTopPct}%）` : '';
    const srcNote =
      totalExamCount > 1 && p.latestClassRankExamIndex
        ? ` <span class="rank-source-note">· 仅第 ${p.latestClassRankExamIndex} 次录入</span>`
        : '';
    lines.push(`班级排名：第 <strong>${p.latestClassRank}</strong> 名${pctText}${srcNote}`);
  } else if (p.avgClassTopPct !== null || p.latestClassRank !== null) {
    // 兼容旧缓存数据
    lines.push(
      p.avgClassTopPct !== null
        ? `班级排名均位：前 <strong>${p.avgClassTopPct}%</strong>`
        : `班级排名：第 <strong>${p.latestClassRank}</strong> 名`
    );
  }

  if (gradeCount >= 2) {
    if (p.avgGradeTopPct !== null) {
      lines.push(
        `年级排名均位：前 <strong>${p.avgGradeTopPct}%</strong> · 最近第 ${p.latestGradeRank} 名`
      );
    } else if (p.latestGradeRank !== null) {
      lines.push(`年级排名最近：第 <strong>${p.latestGradeRank}</strong> 名`);
    }
  } else if (gradeCount === 1 && p.latestGradeRank !== null) {
    const pctText = p.latestGradeTopPct !== null ? `（前 ${p.latestGradeTopPct}%）` : '';
    const srcNote =
      totalExamCount > 1 && p.latestGradeRankExamIndex
        ? ` <span class="rank-source-note">· 仅第 ${p.latestGradeRankExamIndex} 次录入</span>`
        : '';
    lines.push(`年级排名：第 <strong>${p.latestGradeRank}</strong> 名${pctText}${srcNote}`);
  } else if (p.avgGradeTopPct !== null || p.latestGradeRank !== null) {
    lines.push(
      p.avgGradeTopPct !== null
        ? `年级排名均位：前 <strong>${p.avgGradeTopPct}%</strong>`
        : `年级排名：第 <strong>${p.latestGradeRank}</strong> 名`
    );
  }

  if (lines.length === 0) {
    return '';
  }
  return lines.map((l) => `<div class="profile-val">${l}</div>`).join('');
}

function renderReport(data) {
  state.lastReportData = data;
  try {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota error
  }
  const { report, careerOutlook, sources, datasetStats } = data;
  const root = document.getElementById('report-root');

  const warningsHtml = (report.warnings || [])
    .map((w) => `<div class="alert alert-warning">⚠ ${escapeHtml(w)}</div>`)
    .join('');

  const aiNoteHtml = careerOutlook.aiErrorNote
    ? `<div class="alert alert-warning">⚠ ${escapeHtml(careerOutlook.aiErrorNote)}</div>`
    : '';

  const profilesHtml = report.subjectProfiles
    .map((p) => {
      const isStrong = p.avgScore !== null && p.avgScore >= 80;
      const scoreBlock =
        p.avgScore !== null
          ? `<div class="profile-score-big">${p.avgScore} <small>分</small>${renderScoreTag(p)}</div>`
          : `<div class="profile-score-big" style="color:var(--muted);">未录入</div>`;
      return `
        <div class="profile-item ${isStrong ? 'profile-item-strong' : ''}">
          <div class="profile-head">
            <span class="profile-subj">${escapeHtml(p.name)}</span>
            ${renderTrendBadge(p.trend)}
          </div>
          ${scoreBlock}
          ${renderScoreHistoryLine(p)}
          ${renderRankLines(p, report.examCount)}
        </div>
      `;
    })
    .join('');

  const careerById = new Map(
    (careerOutlook.byCombination || []).map((c) => [c.combinationId, c])
  );

  const recsHtml = report.recommendations
    .map((rec) => {
      const stats = rec.majorStats;
      const career = careerById.get(rec.id);

      const scoreReasonsHtml = rec.scoreReasons
        .map((r) => {
          const parts = r.split('：');
          if (parts.length >= 2) {
            return `<li><strong>${escapeHtml(parts[0])}</strong>：${escapeHtml(parts.slice(1).join('：'))}</li>`;
          }
          return `<li>${escapeHtml(r)}</li>`;
        })
        .join('');

      const strongTracksHtml = (stats.strongTracks || [])
        .slice(0, 6)
        .map(
          (t) => `
          <div class="track-item">
            <div class="track-head">
              <span>${escapeHtml(t.label)}</span>
              <span class="track-pct-tag">${t.coveragePct}% 可报（${t.eligibleUndergrad} 条）</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${t.coveragePct >= 85 ? '' : 'progress-fill-blue'}" style="width:${Math.min(100, t.coveragePct)}%"></div>
            </div>
            <div class="track-samples">代表专业：${escapeHtml(t.sampleMajors.join('、') || '—')}</div>
          </div>
        `
        )
        .join('');

      const restrictedText =
        stats.restrictedTracks && stats.restrictedTracks.length > 0
          ? stats.restrictedTracks
              .map((t) => `${t.label}（仅 ${t.coveragePct}% 可报）`)
              .join('；')
          : '几乎无明显大类专业限制，绝大多数理工和文商科专业都能报';

      const careerTracksHtml = (career?.trackAnalyses || [])
        .map(
          (ta) => `
          <div class="ai-track-card">
            <div class="ai-track-title">
              <span>${escapeHtml(ta.trackLabel)}</span>
              <span class="pill pill-purple">${escapeHtml(ta.trend)}</span>
            </div>
            ${ta.chinaSpecial ? `<div class="callout-china">${formatChinaSpecialHtml(ta.chinaSpecial)}</div>` : ''}
            ${ta.degreeGate ? `<div class="callout-degree">${formatDegreeGateHtml(ta.degreeGate)}</div>` : ''}
            <div class="ai-point"><span class="point-label point-outlook">📌 趋势</span>${escapeHtml(ta.outlook)}</div>
            <div class="ai-point"><span class="point-label point-risk">⚠ 风险</span>${escapeHtml(ta.risks)}</div>
            <div class="ai-point"><span class="point-label point-advice">💡 建议</span>${escapeHtml(ta.advice)}</div>
          </div>
        `
        )
        .join('');

      const reusedNoteHtml =
        career?.reusedTrackLabels && career.reusedTrackLabels.length > 0
          ? `<div class="reused-note">ℹ 本组同样覆盖「${escapeHtml(career.reusedTrackLabels.join('、'))}」等共同方向（详细就业分析见第 1 名首选组合，此处不再重复罗列，重点展示本组的特色方向）。</div>`
          : '';

      const diffPreviewHtml = career?.diffFromTop1
        ? `<div class="rec-diff-preview">🔀 ${escapeHtml(career.diffFromTop1)}</div>`
        : '';

      const badgeClass = rec.rank === 1 ? 'pill-gold' : rec.rank === 2 ? 'pill-teal' : 'pill-purple';
      const badgePrefix = rec.rank === 1 ? '★ ' : '';

      return `
        <details class="rec-card ${rec.rank === 1 ? 'rec-card-top1' : ''}" ${rec.rank === 1 ? 'open' : ''}>
          <summary class="rec-summary">
            <div class="rec-summary-top">
              <div class="rec-title-group">
                <span class="rec-rank-num rec-rank-${rec.rank}">${rec.rank}</span>
                <h3 class="rec-name">${escapeHtml(rec.displayName)}</h3>
                <span class="pill ${badgeClass}">${badgePrefix}${escapeHtml(rec.badge)}</span>
              </div>
              <div class="rec-summary-right">
                <div class="rec-score-box">
                  <span class="metric-chip metric-blue">学科实力 <strong>${rec.academicScore}</strong></span>
                  <span class="metric-chip metric-green">本科可报 <strong>${stats.undergradCoveragePct}%</strong></span>
                  <span class="metric-chip metric-purple">综合推荐 <strong>${rec.compositeScore}</strong></span>
                </div>
                <span class="rec-toggle-btn no-print" aria-hidden="true">
                  <span class="toggle-text-expand">展开详情 ▾</span>
                  <span class="toggle-text-collapse">收起详情 ▴</span>
                </span>
              </div>
            </div>
            ${diffPreviewHtml}
          </summary>

          <div class="rec-body">
            <div class="reason-block">
              <h4><span class="sec-tag">成绩依据</span></h4>
              <ul class="reason-list">${scoreReasonsHtml}</ul>
            </div>

            <div class="reason-block reason-block-majors">
              <div class="reason-block-head">
                <h4 style="margin:0;"><span class="sec-tag sec-tag-green">原因 1</span> 可报考专业</h4>
                <button type="button" class="btn btn-secondary btn-sm no-print" data-explore-combo="${rec.id}">查具体院校 →</button>
              </div>
              <div class="coverage-row">
                <div class="coverage-stat">
                  <div class="hint">本科可报</div>
                  <div class="coverage-num">
                    <span class="coverage-count">${stats.eligibleUndergrad.toLocaleString()} / ${stats.totalUndergrad.toLocaleString()}</span>
                    <span class="coverage-pct">${stats.undergradCoveragePct}%</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill ${stats.undergradCoveragePct >= 80 ? '' : stats.undergradCoveragePct >= 55 ? 'progress-fill-blue' : 'progress-fill-amber'}" style="width:${Math.min(100, stats.undergradCoveragePct)}%"></div></div>
                </div>
                <div class="coverage-stat">
                  <div class="hint">专科可报</div>
                  <div class="coverage-num coverage-num-blue">
                    <span class="coverage-count">${stats.eligibleVocational.toLocaleString()} / ${stats.totalVocational.toLocaleString()}</span>
                    <span class="coverage-pct">${stats.vocationalCoveragePct}%</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill progress-fill-blue" style="width:${Math.min(100, stats.vocationalCoveragePct)}%"></div></div>
                </div>
              </div>
              <div class="sub-block-title">主要可报大类</div>
              <div class="track-grid">${strongTracksHtml}</div>
              <div class="restricted-callout"><strong>⚠ 受限方向：</strong>${escapeHtml(restrictedText)}</div>
            </div>

            <div class="reason-block ai-block">
              <h4><span class="sec-tag sec-tag-purple">原因 2</span> ${report.gradYear} 年就业预估</h4>
              <p class="strategic-lead">${escapeHtml(career?.strategicSummary || '')}</p>
              ${careerTracksHtml}
              ${reusedNoteHtml}
            </div>
          </div>
        </details>
      `;
    })
    .join('');

  const all12Rows = report.allCombinations
    .map((c, idx) => {
      const st = c.majorStats;
      const rankNum = c.compositeScore !== null ? idx + 1 : null;
      const rankCell = rankNum
        ? `<span class="table-rank-pill ${rankNum <= 3 ? `table-rank-${rankNum}` : ''}">${rankNum}</span>`
        : '—';
      const pctClass =
        st.undergradCoveragePct >= 85
          ? 'pct-high'
          : st.undergradCoveragePct >= 55
          ? 'pct-mid'
          : 'pct-low';
      return `
        <tr class="${rankNum && rankNum <= 3 ? 'row-top-rank' : ''}">
          <td>${rankCell}</td>
          <td><strong>${escapeHtml(c.displayName)}</strong></td>
          <td><strong>${c.academicScore !== null ? c.academicScore : `缺：${escapeHtml(c.missingSubjects.join('、'))}`}</strong></td>
          <td><span class="${pctClass}">${st.undergradCoveragePct}%</span> <span class="hint">(${st.eligibleUndergrad.toLocaleString()}/${st.totalUndergrad.toLocaleString()})</span></td>
          <td>${st.vocationalCoveragePct}% <span class="hint">(${st.eligibleVocational.toLocaleString()}/${st.totalVocational.toLocaleString()})</span></td>
          <td><strong style="color:var(--primary);font-size:15px;">${c.compositeScore !== null ? c.compositeScore : '待补录'}</strong></td>
        </tr>
      `;
    })
    .join('');

  const generatedTime = new Date(report.generatedAt).toLocaleString('zh-CN');
  const titlePrefix = report.studentName ? `${report.studentName} · ` : '';
  const sourceLine = (sources || [])
    .map((s) => `${s.title}（${s.publisher}，${s.publishedAt}）`)
    .join('；');

  const examTotal = report.examTotalProfile;
  const renderTotalRankDetail = (count, avgPct, latestPct, latestRank, examIdx, labelPrefix) => {
    if (count >= 2) {
      return avgPct !== null
        ? `<div class="profile-val">${labelPrefix}均位：前 <strong>${avgPct}%</strong></div>`
        : '';
    }
    if (count === 1 && latestRank !== null) {
      const pct = latestPct !== null ? `前 <strong>${latestPct}%</strong>` : '';
      const src = report.examCount > 1 && examIdx ? `仅第 ${examIdx} 次录入` : '';
      const joined = [pct, src].filter(Boolean).join(' · ');
      return joined ? `<div class="profile-val">${joined}</div>` : '';
    }
    return '';
  };

  const buildWeightExplainHtml = () => {
    if (report.examCount < 2) return '';
    const sampleWeights = [];
    for (let i = 0; i < Math.min(report.examCount, 4); i += 1) {
      sampleWeights.push(`第 ${i + 1} 次 <strong>${(1 + i * 0.15).toFixed(2)}</strong>`);
    }
    const weightSeq = sampleWeights.join('、') + (report.examCount > 4 ? '……' : '');
    return `
      <details class="metric-explain-box print-expand-details" style="margin:0 0 14px;">
        <summary>计算说明：什么是「加权总分 / 加权均分」？具体怎么算的？</summary>
        <ul class="metric-explain-list">
          <li><strong>什么是加权？</strong>孩子刚开学时的成绩和最近一次考试相比，<strong>越近的考试越能代表孩子当前真实水平</strong>。所以系统不是把几次分数简单相加求平均，而是给越靠后的考试分配越高的比重（权重），这就是「时间加权」。</li>
          <li><strong>具体怎么算？</strong>按录入顺序，第 1 次考试权重为 <strong>1.00</strong>，每往后一次增加 <strong>0.15</strong>（您本次录入 ${report.examCount} 次，权重依次为：${weightSeq}）。计算公式为：<code>加权分 = (第1次×1.00 + 第2次×1.15 + …) ÷ 权重总和</code>，结果四舍五入保留 1 位小数。</li>
          <li><strong>举个例子</strong>：假如某科第 1 次考 80 分、第 2 次考 90 分，普通平均分是 85.0 分；按时间加权则是 <code>(80×1.00 + 90×1.15) ÷ (1.00 + 1.15) = 85.3 分</code>，更贴近最近进步后的状态。<strong>考试总分、语数外、六门选考以及排名均位</strong>均按此统一规则计算。</li>
        </ul>
      </details>
    `;
  };
  const weightExplainHtml = buildWeightExplainHtml();
  let weightExplainPlaced = false;
  const takeWeightExplain = () => {
    if (weightExplainPlaced || !weightExplainHtml) return '';
    weightExplainPlaced = true;
    return weightExplainHtml;
  };

  const examTotalSectionHtml = examTotal?.hasData
    ? `
    <section class="doc-section">
      <h3 class="doc-h3" style="margin-bottom:4px;">考试总分与排名概况</h3>
      <p class="hint" style="margin-bottom:12px;">总分按历次考试时间加权计算（越近权重越高）；总排名为选填项，仅按已录入场次统计。</p>
      ${takeWeightExplain()}
      <div class="total-overview-grid">
        <div class="profile-item profile-item-strong">
          <div class="profile-head">
            <span class="profile-subj">${(examTotal.scoreHistory?.length || 0) >= 2 ? '加权总分' : '本次总分'}</span>
            ${renderTrendBadge(examTotal.trend)}
          </div>
          <div class="profile-score-big">${examTotal.avgScore !== null ? `${examTotal.avgScore} <small>分</small>` : '<span style="color:var(--muted);">未录入</span>'}</div>
          ${renderScoreHistoryLine(examTotal)}
        </div>
        ${
          examTotal.latestClassRank !== null
            ? `<div class="profile-item">
          <div class="profile-head">
            <span class="profile-subj">总分班级排名</span>
          </div>
          <div class="profile-score-big" style="color:var(--info);">第 ${examTotal.latestClassRank} <small>名</small></div>
          ${renderTotalRankDetail(examTotal.classRankCount, examTotal.avgClassTopPct, examTotal.latestClassTopPct, examTotal.latestClassRank, examTotal.latestClassRankExamIndex, '班级排名')}
        </div>`
            : ''
        }
        ${
          examTotal.latestGradeRank !== null
            ? `<div class="profile-item">
          <div class="profile-head">
            <span class="profile-subj">总分年级排名</span>
          </div>
          <div class="profile-score-big" style="color:var(--purple);">第 ${examTotal.latestGradeRank} <small>名</small></div>
          ${renderTotalRankDetail(examTotal.gradeRankCount, examTotal.avgGradeTopPct, examTotal.latestGradeTopPct, examTotal.latestGradeRank, examTotal.latestGradeRankExamIndex, '年级排名')}
        </div>`
            : ''
        }
      </div>
    </section>
  `
    : '';

  const hasCoreData = (report.coreProfiles || []).some((p) => p.hasData);
  const coreSectionHtml = hasCoreData
    ? `
    <section class="card">
      <h3 style="margin:0 0 4px;font-size:17px;">语数外成绩${report.coreTotalAvg !== null ? ` <span class="pill pill-teal" style="margin-left:8px;">${report.examCount >= 2 ? '加权总分' : '总分'} ${report.coreTotalAvg} / 450</span>` : ''}</h3>
      <p class="hint" style="margin-bottom:12px;">${report.examCount >= 2 ? '下方主科分数为多次考试加权均分（越近权重越高），并附历次得分轨迹；排名仅按已录入场次展示。' : '下方为本次录入的语数外主科成绩与排名。'}</p>
      ${takeWeightExplain()}
      <div class="core-profile-grid">
        ${report.coreProfiles
          .map((p) => {
            const scoreBlock =
              p.avgScore !== null
                ? `<div class="profile-score-big" style="color:#0f766e;">${p.avgScore} <small>/ 150</small>${renderScoreTag(p)}</div>`
                : `<div class="profile-score-big" style="color:var(--muted);">未录入</div>`;
            return `
              <div class="profile-item profile-item-core">
                <div class="profile-head">
                  <span class="profile-subj">${escapeHtml(p.name)}</span>
                  ${renderTrendBadge(p.trend)}
                </div>
                ${scoreBlock}
                ${renderScoreHistoryLine(p)}
                ${renderRankLines(p, report.examCount)}
              </div>
            `;
          })
          .join('')}
      </div>
      ${
        report.coreInsights && report.coreInsights.length > 0
          ? `<ul class="reason-list" style="margin-top:10px;">${report.coreInsights
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join('')}</ul>`
          : ''
      }
    </section>
  `
    : '';

  const offeringsStr = (datasetStats?.offeringsCount || PROVINCE_CONFIG.offeringsCount || 0).toLocaleString();
  const provName = PROVINCE_CONFIG.name;
  const provFullName = PROVINCE_CONFIG.fullName;
  const provShortGeo = PROVINCE_CONFIG.shortGeo;
  const provAuthority = PROVINCE_CONFIG.authorityName;

  const buildMetricExplainHtml = (extraClass = '') => `
    <details class="metric-explain-box ${extraClass}">
      <summary>指标说明：什么是「学科实力分」和「综合推荐指数」？</summary>
      <ul class="metric-explain-list">
        <li><strong>学科实力分（满分 100）</strong>：不是简单把三科卷面分相加，而是贴合${escapeHtml(provName)}等级赋分规则，按 <strong>60% 排名位置 + 40% 卷面加权均分</strong> 综合得出（近期明显上升 +1.5 分，有所下滑 -1.5 分）。因此<strong>卷子难、卷面分略低但排名靠前</strong>的科目，实力分会比<strong>分数略高但排名靠后</strong>的科目更高；未填排名的科目则按卷面分估算。</li>
        <li><strong>本科可报占比</strong>：基于${escapeHtml(provFullName)} ${escapeHtml(offeringsStr)} 条官方高校专业选科要求统计，反映该组合能报考多少比例的本科专业（例如含「物理+化学」的组合约 96%~97%，不含化学的物理组合约 50%）。</li>
        <li><strong>综合推荐指数（满分 100）</strong>：按 <strong>80% 学科实力分 + 20% 本科可报占比</strong> 综合计算，用于在「更容易拿高分」和「大学专业选择面更广」之间找平衡。所以有时某个组合实力分略高，但因可报本科专业少了一半，综合推荐指数就会偏低。</li>
      </ul>
    </details>
  `;

  root.innerHTML = `
    <div class="doc-sheet report-doc">
      <section class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">${escapeHtml(titlePrefix)}${escapeHtml(provName)}选科与就业白皮书</h2>
            <p class="hint">生成于 ${escapeHtml(generatedTime)} · 基于 ${report.examCount} 次考试记录</p>
            <p class="report-meta-line">${escapeHtml(provName)} ${escapeHtml(PROVINCE_CONFIG.mode)} · ${report.examYear}年高考（本科 ${report.gradYear} / 读研 ${report.masterGradYear} 毕业） · 涵盖 ${escapeHtml(offeringsStr)} 个${escapeHtml(provShortGeo)}高校专业</p>
          </div>
          <div class="report-header-actions desktop-only no-print">
            <button type="button" class="btn btn-secondary" id="btn-back-edit">← 修改成绩</button>
            <button type="button" class="btn btn-secondary" id="btn-share-report">分享报告</button>
            <button type="button" class="btn btn-primary" id="btn-print-inline">导出 PDF</button>
          </div>
        </div>
        <div class="report-mobile-share no-print">
          <button type="button" class="btn btn-primary" id="btn-share-report-mobile">分享报告（生成长图 / 发给家人）</button>
        </div>
      </section>

      ${warningsHtml}
      ${aiNoteHtml}

      <section class="doc-section">
        <h3 class="doc-h3">${report.gradYear} 年毕业就业大环境</h3>
        ${
          careerOutlook.macroPillars && careerOutlook.macroPillars.length > 0
            ? `<div class="macro-grid">${careerOutlook.macroPillars
                .map(
                  (mp) => `
                <div class="macro-card macro-${escapeHtml(mp.theme || 'blue')}">
                  <div class="macro-card-title">${escapeHtml(mp.icon)} ${escapeHtml(mp.title)}</div>
                  <div>${escapeHtml(mp.body)}</div>
                </div>
              `
                )
                .join('')}</div>`
            : `<p style="margin:0 0 10px;font-size:14px;">${escapeHtml(careerOutlook.macroSummary)}</p>`
        }
        <p class="hint" style="margin-top:10px;">${escapeHtml(careerOutlook.disclaimer)}</p>
      </section>

      ${examTotalSectionHtml}

      ${coreSectionHtml}

      <section class="doc-section">
        <h3 class="doc-h3" style="margin-bottom:4px;">六门选考成绩画像</h3>
        <p class="hint" style="margin-bottom:14px;">${report.examCount >= 2 ? '大字为历次考试时间加权均分（越近权重越高），下方附每次原始分轨迹；排名为选填项，仅按已录入场次统计。' : '下方为本次录入的六门选考科目成绩与排名。'}</p>
        ${takeWeightExplain()}
        <div class="profile-grid">${profilesHtml}</div>
      </section>

      <section class="doc-section">
        <div class="recs-toolbar">
          <h3 class="doc-h3" style="margin:0;">推荐选科组合详解</h3>
          <div class="no-print" style="display:flex;gap:8px;">
            <button type="button" class="btn btn-secondary" id="btn-expand-all-recs">全部展开</button>
            <button type="button" class="btn btn-ghost" id="btn-collapse-all-recs">只看首选</button>
          </div>
        </div>
        ${buildMetricExplainHtml('print-expand-details')}
        ${recsHtml}
      </section>
    </div>

    <section id="section-compare" class="doc-sheet compare-sheet">
      <div class="section-header">
        <div>
          <h2>全部 12 种组合横向对比</h2>
          <p class="hint">按学科实力分与${escapeHtml(provShortGeo)}招生本科专业覆盖率综合排序</p>
        </div>
        <button type="button" class="btn btn-secondary desktop-only no-print" id="btn-back-report">← 返回白皮书</button>
      </div>
      ${buildMetricExplainHtml('no-print')}
      <div class="mobile-scroll-hint no-print">← 左右滑动查看完整表格 →</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>排序</th>
              <th>选科组合</th>
              <th>学科实力分</th>
              <th>本科可报条目与占比</th>
              <th>专科可报条目与占比</th>
              <th>综合推荐指数</th>
            </tr>
          </thead>
          <tbody>${all12Rows}</tbody>
        </table>
      </div>
      <div class="report-footer-note">
        <div><strong>官方数据来源：</strong>${escapeHtml(sourceLine)}</div>
        <div style="margin-top:4px;"><strong>使用提示：</strong>本报告为家庭选科决策参考，不代表高考赋分预测或录取保证；实际招生计划及选考要求以高考当年${escapeHtml(provAuthority)}正式公布为准。</div>
      </div>
    </section>
  `;

  document.getElementById('btn-print-top').disabled = false;

  document.getElementById('btn-print-inline')?.addEventListener('click', handleExportPdf);
  document.getElementById('btn-share-report')?.addEventListener('click', openShareModal);
  document.getElementById('btn-share-report-mobile')?.addEventListener('click', openShareModal);
  document.getElementById('btn-back-edit')?.addEventListener('click', () => switchView('section-input'));
  document.getElementById('btn-back-report')?.addEventListener('click', () => switchView('report-root'));
  document.getElementById('btn-expand-all-recs')?.addEventListener('click', () => {
    root.querySelectorAll('details.rec-card').forEach((d) => {
      d.open = true;
    });
  });
  document.getElementById('btn-collapse-all-recs')?.addEventListener('click', () => {
    root.querySelectorAll('details.rec-card').forEach((d, idx) => {
      d.open = idx === 0;
    });
  });
  root.querySelectorAll('[data-explore-combo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-explore-combo');
      const select = document.getElementById('major-combo-filter');
      select.value = cid;
      switchView('major-explorer');
      searchMajors(false);
    });
  });

  // 初始化底部官方 79,753 条院校专业查询区
  const comboSelect = document.getElementById('major-combo-filter');
  comboSelect.innerHTML = report.allCombinations
    .map((c) => `<option value="${c.id}">${escapeHtml(formatComboOptionLabel(c.displayName, c.majorStats.undergradCoveragePct))}</option>`)
    .join('');
  if (report.recommendations[0]) {
    comboSelect.value = report.recommendations[0].id;
  }
  searchMajors(false);
}

async function searchMajors(append) {
  const q = document.getElementById('major-search-input').value.trim();
  const combinationId = document.getElementById('major-combo-filter').value;
  const level = document.getElementById('major-level-filter').value;
  const onlyEligible = document.getElementById('major-only-eligible').checked;
  const offset = append ? state.majorSearchOffset : 0;

  const params = new URLSearchParams({
    province: PROVINCE_CONFIG.code,
    q,
    combinationId,
    level,
    onlyEligible: String(onlyEligible),
    offset: String(offset),
    limit: '20',
  });

  const metaEl = document.getElementById('major-results-meta');
  const bodyEl = document.getElementById('major-results-body');
  const moreBtn = document.getElementById('btn-load-more-majors');

  if (!append) {
    metaEl.textContent = `正在查找${PROVINCE_CONFIG.shortGeo}招生高校专业...`;
  }

  try {
    const res = await fetch(`/api/v1/majors?${params.toString()}`);
    const json = await res.json();
    if (!json.ok) {
      metaEl.textContent = '查询失败，请重试';
      return;
    }

    const { items, total, dataYear } = json.data;
    state.majorSearchTotal = total;
    state.majorSearchOffset = offset + items.length;

    metaEl.textContent = `共找到 ${total.toLocaleString()} 条符合条件的 ${dataYear} 年官方条目（当前已展示 ${state.majorSearchOffset} 条）`;

    const rowsHtml = items
      .map((it) => {
        const badge =
          it.matchStatus === 'eligible'
            ? '<span class="pill pill-success">✓ 满足选科条件</span>'
            : it.matchStatus === 'ineligible'
            ? '<span class="pill pill-error">✕ 不满足</span>'
            : '<span class="pill pill-warning">待核实</span>';
        return `
          <tr>
            <td><strong>${escapeHtml(it.institutionName)}</strong></td>
            <td>${escapeHtml(it.level)}</td>
            <td>${escapeHtml(it.majorName)}</td>
            <td>${escapeHtml(it.requirementRaw)}</td>
            <td>${badge}</td>
          </tr>
        `;
      })
      .join('');

    if (append) {
      bodyEl.insertAdjacentHTML('beforeend', rowsHtml);
    } else {
      bodyEl.innerHTML =
        rowsHtml || '<tr><td colspan="5" style="text-align:center;color:var(--muted);">当前条件下暂无匹配条目，试试更短的关键词或取消「仅显示可报考」</td></tr>';
    }

    if (state.majorSearchOffset < total) {
      moreBtn.classList.remove('hidden');
    } else {
      moreBtn.classList.add('hidden');
    }
  } catch {
    metaEl.textContent = '网络连接失败，请确认本地服务正在运行';
  }
}

async function generateReport() {
  showError('');
  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.textContent = `正在分析成绩、匹配 ${PROVINCE_CONFIG.offeringsStr} 条官方专业并生成就业研判...`;

  try {
    const res = await fetch('/api/v1/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        province: PROVINCE_CONFIG.code,
        studentName: state.studentName,
        examYear: state.examYear,
        exams: state.exams,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      showError(json.error?.message || '生成报告失败，请检查成绩填写');
      return;
    }
    renderReport(json.data);
    switchView('report-root');
  } catch (err) {
    console.error('[generateReport]', err);
    showError('网络开小差了或页面加载异常，请刷新页面后重试');
  } finally {
    btn.disabled = false;
    btn.textContent = '生成选科与就业白皮书';
  }
}

function bindEvents() {
  const provinceSelect = document.getElementById('province-select');
  const yearSelect = document.getElementById('exam-year');
  const nameInput = document.getElementById('student-name');
  const aiBase = document.getElementById('ai-base-url');
  const aiModel = document.getElementById('ai-model');
  const aiKey = document.getElementById('ai-api-key');

  if (provinceSelect) {
    provinceSelect.value = PROVINCE_CONFIG.code;
    provinceSelect.addEventListener('change', () => {
      const targetCode = provinceSelect.value || PROVINCE_CONFIG.code;
      if (targetCode !== PROVINCE_CONFIG.code) {
        const target = (PROVINCE_CONFIG.provinces || []).find((p) => p.code === targetCode);
        if (target && target.slug) {
          window.location.href = `/${target.slug}`;
          return;
        }
      }
      state.province = targetCode;
      saveState();
    });
  }
  yearSelect.value = String(state.examYear);
  nameInput.value = state.studentName;
  if (aiBase) aiBase.value = state.aiConfig.baseUrl || '';
  if (aiModel) aiModel.value = state.aiConfig.model || '';
  if (aiKey) aiKey.value = state.aiConfig.apiKey || '';

  yearSelect.addEventListener('change', () => {
    state.examYear = Number(yearSelect.value);
    saveState();
  });

  nameInput.addEventListener('input', () => {
    state.studentName = nameInput.value;
    saveState();
  });

  aiBase?.addEventListener('input', () => {
    state.aiConfig.baseUrl = aiBase.value;
    saveState();
  });
  aiModel?.addEventListener('input', () => {
    state.aiConfig.model = aiModel.value;
    saveState();
  });
  aiKey?.addEventListener('input', () => {
    state.aiConfig.apiKey = aiKey.value;
    saveState();
  });

  document.getElementById('exams-container').addEventListener('input', (e) => {
    const target = e.target;
    const idx = Number(target.getAttribute('data-exam-idx'));
    if (Number.isNaN(idx) || !state.exams[idx]) return;

    const updateSumHint = () => {
      const hintEl = document.querySelector(`[data-sum-hint="${idx}"]`);
      if (hintEl) hintEl.textContent = formatExamSumHint(state.exams[idx]);
    };

    const meta = target.getAttribute('data-meta');
    if (meta) {
      let val = target.value;
      if (meta === 'totalScore') {
        val = sanitizeDecimalInput(val);
        if (val !== target.value) target.value = val;
      }
      state.exams[idx][meta] = val;
      saveState();
      return;
    }

    const coreCode = target.getAttribute('data-core');
    const field = target.getAttribute('data-field');
    if (coreCode && field) {
      if (!state.exams[idx].coreSubjects) {
        state.exams[idx].coreSubjects = {};
      }
      if (!state.exams[idx].coreSubjects[coreCode]) {
        state.exams[idx].coreSubjects[coreCode] = { score: '', classRank: '', gradeRank: '' };
      }
      let val = target.value;
      if (field === 'score') {
        val = sanitizeDecimalInput(val);
        if (val !== target.value) target.value = val;
      }
      state.exams[idx].coreSubjects[coreCode][field] = val;
      if (field === 'score') updateSumHint();
      saveState();
      return;
    }

    const subj = target.getAttribute('data-subj');
    if (subj && field) {
      if (!state.exams[idx].subjects[subj]) {
        state.exams[idx].subjects[subj] = { score: '', classRank: '', gradeRank: '' };
      }
      let val = target.value;
      if (field === 'score') {
        val = sanitizeDecimalInput(val);
        if (val !== target.value) target.value = val;
      }
      state.exams[idx].subjects[subj][field] = val;
      if (field === 'score') updateSumHint();
      saveState();
    }
  });

  document.getElementById('exams-container').addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('[data-remove-idx]');
    if (!removeBtn || removeBtn.disabled) return;
    const idx = Number(removeBtn.getAttribute('data-remove-idx'));
    if (Number.isNaN(idx) || state.exams.length <= 1) return;
    const examName = state.exams[idx]?.name?.trim() || `第 ${idx + 1} 次考试`;
    const confirmed = await openConfirmModal({
      title: '删除考试记录',
      message: `确定删除「${examName}」的成绩记录吗？删除前系统会自动为你暂存当前数据，可随时点击「恢复暂存」找回。`,
      confirmText: '确认删除',
      danger: true,
    });
    if (!confirmed) return;
    saveSnapshot('auto');
    state.exams.splice(idx, 1);
    state.exams.forEach((ex, i) => {
      if (/^第\s*\d+\s*次考试$/.test(String(ex.name || '').trim())) {
        ex.name = `第 ${i + 1} 次考试`;
      }
    });
    saveState();
    renderExams();
    updateSaveStatus(`✓ 已删除「${examName}」（删除前已自动暂存，可点「恢复暂存」找回）`);
  });

  const addExamAndScroll = () => {
    state.exams.push(createEmptyExam(state.exams.length));
    saveState();
    renderExams();
    const cards = document.querySelectorAll('#exams-container .exam-card');
    const newest = cards[cards.length - 1];
    newest?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  document.getElementById('btn-add-exam')?.addEventListener('click', addExamAndScroll);
  document.getElementById('btn-add-exam-bottom')?.addEventListener('click', addExamAndScroll);

  document.getElementById('btn-restore-snapshot')?.addEventListener('click', restoreSnapshot);

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    const confirmed = await openConfirmModal({
      title: '清空全部成绩',
      message: '确定清空当前填写的所有考试记录和学生信息吗？清空前系统会自动为你暂存，可随时点击「恢复暂存」找回。',
      confirmText: '确认清空',
      danger: true,
    });
    if (!confirmed) return;
    saveSnapshot('auto');
    state.studentName = '';
    state.lastReportData = null;
    nameInput.value = '';
    state.exams = [createEmptyExam(0)];
    saveState();
    renderExams();
    document.getElementById('btn-print-top').disabled = true;
    try {
      localStorage.removeItem(REPORT_STORAGE_KEY);
    } catch {
      // ignore
    }
    switchView('section-input');
    showError('');
    if (getSnapshot()) {
      updateSaveStatus('✓ 已清空当前表单（原有成绩已自动暂存，可点下方「恢复暂存」找回）');
    }
  });

  const triggerManualSave = (btnEl) => {
    const ok = saveState(true);
    saveSnapshot('manual');
    if (ok && btnEl) {
      const origin = btnEl.textContent;
      btnEl.textContent = '✓ 已暂存';
      setTimeout(() => {
        btnEl.textContent = origin;
      }, 1600);
    }
  };

  const btnSaveDraft = document.getElementById('btn-save-draft');
  btnSaveDraft.addEventListener('click', () => triggerManualSave(btnSaveDraft));

  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          studentName: state.studentName,
          examYear: state.examYear,
          exams: state.exams,
          aiConfig: state.aiConfig,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
  });

  // 顶部导航栏平滑跳转 + 移动端三横线菜单展开/收起 + IntersectionObserver 滚动高亮
  const mainNav = document.getElementById('main-nav');
  const navToggleBtn = document.getElementById('btn-nav-toggle');
  const siteHeader = document.getElementById('site-header');

  const closeMobileNav = () => {
    mainNav?.classList.remove('nav-open');
    navToggleBtn?.setAttribute('aria-expanded', 'false');
    document.getElementById('portal-nav')?.classList.remove('nav-open');
    document.getElementById('btn-portal-nav-toggle')?.setAttribute('aria-expanded', 'false');
  };

  navToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const opened = mainNav?.classList.toggle('nav-open');
    navToggleBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (mainNav?.classList.contains('nav-open') && siteHeader && !siteHeader.contains(e.target)) {
      closeMobileNav();
    }
  });

  document.getElementById('province-brand-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileNav();
    switchView('section-input');
  });

  const navButtons = Array.from(document.querySelectorAll('.main-nav .nav-item'));
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-nav');
      closeMobileNav();
      if (targetId) {
        switchView(targetId);
      }
    });
  });

  document.getElementById('btn-generate').addEventListener('click', generateReport);
  document.getElementById('btn-print-top').addEventListener('click', handleExportPdf);

  document.getElementById('btn-search-majors').addEventListener('click', () => searchMajors(false));
  document.getElementById('major-combo-filter').addEventListener('change', () => searchMajors(false));
  document.getElementById('major-level-filter').addEventListener('change', () => searchMajors(false));
  document.getElementById('major-only-eligible').addEventListener('change', () => searchMajors(false));
  document.getElementById('major-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchMajors(false);
  });
  document.getElementById('btn-load-more-majors').addEventListener('click', () => searchMajors(true));

  // 页脚快捷导航
  document.querySelectorAll('[data-footer-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-footer-nav');
      if (targetId) switchView(targetId);
    });
  });

  initMobileSelectSheet();
  initPdfGuideModal();
  initShareModal();
}

function buildShareLinkBundle() {
  const report = state.lastReportData?.report;
  if (!report) return '';
  const titlePrefix = report.studentName ? `${report.studentName} · ` : '';
  const top1 = report.recommendations?.[0];
  const lines = [
    `【${titlePrefix}${PROVINCE_CONFIG.name} ${PROVINCE_CONFIG.mode} 选科分析报告】`,
    `${report.examYear}年高考（${report.gradYear}年本科毕业） · 基于 ${report.examCount} 次考试`,
  ];
  if (top1) {
    lines.push(
      `★ 首选推荐：${top1.displayName}（学科实力 ${top1.academicScore} · 本科可报 ${top1.majorStats?.undergradCoveragePct ?? '-'}%）`
    );
  }
  (report.recommendations || []).slice(1, 3).forEach((rec) => {
    lines.push(
      `${rec.rank}. ${rec.displayName}（${rec.badge} · 本科可报 ${rec.majorStats?.undergradCoveragePct ?? '-'}%）`
    );
  });
  lines.push(
    '',
    '👉 点击查看完整选科与就业报告（已自动带入成绩，无需重填）：',
    buildCarryDataUrl()
  );
  return lines.join('\n');
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapCanvasLines(ctx, text, maxWidth) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadLocalImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function generateSharePosterDataUrl() {
  const data = state.lastReportData;
  if (!data?.report) return null;
  const { report, datasetStats } = data;
  const [logoImg, qrImg] = await Promise.all([
    loadLocalImage('/logo.jpg?v=2'),
    loadLocalImage(`${PROVINCE_CONFIG.qrPath}?v=1`),
  ]);

  const W = 750;
  const PAD = 32;
  const INNER_W = W - PAD * 2;
  const SCALE = 2;
  const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

  // 测量用离屏上下文，精准计算总高度
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');
  const top1 = report.recommendations?.[0];
  const top1Tracks = (top1?.majorStats?.strongTracks || []).slice(0, 4).map((t) => t.label.split(' / ')[0]).join('、');
  const top1Summary = top1
    ? `本科可报 ${top1.majorStats.eligibleUndergrad.toLocaleString()} / ${top1.majorStats.totalUndergrad.toLocaleString()} 个专业${top1Tracks ? `，重点覆盖：${top1Tracks} 等方向` : ''}`
    : '';
  mctx.font = `400 22px ${FONT}`;
  const top1SummaryLines = top1Summary ? wrapCanvasLines(mctx, top1Summary, INNER_W - 44) : [];

  const hasExamTotal = Boolean(report.examTotalProfile?.hasData);
  const recs = (report.recommendations || []).slice(0, 3);

  let totalH = 0;
  totalH += 218; // Header banner
  totalH += 24;
  if (hasExamTotal) totalH += 108;
  totalH += 44 + 2 * 136 + 14 + 28; // 6-subject grid (2 rows x 3 cols)
  totalH += 44; // Recs section title
  recs.forEach((rec, i) => {
    totalH += i === 0 ? 156 + top1SummaryLines.length * 30 : 144;
    totalH += 16;
  });
  totalH += 204; // Footer card with QR code + bottom disclaimer

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Page backdrop
  ctx.fillStyle = '#f7f8fa';
  ctx.fillRect(0, 0, W, totalH);

  // Top emerald accent bar
  ctx.fillStyle = '#00b96b';
  ctx.fillRect(0, 0, W, 8);

  // Header card background
  ctx.fillStyle = '#effaf5';
  ctx.fillRect(0, 8, W, 210);
  ctx.fillStyle = '#b7ebcf';
  ctx.fillRect(0, 218, W, 1);

  // Brand row
  let curY = 34;
  if (logoImg) {
    ctx.save();
    drawRoundedRect(ctx, PAD, curY, 44, 44, 10);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, curY, 44, 44);
    ctx.restore();
  }
  ctx.fillStyle = '#262626';
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(`高中选科助手 · ${PROVINCE_CONFIG.name}`, PAD + (logoImg ? 56 : 0), curY + 30);

  // Right tag
  const modeTag = `${report.examYear}年高考 · ${PROVINCE_CONFIG.mode}`;
  ctx.font = `600 20px ${FONT}`;
  const tagW = ctx.measureText(modeTag).width + 26;
  drawRoundedRect(ctx, W - PAD - tagW, curY + 6, tagW, 34, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#b7ebcf';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#007a47';
  ctx.fillText(modeTag, W - PAD - tagW + 13, curY + 30);

  // Report main title
  curY = 128;
  const titlePrefix = report.studentName ? `${report.studentName} · ` : '';
  const mainTitle = `${titlePrefix}${PROVINCE_CONFIG.name}选科分析报告`;
  ctx.fillStyle = '#1f2937';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(mainTitle, PAD, curY);

  // Subtitle
  curY += 38;
  ctx.fillStyle = '#595959';
  ctx.font = `400 21px ${FONT}`;
  const posterOfferingsStr = (datasetStats?.offeringsCount || PROVINCE_CONFIG.offeringsCount || 0).toLocaleString();
  ctx.fillText(
    `基于 ${report.examCount} 次考试记录 · 涵盖 ${posterOfferingsStr} 条${PROVINCE_CONFIG.shortGeo}高校专业要求`,
    PAD,
    curY
  );

  curY = 242;

  // Optional Exam Total Summary Strip
  if (hasExamTotal) {
    const et = report.examTotalProfile;
    drawRoundedRect(ctx, PAD, curY, INNER_W, 84, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#eceef2';
    ctx.lineWidth = 1;
    ctx.stroke();

    const parts = [];
    if (et.avgScore !== null) parts.push(`加权总分 ${et.avgScore} 分`);
    if (et.latestClassRank !== null) parts.push(`总分班级排名 第 ${et.latestClassRank} 名`);
    if (et.latestGradeRank !== null) parts.push(`总分年级排名 第 ${et.latestGradeRank} 名`);

    ctx.fillStyle = '#007a47';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText('考试总分概况', PAD + 20, curY + 33);

    ctx.fillStyle = '#262626';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(parts.join('   |   ') || '已录入总分', PAD + 20, curY + 66);

    curY += 108;
  }

  // Section 1: 6-Subject Profile
  ctx.fillStyle = '#262626';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('六门选考成绩画像', PAD, curY + 24);
  ctx.fillStyle = '#8c8c8c';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(report.examCount >= 2 ? '（时间加权均分）' : '（本次成绩）', PAD + 220, curY + 23);
  curY += 44;

  const colGap = 14;
  const cardW = (INNER_W - colGap * 2) / 3;
  const cardH = 122;

  (report.subjectProfiles || []).slice(0, 6).forEach((p, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = PAD + col * (cardW + colGap);
    const y = curY + row * (cardH + colGap);
    const isStrong = p.avgScore !== null && p.avgScore >= 80;

    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.fillStyle = isStrong ? '#effaf5' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isStrong ? '#b7ebcf' : '#eceef2';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#262626';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(p.name, x + 16, y + 32);

    // Trend label
    const trendTxt =
      p.trend === '明显上升' ? '↗上升' : p.trend === '有所下滑' ? '↘下滑' : p.trend === '保持稳定' ? '→稳定' : '';
    if (trendTxt) {
      ctx.font = `600 17px ${FONT}`;
      ctx.fillStyle = p.trend === '明显上升' ? '#008a50' : p.trend === '有所下滑' ? '#cf1322' : '#1677ff';
      const tw = ctx.measureText(trendTxt).width;
      ctx.fillText(trendTxt, x + cardW - 16 - tw, y + 31);
    }

    // Score
    ctx.fillStyle = p.avgScore !== null ? '#007a47' : '#8c8c8c';
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(p.avgScore !== null ? `${p.avgScore} 分` : '未录入', x + 16, y + 76);

    // Trajectory or rank
    let subLine = '';
    if (p.scoreHistory && p.scoreHistory.length >= 2) {
      subLine = `历次 ${p.scoreHistory.map((h) => h.score).join('→')}`;
    } else if (p.latestClassRank !== null) {
      subLine = `班级排名 第${p.latestClassRank}名`;
    } else if (p.latestGradeRank !== null) {
      subLine = `年级排名 第${p.latestGradeRank}名`;
    }
    if (subLine) {
      ctx.fillStyle = '#595959';
      ctx.font = `400 17px ${FONT}`;
      ctx.fillText(subLine, x + 16, y + 106);
    }
  });

  curY += cardH * 2 + colGap + 28;

  // Section 2: Top 3 Recommendations
  ctx.fillStyle = '#262626';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('推荐选科组合（前三名）', PAD, curY + 24);
  curY += 44;

  const rankColors = ['#00b96b', '#1677ff', '#08979c'];
  recs.forEach((rec, i) => {
    const isTop1 = i === 0;
    const boxH = isTop1 ? 156 + top1SummaryLines.length * 30 : 144;

    drawRoundedRect(ctx, PAD, curY, INNER_W, boxH, 14);
    ctx.fillStyle = isTop1 ? '#effaf5' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isTop1 ? '#b7ebcf' : '#eceef2';
    ctx.lineWidth = isTop1 ? 1.5 : 1;
    ctx.stroke();

    // Rank square
    drawRoundedRect(ctx, PAD + 20, curY + 20, 36, 36, 9);
    ctx.fillStyle = rankColors[i] || '#8c8c8c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(String(rec.rank), PAD + 32, curY + 46);

    // Combo name
    ctx.fillStyle = '#262626';
    ctx.font = `700 27px ${FONT}`;
    ctx.fillText(rec.displayName, PAD + 70, curY + 47);

    // Badge pill
    const badgeLabel = isTop1 ? `★ ${rec.badge}` : rec.badge;
    ctx.font = `600 19px ${FONT}`;
    const bw = ctx.measureText(badgeLabel).width + 24;
    drawRoundedRect(ctx, W - PAD - 20 - bw, curY + 21, bw, 34, 8);
    ctx.fillStyle = isTop1 ? '#fffbe6' : '#f0f7ff';
    ctx.fill();
    ctx.strokeStyle = isTop1 ? '#ffe58f' : '#bae0ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isTop1 ? '#ad6800' : '#1677ff';
    ctx.fillText(badgeLabel, W - PAD - 20 - bw + 12, curY + 45);

    // 3 Metric chips
    const chips = [
      { label: '学科实力', val: String(rec.academicScore), color: '#1677ff' },
      { label: '本科可报', val: `${rec.majorStats?.undergradCoveragePct ?? '-'}%`, color: '#007a47' },
      { label: '综合推荐', val: String(rec.compositeScore), color: '#531dab' },
    ];
    const chipGap = 12;
    const chipW = (INNER_W - 40 - chipGap * 2) / 3;
    const chipY = curY + 74;

    chips.forEach((ch, ci) => {
      const cx = PAD + 20 + ci * (chipW + chipGap);
      drawRoundedRect(ctx, cx, chipY, chipW, 50, 9);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#eceef2';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#8c8c8c';
      ctx.font = `400 18px ${FONT}`;
      ctx.fillText(ch.label, cx + 14, chipY + 32);

      ctx.fillStyle = ch.color;
      ctx.font = `700 23px ${FONT}`;
      const vw = ctx.measureText(ch.val).width;
      ctx.fillText(ch.val, cx + chipW - 14 - vw, chipY + 33);
    });

    if (isTop1 && top1SummaryLines.length > 0) {
      ctx.fillStyle = '#595959';
      ctx.font = `400 21px ${FONT}`;
      top1SummaryLines.forEach((line, li) => {
        ctx.fillText(line, PAD + 22, curY + 154 + li * 30);
      });
    }

    curY += boxH + 16;
  });

  // Footer Card with QR Code (left: callout + URL, right: scannable QR code)
  curY += 8;
  const footerCardH = 136;
  drawRoundedRect(ctx, PAD, curY, INNER_W, footerCardH, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#eceef2';
  ctx.lineWidth = 1;
  ctx.stroke();

  const qrSize = 104;
  const qrX = W - PAD - 16 - qrSize;
  const qrY = curY + (footerCardH - qrSize) / 2;

  ctx.fillStyle = '#262626';
  ctx.font = `700 23px ${FONT}`;
  ctx.fillText(`长按识别二维码 · 进入${PROVINCE_CONFIG.name}选科助手`, PAD + 20, curY + 42);

  ctx.fillStyle = '#007a47';
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(`${PROVINCE_CONFIG.siteOrigin}/${PROVINCE_CONFIG.slug}`, PAD + 20, curY + 76);

  ctx.fillStyle = '#8c8c8c';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(`查全部 12 组合对比与 ${posterOfferingsStr} 条高校专业要求`, PAD + 20, curY + 108);

  if (qrImg) {
    drawRoundedRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#eceef2';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  curY += footerCardH + 34;
  const disclaimerTxt = `本报告仅供家庭选科决策参考，最终招生要求以${PROVINCE_CONFIG.authorityName}当年公布为准`;
  ctx.fillStyle = '#8c8c8c';
  ctx.font = `400 17px ${FONT}`;
  const dw = ctx.measureText(disclaimerTxt).width;
  ctx.fillText(disclaimerTxt, (W - dw) / 2, curY);

  return canvas.toDataURL('image/png');
}

let lastPosterDataUrl = '';

async function openShareModal() {
  const dialog = document.getElementById('share-report-dialog');
  if (!dialog || !state.lastReportData) return;

  const imgEl = document.getElementById('share-poster-img');
  const loadingEl = document.getElementById('share-poster-loading');
  const previewEl = document.getElementById('share-link-preview');
  const statusEl = document.getElementById('share-copy-status');

  if (statusEl) statusEl.textContent = '';
  if (previewEl) previewEl.textContent = buildShareLinkBundle();

  // 默认落在「生成报告长图」Tab
  switchShareTab('poster');
  if (imgEl) imgEl.classList.add('hidden');
  if (loadingEl) {
    loadingEl.classList.remove('hidden');
    loadingEl.textContent = '正在生成高清报告长图...';
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  }

  try {
    const dataUrl = await generateSharePosterDataUrl();
    if (dataUrl && imgEl && loadingEl) {
      lastPosterDataUrl = dataUrl;
      imgEl.src = dataUrl;
      loadingEl.classList.add('hidden');
      imgEl.classList.remove('hidden');
    } else if (loadingEl) {
      loadingEl.textContent = '长图生成失败，请切换「复制带成绩链接」分享';
    }
  } catch {
    if (loadingEl) {
      loadingEl.textContent = '长图生成失败，请切换「复制带成绩链接」分享';
    }
  }
}

function switchShareTab(tabName) {
  const posterPanel = document.getElementById('share-panel-poster');
  const linkPanel = document.getElementById('share-panel-link');
  posterPanel?.classList.toggle('hidden', tabName !== 'poster');
  linkPanel?.classList.toggle('hidden', tabName !== 'link');

  document.querySelectorAll('[data-share-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-share-tab') === tabName;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function initShareModal() {
  const dialog = document.getElementById('share-report-dialog');
  const closeBtn = document.getElementById('share-dialog-close');
  const downloadBtn = document.getElementById('btn-download-poster');
  const switchToLinkBtn = document.getElementById('btn-switch-to-link');
  const copyBundleBtn = document.getElementById('btn-copy-share-bundle');
  const statusEl = document.getElementById('share-copy-status');
  if (!dialog) return;

  const close = () => {
    if (dialog.open) dialog.close();
  };
  closeBtn?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  document.querySelectorAll('[data-share-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchShareTab(btn.getAttribute('data-share-tab'));
    });
  });

  switchToLinkBtn?.addEventListener('click', () => switchShareTab('link'));

  downloadBtn?.addEventListener('click', () => {
    if (!lastPosterDataUrl) return;
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent || '');
    if (isWeChat) {
      alert('微信内请直接长按上方图片，选择「发送给朋友」或「保存到手机」');
      return;
    }
    const a = document.createElement('a');
    const namePrefix = state.studentName ? `${state.studentName}-` : '';
    a.download = `${namePrefix}${PROVINCE_CONFIG.name}选科分析报告.png`;
    a.href = lastPosterDataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  copyBundleBtn?.addEventListener('click', async () => {
    const text = buildShareLinkBundle();
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (statusEl) {
      statusEl.textContent = ok
        ? '✓ 已复制！直接去微信粘贴发送给另一半或家人即可'
        : '复制失败，请长按上方文本框手动全选复制';
    }
  });
}

function buildReportTextSummary() {
  const report = state.lastReportData?.report;
  if (!report) return '';
  const titlePrefix = report.studentName ? `${report.studentName} · ` : '';
  const lines = [
    `【${titlePrefix}${PROVINCE_CONFIG.name}选科与就业分析摘要】`,
    `${report.examYear}年高考（${report.gradYear}年本科毕业） · 基于 ${report.examCount} 次考试`,
    '',
    '▶ 推荐选科前三组：',
  ];
  (report.recommendations || []).forEach((rec) => {
    const pct = rec.majorStats?.undergradCoveragePct ?? '-';
    lines.push(
      `${rec.rank}. ${rec.displayName}（${rec.badge}）| 学科实力 ${rec.academicScore} · 本科可报 ${pct}% · 综合 ${rec.compositeScore}`
    );
  });
  lines.push('', `详细白皮书与 ${PROVINCE_CONFIG.offeringsStr} 条专业查询：${PROVINCE_CONFIG.siteOrigin}/${PROVINCE_CONFIG.slug}`);
  return lines.join('\n');
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

let printExpandedDetails = [];

function expandDetailsForPrint() {
  printExpandedDetails = [];
  document.querySelectorAll('details.print-expand-details').forEach((el) => {
    if (!el.open) {
      el.open = true;
      printExpandedDetails.push(el);
    }
  });
}

function restoreDetailsAfterPrint() {
  printExpandedDetails.forEach((el) => {
    el.open = false;
  });
  printExpandedDetails = [];
}

window.addEventListener('beforeprint', expandDetailsForPrint);
window.addEventListener('afterprint', restoreDetailsAfterPrint);

function handleExportPdf() {
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent || '');
  const dialog = document.getElementById('pdf-guide-dialog');
  if (isWeChat && dialog && typeof dialog.showModal === 'function') {
    // 把已填成绩编码进当前网址的 #s= 片段，用户点右上角「在默认浏览器中打开」时成绩自动带过去（不经过服务器）
    if (hasAnyEnteredScore(state.exams)) {
      try {
        history.replaceState(null, '', `#s=${encodeSharePayload()}`);
      } catch {
        // ignore
      }
    }
    const tipEl = document.getElementById('pdf-copy-status');
    if (tipEl) tipEl.textContent = '';
    dialog.showModal();
    return;
  }
  if (typeof window.print === 'function') {
    expandDetailsForPrint();
    window.print();
  }
}

function initPdfGuideModal() {
  const dialog = document.getElementById('pdf-guide-dialog');
  const closeBtn = document.getElementById('pdf-guide-close');
  const copySummaryBtn = document.getElementById('btn-copy-summary');
  const copyLinkBtn = document.getElementById('btn-copy-page-link');
  const tipEl = document.getElementById('pdf-copy-status');
  if (!dialog) return;

  const restoreCleanHash = () => {
    try {
      history.replaceState(null, '', `#${state.activeView || 'report-root'}`);
    } catch {
      // ignore
    }
  };
  const close = () => {
    if (dialog.open) dialog.close();
    restoreCleanHash();
  };
  closeBtn?.addEventListener('click', close);
  dialog.addEventListener('cancel', restoreCleanHash);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  copySummaryBtn?.addEventListener('click', async () => {
    const summary = buildReportTextSummary();
    if (!summary) return;
    const ok = await copyTextToClipboard(summary);
    if (tipEl) {
      tipEl.textContent = ok ? '✓ 已复制选科摘要，可直接粘贴发到微信群或家人' : '复制失败，请手动截屏保存';
    }
  });

  copyLinkBtn?.addEventListener('click', async () => {
    const carryUrl = buildCarryDataUrl();
    const ok = await copyTextToClipboard(carryUrl);
    if (tipEl) {
      tipEl.textContent = ok
        ? '✓ 已复制带成绩的专属链接，粘贴到手机浏览器打开即可直接导出 PDF'
        : '复制失败，请直接点右上角「···」选择在默认浏览器打开';
    }
  });
}

function initMobileSelectSheet() {
  const sheet = document.getElementById('mobile-select-sheet');
  const titleEl = document.getElementById('mobile-select-sheet-title');
  const listEl = document.getElementById('mobile-select-sheet-list');
  const closeBtn = document.getElementById('mobile-select-sheet-close');

  // PC 端美化悬浮下拉面板（> 860px 生效）
  const popover = document.createElement('div');
  popover.id = 'desktop-select-popover';
  popover.className = 'desktop-select-popover hidden';
  popover.setAttribute('role', 'listbox');
  document.body.appendChild(popover);

  let activeSelect = null;
  let activeWrap = null;

  const closeDesktopPopover = () => {
    popover.classList.add('hidden');
    if (activeWrap) activeWrap.classList.remove('is-open');
    activeWrap = null;
    if (!sheet?.open) activeSelect = null;
  };

  const closeSheet = () => {
    if (sheet?.open) sheet.close();
    activeSelect = null;
  };

  closeBtn?.addEventListener('click', closeSheet);
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) closeSheet();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.classList.contains('hidden')) {
      closeDesktopPopover();
    }
  });

  window.addEventListener('resize', closeDesktopPopover);
  window.addEventListener(
    'scroll',
    (e) => {
      if (!popover.classList.contains('hidden') && !popover.contains(e.target)) {
        closeDesktopPopover();
      }
    },
    true
  );

  const openDesktopPopover = (wrap, select) => {
    if (activeWrap === wrap && !popover.classList.contains('hidden')) {
      closeDesktopPopover();
      return;
    }
    closeDesktopPopover();
    activeWrap = wrap;
    activeSelect = select;
    wrap.classList.add('is-open');

    const checkSvg =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    popover.innerHTML = Array.from(select.options)
      .map((opt) => {
        const selected = opt.value === select.value;
        const disabledAttr = opt.disabled ? 'disabled' : '';
        return `
          <button
            type="button"
            class="desktop-select-option ${selected ? 'is-selected' : ''}"
            role="option"
            aria-selected="${selected ? 'true' : 'false'}"
            data-opt-value="${escapeHtml(opt.value)}"
            ${disabledAttr}
          >
            <span>${escapeHtml(opt.textContent)}</span>
            ${selected ? `<span class="desktop-select-check" aria-hidden="true">${checkSvg}</span>` : ''}
          </button>
        `;
      })
      .join('');

    const rect = wrap.getBoundingClientRect();
    const popWidth = Math.max(rect.width, 180);
    popover.style.width = `${popWidth}px`;
    popover.classList.remove('hidden');

    const popHeight = Math.min(popover.scrollHeight, 300);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - popWidth - 8);
    popover.style.left = `${left}px`;
    if (spaceBelow < popHeight && rect.top > spaceBelow) {
      popover.style.top = `${Math.max(8, rect.top - popHeight - 6)}px`;
    } else {
      popover.style.top = `${rect.bottom + 6}px`;
    }

    const selectedBtn = popover.querySelector('.desktop-select-option.is-selected');
    selectedBtn?.scrollIntoView({ block: 'nearest' });
  };

  document.addEventListener('click', (e) => {
    const wrap = e.target.closest('.select-wrap');
    if (!wrap) {
      if (!popover.classList.contains('hidden') && !popover.contains(e.target)) {
        closeDesktopPopover();
      }
      return;
    }
    const select = wrap.querySelector('select');
    if (!select || select.disabled) return;

    e.preventDefault();

    // 移动端（≤860px）使用底部通栏抽屉；PC 端（>860px）使用精致悬浮下拉卡片
    if (!window.matchMedia('(max-width: 860px)').matches) {
      openDesktopPopover(wrap, select);
      return;
    }

    if (!sheet || !titleEl || !listEl || typeof sheet.showModal !== 'function') return;
    activeSelect = select;
    titleEl.textContent = wrap.getAttribute('data-sheet-title') || '请选择';

    listEl.innerHTML = Array.from(select.options)
      .map((opt) => {
        const selected = opt.value === select.value;
        const disabledAttr = opt.disabled ? 'disabled' : '';
        return `
          <button
            type="button"
            class="bottom-sheet-option ${selected ? 'is-selected' : ''}"
            role="option"
            aria-selected="${selected ? 'true' : 'false'}"
            data-opt-value="${escapeHtml(opt.value)}"
            ${disabledAttr}
          >
            <span class="bottom-sheet-option-text">${escapeHtml(opt.textContent)}</span>
            ${selected ? '<span class="bottom-sheet-check" aria-hidden="true">✓</span>' : ''}
          </button>
        `;
      })
      .join('');

    sheet.showModal();
    const selectedBtn = listEl.querySelector('.bottom-sheet-option.is-selected');
    selectedBtn?.scrollIntoView({ block: 'nearest' });
  });

  const applyOptionValue = (nextVal) => {
    if (nextVal !== null && activeSelect && activeSelect.value !== nextVal) {
      activeSelect.value = nextVal;
      activeSelect.dispatchEvent(new Event('input', { bubbles: true }));
      activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  popover.addEventListener('click', (e) => {
    const btn = e.target.closest('.desktop-select-option');
    if (!btn || btn.disabled || !activeSelect) return;
    applyOptionValue(btn.getAttribute('data-opt-value'));
    closeDesktopPopover();
  });

  listEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.bottom-sheet-option');
    if (!btn || btn.disabled || !activeSelect) return;
    applyOptionValue(btn.getAttribute('data-opt-value'));
    closeSheet();
  });
}

initApp();
