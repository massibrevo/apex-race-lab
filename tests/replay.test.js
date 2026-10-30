import test from 'node:test';
import assert from 'node:assert/strict';
import {sample,indexAt,lapAt,stintAt,formatTime} from '../dist/replay.js';
test('seeks and interpolates measured positions without crossing gaps',()=>{
 const rows=[[1,10,20],[2,20,40],[20,300,500]];
 assert.equal(indexAt(rows,0),-1);assert.equal(indexAt(rows,1.9),0);
 assert.deepEqual(sample(rows,1.5,5,true),[1.5,15,30]);
 assert.equal(sample(rows,9,5,true),null);
 assert.deepEqual(sample(rows,3,5,true),[2,20,40]);
 assert.equal(sample([],1),null);
});
test('lap and tyre selection uses session time, not playback speed',()=>{
 const d={session:{start:'2024-09-01T13:00:00Z'},laps:[{driver_number:16,lap_number:1,date_start:'2024-09-01T13:00:00Z'},{driver_number:16,lap_number:2,date_start:'2024-09-01T13:01:30Z'}],stints:[{driver_number:16,lap_start:1,lap_end:12,compound:'MEDIUM'}]};
 assert.equal(lapAt(d,'16',100).lap_number,2);assert.equal(stintAt(d,16,2).compound,'MEDIUM');assert.equal(formatTime(480),'08:00');
});
