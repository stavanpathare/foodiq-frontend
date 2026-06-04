// --------------------------------------
// FoodIQ - Phase 2 Integrated Script
// --------------------------------------
let currentMode = 'food';
let videoStream = null;
let chartInstance = null;
let ingredientsDB = {}; // loaded from ingredients.json
let manualModeSelection = false;

// -----------------------------
// Load ingredients database
// -----------------------------
fetch('ingredients.json')
  .then(r => {
    if (!r.ok) throw new Error('ingredients.json load failed');
    return r.json();
  })
  .then(j => { ingredientsDB = j; })
  .catch(() => {
    // fallback DB if fetch fails
    ingredientsDB = {
      "vitamin e": { "effect": "Antioxidant, supports skin health", "type": "good" },
      "aloe": { "effect": "Soothing & moisturizing", "type": "good" },
      "niacinamide": { "effect": "Improves skin barrier and pigmentation", "type": "good" },
      "hyaluronic": { "effect": "Hydrating humectant", "type": "good" },
      "ceramide": { "effect": "Strengthens skin barrier", "type": "good" },
      "shea butter": { "effect": "Rich moisturizer and anti-inflammatory", "type": "good" },
      "paraben": { "effect": "Controversial preservative; possible risks", "type": "bad" },
      "sls": { "effect": "Harsh surfactant; may irritate skin", "type": "bad" },
      "sodium lauryl sulfate": { "effect": "Harsh surfactant; may irritate skin", "type": "bad" },
      "formaldehyde": { "effect": "Toxic preservative; avoid", "type": "bad" },
      "mineral oil": { "effect": "Can be comedogenic for some skin", "type": "warning" },
      "fragrance": { "effect": "May irritate sensitive skin", "type": "warning" },
      "alcohol": { "effect": "Can dry skin and cause irritation", "type": "warning" }
    };
  });

// ------------------
// PROFILE MODAL LOGIC
// ------------------
const modal = document.getElementById("profileModal");
const openBtn = document.getElementById("profileBtn");
const closeBtn = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveProfile");

if (openBtn) openBtn.onclick = () => {
  modal.style.display = "flex";
  modalOverlay.setAttribute('aria-hidden', 'false');
  loadProfile();
  document.getElementById('userName').focus();
};
if (closeBtn) closeBtn.onclick = closeModal;

if (saveBtn) saveBtn.onclick = () => {
  const profile = {
    name: document.getElementById("userName").value,
    age: document.getElementById("userAge").value,
    gender: document.getElementById("userGender").value,
    goal: document.getElementById("userGoal").value,
    allergies: document.getElementById("userAllergies").value.toLowerCase().split(',').map(a => a.trim()).filter(Boolean),
    diet: document.getElementById("userDiet").value
  };
  localStorage.setItem("foodiqProfile", JSON.stringify(profile));
  alert("Profile saved successfully ✅");
  modal.style.display = "none";
};

// Load saved profile
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("foodiqProfile"));
  if (!profile) return;
  document.getElementById("userName").value = profile.name || "";
  document.getElementById("userAge").value = profile.age || "";
  document.getElementById("userGender").value = profile.gender || "Male";
  document.getElementById("userGoal").value = profile.goal || "Maintain health";
  document.getElementById("userAllergies").value = profile.allergies?.join(", ") || "";
  document.getElementById("userDiet").value = profile.diet || "Vegetarian";
}


//---------------------------------------
// AI Vision Detection (MobileNet)
//---------------------------------------
let net;
async function loadModel() {
  if (net) return net;
  net = await mobilenet.load();
  console.log("✅ MobileNet model loaded");
  return net;
}
loadModel().catch(()=>{/* non-blocking model load failure */});

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const detectionResult = document.getElementById("detection-result");
const loadingEl = document.getElementById('loading');
const analyzeBtn = document.getElementById('analyzeBtn');
const cameraBtn = document.getElementById('cameraBtn');
const captureBtn = document.getElementById('captureBtn');
const modalOverlay = document.getElementById('profileModal');
const modalContent = document.querySelector('.modal-content');

function setBusy(isBusy, message) {
  if (isBusy) {
    loadingEl.classList.remove('hidden');
    loadingEl.innerText = message || 'Working...';
    analyzeBtn.disabled = true;
    cameraBtn.disabled = true;
    captureBtn.disabled = true;
    imageInput.disabled = true;
  } else {
    loadingEl.innerText = message || '';
    loadingEl.classList.toggle('hidden', !message);
    analyzeBtn.disabled = false;
    cameraBtn.disabled = false;
    captureBtn.disabled = false;
    imageInput.disabled = false;
  }
}

function updateStatus(message) {
  loadingEl.innerText = message;
  loadingEl.classList.remove('hidden');
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Unable to load image for preprocessing.'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

function preprocessImageForOCR(blob) {
  return loadImageFromBlob(blob).then(img => {
    const canvas = document.createElement('canvas');
    const maxSize = 1200;
    let width = img.width;
    let height = img.height;
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrast = ((luminance - 128) * 1.2) + 128;
      const clipped = Math.max(0, Math.min(255, contrast));
      data[i] = data[i + 1] = data[i + 2] = clipped;
    }
    ctx.putImageData(imageData, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  });
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalOverlay.setAttribute('aria-hidden', 'true');
}

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) closeModal();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalOverlay.style.display === 'flex') {
    closeModal();
  }
});

imageInput.addEventListener("change", async function (event) {
  const file = event.target.files[0];
  const fileNameEl = document.getElementById('fileName');
  if (!file) {
    fileNameEl.textContent = '';
    return;
  }

  fileNameEl.innerHTML = `<span>${file.name}</span>`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
    preview.alt = `Preview of ${file.name}`;

    await new Promise((resolve) => { preview.onload = resolve; });

    if (!net) {
      updateStatus('Loading AI model...');
      try {
        await loadModel();
      } catch (err) {
        console.warn('MobileNet load failed', err);
      }
    }

    const result = await net?.classify(preview).catch(err => {
      console.warn('MobileNet classify failed', err);
      return null;
    });
    if (!result || !result.length) {
      detectionResult.textContent = '';
      return;
    }

    const best = result[0];
    const name = best.className.toLowerCase();
    const confidence = (best.probability * 100).toFixed(1);
    const detectedMode = window.FoodIQ?.getDetectedModeFromClassName(name) || (
      name.includes("lotion") ||
      name.includes("cream") ||
      name.includes("toothpaste") ||
      name.includes("soap") ||
      name.includes("bottle") ||
      name.includes("cosmetic") ? "skin" : "food"
    );

    const btn = document.querySelector(`.tab[data-mode="${detectedMode}"]`);
    if (!manualModeSelection) {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      if (btn) btn.classList.add("active");
      currentMode = detectedMode;
      detectionResult.innerHTML = `🔍 Detected: <strong>${name}</strong> (${confidence}%) → Mode: <strong>${detectedMode === "food" ? "Food" : "Skin-care"}</strong>`;
    } else {
      detectionResult.innerHTML = `🔍 Detected: <strong>${name}</strong> (${confidence}%) → Suggested mode: <strong>${detectedMode === "food" ? "Food" : "Skin-care"}</strong>`;
    }
    detectionResult.style.color = detectedMode === "food" ? "#0b6623" : "#0077cc";
  };
  reader.readAsDataURL(file);
});

// -----------------------------
// Mode Switch
// -----------------------------
function selectMode(mode, btn) {
  currentMode = mode;
  manualModeSelection = true;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  if (!btn) btn = document.querySelector(`.tab[data-mode="${mode}"]`);
  if (btn) btn.classList.add('active');

  stopCamera();
  document.getElementById('results').hidden = true;
  document.getElementById('loading').innerText = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('fileName').innerHTML = '';
}

// -----------------------------
// Camera Handling
// -----------------------------
async function toggleCamera() {
  const wrap = document.getElementById('cameraWrap');
  const video = document.getElementById('video');

  if (videoStream) {
    stopCamera();
    return;
  }

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    video.srcObject = videoStream;
    wrap.style.display = 'block';
    document.getElementById('captureBtn').style.display = 'inline-block';
    document.getElementById('cameraBtn').innerText = 'Stop Camera';
  } catch (e) {
    alert('Camera access denied or not available.');
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  document.getElementById('video').srcObject = null;
  document.getElementById('cameraWrap').style.display = 'none';
  document.getElementById('captureBtn').style.display = 'none';
  document.getElementById('cameraBtn').innerText = '📷 Use Camera';
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    stopCamera(); // stop after capture
    handleImageBlob(blob);
  }, 'image/jpeg', 0.9);
}

// -----------------------------
// Main Image Processing (OCR)
// -----------------------------
async function processImage() {
  const file = document.getElementById('imageInput').files[0];
  if (!file) {
    alert('Please choose an image file or use the camera.');
    return;
  }
  handleImageBlob(file);
}

async function handleImageBlob(fileBlob) {
  setBusy(true, '⏳ Preparing image for OCR...');
  document.getElementById('results').hidden = true;

  try {
    const preprocessedBlob = await preprocessImageForOCR(fileBlob);
    const { data: { text } } = await Tesseract.recognize(preprocessedBlob, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' || m.status === 'recognizing words') {
          updateStatus(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    setBusy(false, '');
    if (!text || !text.trim()) {
      alert('No text found in the image. Try a clearer photo.');
      return;
    }

    if (currentMode === 'food') analyzeFood(text);
    else analyzeSkin(text);
  } catch (e) {
    setBusy(false, '');
    alert('OCR failed: ' + e.message);
  }
}

function useDemo(category) {
  const demoImages = {
    food: 'Food.jpg',
    skin: 'Skincare.jpg'
  };
  const imgUrl = demoImages[category];

  fetch(imgUrl)
    .then(res => res.blob())
    .then(blob => {
      handleImageBlob(blob);
      selectMode(category, document.querySelector(`.tab[data-mode="${category}"]`));
    })
    .catch(() => alert("Demo image not found."));
}

// -----------------------------
// Unified Text Analyzer (Smart Check)
// -----------------------------
function analyzeText(extractedText, category) {
  const text = extractedText.toLowerCase();
  let healthScore = 80;
  let reason = "Looks balanced.";
  let warnings = [];

  const foodKeywords = ["sugar", "fat", "sodium", "salt", "calorie", "protein"];
  const badFood = ["sugar", "fat", "sodium", "salt"];
  const goodFood = ["protein", "fiber", "vitamin", "calcium"];

  const skincareBad = ["paraben", "sulfate", "alcohol", "fragrance", "silicone"];
  const skincareGood = ["vitamin e", "aloe", "niacinamide", "ceramide", "hyaluronic", "shea butter"];

  if (category === "food") {
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

    const hasNutrient = foodKeywords.some((w) => text.includes(w));
    if (!hasNutrient) {
      reason = "No nutrition info found, unable to verify healthiness.";
    } else if (warnings.length > 0) {
      reason = "Unhealthy – " + warnings.join(", ");
    } else {
      reason = "Healthy and balanced nutrition.";
    }

  } else if (category === "skincare" || category === "skin") {
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
      reason = "Contains harsh chemicals: " + warnings.join(", ");
    } else {
      reason = "Safe skincare formula with gentle ingredients.";
    }
  }

  healthScore = Math.min(100, Math.max(0, healthScore));
  return { score: healthScore, reason };
}

// -----------------------------
// FOOD ANALYSIS
// -----------------------------
function analyzeFood(text) {
  const lower = text.toLowerCase();
  const maybe = (r) => (lower.match(r) ? parseFloat(lower.match(r)[1]) : null);

  const protein = maybe(/protein[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/);
  const sugar = maybe(/sugar[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/);
  const fat = maybe(/(?:total\s*)?fat[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*g/);
  const sodium = maybe(/sodium[^0-9]*?([0-9]+(?:\.[0-9]+)?)\s*mg/);
  const calories = maybe(/calories[^0-9]*?([0-9]+)/);

  const nutrients = { calories, protein, sugar, fat, sodium };
  const ai = analyzeText(text, 'food');
  const score = Math.round((computeHealthScore(nutrients) + ai.score) / 2);

  renderScore(score);
  renderChart(nutrients);
  renderNutrients(nutrients);
  renderNutrientTips(nutrients, text);
  renderVerdict(score, ai.reason);

  document.getElementById('results').hidden = false;
}

function computeHealthScore(n) {
  let score = 50;
  if (n.protein >= 10) score += 15;
  else if (n.protein >= 5) score += 8;
  else if (n.protein != null) score -= 5;

  if (n.sugar > 30) score -= 30;
  else if (n.sugar > 20) score -= 18;
  else if (n.sugar > 10) score -= 6;
  else if (n.sugar != null) score += 4;

  if (n.fat > 25) score -= 20;
  else if (n.fat > 15) score -= 12;
  else if (n.fat != null) score += 3;

  if (n.sodium > 3000) score -= 18;
  else if (n.sodium > 2000) score -= 10;
  else if (n.sodium != null) score += 2;

  if (n.calories > 600) score -= 10;
  else if (n.calories < 80) score -= 4;
  else if (n.calories != null) score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function renderScore(score) {
  const val = document.getElementById('scoreValue');
  const fill = document.getElementById('scoreFill');
  val.innerText = score;
  fill.style.width = `${score}%`;

  if (score >= 80) {
    val.style.color = '#1b6b2f';
    fill.style.background = 'linear-gradient(90deg,#2ecc71,#16a34a)';
  } else if (score >= 60) {
    val.style.color = '#7a5d00';
    fill.style.background = 'linear-gradient(90deg,#f59e0b,#f97316)';
  } else {
    val.style.color = '#8b1c1c';
    fill.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
  }
}

function renderChart(n) {
  const ctx = document.getElementById('nutriChart').getContext('2d');
  const data = [n.protein || 0, n.fat || 0, n.sugar || 0, (n.sodium || 0) / 1000];
  const labels = ['Protein (g)', 'Fat (g)', 'Sugar (g)', 'Sodium (g)'];

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: ['#10b981', '#f97316', '#ef4444', '#60a5fa'] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderNutrients(n) {
  const container = document.getElementById('nutrients');
  container.innerHTML = '<h4>Nutrition Facts (per serving)</h4>';
  const facts = [
    ['Calories', n.calories ?? '—'],
    ['Protein', n.protein ? `${n.protein} g` : '—'],
    ['Sugar', n.sugar ? `${n.sugar} g` : '—'],
    ['Fat', n.fat ? `${n.fat} g` : '—'],
    ['Sodium', n.sodium ? `${n.sodium} mg` : '—']
  ];

  facts.forEach(([k, v]) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${k}:</strong> ${v}`;
    div.style.marginBottom = '6px';
    container.appendChild(div);
  });
}

function renderNutrientTips(n, extractedText) {
  const container = document.getElementById('tips');
  container.innerHTML = '<h4>Tips & Insights</h4>';
  const tips = [];
  if (n.sugar != null && n.sugar > 20) tips.push({ type: 'bad', text: `High sugar (${n.sugar}g)` });
  if (n.fat != null && n.fat > 15) tips.push({ type: 'bad', text: `High fat (${n.fat}g)` });
  if (n.sodium != null && n.sodium > 2000) tips.push({ type: 'bad', text: `High sodium (${n.sodium}mg)` });

  if (!tips.length) tips.push({ type: 'good', text: 'Balanced nutrient levels detected.' });

  tips.forEach(t => {
    const d = document.createElement('div');
    d.className = `tip ${t.type}`;
    d.innerText = t.text;
    container.appendChild(d);
  });

  // Integrate Personal Profile Insights (if profile exists)
  try {
    const profile = JSON.parse(localStorage.getItem("foodiqProfile") || 'null');
    if (profile) {
      if (profile.goal === "Lose Weight" && n.sugar != null && n.sugar > 15) {
        const d = document.createElement('div'); d.className = 'tip bad'; d.innerText = 'High sugar content — not ideal for weight loss.'; container.appendChild(d);
      }
      if (profile.goal === "Gain Muscle" && n.protein != null && n.protein < 8) {
        const d = document.createElement('div'); d.className = 'tip bad'; d.innerText = 'Low protein — not suitable for muscle gain.'; container.appendChild(d);
      }
      if (profile.allergies && profile.allergies.length && extractedText && profile.allergies.some(a => a && extractedText.toLowerCase().includes(a.toLowerCase()))) {
        const d = document.createElement('div'); d.className = 'tip bad'; d.innerText = `⚠️ Allergen detected (${profile.allergies.join(', ')})`; container.appendChild(d);
      }
    }
  } catch (e) {
    // ignore profile parsing errors
  }
}

function renderVerdict(score, reason) {
  const v = document.getElementById('verdict');
  if (reason) {
    v.innerText = `${score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌'} ${reason}`;
  } else if (score >= 80) {
    v.innerText = '✅ Healthy choice — good balance of nutrients.';
  } else if (score >= 60) {
    v.innerText = '⚠️ Moderate — try lower sugar/fat options.';
  } else {
    v.innerText = '❌ Unhealthy — high sugar/fat/sodium content.';
  }

  if (score >= 80) {
    v.style.background = '#e6fff0';
    v.style.color = '#0b6623';
  } else if (score >= 60) {
    v.style.background = '#fffaf0';
    v.style.color = '#8a5900';
  } else {
    v.style.background = '#fff0f0';
    v.style.color = '#9b1c1c';
  }
}

// -----------------------------
// SKINCARE ANALYSIS
// -----------------------------
function analyzeSkin(text) {
  const lower = text.toLowerCase();
  const container = document.getElementById('tips');
  container.innerHTML = '<h4>Ingredient Analysis</h4>';

  const found = { good: [], warning: [], bad: [] };
  Object.keys(ingredientsDB).forEach(key => {
    const regex = new RegExp(`\\b${key.replace(/\s+/g, '\\s*')}\\b`, 'i');
    if (regex.test(lower)) {
      const meta = ingredientsDB[key];
      found[meta.type].push({ k: key, effect: meta.effect });
    }
  });

  if (!found.good.length && !found.warning.length && !found.bad.length) {
    container.innerHTML += '<div class="tip">No recognized ingredients. Try a clearer photo.</div>';
  } else {
    for (const type in found) {
      found[type].forEach(i => {
        const d = document.createElement('div');
        d.className = `tip ${type}`;
        d.innerHTML = `${type === 'good' ? '✅' : type === 'warning' ? '⚠️' : '❌'} ${i.k} — ${i.effect}`;
        container.appendChild(d);
      });
    }
  }

  const ai = analyzeText(text, 'skin');
  let finalScore = ai.score;
  if (found.bad.length) finalScore = Math.min(finalScore, 35);
  else if (found.warning.length) finalScore = Math.min(finalScore, 65);

  renderScore(finalScore);
  renderVerdict(finalScore, ai.reason);

  if (chartInstance) chartInstance.destroy();
  document.getElementById('nutrients').innerHTML = '';
  document.getElementById('results').hidden = false;
}