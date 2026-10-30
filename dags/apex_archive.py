"""Airflow 3 DAG. Run manually with a mounted checkout and its pipeline venv."""
import os
from datetime import datetime, timezone
from pathlib import Path
from airflow.sdk import DAG, Param
from airflow.providers.standard.operators.bash import BashOperator
ROOT=Path(os.environ.get('APEX_ROOT','/opt/airflow/apex'))
PYTHON=ROOT/'.venv/bin/python'
DBT=ROOT/'.venv/bin/dbt'
with DAG('apex_archive',start_date=datetime(2024,1,1,tzinfo=timezone.utc),schedule=None,catchup=False,
         params={'session':Param(9590,type='integer',enum=[9590,9558])},max_active_runs=1,
         tags=['f1','portfolio','data-engineering']) as dag:
    export=BashOperator(task_id='ingest_validate_export',bash_command=f'{PYTHON} pipeline/export.py --session "$APEX_SESSION"',cwd=str(ROOT),env={'APEX_SESSION':'{{ params.session }}'},append_env=True,retries=2)
    warehouse=BashOperator(task_id='build_warehouse',bash_command=f'{PYTHON} pipeline/warehouse.py',cwd=str(ROOT))
    transform=BashOperator(task_id='dbt_build_and_test',bash_command=f'{DBT} build --profiles-dir .',cwd=str(ROOT/'dbt'))
    publish=BashOperator(task_id='publish_gold',bash_command=f'{PYTHON} pipeline/publish.py',cwd=str(ROOT))
    validate=BashOperator(task_id='validate_read_models',bash_command=f'{PYTHON} -m unittest discover -s tests -p "test_*.py"',cwd=str(ROOT))
    export >> warehouse >> transform >> publish >> validate
