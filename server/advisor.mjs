/**
 * 江苏 3+1+2 成绩与排名选科分析引擎 + 79,753 条真实官方库可报专业统计
 */

export const CORE_SUBJECTS = ['CHINESE', 'MATH', 'ENGLISH'];

export const CORE_SUBJECT_LABELS = {
  CHINESE: '语文',
  MATH: '数学',
  ENGLISH: '英语',
};

export const ALL_SUBJECTS = [
  'PHYSICS',
  'HISTORY',
  'CHEMISTRY',
  'BIOLOGY',
  'POLITICS',
  'GEOGRAPHY',
];

export const SUBJECT_LABELS = {
  PHYSICS: '物理',
  HISTORY: '历史',
  CHEMISTRY: '化学',
  BIOLOGY: '生物学',
  POLITICS: '思想政治',
  GEOGRAPHY: '地理',
};

export const COMBINATIONS = [
  { id: 'P_CB', subjects: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'], displayName: '物理 · 化学 · 生物学', shortName: '物化生' },
  { id: 'P_CP', subjects: ['PHYSICS', 'CHEMISTRY', 'POLITICS'], displayName: '物理 · 化学 · 思想政治', shortName: '物化政' },
  { id: 'P_CG', subjects: ['PHYSICS', 'CHEMISTRY', 'GEOGRAPHY'], displayName: '物理 · 化学 · 地理', shortName: '物化地' },
  { id: 'P_BP', subjects: ['PHYSICS', 'BIOLOGY', 'POLITICS'], displayName: '物理 · 生物学 · 思想政治', shortName: '物生政' },
  { id: 'P_BG', subjects: ['PHYSICS', 'BIOLOGY', 'GEOGRAPHY'], displayName: '物理 · 生物学 · 地理', shortName: '物生地' },
  { id: 'P_PG', subjects: ['PHYSICS', 'POLITICS', 'GEOGRAPHY'], displayName: '物理 · 思想政治 · 地理', shortName: '物政地' },
  { id: 'H_CB', subjects: ['HISTORY', 'CHEMISTRY', 'BIOLOGY'], displayName: '历史 · 化学 · 生物学', shortName: '史化生' },
  { id: 'H_CP', subjects: ['HISTORY', 'CHEMISTRY', 'POLITICS'], displayName: '历史 · 化学 · 思想政治', shortName: '史化政' },
  { id: 'H_CG', subjects: ['HISTORY', 'CHEMISTRY', 'GEOGRAPHY'], displayName: '历史 · 化学 · 地理', shortName: '史化地' },
  { id: 'H_BP', subjects: ['HISTORY', 'BIOLOGY', 'POLITICS'], displayName: '历史 · 生物学 · 思想政治', shortName: '史生政' },
  { id: 'H_BG', subjects: ['HISTORY', 'BIOLOGY', 'GEOGRAPHY'], displayName: '历史 · 生物学 · 地理', shortName: '史生地' },
  { id: 'H_PG', subjects: ['HISTORY', 'POLITICS', 'GEOGRAPHY'], displayName: '历史 · 思想政治 · 地理', shortName: '史政地' },
];

// 核心代表性专业方向（用于从 79,753 条官方库中真实统计各方向可报院校条数）
const MAJOR_TRACKS = [
  { key: 'ai_cs', label: '计算机 / 软件 / 人工智能', keywords: ['计算机', '软件工程', '人工智能', '数据科学', '网络空间安全', '大数据'] },
  { key: 'ee_auto', label: '电子信息 / 自动化 / 电气微电子', keywords: ['电子信息', '自动化', '电气工程', '微电子', '集成电路', '通信工程', '机器人'] },
  { key: 'mech_energy', label: '机械 / 新能源 / 材料 / 航空航天', keywords: ['机械', '新能源', '车辆工程', '材料', '航空', '能源与动力', '光电'] },
  { key: 'medicine', label: '临床医学 / 口腔 / 药学与生命科学', keywords: ['临床医学', '口腔医学', '中医学', '药学', '生物医学', '护理学', '预防医学'] },
  { key: 'econ_fin', label: '金融 / 经济 / 会计与管理', keywords: ['金融', '经济学', '会计', '财务管理', '工商管理', '国际经济与贸易', '审计'] },
  { key: 'law_pol', label: '法学 / 公共管理 / 政治与公安', keywords: ['法学', '知识产权', '公共管理', '行政管理', '政治学', '公安', '外交'] },
  { key: 'edu_lit', label: '汉语言 / 外语 / 教育与新闻传播', keywords: ['汉语言', '英语', '新闻', '传播', '教育学', '心理学', '历史学', '师范'] },
  { key: 'geo_env', label: '地理科学 / 测绘 / 环境与城乡规划', keywords: ['地理', '测绘', '城乡规划', '环境工程', '生态', '建筑学'] },
];

function matchOfferingForSubjects(subjectSet, offering) {
  if (!offering || offering.reviewStatus !== 'approved') return 'unknown';
  const { firstSubject, requirementTree } = offering;
  if (!requirementTree || firstSubject === 'UNKNOWN' || requirementTree.type === 'UNKNOWN') {
    return 'unknown';
  }
  if (firstSubject === 'PHYSICS' && !subjectSet.has('PHYSICS')) return 'ineligible';
  if (firstSubject === 'HISTORY' && !subjectSet.has('HISTORY')) return 'ineligible';
  if (requirementTree.type === 'NONE') return 'eligible';
  if (requirementTree.type === 'ALL') {
    return requirementTree.subjects.every((s) => subjectSet.has(s)) ? 'eligible' : 'ineligible';
  }
  if (requirementTree.type === 'ANY') {
    return requirementTree.subjects.some((s) => subjectSet.has(s)) ? 'eligible' : 'ineligible';
  }
  return 'unknown';
}

/**
 * 预计算 12 种组合在江苏 2027 官方全量库（79,753 条）上的真实可报覆盖统计。
 * 启动时计算一次并缓存（耗时 < 150ms），后续请求 0ms 读取。
 */
export function buildCombinationMajorStats(allOfferings) {
  const result = {};
  let totalAll = 0;
  let totalUndergrad = 0;
  let totalVocational = 0;

  for (const off of allOfferings) {
    totalAll += 1;
    if (off.level === '本科') totalUndergrad += 1;
    else totalVocational += 1;
  }

  for (const combo of COMBINATIONS) {
    const subjectSet = new Set(combo.subjects);
    let eligibleAll = 0;
    let eligibleUndergrad = 0;
    let eligibleVocational = 0;

    const trackCounts = MAJOR_TRACKS.map((t) => ({
      key: t.key,
      label: t.label,
      eligibleUndergrad: 0,
      totalUndergrad: 0,
      sampleMajors: new Set(),
    }));

    for (const off of allOfferings) {
      const isUndergrad = off.level === '本科';
      const st = matchOfferingForSubjects(subjectSet, off);
      const isEligible = st === 'eligible';

      if (isEligible) {
        eligibleAll += 1;
        if (isUndergrad) eligibleUndergrad += 1;
        else eligibleVocational += 1;
      }

      if (isUndergrad) {
        for (let i = 0; i < MAJOR_TRACKS.length; i += 1) {
          const track = MAJOR_TRACKS[i];
          if (track.keywords.some((kw) => off.majorName.includes(kw))) {
            trackCounts[i].totalUndergrad += 1;
            if (isEligible) {
              trackCounts[i].eligibleUndergrad += 1;
              if (trackCounts[i].sampleMajors.size < 6) {
                trackCounts[i].sampleMajors.add(off.majorName);
              }
            }
            break;
          }
        }
      }
    }

    const tracks = trackCounts.map((tc) => ({
      key: tc.key,
      label: tc.label,
      eligibleUndergrad: tc.eligibleUndergrad,
      totalUndergrad: tc.totalUndergrad,
      coveragePct:
        tc.totalUndergrad > 0
          ? Math.round((tc.eligibleUndergrad / tc.totalUndergrad) * 1000) / 10
          : 0,
      sampleMajors: Array.from(tc.sampleMajors),
    }));

    const strongTracks = tracks
      .filter((t) => t.coveragePct >= 65)
      .sort((a, b) => b.eligibleUndergrad - a.eligibleUndergrad);
    const restrictedTracks = tracks
      .filter((t) => t.coveragePct < 50 && t.totalUndergrad > 0)
      .sort((a, b) => a.coveragePct - b.coveragePct);

    result[combo.id] = {
      combinationId: combo.id,
      displayName: combo.displayName,
      shortName: combo.shortName,
      totalAll,
      totalUndergrad,
      totalVocational,
      eligibleAll,
      eligibleUndergrad,
      eligibleVocational,
      allCoveragePct: totalAll > 0 ? Math.round((eligibleAll / totalAll) * 1000) / 10 : 0,
      undergradCoveragePct:
        totalUndergrad > 0 ? Math.round((eligibleUndergrad / totalUndergrad) * 1000) / 10 : 0,
      vocationalCoveragePct:
        totalVocational > 0 ? Math.round((eligibleVocational / totalVocational) * 1000) / 10 : 0,
      tracks,
      strongTracks,
      restrictedTracks,
    };
  }

  return result;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * 根据孩子多次月考/期中/期末成绩与排名，计算六科画像与 12 组合选科建议。
 */
export function evaluateExamsForJiangsu(payload, comboMajorStats) {
  const examYear = Number(payload.examYear) || 2029;
  const gradYear = examYear + 4;
  const studentName = String(payload.studentName || '').trim().slice(0, 20);
  const exams = Array.isArray(payload.exams) ? payload.exams : [];

  if (exams.length === 0) {
    throw new Error('请至少录入一次月考或期末考试成绩');
  }

  // 1. 聚合语数外三大统考主科（满分 150 分），严格区分班级排名与年级排名
  const coreProfiles = CORE_SUBJECTS.map((code) => {
    const scorePoints = [];
    const classPctPoints = [];
    const gradePctPoints = [];
    const classRankPoints = [];
    const gradeRankPoints = [];

    exams.forEach((ex, idx) => {
      const rec = ex?.coreSubjects?.[code];
      if (!rec) return;
      const weight = 1 + idx * 0.15;
      const classSize = Number(ex.classSize) > 0 ? Number(ex.classSize) : null;
      const gradeSize =
        Number(ex.gradeSize) > 0
          ? Number(ex.gradeSize)
          : Number(ex.totalStudents) > 0
          ? Number(ex.totalStudents)
          : null;
      const fullScore = Number(rec.fullScore) > 0 ? Number(rec.fullScore) : 150;

      if (rec.score !== '' && rec.score !== null && rec.score !== undefined && !Number.isNaN(Number(rec.score))) {
        const s = Number(rec.score);
        if (s >= 0 && s <= fullScore) {
          scorePoints.push({ raw: s, norm100: (s / fullScore) * 100, weight, examIndex: idx + 1 });
        }
      }

      const rawClassRank = rec.classRank;
      if (rawClassRank !== '' && rawClassRank !== null && rawClassRank !== undefined && !Number.isNaN(Number(rawClassRank))) {
        const r = Number(rawClassRank);
        if (r >= 1) {
          const topPct = classSize && r <= classSize ? round1((r / classSize) * 100) : null;
          classRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
          if (classSize && r <= classSize) {
            classPctPoints.push({ topPct: (r / classSize) * 100, weight });
          }
        }
      }

      const rawGradeRank = rec.gradeRank !== undefined && rec.gradeRank !== '' ? rec.gradeRank : rec.rank;
      if (rawGradeRank !== '' && rawGradeRank !== null && rawGradeRank !== undefined && !Number.isNaN(Number(rawGradeRank))) {
        const r = Number(rawGradeRank);
        if (r >= 1) {
          const topPct = gradeSize && r <= gradeSize ? round1((r / gradeSize) * 100) : null;
          gradeRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
          if (gradeSize && r <= gradeSize) {
            gradePctPoints.push({ topPct: (r / gradeSize) * 100, weight });
          }
        }
      }
    });

    let avgScore = null;
    let latestScore = null;
    let trend = '数据不足';
    if (scorePoints.length > 0) {
      const wSum = scorePoints.reduce((a, p) => a + p.weight, 0);
      avgScore = round1(scorePoints.reduce((a, p) => a + p.raw * p.weight, 0) / wSum);
      latestScore = round1(scorePoints[scorePoints.length - 1].raw);
      if (scorePoints.length >= 2) {
        const delta = scorePoints[scorePoints.length - 1].raw - scorePoints[0].raw;
        if (delta >= 6) trend = '明显上升';
        else if (delta <= -6) trend = '有所下滑';
        else trend = '保持稳定';
      } else {
        trend = '单次参考';
      }
    }

    const avgClassTopPct =
      classPctPoints.length > 0
        ? round1(
            classPctPoints.reduce((a, p) => a + p.topPct * p.weight, 0) /
              classPctPoints.reduce((a, p) => a + p.weight, 0)
          )
        : null;

    const avgGradeTopPct =
      gradePctPoints.length > 0
        ? round1(
            gradePctPoints.reduce((a, p) => a + p.topPct * p.weight, 0) /
              gradePctPoints.reduce((a, p) => a + p.weight, 0)
          )
        : null;

    const latestClassPoint = classRankPoints.length > 0 ? classRankPoints[classRankPoints.length - 1] : null;
    const latestGradePoint = gradeRankPoints.length > 0 ? gradeRankPoints[gradeRankPoints.length - 1] : null;

    return {
      code,
      name: CORE_SUBJECT_LABELS[code],
      fullScore: 150,
      avgScore,
      latestScore,
      scoreHistory: scorePoints.map((p) => ({ examIndex: p.examIndex, score: p.raw })),
      classRankCount: classRankPoints.length,
      gradeRankCount: gradeRankPoints.length,
      latestClassRank: latestClassPoint ? latestClassPoint.rank : null,
      latestClassRankExamIndex: latestClassPoint ? latestClassPoint.examIndex : null,
      latestClassTopPct: latestClassPoint ? latestClassPoint.topPct : null,
      latestGradeRank: latestGradePoint ? latestGradePoint.rank : null,
      latestGradeRankExamIndex: latestGradePoint ? latestGradePoint.examIndex : null,
      latestGradeTopPct: latestGradePoint ? latestGradePoint.topPct : null,
      latestRank: latestGradePoint ? latestGradePoint.rank : latestClassPoint ? latestClassPoint.rank : null,
      avgClassTopPct,
      avgGradeTopPct,
      avgTopPct: avgGradeTopPct ?? avgClassTopPct,
      trend,
      hasData: scorePoints.length > 0 || classRankPoints.length > 0 || gradeRankPoints.length > 0,
    };
  });

  const coreInsights = [];
  const mathP = coreProfiles.find((p) => p.code === 'MATH');
  const engP = coreProfiles.find((p) => p.code === 'ENGLISH');
  const chnP = coreProfiles.find((p) => p.code === 'CHINESE');

  if (mathP?.avgScore !== null && mathP.avgScore >= 112) {
    coreInsights.push(
      `数学基础扎实（加权均分 ${mathP.avgScore}/150），对选择「物理」及未来大学理工、计算机、人工智能、量化金融等强数理专业有明显支撑。`
    );
  } else if (mathP?.avgScore !== null && mathP.avgScore < 95) {
    coreInsights.push(
      `数学目前尚有提升空间（加权均分 ${mathP.avgScore}/150），如选偏重计算推导的物理+化学路线，建议同步夯实高中数学基础。`
    );
  }

  if (engP?.avgScore !== null && engP.avgScore >= 115) {
    coreInsights.push(
      `英语优势突出（加权均分 ${engP.avgScore}/150${engP.latestRank ? `，单科第 ${engP.latestRank} 名` : ''}），无论走理工科（AI前沿/国际工程）还是经管法学（企业出海/涉外法治/中外合作项目）都是重要加分项。`
    );
  }

  if (chnP?.avgScore !== null && chnP.trend === '明显上升') {
    coreInsights.push(
      `语文进步明显（最新 ${chnP.latestScore}/150），阅读与文字表达能力提升有助于历史、政治或综合材料题的作答。`
    );
  } else if (chnP?.avgScore !== null && chnP.avgScore >= 112) {
    coreInsights.push(
      `语文功底稳健（加权均分 ${chnP.avgScore}/150），对人文社科、法学及公共管理类专业的长期学习较有优势。`
    );
  }

  const coreTotalAvg = coreProfiles.every((p) => p.avgScore !== null)
    ? round1(coreProfiles.reduce((s, p) => s + p.avgScore, 0))
    : null;

  // 1.5 聚合每次考试的总分与总分班级/年级排名（可选录入）
  const totalScorePoints = [];
  const totalClassRankPoints = [];
  const totalClassPctPoints = [];
  const totalGradeRankPoints = [];
  const totalGradePctPoints = [];

  exams.forEach((ex, idx) => {
    const weight = 1 + idx * 0.15;
    const classSize = Number(ex.classSize) > 0 ? Number(ex.classSize) : null;
    const gradeSize =
      Number(ex.gradeSize) > 0
        ? Number(ex.gradeSize)
        : Number(ex.totalStudents) > 0
        ? Number(ex.totalStudents)
        : null;

    if (
      ex.totalScore !== '' &&
      ex.totalScore !== null &&
      ex.totalScore !== undefined &&
      !Number.isNaN(Number(ex.totalScore))
    ) {
      const ts = Number(ex.totalScore);
      if (ts >= 0 && ts <= 1500) {
        totalScorePoints.push({ raw: ts, weight, examIndex: idx + 1, examName: ex.name || `第${idx + 1}次考试` });
      }
    }

    if (
      ex.totalClassRank !== '' &&
      ex.totalClassRank !== null &&
      ex.totalClassRank !== undefined &&
      !Number.isNaN(Number(ex.totalClassRank))
    ) {
      const r = Number(ex.totalClassRank);
      if (r >= 1) {
        const topPct = classSize && r <= classSize ? round1((r / classSize) * 100) : null;
        totalClassRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
        if (classSize && r <= classSize) {
          totalClassPctPoints.push({ topPct: (r / classSize) * 100, weight });
        }
      }
    }

    if (
      ex.totalGradeRank !== '' &&
      ex.totalGradeRank !== null &&
      ex.totalGradeRank !== undefined &&
      !Number.isNaN(Number(ex.totalGradeRank))
    ) {
      const r = Number(ex.totalGradeRank);
      if (r >= 1) {
        const topPct = gradeSize && r <= gradeSize ? round1((r / gradeSize) * 100) : null;
        totalGradeRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
        if (gradeSize && r <= gradeSize) {
          totalGradePctPoints.push({ topPct: (r / gradeSize) * 100, weight });
        }
      }
    }
  });

  let totalAvgScore = null;
  let totalLatestScore = null;
  let totalTrend = '数据不足';
  if (totalScorePoints.length > 0) {
    const wSum = totalScorePoints.reduce((a, p) => a + p.weight, 0);
    totalAvgScore = round1(totalScorePoints.reduce((a, p) => a + p.raw * p.weight, 0) / wSum);
    totalLatestScore = round1(totalScorePoints[totalScorePoints.length - 1].raw);
    if (totalScorePoints.length >= 2) {
      const delta = totalScorePoints[totalScorePoints.length - 1].raw - totalScorePoints[0].raw;
      if (delta >= 15) totalTrend = '明显上升';
      else if (delta <= -15) totalTrend = '有所下滑';
      else totalTrend = '保持稳定';
    } else {
      totalTrend = '单次参考';
    }
  }

  const latestTotalClassPoint =
    totalClassRankPoints.length > 0 ? totalClassRankPoints[totalClassRankPoints.length - 1] : null;
  const latestTotalGradePoint =
    totalGradeRankPoints.length > 0 ? totalGradeRankPoints[totalGradeRankPoints.length - 1] : null;

  const examTotalProfile = {
    hasData:
      totalScorePoints.length > 0 ||
      totalClassRankPoints.length > 0 ||
      totalGradeRankPoints.length > 0,
    avgScore: totalAvgScore,
    latestScore: totalLatestScore,
    scoreHistory: totalScorePoints.map((p) => ({ examIndex: p.examIndex, score: p.raw })),
    classRankCount: totalClassRankPoints.length,
    gradeRankCount: totalGradeRankPoints.length,
    latestClassRank: latestTotalClassPoint ? latestTotalClassPoint.rank : null,
    latestClassRankExamIndex: latestTotalClassPoint ? latestTotalClassPoint.examIndex : null,
    latestClassTopPct: latestTotalClassPoint ? latestTotalClassPoint.topPct : null,
    latestGradeRank: latestTotalGradePoint ? latestTotalGradePoint.rank : null,
    latestGradeRankExamIndex: latestTotalGradePoint ? latestTotalGradePoint.examIndex : null,
    latestGradeTopPct: latestTotalGradePoint ? latestTotalGradePoint.topPct : null,
    avgClassTopPct:
      totalClassPctPoints.length > 0
        ? round1(
            totalClassPctPoints.reduce((a, p) => a + p.topPct * p.weight, 0) /
              totalClassPctPoints.reduce((a, p) => a + p.weight, 0)
          )
        : null,
    avgGradeTopPct:
      totalGradePctPoints.length > 0
        ? round1(
            totalGradePctPoints.reduce((a, p) => a + p.topPct * p.weight, 0) /
              totalGradePctPoints.reduce((a, p) => a + p.weight, 0)
          )
        : null,
    trend: totalTrend,
  };

  // 2. 逐科聚合多次考试六门选考科目数据（越近的考试权重略高：1.0 -> 1.15 -> 1.3）
  const subjectProfiles = {};
  const knownSubjects = [];

  for (const subj of ALL_SUBJECTS) {
    const scorePoints = [];
    const classPctPoints = [];
    const gradePctPoints = [];
    const classRankPoints = [];
    const gradeRankPoints = [];

    exams.forEach((ex, idx) => {
      const rec = ex?.subjects?.[subj];
      if (!rec) return;
      const weight = 1 + idx * 0.15;
      const classSize = Number(ex.classSize) > 0 ? Number(ex.classSize) : null;
      const gradeSize =
        Number(ex.gradeSize) > 0
          ? Number(ex.gradeSize)
          : Number(ex.totalStudents) > 0
          ? Number(ex.totalStudents)
          : null;
      const fullScore = Number(rec.fullScore) > 0 ? Number(rec.fullScore) : 100;

      if (rec.score !== '' && rec.score !== null && rec.score !== undefined && !Number.isNaN(Number(rec.score))) {
        const s = Number(rec.score);
        if (s >= 0 && s <= fullScore) {
          scorePoints.push({ raw: s, norm100: (s / fullScore) * 100, weight, examIndex: idx + 1, examName: ex.name || `第${idx + 1}次考试` });
        }
      }

      const rawClassRank = rec.classRank;
      if (rawClassRank !== '' && rawClassRank !== null && rawClassRank !== undefined && !Number.isNaN(Number(rawClassRank))) {
        const r = Number(rawClassRank);
        if (r >= 1) {
          const topPct = classSize && r <= classSize ? round1((r / classSize) * 100) : null;
          classRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
          if (classSize && r <= classSize) {
            const pctScore = Math.max(0, Math.min(100, (1 - (r - 1) / classSize) * 100));
            classPctPoints.push({ topPct: (r / classSize) * 100, pctScore, weight });
          }
        }
      }

      const rawGradeRank = rec.gradeRank !== undefined && rec.gradeRank !== '' ? rec.gradeRank : rec.rank;
      if (rawGradeRank !== '' && rawGradeRank !== null && rawGradeRank !== undefined && !Number.isNaN(Number(rawGradeRank))) {
        const r = Number(rawGradeRank);
        if (r >= 1) {
          const topPct = gradeSize && r <= gradeSize ? round1((r / gradeSize) * 100) : null;
          gradeRankPoints.push({ rank: r, weight, examIndex: idx + 1, topPct });
          if (gradeSize && r <= gradeSize) {
            const pctScore = Math.max(0, Math.min(100, (1 - (r - 1) / gradeSize) * 100));
            gradePctPoints.push({ topPct: (r / gradeSize) * 100, pctScore, weight });
          }
        }
      }
    });

    const hasData = scorePoints.length > 0 || classPctPoints.length > 0 || gradePctPoints.length > 0;
    if (hasData) knownSubjects.push(subj);

    let avgScore = null;
    let latestScore = null;
    let trend = '数据不足';
    let trendDelta = 0;
    let stdDev = null;

    if (scorePoints.length > 0) {
      const wSum = scorePoints.reduce((acc, p) => acc + p.weight, 0);
      avgScore = round1(scorePoints.reduce((acc, p) => acc + p.norm100 * p.weight, 0) / wSum);
      latestScore = round1(scorePoints[scorePoints.length - 1].norm100);

      if (scorePoints.length >= 2) {
        trendDelta = round1(scorePoints[scorePoints.length - 1].norm100 - scorePoints[0].norm100);
        if (trendDelta >= 4) trend = '明显上升';
        else if (trendDelta <= -4) trend = '有所下滑';
        else trend = '保持稳定';

        const mean = scorePoints.reduce((a, b) => a + b.norm100, 0) / scorePoints.length;
        const variance =
          scorePoints.reduce((a, b) => a + (b.norm100 - mean) ** 2, 0) / scorePoints.length;
        stdDev = round1(Math.sqrt(variance));
      } else {
        trend = '单次参考';
      }
    }

    let avgClassTopPct = null;
    let avgClassRankScore = null;
    if (classPctPoints.length > 0) {
      const wSum = classPctPoints.reduce((acc, p) => acc + p.weight, 0);
      avgClassTopPct = round1(classPctPoints.reduce((acc, p) => acc + p.topPct * p.weight, 0) / wSum);
      avgClassRankScore = round1(classPctPoints.reduce((acc, p) => acc + p.pctScore * p.weight, 0) / wSum);
    }

    let avgGradeTopPct = null;
    let avgGradeRankScore = null;
    if (gradePctPoints.length > 0) {
      const wSum = gradePctPoints.reduce((acc, p) => acc + p.weight, 0);
      avgGradeTopPct = round1(gradePctPoints.reduce((acc, p) => acc + p.topPct * p.weight, 0) / wSum);
      avgGradeRankScore = round1(gradePctPoints.reduce((acc, p) => acc + p.pctScore * p.weight, 0) / wSum);
    }

    const latestClassPoint = classRankPoints.length > 0 ? classRankPoints[classRankPoints.length - 1] : null;
    const latestGradePoint = gradeRankPoints.length > 0 ? gradeRankPoints[gradeRankPoints.length - 1] : null;
    const latestClassRank = latestClassPoint ? latestClassPoint.rank : null;
    const latestGradeRank = latestGradePoint ? latestGradePoint.rank : null;

    // 优先使用年级百分位（最贴近全省赋分），无年排时使用班级百分位
    const effectiveRankScore = avgGradeRankScore ?? avgClassRankScore;

    let strengthIndex = null;
    if (effectiveRankScore !== null && avgScore !== null) {
      strengthIndex = round1(0.6 * effectiveRankScore + 0.4 * avgScore);
    } else if (effectiveRankScore !== null) {
      strengthIndex = effectiveRankScore;
    } else if (avgScore !== null) {
      strengthIndex = avgScore;
    }

    if (strengthIndex !== null) {
      if (trend === '明显上升') strengthIndex = round1(Math.min(100, strengthIndex + 1.5));
      else if (trend === '有所下滑') strengthIndex = round1(Math.max(0, strengthIndex - 1.5));
    }

    subjectProfiles[subj] = {
      code: subj,
      name: SUBJECT_LABELS[subj],
      examCount: Math.max(scorePoints.length, classRankPoints.length, gradeRankPoints.length),
      avgScore,
      latestScore,
      scoreHistory: scorePoints.map((p) => ({ examIndex: p.examIndex, score: p.raw })),
      classRankCount: classRankPoints.length,
      gradeRankCount: gradeRankPoints.length,
      latestClassRank,
      latestClassRankExamIndex: latestClassPoint ? latestClassPoint.examIndex : null,
      latestClassTopPct: latestClassPoint ? latestClassPoint.topPct : null,
      latestGradeRank,
      latestGradeRankExamIndex: latestGradePoint ? latestGradePoint.examIndex : null,
      latestGradeTopPct: latestGradePoint ? latestGradePoint.topPct : null,
      latestRank: latestGradeRank ?? latestClassRank,
      avgClassTopPct,
      avgGradeTopPct,
      avgTopPct: avgGradeTopPct ?? avgClassTopPct,
      trend,
      trendDelta,
      stdDev,
      strengthIndex,
      hasData,
    };
  }

  if (knownSubjects.length < 3) {
    throw new Error('至少需要录入 3 门及以上选考科目的成绩或排名才能生成选科建议');
  }

  // 评估全部 12 种江苏 3+1+2 组合
  const evaluated = COMBINATIONS.map((combo) => {
    const profiles = combo.subjects.map((s) => subjectProfiles[s]);
    const missing = profiles.filter((p) => !p.hasData).map((p) => p.name);
    const majorStats = comboMajorStats[combo.id];

    let academicScore = null;
    if (missing.length === 0) {
      academicScore = round1(
        profiles.reduce((sum, p) => sum + (p.strengthIndex ?? 0), 0) / 3
      );
    }

    // 综合推荐分：80% 学科成绩与排名实力 + 20% 江苏官方本科专业覆盖度（避免纯看专业覆盖压过孩子真实短板，同时兼顾报考面）
    let compositeScore = null;
    if (academicScore !== null) {
      const coverageBonus = majorStats ? majorStats.undergradCoveragePct : 50;
      compositeScore = round1(0.8 * academicScore + 0.2 * coverageBonus);
    }

    const scoreReasons = [];
    for (const p of profiles) {
      if (!p.hasData) continue;
      const parts = [];
      if (p.avgScore !== null) {
        if (p.scoreHistory && p.scoreHistory.length >= 2) {
          parts.push(`加权均分 ${p.avgScore}（历次 ${p.scoreHistory.map((h) => h.score).join(' → ')}）`);
        } else {
          parts.push(`成绩 ${p.avgScore}`);
        }
      }
      if (p.gradeRankCount >= 2 && p.avgGradeTopPct !== null) {
        parts.push(`年排均位前 ${p.avgGradeTopPct}%（最近第 ${p.latestGradeRank} 名）`);
      } else if (p.latestGradeRank !== null) {
        const suffix = exams.length > 1 && p.gradeRankCount < exams.length ? `，仅第 ${p.latestGradeRankExamIndex} 次录入` : '';
        parts.push(`年排第 ${p.latestGradeRank} 名${p.latestGradeTopPct !== null ? `（前 ${p.latestGradeTopPct}%${suffix}）` : suffix ? `（${suffix.slice(1)}）` : ''}`);
      }
      if (p.classRankCount >= 2 && p.avgClassTopPct !== null) {
        parts.push(`班排均位前 ${p.avgClassTopPct}%（最近第 ${p.latestClassRank} 名）`);
      } else if (p.latestClassRank !== null) {
        const suffix = exams.length > 1 && p.classRankCount < exams.length ? `，仅第 ${p.latestClassRankExamIndex} 次录入` : '';
        parts.push(`班排第 ${p.latestClassRank} 名${p.latestClassTopPct !== null ? `（前 ${p.latestClassTopPct}%${suffix}）` : suffix ? `（${suffix.slice(1)}）` : ''}`);
      }
      if (p.trend && p.trend !== '单次参考' && p.trend !== '数据不足') parts.push(p.trend);
      scoreReasons.push(`${p.name}：${parts.join('，')}`);
    }

    return {
      id: combo.id,
      subjects: combo.subjects,
      displayName: combo.displayName,
      shortName: combo.shortName,
      missingSubjects: missing,
      academicScore,
      compositeScore,
      scoreReasons,
      majorStats,
    };
  });

  const ranked = evaluated
    .filter((c) => c.compositeScore !== null)
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

  const incomplete = evaluated.filter((c) => c.compositeScore === null);

  // 为前 3 名打上清晰标签
  const recommendations = ranked.slice(0, 3).map((item, idx) => {
    let badge = idx === 0 ? '首选建议' : idx === 1 ? '重点备选' : '均衡备选';
    if (idx > 0 && Math.abs((ranked[0].compositeScore ?? 0) - (item.compositeScore ?? 0)) <= 2) {
      badge = '与首选非常接近';
    }
    return { ...item, rank: idx + 1, badge };
  });

  const warnings = [];
  if (examYear !== 2027) {
    warnings.push(
      `目标为 ${examYear} 年江苏高考，当前专业选科覆盖统计参考江苏省教育考试院 2027 年官方汇总表（79,753 条），最终以 ${examYear} 年当年公布为准。`
    );
  }
  const hasGradeRank = ALL_SUBJECTS.some((s) => subjectProfiles[s].avgGradeTopPct !== null);
  const hasClassRank = ALL_SUBJECTS.some((s) => subjectProfiles[s].avgClassTopPct !== null);
  if (!hasGradeRank && !hasClassRank) {
    warnings.push(
      '本次尚未录入「班级/年级人数 + 对应排名」，系统仅按原始分估算；由于江苏再选科目采用等级赋分，建议后续补充班排或年排以获得更贴近赋分规则的判断。'
    );
  } else if (!hasGradeRank && hasClassRank) {
    warnings.push(
      '当前按「班级人数 + 班排」换算百分位，已比纯原始分更准确；如果学校后续公布「年级人数 + 年排」，补充进来会更贴近全省等级赋分。'
    );
  }

  return {
    province: '江苏省',
    mode: '3+1+2',
    examYear,
    gradYear,
    masterGradYear: examYear + 7,
    studentName,
    examCount: exams.length,
    generatedAt: new Date().toISOString(),
    coreProfiles,
    coreTotalAvg,
    coreInsights,
    examTotalProfile,
    subjectProfiles: ALL_SUBJECTS.map((s) => subjectProfiles[s]),
    recommendations,
    allCombinations: [...ranked, ...incomplete],
    warnings,
  };
}
