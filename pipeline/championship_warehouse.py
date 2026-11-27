"""Load the shared OpenF1 feed for dbt and export the tested dashboard snapshot."""
import argparse
import json
import shutil
from pathlib import Path

import duckdb


def load(db, seasons):
    db.execute("begin")
    db.execute("create schema if not exists openf1")
    db.execute("""create or replace table openf1.standings (
        season integer, category varchar, entrant_id varchar, name varchar, team varchar,
        position integer, points double, gained double, through_session integer, checked_at varchar
    )""")
    db.execute("""create or replace table openf1.race_calendar (
        season integer, session_key integer, round integer, name varchar, circuit varchar,
        week_start varchar, race_start varchar, race_end varchar, winner varchar
    )""")
    for season in seasons:
        for kind in ("drivers", "teams"):
            db.executemany("insert into openf1.standings values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                (season["year"], kind, row["id"], row["name"], row["team"], row["position"],
                 row["points"], row["gained"], season["through"], season["checkedAt"])
                for row in season[kind]
            ])
        db.executemany("insert into openf1.race_calendar values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            (season["year"], row["key"], row["round"], row["name"], row["circuit"],
             row["weekendStart"], row["raceStart"], row["raceEnd"], row["winner"])
            for row in season["races"]
        ])
    db.execute("commit")


def export(db, output):
    seasons = {}
    for year, kind, entrant, name, team, position, points, gained, through, checked in db.execute(
        """select season, category, entrant_id, name, team, position, points, gained,
                  through_session, checked_at from championship_standings order by season, position, entrant_id"""
    ).fetchall():
        season = seasons.setdefault(year, dict(year=year, checkedAt=checked, through=through, drivers=[], teams=[], races=[]))
        season[kind].append(dict(id=entrant, name=name, team=team, position=position, points=points, gained=gained))
    for year, key, number, name, circuit, start, race, end, winner in db.execute(
        "select * from championship_races order by season, round"
    ).fetchall():
        seasons[year]["races"].append(dict(key=key, round=number, name=name, circuit=circuit,
                                          weekendStart=start, raceStart=race, raceEnd=end, winner=winner))
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps({"seasons": list(seasons.values())}, ensure_ascii=False) + "\n")
    temporary.replace(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("load", "export", "publish"))
    parser.add_argument("database", type=Path)
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    with duckdb.connect(str(args.database), read_only=args.command != "load") as db:
        if args.command == "load":
            load(db, json.loads(args.file.read_text())["seasons"])
        else:
            export(db, args.file)
    if args.command == "publish":
        target = args.file.with_suffix(".duckdb")
        temporary = target.with_suffix(".tmp")
        shutil.copyfile(args.database, temporary)
        temporary.replace(target)
