import { CombinationId } from '../../lib/contracts/index';
import { generateCombinations } from '../../lib/rules-engine/index';
import { trackEvent } from '../../services/analytics';
import { SearchOfferingItem, searchOfferings } from '../../services/majors';
import { BUILTIN_JS_RULE, OFFICIAL_JS_QUERY_URL } from '../../services/rules';
import { loadReports } from '../../services/storage';

interface ComboOption {
  id: CombinationId | '';
  label: string;
}

const COMBO_OPTIONS: ComboOption[] = [
  { id: '', label: '不限组合（查看全部要求）' },
  ...generateCombinations(BUILTIN_JS_RULE).map((c) => ({
    id: c.id,
    label: c.displayName,
  })),
];

Page({
  data: {
    query: '',
    comboOptions: COMBO_OPTIONS,
    comboIndex: 0,
    items: [] as SearchOfferingItem[],
    nextCursor: null as string | null,
    loading: false,
    loadingMore: false,
    available: true,
    unavailableMessage: '',
    officialPortalUrl: OFFICIAL_JS_QUERY_URL,
    datasetVersion: '' as string,
    dataYear: 2027 as number | null,
    scopeNote: '',
  },

  debounceTimer: 0 as number,
  requestSeq: 0 as number,

  onLoad() {
    const reports = loadReports();
    const topRec = reports[0]?.resultSnapshot?.recommendations?.[0];
    if (topRec) {
      const idx = COMBO_OPTIONS.findIndex((c) => c.id === topRec.id);
      if (idx > 0) {
        this.setData({ comboIndex: idx });
      }
    }
    this.runSearch('', false);
  },

  onInput(e: WechatMiniprogram.Input) {
    const val = e.detail.value || '';
    this.setData({ query: val });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (!val.trim()) {
      this.runSearch('', false);
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.runSearch(val, false);
    }, 300) as unknown as number;
  },

  onClearQuery() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.setData({ query: '' });
    this.runSearch('', false);
  },

  onComboChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    this.setData({ comboIndex: idx });
    this.runSearch(this.data.query, false);
  },

  onRetry() {
    this.runSearch(this.data.query, false);
  },

  onLoadMore() {
    if (!this.data.nextCursor || this.data.loadingMore) return;
    this.runSearch(this.data.query, true);
  },

  onCopyOfficialUrl() {
    wx.setClipboardData({
      data: this.data.officialPortalUrl,
      success() {
        wx.showToast({ title: '已复制江苏省教育考试院官方查询网址', icon: 'none' });
      },
    });
  },

  async runSearch(q: string, append: boolean) {
    const seq = ++this.requestSeq;
    this.setData(append ? { loadingMore: true } : { loading: true });

    if (q.trim() && !append) {
      trackEvent('major_search');
    }

    const selected = COMBO_OPTIONS[this.data.comboIndex];
    const combinationId = selected?.id ? (selected.id as CombinationId) : null;

    const res = await searchOfferings({
      provinceCode: 'JS',
      q,
      combinationId,
      cursor: append ? this.data.nextCursor : null,
      pageSize: 20,
    });

    if (seq !== this.requestSeq) return;

    if (!res.available) {
      this.setData({
        available: false,
        unavailableMessage: res.unavailableMessage || '当前暂无法查询在线专业库',
        officialPortalUrl: res.officialPortalUrl,
        items: append ? this.data.items : [],
        nextCursor: null,
        loading: false,
        loadingMore: false,
      });
      return;
    }

    this.setData({
      available: true,
      unavailableMessage: '',
      items: append ? [...this.data.items, ...res.items] : res.items,
      nextCursor: res.nextCursor,
      datasetVersion: res.scope.datasetVersion || '',
      dataYear: res.scope.dataYear,
      scopeNote: res.scope.scopeNote,
      loading: false,
      loadingMore: false,
    });
  },

  onOpenDetail(e: WechatMiniprogram.TouchEvent) {
    const id = String(e.currentTarget.dataset.id);
    const selected = COMBO_OPTIONS[this.data.comboIndex];
    const cid = selected?.id || '';
    wx.navigateTo({
      url: `/pages/major-detail/index?id=${id}&datasetVersion=${this.data.datasetVersion}&combinationId=${cid}`,
    });
  },
});
