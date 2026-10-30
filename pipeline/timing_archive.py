"""Publish real full-session timing when the upstream GPS feed is unavailable."""
import json
from datetime import datetime,timedelta,timezone
from ingest import ROOT,fetch
from export import epoch

def export_timing(meta,reason):
    key=meta['key'];cache=ROOT/'data/bronze'/str(key)
    raw={endpoint:fetch(endpoint,{'session_key':key},cache) for endpoint in ('drivers','laps','stints','position','weather','race_control')}
    laps=raw['laps'];ref=next((l for l in laps if l['driver_number']==16 and l['lap_number']>=8 and l.get('date_start')),None)
    if ref is None:ref=next(l for l in laps if l.get('date_start'))
    start=datetime.fromtimestamp(epoch(ref['date_start'])-15,timezone.utc);s=start.timestamp();positions={}
    for r in raw['position']:positions.setdefault(str(r['driver_number']),[]).append([round(epoch(r['date'])-s,2),r['position']])
    for rows in positions.values():rows.sort()
    out={'schema_version':1,'session':{'key':key,'name':meta['name'],'country':meta['country'],'code':meta['code'],'year':meta['year'],'circuit':meta['circuit'],'round':meta['round'],'length':None,'total_laps':max(l['lap_number'] for l in laps),'start':start.isoformat(),'duration':480,'replay_available':False},
         'availability':{'replay':'pending_source_access','reason':'GPS and car telemetry downloads are temporarily blocked by upstream authentication. Full-session lap timing is available.','upstream_error':reason},
         'drivers':[{k:r.get(k) for k in ('driver_number','name_acronym','full_name','team_name','team_colour')} for r in raw['drivers']],
         'track':[],'gps':{},'telemetry':{},'positions':positions,'laps':[{k:r.get(k) for k in ('driver_number','lap_number','lap_duration','date_start','duration_sector_1','duration_sector_2','duration_sector_3','is_pit_out_lap')} for r in laps],'stints':raw['stints'],'weather':{},'events':[]}
    out['provenance']={'source':'OpenF1','api':'https://api.openf1.org/v1','generated_at':datetime.now(timezone.utc).isoformat(),'raw_rows':{k:len(v) for k,v in raw.items()},'gps_samples':0,'telemetry_samples':0,'track_driver':None,'track_lap':None,'sampling':'Recorded session lap timing; GPS/telemetry not yet downloaded','quality':{'driver_coverage':0,'participants':len(raw['drivers']),'finite_coordinates':None,'monotonic_timestamps':None}}
    target=ROOT/'dist/data'/f'{key}.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps(out,separators=(',',':')));temp.replace(target)
    print('Exported timing archive',key,meta['name'],len(laps),'lap records',flush=True)
    return out
