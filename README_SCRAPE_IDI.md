Scraper for BCV IDI series

Usage:

1. Install dependencies:

```bash
npm install
```

2. Run scraper:

```bash
npm run scrape:idi
```

Outputs:

- `src/lib/idi_series_bcv_full.csv` — CSV file with full historical series (Fecha,IDI).
- `data/idi_series.db` — SQLite database with table `idi_series(date TEXT PRIMARY KEY, idi REAL)`.

Notes:

- The scraper follows pagination links and attempts to extract table rows. If the BCV site changes structure, the parser may need updates.
- Be polite: the script includes a small delay between page requests.
