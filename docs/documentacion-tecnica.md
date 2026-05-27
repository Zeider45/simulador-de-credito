# Documentación Técnica: Sistema de Crédito UVC-IDI
**Versión 1.0 — Mayo 2026**

> **Alcance:** Este documento describe las fórmulas, decisiones de diseño y fundamentos regulatorios del motor de cálculo de créditos. Está orientado a desarrolladores e implementadores que requieran integrar este motor en un sistema bancario real bajo la normativa venezolana vigente (SUDEBAN / BCV).

---

## Tabla de contenido

1. [Marco regulatorio de referencia](#1-marco-regulatorio-de-referencia)
2. [Unidad de Valor Constante (UVC) e Índice de Actualización (IDI)](#2-unidad-de-valor-constante-uvc-e-índice-de-actualización-idi)
3. [Sistema de amortización francesa (cuota fija)](#3-sistema-de-amortización-francesa-cuota-fija)
4. [Base de días (convención de cómputo)](#4-base-de-días-convención-de-cómputo)
5. [Valoración de intereses: IDI diario vs. IDI al vencimiento](#5-valoración-de-intereses-idi-diario-vs-idi-al-vencimiento)
6. [Desglose de la cuota en Bolívares](#6-desglose-de-la-cuota-en-bolívares)
7. [Cálculo de mora](#7-cálculo-de-mora)
8. [Clasificación de la cartera de créditos](#8-clasificación-de-la-cartera-de-créditos)
9. [Moratorio 143 y 819 (Plan de Cuentas SUDEBAN)](#9-moratorio-143-y-819-plan-de-cuentas-sudeban)
10. [Valorización UVC (componente inflacionario)](#10-valorización-uvc-componente-inflacionario)
11. [Prepagos y reconducción del crédito](#11-prepagos-y-reconducción-del-crédito)
12. [Asientos contables](#12-asientos-contables)
13. [Ajuste a días hábiles](#13-ajuste-a-días-hábiles)
14. [Parámetros configurables y sus límites regulatorios](#14-parámetros-configurables-y-sus-límites-regulatorios)

---

## 1. Marco regulatorio de referencia

El sistema está diseñado para cumplir con el siguiente conjunto normativo venezolano:

| Instrumento | Emisor | Relevancia |
|---|---|---|
| **Ley de Instituciones del Sector Bancario (LISB)** — G.O. N° 6.154 Ext. del 19/11/2014 | AN / Ejecutivo Nacional | Marco general de las operaciones crediticias, tasas de interés y protección al usuario financiero |
| **Ley del Banco Central de Venezuela (LBCV)** — G.O. N° 6.211 Ext. del 30/12/2015 | BCV | Faculta al BCV para emitir la UVC, publicar el IDI y regular el sistema monetario |
| **Resolución BCV sobre Unidad de Valor Constante** — Convenio Cambiario N° y Resoluciones del Directorio BCV | BCV | Define la UVC, el IDI y la metodología de actualización de créditos |
| **Manual de Contabilidad para Instituciones Financieras Bancarias** — SUDEBAN | SUDEBAN | Plan de cuentas oficial (códigos 143, 819, 1310, 1340, 1350, etc.) |
| **Normas relativas a la Clasificación del Riesgo en la Cartera de Créditos** — Resolución SUDEBAN N° 009.16 | SUDEBAN | Umbrales de mora, provisiones y clasificación por días de atraso |
| **Normas para los Usuarios de los Servicios Financieros** — Resolución SUDEBAN | SUDEBAN | Transparencia de tasas, método de cálculo y divulgación al cliente |

> **Nota de vigencia:** Las resoluciones BCV y SUDEBAN se actualizan con frecuencia. Antes de poner en producción, verificar las versiones vigentes en el portal oficial del BCV (bcv.org.ve) y de SUDEBAN (sudeban.gob.ve).

---

## 2. Unidad de Valor Constante (UVC) e Índice de Actualización (IDI)

### 2.1 Fundamento regulatorio

El BCV creó la **Unidad de Valor Constante (UVC)** como unidad de cuenta para créditos, con el objetivo de preservar el valor real del capital prestado frente a la inflación. La base legal es la **Ley del BCV (art. 7, numeral 5)**, que autoriza al BCV a emitir instrumentos de valor estable, y las resoluciones del Directorio BCV que establecen la metodología del **Índice de Actualización (IDI)**.

El IDI es publicado diariamente por el BCV y expresa cuántos bolívares equivale una UVC en una fecha determinada.

### 2.2 Conversión de capital a UVC

Al momento del desembolso, el capital en bolívares se convierte a UVC usando el IDI del día del desembolso:

```
Principal_UVC = Principal_Bs / IDI_desembolso
```

**Sustento:** Este procedimiento garantiza que el acreedor recupere el poder adquisitivo real del capital prestado, conforme al objeto de la UVC definido en las resoluciones del BCV. El IDI del día de desembolso es el punto de referencia inmutable para toda la vida del crédito.

### 2.3 Conversión de saldos y cuotas a Bolívares

En cualquier fecha posterior, el valor en bolívares de un monto en UVC se obtiene multiplicando por el IDI de esa fecha:

```
Monto_Bs = Monto_UVC × IDI_fecha
```

### 2.4 Resolución de IDI para fechas sin publicación

El BCV no publica IDI en días feriados ni fines de semana. El sistema ofrece dos estrategias:

| Estrategia | Descripción | Cuándo usar |
|---|---|---|
| **Interpolación lineal** | IDI entre dos fechas publicadas se distribuye proporcionalmente por días | Para estimaciones más precisas y auditoría |
| **Arrastre (carry)** | Se usa el último IDI publicado hasta el próximo | Para cálculos conservadores o cuando no hay dato intermedio confiable |

**Sustento:** El BCV no especifica un método de interpolación obligatorio para uso interno de las instituciones; sin embargo, la interpolación lineal es la práctica contable generalmente aceptada (NIC 39, adaptada al contexto venezolano) y la más defendible ante una auditoría SUDEBAN.

---

## 3. Sistema de amortización francesa (cuota fija)

### 3.1 Fundamento regulatorio

La **Resolución SUDEBAN sobre Normas para los Usuarios de los Servicios Financieros** exige que los contratos de crédito especifiquen el sistema de amortización utilizado y que el mismo permita al usuario conocer con exactitud cuánto pagará cada período. El sistema francés (cuota fija) es el más transparente para el deudor, ya que la cuota en UVC no varía durante la vida del crédito.

### 3.2 Fórmula de la cuota fija en UVC

```
Cuota_UVC = Principal_UVC × [ i / (1 − (1 + i)^(−n)) ]
```

Donde:
- `Principal_UVC` = capital en UVC (ver sección 2.2)
- `i` = tasa de interés mensual = `tasa_anual / 12`
- `n` = plazo en meses

**Caso especial — tasa cero:**
```
Cuota_UVC = Principal_UVC / n
```

### 3.3 Descomposición de la cuota

Cada período:

```
Interes_UVC(t) = Saldo_UVC(t−1) × tasa_anual × (días_período / base_días)

Amort_UVC(t) = Cuota_UVC − Interes_UVC(t)

Saldo_UVC(t) = Saldo_UVC(t−1) − Amort_UVC(t)
```

**Propiedad garantizada:** La amortización en UVC es siempre creciente y los intereses decrecientes (característica del método francés), lo que garantiza que el saldo UVC converge a cero en el último período.

**Sustento:** El método francés está reconocido en las Normas para los Usuarios de los Servicios Financieros de SUDEBAN como método válido para créditos de cuota fija. La transparencia del método (el cliente conoce la cuota UVC desde el inicio del contrato) cumple el principio de información al usuario establecido en la **LISB, art. 52 y siguientes**.

---

## 4. Base de días (convención de cómputo)

### 4.1 Opciones implementadas

| Convención | Cómputo de días | Base anual | Uso típico |
|---|---|---|---|
| **30/360** | Cada mes = 30 días, año = 360 | 360 | Créditos hipotecarios, comerciales estructurados |
| **Actual/365** | Días calendario reales | 365 | Créditos de consumo, microcrédito |

### 4.2 Fórmula de la tasa período

```
Tasa_período = Tasa_anual × (días_período / base_días)
```

**Sustento:** SUDEBAN no impone una sola convención, pero el **Manual de Contabilidad para Instituciones Financieras** utiliza la base 360 para el cálculo de intereses en cuentas de crédito, lo que hace que **30/360 sea la convención predominante en la banca venezolana**. La base Actual/365 se aplica cuando el contrato lo especifica expresamente, en particular para productos vinculados a tasas del mercado monetario.

---

## 5. Valoración de intereses: IDI diario vs. IDI al vencimiento

### 5.1 El problema de la valoración en UVC

Los intereses se acumulan en UVC durante todo el período, pero deben expresarse en bolívares. La pregunta es: ¿qué IDI se usa para convertirlos?

### 5.2 Modalidad IDI al vencimiento

```
Interes_Bs = Interes_UVC × IDI_vencimiento
```

Sencillo: usa el IDI del día de vencimiento de la cuota.

### 5.3 Modalidad IDI diario (suma de devengos)

```
Interes_Bs = Σ [ Interes_UVC_día(t) × IDI(t) ]   para cada día t del período
```

Donde `Interes_UVC_día(t)` es la fracción diaria del interés:

```
Interes_UVC_día(t) = Saldo_UVC × tasa_anual / base_días
```

### 5.4 Cuál usar y por qué

**Sustento:** Las **Normas Relativas a la UVC del BCV** establecen que los intereses sobre créditos en UVC deben valorarse utilizando el IDI del día en que se produce el devengo o del día de pago, siendo el devengo diario el criterio más preciso contablemente. La modalidad **IDI diario** es la que se alinea con el principio de devengo establecido en las **Normas Internacionales de Contabilidad adoptadas por SUDEBAN (NIC 18 / NIIF 9)** para el reconocimiento de ingresos financieros: los ingresos se reconocen en el período al que corresponden, valorados al tipo de cambio (en este caso IDI) vigente en cada día de devengo.

La modalidad IDI al vencimiento es una simplificación aceptable para presentaciones administrativas, pero puede generar diferencias materiales en períodos de alta inflación.

---

## 6. Desglose de la cuota en Bolívares

### 6.1 Componentes

```
Cuota_Bs = Interes_Bs + Amort_Bs

Amort_Bs = Amort_UVC × IDI_vencimiento

Interes_Bs = (ver sección 5, según modalidad)

Saldo_Bs = Saldo_UVC_fin × IDI_vencimiento
```

### 6.2 Componente base y componente variación

Para fines de reportes regulatorios y contabilización, cada componente en Bs se divide en:

```
Componente_base_Bs   = Monto_UVC × IDI_desembolso
Componente_var_Bs    = Monto_UVC × (IDI_vencimiento − IDI_desembolso)
                     = Monto_Bs − Componente_base_Bs
```

**Sustento:** Esta distinción tiene base en el **Manual de Contabilidad de SUDEBAN**, que separa el "rendimiento por intereses" (componente base) del "rendimiento por actualización UVC" (componente variación) en cuentas distintas del plan de cuentas bancario. Esto permite a la institución reportar correctamente la utilidad financiera ordinaria separada de la utilidad por actualización monetaria.

---

## 7. Cálculo de mora

### 7.1 Días de mora

```
Días_mora = max(0, días_entre(vencimiento, fecha_pago) − días_gracia)
```

El **período de gracia** es un parámetro configurado en el contrato. SUDEBAN permite períodos de gracia que el banco establezca en sus políticas internas, siempre que sean transparentes al deudor.

### 7.2 Tasa de mora

La tasa de mora es fijada contractualmente y debe respetar los límites establecidos por el BCV. Históricamente, el BCV ha publicado tasas máximas de mora mediante resoluciones. El sistema acepta la tasa como parámetro configurable expresada en porcentaje anual.

### 7.3 Fórmula de mora en UVC

```
Base_mora_UVC = Amort_UVC  (si moraBase = "amortización")
Base_mora_UVC = Saldo_UVC  (si moraBase = "saldo")

Mora_UVC = Base_mora_UVC × tasa_mora × (días_mora / base_días)
```

### 7.4 Conversión de mora a Bolívares

```
Mora_Bs = Mora_UVC × IDI_fecha_pago    (si IDI al vencimiento)

Mora_Bs = Σ [ Mora_UVC_día × IDI(t) ]  (si IDI diario, desde fecha vencimiento hasta fecha pago)
```

### 7.5 Base de la mora: amortización vs. saldo

| Base | Descripción | Cuándo usar |
|---|---|---|
| **Amortización** | La mora se calcula sobre la cuota de capital impagada | Créditos estructurados, hipotecario, comercial. Es la práctica más común en Venezuela |
| **Saldo** | La mora se calcula sobre el saldo total del crédito | Créditos con alta exposición al riesgo sistémico; más penalizante para el deudor |

**Sustento:** La **Resolución SUDEBAN sobre Normas para los Usuarios de los Servicios Financieros** establece que la mora debe calcularse sobre la **porción no pagada de la obligación exigible**, lo cual corresponde a la cuota vencida (amortización + intereses). La base "saldo total" es más agresiva y menos habitual, pero está permitida si el contrato la especifica. La base "amortización" es la opción predeterminada y la de mayor aceptación regulatoria.

---

## 8. Clasificación de la cartera de créditos

### 8.1 Fundamento regulatorio

La **Resolución SUDEBAN N° 009.16** (y sus actualizaciones) establece la clasificación obligatoria de la cartera de créditos según el número de días de atraso. Esta clasificación determina las **provisiones** que la institución debe constituir y el tratamiento contable.

### 8.2 Umbrales de clasificación

| Clasificación | Días de mora | Descripción | Provisionamiento mínimo orientativo |
|---|---|---|---|
| **AL DIA** (Vigente) | 0 | Sin atraso o dentro del período de gracia | 1% (provisión genérica) |
| **MORA 1** (Reestructurado) | 1 – 30 | Atraso leve; activo en gestión de cobro | Según política interna |
| **MORA 2** (Vencido) | 31 – 60 | Atraso moderado; alerta temprana | ≥ 20% sobre el saldo vencido |
| **VENCIDO** | 61 – 90 | Atraso significativo; provisión específica | ≥ 50% sobre el saldo vencido |
| **VENCIDO 2 / CASTIGO** | > 90 | Crédito incobrable; se mueve a "Orden de cobro" o se castiga | 100% |

> Los umbrales exactos y los porcentajes de provisión pueden variar según tipo de crédito (consumo, hipotecario, comercial, microcrédito) y deben verificarse contra la resolución vigente de SUDEBAN.

### 8.3 Parámetros configurables en el sistema

Los umbrales `mora1`, `mora2`, `mora3` son configurables para adaptarse a las resoluciones vigentes y al tipo de cartera:

```
mora1 = 30   (días para pasar de AL DIA a MORA 1)
mora2 = 60   (días para pasar a VENCIDO / Orden)
mora3 = 90   (días para CASTIGO)
```

---

## 9. Moratorio 143 y 819 (Plan de Cuentas SUDEBAN)

### 9.1 Contexto

El **Manual de Contabilidad para Instituciones Financieras Bancarias de SUDEBAN** organiza los créditos en dos grandes grupos según su situación:

- **Cartera activa (vigente / mora leve)**: Los intereses y mora se clasifican como "rendimientos por cobrar" en cuentas de activo. Estas cuentas pertenecen al grupo **143** del plan de cuentas.
- **Cartera en orden de cobro / castigo**: Cuando el crédito supera el umbral `mora2`, los intereses y mora se transfieren a cuentas de "rendimientos en litigio u orden de cobro", correspondientes al grupo **819** del plan de cuentas.

### 9.2 Cálculo

```
Si días_mora <= mora2:
    Moratorio_143 = Mora_Bs + Interes_Bs   (intereses + mora en cartera activa)
    Moratorio_819 = 0

Si días_mora > mora2:
    Moratorio_143 = 0
    Moratorio_819 = Mora_Bs + Interes_Bs   (se traslada a cartera en orden)
```

### 9.3 Impacto contable

| Condición | Cuenta de intereses | Cuenta de mora |
|---|---|---|
| Al día / mora leve (≤ mora2) | 143.xx Rendimientos por cobrar | 143.xx Mora por cobrar |
| En orden / castigo (> mora2) | 819.xx Rendimientos en orden de cobro | 819.xx Mora en orden de cobro |

**Sustento:** Esta distinción es obligatoria según el **Manual de Contabilidad de SUDEBAN** para permitir la correcta presentación del estado financiero. Los rendimientos de cartera vencida no pueden aparecer como ingresos realizados mientras no sean cobrados (principio de prudencia / NIC 39 adaptada).

---

## 10. Valorización UVC (componente inflacionario)

### 10.1 Definición

La valorización UVC representa la ganancia (o pérdida) en bolívares que genera el crédito UVC por efecto de la variación del IDI entre la fecha de desembolso y la fecha de vencimiento de cada cuota:

```
Val_UVC_capital = Amort_Bs − Amort_UVC × IDI_desembolso
Val_UVC_rend    = Interes_Bs − Interes_UVC × IDI_desembolso
```

Equivalentemente:

```
Val_UVC_capital = Amort_UVC × (IDI_vencimiento − IDI_desembolso)
Val_UVC_rend    = Interes_UVC × (IDI_vencimiento − IDI_desembolso)  [aprox. IDI al vencimiento]
```

### 10.2 Interpretación

- Si `IDI_vencimiento > IDI_desembolso` (inflación positiva): la valorización es **positiva** — el banco recibe más bolívares por la misma cantidad de UVC, compensando la inflación.
- Si `IDI_vencimiento = IDI_desembolso`: la valorización es cero (no hubo inflación entre desembolso y vencimiento de esa cuota).

### 10.3 Sustento contable

**Sustento:** Según el **Manual de Contabilidad de SUDEBAN**, los créditos en UVC deben reconocer la actualización monetaria como un ingreso separado de los intereses ordinarios. La valorización UVC se registra en las cuentas de **"Actualización de Cartera de Créditos"** del plan de cuentas, distintas de las cuentas de ingresos por intereses. Esto cumple con el principio de separación de resultados financieros establecido en las **NIIF adoptadas por SUDEBAN (NIIF 9 / NIIF 21)** para instrumentos financieros en moneda no corriente.

---

## 11. Prepagos y reconducción del crédito

### 11.1 Dos políticas de reconducción

Cuando el deudor realiza un **pago en exceso** (mayor a la cuota exigible), el sistema aplica el exceso a capital UVC y ofrece dos opciones:

| Política | Descripción | Efecto |
|---|---|---|
| **Reducir plazo** (`reduce_term`) | La cuota UVC se mantiene; se recalcula el número de períodos restantes | El cliente paga la misma cuota pero termina antes |
| **Reducir cuota** (`reduce_installment`) | El plazo se mantiene; se recalcula la cuota UVC sobre el nuevo saldo | La cuota mensual disminuye |

### 11.2 Recálculo de cuota tras prepago

```
Nueva_Cuota_UVC = Nuevo_Saldo_UVC × [ i / (1 − (1 + i)^(−n_restante)) ]
```

**Sustento:** La **LISB, art. 49** establece el derecho del deudor a realizar pagos anticipados sin penalización en créditos de consumo. SUDEBAN, a través de sus Normas para los Usuarios de los Servicios Financieros, exige que la institución explique al cliente el efecto del prepago (si reduce plazo o cuota) antes de aplicarlo. Ambas políticas son regulatoriamente válidas; la selección debe estar especificada en el contrato.

---

## 12. Asientos contables

### 12.1 Plan de cuentas utilizado

Los códigos corresponden al **Manual de Contabilidad para Instituciones Financieras Bancarias de SUDEBAN**:

| Cuenta | Código orientativo | Nombre |
|---|---|---|
| Banco (activo líquido) | 1110 | Efectivo y equivalentes / Banco |
| Cartera de créditos | 1310 | Cartera de créditos vigente |
| Intereses por cobrar | 1340 | Rendimientos por cobrar en cartera vigente |
| Mora por cobrar | 1350 | Mora por cobrar en cartera vigente |
| Ingresos por intereses | 4120 | Ingresos por intereses de cartera |
| Ingresos por mora | 4130 | Ingresos por mora de cartera |
| Comisión desembolso | 2160 / 4210 | Descuento / Comisión por desembolso |

> Los códigos exactos varían según la versión del Manual de Contabilidad vigente. Verificar con SUDEBAN antes de implementar.

### 12.2 Asiento de desembolso

| Debe | Haber | Descripción |
|---|---|---|
| 1310 Cartera de créditos | | Monto desembolsado en Bs |
| | 1110 Banco | Efectivo entregado al cliente |
| | 2160 Descuento desembolso | Comisión retenida (si aplica) |

### 12.3 Asiento de devengo de intereses (cada período)

| Debe | Haber |
|---|---|
| 1340 Intereses por cobrar | |
| | 4120 Ingresos por intereses |

### 12.4 Asiento de devengo de mora (si aplica)

| Debe | Haber |
|---|---|
| 1350 Mora por cobrar | |
| | 4130 Ingresos por mora |

### 12.5 Asiento de cobro de cuota

| Debe | Haber |
|---|---|
| 1110 Banco | |
| | 1310 Cartera de créditos (capital) |
| | 1340 Intereses por cobrar |
| | 1350 Mora por cobrar (si aplica) |

---

## 13. Ajuste a días hábiles

### 13.1 Regla

Cuando la fecha de vencimiento de una cuota cae en día no hábil (fin de semana o feriado), se mueve al **siguiente día hábil**. Esto afecta:
- El cálculo de días del período (puede tener más de 30 días en la convención 30/360 si hay ajuste)
- El IDI aplicado (se usa el IDI del día hábil ajustado)

### 13.2 Lista de feriados

El sistema acepta una lista de feriados configurables en formato `YYYY-MM-DD`. Se recomienda mantenerla actualizada con el **Calendario de Días No Hábiles Bancarios** publicado anualmente por el BCV y SUDEBAN.

**Sustento:** La **Ley del BCV** y las resoluciones operativas de SUDEBAN establecen el calendario de días hábiles bancarios. Los contratos de crédito que especifiquen fechas de pago deben respetar este calendario, siendo el siguiente día hábil el estándar de mercado en caso de coincidencia con día no hábil.

---

## 14. Parámetros configurables y sus límites regulatorios

| Parámetro | Descripción | Restricción regulatoria |
|---|---|---|
| `principal` | Capital desembolsado en Bs | Sin límite técnico; el monto máximo depende del tipo de crédito y la capacidad de pago del cliente (normativa SUDEBAN de riesgo crediticio) |
| `annualRate` | Tasa de interés anual (%) | El BCV fija periódicamente tasas máximas por tipo de crédito. Para créditos hipotecarios, agrícolas y de manufactura existen tasas preferenciales mandatorias |
| `termMonths` | Plazo en meses | Variable por tipo de crédito. SUDEBAN establece plazos máximos orientativos por sector |
| `moraRate` | Tasa de mora anual (%) | El BCV publica límites máximos de mora. Como referencia histórica, se ha situado entre 1× y 3× la tasa activa aplicada |
| `graceDays` | Días de gracia sin mora | Definido contractualmente. SUDEBAN no impone un mínimo pero las Normas de Protección al Usuario recomiendan su divulgación |
| `dayCount` | Convención de días (30/360 o Actual/365) | Definido contractualmente; debe especificarse en el contrato y divulgarse al cliente |
| `creditUvc` | Activar denominación en UVC | Obligatorio para créditos clasificados por el BCV como "créditos en UVC". Opcional para créditos ordinarios en bolívares |
| `interestValuation` | IDI al vencimiento o IDI diario | No hay mandato expreso; IDI diario es más preciso contablemente y recomendado para auditorías |
| `mora1 / mora2 / mora3` | Umbrales de clasificación (días) | Deben alinearse con la Resolución SUDEBAN de clasificación de cartera vigente |

---

## Glosario

| Término | Definición |
|---|---|
| **UVC** | Unidad de Valor Constante. Unidad de cuenta emitida por el BCV para créditos ajustados por inflación |
| **IDI** | Índice de Actualización. Factor publicado diariamente por el BCV que expresa el valor en Bs de una UVC |
| **Amortización** | Abono al capital del crédito en cada cuota |
| **Cuota** | Pago periódico que incluye intereses + amortización de capital |
| **Mora** | Interés punitorio por atraso en el pago de la cuota |
| **Valorización UVC** | Ganancia en Bs generada por la apreciación del IDI entre el desembolso y el vencimiento de la cuota |
| **Cartera activa** | Créditos con atraso ≤ mora2 días, clasificados en cuentas grupo 143 |
| **Cartera en orden** | Créditos con atraso > mora2 días, clasificados en cuentas grupo 819 |
| **TIR** | Tasa Interna de Retorno. Indicador del rendimiento efectivo real del crédito para la institución |
| **SUDEBAN** | Superintendencia de las Instituciones del Sector Bancario de Venezuela |
| **BCV** | Banco Central de Venezuela |
| **LISB** | Ley de Instituciones del Sector Bancario |

---

*Documento generado para uso interno. Verificar vigencia de todas las resoluciones citadas con las versiones publicadas en los portales oficiales del BCV y SUDEBAN antes de implementar en producción.*
