"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createLoanRecord, loadLoans, saveLoans } from "@/lib/loanStorage";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [dark, setDark] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    setCount(loadLoans().length);
    const onFocus = () => setCount(loadLoans().length);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleCreate = () => {
    const newLoan = createLoanRecord();
    const next = [newLoan, ...loadLoans()];
    saveLoans(next);
    setCount(next.length);
    router.push(`/creditos/${newLoan.id}`);
  };

  return (
    <header className="glass flex items-center justify-between gap-4 rounded-2xl px-6 py-4">
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-amber-300 to-sky-300 text-sm font-bold text-slate-900 shadow-sm">
          SC
        </div>
        <div>
          <div className="text-base font-semibold leading-tight">Simulador de Credito</div>
          <div className="text-xs text-muted-foreground">UVC · IDI · Mora · Asientos</div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Badge variant="muted" className="hidden sm:inline-flex">
          {count} {count === 1 ? "credito" : "creditos"}
        </Badge>
        <button
          onClick={toggleTheme}
          title={dark ? "Modo claro" : "Modo oscuro"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        {!isHome && (
          <Button variant="outline" onClick={() => router.push("/")}>
            Inicio
          </Button>
        )}
        <Button onClick={handleCreate}>Nuevo credito</Button>
      </div>
    </header>
  );
}
