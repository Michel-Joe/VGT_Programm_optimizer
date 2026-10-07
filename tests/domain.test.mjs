import test from 'node:test';
import assert from 'node:assert/strict';
import {beatToSeconds, secondsToBeat, positionAt, resizeSection, scaleAction, setFrame, countLabel, formatTime} from '../static/domain.js';

function project() {return {phrase:8,sections:[{id:'a',beats:8,bpm:60},{id:'b',beats:8,bpm:120}],actions:[{section_id:'a',start:0,length:4}],people:[{id:'p',frames:[{beat:0,x:0,y:0,transition:'hold'},{beat:8,x:8,y:4,transition:'linear'},{beat:16,x:4,y:2,transition:'hold'}]}]};}
test('tempo map round-trips exact and fractional beats across sections',()=>{const p=project();for(const beat of [0,.25,4,7.5,8,8.5,15.75,16])assert.equal(secondsToBeat(p,beatToSeconds(p,beat)),beat);assert.equal(beatToSeconds(p,16),12);});
test('movement interpolates and holding changes only at boundary',()=>{const person=project().people[0];assert.deepEqual(positionAt(person,4),{x:4,y:2});assert.equal(positionAt(person,15.5).x,8);assert.equal(positionAt(person,16).x,4);});
test('inserting a position replaces the existing beat',()=>{const person=project().people[0];setFrame(person,8,2,3);assert.equal(person.frames.length,3);assert.equal(positionAt(person,8).x,2);});
test('resizing shifts subsequent keyframes without shifting local actions',()=>{const p=project();resizeSection(p,'a',12);assert.deepEqual(p.people[0].frames.map(f=>f.beat),[0,12,20]);assert.equal(p.actions[0].start,0);assert.equal(p.sections[0].beats,12);});
test('shrinking cannot silently drop cues or positions',()=>{const p=project();assert.throws(()=>resizeSection(p,'a',2),/Aktionen/);setFrame(p.people[0],6,1,1);assert.throws(()=>resizeSection(p,'a',6),/Positionen/);assert.equal(p.sections[0].beats,8);});
test('duration scaling keeps cues inside the action at quarter-beat precision',()=>{const a={length:8,cues:[{beat:0,text:'go'},{beat:7.75,text:'end'}]};scaleAction(a,3);assert.equal(a.length,3);assert.equal(a.cues[0].beat,0);assert.equal(a.cues[1].beat,2.75);});
test('6-count and offbeat labels do not assume eights',()=>{const p=project();p.phrase=6;assert.equal(countLabel(p,6.5),'2 · 1.5');});
test('precise report times carry correctly across minute boundaries',()=>{assert.equal(formatTime(59.999,true),'1:00,00');assert.equal(formatTime(10.9615,true),'0:10,96');});
