"""Discover the completed Grand Prix calendar; sprint sessions are excluded."""
import json
from ingest import ROOT, fetch

def discover():
    result=[]; cache=ROOT/'data/bronze/catalog'
    for year in (2024,2025):
        sessions=fetch('sessions',{'year':year,'session_name':'Race'},cache)
        meetings={r['meeting_key']:r for r in fetch('meetings',{'year':year},cache)}
        races=sorted((s for s in sessions if not s.get('is_cancelled')),key=lambda s:s['date_start'])
        for round_no,s in enumerate(races,1):
            meeting=meetings[s['meeting_key']]
            result.append({'key':s['session_key'],'year':year,'round':round_no,'name':meeting['meeting_name'],'circuit':s['circuit_short_name'],'country':s['country_name'],'code':s['country_code'],'date':s['date_start'][:10],'scheduled_start':s['date_start']})
    if any(sum(s['year']==y for s in result)!=24 for y in (2024,2025)):
        raise ValueError('Expected 24 completed Grands Prix per season')
    for entry in result:
        archive=ROOT/'dist/data'/f"{entry['key']}.json"
        entry['timing_available']=archive.exists()
        entry['replay_available']=archive.exists() and bool(json.loads(archive.read_text()).get('track'))
    target=ROOT/'dist/data/session-catalog.json';target.write_text(json.dumps({'schema_version':1,'sessions':result},separators=(',',':')))
    return result
if __name__=='__main__':print('Discovered',len(discover()),'Grand Prix sessions')
