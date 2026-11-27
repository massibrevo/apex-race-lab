const origin = 'https://api.openf1.org/v1/';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const timestamp = value => Date.parse(value);
const validStanding = row => Number.isInteger(row.position_current) && row.position_current > 0 && finite(row.points_current) && row.points_current >= 0;
const person = (row, number) => [row?.first_name, row?.last_name].filter(Boolean).join(' ') || row?.full_name || `Driver #${number}`;

async function read(endpoint, filters, {fetcher, token}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    for (const item of [value].flat()) query.append(key, item);
  }
  const response = await fetcher(origin + endpoint + '?' + query, {
    signal: AbortSignal.timeout(12000),
    ...(token ? {headers: {Authorization: `Bearer ${token}`}} : {}),
  });
  if (!response.ok) throw new Error(`OpenF1 ${endpoint}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error(`OpenF1 ${endpoint}: empty or invalid response`);
  return rows;
}

export function raceStatus(race, now = Date.now()) {
  if (race.winner) return 'Classified';
  if (now >= timestamp(race.raceStart) && now < timestamp(race.raceEnd)) return 'Scheduled race window';
  if (now >= timestamp(race.raceEnd)) return 'Awaiting classification';
  if (now >= timestamp(race.weekendStart)) return 'Weekend underway';
  return 'Upcoming';
}

export async function fetchSeason(year, {fetcher = fetch, token, now = Date.now(), knownDrivers = []} = {}) {
  if (!Number.isInteger(year) || year < 2024 || year > new Date(now).getUTCFullYear()) throw new Error('Unsupported season');
  const get = (endpoint, filters) => read(endpoint, filters, {fetcher, token});
  const [sessions, meetings] = await Promise.all([get('sessions', {year, session_name:'Race'}), get('meetings', {year})]);
  const calendar = sessions.filter(row => row.year === year && row.session_name === 'Race' && !row.is_cancelled && finite(timestamp(row.date_start)) && finite(timestamp(row.date_end))).sort((a,b) => timestamp(a.date_start)-timestamp(b.date_start));
  const past = calendar.filter(row => timestamp(row.date_end) <= now);
  if (!past.length) throw new Error('No completed race for this season');
  const winners = await get('session_result', {session_key: past.map(row => row.session_key), position: 1});
  const winnerMap = new Map(winners.filter(row => row.position === 1 && !row.dsq && !row.dns && !row.dnf).map(row => [row.session_key, row.driver_number]));
  const latest = past.findLast(row => winnerMap.has(row.session_key));
  if (!latest) throw new Error('No classified race for this season');
  const filter = {session_key: latest.session_key};
  const [driverRows, teamRows, roster] = await Promise.all([get('championship_drivers', filter),get('championship_teams', filter),get('drivers', filter)]);
  const identity = new Map(knownDrivers.map(row => [row.driver_number,row]));
  for (const driver of roster) identity.set(driver.driver_number,driver);
  const meeting = new Map(meetings.map(row => [row.meeting_key,row]));
  const toStanding = row => ({
    position: row.position_current,
    points: row.points_current,
    gained: finite(row.points_start) ? row.points_current-row.points_start : null,
  });
  const drivers = driverRows.filter(validStanding).map(row => {
    const id = identity.get(row.driver_number);
    return {...toStanding(row), id:String(row.driver_number), name:person(id,row.driver_number), team:id?.team_name ?? null};
  }).sort((a,b)=>a.position-b.position);
  const teams = teamRows.filter(row => validStanding(row) && row.team_name).map(row => ({...toStanding(row), id:row.team_name, name:row.team_name, team:null})).sort((a,b)=>a.position-b.position);
  for (const rows of [drivers,teams]) {
    if (rows.length < 2 || rows[0].position !== 1 || new Set(rows.map(row=>row.id)).size !== rows.length) throw new Error('Incomplete standings');
  }
  const races = calendar.map((row,index) => {
    const event = meeting.get(row.meeting_key);
    const number = winnerMap.get(row.session_key);
    return {key:row.session_key, round:index+1, name:event?.meeting_name || `${row.country_name} Grand Prix`,
      circuit:row.circuit_short_name, weekendStart:event?.date_start || row.date_start,
      raceStart:row.date_start, raceEnd:row.date_end, winner:number == null ? null : person(identity.get(number),number)};
  });
  return {year, checkedAt:new Date(now).toISOString(), through:latest.session_key,
    drivers, teams, races};
}
