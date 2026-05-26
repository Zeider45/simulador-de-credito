const STORAGE_KEY = "simulador-credito.loans";

export const DEFAULT_IDI_SERIES = `# Pega aqui tu serie IDI (YYYY-MM-DD,IDI)
2025-10-16,0.98495915
2025-11-14,1.14827445`;

export const DEFAULT_ACCOUNTS = `{
  "bank": { "code": "1110", "name": "Banco" },
  "loan": { "code": "1310", "name": "Cartera de credito" },
  "interestReceivable": { "code": "1340", "name": "Interes por cobrar" },
  "interestIncome": { "code": "4120", "name": "Ingresos por interes" },
  "moraReceivable": { "code": "1350", "name": "Mora por cobrar" },
  "moraIncome": { "code": "4130", "name": "Ingresos por mora" },
  "disbursementDiscount": { "code": "2160", "name": "Descuento desembolso" },
  "feeIncome": { "code": "4210", "name": "Comisiones por desembolso" }
}`;

export const initialParams = {
  principal: 160000,
  annualRate: 16,
  termMonths: 12,
  disbursementDate: "2025-10-16",
  firstDueDate: "2025-11-14",
  simulationDays: 0,
  idi: 0.98495915,
  disbursementFeeRate: 0.80,
  dayCount: "30/360",
  // Valoración por defecto: usar valoración diaria por IDI para coincidir con la hoja
  interestValuation: "idi_daily",
  idiMissing: "linear",
  idiFutureStep: 0.01,
  moraRate: 0.80,
  graceDays: 0,
  moraBase: "amort",
  mora1: 30,
  mora2: 60,
  mora3: 90,
  creditUvc: true,
  applyPrepay: true,
  recomputeAfterPrepay: true,
  prepayAction: "reduce_term",
  idiSeriesText: DEFAULT_IDI_SERIES,
  adjustToBusinessDay: true,
  // lista opcional de feriados (YYYY-MM-DD). Ej: ["2025-12-24","2025-12-25"]
  holidays: [],
};

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `loan-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createLoanRecord(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: "",
    params: { ...initialParams },
    accountsText: DEFAULT_ACCOUNTS,
    payments: [],
    result: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function duplicateLoanRecord(source) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: source.name ? `${source.name} (copia)` : "",
    params: { ...(source.params || initialParams) },
    accountsText: source.accountsText || DEFAULT_ACCOUNTS,
    payments: [],
    result: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadLoans() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLoans(loans) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

export function upsertLoan(loans, loan) {
  const index = loans.findIndex((item) => item.id === loan.id);
  if (index === -1) return [loan, ...loans];
  const next = [...loans];
  next[index] = loan;
  return next;
}
