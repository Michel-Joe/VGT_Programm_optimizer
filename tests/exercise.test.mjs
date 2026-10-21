import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDuration,durationText,parseSequence,sequenceText,freeSequence,scaleSequence} from '../static/exercise.js';
test('duration accepts eights, mixed counts and fractional beats',()=>{
  for(const [s,n] of [['1x8',8],['2 × 8',16],['3x8 + 7',31],['1,5',1.5],['12',12]])assert.equal(parseDuration(s),n);
  assert.equal(durationText(16),'2x8');assert.equal(durationText(7),'1x7');
  assert.equal(durationText(20),'2x8 + 1x4');assert.equal(parseDuration('2x8 + 1x4'),20);
  for(const s of ['', '0','-8','abc','1x8+','4097','1.1','Infinity'])assert.throws(()=>parseDuration(s));
});
test('only explicit times become cues; the free order is preserved',()=>{
  const sequence='7 Arme\n8 Einsprung\nRückschwung, Vorschwung\nRückschwung Salto';
  assert.deepEqual(parseSequence(sequence,8),[{beat:6,text:'Arme'},{beat:7,text:'Einsprung'}]);
  assert.equal(freeSequence({sequence}),'Rückschwung, Vorschwung\nRückschwung Salto');
  assert.equal(sequenceText({sequence,cues:[]}),sequence);
});
test('legacy cues roundtrip and explicit times must fit',()=>{
  const item={cues:[{beat:0,text:'Start'},{beat:7.5,text:'Ende'}]};
  assert.deepEqual(parseSequence(sequenceText(item),8),item.cues);
  assert.deepEqual(parseSequence('1,5: Arme',8),[{beat:.5,text:'Arme'}]);
  for(const s of ['9 Ende','0 Arme','1.1 Arme'])assert.throws(()=>parseSequence(s,8));
});
test('scaling changes only timed lines',()=>{
  assert.equal(scaleSequence('1 Start\n5 Schwung\nSalto',8,16),'1 Start\n9 Schwung\nSalto');
});
