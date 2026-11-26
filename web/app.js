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

const STORAGE_KEY = 'js_xuanke_web_v1';
const SNAPSHOT_STORAGE_KEY = 'js_xuanke_web_snapshot_v1';
const REPORT_STORAGE_KEY = 'js_xuanke_web_report_v1';
const VIEW_STORAGE_KEY = 'js_xuanke_web_view_v1';
const VALID_VIEWS = new Set(['section-input', 'report-root', 'section-compare', 'major-explorer']);

const state = {
  province: 'JS',
  studentName: '',
  examYear: 2027,
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
    const coreFilled = Object.values(exam.coreSubjects || {}).some((v) => String(v?.score ?? '').trim() !== '');
    const subjFilled = Object.values(exam.subjects || {}).some((v) => String(v?.score ?? '').trim() !== '');
    return coreFilled || subjFilled;
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
      updateSaveStatus(`✓ 已于 ${formatTimeNow()} 暂存当前成绩（点击「填入示例」或「清空」后可随时恢复）`);
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
  state.examYear = Number(snap.examYear) || 2027;
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

async function initApp() {
  loadState();
  renderExams();
  bindEvents();
  updateRestoreButtonVisibility();

  // 初始化院校查询下拉框（即使未生成报告也能随时查院校专业）
  const comboSelect = document.getElementById('major-combo-filter');
  if (comboSelect && comboSelect.options.length === 0) {
    comboSelect.innerHTML = DEFAULT_COMBOS.map(
      (c) => `<option value="${c.id}">${escapeHtml(c.displayName)}</option>`
    ).join('');
    comboSelect.value = 'P_CG';
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
      state.examYear = Number(parsed.examYear) || 2027;
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
              type="number"
              inputmode="decimal"
              min="0"
              max="150"
              step="0.5"
              placeholder="分数 (0-150)"
              value="${escapeHtml(cell.score)}"
              data-exam-idx="${idx}"
              data-core="${c.code}"
              data-field="score"
            />
            <div class="subj-rank-pair">
              <input
                type="number"
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
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.5"
              placeholder="分数 (0-100)"
              value="${escapeHtml(cell.score)}"
              data-exam-idx="${idx}"
              data-subj="${s.code}"
              data-field="score"
            />
            <div class="subj-rank-pair">
              <input
                type="number"
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
        <label class="field">
          <span class="field-label">考试名称</span>
          <input type="text" value="${escapeHtml(exam.name)}" data-exam-idx="${idx}" data-meta="name" placeholder="例如：高一上期中考试" />
        </label>
        <label class="field">
          <span class="field-label">考试类型</span>
          <select data-exam-idx="${idx}" data-meta="type">
            <option value="月考" ${exam.type === '月考' ? 'selected' : ''}>月考</option>
            <option value="期中考试" ${exam.type === '期中考试' ? 'selected' : ''}>期中考试</option>
            <option value="期末考试" ${exam.type === '期末考试' ? 'selected' : ''}>期末考试</option>
            <option value="联考" ${exam.type === '联考' ? 'selected' : ''}>联考</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">班级人数</span>
          <input type="number" min="1" step="1" value="${escapeHtml(exam.classSize ?? '')}" data-exam-idx="${idx}" data-meta="classSize" placeholder="如：47" />
        </label>
        <label class="field">
          <span class="field-label">年级人数</span>
          <input type="number" min="1" step="1" value="${escapeHtml(exam.gradeSize ?? '')}" data-exam-idx="${idx}" data-meta="gradeSize" placeholder="如：600" />
        </label>
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

function renderRankLines(p) {
  const lines = [];
  if (p.avgClassTopPct !== null) {
    lines.push(
      `班级排名：前 <strong>${p.avgClassTopPct}%</strong>${p.latestClassRank !== null ? `（第 ${p.latestClassRank} 名）` : ''}`
    );
  } else if (p.latestClassRank !== null) {
    lines.push(`班级排名：第 <strong>${p.latestClassRank}</strong> 名`);
  }

  if (p.avgGradeTopPct !== null) {
    lines.push(
      `年级排名：前 <strong>${p.avgGradeTopPct}%</strong>${p.latestGradeRank !== null ? `（第 ${p.latestGradeRank} 名）` : ''}`
    );
  } else if (p.latestGradeRank !== null) {
    lines.push(`年级排名：第 <strong>${p.latestGradeRank}</strong> 名`);
  }

  if (lines.length === 0) {
    return '<div class="profile-val">排名：未录入</div>';
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
          ? `<div class="profile-score-big">${p.avgScore} <small>分</small></div>`
          : `<div class="profile-score-big" style="color:var(--muted);">未录入</div>`;
      return `
        <div class="profile-item ${isStrong ? 'profile-item-strong' : ''}">
          <div class="profile-head">
            <span class="profile-subj">${escapeHtml(p.name)}</span>
            ${renderTrendBadge(p.trend)}
          </div>
          ${scoreBlock}
          ${renderRankLines(p)}
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
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <div class="rec-score-box">
                  <span class="metric-chip metric-blue">实力 <strong>${rec.academicScore}</strong></span>
                  <span class="metric-chip metric-green">本科 <strong>${stats.undergradCoveragePct}%</strong></span>
                  <span class="metric-chip metric-purple">综合 <strong>${rec.compositeScore}</strong></span>
                </div>
                <span class="rec-toggle-icon no-print" title="展开/收起" aria-hidden="true">▾</span>
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
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
                <h4 style="margin:0;"><span class="sec-tag sec-tag-green">原因 1</span> 可报考专业</h4>
                <button type="button" class="btn btn-secondary no-print" data-explore-combo="${rec.id}">查具体院校 →</button>
              </div>
              <div class="coverage-row">
                <div class="coverage-stat">
                  <div class="hint">本科可报</div>
                  <div class="coverage-num">${stats.eligibleUndergrad.toLocaleString()} / ${stats.totalUndergrad.toLocaleString()}（${stats.undergradCoveragePct}%）</div>
                  <div class="progress-track"><div class="progress-fill ${stats.undergradCoveragePct >= 80 ? '' : stats.undergradCoveragePct >= 55 ? 'progress-fill-blue' : 'progress-fill-amber'}" style="width:${Math.min(100, stats.undergradCoveragePct)}%"></div></div>
                </div>
                <div class="coverage-stat">
                  <div class="hint">专科可报</div>
                  <div class="coverage-num" style="color:#1d4ed8;">${stats.eligibleVocational.toLocaleString()} / ${stats.totalVocational.toLocaleString()}（${stats.vocationalCoveragePct}%）</div>
                  <div class="progress-track"><div class="progress-fill progress-fill-blue" style="width:${Math.min(100, stats.vocationalCoveragePct)}%"></div></div>
                </div>
              </div>
              <div class="hint" style="margin-bottom:6px;font-weight:600;color:#0f172a;">主要可报大类</div>
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

  const hasCoreData = (report.coreProfiles || []).some((p) => p.hasData);
  const coreSectionHtml = hasCoreData
    ? `
    <section class="card">
      <h3 style="margin:0 0 12px;font-size:17px;">语数外成绩${report.coreTotalAvg !== null ? ` <span class="pill pill-teal" style="margin-left:8px;">总分 ${report.coreTotalAvg} / 450</span>` : ''}</h3>
      <div class="core-profile-grid">
        ${report.coreProfiles
          .map((p) => {
            const scoreBlock =
              p.avgScore !== null
                ? `<div class="profile-score-big" style="color:#0f766e;">${p.avgScore} <small>/ 150</small></div>`
                : `<div class="profile-score-big" style="color:var(--muted);">未录入</div>`;
            return `
              <div class="profile-item profile-item-core">
                <div class="profile-head">
                  <span class="profile-subj">${escapeHtml(p.name)}</span>
                  ${renderTrendBadge(p.trend)}
                </div>
                ${scoreBlock}
                ${renderRankLines(p)}
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

  root.innerHTML = `
    <div class="doc-sheet report-doc">
      <section class="report-header-card">
        <div class="report-header-top">
          <div>
            <h2 class="report-title">${escapeHtml(titlePrefix)}江苏选科与就业白皮书</h2>
            <p class="hint">生成于 ${escapeHtml(generatedTime)} · 基于 ${report.examCount} 次考试记录</p>
          </div>
          <div class="report-header-actions no-print">
            <button type="button" class="btn btn-secondary" id="btn-back-edit">← 修改成绩</button>
            <button type="button" class="btn btn-primary" id="btn-print-inline">导出 PDF</button>
          </div>
        </div>
        <div class="report-meta-tags">
          <span class="pill">江苏 3+1+2</span>
          <span class="pill">${report.examYear} 年高考</span>
          <span class="pill">本科 ${report.gradYear} / 读研 ${report.masterGradYear} 毕业</span>
          <span class="pill pill-success">涵盖 ${datasetStats.offeringsCount.toLocaleString()} 个在苏招生高校专业</span>
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

      ${coreSectionHtml}

      <section class="doc-section">
        <h3 class="doc-h3">六门选考成绩画像</h3>
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
        ${recsHtml}
      </section>
    </div>

    <section id="section-compare" class="doc-sheet compare-sheet">
      <div class="section-header">
        <div>
          <h2>全部 12 种组合横向对比</h2>
          <p class="hint">按学科实力分与在苏招生本科专业覆盖率综合排序</p>
        </div>
        <button type="button" class="btn btn-secondary no-print" id="btn-back-report">← 返回白皮书</button>
      </div>
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
        <div style="margin-top:4px;"><strong>使用提示：</strong>本报告为家庭选科决策参考，不代表高考赋分预测或录取保证；实际招生计划及选考要求以高考当年江苏省教育考试院正式公布为准。</div>
      </div>
    </section>
  `;

  document.getElementById('btn-print-top').disabled = false;

  document.getElementById('btn-print-inline')?.addEventListener('click', () => window.print());
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
    .map((c) => `<option value="${c.id}">${escapeHtml(c.displayName)}（本科 ${c.majorStats.undergradCoveragePct}%）</option>`)
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
    metaEl.textContent = '正在查找在苏招生高校专业...';
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
  btn.textContent = '正在分析成绩、匹配 79,753 条官方专业并生成就业研判...';

  try {
    const res = await fetch('/api/v1/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: state.studentName,
        examYear: state.examYear,
        exams: state.exams,
        aiConfig: state.aiConfig,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      showError(json.error?.message || '生成报告失败，请检查成绩填写');
      return;
    }
    renderReport(json.data);
    switchView('report-root');
  } catch {
    showError('无法连接后端服务，请确认服务已启动');
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
    provinceSelect.value = state.province || 'JS';
    provinceSelect.addEventListener('change', () => {
      state.province = provinceSelect.value || 'JS';
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

    const meta = target.getAttribute('data-meta');
    if (meta) {
      state.exams[idx][meta] = target.value;
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
        state.exams[idx].coreSubjects[coreCode] = { score: '', rank: '' };
      }
      state.exams[idx].coreSubjects[coreCode][field] = target.value;
      saveState();
      return;
    }

    const subj = target.getAttribute('data-subj');
    if (subj && field) {
      if (!state.exams[idx].subjects[subj]) {
        state.exams[idx].subjects[subj] = { score: '', rank: '' };
      }
      state.exams[idx].subjects[subj][field] = target.value;
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
    saveState();
    renderExams();
    updateSaveStatus(`✓ 已删除「${examName}」（删除前已自动暂存，可点「恢复暂存」找回）`);
  });

  document.getElementById('btn-add-exam').addEventListener('click', () => {
    state.exams.push(createEmptyExam(state.exams.length));
    saveState();
    renderExams();
  });

  document.getElementById('btn-restore-snapshot')?.addEventListener('click', restoreSnapshot);

  document.getElementById('btn-fill-sample').addEventListener('click', async () => {
    const hasExistingData = hasAnyEnteredScore(state.exams) || state.studentName.trim() !== '';
    if (hasExistingData) {
      const confirmed = await openConfirmModal({
        title: '填入示例成绩',
        message: '当前表单已有填写的数据，填入示例将覆盖当前内容。覆盖前系统会自动为你暂存，可随时点击「恢复暂存」找回，是否继续？',
        confirmText: '继续填入示例',
        danger: false,
      });
      if (!confirmed) return;
    }
    // 填入示例前自动暂存当前真实成绩，防止误覆盖
    const backedUp = !state.studentName.startsWith('演示同学') && saveSnapshot('auto');
    state.studentName = '演示同学（请替换为真实成绩）';
    nameInput.value = state.studentName;
    state.exams = [
      {
        id: 'sample_1',
        name: '高一上第一次月考',
        type: '月考',
        classSize: '47',
        gradeSize: '600',
        coreSubjects: {
          CHINESE: { score: '112', classRank: '12', gradeRank: '110' },
          MATH: { score: '126', classRank: '6', gradeRank: '58' },
          ENGLISH: { score: '122', classRank: '8', gradeRank: '74' },
        },
        subjects: {
          PHYSICS: { score: '84', classRank: '8', gradeRank: '72' },
          HISTORY: { score: '71', classRank: '26', gradeRank: '290' },
          CHEMISTRY: { score: '86', classRank: '6', gradeRank: '55' },
          BIOLOGY: { score: '79', classRank: '14', gradeRank: '140' },
          POLITICS: { score: '68', classRank: '30', gradeRank: '340' },
          GEOGRAPHY: { score: '82', classRank: '10', gradeRank: '95' },
        },
      },
      {
        id: 'sample_2',
        name: '高一上期末考试',
        type: '期末考试',
        classSize: '47',
        gradeSize: '600',
        coreSubjects: {
          CHINESE: { score: '115', classRank: '10', gradeRank: '96' },
          MATH: { score: '131', classRank: '4', gradeRank: '42' },
          ENGLISH: { score: '125', classRank: '6', gradeRank: '62' },
        },
        subjects: {
          PHYSICS: { score: '88', classRank: '5', gradeRank: '48' },
          HISTORY: { score: '70', classRank: '28', gradeRank: '310' },
          CHEMISTRY: { score: '89', classRank: '4', gradeRank: '40' },
          BIOLOGY: { score: '81', classRank: '12', gradeRank: '125' },
          POLITICS: { score: '67', classRank: '32', gradeRank: '360' },
          GEOGRAPHY: { score: '85', classRank: '8', gradeRank: '75' },
        },
      },
    ];
    saveState();
    renderExams();
    showError('');
    if (backedUp) {
      updateSaveStatus('✓ 已填入示例数据（你原有的成绩已自动暂存，可点右上角「恢复暂存」找回）');
    }
  });

  document.getElementById('btn-clear-all').addEventListener('click', async () => {
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
      updateSaveStatus('✓ 已清空当前表单（原有成绩已自动暂存，可点右上角「恢复暂存」找回）');
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
  document.getElementById('btn-print-top').addEventListener('click', () => window.print());

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
}

initApp();
