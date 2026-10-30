/** Timestamp-indexed sampling. Never fabricate measurements across gaps. */
export function indexAt(rows, t) {
  if (!rows?.length || t < rows[0][0]) return -1;
  let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(rows[mid][0]<=t)lo=mid;else hi=mid-1;}return lo;
}
export function sample(rows,t,maxAge=5,interpolate=false){
  const i=indexAt(rows,t);if(i<0||t-rows[i][0]>maxAge)return null;
  const a=rows[i],b=rows[i+1];if(!interpolate||!b||b[0]-a[0]>maxAge)return a;
  const f=(t-a[0])/(b[0]-a[0]);return a.map((v,k)=>k?v+(b[k]-v)*f:t);
}
export function lapAt(data,n,t){
  const absolute=Date.parse(data.session.start)/1000+t;
  return data.laps.filter(l=>String(l.driver_number)===String(n)&&l.date_start&&Date.parse(l.date_start)/1000<=absolute).sort((a,b)=>b.lap_number-a.lap_number)[0]||null;
}
export function stintAt(data,n,lap){return data.stints.find(s=>String(s.driver_number)===String(n)&&s.lap_start<=lap&&s.lap_end>=lap)||null;}
export function formatTime(t){const n=Math.max(0,Math.floor(t));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
