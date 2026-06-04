const STORAGE_KEY = "simulador-credito.loans";

export const DEFAULT_IDI_SERIES = `# Pega aqui tu serie IDI (YYYY-MM-DD,IDI)
2025-10-16,0.98495915
2025-11-14,1.14827445`;

// Plan de cuentas oficial UVCC (Manual de Contabilidad SUDEBAN, Circular SIB-II-GGR-GNP-12161
// del 28/10/2019, asociado a la Resolucion BCV 19-09-01).
export const DEFAULT_ACCOUNTS = `{
  "bank": { "code": "1110", "name": "Banco" },
  "loan": { "code": "131.35", "name": "Creditos comerciales vigentes objeto de las medidas del BCV" },
  "loanVariation": { "code": "131.36", "name": "Variacion de creditos comerciales vigentes (BCV)" },
  "equityVariation": { "code": "358.01", "name": "Variacion de creditos comerciales (patrimonio, BCV)" },
  "interestReceivable": { "code": "138.00", "name": "Rendimientos por cobrar por creditos comerciales" },
  "interestIncome": { "code": "513.01.M.35", "name": "Rendimientos por creditos comerciales vigentes (BCV)" },
  "interestVariationIncome": { "code": "513.01.M.36", "name": "Rendimientos por variacion de creditos comerciales (BCV)" },
  "moraReceivable": { "code": "138.00", "name": "Rendimientos por cobrar - mora creditos comerciales" },
  "moraIncome": { "code": "513.01.M.35", "name": "Ingresos por mora de creditos comerciales" },
  "disbursementDiscount": { "code": "2160", "name": "Descuento desembolso" },
  "feeIncome": { "code": "532.00", "name": "Comisiones flat por desembolso (max 0,50%)" }
}`;

export const initialParams = {
  principal: 160000,
  // Tasa por defecto 6%: dentro del rango regulado 4%-10% (Res. BCV 21-01-02, Art. 3) y del
  // rango del producto UVCC documentado (4%-6%, Resolucion 19-09-01 / Manual de Contabilidad).
  annualRate: 6,
  termMonths: 12,
  disbursementDate: "2025-10-16",
  firstDueDate: "2025-11-14",
  simulationDays: 0,
  idi: 0.98495915,
  // Comision flat por defecto 0,50%: maximo permitido del monto del credito
  // (Aviso Oficial BCV, G.O. 41.742 del 21/10/2019).
  disbursementFeeRate: 0.50,
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
  // Piso de IDI en cancelacion anticipada (Res. BCV 21-01-02, Art. 5 lit. b/c y Art. 6).
  idiFloorOnPrepay: true,
  applyPrepay: true,
  recomputeAfterPrepay: true,
  prepayAction: "reduce_term",
  idiSeriesText: DEFAULT_IDI_SERIES,
  adjustToBusinessDay: true,
  holidays: [],
  paymentMode: "libre",
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
