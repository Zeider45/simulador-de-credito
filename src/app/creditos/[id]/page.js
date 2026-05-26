"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DEFAULT_ACCOUNTS,
  initialParams,
  loadLoans,
  saveLoans,
  upsertLoan,
} from "@/lib/loanStorage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BalanceChart, PaymentCompositionChart } from "@/components/AmortizationChart";

const moneyFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uvcFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const pctFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMoney(v) { return moneyFmt.format(v || 0); }
function fmtUvc(v) { return uvcFmt.format(v || 0); }
function fmtPct(v) { return pctFmt.format(v || 0); }
function fmtMoneyUnit(v) { return `${fmtMoney(v)} Bs`; }
function fmtUvcUnit(v) { return `${fmtUvc(v)} UVC`; }

function Hint({ value, tooltip }) {
  if (!tooltip) return <span>{value}</span>;
  return (
    <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60" title={tooltip}>
      {value}
    </span>
  );
}

function parseAccounts(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function fetchSimulation(params, payments, accountsText) {
  const res = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, payments, accounts: parseAccounts(accountsText) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || "No se pudo simular");
  }
  return res.json();
}

function buildLedgerRows(result) {
  if (!result?.ledger) return [];
  return result.ledger.flatMap((entry) =>
    entry.lines.map((line, i) => ({
      entryDate: entry.date,
      entryDescription: entry.description,
      account: `${line.account.code} ${line.account.name}`,
      debit: line.debit,
      credit: line.credit,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      rowId: `${entry.date}-${entry.description}-${i}`,
    }))
  );
}

function normalizeLoan(raw) {
  if (!raw) return null;
  return {
    ...raw,
    name: raw.name || "",
    params: { ...initialParams, ...(raw.params || {}) },
    accountsText: raw.accountsText || DEFAULT_ACCOUNTS,
    payments: Array.isArray(raw.payments) ? raw.payments : [],
  };
}

function exportScheduleToCSV(schedule, loanName) {
  const headers = [
    "#", "Vencimiento", "Dias", "Saldo UVC", "Interes UVC", "Amort UVC", "Cuota UVC",
    "IDI texto", "IDI venc", "Interes Bs", "Amort Bs", "Cuota Bs", "Saldo Bs",
    "Pago fecha", "Pago Bs", "Dias mora", "Mora Bs", "Estado",
  ];
  const rows = schedule.map((r) => [
    r.index,
    r.dueDate?.slice(0, 10) || "",
    r.daysPeriod,
    (r.startBalanceUvc || 0).toFixed(6),
    (r.interestUvc || 0).toFixed(6),
    (r.amortUvc || 0).toFixed(6),
    (r.paymentUvc || 0).toFixed(6),
    r.idiTextDue || "",
    (r.idiDue || 0).toFixed(6),
    (r.interestBs || 0).toFixed(2),
    (r.amortBs || 0).toFixed(2),
    (r.cuotaBs || 0).toFixed(2),
    (r.balanceBs || 0).toFixed(2),
    r.paymentDate?.slice(0, 10) || "",
    (r.paymentAmount || 0).toFixed(2),
    r.daysLate || 0,
    (r.moraBs || 0).toFixed(2),
    r.status || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${loanName || "simulacion"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportLedgerToCSV(ledgerRows, loanName) {
  const headers = ["Fecha", "Descripcion", "Cuenta", "Debe", "Haber", "Total Debe", "Total Haber"];
  const rows = ledgerRows.map((r) => [
    r.entryDate, r.entryDescription, r.account,
    r.debit ? r.debit.toFixed(2) : "",
    r.credit ? r.credit.toFixed(2) : "",
    r.totalDebit.toFixed(2), r.totalCredit.toFixed(2),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${loanName || "asientos"}_asientos.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LoanPage() {
  const params = useParams();
  const loanId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [idiOptions, setIdiOptions] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!loanId) return;
    const loans = loadLoans();
    const found = loans.find((item) => item.id === loanId);
    const normalized = normalizeLoan(found);
    setLoan(normalized);
    setNameDraft(normalized?.name || "");
    setReady(true);
  }, [loanId]);

  useEffect(() => {
    async function loadIdi() {
      try {
        const res = await fetch("/api/idi/list");
        if (!res.ok) return;
        const data = await res.json();
        const rows = data.rows || [];
        setIdiOptions(rows);
        if (loan && (!loan.params.idi || loan.params.idi === 0) && rows.length) {
          const latest = rows[rows.length - 1];
          persistLoan({ ...loan, params: { ...loan.params, idi: latest.idi, idiDate: latest.date } });
        }
      } catch { /* ignore */ }
    }
    loadIdi();
  }, [loan?.id]);

  const ledgerRows = useMemo(() => buildLedgerRows(loan?.result), [loan?.result]);
  const selectClass = "h-10 w-full rounded-xl border border-border bg-card text-foreground px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const persistLoan = (nextLoan) => {
    const now = new Date().toISOString();
    const payload = { ...nextLoan, createdAt: nextLoan.createdAt || now, updatedAt: now };
    setLoan(payload);
    const loans = loadLoans();
    saveLoans(upsertLoan(loans, payload));
  };

  const handleInputChange = (e) => {
    if (!loan) return;
    const { name, value, type, checked } = e.target;
    persistLoan({ ...loan, params: { ...loan.params, [name]: type === "checkbox" ? checked : value } });
  };

  const handleSwitchChange = (name, checked) => {
    if (!loan) return;
    persistLoan({ ...loan, params: { ...loan.params, [name]: checked } });
  };

  const handleAccountsChange = (value) => {
    if (!loan) return;
    persistLoan({ ...loan, accountsText: value });
  };

  const handlePaymentChange = (index, field, value) => {
    if (!loan) return;
    const nextPayments = [...loan.payments];
    nextPayments[index] = { ...nextPayments[index], [field]: value };
    persistLoan({ ...loan, payments: nextPayments });
  };

  const handleSaveName = () => {
    if (!loan) return;
    persistLoan({ ...loan, name: nameDraft });
    setEditingName(false);
  };

  const handleCalculate = async (applyPayments = false) => {
    if (!loan) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchSimulation(loan.params, applyPayments ? loan.payments : [], loan.accountsText);
      persistLoan({
        ...loan,
        result: data,
        payments: data.schedule.map((row) => ({
          paymentDate: row.paymentDate?.slice(0, 10),
          paymentAmount: row.paymentAmount,
        })),
      });
    } catch (err) {
      setError(err.message || "No se pudo simular");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Cargando credito…
      </div>
    );
  }

  if (!loan) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>Credito no encontrado</CardTitle>
          <CardDescription>No se encontro el credito solicitado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displayName = loan.name || `Credito ${loan.id?.slice(0, 8)}`;
  const summary = loan.result?.summary;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Simulacion individual
          </p>
          {editingName ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="h-9 text-2xl font-semibold w-64"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancelar</Button>
            </div>
          ) : (
            <button
              className="mt-2 flex items-center gap-2 group text-left"
              onClick={() => { setNameDraft(loan.name || ""); setEditingName(true); }}
              title="Editar nombre"
            >
              <h1 className="text-3xl font-semibold">{displayName}</h1>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-sm">✎</span>
            </button>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Ajusta parametros, pagos y plan de cuentas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Volver</Link>
          </Button>
          <Button onClick={() => handleCalculate(false)} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Calculando…
              </span>
            ) : "Calcular"}
          </Button>
          <Button variant="secondary" onClick={() => handleCalculate(true)} disabled={loading}>
            Aplicar pagos
          </Button>
        </div>
      </header>

      {error && (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="py-4 text-sm text-rose-700 dark:text-rose-400">{error}</CardContent>
        </Card>
      )}

      <div className={`grid gap-6 ${sidebarOpen ? "lg:grid-cols-[280px_1fr]" : "grid-cols-1"}`}>
        {/* Sidebar */}
        <aside className={`space-y-4 ${sidebarOpen ? "" : "hidden"}`}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Indicadores de la simulacion actual.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                { label: "Neto recibido", value: summary ? fmtMoneyUnit(summary.netReceived) : "—" },
                { label: "Cuota UVC", value: summary ? fmtUvcUnit(summary.paymentUvc) : "—" },
                { label: "Cuota Bs prom", value: summary ? fmtMoneyUnit(summary.avgCuota) : "—" },
                { label: "Interes total", value: summary ? fmtMoneyUnit(summary.totalInterest) : "—" },
                { label: "Mora total", value: summary ? fmtMoneyUnit(summary.totalMora) : "—" },
                { label: "Saldo final", value: summary ? fmtMoneyUnit(summary.totalOutstanding) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">TIR anual</span>
                <Badge>
                  {summary?.annualIrr != null ? `${fmtPct(summary.annualIrr * 100)} %` : "—"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>IDI publicado</CardTitle>
              <CardDescription>Selecciona el IDI desde base BCV.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>IDI fecha</Label>
              <select
                className={selectClass}
                name="idiDate"
                value={loan.params.idiDate || ""}
                onChange={(e) => {
                  const date = e.target.value;
                  const item = idiOptions.find((r) => r.date === date);
                  if (!item) return handleInputChange({ target: { name: "idiDate", value: date } });
                  persistLoan({ ...loan, params: { ...loan.params, idi: item.idi, idiDate: item.date } });
                }}
              >
                <option value="">-- seleccionar --</option>
                {idiOptions.map((r) => (
                  <option key={r.date} value={r.date}>
                    {`${r.date} — ${r.idi_text || r.idi}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">IDI del BCV para valoracion diaria.</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Reconduccion tras prepago</CardTitle>
              <CardDescription>Ajuste automatico del calendario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Activo</span>
                <Badge variant={loan.params.recomputeAfterPrepay ? "success" : "muted"}>
                  {loan.params.recomputeAfterPrepay ? "Si" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Modo</span>
                <span className="font-semibold">
                  {loan.params.prepayAction === "reduce_installment" ? "Reducir cuota" : "Reducir plazo"}
                </span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Configurar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configuracion de prepago</DialogTitle>
                    <DialogDescription>
                      Elige si el prepago reduce el plazo o la cuota restante.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">Reconducir automaticamente</p>
                        <p className="text-xs text-muted-foreground">Ajusta el calendario tras un prepago.</p>
                      </div>
                      <Switch
                        checked={loan.params.recomputeAfterPrepay}
                        onCheckedChange={(checked) => handleSwitchChange("recomputeAfterPrepay", checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Accion del prepago</Label>
                      <select className={selectClass} name="prepayAction" value={loan.params.prepayAction} onChange={handleInputChange}>
                        <option value="reduce_term">Reducir plazo</option>
                        <option value="reduce_installment">Reducir cuota</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">Listo</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle>Notas rapidas</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>La cuota fija se calcula en UVC con tasa anual/12 y se valora por IDI.</p>
              <p>El IDI futuro crece segun el incremento configurado si no hay datos BCV.</p>
              <p>La vista de detalle muestra mora diaria, feriados y origen IDI.</p>
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <section className="space-y-6 min-w-0">
          <Tabs defaultValue="params">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="params">Parametros</TabsTrigger>
              <TabsTrigger value="simulacion">Simulacion</TabsTrigger>
              <TabsTrigger value="graficos">Graficos</TabsTrigger>
              <TabsTrigger value="asientos">Asientos</TabsTrigger>
            </TabsList>

            {/* PARAMS TAB */}
            <TabsContent value="params" className="space-y-4">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Parametros del credito</CardTitle>
                  <CardDescription>Define montos, tasas y reglas de mora.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2 md:col-span-2 xl:col-span-3">
                    <Label>Nombre del credito</Label>
                    <Input
                      placeholder="Ej: Credito hipotecario cliente A"
                      value={loan.name || ""}
                      onChange={(e) => persistLoan({ ...loan, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capital nominal (Bs)</Label>
                    <Input name="principal" type="number" step="0.01" value={loan.params.principal} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tasa anual (%)</Label>
                    <Input name="annualRate" type="number" step="0.0001" value={loan.params.annualRate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo (meses)</Label>
                    <Input name="termMonths" type="number" step="1" value={loan.params.termMonths} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha desembolso</Label>
                    <Input name="disbursementDate" type="date" value={loan.params.disbursementDate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Primera fecha de pago</Label>
                    <Input name="firstDueDate" type="date" value={loan.params.firstDueDate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>IDI (factor unico)</Label>
                    <Input name="idi" type="number" step="0.00000001" value={loan.params.idi} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Comision desembolso (%)</Label>
                    <Input name="disbursementFeeRate" type="number" step="0.0001" value={loan.params.disbursementFeeRate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base de dias</Label>
                    <select className={selectClass} name="dayCount" value={loan.params.dayCount} onChange={handleInputChange}>
                      <option value="30/360">30/360</option>
                      <option value="actual/365">Actual/365</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valoracion intereses</Label>
                    <select className={selectClass} name="interestValuation" value={loan.params.interestValuation} onChange={handleInputChange}>
                      <option value="idi_due">IDI al vencimiento</option>
                      <option value="idi_daily">IDI diario (sumado)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>IDI faltante</Label>
                    <select className={selectClass} name="idiMissing" value={loan.params.idiMissing} onChange={handleInputChange}>
                      <option value="linear">Interpolacion lineal</option>
                      <option value="carry">Arrastre ultimo IDI</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Incremento IDI futuro</Label>
                    <select className={selectClass} name="idiFutureStep" value={loan.params.idiFutureStep} onChange={handleInputChange}>
                      <option value={0.01}>0.01 diario</option>
                      <option value={0.02}>0.02 diario</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tasa mora anual (%)</Label>
                    <Input name="moraRate" type="number" step="0.0001" value={loan.params.moraRate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias de gracia</Label>
                    <Input name="graceDays" type="number" step="1" value={loan.params.graceDays} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base mora</Label>
                    <select className={selectClass} name="moraBase" value={loan.params.moraBase} onChange={handleInputChange}>
                      <option value="amort">Amortizacion cuota</option>
                      <option value="saldo">Saldo total</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Clasificacion Mora 1 max</Label>
                    <Input name="mora1" type="number" step="1" value={loan.params.mora1} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Clasificacion Mora 2 max</Label>
                    <Input name="mora2" type="number" step="1" value={loan.params.mora2} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Clasificacion Mora 3 max</Label>
                    <Input name="mora3" type="number" step="1" value={loan.params.mora3} onChange={handleInputChange} />
                  </div>
                </CardContent>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  {[
                    { name: "creditUvc", label: "Credito en UVC", desc: "Aplica IDI", key: "creditUvc" },
                    { name: "applyPrepay", label: "Aplicar prepago", desc: "Pago extra a capital", key: "applyPrepay" },
                    { name: "adjustToBusinessDay", label: "Ajuste a dia habil", desc: "Mueve vencimientos", key: "adjustToBusinessDay" },
                  ].map(({ name, label, desc }) => (
                    <div key={name} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={loan.params[name]}
                        onCheckedChange={(checked) => handleSwitchChange(name, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Plan de cuentas (JSON)</CardTitle>
                  <CardDescription>Personaliza codigos y nombres de cuentas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea rows={8} value={loan.accountsText} onChange={(e) => handleAccountsChange(e.target.value)} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* SIMULACION TAB */}
            <TabsContent value="simulacion">
              <Card className="glass">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>Tabla de simulacion</CardTitle>
                      <CardDescription>Cuotas, pagos y valorizacion por grupo. Clic en cuota Bs para detalle diario.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setCompact((v) => !v)}
                        className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        {compact ? "Normal" : "Compacto"}
                      </button>
                      <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                      >
                        {sidebarOpen ? "⟵ Ocultar panel" : "⟶ Mostrar panel"}
                      </button>
                      {loan.result?.schedule?.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportScheduleToCSV(loan.result.schedule, loan.name || loan.id?.slice(0, 8))}
                        >
                          Exportar CSV
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={compact ? "compact" : ""}>
                  {!loan.result ? (
                    <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
                      <p className="text-4xl mb-3">📊</p>
                      <p className="font-semibold">Sin simulacion</p>
                      <p className="text-xs mt-1">Presiona "Calcular" para generar el cronograma de pagos.</p>
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-border bg-card" style={{ maxHeight: "72vh" }}>
                      <table className="schedule-table min-w-[1760px] text-xs">
                        <thead>
                          {/* ── Color group header row ── */}
                          <tr className="group-row">
                            <th colSpan={3}  className="group-info">—</th>
                            <th colSpan={4}  className="group-uvc">UVC</th>
                            <th colSpan={2}  className="group-idi">IDI</th>
                            <th colSpan={8}  className="group-bs">Bolivares</th>
                            <th colSpan={5}  className="group-pagos">Pagos</th>
                            <th colSpan={2}  className="group-mora">Mora</th>
                            <th colSpan={2}  className="group-activos">Activos</th>
                            <th colSpan={2}  className="group-orden">Orden</th>
                            <th colSpan={2}  className="group-moratorio">Moratorio</th>
                            <th colSpan={2}  className="group-valor">Valorizacion</th>
                            <th colSpan={2}  className="group-estado">Estado</th>
                          </tr>
                          {/* ── Column headers ── */}
                          <tr>
                            {["#","Vencimiento","Dias",
                              "Saldo UVC","Interes UVC","Amort UVC","Cuota UVC",
                              "IDI texto","IDI venc",
                              "Interes Bs","Int Base","Int Var","Amort Bs","Amort Base","Amort Var","Cuota Bs","Saldo Bs",
                              "Pago fecha","Pago Bs","Pago cap Bs","Pago cap UVC","Adelant.",
                              "Dias mora","Mora Bs",
                              "Mora act","Conv act",
                              "Mora ord","Conv ord",
                              "Morat 143","Morat 819",
                              "Val cap","Val rend",
                              "Estado","Saldo UVC fin",
                            ].map((h) => <th key={h}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {loan.result.schedule.map((row, paymentIndex) => (
                            <tr key={row.index}>
                              <td className="font-semibold">{row.index}</td>
                              <td>{row.dueDate?.slice(0, 10)}</td>
                              <td>{row.daysPeriod}</td>
                              <td><Hint value={fmtUvcUnit(row.startBalanceUvc)} tooltip={row.explain?.startBalanceUvc} /></td>
                              <td><Hint value={fmtUvcUnit(row.interestUvc)} tooltip={row.explain?.interestUvc} /></td>
                              <td><Hint value={fmtUvcUnit(row.amortUvc)} tooltip={row.explain?.amortUvc} /></td>
                              <td><Hint value={fmtUvcUnit(row.paymentUvc)} tooltip={row.explain?.paymentUvc} /></td>
                              <td className="max-w-[90px] truncate"><Hint value={row.idiTextDue || "—"} tooltip={row.explain?.idiDue} /></td>
                              <td><Hint value={fmtUvc(row.idiDue)} tooltip={row.explain?.idiDue} /></td>
                              <td><Hint value={fmtMoneyUnit(row.interestBs)} tooltip={row.explain?.interestBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.interesBaseBs)} tooltip={row.explain?.interestBaseBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.interesVarBs)} tooltip={row.explain?.interestVarBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.amortBs)} tooltip={row.explain?.amortBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.amortBaseBs)} tooltip={row.explain?.amortBaseBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.amortVarBs)} tooltip={row.explain?.amortVarBs} /></td>
                              <td>
                                <Link href={`/creditos/${loan.id}/detalle/${row.index}`} className="font-semibold text-primary underline underline-offset-2">
                                  <Hint value={fmtMoneyUnit(row.cuotaBs)} tooltip={row.explain?.cuotaBs} />
                                </Link>
                              </td>
                              <td><Hint value={fmtMoneyUnit(row.balanceBs)} tooltip={row.explain?.saldoBs} /></td>
                              <td>
                                <input type="date"
                                  value={loan.payments[paymentIndex]?.paymentDate || row.dueDate?.slice(0, 10)}
                                  onChange={(e) => handlePaymentChange(paymentIndex, "paymentDate", e.target.value)} />
                              </td>
                              <td>
                                <input type="number" step="0.01"
                                  value={loan.payments[paymentIndex]?.paymentAmount ?? row.paymentAmount}
                                  onChange={(e) => handlePaymentChange(paymentIndex, "paymentAmount", Number(e.target.value))} />
                              </td>
                              <td>{fmtMoneyUnit(row.paidPrincipalBs || 0)}</td>
                              <td>{fmtUvcUnit(row.paidPrincipalUvc || 0)}</td>
                              <td>
                                <Badge variant={row.paidEarly ? "success" : "muted"}>{row.paidEarly ? "Si" : "No"}</Badge>
                              </td>
                              <td><Hint value={row.daysLate} tooltip={row.explain?.daysLate} /></td>
                              <td><Hint value={fmtMoneyUnit(row.moraBs)} tooltip={row.explain?.moraBs} /></td>
                              <td><Hint value={fmtMoneyUnit(row.activeMora)} tooltip={row.explain?.activeMora} /></td>
                              <td><Hint value={fmtMoneyUnit(row.activeConv)} tooltip={row.explain?.activeConv} /></td>
                              <td><Hint value={fmtMoneyUnit(row.orderMora)} tooltip={row.explain?.orderMora} /></td>
                              <td><Hint value={fmtMoneyUnit(row.orderConv)} tooltip={row.explain?.orderConv} /></td>
                              <td><Hint value={fmtMoneyUnit(row.moratorio143)} tooltip={row.explain?.moratorio143} /></td>
                              <td><Hint value={fmtMoneyUnit(row.moratorio819)} tooltip={row.explain?.moratorio819} /></td>
                              <td>{fmtMoneyUnit(row.valorPaidUvcCapital || 0)}</td>
                              <td>{fmtMoneyUnit(row.valorPaidUvcRend || 0)}</td>
                              <td>{row.status}</td>
                              <td><Hint value={fmtUvcUnit(row.balanceUvc)} tooltip={row.explain?.balanceUvc} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* GRAFICOS TAB */}
            <TabsContent value="graficos" className="space-y-4">
              {!loan.result ? (
                <Card className="glass">
                  <CardContent className="py-14 text-center text-muted-foreground">
                    <p className="text-3xl mb-2">📈</p>
                    <p className="font-semibold">Sin datos</p>
                    <p className="text-xs mt-1">Ejecuta la simulacion primero para ver los graficos.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle>Saldo UVC en el tiempo</CardTitle>
                      <CardDescription>Evolucion del saldo en Unidades de Valor Constante por cuota.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BalanceChart schedule={loan.result.schedule} />
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardHeader>
                      <CardTitle>Composicion de cuotas (Bs)</CardTitle>
                      <CardDescription>Desglose de capital, interes y mora por cada cuota.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentCompositionChart schedule={loan.result.schedule} />
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardHeader>
                      <CardTitle>Estadisticas generales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        {[
                          { label: "TIR anual", value: summary.annualIrr != null ? `${fmtPct(summary.annualIrr * 100)} %` : "—" },
                          { label: "TIR mensual", value: summary.annualIrr != null ? `${fmtPct((Math.pow(1 + summary.annualIrr, 1 / 12) - 1) * 100)} %` : "—" },
                          { label: "Cuota UVC fija", value: fmtUvcUnit(summary.paymentUvc) },
                          { label: "Cuota Bs promedio", value: fmtMoneyUnit(summary.avgCuota) },
                          { label: "Total interes Bs", value: fmtMoneyUnit(summary.totalInterest) },
                          { label: "Total mora Bs", value: fmtMoneyUnit(summary.totalMora) },
                          { label: "Neto recibido", value: fmtMoneyUnit(summary.netReceived) },
                          { label: "Saldo pendiente", value: fmtMoneyUnit(summary.totalOutstanding) },
                          {
                            label: "Ratio interes/capital",
                            value: loan.params.principal
                              ? `${fmtPct((summary.totalInterest / loan.params.principal) * 100)} %`
                              : "—",
                          },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="mt-1 font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ASIENTOS TAB */}
            <TabsContent value="asientos">
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>Asientos contables</CardTitle>
                      <CardDescription>Generados por la simulacion actual.</CardDescription>
                    </div>
                    {ledgerRows.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportLedgerToCSV(ledgerRows, loan.name || loan.id?.slice(0, 8))}
                      >
                        Exportar CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                    <table className="min-w-[900px] text-sm">
                      <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          {["Fecha","Descripcion","Cuenta","Debe","Haber","Total Debe","Total Haber"].map((h) => (
                            <th key={h} className="px-3 py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ledgerRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                              Ejecuta la simulacion para generar los asientos.
                            </td>
                          </tr>
                        ) : (
                          ledgerRows.map((r) => (
                            <tr key={r.rowId} className="hover:bg-secondary/40">
                              <td className="px-3 py-2">{r.entryDate}</td>
                              <td className="px-3 py-2">{r.entryDescription}</td>
                              <td className="px-3 py-2">{r.account}</td>
                              <td className="px-3 py-2">{r.debit ? fmtMoneyUnit(r.debit) : ""}</td>
                              <td className="px-3 py-2">{r.credit ? fmtMoneyUnit(r.credit) : ""}</td>
                              <td className="px-3 py-2">{fmtMoneyUnit(r.totalDebit)}</td>
                              <td className="px-3 py-2">{fmtMoneyUnit(r.totalCredit)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
