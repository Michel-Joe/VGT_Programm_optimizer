import copy
import tempfile
import unittest
from pathlib import Path

from app import Store
from planner import analyse, demo_project, validate_project


class PlannerTests(unittest.TestCase):
    def setUp(self):
        self.p = demo_project()

    def test_demo_valid_and_timing(self):
        validate_project(self.p)
        report = analyse(self.p)
        self.assertEqual(report["beats"], 64)
        self.assertAlmostEqual(report["seconds"], 64 * 60 / 52)
        self.assertFalse(any(w["kind"] == "conflict" for w in report["warnings"]))
        self.assertTrue(all(p["unplanned"] == 0 for p in report["people"]))

    def test_optional_chief_is_backwards_compatible_and_must_participate(self):
        validate_project(self.p)  # Existing projects do not need migration.
        self.p["actions"][0]["leader_id"] = "p1"
        validate_project(self.p)
        self.p["actions"][0]["leader_id"] = "p2"
        with self.assertRaisesRegex(ValueError, "Chef"):
            validate_project(self.p)
        self.p["actions"][0]["leader_id"] = "missing"
        with self.assertRaisesRegex(ValueError, "Chef"):
            validate_project(self.p)

    def test_chief_roundtrip(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory) / "chief.sqlite3")
            self.p["actions"][0]["leader_id"] = "p1"
            store.save(self.p, 1)
            self.assertEqual(store.read()["project"]["actions"][0]["leader_id"], "p1")

    def test_tempo_per_section(self):
        self.p["sections"][0]["bpm"] = 60
        self.assertAlmostEqual(analyse(self.p)["seconds"], 8 + 56 * 60 / 52)

    def test_distinct_elements_are_per_person_and_main_apparatus(self):
        a = self.p["actions"][0]
        a["elements"] = [{"name": "Kippe", "countable": True}, {"name": " KIPPE ", "countable": True}, {"name": "Schwung", "countable": False}]
        self.p["actions"][1]["elements"] = [{"name": "Rad", "countable": True}]
        report = analyse(self.p)
        self.assertEqual(report["people"][0]["elements"], 1)
        self.assertEqual(report["people"][1]["elements"], 0)
        a["station_id"] = "side1"
        self.assertEqual(analyse(self.p)["people"][0]["elements"], 0)

    def test_overlap_detection_boundary_and_union_coverage(self):
        base = copy.deepcopy(self.p["actions"][0])
        base.update(id="extra", start=15.5, length=0.5, cues=[])
        self.p["actions"].append(base)
        validate_project(self.p)
        report = analyse(self.p)
        self.assertEqual(len([w for w in report["warnings"] if w["kind"] == "conflict"]), 1)
        self.assertEqual(report["people"][0]["unplanned"], 0)
        base.update(section_id="s2", start=0, length=0.5, people=["p2"])
        self.assertEqual(len([w for w in analyse(self.p)["warnings"] if w["kind"] == "conflict"]), 1)

    def test_group_placement_and_performance_counts(self):
        report = analyse(self.p)
        part = next(p for p in report["parts"] if p["id"] == "part3")
        self.assertEqual(part["uses"], 3)
        self.assertEqual(part["performances"], 24)

    def test_adjacent_actions_are_not_a_conflict(self):
        a = copy.deepcopy(self.p["actions"][0])
        a.update(length=8, cues=[])
        b = copy.deepcopy(a)
        b.update(id="next", start=8)
        self.p["actions"] = [a, b]
        validate_project(self.p)
        self.assertFalse(any(w["kind"] == "conflict" for w in analyse(self.p)["warnings"]))
        a["length"] = 8.25
        self.assertTrue(any(w["kind"] == "conflict" for w in analyse(self.p)["warnings"]))

    def test_music_limit_is_whole_track(self):
        self.p["music"]["duration"] = 301
        self.assertTrue(any("länger als 5" in w["text"] for w in analyse(self.p)["warnings"]))
        self.p["music"]["duration"] = 300
        self.assertFalse(any("länger als 5" in w["text"] for w in analyse(self.p)["warnings"]))
        self.p["music"]["offset"] = 290
        self.assertTrue(any(w["kind"] == "timing" for w in analyse(self.p)["warnings"]))

    def test_import_rejects_dangling_references_and_nonfinite_values(self):
        for mutate in [
            lambda p: p["actions"][0].update(people=["missing"]),
            lambda p: p["actions"][0].update(length=1000),
            lambda p: p["people"][0]["frames"][0].update(beat=1),
            lambda p: p["sections"][0].update(bpm=float("nan")),
            lambda p: p["actions"][0].update(start=0.1),
            lambda p: p["actions"][0]["cues"][0].update(beat=16),
        ]:
            p = copy.deepcopy(self.p)
            mutate(p)
            with self.subTest(p=p), self.assertRaises(ValueError):
                validate_project(p)

    def test_sqlite_roundtrip_and_concurrent_edit_protection(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory) / "test.sqlite3")
            self.p["name"] = "Änderung – Riege"
            result = store.save(self.p, 1)
            self.assertEqual(result["revision"], 2)
            self.assertEqual(Store(store.path).read()["project"]["name"], self.p["name"])
            with self.assertRaises(RuntimeError):
                store.save(self.p, 1)
            self.assertEqual(store.read()["revision"], 2)


if __name__ == "__main__":
    unittest.main()
