import {
  ALL_SUBJECTS,
  CombinationId,
  DraftState,
  RatingValue,
  SUBJECT_LABELS,
  SavedReport,
  SelectionInput,
  SubjectCode,
  SubjectRatingMap,
} from '../../lib/contracts/index';
import {
  DEFAULT_ALGORITHM_VERSION,
  evaluateSelection,
  generateCombinations,
} from '../../lib/rules-engine/index';
import { COMMON_MAJOR_OPTIONS, matchMajorsForCombinations } from '../../services/majors';
import {
  BUILTIN_JS_RULE,
  EXAM_YEAR_OPTIONS,
  PROVINCE_OPTIONS,
  fetchProvinceRule,
} from '../../services/rules';
import {
  createEmptyDraft,
  generateLocalId,
  loadAssessmentScroll,
  loadDraft,
  saveAssessmentScroll,
  saveDraft,
  saveReport,
} from '../../services/storage';

const SUBJECT_LIST = ALL_SUBJECTS.map((code) => ({
  code,
  name: SUBJECT_LABELS[code],
}));

Page({
  data: {
    subjectList: SUBJECT_LIST,
    provinceOptions: PROVINCE_OPTIONS,
    provinceIndex: 0,
    provinceSupported: true,
    examYearOptions: EXAM_YEAR_OPTIONS,
    examYearIndex: 0,
    needsReferenceChoice: false,
    useReferenceData: false,

    advantage: {} as Record<string, RatingValue | null | undefined>,
    answeredAdvantageCount: 0,
    errorSubject: '' as string,

    interestEnabled: false,
    interest: {} as Record<string, RatingValue | null | undefined>,

    majorCatalog: COMMON_MAJOR_OPTIONS,
    noMajorDirection: true,
    preferredMajorIds: [] as string[],
    preserveMajors: false,

    schoolSectionOpen: false,
    schoolRestrictionEnabled: false,
    allCombinations: generateCombinations(BUILTIN_JS_RULE),
    allowedCombinationIds: [] as CombinationId[],

    submitting: false,
  },

  onLoad() {
    const draft = loadDraft() || createEmptyDraft('JS', 2027);
    this.applyDraftToState(draft);

    const savedScroll = loadAssessmentScroll();
    if (savedScroll > 0) {
      setTimeout(() => {
        wx.pageScrollTo({ scrollTop: savedScroll, duration: 0 });
      }, 80);
    }
  },

  onPageScroll(e: { scrollTop: number }) {
    saveAssessmentScroll(e.scrollTop);
  },

  applyDraftToState(draft: DraftState) {
    const pIdx = Math.max(0, PROVINCE_OPTIONS.findIndex((p) => p.code === draft.provinceCode));
    const yIdx = Math.max(0, EXAM_YEAR_OPTIONS.findIndex((y) => y.value === draft.examYear));
    const chosenYear = EXAM_YEAR_OPTIONS[yIdx].value;
    const needsReferenceChoice = chosenYear !== 2027 && chosenYear !== null;

    const answeredAdvantageCount = ALL_SUBJECTS.filter(
      (s) => draft.advantage && s in draft.advantage && draft.advantage[s] !== undefined
    ).length;

    const allComboIds = this.data.allCombinations.map((c) => c.id);
    const allowed =
      draft.schoolRestrictionEnabled && draft.allowedCombinationIds.length > 0
        ? draft.allowedCombinationIds
        : allComboIds;

    this.setData({
      provinceIndex: pIdx,
      provinceSupported: PROVINCE_OPTIONS[pIdx].supported,
      examYearIndex: yIdx,
      needsReferenceChoice,
      useReferenceData: Boolean(draft.useReferenceData),
      advantage: { ...(draft.advantage || {}) },
      answeredAdvantageCount,
      interestEnabled: Boolean(draft.interestEnabled),
      interest: { ...(draft.interest || {}) },
      noMajorDirection: draft.noMajorDirection !== false,
      preferredMajorIds: [...(draft.preferredMajorIds || [])],
      preserveMajors: Boolean(draft.preserveMajors),
      schoolRestrictionEnabled: Boolean(draft.schoolRestrictionEnabled),
      allowedCombinationIds: allowed,
    });
  },

  persistDraft() {
    const province = PROVINCE_OPTIONS[this.data.provinceIndex] || PROVINCE_OPTIONS[0];
    const yearOpt = EXAM_YEAR_OPTIONS[this.data.examYearIndex] || EXAM_YEAR_OPTIONS[0];
    const preferredMajorNames: Record<string, string> = {};
    for (const id of this.data.preferredMajorIds) {
      const found = COMMON_MAJOR_OPTIONS.find((m) => m.id === id);
      if (found) preferredMajorNames[id] = found.name;
    }

    const draft: DraftState = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      provinceCode: province.code,
      examYear: yearOpt.value,
      useReferenceData: this.data.useReferenceData,
      advantage: this.data.advantage as DraftState['advantage'],
      interestEnabled: this.data.interestEnabled,
      interest: this.data.interest as DraftState['interest'],
      noMajorDirection: this.data.noMajorDirection,
      preferredMajorIds: this.data.preferredMajorIds,
      preferredMajorNames,
      preserveMajors: this.data.preserveMajors,
      schoolRestrictionEnabled: this.data.schoolRestrictionEnabled,
      allowedCombinationIds: this.data.allowedCombinationIds,
    };

    const ok = saveDraft(draft);
    if (!ok) {
      wx.showToast({ title: '草稿暂未保存到本机，但不影响本次测算', icon: 'none' });
    }
  },

  onProvinceChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const province = PROVINCE_OPTIONS[idx] || PROVINCE_OPTIONS[0];
    this.setData(
      {
        provinceIndex: idx,
        provinceSupported: province.supported,
      },
      () => this.persistDraft()
    );
  },

  onYearChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value);
    const chosenYear = EXAM_YEAR_OPTIONS[idx].value;
    const needsReferenceChoice = chosenYear !== 2027 && chosenYear !== null;
    this.setData(
      {
        examYearIndex: idx,
        needsReferenceChoice,
        useReferenceData: chosenYear === 2027 ? true : this.data.useReferenceData,
      },
      () => this.persistDraft()
    );
  },

  onToggleReferenceData(e: WechatMiniprogram.TouchEvent) {
    const useRef = e.currentTarget.dataset.use === 'true';
    this.setData({ useReferenceData: useRef }, () => this.persistDraft());
  },

  onAdvantageChange(e: WechatMiniprogram.CustomEvent<{ subjectCode: SubjectCode; value: RatingValue | null | undefined }>) {
    const { subjectCode, value } = e.detail;
    const next = { ...this.data.advantage };
    if (value === undefined) {
      delete next[subjectCode];
    } else {
      next[subjectCode] = value;
    }
    const answeredAdvantageCount = ALL_SUBJECTS.filter(
      (s) => s in next && next[s] !== undefined
    ).length;

    this.setData(
      {
        advantage: next,
        answeredAdvantageCount,
        errorSubject: this.data.errorSubject === subjectCode ? '' : this.data.errorSubject,
      },
      () => this.persistDraft()
    );
  },

  onToggleInterestSection() {
    const nextEnabled = !this.data.interestEnabled;
    this.setData(
      {
        interestEnabled: nextEnabled,
        interest: nextEnabled ? this.data.interest : {},
      },
      () => this.persistDraft()
    );
  },

  onInterestChange(e: WechatMiniprogram.CustomEvent<{ subjectCode: SubjectCode; value: RatingValue | null | undefined }>) {
    const { subjectCode, value } = e.detail;
    const next = { ...this.data.interest };
    if (value === undefined) {
      delete next[subjectCode];
    } else {
      next[subjectCode] = value;
    }
    this.setData({ interest: next }, () => this.persistDraft());
  },

  onSelectNoMajor() {
    this.setData(
      {
        noMajorDirection: true,
        preferredMajorIds: [],
        preserveMajors: false,
      },
      () => this.persistDraft()
    );
  },

  onToggleMajor(e: WechatMiniprogram.TouchEvent) {
    const id = String(e.currentTarget.dataset.id);
    const current = [...this.data.preferredMajorIds];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 3) {
        wx.showToast({ title: '最多选择 3 个意向专业', icon: 'none' });
        return;
      }
      current.push(id);
    }
    this.setData(
      {
        noMajorDirection: current.length === 0,
        preferredMajorIds: current,
        preserveMajors: current.length === 0 ? false : this.data.preserveMajors,
      },
      () => this.persistDraft()
    );
  },

  onTogglePreserveMajors(e: WechatMiniprogram.SwitchChange) {
    this.setData({ preserveMajors: Boolean(e.detail.value) }, () => this.persistDraft());
  },

  onToggleSchoolSection() {
    this.setData({ schoolSectionOpen: !this.data.schoolSectionOpen });
  },

  onToggleSchoolRestriction(e: WechatMiniprogram.SwitchChange) {
    const enabled = Boolean(e.detail.value);
    const allIds = this.data.allCombinations.map((c) => c.id);
    this.setData(
      {
        schoolRestrictionEnabled: enabled,
        allowedCombinationIds: enabled && this.data.allowedCombinationIds.length === 0 ? allIds : this.data.allowedCombinationIds,
      },
      () => this.persistDraft()
    );
  },

  onToggleAllowedCombo(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as CombinationId;
    const current = [...this.data.allowedCombinationIds];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    this.setData({ allowedCombinationIds: current }, () => this.persistDraft());
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  onGoAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    if (!this.data.provinceSupported) {
      wx.showToast({ title: '该地区还在准备中', icon: 'none' });
      return;
    }

    // 检查六科优势是否全部明确作答（含「还不了解」）
    const firstMissing = ALL_SUBJECTS.find(
      (s) => !(s in this.data.advantage) || this.data.advantage[s] === undefined
    );
    if (firstMissing) {
      this.setData({ errorSubject: firstMissing });
      wx.showToast({ title: '还有科目没选，补充后就能比较', icon: 'none' });
      wx.pageScrollTo({ selector: `#subject-${firstMissing}`, duration: 200 });
      return;
    }

    this.setData({ submitting: true });

    try {
      const province = PROVINCE_OPTIONS[this.data.provinceIndex];
      const examYear = EXAM_YEAR_OPTIONS[this.data.examYearIndex].value;
      const rule = await fetchProvinceRule(province.code);
      if (!rule) {
        wx.showToast({ title: '暂不支持该地区规则', icon: 'none' });
        this.setData({ submitting: false });
        return;
      }

      const advantageMap = {} as SubjectRatingMap;
      for (const s of ALL_SUBJECTS) {
        advantageMap[s] = (this.data.advantage[s] ?? null) as RatingValue | null;
      }

      let interestMap: SubjectRatingMap | null = null;
      if (this.data.interestEnabled) {
        const hasAnyInterest = ALL_SUBJECTS.some(
          (s) => this.data.interest[s] !== undefined && this.data.interest[s] !== null
        );
        if (hasAnyInterest) {
          interestMap = {} as SubjectRatingMap;
          for (const s of ALL_SUBJECTS) {
            interestMap[s] = (this.data.interest[s] ?? null) as RatingValue | null;
          }
        }
      }

      const preferredMajorIds = this.data.noMajorDirection ? [] : this.data.preferredMajorIds;
      const preferredMajorNames: Record<string, string> = {};
      for (const id of preferredMajorIds) {
        const found = COMMON_MAJOR_OPTIONS.find((m) => m.id === id);
        if (found) preferredMajorNames[id] = found.name;
      }

      // 只有在目标年为 2027 或用户显式选择查看参考资料时，才附带专业匹配摘要
      const shouldQueryMajors =
        preferredMajorIds.length > 0 &&
        (examYear === 2027 || (examYear !== null && this.data.useReferenceData));

      const majorMatchSummary = shouldQueryMajors
        ? await matchMajorsForCombinations({
            provinceCode: province.code,
            examYear,
            majorIds: preferredMajorIds,
          })
        : null;

      const input: SelectionInput = {
        provinceCode: province.code,
        examYear,
        advantage: advantageMap,
        interest: interestMap,
        preferredMajorIds,
        preferredMajorNames,
        preserveMajors: this.data.preserveMajors,
        allowedCombinationIds: this.data.schoolRestrictionEnabled
          ? this.data.allowedCombinationIds
          : null,
        useReferenceData: this.data.useReferenceData,
      };

      const result = evaluateSelection(input, {
        algorithmVersion: DEFAULT_ALGORITHM_VERSION,
        provinceRule: rule,
        majorMatchSummary,
      });

      const report: SavedReport = {
        schemaVersion: 1,
        id: generateLocalId(),
        createdAt: new Date().toISOString(),
        provinceName: rule.provinceName,
        inputSnapshot: input,
        resultSnapshot: result,
        algorithmVersion: result.versions.algorithmVersion,
        provinceRuleVersion: result.versions.provinceRuleVersion,
        datasetVersion: result.versions.datasetVersion,
        examYear: result.versions.examYear,
        referenceYear: result.versions.referenceYear,
      };

      const saveRes = saveReport(report);
      if (!saveRes.saved) {
        wx.showToast({ title: '本机空间不足，本次结果未写入记录', icon: 'none' });
      } else if (saveRes.trimmedOldest) {
        wx.showToast({ title: '已达 20 份上限，已自动移除最早一份记录', icon: 'none' });
      }

      wx.navigateTo({
        url: `/pages/report/index?id=${report.id}`,
        complete: () => {
          this.setData({ submitting: false });
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '计算失败，请检查填写内容';
      wx.showToast({ title: msg, icon: 'none' });
      this.setData({ submitting: false });
    }
  },
});
