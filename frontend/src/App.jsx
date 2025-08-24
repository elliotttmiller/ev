import React, { useState, useRef } from 'react';
import { centerCrop, makeAspectCrop } from 'react-image-crop';
import axios from 'axios';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- Helper Components ---
const Card = ({ title, children }) => (
  <div className="card">
    <h2 className="card-title">{title}</h2>
    {children}
  </div>
);

const MetricBox = ({ label, value }) => (
  <div className="metric-box">
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
  </div>
);

const getRecommendationStyle = (recommendation = '') => {
  if (recommendation.includes('PRIME') || recommendation.includes('STRATEGIC')) return { color: '#28a745', borderColor: '#28a745' };
  if (recommendation.includes('LOTTO') || recommendation.includes('GRIND')) return { color: '#ffc107', borderColor: '#ffc107' };
  if (recommendation.includes('MONITOR')) return { color: '#17a2b8', borderColor: '#17a2b8' };
  return { color: '#dc3545', borderColor: '#dc3545' };
};

// --- Main App Component ---
export default function App() {
  // State Management (declare ONCE)
  const [gameState, setGameState] = useState({});
  const [userBankroll, setUserBankroll] = useState('1000');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState({ estimate: false, ocr: false, analysis: false });
  const [originalBoxImage, setOriginalBoxImage] = useState(null);
  const [croppedBoxImage, setCroppedBoxImage] = useState(null);
  const [boardImage, setBoardImage] = useState({ file: null, preview: null });
  const [error, setError] = useState('');
  const [caliper, setCaliper] = useState({ y: 0, isDragging: false });
  const imageContainerRef = useRef(null);
  // Use percent crop for centering and aspect ratio
  const [crop, setCrop] = useState({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageRef, setImageRef] = useState(null);

  // --- Handler Functions ---
  const updateGameState = (newData) => setGameState(prevState => ({ ...prevState, ...newData }));
  const handleBoxImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imgUrl = URL.createObjectURL(file);
      setOriginalBoxImage(imgUrl);
      setCroppedBoxImage(null);
      setCaliper({ y: 0, isDragging: false });
      setShowCropper(true);
      setImageRef(null);
      // Center crop with aspect ratio (optional)
      setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
      setCroppedAreaPixels(null);
    }
  };
  // Cancel cropping and revert to original image
  const handleCropCancel = () => {
    setShowCropper(false);
    setCroppedBoxImage(null);
  };
  const onImageLoaded = (img) => {
    setImageRef(img);
    // Optionally center crop with aspect ratio
    // const aspect = 1; // For square crop
    // setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, img.naturalWidth, img.naturalHeight), img.naturalWidth, img.naturalHeight));
    return img;
  };

  const onCropChange = (c) => {
    setCrop({
      ...c,
      x: Math.max(0, c.x),
      y: Math.max(0, c.y),
      width: Math.max(10, c.width),
      height: Math.max(10, c.height)
    });
  };

  const onCropComplete = (c) => {
    setCroppedAreaPixels(c);
  };

  // Crop image utility
  const getCroppedImg = (image, crop) => {
    if (!crop || !image) return null;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg');
    });
  };

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !imageRef) return setError('Crop area or image not loaded.');
    const croppedBlob = await getCroppedImg(imageRef, croppedAreaPixels);
    if (!croppedBlob) return setError('Failed to crop image.');
    setCroppedBoxImage(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
  };

  const handleBoardImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setBoardImage({ file, preview: URL.createObjectURL(file) });
      await handleOcr(file);
    }
  };

  const handleEstimate = async () => {
    if (!gameState.total_tickets || !croppedBoxImage) {
      return setError('Please upload and crop a box image, and enter total tickets.');
    }
    setLoading(p => ({ ...p, estimate: true }));
    setError('');
    try {
      const containerHeight = imageContainerRef.current.offsetHeight;
      const fillRatio = Math.max(0, Math.min(1, caliper.y / containerHeight));
      setGameState(prev => ({ ...prev, fill_ratio: fillRatio }));
      const formData = new FormData();
      formData.append('fill_ratio', fillRatio.toString());
      formData.append('total_tickets', gameState.total_tickets.toString());
      const res = await axios.post(`${API_URL}/estimate_tickets`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateGameState({ tickets_remaining: res.data.estimated_tickets });
    } catch (err) {
      setError('Failed to estimate tickets.');
      if (err.response) {
        console.error('Estimate error:', err.response.data);
      } else {
        console.error('Estimate error:', err);
      }
    }
    setLoading(p => ({ ...p, estimate: false }));
  };

  const handleOcr = async (file) => {
    setLoading(p => ({ ...p, ocr: true }));
    setError('');
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axios.post(`${API_URL}/ocr_prize_board`, formData);
      updateGameState(res.data);
    } catch (err) { setError('Failed to parse prize board.'); }
    setLoading(p => ({ ...p, ocr: false }));
  };

  const handleRunAnalysis = async () => {
    if (!gameState.game_name || !userBankroll) {
      return setError('Please ensure all game details and your bankroll are filled out.');
    }
    setLoading(p => ({ ...p, analysis: true }));
    setError('');
    setAnalysisResult(null);
    try {
      const res = await axios.post(`${API_URL}/run_analysis`, {
        game_state: gameState,
        user_bankroll: parseFloat(userBankroll),
      });
      if (res.data.error) setError(res.data.error);
      else setAnalysisResult(res.data);
    } catch (err) { setError('Failed to run analysis.'); }
    setLoading(p => ({ ...p, analysis: false }));
  };
  // API Configuration
  const API_URL = 'http://localhost:5000';
  // ...existing code...
  // --- UI Layout ---
  return (
    <div className="command-center">
      <header className="header">
        <h1>Vireo AI</h1>
        <p>Your Cutting-Edge Pull-Tab Co-Pilot</p>
      </header>

      <Card title="1. Ticket Estimation">
        <input type="file" accept="image/*" onChange={handleBoxImageUpload} />
        {/* Always show uploaded image if present, even before cropping */}
        {originalBoxImage && !showCropper && !croppedBoxImage && (
          <div style={{ marginTop: '1rem' }}>
            <img src={originalBoxImage} alt="Uploaded Box" className="image-preview" style={{ maxHeight: 400, maxWidth: 400 }} />
            <button
              className="button"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setShowCropper(true);
                setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
                setCroppedAreaPixels(null);
                setError('');
              }}
              disabled={!originalBoxImage}
            >
              Crop Image
            </button>
          </div>
        )}
        {/* Cropping tool always displays image, no fallback logic */}
        {showCropper && originalBoxImage && crop.width > 0 && crop.height > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <ReactCrop
              crop={crop}
              onChange={setCrop}
              onComplete={onCropComplete}
              keepSelection={true}
              minWidth={10}
              minHeight={10}
              style={{ maxHeight: 400, maxWidth: 400 }}
            >
              <img src={originalBoxImage} onLoad={onImageLoaded} alt="Crop" style={{ maxHeight: 400, maxWidth: 400 }} />
            </ReactCrop>
            <button className="button" style={{ marginTop: '1rem', marginRight: 8 }} onClick={handleCropConfirm}>Confirm Crop</button>
            <button className="button" style={{ marginTop: '1rem' }} onClick={handleCropCancel}>Cancel</button>
          </div>
        )}
        {/* Show cropped image and caliper only after cropping is confirmed */}
        {croppedBoxImage && !showCropper && (
          <div
            ref={imageContainerRef}
            className="caliper-container"
            onMouseDown={() => setCaliper(c => ({ ...c, isDragging: true }))}
            onMouseUp={() => setCaliper(c => ({ ...c, isDragging: false }))}
            onMouseMove={(e) => {
              if (caliper.isDragging && imageContainerRef.current) {
                const rect = imageContainerRef.current.getBoundingClientRect();
                const newY = e.clientY - rect.top;
                setCaliper(c => ({ ...c, y: Math.max(0, Math.min(rect.height, newY)) }));
              }
            }}
            onMouseLeave={() => setCaliper(c => ({ ...c, isDragging: false }))}
          >
            <img src={croppedBoxImage} alt="Box Preview" className="image-preview" />
            <div className="line" style={{ top: 0, backgroundColor: 'rgba(255, 0, 0, 0.7)' }} />
            <div className="line draggable-line" style={{ top: caliper.y, backgroundColor: 'var(--primary-color)' }} />
          </div>
        )}
        <input className="input" type="number" placeholder="Total Tickets in Full Game" onChange={e => updateGameState({ total_tickets: e.target.value })} />
        <button
          className="button"
          onClick={handleEstimate}
          disabled={loading.estimate || !croppedBoxImage}
          style={{ marginTop: 12, minWidth: 160 }}
        >
          {loading.estimate ? 'Estimating...' : 'Confirm Estimate'}
        </button>
        {gameState.tickets_remaining != null && (
           <div style={{ marginTop: 8 }}>
            <label>
              Est. Tickets: <input
                className="input"
                type="number"
                value={gameState.tickets_remaining}
                onChange={e => updateGameState({ tickets_remaining: parseInt(e.target.value, 10) })}
                style={{ width: 120, marginLeft: 8, display: 'inline-block' }}
              />
              <span style={{ color: '#888', marginLeft: 8 }}>(Adjust if needed)</span>
            </label>
          </div>
        )}
      </Card>

      <Card title="2. Prize Board Scan">
        <input type="file" accept="image/*" onChange={handleBoardImageUpload} />
        {loading.ocr && <p>Parsing image with AI...</p>}
        {boardImage.preview && !loading.ocr && <img src={boardImage.preview} alt="Board Preview" className="image-preview" />}
      </Card>

      <Card title="3. Review & Confirm">
        <input className="input" placeholder="Game Name" value={gameState.game_name || ''} onChange={e => updateGameState({ game_name: e.target.value })} />
        <input className="input" placeholder="Ticket Price" type="number" value={gameState.ticket_price || ''} onChange={e => updateGameState({ ticket_price: parseFloat(e.target.value) })} />
        <input className="input" placeholder="Your Bankroll" type="number" value={userBankroll} onChange={e => setUserBankroll(e.target.value)} />
        <div className="prize-grid">
          {gameState.prizes?.map((prize, index) => (
            <div key={index} className="prize-row">
              <span>${prize.value?.toFixed(2)}:</span>
              <input
                className="prize-input"
                type="number"
                value={prize.count}
                onChange={e => {
                  const newPrizes = [...gameState.prizes];
                  newPrizes[index].count = parseInt(e.target.value, 10) || 0;
                  updateGameState({ prizes: newPrizes });
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="4. AI Analysis">
        <button className="button button-primary" onClick={handleRunAnalysis} disabled={loading.analysis || !gameState.prizes}>
          {loading.analysis ? 'Analyzing...' : 'RUN VIREO ANALYSIS'}
        </button>
        {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
        {analysisResult && (
          <div className="analysis-dashboard" style={getRecommendationStyle(analysisResult.recommendation)}>
            <h3 className="analysis-recommendation">{analysisResult.recommendation.replace(/_/g, ' ')}</h3>
            <p className="analysis-summary">{analysisResult.summary}</p>
            <div className="metrics-grid">
              <MetricBox label="Net EV / Ticket" value={`$${analysisResult.metrics.net_ev.toFixed(2)}`} />
              <MetricBox label="Volatility" value={analysisResult.metrics.volatility.toFixed(2)} />
              <MetricBox label="Efficiency (EV/$)" value={analysisResult.metrics.efficiency.toFixed(2)} />
              <MetricBox label="Capital to Buyout" value={`$${analysisResult.metrics.capital_required.toFixed(2)}`} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
