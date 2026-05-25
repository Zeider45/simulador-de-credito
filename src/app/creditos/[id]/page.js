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

function moneyFormatter() {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const moneyFmt = moneyFormatter();

const uvcFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6,
});

const percentFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return moneyFmt.format(value || 0);
}

function formatUvc(value) {
  return uvcFormatter.format(value || 0);
}

function formatPercent(value) {
  return percentFormatter.format(value || 0);
}

function formatMoneyWithUnit(value) {
  return `${formatMoney(value)} Bs`;
}

function formatUvcWithUnit(value) {
  return `${formatUvc(value)} UVC`;
}

function Hint({ value, tooltip }) {
  if (!tooltip) return <span>{value}</span>;
  return (
    <span className="cursor-help underline decoration-dotted decoration-muted-foreground/60" title={tooltip}>
      {value}
    </span>
  );
}

function parseAccounts(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchSimulation(params, payments, accountsText) {
  const response = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, payments, accounts: parseAccounts(accountsText) }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error || "No se pudo simular");
  }

  return response.json();
}

function buildLedgerRows(result) {
  if (!result?.ledger) return [];
  return result.ledger.flatMap((entry) =>
    entry.lines.map((line, index) => ({
      entryDate: entry.date,
      entryDescription: entry.description,
      account: `${line.account.code} ${line.account.name}`,
      debit: line.debit,
      credit: line.credit,
      totalDebit: entry.totalDebit,
      totalCredit: entry.totalCredit,
      rowId: `${entry.date}-${entry.description}-${index}`,
    }))
  );
}

function normalizeLoan(raw) {
  if (!raw) return null;
  return {
    ...raw,
    params: { ...initialParams, ...(raw.params || {}) },
    accountsText: raw.accountsText || DEFAULT_ACCOUNTS,
    payments: Array.isArray(raw.payments) ? raw.payments : [],
  };
}

export default function LoanPage() {
  const params = useParams();
  const loanId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [idiOptions, setIdiOptions] = useState([]);

  useEffect(() => {
    if (!loanId) return;
    const loans = loadLoans();
    const found = loans.find((item) => item.id === loanId);
    setLoan(normalizeLoan(found));
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
      } catch (e) {
        // ignore
      }
    }
    loadIdi();
  }, [loan]);

  const columnHints = loan?.result?.columnHints || {};
  const ledgerRows = useMemo(() => buildLedgerRows(loan?.result), [loan?.result]);
  const selectClass = "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const persistLoan = (nextLoan) => {
    const now = new Date().toISOString();
    const payload = { ...nextLoan, createdAt: nextLoan.createdAt || now, updatedAt: now };
    setLoan(payload);
    const loans = loadLoans();
    const next = upsertLoan(loans, payload);
    saveLoans(next);
  };

  const handleInputChange = (event) => {
    if (!loan) return;
    const { name, value, type, checked } = event.target;
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

  const handleCalculate = async (applyPayments = false) => {
    if (!loan) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchSimulation(loan.params, applyPayments ? loan.payments : [], loan.accountsText);
      persistLoan({
        ...loan,
        result: data,
        payments: data.schedule.map((row) => ({ paymentDate: row.paymentDate?.slice(0, 10), paymentAmount: row.paymentAmount })),
      });
    } catch (err) {
      setError(err.message || "No se pudo simular");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="text-sm text-muted-foreground">Cargando credito...</div>;
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
            <Link href="/">Volver al home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Simulacion individual</p>
          <h1 className="mt-2 text-3xl font-semibold">Credito {loan.id?.slice(0, 8)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajusta parametros, calendario de pagos y plan de cuentas para este credito.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Volver</Link>
          </Button>
          <Button onClick={() => handleCalculate(false)} disabled={loading}>
            {loading ? "Calculando..." : "Calcular"}
          </Button>
          <Button variant="secondary" onClick={() => handleCalculate(true)} disabled={loading}>
            Aplicar pagos
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-rose-200 bg-rose-50/70">
          <CardContent className="py-4 text-sm text-rose-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Indicadores principales de la simulacion actual.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Neto recibido</span>
                <span className="font-semibold">{loan.result ? formatMoneyWithUnit(loan.result.summary.netReceived) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cuota UVC</span>
                <span className="font-semibold">{loan.result ? formatUvcWithUnit(loan.result.summary.paymentUvc) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cuota Bs prom</span>
                <span className="font-semibold">{loan.result ? formatMoneyWithUnit(loan.result.summary.avgCuota) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interes total</span>
                <span className="font-semibold">{loan.result ? formatMoneyWithUnit(loan.result.summary.totalInterest) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mora total</span>
                <span className="font-semibold">{loan.result ? formatMoneyWithUnit(loan.result.summary.totalMora) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo final</span>
                <span className="font-semibold">{loan.result ? formatMoneyWithUnit(loan.result.summary.totalOutstanding) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">TIR anual</span>
                <Badge>{loan.result && loan.result.summary.annualIrr !== null ? `${formatPercent(loan.result.summary.annualIrr * 100)} %` : "-"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>IDI publicado</CardTitle>
              <CardDescription>Selecciona el IDI desde la base BCV.</CardDescription>
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
              <p className="text-xs text-muted-foreground">Se usa el IDI del BCV para valoracion diaria.</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Reconduccion tras prepago</CardTitle>
              <CardDescription>Configura el ajuste automatico del calendario.</CardDescription>
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
                  <Button variant="outline">Configurar</Button>
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
                      <select
                        className={selectClass}
                        name="prepayAction"
                        value={loan.params.prepayAction}
                        onChange={handleInputChange}
                      >
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
            <CardHeader>
              <CardTitle>Notas rapidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>La cuota fija se calcula en UVC con tasa anual/12 y se valora por IDI.</p>
              <p>El IDI futuro crece segun el incremento configurado si no hay datos.</p>
              <p>La vista de detalle muestra mora diaria, feriados y origen IDI.</p>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <Tabs defaultValue="params">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="params">Parametros</TabsTrigger>
              <TabsTrigger value="simulacion">Simulacion</TabsTrigger>
              <TabsTrigger value="asientos">Asientos</TabsTrigger>
            </TabsList>

            <TabsContent value="params">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Parametros del credito</CardTitle>
                  <CardDescription>Define montos, tasas y reglas de mora.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Credito en UVC</p>
                      <p className="text-xs text-muted-foreground">Aplica IDI</p>
                    </div>
                    <Switch checked={loan.params.creditUvc} onCheckedChange={(checked) => handleSwitchChange("creditUvc", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Aplicar prepago</p>
                      <p className="text-xs text-muted-foreground">Pago extra a capital</p>
                    </div>
                    <Switch checked={loan.params.applyPrepay} onCheckedChange={(checked) => handleSwitchChange("applyPrepay", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Ajuste a dia habil</p>
                      <p className="text-xs text-muted-foreground">Mueve vencimientos</p>
                    </div>
                    <Switch checked={loan.params.adjustToBusinessDay} onCheckedChange={(checked) => handleSwitchChange("adjustToBusinessDay", checked)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Plan de cuentas (JSON)</CardTitle>
                  <CardDescription>Personaliza codigos y nombres de cuentas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea rows={8} value={loan.accountsText} onChange={(event) => handleAccountsChange(event.target.value)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simulacion">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Tabla de simulacion</CardTitle>
                  <CardDescription>Consulta cuotas, pagos y valorizacion. Haz clic en la cuota para detalle.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-border bg-white">
                    <table className="min-w-[1700px] text-xs">
                      <thead className="bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Vencimiento</th>
                          <th className="px-3 py-2">Dias</th>
                          <th className="px-3 py-2">Saldo UVC</th>
                          <th className="px-3 py-2">Interes UVC</th>
                          <th className="px-3 py-2">Amort UVC</th>
                          <th className="px-3 py-2">Cuota UVC</th>
                          <th className="px-3 py-2">IDI texto</th>
                          <th className="px-3 py-2">IDI venc</th>
                          <th className="px-3 py-2">Interes Bs</th>
                          <th className="px-3 py-2">Interes Base Bs</th>
                          <th className="px-3 py-2">Interes Var Bs</th>
                          <th className="px-3 py-2">Amort Bs</th>
                          <th className="px-3 py-2">Amort Base Bs</th>
                          <th className="px-3 py-2">Amort Var Bs</th>
                          <th className="px-3 py-2">Cuota Bs</th>
                          <th className="px-3 py-2">Saldo Bs</th>
                          <th className="px-3 py-2">Pago fecha</th>
                          <th className="px-3 py-2">Pago Bs</th>
                          <th className="px-3 py-2">Pago capital Bs</th>
                          <th className="px-3 py-2">Pago capital UVC</th>
                          <th className="px-3 py-2">Pago adelantado</th>
                          <th className="px-3 py-2">Dias mora</th>
                          <th className="px-3 py-2">Mora Bs</th>
                          <th className="px-3 py-2">Rend mora act</th>
                          <th className="px-3 py-2">Rend conv act</th>
                          <th className="px-3 py-2">Rend mora ord</th>
                          <th className="px-3 py-2">Rend conv ord</th>
                          <th className="px-3 py-2">Moratorio 143</th>
                          <th className="px-3 py-2">Moratorio 819</th>
                          <th className="px-3 py-2">Val UVC cap</th>
                          <th className="px-3 py-2">Val UVC rend</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Saldo UVC fin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {loan.result?.schedule?.map((row, paymentIndex) => (
                          <tr key={row.index} className="hover:bg-secondary/40">
                            <td className="px-3 py-2 font-semibold">{row.index}</td>
                            <td className="px-3 py-2">{row.dueDate?.slice(0, 10)}</td>
                            <td className="px-3 py-2">{row.daysPeriod}</td>
                            <td className="px-3 py-2"><Hint value={formatUvcWithUnit(row.startBalanceUvc)} tooltip={row.explain?.startBalanceUvc} /></td>
                            <td className="px-3 py-2"><Hint value={formatUvcWithUnit(row.interestUvc)} tooltip={row.explain?.interestUvc} /></td>
                            <td className="px-3 py-2"><Hint value={formatUvcWithUnit(row.amortUvc)} tooltip={row.explain?.amortUvc} /></td>
                            <td className="px-3 py-2"><Hint value={formatUvcWithUnit(row.paymentUvc)} tooltip={row.explain?.paymentUvc} /></td>
                            <td className="px-3 py-2"><Hint value={row.idiTextDue || "-"} tooltip={row.explain?.idiDue} /></td>
                            <td className="px-3 py-2"><Hint value={formatUvc(row.idiDue)} tooltip={row.explain?.idiDue} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.interestBs)} tooltip={row.explain?.interestBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.interesBaseBs)} tooltip={row.explain?.interestBaseBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.interesVarBs)} tooltip={row.explain?.interestVarBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.amortBs)} tooltip={row.explain?.amortBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.amortBaseBs)} tooltip={row.explain?.amortBaseBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.amortVarBs)} tooltip={row.explain?.amortVarBs} /></td>
                            <td className="px-3 py-2">
                              <Link href={`/creditos/${loan.id}/detalle/${row.index}`} className="font-semibold text-primary underline">
                                <Hint value={formatMoneyWithUnit(row.cuotaBs)} tooltip={row.explain?.cuotaBs} />
                              </Link>
                            </td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.balanceBs)} tooltip={row.explain?.saldoBs} /></td>
                            <td className="px-3 py-2">
                              <Input
                                type="date"
                                className="h-8 w-[140px]"
                                value={loan.payments[paymentIndex]?.paymentDate || row.dueDate?.slice(0, 10)}
                                onChange={(e) => handlePaymentChange(paymentIndex, "paymentDate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 w-[120px]"
                                value={loan.payments[paymentIndex]?.paymentAmount ?? row.paymentAmount}
                                onChange={(e) => handlePaymentChange(paymentIndex, "paymentAmount", Number(e.target.value))}
                              />
                            </td>
                            <td className="px-3 py-2">{formatMoneyWithUnit(row.paidPrincipalBs || 0)}</td>
                            <td className="px-3 py-2">{formatUvcWithUnit(row.paidPrincipalUvc || 0)}</td>
                            <td className="px-3 py-2">
                              <Badge variant={row.paidEarly ? "success" : "muted"}>{row.paidEarly ? "Si" : "No"}</Badge>
                            </td>
                            <td className="px-3 py-2"><Hint value={row.daysLate} tooltip={row.explain?.daysLate} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.moraBs)} tooltip={row.explain?.moraBs} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.activeMora)} tooltip={row.explain?.activeMora} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.activeConv)} tooltip={row.explain?.activeConv} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.orderMora)} tooltip={row.explain?.orderMora} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.orderConv)} tooltip={row.explain?.orderConv} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.moratorio143)} tooltip={row.explain?.moratorio143} /></td>
                            <td className="px-3 py-2"><Hint value={formatMoneyWithUnit(row.moratorio819)} tooltip={row.explain?.moratorio819} /></td>
                            <td className="px-3 py-2">{formatMoneyWithUnit(row.valorPaidUvcCapital || 0)}</td>
                            <td className="px-3 py-2">{formatMoneyWithUnit(row.valorPaidUvcRend || 0)}</td>
                            <td className="px-3 py-2">{row.status}</td>
                            <td className="px-3 py-2"><Hint value={formatUvcWithUnit(row.balanceUvc)} tooltip={row.explain?.balanceUvc} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="asientos">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Asientos contables</CardTitle>
                  <CardDescription>Generados por la simulacion actual.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-border bg-white">
                    <table className="min-w-[900px] text-sm">
                      <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Descripcion</th>
                          <th className="px-3 py-2">Cuenta</th>
                          <th className="px-3 py-2">Debe</th>
                          <th className="px-3 py-2">Haber</th>
                          <th className="px-3 py-2">Total Debe</th>
                          <th className="px-3 py-2">Total Haber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ledgerRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                              Ejecuta la simulacion para generar los asientos.
                            </td>
                          </tr>
                        ) : (
                          ledgerRows.map((r) => (
                            <tr key={r.rowId} className="hover:bg-secondary/40">
                              <td className="px-3 py-2">{r.entryDate}</td>
                              <td className="px-3 py-2">{r.entryDescription}</td>
                              <td className="px-3 py-2">{r.account}</td>
                              <td className="px-3 py-2">{r.debit ? formatMoneyWithUnit(r.debit) : ""}</td>
                              <td className="px-3 py-2">{r.credit ? formatMoneyWithUnit(r.credit) : ""}</td>
                              <td className="px-3 py-2">{formatMoneyWithUnit(r.totalDebit)}</td>
                              <td className="px-3 py-2">{formatMoneyWithUnit(r.totalCredit)}</td>
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
