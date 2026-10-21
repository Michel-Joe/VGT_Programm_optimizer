"""Personal, printable routines. Uses saved project data, never mutates it."""
from io import BytesIO
from pathlib import Path
from html import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
from planner import participant_action

FONT = "Helvetica"
for font_path in [Path("C:/Windows/Fonts/arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]:
    if font_path.exists():
        pdfmetrics.registerFont(TTFont("VGTText", str(font_path)))
        FONT = "VGTText"
        break


def duration_text(beats):
    whole, rest = divmod(beats, 8)
    return f"{whole:g} x 8" if rest == 0 else (f"{whole:g} x 8 + 1 x {rest:g}" if whole else f"1 x {rest:g}")


def clock(seconds):
    cents = max(0, round(seconds * 100))
    return f"{cents // 6000}:{cents // 100 % 60:02},{cents % 100:02}"


def export_program(project, person_id=""):
    people = [p for p in project["people"] if not person_id or p["id"] == person_id]
    if person_id and not people:
        raise ValueError("Turner nicht gefunden.")
    starts, elapsed, beat = {}, 0, 0
    sections = {}
    for s in project["sections"]:
        starts[s["id"]] = (beat, elapsed)
        sections[s["id"]] = s
        beat += s["beats"]
        elapsed += s["beats"] * 60 / s["bpm"]
    names = {p["id"]: p["name"] for p in project["people"]}
    stations = {s["id"]: s["name"] for s in project["stations"]}
    green = colors.HexColor("#285e49")
    base = dict(fontName=FONT, alignment=TA_LEFT, textColor=colors.HexColor("#263b31"))
    styles = {
        "title": ParagraphStyle("title", fontSize=22, leading=27, spaceAfter=10, **base),
        "heading": ParagraphStyle("heading", fontSize=14, leading=18, spaceBefore=14, spaceAfter=7, keepWithNext=True, **base),
        "body": ParagraphStyle("body", fontSize=10.5, leading=16, spaceAfter=9, **base),
        "meta": ParagraphStyle("meta", fontSize=10, leading=15, spaceAfter=10, **base),
        "sequence": ParagraphStyle("sequence", fontSize=10.5, leading=16, spaceAfter=2, **base),
        "small": ParagraphStyle("small", fontSize=8.5, leading=12, spaceAfter=8, **base),
    }
    def para(text, style="body"):
        return Paragraph(escape(str(text)).replace("\n", "<br/>"), styles[style])
    stream = BytesIO()
    doc = SimpleDocTemplate(stream, pagesize=A4, rightMargin=19*mm, leftMargin=19*mm,
                            topMargin=22*mm, bottomMargin=19*mm, title=project["name"], author=project["club"])
    flow = []
    for index, person in enumerate(people):
        if index:
            flow.append(PageBreak())
        flow += [para(person["name"], "title"), para(project["name"] + " | " + project["club"], "body"),
                 para("Musikzeiten sind aus BPM und Musikversatz berechnet. Schlagzahlen in der Elementfolge gelten ab deinem eigenen Übungsbeginn. Zeilen ohne Zahl haben keinen festgelegten Schlag.", "small"),
                 HRFlowable(width="100%", thickness=1, color=green)]
        actions = [participant_action(a, person["id"]) for a in project["actions"] if person["id"] in a["people"]]
        actions.sort(key=lambda a: starts[a["section_id"]][0] + a["start"])
        if not actions:
            flow.append(para("Noch keine Übungen zugeteilt."))
        for n, a in enumerate(actions, 1):
            s = sections[a["section_id"]]
            start, seconds = starts[s["id"]]
            own_start = seconds + a["start"] * 60 / s["bpm"] + project["music"]["offset"]
            own_end = own_start + a["length"] * 60 / s["bpm"]
            mates = ", ".join(names[id] for id in a["people"] if id != person["id"]) or "Einzeleinsatz"
            flow += [para(f"{n}. {a['title']}", "heading"),
                     para(f"{clock(own_start)} - {clock(own_end)} | Schlag {start+a['start']+1:g} | Dauer {duration_text(a['length'])}\n"
                          f"Gerät: {stations.get(a['station_id'], 'Freie Fläche')} | Chef: {names.get(a.get('leader_id'), 'Noch offen')}\n"
                          f"Mit: {mates}\nAbschnitt: {s['name']} | Dein Start im Abschnitt: {a['start']+1:g}", "meta")]
            sequence = a.get("sequence")
            if sequence is None:
                sequence = "\n".join(f"{c['beat']+1:g} {c['text']}" for c in a["cues"])
            flow.extend(para(line or " ", "sequence") for line in (sequence or "Noch keine Elementfolge erfasst.").splitlines())
            if a["note"]:
                flow.append(para("Bemerkung: " + a["note"], "small"))
            flow += [Spacer(1, 3*mm), HRFlowable(width="100%", thickness=.5, color=colors.HexColor("#dce5df"))]
    if not people:
        flow.append(para("Noch keine Turnenden erfasst.", "title"))
    def page(canvas, document):
        canvas.saveState()
        canvas.setFont(FONT, 8)
        canvas.setFillColor(green)
        canvas.drawString(19*mm, A4[1]-13*mm, "VGT STUDIO | PERSÖNLICHER ABLAUF")
        canvas.drawRightString(A4[0]-19*mm, 11*mm, f"Seite {document.page}")
        canvas.restoreState()
    doc.build(flow, onFirstPage=page, onLaterPages=page)
    return stream.getvalue()
