"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLoanRecord, loadLoans, saveLoans } from "@/lib/loanStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const moneyFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return moneyFormatter.format(value || 0);
}

function formatMoneyWithUnit(value) {
  return `${formatMoney(value)} Bs`;
}

function formatPercent(value) {
  return percentFormatter.format(value || 0);
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function Home() {
  const [loans, setLoans] = useState([]);
  const router = useRouter();

  useEffect(() => {
    setLoans(loadLoans());
    const handleFocus = () => setLoans(loadLoans());
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      const left = new Date(a.updatedAt || 0).getTime();
      const right = new Date(b.updatedAt || 0).getTime();
      return right - left;
    });
  }, [loans]);

  const handleCreateLoan = () => {
    const newLoan = createLoanRecord();
    const next = [newLoan, ...loans];
    setLoans(next);
    saveLoans(next);
    router.push(`/creditos/${newLoan.id}`);
  };

  const handleDeleteLoan = (loanId) => {
    const next = loans.filter((loan) => loan.id !== loanId);
    setLoans(next);
    saveLoans(next);
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">BCV / SUDEBAN</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Simulador de Credito Venezolano</h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Administra varios creditos, ajusta parametros y controla pagos con mora, UVC e IDI.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleCreateLoan}>Crear credito</Button>
            {sortedLoans.length > 0 ? (
              <Button asChild variant="outline">
                <Link href={`/creditos/${sortedLoans[0].id}`}>Abrir ultimo</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Resumen rapido</CardTitle>
            <p className="text-sm text-muted-foreground">Ultimas simulaciones y estado actual.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creditos activos</span>
              <Badge>{sortedLoans.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ultima actualizacion</span>
              <span className="text-sm font-semibold">
                {sortedLoans[0]?.updatedAt ? formatDateLabel(sortedLoans[0].updatedAt) : "-"}
              </span>
            </div>
            <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
              {sortedLoans.length
                ? "Abre un credito para revisar pagos, mora diaria y valorizacion."
                : "Crea tu primer credito para comenzar."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Creditos creados</h2>
            <p className="text-sm text-muted-foreground">Acceso rapido a tus simulaciones guardadas.</p>
          </div>
          <Badge variant="muted">Total: {sortedLoans.length}</Badge>
        </div>

        {sortedLoans.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-10 text-center text-muted-foreground">
              No hay creditos creados. Usa "Crear credito" para iniciar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedLoans.map((loan, index) => {
              const summary = loan.result?.summary;
              const params = loan.params || {};
              return (
                <Card key={loan.id} className="glass">
                  <CardHeader>
                    <CardTitle>Credito {index + 1}</CardTitle>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Simulacion individual
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Capital: {formatMoneyWithUnit(params.principal)} · Plazo: {params.termMonths || "-"} meses · Tasa: {params.annualRate || "-"} %
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Actualizado: {formatDateLabel(loan.updatedAt)}
                    </div>
                    <div className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold">
                      {summary ? (
                        <>Neto: {formatMoneyWithUnit(summary.netReceived)} · Cuota prom: {formatMoneyWithUnit(summary.avgCuota)} · TIR: {summary.annualIrr !== null ? `${formatPercent(summary.annualIrr * 100)} %` : "-"}</>
                      ) : (
                        "Sin simulacion"
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href={`/creditos/${loan.id}`}>ABRIR</Link>
                      </Button>
                      <Button variant="outline" onClick={() => handleDeleteLoan(loan.id)}>
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
    </div>
  );
}
