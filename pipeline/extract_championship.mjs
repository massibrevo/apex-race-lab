import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fetchSeason } from '../dist/championship-data.js';

const target = process.argv[2];
if (!target) throw new Error('Provide an output path for championship extraction');
const catalog = JSON.parse(await readFile(new URL('../dist/data/session-catalog.json', import.meta.url))).sessions;
const years = process.argv.slice(3).map(Number);
if (!years.length) years.push(...new Set(catalog.map(row => row.year)));
const seasons = [];
let queue = Promise.resolve();
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
function pacedFetch(url, options) {
  const next = queue.then(async () => {
    const attempt = () => fetch(url,{...options,signal:AbortSignal.timeout(15000)});
    let response = await attempt();
    if (response.status === 429) {
      await response.body?.cancel();
      await sleep(20000);
      response = await attempt();
    }
    return response;
  });
  queue = next.catch(()=>{}).then(()=>sleep(2300));
  return next;
}
for (const year of years) {
  const roster = new Map();
  for (const row of catalog.filter(r => r.year === year && r.timing_available)) {
    const archive = JSON.parse(await readFile(new URL(`../dist/data/${row.key}.json`,import.meta.url)));
    for (const driver of archive.drivers) roster.set(driver.driver_number,driver);
  }
  seasons.push(await fetchSeason(year,{token:process.env.OPENF1_ACCESS_TOKEN,knownDrivers:[...roster.values()],fetcher:pacedFetch}));
}
await mkdir(dirname(target),{recursive:true});
await writeFile(target+'.tmp',JSON.stringify({seasons}));
await rename(target+'.tmp',target);
