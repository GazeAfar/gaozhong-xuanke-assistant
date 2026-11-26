Component({
  properties: {
    subjectCode: { type: String, value: '' },
    subjectName: { type: String, value: '' },
    mode: { type: String, value: 'advantage' }, // 'advantage' | 'interest'
    value: { type: null, value: undefined }, // 1..5 | null (不了解) | undefined (未答)
    hasError: { type: Boolean, value: false },
  },

  data: {
    options: [
      { score: 1, label: '比较吃力' },
      { score: 2, label: '稍有困难' },
      { score: 3, label: '一般' },
      { score: 4, label: '比较擅长' },
      { score: 5, label: '很有优势' },
    ],
  },

  observers: {
    mode(mode: string) {
      if (mode === 'interest') {
        this.setData({
          options: [
            { score: 1, label: '很不喜欢' },
            { score: 2, label: '不太喜欢' },
            { score: 3, label: '一般' },
            { score: 4, label: '比较喜欢' },
            { score: 5, label: '很喜欢' },
          ],
        });
      } else {
        this.setData({
          options: [
            { score: 1, label: '比较吃力' },
            { score: 2, label: '稍有困难' },
            { score: 3, label: '一般' },
            { score: 4, label: '比较擅长' },
            { score: 5, label: '很有优势' },
          ],
        });
      }
    },
  },

  methods: {
    onSelectScore(e: WechatMiniprogram.TouchEvent) {
      const score = Number(e.currentTarget.dataset.score);
      const nextValue = this.data.value === score ? undefined : score;
      this.triggerEvent('change', {
        subjectCode: this.data.subjectCode,
        value: nextValue,
      });
    },

    onSelectUnknown() {
      const nextValue = this.data.value === null ? undefined : null;
      this.triggerEvent('change', {
        subjectCode: this.data.subjectCode,
        value: nextValue,
      });
    },
  },
});
