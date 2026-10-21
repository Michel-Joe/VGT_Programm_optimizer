import {sections,totalBeats,beatToSeconds,formatTime,countLabel,globalActions,personMoment,cueAt} from './domain.js';
import {freeSequence,durationText} from './exercise.js';
import {canonView} from './overview.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=(p,id)=>p.people.find(person=>person.id===id)?.name||'Noch offen';

export function chiefLabel(project, action) {
  return action.leader_id ? nameOf(project,action.leader_id) : 'Noch offen';
}

function actionCell(p,a,phase,beat,personId) {
  const station=p.stations.find(s=>s.id===a.station_id);
  const cue=phase==='current'?cueAt(a,beat):null;
  return `<div class="moment-action ${phase} ${a.kind}">
    <button data-do="select-action" data-id="${esc(a.id)}" class="moment-title">${esc(a.title)}</button>
    <small>${esc(a.section.name)} · Schlag ${a.start+1} · ${a.length} Schläge</small>
    <span class="moment-post">${esc(station?.name||'Freie Fläche')} <span>· ${formatTime(beatToSeconds(p,a.globalStart)+p.music.offset,true)}</span></span>
    ${phase==='current'?`<span class="chief-badge ${a.leader_id===personId?'is-chief':''}">${a.leader_id===personId?'★ Chef':'Chef: '+esc(chiefLabel(p,a))}</span>${cue?`<p class="moment-cue"><b>${a.start+cue.beat+1}</b> ${esc(cue.text)}</p>`:a.note?`<p class="moment-cue">${esc(a.note)}</p>`:''}<button class="moment-edit" data-do="edit-action" data-id="${esc(a.id)}">Übung bearbeiten ↗</button>`:''}
    ${phase==='current'&&freeSequence(a)?`<div class="free-sequence"><small>Freie Elementfolge · ohne genaue Schlagzuordnung</small><p>${esc(freeSequence(a))}</p></div>`:''}
  </div>`;
}

export function momentRows(state) {
  const p=state.project, all=globalActions(p), beat=state.beat;
  return p.people.filter(person=>!state.person||person.id===state.person).map(person=>{
    const m=personMoment(p,person,beat,all);
    return `<tr><th scope="row"><button class="writer-person" data-do="filter-person" data-id="${esc(person.id)}"><i class="avatar" style="--person-color:${person.color}">${esc(person.name[0])}</i>${esc(person.name)}</button><span class="physical-position">x ${m.position.x.toFixed(1)} · y ${m.position.y.toFixed(1)} m</span></th>
      <td class="previous-cell">${m.previous.map(a=>actionCell(p,a,'previous',beat,person.id)).join('')||'<span class="quiet-empty">Noch keine vorherige Übung</span>'}</td>
      <td class="current-cell">${m.current.length>1?'<span class="overlap-label">Zeitgleiche Aufträge prüfen</span>':''}${m.current.map(a=>actionCell(p,a,'current',beat,person.id)).join('')||`<div class="unplanned"><span>${beat>=totalBeats(p)?'Programmende':'Noch kein Auftrag'}</span>${beat<totalBeats(p)?`<button data-do="write-person" data-id="${esc(person.id)}">+ Hier planen</button>`:''}</div>`}</td>
      <td>${m.next.map(a=>actionCell(p,a,'next',beat,person.id)).join('')||'<span class="quiet-empty">Keine weitere Übung geplant</span>'}</td></tr>`;
  }).join('')||'<tr><td colspan="4" class="empty">Zuerst unter „Turnende“ deine Riege erfassen.</td></tr>';
}

export function writerView(state,ui) {
  const {btn,icon,option,personOptions,floorSvg,timelineView}=ui,p=state.project,ss=sections(p);
  const s=ss.find(s=>s.id===state.section)||ss[0],editing=!!state.positionEdit;
  return `<div class="page-heading writer-heading"><div><div class="eyebrow">TRAINER-ARBEITSPLATZ</div><h1>${esc(p.name)}</h1><p>Programm schreiben. Einsätze abstimmen. Den Stand auf jedem Schlag sehen.</p></div><div class="heading-actions" ${editing?'inert':''}>${btn('setup','Geräteaufstellung','outline')}${btn('new-action',`${icon('plus')} Übung schreiben`,'primary')}</div></div>
    <div class="writer-sections" ${editing?'inert':''}>${ss.map((s,i)=>btn('section',`<span>${String(i+1).padStart(2,'0')}</span><b>${esc(s.name)}</b><small>${esc(durationText(s.beats))}</small>`,`section-tab ${state.section===s.id?'active':''}`,`data-id="${esc(s.id)}"`)).join('')}${btn('new-section','+ Abschnitt','section-tab add-section')}</div>
    <section class="panel writer-transport" ${editing?'inert':''}>
      <div class="time-heading"><div><span class="eyebrow">PROGRAMMPOSITION</span><strong id="writer-time">Schlag ${state.beat+1}</strong></div><div class="time-stepper">${btn('step','−1','small-button','data-step="-1" aria-label="Einen Schlag zurück"')}<label>Schlag<input id="beat-input" type="number" min="1" max="${totalBeats(p)+1}" step="0.25" value="${state.beat+1}" aria-label="Absoluter Schlag"></label>${btn('step','+1','small-button','data-step="1" aria-label="Einen Schlag weiter"')}</div><span class="writer-count" id="writer-count">Gruppe ${countLabel(p,state.beat)}</span><div class="event-nav">${btn('event-prev','← Vorheriger Einsatz','outline')}${btn('event-next','Nächster Einsatz →','outline')}</div></div>
      <div class="transport"><div class="play-controls">${btn('rewind','↤','icon-button','aria-label="Zum Programmanfang"')}${btn('play',icon(state.playing?'pause':'play'),'play-button','id="play-toggle" aria-label="Abspielen oder pausieren"')}<strong id="current-time">0:00</strong><small>/ ${formatTime(beatToSeconds(p,totalBeats(p)))}</small></div><div class="scrub"><div><span id="count-label"></span><span id="beat-label"></span></div><input id="scrubber" type="range" min="0" max="${totalBeats(p)}" step="0.25" value="${state.beat}" aria-label="Programmposition"></div><div class="tempo"><strong id="tempo-label">${s.bpm}</strong><small>BPM</small></div>${btn('music',state.audioReady?'Musik wechseln':'Musik laden','outline')}</div>
    </section>
    <div class="writer-grid">
      <section class="panel writing-board" ${editing?'inert':''}><div class="panel-heading"><div><h2>Wer macht was?</h2><small id="writer-section">${esc(s.name)} · Schlag ${state.beat-s.start+1} im Abschnitt</small></div><select id="person-filter" aria-label="Turner filtern">${personOptions(state.person)}</select></div>
      <div class="writing-table-wrap"><table class="writing-table"><thead><tr><th>Turner / Position</th><th>Davor</th><th>Jetzt <span class="tiny-dot"></span></th><th>Danach</th></tr></thead><tbody id="moment-rows">${momentRows(state)}</tbody></table></div>
      <div class="writing-tools"><select id="insert-part" aria-label="Baustein einfügen">${option('','Baustein einfügen …','')}${p.parts.map(part=>option(part.id,part.name,'')).join('')}</select>${btn('new-action','+ Übung an dieser Stelle','primary')}${btn('edit-section','Abschnitt bearbeiten','text-button',`data-id="${esc(s.id)}"`)}</div><p class="writer-note">${esc(s.note)||'Noch keine Regie-Notiz für diesen Abschnitt.'}</p></section>
      <aside class="writer-stage-column"><section class="panel floor-panel writer-floor ${editing?'editing-positions':''}"><div class="panel-heading"><div><h2>Positionen auf dem Feld</h2><small id="floor-caption"></small></div><span class="lock-badge ${editing?'unlocked':''}">${editing?'Bearbeitung aktiv':'Gesperrt'}</span></div>
        <div id="floor" class="floor-container">${floorSvg()}</div><div class="floor-bottom"><span>${p.floor.width} × ${p.floor.height} m · Draufsicht</span><span>★ Chef des aktuellen Einsatzes</span></div>
        ${editing?`<div class="position-edit-toolbar"><strong>Vorschau auf Schlag ${state.positionEdit.beat+1}</strong><p>Turner ziehen. Änderungen werden erst mit „Übernehmen“ gespeichert.</p><label>Übergang<select id="transition" aria-label="Bewegung zur Position">${option('linear','Weg von vorheriger Position',state.transition)}${option('hold','Vorherige Position bis hier halten',state.transition)}</select></label><div class="split-buttons">${btn('cancel-positions','Verwerfen','outline')}${btn('apply-positions','Übernehmen & sperren','primary')}</div></div>`:`<div class="position-lock-toolbar"><p>Ein Klick wählt einen Turner. Verschieben ist gesperrt.</p>${btn('unlock-positions','Positionen bearbeiten','outline full')}</div>`}
      </section><div class="panel writer-detail" id="writer-detail" ${editing?'inert':''}>${selectionDetail(state,ui)}</div></aside>
    </div>
    <details open class="panel writer-timeline" ${editing?'inert':''}><summary>Zeitleiste im Abschnitt <span>Parallele Übungen und Dauern</span></summary><div class="timeline-scroll">${timelineView()}</div></details>`;
}

export function selectionDetail(state,{btn}) {
  const p=state.project,a=p.actions.find(a=>a.id===state.selected);
  if(!a)return `<div class="detail-placeholder"><strong>Schreiben mit Zusammenhang</strong><p>Die Übersicht berücksichtigt auch Übungen aus vorherigen und folgenden Abschnitten. Wähle eine Übung für Details oder schreibe direkt an der aktuellen Stelle weiter.</p></div>`;
  const sec=sections(p).find(s=>s.id===a.section_id),active=sec.start+a.start<=state.beat&&state.beat<sec.start+a.start+a.length;
  return `<div class="panel-heading"><h2>${active?'Aktueller Einsatz':'Ausgewählte Übung'}</h2>${btn('clear-selection','×','small-button','aria-label="Auswahl aufheben"')}</div><div class="writer-detail-body"><h3>${esc(a.title)}</h3><span class="chief-badge">Chef: ${esc(chiefLabel(p,a))}</span><p>${esc(a.note)||'Noch keine Anweisung.'}</p><p>${a.people.map(id=>esc(nameOf(p,id))).join(', ')}</p>${freeSequence(a)?`<div class="free-sequence"><small>Freie Elementfolge · ohne genaue Schlagzuordnung</small><p>${esc(freeSequence(a))}</p></div>`:""}<div class="cue-list">${a.cues.map(c=>`<div><span>${a.start+c.beat+1}</span><p>${esc(c.text)}</p></div>`).join('')}</div>${canonView(p,{...a,globalStart:sec.start+a.start},state.beat)}<div class="split-buttons">${btn('edit-action','Bearbeiten','primary',`data-id="${esc(a.id)}"`)}${btn('action-to-part','Als Baustein','outline',`data-id="${esc(a.id)}"`)}</div></div>`;
}

export function setupView(state,{btn,floorSvg}) {
  const p=state.project;
  return `<div class="page-heading"><div><div class="eyebrow">EINRICHTUNG PRO PROGRAMM</div><h1>Geräteaufstellung</h1><p>Einmal einrichten, jederzeit anpassen. Diese Aufstellung gilt für das ganze Programm.</p></div>${btn('back-writing','← Zurück zum Schreiben','primary')}</div><div class="setup-grid"><section class="panel floor-panel"><div class="panel-heading"><h2>Fläche & Geräte</h2>${btn('toggle-layout',state.floorMode==='layout'?'Geräte wieder sperren':'Geräte bearbeiten',state.floorMode==='layout'?'primary':'outline')}</div><div class="floor-container">${floorSvg()}</div><div class="floor-hint">${state.floorMode==='layout'?'Geräte ziehen oder zum Drehen anklicken. Die Änderung gilt für alle Schläge.':'Geräte sind gesperrt. Zum Verschieben zuerst „Geräte bearbeiten“ aktivieren.'} Turnerpositionen ändern sich hier nicht mit.</div></section><section class="panel setup-list"><div class="panel-heading"><h2>${p.stations.filter(s=>s.kind==='bar').length} Barren · ${p.floor.width} × ${p.floor.height} m</h2></div><div class="setup-actions">${btn('settings','Anzahl & Fläche einstellen','outline')}${btn('new-station','+ Gerät / Nebenposten','outline')}</div>${p.stations.map(s=>`<div class="station-list-row"><div><strong>${esc(s.name)}</strong><small>x ${s.x} · y ${s.y} m · ${s.rotation}°</small></div><div>${btn('edit-station','Bearbeiten','text-button',`data-id="${esc(s.id)}"`)} ${btn('delete-station','Löschen','text-button danger',`data-id="${esc(s.id)}"`)}</div></div>`).join('')}</section></div>`;
}
