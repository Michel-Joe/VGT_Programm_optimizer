"""Validation and planning checks; no automatic judging or safety certification."""
import math


def demo_project():
    names = ["Luca", "Noah", "Mia", "Lea", "Jan", "Nina", "Tim", "Elin"]
    colors = ["#217c70", "#de9150", "#6273bc", "#c66586", "#4d96b8", "#908347", "#966bb6", "#b76b53"]
    people = [{"id": f"p{i+1}", "name": n, "color": colors[i], "frames": [
        {"beat": 0, "x": 2 + (i // 2) * 4, "y": 10.5 + (i % 2), "transition": "hold"},
        {"beat": 8, "x": 3 + (i // 2) * 4, "y": 4.5 + (i % 2) * 2, "transition": "linear"},
        {"beat": 24, "x": 3 + (i // 2) * 4, "y": 4.5 + (i % 2) * 2, "transition": "hold"},
        {"beat": 32, "x": 3 + (i // 2) * 4, "y": 6.5 - (i % 2) * 2, "transition": "linear"},
        {"beat": 48, "x": 3 + (i // 2) * 4, "y": 6.5 - (i % 2) * 2, "transition": "hold"},
        {"beat": 56, "x": 3 + (i // 2) * 4, "y": 9 + (i % 2), "transition": "linear"},
        {"beat": 64, "x": 3 + (i // 2) * 4, "y": 9 + (i % 2), "transition": "hold"},
    ]} for i, n in enumerate(names)]
    sections = [{"id": f"s{i}", "name": name, "beats": beats, "bpm": 52, "note": note} for i, (name, beats, note) in enumerate([
        ("Auftakt", 8, "Gemeinsam auf den ersten Akzent öffnen."),
        ("Schwungbild A", 16, "Gruppe A am Barren, Gruppe B begleitet."),
        ("Platzwechsel", 8, "Wege ruhig und im Rhythmus ausführen."),
        ("Schwungbild B", 16, "Rollen getauscht; gleiche Bewegungsqualität."),
        ("Ausklang", 8, "Die Bewegung in den Raum weiterführen."),
        ("Schlussbild", 8, "Letzten Akzent gemeinsam setzen."),
    ])]
    parts = [
        {"id": "part1", "name": "Schwungfolge", "beats": 16, "kind": "apparatus", "note": "Beispiel: Übungsfolge mit deinem tatsächlichen Programm ersetzen.", "elements": [], "cues": [{"beat": 0, "text": "Einsprung gemeinsam"}, {"beat": 4, "text": "Schwung aufnehmen"}, {"beat": 12, "text": "Abgang vorbereiten"}, {"beat": 15, "text": "Landung / Abschluss"}]},
        {"id": "part2", "name": "Begleitbewegung", "beats": 16, "kind": "side", "note": "Blick zur Mitte; Bewegung der aktiven Gruppe aufnehmen.", "elements": [], "cues": [{"beat": 0, "text": "Arme öffnen"}, {"beat": 8, "text": "Richtung wechseln"}]},
        {"id": "part3", "name": "Choreografischer Wechsel", "beats": 8, "kind": "travel", "note": "Weg und Zielposition in der Aufstellung festlegen.", "elements": [], "cues": [{"beat": 0, "text": "Auf 1 weglaufen"}, {"beat": 6, "text": "Am neuen Platz ankommen"}]},
    ]
    actions = []
    for sec, reverse in [("s1", False), ("s3", True)]:
        for i in range(4):
            for side in range(2):
                part = parts[0 if side == int(reverse) else 1]
                actions.append({"id": f"a{len(actions)}", "section_id": sec, "start": 0, "length": 16,
                    "title": part["name"], "people": [f"p{2*i+side+1}"], "station_id": f"b{i+1}" if part["kind"] == "apparatus" else "side1",
                    "kind": part["kind"], "part_id": part["id"], "note": part["note"], "elements": [], "cues": [dict(c) for c in part["cues"]]})
    for sec, title, kind in [("s0", "Auf die Fläche", "travel"), ("s2", "Ablösung & Platzwechsel", "travel"), ("s4", "Vom Gerät ins Schlussbild", "travel"), ("s5", "Gemeinsamer Abschluss", "pose")]:
        actions.append({"id": f"a{len(actions)}", "section_id": sec, "start": 0, "length": 8, "title": title,
            "people": [p["id"] for p in people], "station_id": "", "kind": kind, "part_id": "part3" if kind == "travel" else "",
            "note": "Beispielablauf zum Ausprobieren.", "elements": [], "cues": [{"beat": 0, "text": "Gemeinsam beginnen"}, {"beat": 7, "text": "Zielposition halten"}]})
    return {"schema_version": 1, "name": "Barren · Turnshow 2026", "club": "Mein Turnverein", "mode": "VGT", "phrase": 8,
        "floor": {"width": 18, "height": 14}, "music": {"name": "", "duration": None, "offset": 0},
        "people": people, "sections": sections, "parts": parts, "actions": actions,
        "stations": [{"id": f"b{i+1}", "name": f"Barren {i+1}", "kind": "bar", "x": 3+i*4, "y": 5.5, "rotation": 0} for i in range(4)] + [
            {"id": "side1", "name": "Nebenposten", "kind": "side", "x": 9, "y": 10.5, "rotation": 0}],
        "checklist": {"music": False, "paths": False, "formations": False, "safety": False, "material": False}, "notes": "Demoprogramm – keine fertig geprüfte Wettkampfübung."}


STATION_KINDS = {"bar", "side", "trampoline", "mat_thin", "mat_thick", "mat16", "box"}


def participant_assignment(action, person_id):
    return next((x for x in action.get("assignments", []) if x["person_id"] == person_id),
                {"person_id": person_id, "station_id": action.get("station_id", ""), "offset": 0})


def participant_action(action, person_id):
    seat = participant_assignment(action, person_id)
    return {**action, "start": action["start"] + seat["offset"], "station_id": seat["station_id"]}


def validate_project(p):
    def fail(msg):
        raise ValueError(msg)
    def obj(value):
        if not isinstance(value, dict): fail("Ein Objekt wurde erwartet.")
    def string(value, name, limit=10000):
        if not isinstance(value, str) or len(value) > limit: fail(f"Ungültiger Text: {name}.")
    def number(value, name, low, high, quarter=False):
        if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high: fail(f"Ungültiger Wert: {name} ({low}–{high}).")
        if quarter and abs(value*4-round(value*4)) > 1e-7: fail(f"{name}: nur Viertelschläge verwenden.")
    def collection(name, limit):
        value = p.get(name)
        if not isinstance(value, list) or len(value) > limit: fail(f"Ungültige Liste: {name}.")
        ids = set()
        for item in value:
            obj(item)
            string(item.get("id"), "ID", 100)
            if not item["id"] or item["id"] in ids: fail(f"Doppelte/leere ID in {name}.")
            ids.add(item["id"])
        return ids
    def cues(items, length):
        if not isinstance(items, list) or len(items) > 2000: fail("Ungültige Schlagnotizen.")
        for cue in items:
            obj(cue)
            number(cue.get("beat"), "Schlagnotiz", 0, length-0.25, True)
            string(cue.get("text"), "Schlagnotiz")
    def elements(items):
        if not isinstance(items, list) or len(items) > 200: fail("Ungültige Elementliste.")
        for e in items:
            obj(e)
            string(e.get("name"), "Elementname", 200)
            if not e["name"].strip() or type(e.get("countable")) is not bool: fail("Elementname / Zählstatus fehlt.")
    obj(p)
    if p.get("schema_version") != 1: fail("Dieses Projektformat wird nicht unterstützt (Version 1 erwartet).")
    for key in ["name", "club", "notes"]: string(p.get(key), key)
    if not p["name"].strip(): fail("Bitte einen Programmnamen eingeben.")
    if p.get("mode") not in ["VGT", "VKT"]: fail("Unbekannte Wettkampfform.")
    number(p.get("phrase"), "Zählgruppe", 1, 16)
    if int(p["phrase"]) != p["phrase"]: fail("Zählgruppe muss ganzzahlig sein.")
    obj(p.get("floor"))
    for k in ["width", "height"]: number(p["floor"].get(k), "Fläche", 4, 50)
    obj(p.get("music"))
    string(p["music"].get("name"), "Musikname")
    number(p["music"].get("offset"), "Musikstart", 0, 3600)
    if p["music"].get("duration") is not None: number(p["music"]["duration"], "Musikdauer", 0.01, 14400)
    ids = {name: collection(name, limit) for name, limit in [("people",100), ("stations",100), ("sections",200), ("parts",1000), ("actions",5000)]}
    if not p["sections"]: fail("Mindestens ein Abschnitt ist erforderlich.")
    total = 0
    for s in p["sections"]:
        string(s.get("name"), "Abschnitt")
        string(s.get("note"), "Abschnittsnotiz")
        number(s.get("beats"), "Abschnittslänge", 0.25, 4096, True)
        number(s.get("bpm"), "Tempo", 10, 400)
        total += s["beats"]
    def position(value):
        number(value.get("x"), "X-Position", 0, p["floor"]["width"])
        number(value.get("y"), "Y-Position", 0, p["floor"]["height"])
    for person in p["people"]:
        string(person.get("name"), "Turnername", 200)
        color = person.get("color", "")
        if not isinstance(color, str) or len(color) != 7 or color[0] != "#" or any(c not in "0123456789abcdefABCDEF" for c in color[1:]): fail("Ungültige Personenfarbe.")
        frames = person.get("frames")
        if not isinstance(frames, list) or not frames or len(frames) > 5000: fail("Startposition fehlt.")
        beats = set()
        for f in frames:
            obj(f)
            position(f)
            number(f.get("beat"), "Positionszeit", 0, total, True)
            if f["beat"] in beats: fail("Doppelte Positionszeit.")
            beats.add(f["beat"])
            if f.get("transition") not in ["hold", "linear"]: fail("Unbekannter Positionsübergang.")
        if 0 not in beats: fail("Jede Person braucht eine Startposition auf Schlag 1.")
    for station in p["stations"]:
        string(station.get("name"), "Postenname")
        position(station)
        number(station.get("rotation"), "Drehung", -360, 360)
        if station.get("kind") not in STATION_KINDS: fail("Unbekannter Postentyp.")
        for dimension in ("width", "depth"):
            if dimension in station: number(station[dimension], "Gerätegrösse", .2, 12)
    for part in p["parts"]:
        string(part.get("name"), "Bausteinname")
        string(part.get("note"), "Bausteinnotiz")
        if "sequence" in part: string(part["sequence"], "Elementfolge")
        number(part.get("beats"), "Bausteinlänge", 0.25, 4096, True)
        if part.get("kind") not in ["apparatus", "side", "travel", "pose"]: fail("Unbekannte Aktionsart.")
        cues(part.get("cues"), part["beats"])
        elements(part.get("elements"))
    section_map = {s["id"]: s for s in p["sections"]}
    for a in p["actions"]:
        if a.get("section_id") not in ids["sections"]: fail("Aktion verweist auf fehlenden Abschnitt.")
        number(a.get("start"), "Startschlag", 0, 4096, True)
        number(a.get("length"), "Aktionslänge", 0.25, 4096, True)
        if a["start"] + a["length"] > section_map[a["section_id"]]["beats"]: fail("Aktion reicht über das Abschnittsende hinaus. Abschnitt zuerst verlängern.")
        persons = a.get("people")
        if not isinstance(persons, list) or not persons or any(not isinstance(x,str) or x not in ids["people"] for x in persons) or len(set(persons)) != len(persons): fail("Jede Aktion braucht gültige, eindeutige Turnende.")
        leader = a.get("leader_id", "")
        if not isinstance(leader, str) or (leader and leader not in persons):
            fail("Der Chef muss bei dieser Aktion als turnende Person ausgewählt sein.")
        if "assignments" in a:
            seats = a["assignments"]
            if not isinstance(seats, list) or len(seats) != len(persons): fail("Gerätezuordnung für jede turnende Person erforderlich.")
            seen = set()
            for seat in seats:
                obj(seat)
                person_id = seat.get("person_id")
                if not isinstance(person_id, str) or person_id not in persons or person_id in seen: fail("Ungültige/doppelte Turnerzuordnung.")
                seen.add(person_id)
                string(seat.get("station_id"), "Gerätezuordnung")
                if seat["station_id"] and seat["station_id"] not in ids["stations"]: fail("Zugeordnetes Gerät fehlt.")
                number(seat.get("offset"), "Kanon-Versatz", 0, 4096, True)
                if a["start"] + seat["offset"] + a["length"] > section_map[a["section_id"]]["beats"]: fail("Kanon-Einsatz reicht über das Abschnittsende hinaus.")
        if a.get("station_id") and a["station_id"] not in ids["stations"]: fail("Posten fehlt.")
        if a.get("part_id") and a["part_id"] not in ids["parts"]: fail("Baustein fehlt.")
        for k in ["station_id", "part_id", "title", "note"]: string(a.get(k), k)
        if "sequence" in a: string(a["sequence"], "Elementfolge")
        if a.get("kind") not in ["apparatus", "side", "travel", "pose"]: fail("Unbekannte Aktionsart.")
        cues(a.get("cues"), a["length"])
        elements(a.get("elements"))
    obj(p.get("checklist"))
    for k in ["music", "paths", "formations", "safety", "material"]:
        if type(p["checklist"].get(k)) is not bool: fail("Ungültige Checkliste.")


def analyse(p):
    starts, time, beat = {}, 0, 0
    for section in p["sections"]:
        starts[section["id"]] = beat
        beat += section["beats"]
        time += section["beats"] * 60 / section["bpm"]
    stations = {s["id"]: s for s in p["stations"]}
    warnings, person_stats = [], []
    for person in p["people"]:
        actions = sorted([participant_action(a, person["id"]) for a in p["actions"] if person["id"] in a["people"]], key=lambda a: starts[a["section_id"]] + a["start"])
        unique = set()
        furthest_end, previous = -1, None
        for a in actions:
            start = starts[a["section_id"]] + a["start"]
            if start < furthest_end:
                warnings.append({"kind": "conflict", "text": f'{person["name"]}: „{previous["title"]}“ und „{a["title"]}“ überschneiden sich ab Schlag {start+1:g}.', "person": person["id"], "action": a["id"]})
            if start + a["length"] > furthest_end:
                furthest_end, previous = start + a["length"], a
            if a["kind"] == "apparatus" and stations.get(a["station_id"], {}).get("kind") == "bar":
                unique.update(e["name"].strip().casefold() for e in a["elements"] if e["countable"])
        # Union coverage counts overlaps once.
        covered, end = 0, 0
        for a in actions:
            start = starts[a["section_id"]] + a["start"]
            stop = start + a["length"]
            covered += max(0, stop-max(end, start))
            end = max(end, stop)
        person_stats.append({"id": person["id"], "elements": len(unique), "actions": len(actions), "unplanned": round(beat-covered, 2)})
    duration = p["music"]["duration"]
    if duration is not None and duration > 300:
        warnings.append({"kind": "rule", "text": "Die Musik ist länger als 5 Minuten (Weisungen 2026, Abschnitt 3)."})
    elif duration is None:
        warnings.append({"kind": "info", "text": "Musikdauer noch unbekannt. Die 5-Minuten-Grenze bezieht sich auf das gesamte Musikstück."})
    if duration is not None and time + p["music"]["offset"] > duration + 0.05:
        warnings.append({"kind": "timing", "text": "Das geplante Programm endet nach dem Musikstück. Tempo, Länge oder Musikversatz prüfen."})
    if duration is None and time > 300:
        warnings.append({"kind": "timing", "text": "Die berechnete Programmdauer überschreitet 5 Minuten."})
    count = len(p["people"])
    if (p["mode"] == "VGT" and count < 6) or (p["mode"] == "VKT" and not 3 <= count <= 5):
        warnings.append({"kind": "rule", "text": "Teilnehmendenzahl prüfen: VGT mindestens 6, Klein-Team 3 bis 5 (Weisungen 2.6)."})
    limit = 6 if p["mode"] == "VGT" else 2
    if sum(s["kind"] == "bar" for s in p["stations"]) > limit:
        warnings.append({"kind": "rule", "text": f"Mehr als {limit} Barren geplant. Materialliste BA / Wettkampfvorschriften des Anlasses prüfen."})
    part_stats = [{"id": part["id"], "uses": sum(a["part_id"] == part["id"] for a in p["actions"]), "performances": sum(len(a["people"]) for a in p["actions"] if a["part_id"] == part["id"])} for part in p["parts"]]
    return {"beats": beat, "seconds": time, "people": person_stats, "parts": part_stats, "warnings": warnings}
