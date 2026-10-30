"""Build an analytical DuckDB warehouse from the exact shipped read models."""
import json
from pathlib import Path
import duckdb
ROOT=Path(__file__).resolve().parents[1]

def build():
    (ROOT/'data').mkdir(exist_ok=True)
    con=duckdb.connect(str(ROOT/'data'/'apex.duckdb'))
    con.execute('CREATE SCHEMA IF NOT EXISTS bronze')
    con.execute('CREATE OR REPLACE TABLE bronze.laps(session_key INTEGER, driver_number INTEGER, lap_number INTEGER, lap_duration DOUBLE, sector_1 DOUBLE, sector_2 DOUBLE, sector_3 DOUBLE, is_pit_out_lap BOOLEAN)')
    con.execute('CREATE OR REPLACE TABLE bronze.telemetry(session_key INTEGER, driver_number INTEGER, elapsed_seconds DOUBLE, speed DOUBLE, throttle DOUBLE, brake DOUBLE, gear INTEGER, rpm INTEGER, drs INTEGER)')
    con.execute('CREATE OR REPLACE TABLE bronze.drivers(session_key INTEGER, driver_number INTEGER, name_acronym VARCHAR, full_name VARCHAR, team_name VARCHAR)')
    for path in sorted((ROOT/'dist'/'data').glob('[0-9]*.json')):
        d=json.loads(path.read_text());key=d['session']['key']
        con.executemany('INSERT INTO bronze.laps VALUES (?,?,?,?,?,?,?,?)',[(key,l['driver_number'],l['lap_number'],l['lap_duration'],l['duration_sector_1'],l['duration_sector_2'],l['duration_sector_3'],l['is_pit_out_lap']) for l in d['laps']])
        con.executemany('INSERT INTO bronze.drivers VALUES (?,?,?,?,?)',[(key,l['driver_number'],l['name_acronym'],l['full_name'],l['team_name']) for l in d['drivers']])
        con.executemany('INSERT INTO bronze.telemetry VALUES (?,?,?,?,?,?,?,?,?)',[(key,int(n),*row) for n,rows in d['telemetry'].items() for row in rows])
    print(con.sql('SELECT session_key,count(*) AS lap_records FROM bronze.laps GROUP BY 1'))
    con.close()
if __name__=='__main__': build()
