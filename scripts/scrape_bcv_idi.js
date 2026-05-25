const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const BASE = 'https://www.bcv.org.ve/estadisticas/indice-de-inversion';

function normalizeDateDMY(text) {
  // expects formats like '19-05-2026' or '19/05/2026' or '19 May 2026'
  const m = text.match(/(\d{1,2})[\-\/]?(\d{1,2})[\-\/]?(\d{4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const y = m[3];
    return `${y}-${mo}-${d}`;
  }
  // fallback: try to parse with Date
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

async function fetchPage(url) {
  const https = require('https');
  const agent = new https.Agent({ rejectUnauthorized: false });
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'node-scraper' },
    timeout: 20000,
    httpsAgent: agent,
  });
  return res.data;
}

function extractRows(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('table.views-table tbody tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const rawDate = $(tds[0]).text().trim();
      // IDI seems to be in the last column
      const rawIdi = $(tds[tds.length - 1]).text().trim();
      const date = normalizeDateDMY(rawDate);
      if (date) {
        // extract numeric-like portion (keep commas/dots)
        const m = rawIdi.match(/[\d.,]+/);
        if (m) {
          const rawNum = m[0];
          // normalize to dot decimal, remove thousands separators
          const idiText = rawNum.replace(/\./g, '').replace(/,/g, '.');
          const idi = Number(idiText);
          if (!Number.isNaN(idi)) rows.push({ date, idi: idi, idiText });
        }
      }
    }
  });
  // fallback: try any table-like rows separated by pipes
  if (rows.length === 0) {
    // find lines like '| 19-05-2026 | 517,96190000 | N/A | 2,53228857 |'
    const lines = html.split(/\r?\n/);
    for (const line of lines) {
      if (line.indexOf('|') >= 0) {
        const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const maybeDate = parts[0];
          const maybeIdi = parts[parts.length - 1];
          const date = normalizeDateDMY(maybeDate);
          const m = maybeIdi.match(/[\d.,]+/);
          if (date && m) {
            const rawNum = m[0];
            const idiText = rawNum.replace(/\./g, '').replace(/,/g, '.');
            const idi = Number(idiText);
            if (!Number.isNaN(idi)) rows.push({ date, idi: idi, idiText });
          }
        }
      }
    }
  }
  return rows;
}

function findNextHref(html) {
  const $ = cheerio.load(html);
  // try pager-next
  const next = $('li.pager-next a').attr('href') || $('a:contains("siguiente")').attr('href');
  if (next) return new URL(next, BASE).href;
  // try link with rel next
  const relNext = $('a[rel="next"]').attr('href');
  if (relNext) return new URL(relNext, BASE).href;
  return null;
}

async function run() {
  const visited = new Set();
  let nextUrl = BASE;
  const map = new Map();

  while (nextUrl && !visited.has(nextUrl)) {
    console.log('Fetching', nextUrl);
    visited.add(nextUrl);
    let html;
    try {
      html = await fetchPage(nextUrl);
    } catch (err) {
      console.error('Fetch failed', nextUrl, err.message);
      break;
    }
    const rows = extractRows(html);
    for (const r of rows) map.set(r.date, { idi: r.idi, idiText: r.idiText || String(r.idi) });

    const candidate = findNextHref(html);
    if (!candidate || visited.has(candidate)) break;
    nextUrl = candidate;
    // polite pause
    await new Promise((res) => setTimeout(res, 800));
  }

  const sorted = Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const csvLines = ['# Fecha,IDI', ...sorted.map(([d, v]) => `${d},${v.idiText}`)];
  const outDir = path.join(__dirname, '..', 'src', 'lib');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, 'idi_series_bcv_full.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log('Saved CSV to', csvPath);

  // Save to sqlite
  const dbDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'idi_series.db');
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS idi_series (date TEXT PRIMARY KEY, idi REAL, idi_text TEXT)');
    const stmt = db.prepare('INSERT OR REPLACE INTO idi_series (date, idi, idi_text) VALUES (?, ?, ?)');
    for (const [date, v] of sorted) {
      stmt.run(date, v.idi, v.idiText);
    }
    stmt.finalize();
  });
  db.close();
  console.log('Saved to SQLite DB at', dbPath);
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
