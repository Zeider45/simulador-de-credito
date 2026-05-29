const DAY_MS = 86400000;

function parseNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isBusinessDay(date, holidays) {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (Array.isArray(holidays) && holidays.indexOf(formatDate(date)) !== -1) return false;
  return true;
}

// Ajusta una fecha de vencimiento al siguiente dia habil (convencion "following"),
// saltando fines de semana y feriados configurados.
function adjustToNextBusinessDay(date, holidays) {
  if (!date) return date;
  let copy = new Date(date.getTime());
  while (!isBusinessDay(copy, holidays)) {
    copy = addDays(copy, 1);
  }
  return copy;
}

function diffDaysActual(start, end) {
  return Math.round((end - start) / DAY_MS);
}

function diffDays30360(start, end) {
  const y1 = start.getUTCFullYear();
  const y2 = end.getUTCFullYear();
  const m1 = start.getUTCMonth() + 1;
  const m2 = end.getUTCMonth() + 1;
  const d1 = Math.min(30, start.getUTCDate());
  const d2 = Math.min(30, end.getUTCDate());
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

function calcDays(start, end, mode) {
  if (!start || !end) return 0;
  if (mode === "30/360") return diffDays30360(start, end);
  return diffDaysActual(start, end);
}

function parseIdiSeries(text) {
  const series = [];
  const rows = (text || "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  for (const row of rows) {
    if (row.startsWith("#")) continue;
    const [rawDate, rawIdi] = row.split(/[\t,;]/).map((item) => item.trim());
    const date = parseDate(rawDate);
    const idiText = rawIdi || "";
    const idi = parseNumber((rawIdi || "").replace(",", "."), NaN);
    if (date && Number.isFinite(idi)) {
      series.push({ date, idi, idiText, time: date.getTime(), key: rawDate });
    }
  }

  series.sort((a, b) => a.time - b.time);
  return series;
}

function createIdiResolver(series, method, fallbackIdi, futureStep) {
  const exact = new Map(series.map((item) => [formatDate(item.date), item.idi]));
  const exactText = new Map(
    series.map((item) => [formatDate(item.date), item.idiText || String(item.idi)])
  );
  const cache = new Map();
  const cacheText = new Map();
  const last = series[series.length - 1];
  const first = series[0];

  function isWeekendDate(d) {
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  }

  function findPreviousBusinessDate(d) {
    const copy = new Date(d.getTime());
    while (isWeekendDate(copy)) {
      copy.setUTCDate(copy.getUTCDate() - 1);
    }
    return copy;
  }

  const resolver = (date) => {
    const key = formatDate(date);
    if (cache.has(key)) return cache.get(key);

    // If date is weekend, use the previous business day's IDI (IDI no cambia en fines de semana)
    let useDate = date;
    if (isWeekendDate(date)) {
      useDate = findPreviousBusinessDate(date);
    }

    const bkey = formatDate(useDate);
    const setCache = (cacheKey, value, text) => {
      cache.set(cacheKey, value);
      cacheText.set(cacheKey, text);
    };

    if (cache.has(bkey)) {
      const v = cache.get(bkey);
      const t = cacheText.get(bkey) || String(v);
      setCache(key, v, t);
      return v;
    }

    if (exact.has(bkey)) {
      const value = exact.get(bkey);
      const text = exactText.get(bkey) || String(value);
      setCache(bkey, value, text);
      setCache(key, value, text);
      return value;
    }

    if (!series.length) {
      const value = fallbackIdi;
      const text = String(value);
      setCache(bkey, value, text);
      setCache(key, value, text);
      return value;
    }

    if (last && useDate.getTime() > last.time) {
      const extraDays = diffDaysActual(last.date, useDate);
      const value = last.idi + futureStep * extraDays;
      const text = value.toFixed(8);
      setCache(bkey, value, text);
      setCache(key, value, text);
      return value;
    }

    if (first && useDate.getTime() < first.time) {
      const value = first.idi;
      const text = exactText.get(formatDate(first.date)) || String(value);
      setCache(bkey, value, text);
      setCache(key, value, text);
      return first.idi;
    }

    let prev = null;
    let next = null;
    for (const item of series) {
      if (item.time < useDate.getTime()) {
        prev = item;
      } else {
        next = item;
        break;
      }
    }

    // Decide based on today's date: use BCV last-known value up to today,
    // only invent/extrapolate for future dates (after today).
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let value = fallbackIdi;
    let text = String(value);
    if (series.length === 0) {
      // no series: fallback for all dates (invented)
      value = fallbackIdi;
      text = String(value);
    } else if (useDate.getTime() <= todayUtc.getTime()) {
      // historical or up-to-today: use last known BCV value (previous business day's entry)
      if (prev) {
        value = prev.idi;
        text = exactText.get(formatDate(prev.date)) || String(value);
      } else {
        // no previous entry (use first available)
        value = first.idi;
        text = exactText.get(formatDate(first.date)) || String(value);
      }
    } else {
      // future dates: extrapolate from last known
      if (last) {
        const extraDays = diffDaysActual(last.date, useDate);
        value = last.idi + futureStep * extraDays;
        text = value.toFixed(8);
      } else {
        value = fallbackIdi;
        text = String(value);
      }
    }
    setCache(bkey, value, text);
    setCache(key, value, text);
    return value;
  };

  resolver.textFor = (date) => {
    const key = formatDate(date);
    if (cacheText.has(key)) return cacheText.get(key);
    resolver(date);
    return cacheText.get(key) || String(cache.get(key) ?? fallbackIdi);
  };

  // expose source function: 'BCV' if exact entry exists for the business date, otherwise 'invented'
  resolver.sourceFor = (date) => {
    if (!series.length) return 'invented';
    let useDate = date;
    if (isWeekendDate(date)) useDate = findPreviousBusinessDate(date);
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // if the requested (business) date is up to today, consider it BCV-derived
    if (useDate.getTime() <= todayUtc.getTime()) return 'BCV';
    return 'invented';
  };

  return resolver;
}

function sumIdiBetween(start, end, idiForDate) {
  let sum = 0;
  const cursor = new Date(start.getTime());
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= end) {
    sum += idiForDate(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return sum;
}

function uvcToBsDaily(uvcAmount, start, end, accrualDays, idiForDate) {
  if (accrualDays <= 0) return 0;
  const sumIdi = sumIdiBetween(start, end, idiForDate);
  return uvcAmount * (sumIdi / accrualDays);
}

function classifyDays(daysLate, t1, t2, t3) {
  if (daysLate <= 0) return "AL DIA";
  if (daysLate <= t1) return "MORA 1";
  if (daysLate <= t2) return "VENCIDO";
  if (daysLate <= t3) return "VENCIDO 2";
  return "CASTIGO";
}

function calculateIrr(cashflows) {
  if (!cashflows.length) return null;
  const hasPositive = cashflows.some((v) => v > 0);
  const hasNegative = cashflows.some((v) => v < 0);
  if (!hasPositive || !hasNegative) return null;

  const npv = (rate) =>
    cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);

  let low = -0.99;
  let high = 1;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  for (let i = 0; i < 50 && npvLow * npvHigh > 0; i += 1) {
    high *= 2;
    npvHigh = npv(high);
  }

  if (npvLow * npvHigh > 0) return null;

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 1e-7) return mid;
    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
}

function buildHint(formula, values) {
  const lines = [formula];
  if (values) {
    for (const [key, value] of Object.entries(values)) {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.join("\n");
}

function buildColumnHints() {
  return {
    daysPeriod: "Dias periodo = base 30/360 o actual/365",
    startBalanceUvc: "Saldo UVC inicial = saldo del periodo anterior",
    interestUvc: "Interes UVC = Saldo UVC inicial * tasa anual * dias/base",
    amortUvc: "Amort UVC = Cuota UVC - Interes UVC",
    paymentUvc: "Cuota UVC = P * (i / (1 - (1+i)^-n))",
    idiDue: "IDI vencimiento (interpolado o arrastre)",
    interestBs: "Interes Bs = Interes UVC * IDI (o valoracion diaria)",
    amortBs: "Amort Bs = Amort UVC * IDI vencimiento",
    cuotaBs: "Cuota Bs = Interes Bs + Amort Bs",
    saldoBs: "Saldo Bs = Saldo UVC fin * IDI vencimiento",
    paymentDate: "Fecha pago informada por el usuario",
    paymentAmount: "Pago Bs informado por el usuario",
    daysLate: "Dias mora = max(0, dias entre vencimiento y pago - gracia)",
    moraBs: "Mora Bs = Base mora * tasa mora * dias/base * IDI",
    activeMora: "Rend mora activos = Mora Bs (si mora <= Mora2, si no 0)",
    activeConv: "Rend conv activos = Interes Bs (si mora <= Mora2, si no 0)",
    orderMora: "Rend mora orden = Mora Bs (si mora > Mora2, si no 0)",
    orderConv: "Rend conv orden = Interes Bs (si mora > Mora2, si no 0)",
    moratorio143: "Moratorio 143 vigente = Rend mora activos",
    moratorio819: "Moratorio 819 orden = Rend mora orden",
    valorUvcCapital: "Val UVC capital = Amort_Bs - Ak * IDI_desembolso",
    valorUvcRend: "Val UVC rend = Interes_Bs - Ik * IDI_desembolso",
    status: "Clasificacion segun dias de mora",
    balanceUvc: "Saldo UVC fin = Saldo UVC ini - capital pagado UVC",
  };
}

function normalizePayments(payments, termMonths) {
  if (!Array.isArray(payments)) return [];
  const result = [];
  for (let i = 0; i < termMonths; i += 1) {
    const item = payments[i] || {};
    result.push({
      paymentDate: parseDate(item.paymentDate),
      paymentAmount: parseNumber(item.paymentAmount, NaN),
    });
  }
  return result;
}

function buildAccounts(customAccounts) {
  const base = {
    bank: { code: "1110", name: "Banco" },
    loan: { code: "1310", name: "Cartera de credito" },
    interestReceivable: { code: "1340", name: "Interes por cobrar" },
    interestIncome: { code: "4120", name: "Ingresos por interes" },
    moraReceivable: { code: "1350", name: "Mora por cobrar" },
    moraIncome: { code: "4130", name: "Ingresos por mora" },
    disbursementDiscount: { code: "2160", name: "Descuento desembolso" },
    feeIncome: { code: "4210", name: "Comisiones por desembolso" },
  };

  return { ...base, ...(customAccounts || {}) };
}

function buildLedger(params, schedule, accounts, feeBs = 0) {
  const entries = [];
  const nominal = params.principal;
  const netBeforeFee = params.principal; // No se multiplica por el IDI ya que es un monto en Bs
  const fee = feeBs;
  const net = netBeforeFee - fee;
  const discount = Math.max(0, nominal - netBeforeFee);

  const disbursementLines = [
    { account: accounts.loan, debit: nominal, credit: 0 },
    { account: accounts.bank, debit: 0, credit: net },
  ];

  if (fee > 0) {
    disbursementLines.push({ account: accounts.feeIncome, debit: 0, credit: fee });
  }
  if (discount > 0) {
    disbursementLines.push({
      account: accounts.disbursementDiscount,
      debit: 0,
      credit: discount,
    });
  }

  entries.push({
    date: formatDate(params.disbursementDate),
    description: "Desembolso del credito",
    lines: disbursementLines,
  });

  schedule.forEach((row) => {
    if (row.interestBs > 0) {
      entries.push({
        date: formatDate(row.dueDate),
        description: `Devengo interes cuota ${row.index}`,
        lines: [
          { account: accounts.interestReceivable, debit: row.interestBs, credit: 0 },
          { account: accounts.interestIncome, debit: 0, credit: row.interestBs },
        ],
      });
    }

    if (row.moraBs > 0) {
      entries.push({
        date: formatDate(row.paymentDate || row.dueDate),
        description: `Devengo mora cuota ${row.index}`,
        lines: [
          { account: accounts.moraReceivable, debit: row.moraBs, credit: 0 },
          { account: accounts.moraIncome, debit: 0, credit: row.moraBs },
        ],
      });
    }

    if (row.paymentAmount > 0) {
      const paymentLines = [
        { account: accounts.bank, debit: row.paymentAmount, credit: 0 },
      ];

      if (row.paidMora > 0) {
        paymentLines.push({
          account: accounts.moraReceivable,
          debit: 0,
          credit: row.paidMora,
        });
      }
      if (row.paidInterest > 0) {
        paymentLines.push({
          account: accounts.interestReceivable,
          debit: 0,
          credit: row.paidInterest,
        });
      }
      if (row.paidPrincipal + row.paidExtra > 0) {
        paymentLines.push({
          account: accounts.loan,
          debit: 0,
          credit: row.paidPrincipal + row.paidExtra,
        });
      }

      entries.push({
        date: formatDate(row.paymentDate || row.dueDate),
        description: `Pago cuota ${row.index}`,
        lines: paymentLines,
      });
    }
  });

  return entries.map((entry) => {
    const totals = entry.lines.reduce(
      (acc, line) => {
        acc.debit += line.debit;
        acc.credit += line.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    return {
      ...entry,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
    };
  });
}

export function simulateLoan(input) {
  const params = {
    principal: parseNumber(input.principal),
    annualRate: parseNumber(input.annualRate) / 100,
    termMonths: Math.max(0, Math.round(parseNumber(input.termMonths))),
    disbursementDate: parseDate(input.disbursementDate),
    firstDueDate: parseDate(input.firstDueDate),
    simulationDays: Math.max(0, Math.round(parseNumber(input.simulationDays))),
    idi: parseNumber(input.idi, 1),
    disbursementFeeRate: parseNumber(input.disbursementFeeRate),
    dayCount: input.dayCount || "30/360",
    interestValuation: input.interestValuation || "idi_due",
    idiMissing: input.idiMissing || "linear",
    moraRate: parseNumber(input.moraRate) / 100,
    graceDays: Math.max(0, Math.round(parseNumber(input.graceDays))),
    moraBase: input.moraBase || "amort",
    mora1: parseNumber(input.mora1, 30),
    mora2: parseNumber(input.mora2, 60),
    mora3: parseNumber(input.mora3, 90),
    creditUvc: Boolean(input.creditUvc),
    applyPrepay: Boolean(input.applyPrepay),
    recomputeAfterPrepay: Boolean(input.recomputeAfterPrepay),
    prepayAction: input.prepayAction || 'reduce_term', // 'reduce_term' or 'reduce_installment'
    idiSeriesText: input.idiSeriesText || "",
    idiFutureStep: parseNumber(input.idiFutureStep, 0.01),
    accounts: input.accounts || null,
    adjustToBusinessDay: Boolean(input.adjustToBusinessDay),
    holidays: Array.isArray(input.holidays) ? input.holidays : [],
    // "libre": registro libre de pagos reales (siempre se aplican).
    // "simulacion": avanza un "hoy" simulado; los pagos posteriores a ese hoy no se aplican.
    paymentMode: input.paymentMode || "libre",
  };

  const series = parseIdiSeries(params.idiSeriesText);
  const idiForDate = createIdiResolver(
    series,
    params.idiMissing,
    params.idi,
    params.idiFutureStep
  );

  const dayCountBase = params.dayCount === "30/360" ? 360 : 365;
  const principalUvc = params.creditUvc ? params.principal / params.idi : params.principal;
  const paymentRate = params.annualRate / 12;
  const asOfDate = params.disbursementDate ? addDays(params.disbursementDate, params.simulationDays) : null;
  const paymentUvc = params.termMonths <= 0
    ? 0
    : paymentRate === 0
      ? principalUvc / params.termMonths
      : principalUvc * (paymentRate / (1 - Math.pow(1 + paymentRate, -params.termMonths)));
  let curPaymentUvc = paymentUvc; // may change if we recompute installments

  let balanceUvc = principalUvc;
  let unpaidInterest = 0;
  let unpaidMora = 0;
  let prevDate = params.disbursementDate;

  let overrides = normalizePayments(input.payments, params.termMonths);
  const schedule = [];

  let totalInterest = 0;
  let totalMora = 0;
  let totalCuota = 0;

  let i = 0;
  while (i < params.termMonths) {
    const rawDueDate = i === 0 ? params.firstDueDate : addMonths(params.firstDueDate, i);
    const dueDate = params.adjustToBusinessDay ? adjustToNextBusinessDay(rawDueDate, params.holidays) : rawDueDate;
    const periodStart = prevDate; // inicio del periodo para desglose diario
    const daysPeriod = calcDays(periodStart, dueDate, params.dayCount);
    const ratePeriod = params.annualRate * (daysPeriod / dayCountBase);
    const startBalanceUvc = balanceUvc;

    const interestUvc = startBalanceUvc * ratePeriod;
    const termLeft = Math.max(1, params.termMonths - i);
    // decide cuota UVC para este periodo según política (curPaymentUvc or recomputed)
    let paymentUvcAdj;
    if (params.recomputeAfterPrepay && params.prepayAction === 'reduce_term') {
      // keep current payment amount (curPaymentUvc) and reduce term when needed
      paymentUvcAdj = curPaymentUvc;
    } else {
      // compute payment to amortize remaining balance in remaining terms
      paymentUvcAdj = termLeft <= 0
        ? 0
        : paymentRate === 0
          ? startBalanceUvc / termLeft
          : startBalanceUvc * (paymentRate / (1 - Math.pow(1 + paymentRate, -termLeft)));
      // update curPaymentUvc so next periods use same unless changed by prepayAction
      curPaymentUvc = paymentUvcAdj;
    }

    let amortUvc = paymentUvcAdj - interestUvc;

    if (i === params.termMonths - 1) {
      amortUvc = startBalanceUvc;
      paymentUvcAdj = interestUvc + amortUvc;
    }

    if (amortUvc < 0) amortUvc = 0;

    const idiDue = params.creditUvc ? idiForDate(dueDate) : 1;
    const idiTextDue = params.creditUvc
      ? (typeof idiForDate.textFor === "function" ? idiForDate.textFor(dueDate) : idiDue.toFixed(8))
      : "1";
    const interestBs = params.creditUvc && params.interestValuation === "idi_daily"
      ? uvcToBsDaily(interestUvc, prevDate, dueDate, daysPeriod, idiForDate)
      : interestUvc * idiDue;

    const amortBs = amortUvc * idiDue;
    const baseIdi = params.idi;
    // desglose entre componente 'base' (valorado al IDI de desembolso) y 'variacion' (diferencia)
    const amortBaseBs = amortUvc * baseIdi;
    const amortVarBs = amortBs - amortBaseBs;
    const interesBaseBs = interestUvc * baseIdi;
    const interesVarBs = interestBs - interesBaseBs;
    const valorUvcCapital = params.creditUvc ? amortBs - amortUvc * baseIdi : 0;
    const valorUvcRend = params.creditUvc ? interestBs - interestUvc * baseIdi : 0;
    const baseDue = interestBs + amortBs + unpaidInterest + unpaidMora;

    const override = overrides[i] || {};
    const overridePaymentDate = override.paymentDate || null;
    const overridePaymentAmount = Number.isFinite(override.paymentAmount) ? override.paymentAmount : 0;
    // El tope por fecha "hoy" (asOf) solo aplica en modo simulacion, donde asOf representa
    // el "hoy" simulado y un pago con fecha futura aun no debe reconocerse. En modo libre se
    // registran pagos reales y deben aplicarse siempre (de lo contrario el pago se ignora,
    // no se calcula la valorizacion al pagar y la cuota sigue acumulando mora indebidamente).
    const enforceAsOf = params.paymentMode === "simulacion" && Boolean(asOfDate);
    const hasValidPayment = Boolean(
      overridePaymentDate &&
      overridePaymentAmount > 0 &&
      (!enforceAsOf || overridePaymentDate.getTime() <= asOfDate.getTime())
    );
    const paymentDate = hasValidPayment ? overridePaymentDate : (asOfDate || dueDate);
    const paymentAmount = hasValidPayment ? overridePaymentAmount : 0;

    let daysLate = diffDaysActual(dueDate, paymentDate);
    if (daysLate < 0) daysLate = 0;
    daysLate = Math.max(0, daysLate - params.graceDays);

    let moraBs = 0;
    if (daysLate > 0 && params.moraRate > 0) {
      const moraBaseUvc = params.moraBase === "saldo" ? startBalanceUvc : amortUvc;
      const moraUvc = moraBaseUvc * params.moraRate * (daysLate / dayCountBase);
      moraBs = params.creditUvc
        ? params.interestValuation === "idi_daily"
          ? uvcToBsDaily(moraUvc, addDays(dueDate, params.graceDays), paymentDate, daysLate, idiForDate)
          : moraUvc * idiForDate(paymentDate)
        : moraUvc;
    }

    const isOrder = daysLate > params.mora2;
    const activeMora = isOrder ? 0 : moraBs;
    const activeConv = isOrder ? 0 : interestBs;
    const orderMora = isOrder ? moraBs : 0;
    const orderConv = isOrder ? interestBs : 0;

    // Moratorio 143 (vigente) y Moratorio 819 (orden) reflejan UNICAMENTE el interes
    // moratorio (la mora), no el rendimiento convencional. El rendimiento convencional se
    // reporta por separado en las columnas Conv act / Conv ord. Ver CALCULOS_TABLA_PAGOS.md
    // (Ejemplo A: Moratorio 143 = 69.62 = solo mora; Ejemplo B: Moratorio 813 = 522.17 = solo mora ord).
    const moratorio143 = activeMora;
    const moratorio819 = orderMora;

    // Aplicacion de pago (se calcula antes del desglose diario para reflejar amortizacion en fecha de pago)
    let remaining = Math.max(0, paymentAmount);
    const paidMora = Math.min(remaining, unpaidMora + moraBs);
    remaining -= paidMora;

    const paidInterest = Math.min(remaining, unpaidInterest + interestBs);
    remaining -= paidInterest;

    const paidPrincipal = Math.min(remaining, amortBs);
    remaining -= paidPrincipal;

    const paidExtra = params.applyPrepay ? remaining : 0;

    const idiPay = params.creditUvc ? idiForDate(paymentDate) : 1;
    const rawPrincipalPaidUvc = (paidPrincipal + paidExtra) / idiPay;
    const principalPaidUvc = Math.min(startBalanceUvc, rawPrincipalPaidUvc);
    const paidPrincipalBs = paidPrincipal + paidExtra;
    const paidInterestUvc = params.creditUvc ? paidInterest / idiPay : paidInterest;
    const valorPaidUvcCapital = params.creditUvc ? paidPrincipalBs - principalPaidUvc * baseIdi : 0;
    const valorPaidUvcRend = params.creditUvc ? paidInterest - paidInterestUvc * baseIdi : 0;

    const paidEarly = hasValidPayment ? paymentDate.getTime() < dueDate.getTime() : false;

    // Advance balance: if a payment was registered use the actual paid principal (tracks real
    // cash flows, including partial payments and prepayments); if no payment is registered yet,
    // advance by the scheduled amortization so the schedule shows proper French-amortization
    // behavior (decreasing balance each period) even before any payments are entered.
    balanceUvc = Math.max(0, startBalanceUvc - (hasValidPayment ? principalPaidUvc : amortUvc));

    unpaidMora = Math.max(0, unpaidMora + moraBs - paidMora);
    unpaidInterest = Math.max(0, unpaidInterest + interestBs - paidInterest);

    const balanceBs = params.creditUvc ? balanceUvc * idiDue : balanceUvc;

    totalInterest += interestBs;
    totalMora += moraBs;
    totalCuota += interestBs + amortBs;

    const explain = {
      startBalanceUvc: buildHint("Saldo_UVC_ini = saldo del periodo anterior", {
        Saldo_UVC_ini: startBalanceUvc.toFixed(6),
      }),
      interestUvc: buildHint("Ik = Saldo_UVC_ini * tasa * dias/base", {
        Saldo_UVC_ini: startBalanceUvc.toFixed(6),
        tasa: params.annualRate.toFixed(6),
        dias: daysPeriod,
        base: dayCountBase,
      }),
      amortUvc: buildHint("Ak = Cuota_UVC - Ik", {
        Cuota_UVC: paymentUvcAdj.toFixed(6),
        Ik: interestUvc.toFixed(6),
      }),
      paymentUvc: buildHint("Cuota_UVC = P * (i / (1 - (1+i)^-n))", {
        P: principalUvc.toFixed(6),
        i: paymentRate.toFixed(8),
        n: params.termMonths,
      }),
      idiDue: buildHint("IDI vencimiento", {
        IDI: idiDue.toFixed(8),
      }),
      interestBs: params.creditUvc && params.interestValuation === "idi_daily"
        ? buildHint("Interes_Bs = Ik * (Sum_IDI / dias)", {
          Ik: interestUvc.toFixed(6),
          Sum_IDI: sumIdiBetween(prevDate, dueDate, idiForDate).toFixed(8),
          dias: daysPeriod,
        })
        : buildHint("Interes_Bs = Ik * IDI_venc", {
          Ik: interestUvc.toFixed(6),
          IDI_venc: idiDue.toFixed(8),
        }),
      amortBs: buildHint("Amort_Bs = Ak * IDI_venc", {
        Ak: amortUvc.toFixed(6),
        IDI_venc: idiDue.toFixed(8),
      }),
      amortBaseBs: buildHint("Amort_base_Bs = Ak * IDI_desembolso", {
        Ak: amortUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
      }),
      amortVarBs: buildHint("Amort_variacion_Bs = Amort_Bs - Amort_base_Bs", {
        Amort_Bs: amortBs.toFixed(2),
        Amort_base_Bs: amortBaseBs.toFixed(2),
      }),
      interestBaseBs: buildHint("Interes_base_Bs = Ik * IDI_desembolso", {
        Ik: interestUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
      }),
      interestVarBs: buildHint("Interes_variacion_Bs = Interes_Bs - Interes_base_Bs", {
        Interes_Bs: interestBs.toFixed(2),
        Interes_base_Bs: interesBaseBs.toFixed(2),
      }),
      cuotaBs: buildHint("Cuota_Bs = Interes_Bs + Amort_Bs", {
        Interes_Bs: interestBs.toFixed(2),
        Amort_Bs: amortBs.toFixed(2),
      }),
      daysLate: buildHint("Dias_mora = max(0, dias_pago - dias_gracia)", {
        dias_pago: diffDaysActual(dueDate, paymentDate),
        dias_gracia: params.graceDays,
      }),
      moraBs: buildHint("Mora_Bs = Base_mora * tasa_mora * dias/base * IDI", {
        Base_mora_UVC: (params.moraBase === "saldo" ? startBalanceUvc : amortUvc).toFixed(6),
        tasa_mora: params.moraRate.toFixed(6),
        dias: daysLate,
        base: dayCountBase,
        IDI_pago: (params.creditUvc ? idiForDate(paymentDate) : 1).toFixed(8),
      }),
      activeMora: buildHint("Rend_mora_act = mora (si mora <= Mora2)", {
        Mora_Bs: moraBs.toFixed(2),
        Mora2: params.mora2,
      }),
      activeConv: buildHint("Rend_conv_act = interes (si mora <= Mora2)", {
        Interes_Bs: interestBs.toFixed(2),
        Mora2: params.mora2,
      }),
      orderMora: buildHint("Rend_mora_ord = mora (si mora > Mora2)", {
        Mora_Bs: moraBs.toFixed(2),
        Mora2: params.mora2,
      }),
      orderConv: buildHint("Rend_conv_ord = interes (si mora > Mora2)", {
        Interes_Bs: interestBs.toFixed(2),
        Mora2: params.mora2,
      }),
      moratorio143: buildHint("Moratorio 143 = Rend mora activos (solo mora)", {
          Mora_act: activeMora.toFixed(2),
          Moratorio_143: moratorio143.toFixed(2),
        }),
        moratorio819: buildHint("Moratorio 819 = Rend mora orden (solo mora)", {
          Mora_ord: orderMora.toFixed(2),
          Moratorio_819: moratorio819.toFixed(2),
        }),
      valorUvcCapital: buildHint("Val_UVC_cap = Amort_Bs - Ak * IDI_desembolso", {
        Amort_Bs: amortBs.toFixed(2),
        Ak: amortUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
      }),
      valorUvcRend: buildHint("Val_UVC_rend = Interes_Bs - Ik * IDI_desembolso", {
        Interes_Bs: interestBs.toFixed(2),
        Ik: interestUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
      }),
      valorPaidUvcCapital: buildHint("Val_UVC_cap_pagada = Pago_cap_Bs - cap_pagado_UVC * IDI_desembolso", {
        Pago_cap_Bs: paidPrincipalBs.toFixed(2),
        cap_pagado_UVC: principalPaidUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
        IDI_pago: idiPay.toFixed(8),
      }),
      valorPaidUvcRend: buildHint("Val_UVC_rend_pagada = Interes_pagado - Interes_pagado_UVC * IDI_desembolso", {
        Interes_pagado: paidInterest.toFixed(2),
        Interes_pagado_UVC: paidInterestUvc.toFixed(6),
        IDI_desembolso: baseIdi.toFixed(8),
        IDI_pago: idiPay.toFixed(8),
      }),
      balanceUvc: buildHint("Saldo_UVC_fin = Saldo_UVC_ini - capital_pagado", {
        Saldo_UVC_ini: startBalanceUvc.toFixed(6),
        capital_pagado: principalPaidUvc.toFixed(6),
      }),
      saldoBs: params.creditUvc
        ? buildHint("Saldo_Bs = Saldo_UVC_fin * IDI_venc", {
          Saldo_UVC_fin: balanceUvc.toFixed(6),
          IDI_venc: idiDue.toFixed(8),
        })
        : buildHint("Saldo_Bs = Saldo_fin", {
          Saldo_Bs: balanceUvc.toFixed(2),
        }),
      paymentAmount: buildHint("Pago_Bs = monto informado", {
        Pago_Bs: paymentAmount.toFixed(2),
      }),
    };

    // generar desglose diario entre periodStart (exclusive) y la fecha de corte/pago
    const dailyBreakdown = [];
    const moraBaseUvc = params.moraBase === "saldo" ? startBalanceUvc : amortUvc;
    let cumMoraUvc = 0;
    let cumMoraBs = 0;
    const dailyRateFactor = params.annualRate / dayCountBase; // per-day fraction of annual rate (uses 360/365 denominator)
    const effectiveAsOf = asOfDate && asOfDate > periodStart ? asOfDate : null;
    const detailEndDate = hasValidPayment ? paymentDate : (effectiveAsOf || dueDate);
    const cursor = new Date(periodStart.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    let cumInterestUvc = 0;
    let cumInterestBs = 0;
    while (cursor <= detailEndDate) {
      const dayIdi = params.creditUvc ? idiForDate(cursor) : 1;
      const dayIdiText = params.creditUvc
        ? (typeof idiForDate.textFor === "function" ? idiForDate.textFor(cursor) : dayIdi.toFixed(8))
        : "1";
      const isHoliday = Array.isArray(params.holidays) && params.holidays.indexOf(formatDate(cursor)) !== -1;
      const dow = cursor.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      // mora diario: se genera por dias > vencimiento + dias de gracia
      const daysSinceDue = diffDaysActual(dueDate, cursor);
      const moraDayCount = Math.max(0, daysSinceDue - params.graceDays);
      let isAccruingMora = false;
      let dailyMoraUvc = 0;
      let dailyMoraBs = 0;
      if (moraDayCount > 0 && params.moraRate > 0) {
        isAccruingMora = true;
        dailyMoraUvc = moraBaseUvc * params.moraRate * (1 / dayCountBase);
        if (params.creditUvc) {
          dailyMoraBs = params.interestValuation === "idi_daily"
            ? dailyMoraUvc * idiForDate(cursor)
            : dailyMoraUvc * idiForDate(paymentDate);
        } else {
          dailyMoraBs = dailyMoraUvc;
        }
      }
      const dailyInterestUvc = startBalanceUvc * dailyRateFactor;

      // interest in Bs depends on valuation mode
      const dailyInterestBs = params.creditUvc
        ? (params.interestValuation === "idi_daily" ? dailyInterestUvc * dayIdi : dailyInterestUvc * idiDue)
        : dailyInterestUvc;

      cumInterestUvc += dailyInterestUvc;
      cumInterestBs += dailyInterestBs;
      cumMoraUvc += dailyMoraUvc;
      cumMoraBs += dailyMoraBs;

      // amort and payment occur on dueDate normally, but if payment happens earlier
      // reflect amort/payment on the actual paymentDate
      const isDueDay = formatDate(cursor) === formatDate(dueDate);
      const isPaymentDay = hasValidPayment && formatDate(cursor) === formatDate(paymentDate);
      const amortUvcDay = isDueDay ? amortUvc : (isPaymentDay ? principalPaidUvc : 0);
      const amortBsDay = isDueDay ? amortBs : (isPaymentDay ? paidPrincipalBs : 0);
      const amortBaseBsDay = isDueDay ? amortBaseBs : (isPaymentDay ? (principalPaidUvc * baseIdi) : 0);
      const amortVarBsDay = isDueDay ? amortVarBs : (isPaymentDay ? (paidPrincipalBs - principalPaidUvc * baseIdi) : 0);
      const paymentUvcDay = isDueDay ? paymentUvcAdj : (isPaymentDay ? principalPaidUvc : 0);
      const paymentBsDay = isDueDay ? (interestBs + amortBs) : (isPaymentDay ? (paidInterest + paidPrincipalBs + paidMora) : 0);

      const balanceUvcStartDay = startBalanceUvc;
      const balanceUvcEndDay = isDueDay ? Math.max(0, startBalanceUvc - amortUvc) : (isPaymentDay ? Math.max(0, startBalanceUvc - principalPaidUvc) : startBalanceUvc);

      dailyBreakdown.push({
        date: formatDate(cursor),
        idi: dayIdi,
        idiText: dayIdiText,
        idiSource: typeof idiForDate.sourceFor === 'function' ? idiForDate.sourceFor(cursor) : 'invented',
        isHoliday: Boolean(isHoliday),
        isWeekend: Boolean(isWeekend),
        isAccruingMora: Boolean(isAccruingMora),
        dailyMoraUvc: Number(dailyMoraUvc.toFixed(6)),
        dailyMoraBs: Number(dailyMoraBs.toFixed(2)),
        cumMoraUvc: Number(cumMoraUvc.toFixed(6)),
        cumMoraBs: Number(cumMoraBs.toFixed(2)),
        startBalanceUvc: Number(startBalanceUvc.toFixed(6)),
        dailyInterestUvc: Number(dailyInterestUvc.toFixed(8)),
        dailyInterestBs: Number(dailyInterestBs.toFixed(2)),
        cumInterestUvc: Number(cumInterestUvc.toFixed(8)),
        cumInterestBs: Number(cumInterestBs.toFixed(2)),
        amortUvcDay: Number(amortUvcDay.toFixed(6)),
        amortBsDay: Number(amortBsDay.toFixed(2)),
        amortBaseBsDay: Number(amortBaseBsDay.toFixed(2)),
        amortVarBsDay: Number(amortVarBsDay.toFixed(2)),
        paymentUvcDay: Number(paymentUvcDay.toFixed(6)),
        paymentBsDay: Number(paymentBsDay.toFixed(2)),
        balanceUvcStartDay: Number(balanceUvcStartDay.toFixed(6)),
        balanceUvcEndDay: Number(balanceUvcEndDay.toFixed(6)),
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // generar desglose de mora entre el día siguiente al vencimiento y la fecha de pago (si aplica)
    const moraBreakdown = [];
    let cumMoraUvc2 = 0;
    let cumMoraBs2 = 0;
    const startMoraDate = addDays(dueDate, params.graceDays + 1);
    if (params.moraRate > 0 && startMoraDate <= detailEndDate) {
      const cursor2 = new Date(startMoraDate.getTime());
      while (cursor2 <= detailEndDate) {
        const dayIdi2 = params.creditUvc ? idiForDate(cursor2) : 1;
        const dayIdiText2 = params.creditUvc
          ? (typeof idiForDate.textFor === "function" ? idiForDate.textFor(cursor2) : dayIdi2.toFixed(8))
          : "1";
        const isHoliday2 = Array.isArray(params.holidays) && params.holidays.indexOf(formatDate(cursor2)) !== -1;
        const dow2 = cursor2.getUTCDay();
        const isWeekend2 = dow2 === 0 || dow2 === 6;

        const dailyMoraUvc2 = moraBaseUvc * params.moraRate * (1 / dayCountBase);
        let dailyMoraBs2 = 0;
        if (params.creditUvc) {
          dailyMoraBs2 = params.interestValuation === "idi_daily"
            ? dailyMoraUvc2 * idiForDate(cursor2)
            : dailyMoraUvc2 * idiForDate(paymentDate);
        } else {
          dailyMoraBs2 = dailyMoraUvc2;
        }

        cumMoraUvc2 += dailyMoraUvc2;
        cumMoraBs2 += dailyMoraBs2;

        moraBreakdown.push({
          date: formatDate(cursor2),
          idi: dayIdi2,
          idiText: dayIdiText2,
          idiSource: typeof idiForDate.sourceFor === 'function' ? idiForDate.sourceFor(cursor2) : 'invented',
          isHoliday: Boolean(isHoliday2),
          isWeekend: Boolean(isWeekend2),
          dailyMoraUvc: Number(dailyMoraUvc2.toFixed(6)),
          dailyMoraBs: Number(dailyMoraBs2.toFixed(2)),
          cumMoraUvc: Number(cumMoraUvc2.toFixed(6)),
          cumMoraBs: Number(cumMoraBs2.toFixed(2)),
          isAccruingMora: true,
        });

        cursor2.setUTCDate(cursor2.getUTCDate() + 1);
      }
    }

    schedule.push({
      index: i + 1,
      periodStart,
      dueDate,
      daysPeriod,
      startBalanceUvc,
      interestUvc,
      amortUvc,
      paymentUvc: paymentUvcAdj,
      idiDue,
      idiTextDue,
      dueAmount: baseDue,
      interestBs,
      interesBaseBs,
      interesVarBs,
      amortBs,
      amortBaseBs,
      amortVarBs,
      cuotaBs: interestBs + amortBs,
      paymentDate,
      paymentAmount,
      daysLate,
      moraBs,
      activeMora,
      activeConv,
      orderMora,
      orderConv,
      moratorio143,
      moratorio819,
      valorUvcCapital,
      valorUvcRend,
      status: classifyDays(daysLate, params.mora1, params.mora2, params.mora3),
      balanceUvc,
      balanceBs,
      paidEarly,
      paidPrincipalBs: Number(paidPrincipalBs ? paidPrincipalBs.toFixed(2) : 0),
      paidPrincipalUvc: Number(principalPaidUvc ? principalPaidUvc.toFixed(6) : 0),
      valorPaidUvcCapital: Number(valorPaidUvcCapital ? valorPaidUvcCapital.toFixed(6) : 0),
      valorPaidUvcRend: Number(valorPaidUvcRend ? valorPaidUvcRend.toFixed(6) : 0),
      paidMora,
      paidInterest,
      paidPrincipal,
      paidExtra,
      explain,
      dailyBreakdown,
      moraBreakdown,
    });

    // Reconducir calendario si hubo prepago y la opción está activada
    if (params.recomputeAfterPrepay && paidExtra > 0) {
      if (params.prepayAction === 'reduce_term') {
        // Mantener la cuota actual (curPaymentUvc) y reducir plazo restante
        const remainingAfter = Math.max(0, params.termMonths - (i + 1));
        let newRemaining = remainingAfter;
        if (curPaymentUvc > 0) {
          if (paymentRate === 0) {
            newRemaining = Math.max(0, Math.ceil(balanceUvc / curPaymentUvc));
          } else {
            // evitar log de valores inválidos
            if (curPaymentUvc <= balanceUvc * paymentRate) {
              newRemaining = 0;
            } else {
              const n = -Math.log(1 - (balanceUvc * paymentRate) / curPaymentUvc) / Math.log(1 + paymentRate);
              newRemaining = Math.max(0, Math.ceil(n));
            }
          }
        }
        params.termMonths = (i + 1) + newRemaining;
        overrides = normalizePayments(input.payments, params.termMonths);
      } else {
        // reduce_installment: mantener plazo y reducir cuota
        const remainingAfter = Math.max(0, params.termMonths - (i + 1));
        if (remainingAfter > 0) {
          if (paymentRate === 0) {
            curPaymentUvc = remainingAfter === 0 ? 0 : balanceUvc / remainingAfter;
          } else {
            curPaymentUvc = balanceUvc * (paymentRate / (1 - Math.pow(1 + paymentRate, -remainingAfter)));
          }
        } else {
          curPaymentUvc = balanceUvc;
        }
      }
    }

    prevDate = dueDate;
    i += 1;
  }

  const feeBs = params.principal * (params.disbursementFeeRate / 100);
  const netReceived = params.principal - feeBs;
  let totalAmort = 0;
  
  const avgCuota = schedule.length ? totalCuota / schedule.length : 0;
  const cashflows = [netReceived, ...schedule.map((row) => {
    totalAmort += row.amortBs;
    return -row.paymentAmount;
  })];
  const irr = calculateIrr(cashflows);
  const annualIrr = irr !== null ? Math.pow(1 + irr, 12) - 1 : null;

  const summary = {
    netReceived,
    paymentUvc,
    avgCuota,
    totalInterest,
    totalMora,
    totalAmort,
    totalCuota,
    totalOutstanding: schedule.length ? schedule[schedule.length - 1].balanceBs : params.principal,
    annualIrr,
    asOfDate: formatDate(asOfDate || params.disbursementDate),
  };

  const accounts = buildAccounts(params.accounts);
  const ledger = buildLedger(params, schedule, accounts, feeBs);

  return {
    params: {
      ...params,
      annualRate: params.annualRate * 100,
      moraRate: params.moraRate * 100,
    },
    summary,
    schedule,
    columnHints: buildColumnHints(),
    ledger,
    accounts,
  };
}
