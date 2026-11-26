import { SourceRecord } from '../../lib/contracts/index';
import { submitFeedback } from '../../services/majors';
import { getSources } from '../../services/rules';
import {
  clearAllReports,
  clearDraft,
  loadSettings,
  saveSettings,
} from '../../services/storage';

const FEEDBACK_CATEGORIES: Array<{
  value: 'data_error' | 'flow_issue' | 'readability' | 'other';
  label: string;
}> = [
  { value: 'data_error', label: '专业或规则资料有误' },
  { value: 'flow_issue', label: '操作流程遇到问题' },
  { value: 'readability', label: '文字或界面不够清晰' },
  { value: 'other', label: '其他建议' },
];

Page({
  data: {
    sources: [] as SourceRecord[],
    analyticsOptIn: false,
    categories: FEEDBACK_CATEGORIES,
    categoryIndex: 0,
    message: '',
    offeringId: '',
    datasetVersion: '',
    submitting: false,
  },

  onLoad(options: Record<string, string>) {
    const settings = loadSettings();
    this.setData({
      sources: getSources(),
      analyticsOptIn: settings.analyticsOptIn,
      offeringId: options?.offeringId || '',
      datasetVersion: options?.datasetVersion || '',
    });

    if (options?.focus === 'feedback') {
      setTimeout(() => {
        wx.pageScrollTo({ selector: '#feedback-section', duration: 200 });
      }, 150);
    }
  },

  onToggleAnalytics(e: WechatMiniprogram.SwitchChange) {
    const enabled = Boolean(e.detail.value);
    saveSettings({ schemaVersion: 1, analyticsOptIn: enabled });
    this.setData({ analyticsOptIn: enabled });
  },

  onClearLocalData() {
    wx.showModal({
      title: '清除全部本机数据？',
      content: '这会清除本机草稿和全部历史报告，无法恢复。',
      confirmText: '确认清除',
      confirmColor: '#B42318',
      success: (res) => {
        if (res.confirm) {
          clearDraft();
          clearAllReports();
          wx.showToast({ title: '已清除本机数据', icon: 'none' });
        }
      },
    });
  },

  onCategoryChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onMessageInput(e: WechatMiniprogram.Input) {
    this.setData({ message: e.detail.value || '' });
  },

  async onSubmitFeedback() {
    if (this.data.submitting) return;
    const category = FEEDBACK_CATEGORIES[this.data.categoryIndex].value;
    this.setData({ submitting: true });

    const res = await submitFeedback({
      category,
      message: this.data.message,
      offeringId: this.data.offeringId || null,
      datasetVersion: this.data.datasetVersion || null,
    });

    this.setData({ submitting: false });
    if (!res.ok) {
      wx.showToast({ title: res.errorMessage || '提交失败，请检查内容', icon: 'none' });
      return;
    }

    this.setData({ message: '' });
    wx.showToast({ title: '已收到反馈，感谢帮助改进', icon: 'none' });
  },
});
