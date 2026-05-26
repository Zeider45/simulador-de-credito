"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLoanRecord, duplicateLoanRecord, loadLoans, saveLoans } from "@/lib/loanStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const moneyFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMoney(v) { return moneyFmt.format(v || 0); }
function fmtPct(v) { return pctFmt.format(v || 0); }
function fmtMoneyUnit(v) { return `${fmtMoney(v)} Bs`; }

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "2-digit" });
}

function getLoanStatus(loan) {
  if (!loan.result) return "pending";
  const mora = loan.result.summary?.totalMora || 0;
  const balance = loan.result.summary?.totalOutstanding ?? 1;
  if (balance <= 0.01) return "closed";
  if (mora > 0) return "mora";
  return "current";
}

const STATUS_MAP = {
  pending: { label: "Sin simular", variant: "muted" },
  current: { label: "Al dia", variant: "success" },
  mora: { label: "Con mora", variant: "destructive" },
  closed: { label: "Cancelado", variant: "default" },
};

export default function Home() {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setLoans(loadLoans());
    const onFocus = () => setLoans(loadLoans());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const sortedLoans = useMemo(
    () => [...loans].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [loans]
  );

  const filteredLoans = useMemo(() => {
    if (!search.trim()) return sortedLoans;
    const q = search.toLowerCase();
    return sortedLoans.filter(
      (l) =>
        (l.name || "").toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    );
  }, [sortedLoans, search]);

  const stats = useMemo(() => {
    const simulated = loans.filter((l) => l.result);
    const totalCapital = loans.reduce((s, l) => s + (l.params?.principal || 0), 0);
    const irrVals = simulated.map((l) => l.result?.summary?.annualIrr).filter((v) => v != null);
    const avgIrr = irrVals.length ? irrVals.reduce((s, v) => s + v, 0) / irrVals.length : null;
    return { total: loans.length, simulated: simulated.length, totalCapital, avgIrr };
  }, [loans]);

  const handleCreateLoan = () => {
    const newLoan = createLoanRecord();
    const next = [newLoan, ...loans];
    setLoans(next);
    saveLoans(next);
    router.push(`/creditos/${newLoan.id}`);
  };

  const handleCloneLoan = (loanId) => {
    const source = loans.find((l) => l.id === loanId);
    if (!source) return;
    const cloned = duplicateLoanRecord(source);
    const next = [cloned, ...loans];
    setLoans(next);
    saveLoans(next);
    router.push(`/creditos/${cloned.id}`);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    const next = loans.filter((l) => l.id !== deleteId);
    setLoans(next);
    saveLoans(next);
    setDeleteId(null);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            BCV / SUDEBAN
          </p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            Simulador de Credito Venezolano
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Administra creditos con amortizacion francesa, UVC e IDI, mora diaria, asientos
            contables y exportacion de datos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleCreateLoan}>Nuevo credito</Button>
            {sortedLoans.length > 0 && (
              <Button asChild variant="outline">
                <Link href={`/creditos/${sortedLoans[0].id}`}>Abrir ultimo</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <Card className="glass">
          <CardContent className="grid grid-cols-3 divide-x divide-border py-5 text-center">
            <div className="px-3">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Creditos</p>
            </div>
            <div className="px-3">
              <p className="text-2xl font-bold text-foreground">{stats.simulated}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Simulados</p>
            </div>
            <div className="px-3">
              <p className="text-2xl font-bold text-foreground">
                {stats.avgIrr != null ? `${fmtPct(stats.avgIrr * 100)}%` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">TIR prom.</p>
            </div>
          </CardContent>
          {stats.total > 0 && (
            <div className="border-t border-border px-5 py-3 text-center">
              <p className="text-xs text-muted-foreground">
                Capital total:{" "}
                <span className="font-semibold text-foreground">{fmtMoneyUnit(stats.totalCapital)}</span>
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Loan list */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold">Mis creditos</h2>
            <p className="text-sm text-muted-foreground">Acceso rapido a tus simulaciones guardadas.</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[260px]">
            <Input
              placeholder="Buscar por nombre o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredLoans.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">
                🏦
              </div>
              <p className="font-semibold text-foreground">
                {search ? "Sin resultados" : "Sin creditos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? `Ningun credito coincide con "${search}".`
                  : 'Usa "Nuevo credito" para comenzar.'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={handleCreateLoan}>
                  Crear primer credito
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredLoans.map((loan, idx) => {
              const summary = loan.result?.summary;
              const p = loan.params || {};
              const status = getLoanStatus(loan);
              const { label: statusLabel, variant: statusVariant } = STATUS_MAP[status];
              const displayName = loan.name || `Credito ${idx + 1}`;

              return (
                <Card key={loan.id} className="glass flex flex-col transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{displayName}</CardTitle>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {loan.id?.slice(0, 12)}
                        </p>
                      </div>
                      <Badge variant={statusVariant} className="shrink-0">
                        {statusLabel}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Capital</p>
                        <p className="font-semibold">{fmtMoneyUnit(p.principal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plazo</p>
                        <p className="font-semibold">{p.termMonths || "—"} meses</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tasa anual</p>
                        <p className="font-semibold">{p.annualRate || "—"} %</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">TIR anual</p>
                        <p className="font-semibold">
                          {summary?.annualIrr != null
                            ? `${fmtPct(summary.annualIrr * 100)} %`
                            : "—"}
                        </p>
                      </div>
                      {summary && (
                        <>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Cuota prom.
                            </p>
                            <p className="font-semibold">{fmtMoneyUnit(summary.avgCuota)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Neto recibido
                            </p>
                            <p className="font-semibold">{fmtMoneyUnit(summary.netReceived)}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {summary?.totalMora > 0 && (
                      <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
                        Mora acumulada: <span className="font-semibold">{fmtMoneyUnit(summary.totalMora)}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Actualizado: {fmtDate(loan.updatedAt)}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm">
                        <Link href={`/creditos/${loan.id}`}>Abrir</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCloneLoan(loan.id)}>
                        Clonar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDeleteId(loan.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminacion</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. El credito y toda su simulacion seran eliminados
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
