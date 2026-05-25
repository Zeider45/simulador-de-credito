"use client";

import { useRouter } from "next/navigation";
import { createLoanRecord, loadLoans, saveLoans } from "@/lib/loanStorage";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(loadLoans().length);
    const onFocus = () => setCount(loadLoans().length);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleCreate = () => {
    const newLoan = createLoanRecord();
    const next = [newLoan, ...loadLoans()];
    saveLoans(next);
    router.push(`/creditos/${newLoan.id}`);
  };

  return (
    <header className="glass flex flex-col gap-4 rounded-2xl px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-amber-300 to-sky-300 text-sm font-bold text-slate-900">
          SC
        </div>
        <div>
          <div className="text-base font-semibold">Simulador de Credito</div>
          <div className="text-xs text-muted-foreground">UVC · IDI · Mora</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <div className="w-full md:max-w-xs">
          <Input placeholder="Buscar credito o id..." />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="muted">Activos: {count}</Badge>
          <Button variant="outline" onClick={() => router.push("/")}>Inicio</Button>
          <Button onClick={handleCreate}>Crear credito</Button>
        </div>
      </div>
    </header>
  );
}
