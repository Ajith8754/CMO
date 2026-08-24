require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function inspect() {
  const credentialsPath = path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials-tv.json');
  if (!fs.existsSync(credentialsPath)) {
    console.error(`Google credentials file not found at ${credentialsPath}`);
    return;
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const titles = (res.data.sheets || []).map(s => s.properties.title).filter(Boolean);
  console.log("Sheet Tabs:", titles);

  for (const title of titles) {
    try {
      const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${title}'!A1:Z10`,
      });
      const rows = dataRes.data.values || [];
      console.log(`Tab: "${title}", fetched rows: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`  Headers for "${title}":`, rows[0]);
        if (rows.length > 1) {
          console.log(`  Sample Row 1:`, rows[1]);
        }
      }
    } catch (err) {
      console.error(`  Error reading tab "${title}":`, err.message);
    }
  }
}

inspect();
