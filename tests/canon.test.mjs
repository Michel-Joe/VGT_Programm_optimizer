import test from 'node:test';
import assert from 'node:assert/strict';
import {assignment,personActions,personMoment,actionEnd,afterActionPlacement,eventBeats,resizeSection} from '../static/domain.js';
import {canonView,overviewView,peopleViewNew} from '../static/overview.js';
import {copyStation,nextStationName} from '../static/equipment.js';
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
test('side-post exit starts exactly as the next section and another exercise begin',()=>{
 const p=fixture();p.sections=[{id:'s',name:'Übung 1',beats:8,bpm:60},{id:'s2',name:'Übung 2',beats:8,bpm:60}];
 p.actions[0].start=0;p.actions[0].length=8;p.actions[0].assignments.forEach(x=>x.offset=0);
 assert.deepEqual(afterActionPlacement(p,p.actions[0]),{section_id:'s2',start:0,absolute:8});
 p.actions.push({id:'entry',title:'Eingang',section_id:'s2',start:0,length:1,kind:'apparatus',station_id:'b1',people:['p2'],leader_id:'',part_id:'',note:'',cues:[],elements:[]});
 p.actions.push({id:'exit',title:'Schritt über Matte',section_id:'s2',start:0,length:1,kind:'side',station_id:'b2',people:['p1'],leader_id:'',part_id:'',note:'',sequence:'1 Schritt über Matte',cues:[{beat:0,text:'Schritt über Matte'}],elements:[]});
 assert.equal(personMoment(p,p.people[0],8).current[0].id,'exit');
 assert.equal(personMoment(p,p.people[1],8).current[0].id,'entry');
 const html=overviewView({project:p,beat:8,person:''},{btn:()=>'',personOptions:()=>'',icon:()=>''});
 assert.match(html,/Schritt über Matte/);assert.match(html,/Nebenposten/);
});
test('copying equipment increments the highest matching name and offsets placement',()=>{
 const p={floor:{width:12,height:12},stations:[{id:'m1',name:'Matte dünn 1',kind:'mat_thin',x:3,y:4,rotation:20,width:2,depth:1},{id:'m3',name:'Matte dünn 3',kind:'mat_thin',x:7,y:4}]};
 assert.equal(nextStationName(p.stations,p.stations[0]),'Matte dünn 4');
 const first=copyStation(p,p.stations[0],'m4');assert.equal(first.name,'Matte dünn 4');assert.equal(first.x,3.5);assert.equal(first.y,4.5);assert.equal(first.rotation,20);assert.equal(first.width,2);
 p.stations.push(first);const second=copyStation(p,p.stations[0],'m5',2);assert.equal(second.name,'Matte dünn 5');assert.equal(second.x,4);assert.equal(second.y,5);
});
