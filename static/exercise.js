// A compact, paper-like editor: explicit counts are timed, prose stays untimed.
export function durationText(beats) {
  return beats % 8 === 0 ? `${beats / 8}x8` : String(beats);
}
export function parseDuration(text) {
  const terms=String(text).trim().replaceAll('×','x').replaceAll(',','.').split('+');
  if(!terms.length || terms.some(t=>!/^\s*\d+(?:\.\d+)?\s*(?:[xX*]\s*\d+(?:\.\d+)?)?\s*$/.test(t)))
    throw new Error('Dauer z. B. als 1x8, 2x8, 3x8 + 7 oder 12 eingeben.');
  const value=terms.reduce((sum,t)=>sum+t.trim().split(/[xX*]/).reduce((n,v)=>n*Number(v),1),0);
  if(value<.25||value>4096||!Number.isInteger(value*4))throw new Error('Die Dauer muss 0.25 bis 4096 Schläge in Viertelschritten ergeben.');
  return value;
}
export function sequenceText(item) {
  return item.sequence ?? item.cues.map(c=>`${c.beat+1} ${c.text}`).join('\n');
}
export function sequenceLines(text) {
  return String(text).split(/\r?\n/).map((raw,index)=>{
    const line=raw.trim();
    // Optional colon, decimal comma and quarter beats are accepted. A numeric
    // prefix only becomes a count when followed by whitespace or a colon.
    const match=line.match(/^(\d+(?:[.,]\d+)?)(?:\s*:\s*|\s+)(\S.*)$/);
    return {line:index+1,raw,beat:match?Number(match[1].replace(',','.'))-1:null,text:match?match[2]:line};
  }).filter(line=>line.text);
}
export function parseSequence(text,length) {
  if(String(text).length>10000)throw new Error('Die Elementfolge darf höchstens 10000 Zeichen enthalten.');
  const lines=sequenceLines(text);
  for(const line of lines)if(line.beat!==null&&(!Number.isInteger(line.beat*4)||line.beat<0||line.beat>=length))
    throw new Error(`Zeile ${line.line}: Schlag ${line.beat+1} liegt ausserhalb der Übung oder nicht auf einem Viertelschlag.`);
  return lines.filter(line=>line.beat!==null).map(({beat,text})=>({beat,text})).sort((a,b)=>a.beat-b.beat);
}
export function scaleSequence(text,oldLength,newLength) {
  parseSequence(text,oldLength);
  const lines=sequenceLines(text),timed=new Map(lines.filter(l=>l.beat!==null).map(l=>[l.line,l]));
  return text.split(/\r?\n/).map((raw,i)=>{
    const line=timed.get(i+1);if(!line)return raw;
    const beat=Math.min(newLength-.25,Math.round(line.beat*newLength/oldLength*4)/4);
    return `${beat+1} ${line.text}`;
  }).join('\n');
}
