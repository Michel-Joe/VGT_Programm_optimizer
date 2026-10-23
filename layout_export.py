"""Dimensioned hall layout PDF. Coordinates are metres from the back-left corner."""
from io import BytesIO
from math import cos, radians, sin

from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from pdf_export import FONT

PAGE = landscape(A3)
DEFAULT_SIZES = {
    "bar": (1.55, 3.45), "trampoline": (1.3, 1.3), "mat_thin": (2, 1),
    "mat_thick": (3, 2), "mat16": (2, 1), "box": (1.5, .6), "side": (3, 1.2),
}
KIND_LABELS = {
    "bar": "Barren", "trampoline": "Trampolin", "mat_thin": "Matte dünn",
    "mat_thick": "Matte dick", "mat16": "16er-Matte", "box": "Kasten", "side": "Nebenposten",
}
KIND_COLORS = {
    "bar": "#dcebe0", "trampoline": "#d7e6ed", "mat_thin": "#bcd9ef",
    "mat_thick": "#8fb5d1", "mat16": "#dcc6ee", "box": "#dcc09c", "side": "#ede5d4",
}


def choose_scale(width, height):
    """Return a printable denominator fitting the A3 landscape plan area."""
    for denominator in (50, 100, 200, 250, 500, 1000):
        if width * 1000 / denominator <= 365 and height * 1000 / denominator <= 205:
            return denominator
    raise ValueError("Die Fläche ist zu gross für den A3-Massplan.")


def position_at(person, beat):
    frames = sorted(person["frames"], key=lambda frame: frame["beat"])
    previous = frames[0]
    for following in frames[1:]:
        if beat < following["beat"]:
            if following["transition"] == "hold":
                return previous["x"], previous["y"]
            ratio = max(0, min(1, (beat - previous["beat"]) / (following["beat"] - previous["beat"])))
            return previous["x"] + (following["x"] - previous["x"]) * ratio, previous["y"] + (following["y"] - previous["y"]) * ratio
        previous = following
    return previous["x"], previous["y"]


def station_corners(station):
    width, depth = DEFAULT_SIZES[station["kind"]]
    width, depth = station.get("width", width), station.get("depth", depth)
    angle = radians(station["rotation"])
    return [(station["x"] + dx * cos(angle) - dy * sin(angle),
             station["y"] + dx * sin(angle) + dy * cos(angle))
            for dx, dy in ((-width/2, -depth/2), (width/2, -depth/2),
                           (width/2, depth/2), (-width/2, depth/2))]


def outside_stations(project):
    width, height = project["floor"]["width"], project["floor"]["height"]
    return [station["name"] for station in project["stations"]
            if any(x < -1e-7 or x > width + 1e-7 or y < -1e-7 or y > height + 1e-7
                   for x, y in station_corners(station))]


def export_layout(project, beat=0, person_id="", show_paths=True):
    total = sum(section["beats"] for section in project["sections"])
    if not 0 <= beat <= total or round(beat * 4) != beat * 4:
        raise ValueError("Schlag liegt ausserhalb des Programms oder nicht auf einem Viertelschlag.")
    if person_id and not any(person["id"] == person_id for person in project["people"]):
        raise ValueError("Turner nicht gefunden.")
    width, height = project["floor"]["width"], project["floor"]["height"]
    denominator = choose_scale(width, height)
    unit = 1000 * mm / denominator  # Exact paper length of one metre.
    page_w, page_h = PAGE
    drawing_w, drawing_h = width * unit, height * unit
    x0 = (page_w - drawing_w) / 2
    y0 = 34*mm + (205*mm - drawing_h)/2
    selected = [person for person in project["people"] if not person_id or person["id"] == person_id]
    unmeasured = [station["name"] for station in project["stations"] if not station.get("measured")]
    outside = outside_stations(project)
    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=PAGE, pageCompression=1)
    pdf.setTitle(f"{project['name']} - Hallenplan")
    pdf.setAuthor(project.get("club", "VGT Studio"))

    def text(x, y, value, size=9, color="#263b31", bold=False):
        pdf.setFont(FONT if not bold else "Helvetica-Bold", size)
        pdf.setFillColor(colors.HexColor(color))
        pdf.drawString(x, y, str(value))

    def point(x, y):
        return x0 + x*unit, y0 + (height-y)*unit

    text(18*mm, page_h-20*mm, project["name"], 18, bold=True)
    text(18*mm, page_h-29*mm, f"Hallenplan | Schlag {beat+1:g} | A3 quer | Massstab 1:{denominator}", 10)
    text(18*mm, page_h-36*mm, "Ursprung: links oben an der Rückseite. x nach rechts, y Richtung Publikum. Alle Masse in Metern.", 8)
    pdf.setStrokeColor(colors.HexColor("#345847"))
    pdf.setLineWidth(1)
    pdf.rect(x0, y0, drawing_w, drawing_h)
    pdf.setStrokeColor(colors.HexColor("#d8e1d9"))
    pdf.setLineWidth(.35)
    for i in range(1, int(width)+1):
        x = x0+i*unit
        pdf.line(x, y0, x, y0+drawing_h)
    for i in range(1, int(height)+1):
        y = y0+i*unit
        pdf.line(x0, y, x0+drawing_w, y)
    for i in range(0, int(width)+1, 2):
        text(x0+i*unit-2, y0+drawing_h+3*mm, i, 6)
    for i in range(0, int(height)+1, 2):
        text(x0-8*mm, y0+drawing_h-i*unit-2, i, 6)
    text(x0, y0+drawing_h+9*mm, "RÜCKSEITE (0,0)", 8, bold=True)
    text(x0, y0-6*mm, "PUBLIKUM / FRONT", 8, bold=True)

    for number, station in enumerate(project["stations"], 1):
        default_width, default_depth = DEFAULT_SIZES[station["kind"]]
        station_width, station_depth = station.get("width", default_width), station.get("depth", default_depth)
        x, y = point(station["x"], station["y"])
        pdf.saveState()
        pdf.translate(x, y)
        pdf.rotate(-station["rotation"])
        pdf.setFillColor(colors.HexColor(KIND_COLORS[station["kind"]]))
        pdf.setStrokeColor(colors.HexColor("#375a4a"))
        pdf.setLineWidth(.8)
        pdf.rect(-station_width*unit/2, -station_depth*unit/2, station_width*unit, station_depth*unit, fill=1)
        pdf.restoreState()
        pdf.setFillColor(colors.HexColor("#183f2e"))
        pdf.setFont("Helvetica-Bold", 7)
        pdf.drawCentredString(x, y-2, str(number))

    if show_paths and person_id:
        for person in selected:
            pdf.setStrokeColor(colors.HexColor(person["color"]))
            pdf.setLineWidth(1.3)
            frames = sorted(person["frames"], key=lambda frame: frame["beat"])
            for previous, following in zip(frames, frames[1:]):
                if following["transition"] != "linear":
                    continue
                x1, y1 = point(previous["x"], previous["y"])
                x2, y2 = point(following["x"], following["y"])
                pdf.line(x1, y1, x2, y2)
                pdf.setFillColor(colors.white)
                pdf.circle(x2, y2, 3, stroke=1, fill=1)
                text(x2+4, y2+4, f"S{following['beat']+1:g}", 6, person["color"])

    for number, person in enumerate(project["people"], 1):
        if person_id and person["id"] != person_id:
            continue
        px, py = position_at(person, beat)
        x, y = point(px, py)
        pdf.setFillColor(colors.HexColor(person["color"]))
        pdf.setStrokeColor(colors.white)
        pdf.setLineWidth(1)
        pdf.circle(x, y, 5, stroke=1, fill=1)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 6)
        pdf.drawCentredString(x, y-2, str(number))

    # The bar must be measured on paper after printing. It is not a screen-scale claim.
    bar_m = min(5, int(width))
    bar_x, bar_y = 18*mm, 17*mm
    for i in range(bar_m):
        pdf.setFillColor(colors.HexColor("#345847") if i % 2 == 0 else colors.white)
        pdf.rect(bar_x+i*unit, bar_y, unit, 4*mm, fill=1)
    text(bar_x, bar_y+7*mm, f"Prüfleiste: {bar_m} m = {bar_m*1000/denominator:g} mm auf Papier", 8)
    text(18*mm, 9*mm, "Beim Drucken 'Tatsächliche Grösse / 100 %' wählen und die Prüfleiste nachmessen.", 7)
    text(page_w-80*mm, 18*mm, f"Masse offen: {len(unmeasured)}  |  Ausserhalb Fläche: {len(outside)}", 7)
    pdf.showPage()

    def table_header(title, columns):
        nonlocal_y = page_h-20*mm
        text(18*mm, nonlocal_y, title, 17, bold=True)
        text(18*mm, nonlocal_y-9*mm, f"Schlag {beat+1:g} | Koordinaten ab linkem oberen Halleneck | Massstab des Plans 1:{denominator}", 8)
        y = nonlocal_y-21*mm
        pdf.setFillColor(colors.HexColor("#edf3ec"))
        pdf.rect(18*mm, y-4*mm, page_w-36*mm, 8*mm, fill=1, stroke=0)
        for x, label in columns:
            text(x*mm, y-1*mm, label, 8, bold=True)
        return y-9*mm

    def new_table_page(title, columns):
        pdf.showPage()
        return table_header(title, columns)

    device_cols = [(18, "#"), (30, "Gerät"), (123, "Typ"), (177, "Mittelpunkt x"), (215, "Mittelpunkt y"),
                   (253, "Breite x Tiefe"), (308, "Drehung"), (345, "Gemessen")]
    y = table_header("Geräte- und Positionsliste", device_cols)
    for number, station in enumerate(project["stations"], 1):
        if y < 35*mm:
            y = new_table_page("Geräteliste (Fortsetzung)", device_cols)
        default_width, default_depth = DEFAULT_SIZES[station["kind"]]
        values = [number, station["name"], KIND_LABELS[station["kind"]], f"{station['x']:g} m",
                  f"{station['y']:g} m", f"{station.get('width',default_width):g} x {station.get('depth',default_depth):g} m",
                  f"{station['rotation']:g}°", "ja" if station.get("measured") else "NEIN"]
        for (x, _), value in zip(device_cols, values):
            text(x*mm, y, value, 8)
        pdf.setStrokeColor(colors.HexColor("#e6ece4"))
        pdf.line(18*mm, y-3*mm, page_w-18*mm, y-3*mm)
        y -= 8*mm

    people_cols = [(18, "#"), (30, "Turner"), (142, "Position x"), (180, "Position y"), (221, "Schlag"), (260, "Weg / Ziel")]
    y -= 9*mm
    if y < 50*mm:
        y = new_table_page("Turnerpositionen", people_cols)
    else:
        pdf.setFillColor(colors.HexColor("#edf3ec"))
        pdf.rect(18*mm, y-4*mm, page_w-36*mm, 8*mm, fill=1, stroke=0)
        for x, label in people_cols:
            text(x*mm, y-1*mm, label, 8, bold=True)
        y -= 9*mm
    for number, person in enumerate(project["people"], 1):
        if y < 40*mm:
            y = new_table_page("Turnerpositionen (Fortsetzung)", people_cols)
        px, py = position_at(person, beat)
        for (x, _), value in zip(people_cols, [number, person["name"], f"{px:.2f} m", f"{py:.2f} m", f"{beat+1:g}", "ausgewählt" if person["id"] == person_id else ""]):
            text(x*mm, y, value, 8)
        y -= 8*mm

    if person_id:
        person = selected[0]
        y -= 8*mm
        if y < 55*mm:
            y = new_table_page(f"Laufweg: {person['name']}", people_cols)
        text(18*mm, y, f"Laufweg und Zielschläge: {person['name']}", 11, bold=True)
        y -= 9*mm
        for frame in sorted(person["frames"], key=lambda frame: frame["beat"]):
            if y < 35*mm:
                y = new_table_page(f"Laufweg: {person['name']} (Fortsetzung)", people_cols)
            text(18*mm, y, f"Schlag {frame['beat']+1:g}", 8)
            text(70*mm, y, f"x {frame['x']:g} m | y {frame['y']:g} m", 8)
            text(145*mm, y, "Weg zum Ziel" if frame["transition"] == "linear" else "Bis hier halten", 8)
            y -= 7*mm
    if unmeasured:
        y = min(y-9*mm, 35*mm)
        text(18*mm, y, "WARNUNG: Beispielmasse sind nicht für eine 1:1-Übertragung freigegeben. Geräte vor Ort messen und bestätigen.", 8, "#a04d36")
    if outside:
        text(18*mm, max(16*mm, y-8*mm), "WARNUNG: Mindestens ein Geräte-Grundriss ragt über die konfigurierte Fläche hinaus.", 8, "#a04d36")
    pdf.save()
    return stream.getvalue()
