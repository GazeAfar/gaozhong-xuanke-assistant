Component({
  properties: {
    item: { type: Object, value: {} },
    selectedForCompare: { type: Boolean, value: false },
    showCompareButton: { type: Boolean, value: true },
    highlightFirst: { type: Boolean, value: false },
  },

  methods: {
    onToggleCompare() {
      const item = this.data.item as { id?: string } | undefined;
      if (!item || !item.id) return;
      this.triggerEvent('togglecompare', { id: item.id });
    },
  },
});
