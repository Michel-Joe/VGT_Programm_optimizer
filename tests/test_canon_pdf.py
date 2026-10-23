import copy
from io import BytesIO
from pathlib import Path
import unittest
from planner import demo_project, validate_project, analyse, participant_action
from pdf_export import export_program
from pypdf import PdfReader


def fixture():
    p = demo_project()
    a = p["actions"][0]
    a.update(title="Kanon mit Salto", length=8, people=["p1", "p2"], leader_id="p1",
             sequence="7 Arme\n8 Einsprung\nRückschwung, Vorschwung\nSalto rückwärts",
             cues=[{"beat": 6, "text": "Arme"}, {"beat": 7, "text": "Einsprung"}],
             assignments=[{"person_id": "p1", "station_id": "b1", "offset": 0},
                          {"person_id": "p2", "station_id": "b2", "offset": 4}])
    p["actions"] = [a]
    for i, kind in enumerate(["trampoline", "mat_thin", "mat_thick", "mat16", "box"]):
        p["stations"].append({"id": kind, "kind": kind, "name": kind, "x": 2+i*3, "y": 12, "rotation": 0, "width": 2, "depth": 1})
    return p


class CanonTests(unittest.TestCase):
    def test_assignment_validation(self):
        p = fixture()
        validate_project(p)
        self.assertEqual(participant_action(p["actions"][0], "p2")["start"], 4)
        for change in [{"offset": 12}, {"offset": -1}, {"offset": .1}, {"station_id": "missing"}, {"person_id": "p1"}]:
            bad = copy.deepcopy(p)
            bad["actions"][0]["assignments"][1].update(change)
            with self.assertRaises(ValueError):
                validate_project(bad)

    def test_analysis_uses_personal_time_and_device(self):
        p = fixture()
        a = p["actions"][0]
        a["elements"] = [{"name": "Salto", "countable": True}]
        a["assignments"][1]["station_id"] = "mat16"
        report = analyse(p)
        self.assertEqual(report["people"][0]["elements"], 1)
        self.assertEqual(report["people"][1]["elements"], 0)
        other = copy.deepcopy(a)
        other.update(id="other", people=["p2"], leader_id="", start=0, length=4, cues=[], assignments=[{"person_id": "p2", "station_id": "b2", "offset": 0}])
        p["actions"].append(other)
        self.assertFalse(any(w["kind"] == "conflict" for w in analyse(p)["warnings"]))

    def test_exit_over_mat_and_next_entry_can_start_together(self):
        p = fixture()
        first = p["actions"][0]
        first.update(section_id=p["sections"][0]["id"], start=0, length=8, people=["p1"], leader_id="p1",
                     assignments=[{"person_id": "p1", "station_id": "b1", "offset": 0}])
        p["actions"] = [first,
            {"id": "exit", "title": "Schritt über Matte", "section_id": p["sections"][1]["id"],
             "start": 0, "length": 1, "kind": "side", "station_id": "mat_thin", "people": ["p1"],
             "leader_id": "", "part_id": "", "note": "", "sequence": "1 Schritt über Matte",
             "assignments": [{"person_id": "p1", "station_id": "mat_thin", "offset": 0}],
             "cues": [{"beat": 0, "text": "Schritt über Matte"}], "elements": []},
            {"id": "entry", "title": "Eingang", "section_id": p["sections"][1]["id"],
             "start": 0, "length": 1, "kind": "apparatus", "station_id": "b2", "people": ["p2"],
             "leader_id": "", "part_id": "", "note": "", "sequence": "1 Eingang",
             "assignments": [{"person_id": "p2", "station_id": "b2", "offset": 0}],
             "cues": [{"beat": 0, "text": "Eingang"}], "elements": []}]
        validate_project(p)
        self.assertFalse(any(w["kind"] == "conflict" for w in analyse(p)["warnings"]))

    def test_pdf_has_full_sequence_personal_station_chief_and_mates(self):
        p = fixture()
        pdf = export_program(p, "p2")
        text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf)).pages)
        for expected in ["Noah", "Barren 2", "Chef: Luca", "Mit: Luca", "7 Arme", "8 Einsprung", "Salto rückwärts", "Schlag 13", "0:13,85"]:
            self.assertIn(expected, text)
        with self.assertRaises(ValueError):
            export_program(p, "missing")

    def test_long_pdf_splits_without_losing_sequence(self):
        p = fixture()
        p["actions"][0]["sequence"] = "\n".join(f"Freie Folge Nummer {i} mit Rückschwung und Vorschwung" for i in range(120))
        pdf = export_program(p, "p2")
        reader = PdfReader(BytesIO(pdf))
        self.assertGreater(len(reader.pages), 1)
        self.assertIn("Freie Folge Nummer 0", reader.pages[0].extract_text())
        text = "\n".join(page.extract_text() for page in reader.pages)
        self.assertIn("Freie Folge Nummer 119", text)
        Path("tmp/pdfs").mkdir(parents=True, exist_ok=True)
        Path("tmp/pdfs/langtest.pdf").write_bytes(pdf)


if __name__ == "__main__":
    unittest.main()
