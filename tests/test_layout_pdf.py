from io import BytesIO
import unittest

from pypdf import PdfReader

from layout_export import choose_scale, export_layout, outside_stations, position_at, station_corners
from planner import demo_project, validate_project


class LayoutPdfTests(unittest.TestCase):
    def test_plan_scale_and_dimensions(self):
        self.assertEqual(choose_scale(18, 14), 100)
        self.assertEqual(choose_scale(50, 50), 250)
        station = {"kind": "mat_thin", "name": "Matte 1", "x": 5, "y": 6,
                   "width": 2, "depth": 1, "rotation": 0}
        self.assertEqual(station_corners(station), [(4, 5.5), (6, 5.5), (6, 6.5), (4, 6.5)])
        station["rotation"] = 90
        xs = [x for x, _ in station_corners(station)]
        ys = [y for _, y in station_corners(station)]
        self.assertAlmostEqual(max(xs)-min(xs), 1)
        self.assertAlmostEqual(max(ys)-min(ys), 2)

    def test_routes_and_boundary_flags(self):
        p = demo_project()
        self.assertEqual(position_at(p["people"][0], 4), (2.5, 7.5))
        self.assertEqual(position_at(p["people"][0], 16), (3, 4.5))
        self.assertEqual(outside_stations(p), [])
        p["stations"][0].update(x=0, width=2, depth=2, measured=True)
        self.assertEqual(outside_stations(p), ["Barren 1"])
        validate_project(p)
        p["stations"][0]["measured"] = "ja"
        with self.assertRaisesRegex(ValueError, "Massbestätigung"):
            validate_project(p)

    def test_pdf_contains_print_scale_and_placement_table(self):
        p = demo_project()
        p["stations"][0].update(width=1.65, depth=3.2, measured=True)
        reader = PdfReader(BytesIO(export_layout(p, beat=8, person_id="p1")))
        self.assertGreaterEqual(len(reader.pages), 2)
        text = "\n".join(page.extract_text() for page in reader.pages)
        for expected in ["Massstab 1:100", "Prüfleiste: 5 m = 50 mm", "Barren 1", "1.65 x 3.2 m",
                         "Laufweg und Zielschläge: Luca", "Schlag 9", "Beispielmasse"]:
            self.assertIn(expected, text)
        with self.assertRaisesRegex(ValueError, "Viertelschlag"):
            export_layout(p, beat=.1)
        with self.assertRaisesRegex(ValueError, "Turner"):
            export_layout(p, person_id="missing")


if __name__ == "__main__":
    unittest.main()
