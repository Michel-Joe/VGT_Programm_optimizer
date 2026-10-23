# VGT Studio

Lokaler Prototyp zum Schreiben, Lesen und Proben eines Barrenprogramms im Vereinsgeräteturnen. Deutsche Oberfläche, Python-Backend, SQLite-Speicherung und HTML/CSS/JavaScript-Oberfläche ohne externe Bibliotheken oder Internetverbindung.

## Starten

Python **3.10 oder neuer** genügt für die App. Für den direkten PDF-Export der persönlichen Abläufe zusätzlich einmal `python -m pip install -r requirements.txt` ausführen. Im Projektordner:

```powershell
python app.py
```

Alternativ unter Windows `start.bat` doppelklicken. Der Browser öffnet `http://127.0.0.1:8765`. Die Anwendung läuft, solange der Python-Prozess läuft. Beenden mit `Ctrl+C` im Terminal. Anderen Port verwenden: `python app.py --port 8766`. Ohne automatisches Browserfenster: `python app.py --no-browser`.

Beim ersten Start wird ein deutlich als Beispiel beschriebenes Programm mit acht Turnenden, vier Barren, einem Nebenposten und sechs Abschnitten angelegt. Unter **Programmeinstellungen → Leeres Programm** neu beginnen oder das Beispiel direkt bearbeiten.

## Was der Prototyp kann

- Barrenanzahl und Flächengrösse einstellen; Barren, Trampolin, dünne und dicke Matten, 16er, Kasten und Nebenposten ziehen, drehen und mit ihren tatsächlichen Grundflächen in Metern positionieren.
- Einen massstäblichen A3-Hallenplan als PDF mit Geräteraster, Druckmassstab, Kalibrierstrecke und Massliste exportieren.
- Turnende mit Namen und Farben anlegen und zu jedem Zeitpunkt als Punkte sehen.
- Abschnitte mit frei wählbarer Länge und BPM planen; 8er-, 6er- oder andere Zählgruppen nutzen.
- Parallele Aktionen für einzelne oder mehrere Turnende planen, inklusive Ein-/Ausstiegen, Wegen, Nebenposten und Formationen.
- In der Übungsübersicht direkt einen Abgang/Nebenposten nach einer Übung vorbereiten: Er beginnt am Ende dieser Übung, gegebenenfalls gleichzeitig mit dem Eingang einer anderen Riege in der nächsten Übung. Besetzung, Matte, Dauer und Auftrag bleiben einzeln anpassbar.
- Einsätze und Notizen auf Viertelschläge genau erfassen. Eine Notiz auf 1.5 entspricht dem „und“ nach Schlag 1.
- Bausteine mit Länge, Anweisungen, Schlagnotizen und Elementen wiederverwenden; Platzierungen und Personen-Einsätze getrennt zählen.
- Positionen pro Person und Schlag direkt im Hallenplan mit der Maus setzen; Zielschläge und lineare Laufwege darstellen oder Positionen bis zum nächsten Zeitpunkt halten.
- Musik lokal laden, Startversatz setzen und den Ablauf abspielen. Ohne Musik läuft eine BPM-basierte Vorschau.
- Alle Übungen in einer eigenen Übersicht mit vollständiger Elementfolge lesen; Kanon-Einsätze als Startbalken je Person und Gerät vergleichen.
- Das Feld in einer eigenen grossen Ansicht verfolgen und dort Positionen geschützt bearbeiten.
- Person filtern, ihren Barren, Mitturnende und Chef sehen sowie den persönlichen Ablauf mit vollständiger Elementfolge direkt als PDF oder CSV exportieren.
- Automatisch speichern, Änderungen rückgängig machen, vollständige Projekte als JSON sichern/importieren.
- Überlappende Aufträge derselben Person, unverplante Schläge, Elementvielfalt, Musikdauer, Gruppengrösse und Barrenanzahl prüfen.

## Schreibansicht (Version 03)

Die Hauptansicht ist ein Trainer-Arbeitsplatz: **Davor – Jetzt – Danach** zeigt die letzten abgeschlossenen, aktuell laufenden und nächsten Übungen je Turner, auch über Abschnittsgrenzen hinweg. Ohne Auftrag wird eine Lücke angezeigt; gleichzeitige Aufträge bleiben sichtbar. Die Koordinaten unter dem Namen entsprechen der geplanten Position auf dem gewählten Schlag. Der zugeteilte Posten steht separat bei der Übung.

Ein Feld für den absoluten Schlag, Einzelschritte und die Navigation zum nächsten/vorherigen Einsatz steuern Übersicht und Feld gemeinsam. Die Einsatznavigation berücksichtigt auch Schlagnotizen und Positionspunkte. Neue Übungen werden am aktuellen Schlag begonnen; die Zeitleiste ist bei Bedarf aufklappbar.

**Chef** wird pro Aktion aus deren beteiligten Turnenden gewählt. Die Rolle wird in der Übersicht, im Detail, im persönlichen Ablauf und im CSV angezeigt. Während des Einsatzes markiert ein Stern die Person auf dem Feld. Bestehende Programme bleiben gültig und zeigen ohne Zuweisung „Noch offen“.

**Positionsschutz:** Im Normalmodus wählt ein Klick nur einen Turner aus. Erst „Positionen bearbeiten“ aktiviert das Ziehen. Mehrere Änderungen können am festgehaltenen Schlag in der Vorschau ausprobiert werden. „Übernehmen & sperren“ speichert sie gemeinsam; „Verwerfen“ oder Escape stellt den vorherigen Stand wieder her. Während der Vorschau sind Navigation und andere Bearbeitungen gesperrt. Kleine Mausbewegungen unter sechs Pixeln gelten nicht als Ziehen. Ein Rückgängig-Schritt setzt eine übernommene Positionsbearbeitung zurück.

Die **Geräteaufstellung** ist eine separate Einrichtung pro Programm. Geräte sind dort zunächst ebenfalls gesperrt; Änderungen wirken auf alle Schläge. Bestehende Turnerpositionen werden beim Verschieben eines Geräts nicht mitverschoben.

Unter **Geräte & Laufwege** zeigt das Raster Meterkoordinaten. Für jedes Gerät können reale Breite, Tiefe, Mittelpunkt und Drehung eingegeben werden. Die Vorgabemasse sind ausdrücklich nur Beispiele; für einen in die Halle übertragbaren Plan müssen die tatsächlichen Geräte- und Mattenflächen vor Ort gemessen und im Editor als bestätigt markiert werden. Der Export **Massplan als PDF** wählt einen passenden A3-Druckmassstab (bei der Demo 1:100), enthält eine 5-m-Kalibrierstrecke und listet offene Masse sowie ausserhalb der Fläche liegende Geräte auf. Beim Drucken **100 % / tatsächliche Grösse** einstellen und die Kalibrierstrecke mit dem Lineal prüfen. Der Ausdruck ist massstäblich, nicht in Papiergrösse 1:1; die angegebenen Meterkoordinaten und Abstände sind für die Aufstellung massgebend.

In derselben Ansicht den gewünschten **Schlag** und optional einen **Turner** wählen, dann **Turnerpositionen bearbeiten** einschalten. Punkte lassen sich nur in diesem Modus ziehen; **Übernehmen & sperren** fixiert alle geänderten Positionen auf dem gewählten Schlag. Den Ankunftsschlag anwählen, die Person dorthin ziehen und erneut übernehmen: Zwischen den Fixpunkten wird der Laufweg gezeichnet, die Zielschläge stehen am Weg und in der Positionsliste. **Verwerfen** lässt die gespeicherten Punkte unverändert. Der Filter hebt den persönlichen Weg hervor; der PDF-Plan übernimmt gewählten Schlag und Turner.

Geräte können in der Aufstellung auf der Fläche oder in der Liste ausgewählt, mit `Ctrl+C` kopiert und mit `Ctrl+V` eingefügt werden. „Kopieren“ und „Einfügen“ sind auch als Schaltflächen vorhanden. Die Kopie erscheint leicht versetzt und erhält die nächste freie höhere Nummer ihres Namens, etwa „Matte dünn 4“ nach „Matte dünn 3“. Sie kann danach wie jedes andere Gerät verschoben oder bearbeitet werden.

Im Übungseditor wird zuerst die Dauer (`1x8`, `2x8 + 1x4` usw.) und dann die Elementfolge erfasst. Unter „Besetzung & Position“ kann jeder Person ein eigenes Gerät und ein Startversatz für Kanonfolgen zugeteilt werden. Auf Wunsch wird ihre Feldposition am tatsächlichen Startschlag direkt am Gerätezentrum gespeichert. Eine Übung bleibt eine gemeinsame Aktion; ein Versatz verschiebt den persönlichen Einsatz, nicht die Elementfolge der anderen.

Übungen, Turnende und Geräte werden ohne weitere Nachfrage gelöscht. Das Löschen ist mit „Rückgängig“ bzw. `Ctrl+Z` rückgängig zu machen. Abschnitte können nach ihrer Erstellung weiterhin bearbeitet werden; ihre Länge wird als 8er-Folge eingegeben.

## Empfohlener Ablauf

1. In den Einstellungen Programmname, Verein, Fläche, Barrenanzahl und Zählgruppe festlegen.
2. Unter **Turnende** die Riege erfassen.
3. **Geräteaufstellung → Geräte bearbeiten** wählen. Ein Klick auf ein Gerät öffnet genaue Koordinaten und Drehung; Ziehen verschiebt es. Anschliessend zurück zum Schreiben wechseln.
4. Abschnitte anlegen und für jeden Abschnitt Aktionen schreiben. Alle Schläge im Aktionseditor sind relativ zum Abschnitt, Schlagnotizen relativ zur Aktion.
5. Für einen Weg den Zeitregler auf den Wegbeginn stellen und **Positionen bearbeiten** wählen. Turner ziehen, dann **Übernehmen & sperren**. Am Ankunftsschlag erneut platzieren und übernehmen. Für Standphasen den Übergang **Vorherige Position bis hier halten** nutzen. Alle Punkte sind unter **Turnende → Positionen** auch numerisch editierbar und löschbar.
6. Wiederkehrende Aktionen **Als Baustein** speichern. Unter **Bausteine** erneut einfügen und Besetzung/Posten wählen.
7. Musik laden. In den Einstellungen den Zeitpunkt des ersten gezählten Schlags im Musikstück setzen. Ein Tempo pro Abschnitt; Tempoänderungen erfordern neue Abschnitte.
8. In „Übungsübersicht“ die gesamte Folge kontrollieren und in „Grosses Feld“ Positionen und Wege prüfen. Person filtern und ihren vollständigen Ablauf direkt als PDF exportieren. Im Programmcheck offene Angaben ergänzen und manuelle Prüfpunkte bearbeiten.

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
- Der Hallenplan ist nur so genau wie die vor Ort gemessenen Geräte- und Mattenmasse. Personenpositionen werden nur auf ausdrücklichen Wunsch beim Übungsstart ans Gerät gesetzt; danach besteht keine automatische Bindung an verschobene Geräte, keine Geräteanimation und keine Kollisionserkennung. Laufwege sind geradlinige Planungslinien zwischen Fixpunkten, keine automatische Wegsuche um Geräte.
- Programmcheck für Barren (BA), kein vollständiger Prüfer für andere Disziplinen, Altersgruppen oder Anlassreglemente. Sicherheit, Matten und Materialfreigaben müssen vor Ort geprüft werden.
- Ein aktives Programm pro Datenbank, kein Mehrbenutzer-/Cloudbetrieb. Mehrere Programme über JSON-Dateien oder separate Datenbanken (`--db pfad.sqlite3`).
- Der Server bindet ausschliesslich an `127.0.0.1`. Keine Installation von Webframeworks, keine CDN- oder Schrift-Downloads.

## Prüfen

```powershell
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
```

Die Tests decken unter anderem Speicherung mit konkurrierenden Revisionen, Importvalidierung, Kanon-Versätze, Gerätezuordnung, gemischte Übungsdauern, PDF-Inhalte, Musiklimits, Positionsinterpolation und Abschnittsänderungen ab.

## Projektstruktur

### Kompakter Übungseditor

Übungen und Bausteine werden über Dauer und eine freie Elementfolge geschrieben (angelehnt an `TS26.pdf`). Die Dauer akzeptiert beispielsweise `1x8`, `2x8`, `3x8 + 7` oder einzelne Schläge. Eine Zeile wie `7 Arme` oder `8 Einsprung` erzeugt eine Schlagmarke relativ zum Übungsbeginn; im zweiten 8er läuft die Zählung mit 9 weiter. Zeilen ohne führende Schlagzahl bleiben freie Elementfolgen ohne automatisch zugewiesenen Zeitpunkt. Sie erscheinen auch im persönlichen Ablauf, beim Drucken und im CSV-Export.

Turnende, Gerät, Chef, persönlicher Startversatz und zusätzliche Bemerkungen sind aufklappbar. Eine längere Übung kann den Abschnitt nur nach ausdrücklicher Bestätigung verlängern; nachfolgende Abschnitte und Positionspunkte verschieben sich dann gemeinsam. Alte Schlagnotizen bleiben erhalten und werden beim Öffnen als Textzeilen angezeigt. Freie Elementfolgen werden nicht automatisch als zählende Wettkampfelemente gewertet.

```text
app.py                 Lokaler HTTP-Server und SQLite-Speicher
planner.py             Beispieldaten, Validierung und Auswertung
static/index.html      App-Einstieg
static/app.js          Oberfläche, Bearbeitung und Wiedergabe
static/writer.js       Schreibansicht, Einsatzkontext und Geräteaufstellung
static/overview.js     Übungsübersicht und persönlicher Ablauf
static/equipment.js    Gerätearten und Feldsymbole
static/writer.css      Trainer-Arbeitsplatz und responsive Darstellung
static/domain.js       Zeit- und Positionsmodell
static/style.css       Gestaltung und Drucklayout
pdf_export.py          Direkter persönlicher PDF-Export
tests/                 Python- und JavaScript-Tests
start.bat              Windows-Start per Doppelklick
```
