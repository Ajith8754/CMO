require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Set up multer for memory storage file upload
const upload = multer({ storage: multer.memoryStorage() });

// Helper to generate default 24-hour dataset
function generateDefaultData() {
  const dataset = {};
  for (let h = 1; h <= 24; h++) {
    const hourStr = `${String(h).padStart(2, '0')}:00`;
    
    const camdrumActive = h >= 8 && h <= 20;
    const mechActive = h >= 9 && h <= 19;
    const ordActive = h >= 10 && h <= 18;

    dataset[hourStr] = {
      hour: hourStr,
      camdrum: {
        status: camdrumActive ? "active" : "standby",
        metrics: {
          fps: camdrumActive ? 30 : 0,
          latency: camdrumActive ? 12 : 0,
          temp: camdrumActive ? 42.5 : 35.0,
          resolution: "1920x1080",
          detectionRate: camdrumActive ? 98.4 : 0.0
        },
        logs: camdrumActive 
          ? [`Stream running at 1080p`, `Object tracking accuracy: 98.4%`] 
          : [`Camera in low-power standby mode`]
      },
      mechanical: {
        status: mechActive ? "active" : (h >= 7 && h <= 21 ? "standby" : "offline"),
        metrics: {
          vibration: mechActive ? 1.35 : (h >= 7 && h <= 21 ? 0.15 : 0.0),
          temp: mechActive ? 49.5 : (h >= 7 && h <= 21 ? 35.0 : 25.0),
          torque: mechActive ? 122.5 : 0.0,
          speed: mechActive ? 1450 : 0,
          pressure: mechActive ? 5.5 : (h >= 7 && h <= 21 ? 2.0 : 0.0)
        },
        logs: mechActive
          ? [`Main shaft RPM: 1450`, `Temperature stabilised at 49.5°C`]
          : (h >= 7 && h <= 21 ? [`Hydraulic pre-charge OK`, `Lubricant temperature: 35.0°C`] : [`System powered down`])
      },
      ord: {
        status: ordActive ? "active" : (h === 9 || (h >= 19 && h <= 20) ? "standby" : "offline"),
        metrics: {
          load: ordActive ? 75 : 0,
          speed: ordActive ? 2300 : (h === 9 || (h >= 19 && h <= 20) ? 600 : 0),
          power: ordActive ? 92.5 : (h === 9 || (h >= 19 && h <= 20) ? 1.5 : 0.0),
          temp: ordActive ? 65.5 : (h === 9 || (h >= 19 && h <= 20) ? 39.0 : 25.0),
          coolantFlow: ordActive ? 13.0 : (h === 9 || (h >= 19 && h <= 20) ? 5.0 : 0.0)
        },
        logs: ordActive
          ? [`Absorber active. Load: 75%`, `Power output: 92.5 kW`]
          : (h === 9 || (h >= 19 && h <= 20) ? [`Dyno idling at 600 RPM`, `Cooling pump in bypass mode`] : [`Power grid disconnected`])
      }
    };
  }
  return dataset;
}

// In-memory state
let currentDataset = generateDefaultData();
let activeHour = "01:00";
let playbackState = {
  playing: false,
  speed: "simulated", // simulated, realtime
  playbackSpeedMs: 3000
};
let lastAdvanceTime = Date.now();

// Playback background controller running every second
setInterval(() => {
  if (!playbackState.playing) return;

  const hours = Object.keys(currentDataset).sort((a, b) => {
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

  if (hours.length === 0) return;

  const now = Date.now();
  const limit = playbackState.speed === 'simulated' ? playbackState.playbackSpeedMs : 3600000; // 3s vs 1h

  if (now - lastAdvanceTime >= limit) {
    let idx = hours.indexOf(activeHour);
    idx = (idx + 1) % hours.length;
    activeHour = hours[idx];
    lastAdvanceTime = now;
  }
}, 1000);

// Endpoints
app.get('/api/status', (req, res) => {
  const hours = Object.keys(currentDataset).sort();
  const activeData = JSON.parse(JSON.stringify(currentDataset[activeHour] || {
    hour: activeHour,
    camdrum: { status: 'offline', metrics: { fps: 0, latency: 0, temp: 0, resolution: "-", detectionRate: 0 }, logs: [] },
    mechanical: { status: 'offline', metrics: { vibration: 0, temp: 0, torque: 0, speed: 0, pressure: 0 }, logs: [] },
    ord: { status: 'offline', metrics: { load: 0, speed: 0, power: 0, temp: 0, coolantFlow: 0 }, logs: [] }
  }));

  // Add subtle live fluctuations to metrics if active and playing to look animated
  if (playbackState.playing) {
    if (activeData.camdrum.status === 'active') {
      activeData.camdrum.metrics.fps += Math.round((Math.random() - 0.5) * 2);
      activeData.camdrum.metrics.latency += Math.round((Math.random() - 0.5) * 2);
      activeData.camdrum.metrics.temp = parseFloat((activeData.camdrum.metrics.temp + (Math.random() - 0.5) * 0.4).toFixed(1));
      activeData.camdrum.metrics.detectionRate = parseFloat((activeData.camdrum.metrics.detectionRate + (Math.random() - 0.5) * 0.5).toFixed(1));
    }
    if (activeData.mechanical.status === 'active') {
      activeData.mechanical.metrics.vibration = parseFloat((activeData.mechanical.metrics.vibration + (Math.random() - 0.5) * 0.08).toFixed(2));
      activeData.mechanical.metrics.temp = parseFloat((activeData.mechanical.metrics.temp + (Math.random() - 0.5) * 0.6).toFixed(1));
      activeData.mechanical.metrics.torque = parseFloat((activeData.mechanical.metrics.torque + (Math.random() - 0.5) * 3).toFixed(1));
      activeData.mechanical.metrics.speed += Math.round((Math.random() - 0.5) * 15);
      activeData.mechanical.metrics.pressure = parseFloat((activeData.mechanical.metrics.pressure + (Math.random() - 0.5) * 0.1).toFixed(1));
    }
    if (activeData.ord.status === 'active') {
      activeData.ord.metrics.load += Math.round((Math.random() - 0.5) * 4);
      activeData.ord.metrics.speed += Math.round((Math.random() - 0.5) * 30);
      activeData.ord.metrics.power = parseFloat((activeData.ord.metrics.power + (Math.random() - 0.5) * 2).toFixed(1));
      activeData.ord.metrics.temp = parseFloat((activeData.ord.metrics.temp + (Math.random() - 0.5) * 0.8).toFixed(1));
      activeData.ord.metrics.coolantFlow = parseFloat((activeData.ord.metrics.coolantFlow + (Math.random() - 0.5) * 0.3).toFixed(1));
    }
  }

  const limit = playbackState.speed === 'simulated' ? playbackState.playbackSpeedMs : 3600000;
  const remainingMs = Math.max(0, limit - (Date.now() - lastAdvanceTime));

  res.json({
    success: true,
    activeHour,
    systems: {
      camdrum: activeData.camdrum,
      mechanical: activeData.mechanical,
      ord: activeData.ord
    },
    playbackState: {
      ...playbackState,
      nextUpdateInSeconds: Math.ceil(remainingMs / 1000)
    },
    timeline: hours,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/all-data', (req, res) => {
  res.json({
    success: true,
    dataset: currentDataset
  });
});

app.post('/api/playback', (req, res) => {
  const { hour, playing, speed, speedMs } = req.body;

  if (hour !== undefined) {
    if (currentDataset[hour]) {
      activeHour = hour;
    }
  }
  if (playing !== undefined) playbackState.playing = playing;
  if (speed !== undefined) playbackState.speed = speed;
  if (speedMs !== undefined) playbackState.playbackSpeedMs = speedMs;

  lastAdvanceTime = Date.now(); // reset countdown

  res.json({
    success: true,
    playbackState,
    activeHour
  });
});

app.post('/api/upload', upload.single('excel'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Dynamically find Camdrum or Camdrom sheet name
    const camdrumSheetName = workbook.Sheets['Camdrum'] ? 'Camdrum' : (workbook.Sheets['Camdrom'] ? 'Camdrom' : null);
    if (!camdrumSheetName) {
      return res.status(400).json({ success: false, message: "Required worksheet 'Camdrum' or 'Camdrom' was not found." });
    }
    
    if (!workbook.Sheets['Mechanical']) {
      return res.status(400).json({ success: false, message: "Required worksheet 'Mechanical' was not found." });
    }
    
    // Dynamically find ORD or Dyno sheet name
    const ordSheetName = workbook.Sheets['ORD'] ? 'ORD' : (workbook.Sheets['Dyno'] ? 'Dyno' : null);
    if (!ordSheetName) {
      return res.status(400).json({ success: false, message: "Required worksheet 'ORD' or 'Dyno' was not found." });
    }

    const camdrumRows = xlsx.utils.sheet_to_json(workbook.Sheets[camdrumSheetName]);
    const mechanicalRows = xlsx.utils.sheet_to_json(workbook.Sheets['Mechanical']);
    const ordRows = xlsx.utils.sheet_to_json(workbook.Sheets[ordSheetName]);

    const newDataset = {};
    const parsedHours = new Set();

    // Parse Camdrum
    camdrumRows.forEach(row => {
      const hr = String(row['Hour'] || row['hour'] || '').trim();
      if (!hr) return;
      parsedHours.add(hr);
      
      const statusVal = String(row['Status'] || row['status'] || 'offline').toLowerCase().trim();
      newDataset[hr] = {
        hour: hr,
        camdrum: {
          status: ['active', 'standby', 'offline'].includes(statusVal) ? statusVal : 'offline',
          metrics: {
            fps: Number(row['FPS'] || row['fps'] || 0),
            latency: Number(row['Latency (ms)'] || row['latency'] || 0),
            temp: Number(row['Temp (°C)'] || row['temp'] || 0),
            resolution: String(row['Resolution'] || row['resolution'] || '1920x1080'),
            detectionRate: Number(row['Accuracy (%)'] || row['accuracy'] || 0)
          },
          logs: row['Logs'] || row['logs'] ? String(row['Logs'] || row['logs']).split(';').map(l => l.trim()).filter(Boolean) : []
        },
        mechanical: { status: 'offline', metrics: { vibration: 0, temp: 0, torque: 0, speed: 0, pressure: 0 }, logs: [] },
        ord: { status: 'offline', metrics: { load: 0, speed: 0, power: 0, temp: 0, coolantFlow: 0 }, logs: [] }
      };
    });

    // Parse Mechanical
    mechanicalRows.forEach(row => {
      const hr = String(row['Hour'] || row['hour'] || '').trim();
      if (!hr) return;
      parsedHours.add(hr);

      const statusVal = String(row['Status'] || row['status'] || 'offline').toLowerCase().trim();
      if (!newDataset[hr]) {
        newDataset[hr] = {
          hour: hr,
          camdrum: { status: 'offline', metrics: { fps: 0, latency: 0, temp: 0, resolution: '-', detectionRate: 0 }, logs: [] },
          mechanical: { status: 'offline', metrics: { vibration: 0, temp: 0, torque: 0, speed: 0, pressure: 0 }, logs: [] },
          ord: { status: 'offline', metrics: { load: 0, speed: 0, power: 0, temp: 0, coolantFlow: 0 }, logs: [] }
        };
      }

      newDataset[hr].mechanical = {
        status: ['active', 'standby', 'offline'].includes(statusVal) ? statusVal : 'offline',
        metrics: {
          vibration: Number(row['Vibration (mm/s)'] || row['vibration'] || 0),
          temp: Number(row['Temp (°C)'] || row['temp'] || 0),
          torque: Number(row['Torque (Nm)'] || row['torque'] || 0),
          speed: Number(row['Speed (rpm)'] || row['speed'] || 0),
          pressure: Number(row['Pressure (bar)'] || row['pressure'] || 0)
        },
        logs: row['Logs'] || row['logs'] ? String(row['Logs'] || row['logs']).split(';').map(l => l.trim()).filter(Boolean) : []
      };
    });

    // Parse ORD
    ordRows.forEach(row => {
      const hr = String(row['Hour'] || row['hour'] || '').trim();
      if (!hr) return;
      parsedHours.add(hr);

      const statusVal = String(row['Status'] || row['status'] || 'offline').toLowerCase().trim();
      if (!newDataset[hr]) {
        newDataset[hr] = {
          hour: hr,
          camdrum: { status: 'offline', metrics: { fps: 0, latency: 0, temp: 0, resolution: '-', detectionRate: 0 }, logs: [] },
          mechanical: { status: 'offline', metrics: { vibration: 0, temp: 0, torque: 0, speed: 0, pressure: 0 }, logs: [] },
          ord: { status: 'offline', metrics: { load: 0, speed: 0, power: 0, temp: 0, coolantFlow: 0 }, logs: [] }
        };
      }

      newDataset[hr].ord = {
        status: ['active', 'standby', 'offline'].includes(statusVal) ? statusVal : 'offline',
        metrics: {
          load: Number(row['Load (%)'] || row['load'] || 0),
          speed: Number(row['Speed (rpm)'] || row['speed'] || 0),
          power: Number(row['Power (kW)'] || row['power'] || 0),
          temp: Number(row['Temp (°C)'] || row['temp'] || 0),
          coolantFlow: Number(row['Coolant Flow (L/min)'] || row['coolantFlow'] || 0)
        },
        logs: row['Logs'] || row['logs'] ? String(row['Logs'] || row['logs']).split(';').map(l => l.trim()).filter(Boolean) : []
      };
    });

    if (parsedHours.size === 0) {
      return res.status(400).json({ success: false, message: 'Excel parser found zero valid rows with hours.' });
    }

    currentDataset = newDataset;
    
    // Sort and grab first hour
    const sortedHours = Array.from(parsedHours).sort((a, b) => {
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

    activeHour = sortedHours[0];
    lastAdvanceTime = Date.now();

    res.json({
      success: true,
      message: `Excel sheet parsed successfully! Loaded ${sortedHours.length} test records.`,
      activeHour,
      timeline: sortedHours
    });
  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({ success: false, message: 'Server failed to parse the Excel file. Verify file format.' });
  }
});

app.get('/api/template', (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const camdrumRows = [];
    const mechanicalRows = [];
    const ordRows = [];

    for (let h = 1; h <= 24; h++) {
      const hrStr = `${String(h).padStart(2, '0')}:00`;
      
      const camdrumActive = h >= 8 && h <= 20;
      const mechActive = h >= 9 && h <= 19;
      const ordActive = h >= 10 && h <= 18;

      camdrumRows.push({
        "Hour": hrStr,
        "Status": camdrumActive ? "active" : "standby",
        "FPS": camdrumActive ? 30 : 0,
        "Latency (ms)": camdrumActive ? 12 : 0,
        "Temp (°C)": camdrumActive ? 42.5 : 35.0,
        "Accuracy (%)": camdrumActive ? 98.4 : 0.0,
        "Logs": camdrumActive ? `Camera stream running;FPS lock active` : `Camera in low-power standby`
      });

      mechanicalRows.push({
        "Hour": hrStr,
        "Status": mechActive ? "active" : (h >= 7 && h <= 21 ? "standby" : "offline"),
        "Vibration (mm/s)": mechActive ? 1.35 : (h >= 7 && h <= 21 ? 0.15 : 0.0),
        "Temp (°C)": mechActive ? 49.5 : (h >= 7 && h <= 21 ? 35.0 : 25.0),
        "Torque (Nm)": mechActive ? 122.5 : 0.0,
        "Speed (rpm)": mechActive ? 1450 : 0,
        "Pressure (bar)": mechActive ? 5.5 : (h >= 7 && h <= 21 ? 2.0 : 0.0),
        "Logs": mechActive ? `Speed stable at 1450 rpm;Shaft vibration within spec` : (h >= 7 && h <= 21 ? `System hydraulics check complete` : `Offline`)
      });

      ordRows.push({
        "Hour": hrStr,
        "Status": ordActive ? "active" : (h === 9 || (h >= 19 && h <= 20) ? "standby" : "offline"),
        "Load (%)": ordActive ? 75 : 0,
        "Speed (rpm)": ordActive ? 2300 : (h === 9 || (h >= 19 && h <= 20) ? 600 : 0),
        "Power (kW)": ordActive ? 92.5 : (h === 9 || (h >= 19 && h <= 20) ? 1.5 : 0.0),
        "Temp (°C)": ordActive ? 65.5 : (h === 9 || (h >= 19 && h <= 20) ? 39.0 : 25.0),
        "Coolant Flow (L/min)": ordActive ? 13.0 : (h === 9 || (h >= 19 && h <= 20) ? 5.0 : 0.0),
        "Logs": ordActive ? `Absorber active. Speed: 2300 RPM` : (h === 9 || (h >= 19 && h <= 20) ? `Dyno idling` : `Offline`)
      });
    }

    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(camdrumRows), "Camdrum");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(mechanicalRows), "Mechanical");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(ordRows), "ORD");

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=telemetry_template.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error("Template download error:", err);
    res.status(500).json({ success: false, message: 'Failed to generate template Excel file.' });
  }
});

app.post('/api/reset', (req, res) => {
  currentDataset = generateDefaultData();
  activeHour = "01:00";
  playbackState = {
    playing: false,
    speed: "simulated",
    playbackSpeedMs: 3000
  };
  lastAdvanceTime = Date.now();
  res.json({
    success: true,
    message: "Dashboard reset to default simulated dataset successfully.",
    activeHour,
    playbackState
  });
});

// Google Sheets Integration Logic
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

function getGoogleSheetIdForSystem(system) {
  if (system === 'camdrum' || system === 'camdrom') {
    return process.env.CAMDRUM_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  }
  if (system === 'mechanical') {
    return process.env.MECHANICAL_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  }
  if (system === 'ord') {
    return process.env.ORD_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  }
  return process.env.GOOGLE_SHEET_ID;
}

async function splitAndWriteBackToGoogleSheets(auth, sheetId, summaryRecords, availableSheets) {
  const sheets = google.sheets({ version: 'v4', auth });
  const variants = ['5kwh', '3.7kwh'];
  
  for (const variant of variants) {
    const tabName = availableSheets.find(t => t.toLowerCase() === variant);
    if (!tabName) continue;
    
    try {
      const checkRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${tabName}'!A2:A10`,
      });
      const rows = checkRes.data.values || [];
      if (rows.length === 0) {
        const variantText = variant.replace('kwh', '').trim();
        const filtered = summaryRecords.filter(r => {
          const modelVal = getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model']).toLowerCase();
          return modelVal.includes(variantText) || modelVal.includes(variant);
        });
        
        if (filtered.length > 0) {
          const headers = [
            'SL NO', 'Vehicle Model', 'Test Component', 'Test Type', 'Test Name',
            'Requested By', 'Test Engineer', 'Test Status', 'Test Date', 'Report Date',
            'Issue & Observation', 'Remarks'
          ];
          
          const valuesToWrite = [headers];
          filtered.forEach((r, idx) => {
            valuesToWrite.push([
              String(idx + 1),
              getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model']),
              getFieldValue(r, ['TEST COMPONENT', 'Test Component', 'test component', 'Component']),
              getFieldValue(r, ['TEST TYPE', 'Test Type', 'test type', 'Type']),
              getFieldValue(r, ['TEST NAME', 'Test Name', 'test name']),
              getFieldValue(r, ['REQUESTED BY', 'Requested By', 'Requested by', 'Requester By']),
              getFieldValue(r, ['TEST ENGINEER', 'Test Engineer', 'test engineer', 'TEST ENGINNER', 'Engineer']),
              getFieldValue(r, ['TEST STATUS', 'TEST DECISION', 'Decision', 'Status']),
              getFieldValue(r, ['TEST DATE', 'Test Date', 'test date', 'Date']),
              getFieldValue(r, ['REPORT DATE', 'Report Date', 'report date']),
              getFieldValue(r, ['ISSUE & OBSERVATION', 'Issue & Observation', 'issue & observation', 'Issue', 'Observation']),
              getFieldValue(r, ['REMARKS', 'Remarks', 'remarks', 'Comments', 'Note'])
            ]);
          });
          
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `'${tabName}'!A1`,
            valueInputOption: 'RAW',
            resource: { values: valuesToWrite }
          });
          console.log(`Successfully split and wrote ${filtered.length} rows to "${tabName}"`);
        }
      }
    } catch (err) {
      console.error(`Error splitting/writing back to "${tabName}":`, err.message);
    }
  }
}

async function getGoogleSheetsTabs(system) {
  try {
    const credentialsPath = path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials-tv.json');
    if (!fs.existsSync(credentialsPath)) {
      return ['overall', 'summary', '5kwh', '3.7kwh'];
    }
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = getGoogleSheetIdForSystem(system);

    const res = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheetTitles = (res.data.sheets || []).map(s => s.properties.title).filter(Boolean);
    return sheetTitles.length > 0 ? sheetTitles : ['summary'];
  } catch (err) {
    console.error('Error fetching sheet tabs:', err);
    return ['overall', 'summary', '5kwh', '3.7kwh'];
  }
}

async function getGoogleSheetsData(requestedSheet, system) {
  const credentialsPath = path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials-tv.json');
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Google credentials file not found at ${credentialsPath}`);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = getGoogleSheetIdForSystem(system);
  
  let availableTitles = ['summary'];
  try {
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    availableTitles = (metaRes.data.sheets || []).map(s => s.properties.title).filter(Boolean);
  } catch (err) {
    console.error('Error fetching sheet metadata:', err.message);
  }

  let targetSheet = requestedSheet;
  if (!targetSheet || !availableTitles.includes(targetSheet)) {
    const summaryTab = availableTitles.find(t => t.toLowerCase() === 'summary');
    targetSheet = summaryTab || availableTitles[0] || 'summary';
  }
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${targetSheet}'!A:P`,
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) return { records: [], activeSheet: targetSheet, availableSheets: availableTitles };
  
  const headers = rows[0].map(h => String(h || '').trim());
  const dataRows = rows.slice(1);
  
  const records = dataRows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  // Automatically trigger splitting and writing back if this is the summary tab
  if (targetSheet.toLowerCase() === 'summary' && records.length > 0) {
    splitAndWriteBackToGoogleSheets(auth, sheetId, records, availableTitles).catch(err => {
      console.error('Background split/write error:', err.message);
    });
  }

  return { records, activeSheet: targetSheet, availableSheets: availableTitles };
}

app.get('/api/tv-sheets', async (req, res) => {
  try {
    const system = req.query.system;
    const sheets = await getGoogleSheetsTabs(system);
    res.json({ success: true, sheets });
  } catch (err) {
    console.error('API tv-sheets Error:', err);
    res.json({ success: true, sheets: ['overall', 'summary', '5kwh', '3.7kwh'] });
  }
});

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

app.get('/api/tv-data', async (req, res) => {
  try {
    const requestedSheet = req.query.sheet;
    const system = req.query.system;
    let { records: data, activeSheet, availableSheets } = await getGoogleSheetsData(requestedSheet, system);
    
    // Fallback split check: if active sheet has 0 records, matches a variant name, and summary is available
    const isVariantSheet = ['5kwh', '3.7kwh', '6.5kwh'].includes(activeSheet.toLowerCase()) || activeSheet.toLowerCase().includes('kwh');
    if (data.length === 0 && isVariantSheet && availableSheets.find(t => t.toLowerCase() === 'summary')) {
      const summarySheetName = availableSheets.find(t => t.toLowerCase() === 'summary');
      const { records: summaryRecords } = await getGoogleSheetsData(summarySheetName, system);
      if (summaryRecords && summaryRecords.length > 0) {
        const variantText = activeSheet.toLowerCase().replace('kwh', '').trim();
        data = summaryRecords.filter(r => {
          const modelVal = getFieldValue(r, ['VEHICLE MODEL', 'Vehicle Model', 'vehicle model', 'Model']).toLowerCase();
          return modelVal.includes(variantText) || modelVal.includes(activeSheet.toLowerCase());
        });
      }
    }

    // Calculate Stats
    const total = data.length;
    const passed = data.filter(r => {
      const dec = getFieldValue(r, system === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
      return system === 'camdrum' 
        ? (dec === 'PASSED' || dec === 'PASS' || dec === 'NO' || dec === 'NIL' || dec === '')
        : (dec === 'PASSED' || dec === 'PASS');
    }).length;
    const failed = data.filter(r => {
      const dec = getFieldValue(r, system === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
      return system === 'camdrum'
        ? (dec === 'FAILED' || dec === 'FAIL' || dec === 'YES')
        : (dec === 'FAILED' || dec === 'FAIL');
    }).length;
    const held = data.filter(r => {
      const dec = getFieldValue(r, system === 'camdrum' ? ['failure', 'Failure', 'TEST DECISION', 'TEST STATUS', 'Decision', 'Status'] : ['TEST DECISION', 'TEST STATUS', 'Decision', 'Status']).toUpperCase();
      return dec.includes('HOLD') || dec.includes('HELD');
    }).length;
    
    // Calculate Range Sum
    let rangeSum = 0;
    const rangeColKey = Object.keys(data[0] || {}).find(k => 
      system === 'camdrum'
        ? (k.toUpperCase() === 'TOTAL COVERED KM' || k.toUpperCase().includes('TOTAL COVERED') || k.toUpperCase().includes('RANGE') || k.toUpperCase().includes('DISTANCE') || k.toUpperCase().includes('KM'))
        : (k.toUpperCase().includes('RANGE') || k.toUpperCase().includes('KM') || k.toUpperCase().includes('DISTANCE'))
    );
    
    if (rangeColKey) {
      data.forEach(r => {
        const val = parseFloat(String(r[rangeColKey]).replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) {
          rangeSum += val;
        }
      });
    } else {
      // Fallback dynamic range based on passed/failed tests counts
      rangeSum = passed * 12 + failed * 8 + held * 10;
    }
    
    res.json({
      success: true,
      total,
      passed,
      failed,
      held,
      range: rangeSum,
      records: data,
      activeSheet,
      availableSheets
    });
  } catch (error) {
    console.error('Google Sheets Sync Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Energy Backend running on port ${PORT}`);
});
// Watch trigger
