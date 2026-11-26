import {
  ADVANTAGE_LABELS,
  CombinationEvaluation,
  CombinationId,
  INTEREST_LABELS,
  RatingValue,
  SUBJECT_LABELS,
  SavedReport,
} from '../../lib/contracts/index';
import { trackEvent } from '../../services/analytics';
import {
  getReportById,
  loadCompareSelection,
  loadReports,
  saveCompareSelection,
} from '../../services/storage';

interface CompareCardView {
  id: CombinationId;
  displayName: string;
  label: string;
  advantageLines: string[];
  interestLines: string[];
  majorLines: string[];
  attentionText: string;
  completenessText: string;
}

Page({
  data: {
    reportId: '',
    cards: [] as CompareCardView[],
  },

  onLoad(options: Record<string, string>) {
    trackEvent('compare_open');
    this.setData({ reportId: options?.reportId || '' });
  },

  onShow() {
    this.buildCompareView();
  },

  buildCompareView() {
    const report: SavedReport | null = this.data.reportId
      ? getReportById(this.data.reportId)
      : loadReports()[0] || null;
    const selectedIds = loadCompareSelection();

    if (!report || selectedIds.length === 0) {
      this.setData({ cards: [] });
      return;
    }

    const evalMap = new Map<CombinationId, CombinationEvaluation>(
      report.resultSnapshot.allCombinations.map((c) => [c.id, c])
    );

    const cards: CompareCardView[] = [];
    for (const cid of selectedIds) {
      const ev = evalMap.get(cid);
      if (!ev) continue;

      const advantageLines = ev.subjects.map((s) => {
        const v = report.inputSnapshot.advantage[s];
        const text = v === null ? '未提供（还不了解）' : ADVANTAGE_LABELS[v as RatingValue];
        return `${SUBJECT_LABELS[s]}：${text}`;
      });

      const interestLines = ev.subjects.map((s) => {
        const v = report.inputSnapshot.interest ? report.inputSnapshot.interest[s] : null;
        const text = v === null ? '未提供' : INTEREST_LABELS[v as RatingValue];
        return `${SUBJECT_LABELS[s]}：${text}`;
      });

      const majorLines =
        ev.majorStatuses.length > 0
          ? ev.majorStatuses.map((m) => `${m.majorName}：${m.summaryText}`)
          : ['当前无可核实数据'];

      const completenessText =
        ev.missingSubjects.length > 0
          ? `待补充：${ev.missingSubjects.map((s) => SUBJECT_LABELS[s]).join('、')}`
          : '三科优势信息完整';

      cards.push({
        id: ev.id,
        displayName: ev.displayName,
        label: ev.label,
        advantageLines,
        interestLines,
        majorLines,
        attentionText: ev.attentionNote || '暂无额外冲突提醒，建议结合学校开班和孩子意愿讨论',
        completenessText,
      });
    }

    this.setData({ cards });
  },

  onRemoveCombo(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as CombinationId;
    const next = loadCompareSelection().filter((x) => x !== id);
    saveCompareSelection(next);
    this.buildCompareView();
  },

  onChangeSelection() {
    wx.navigateTo({ url: `/pages/combinations/index?reportId=${this.data.reportId}` });
  },
});
