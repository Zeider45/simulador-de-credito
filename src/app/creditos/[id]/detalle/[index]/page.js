"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { loadLoans } from "@/lib/loanStorage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function moneyFormatter() {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const moneyFmt = moneyFormatter();
const uvcFormatter = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
function fmtMoney(v) { return moneyFmt.format(v || 0); }
function fmtUvc(v) { return uvcFormatter.format(v || 0); }

function normalizeLoan(raw) {
  if (!raw) return null;
  return { ...raw, params: { ...(raw.params || {}) }, payments: Array.isArray(raw.payments) ? raw.payments : [] };
}

export default function InstallmentDetailPage() {
  const params = useParams();
  const loanId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const indexParam = Array.isArray(params?.index) ? params.index[0] : params?.index;
  const index = Number(indexParam);

  const [loan, setLoan] = useState(null);

  useEffect(() => {
    if (!loanId) return;
    const loans = loadLoans();
    const found = loans.find((l) => l.id === loanId);
    setLoan(normalizeLoan(found));
  }, [loanId]);

  if (!loan) return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Credito no encontrado</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={`/creditos/${loanId}`}>Volver</Link>
        </Button>
      </CardContent>
    </Card>
  );

  const row = loan.result?.schedule?.find((r) => r.index === index);
  const total = loan.result?.schedule?.length || 0;
  const prev = index > 1 ? `/creditos/${loanId}/detalle/${index - 1}` : null;
  const next = index < total ? `/creditos/${loanId}/detalle/${index + 1}` : null;

  if (!row) return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Detalle cuota {index}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">No existe la cuota solicitada.</p>
        <Button asChild variant="outline">
          <Link href={`/creditos/${loanId}`}>Volver</Link>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Detalle de cuota</p>
          <h1 className="mt-2 text-2xl font-semibold">Credito {loan.id?.slice?.(0, 8)} — Cuota {row.index}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Detalle diario y calculos desglosados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/creditos/${loanId}`}>Volver</Link>
          </Button>
          {prev ? (
            <Button asChild variant="secondary">
              <Link href={prev}>Anterior</Link>
            </Button>
          ) : null}
          {next ? (
            <Button asChild>
              <Link href={next}>Siguiente</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Resumen cuota</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Vencimiento</p>
            <p className="text-sm font-semibold">{row.dueDate?.slice(0, 10)}</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Saldo UVC inicio</p>
            <p className="text-sm font-semibold">{fmtUvc(row.startBalanceUvc)} UVC</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Interes UVC</p>
            <p className="text-sm font-semibold">{fmtUvc(row.interestUvc)} UVC</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Amort UVC</p>
            <p className="text-sm font-semibold">{fmtUvc(row.amortUvc)} UVC</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Interes Bs</p>
            <p className="text-sm font-semibold">{fmtMoney(row.interestBs)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Amort Bs</p>
            <p className="text-sm font-semibold">{fmtMoney(row.amortBs)} Bs</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Pagos y valorizacion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pago capital Bs</p>
            <p className="text-sm font-semibold">{fmtMoney(row.paidPrincipalBs || 0)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pago capital UVC</p>
            <p className="text-sm font-semibold">{fmtUvc(row.paidPrincipalUvc || 0)} UVC</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pago adelantado</p>
            <Badge variant={row.paidEarly ? "success" : "muted"}>{row.paidEarly ? "Si" : "No"}</Badge>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Val UVC capital (pagado)</p>
            <p className="text-sm font-semibold">{fmtMoney(row.valorPaidUvcCapital || 0)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Val UVC rend (pagado)</p>
            <p className="text-sm font-semibold">{fmtMoney(row.valorPaidUvcRend || 0)} Bs</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Mora y clasificacion — Cuota {row.index}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Dias mora</p>
            <p className="text-sm font-semibold">{row.daysLate ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Mora Bs</p>
            <p className="text-sm font-semibold">{fmtMoney(row.moraBs)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Estado</p>
            <p className="text-sm font-semibold">{row.status}</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pagado mora</p>
            <p className="text-sm font-semibold">{fmtMoney(row.paidMora)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pagado interes</p>
            <p className="text-sm font-semibold">{fmtMoney(row.paidInterest)} Bs</p>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Pagado capital</p>
            <p className="text-sm font-semibold">{fmtMoney(row.paidPrincipal)} Bs</p>
          </div>
        </CardContent>

        <CardContent>
          <h3 className="mb-2 text-sm font-semibold">Desglose clasificacion</h3>
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="min-w-[520px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Componente</th>
                  <th className="px-3 py-2">Activos</th>
                  <th className="px-3 py-2">Orden</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-3 py-2">Mora (Bs)</td><td className="px-3 py-2">{fmtMoney(row.activeMora)} Bs</td><td className="px-3 py-2">{fmtMoney(row.orderMora)} Bs</td></tr>
                <tr><td className="px-3 py-2">Rendimiento/Interes (Bs)</td><td className="px-3 py-2">{fmtMoney(row.activeConv)} Bs</td><td className="px-3 py-2">{fmtMoney(row.orderConv)} Bs</td></tr>
                <tr><td className="px-3 py-2">Moratorio 143</td><td className="px-3 py-2" colSpan={2}>{fmtMoney(row.moratorio143)} Bs</td></tr>
                <tr><td className="px-3 py-2">Moratorio 819</td><td className="px-3 py-2" colSpan={2}>{fmtMoney(row.moratorio819)} Bs</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Detalle mora diaria (post-vencimiento)</CardTitle>
        </CardHeader>
        <CardContent>
          {row.moraBreakdown && row.moraBreakdown.length ? (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="min-w-[900px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Feriado</th>
                    <th className="px-3 py-2">Fin semana</th>
                    <th className="px-3 py-2">Origen IDI</th>
                    <th className="px-3 py-2">IDI texto</th>
                    <th className="px-3 py-2">IDI</th>
                    <th className="px-3 py-2">Mora UVC</th>
                    <th className="px-3 py-2">Mora Bs (dia)</th>
                    <th className="px-3 py-2">Mora Bs (acum)</th>
                    <th className="px-3 py-2">Genera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {row.moraBreakdown.map((m) => (
                    <tr key={m.date}>
                      <td className="px-3 py-2">{m.date}</td>
                      <td className="px-3 py-2">{m.isHoliday ? "Feriado" : ""}</td>
                      <td className="px-3 py-2">{m.isWeekend ? "Si" : ""}</td>
                      <td className="px-3 py-2">{m.idiSource === "BCV" ? "BCV" : "Inventado"}</td>
                      <td className="px-3 py-2">{m.idiText || "-"}</td>
                      <td className="px-3 py-2">{fmtUvc(m.idi)}</td>
                      <td className="px-3 py-2">{fmtUvc(m.dailyMoraUvc)} UVC</td>
                      <td className="px-3 py-2">{fmtMoney(m.dailyMoraBs)} Bs</td>
                      <td className="px-3 py-2">{fmtMoney(m.cumMoraBs)} Bs</td>
                      <td className="px-3 py-2">{m.isAccruingMora ? "Genera" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay mora generada para esta cuota.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Detalle diario — Cuota {row.index}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="min-w-[1200px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Feriado</th>
                  <th className="px-3 py-2">Fin semana</th>
                  <th className="px-3 py-2">Origen IDI</th>
                  <th className="px-3 py-2">IDI texto</th>
                  <th className="px-3 py-2">IDI</th>
                  <th className="px-3 py-2">Saldo UVC ini</th>
                  <th className="px-3 py-2">Interes diario UVC</th>
                  <th className="px-3 py-2">Interes diario Bs</th>
                  <th className="px-3 py-2">Acum. Interes UVC</th>
                  <th className="px-3 py-2">Acum. Interes Bs</th>
                  <th className="px-3 py-2">Amort UVC (dia)</th>
                  <th className="px-3 py-2">Amort Bs (dia)</th>
                  <th className="px-3 py-2">Pago Bs (dia)</th>
                  <th className="px-3 py-2">Saldo UVC fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {row.dailyBreakdown?.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-2">{d.date}</td>
                    <td className="px-3 py-2">{d.isHoliday ? "Feriado" : ""}</td>
                    <td className="px-3 py-2">{d.isWeekend ? "Si" : ""}</td>
                    <td className="px-3 py-2">{d.idiSource === "BCV" ? "BCV" : "Inventado"}</td>
                    <td className="px-3 py-2">{d.idiText || "-"}</td>
                    <td className="px-3 py-2">{fmtUvc(d.idi)}</td>
                    <td className="px-3 py-2">{fmtUvc(d.startBalanceUvc)} UVC</td>
                    <td className="px-3 py-2">{fmtUvc(d.dailyInterestUvc)} UVC</td>
                    <td className="px-3 py-2">{fmtMoney(d.dailyInterestBs)} Bs</td>
                    <td className="px-3 py-2">{fmtUvc(d.cumInterestUvc)} UVC</td>
                    <td className="px-3 py-2">{fmtMoney(d.cumInterestBs)} Bs</td>
                    <td className="px-3 py-2">{fmtUvc(d.amortUvcDay)} UVC</td>
                    <td className="px-3 py-2">{fmtMoney(d.amortBsDay)} Bs</td>
                    <td className="px-3 py-2">{fmtMoney(d.paymentBsDay)} Bs</td>
                    <td className="px-3 py-2">{fmtUvc(d.balanceUvcEndDay)} UVC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
