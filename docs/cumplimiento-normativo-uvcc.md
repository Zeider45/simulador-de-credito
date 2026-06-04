# Análisis de la documentación UVCC y aplicación al sistema

Este documento resume el análisis de la normativa contenida en la carpeta `documentacion/`
y detalla cómo cada lineamiento se aplicó al simulador. Es el mapa de trazabilidad entre la
regulación del BCV/SUDEBAN y el código.

## 1. Fuentes analizadas

| Documento | Contenido relevante |
|---|---|
| `RESOLUCION BCV CREDITOS UVCC.pdf` / `GO 41.742 VERSION UVCC.pdf` | G.O. N° 41.742 (21/10/2019): Resolución N° 19-09-01 que crea la obligación de expresar los créditos comerciales en **UVCC** |
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

### 2.7 Valoración del saldo (Res. 21-01-02, Art. 6)
- **Regla:** `Saldo_Bs = Posición_deudora_UVC × IDI_fecha`.
- **Aplicación:** ya implementado (`balanceBs = balanceUvc × idiDue`), con la excepción del piso del Art. 5 c).

## 3. Resumen de cambios en el código

| Archivo | Cambio |
|---|---|
| `src/lib/simulator.js` | `REGULATORY_LIMITS`, `evaluateCompliance()`, piso de IDI (`idiFloorOnPrepay`), enrutamiento de valorización a cuentas de orden (`frozen`), terminología IDI, `result.compliance` |
| `src/lib/loanStorage.js` | `annualRate` por defecto 10% (conforme), `idiFloorOnPrepay: true` |
| `src/app/creditos/[id]/page.js` | Tarjeta "Cumplimiento BCV/SUDEBAN", ayudas regulatorias en tasa/mora, toggle de piso de IDI |
| `docs/documentacion-tecnica.md` | Marco regulatorio actualizado, terminología, topes de tasa/mora, piso de IDI, congelamiento |

## 4. Notas y limitaciones

- Los topes de tasa e interés se aplican como **alertas no bloqueantes** para no impedir simulaciones
  comparativas; la conformidad se reporta en `result.compliance.compliant`.
- Algunos PDFs (p. ej. `Resolución 070.19...PDF`) están escaneados sin capa de texto; el análisis se
  apoyó en las versiones con texto y en los DOCX/regulaciones equivalentes.
- Las cuentas contables y umbrales de clasificación siguen siendo configurables; verificar siempre las
  versiones vigentes del Manual de Contabilidad de SUDEBAN y de las resoluciones del BCV antes de
  usar en producción.
