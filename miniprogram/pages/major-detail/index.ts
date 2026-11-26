import {
  CombinationId,
  DatasetMeta,
  MatchStatus,
  OfferingRecord,
  SourceRecord,
} from '../../lib/contracts/index';
import { generateCombinations } from '../../lib/rules-engine/index';
import { getOfferingDetail } from '../../services/majors';
import { BUILTIN_JS_RULE } from '../../services/rules';

Page({
  data: {
    notFound: false,
    offering: null as OfferingRecord | null,
    dataset: null as DatasetMeta | null,
    sources: [] as SourceRecord[],
    firstSubjectText: '',
    reselectText: '',
    matchStatus: null as MatchStatus | null,
    combinationName: '',
  },

  async onLoad(options: Record<string, string>) {
    const id = options?.id || '';
    const datasetVersion = options?.datasetVersion || '';
    const combinationId = (options?.combinationId || '') as CombinationId | '';

    const detail = await getOfferingDetail(id, datasetVersion, combinationId || null);
    if (!detail) {
      this.setData({ notFound: true });
      return;
    }

    const combo = combinationId
      ? generateCombinations(BUILTIN_JS_RULE).find((c) => c.id === combinationId)
      : null;

    this.setData({
      notFound: false,
      offering: detail.offering,
      dataset: detail.dataset,
      sources: detail.sources,
      firstSubjectText: detail.description.firstSubjectText,
      reselectText: detail.description.reselectText,
      matchStatus: detail.matchStatus,
      combinationName: combo ? combo.displayName : '',
    });
  },

  onGoFeedback() {
    const oid = this.data.offering?.id || '';
    const dver = this.data.dataset?.version || '';
    wx.navigateTo({
      url: `/pages/about/index?focus=feedback&offeringId=${oid}&datasetVersion=${dver}`,
    });
  },

  onBack() {
    wx.navigateBack();
  },
});
