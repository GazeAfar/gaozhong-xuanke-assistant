import {
  ADVANTAGE_LABELS,
  ALL_SUBJECTS,
  CombinationId,
  RatingValue,
  SUBJECT_LABELS,
  SavedReport,
} from '../../lib/contracts/index';
import { DEFAULT_ALGORITHM_VERSION } from '../../lib/rules-engine/index';
import { trackEvent } from '../../services/analytics';
import { BUILTIN_JS_RULE } from '../../services/rules';
import {
  getReportById,
  loadCompareSelection,
  loadReports,
  saveCompareSelection,
} from '../../services/storage';

Page({
  data: {
    report: null as SavedReport | null,
    notFound: false,
    showExtraTied: false,
    showInputSnapshot: false,
    isOutdatedVersion: false,
    compareIds: [] as CombinationId[],
    inputSummaryRows: [] as Array<{ name: string; advText: string }>,
    unknownSubjectNames: [] as string[],
  },

  onLoad(options: Record<string, string>) {
    trackEvent('report_open');
    const id = options?.id;
    const report = id ? getReportById(id) : loadReports()[0] || null;

    if (!report) {
      this.setData({ notFound: true });
      return;
    }

    const inputSummaryRows = ALL_SUBJECTS.map((s) => {
      const v = report.inputSnapshot.advantage[s];
      return {
        name: SUBJECT_LABELS[s],
        advText: v === null ? '还不了解' : ADVANTAGE_LABELS[v as RatingValue],
      };
    });

    const unknownSubjectNames = (
      report.resultSnapshot.inputCompleteness.unknownAdvantageSubjects || []
    ).map((s) => SUBJECT_LABELS[s]);

    const isOutdatedVersion =
      report.algorithmVersion !== DEFAULT_ALGORITHM_VERSION ||
      report.provinceRuleVersion !== BUILTIN_JS_RULE.version;

    // 默认预选前两组进入比较栏，方便一键对比
    const defaultCompare = report.resultSnapshot.recommendations
      .slice(0, 2)
      .map((r) => r.id);
    const savedCompare = loadCompareSelection();
    const compareIds = savedCompare.length > 0 ? savedCompare : defaultCompare;
    saveCompareSelection(compareIds);

    this.setData({
      report,
      notFound: false,
      isOutdatedVersion,
      compareIds,
      inputSummaryRows,
      unknownSubjectNames,
    });
  },

  onShow() {
    this.setData({ compareIds: loadCompareSelection() });
  },

  onToggleExtraTied() {
    this.setData({ showExtraTied: !this.data.showExtraTied });
  },

  onToggleInputSnapshot() {
    this.setData({ showInputSnapshot: !this.data.showInputSnapshot });
  },

  onToggleCompare(e: WechatMiniprogram.CustomEvent<{ id: CombinationId }>) {
    const id = e.detail.id;
    const current = [...this.data.compareIds];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 3) {
        wx.showToast({ title: '一次最多比较 3 组，先移除一组', icon: 'none' });
        return;
      }
      current.push(id);
    }
    saveCompareSelection(current);
    this.setData({ compareIds: current });
  },

  onGoCompare() {
    if (this.data.compareIds.length < 2) {
      wx.showToast({ title: '请先选择 2 至 3 个组合进行比较', icon: 'none' });
      return;
    }
    const reportId = this.data.report?.id || '';
    wx.navigateTo({ url: `/pages/compare/index?reportId=${reportId}` });
  },

  onGoAllCombinations() {
    const reportId = this.data.report?.id || '';
    wx.navigateTo({ url: `/pages/combinations/index?reportId=${reportId}` });
  },

  onAdjustInput() {
    wx.navigateTo({ url: '/pages/assessment/index' });
  },

  onGoAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  },

  onShareAppMessage() {
    // 默认仅分享工具首页，不泄露学生输入与报告标识
    return {
      title: '高中选科助手：选科之前，先比较一下',
      path: '/pages/home/index',
    };
  },
});
