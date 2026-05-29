const { analyzeText, computeHealthScore, extractNutrients, normalizeAllergies, getDetectedModeFromClassName } = require('../utils');

describe('FoodIQ utility functions', () => {
  test('extracts nutrition values from text', () => {
    const text = 'Calories 220, Protein 12 g, Sugar 10g, Total Fat 8 g, Sodium 450 mg';
    expect(extractNutrients(text)).toEqual({
      calories: 220,
      protein: 12,
      sugar: 10,
      fat: 8,
      sodium: 450
    });
  });

  test('computes health score consistently', () => {
    const score = computeHealthScore({ calories: 220, protein: 12, sugar: 8, fat: 6, sodium: 1500 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('analyzes food text with bad and good keywords', () => {
    const result = analyzeText('Contains sugar and protein.', 'food');
    expect(result.score).toBeLessThan(80);
    expect(result.reason).toContain('High sugar content');
  });

  test('analyzes skincare text for ingredients', () => {
    const result = analyzeText('This lotion contains paraben and aloe.', 'skin');
    expect(result.score).toBeLessThan(80);
    expect(result.reason).toContain('paraben may irritate skin');
  });

  test('normalizes allergy input string', () => {
    expect(normalizeAllergies(' dairy, NUTS,  eggs ')).toEqual(['dairy', 'nuts', 'eggs']);
  });

  test('detects skin-care mode from class name', () => {
    expect(getDetectedModeFromClassName('Moisturizing lotion bottle')).toBe('skin');
    expect(getDetectedModeFromClassName('Chocolate bar')).toBe('food');
  });
});
