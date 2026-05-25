const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const BASE = 'https://www.bcv.org.ve/estadisticas/indice-de-inversion';

function normalizeDateDMY(text) {
  const m = text.match(/(\d{1,2})[\-\/]?(\d{1,2})[\-\/]?(\d{4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const y = m[3];
    return `${y}-${mo}-${d}`;
  }
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

async function fetchPage(url) {
  const https = require('https');
  const agent = new https.Agent({ rejectUnauthorized: false });
  const res = await axios.get(url, { httpsAgent: agent, headers: { 'User-Agent': 'node-scraper' } });
  return res.data;
}

function extractRows(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('table.views-table tbody tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const rawDate = $(tds[0]).text().trim();
      const rawIdi = $(tds[tds.length - 1]).text().trim();
      const date = normalizeDateDMY(rawDate);
      if (date) {
        const m = rawIdi.match(/[\d.,]+/);
        if (m) {
          const rawNum = m[0];
          const idiText = rawNum.replace(/\./g, '').replace(/,/g, '.');
          const idi = Number(idiText);
          if (!Number.isNaN(idi)) rows.push({ date, idi: idi, idiText });
        }
      }
    }
  });
  return rows;
}

async function run() {
  try {
    const html = await fetchPage(BASE);
    const rows = extractRows(html);
    if (!rows.length) {
      console.error('No rows found');
      process.exit(1);
    }
    // pick the first row (most recent on page)
    const latest = rows[0];
    const dbPath = path.join(__dirname, '..', 'data', 'idi_series.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
      db.run('CREATE TABLE IF NOT EXISTS idi_series (date TEXT PRIMARY KEY, idi REAL, idi_text TEXT)');
      const stmt = db.prepare('INSERT OR REPLACE INTO idi_series (date, idi, idi_text) VALUES (?, ?, ?)');
      stmt.run(latest.date, latest.idi, latest.idiText || String(latest.idi), function (err) {
        if (err) console.error('Insert failed', err);
        else console.log('Upserted', latest.date, latest.idi, latest.idiText || String(latest.idi));
      });
      stmt.finalize();
    });
    db.close();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

if (require.main === module) run();
