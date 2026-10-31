"""Rate-limited, resumable season backfill with batched dimension/timing reads."""
import argparse, hashlib, json, sys, traceback
from urllib.error import HTTPError
from datetime import datetime, timedelta, timezone
from ingest import ROOT, API, fetch
from urllib.parse import urlencode
from catalog import discover
from export import export, epoch
ENDPOINTS=('drivers','laps','stints','position','weather','race_control')

def seed_cache(endpoint,session,rows):
    url=API+endpoint+'?'+urlencode({'session_key':session},doseq=True)
    path=ROOT/'data/bronze'/str(session)/(endpoint+'-'+hashlib.sha256(url.encode()).hexdigest()[:16]+'.json')
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():
        temp=path.with_suffix('.tmp');temp.write_text(json.dumps(rows));temp.replace(path)

def is_replay_ready(key):
    path=ROOT/'dist/data'/f'{key}.json'
    return path.exists() and bool(json.loads(path.read_text()).get('track'))

def refresh_availability(catalog):
    for s in catalog:
        s['replay_available']=is_replay_ready(s['key'])
        s['timing_available']=(ROOT/'dist/data'/f"{s['key']}.json").exists()
    (ROOT/'dist/data/session-catalog.json').write_text(json.dumps({'schema_version':1,'sessions':catalog},separators=(',',':')))

def select_reference(laps):
    """Use an observed clean lap, even when early-race timing is missing."""
    candidates=[lap for lap in laps if lap.get('date_start')
                and lap.get('lap_number',0)>=8
                and isinstance(lap.get('lap_duration'),(int,float))
                and 45<lap['lap_duration']<200
                and not lap.get('is_pit_out_lap')]
    preferred={16:0,44:1,1:2,4:3}
    if not candidates:
        raise ValueError('No valid recorded reference lap from lap 8 onward')
    return min(candidates,key=lambda lap:(preferred.get(lap['driver_number'],4),lap['lap_number']))

def build(keys=None):
    catalog_path=ROOT/'dist/data/session-catalog.json'
    catalog=json.loads(catalog_path.read_text())['sessions'] if catalog_path.exists() else discover()
    if keys and set(keys)-{s['key'] for s in catalog}:raise ValueError('Requested session is not in the 2024/2025 Grand Prix catalog')
    selected=[s for s in catalog if keys is None or s['key'] in keys]
    missing=[s for s in selected if not is_replay_ready(s['key'])]
    uncached=[s for s in missing if not all(list((ROOT/'data/bronze'/str(s['key'])).glob(endpoint+'-*.json')) for endpoint in ENDPOINTS)]
    if uncached:
        session_keys=[s['key'] for s in uncached]
        for endpoint in ENDPOINTS:
            print('BATCH',endpoint,len(session_keys),'sessions',flush=True)
            rows=fetch(endpoint,{'session_key':session_keys},ROOT/'data/bronze/batches')
            grouped={k:[] for k in session_keys}
            for row in rows:
                if row['session_key'] in grouped:grouped[row['session_key']].append(row)
            for s in uncached:seed_cache(endpoint,s['key'],grouped[s['key']])
    failures=[]; access_restricted=False
    for index,s in enumerate(selected,1):
        path=ROOT/'dist/data'/f"{s['key']}.json"
        if is_replay_ready(s['key']):print(f"SKIP {index}/{len(selected)} {s['year']} {s['name']}",flush=True);continue
        try:
            if access_restricted:
                from timing_archive import export_timing
                export_timing(s,'HTTP 401: historical API access is temporarily restricted');failures.append({'session':s,'error':'Upstream authentication required'});continue
            print(f"BUILD {index}/{len(selected)} {s['year']} {s['name']} [{s['key']}]",flush=True)
            laps=fetch('laps',{'session_key':s['key']},ROOT/'data/bronze'/str(s['key']))
            reference=select_reference(laps)
            start=datetime.fromtimestamp(epoch(reference['date_start'])-15,timezone.utc);end=start+timedelta(seconds=480)
            export(s['key'],start.isoformat(),end.isoformat(),s['name'],s['country'],s['code'],None,max(l['lap_number'] for l in laps),year=s['year'],circuit=s['circuit'],round_no=s['round'])
        except HTTPError as exc:
            if exc.code in (401,403):
                access_restricted=True
                from timing_archive import export_timing
                export_timing(s,str(exc));failures.append({'session':s,'error':str(exc)});print('TIMING ONLY: upstream authentication required',flush=True)
            else:
                failures.append({'session':s,'error':str(exc)});traceback.print_exc()
        except Exception as exc:
            failures.append({'session':s,'error':str(exc)});traceback.print_exc()
    (ROOT/'data/backfill-failures.json').write_text(json.dumps(failures,indent=2))
    refresh_availability(catalog)
    print('BACKFILL COMPLETE',len(selected)-len(failures),'ready;',len(failures),'failed',flush=True)
    if failures:sys.exit(1)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--session',type=int,action='append');args=parser.parse_args();build(args.session)
