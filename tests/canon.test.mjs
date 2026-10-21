import test from 'node:test';
import assert from 'node:assert/strict';
import {assignment,personActions,personMoment,actionEnd,eventBeats,resizeSection} from '../static/domain.js';
import {canonView,overviewView,peopleViewNew} from '../static/overview.js';
const fixture=()=>({name:'Test',music:{offset:0},sections:[{id:'s',name:'Teil',beats:24,bpm:60}],stations:[{id:'b1',name:'Barren 1'},{id:'b2',name:'Barren 2'}],people:['p1','p2'].map((id,i)=>({id,name:i?'Berta':'Anna',frames:[{beat:0,x:i,y:1,transition:'hold'}]})),actions:[{id:'a',title:'Kanon',section_id:'s',start:2,length:8,station_id:'b1',people:['p1','p2'],leader_id:'p1',sequence:'7 Arme\n8 Einsprung\nSalto <rückwärts>',cues:[{beat:6,text:'Arme'},{beat:7,text:'Einsprung'}],assignments:[{person_id:'p1',station_id:'b1',offset:0},{person_id:'p2',station_id:'b2',offset:4}]}]});
test('each participant has their own station, start and cue clock',()=>{
 const p=fixture(),a=personActions(p,'p2')[0];assert.equal(a.globalStart,6);assert.equal(a.station_id,'b2');assert.equal(actionEnd(p.actions[0]),14);
 assert.equal(personMoment(p,p.people[1],5).current.length,0);assert.equal(personMoment(p,p.people[1],6).current.length,1);assert.equal(personMoment(p,p.people[1],14).current.length,0);
 assert.deepEqual(eventBeats(p,'p2'),[0,6,12,13,14,24]);
 assert.throws(()=>resizeSection(p,'s',13),/Kanon/);
});
test('legacy group assignment still works',()=>{const p=fixture();delete p.actions[0].assignments;assert.equal(assignment(p.actions[0],'p2').station_id,'b1');assert.equal(personActions(p,'p2')[0].globalStart,2);});
test('views include devices, teammates, chief, escaped sequence and offset bars',()=>{
 const p=fixture(),ui={btn:()=>'',personOptions:()=>'',icon:()=>''};
 const html=peopleViewNew({project:p,person:'p2'},ui);assert.match(html,/Barren 2/);assert.match(html,/Anna/);assert.match(html,/Chef/);assert.match(html,/Salto &lt;rückwärts&gt;/);
 const all=overviewView({project:p,beat:7,person:''},ui);assert.match(all,/data-progress-start="6"/);assert.match(all,/Abschnittsschlag 3/);
 const bars=canonView(p,{...p.actions[0],globalStart:2},7);assert.match(bars,/width:12.5%/);
});
