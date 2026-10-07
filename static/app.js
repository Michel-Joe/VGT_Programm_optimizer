import {clone, uid, clamp, snap, sections, totalBeats, beatToSeconds, secondsToBeat, positionAt, setFrame, resizeSection, globalActions, scaleAction, formatTime, countLabel} from './domain.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
  parts:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  check:'<path d="m8 12 3 3 5-6M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M15 3h6v6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  play:'<path d="m8 4 12 8-12 8V4Z"/>',
  pause:'<path d="M8 4v16M16 4v16"/>',
  export:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  back:'<path d="m8 5-5 5 5 5M3 10h11a7 7 0 0 1 7 7v3"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.grid}</svg>`;
const kinds = {apparatus:'Am Barren', side:'Nebenposten', travel:'Weg / Wechsel', pose:'Formation'};
const colors = ['#217c70','#de9150','#6273bc','#c66586','#4d96b8','#908347','#966bb6','#b76b53'];
const state = {project:null, revision:0, report:null, tab:'program', section:'', person:'', beat:0, selected:null, floorMode:'view', transition:'linear', playing:false, status:'Laden …', history:[], future:[], version:0, savedVersion:0, saving:false, timer:null, audioUrl:null, audioReady:false, zoom:30};
const audio = $('#audio');
let drag = null, frameRequest = null, playbackOrigin = null;

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),5000); }
function markChanged(before) {
  state.history.push(before); if(state.history.length>40) state.history.shift(); state.future=[];
  state.version++; state.status='Änderungen werden gespeichert …';
  try { localStorage.setItem('vgt-draft', JSON.stringify({revision:state.revision,project:state.project})); } catch {}
  render(); scheduleSave();
}
function mutate(fn) {
  pause(); const before=clone(state.project);
  try { fn(state.project); markChanged(before); return true; }
  catch(error) { state.project=before; toast(error.message); return false; }
}
function scheduleSave() { clearTimeout(state.timer); state.timer=setTimeout(save,400); }
async function save() {
  if(state.saving) return;
  state.saving=true;
  try {
    while(state.savedVersion !== state.version) {
      const version=state.version, project=clone(state.project);
      const response=await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.revision,project})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'Speichern fehlgeschlagen.');
      state.revision=result.revision; state.savedVersion=version;
      if(version===state.version) { state.report=result.report; state.status='Lokal gespeichert'; try {localStorage.removeItem('vgt-draft');} catch {} }
    }
  } catch(error) { state.status='Nicht gespeichert'; toast(error.message); }
  finally { state.saving=false; updateSaveStatus(); if(state.tab==='checks'||state.tab==='parts') renderMain(); }
}
function updateSaveStatus() { const el=$('#save-status'); if(el) {el.textContent=state.status;el.classList.toggle('error',state.status==='Nicht gespeichert');} }
function currentSection() { return sections(state.project).find(s=>s.id===state.section)||sections(state.project)[0]; }
function option(value,label,selected) { return `<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`; }
function btn(action,label,cls='',extra='') { return `<button type="button" class="${cls}" data-do="${action}" ${extra}>${label}</button>`; }
function personOptions(selected,all=true) {return (all?option('','Alle Turnenden',selected):'')+state.project.people.map(p=>option(p.id,p.name,selected)).join('');}
function render() {
  if(!state.project) return;
  const p=state.project;
  $('#app').innerHTML=`<aside class="sidebar">
    <a class="brand" href="/" aria-label="VGT Studio Startseite"><span class="brand-symbol">∥</span><span>VGT<span class="brand-light">studio</span><small>BEWEGUNG PLANEN.</small></span></a>
    <div class="workspace-label">DEIN ARBEITSRAUM</div>
    <nav>${[['program','grid','Programm'],['people','people','Turnende'],['parts','parts','Bausteine'],['checks','check','Programmcheck']].map(([id,i,n])=>btn('tab',`${icon(i)}${n}${id==='checks'?'<span class="nav-dot"></span>':''}`,`nav-item ${state.tab===id?'active':''}`,`data-id="${id}"`)).join('')}</nav>
    <div class="sidebar-bottom"><div class="local-badge"><span class="status-dot"></span> Lokal auf deinem Computer</div><p>Deine Choreografie.<br>Schlag für Schlag.</p>${btn('help','Kurzanleitung ↗','text-button')}</div>
  </aside>
  <div class="workspace"><header class="topbar"><div class="breadcrumb">Arbeitsraum <span>/</span> ${esc(p.club||'Mein Verein')}</div><div class="top-actions"><span id="save-status" class="save-status">${esc(state.status)}</span>${btn('undo',icon('back'),'icon-button','title="Rückgängig (Ctrl+Z)" aria-label="Rückgängig" '+(!state.history.length?'disabled':''))}${btn('export',`${icon('export')} Projekt sichern`,'outline')}${btn('settings',icon('settings'),'icon-button','title="Programmeinstellungen" aria-label="Programmeinstellungen"')}</div></header>
  <main id="main"></main><footer class="app-footer"><span>VGT STUDIO <span class="version">PROTOTYP 01</span></span><span>Planen. Abstimmen. Gemeinsam turnen.</span></footer></div>`;
  renderMain();
}
function renderMain() {
  const el=$('#main'); if(!el) return;
  el.innerHTML=state.tab==='program'?programView():state.tab==='people'?peopleView():state.tab==='parts'?partsView():checksView();
  if(state.tab==='program') updateLive();
}
function pageHeading(eyebrow,title,subtitle,actions='') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${esc(title)}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`; }
function programView() {
  const p=state.project,s=currentSection();
  return pageHeading('CHOREOGRAFIE & ABLAUF',p.name,`${p.people.length} Turnende <span class="middot">·</span> ${p.stations.filter(s=>s.kind==='bar').length} Barren <span class="middot">·</span> ${totalBeats(p)} Schläge <span class="middot">·</span> ${formatTime(beatToSeconds(p,totalBeats(p)))} geplant`, btn('print','Druckansicht','outline')+btn('new-action',`${icon('plus')} Aktion hinzufügen`,'primary'))+
  `<div class="program-grid"><section class="panel sequence-panel"><div class="panel-heading"><h2>Abschnitte</h2>${btn('new-section','+','small-button','title="Abschnitt hinzufügen" aria-label="Abschnitt hinzufügen"')}</div><div class="sequence-list">${sections(p).map((s,i)=>`<button class="sequence-item ${state.section===s.id?'selected':''}" data-do="section" data-id="${esc(s.id)}"><span class="sequence-index">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(s.name)}</strong><small>${s.beats} Schläge <span>·</span> ${formatTime(s.seconds)}</small></span><span class="sequence-mark"></span></button>`).join('')}</div><div class="section-note"><span class="eyebrow">REGIE-NOTIZ</span><p>${esc(s.note)||'Noch keine Notiz für diesen Abschnitt.'}</p>${btn('edit-section','Abschnitt bearbeiten ↗','text-button',`data-id="${esc(s.id)}"`)}</div><div class="sequence-bottom">${btn('new-section','+ Abschnitt ergänzen','text-button')}</div></section>
  <section class="panel floor-panel"><div class="panel-heading"><div><h2>Aufstellung <span class="pill">LIVE</span></h2><small id="floor-caption">Gesamte Riege · Draufsicht</small></div><div class="floor-tools"><select id="floor-mode" aria-label="Aufstellung bearbeiten">${option('view','Ansicht',state.floorMode)}${option('layout','Geräte verschieben',state.floorMode)}${option('positions','Positionen setzen',state.floorMode)}</select>${btn('new-station','+ Gerät','small-button')}</div></div><div id="floor" class="floor-container">${floorSvg()}</div><div class="floor-bottom"><div class="legend"><span><i class="legend-bar"></i>Barren</span><span><i class="legend-dot"></i>Turnende</span><span><i class="legend-path"></i>Bewegungsweg</span></div><span>${p.floor.width} × ${p.floor.height} m</span></div><div class="floor-hint">${state.floorMode==='layout'?'Geräte ziehen; anklicken zum Drehen oder genauen Positionieren.':state.floorMode==='positions'?`Turner ziehen: Position auf Schlag ${snap(state.beat)+1} speichern. `+'<select id="transition" aria-label="Bewegung zur Position">'+option('linear','Weg zur Position',state.transition)+option('hold','Bis dahin stehen bleiben',state.transition)+'</select>':'Zeitregler bewegen, um Aufstellung und Einsätze zu verfolgen.'}</div></section>
  <section class="panel inspector" id="inspector">${inspectorView()}</section></div>
  <section class="panel timeline-panel"><div class="panel-heading"><div><h2>Ablauf <span class="muted">/ ${esc(s.name)}</span></h2><small>Aktionen parallel planen · Balken anklicken zum Bearbeiten</small></div><div class="timeline-controls"><select id="person-filter" aria-label="Turner filtern">${personOptions(state.person)}</select><select id="zoom" aria-label="Zeitleiste Zoom">${[20,30,48,72].map(v=>option(String(v),`${v===20?'Kompakt':v===30?'Normal':v===48?'Gross':'Detail'}`,String(state.zoom))).join('')}</select></div></div><div class="timeline-scroll" id="timeline-scroll">${timelineView()}</div><div class="transport"><div class="play-controls">${btn('rewind','↤','icon-button','aria-label="Zum Programmanfang" title="Zum Programmanfang"')}${btn('play',icon(state.playing?'pause':'play'),'play-button','aria-label="Abspielen oder pausieren" id="play-toggle"')}<div><strong id="current-time">0:00</strong><small> / ${formatTime(beatToSeconds(p,totalBeats(p)))}</small></div></div><div class="scrub"><div><span id="count-label"></span><span id="beat-label"></span></div><input id="scrubber" type="range" min="0" max="${totalBeats(p)}" step="0.25" value="${state.beat}" aria-label="Programmposition"></div><div class="tempo"><strong id="tempo-label">${s.bpm}</strong><small>BPM</small></div>${btn('music',`${icon('plus')} ${state.audioReady?'Musik wechseln':'Musik laden'}`,'outline')}<span class="audio-indicator" id="audio-indicator">${state.audioReady?'Mit Musik':'Ohne Musik'}</span></div></section>`;
}
function floorSvg() {
  const p=state.project,w=p.floor.width*40,h=p.floor.height*40;
  return `<svg id="stage" viewBox="-26 -20 ${w+52} ${h+55}" role="img" aria-label="Aufstellung der Barren und Turnenden zum gewählten Schlag"><defs><pattern id="floor-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dce3dd" stroke-width="0.8"/></pattern></defs><rect width="${w}" height="${h}" rx="4" fill="#f4f7f2"/><rect width="${w}" height="${h}" fill="url(#floor-grid)"/><path d="M${w/2-8} ${h/2}h16m-8-8v16" stroke="#b5c4b8" stroke-width="1.5"/>
  ${Array.from({length:Math.floor(p.floor.width/2)+1},(_,i)=>`<text x="${i*80}" y="-7" text-anchor="middle" class="dimension">${i*2}</text>`).join('')}
  <g id="paths">${p.people.filter(person=>!state.person||person.id===state.person).map(person=>{const fs=[...person.frames].sort((a,b)=>a.beat-b.beat);return fs.slice(1).filter(f=>f.transition==='linear').map(f=>{const prev=fs[fs.indexOf(f)-1];return `<path d="M${prev.x*40} ${prev.y*40}L${f.x*40} ${f.y*40}" stroke="${person.color}" stroke-opacity=".2" stroke-width="1.5" stroke-dasharray="5 5" fill="none"/>`;}).join('');}).join('')}</g>
  ${p.stations.map(s=>`<g transform="translate(${s.x*40} ${s.y*40})" data-drag="station" data-id="${esc(s.id)}" class="stage-station"><g transform="rotate(${s.rotation})">${s.kind==='bar'?'<rect x="-31" y="-69" width="62" height="138" rx="12" fill="#dcebe0" stroke="#a5c3af"/><path d="M-15-50V50M15-50V50" stroke="#435c4e" stroke-width="7" stroke-linecap="round"/><path d="M-24-35h48M-24 35h48" stroke="#809586" stroke-width="4"/>':'<rect x="-60" y="-24" width="120" height="48" rx="10" fill="#ede5d4" fill-opacity=".7" stroke="#c7b692" stroke-dasharray="5 4"/>'}</g><text y="${s.kind==='bar'?89:42}" text-anchor="middle" class="station-label">${esc(s.name)}</text><title>${esc(s.name)} · ${s.x.toFixed(1)}, ${s.y.toFixed(1)} m</title></g>`).join('')}
  <g id="person-dots">${p.people.map((person,i)=>{const xy=positionAt(person,state.beat);return `<g class="person-dot ${state.person&&state.person!==person.id?'dimmed':''}" transform="translate(${xy.x*40} ${xy.y*40})" data-drag="person" data-id="${esc(person.id)}"><circle r="12" fill="${person.color}" stroke="white" stroke-width="3"/><text text-anchor="middle" dy="4" fill="white" class="dot-number">${i+1}</text><text class="dot-name" y="26" text-anchor="middle">${esc(person.name)}</text><title>${esc(person.name)}</title></g>`;}).join('')}</g><path d="M${w/2-65} ${h+19}h130" stroke="#b0bbae"/><text x="${w/2}" y="${h+34}" text-anchor="middle" class="audience-label">PUBLIKUM / FRONT</text></svg>`;
}
function inspectorView() {
  const p=state.project,a=p.actions.find(a=>a.id===state.selected),s=currentSection();
  if(a) {
    const station=p.stations.find(s=>s.id===a.station_id);
    return `<div class="panel-heading"><h2>Aktionsdetails</h2>${btn('clear-selection','×','small-button','aria-label="Auswahl aufheben"')}</div><div class="inspector-body"><span class="tag ${a.kind}">${kinds[a.kind]}</span><h3>${esc(a.title)}</h3><p>${esc(a.note)||'Keine zusätzliche Notiz.'}</p><div class="detail-grid"><div><small>START IM ABSCHNITT</small><strong>Schlag ${a.start+1}</strong></div><div><small>DAUER</small><strong>${a.length} Schläge</strong></div><div><small>POSTEN</small><strong>${esc(station?.name||'Freie Fläche')}</strong></div><div><small>TURNENDE</small><strong>${a.people.length} Personen</strong></div></div><div class="avatar-row">${a.people.map(id=>{const person=p.people.find(x=>x.id===id);return `<span class="person-chip"><i style="background:${person.color}"></i>${esc(person.name)}</span>`;}).join('')}</div><h4>Schlagnotizen</h4><div class="cue-list">${[...a.cues].sort((x,y)=>x.beat-y.beat).map(c=>`<div><span>${a.start+c.beat+1}</span><p>${esc(c.text)}</p></div>`).join('')||'<p class="muted">Noch keine Schlagnotizen.</p>'}</div>${btn('edit-action','Aktion bearbeiten','primary full',`data-id="${esc(a.id)}"`)}<div class="split-buttons">${btn('duplicate-action','Duplizieren','outline',`data-id="${esc(a.id)}"`)}${btn('action-to-part','Als Baustein','outline',`data-id="${esc(a.id)}"`)}</div></div>`;
  }
  return `<div class="panel-heading"><h2>Auf einen Blick</h2><span class="tiny-dot"></span></div><div class="inspector-body"><div class="eyebrow">AKTUELLER ABSCHNITT</div><h3>${esc(s.name)}</h3><p>${esc(s.note)}</p><div class="count-card"><small>ZÄHLGRUPPE · SCHLAG</small><strong id="live-count">${countLabel(p,state.beat)}</strong><span>${p.phrase}er-Zählung · Viertelschläge möglich</span></div><h4>Jetzt in Bewegung</h4><div id="live-actions"></div><div class="help-card"><strong>Ein Programm, viele Perspektiven.</strong><p>Wähle einen Turner, um seine Einsätze und Wege hervorzuheben.</p></div></div>`;
}
function timelineView() {
  const p=state.project,s=currentSection(), px=state.zoom, width=Math.max(s.beats*px,300);
  const people=p.people.filter(person=>!state.person||person.id===state.person);
  const actions=p.actions.filter(a=>a.section_id===s.id);
  const tickStep=s.beats>256?Math.ceil(s.beats/128):1;
  return `<div class="timeline" style="--beat-width:${px}px;--lane-width:${width}px"><div class="timeline-ruler"><div class="lane-label">TURNENDE <small>${people.length}</small></div><div class="ruler-track" data-do="seek-lane">${Array.from({length:Math.ceil(s.beats/tickStep)},(_,i)=>i*tickStep).map(i=>`<button class="beat-tick ${i%p.phrase===0?'major':''}" style="left:${i*px}px;width:${Math.max(px*tickStep,20)}px" data-do="seek-beat" data-beat="${s.start+i}" title="Absoluter Schlag ${s.start+i+1}">${i+1}</button>`).join('')}</div></div>${people.map((person,index)=>`<div class="timeline-row"><button class="lane-label" data-do="filter-person" data-id="${esc(person.id)}"><i class="avatar" style="--person-color:${person.color}">${esc(person.name.slice(0,1))}</i><span>${esc(person.name)}</span></button><div class="lane" style="height:${Math.max(1,actions.filter(a=>a.people.includes(person.id)).length)*34+14}px">${actions.filter(a=>a.people.includes(person.id)).map((a,i)=>`<button class="action-block ${a.kind} ${state.selected===a.id?'selected':''}" style="left:${a.start*px}px;width:${Math.max(a.length*px-4,8)}px;top:${i*34+8}px" data-do="select-action" data-id="${esc(a.id)}" title="${esc(a.title)} · Start ${a.start+1} · ${a.length} Schläge"><span>${esc(a.title)}</span>${a.length*px>150?`<small>${a.length} Schläge</small>`:''}</button>`).join('')}<div class="lane-cursor"></div></div></div>`).join('')||'<p class="empty">Lege zuerst Turnende an.</p>'}</div>`;
}
function updateLive() {
  if(state.tab!=='program') return;
  const p=state.project,s=currentSection(),actual=sections(p).find(s=>state.beat>=s.start&&state.beat<s.start+s.beats)||sections(p).at(-1);
  const beat=Math.floor(state.beat*4)/4;
  if($('#scrubber')) $('#scrubber').value=state.beat;
  if($('#current-time')) $('#current-time').textContent=formatTime(beatToSeconds(p,state.beat));
  if($('#count-label')) $('#count-label').textContent=`Zählgruppe ${countLabel(p,beat)}`;
  if($('#beat-label')) $('#beat-label').textContent=state.beat>=totalBeats(p)?'Programmende':`Schlag ${beat+1} / ${totalBeats(p)}`;
  if($('#tempo-label')) $('#tempo-label').textContent=actual.bpm;
  if($('#live-count')) $('#live-count').textContent=countLabel(p,beat);
  if($('#floor-caption')) $('#floor-caption').textContent=`${actual.name} · ${state.beat>=totalBeats(p)?'Ende':`Schlag ${beat+1}`}`;
  if(state.floorMode==='positions' && $('.floor-hint')?.firstChild?.nodeType===Node.TEXT_NODE) $('.floor-hint').firstChild.textContent=`Turner ziehen: Position auf Schlag ${snap(state.beat)+1} speichern. `;
  document.querySelectorAll('#person-dots [data-id]').forEach(el=>{const person=p.people.find(x=>x.id===el.dataset.id);const xy=positionAt(person,state.beat);el.setAttribute('transform',`translate(${xy.x*40} ${xy.y*40})`);});
  document.querySelectorAll('.lane-cursor').forEach(el=>{el.style.left=`${(state.beat-s.start)*state.zoom}px`;el.hidden=state.beat<s.start||state.beat>s.start+s.beats;});
  const live=$('#live-actions');
  if(live) {
    const actions=globalActions(p).filter(a=>state.beat>=a.globalStart&&state.beat<a.globalStart+a.length&&(!state.person||a.people.includes(state.person)));
    const unique=[...new Map(actions.map(a=>[a.title,a])).values()];
    live.innerHTML=unique.slice(0,4).map(a=>`<button class="live-action" data-do="select-action" data-id="${esc(a.id)}"><span class="kind-dot ${a.kind}"></span><span>${esc(a.title)}<small>${esc(kinds[a.kind])}</small></span><span>↗</span></button>`).join('')||'<p class="muted">Kein Einsatz auf diesem Schlag.</p>';
  }
}
function peopleView() {
  const p=state.project;
  const selected=p.people.find(x=>x.id===state.person);
  const persons=selected?[selected]:p.people;
  return pageHeading('DIE RIEGE','Jeder Einsatz im Blick',`Persönliche Ablaufpläne · Musikzeiten aus BPM berechnet · Musikversatz ${p.music.offset} s.`,btn('new-person',`${icon('plus')} Turner hinzufügen`,'primary'))+
    `<div class="panel people-toolbar"><label>Persönlicher Ablauf <select id="person-filter" aria-label="Turner filtern">${personOptions(state.person)}</select></label><div>${btn('csv','CSV exportieren','outline')}${btn('print','Ablauf drucken','outline')}</div></div><div class="person-tabs">${p.people.map(person=>btn('filter-person',`<i style="background:${person.color}"></i>${esc(person.name)}`,`person-chip ${state.person===person.id?'active':''}`,`data-id="${esc(person.id)}"`)).join('')}</div>
    ${persons.map(person=>{const actions=globalActions(p).filter(a=>a.people.includes(person.id));return `<section class="panel person-sheet"><div class="panel-heading"><div class="person-title"><span class="avatar" style="--person-color:${person.color}">${esc(person.name[0]||'?')}</span><div><h2>${esc(person.name)}</h2><small>${actions.length} Einsätze · ${person.frames.length} gespeicherte Positionen</small></div></div><div>${btn('positions','Positionen','outline',`data-id="${esc(person.id)}"`)}${btn('edit-person','Bearbeiten','outline',`data-id="${esc(person.id)}"`)}</div></div><div class="table-wrap"><table><thead><tr><th>Musikzeit / Zählung</th><th>Abschnitt / Einsatz</th><th>Posten</th><th>Dauer</th><th>Auftrag & Schlagnotizen</th></tr></thead><tbody>${actions.map(a=>`<tr><td><strong>${formatTime(beatToSeconds(p,a.globalStart)+p.music.offset,true)}</strong><small>Gruppe ${countLabel(p,a.globalStart)}<br>Absolut ${a.globalStart+1}</small></td><td><small>${esc(a.section.name)} · Schlag ${a.start+1}</small><button class="table-link" data-do="edit-action" data-id="${esc(a.id)}">${esc(a.title)}</button><span class="tag ${a.kind}">${kinds[a.kind]}</span></td><td>${esc(p.stations.find(s=>s.id===a.station_id)?.name||'Freie Fläche')}</td><td>${a.length} Schläge</td><td><p>${esc(a.note)}</p>${a.cues.map(c=>`<div class="report-cue"><b>${a.start+c.beat+1}</b><span>${esc(c.text)} <small>(${formatTime(beatToSeconds(p,a.globalStart+c.beat)+p.music.offset,true)})</small></span></div>`).join('')}</td></tr>`).join('')||'<tr><td colspan="5">Noch keine Einsätze geplant.</td></tr>'}</tbody></table></div></section>`;}).join('')||'<div class="empty">Füge deinen ersten Turner hinzu.</div>'}`;
}
function partsView() {
  const p=state.project;
  return pageHeading('DEINE BIBLIOTHEK','Einmal planen. Wiederverwenden.','Bausteine enthalten Länge, Schlagnotizen und Elemente. Eingefügte Aktionen bleiben unabhängig bearbeitbar.',btn('new-part',`${icon('plus')} Baustein erstellen`,'primary'))+
  `<div class="part-grid">${p.parts.map(part=>{const uses=p.actions.filter(a=>a.part_id===part.id),performances=uses.reduce((n,a)=>n+a.people.length,0);return `<article class="panel part-card"><div class="part-card-top"><span class="part-icon ${part.kind}">${icon('parts')}</span><span class="tag ${part.kind}">${kinds[part.kind]}</span></div><h2>${esc(part.name)}</h2><p>${esc(part.note)||'Eigener wiederverwendbarer Programmteil.'}</p><div class="part-metrics"><div><strong>${part.beats}</strong><small>Schläge</small></div><div><strong>${uses.length}</strong><small>Platzierungen</small></div><div><strong>${performances}</strong><small>Personen-Einsätze</small></div></div><div class="element-preview">${part.elements.length?part.elements.map(e=>`<span>${e.countable?'✓ ':''}${esc(e.name)}</span>`).join(''):'Noch keine Elemente erfasst'}</div><div class="card-actions">${btn('use-part','Ins Programm einfügen','primary',`data-id="${esc(part.id)}"`)}${btn('edit-part','Bearbeiten','outline',`data-id="${esc(part.id)}"`)}</div></article>`;}).join('')}</div><div class="note-banner">Ein Baustein mit vier Turnenden zählt als <b>eine Platzierung</b> und <b>vier Personen-Einsätze</b>. Reglementarische Elemente werden separat pro Turner gezählt.</div>`;
}
const checklistLabels={music:'Musikalische Akzente, Rhythmus und Übergänge choreografisch umgesetzt',paths:'Wege und Ablösungen aufeinander abgestimmt; aktive Turnende nicht behindert',formations:'Formationen, Fronten und Nutzung aller Barren abwechslungsreich geplant',safety:'Aufstellung, Matten und Hilfsmittel vor Ort fachgerecht geprüft',material:'Material mit Anmeldung und Wettkampfvorschriften des Anlasses abgeglichen'};
function checksView() {
  const p=state.project,r=state.report, stale=state.savedVersion!==state.version;
  return pageHeading('PLANUNGSHILFE · STV 2026','Ein guter Plan sieht mehr.','Hinweise aus Handbuch und Weisungen – keine automatische Wertung oder Wettkampffreigabe.',btn('save','Prüfung aktualisieren','outline'))+
  (stale?'<div class="note-banner">Änderungen noch nicht gespeichert. Die Auswertung zeigt den letzten gespeicherten Stand.</div>':'')+
  `<div class="check-stats"><div class="panel stat"><small>PROGRAMMDAUER</small><strong>${formatTime(beatToSeconds(p,totalBeats(p)))}</strong><span>Aus Abschnittslängen und BPM</span></div><div class="panel stat"><small>MUSIKDAUER / MAXIMUM</small><strong>${p.music.duration?formatTime(p.music.duration):'–'} <em>/ 5:00</em></strong><span>Massgebend ist das ganze Musikstück</span></div><div class="panel stat"><small>ERFASSTE RIEGE</small><strong>${p.people.length} <em>Turnende</em></strong><span>${p.mode==='VGT'?'VGT · mindestens 6':'Klein-Team · 3 bis 5'}</span></div></div>
  <div class="checks-grid"><section class="panel"><div class="panel-heading"><h2>Elementvielfalt pro Turner</h2><span class="pill">Barren</span></div><p class="panel-intro">Mindestens <b>6 verschiedene Elemente</b> pro Person. Gezählt werden nur in der Aktion als zählend markierte Elemente am Barren. Gleiche Namen zählen einmal; Nebenposten und Hilfsgeräte zählen nicht.</p><div class="element-rows">${(r?.people||[]).map(stat=>{const person=p.people.find(p=>p.id===stat.id);if(!person)return '';return `<div class="element-row"><span>${esc(person.name)}</span><div class="progress-track"><i style="width:${Math.min(stat.elements/6*100,100)}%"></i></div><strong>${stat.elements} / 6</strong><span class="${stat.elements<6?'amber':'green'}">${stat.elements<6?'Ergänzen / prüfen':'Erfasst'}</span><small>${stat.unplanned?`${stat.unplanned} Schläge ohne Auftrag`:'Durchgehend verplant'}</small></div>`;}).join('')}</div><p class="source-note">Weisungen 2026, 3.1.1, gedruckte S. 9. Namen und Zählberechtigung anhand der offiziellen Turnsprache selbst prüfen. Schreibvarianten werden nicht automatisch erkannt. Demobausteine enthalten bewusst keine bestätigten Elemente.</p></section>
  <section class="panel"><div class="panel-heading"><h2>Hinweise zur Planung</h2><span class="pill">${r?.warnings.length||0}</span></div><div class="warning-list">${(r?.warnings||[]).map(w=>`<div class="warning ${w.kind}"><span>${w.kind==='conflict'?'!':'i'}</span><p>${esc(w.text)}</p></div>`).join('')||'<div class="empty">Keine automatischen Hinweise.</div>'}</div><p class="source-note">Parallel belegte Barren sind zulässig planbar. Automatisch erkannt werden zeitgleiche Aufträge für dieselbe Person; Raumkollisionen werden nicht berechnet.</p></section></div>
  <section class="panel checklist"><div class="panel-heading"><h2>Bewusst gestalten</h2><small>Manuelle Prüfpunkte aus dem Handbuch</small></div>${Object.entries(checklistLabels).map(([key,label])=>`<label class="check-row"><input type="checkbox" data-check="${key}" ${p.checklist[key]?'checked':''}><span>${label}</span></label>`).join('')}<p class="source-note">Handbuch 2026, Abschnitte 5.1–5.3 und 7.1/7.2 (BA: VGT 6, Klein-Team 2 Wettkampfbarren). Das Barren-Tempo 48–54 BPM ist ein Richtwert, keine Pflicht. Die eingezeichnete Fläche ist frei konfiguriert, keine vorgeschriebene BA-Flächengrösse. Wettkampfvorschriften des jeweiligen Anlasses gehen vor (Weisungen 1.1).</p></section>`;
}

function field(label,name,value='',type='text',attrs='') {return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
function textArea(label,name,value='',attrs='') {return `<label>${label}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;}
function selectField(label,name,options) {return `<label>${label}<select name="${name}">${options}</select></label>`;}
function showModal(title,body,formType,id='',footer='') {
  pause(); const dialog=$('#editor');
  dialog.innerHTML=`<form data-form="${formType}" data-id="${esc(id)}"><div class="modal-heading"><div><div class="eyebrow">VGT STUDIO</div><h2>${esc(title)}</h2></div>${btn('close-modal','×','icon-button','aria-label="Dialog schliessen"')}</div><div class="modal-body">${body}</div><div id="form-error" role="alert"></div><div class="modal-footer"><div>${footer}</div><div>${btn('close-modal','Abbrechen','outline')}<button type="submit" class="primary">Speichern</button></div></div></form>`;
  if(!dialog.open) dialog.showModal();
}
function cueFields(cues) {return `<div class="form-section"><div class="form-section-heading"><h3>Schlaggenaue Anweisungen</h3>${btn('add-cue','+ Schlagnotiz','small-button')}</div><p class="field-help">Schläge relativ zum Beginn dieser Aktion / dieses Bausteins. 1 = erster Schlag, 1.5 = „und“.</p><div id="cue-fields">${cues.map(c=>cueRow(c)).join('')}</div></div>`;}
function cueRow(c={beat:0,text:''}) {return `<div class="cue-edit"><input type="number" class="cue-beat" aria-label="Schlag der Notiz" min="1" step="0.25" value="${c.beat+1}" required><input class="cue-text" aria-label="Anweisung" placeholder="z. B. weglaufen, einspringen, Arme öffnen" value="${esc(c.text)}" required>${btn('remove-row','×','small-button','aria-label="Schlagnotiz entfernen"')}</div>`;}
function elementFields(elements) {return `<div class="form-section"><div class="form-section-heading"><h3>Elemente für die Auswertung</h3>${btn('add-element','+ Element','small-button')}</div><p class="field-help">„Zählend“ nur aktivieren, wenn das Element in der Turnsprache geführt wird. Hilfsgeräte zählen nicht.</p><div id="element-fields">${elements.map(e=>elementRow(e)).join('')}</div></div>`;}
function elementRow(e={name:'',countable:false}) {return `<div class="element-edit"><input class="element-name" value="${esc(e.name)}" placeholder="Eindeutiger Elementname" aria-label="Elementname" required><label><input type="checkbox" class="element-countable" ${e.countable?'checked':''}> Zählend</label>${btn('remove-row','×','small-button','aria-label="Element entfernen"')}</div>`;}
function readCues(form,length) {
  const cues=[...form.querySelectorAll('.cue-edit')].map(row=>({beat:Number(row.querySelector('.cue-beat').value)-1,text:row.querySelector('.cue-text').value.trim()}));
  if(cues.some(c=>c.beat<0||c.beat>=length)) throw new Error('Schlagnotizen müssen innerhalb der Aktionslänge liegen.');
  return cues.sort((a,b)=>a.beat-b.beat);
}
function readElements(form) {return [...form.querySelectorAll('.element-edit')].map(row=>({name:row.querySelector('.element-name').value.trim(),countable:row.querySelector('.element-countable').checked}));}
function actionEditor(id='',partId='') {
  const p=state.project,old=p.actions.find(a=>a.id===id),part=p.parts.find(x=>x.id===partId);
  const a=old||{title:part?.name||'',section_id:state.section,start:0,length:part?.beats||8,people:state.person?[state.person]:[],station_id:'',kind:part?.kind||'apparatus',part_id:part?.id||'',note:part?.note||'',cues:clone(part?.cues||[]),elements:clone(part?.elements||[])};
  state.editingAction=clone(a);
  showModal(old?'Aktion bearbeiten':'Neue Aktion planen',`
    ${field('Bezeichnung','title',a.title,'text','required maxlength="200" placeholder="z. B. Einsprung und Schwungfolge"')}
    <div class="form-grid">${selectField('Abschnitt','section_id',p.sections.map(s=>option(s.id,s.name,a.section_id)).join(''))}${selectField('Aktionsart','kind',Object.entries(kinds).map(([v,l])=>option(v,l,a.kind)).join(''))}${field('Startschlag im Abschnitt','start',a.start+1,'number','min="1" step="0.25" required')}${field('Dauer in Schlägen','length',a.length,'number','min="0.25" max="4096" step="0.25" required')}${selectField('Gerät / Posten','station_id',option('','Freie Fläche',a.station_id)+p.stations.map(s=>option(s.id,s.name,a.station_id)).join(''))}<div class="field-help">Start 1 + Dauer 8 belegt die Schläge 1–8 und endet an der Grenze zu Schlag 9.</div></div>
    <div class="form-section"><div class="form-section-heading"><h3>Wer turnt?</h3>${btn('select-all-people','Alle auswählen','text-button')}</div><div class="people-checkboxes">${p.people.map(person=>`<label><input type="checkbox" name="people" value="${esc(person.id)}" ${a.people.includes(person.id)?'checked':''}><i style="background:${person.color}"></i>${esc(person.name)}</label>`).join('')||'<p>Lege zuerst Turnende an.</p>'}</div></div>
    ${textArea('Auftrag / Regie-Notiz','note',a.note)}${cueFields(a.cues)}${elementFields(a.elements)}
    ${old?'<label class="inline-check"><input type="checkbox" name="scale_cues"> Bei geänderter Länge Schlagnotizen proportional verschieben</label>':''}
    ${a.part_id?'<p class="field-help">Kopie eines Bausteins. Änderungen gelten nur für diese Aktion.</p>':''}`,'action',id,old?btn('delete-action','Aktion löschen','danger text-button',`data-id="${esc(id)}"`):'');
}
function partEditor(id='',source=null,sourceActionId='') {
  state.partSource=sourceActionId;
  const part=source||state.project.parts.find(p=>p.id===id)||{name:'',beats:8,kind:'apparatus',note:'',cues:[],elements:[]};
  showModal(id?'Baustein bearbeiten':'Baustein erstellen',`${field('Bausteinname','name',part.name,'text','required maxlength="200"')}<div class="form-grid">${field('Standardlänge in Schlägen','beats',part.beats,'number','min="0.25" max="4096" step="0.25" required')}${selectField('Aktionsart','kind',Object.entries(kinds).map(([v,l])=>option(v,l,part.kind)).join(''))}</div>${textArea('Anweisung','note',part.note)}${cueFields(part.cues)}${elementFields(part.elements)}<p class="field-help">Änderungen an der Vorlage gelten für zukünftige Einfügungen. Bestehende Aktionen behalten ihren Inhalt und ihre Verbindung für die Nutzungszählung.</p>`,'part',id,id?btn('delete-part','Baustein löschen','danger text-button',`data-id="${esc(id)}"`):'');
}
function sectionEditor(id='') {
  const s=state.project.sections.find(s=>s.id===id)||{name:'',beats:8,bpm:currentSection().bpm,note:''};
  showModal(id?'Abschnitt bearbeiten':'Abschnitt hinzufügen',`${field('Name','name',s.name,'text','required maxlength="200"')}<div class="form-grid">${field('Länge in Schlägen','beats',s.beats,'number','min="0.25" max="4096" step="0.25" required')}${field('Tempo (BPM)','bpm',s.bpm,'number','min="10" max="400" step="0.1" required')}</div>${textArea('Regie-Notiz / musikalischer Akzent','note',s.note)}<p class="field-help">Neue Abschnitte werden am Ende ergänzt. Bei einer Längenänderung verschieben sich folgende Abschnitte und Positionen gemeinsam. Aktionen bleiben relativ zu ihrem Abschnitt.</p>`,'section',id,id?btn('delete-section','Abschnitt löschen','danger text-button',`data-id="${esc(id)}"`):'');
}
function stationEditor(id='') {
  const s=state.project.stations.find(s=>s.id===id)||{name:`Barren ${state.project.stations.filter(s=>s.kind==='bar').length+1}`,kind:'bar',x:state.project.floor.width/2,y:state.project.floor.height/2,rotation:0};
  showModal(id?'Gerät / Posten bearbeiten':'Gerät / Posten hinzufügen',`${field('Bezeichnung','name',s.name,'text','required')}${selectField('Typ','kind',option('bar','Barren',s.kind)+option('side','Nebenposten / Hilfsgerät',s.kind))}<div class="form-grid">${field('X-Position (m)','x',s.x,'number',`min="0" max="${state.project.floor.width}" step="0.1" required`)}${field('Y-Position (m)','y',s.y,'number',`min="0" max="${state.project.floor.height}" step="0.1" required`)}${field('Drehung (°)','rotation',s.rotation,'number','min="-360" max="360" step="5" required')}</div><p class="field-help">Positionen sind die Mittelpunkte der Symbole. Barren werden schematisch dargestellt; Abstände und Matten vor Ort prüfen.</p>`,'station',id,id?btn('delete-station','Posten löschen','danger text-button',`data-id="${esc(id)}"`):'');
}
function personEditor(id='') {
  const p=state.project.people.find(p=>p.id===id)||{name:'',color:colors[state.project.people.length%colors.length]};
  showModal(id?'Turner bearbeiten':'Turner hinzufügen',`${field('Name','name',p.name,'text','required maxlength="200"')}${field('Farbe','color',p.color,'color')}<p class="field-help">Die Position setzt du in der Aufstellung. Neue Turnende starten links unten und können sofort verschoben werden.</p>`,'person',id,id?btn('delete-person','Turner löschen','danger text-button',`data-id="${esc(id)}"`):'');
}
function settingsEditor() {
  const p=state.project;
  showModal('Programmeinstellungen',`${field('Programmname','name',p.name,'text','required')}${field('Verein / Riege','club',p.club)}<div class="form-grid">${selectField('Wettkampfform','mode',option('VGT','VGT (ab 6 Turnenden)',p.mode)+option('VKT','Klein-Team (3–5 Turnende)',p.mode))}${field('Schläge pro Zählgruppe','phrase',p.phrase,'number','min="1" max="16" step="1" required')}${field('Fläche: Breite (m)','width',p.floor.width,'number','min="4" max="50" step="0.5" required')}${field('Fläche: Tiefe (m)','height',p.floor.height,'number','min="4" max="50" step="0.5" required')}${field('Barrenanzahl','bars',p.stations.filter(s=>s.kind==='bar').length,'number','min="0" max="40" step="1" required')}${field('Erster Schlag in Musik bei (Sek.)','offset',p.music.offset,'number','min="0" max="3600" step="0.01" required')}</div>${textArea('Programmnotizen','notes',p.notes)}<p class="field-help">8er-Zählgruppen entsprechen meist zwei 4/4-Takten. Für einen 3/4-Takt kann die Zählgruppe auf 6 gesetzt werden. Die Zeitberechnung verwendet Schläge pro Minute.</p><div class="form-section"><h3>Projektdateien</h3><div class="split-buttons">${btn('export','JSON sichern','outline')}${btn('import','JSON importieren','outline')}${btn('new-project','Leeres Programm','outline')}</div><p class="field-help">Musik wird nur lokal im Browser geladen und muss nach einem Neustart erneut ausgewählt werden. Die Datenbank enthält dein Programm, nicht die Audiodatei.</p></div>`,'settings');
}
function positionsEditor(id) {
  const person=state.project.people.find(p=>p.id===id),p=state.project;
  showModal(`Positionen · ${person.name}`,`<p class="field-help">Positionen gelten auf absoluten Schlägen. „Weg“ interpoliert vom vorherigen Punkt; „Halten“ bleibt bis zu diesem Zeitpunkt an der vorherigen Position. Für Wegbeginn und Ankunft je einen Punkt setzen.</p><div id="position-fields">${person.frames.map(f=>positionRow(f,p)).join('')}</div>${btn('add-position','+ Position hinzufügen','outline')}<p class="field-help">Die Startposition auf Schlag 1 darf nicht fehlen. Das Programmende liegt auf der Grenze zu Schlag ${totalBeats(p)+1}.</p>`,'positions',id);
}
function positionRow(f,p=state.project) {return `<div class="position-edit">${field('Schlag','framebeat',f.beat+1,'number',`min="1" max="${totalBeats(p)+1}" step="0.25" required`)}${field('X (m)','framex',f.x,'number',`min="0" max="${p.floor.width}" step="0.1" required`)}${field('Y (m)','framey',f.y,'number',`min="0" max="${p.floor.height}" step="0.1" required`)}${selectField('Übergang','frametransition',option('linear','Weg',f.transition)+option('hold','Halten',f.transition))}${btn('remove-row','×','small-button','aria-label="Position entfernen"')}</div>`;}

$('#editor').addEventListener('submit',event=>{
  event.preventDefault();const form=event.target,data=new FormData(form),type=form.dataset.form,id=form.dataset.id;
  const str=k=>String(data.get(k)||'').trim(),num=k=>Number(data.get(k));
  try {
    let change;
    if(type==='action') {
      const length=num('length'),start=num('start')-1,s=state.project.sections.find(s=>s.id===str('section_id'));
      if(start+length>s.beats) throw new Error(`Die Aktion endet nach Abschnittsschlag ${s.beats}. Abschnitt verlängern oder Aktion kürzen.`);
      const people=data.getAll('people');if(!people.length) throw new Error('Wähle mindestens eine Person.');
      let cues;
      if(data.has('scale_cues')) {cues=readCues(form,state.editingAction.length);const a={length:state.editingAction.length,cues};scaleAction(a,length);cues=a.cues;} else cues=readCues(form,length);
      const a={id:id||uid('a'),title:str('title'),section_id:s.id,start,length,kind:str('kind'),station_id:str('station_id'),people,part_id:state.editingAction.part_id,note:str('note'),cues,elements:readElements(form)};
      change=p=>{if(id)p.actions[p.actions.findIndex(a=>a.id===id)]=a;else p.actions.push(a);state.selected=a.id;state.section=s.id;};
    } else if(type==='part') {
      const part={id:id||uid('part'),name:str('name'),beats:num('beats'),kind:str('kind'),note:str('note'),cues:readCues(form,num('beats')),elements:readElements(form)};
      change=p=>{if(id)p.parts[p.parts.findIndex(x=>x.id===id)]=part;else p.parts.push(part);if(state.partSource){const original=p.actions.find(a=>a.id===state.partSource);if(original)original.part_id=part.id;}};
    } else if(type==='section') {
      change=p=>{if(id){resizeSection(p,id,num('beats'));Object.assign(p.sections.find(s=>s.id===id),{name:str('name'),bpm:num('bpm'),note:str('note')});}else{const s={id:uid('s'),name:str('name'),beats:num('beats'),bpm:num('bpm'),note:str('note')};p.sections.push(s);state.section=s.id;}state.beat=Math.min(state.beat,totalBeats(p));};
    } else if(type==='station') {
      const station={id:id||uid('b'),name:str('name'),kind:str('kind'),x:num('x'),y:num('y'),rotation:num('rotation')};
      change=p=>{if(id)p.stations[p.stations.findIndex(s=>s.id===id)]=station;else p.stations.push(station);};
    } else if(type==='person') {
      change=p=>{if(id)Object.assign(p.people.find(x=>x.id===id),{name:str('name'),color:str('color')});else p.people.push({id:uid('p'),name:str('name'),color:str('color'),frames:[{beat:0,x:1,y:p.floor.height-1,transition:'hold'}]});};
    } else if(type==='settings') {
      const width=num('width'),height=num('height'),barCount=num('bars');
      if(state.project.stations.some(s=>s.x>width||s.y>height)||state.project.people.some(person=>person.frames.some(f=>f.x>width||f.y>height))) throw new Error('Auf der kleineren Fläche lägen Geräte oder Positionen ausserhalb. Verschiebe sie zuerst.');
      const bars=state.project.stations.filter(s=>s.kind==='bar'),remove=bars.slice(barCount).map(s=>s.id);
      if(state.project.actions.some(a=>remove.includes(a.station_id))) throw new Error('Zu entfernende Barren werden noch in Aktionen verwendet. Passe die Postenzuordnung zuerst an.');
      change=p=>{Object.assign(p,{name:str('name'),club:str('club'),mode:str('mode'),phrase:num('phrase'),notes:str('notes')});p.floor={width,height};p.music.offset=num('offset');p.stations=p.stations.filter(s=>!remove.includes(s.id));for(let i=bars.length;i<barCount;i++)p.stations.push({id:uid('b'),name:`Barren ${i+1}`,kind:'bar',x:Math.min(width-1,2+(i%5)*3),y:Math.min(height-1,3+Math.floor(i/5)*3),rotation:0});};
    } else if(type==='positions') {
      const frames=[...form.querySelectorAll('.position-edit')].map(row=>({beat:Number(row.querySelector('[name=framebeat]').value)-1,x:Number(row.querySelector('[name=framex]').value),y:Number(row.querySelector('[name=framey]').value),transition:row.querySelector('[name=frametransition]').value}));
      if(!frames.some(f=>f.beat===0))throw new Error('Die Startposition auf Schlag 1 wird benötigt.');
      if(new Set(frames.map(f=>f.beat)).size!==frames.length)throw new Error('Pro Schlag kann nur eine Position gespeichert werden.');
      change=p=>{p.people.find(x=>x.id===id).frames=frames.sort((a,b)=>a.beat-b.beat);};
    }
    if(change && mutate(change)) $('#editor').close();
  } catch(error) {$('#form-error').textContent=error.message;}
});

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-do]');if(!target)return;
  const action=target.dataset.do,id=target.dataset.id,p=state.project;
  if(action==='tab'){pause();state.tab=id;render();}
  else if(action==='section'){pause();state.section=id;state.selected=null;seek(sections(p).find(s=>s.id===id).start);renderMain();}
  else if(action==='new-action')actionEditor();
  else if(action==='edit-action')actionEditor(id);
  else if(action==='select-action'){const a=p.actions.find(a=>a.id===id);state.selected=id;state.section=a.section_id;seek(globalActions(p).find(a=>a.id===id).globalStart);renderMain();}
  else if(action==='clear-selection'){state.selected=null;renderMain();}
  else if(action==='new-section')sectionEditor();
  else if(action==='edit-section')sectionEditor(id);
  else if(action==='new-station')stationEditor();
  else if(action==='new-person')personEditor();
  else if(action==='edit-person')personEditor(id);
  else if(action==='positions')positionsEditor(id);
  else if(action==='new-part')partEditor();
  else if(action==='edit-part')partEditor(id);
  else if(action==='use-part')actionEditor('',id);
  else if(action==='action-to-part'){const a=p.actions.find(a=>a.id===id);partEditor('',{name:a.title,beats:a.length,kind:a.kind,note:a.note,cues:clone(a.cues),elements:clone(a.elements)},id);}
  else if(action==='duplicate-action'){mutate(p=>{const a=clone(p.actions.find(a=>a.id===id));a.id=uid('a');p.actions.push(a);state.selected=a.id;});actionEditor(state.selected);}
  else if(action==='settings')settingsEditor();
  else if(action==='close-modal')$('#editor').close();
  else if(action==='add-cue')$('#cue-fields').insertAdjacentHTML('beforeend',cueRow());
  else if(action==='add-element')$('#element-fields').insertAdjacentHTML('beforeend',elementRow());
  else if(action==='add-position')$('#position-fields').insertAdjacentHTML('beforeend',positionRow({beat:snap(state.beat),x:1,y:1,transition:'linear'}));
  else if(action==='remove-row')target.parentElement.remove();
  else if(action==='select-all-people')document.querySelectorAll('#editor [name=people]').forEach(el=>el.checked=true);
  else if(action.startsWith('delete-'))handleDelete(action.slice(7),id);
  else if(action==='filter-person'){state.person=state.person===id?'':id;renderMain();}
  else if(action==='seek-beat')seek(Number(target.dataset.beat));
  else if(action==='play')state.playing?pause():play();
  else if(action==='rewind'){pause();state.section=p.sections[0].id;seek(0);renderMain();}
  else if(action==='music')$('#audio-file').click();
  else if(action==='export')download(`${safeName(p.name)}.vgt.json`,JSON.stringify(p,null,2),'application/json');
  else if(action==='import')$('#import-file').click();
  else if(action==='csv')exportCsv();
  else if(action==='print'){pause();state.tab='people';render();window.print();}
  else if(action==='undo')undo();
  else if(action==='save') {await save();if(state.savedVersion===state.version){toast('Programmcheck ist aktuell.');renderMain();}}
  else if(action==='new-project') {
    if(confirm('Ein leeres Programm beginnen? Dein aktueller Stand bleibt per Rückgängig und in der lokalen Versionshistorie verfügbar. Sichere ihn bei Bedarf zuerst als JSON.')) {
      mutate(p=>{p.name='Mein Barrenprogramm';p.people=[];p.actions=[];p.parts=[];p.stations=[];p.sections=[{id:uid('s'),name:'Auftakt',beats:8,bpm:52,note:''}];p.music={name:'',duration:null,offset:0};p.notes='';Object.keys(p.checklist).forEach(k=>p.checklist[k]=false);state.section=p.sections[0].id;state.selected=null;state.person='';state.beat=0;});clearAudio();$('#editor').close();render();
    }
  } else if(action==='help')help();
});
function handleDelete(type,id) {
  const p=state.project;
  let message={action:'Diese Aktion löschen?',section:'Abschnitt samt Aktionen und den darin gespeicherten Positionen löschen?',person:'Turner und seine Positionen entfernen? Gruppeneinsätze bleiben für die übrigen Turnenden bestehen.',station:'Diesen Posten löschen?',part:'Vorlage löschen? Eingefügte Aktionen bleiben erhalten; ihre Bausteinverknüpfung wird gelöst.'}[type];
  if(!confirm(message))return;
  const ok=mutate(p=>{
    if(type==='action'){p.actions=p.actions.filter(a=>a.id!==id);state.selected=null;}
    if(type==='part'){p.parts=p.parts.filter(a=>a.id!==id);p.actions.forEach(a=>{if(a.part_id===id)a.part_id='';});}
    if(type==='station'){if(p.actions.some(a=>a.station_id===id))throw new Error('Der Posten wird noch in Aktionen verwendet. Zuerst deren Zuordnung ändern.');p.stations=p.stations.filter(s=>s.id!==id);}
    if(type==='person'){p.people=p.people.filter(x=>x.id!==id);p.actions.forEach(a=>a.people=a.people.filter(x=>x!==id));p.actions=p.actions.filter(a=>a.people.length);if(state.person===id)state.person='';}
    if(type==='section'){
      if(p.sections.length===1)throw new Error('Mindestens ein Abschnitt muss bestehen bleiben.');
      const s=sections(p).find(x=>x.id===id),end=s.start+s.beats;
      for(const person of p.people){const startPosition=positionAt(person,end);person.frames=person.frames.filter(f=>f.beat<s.start||f.beat>=end).map(f=>({...f,beat:f.beat>=end?f.beat-s.beats:f.beat}));if(s.start===0&&!person.frames.some(f=>f.beat===0))setFrame(person,0,startPosition.x,startPosition.y,'hold');}
      p.sections=p.sections.filter(x=>x.id!==id);p.actions=p.actions.filter(a=>a.section_id!==id);state.section=p.sections[0].id;state.selected=null;state.beat=0;
    }
  });
  if(ok)$('#editor').close();
}
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='floor-mode'){pause();state.floorMode=el.value;renderMain();}
  if(el.id==='transition')state.transition=el.value;
  if(el.id==='person-filter'){state.person=el.value;renderMain();}
  if(el.id==='zoom'){state.zoom=Number(el.value);renderMain();}
  if(el.id==='scrubber')seek(Number(el.value),true);
  if(el.dataset.check)mutate(p=>p.checklist[el.dataset.check]=el.checked);
});
document.addEventListener('input',event=>{if(event.target.id==='scrubber')seek(Number(event.target.value),false);});
function seek(beat,follow=true) {
  pause();state.beat=clamp(beat,0,totalBeats(state.project));
  if(state.audioReady)audio.currentTime=Math.min(audio.duration,beatToSeconds(state.project,state.beat)+state.project.music.offset);
  const s=sections(state.project).find(s=>state.beat>=s.start&&state.beat<s.start+s.beats);
  if(follow&&s&&s.id!==state.section){state.section=s.id;state.selected=null;renderMain();}else updateLive();
}
async function play() {
  if(state.beat>=totalBeats(state.project))state.beat=0;
  if(state.audioReady){audio.currentTime=beatToSeconds(state.project,state.beat)+state.project.music.offset;try{await audio.play();}catch {toast('Musik konnte nicht abgespielt werden. Wähle eine unterstützte Audiodatei.');return;}}
  state.playing=true;playbackOrigin={clock:performance.now(),seconds:beatToSeconds(state.project,state.beat)};
  if($('#play-toggle'))$('#play-toggle').innerHTML=icon('pause');
  frameRequest=requestAnimationFrame(tick);
}
function tick(now) {
  if(!state.playing)return;
  const seconds=state.audioReady?Math.max(0,audio.currentTime-state.project.music.offset):playbackOrigin.seconds+(now-playbackOrigin.clock)/1000;
  state.beat=secondsToBeat(state.project,seconds);
  const s=sections(state.project).find(s=>state.beat>=s.start&&state.beat<s.start+s.beats);
  if(s&&s.id!==state.section){state.section=s.id;state.selected=null;renderMain();}
  updateLive();
  if(state.beat>=totalBeats(state.project)){pause();return;}
  frameRequest=requestAnimationFrame(tick);
}
function pause() {state.playing=false;audio.pause();if(frameRequest)cancelAnimationFrame(frameRequest);if($('#play-toggle'))$('#play-toggle').innerHTML=icon('play');}
audio.addEventListener('ended',pause);
audio.addEventListener('error',()=>{pause();state.audioReady=false;toast('Diese Musikdatei kann der Browser nicht lesen. Versuche MP3 oder WAV.');});
function clearAudio(){pause();state.audioReady=false;audio.removeAttribute('src');audio.load();if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=null;}
$('#audio-file').addEventListener('change',event=>{
  const file=event.target.files[0];if(!file)return;clearAudio();state.audioUrl=URL.createObjectURL(file);audio.src=state.audioUrl;
  audio.onloadedmetadata=()=>{if(!Number.isFinite(audio.duration)||audio.duration<=0){toast('Musikdauer konnte nicht ermittelt werden.');return;}state.audioReady=true;mutate(p=>{p.music.name=file.name;p.music.duration=audio.duration;});toast(`Musik geladen: ${file.name}`);};audio.load();event.target.value='';
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;event.target.value='';
  try {
    if(file.size>5*1024*1024)throw new Error('Projektdatei ist grösser als 5 MB.');
    const project=JSON.parse(await file.text());
    if(!confirm('Dieses Projekt laden und den aktuellen Stand ersetzen? Bei Bedarf zuerst das aktuelle Projekt als JSON sichern.'))return;
    await save();if(state.saving||state.savedVersion!==state.version)throw new Error('Speichern zuerst abschliessen oder den Speicherkonflikt lösen.');
    const response=await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,revision:state.revision})});const result=await response.json();if(!response.ok)throw new Error(result.error);
    const old=clone(state.project);clearAudio();state.project=project;state.revision=result.revision;state.report=result.report;state.history.push(old);state.future=[];state.section=project.sections[0].id;state.person='';state.selected=null;state.beat=0;state.status='Lokal gespeichert';$('#editor').close();render();toast('Projekt importiert.');
  }catch(error){toast(`Import fehlgeschlagen: ${error.message}`);}
});
function safeName(name){return name.replace(/[^a-zA-Z0-9äöüÄÖÜ_-]+/g,'-');}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCsv() {
  const p=state.project,rows=[['Turner','Abschnitt','Aktion','Art','Posten','Programmstart Sekunden','Musikstart Sekunden','Absoluter Startschlag','Zählgruppe','Schlag in Gruppe','Dauer Schläge','Auftrag','Schlagnotizen (absolut)']];
  for(const person of p.people.filter(p=>!state.person||state.person===p.id))for(const a of globalActions(p).filter(a=>a.people.includes(person.id)))rows.push([person.name,a.section.name,a.title,kinds[a.kind],p.stations.find(s=>s.id===a.station_id)?.name||'Freie Fläche',beatToSeconds(p,a.globalStart).toFixed(2),(beatToSeconds(p,a.globalStart)+p.music.offset).toFixed(2),a.globalStart+1,Math.floor(a.globalStart/p.phrase)+1,a.globalStart%p.phrase+1,a.length,a.note,a.cues.map(c=>`${a.globalStart+c.beat+1}: ${c.text}`).join(' | ')]);
  // Escape spreadsheet formula prefixes as well as CSV quoting.
  const encode=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  download(`${safeName(p.name)}-ablauf.csv`,'\uFEFF'+rows.map(r=>r.map(encode).join(';')).join('\r\n'),'text/csv;charset=utf-8');
}
function undo(){if(!state.history.length)return;pause();state.future.push(clone(state.project));state.project=state.history.pop();state.version++;state.section=state.project.sections.some(s=>s.id===state.section)?state.section:state.project.sections[0].id;state.person=state.project.people.some(p=>p.id===state.person)?state.person:'';state.beat=Math.min(state.beat,totalBeats(state.project));state.status='Änderungen werden gespeichert …';render();scheduleSave();}
document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select')||$('#editor').open)return;if((event.ctrlKey||event.metaKey)&&event.key==='z'){event.preventDefault();undo();}if(event.code==='Space'){event.preventDefault();state.playing?pause():play();}});
window.addEventListener('beforeunload',event=>{if(state.savedVersion!==state.version){event.preventDefault();event.returnValue='';}});

document.addEventListener('pointerdown',event=>{
  const target=event.target.closest('[data-drag]');if(!target)return;
  const type=target.dataset.drag,id=target.dataset.id;
  const editable=type==='station'?state.floorMode==='layout':state.floorMode==='positions';
  pause();drag={type,id,editable,before:clone(state.project),moved:false,x:event.clientX,y:event.clientY,el:target,svg:$('#stage')};
  if(editable){target.setPointerCapture(event.pointerId);event.preventDefault();}
});
document.addEventListener('pointermove',event=>{
  if(!drag?.editable)return;
  if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<3&&!drag.moved)return;
  drag.moved=true;const matrix=drag.svg.getScreenCTM();if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const x=Math.round(clamp(point.x/40,0,state.project.floor.width)*10)/10,y=Math.round(clamp(point.y/40,0,state.project.floor.height)*10)/10;
  if(drag.type==='station')Object.assign(state.project.stations.find(s=>s.id===drag.id),{x,y});
  else setFrame(state.project.people.find(p=>p.id===drag.id),snap(state.beat),x,y,state.transition);
  drag.el.setAttribute('transform',`translate(${x*40} ${y*40})`);
});
document.addEventListener('pointerup',()=>{
  if(!drag)return;const d=drag;drag=null;
  if(d.moved)markChanged(d.before);
  else if(d.type==='station'&&state.floorMode==='layout')stationEditor(d.id);
  else if(d.type==='person'){state.person=state.person===d.id?'':d.id;renderMain();}
});
document.addEventListener('pointercancel',()=>{if(drag){state.project=drag.before;drag=null;renderMain();}});
function help(){showModal('So planst du dein Programm',`<ol class="help-steps"><li><b>Riege und Fläche einrichten.</b> Unter „Turnende“ Namen erfassen; in den Einstellungen Barrenanzahl und Flächengrösse setzen.</li><li><b>Geräte aufstellen.</b> In der Aufstellung „Geräte verschieben“ wählen. Barren ziehen oder anklicken, um ihre Drehung einzustellen.</li><li><b>Abschnitte und Aktionen schreiben.</b> Länge und Tempo pro Abschnitt festlegen. Aktionen ordnen Turnende, Gerät, Einsatz und Schlagnotizen zu.</li><li><b>Wege zeichnen.</b> Zeitregler auf den Wegbeginn stellen, „Positionen setzen“ wählen und die Person platzieren. Am Ankunftsschlag erneut platzieren. Der Weg wird dazwischen linear dargestellt. Für Standphasen „Bis dahin stehen bleiben“ wählen.</li><li><b>Bausteine wiederverwenden.</b> Eine Aktion als Baustein sichern und mit anderer Besetzung erneut einfügen. Im Baustein kann die Zählberechtigung einzelner Elemente erfasst werden.</li><li><b>Proben und ausgeben.</b> Musik laden, den ersten Schlag über den Musikversatz ausrichten und abspielen. Unter „Turnende“ filtern, drucken oder CSV exportieren.</li></ol><p>Die Uhrzeit wird aus BPM berechnet; variable Tempi werden über separate Abschnitte abgebildet. Positionen sind schematisch, ohne automatische Gerätebindung oder Kollisionsprüfung. Die Demonstration ist keine geprüfte Wettkampfübung.</p><p><b>Speicherung:</b> Automatisch lokal in SQLite. JSON-Sicherungen enthalten das ganze Programm ohne Musik. Ctrl+Z macht Bearbeitungen rückgängig; Leertaste startet oder pausiert.</p>`,'help');const footer=$('#editor .modal-footer');footer.innerHTML=btn('close-modal','Verstanden','primary');}
async function init(){
  try {
    const response=await fetch('/api/project');if(!response.ok)throw new Error('Server antwortet nicht.');const data=await response.json();Object.assign(state,data);state.section=state.project.sections[0].id;state.status='Lokal gespeichert';render();
    let draft;try{draft=JSON.parse(localStorage.getItem('vgt-draft'));}catch{}
    if(draft&&confirm('Ein ungespeicherter lokaler Entwurf wurde gefunden. Möchtest du ihn als JSON herunterladen, um ihn zu prüfen und bei Bedarf zu importieren?'))download('vgt-wiederhergestellter-entwurf.json',JSON.stringify(draft.project,null,2),'application/json');
  } catch(error){$('#app').innerHTML=`<div class="loading"><h1>VGT Studio</h1><p>${esc(error.message)}</p><p>Starte die Anwendung mit <code>python app.py</code> und öffne die angezeigte lokale Adresse.</p></div>`;}
}
init();
