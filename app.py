"""Local VGT planner. Python 3.10+, standard library only."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from contextlib import closing
from urllib.parse import urlparse
import argparse
import json
import mimetypes
import sqlite3
import threading
import webbrowser

from planner import demo_project, validate_project, analyse

ROOT = Path(__file__).resolve().parent
MAX_BODY = 5 * 1024 * 1024


class Store:
    def __init__(self, path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(path)) as db, db:
            db.execute("CREATE TABLE IF NOT EXISTS project (id INTEGER PRIMARY KEY, revision INTEGER, body TEXT)")
            db.execute("CREATE TABLE IF NOT EXISTS history (revision INTEGER PRIMARY KEY, body TEXT, saved TEXT DEFAULT CURRENT_TIMESTAMP)")
            db.execute("INSERT OR IGNORE INTO project VALUES (1, 1, ?)", (json.dumps(demo_project(), ensure_ascii=False),))

    def read(self):
        with closing(sqlite3.connect(self.path)) as db, db:
            revision, body = db.execute("SELECT revision, body FROM project WHERE id=1").fetchone()
        project = json.loads(body)
        return {"project": project, "revision": revision, "report": analyse(project)}

    def save(self, project, revision):
        validate_project(project)
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("BEGIN IMMEDIATE")
            current, body = db.execute("SELECT revision, body FROM project WHERE id=1").fetchone()
            if revision != current:
                raise RuntimeError("Das Programm wurde in einem anderen Fenster geändert. Exportiere deinen Stand und lade die Seite neu.")
            db.execute("INSERT OR REPLACE INTO history (revision, body) VALUES (?, ?)", (current, body))
            db.execute("DELETE FROM history WHERE revision < ?", (current - 49,))
            db.execute("UPDATE project SET revision=?, body=? WHERE id=1", (current + 1, json.dumps(project, ensure_ascii=False)))
        return {"revision": current + 1, "report": analyse(project)}


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, content, content_type="application/json; charset=utf-8"):
        if isinstance(content, (dict, list)):
            content = json.dumps(content, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        url = urlparse(self.path).path
        if url == "/api/project":
            return self.respond(200, self.server.store.read())
        if url == "/api/health":
            return self.respond(200, {"ok": True})
        allowed = {"/": "index.html", "/app.js": "app.js", "/domain.js": "domain.js", "/style.css": "style.css"}
        if url not in allowed:
            return self.respond(404, {"error": "Nicht gefunden"})
        path = ROOT / "static" / allowed[url]
        mime = "text/javascript" if path.suffix == ".js" else mimetypes.guess_type(path)[0]
        self.respond(200, path.read_bytes(), f"{mime}; charset=utf-8")

    def do_POST(self):
        # Local service: reject browser requests from foreign origins / DNS rebinding.
        host = self.headers.get("Host", "")
        expected = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if host not in expected or self.headers.get("Origin", f"http://{host}") != f"http://{host}":
            return self.respond(403, {"error": "Nur lokale Zugriffe sind erlaubt."})
        if self.path != "/api/project":
            return self.respond(404, {"error": "Nicht gefunden"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY:
                raise ValueError("Die Projektdatei darf höchstens 5 MB gross sein.")
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or type(data.get("revision")) is not int:
                raise ValueError("Ungültige Projektdaten.")
            result = self.server.store.save(data.get("project"), data["revision"])
            self.respond(200, result)
        except RuntimeError as error:
            self.respond(409, {"error": str(error)})
        except (ValueError, KeyError, TypeError) as error:
            self.respond(400, {"error": str(error)})


def main():
    parser = argparse.ArgumentParser(description="VGT Studio – lokaler Programmplaner")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--db", type=Path, default=ROOT / "data" / "vgt.sqlite3")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.store = Store(args.db)
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"VGT Studio: {url}\nDatenbank: {args.db}\nBeenden mit Ctrl+C", flush=True)
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
