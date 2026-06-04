// Limites regulatorios vigentes para creditos en UVC.
// Fuente: Resolucion BCV N° 21-01-02 (G.O. N° 42.050 del 19/01/2021), que deroga y
// sustituye las Resoluciones N° 19-09-01 / 20-02-01 sobre la Unidad de Valor de Credito
// Comercial (UVCC) de la G.O. N° 41.742 del 21/10/2019.
export const REGULATORY_LIMITS = {
  uvcRateMin: 4, // Art. 3: tasa minima para creditos comerciales y microcreditos en UVC.
  uvcRateMax: 10, // Art. 3: tasa maxima para creditos comerciales y microcreditos en UVC.
  productiveRate: 2, // Art. 2: tasa de la Cartera Productiva Unica Nacional.
  uvcMoraMax: 0.8, // Art. 7: mora maxima anual adicional para creditos en UVC.
  nonUvcMoraMax: 3, // Art. 7 (Paragrafo Unico): mora maxima para creditos NO expresados en UVC.
  flatFeeMax: 0.5, // Comision flat maxima del monto del credito (Aviso Oficial BCV, G.O. 41.742).
};

// Evalua el cumplimiento de los limites del BCV/SUDEBAN.
// Recibe los parametros en unidades "humanas" (tasas en porcentaje anual).
// No altera ningun calculo: devuelve un reporte que se usa para alertas y para el
// bloqueo previo al guardado/simulacion (solo los checks de nivel "error" bloquean).
export function evaluateCompliance({ annualRate, moraRate, creditUvc, idiFloorOnPrepay, disbursementFeeRate }) {
  const checks = [];
  const eps = 1e-9;
  const rate = Number(annualRate) || 0;
  const mora = Number(moraRate) || 0;
  const flatFee = Number(disbursementFeeRate) || 0;
  const add = (ok, code, message, ref, level) =>
    checks.push({ ok, code, message, ref, level: level || (ok ? "info" : "error") });

  if (creditUvc) {
    const within = rate >= REGULATORY_LIMITS.uvcRateMin - eps && rate <= REGULATORY_LIMITS.uvcRateMax + eps;
    const isProductive = Math.abs(rate - REGULATORY_LIMITS.productiveRate) < eps;
    add(
      within || isProductive,
      "TASA_INTERES",
      within
        ? `Tasa de interes ${rate.toFixed(2)}% dentro del rango 4%-10% para creditos comerciales/microcreditos en UVC.`
        : isProductive
          ? `Tasa de interes ${rate.toFixed(2)}% corresponde a la Cartera Productiva Unica Nacional (2%).`
          : `Tasa de interes ${rate.toFixed(2)}% fuera del rango permitido 4%-10% (o 2% para Cartera Productiva).`,
      "Res. BCV 21-01-02, Arts. 2 y 3"
    );

    const moraOk = mora <= REGULATORY_LIMITS.uvcMoraMax + eps;
    add(
      moraOk,
      "TASA_MORA",
      moraOk
        ? `Tasa de mora ${mora.toFixed(2)}% no excede el maximo de 0,80% anual adicional para creditos en UVC.`
        : `Tasa de mora ${mora.toFixed(2)}% excede el maximo de 0,80% anual adicional permitido para creditos en UVC.`,
      "Res. BCV 21-01-02, Art. 7"
    );

    const feeOk = flatFee <= REGULATORY_LIMITS.flatFeeMax + eps;
    add(
      feeOk,
      "COMISION_FLAT",
      feeOk
        ? `Comision flat ${flatFee.toFixed(2)}% no excede el maximo de 0,50% del monto del credito.`
        : `Comision flat ${flatFee.toFixed(2)}% excede el maximo de 0,50% del monto del credito.`,
      "Aviso Oficial BCV, G.O. 41.742 del 21/10/2019"
    );

    add(
      Boolean(idiFloorOnPrepay),
      "PISO_IDI",
      idiFloorOnPrepay
        ? "Piso de IDI activo: en cancelacion anticipada, si el IDI de la fecha de pago es menor al de otorgamiento se emplea el de otorgamiento."
        : "Piso de IDI desactivado: la cancelacion anticipada deberia emplear como minimo el IDI de la fecha de otorgamiento.",
      "Res. BCV 21-01-02, Art. 5 lit. b/c y Art. 6",
      idiFloorOnPrepay ? "info" : "warning"
    );
  } else {
    const moraOk = mora <= REGULATORY_LIMITS.nonUvcMoraMax + eps;
    add(
      moraOk,
      "TASA_MORA",
      moraOk
        ? `Tasa de mora ${mora.toFixed(2)}% no excede el maximo de 3% anual para creditos no expresados en UVC.`
        : `Tasa de mora ${mora.toFixed(2)}% excede el maximo de 3% anual para creditos no expresados en UVC.`,
      "Res. BCV 21-01-02, Art. 7 (Paragrafo Unico)"
    );
  }

  const blocking = checks.filter((c) => !c.ok && c.level === "error");
  const violations = checks.filter((c) => !c.ok).length;
  return { checks, violations, blocking, compliant: violations === 0 };
}
