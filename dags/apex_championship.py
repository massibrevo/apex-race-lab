"""Refresh championship standings and race classifications in a separate warehouse."""
import os
import shlex
from datetime import timedelta
from pathlib import Path

import pendulum
from airflow.providers.standard.operators.bash import BashOperator
from airflow.sdk import DAG

root = Path(os.environ.get("APEX_ROOT", "/opt/airflow/apex"))
source = Path(os.environ.get("APEX_CHAMPIONSHIP_SOURCE", root))
state = root / "local/championship"
raw = state / "feed.json"
candidate = state / "candidate.duckdb"
project = source / "dbt/championship"
python = root / ".venv/bin/python"
warehouse = source / "pipeline/championship_warehouse.py"
node = os.environ.get("APEX_NODE", "node")


def command(*args):
    return shlex.join(map(str, args))


with DAG(
    dag_id="apex_championship",
    start_date=pendulum.datetime(2026, 11, 27, tz="Europe/Madrid"),
    schedule="25 */3 * * *",
    catchup=False,
    max_active_runs=1,
    is_paused_upon_creation=False,
    tags=["apex", "openf1"],
) as dag:
    extract = BashOperator(
        task_id="fetch_openf1_championship",
        bash_command=command(node, source / "pipeline/extract_championship.mjs", raw),
        cwd=str(source),
        execution_timeout=timedelta(minutes=8),
        retries=1,
        retry_delay=timedelta(minutes=20),
    )
    load = BashOperator(
        task_id="load_championship_warehouse",
        bash_command=command(python, warehouse, "load", candidate, raw),
        cwd=str(source),
    )
    transform = BashOperator(
        task_id="build_and_test_championship",
        bash_command=command(root / ".venv/bin/dbt", "build", "--project-dir", project,
                             "--profiles-dir", project, "--no-send-anonymous-usage-stats"),
        env={"APEX_CHAMPIONSHIP_DB": str(candidate)},
        append_env=True,
        cwd=str(project),
    )
    publish = BashOperator(
        task_id="publish_local_championship_snapshot",
        bash_command=command(python, warehouse, "publish", candidate, state / "championship.json"),
        cwd=str(source),
    )
    extract >> load >> transform >> publish
