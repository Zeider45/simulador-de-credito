import { NextResponse } from 'next/server';
import path from 'path';
import sqlite3 from 'sqlite3';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'idi_series.db');
    const db = new sqlite3.Database(dbPath);
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT date, idi FROM idi_series ORDER BY date ASC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    db.close();
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
