Programar actualización diaria del IDI

Se añadieron dos scripts:

- `npm run scrape:idi` — scrapea todo el histórico y guarda `src/lib/idi_series_bcv_full.csv` y `data/idi_series.db`.
- `npm run update:idi` — obtiene la última fila publicada en la página del BCV y la inserta/upserta en `data/idi_series.db`.

Linux / macOS (crontab):

1. Abre tu crontab: `crontab -e`
2. Añade la línea para ejecutar a las 02:05 cada día:

```cron
5 2 * * * cd /path/to/simulador-credito && /usr/bin/npm run update:idi >> /path/to/simulador-credito/logs/update_idi.log 2>&1
```

Windows (Tareas Programadas):

- Crea una nueva tarea que ejecute `npm` con argumentos `run update:idi` en el directorio del proyecto. Programa la tarea diaria a la hora deseada.

Notas de seguridad:

- El script usa un agente HTTPS con `rejectUnauthorized: false` para evitar errores de certificado en entornos sin la CA del BCV instalada. Para producción, ajusta el agente para validar certificados correctamente.

Integración con la app:

- La API `GET /api/idi/list` expone las filas del DB para que la UI cargue la lista.
- El endpoint `/api/simulate` ahora inyecta la serie completa desde la base de datos en la petición de simulación.
