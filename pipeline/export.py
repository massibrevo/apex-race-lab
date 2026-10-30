"""Validate bronze data and publish compact, reproducible browser read models."""
import argparse, json, hashlib, math
from datetime import datetime, timezone
from pathlib import Path
from ingest import ROOT, ingest

def epoch(value):
    return datetime.fromisoformat(value.replace('Z','+00:00')).timestamp()

def compact(rows, start, fields):
    grouped = {}
    for row in rows:
        t = round(epoch(row['date']) - start, 2)
        n = str(row['driver_number'])
        dest = grouped.setdefault(n, [])
        if dest and t - dest[-1][0] < 0.9: continue
        values = [row.get(f) for f in fields]
        if not all(isinstance(v,(float,int)) and math.isfinite(v) for v in values): continue
        if fields[0] == 'speed' and not (0 <= values[0] <= 400 and 0 <= values[1] <= 100 and 0 <= values[2] <= 100 and 0 <= values[3] <= 8): continue
        dest.append([t] + values)
    return grouped

def export(session,start,end,name,country,code,length,laps,raw=None,year=2024,circuit=None,round_no=None):
    raw = raw or ingest(session,start,end)
    s=epoch(start); duration=epoch(end)-s
    gps=compact(sorted(raw['location'],key=lambda x:x['date']),s,['x','y','z'])
    telemetry=compact(sorted(raw['car_data'],key=lambda x:x['date']),s,['speed','throttle','brake','n_gear','rpm','drs'])
    participants={str(d['driver_number']) for d in raw['drivers']}
    gps={n:rows for n,rows in gps.items() if rows and n in participants}
    telemetry={n:rows for n,rows in telemetry.items() if rows and n in participants}
    if len(gps)<10: raise ValueError('Insufficient GPS coverage for a race replay')
    candidates=[r for r in raw['laps'] if str(r['driver_number']) in gps and r.get('date_start') and r.get('lap_duration') and epoch(r['date_start'])>=s and epoch(r['date_start'])+r['lap_duration']<=s+duration and not r.get('is_pit_out_lap')]
    candidates.sort(key=lambda r:(r['driver_number'] not in (16,44,1,4),r['lap_number']))
    track=None
    for lap in candidates:
        track_driver=str(lap['driver_number']); begin=epoch(lap['date_start'])-s
        points=[p for p in gps[track_driver] if begin<=p[0]<=begin+lap['lap_duration']]
        if len(points)<40 or points[-1][0]-points[0][0]<lap['lap_duration']-5:continue
        if any(b[0]-a[0]>5 for a,b in zip(points,points[1:])):continue
        track=[[p[1],p[2]] for p in points];break
    if not track:raise ValueError('No complete measured lap with continuous GPS')
    drivers=[{k:r.get(k) for k in ('driver_number','name_acronym','full_name','team_name','team_colour')} for r in raw['drivers']]
    positions={}
    for r in raw['position']:
        positions.setdefault(str(r['driver_number']),[]).append([round(epoch(r['date'])-s,2),r['position']])
    for points in positions.values(): points.sort()
    laprows=[{k:r.get(k) for k in ('driver_number','lap_number','lap_duration','date_start','duration_sector_1','duration_sector_2','duration_sector_3','is_pit_out_lap')} for r in raw['laps']]
    weather=[r for r in raw['weather'] if epoch(r['date'])<=s]
    out={'schema_version':1,'session':{'key':session,'name':name,'country':country,'code':code,'year':year,'circuit':circuit,'round':round_no,'length':length,'total_laps':laps,'start':start,'duration':duration,'replay_available':True},'drivers':drivers,'track':track,'gps':gps,'telemetry':telemetry,'positions':positions,'laps':laprows,'stints':raw['stints'],'weather':weather[-1] if weather else {},'events':[r for r in raw['race_control'] if r.get('date') and s<=epoch(r['date'])<=s+duration]}
    out['provenance']={'source':'OpenF1','api':'https://api.openf1.org/v1','generated_at':datetime.now(timezone.utc).isoformat(),'raw_rows':{k:len(v) for k,v in raw.items() if not k.startswith('_')},'gps_samples':sum(map(len,gps.values())),'telemetry_samples':sum(map(len,telemetry.values())),'track_driver':track_driver,'track_lap':lap['lap_number'],'sampling':'approximately 1 Hz; linear GPS interpolation; no simulated telemetry','quality':{'driver_coverage':len(gps),'participants':len(drivers),'finite_coordinates':True,'monotonic_timestamps':all(all(b[0]>a[0] for a,b in zip(v,v[1:])) for v in gps.values())}}
    target=ROOT/'dist'/'data'/f'{session}.json'; payload=json.dumps(out,separators=(',',':')); target.write_text(payload)
    digest=hashlib.sha256(payload.encode()).hexdigest()
    print(f'Exported {target.name}: {len(payload):,} bytes; sha256 {digest}',flush=True)
    return out

if __name__=='__main__':
    from build_archive import build,refresh_availability
    p=argparse.ArgumentParser();p.add_argument('--session',type=int,default=9590);a=p.parse_args()
    # Explicit single-session runs rebuild their export from cached/raw API measurements.
    target=ROOT/'dist/data'/f'{a.session}.json'
    if target.exists():
        old=json.loads(target.read_text());meta=old['session']
        export(meta['key'],meta['start'],datetime.fromtimestamp(epoch(meta['start'])+meta['duration'],timezone.utc).isoformat(),meta['name'],meta['country'],meta['code'],meta.get('length'),meta['total_laps'],year=meta['year'],circuit=meta.get('circuit'),round_no=meta.get('round'))
    else:build([a.session])

    catalog_path=ROOT/'dist/data/session-catalog.json'
    if catalog_path.exists():refresh_availability(json.loads(catalog_path.read_text())['sessions'])
