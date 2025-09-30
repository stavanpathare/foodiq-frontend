async function processImage() {
  const image = document.getElementById('imageInput').files[0];
  const mode = document.getElementById('mode').value;

  if (!image) {
    alert("Please upload an image first!");
    return;
  }

  document.getElementById("loading").innerText = "⏳ Analyzing...";

  const { data: { text } } = await Tesseract.recognize(image, 'eng');

  document.getElementById("loading").innerText = "";

  if (mode === "food") {
    analyzeFood(text);
  } else {
    analyzeSkin(text);
  }
}

let currentMode = "food"; // default

function selectMode(mode, button) {
  currentMode = mode;
  // Remove active class from all buttons
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  // Add active to clicked button
  button.classList.add('active');

  // Clear previous results
  document.getElementById('results').innerHTML = "";
  document.getElementById('imageInput').value = "";
}

async function processImage() {
  const image = document.getElementById('imageInput').files[0];

  if (!image) {
    alert("Please upload an image first!");
    return;
  }

  document.getElementById("loading").innerText = "⏳ Analyzing...";

  const { data: { text } } = await Tesseract.recognize(image, 'eng');

  document.getElementById("loading").innerText = "";

  if (currentMode === "food") {
    analyzeFood(text);
  } else {
    analyzeSkin(text);
  }
}


function analyzeFood(text) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<h3>🥗 Food Analysis</h3>";

  let protein = text.match(/protein\s*:?(\d+\.?\d*)\s*g/i);
  let sugar = text.match(/sugar\s*:?(\d+\.?\d*)\s*g/i);
  let fat = text.match(/fat\s*:?(\d+\.?\d*)\s*g/i);
  let sodium = text.match(/sodium\s*:?(\d+\.?\d*)\s*mg/i);
  let calories = text.match(/calories\s*:?(\d+\.?\d*)/i);

  let nutrientInfo = "<h4>Nutrition Facts</h4><ul>";
  if (calories) nutrientInfo += `<li>Calories: ${calories[1]}</li>`;
  if (protein) nutrientInfo += `<li>Protein: ${protein[1]}g</li>`;
  if (sugar) nutrientInfo += `<li>Sugar: ${sugar[1]}g</li>`;
  if (fat) nutrientInfo += `<li>Fat: ${fat[1]}g</li>`;
  if (sodium) nutrientInfo += `<li>Sodium: ${sodium[1]}mg</li>`;
  nutrientInfo += "</ul>";

  let analysis = "<h4>Health Analysis</h4><ul>";
  if (protein && parseFloat(protein[1]) >= 5) analysis += `<li class="good">✅ Good protein source</li>`;
  if (sugar) analysis += `<li>Sugar: ${sugar[1]}g ${parseFloat(sugar[1]) > 20 ? "<span class='bad'>❌ Too High</span>" : "<span class='good'>✅ OK</span>"}</li>`;
  if (fat) analysis += `<li>Fat: ${fat[1]}g ${parseFloat(fat[1]) > 15 ? "<span class='bad'>❌ High</span>" : "<span class='good'>✅ OK</span>"}</li>`;
  if (sodium) analysis += `<li>Sodium: ${sodium[1]}mg ${parseFloat(sodium[1]) > 2000 ? "<span class='bad'>❌ Too High</span>" : "<span class='good'>✅ OK</span>"}</li>`;
  analysis += "</ul>";

  resultsDiv.innerHTML += nutrientInfo + analysis;
}

function analyzeSkin(text) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<h3>💧 Skin-care Analysis</h3>";

  const lowerText = text.toLowerCase();

  // ✅ Known ingredient categories
  const safeIngredients = [
    /aloe/i, /vitamin\s*c/i, /hyaluronic/i, /niacinamide/i, /green\s*tea/i, /shea\s*butter/i
  ];
  const riskyIngredients = [
    /fragrance/i, /perfume/i, /alcohol/i, /essential\s*oil/i
  ];
  const harmfulIngredients = [
    /paraben/i, /(sls|sodium\s*lauryl\s*sulfate)/i, /formaldehyde/i, /mineral\s*oil/i
  ];

  let foundSafe = [];
  let foundRisky = [];
  let foundHarmful = [];

  safeIngredients.forEach(regex => {
    if (regex.test(lowerText)) foundSafe.push(regex.source);
  });
  riskyIngredients.forEach(regex => {
    if (regex.test(lowerText)) foundRisky.push(regex.source);
  });
  harmfulIngredients.forEach(regex => {
    if (regex.test(lowerText)) foundHarmful.push(regex.source);
  });

  let output = "";
  if (foundSafe.length > 0) output += `<p class="good">✅ Good for skin: ${foundSafe.join(", ")}</p>`;
  if (foundRisky.length > 0) output += `<p class="warning">⚠️ Risky for sensitive skin: ${foundRisky.join(", ")}</p>`;
  if (foundHarmful.length > 0) output += `<p class="bad">❌ Harmful/controversial: ${foundHarmful.join(", ")}</p>`;
  if (!output) output = "<p>🤔 No recognizable ingredients found. (OCR might be unclear)</p>";

  resultsDiv.innerHTML += output;
}

