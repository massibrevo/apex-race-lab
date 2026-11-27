import { fetchSeason, raceStatus } from './championship-data.js';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const item = document.createElement(tag);
  if (text != null) item.textContent = text;
  if (className) item.className = className;
  return item;
};
const date = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
const number = new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
const data = new Map();
let archive = new Set();
let started = false;
let active = false;
let generation = 0;
let pending = false;
let showAll = false;
let selected;
let requestQueue = Promise.resolve();
function pacedFetch(url, options) {
  const request = requestQueue.then(()=>fetch(url,options));
  requestQueue = request.catch(()=>{}).then(()=>new Promise(resolve=>setTimeout(resolve,600)));
  return request;
}

function standings(kind, rows) {
  const list = $('champ-' + kind);
  const table = node('table');
  table.setAttribute('aria-label',kind === 'teams' ? 'Constructor standings' : 'Driver standings');
  const head = table.createTHead().insertRow();
  for (const title of ['Pos.','Name','Points','Last race']) {
    const cell = node('th',title);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    tr.append(node('td',String(row.position).padStart(2,'0'),'champ-position'));
    const name = node('th',row.name);
    name.scope = 'row';
    if (row.team) name.append(node('small',row.team));
    tr.append(name,node('td',number.format(row.points),'champ-points'),
      node('td',row.gained == null ? '—' : `${row.gained > 0 ? '+' : ''}${number.format(row.gained)}`,'champ-gain'));
  }
  list.replaceChildren(table);
}

function render() {
  const entry = data.get(selected);
  if (!entry) {
    $('champ-freshness').textContent = 'Waiting for standings from OpenF1.';
    $('champ-title').textContent = `${selected} Championship`;
    $('champ-leaders').replaceChildren();
    for (const id of ['champ-teams','champ-drivers','champ-races']) $(id).replaceChildren();
    return;
  }
  const {season, fresh} = entry;
  $('champ-title').textContent = `${season.year} Championship`;
  const through = season.races.find(race=>race.key===season.through);
  $('champ-freshness').textContent = `${fresh ? 'OpenF1 checked' : 'Saved snapshot'} ${date.format(new Date(season.checkedAt))} · Standings through ${through?.name ?? 'the latest classified race'}`;
  $('champ-leaders').replaceChildren(...[['Constructors’ leader', season.teams[0]], ['Drivers’ leader', season.drivers[0]]].map(([caption,row]) => {
    const tile = node('article',null,'champ-leader');
    tile.append(node('p',caption),node('h2',row.name),node('strong',number.format(row.points)),node('span','pts'));
    return tile;
  }));
  standings('teams',season.teams);
  standings('drivers',season.drivers);
  const past = season.races.filter(race=>Date.parse(race.raceEnd)<=Date.now()).reverse();
  const future = season.races.filter(race=>Date.parse(race.raceEnd)>Date.now());
  const races = showAll ? [...future,...past] : [...future.slice(0,1),...past.slice(0,3)];
  $('champ-calendar-toggle').textContent = showAll ? 'Show recent races' : 'Show full calendar';
  $('champ-calendar-toggle').setAttribute('aria-expanded',String(showAll));
  $('champ-races').replaceChildren(...races.map(race=>{
    const tile = node('article',null,'champ-race');
    const status = raceStatus(race);
    tile.append(node('span',`GP ${String(race.round).padStart(2,'0')} · ${status}`,'champ-event-status'),
      node('h3',race.name),node('p',race.circuit),node('time',date.format(new Date(race.raceStart))));
    if (race.winner) tile.append(node('p',`Winner · ${race.winner}`,'champ-winner'));
    if (archive.has(race.key)) {
      const link = node('a','Open race replay','champ-link');
      link.href = `?session=${race.key}`;
      tile.append(link);
    } else if (race.winner) tile.append(node('p','Replay not yet published'));
    return tile;
  }));
}

async function refresh() {
  if (!active || pending) return;
  const attempt = ++generation;
  const year = selected;
  pending = true;
  $('champ-refresh').disabled = true;
  $('champ-notice').textContent = 'Checking OpenF1…';
  try {
    const old = data.get(year)?.season;
    const knownDrivers = old?.drivers.map(row=>({driver_number:Number(row.id),full_name:row.name,team_name:row.team})) ?? [];
    const season = await fetchSeason(year,{knownDrivers,fetcher:pacedFetch});
    const oldRace = old?.races.find(race=>race.key===old.through);
    const nextRace = season.races.find(race=>race.key===season.through);
    if (oldRace && Date.parse(nextRace.raceStart)<Date.parse(oldRace.raceStart)) throw new Error('Older source result');
    data.set(year,{season,fresh:true});
    if (attempt === generation) $('champ-notice').textContent = 'Refreshes every three minutes while open.';
  } catch {
    const cached = data.get(year);
    if (cached) cached.fresh = false;
    if (attempt === generation) $('champ-notice').textContent = 'OpenF1 is temporarily unavailable. Saved data stays visible when available.';
  } finally {
    pending = false;
    $('champ-refresh').disabled = false;
    render();
    if (attempt !== generation && active) refresh();
  }
}

export async function openChampionship() {
  active = true;
  if (started) {
    if (data.has(selected) && Date.now()-Date.parse(data.get(selected).season.checkedAt)>180000) refresh();
    return;
  }
  started = true;
  const current = new Date().getUTCFullYear();
  selected = current;
  const years = Array.from({length:Math.max(1,current-2024+1)},(_,i)=>current-i);
  $('champ-year').replaceChildren(...years.map(year=>new Option(year,year)));
  $('champ-year').onchange = event => {
    ++generation;
    selected = Number(event.target.value);
    showAll = false;
    render();
    refresh();
  };
  $('champ-calendar-toggle').onclick = () => { showAll = !showAll; render(); };
  $('champ-refresh').onclick = refresh;
  const json = async url => {
    const response = await fetch(url,{cache:'no-cache'});
    if (!response.ok) throw new Error('Snapshot unavailable');
    return response.json();
  };
  await Promise.allSettled([
    json('./data/championship.json').then(({seasons}) => seasons.forEach(season=>data.set(season.year,{season,fresh:false}))),
    json('./data/session-catalog.json').then(({sessions}) => {archive = new Set(sessions.filter(row=>row.timing_available).map(row=>row.key));}),
  ]);
  render();
  refresh();
  setInterval(()=>{if (!document.hidden) refresh();},180000);
}
export function closeChampionship() { active = false; }
