import test from 'node:test';
import assert from 'node:assert/strict';
import {personMoment, eventBeats, cueAt} from '../static/domain.js';
import {momentRows,chiefLabel} from '../static/writer.js';

function fixture(){return {sections:[{id:'s1',name:'Erster Teil',beats:8,bpm:60},{id:'s2',name:'Zweiter Teil',beats:8,bpm:60}],people:[{id:'p1',name:'Anna <Test>',color:'#217c70',frames:[{beat:0,x:1,y:1,transition:'hold'},{beat:8,x:5,y:3,transition:'linear'}]}],stations:[],music:{offset:0},actions:[
  {id:'a',title:'Anlaufen',section_id:'s1',start:0,length:8,people:['p1'],cues:[],kind:'travel'},
  {id:'b',title:'Kippe',section_id:'s2',start:0,length:4,people:['p1'],leader_id:'p1',cues:[{beat:0,text:'Start'},{beat:.5,text:'und'}],kind:'apparatus'},
  {id:'c',title:'Abschluss',section_id:'s2',start:6,length:2,people:['p1'],cues:[],kind:'pose'},
]};}
test('writing context spans sections and switches at exact handover',()=>{
  const p=fixture(),m=personMoment(p,p.people[0],8);
  assert.deepEqual(m.previous.map(a=>a.id),['a']);
  assert.deepEqual(m.current.map(a=>a.id),['b']);
  assert.deepEqual(m.next.map(a=>a.id),['c']);
  assert.deepEqual({x:m.position.x,y:m.position.y},{x:5,y:3});
});
test('gaps do not silently carry a previous instruction forward',()=>{
  const p=fixture(),m=personMoment(p,p.people[0],13);
  assert.equal(m.current.length,0);assert.equal(m.previous[0].id,'b');assert.equal(m.next[0].id,'c');
});
test('simultaneous assignments are retained for conflict visibility',()=>{
  const p=fixture();p.actions.push({...p.actions[1],id:'parallel'});
  assert.equal(personMoment(p,p.people[0],9).current.length,2);
  assert.match(momentRows({project:p,beat:9,person:''}),/Zeitgleiche Aufträge prüfen/);
});
test('navigation includes cues, boundaries and position points',()=>{
  assert.deepEqual(eventBeats(fixture()),[0,8,8.5,12,14,16]);
});
test('latest cue is chosen by absolute time; no future instruction leaks',()=>{
  const p=fixture(),a=personMoment(p,p.people[0],8).current[0];
  assert.equal(cueAt(a,8.25).text,'Start');assert.equal(cueAt(a,8.5).text,'und');
});
test('programme end has no active action or next action',()=>{
  const p=fixture(),m=personMoment(p,p.people[0],16);
  assert.equal(m.current.length,0);assert.equal(m.next.length,0);assert.equal(m.previous[0].id,'c');
});
test('chief and user-entered names are rendered safely',()=>{
  const p=fixture();assert.equal(chiefLabel(p,p.actions[1]),'Anna <Test>');
  assert.equal(chiefLabel(p,p.actions[0]),'Noch offen');
  const html=momentRows({project:p,beat:8,person:''});assert.match(html,/Anna &lt;Test&gt;/);assert.doesNotMatch(html,/Anna <Test>/);assert.match(html,/★ Chef/);
});
