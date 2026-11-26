import { SavedReport } from '../../lib/contracts/index';
import {
  clearAllReports,
  deleteReport,
  loadReports,
} from '../../services/storage';

interface RecordItemView {
  id: string;
  timeText: string;
  metaText: string;
  headline: string;
  versionText: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function summarizeReport(r: SavedReport): RecordItemView {
  let headline = '';
  if (r.resultSnapshot.status === 'no_feasible_combination') {
    headline = '当前条件存在冲突，暂无可行组合';
  } else if (r.resultSnapshot.status === 'insufficient_input') {
    headline = '已知科目不足，未生成排序';
  } else {
    const names = r.resultSnapshot.recommendations.map((c) => c.shortName).join(' / ');
    headline = `候选：${names}`;
  }

  return {
    id: r.id,
    timeText: formatTime(r.createdAt),
    metaText: `${r.provinceName} · ${r.examYear ? `${r.examYear} 年高考` : '高考年份待定'}`,
    headline,
    versionText: `算法 v${r.algorithmVersion} · 规则 ${r.provinceRuleVersion}`,
  };
}

Page({
  data: {
    records: [] as RecordItemView[],
  },

  onShow() {
    this.refreshList();
  },

  refreshList() {
    const list = loadReports().map(summarizeReport);
    this.setData({ records: list });
  },

  onOpenReport(e: WechatMiniprogram.TouchEvent) {
    const id = String(e.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/report/index?id=${id}` });
  },

  onDeleteOne(e: WechatMiniprogram.TouchEvent) {
    const id = String(e.currentTarget.dataset.id);
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法在本机恢复。',
      confirmText: '删除',
      confirmColor: '#B42318',
      success: (res) => {
        if (res.confirm) {
          deleteReport(id);
          this.refreshList();
          wx.showToast({ title: '已删除', icon: 'none' });
        }
      },
    });
  },

  onClearAll() {
    wx.showModal({
      title: '清空全部本机记录？',
      content: '这会删除保存在这台设备上的全部历史报告，不影响公共专业资料。',
      confirmText: '清空全部',
      confirmColor: '#B42318',
      success: (res) => {
        if (res.confirm) {
          clearAllReports();
          this.refreshList();
          wx.showToast({ title: '已清空本机记录', icon: 'none' });
        }
      },
    });
  },

  onStartAssessment() {
    wx.navigateTo({ url: '/pages/assessment/index' });
  },

  onGoAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  },
});
