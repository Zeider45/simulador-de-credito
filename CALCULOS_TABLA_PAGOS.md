# Guia funcional y regulatoria de la tabla de pagos

Este documento describe como funciona el credito y como se reflejan los eventos de mora y clasificacion contable, basado en la informacion suministrada sobre SUDEBAN y el Manual de Contabilidad para Instituciones Bancarias.

## 1) Alcance y enfoque

- Explica la logica financiera del credito (cuota, interes, amortizacion, saldo).
- Detalla por que existe mora y como se calcula.
- Describe el criterio de devengo y el uso de cuentas de orden.
- Relaciona la clasificacion contable con los codigos 143 y 813.

## 2) Marco contable SUDEBAN (resumen funcional)

En el sistema bancario venezolano, la cartera de creditos se clasifica para reflejar el riesgo y el grado de recuperacion esperada. Esta clasificacion impacta el reconocimiento de ingresos y la forma en que se reportan los intereses.

### Codigo 143 (Activo - Cartera de Creditos Reestructurada)

- Se usa para creditos cuyas condiciones fueron modificadas (plazo, tasa o cuota) por dificultades del deudor.
- Se mantiene vigilancia especial y, si hay atraso, se mueve a subcuentas de mora mas criticas.
- Actua como disparador de provisiones y clasificacion de riesgo.

### Codigo 813 (Cuentas de Orden - Intereses y Comisiones por Cobrar)

- Registra intereses y comisiones de cartera vencida, en mora o en litigio.
- Se usa fuera de balance para controlar la deuda total sin inflar ingresos.
- Solo se reconoce ingreso cuando el cliente paga efectivamente.

> Nota: En la practica suele usarse una cuenta contra (por ejemplo, 899) para el asiento de orden.

## 3) Cronometro de mora (DPD)

La mora comienza el **primer dia de atraso** despues del vencimiento pactado. Dos procesos ocurren en paralelo:

1) **Mora financiera (interes de demora)**: se calcula desde el dia 1.
2) **Suspension de devengo**: a partir de un umbral (por ejemplo 30 dias en cartera comercial) se dejan de reconocer intereses corrientes como ingreso y se trasladan a cuentas de orden.

Plazos comunes (referenciales):

- Comercial / Microcreditos: suspension desde 30 dias de atraso.
- Hipotecarios: suspension desde 90 dias.
- Agricola: plazos variables segun el ciclo, pero mora estricta desde el vencimiento.

## 4) Por que existe esta separacion

- **Principio de prudencia:** evita reconocer ingresos no cobrados, protegiendo la solvencia.
- **Clasificacion de riesgo:** obliga a provisiones a medida que la mora envejece.
- **Presion al deudor:** la mora activa mecanismos como SICRI, limitando acceso a nuevo credito.

## 5) Interes moratorio (sin anatocismo)

La mora se calcula **solo sobre el capital vencido**, nunca sobre intereses acumulados ni sobre cuotas futuras. Se aplica base comercial de 360 dias.

$$
I_m = \frac{C_v \cdot i_p \cdot t}{360}
$$

Donde:

- $I_m$: interes moratorio.
- $C_v$: capital vencido.
- $i_p$: tasa penal anual.
- $t$: dias de atraso (DPD).

## 6) Orden de imputacion de pagos (criterio legal)

Cuando se recibe un pago en mora, se aplica en este orden:

1) Gastos de cobranza (si existen).
2) Intereses moratorios (cuentas de orden 813).
3) Intereses corrientes vencidos.
4) Capital vencido.
5) Capital vigente.

Este orden evita que el capital se reduzca sin cubrir primero los costos del atraso.

## 7) Regla de tope de tasa

La tasa penal no puede hacer que la suma de tasa ordinaria + mora supere los limites del BCV para ese producto. Esto se valida para evitar excesos regulatorios.

## 8) Como se refleja en la tabla de pagos

- **Mora Bs**: penalidad calculada con la formula de mora.
- **Rendimientos vigentes (activo)**: se muestran cuando la mora esta **dentro del umbral**.
- **Rendimientos en orden (813)**: se muestran cuando la mora **supera el umbral**.
- **Moratorio 143 (vigente)**: mora clasificada como vigente.
- **Moratorio 813 (orden)**: mora clasificada como en orden.

## 9) Ejemplo base solicitado

Supuestos:

- Desembolso: 160000 Bs
- IDI desembolso: 0.98495915
- Fecha de desembolso: 11/14/2025
- Plazo: 12 meses
- Tasa anual: 16% (referencial)
- Cuota 1 vence: 12/14/2025
- Capital vencido de la cuota 1 (ejemplo): 13192.29 Bs

> Este capital vencido representa la porcion de capital de la cuota, no el saldo total.

## 10) Ejemplo A: mora dentro del umbral (activo)

Suponga:

- DPD = 10 dias
- Umbral de suspension = 30 dias
- Tasa penal anual $i_p = 0.19$ (ejemplo)

Interes moratorio:

$$
I_m = \frac{13192.29 \cdot 0.19 \cdot 10}{360} \approx 69.62\ \text{Bs}
$$

Clasificacion:

- Rend conv act: intereses corrientes del periodo.
- Rend mora act: 69.62 Bs.
- Rend conv ord: 0
- Rend mora ord: 0
- Moratorio 143: 69.62 Bs
- Moratorio 813: 0

Interpretacion: la mora existe, pero aun se considera vigente porque no supera el umbral.

## 11) Ejemplo B: mora supera el umbral (orden)

Suponga:

- DPD = 75 dias
- Umbral de suspension = 30 dias
- Tasa penal anual $i_p = 0.19$ (ejemplo)

Interes moratorio:

$$
I_m = \frac{13192.29 \cdot 0.19 \cdot 75}{360} \approx 522.17\ \text{Bs}
$$

Clasificacion:

- Rend conv act: 0
- Rend mora act: 0
- Rend conv ord: intereses corrientes acumulados pasan a 813
- Rend mora ord: 522.17 Bs
- Moratorio 143: 0
- Moratorio 813: 522.17 Bs

Interpretacion: al superar el umbral, los intereses dejan de reconocerse como ingreso y se registran en cuentas de orden para control, sin afectar resultados.

## 12) Consideraciones finales

- El umbral exacto depende del tipo de cartera y normativa vigente.
- La mora inicia desde el primer dia de atraso, pero la suspension de devengo es un evento posterior.
- La clasificacion 143/813 refleja prudencia contable y control de riesgo.
