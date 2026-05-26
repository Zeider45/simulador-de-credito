"use client";

import React from "react";

function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => r0;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const fmtShort = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1, notation: "compact" });

export function BalanceChart({ schedule }) {
  if (!schedule || schedule.length < 2)
    return <p className="text-xs text-muted-foreground py-4 text-center">Sin datos de simulacion.</p>;

  const W = 600, H = 220;
  const pad = { top: 16, right: 20, bottom: 38, left: 68 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const baseY = pad.top + cH;

  const pts = schedule.map((row, i) => ({
    i,
    bal: row.startBalanceUvc || 0,
    label: row.dueDate?.slice(5) || `${i + 1}`,
  }));
  const last = schedule[schedule.length - 1];
  pts.push({ i: pts.length, bal: last.balanceUvc || 0, label: "Final" });

  const n = pts.length;
  const maxB = Math.max(...pts.map((p) => p.bal), 1);

  const xS = scaleLinear([0, n - 1], [pad.left, pad.left + cW]);
  const yS = scaleLinear([0, maxB], [baseY, pad.top]);

  const lineStr = pts.map((p, i) => `${xS(i).toFixed(1)},${yS(p.bal).toFixed(1)}`).join(" ");
  const areaStr = `${xS(0).toFixed(1)},${baseY} ${lineStr} ${xS(n - 1).toFixed(1)},${baseY}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: yS(f * maxB),
    val: fmtShort.format(f * maxB),
  }));

  const labelIdxs = [0, Math.floor(n / 2), n - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {yTicks.map((t, i) => (
          <line key={i} x1={pad.left} y1={t.y} x2={pad.left + cW} y2={t.y}
            stroke="rgba(0,0,0,0.07)" strokeDasharray="4 3" />
        ))}
        <polygon points={areaStr} fill="rgba(249,115,22,0.1)" />
        <polyline points={lineStr} fill="none" stroke="#f97316" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />
        {labelIdxs.map((i) => (
          <circle key={i} cx={xS(i)} cy={yS(pts[i].bal)} r={4}
            fill="#f97316" stroke="white" strokeWidth={2} />
        ))}
        {yTicks.map((t, i) => (
          <text key={i} x={pad.left - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {t.val}
          </text>
        ))}
        {labelIdxs.map((i) => (
          <text key={i} x={xS(i)} y={baseY + 18} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {pts[i].label}
          </text>
        ))}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={baseY} stroke="#e5e7eb" />
        <line x1={pad.left} y1={baseY} x2={pad.left + cW} y2={baseY} stroke="#e5e7eb" />
      </svg>
    </div>
  );
}

export function PaymentCompositionChart({ schedule }) {
  if (!schedule || schedule.length === 0)
    return <p className="text-xs text-muted-foreground py-4 text-center">Sin datos de simulacion.</p>;

  const W = 600, H = 220;
  const pad = { top: 16, right: 20, bottom: 40, left: 72 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const baseY = pad.top + cH;
  const n = schedule.length;

  const barW = Math.max(2, (cW / n) * 0.72);
  const barOff = ((cW / n) - barW) / 2;

  const maxVal = Math.max(...schedule.map((r) => (r.interestBs || 0) + (r.amortBs || 0) + (r.moraBs || 0)), 1);
  const pixH = (v) => Math.max(0, ((v || 0) / maxVal) * cH);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: baseY - f * cH,
    val: fmtShort.format(f * maxVal),
  }));

  const xIdx = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {yTicks.map((t, i) => (
          <line key={i} x1={pad.left} y1={t.y} x2={pad.left + cW} y2={t.y}
            stroke="rgba(0,0,0,0.07)" strokeDasharray="4 3" />
        ))}
        {schedule.map((row, i) => {
          const x = pad.left + i * (cW / n) + barOff;
          const ah = pixH(row.amortBs);
          const ih = pixH(row.interestBs);
          const mh = pixH(row.moraBs);
          return (
            <g key={i}>
              <rect x={x} y={baseY - ah} width={barW} height={ah} fill="#60a5fa" rx={1} opacity={0.85} />
              <rect x={x} y={baseY - ah - ih} width={barW} height={ih} fill="#f97316" rx={1} opacity={0.85} />
              {mh > 0 && (
                <rect x={x} y={baseY - ah - ih - mh} width={barW} height={mh} fill="#f43f5e" rx={1} opacity={0.85} />
              )}
            </g>
          );
        })}
        {yTicks.map((t, i) => (
          <text key={i} x={pad.left - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {t.val}
          </text>
        ))}
        {xIdx.map((i) => (
          <text key={i} x={pad.left + i * (cW / n) + barOff + barW / 2}
            y={baseY + 16} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {i + 1}
          </text>
        ))}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={baseY} stroke="#e5e7eb" />
        <line x1={pad.left} y1={baseY} x2={pad.left + cW} y2={baseY} stroke="#e5e7eb" />
        <g transform={`translate(${pad.left}, ${H - 10})`}>
          <rect width={8} height={8} fill="#60a5fa" rx={1} />
          <text x={12} y={8} fontSize={9} fill="#6b7280">Capital</text>
          <rect x={68} width={8} height={8} fill="#f97316" rx={1} />
          <text x={80} y={8} fontSize={9} fill="#6b7280">Interes</text>
          <rect x={130} width={8} height={8} fill="#f43f5e" rx={1} />
          <text x={142} y={8} fontSize={9} fill="#6b7280">Mora</text>
        </g>
      </svg>
    </div>
  );
}
