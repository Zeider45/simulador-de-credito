# Simulador de Credito Venezolano

Simulador en Next.js con backend para calcular cuotas UVC/IDI, mora diaria, pagos y asientos contables.

## Requisitos

- Node.js 18+
- Serie IDI en formato CSV (YYYY-MM-DD,IDI)

## Uso local

```bash
npm install
npm run dev
```

Abre el navegador en el puerto 3000 para usar el simulador.

## Ejemplo de prepago

Incluye un ejemplo en [examples/prepay_input.json](examples/prepay_input.json) y un script para comparar el calendario antes/despues:

```bash
node scripts/example_prepay.js
```

El script imprime un resumen con la longitud del calendario y una muestra de cuotas.

## Caracteristicas

- Sistema frances con cuota fija en UVC.
- Indexacion por IDI (diaria o al vencimiento).
- Mora diaria con base configurable.
- Pagos editables por cuota.
- Generacion de asientos contables con plan de cuentas configurable.

## API

La ruta POST `/api/simulate` recibe los parametros del formulario y devuelve:

- `summary`: resumen de neto, interes, mora y TIR.
- `schedule`: tabla de cuotas con valores y tooltips.
- `ledger`: asientos contables.

La UI ya consume esta ruta automaticamente.
