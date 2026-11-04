"""Discover the completed Grand Prix calendar; sprint sessions are excluded."""
import json
from datetime import datetime, timezone
from ingest import ROOT, fetch

def completed_races(sessions, now):
    """Exclude cancelled, future and in-progress sessions; keep source chronology."""
    return sorted((s for s in sessions if not s.get('is_cancelled')
                   and s.get('date_end') and datetime.fromisoformat(s['date_end'].replace('Z','+00:00')) < now),
                  key=lambda s:s['date_start'])

def discover(years=(2024,2025,2026), now=None):
    now=now or datetime.now(timezone.utc)
    result=[]; cache=ROOT/'data/bronze/catalog'
    for year in years:
        sessions=fetch('sessions',{'year':year,'session_name':'Race'},cache if year < now.year else cache/now.strftime('%Y-%m-%d'))
        meetings={r['meeting_key']:r for r in fetch('meetings',{'year':year},cache if year < now.year else cache/now.strftime('%Y-%m-%d'))}
        races=completed_races(sessions,now)
        for round_no,s in enumerate(races,1):
            meeting=meetings[s['meeting_key']]
            result.append({'key':s['session_key'],'year':year,'round':round_no,'name':meeting['meeting_name'],'circuit':s['circuit_short_name'],'country':s['country_name'],'code':s['country_code'],'date':s['date_start'][:10],'scheduled_start':s['date_start']})
    if any(sum(s['year']==y for s in result)!=24 for y in (2024,2025) if y in years):
        raise ValueError('Expected 24 completed Grands Prix per season')
    for entry in result:
        archive=ROOT/'dist/data'/f"{entry['key']}.json"
        entry['timing_available']=archive.exists()
        entry['replay_available']=archive.exists() and bool(json.loads(archive.read_text()).get('track'))
    target=ROOT/'dist/data/session-catalog.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps({'schema_version':1,'sessions':result},separators=(',',':')));temp.replace(target)
    return result
if __name__=='__main__':print('Discovered',len(discover()),'Grand Prix sessions')
