# FoodIQ 2.0

**FoodIQ 2.0** is a web application that allows users to upload product labels and get instant health analysis. It works in **two modes**:  

1. **Food Mode 🥗** – Analyzes nutritional content (calories, protein, sugar, fat, sodium) and gives health recommendations.  
2. **Skin-care Mode 💧** – Analyzes cosmetic or skincare ingredient lists and provides safety & benefits for the skin.  

The app is **mobile-friendly** and uses **OCR (Tesseract.js)** to read text from images.

---

## Features

- **Image Upload**: Users can upload photos of food or skincare labels.  
- **OCR Text Extraction**: Automatically reads text from the uploaded image.  
- **Food Analysis**:  
  - Detects calories, protein, sugar, fat, and sodium.  
  - Gives pros, cons, and final verdict (healthy/unhealthy).  
- **Skin-care Analysis**:  
  - Detects beneficial, risky, and harmful ingredients.  
  - Provides safety advice and skin impact.  
- **Tab-style Mode Toggle**: Switch easily between Food and Skin-care modes.  
- **Mobile Responsive**: Works well on smartphones, tablets, and desktops.  

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript  
- **OCR**: [Tesseract.js](https://github.com/naptha/tesseract.js)  
- **No backend required** (Phase 1 runs entirely in the browser)  

---

## Testing

- Install dependencies: `npm install`  
- Run automated unit tests: `npm test`  

---



