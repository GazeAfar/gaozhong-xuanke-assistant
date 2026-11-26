Component({
  properties: {
    source: { type: Object, value: {} },
  },

  methods: {
    onCopyUrl() {
      const source = this.data.source as { url?: string } | undefined;
      if (!source || !source.url) return;
      wx.setClipboardData({
        data: source.url,
        success() {
          wx.showToast({ title: '已复制原文链接', icon: 'none' });
        },
      });
    },
  },
});
