export const stationKinds={bar:'Barren',trampoline:'Trampolin',mat_thin:'Matte dünn',mat_thick:'Matte dick',mat16:'16er-Matte',box:'Kasten',side:'Nebenposten'};
export const sizes={bar:[1.55,3.45],trampoline:[1.3,1.3],mat_thin:[2,1],mat_thick:[3,2],mat16:[2,1],box:[1.5,.6],side:[3,1.2]};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function nextStationName(stations, source) {
  const match=source.name.trim().match(/^(.*?)(?:\s+(\d+))?$/);
  const base=(match?.[1]||source.name).trim();
  const numbers=stations.map(s=>s.name.trim().match(/^(.*?)(?:\s+(\d+))?$/)).filter(m=>m&&m[1].trim()===base).map(m=>Number(m[2]||0));
  return `${base} ${Math.max(0,...numbers)+1}`;
}
export function copyStation(project, source, id, sequence=1) {
  const shift=.5*sequence;
  return {...source,id,name:nextStationName(project.stations,source),x:Math.round(Math.min(project.floor.width,source.x+shift)*10)/10,y:Math.round(Math.min(project.floor.height,source.y+shift)*10)/10};
}
export function stationSvg(s,selected=false){
  const [dw,dh]=sizes[s.kind]||sizes.side,w=(s.width||dw)*40,h=(s.depth||dh)*40;
  const colors={bar:['#dcebe0','#435c4e'],trampoline:['#d7e6ed','#496c86'],mat_thin:['#bcd9ef','#5887a3'],mat_thick:['#8fb5d1','#416680'],mat16:['#dcc6ee','#8d6fa3'],box:['#dcc09c','#8a6840'],side:['#ede5d4','#a99c78']},[fill,stroke]=colors[s.kind]||colors.side;
  let inside='';
  if(s.kind==='bar')inside=`<path d="M${-w*.24} ${-h*.37}V${h*.37}M${w*.24} ${-h*.37}V${h*.37}" stroke="${stroke}" stroke-width="7"/><path d="M${-w*.4} ${-h*.25}H${w*.4}M${-w*.4} ${h*.25}H${w*.4}" stroke="${stroke}" stroke-width="3"/>`;
  if(s.kind==='trampoline')inside=`<rect x="${-w*.32}" y="${-h*.32}" width="${w*.64}" height="${h*.64}" fill="white" stroke="${stroke}" stroke-dasharray="3 3"/>`;
  if(s.kind==='box')inside=`<path d="M${-w/2} ${-h*.17}H${w/2}M${-w/2} ${h*.17}H${w/2}" stroke="${stroke}" stroke-width="2"/>`;
  return `<g transform="translate(${s.x*40} ${s.y*40})" data-drag="station" data-id="${esc(s.id)}" class="stage-station ${selected?'selected':''}"><g transform="rotate(${s.rotation})"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${inside}</g><text y="${h/2+20}" text-anchor="middle" class="station-label">${esc(s.name)}</text><title>${esc(stationKinds[s.kind])}: ${esc(s.name)} · ${s.x}, ${s.y} m</title></g>`;
}
