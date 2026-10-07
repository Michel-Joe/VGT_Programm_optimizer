export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = prefix => `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const snap = n => Math.round(n * 4) / 4;
export function sections(project) {
  let start = 0, seconds = 0;
  return project.sections.map(s => {
    const result = {...s, start, seconds};
    start += s.beats;
    seconds += s.beats * 60 / s.bpm;
    return result;
  });
}
export const totalBeats = p => p.sections.reduce((n, s) => n + s.beats, 0);
export function beatToSeconds(p, beat) {
  return sections(p).reduce((n, s) => n + clamp(beat - s.start, 0, s.beats) * 60 / s.bpm, 0);
}
export function secondsToBeat(p, seconds) {
  const ss = sections(p);
  for (const s of ss) if (seconds < s.seconds + s.beats * 60 / s.bpm) return s.start + Math.max(0, seconds - s.seconds) * s.bpm / 60;
  return totalBeats(p);
}
export function positionAt(person, beat) {
  const fs = [...person.frames].sort((a,b) => a.beat-b.beat);
  let prev = fs[0];
  for (const next of fs.slice(1)) {
    if (beat < next.beat) {
      if (next.transition === 'hold') return {...prev};
      const t = clamp((beat-prev.beat)/(next.beat-prev.beat),0,1);
      return {x: prev.x+(next.x-prev.x)*t, y:prev.y+(next.y-prev.y)*t};
    }
    prev = next;
  }
  return {...prev};
}
export function setFrame(person, beat, x, y, transition='linear') {
  person.frames = person.frames.filter(f => f.beat !== beat);
  person.frames.push({beat, x, y, transition});
  person.frames.sort((a,b) => a.beat-b.beat);
}
export function resizeSection(p, id, length) {
  const s = sections(p).find(s => s.id === id);
  if (!s) throw new Error('Abschnitt nicht gefunden.');
  if (p.actions.some(a => a.section_id === id && a.start+a.length > length)) throw new Error('Zuerst die Aktionen kürzen, die über das neue Abschnittsende reichen.');
  const oldEnd = s.start+s.beats, newEnd = s.start+length, delta = length-s.beats;
  if (delta < 0 && p.people.some(person => person.frames.some(f => f.beat >= newEnd && f.beat < oldEnd))) throw new Error('Im gekürzten Bereich liegen gespeicherte Positionen. Diese zuerst in der Personenansicht entfernen.');
  for (const person of p.people) person.frames.forEach(f => { if (f.beat >= oldEnd) f.beat += delta; });
  p.sections.find(s => s.id === id).beats = length;
}
export function globalActions(p) {
  const map = Object.fromEntries(sections(p).map(s => [s.id,s]));
  return p.actions.map(a => ({...a, globalStart:map[a.section_id].start+a.start, section:map[a.section_id]})).sort((a,b) => a.globalStart-b.globalStart);
}
export function scaleAction(a, length) {
  const factor = length/a.length;
  a.cues = a.cues.map(c => ({...c,beat:Math.min(length-.25, snap(c.beat*factor))}));
  a.length = length;
}
export function formatTime(seconds, precise=false) {
  if (precise) {
    const n = Math.max(0, Math.round(seconds*100));
    return `${Math.floor(n/6000)}:${String(Math.floor(n/100)%60).padStart(2,'0')},${String(n%100).padStart(2,'0')}`;
  }
  const n = Math.max(0, Math.round(seconds));
  return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
}
export function countLabel(p, beat) {
  return `${Math.floor(beat/p.phrase)+1} · ${+(beat%p.phrase+1).toFixed(2)}`;
}
