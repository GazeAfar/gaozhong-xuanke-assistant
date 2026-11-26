import { CombinationEvaluation, CombinationId } from '../../lib/contracts/index';
import {
  getReportById,
  loadCompareSelection,
  loadReports,
  saveCompareSelection,
} from '../../services/storage';

Page({
  data: {
    reportId: '',
    rankedList: [] as CombinationEvaluation[],
    needsInputList: [] as CombinationEvaluation[],
    excludedList: [] as CombinationEvaluation[],
    compareIds: [] as CombinationId[],
  },

  onLoad(options: Record<string, string>) {
    const reportId = options?.reportId || '';
    const report = reportId ? getReportById(reportId) : loadReports()[0] || null;
    if (!report) return;

    const all = report.resultSnapshot.allCombinations;
    this.setData({
      reportId: report.id,
      rankedList: all.filter((c) => c.state === 'ranked'),
      needsInputList: all.filter((c) => c.state === 'needs_input'),
      excludedList: all.filter((c) => c.state === 'excluded'),
      compareIds: loadCompareSelection(),
    });
  },

  onShow() {
    this.setData({ compareIds: loadCompareSelection() });
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

  onStartCompare() {
    if (this.data.compareIds.length < 2) {
      wx.showToast({ title: '请至少选择 2 个组合', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/compare/index?reportId=${this.data.reportId}` });
  },
});
