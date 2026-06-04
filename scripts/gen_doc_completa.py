#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera una documentacion Word COMPLETA y detallada del funcionamiento de los
creditos del proyecto: formulas, asientos contables, clasificacion, condiciones y
situaciones operativas. Pensada para lectura simple (negocio, contabilidad, desarrollo).

Fundamento: src/lib/simulator.js, src/lib/regulatory.js, src/lib/loanStorage.js,
docs/documentacion-tecnica.md, CALCULOS_TABLA_PAGOS.md y la carpeta documentacion/.
"""
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = "/home/user/simulador-de-credito/docs/Documentacion-Completa-Creditos.docx"

# ---- Paleta de colores ----
AZUL   = RGBColor(0x1F, 0x3A, 0x5F)
AZUL2  = RGBColor(0x2E, 0x5A, 0x88)
GRIS   = RGBColor(0x55, 0x55, 0x55)
VERDE  = RGBColor(0x1B, 0x5E, 0x20)
NARANJA= RGBColor(0x9A, 0x52, 0x00)
MORADO = RGBColor(0x4A, 0x14, 0x8C)
ROJO   = RGBColor(0x8E, 0x1B, 0x1B)
BLANCO = RGBColor(0xFF, 0xFF, 0xFF)

doc = Document()

# Estilo base legible
normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15

# Margenes algo mas anchos para lectura
for section in doc.sections:
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)

# ---------------------------------------------------------------- helpers
def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement('w:shd'); sh.set(qn('w:val'), 'clear'); sh.set(qn('w:fill'), hexcolor)
    tcPr.append(sh)

def heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for r in h.runs:
        r.font.color.rgb = AZUL if level == 1 else AZUL2
    return h

def para(text, bullet=False, num=False):
    style = None
    if bullet:
        style = "List Bullet"
    elif num:
        style = "List Number"
    return doc.add_paragraph(text, style=style)

def bold_lead(lead, rest=""):
    p = doc.add_paragraph()
    r = p.add_run(lead)
    r.bold = True
    if rest:
        p.add_run(rest)
    return p

def formula(lines):
    """Bloque monoespaciado para formulas."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run("\n".join(lines))
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = MORADO
    return p

def callout(title, text, color=AZUL, fill="EAF1F8"):
    """Caja resaltada (nota / importante / ejemplo)."""
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = t.rows[0].cells[0]
    shade(cell, fill)
    cell.width = Inches(6.5)
    p = cell.paragraphs[0]
    r = p.add_run(title + "  ")
    r.bold = True; r.font.size = Pt(10); r.font.color.rgb = color
    r2 = p.add_run(text)
    r2.font.size = Pt(10)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def table(headers, rows, widths=None, fontsize=9.5):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ""
        run = hdr[i].paragraphs[0].add_run(h)
        run.bold = True; run.font.size = Pt(fontsize); run.font.color.rgb = BLANCO
        shade(hdr[i], "1F3A5F")
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            run = cells[i].paragraphs[0].add_run(str(val))
            run.font.size = Pt(fontsize)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t

def ledger_table(title, rows):
    """Tabla de asiento contable: Cuenta | Debe | Haber."""
    bold_lead(title)
    table(["Cuenta contable", "Debe", "Haber"], rows, widths=[4.2, 1.15, 1.15])

# ================================================================ PORTADA
t = doc.add_paragraph(); t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t.add_run("Manual de Funcionamiento de los Creditos")
r.bold = True; r.font.size = Pt(24); r.font.color.rgb = AZUL
t2 = doc.add_paragraph(); t2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t2.add_run("Creditos comerciales expresados en Unidad de Valor de Credito (UVC)")
r.font.size = Pt(13); r.font.color.rgb = AZUL2

sub = doc.add_paragraph(); sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
rs = sub.add_run("Formulas de calculo  ·  Desglose de la cuota  ·  Mora  ·  Clasificacion de cartera\n"
                 "Asientos contables  ·  Cancelacion anticipada  ·  Situaciones operativas")
rs.font.size = Pt(11); rs.font.color.rgb = GRIS

doc.add_paragraph()
d = doc.add_paragraph(); d.alignment = WD_ALIGN_PARAGRAPH.CENTER
rd = d.add_run("Documentacion tecnica y funcional del Simulador de Credito\nVersion 1.0")
rd.font.size = Pt(10); rd.font.color.rgb = GRIS

doc.add_paragraph()
callout("Para quien es este documento:",
        "negocio, contabilidad, auditoria y desarrollo. Explica de la forma mas simple posible "
        "como debe funcionar un credito de principio a fin: desde el desembolso hasta el ultimo "
        "pago, pasando por la mora, la clasificacion de riesgo y los asientos contables. Cada "
        "numero del simulador puede rastrearse hasta su formula y su fundamento.",
        color=VERDE, fill="EAF6EC")

# ---- Como leer ----
heading("Como leer este documento", 2)
para("Todas las formulas se muestran en bloques de color morado y con tipografia monoespaciada. "
     "Los terminos clave (UVC, IDI, mora, etc.) se definen en el Glosario al final. "
     "Donde es util, se incluye un ejemplo numerico resaltado en una caja de color.")
para("Las cifras de los ejemplos toman como base el caso por defecto del simulador (la tabla de "
     "amortizacion de referencia): capital 160.000 Bs, IDI de desembolso 0,98495915, plazo 12 meses, "
     "tasa 16% anual y mora 3% anual.")

doc.add_page_break()

# ================================================================ INDICE (manual)
heading("Contenido", 1)
indice = [
    "1. Que es un credito UVC (en palabras simples)",
    "2. Marco regulatorio de referencia",
    "3. Unidad de Valor de Credito (UVC) e Indice de Inversion (IDI)",
    "4. El Indice de Inversion dia a dia: como se resuelve cada fecha",
    "5. Parametros que definen un credito",
    "6. Sistema de amortizacion frances (cuota fija en UVC)",
    "7. Base de dias (30/360 y actual/365)",
    "8. Valoracion de intereses: IDI al vencimiento vs. IDI diario",
    "9. Desglose de la cuota en bolivares (base, variacion y valorizacion UVC)",
    "10. Saldo del credito",
    "11. Mora: cuando, cuanto y sobre que se cobra",
    "12. Orden de imputacion de los pagos",
    "13. Clasificacion de la cartera de creditos",
    "14. Cartera activa (143) y cuentas de orden (819)",
    "15. Congelamiento del credito vencido",
    "16. Cancelacion anticipada y prepagos",
    "17. Asientos contables (paso a paso)",
    "18. Plan de cuentas SUDEBAN utilizado",
    "19. Ajuste a dias habiles y feriados",
    "20. Comision flat y cumplimiento regulatorio",
    "21. Tasa Interna de Retorno (TIR)",
    "22. Modo libre vs. modo simulacion",
    "23. Catalogo de situaciones y escenarios",
    "24. Resumen de todas las formulas (hoja de referencia)",
    "25. Glosario",
]
for it in indice:
    p = doc.add_paragraph(it)
    p.paragraph_format.space_after = Pt(2)

doc.add_page_break()

# ================================================================ 1
heading("1. Que es un credito UVC (en palabras simples)", 1)
para("Un credito UVC es un prestamo en bolivares cuyo valor se 'guarda' en una unidad estable "
     "llamada Unidad de Valor de Credito (UVC), para que la inflacion no licue el capital prestado. "
     "Funciona en tres pasos:")
para("Al desembolsar, el monto en bolivares se convierte a UVC usando el Indice de Inversion (IDI) "
     "del dia. Esa cantidad de UVC es la deuda 'real'.", num=True)
para("Durante la vida del credito, la deuda se lleva en UVC: los intereses, la amortizacion y el "
     "saldo se calculan en UVC con una cuota fija (sistema frances).", num=True)
para("Cada vez que hay que cobrar o contabilizar, las UVC se vuelven a expresar en bolivares "
     "multiplicando por el IDI de esa fecha. Como el IDI sube con la inflacion, el banco recupera "
     "el poder adquisitivo y el cliente paga el valor real.", num=True)
callout("En una frase:",
        "el credito 'vive' en UVC (valor estable) y solo se 'traduce' a bolivares en el momento de "
        "pagar o contabilizar, usando el IDI de cada fecha.")
para("Si el credito NO es UVC (parametro creditUvc desactivado), todo el calculo se hace "
     "directamente en bolivares: el IDI se trata como 1 y desaparecen los componentes de "
     "actualizacion. El resto del modelo (cuota francesa, mora, clasificacion, asientos) es igual.")

# ================================================================ 2
heading("2. Marco regulatorio de referencia", 1)
para("El modelo implementa la normativa venezolana sobre creditos comerciales en UVC. Los "
     "instrumentos principales son:")
table(
    ["Instrumento", "Fecha / Gaceta", "Que aporta al modelo"],
    [
        ["Resolucion BCV N° 19-09-01", "G.O. 41.742 - 21/10/2019",
         "Crea la obligacion de expresar los creditos comerciales en UVC y dividir el monto en Bs entre el IDI del otorgamiento."],
        ["Aviso Oficial BCV", "G.O. 41.742 - 21/10/2019",
         "Comision flat maxima de 0,50% del monto del credito."],
        ["Circular de entrada en vigencia (BCV)", "24/10/2019",
         "Aplica la Resolucion 19-09-01 desde el 28/10/2019."],
        ["Circular SUDEBAN SIB-DSB-CJ-OD-13083", "14/11/2019",
         "Clausulas minimas del contrato: amortizacion de capital en UVC, cancelacion anticipada con piso de IDI, % de mora."],
        ["Modif. Manual de Contabilidad (SIB-II-GGR-GNP-12161)", "28/10/2019",
         "Crea las subcuentas 131.35, 131.36, 358.01, 513.01.M.35 y 513.01.M.36."],
        ["Minuta SUDEBAN / BCV / ABV", "17/12/2019",
         "Tratamiento del credito vencido: congelamiento y registro en cuentas de orden / patrimonio (358.00)."],
        ["Resolucion BCV N° 21-01-02 (VIGENTE)", "G.O. 42.050 - 19/01/2021",
         "Norma actual: define UVC, IDI, tasas 4%-10% (2% Cartera Productiva), mora maxima 0,80%, piso de IDI en cancelacion anticipada."],
    ],
    widths=[2.4, 1.6, 2.7],
)
callout("Nota de vigencia:",
        "las resoluciones se actualizan con frecuencia. Antes de usar en produccion, verifique las "
        "versiones vigentes en bcv.org.ve y sudeban.gob.ve.", color=NARANJA, fill="FCF3E7")

# ================================================================ 3
heading("3. Unidad de Valor de Credito (UVC) e Indice de Inversion (IDI)", 1)
para("La UVC es una unidad de cuenta creada por el BCV para preservar el valor real del credito. "
     "El IDI (Indice de Inversion) es un factor que el BCV publica diariamente y que indica "
     "cuantos bolivares vale una UVC en una fecha determinada. Refleja la variacion del tipo de "
     "cambio de referencia de mercado.")

heading("3.1 Conversion del capital al desembolsar", 2)
para("El monto entregado en bolivares se convierte a UVC con el IDI del dia del desembolso. Ese "
     "IDI de otorgamiento queda fijo para toda la vida del credito (es la referencia 'base').")
formula(["Capital_UVC = Capital_Bs / IDI_desembolso"])
callout("Ejemplo:", "160.000 Bs / 0,98495915 = 162.443,29 UVC.  Esa es la deuda real del cliente.")

heading("3.2 Conversion de UVC a bolivares en cualquier fecha", 2)
formula(["Monto_Bs = Monto_UVC x IDI_fecha"])
para("Esta es la regla que se usa para expresar en bolivares la cuota, los intereses, la "
     "amortizacion y el saldo en cualquier momento.")

# ================================================================ 4
heading("4. El Indice de Inversion dia a dia: como se resuelve cada fecha", 1)
para("El BCV no publica IDI todos los dias (no hay fines de semana ni feriados). El sistema "
     "(funcion createIdiResolver) resuelve el IDI de cualquier fecha asi:")
table(
    ["Situacion de la fecha", "Que IDI se usa"],
    [
        ["Hay dato publicado para esa fecha", "Se usa el valor exacto del BCV."],
        ["Fin de semana (sabado/domingo)", "Se usa el IDI del ultimo dia habil previo (el IDI no cambia en fin de semana)."],
        ["Fecha pasada o de hoy sin dato exacto", "Se arrastra el ultimo IDI conocido (o se interpola, segun el parametro idiMissing)."],
        ["Fecha futura (posterior a hoy)", "Se extrapola: ultimo IDI + (paso diario idiFutureStep x dias futuros)."],
        ["Antes del primer dato de la serie", "Se usa el primer IDI disponible."],
        ["No hay serie cargada", "Se usa el IDI por defecto (parametro idi)."],
    ],
    widths=[3.1, 3.6],
)
para("Cada fila del calendario marca el origen del IDI ('BCV' cuando deriva de un dato real hasta "
     "hoy, o 'invented' cuando es una extrapolacion futura), util para auditoria.")
callout("Por que importa:",
        "el IDI elegido para cada fecha afecta directamente los bolivares de intereses, "
        "amortizacion, mora y saldo. Por eso el origen del dato (real vs. estimado) se hace visible.")

# ================================================================ 5
heading("5. Parametros que definen un credito", 1)
para("Un credito se configura con los siguientes parametros (los valores por defecto reproducen "
     "la tabla de amortizacion de referencia):")
table(
    ["Parametro", "Que significa", "Valor por defecto"],
    [
        ["principal", "Capital desembolsado en bolivares", "160.000"],
        ["annualRate", "Tasa de interes anual (%)", "16"],
        ["termMonths", "Plazo en meses (numero de cuotas)", "12"],
        ["disbursementDate", "Fecha de desembolso", "2025-10-16"],
        ["firstDueDate", "Fecha de vencimiento de la 1a cuota", "2025-11-14"],
        ["idi", "IDI del dia de desembolso (referencia base)", "0,98495915"],
        ["disbursementFeeRate", "Comision flat de desembolso (%)", "0,50"],
        ["dayCount", "Convencion de dias: 30/360 o actual/365", "30/360"],
        ["interestValuation", "Valoracion del interes: idi_due o idi_daily", "idi_daily"],
        ["idiMissing", "Relleno de IDI faltante: linear o carry", "linear"],
        ["idiFutureStep", "Incremento diario del IDI para fechas futuras", "0,01"],
        ["moraRate", "Tasa de mora anual (%)", "3"],
        ["graceDays", "Dias de gracia antes de generar mora", "0"],
        ["moraBase", "Base de la mora: amort (cuota de capital) o saldo", "amort"],
        ["mora1 / mora2 / mora3", "Umbrales de clasificacion (dias)", "30 / 60 / 90"],
        ["creditUvc", "Activa la denominacion en UVC", "true"],
        ["idiFloorOnPrepay", "Piso de IDI en cancelacion anticipada", "true"],
        ["allowHistoricalRates", "Modo referencia: admite tasas historicas sin bloquear", "true"],
        ["applyPrepay", "Aplica el exceso de pago a capital (prepago)", "true"],
        ["recomputeAfterPrepay", "Reconduce el calendario tras un prepago", "true"],
        ["prepayAction", "Politica de prepago: reduce_term o reduce_installment", "reduce_term"],
        ["adjustToBusinessDay", "Mueve vencimientos a dia habil siguiente", "true"],
        ["holidays", "Lista de feriados (YYYY-MM-DD)", "[ ]"],
        ["paymentMode", "libre (pagos reales) o simulacion (con 'hoy' simulado)", "libre"],
    ],
    widths=[1.9, 3.5, 1.3], fontsize=9,
)

# ================================================================ 6
heading("6. Sistema de amortizacion frances (cuota fija en UVC)", 1)
para("La norma exige que cada cuota incluya intereses y una porcion de amortizacion de capital "
     "expresada en UVC. El sistema usa amortizacion francesa: la cuota en UVC es fija durante todo "
     "el plazo. Es el metodo mas transparente porque el cliente conoce su cuota desde el inicio.")

heading("6.1 Formula de la cuota fija", 2)
formula([
    "i = tasa_anual / 12                          (tasa mensual)",
    "Cuota_UVC = Capital_UVC x [ i / (1 - (1 + i)^(-n)) ]",
    "   n = numero de cuotas (meses)",
])
bold_lead("Caso especial - tasa cero: ", "si la tasa es 0, la cuota es simplemente el capital "
          "dividido entre el numero de cuotas:")
formula(["Cuota_UVC = Capital_UVC / n"])

heading("6.2 Descomposicion de cada cuota", 2)
para("En cada periodo se calcula primero el interes y luego la amortizacion es el resto de la cuota:")
formula([
    "tasa_periodo = tasa_anual x (dias_periodo / base_dias)",
    "Interes_UVC  = Saldo_UVC_inicial x tasa_periodo",
    "Amort_UVC    = Cuota_UVC - Interes_UVC",
    "Saldo_UVC_fin = Saldo_UVC_inicial - Amort_UVC",
])
para("Propiedad garantizada del metodo frances: la amortizacion crece y el interes decrece cada "
     "periodo, de modo que el saldo en UVC llega a cero en la ultima cuota.")

heading("6.3 La ultima cuota cierra el saldo", 2)
para("En el ultimo periodo, la amortizacion se fuerza a igualar exactamente el saldo pendiente y "
     "la cuota se recalcula como interes + ese saldo. Asi se evita que queden centimos de UVC sin "
     "amortizar por redondeo.")
formula([
    "Amort_UVC(ultima)  = Saldo_UVC_inicial",
    "Cuota_UVC(ultima)  = Interes_UVC + Saldo_UVC_inicial",
])
callout("Regla de seguridad:", "si por algun calculo la amortizacion diera negativa, se fija en 0 "
        "(la cuota nunca aumenta el capital: no hay anatocismo).")

# ================================================================ 7
heading("7. Base de dias (30/360 y actual/365)", 1)
para("La 'base de dias' define como se cuentan los dias de cada periodo y el denominador anual. "
     "Afecta el interes y la mora.")
table(
    ["Convencion", "Como cuenta los dias", "Base anual", "Uso tipico"],
    [
        ["30/360", "Cada mes = 30 dias; ano = 360", "360", "Hipotecario, comercial estructurado (predominante en banca venezolana)"],
        ["Actual/365", "Dias calendario reales", "365", "Consumo, microcredito, productos a tasa de mercado"],
    ],
    widths=[1.3, 2.6, 1.0, 1.8],
)
formula(["tasa_periodo = tasa_anual x (dias_periodo / base_dias)"])

# ================================================================ 8
heading("8. Valoracion de intereses: IDI al vencimiento vs. IDI diario", 1)
para("Los intereses se acumulan en UVC, pero hay que expresarlos en bolivares. La pregunta es: "
     "que IDI se usa para esa conversion. Hay dos modalidades.")

heading("8.1 IDI al vencimiento (idi_due)", 2)
para("Sencillo: convierte todo el interes del periodo con el IDI del dia de vencimiento.")
formula(["Interes_Bs = Interes_UVC x IDI_vencimiento"])

heading("8.2 IDI diario (idi_daily) - recomendado", 2)
para("Mas preciso: reparte el interes dia a dia y cada porcion se convierte con el IDI de su propio "
     "dia. Es el criterio de devengo diario que usan los modelos contables.")
formula([
    "Interes_UVC_dia = Saldo_UVC_inicial x (tasa_anual / base_dias)",
    "Interes_Bs = SUMA sobre cada dia t del periodo de [ Interes_UVC_dia x IDI(t) ]",
    "",
    "Forma equivalente usada en el codigo:",
    "Interes_Bs = Interes_UVC x ( Suma_IDI_del_periodo / dias_periodo )",
])
callout("Cual usar:", "el IDI diario es el mas defendible ante una auditoria y el que mejor refleja "
        "la inflacion del periodo. El IDI al vencimiento es una simplificacion aceptable para "
        "presentaciones administrativas.")

# ================================================================ 9
heading("9. Desglose de la cuota en bolivares (base, variacion y valorizacion UVC)", 1)
para("Cada cuota en bolivares tiene dos partes: intereses y amortizacion. A su vez, cada una de "
     "esas partes se separa en un 'componente base' (valor al IDI de desembolso) y un 'componente "
     "de variacion' (la actualizacion por inflacion entre el desembolso y el vencimiento).")

heading("9.1 Componentes de la cuota", 2)
formula([
    "Amort_Bs  = Amort_UVC  x IDI_vencimiento",
    "Cuota_Bs  = Interes_Bs + Amort_Bs",
    "Saldo_Bs  = Saldo_UVC_fin x IDI_vencimiento",
])

heading("9.2 Componente base vs. componente de variacion", 2)
formula([
    "Componente_base_Bs      = Monto_UVC x IDI_desembolso",
    "Componente_variacion_Bs = Monto_UVC x (IDI_vencimiento - IDI_desembolso)",
    "                        = Monto_Bs - Componente_base_Bs",
])
para("Esto se calcula por separado para la amortizacion y para el interes (amortBaseBs / amortVarBs, "
     "interesBaseBs / interesVarBs). Permite reportar la utilidad financiera ordinaria por separado "
     "de la utilidad por actualizacion monetaria, y alimenta los asientos contables (cuentas .M.35 "
     "vs .M.36).")

heading("9.3 Valorizacion UVC", 2)
para("La valorizacion UVC es la ganancia en bolivares que produce la inflacion (subida del IDI) "
     "entre el desembolso y el vencimiento de cada cuota:")
formula([
    "Val_UVC_capital = Amort_Bs   - Amort_UVC   x IDI_desembolso",
    "Val_UVC_rend    = Interes_Bs - Interes_UVC x IDI_desembolso",
])
table(
    ["Situacion del IDI", "Resultado de la valorizacion"],
    [
        ["IDI_vencimiento > IDI_desembolso (inflacion)", "Valorizacion positiva: el banco recibe mas Bs por la misma UVC."],
        ["IDI_vencimiento = IDI_desembolso", "Valorizacion cero: no hubo cambio de valor."],
        ["IDI_vencimiento < IDI_desembolso (deflacion del IDI)", "Valorizacion negativa: se reversa contablemente."],
    ],
    widths=[3.0, 3.7],
)

# ================================================================ 10
heading("10. Saldo del credito", 1)
para("El saldo se lleva en UVC y se expresa en bolivares cuando se necesita:")
formula([
    "Saldo_UVC_fin = Saldo_UVC_inicial - capital_amortizado_UVC",
    "Saldo_Bs      = Saldo_UVC_fin x IDI_vencimiento",
])
para("Importante: el avance del saldo depende de si hubo pago registrado.")
para("Si hay un pago valido registrado, el saldo baja por el capital realmente pagado (en UVC), "
     "lo que captura pagos parciales y prepagos.", bullet=True)
para("Si todavia no hay pago, el saldo baja por la amortizacion programada, para que el calendario "
     "muestre el comportamiento normal del metodo frances aun antes de cobrar.", bullet=True)

# ================================================================ 11
heading("11. Mora: cuando, cuanto y sobre que se cobra", 1)
heading("11.1 Dias de mora", 2)
para("La mora empieza el primer dia de atraso despues del vencimiento, descontando los dias de "
     "gracia configurados.")
formula(["Dias_mora = max(0, dias_entre(vencimiento, fecha_pago) - dias_gracia)"])

heading("11.2 Formula de la mora", 2)
para("La mora se calcula solo sobre el capital vencido (sin anatocismo: nunca sobre intereses ni "
     "sobre cuotas futuras). La base puede ser la cuota de capital o el saldo total:")
formula([
    "Base_mora_UVC = Amort_UVC   (si moraBase = 'amort')   -> opcion por defecto",
    "Base_mora_UVC = Saldo_UVC   (si moraBase = 'saldo')",
    "",
    "Mora_UVC = Base_mora_UVC x tasa_mora x (Dias_mora / base_dias)",
])
para("Conversion a bolivares (igual que el interes, segun la modalidad de valoracion):")
formula([
    "Mora_Bs = Mora_UVC x IDI_fecha_pago                         (IDI al vencimiento)",
    "Mora_Bs = SUMA diaria [ Mora_UVC_dia x IDI(t) ]             (IDI diario)",
])

heading("11.3 Comparacion de bases de mora", 2)
table(
    ["Base", "Sobre que cobra", "Cuando se usa"],
    [
        ["amort", "La cuota de capital impagada", "Opcion por defecto y de mayor aceptacion regulatoria."],
        ["saldo", "El saldo total del credito", "Mas penalizante; solo si el contrato lo especifica."],
    ],
    widths=[1.0, 2.7, 3.0],
)
callout("Tope regulatorio de la mora:",
        "para creditos en UVC la mora maxima es 0,80% anual adicional; para creditos no UVC, 3% "
        "anual (Res. BCV 21-01-02, Art. 7). El sistema verifica estos topes automaticamente.",
        color=NARANJA, fill="FCF3E7")

# Ejemplos de mora
heading("11.4 Ejemplos de mora", 2)
callout("Ejemplo A - mora leve (10 dias, umbral 30):",
        "I_mora = 13.192,29 x 0,19 x 10 / 360 = 69,62 Bs.  Se considera VIGENTE (no supera el umbral). "
        "La mora se registra en cartera activa (143).", color=VERDE, fill="EAF6EC")
callout("Ejemplo B - mora avanzada (75 dias, umbral 30):",
        "I_mora = 13.192,29 x 0,19 x 75 / 360 = 522,17 Bs.  Supera el umbral: los intereses dejan de "
        "reconocerse como ingreso y la mora pasa a cuentas de orden (819).", color=ROJO, fill="FBECEC")

# ================================================================ 12
heading("12. Orden de imputacion de los pagos", 1)
para("Cuando entra un pago, se aplica en un orden estricto para que el capital no se reduzca antes "
     "de cubrir los costos del atraso. En el sistema el orden es:")
para("Mora (intereses moratorios pendientes + mora del periodo).", num=True)
para("Intereses corrientes (vencidos + del periodo).", num=True)
para("Capital de la cuota (amortizacion programada).", num=True)
para("Excedente -> abono a capital (prepago), solo si applyPrepay esta activo.", num=True)
formula([
    "restante = pago",
    "pagado_mora     = min(restante, mora_pendiente + mora_periodo);   restante -= pagado_mora",
    "pagado_interes  = min(restante, interes_pend + interes_periodo);  restante -= pagado_interes",
    "pagado_capital  = min(restante, amortizacion_Bs);                 restante -= pagado_capital",
    "pagado_extra    = restante   (si applyPrepay)  -> va a capital",
])
callout("Nota legal:", "el orden del marco regulatorio antepone los gastos de cobranza (si "
        "existen) antes de la mora. El sistema no modela gastos de cobranza, por lo que comienza "
        "por la mora.", color=NARANJA, fill="FCF3E7")

# ================================================================ 13
heading("13. Clasificacion de la cartera de creditos", 1)
para("Segun los dias de mora, cada cuota se clasifica en una categoria de riesgo. Los umbrales "
     "(mora1, mora2, mora3) son configurables.")
table(
    ["Clasificacion", "Dias de mora", "Significado"],
    [
        ["AL DIA", "0 (o dentro de la gracia)", "Sin atraso. Cartera vigente."],
        ["MORA 1", "1 hasta mora1 (30)", "Atraso leve; en gestion de cobro."],
        ["VENCIDO", "mora1+1 hasta mora2 (60)", "Atraso moderado; alerta temprana."],
        ["VENCIDO 2", "mora2+1 hasta mora3 (90)", "Atraso significativo; provision especifica."],
        ["CASTIGO", "mas de mora3 (90)", "Incobrable; se castiga / pasa a orden de cobro."],
    ],
    widths=[1.5, 2.2, 3.0],
)
formula([
    "si Dias_mora <= 0           -> AL DIA",
    "si Dias_mora <= mora1       -> MORA 1",
    "si Dias_mora <= mora2       -> VENCIDO",
    "si Dias_mora <= mora3       -> VENCIDO 2",
    "si Dias_mora >  mora3       -> CASTIGO",
])

# ================================================================ 14
heading("14. Cartera activa (143) y cuentas de orden (819)", 1)
para("El punto de quiebre contable es el umbral mora2. Mientras el atraso no lo supere, la cuota "
     "esta 'en orden' contablemente y los rendimientos van a cuentas de activo (grupo 143). Cuando "
     "lo supera, los rendimientos y la mora se trasladan a cuentas de orden (grupo 819) y dejan de "
     "reconocerse como ingreso realizado, por prudencia.")
formula([
    "esta_en_orden = Dias_mora > mora2",
    "",
    "si NO esta_en_orden:   Rend conv act = Interes_Bs ;  Rend mora act = Mora_Bs",
    "                       Rend conv ord = 0          ;  Rend mora ord = 0",
    "si SI esta_en_orden:   Rend conv act = 0          ;  Rend mora act = 0",
    "                       Rend conv ord = Interes_Bs ;  Rend mora ord = Mora_Bs",
])
para("Los indicadores 'Moratorio 143' y 'Moratorio 819' reflejan UNICAMENTE el interes moratorio "
     "(la mora), no el rendimiento convencional, que se reporta aparte:")
formula([
    "Moratorio_143 = Rend mora act   (mora en cartera activa, vigente)",
    "Moratorio_819 = Rend mora ord   (mora en cuentas de orden)",
])
table(
    ["Condicion", "Cuenta de intereses", "Cuenta de mora"],
    [
        ["Al dia / mora leve (<= mora2)", "143.xx Rendimientos por cobrar", "143.xx Mora por cobrar"],
        ["En orden / castigo (> mora2)", "819.xx Rendimientos en orden", "819.xx Mora en orden"],
    ],
    widths=[2.3, 2.3, 2.1],
)

# ================================================================ 15
heading("15. Congelamiento del credito vencido", 1)
para("Conforme a la minuta SUDEBAN/BCV/ABV del 17/12/2019, cuando una cuota pasa a 'en orden' "
     "(supera mora2) el credito se 'congela':")
para("Deja de someterse a la actualizacion diaria por IDI en las cuentas reales (Cartera y "
     "Patrimonio).", bullet=True)
para("La revalorizacion de capital y de rendimientos se devenga en cuentas de orden hasta que el "
     "cliente pague.", bullet=True)
para("Al cobrarse, se reconoce en resultados/patrimonio; el incremento del capital revaluado se "
     "registra en la cuenta patrimonial 358.00 'Variacion de Creditos Comerciales'.", bullet=True)
para("En el calculo, la valorizacion UVC se enruta segun la clasificacion:")
formula([
    "vigente (activo):  valorUvcCapitalActive , valorUvcRendActive",
    "en orden (frozen): valorUvcCapitalOrder  , valorUvcRendOrder",
])

# ================================================================ 16
heading("16. Cancelacion anticipada y prepagos", 1)
para("Cuando el cliente paga mas que la cuota exigible, el excedente se abona a capital (si "
     "applyPrepay esta activo). El sistema ofrece dos politicas de reconduccion del calendario:")
table(
    ["Politica", "Que mantiene fijo", "Efecto para el cliente"],
    [
        ["reduce_term", "La cuota en UVC", "Paga la misma cuota pero termina antes (menos cuotas)."],
        ["reduce_installment", "El plazo restante", "La cuota mensual baja; termina en la misma fecha."],
    ],
    widths=[1.8, 1.9, 3.0],
)
heading("16.1 Recalculo tras el prepago", 2)
para("Reducir plazo: se mantiene la cuota y se recalcula cuantas cuotas faltan.")
formula([
    "n_restante = -ln( 1 - (Saldo_UVC x i) / Cuota_UVC ) / ln(1 + i)",
    "(redondeado hacia arriba; si la cuota ya cubre el saldo, n_restante = 0)",
])
para("Reducir cuota: se mantiene el plazo y se recalcula la cuota sobre el nuevo saldo.")
formula(["Nueva_Cuota_UVC = Saldo_UVC x [ i / (1 - (1 + i)^(-n_restante)) ]"])

heading("16.2 Piso de IDI en cancelacion anticipada", 2)
para("La Resolucion BCV 21-01-02 (Art. 5 lit. b/c y Art. 6) protege al acreedor: si el IDI del dia "
     "de pago es menor que el IDI de otorgamiento, para calcular el monto a pagar se usa el de "
     "otorgamiento. Asi el banco recupera al menos el valor nominal en UVC.")
formula(["IDI_efectivo = max( IDI_fecha_pago , IDI_desembolso )"])
callout("Cuando actua:", "solo cuando el IDI cae por debajo del de otorgamiento (escenario de "
        "deflacion del indice). En el escenario normal de IDI creciente, no cambia nada. La fila "
        "marca idiFloorApplied = true cuando el piso se activo.")

# ================================================================ 17
heading("17. Asientos contables (paso a paso)", 1)
para("El sistema genera los asientos (ledger) a partir del calendario. Cada asiento cuadra "
     "(total Debe = total Haber). Se generan en este orden:")

heading("17.1 Asiento de desembolso", 2)
para("Al entregar el credito. El capital se reconoce en la cartera (131.35); el banco entrega el "
     "neto (capital menos comision); la comision flat es un ingreso.")
ledger_table("Desembolso del credito:", [
    ["131.35 Creditos comerciales (capital base)", "Capital", "—"],
    ["1110 Banco (efectivo entregado)", "—", "Neto = Capital - Comision"],
    ["532.00 Comision flat por desembolso (si > 0)", "—", "Comision"],
    ["2160 Descuento desembolso (si aplica)", "—", "Descuento"],
])

heading("17.2 Devengo de intereses (cada periodo)", 2)
para("El rendimiento se separa en componente base (513.01.M.35) y componente por variacion / "
     "actualizacion UVC (513.01.M.36). Solo se generan las lineas con monto significativo.")
ledger_table("Devengo interes cuota k:", [
    ["138.00 Rendimientos por cobrar", "Interes_Bs", "—"],
    ["513.01.M.35 Rendimientos por creditos comerciales (base)", "—", "Interes base"],
    ["513.01.M.36 Rendimientos por variacion (actualizacion)", "—", "Interes variacion"],
])

heading("17.3 Variacion de capital (actualizacion por IDI)", 2)
para("Registra el cambio de valor del capital amortizado por efecto del IDI. Si la variacion es "
     "positiva (IDI sube) se carga 131.36 contra 358.01; si es negativa, se invierte el asiento.")
ledger_table("Variacion de capital - incremento (IDI sube):", [
    ["131.36 Variacion de creditos comerciales", "Val. capital", "—"],
    ["358.01 Variacion de creditos comerciales (patrimonio)", "—", "Val. capital"],
])
ledger_table("Variacion de capital - disminucion (IDI baja):", [
    ["358.01 Variacion de creditos comerciales (patrimonio)", "Val. capital", "—"],
    ["131.36 Variacion de creditos comerciales", "—", "Val. capital"],
])

heading("17.4 Devengo de mora (si aplica)", 2)
ledger_table("Devengo mora cuota k:", [
    ["138.00 Rendimientos por cobrar - mora", "Mora_Bs", "—"],
    ["513.01.M.35 Ingresos por mora", "—", "Mora_Bs"],
])

heading("17.5 Cobro de la cuota", 2)
para("Cuando entra el pago, el banco recibe efectivo y se cancelan, en orden, mora, intereses y "
     "capital (incluido el prepago).")
ledger_table("Pago cuota k:", [
    ["1110 Banco", "Pago recibido", "—"],
    ["138.00 Mora por cobrar (si pago mora)", "—", "Mora pagada"],
    ["138.00 Rendimientos por cobrar (si pago interes)", "—", "Interes pagado"],
    ["131.35 Creditos comerciales (capital + prepago)", "—", "Capital pagado"],
])

# ================================================================ 18
heading("18. Plan de cuentas SUDEBAN utilizado", 1)
para("Codigos del Manual de Contabilidad para Instituciones Bancarias (modificacion del 28/10/2019). "
     "Las cuentas son configurables por credito.")
table(
    ["Codigo", "Nombre", "Uso"],
    [
        ["1110", "Banco", "Efectivo entregado / recibido"],
        ["131.35", "Creditos comerciales vigentes objeto de las medidas del BCV", "Capital base de la cartera"],
        ["131.36", "Variacion de creditos comerciales vigentes (.M.01 incr / .M.02 dism)", "Actualizacion del capital por IDI"],
        ["358.01", "Variacion de creditos comerciales (patrimonio)", "Contrapartida patrimonial de la variacion"],
        ["138.00", "Rendimientos por cobrar por creditos comerciales", "Intereses y mora por cobrar"],
        ["513.01.M.35", "Rendimientos por creditos comerciales vigentes", "Ingreso por interes (componente base)"],
        ["513.01.M.36", "Rendimientos por variacion de creditos comerciales", "Ingreso por actualizacion UVC"],
        ["532.00", "Comisiones flat por desembolso (max 0,50%)", "Ingreso por comision flat"],
        ["2160", "Descuento desembolso", "Descuento aplicado al desembolso"],
    ],
    widths=[1.2, 3.6, 1.9], fontsize=9,
)

# ================================================================ 19
heading("19. Ajuste a dias habiles y feriados", 1)
para("Si adjustToBusinessDay esta activo y un vencimiento cae en fin de semana o feriado, se mueve "
     "al siguiente dia habil (convencion 'following'). Esto afecta:")
para("Los dias del periodo (en 30/360 puede dar mas de 30 dias si hay ajuste).", bullet=True)
para("El IDI aplicado (se usa el del dia habil ajustado).", bullet=True)
para("Los feriados se cargan en una lista configurable (formato YYYY-MM-DD). Se recomienda "
     "mantenerla al dia con el calendario de dias no habiles bancarios del BCV/SUDEBAN.")

# ================================================================ 20
heading("20. Comision flat y cumplimiento regulatorio", 1)
para("La comision flat de desembolso no puede exceder 0,50% del monto del credito. El sistema "
     "evalua el cumplimiento (funcion evaluateCompliance) y clasifica cada verificacion por nivel.")
table(
    ["Verificacion", "Limite", "Nivel si falla"],
    [
        ["Tasa de interes (UVC)", "4% a 10% (o 2% Cartera Productiva)", "error (bloquea)"],
        ["Tasa de mora (UVC)", "<= 0,80% anual adicional", "error (bloquea)"],
        ["Tasa de mora (no UVC)", "<= 3% anual", "error (bloquea)"],
        ["Comision flat", "<= 0,50% del monto", "error (bloquea)"],
        ["Piso de IDI activo", "debe estar activo", "warning (no bloquea)"],
    ],
    widths=[2.3, 2.9, 1.5],
)
callout("Modo referencia / historico (allowHistoricalRates):",
        "cuando esta activo, los excesos de tasa de interes y de mora se reportan como ALERTA en "
        "vez de bloquear. Sirve para reproducir tablas previas a la Resolucion 21-01-02 (por "
        "ejemplo, la tabla de referencia con 16% de interes y 3% de mora). Al desactivarlo se "
        "exigen estrictamente los topes vigentes.", color=NARANJA, fill="FCF3E7")

# ================================================================ 21
heading("21. Tasa Interna de Retorno (TIR)", 1)
para("La TIR mide el rendimiento efectivo real del credito para la institucion. Se calcula con los "
     "flujos de caja: el neto recibido al inicio (negativo para el banco como salida de efectivo) y "
     "los pagos del cliente como entradas. Se resuelve por biseccion buscando la tasa que hace el "
     "Valor Presente Neto igual a cero, y luego se anualiza:")
formula([
    "VPN(r) = SUMA [ flujo_i / (1 + r)^i ] = 0   ->  r mensual (biseccion)",
    "TIR_anual = (1 + r)^12 - 1",
])
para("Si no hay al menos un flujo positivo y uno negativo, la TIR no esta definida (devuelve nulo).")

# ================================================================ 22
heading("22. Modo libre vs. modo simulacion", 1)
table(
    ["Modo", "Como trata los pagos"],
    [
        ["libre", "Registro de pagos reales: todos los pagos se aplican siempre, sin importar su fecha."],
        ["simulacion", "Avanza un 'hoy' simulado (asOf = desembolso + simulationDays). Los pagos con fecha posterior a ese 'hoy' aun no se reconocen."],
    ],
    widths=[1.4, 5.3],
)
para("El 'hoy' simulado (asOfDate) tambien define hasta donde se genera el desglose diario cuando "
     "no hay pago registrado.")

# ================================================================ 23
heading("23. Catalogo de situaciones y escenarios", 1)
para("Resumen de como responde el modelo ante distintas situaciones:")
table(
    ["Situacion", "Comportamiento del modelo"],
    [
        ["Pago puntual y completo", "No hay mora. Interes + amortizacion del periodo; saldo baja segun lo pagado."],
        ["Pago anticipado (antes del vencimiento)", "Se marca paidEarly. Si hay excedente, se abona a capital (prepago)."],
        ["Pago parcial", "Se imputa por orden (mora, interes, capital). El saldo solo baja por el capital efectivamente pagado; el resto queda pendiente."],
        ["Atraso dentro de la gracia", "No genera mora (dias_mora = 0)."],
        ["Atraso 1 a mora2 dias", "Genera mora; clasificacion MORA 1 / VENCIDO; rendimientos en cartera activa (143)."],
        ["Atraso mayor a mora2", "Credito 'en orden': rendimientos y mora a cuentas de orden (819); capital congelado; valorizacion a cuentas de orden."],
        ["Atraso mayor a mora3", "Clasificacion CASTIGO (incobrable)."],
        ["Prepago con reduce_term", "Misma cuota, menos cuotas: se acorta el plazo."],
        ["Prepago con reduce_installment", "Mismo plazo, cuota menor."],
        ["IDI sube (inflacion normal)", "Valorizacion positiva; mas bolivares por la misma UVC; el piso de IDI no actua."],
        ["IDI baja por debajo del de otorgamiento", "Valorizacion negativa (se reversa); el piso de IDI fija el IDI de otorgamiento en cancelaciones."],
        ["Tasa cero", "Cuota = capital / n; sin intereses."],
        ["Vencimiento en dia no habil", "Si el ajuste esta activo, se mueve al siguiente dia habil y se recalculan dias e IDI."],
        ["Credito no UVC", "IDI = 1; sin componentes de actualizacion ni valorizacion; calculo directo en Bs."],
        ["Ultima cuota", "La amortizacion iguala el saldo restante; el saldo cierra en cero."],
        ["Tasa/mora fuera de tope", "Se bloquea (error) salvo en modo referencia, donde se reporta como alerta."],
    ],
    widths=[2.3, 4.4], fontsize=9,
)

# ================================================================ 24
heading("24. Resumen de todas las formulas (hoja de referencia)", 1)
formula([
    "--- Conversion UVC / IDI ---",
    "Capital_UVC = Capital_Bs / IDI_desembolso",
    "Monto_Bs    = Monto_UVC x IDI_fecha",
    "",
    "--- Cuota francesa ---",
    "i          = tasa_anual / 12",
    "Cuota_UVC  = Capital_UVC x [ i / (1 - (1+i)^(-n)) ]      (tasa 0: Capital_UVC / n)",
    "",
    "--- Descomposicion por periodo ---",
    "tasa_periodo  = tasa_anual x (dias_periodo / base_dias)",
    "Interes_UVC   = Saldo_UVC_inicial x tasa_periodo",
    "Amort_UVC     = Cuota_UVC - Interes_UVC      (ultima cuota: Amort_UVC = Saldo_UVC)",
    "Saldo_UVC_fin = Saldo_UVC_inicial - Amort_UVC",
    "",
    "--- Valoracion en bolivares ---",
    "Interes_Bs (idi_due)   = Interes_UVC x IDI_vencimiento",
    "Interes_Bs (idi_daily) = Interes_UVC x (Suma_IDI_periodo / dias_periodo)",
    "Amort_Bs               = Amort_UVC x IDI_vencimiento",
    "Cuota_Bs               = Interes_Bs + Amort_Bs",
    "Saldo_Bs               = Saldo_UVC_fin x IDI_vencimiento",
    "",
    "--- Base / variacion / valorizacion ---",
    "Componente_base_Bs = Monto_UVC x IDI_desembolso",
    "Val_UVC_capital    = Amort_Bs   - Amort_UVC   x IDI_desembolso",
    "Val_UVC_rend       = Interes_Bs - Interes_UVC x IDI_desembolso",
    "",
    "--- Mora ---",
    "Dias_mora = max(0, dias(vencimiento, pago) - dias_gracia)",
    "Mora_UVC  = Base_mora_UVC x tasa_mora x (Dias_mora / base_dias)",
    "Mora_Bs   = Mora_UVC x IDI   (o suma diaria con IDI(t))",
    "",
    "--- Clasificacion ---",
    "AL DIA / MORA 1 / VENCIDO / VENCIDO 2 / CASTIGO  segun mora1, mora2, mora3",
    "en_orden = Dias_mora > mora2   ->  rendimientos y mora a cuentas 819",
    "",
    "--- Prepago / piso IDI ---",
    "IDI_efectivo = max(IDI_pago, IDI_desembolso)",
    "n_restante   = -ln(1 - (Saldo_UVC x i)/Cuota_UVC) / ln(1+i)   (reduce_term)",
    "",
    "--- TIR ---",
    "VPN(r)=SUMA flujo_i/(1+r)^i = 0 ;  TIR_anual = (1+r)^12 - 1",
])

# ================================================================ 25
heading("25. Glosario", 1)
table(
    ["Termino", "Definicion"],
    [
        ["UVC", "Unidad de Valor de Credito. Unidad de cuenta del BCV para creditos en moneda nacional, que preserva el valor real del capital."],
        ["IDI", "Indice de Inversion. Factor que el BCV publica a diario; indica cuantos bolivares vale una UVC en una fecha."],
        ["IDI de desembolso / base", "IDI del dia del desembolso; referencia fija para toda la vida del credito."],
        ["Amortizacion", "Porcion de la cuota que abona al capital."],
        ["Cuota", "Pago periodico = intereses + amortizacion."],
        ["Interes corriente / convencional", "Interes ordinario por el uso del dinero."],
        ["Mora", "Interes punitorio por atraso, sobre el capital vencido (sin anatocismo)."],
        ["Dias de gracia", "Dias de atraso que no generan mora."],
        ["Base de dias", "Convencion de conteo (30/360 o actual/365) que define el denominador anual."],
        ["Componente base", "Parte de la cuota valorada al IDI de desembolso."],
        ["Componente de variacion", "Parte por actualizacion (diferencia entre IDI de vencimiento y de desembolso)."],
        ["Valorizacion UVC", "Ganancia en Bs por la subida del IDI entre desembolso y vencimiento."],
        ["Cartera activa (143)", "Creditos con atraso <= mora2; rendimientos en cuentas de activo."],
        ["Cuentas de orden (819)", "Rendimientos y mora de creditos con atraso > mora2; fuera de resultados hasta cobrar."],
        ["Congelamiento", "El credito vencido deja de actualizarse por IDI en cuentas reales."],
        ["Piso de IDI", "En cancelacion anticipada, el IDI no puede ser menor al de otorgamiento."],
        ["Prepago", "Pago de capital por encima de la cuota exigible."],
        ["TIR", "Tasa Interna de Retorno; rendimiento efectivo del credito para la institucion."],
        ["asOf / hoy simulado", "Fecha de corte en modo simulacion (desembolso + simulationDays)."],
        ["SUDEBAN", "Superintendencia de las Instituciones del Sector Bancario."],
        ["BCV", "Banco Central de Venezuela."],
    ],
    widths=[1.9, 4.8], fontsize=9.5,
)

doc.add_paragraph()
fin = doc.add_paragraph()
rf = fin.add_run("Documento de uso interno. Verifique la vigencia de las resoluciones del BCV y "
                 "SUDEBAN antes de implementar en produccion. Las formulas y reglas aqui descritas "
                 "corresponden al motor de calculo del proyecto (src/lib/simulator.js, "
                 "regulatory.js y loanStorage.js).")
rf.italic = True; rf.font.size = Pt(9); rf.font.color.rgb = GRIS

doc.save(OUT)
print("OK ->", OUT)
