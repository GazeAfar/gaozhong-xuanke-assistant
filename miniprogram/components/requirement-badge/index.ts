Component({
  properties: {
    status: { type: String, value: 'unknown' }, // 'eligible' | 'ineligible' | 'unknown'
    referenceYear: { type: Number, value: 0 },
  },
});
