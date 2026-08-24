require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials-tv.json');
if (!fs.existsSync(credentialsPath)) {
  console.error(`Google credentials file not found at ${credentialsPath}`);
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const sheetId = process.env.GOOGLE_SHEET_ID;

sheets.spreadsheets.get({
  spreadsheetId: sheetId,
}).then(res => {
  const titles = (res.data.sheets || []).map(s => s.properties.title).filter(Boolean);
  console.log("Found Sheet Tabs:", titles);
  if (titles.length === 0) {
    console.log("No sheet tabs found.");
    return;
  }
  const targetSheet = titles[0];
  console.log(`Fetching from first sheet tab: ${targetSheet}`);
  return sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${targetSheet}'!A:P`,
  });
}).then(res => {
  if (!res) return;
  const rows = res.data.values || [];
  console.log(`Fetched ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log("Headers:", rows[0]);
    const counts = {};
    rows[0].forEach(h => counts[h] = new Set());
    rows.slice(1).forEach(row => {
      rows[0].forEach((h, idx) => {
        if (row[idx] !== undefined) counts[h].add(row[idx]);
      });
    });
    rows[0].forEach(h => {
      console.log(`Column: ${h}, unique values: ${counts[h].size}, Sample:`, Array.from(counts[h]).slice(0, 5));
    });
  }
}).catch(err => {
  console.error(err);
});
