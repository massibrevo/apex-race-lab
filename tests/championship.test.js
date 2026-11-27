import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchSeason,raceStatus} from '../dist/championship-data.js';

const now = Date.parse('2026-11-27T12:00:00Z');
const event = (key,start,end) => ({year:2026,session_name:'Race',session_key:key,meeting_key:key,
  date_start:start,date_end:end,circuit_short_name:'Circuit',country_name:'Test'});
const fixtures = {
  sessions: [
    event(10,'2026-11-21T20:00Z','2026-11-21T22:00Z'),
    event(20,'2026-11-26T20:00Z','2026-11-26T22:00Z'),
    event(30,'2026-11-29T20:00Z','2026-11-29T22:00Z'),
    {...event(40,'2026-12-01T20:00Z','2026-12-01T22:00Z'),is_cancelled:true},
  ],
  meetings: [{meeting_key:30,meeting_name:'Next Grand Prix',date_start:'2026-11-27T09:00Z'}],
  session_result: [{session_key:10,position:1,driver_number:12}],
  championship_drivers: [
    {driver_number:12,position_current:1,points_current:100,points_start:88},
    {driver_number:3,position_current:2,points_current:80,points_start:80},
  ],
  championship_teams: [
    {team_name:'Mercedes',position_current:1,points_current:125,points_start:110},
    {team_name:'McLaren',position_current:2,points_current:100,points_start:85},
  ],
  drivers: [{driver_number:12,first_name:'Kimi',last_name:'Antonelli',team_name:'Mercedes'}],
};

test('standings use the last classified race and do not request future results',async()=>{
  const calls=[];
  const fetcher=async raw=>{
    const url=new URL(raw);calls.push(url);
    return Response.json(fixtures[url.pathname.split('/').at(-1)]);
  };
  const view=await fetchSeason(2026,{now,fetcher});
  assert.equal(view.through,10);
  assert.equal(view.drivers[0].name,'Kimi Antonelli');
  assert.equal(view.drivers[0].gained,12);
  assert.deepEqual(view.races.map(r=>r.key),[10,20,30]);
  assert.deepEqual(calls.find(u=>u.pathname.endsWith('/session_result')).searchParams.getAll('session_key'),['10','20']);
  assert.equal(calls.find(u=>u.pathname.endsWith('/championship_drivers')).searchParams.get('session_key'),'10');
  assert.equal(raceStatus(view.races[0],now),'Classified');
  assert.equal(raceStatus(view.races[1],now),'Awaiting classification');
  assert.equal(raceStatus(view.races[2],now),'Weekend underway');
  assert.equal(raceStatus(view.races[2],Date.parse('2026-11-29T20:30Z')),'Scheduled race window');
});

test('restricted access signals failure so the caller can retain its snapshot',async()=>{
  await assert.rejects(fetchSeason(2026,{now,fetcher:async()=>new Response(null,{status:403})}),/HTTP 403/);
});
