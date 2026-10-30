# Engineering guide

## Data contracts

OpenF1's historical API is the source of truth. An archive has `schema_version: 1`, session metadata, driver dimensions, one circuit reference lap, GPS samples, telemetry samples, race position events, full-session laps, stints, race-control events and a provenance block.

GPS rows are `[elapsed_seconds, x, y, z]`. Car telemetry rows are `[elapsed_seconds, speed_kmh, throttle_percent, brake_percent, gear, rpm, drs]`. Driver-number strings key each sampled series. All times are relative to the ISO 8601 UTC excerpt start. Coordinates use OpenF1's coordinate system; the renderer translates and uniformly scales them into scene units. The visual does not claim surveyed track geometry or real elevation.

`pipeline/export.py` retains a sample at least 0.9 seconds after its predecessor. It discards non-finite samples and invalid telemetry domains (speed outside 0–400, pedals outside 0–100, gear outside 0–8). Invalid samples are not clamped into plausible measurements. Raw API responses remain in the ignored bronze cache for inspection. Data tests assert driver coverage, unique lap keys, finite numbers, monotonic timestamps and bounded sensor fields.

The renderer performs a binary search into each series. It interpolates GPS only when adjacent samples are ≤5 seconds apart and returns no measurement if the latest sample is over five seconds old. Retired cars disappear when GPS ends; the timing tower retains their last recorded race position. The browser never substitutes synthetic data when a measurement is missing.

## Warehouse and transformations

`pipeline/warehouse.py` uses parameterized inserts into `data/apex.duckdb`. It rebuilds bronze tables from the exact shipped read models, making a rerun idempotent. Run it on a single writer; Airflow limits concurrent DAG runs to one. Bronze lap keys are `(session_key, driver_number, lap_number)`.

- `bronze.drivers`: participant dimension scoped to session.
- `bronze.laps`: lap duration, sector timing and pit-out indicator.
- `bronze.telemetry`: time-indexed measurements from the excerpt.
- `stg_laps`: typed staging view with a unique composite `lap_id`.
- `driver_pace`: fastest, mean and median lap durations, excluding pit-out laps.

`dbt build` executes the models and tests. Missing lap timings remain null and are excluded from the mart; there is no silent zero fill for missing lap durations. Pace statistics are descriptive, without weather or fuel correction. `pipeline/publish.py` requires successful dbt results, adds the resulting pace mart to each read model, and records transformation/test provenance.

To explore:

```bash
.venv/bin/python -c "import duckdb; print(duckdb.connect('data/apex.duckdb').sql('select * from driver_pace order by session_key, mean_lap_seconds'))"
```

## Airflow 3 orchestration

The manual DAG in `dags/apex_archive.py` uses Airflow's SDK and standard BashOperator provider. It runs ingest/export → warehouse load → dbt build/tests → gold publication → archive contract validation. Session selection is a typed enum (9590 or 9558), passed through a quoted environment variable. Failed ingestion retries twice; the HTTP client has bounded retry/backoff internally. No production schedule is configured.

Install Airflow in a **separate Python 3.12 environment** using the official version constraints, as documented in [Airflow installation](https://airflow.apache.org/docs/apache-airflow/stable/installation/index.html). Pin Airflow 3.3.2 and its matching Python 3.12 constraint file. Include `apache-airflow-providers-standard`. Do not install Airflow into the dbt environment because its dependency constraints differ.

Before starting the scheduler, set `APEX_ROOT` to the absolute checkout path, set `AIRFLOW__CORE__DAGS_FOLDER` to that checkout's `dags/`, and create the pipeline `.venv` with `make setup`. All Airflow workers must see the same checkout path, pipeline venv, cache and DuckDB file. Use a single local worker for this learning project. Start with `airflow standalone`, then trigger `apex_archive` with the chosen session parameter. Standalone is for local learning; it is not a production deployment.

The Site does not run an Airflow scheduler or a Python process. Newly exported files reach the website only after a normal source commit and Site deployment. Airflow is an optional local orchestration exercise.

## Add another session or a longer window

1. Look up a historical session via `/v1/sessions` in the [OpenF1 API reference](https://openf1.org/docs/).
2. Add its metadata and explicit UTC replay window to `pipeline/export.py`. Ensure the excerpt contains a complete clean lap for circuit reconstruction.
3. Run export, warehouse load, dbt build and gold publication. Inspect coverage and data contracts. For a full race, fetch GPS and telemetry in bounded time chunks and merge with `(driver_number, date)` deduplication before export; the included examples intentionally use eight-minute windows.
4. Register the session in the HTML selector and corresponding title metadata in `dist/app.js`. Extend the archive tests for its expected duration and field coverage.
5. Commit the new read model, then publish the static application. Do not commit bronze caches or a DuckDB binary.

## Exercises

1. Add a telemetry mart with per-driver maximum speed and mean throttle. Test gear and percentage domains.
2. Partition bronze files by year/session/endpoint; record SHA-256 and row-count manifests per extraction.
3. Add GPS coverage and longest-gap checks per driver and show them in Data lab.
4. Build a tyre degradation model with fuel/traffic caveats and explicit uncertainty, rather than treating every lap as comparable.
5. Replace local JSON storage with Parquet partitions and publish small read models from object storage.
6. Add an Airflow backfill parameter and a bounded session mapping; keep API request pacing shared across tasks.

## Validation scope

Node tests cover binary seeking, GPS interpolation, gaps and session-time lap/tyre selection. Python checks cover both bundled archives. dbt checks cover lap keys, required fields, positive durations and telemetry domains. Browser QA covers 3D rendering, playback, cameras, driver selection, both sessions, telemetry comparisons, exports and mobile layout. Airflow DAG parsing is checked separately; running a scheduler is an optional local exercise.
