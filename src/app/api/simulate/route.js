import { NextResponse } from "next/server";
import { simulateLoan } from "@/lib/simulator";
import path from 'path';
import sqlite3 from 'sqlite3';

export async function POST(request) {
  try {
    const body = await request.json();

    // Load IDI series from SQLite DB and inject into input so simulator uses DB values
    try {
      const dbPath = path.join(process.cwd(), 'data', 'idi_series.db');
      const db = new sqlite3.Database(dbPath);
      const rows = await new Promise((resolve, reject) => {
        db.all('SELECT date, idi, idi_text FROM idi_series ORDER BY date ASC', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      db.close();
      if (Array.isArray(rows) && rows.length) {
        const text = rows.map(r => `${r.date},${r.idi_text || r.idi}`).join('\n');
        body.idiSeriesText = text;
      }
    } catch (e) {
      // ignore DB errors, fallback to whatever input provided
    }

    const result = simulateLoan(body || {});
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo procesar la simulacion", details: error.message },
      { status: 400 }
    );
  }
}
