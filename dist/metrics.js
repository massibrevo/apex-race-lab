/** Descriptive engineering metrics; no fuel, traffic or weather correction. */
import {sample} from './replay.js';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const median=values=>{const a=values.filter(finite).sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length?(a.length%2?a[m]:(a[m-1]+a[m])/2):null;};
export function driverMetrics(data,driver,other,excludePitOut=true){
 const valid=n=>data.laps.filter(l=>String(l.driver_number)===String(n)&&finite(l.lap_duration)&&l.lap_duration>0&&(!excludePitOut||!l.is_pit_out_lap));
 const laps=valid(driver),rivals=new Map(valid(other).map(l=>[l.lap_number,l.lap_duration]));
 const matched=laps.filter(l=>rivals.has(l.lap_number)).map(l=>({lap:l.lap_number,delta:l.lap_duration-rivals.get(l.lap_number)}));
 const mean=laps.length?laps.reduce((s,l)=>s+l.lap_duration,0)/laps.length:null;
 const consistency=laps.length>=2?Math.sqrt(laps.reduce((s,l)=>s+(l.lap_duration-mean)**2,0)/laps.length):null;
 const sectors=[1,2,3].map(n=>{const v=laps.map(l=>l[`duration_sector_${n}`]).filter(v=>finite(v)&&v>0);return v.length?Math.min(...v):null;});
 const theoretical=sectors.every(finite)?sectors.reduce((a,b)=>a+b,0):null;
 const fastest=laps.length?Math.min(...laps.map(l=>l.lap_duration)):null;
 const rows=data.telemetry[driver]||[];let observed=0,full=0,braking=0;
 for(let i=0;i<rows.length;i++){const a=rows[i],end=Math.min(data.session.duration,rows[i+1]?.[0]??a[0]),dt=end-a[0];if(dt<=0||dt>5||a[0]<0)continue;observed+=dt;if(a[2]>=95)full+=dt;if(a[3]>0)braking+=dt;}
 return {laps:laps.length,matched,median:median(laps.map(l=>l.lap_duration)),delta:median(matched.map(l=>l.delta)),consistency,theoretical,potential:finite(theoretical)&&finite(fastest)?Math.max(0,fastest-theoretical):null,topSpeed:rows.length?Math.max(...rows.map(r=>r[1])):null,fullThrottle:observed?100*full/observed:null,braking:observed?100*braking/observed:null,coverage:100*observed/data.session.duration,observed};
}
export function referenceTrace(data){
 const gps=data.gps[data.provenance.track_driver]||[],rows=data.telemetry[data.provenance.track_driver]||[];
 // Track vertices are measured GPS observations from this reference lap.
 const lap=data.laps.find(l=>String(l.driver_number)===String(data.provenance.track_driver)&&l.lap_number===data.provenance.track_lap);
 if(!lap?.date_start)return data.track.map(()=>null);
 const start=(Date.parse(lap.date_start)-Date.parse(data.session.start))/1000;
 const points=gps.filter(p=>p[0]>=start&&p[0]<=start+lap.lap_duration);
 return data.track.map((p,i)=>{const g=points[i];return g&&g[1]===p[0]&&g[2]===p[1]?sample(rows,g[0],5):null;});
}
