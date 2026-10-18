# VGT Studio

Lokaler Prototyp zum Schreiben, Lesen und Proben eines Barrenprogramms im Vereinsgeräteturnen. Deutsche Oberfläche, Python-Backend, SQLite-Speicherung und HTML/CSS/JavaScript-Oberfläche ohne externe Bibliotheken oder Internetverbindung.

## Starten

Python **3.10 oder neuer** genügt. Im Projektordner:

```powershell
python app.py
```

Alternativ unter Windows `start.bat` doppelklicken. Der Browser öffnet `http://127.0.0.1:8765`. Die Anwendung läuft, solange der Python-Prozess läuft. Beenden mit `Ctrl+C` im Terminal. Anderen Port verwenden: `python app.py --port 8766`. Ohne automatisches Browserfenster: `python app.py --no-browser`.

Beim ersten Start wird ein deutlich als Beispiel beschriebenes Programm mit acht Turnenden, vier Barren, einem Nebenposten und sechs Abschnitten angelegt. Unter **Programmeinstellungen → Leeres Programm** neu beginnen oder das Beispiel direkt bearbeiten.

## Was der Prototyp kann

- Barrenanzahl und Flächengrösse einstellen; Barren/Nebenposten ziehen, drehen und in Metern positionieren.
- Turnende mit Namen und Farben anlegen und zu jedem Zeitpunkt als Punkte sehen.
- Abschnitte mit frei wählbarer Länge und BPM planen; 8er-, 6er- oder andere Zählgruppen nutzen.
- Parallele Aktionen für einzelne oder mehrere Turnende planen, inklusive Ein-/Ausstiegen, Wegen, Nebenposten und Formationen.
- Einsätze und Notizen auf Viertelschläge genau erfassen. Eine Notiz auf 1.5 entspricht dem „und“ nach Schlag 1.
- Bausteine mit Länge, Anweisungen, Schlagnotizen und Elementen wiederverwenden; Platzierungen und Personen-Einsätze getrennt zählen.
- Positionen pro Person und Zeitpunkt setzen; Wege linear darstellen oder Positionen bis zum nächsten Zeitpunkt halten.
- Musik lokal laden, Startversatz setzen und den Ablauf abspielen. Ohne Musik läuft eine BPM-basierte Vorschau.
- Person filtern, persönliche Abläufe lesen, als CSV exportieren oder über den Browser drucken / als PDF speichern.
- Automatisch speichern, Änderungen rückgängig machen, vollständige Projekte als JSON sichern/importieren.
- Überlappende Aufträge derselben Person, unverplante Schläge, Elementvielfalt, Musikdauer, Gruppengrösse und Barrenanzahl prüfen.

## Schreibansicht (Version 02)

Die Hauptansicht ist ein Trainer-Arbeitsplatz: **Davor – Jetzt – Danach** zeigt die letzten abgeschlossenen, aktuell laufenden und nächsten Übungen je Turner, auch über Abschnittsgrenzen hinweg. Ohne Auftrag wird eine Lücke angezeigt; gleichzeitige Aufträge bleiben sichtbar. Die Koordinaten unter dem Namen entsprechen der geplanten Position auf dem gewählten Schlag. Der zugeteilte Posten steht separat bei der Übung.

Ein Feld für den absoluten Schlag, Einzelschritte und die Navigation zum nächsten/vorherigen Einsatz steuern Übersicht und Feld gemeinsam. Die Einsatznavigation berücksichtigt auch Schlagnotizen und Positionspunkte. Neue Übungen werden am aktuellen Schlag begonnen; die Zeitleiste ist bei Bedarf aufklappbar.

**Chef** wird pro Aktion aus deren beteiligten Turnenden gewählt. Die Rolle wird in der Übersicht, im Detail, im persönlichen Ablauf und im CSV angezeigt. Während des Einsatzes markiert ein Stern die Person auf dem Feld. Bestehende Programme bleiben gültig und zeigen ohne Zuweisung „Noch offen“.

**Positionsschutz:** Im Normalmodus wählt ein Klick nur einen Turner aus. Erst „Positionen bearbeiten“ aktiviert das Ziehen. Mehrere Änderungen können am festgehaltenen Schlag in der Vorschau ausprobiert werden. „Übernehmen & sperren“ speichert sie gemeinsam; „Verwerfen“ oder Escape stellt den vorherigen Stand wieder her. Während der Vorschau sind Navigation und andere Bearbeitungen gesperrt. Kleine Mausbewegungen unter sechs Pixeln gelten nicht als Ziehen. Ein Rückgängig-Schritt setzt eine übernommene Positionsbearbeitung zurück.

Die **Geräteaufstellung** ist eine separate Einrichtung pro Programm. Geräte sind dort zunächst ebenfalls gesperrt; Änderungen wirken auf alle Schläge. Bestehende Turnerpositionen werden beim Verschieben eines Geräts nicht mitverschoben.

## Empfohlener Ablauf

1. In den Einstellungen Programmname, Verein, Fläche, Barrenanzahl und Zählgruppe festlegen.
2. Unter **Turnende** die Riege erfassen.
3. **Geräteaufstellung → Geräte bearbeiten** wählen. Ein Klick auf ein Gerät öffnet genaue Koordinaten und Drehung; Ziehen verschiebt es. Anschliessend zurück zum Schreiben wechseln.
4. Abschnitte anlegen und für jeden Abschnitt Aktionen schreiben. Alle Schläge im Aktionseditor sind relativ zum Abschnitt, Schlagnotizen relativ zur Aktion.
5. Für einen Weg den Zeitregler auf den Wegbeginn stellen und **Positionen bearbeiten** wählen. Turner ziehen, dann **Übernehmen & sperren**. Am Ankunftsschlag erneut platzieren und übernehmen. Für Standphasen den Übergang **Vorherige Position bis hier halten** nutzen. Alle Punkte sind unter **Turnende → Positionen** auch numerisch editierbar und löschbar.
6. Wiederkehrende Aktionen **Als Baustein** speichern. Unter **Bausteine** erneut einfügen und Besetzung/Posten wählen.
7. Musik laden. In den Einstellungen den Zeitpunkt des ersten gezählten Schlags im Musikstück setzen. Ein Tempo pro Abschnitt; Tempoänderungen erfordern neue Abschnitte.
8. Person filtern und Ablauf drucken. Im Programmcheck offene Angaben ergänzen und manuelle Prüfpunkte bearbeiten.

## Zeitmodell und Änderungsverhalten

Die Speicherung verwendet nullbasierte Schläge; die Oberfläche zeigt Schlag 1 als ersten Schlag. Start 1 und Dauer 8 belegt das Intervall `[1, 9)`: die nächste Aktion darf auf Schlag 9 beginnen. Halbe und Viertelschläge sind zulässig. Der Endpunkt eines Programms mit 64 Schlägen liegt an der Grenze zu Schlag 65.

Abschnitte stehen nacheinander, Aktionen innerhalb eines Abschnitts dürfen parallel liegen. Aktionen beziehen sich auf den Abschnitt; Positionen verwenden absolute Schläge. Verlängert man einen Abschnitt, verschieben sich alle Positionen ab seinem bisherigen Ende. Kürzen wird verhindert, wenn Aktionen oder gespeicherte Positionen abgeschnitten würden. Diese sind zuerst anzupassen. Beim Löschen eines Abschnitts werden dessen Aktionen und Positionen entfernt und nachfolgende Positionen vorgezogen. Rückgängig ist möglich.

Bausteine werden als Kopien eingefügt. Spätere Vorlagenänderungen überschreiben keine bereits geplanten Aktionen. Die Baustein-ID bleibt für die Nutzungszählung verbunden. Beim Löschen einer Vorlage bleiben ihre Aktionen erhalten, verlieren aber diese Verknüpfung. Eine Gruppenaktion mit vier Turnenden zählt als eine Platzierung und vier Personen-Einsätze.

## Bezug auf die bereitgestellten STV-Unterlagen

Grundlage sind ausschliesslich die vom Nutzer bereitgestellten deutschen Ausgaben **Handbuch Vereinsgeräteturnen 2026** und **Weisungen Vereinsgeräteturnen 2026**. Seitenangaben unten sind die gedruckten Seitenzahlen (PDF-Seite jeweils +1).

| Quelle | Umsetzung |
| --- | --- |
| Weisungen, Abschnitt 3, S. 9; Handbuch 3.2, S. 3 | Maximal 5 Minuten; massgebend ist die gesamte Musikdauer, nicht nur der verplante Ausschnitt. |
| Weisungen 3.1.1, S. 9 | Barren: sechs verschiedene Elemente je Person. Nur manuell als zählend markierte Elemente in Barrenaktionen zählen; Nebenposten/Hilfsgeräte ausgeschlossen. |
| Weisungen 2.6, S. 4 | Hinweis für VGT unter sechs Personen bzw. Klein-Team ausserhalb drei bis fünf Personen. Altersberechtigungen werden nicht geprüft. |
| Handbuch 5.1.2, S. 7–8 | Zählgruppen frei wählbar, insbesondere 8 und 6. BPM pro Abschnitt; 52 BPM im Beispiel innerhalb des unverbindlichen Barren-Richtwerts 48–54. |
| Handbuch 5.1.3–5.1.4, S. 8–10 | Regie- und Schlagnotizen für Musikcharakter und Akzente. |
| Handbuch 5.2.3–5.2.4, S. 11–12 | Raumwege, Wechsel und Nutzung der Geräte sichtbar planen; manuelle Prüfpunkte. |
| Handbuch 5.3, S. 12–13 | Formationen, Vielfalt und Sicherheit als manuelle Prüfpunkte. |
| Handbuch 7.1–7.2, S. 15–16 | Materialhinweis BA: VGT sechs Wettkampfbarren, Klein-Team zwei. Keine starre Begrenzung, da Anlassvorschriften massgebend sein können. |
| Weisungen 1.1, S. 2 und 2.5, S. 4 | Anlassvorschriften gehen vor; BA-Fläche ist konfigurierbar, nicht als offizielles 12×12-m-Feld vorausgesetzt. |

Die Elementnamen sind frei eingegeben. Die Software hat keinen offiziellen Elementekatalog und erkennt Schreibvarianten nicht automatisch (nur Gross-/Kleinschreibung und äussere Leerzeichen werden vereinheitlicht). **„Zählend“ muss von der Leitung anhand der Turnsprache geprüft werden.** Demobausteine enthalten deshalb keine vermeintlich automatisch bestätigten Elemente. Die Zählung bewertet weder korrekte Ausführung noch Synchronität und liefert keine Wettkampfnote.

## Speicherung und Grenzen

- Daten: `data/vgt.sqlite3`, automatisch erzeugt. Die letzten 50 vorherigen Speicherstände liegen zusätzlich in der SQLite-Tabelle `history`; eine Wiederherstellungsoberfläche ist noch nicht vorhanden. JSON-Export ist die einfache portable Sicherung.
- Bei gleichzeitigen Änderungen in mehreren Fenstern verhindert eine Revisionsprüfung stilles Überschreiben. Bei Konflikt den ungespeicherten Stand exportieren und die Seite neu laden.
- Ungespeicherte Bearbeitungen werden zusätzlich als Browserentwurf vorgemerkt. Bei einem späteren Start wird dessen Download zur Wiederherstellung angeboten.
- Musik verbleibt im Browser und muss nach dem Neuladen wieder ausgewählt werden. Dateiname, zuletzt gemessene Dauer und Versatz werden gespeichert. Keine Audioanalyse oder automatische Beat-Erkennung.
- Die Flächenansicht ist schematisch. Positionen werden unabhängig von Aktions-/Gerätezuordnungen gesetzt; es gibt keine automatische Bindung an verschobene Geräte, keine Geräteanimation und keine Kollisionserkennung. Geräte haben beispielhafte Symbolabmessungen, Matten sind nicht modelliert.
- Programmcheck für Barren (BA), kein vollständiger Prüfer für andere Disziplinen, Altersgruppen oder Anlassreglemente. Sicherheit, Matten und Materialfreigaben müssen vor Ort geprüft werden.
- Ein aktives Programm pro Datenbank, kein Mehrbenutzer-/Cloudbetrieb. Mehrere Programme über JSON-Dateien oder separate Datenbanken (`--db pfad.sqlite3`).
- Der Server bindet ausschliesslich an `127.0.0.1`. Keine Installation von Webframeworks, keine CDN- oder Schrift-Downloads.

## Prüfen

```powershell
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
```

Die Tests decken Speicherung mit konkurrierenden Revisionen, Importvalidierung, Tempoänderungen, Elementzählung, parallele Aktionen, Musiklimits, Positionsinterpolation und das Verschieben von Positionen bei Abschnittsänderungen ab.

## Projektstruktur

```text
app.py                 Lokaler HTTP-Server und SQLite-Speicher
planner.py             Beispieldaten, Validierung und Auswertung
static/index.html      App-Einstieg
static/app.js          Oberfläche, Bearbeitung und Wiedergabe
static/writer.js       Schreibansicht, Einsatzkontext und Geräteaufstellung
static/writer.css      Trainer-Arbeitsplatz und responsive Darstellung
static/domain.js       Zeit- und Positionsmodell
static/style.css       Gestaltung und Drucklayout
tests/                 Python- und JavaScript-Tests
start.bat              Windows-Start per Doppelklick
```
