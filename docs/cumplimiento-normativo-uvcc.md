# Análisis de la documentación UVCC y aplicación al sistema

Este documento resume el análisis de la normativa contenida en la carpeta `documentacion/`
y detalla cómo cada lineamiento se aplicó al simulador. Es el mapa de trazabilidad entre la
regulación del BCV/SUDEBAN y el código.

## 1. Fuentes analizadas

| Documento | Contenido relevante |
|---|---|
| `RESOLUCION BCV CREDITOS UVCC.pdf` / `GO 41.742 VERSION UVCC.pdf` | G.O. N° 41.742 (21/10/2019): Resolución N° 19-09-01 (UVCC) + Aviso Oficial: comisión flat máx **0,50%** |
| `Presentación impacto contable UVCC.pptx` | Plan de cuentas UVCC (131.35, 131.36, 358.01, 513.01.M.35, 513.01.M.36), comisión flat 0,50%, tasa 4%-6% |
| `Tabla amortizacion nayrobis bolivar-1.xlsx`, `Simulacion UVCC.xlsx`, `TABLA DE CARTERA SIMULADA UVCC...xlsx`, `SIMULACION A 30 DIAS...xlsx` | Modelos de cálculo: devengo diario en UVC, conversión por IDI, componente base vs. variación, TIR |
| `BCV circular_entrada_en_vigencia_aplicabilidad_octubre_2019.pdf` | Fija la entrada en vigencia de la Resolución 19-09-01 el **28/10/2019** |
| `CIRCULAR SIB-DSB-CJ-OD-13083-Unidad de Valor de Credito Comercial.pdf` | Circular SUDEBAN (14/11/2019): cláusulas mínimas del contrato UVCC |
| `resolucion_21-01-02 indexacion cartera de credito.pdf` | **Norma vigente** (G.O. 42.050, 19/01/2021): UVC, IDI, tasas, mora, piso de IDI |
| `Créditos Comerciales expresados en UVCC.docx` | Definición del producto: devengo diario, tasa 4-6%, mora ≤0,5%, piso de IDI, cuenta patrimonial 358.00 |
| `REUNION SUDEBAN DEL 17-12-19 UVCC MINUTA.docx` / `...REV.docx` | Tratamiento contable: congelamiento del crédito vencido y registro en cuentas de orden |

## 2. Lineamientos extraídos y su aplicación

### 2.1 Expresión en UVC mediante el IDI (Res. 21-01-02, Art. 1)
- **Regla:** `Principal_UVC = Monto_Bs / IDI_otorgamiento`. El índice se llama **Índice de Inversión (IDI)**.
- **Aplicación:** ya implementado en `simulator.js` (`principalUvc = principal / idi`). Se corrigió la
  terminología en la documentación y en las pistas de columnas ("Índice de Inversión", no "Actualización").

### 2.2 Tasas de interés (Res. 21-01-02, Arts. 2-4)
- **Regla:** comercial/microcrédito en UVC: **4% – 10%**; Cartera Productiva Única Nacional: **2%**.
- **Aplicación:** `REGULATORY_LIMITS` + `evaluateCompliance()` en `simulator.js` emiten una alerta
  (`result.compliance`) cuando la tasa queda fuera del rango. El valor por defecto se ajustó a **10%**
  (antes 16%, no conforme). La UI muestra la regla bajo el campo "Tasa anual".

### 2.3 Tope de mora (Res. 21-01-02, Art. 7)
- **Regla:** máximo **0,80%** anual adicional para créditos en UVC; **3%** para no-UVC.
- **Aplicación:** verificado en `evaluateCompliance()`; alerta cuando se excede. El valor por
  defecto (0,80%) ya era conforme. La UI lo indica bajo el campo "Tasa mora anual".

### 2.4 Cancelación anticipada con piso de IDI (Res. 21-01-02, Arts. 5 b/c y 6; Circular 13083 pto. 2)
- **Regla:** cancelación anticipada sin penalidad; si el IDI de la fecha de pago es inferior al de
  otorgamiento, se usa el de otorgamiento para determinar el monto a pagar.
- **Aplicación:** parámetro `idiFloorOnPrepay` (activo por defecto). En `simulator.js`,
  `idiPayEffective = max(idiPay, baseIdi)` al convertir el capital pagado/abonado. Sin efecto cuando
  el IDI crece; solo actúa ante una caída del IDI. Expone `idiFloorApplied` por cuota y un toggle en la UI.

### 2.5 Congelamiento del crédito vencido (Minuta SUDEBAN 17/12/2019, pto. 4)
- **Regla:** al pasar a vencido el crédito se congela (no más actualización por IDI en cuentas reales);
  las revalorizaciones de capital y rendimientos se devengan en cuentas de orden hasta el cobro; el
  incremento del capital revaluado se registra en la cuenta patrimonial **358.00**.
- **Aplicación:** cuando una cuota supera `mora2` (estado "en orden"), `simulator.js` enruta la
  valorización a `valorUvcCapitalOrder` / `valorUvcRendOrder` (bandera `frozen`), de forma análoga al
  enrutamiento de rendimientos/mora al grupo 819 ya existente.

### 2.6 Composición de la cuota (Res. 21-01-02, Art. 5 lit. a)
- **Regla:** cada cuota debe incluir interés y una porción de amortización de capital expresada en UVC.
- **Aplicación:** sistema de amortización francesa en UVC ya implementado (cuota fija en UVC).

### 2.7 Plan de cuentas oficial UVCC (Manual de Contabilidad SUDEBAN)
- **Regla:** la modificación al Manual de Contabilidad (Circular SIB-II-GGR-GNP-12161 del
  28/10/2019, acompañando a la Res. 19-09-01), reflejada en `Presentación impacto contable UVCC.pptx`
  y en los modelos Excel, crea las subcuentas:
  - `131.35` Créditos comerciales vigentes objeto de las medidas del BCV (capital base).
  - `131.36` Variación de créditos comerciales vigentes (`.M.01` incremento / `.M.02` disminución).
  - `358.01` Variación de créditos comerciales (patrimonio).
  - `513.01.M.35` Rendimientos por créditos comerciales vigentes.
  - `513.01.M.36` Rendimientos por variación de créditos comerciales vigentes.
- **Aplicación:** `buildAccounts()` y `DEFAULT_ACCOUNTS` adoptan estos códigos. `buildLedger()`:
  (a) registra el capital en `131.35`; (b) **separa el devengo** en `513.01.M.35` (componente base)
  y `513.01.M.36` (componente por variación/actualización); (c) registra la variación de capital
  en `131.36` / `358.01`.

### 2.8 Comisión flat de desembolso (≤ 0,50%)
- **Regla:** la comisión flat no puede exceder el **0,50%** del monto del crédito (Aviso Oficial BCV,
  G.O. 41.742; reiterado en la presentación contable).
- **Aplicación:** verificación bloqueante `COMISION_FLAT` en `evaluateCompliance()`; el valor por
  defecto se ajustó de 0,80% a **0,50%**.

### 2.9 Banda de tasa del producto documentado (4%–6%)
- **Regla:** la presentación contable y la Res. 19-09-01 fijan el producto UVCC en **4%–6%** anual;
  la Res. 21-01-02 (vigente) amplía a 4%–10%. Los modelos Excel usan 6% y 4%.
- **Aplicación:** el tope bloqueante se mantiene en 4%–10% (norma vigente); el valor por defecto se
  ajustó a **6%** para coincidir con el producto y los ejemplos documentados.

### 2.10 Validación numérica contra los modelos Excel
- Se reprodujo la tabla `Tabla amortizacion nayrobis bolivar` con el motor: capital en UVC
  `160.000 / 0,98495915 = 162.443,29` ✓, IDI de la serie resuelto correctamente, interés base diario
  `160.000 × 16% / 360 = 71,11` ✓, separación base/variación del rendimiento consistente con los
  modelos (`Pago de interés` = base + componente de actualización).

### 2.7-bis Valoración del saldo (Res. 21-01-02, Art. 6)
- **Regla:** `Saldo_Bs = Posición_deudora_UVC × IDI_fecha`.
- **Aplicación:** ya implementado (`balanceBs = balanceUvc × idiDue`), con la excepción del piso del Art. 5 c).

## 3. Resumen de cambios en el código

| Archivo | Cambio |
|---|---|
| `src/lib/regulatory.js` | Módulo compartido: `REGULATORY_LIMITS` y `evaluateCompliance()` (niveles, lista `blocking`, check `COMISION_FLAT` ≤ 0,50%) |
| `src/lib/simulator.js` | Importa el módulo regulatorio; piso de IDI (`idiFloorOnPrepay`), enrutamiento de valorización a cuentas de orden (`frozen`), terminología IDI, **plan de cuentas SUDEBAN (131.35/131.36/358.01/513.01.M.35/513.01.M.36)** y asientos base/variación, `result.compliance` |
| `src/lib/loanStorage.js` | `annualRate` por defecto **6%**, comisión flat por defecto **0,50%**, `idiFloorOnPrepay: true`, `DEFAULT_ACCOUNTS` con el plan UVCC |
| `src/app/creditos/[id]/page.js` | Tarjeta "Cumplimiento BCV/SUDEBAN", **bloqueo previo** de simulación/pagos cuando hay violaciones, ayudas regulatorias, indicadores `piso`/`congelado`/`orden`, columnas CSV |
| `docs/documentacion-tecnica.md` | Marco regulatorio actualizado, terminología, topes de tasa/mora, piso de IDI, congelamiento |

## 4. Notas y limitaciones

- Los topes de tasa de interés y de mora se aplican como **validación bloqueante**: el módulo
  compartido `src/lib/regulatory.js` (`evaluateCompliance`) clasifica cada verificación con un nivel
  (`error` / `warning` / `info`). Los checks de nivel `error` (tasa fuera de rango, mora sobre el tope)
  **impiden simular o registrar pagos** desde la UI (botones deshabilitados + aviso). El piso de IDI
  desactivado se reporta como `warning` (no bloquea). La conformidad global se expone en
  `result.compliance.compliant` y la lista de bloqueos en `result.compliance.blocking`.
- Algunos PDFs (p. ej. `Resolución 070.19...PDF`) están escaneados sin capa de texto; el análisis se
  apoyó en las versiones con texto y en los DOCX/regulaciones equivalentes.
- Las cuentas contables y umbrales de clasificación siguen siendo configurables; verificar siempre las
  versiones vigentes del Manual de Contabilidad de SUDEBAN y de las resoluciones del BCV antes de
  usar en producción.
