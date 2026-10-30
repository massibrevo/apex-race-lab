"""Transactionally bulk-load flat staging files into a typed DuckDB warehouse."""
import csv,json,tempfile
from pathlib import Path
import duckdb
ROOT=Path(__file__).resolve().parents[1]
SCHEMAS={
 'sessions':{'session_key':'INTEGER','season':'INTEGER','race_name':'VARCHAR','excerpt_seconds':'DOUBLE'},
 'laps':{'session_key':'INTEGER','driver_number':'INTEGER','lap_number':'INTEGER','lap_duration':'DOUBLE','sector_1':'DOUBLE','sector_2':'DOUBLE','sector_3':'DOUBLE','is_pit_out_lap':'BOOLEAN'},
 'drivers':{'session_key':'INTEGER','driver_number':'INTEGER','name_acronym':'VARCHAR','full_name':'VARCHAR','team_name':'VARCHAR'},
 'telemetry':{'session_key':'INTEGER','driver_number':'INTEGER','elapsed_seconds':'DOUBLE','speed':'DOUBLE','throttle':'DOUBLE','brake':'DOUBLE','gear':'INTEGER','rpm':'INTEGER','drs':'INTEGER'}
}
def build():
    (ROOT/'data').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='warehouse-stage-',dir=ROOT/'data') as stage:
        files={name:open(Path(stage)/f'{name}.csv','w',newline='') for name in SCHEMAS}
        writers={name:csv.writer(f) for name,f in files.items()}
        try:
            for name,writer in writers.items():writer.writerow(SCHEMAS[name])
            for path in sorted((ROOT/'dist/data').glob('[0-9]*.json')):
                d=json.loads(path.read_text());s=d['session'];key=s['key']
                writers['sessions'].writerow([key,s['year'],s['name'],s['duration']])
                writers['laps'].writerows((key,l['driver_number'],l['lap_number'],l['lap_duration'],l['duration_sector_1'],l['duration_sector_2'],l['duration_sector_3'],l['is_pit_out_lap']) for l in d['laps'])
                writers['drivers'].writerows((key,l['driver_number'],l['name_acronym'],l['full_name'],l['team_name']) for l in d['drivers'])
                writers['telemetry'].writerows((key,int(n),*row) for n,rows in d['telemetry'].items() for row in rows)
        finally:
            for f in files.values():f.close()
        con=duckdb.connect(str(ROOT/'data/apex.duckdb'))
        try:
            con.execute('BEGIN TRANSACTION');con.execute('CREATE SCHEMA IF NOT EXISTS bronze')
            for name,schema in SCHEMAS.items():
                types=', '.join(f"'{field}':'{dtype}'" for field,dtype in schema.items())
                con.execute(f"CREATE OR REPLACE TABLE bronze.{name} AS SELECT * FROM read_csv(?, header=true, columns={{{types}}}, nullstr='')",[str(Path(stage)/f'{name}.csv')])
            con.execute('COMMIT')
            print(con.sql('SELECT season,count(*) AS races FROM bronze.sessions GROUP BY 1 ORDER BY 1'))
            print(con.sql('SELECT count(*) AS lap_records FROM bronze.laps'))
            print(con.sql('SELECT count(*) AS telemetry_records FROM bronze.telemetry'))
        except Exception:
            con.execute('ROLLBACK');raise
        finally:con.close()
if __name__=='__main__':build()
