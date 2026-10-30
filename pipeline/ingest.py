"""Idempotent OpenF1 bronze ingestion. Public historical endpoints, bounded retries."""
import argparse, json, time, hashlib, os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
ROOT = Path(__file__).resolve().parents[1]
API = 'https://api.openf1.org/v1/'

def fetch(endpoint, params, cache):
    url = API + endpoint + '?' + urlencode(params, doseq=True)
    path = cache / (endpoint + '-' + hashlib.sha256(url.encode()).hexdigest()[:16] + '.json')
    if path.exists():
        return json.loads(path.read_text())
    cache.mkdir(parents=True, exist_ok=True)
    for attempt in range(6):
        try:
            headers={'User-Agent':'APEX-Race-Lab/1.0'}
            token=os.environ.get('OPENF1_ACCESS_TOKEN')
            if token:headers['Authorization']='Bearer '+token
            with urlopen(Request(url, headers=headers), timeout=180) as response:
                rows = json.load(response)
            if not isinstance(rows, list): raise ValueError('Expected a JSON array')
            temp = path.with_suffix('.tmp'); temp.write_text(json.dumps(rows)); temp.replace(path)
            time.sleep(2.1) # respect the public 30 requests/minute budget
            return rows
        except (HTTPError, URLError, TimeoutError) as exc:
            if isinstance(exc, HTTPError) and exc.code not in (429,500,502,503,504): raise
            if attempt == 5: raise
            time.sleep(min(60, 3 * 2 ** attempt))

def ingest(session, start, end):
    cache = ROOT / 'data' / 'bronze' / str(session)
    data = {}
    for endpoint in ('drivers','laps','stints','position','weather','race_control'):
        data[endpoint] = fetch(endpoint, {'session_key':session}, cache)
        print(endpoint, len(data[endpoint]), flush=True)
    for endpoint in ('location','car_data'):
        data[endpoint] = fetch(endpoint, {'session_key':session,'date>':start.removesuffix('+00:00'),'date<':end.removesuffix('+00:00')}, cache)
        print(endpoint, len(data[endpoint]), flush=True)
    return data

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--session',type=int,default=9590)
    p.add_argument('--start',default='2024-09-01T13:16:21+00:00'); p.add_argument('--end',default='2024-09-01T13:24:21+00:00')
    a=p.parse_args(); ingest(a.session,a.start,a.end)
