// --------------------------------------
// FoodIQ - Phase 2 Integrated Script
// --------------------------------------
let currentMode = 'food';
let videoStream = null;
let chartInstance = null;
let ingredientsDB = {}; // loaded from ingredients.json

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
      "sugar": { "effect": "High sugar intake increases diabetes/weight gain", "type": "bad" },
      "protein": { "effect": "Builds muscle and supports repair", "type": "good" },
      "fat": { "effect": "Essential but excess raises cholesterol risk", "type": "warning" },
      "sodium": { "effect": "Excess increases blood pressure risk", "type": "warning" },
      "paraben": { "effect": "Controversial preservative, possible risks", "type": "bad" },
      "sls": { "effect": "Harsh surfactant; may irritate skin", "type": "bad" },
      "aloe": { "effect": "Soothing & moisturizing", "type": "good" },
      "vitamin e": { "effect": "Antioxidant, skin benefit", "type": "good" },
      "fragrance": { "effect": "May irritate sensitive skin", "type": "warning" }
    };
  });

// ------------------
// PROFILE MODAL LOGIC
// ------------------
const modal = document.getElementById("profileModal");
const openBtn = document.getElementById("profileBtn");
const closeBtn = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveProfile");

openBtn.onclick = () => { modal.style.display = "flex"; loadProfile(); };
closeBtn.onclick = () => { modal.style.display = "none"; };

saveBtn.onclick = () => {
  const profile = {
    name: document.getElementById("userName").value,
    age: document.getElementById("userAge").value,
    gender: document.getElementById("userGender").value,
    goal: document.getElementById("userGoal").value,
    allergies: document.getElementById("userAllergies").value.toLowerCase().split(',').map(a => a.trim()),
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
  net = await mobilenet.load();
  console.log("✅ MobileNet model loaded");
}
loadModel();

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const detectionResult = document.getElementById("detection-result");

imageInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  // Preview the uploaded image
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);

  // Wait for preview to load fully
  await new Promise((r) => setTimeout(r, 500));

  // Run classification
  const result = await net.classify(preview);
  if (!result || !result.length) return;
  const best = result[0];
  const name = best.className.toLowerCase();
  const confidence = (best.probability * 100).toFixed(1);

  // Decide mode
  let detectedMode = "food";
  if (
    name.includes("lotion") ||
    name.includes("cream") ||
    name.includes("toothpaste") ||
    name.includes("soap") ||
    name.includes("bottle") ||
    name.includes("cosmetic")
  ) {
    detectedMode = "skin";
  }

  // Auto switch tab visually
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.tab:nth-child(${detectedMode === "food" ? 1 : 2})`);
  btn.classList.add("active");
  currentMode = detectedMode;

  // Display
  detectionResult.innerHTML = `🔍 Detected: <b>${name}</b> (${confidence}%)
   → Mode: <b>${detectedMode === "food" ? "Food" : "Skin-care"}</b>`;
  detectionResult.style.color = detectedMode === "food" ? "#0b6623" : "#0077cc";
});

// -----------------------------
// Mode Switch
// -----------------------------
function selectMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

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
// File Selection + Preview
// -----------------------------
document.getElementById('imageInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  const fileNameEl = document.getElementById('fileName');

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      fileNameEl.innerHTML = `
        <div style="margin-top:8px;">
          <img src="${e.target.result}" alt="preview"
            style="width:80px;height:auto;border-radius:6px;
                   box-shadow:0 2px 5px rgba(0,0,0,0.1);"><br>
          <span style="font-size:0.85rem;color:#333;">${file.name}</span>
        </div>`;
    };
    reader.readAsDataURL(file);
  } else {
    fileNameEl.textContent = '';
  }
});

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
  document.getElementById('loading').innerText = '⏳ OCR in progress — reading label...';
  document.getElementById('results').hidden = true;

  try {
    const { data: { text } } = await Tesseract.recognize(fileBlob, 'eng');
    document.getElementById('loading').innerText = '';
    if (currentMode === 'food') analyzeFood(text);
    else analyzeSkin(text);
  } catch (e) {
    document.getElementById('loading').innerText = '';
    alert('OCR failed: ' + e.message);
  }
}

function useDemo(category) {
  const demoImages = {
    food: 'food.jpeg',
    skincare: 'skincare.jfif'
  };
  const imgUrl = demoImages[category];

  fetch(imgUrl)
    .then(res => res.blob())
    .then(blob => handleImageBlob(blob))
    .catch(() => alert("Demo image not found."));

  selectMode(category, document.querySelector(`.tab[data-mode="${category}"]`));
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

  } else if (category === "skincare") {
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
  renderNutrientTips(nutrients);
  function renderVerdict(score, reason) {
  const v = document.getElementById('verdict');
  v.innerText = `${score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌'} ${reason}`;
  v.style.background = score >= 80 ? '#e6fff0' : score >= 60 ? '#fffaf0' : '#fff0f0';
  v.style.color = score >= 80 ? '#0b6623' : score >= 60 ? '#8a5900' : '#9b1c1c';
}

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

function renderNutrientTips(n) {
  const container = document.getElementById('tips');
  container.innerHTML = '<h4>Tips & Insights</h4>';
  const tips = [];

  if (n.sugar > 20) tips.push({ type: 'bad', text: `High sugar (${n.sugar}g)` });
  if (n.fat > 15) tips.push({ type: 'bad', text: `High fat (${n.fat}g)` });
  if (n.sodium > 2000) tips.push({ type: 'bad', text: `High sodium (${n.sodium}mg)` });

  if (!tips.length) tips.push({ type: 'good', text: 'Balanced nutrient levels detected.' });

  tips.forEach(t => {
    const d = document.createElement('div');
    d.className = `tip ${t.type}`;
    d.innerText = t.text;
    container.appendChild(d);
  });
}

 // 🔹 Integrate Personal Profile Insights
  const profile = JSON.parse(localStorage.getItem("foodiqProfile"));
  if (profile) {
    if (profile.goal === "Lose weight" && n.sugar > 15) {
      tips.push({ type: "bad", text: "High sugar content — not ideal for weight loss." });
    }
    if (profile.goal === "Gain muscle" && n.protein < 8) {
      tips.push({ type: "bad", text: "Low protein — not suitable for muscle gain." });
    }
    if (profile.allergies && profile.allergies.some(a => text.toLowerCase().includes(a.toLowerCase()))) {
      tips.push({ type: "bad", text: `⚠️ Allergen detected (${profile.allergies.join(", ")})` });
    }
  }

function renderVerdict(score) {
  const v = document.getElementById('verdict');
  if (score >= 80) {
    v.innerText = '✅ Healthy choice — good balance of nutrients.';
    v.style.background = '#e6fff0';
    v.style.color = '#0b6623';
  } else if (score >= 60) {
    v.innerText = '⚠️ Moderate — try lower sugar/fat options.';
    v.style.background = '#fffaf0';
    v.style.color = '#8a5900';
  } else {
    v.innerText = '❌ Unhealthy — high sugar/fat/sodium content.';
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

const ai = analyzeText(text, 'skincare');
renderScore(ai.score);
document.getElementById('verdict').innerText = ai.reason;

  if (chartInstance) chartInstance.destroy();
  document.getElementById('nutrients').innerHTML = '';
  renderScore(found.bad.length ? 35 : found.warning.length ? 65 : 85);
  document.getElementById('results').hidden = false;
}