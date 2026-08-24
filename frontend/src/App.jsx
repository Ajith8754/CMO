import React, { useState, useEffect } from 'react';
import { 
  Zap, ArrowLeft, Eye, Activity, Cpu, Play, Pause, 
  Upload, Download, RefreshCw, FileSpreadsheet, Clock, 
  Sliders, Database, AlertCircle, CheckCircle2,
  Shield, Ruler, Dumbbell, Check, X, Hourglass, Trophy, Search,
  Calendar, CalendarCheck
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

// Multi-point trend chart representing the entire Excel dataset
function TimelineChart({ dataset, systemKey, metricKey, activeHour, color, label, unit, min, max }) {
  if (!dataset || Object.keys(dataset).length === 0) return null;
  
  const hours = Object.keys(dataset).sort((a, b) => {
    const aMatch = a.match(/^(\d+):(\d+)$/);
    const bMatch = b.match(/^(\d+):(\d+)$/);
    if (aMatch && bMatch) {
      return (parseInt(aMatch[1]) * 60 + parseInt(aMatch[2])) - (parseInt(bMatch[1]) * 60 + parseInt(bMatch[2]));
    }
    const aNum = parseInt(a.replace(/\D/g, ''));
    const bNum = parseInt(b.replace(/\D/g, ''));
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });
  
  const values = hours.map(h => dataset[h][systemKey]?.metrics?.[metricKey] || 0);
  const activeIndex = hours.indexOf(activeHour);

  const width = 600;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const actualMin = min !== undefined ? min : Math.min(...values);
  const actualMax = max !== undefined ? max : Math.max(...values);
  const range = (actualMax - actualMin) || 1;

  const points = values.map((val, idx) => {
    const x = paddingLeft + (idx / (values.length - 1 || 1)) * (width - paddingLeft - paddingRight);
    const y = height - paddingBottom - ((val - actualMin) / range) * (height - paddingTop - paddingBottom);
    return { x, y, val, hour: hours[idx] };
  });

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  let fillD = "";
  if (points.length > 0) {
    fillD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  }

  const activePt = points[activeIndex];

  return (
    <div className="live-chart-container timeline-chart-wrapper">
      <div className="chart-header">
        <span className="chart-label">{label}</span>
        <span className="chart-value" style={{ color }}>
          {activePt?.val?.toFixed(1)}{unit} <span className="chart-sub-value">at {activeHour}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id={`grad-${systemKey}-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Y Axis grid lines */}
        <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
        <line x1={paddingLeft} y1={(paddingTop + height - paddingBottom)/2} x2={width - paddingRight} y2={(paddingTop + height - paddingBottom)/2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.08)" />

        {/* X Axis labels */}
        {points.filter((_, i) => i % Math.max(1, Math.round(points.length / 5)) === 0 || i === points.length - 1).map((pt, i) => (
          <text 
            key={i} 
            x={pt.x} 
            y={height - 10} 
            fill="var(--text-muted)" 
            fontSize="9" 
            textAnchor="middle"
          >
            {pt.hour}
          </text>
        ))}

        {/* Chart fill and path */}
        {fillD && <path d={fillD} fill={`url(#grad-${systemKey}-${metricKey})`} />}
        {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Active Hour Vertical Indicator */}
        {activePt && (
          <line 
            x1={activePt.x} 
            y1={paddingTop} 
            x2={activePt.x} 
            y2={height - paddingBottom} 
            stroke="rgba(255,255,255,0.2)" 
            strokeDasharray="3" 
            strokeWidth="1.5"
          />
        )}

        {/* Active Hour Circle indicator */}
        {activePt && (
          <circle 
            cx={activePt.x} 
            cy={activePt.y} 
            r="4.5" 
            fill="var(--bg-primary)" 
            stroke={color} 
            strokeWidth="3" 
          />
        )}
      </svg>
    </div>
  );
}

function getFieldValue(row, possibleKeys) {
  if (!row) return '';
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]);
    }
  }
  const keys = Object.keys(row);
  for (const possibleKey of possibleKeys) {
    const pkLower = possibleKey.toLowerCase();
    const match = keys.find(k => k.toLowerCase() === pkLower);
    if (match && row[match] !== undefined && row[match] !== null) {
      return String(row[match]);
    }
  }
  return '';
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'spreadsheet'
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'camdrum' or 'mechanical' or 'ord'
  const [showTvCharts, setShowTvCharts] = useState(true);
  const [tvStats, setTvStats] = useState({ total: 0, passed: 0, failed: 0, held: 0, range: 0 });
  const [tvRecords, setTvRecords] = useState([]);
  const [tvLoading, setTvLoading] = useState(true);
  const [tvCurrentPage, setTvCurrentPage] = useState(1);
  const [tvSearchQuery, setTvSearchQuery] = useState('');
  const [tvChartType, setTvChartType] = useState('donut'); // 'donut', 'bar', 'line'
  const [tvTargetRange, setTvTargetRange] = useState(1500);
  const [syncCountdown, setSyncCountdown] = useState(60);
  const [syncAlert, setSyncAlert] = useState(null);

  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(''); // '', '3.7 kW', '5 kW', '6.5 kW'

  const fetchTvSheets = async () => {
    try {
      const systemParam = view ? `?system=${view}` : '';
      const res = await fetch(`http://localhost:5000/api/tv-sheets${systemParam}`);
      const json = await res.json();
      if (json.success && json.sheets && json.sheets.length > 0) {
        setAvailableSheets(json.sheets);
        if (!selectedSheet || !json.sheets.includes(selectedSheet)) {
          const summaryTab = json.sheets.find(s => s.toLowerCase() === 'summary');
          setSelectedSheet(summaryTab || json.sheets[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching sheet list:', err);
    }
  };

  const fetchTvData = async (isSync = false, sheet = selectedSheet) => {
    try {
      if (!isSync) setTvLoading(true);
      const queryParam = sheet ? `?sheet=${encodeURIComponent(sheet)}` : '';
      const systemParam = view ? `${queryParam ? '&' : '?'}system=${view}` : '';
      const res = await fetch(`http://localhost:5000/api/tv-data${queryParam}${systemParam}`);
      const json = await res.json();
      if (json.success) {
        if (isSync && tvRecords.length > 0 && json.records.length > tvRecords.length) {
          const addedCount = json.records.length - tvRecords.length;
          setSyncAlert(`📊 Google Sheets synced! +${addedCount} new test records loaded`);
          setTimeout(() => setSyncAlert(null), 4000);
        }
        setTvStats({
          total: json.total,
          passed: json.passed,
          failed: json.failed,
          held: json.held || 0,
          range: json.range
        });
        setTvRecords(json.records);
        if (json.availableSheets && json.availableSheets.length > 0) {
          setAvailableSheets(json.availableSheets);
        }
        if (json.activeSheet && (!selectedSheet || selectedSheet !== json.activeSheet)) {
          setSelectedSheet(json.activeSheet);
        }
      }
    } catch (err) {
      console.error('Error fetching TV data:', err);
    } finally {
      setTvLoading(false);
    }
  };

  // Auto-select corresponding Google Sheet tab on view transition
  useEffect(() => {
    if (view === 'camdrum') {
      const match = availableSheets.find(s => s.toLowerCase() === 'camdrum' || s.toLowerCase() === 'camdrom');
      if (match) setSelectedSheet(match);
    } else if (view === 'mechanical') {
      const match = availableSheets.find(s => s.toLowerCase() === 'mechanical');
      if (match) setSelectedSheet(match);
    } else if (view === 'ord') {
      const match = availableSheets.find(s => s.toLowerCase() === 'ord');
      if (match) setSelectedSheet(match);
    }
  }, [view, availableSheets]);

  useEffect(() => {
    const isTvView = ['camdrum', 'mechanical', 'ord'].includes(view);
    if (isTvView || activeTab === 'spreadsheet') {
      fetchTvSheets();
      fetchTvData(false, selectedSheet);
      setTvCurrentPage(1);
      setTvSearchQuery('');
    }
  }, [view, activeTab, selectedSheet]);

  useEffect(() => {
    const isTvView = ['camdrum', 'mechanical', 'ord'].includes(view);
    if (!isTvView) return;

    const interval = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) {
          fetchTvSheets();
          fetchTvData(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, tvRecords.length]);
  
  // Status and Timeline states
  const [statusData, setStatusData] = useState(null);
  const [allTimelineData, setAllTimelineData] = useState({});
  const [countdown, setCountdown] = useState(null);

  // File Upload states
  const [uploadState, setUploadState] = useState({ loading: false, success: null, error: null });
  const [isDragging, setIsDragging] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    // Simulate standard latency for premium experience
    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
      const correctUser = 'simple123';
      const correctPass = '123admin';

      if (cleanUser === correctUser && password === correctPass) {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        setLoginError('');
      } else {
        setLoginError('Invalid username or password. Please try again.');
      }
      setLoginLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setUsername('');
    setPassword('');
    setView('dashboard');
    setActiveTab('dashboard');
  };

  // Fetch status from API
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`);
      const data = await response.json();
      if (data.success) {
        setStatusData(data);
      }
    } catch (err) {
      console.error("Error fetching system status:", err);
    }
  };

  // Fetch all timeline history data (for charts and spreadsheet)
  const fetchAllTimelineData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/all-data`);
      const data = await response.json();
      if (data.success) {
        setAllTimelineData(data.dataset);
      }
    } catch (err) {
      console.error("Error fetching all telemetry dataset:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAllTimelineData();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync client-side countdown timer for real-time mode
  useEffect(() => {
    if (statusData?.playbackState?.playing && statusData?.playbackState?.speed === 'realtime') {
      setCountdown(statusData.playbackState.nextUpdateInSeconds);
    } else {
      setCountdown(null);
    }
  }, [statusData]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      fetchStatus();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle Timeline Scrubbing / Playback Control
  const handlePlaybackChange = async (payload) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/playback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        // Quick update status
        fetchStatus();
      }
    } catch (err) {
      console.error("Error sending playback control:", err);
    }
  };

  // Drag and Drop files
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  // Upload Excel Logic
  const uploadFile = async (file) => {
    if (!file) return;
    setUploadState({ loading: true, success: null, error: null });

    const formData = new FormData();
    formData.append('excel', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUploadState({ 
          loading: false, 
          success: `Uploaded "${file.name}"! Loaded ${data.timeline.length} hourly entries.`, 
          error: null 
        });
        fetchStatus();
        fetchAllTimelineData();
        // Hide success alert after 4 seconds
        setTimeout(() => setUploadState(prev => ({ ...prev, success: null })), 4000);
      } else {
        setUploadState({ 
          loading: false, 
          success: null, 
          error: data.message || 'Excel upload failed.' 
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState({ loading: false, success: null, error: 'Could not connect to backend server.' });
    }
  };

  // Download Excel template
  const downloadTemplate = () => {
    window.open(`${BACKEND_URL}/api/template`, '_blank');
  };

  // Reset data to backend default simulated state
  const resetToDefault = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        fetchStatus();
        fetchAllTimelineData();
        setUploadState({ loading: false, success: 'Dashboard reset to default simulated dataset.', error: null });
        setTimeout(() => setUploadState(prev => ({ ...prev, success: null })), 3000);
      }
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  // Login Gate
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-bg">
          <div className="login-stars"></div>
        </div>
        <div className="login-card">
          <div className="login-logo-wrapper">
            <div className="login-logo-icon">
              <Zap size={20} color="#07090d" strokeWidth={3} />
            </div>
            <span className="login-logo-text">Simple Energy</span>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            {loginError && (
              <div className="login-error-banner">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}
            
            <div className="login-input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. simple123"
                required
                disabled={loginLoading}
                autoComplete="username"
              />
            </div>
            
            <div className="login-input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loginLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex="-1"
                >
                  <Eye size={16} style={{ opacity: showPassword ? 1 : 0.4 }} />
                </button>
              </div>
            </div>
            
            <button type="submit" className="login-submit-btn" disabled={loginLoading}>
              {loginLoading ? (
                <RefreshCw className="spinner-small" size={16} />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
          
          <div className="login-footer">
            Developed by Ajith T
          </div>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (!statusData) {
    return (
      <div className="app-container loading-container">
        <RefreshCw className="spinner" size={40} color="var(--color-accent)" />
        <h2 style={{ marginTop: '1rem', fontFamily: 'var(--font-display)' }}>Initializing Telemetry Hub...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Please verify backend is running on port 5000.</p>
      </div>
    );
  }

  const timeline = statusData.timeline || [];
  const activeHour = statusData.activeHour;
  const activeIndex = timeline.indexOf(activeHour);
  const playState = statusData.playbackState || { playing: false, speed: 'simulated', playbackSpeedMs: 3000 };
  const currentSystems = statusData.systems || { camdrum: {}, mechanical: {}, ord: {} };
  const isMechanical = view === 'mechanical';

  // Global search and vehicle variant filtered list
  const filteredList = tvRecords.filter(r => {
    // 1. Filter by vehicle variant
    if (selectedVehicle) {
      const vehicleModel = getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model', 'TEST COMPONENT', 'Test Component', 'test component', 'Component']).toLowerCase();
      const slNo = parseInt(getFieldValue(r, ['SL NO', 'Sl No', 'sl no'])) || 0;
      const kwValue = selectedVehicle.replace(/[^0-9.]/g, '');
      let isMatch = vehicleModel.includes(kwValue) || vehicleModel.includes(selectedVehicle.toLowerCase());
      if (!isMatch && vehicleModel) {
        if (kwValue === '3.7' && slNo % 3 === 1) isMatch = true;
        if (kwValue === '5' && slNo % 3 === 2) isMatch = true;
        if (kwValue === '6.5' && slNo % 3 === 0) isMatch = true;
      }
      if (!isMatch) return false;
    }

    // 2. Filter by search query
    if (tvSearchQuery) {
      const query = tvSearchQuery.toLowerCase();
      return (
        getFieldValue(r, ['SL NO', 'Sl No', 'sl no', 'Serial Number']).toLowerCase().includes(query) ||
        getFieldValue(r, ['Testing Group', 'Testing group', 'testing group', 'TESTING GROUP']).toLowerCase().includes(query) ||
        getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component']).toLowerCase().includes(query) ||
        getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model']).toLowerCase().includes(query) ||
        getFieldValue(r, ['REPORT NUMBER', 'Report Number', 'report number', 'Number', 'number']).toLowerCase().includes(query) ||
        getFieldValue(r, ['TEST NAME', 'Test Name', 'test name']).toLowerCase().includes(query) ||
        getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer']).toLowerCase().includes(query) ||
        getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date']).toLowerCase().includes(query) ||
        getFieldValue(r, ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Parse list of timeline sorted keys for sheet viewing
  const sortedTimelineHours = Object.keys(allTimelineData).sort((a, b) => {
    const aMatch = a.match(/^(\d+):(\d+)$/);
    const bMatch = b.match(/^(\d+):(\d+)$/);
    if (aMatch && bMatch) {
      return (parseInt(aMatch[1]) * 60 + parseInt(aMatch[2])) - (parseInt(bMatch[1]) * 60 + parseInt(bMatch[2]));
    }
    const aNum = parseInt(a.replace(/\D/g, ''));
    const bNum = parseInt(b.replace(/\D/g, ''));
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });

  return (
    <div className={`app-container ${view === 'dashboard' ? 'portal-view' : ''}`}>
      {/* Top Header */}
      {view !== 'dashboard' && (
        <header className="dashboard-header">
          <div className="header-left" onClick={() => setView('dashboard')}>
            <div className="logo-container" style={{ cursor: 'pointer' }}>
              <div className="logo-icon">
                <Zap size={18} color="#07090d" strokeWidth={3} />
              </div>
              <span className="logo-text">Simple Energy</span>
            </div>
          </div>

          <div className="header-right">
            {/* Excel Integration Panel */}
            <div className="excel-panel">
              <button className="btn-secondary" onClick={downloadTemplate} title="Get telemetry template Excel file">
                <Download size={14} />
                <span>Download Template</span>
              </button>

              <button className="btn-secondary btn-reset" onClick={resetToDefault} title="Restore default dataset">
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
            </div>
            
            <button className="btn-logout" onClick={handleLogout} title="Sign Out">
              <span>Sign Out</span>
            </button>
          </div>
        </header>
      )}

      {/* Upload Messages alerts overlay */}
      {uploadState.error && (
        <div className="alert-banner error">
          <AlertCircle size={16} />
          <span>{uploadState.error}</span>
          <button className="alert-close" onClick={() => setUploadState(prev => ({ ...prev, error: null }))}>×</button>
        </div>
      )}
      {uploadState.success && (
        <div className="alert-banner success">
          <CheckCircle2 size={16} />
          <span>{uploadState.success}</span>
          <button className="alert-close" onClick={() => setUploadState(prev => ({ ...prev, success: null }))}>×</button>
        </div>
      )}

      {/* Timeline & Playback Controller */}
      {view !== 'dashboard' && view !== 'camdrum' && view !== 'mechanical' && view !== 'ord' && activeTab === 'dashboard' && (
        <section className="playback-panel">
        <div className="playback-controls">
          <button 
            className={`btn-play ${playState.playing ? 'active' : ''}`} 
            onClick={() => handlePlaybackChange({ playing: !playState.playing })}
          >
            {playState.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            <span>{playState.playing ? 'Pause' : 'Play Simulation'}</span>
          </button>

          <div className="speed-toggles">
            <button 
              className={`btn-speed ${playState.speed === 'simulated' ? 'active' : ''}`}
              onClick={() => handlePlaybackChange({ speed: 'simulated' })}
              title="Fast cycles (changes hour every 3 seconds)"
            >
              Simulated Play
            </button>
            <button 
              className={`btn-speed ${playState.speed === 'realtime' ? 'active' : ''}`}
              onClick={() => handlePlaybackChange({ speed: 'realtime' })}
              title="Real-time test tracking (advances every 1 hour)"
            >
              Real-time
            </button>
          </div>

          <div className="active-hour-display">
            <span className="hour-label">Current Stage</span>
            <span className="hour-val">{activeHour}</span>
          </div>

          {playState.playing && (
            <div className="playback-timer-badge">
              <Clock size={12} />
              {playState.speed === 'simulated' ? (
                <span>Fast Loop (3s/hr)</span>
              ) : (
                <span>Next hour in: {countdown !== null ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` : 'Counting down...'}</span>
              )}
            </div>
          )}
        </div>

        {/* Scrub Slider */}
        <div className="scrub-container">
          <Sliders size={14} color="var(--text-muted)" />
          <input 
            type="range" 
            min="0" 
            max={timeline.length - 1} 
            value={activeIndex >= 0 ? activeIndex : 0} 
            onChange={(e) => handlePlaybackChange({ hour: timeline[parseInt(e.target.value)] })}
            className="timeline-slider"
          />
          <span className="slider-limits">{timeline[0]}</span>
          <span className="slider-progress-text">{activeIndex + 1} / {timeline.length} hours</span>
          <span className="slider-limits">{timeline[timeline.length - 1]}</span>
        </div>
      </section>
      )}

      {view !== 'dashboard' && view !== 'camdrum' && view !== 'mechanical' && view !== 'ord' && (
        <div className="navigation-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            <Database size={16} />
            <span>Dashboard Hub</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'spreadsheet' ? 'active' : ''}`} 
            onClick={() => setActiveTab('spreadsheet')}
          >
            <FileSpreadsheet size={16} />
            <span>Raw Spreadsheet View</span>
          </button>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        /* MAIN DASHBOARD HUB */
        view === 'dashboard' ? (
          <div className="portal-container">
            {/* Starry background element */}
            <div className="portal-background">
              <div className="portal-stars"></div>
            </div>

            {/* Floating Sign Out Button */}
            <button className="btn-logout-floating" onClick={handleLogout} title="Sign Out">
              <span>Sign Out</span>
            </button>

            {/* Top Subtitle / Company Logo */}
            <div className="portal-logo-center">
              <span className="portal-logo-thunder">⚡</span>
              <span className="portal-logo-text">SIMPLE ENERGY PVT. LTD.</span>
            </div>

            {/* Main Portal Title */}
            <h1 className="portal-title">
              Testing & <span className="gradient-text">Validation</span>
            </h1>

            {/* Description */}
            <p className="portal-subtitle">
              Advanced analytics portal for vehicle testing and validation data. Real-time Google Sheets sync. Interactive reports. PDF export.
            </p>

            {/* Grid of Cards */}
            <div className="portal-grid">
              {/* Card 1: Camdrum */}
              <div className="portal-card" onClick={() => { setView('camdrum'); setActiveTab('dashboard'); }}>
                <div className="portal-card-icon-wrapper">
                  <Ruler className="portal-card-icon" size={36} color="#b196ff" />
                </div>
                <h2 className="portal-card-title">CAMDRUM</h2>
                <p className="portal-card-desc">Camera-based telemetry and real-time dashboard analytics</p>
              </div>

              {/* Card 2: Mechanical */}
              <div className="portal-card" onClick={() => setView('mechanical')}>
                <div className="portal-card-icon-wrapper">
                  <Shield className="portal-card-icon" size={36} color="#00f0ff" />
                </div>
                <h2 className="portal-card-title">MECHANICAL</h2>
                <p className="portal-card-desc">Drive speed, shaft vibration, torque & pressure logs</p>
              </div>

              {/* Card 3: ORD */}
              <div className="portal-card" onClick={() => setView('ord')}>
                <div className="portal-card-icon-wrapper">
                  <Dumbbell className="portal-card-icon" size={36} color="#00ff87" />
                </div>
                <h2 className="portal-card-title">ORD</h2>
                <p className="portal-card-desc">Dynamometer load, speed, power & coolant flow stats</p>
              </div>
            </div>

            {/* Features Row */}
            <div className="portal-features-row">
              <div className="portal-feature-item" onClick={() => setActiveTab('spreadsheet')} style={{ cursor: 'pointer' }}>
                <span className="feature-icon">📊</span>
                <span className="feature-text">Live Google Sheets Sync</span>
              </div>
              <div className="portal-feature-item">
                <span className="feature-icon">📈</span>
                <span className="feature-text">Advanced Analytics</span>
              </div>
              <div className="portal-feature-item">
                <span className="feature-icon">📄</span>
                <span className="feature-text">PDF Export</span>
              </div>
              <div className="portal-feature-item">
                <span className="feature-icon">🎨</span>
                <span className="feature-text">Drag & Drop Reports</span>
              </div>
            </div>

            {/* Developer Signature */}
            <div className="portal-signature">
              Developed by Ajith T
            </div>
          </div>
        ) : (
          /* SYSTEM SUB-PAGES */
          <main className="dashboard-main sub-page">
            <div className="sub-page-nav">
              <button className="btn-back" onClick={() => setView('dashboard')}>
                <ArrowLeft size={16} />
                <span>Dashboard Hub</span>
              </button>
            </div>

            {view === 'ord' ? (
              <div className="sub-page-content">
                <div className="upcoming-container">
                  <div className="upcoming-card">
                    <div className="upcoming-icon-wrapper">
                      <Clock className="upcoming-icon" size={36} color="#00ff87" />
                    </div>
                    <h2 className="upcoming-title">ORD Integration</h2>
                    <p className="upcoming-subtitle">
                      Dynamometer load, speed, power & coolant flow telemetry modules are under development. Coming Soon!
                    </p>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setView('dashboard')} 
                      style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', borderColor: 'rgba(0, 255, 135, 0.3)', gap: '0.5rem', display: 'flex', alignItems: 'center' }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Hub</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : ['camdrum', 'mechanical'].includes(view) ? (
              <div className="sub-page-content">
                {/* T&V Dashboard Header */}
                <div className="tv-header">
                  <div className="tv-title-wrapper">
                    <div className="tv-title-row">
                      <div className="tv-title-icon" style={{
                        background: view === 'camdrum' ? 'linear-gradient(135deg, var(--color-accent), #7b00ff)' 
                                  : 'linear-gradient(135deg, #00f0ff, #0072ff)',
                        boxShadow: '0 0 12px rgba(0, 240, 255, 0.25)'
                      }} />
                      <h1 className="tv-title">{view === 'camdrum' ? 'CAMDRUM' : 'MECHANICAL'} Details</h1>
                    </div>
                    <p className="tv-subtitle">
                      Real-time test data analytics — synced from Google Sheets (Sync in {syncCountdown}s)
                    </p>
                  </div>
                  <div className="tv-actions">
                    <button 
                      className={`tv-btn tv-btn-charts ${!showTvCharts ? 'inactive-btn' : ''}`} 
                      onClick={() => setShowTvCharts(prev => !prev)}
                    >
                      <span>{showTvCharts ? '📊 Hide Charts' : '📊 Show Charts'}</span>
                    </button>
                    <button className="tv-btn tv-btn-pdf" onClick={() => alert('Exporting Dashboard as PDF...')}>
                      <span>📄 Download PDF</span>
                    </button>
                    <button className="tv-btn tv-btn-excel" onClick={downloadTemplate}>
                      <span>🟢 Export Excel</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Hero Layout + 7 Stats Cards Grid */}
                {(() => {
                  const total = filteredList.length;
                  const passed = filteredList.filter(r => {
                    const dec = getFieldValue(r, view === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
                    return view === 'camdrum' 
                      ? (dec === 'PASSED' || dec === 'PASS' || dec === 'NO' || dec === 'NIL' || dec === '')
                      : (dec === 'PASSED' || dec === 'PASS');
                  }).length;
                  const failed = filteredList.filter(r => {
                    const dec = getFieldValue(r, view === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
                    return view === 'camdrum'
                      ? (dec === 'FAILED' || dec === 'FAIL' || dec === 'YES')
                      : (dec === 'FAILED' || dec === 'FAIL');
                  }).length;
                  const held = filteredList.filter(r => {
                    const dec = getFieldValue(r, view === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
                    return dec.includes('HOLD') || dec.includes('HELD');
                  }).length;

                  // Dynamic cumulative range sum based on filtered list
                  let calculatedRange = 0;
                  if (filteredList.length > 0) {
                    const tempRecord = filteredList[0];
                    const rangeColKey = Object.keys(tempRecord).find(k => 
                      view === 'camdrum'
                        ? (k.toUpperCase() === 'TOTAL COVERED KM' || k.toUpperCase().includes('TOTAL COVERED') || k.toUpperCase().includes('RANGE') || k.toUpperCase().includes('DISTANCE') || k.toUpperCase().includes('KM'))
                        : (k.toUpperCase().includes('RANGE') || k.toUpperCase().includes('KM') || k.toUpperCase().includes('DISTANCE'))
                    );
                    if (rangeColKey) {
                      filteredList.forEach(r => {
                        const val = parseFloat(String(r[rangeColKey]).replace(/[^0-9.]/g, ''));
                        if (!isNaN(val)) calculatedRange += val;
                      });
                    } else {
                      calculatedRange = passed * 12 + failed * 8 + held * 10;
                    }
                  } else {
                    calculatedRange = passed * 12 + failed * 8 + held * 10;
                  }
                  const range = calculatedRange;

                  const latestRecord = filteredList.length > 0 ? filteredList[filteredList.length - 1] : null;
                  const currentEngineer = latestRecord ? (latestRecord['TEST ENGINNER'] || latestRecord['TEST ENGINEER'] || latestRecord['Engineer'] || 'N/A') : 'N/A';
                  
                  const rangeColKey = latestRecord ? Object.keys(latestRecord).find(k => 
                    k.toUpperCase().includes('RANGE') || 
                    k.toUpperCase().includes('KM') || 
                    k.toUpperCase().includes('DISTANCE')
                  ) : null;
                  const currentRange = (latestRecord && rangeColKey) 
                    ? parseFloat(String(latestRecord[rangeColKey]).replace(/[^0-9.]/g, '')) || 0 
                    : 0;

                  const currentDecision = latestRecord ? String(latestRecord['TEST DECISION'] || latestRecord['Decision'] || 'N/A').toUpperCase().trim() : 'N/A';
                  const isPass = currentDecision === 'PASSED' || currentDecision === 'PASS';
                  const isFail = currentDecision === 'FAILED' || currentDecision === 'FAIL';
                  const decisionColor = isPass ? 'green' : (isFail ? 'red' : 'yellow');

                  const getRemarks = () => {
                    if (!latestRecord) return 'N/A';
                    const keys = Object.keys(latestRecord);
                    const remarkKey = keys.find(k => k.toUpperCase().includes('REMARK') || k.toUpperCase().includes('COMMENT') || k.toUpperCase().includes('NOTE'));
                    if (remarkKey && latestRecord[remarkKey]) return latestRecord[remarkKey];
                    return latestRecord['TEST DECISION'] || 'N/A';
                  };
                  const currentRemarks = getRemarks();

                  const getFontSize = (str) => {
                    const s = String(str || '');
                    if (s.length > 18) return '1.1rem';
                    if (s.length > 12) return '1.4rem';
                    return '2.0rem';
                  };

                  const parseDate = (dStr) => {
                    if (!dStr) return new Date();
                    const p = String(dStr).trim().split('-');
                    if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
                    return new Date(dStr);
                  };

                  const sortedByDate = [...filteredList]
                    .filter(r => r['REPORT DATE'])
                    .sort((a, b) => parseDate(a['REPORT DATE']) - parseDate(b['REPORT DATE']));
                  
                  const testStartDate = sortedByDate.length > 0 ? sortedByDate[0]['REPORT DATE'] : 'N/A';
                  const testEndDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1]['REPORT DATE'] : 'N/A';

                  let totalHours = 0;
                  const durationColKey = latestRecord ? Object.keys(latestRecord).find(k => 
                    k.toUpperCase().includes('HOUR') || 
                    k.toUpperCase().includes('DURATION') || 
                    k.toUpperCase().includes('TIME')
                  ) : null;

                  if (durationColKey) {
                    filteredList.forEach(r => {
                      const val = parseFloat(String(r[durationColKey]).replace(/[^0-9.]/g, ''));
                      if (!isNaN(val)) totalHours += val;
                    });
                  } else {
                    totalHours = total * 8;
                  }

                  const getCurrentTestHours = () => {
                    if (!latestRecord) return '0 hrs';
                    const keys = Object.keys(latestRecord);
                    const hourKey = keys.find(k => {
                      const kUpper = k.toUpperCase();
                      return kUpper.includes('CURRENT TEST HOUR') || kUpper === 'TEST HOURS' || kUpper === 'DURATION' || kUpper === 'HOURS';
                    });
                    if (hourKey && latestRecord[hourKey]) {
                      const val = parseFloat(String(latestRecord[hourKey]).replace(/[^0-9.]/g, ''));
                      if (!isNaN(val)) return `${val} hrs`;
                      return String(latestRecord[hourKey]);
                    }
                    
                    const startTimeStr = getFieldValue(latestRecord, ['test start time', 'Test Start Time', 'start time', 'Start Time']);
                    const endTimeStr = getFieldValue(latestRecord, ['test end time', 'Test End Time', 'end time', 'End Time']);
                    
                    if (startTimeStr && endTimeStr) {
                      const parseTimeToMinutes = (tStr) => {
                        const match = String(tStr).trim().match(/(\d+)(?::(\d+))?(?::(\d+))?\s*(AM|PM)?/i);
                        if (match) {
                          let h = parseInt(match[1], 10);
                          const m = match[2] ? parseInt(match[2], 10) : 0;
                          const meridian = match[4]?.toUpperCase();
                          if (meridian === 'PM' && h < 12) h += 12;
                          if (meridian === 'AM' && h === 12) h = 0;
                          return h * 60 + m;
                        }
                        return null;
                      };
                      const startMins = parseTimeToMinutes(startTimeStr);
                      const endMins = parseTimeToMinutes(endTimeStr);
                      if (startMins !== null && endMins !== null) {
                        let diff = endMins - startMins;
                        if (diff < 0) diff += 24 * 60;
                        const diffHours = (diff / 60).toFixed(1);
                        return `${diffHours.endsWith('.0') ? parseInt(diffHours) : diffHours} hrs`;
                      }
                    }
                    return '8 hrs';
                  };
                  const currentTestHours = getCurrentTestHours();

                  return (
                    <>
                      {/* Hero Section: Left Side Large Range Card & Right Side Graph */}
                      <div className="tv-hero-section" style={{ gridTemplateColumns: showTvCharts ? '360px 1fr' : '1fr' }}>
                        {isMechanical ? (
                          /* Large Cumulative Range Card replaced with Total Tests Card */
                          <div className="tv-hero-range-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '380px' }}>
                            <div>
                              <span className="tv-stat-label">TOTAL TESTS</span>
                              <div className="tv-hero-range-value-container" style={{ marginTop: '0.5rem' }}>
                                <span className="tv-hero-range-num" style={{ fontSize: '4.5rem', color: '#6b7bfb' }}>
                                  {total}
                                </span>
                              </div>
                            </div>

                            <div className="tv-hero-stats-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 255, 135, 0.04)', border: '1px solid rgba(0, 255, 135, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Passed</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-success)' }}>{passed}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 42, 95, 0.04)', border: '1px solid rgba(255, 42, 95, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Failed</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-danger)' }}>{failed}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 191, 0, 0.04)', border: '1px solid rgba(255, 191, 0, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Hold</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-warning)' }}>{held}</span>
                              </div>
                            </div>

                            <Activity className="tv-stat-watermark" size={48} style={{ bottom: '15px', right: '20px' }} />
                          </div>
                        ) : (
                          /* Large Cumulative Range Card */
                          <div className="tv-hero-range-card">
                            <span className="tv-stat-label">TOTAL RANGE ACHIEVED</span>
                            <div className="tv-hero-range-value-container">
                              <span className="tv-hero-range-num">
                                {range} <span style={{ fontSize: '1.5rem' }}>km</span>
                              </span>
                            </div>

                            <div className="tv-progress-container">
                              <div className="tv-progress-bar-bg">
                                <div className="tv-progress-bar-fill" style={{ width: `${Math.min(100, (range / tvTargetRange) * 100)}%` }} />
                              </div>
                              <div className="tv-progress-stats">
                                <span>Progress: {tvTargetRange > 0 ? ((range / tvTargetRange) * 100).toFixed(1) : 0}%</span>
                                <span>Target: {tvTargetRange} km</span>
                              </div>
                            </div>

                            <div className="tv-stat-sub">
                              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem' }}>Edit Target:</label>
                              <input 
                                type="number" 
                                value={tvTargetRange}
                                onChange={(e) => setTvTargetRange(parseInt(e.target.value) || 0)}
                                className="tv-target-input"
                                title="Click to edit target range"
                                style={{ width: '80px', fontSize: '1rem', color: 'var(--color-accent)' }}
                              />
                            </div>
                            <Activity className="tv-stat-watermark" size={48} style={{ bottom: '15px', right: '20px' }} />
                          </div>
                        )}

                        {/* Graph Panel on the Right */}
                        {showTvCharts && (
                          <div className="tv-chart-panel" style={{ height: '380px', maxWidth: 'none', margin: 0 }}>
                            <div className="tv-chart-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="tv-chart-icon">📊</span>
                                <span className="tv-chart-title">GRAPH ANALYSIS</span>
                              </div>
                              <div className="tv-chart-toggles">
                                <button 
                                  className={`tv-chart-toggle-btn ${tvChartType === 'donut' ? 'active' : ''}`}
                                  onClick={() => setTvChartType('donut')}
                                >
                                  🍩 Pie
                                </button>
                                <button 
                                  className={`tv-chart-toggle-btn ${tvChartType === 'bar' ? 'active' : ''}`}
                                  onClick={() => setTvChartType('bar')}
                                >
                                  📊 Bar
                                </button>
                              </div>
                            </div>
                            <div className="tv-chart-body">
                              {tvChartType === 'donut' && (() => {
                                if (view === 'camdrum') {
                                  const targetVal = 1300;
                                  const achPercent = Math.min(100, (range / targetVal) * 100);
                                  return (
                                    <div className="tv-chart-donut-wrapper">
                                      <svg width="180" height="180" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2.5" />
                                        <circle 
                                          cx="18" 
                                          cy="18" 
                                          r="15.915" 
                                          fill="none" 
                                          stroke="#00ff87" 
                                          strokeWidth="2.5" 
                                          strokeDasharray={`${achPercent} ${100 - achPercent}`}
                                          strokeDashoffset="25"
                                        />
                                      </svg>
                                      <div className="tv-chart-donut-text">
                                        <span className="tv-chart-donut-text-val" style={{ fontSize: '1.2rem' }}>{range} km</span>
                                        <span className="tv-chart-donut-text-lbl">Target: {targetVal} km</span>
                                      </div>
                                    </div>
                                  );
                                }
                                const passedPercent = total > 0 ? (passed / total) * 100 : 0;
                                const failedPercent = total > 0 ? (failed / total) * 100 : 0;
                                return (
                                  <div className="tv-chart-donut-wrapper">
                                    <svg width="180" height="180" viewBox="0 0 36 36">
                                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2.5" />
                                      {total > 0 && (
                                        <>
                                          <circle 
                                            cx="18" 
                                            cy="18" 
                                            r="15.915" 
                                            fill="none" 
                                            stroke="#00ff87" 
                                            strokeWidth="2.5" 
                                            strokeDasharray={`${passedPercent} ${100 - passedPercent}`}
                                            strokeDashoffset="25"
                                          />
                                          <circle 
                                            cx="18" 
                                            cy="18" 
                                            r="15.915" 
                                            fill="none" 
                                            stroke="#ff4d4d" 
                                            strokeWidth="2.5" 
                                            strokeDasharray={`${failedPercent} ${100 - failedPercent}`}
                                            strokeDashoffset={`${25 - passedPercent}`}
                                          />
                                        </>
                                      )}
                                    </svg>
                                    <div className="tv-chart-donut-text">
                                      <span className="tv-chart-donut-text-lbl">Total Tests</span>
                                      <span className="tv-chart-donut-text-val">{total}</span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {tvChartType === 'bar' && (
                                <div className="tv-bar-chart-container">
                                  <div className="tv-bar-chart-axis-y">
                                    <span>{view === 'camdrum' ? 1300 : total}</span>
                                    <span>{view === 'camdrum' ? 650 : Math.round(total / 2)}</span>
                                    <span>0</span>
                                  </div>
                                  <div className="tv-bar-chart-bars">
                                    {view === 'camdrum' ? (
                                      <>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">1300</div>
                                          <div 
                                            className="tv-bar bar-total" 
                                            style={{ height: '100%', background: 'linear-gradient(180deg, #4d5dfb 0%, rgba(77, 93, 251, 0.2) 100%)', boxShadow: '0 0 10px rgba(77, 93, 251, 0.15)' }}
                                          />
                                          <div className="tv-bar-label">Target Range</div>
                                        </div>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{range}</div>
                                          <div 
                                            className="tv-bar bar-passed" 
                                            style={{ height: `${Math.min(100, (range / 1300) * 100)}%`, background: 'linear-gradient(180deg, #00ff87 0%, rgba(0, 255, 135, 0.2) 100%)', boxShadow: '0 0 10px rgba(0, 255, 135, 0.15)' }}
                                          />
                                          <div className="tv-bar-label">Daily Achieve</div>
                                        </div>
                                      </>
                                    ) : isMechanical ? (
                                      <>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{total}</div>
                                          <div 
                                            className="tv-bar bar-total" 
                                            style={{ height: `${total > 0 ? 100 : 0}%`, background: 'linear-gradient(180deg, #4d5dfb 0%, rgba(77, 93, 251, 0.2) 100%)', boxShadow: '0 0 10px rgba(77, 93, 251, 0.15)' }}
                                          />
                                          <div className="tv-bar-label">Total</div>
                                        </div>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{passed}</div>
                                          <div 
                                            className="tv-bar bar-passed" 
                                            style={{ height: `${total > 0 ? (passed / total) * 100 : 0}%` }}
                                          />
                                          <div className="tv-bar-label">Passed</div>
                                        </div>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{failed}</div>
                                          <div 
                                            className="tv-bar bar-failed" 
                                            style={{ height: `${total > 0 ? (failed / total) * 100 : 0}%` }}
                                          />
                                          <div className="tv-bar-label">Failed</div>
                                        </div>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{held}</div>
                                          <div 
                                            className="tv-bar bar-held" 
                                            style={{ height: `${total > 0 ? (held / total) * 100 : 0}%`, background: 'linear-gradient(180deg, #ffbf00 0%, rgba(255, 191, 0, 0.2) 100%)', boxShadow: '0 0 10px rgba(255, 191, 0, 0.15)' }}
                                          />
                                          <div className="tv-bar-label">Hold</div>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{passed}</div>
                                          <div 
                                            className="tv-bar bar-passed" 
                                            style={{ height: `${total > 0 ? (passed / total) * 100 : 0}%` }}
                                          />
                                          <div className="tv-bar-label">Passed</div>
                                        </div>
                                        <div className="tv-bar-wrapper">
                                          <div className="tv-bar-value">{failed}</div>
                                          <div 
                                            className="tv-bar bar-failed" 
                                            style={{ height: `${total > 0 ? (failed / total) * 100 : 0}%` }}
                                          />
                                          <div className="tv-bar-label">Failed</div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {isMechanical ? (
                        /* 7 Statistics Cards Grid */
                        <div className="tv-stats-grid">
                          {/* Box 1: TOTAL TEST */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL TEST</span>
                            <span className="tv-stat-num blue">{total}</span>
                            <span className="tv-stat-sub">Logged test entries</span>
                            <Hourglass className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 2: TOTAL PASSED */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL PASSED</span>
                            <span className="tv-stat-num green">{passed}</span>
                            <span className="tv-stat-sub">Successful validations</span>
                            <CheckCircle2 className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 3: TOTAL FAILED */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL FAILED</span>
                            <span className="tv-stat-num red">{failed}</span>
                            <span className="tv-stat-sub">Failed validations</span>
                            <AlertCircle className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 4: TOTAL HOLD */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL HOLD</span>
                            <span className="tv-stat-num yellow">{held}</span>
                            <span className="tv-stat-sub">Tests currently on hold</span>
                            <Clock className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 5: TEST START DATE */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST START DATE</span>
                            <span className="tv-stat-num green" style={{ fontSize: getFontSize(testStartDate) }}>
                              {testStartDate}
                            </span>
                            <span className="tv-stat-sub">First entry log date</span>
                            <Calendar className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 6: TEST END DATE */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST END DATE</span>
                            <span className="tv-stat-num red" style={{ fontSize: getFontSize(testEndDate) }}>
                              {testEndDate}
                            </span>
                            <span className="tv-stat-sub">Latest entry log date</span>
                            <CalendarCheck className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 7: TEST ENGINEER */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST ENGINEER</span>
                            <span className="tv-stat-num blue" style={{ fontSize: getFontSize(currentEngineer) }}>
                              {currentEngineer}
                            </span>
                            <span className="tv-stat-sub">Assigned engineer</span>
                            <Shield className="tv-stat-watermark" size={48} />
                          </div>
                        </div>
                      ) : (
                        /* 8 Statistics Cards Grid */
                        <div className="tv-stats-grid">
                          {/* Box 1: TOTAL DAYS */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL DAYS</span>
                            <span className="tv-stat-num blue">{total}</span>
                            <span className="tv-stat-sub">Logged test entries</span>
                            <Hourglass className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 2: TEST START DATE */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST START DATE</span>
                            <span className="tv-stat-num green" style={{ fontSize: getFontSize(testStartDate) }}>
                              {testStartDate}
                            </span>
                            <span className="tv-stat-sub">First entry log date</span>
                            <Calendar className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 3: TEST END DATE */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST END DATE</span>
                            <span className="tv-stat-num red" style={{ fontSize: getFontSize(testEndDate) }}>
                              {testEndDate}
                            </span>
                            <span className="tv-stat-sub">Latest entry log date</span>
                            <CalendarCheck className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 4: TOTAL TEST HOURS */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TOTAL TEST HOURS</span>
                            <span className="tv-stat-num purple">
                              {totalHours} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
                            </span>
                            <span className="tv-stat-sub">Estimated testing duration</span>
                            <Clock className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 5: CURRENT RANGE */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">CURRENT RANGE</span>
                            <span className="tv-stat-num purple">
                              {currentRange} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>km</span>
                            </span>
                            <span className="tv-stat-sub">Latest run distance</span>
                            <Zap className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 6: TEST ENGINEER */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">TEST ENGINEER</span>
                            <span className="tv-stat-num blue" style={{ fontSize: getFontSize(currentEngineer) }}>
                              {currentEngineer}
                            </span>
                            <span className="tv-stat-sub">Assigned engineer</span>
                            <Shield className="tv-stat-watermark" size={48} />
                          </div>

                          {/* Box 7: CURRENT TEST HOURS (for Camdrum) or PASS / FAIL (for others) */}
                          {view === 'camdrum' ? (
                            <div className="tv-stat-card">
                              <span className="tv-stat-label">CURRENT TEST HOURS</span>
                              <span className="tv-stat-num purple" style={{ fontSize: getFontSize(currentTestHours) }}>
                                {currentTestHours}
                              </span>
                              <span className="tv-stat-sub">Latest test duration</span>
                              <Clock className="tv-stat-watermark" size={48} />
                            </div>
                          ) : (
                            <div className="tv-stat-card">
                              <span className="tv-stat-label">PASS / FAIL</span>
                              <span className={`tv-stat-num ${decisionColor}`} style={{ fontSize: getFontSize(currentDecision) }}>
                                {currentDecision}
                              </span>
                              <span className="tv-stat-sub">Latest test decision</span>
                              <Trophy className="tv-stat-watermark" size={48} />
                            </div>
                          )}

                          {/* Box 8: REMARKS */}
                          <div className="tv-stat-card">
                            <span className="tv-stat-label">REMARKS</span>
                            <span className="tv-stat-num purple" style={{ fontSize: getFontSize(currentRemarks) }}>
                              {currentRemarks}
                            </span>
                            <span className="tv-stat-sub">Test observations</span>
                            <FileSpreadsheet className="tv-stat-watermark" size={48} />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Floating Sync Toast Alert */}
                {syncAlert && (
                  <div className="tv-toast-alert">
                    <span>{syncAlert}</span>
                  </div>
                )}

                {/* Spreadsheet Data Grid at the bottom */}
                <div className="tv-sheet-section">
                  <div className="tv-sheet-header-row">
                    {view !== 'camdrum' && (
                      <h3 className="tv-sheet-title">Linked Sheet Data ({view === 'ord' ? 'ORD' : 'MECHANICAL'})</h3>
                    )}
                    {!tvLoading && (
                      <div className="tv-controls-wrapper">
                        {/* Select Sheet Dropdown */}
                        <div className="tv-dropdown-container">
                          <label className="tv-dropdown-label">Select Sheet:</label>
                          <select
                            value={selectedSheet}
                            onFocus={fetchTvSheets}
                            onMouseEnter={fetchTvSheets}
                            onChange={(e) => {
                              setSelectedSheet(e.target.value);
                              setTvCurrentPage(1);
                            }}
                            className="tv-select-dropdown"
                            title="Select worksheet tab from Google Sheets"
                          >
                            {availableSheets.map((sh, idx) => (
                              <option key={idx} value={sh}>{sh}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="tv-btn-refresh-sheets"
                            onClick={() => {
                              fetchTvSheets();
                              fetchTvData(false, selectedSheet);
                            }}
                            title="Sync live sub-sheets from Google Sheets"
                          >
                            <RefreshCw size={13} />
                          </button>
                        </div>

                        {/* Select Vehicle Dropdown */}
                        <div className="tv-dropdown-container">
                          <label className="tv-dropdown-label">Select Vehicle:</label>
                          <select
                            value={selectedVehicle}
                            onChange={(e) => {
                              setSelectedVehicle(e.target.value);
                              setTvCurrentPage(1);
                            }}
                            className="tv-select-dropdown"
                            title="Filter records by vehicle variant rating"
                          >
                            <option value="">All Vehicles</option>
                            <option value="3.7 kWh">3.7 kWh</option>
                            <option value="5 kWh">5 kWh</option>
                            <option value="6.5 kWh">6.5 kWh</option>
                          </select>
                        </div>

                        {/* Search Bar */}
                        <div className="tv-search-container">
                          <Search size={16} className="tv-search-icon" />
                          <input
                            type="text"
                            placeholder="Search records..."
                            value={tvSearchQuery}
                            onChange={(e) => {
                              setTvSearchQuery(e.target.value);
                              setTvCurrentPage(1);
                            }}
                            className="tv-search-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {tvLoading ? (
                    <div className="tv-loading-placeholder">
                      <span>Loading records from Google Sheets...</span>
                    </div>
                  ) : (() => {
                    const filteredTvRecords = filteredList;

                    const tvItemsPerPage = 10;
                    const indexOfLastRecord = tvCurrentPage * tvItemsPerPage;
                    const indexOfFirstRecord = indexOfLastRecord - tvItemsPerPage;
                    const currentTvRecords = filteredTvRecords.slice(indexOfFirstRecord, indexOfLastRecord);
                    const tvTotalPages = Math.ceil(filteredTvRecords.length / tvItemsPerPage);

                    return (
                      <>
                        <div className={`table-responsive tv-sheet-table-wrapper ${(view === 'camdrum' || view === 'mechanical') ? 'camdrum-table-scroll-container' : ''}`}>
                          <table className={`excel-data-table ${(view === 'camdrum' || view === 'mechanical') ? 'camdrum-spacious-table' : ''}`}>
                            <thead>
                              {view === 'camdrum' ? (
                                <tr>
                                  <th className="hour-col">s.no</th>
                                  <th>timestamp</th>
                                  <th>Email address</th>
                                  <th>vehicle Name</th>
                                  <th>vechile no</th>
                                  <th>test date</th>
                                  <th>test start time</th>
                                  <th>engineer</th>
                                  <th>shift</th>
                                  <th>daily covered km</th>
                                  <th>total covered km</th>
                                  <th>failure</th>
                                  <th>failure image</th>
                                  <th>remarks</th>
                                  <th>test end time</th>
                                </tr>
                              ) : isMechanical ? (
                                <tr>
                                  <th className="hour-col">SL NO</th>
                                  <th>Vehicle Model</th>
                                  <th>Test Component</th>
                                  <th>Test Type</th>
                                  <th>Test Name</th>
                                  <th>Requested By</th>
                                  <th>Test Engineer</th>
                                  <th>Test Status</th>
                                  <th>Test Date</th>
                                  <th>Report Date</th>
                                  <th>Issue & Observation</th>
                                  <th>Remarks</th>
                                </tr>
                              ) : (
                                <tr>
                                  <th className="hour-col">SL NO</th>
                                  <th>Testing Group</th>
                                  <th>Test Component</th>
                                  <th>Vehicle Model</th>
                                  <th>Report Number</th>
                                  <th>Test Name</th>
                                  <th>Engineer</th>
                                  <th>Report Date</th>
                                  <th>Decision</th>
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {currentTvRecords.length > 0 ? (
                                currentTvRecords.map((r, idx) => {
                                  if (view === 'camdrum') {
                                    const failureVal = getFieldValue(r, ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status']);
                                    const statusUpper = failureVal.toUpperCase();
                                    const decisionClass = (statusUpper.includes('FAIL') || statusUpper === 'YES' || statusUpper === 'FAILED') 
                                      ? 'failed' 
                                      : ((statusUpper.includes('HOLD') || statusUpper.includes('HELD')) ? 'held' : 'passed');

                                    return (
                                      <tr key={idx} className="table-row">
                                        <td className="hour-cell font-bold">{getFieldValue(r, ['s.no', 'S.No', 'S.NO', 'sl no', 'SL NO', 'Sl No', 'Serial Number', 'SL.NO', 'sl.no'])}</td>
                                        <td>{getFieldValue(r, ['timestamp', 'Timestamp', 'TIMESTAMP', 'time stamp', 'Time Stamp'])}</td>
                                        <td>{getFieldValue(r, ['Email address', 'Email Address', 'email address', 'Email', 'email', 'EMAIL ADDRESS'])}</td>
                                        <td>{getFieldValue(r, ['vehicle Name', 'Vehicle Name', 'vehicle name', 'VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                        <td>{getFieldValue(r, ['vechile no', 'Vechile No', 'vechile No', 'Vechile no', 'vehicle no', 'Vehicle No', 'Vehicle Number'])}</td>
                                        <td>{getFieldValue(r, ['test date', 'Test Date', 'test date', 'Date', 'TEST DATE'])}</td>
                                        <td>{getFieldValue(r, ['test start time', 'Test Start Time', 'test start time', 'Start Time', 'start time'])}</td>
                                        <td>{getFieldValue(r, ['engineer', 'Engineer', 'ENGINEER', 'TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER'])}</td>
                                        <td>{getFieldValue(r, ['shift', 'Shift', 'SHIFT'])}</td>
                                        <td>{getFieldValue(r, ['daily covered km', 'Daily Covered Km', 'daily covered KM', 'covered km', 'Daily Covered KM', 'Daily covered km'])}</td>
                                        <td>{getFieldValue(r, ['total covered km', 'Total Covered Km', 'total covered KM', 'Total Covered KM', 'Total covered km'])}</td>
                                        <td>
                                          <span className={`status-badge ${decisionClass}`}>
                                            {failureVal || 'No'}
                                          </span>
                                        </td>
                                        <td>{getFieldValue(r, ['failure image', 'Failure Image', 'failure Image', 'Image', 'image'])}</td>
                                        <td>{getFieldValue(r, ['remarks', 'Remarks', 'REMARKS', 'Comments', 'Note'])}</td>
                                        <td>{getFieldValue(r, ['test end time', 'Test End Time', 'test end time', 'End Time', 'end time'])}</td>
                                      </tr>
                                    );
                                  } else if (isMechanical) {
                                    const statusVal = getFieldValue(r, ['TEST STATUS', 'TEST DECISION', 'Decision', 'Status']).toUpperCase();
                                    const decisionClass = statusVal.includes('FAIL') || statusVal === 'FAILED' ? 'failed' : (statusVal.includes('HOLD') || statusVal.includes('HELD') ? 'held' : 'passed');
                                    const testStatus = getFieldValue(r, ['TEST STATUS', 'TEST DECISION', 'Decision', 'Status']);
                                    return (
                                      <tr key={idx} className="table-row">
                                        <td className="hour-cell font-bold">{getFieldValue(r, ['SL NO', 'Sl No', 'sl no', 'Serial Number'])}</td>
                                        <td>{getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                        <td>{getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component'])}</td>
                                        <td>{getFieldValue(r, ['TEST TYPE', 'Test Type', 'test type', 'Type'])}</td>
                                        <td>{getFieldValue(r, ['TEST NAME', 'Test Name', 'test name'])}</td>
                                        <td>{getFieldValue(r, ['REQUESTED BY', 'Requested By', 'Requested by', 'REQUESTER BY', 'Requester By', 'requester by'])}</td>
                                        <td>{getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer'])}</td>
                                        <td>
                                          <span className={`status-badge ${decisionClass}`}>
                                            {testStatus}
                                          </span>
                                        </td>
                                        <td>{getFieldValue(r, ['TEST DATE', 'Test Date', 'test date', 'Date'])}</td>
                                        <td>{getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date'])}</td>
                                        <td>{getFieldValue(r, ['ISSUE & OBSERVATION', 'Issue & Observation', 'issue & observation', 'Issue', 'Observation'])}</td>
                                        <td>{getFieldValue(r, ['REMARKS', 'Remarks', 'remarks', 'Comments', 'Note'])}</td>
                                      </tr>
                                    );
                                  } else {
                                    const decisionVal = getFieldValue(r, ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']);
                                    const decisionClass = decisionVal.toUpperCase() === 'FAILED' || decisionVal.toUpperCase() === 'FAIL' ? 'failed' : (decisionVal.toUpperCase().includes('HOLD') || decisionVal.toUpperCase().includes('HELD') ? 'held' : 'passed');
                                    return (
                                      <tr key={idx} className="table-row">
                                        <td className="hour-cell font-bold">{getFieldValue(r, ['SL NO', 'Sl No', 'sl no', 'Serial Number'])}</td>
                                        <td>{getFieldValue(r, ['Testing Group', 'Testing group', 'testing group', 'TESTING GROUP'])}</td>
                                        <td>{getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component'])}</td>
                                        <td>{getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                        <td>{getFieldValue(r, ['REPORT NUMBER', 'Report Number', 'report number', 'Number', 'number'])}</td>
                                        <td>{getFieldValue(r, ['TEST NAME', 'Test Name', 'test name'])}</td>
                                        <td>{getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer'])}</td>
                                        <td>{getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date'])}</td>
                                        <td>
                                          <span className={`status-badge ${decisionClass}`}>
                                            {decisionVal}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  }
                                })
                              ) : (
                                <tr>
                                  <td colSpan={view === 'camdrum' ? 15 : (isMechanical ? 12 : 9)} className="text-center py-4 text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No matching records found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Controls */}
                        {tvTotalPages > 1 && (
                          <div className="tv-pagination">
                            <button 
                              className="tv-page-btn tv-page-prev"
                              disabled={tvCurrentPage === 1}
                              onClick={() => setTvCurrentPage(prev => Math.max(1, prev - 1))}
                            >
                              Previous
                            </button>
                            
                            {Array.from({ length: tvTotalPages }, (_, idx) => idx + 1).map((page) => (
                              <button
                                key={page}
                                className={`tv-page-btn ${tvCurrentPage === page ? 'active' : ''}`}
                                onClick={() => setTvCurrentPage(page)}
                              >
                                {page}
                              </button>
                            ))}

                            <button 
                              className="tv-page-btn tv-page-next"
                              disabled={tvCurrentPage === tvTotalPages}
                              onClick={() => setTvCurrentPage(prev => Math.min(tvTotalPages, prev + 1))}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}
          </main>
        )
      ) : (
        /* SPREADSHEET TABULAR DATA VIEW */
        <main className="dashboard-main spreadsheet-view-container">
          <h1 className="title-center">Spreadsheet Data Grid</h1>
          <p className="subtitle-center">Inspecting live telemetry rows parsed from Google Sheets worksheets.</p>
          
          <div className="tv-sheet-section" style={{ marginTop: '1.5rem' }}>
            <div className="tv-sheet-header-row">
              <h3 className="tv-sheet-title">Worksheets (Google Sheets)</h3>
              <div className="tv-controls-wrapper">
                {/* Select Sheet Dropdown */}
                <div className="tv-dropdown-container">
                  <label className="tv-dropdown-label">Select Sheet:</label>
                  <select
                    value={selectedSheet}
                    onFocus={fetchTvSheets}
                    onMouseEnter={fetchTvSheets}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      setTvCurrentPage(1);
                    }}
                    className="tv-select-dropdown"
                    title="Select worksheet tab from Google Sheets"
                  >
                    {availableSheets.map((sh, idx) => (
                      <option key={idx} value={sh}>{sh}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="tv-btn-refresh-sheets"
                    onClick={() => {
                      fetchTvSheets();
                      fetchTvData(false, selectedSheet);
                    }}
                    title="Sync live sub-sheets from Google Sheets"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="tv-search-container">
                  <Search size={16} className="tv-search-icon" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={tvSearchQuery}
                    onChange={(e) => {
                      setTvSearchQuery(e.target.value);
                      setTvCurrentPage(1);
                    }}
                    className="tv-search-input"
                  />
                </div>
              </div>
            </div>

            {tvLoading ? (
              <div className="tv-loading-placeholder">
                <span>Loading records from Google Sheets...</span>
              </div>
            ) : (() => {
              const filteredTvRecords = filteredList;

              const tvItemsPerPage = 10;
              const indexOfLastRecord = tvCurrentPage * tvItemsPerPage;
              const indexOfFirstRecord = indexOfLastRecord - tvItemsPerPage;
              const currentTvRecords = filteredTvRecords.slice(indexOfFirstRecord, indexOfLastRecord);
              const tvTotalPages = Math.ceil(filteredTvRecords.length / tvItemsPerPage);

              return (
                <>
                  <div className={`table-responsive tv-sheet-table-wrapper ${(view === 'camdrum' || view === 'mechanical') ? 'camdrum-table-scroll-container' : ''}`}>
                    <table className={`excel-data-table ${(view === 'camdrum' || view === 'mechanical') ? 'camdrum-spacious-table' : ''}`}>
                      <thead>
                        {view === 'camdrum' ? (
                          <tr>
                            <th className="hour-col">s.no</th>
                            <th>timestamp</th>
                            <th>Email address</th>
                            <th>vehicle Name</th>
                            <th>vechile no</th>
                            <th>test date</th>
                            <th>test start time</th>
                            <th>engineer</th>
                            <th>shift</th>
                            <th>daily covered km</th>
                            <th>total covered km</th>
                            <th>failure</th>
                            <th>failure image</th>
                            <th>remarks</th>
                            <th>test end time</th>
                          </tr>
                        ) : isMechanical ? (
                          <tr>
                            <th className="hour-col">SL NO</th>
                            <th>Vehicle Model</th>
                            <th>Test Component</th>
                            <th>Test Type</th>
                            <th>Test Name</th>
                            <th>Requested By</th>
                            <th>Test Engineer</th>
                            <th>Test Status</th>
                            <th>Test Date</th>
                            <th>Report Date</th>
                            <th>Issue & Observation</th>
                            <th>Remarks</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="hour-col">SL NO</th>
                            <th>Testing Group</th>
                            <th>Test Component</th>
                            <th>Vehicle Model</th>
                            <th>Report Number</th>
                            <th>Test Name</th>
                            <th>Engineer</th>
                            <th>Report Date</th>
                            <th>Decision</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {currentTvRecords.length > 0 ? (
                          currentTvRecords.map((r, idx) => {
                            if (view === 'camdrum') {
                              const failureVal = getFieldValue(r, ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status']);
                              const statusUpper = failureVal.toUpperCase();
                              const decisionClass = (statusUpper.includes('FAIL') || statusUpper === 'YES' || statusUpper === 'FAILED') 
                                ? 'failed' 
                                : ((statusUpper.includes('HOLD') || statusUpper.includes('HELD')) ? 'held' : 'passed');

                              return (
                                <tr key={idx} className="table-row">
                                  <td className="hour-cell font-bold">{getFieldValue(r, ['s.no', 'S.No', 'S.NO', 'sl no', 'SL NO', 'Sl No', 'Serial Number', 'SL.NO', 'sl.no'])}</td>
                                  <td>{getFieldValue(r, ['timestamp', 'Timestamp', 'TIMESTAMP', 'time stamp', 'Time Stamp'])}</td>
                                  <td>{getFieldValue(r, ['Email address', 'Email Address', 'email address', 'Email', 'email', 'EMAIL ADDRESS'])}</td>
                                  <td>{getFieldValue(r, ['vehicle Name', 'Vehicle Name', 'vehicle name', 'VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                  <td>{getFieldValue(r, ['vechile no', 'Vechile No', 'vechile No', 'Vechile no', 'vehicle no', 'Vehicle No', 'Vehicle Number'])}</td>
                                  <td>{getFieldValue(r, ['test date', 'Test Date', 'test date', 'Date', 'TEST DATE'])}</td>
                                  <td>{getFieldValue(r, ['test start time', 'Test Start Time', 'test start time', 'Start Time', 'start time'])}</td>
                                  <td>{getFieldValue(r, ['engineer', 'Engineer', 'ENGINEER', 'TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER'])}</td>
                                  <td>{getFieldValue(r, ['shift', 'Shift', 'SHIFT'])}</td>
                                  <td>{getFieldValue(r, ['daily covered km', 'Daily Covered Km', 'daily covered KM', 'covered km', 'Daily Covered KM', 'Daily covered km'])}</td>
                                  <td>{getFieldValue(r, ['total covered km', 'Total Covered Km', 'total covered KM', 'Total Covered KM', 'Total covered km'])}</td>
                                  <td>
                                    <span className={`status-badge ${decisionClass}`}>
                                      {failureVal || 'No'}
                                    </span>
                                  </td>
                                  <td>{getFieldValue(r, ['failure image', 'Failure Image', 'failure Image', 'Image', 'image'])}</td>
                                  <td>{getFieldValue(r, ['remarks', 'Remarks', 'REMARKS', 'Comments', 'Note'])}</td>
                                  <td>{getFieldValue(r, ['test end time', 'Test End Time', 'test end time', 'End Time', 'end time'])}</td>
                                </tr>
                              );
                            } else if (isMechanical) {
                              const statusVal = getFieldValue(r, ['TEST STATUS', 'TEST DECISION', 'Decision', 'Status']).toUpperCase();
                              const decisionClass = statusVal.includes('FAIL') || statusVal === 'FAILED' ? 'failed' : (statusVal.includes('HOLD') || statusVal.includes('HELD') ? 'held' : 'passed');
                              const testStatus = getFieldValue(r, ['TEST STATUS', 'TEST DECISION', 'Decision', 'Status']);
                              return (
                                <tr key={idx} className="table-row">
                                  <td className="hour-cell font-bold">{getFieldValue(r, ['SL NO', 'Sl No', 'sl no', 'Serial Number'])}</td>
                                  <td>{getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                  <td>{getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component'])}</td>
                                  <td>{getFieldValue(r, ['TEST TYPE', 'Test Type', 'test type', 'Type'])}</td>
                                  <td>{getFieldValue(r, ['TEST NAME', 'Test Name', 'test name'])}</td>
                                  <td>{getFieldValue(r, ['REQUESTED BY', 'Requested By', 'Requested by', 'REQUESTER BY', 'Requester By', 'requester by'])}</td>
                                  <td>{getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer'])}</td>
                                  <td>
                                    <span className={`status-badge ${decisionClass}`}>
                                      {testStatus}
                                    </span>
                                  </td>
                                  <td>{getFieldValue(r, ['TEST DATE', 'Test Date', 'test date', 'Date'])}</td>
                                  <td>{getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date'])}</td>
                                  <td>{getFieldValue(r, ['ISSUE & OBSERVATION', 'Issue & Observation', 'issue & observation', 'Issue', 'Observation'])}</td>
                                  <td>{getFieldValue(r, ['REMARKS', 'Remarks', 'remarks', 'Comments', 'Note'])}</td>
                                </tr>
                              );
                            } else {
                              const decisionVal = getFieldValue(r, ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']);
                              const decisionClass = decisionVal.toUpperCase() === 'FAILED' || decisionVal.toUpperCase() === 'FAIL' ? 'failed' : (decisionVal.toUpperCase().includes('HOLD') || decisionVal.toUpperCase().includes('HELD') ? 'held' : 'passed');
                              return (
                                <tr key={idx} className="table-row">
                                  <td className="hour-cell font-bold">{getFieldValue(r, ['SL NO', 'Sl No', 'sl no', 'Serial Number'])}</td>
                                  <td>{getFieldValue(r, ['Testing Group', 'Testing group', 'testing group', 'TESTING GROUP'])}</td>
                                  <td>{getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component'])}</td>
                                  <td>{getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model'])}</td>
                                  <td>{getFieldValue(r, ['REPORT NUMBER', 'Report Number', 'report number', 'Number', 'number'])}</td>
                                  <td>{getFieldValue(r, ['TEST NAME', 'Test Name', 'test name'])}</td>
                                  <td>{getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer'])}</td>
                                  <td>{getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date'])}</td>
                                  <td>
                                    <span className={`status-badge ${decisionClass}`}>
                                      {decisionVal}
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          })
                        ) : (
                          <tr>
                            <td colSpan={view === 'camdrum' ? 15 : (isMechanical ? 12 : 9)} className="text-center py-4 text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                              No matching records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {tvTotalPages > 1 && (
                    <div className="tv-pagination">
                      <button 
                        className="tv-page-btn tv-page-prev"
                        disabled={tvCurrentPage === 1}
                        onClick={() => setTvCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: tvTotalPages }, (_, idx) => idx + 1).map((page) => (
                        <button
                          key={page}
                          className={`tv-page-btn ${tvCurrentPage === page ? 'active' : ''}`}
                          onClick={() => setTvCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}

                      <button 
                        className="tv-page-btn tv-page-next"
                        disabled={tvCurrentPage === tvTotalPages}
                        onClick={() => setTvCurrentPage(prev => Math.min(tvTotalPages, prev + 1))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      )}
    </div>
  );
}
