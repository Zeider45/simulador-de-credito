const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const input = path.resolve(__dirname, '..', 'Tabla amortizacion nayrobis bolivar-1.xlsx');
const outDir = path.resolve(__dirname, '..', 'data', 'xls_converted');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(1);
}

const wb = XLSX.readFile(input, { cellStyles: true });
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach((name) => {
  const ws = wb.Sheets[name];
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',' });
  const out = path.join(outDir, `${name.replace(/[^a-z0-9]/gi, '_')}.csv`);
  fs.writeFileSync(out, csv, 'utf8');
  console.log('Wrote', out);
});

console.log('Done. Converted sheets to', outDir);
