import { PublicManifest } from '../../lib/contracts/index';
import { trackEvent } from '../../services/analytics';
import { EXAM_YEAR_OPTIONS, fetchPublicManifest } from '../../services/rules';
import { clearDraft, createEmptyDraft, loadDraft, saveDraft } from '../../services/storage';

Page({
  data: {
    loading: true,
    loadError: false,
    fromCache: false,
    hasDraft: false,
    provinceName: '江苏',
    examYearLabel: '2027 年高考',
    examYearIndex: 0,
    examYearOptions: EXAM_YEAR_OPTIONS,
    ruleVersion: 'JS-2027.1',
    manifest: null as PublicManifest | null,
  },

  onShow() {
    trackEvent('home_view');
    this.refreshState();
  },

  async refreshState() {
    const draft = loadDraft();
    const hasDraft = Boolean(
      draft &&
        (Object.keys(draft.advantage || {}).length > 0 ||
          Object.keys(draft.interest || {}).length > 0 ||
          (draft.preferredMajorIds || []).length > 0)
    );

    if (draft) {
      const idx = EXAM_YEAR_OPTIONS.findIndex((o) => o.value === draft.examYear);
      this.setData({
        hasDraft,
        examYearIndex: idx >= 0 ? idx : 0,
        examYearLabel: idx >= 0 ? EXAM_YEAR_OPTIONS[idx].label : '2027 年高考',
      });
    } else {
      this.setData({ hasDraft: false });
    }

    try {
      const { manifest, fromCache } = await fetchPublicManifest();
      const jsInfo = manifest.supportedProvinces[0];
      this.setData({
        loading: false,
        loadError: false,
        fromCache,
        manifest,
        provinceName: jsInfo ? jsInfo.provinceName : '江苏',
        ruleVersion: jsInfo ? jsInfo.ruleVersion : 'JS-2027.1',
      });
    } catch {
      this.setData({ loading: false, loadError: true });
    }
  },

  onYearChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const chosen = EXAM_YEAR_OPTIONS[idx] || EXAM_YEAR_OPTIONS[0];
    this.setData({
      examYearIndex: idx,
      examYearLabel: chosen.label,
    });
    const draft = loadDraft() || createEmptyDraft('JS', chosen.value);
    draft.examYear = chosen.value;
    saveDraft(draft);
  },

  onStartOrContinue() {
    trackEvent('assessment_start');
    if (!loadDraft()) {
      const chosen = EXAM_YEAR_OPTIONS[this.data.examYearIndex] || EXAM_YEAR_OPTIONS[0];
      saveDraft(createEmptyDraft('JS', chosen.value));
    }
    wx.navigateTo({ url: '/pages/assessment/index' });
  },

  onRestart() {
    wx.showModal({
      title: '重新开始填写？',
      content: '这会清除当前未提交的草稿内容，已保存的历史报告不受影响。',
      confirmText: '重新开始',
      cancelText: '保留草稿',
      success: (res) => {
        if (res.confirm) {
          clearDraft();
          const chosen = EXAM_YEAR_OPTIONS[this.data.examYearIndex] || EXAM_YEAR_OPTIONS[0];
          saveDraft(createEmptyDraft('JS', chosen.value));
          this.setData({ hasDraft: false });
          wx.navigateTo({ url: '/pages/assessment/index' });
        }
      },
    });
  },

  onGoMajors() {
    wx.switchTab({ url: '/pages/majors/index' });
  },

  onGoAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  },

  onShareAppMessage() {
    // 默认仅分享工具首页，不携带任何学生输入或报告标识
    return {
      title: '高中选科助手：选科之前，先比较一下',
      path: '/pages/home/index',
    };
  },
});
