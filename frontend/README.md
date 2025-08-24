# EV+ Desktop Pull-Tab Game Analyzer

A professional, advanced single-page web application for analyzing pull-tab game images. Upload an image and get instant analysis results from your backend API.

## Features
- Modern React (Vite) SPA
- Image upload and preview
- Backend API integration for analysis
- Clean, responsive UI

## Getting Started
1. Install dependencies:
   ```powershell
   npm install
   ```
2. Start the development server:
   ```powershell
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Backend API
- The frontend expects a POST endpoint at `http://localhost:8000/analyze` that accepts an image file and returns analysis results in JSON.

## Customization
- Update the API endpoint in `src/App.jsx` if your backend runs elsewhere.

---

For support, contact the project maintainer.
