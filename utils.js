const foodKeywords = ["sugar", "fat", "sodium", "salt", "calorie", "protein"];
const badFood = ["sugar", "fat", "sodium", "salt"];
const goodFood = ["protein", "fiber", "vitamin", "calcium"];
const skincareBad = ["paraben", "sulfate", "alcohol", "fragrance", "silicone"];
const skincareGood = ["vitamin e", "aloe", "niacinamide", "ceramide", "hyaluronic", "shea butter"];

function normalizeAllergies(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function extractNutrients(text) {
  const lower = String(text).toLowerCase();
  const maybe = (pattern) => {
    const match = lower.match(pattern);
    return match ? parseFloat(match[1]) : null;
  };

  return {
    protein: maybe(/protein[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/),
    sugar: maybe(/sugar[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/),
    fat: maybe(/(?:total\s*)?fat[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/),
    sodium: maybe(/sodium[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*mg/),
    calories: maybe(/calories[^0-9]*?([0-9]+)/)
  };
}

function computeHealthScore(nutrients) {
  let score = 50;
  if (nutrients.protein >= 10) score += 15;
  else if (nutrients.protein >= 5) score += 8;
  else if (nutrients.protein != null) score -= 5;

  if (nutrients.sugar > 30) score -= 30;
  else if (nutrients.sugar > 20) score -= 18;
  else if (nutrients.sugar > 10) score -= 6;
  else if (nutrients.sugar != null) score += 4;

  if (nutrients.fat > 25) score -= 20;
  else if (nutrients.fat > 15) score -= 12;
  else if (nutrients.fat != null) score += 3;

  if (nutrients.sodium > 3000) score -= 18;
  else if (nutrients.sodium > 2000) score -= 10;
  else if (nutrients.sodium != null) score += 2;

  if (nutrients.calories > 600) score -= 10;
  else if (nutrients.calories < 80) score -= 4;
  else if (nutrients.calories != null) score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function analyzeText(extractedText, category) {
  const text = String(extractedText).toLowerCase();
  let healthScore = 80;
  let reason = "Looks balanced.";
  const warnings = [];

  if (category === 'food') {
    badFood.forEach((item) => {
      if (text.includes(item)) {
        warnings.push(`High ${item} content`);
        healthScore -= 15;
      }
    });

    goodFood.forEach((item) => {
      if (text.includes(item)) {
        healthScore += 10;
      }
    });

    const hasNutrient = foodKeywords.some((item) => text.includes(item));
    if (!hasNutrient) {
      reason = 'No nutrition info found, unable to verify healthiness.';
    } else if (warnings.length > 0) {
      reason = 'Unhealthy – ' + warnings.join(', ');
    } else {
      reason = 'Healthy and balanced nutrition.';
    }
  } else if (category === 'skincare' || category === 'skin') {
    skincareBad.forEach((item) => {
      if (text.includes(item)) {
        warnings.push(`${item} may irritate skin`);
        healthScore -= 20;
      }
    });

    skincareGood.forEach((item) => {
      if (text.includes(item)) {
        healthScore += 10;
      }
    });

    if (warnings.length > 0) {
      reason = 'Contains harsh chemicals: ' + warnings.join(', ');
    } else {
      reason = 'Safe skincare formula with gentle ingredients.';
    }
  }

  return { score: Math.max(0, Math.min(100, healthScore)), reason };
}

function getDetectedModeFromClassName(className) {
  const lower = String(className).toLowerCase();
  const skinTerms = ['lotion', 'cream', 'toothpaste', 'soap', 'bottle', 'cosmetic', 'skin', 'serum'];
  return skinTerms.some(term => lower.includes(term)) ? 'skin' : 'food';
}

if (typeof window !== 'undefined') {
  window.FoodIQ = window.FoodIQ || {};
  Object.assign(window.FoodIQ, {
    normalizeAllergies,
    extractNutrients,
    computeHealthScore,
    analyzeText,
    getDetectedModeFromClassName
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeAllergies,
    extractNutrients,
    computeHealthScore,
    analyzeText,
    getDetectedModeFromClassName
  };
}
