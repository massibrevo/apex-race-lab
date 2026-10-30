"""Enrich gold read models only after dbt has built and tested the warehouse."""
import json, hashlib
from pathlib import Path
import duckdb
ROOT=Path(__file__).resolve().parents[1]
def publish():
    results=json.loads((ROOT/'dbt/target/run_results.json').read_text())
    checks=results['results']
    if not checks or any(r['status'] not in ('success','pass') for r in checks):
        raise RuntimeError('Gold publication requires a successful dbt build')
    con=duckdb.connect(str(ROOT/'data/apex.duckdb'),read_only=True)
    tests=[r for r in checks if r['unique_id'].startswith('test.')]
    for path in sorted((ROOT/'dist/data').glob('[0-9]*.json')):
        d=json.loads(path.read_text());cursor=con.execute('SELECT * FROM driver_pace WHERE session_key = ? ORDER BY mean_lap_seconds',[d['session']['key']]);columns=[x[0] for x in cursor.description];d['pace']=[dict(zip(columns,row)) for row in cursor.fetchall()]
        d['provenance']['warehouse']={'engine':'DuckDB','model':'driver_pace','dbt_tests_passed':len(tests),'dbt_generated_at':results['metadata']['generated_at']}
        temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(d,separators=(',',':')));temporary.replace(path)
        print(path.name,'gold published;',len(d['pace']),'driver pace rows;',len(tests),'dbt tests passed')
    con.close()
if __name__=='__main__':publish()
