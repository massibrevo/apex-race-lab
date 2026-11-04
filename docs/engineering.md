# Engineering guide

## Data contracts

The archive includes 67 recorded timing sessions: all 48 races in 2024/2025 and 19 completed 2026 races as of 4 November 2026. There are 66 eight-minute measured GPS/car telemetry excerpts; 2026 Monaco is timing-only because its GPS request returned HTTP 404. Every read model declares `session.replay_available`. A timing-only archive contains empty GPS, telemetry and track fields plus an explicit availability reason; the viewer opens lap analysis and disables unavailable replay controls. An archive has `schema_version: 1`, session metadata, driver dimensions, one circuit reference lap, GPS samples, telemetry samples, race position events, full-session laps, stints, race-control events and a provenance block.

GPS rows are `[elapsed_seconds, x, y, z]`. Car telemetry rows are `[elapsed_seconds, speed_kmh, throttle_percent, brake_percent, gear, rpm, drs]`. Driver-number strings key each sampled series. All times are relative to the ISO 8601 UTC excerpt start. Coordinates use OpenF1's coordinate system; the renderer translates and uniformly scales them into scene units. The visual does not claim surveyed track geometry or real elevation.

`pipeline/export.py` retains a sample at least 0.9 seconds after its predecessor. It discards non-finite samples and invalid telemetry domains (speed outside 0–400, pedals outside 0–100, gear outside 0–8). Invalid samples are not clamped into plausible measurements. Raw API responses remain in the ignored bronze cache for inspection. Data tests assert driver coverage, unique lap keys, finite numbers, monotonic timestamps and bounded sensor fields.

The renderer performs a binary search into each series. It interpolates GPS only when adjacent samples are ≤5 seconds apart and returns no measurement if the latest sample is over five seconds old. Retired cars disappear when GPS ends; the timing tower retains their last recorded race position. The browser never substitutes synthetic data when a measurement is missing.

## Warehouse and transformations

`pipeline/warehouse.py` uses parameterized file reads into `data/apex.duckdb`. It bulk-loads bronze tables from all shipped read models through temporary flat CSV staging files and typed DuckDB bulk reads, making a rerun idempotent. Staging files are streamed with Python’s standard CSV writer and removed after the load. The load is transactional; failed extraction rolls back instead of leaving partial tables. Run it on a single writer; Airflow limits concurrent DAG runs to one. `bronze.sessions` records season and excerpt duration for each race. Bronze lap keys are `(session_key, driver_number, lap_number)`.

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

The manual DAG in `dags/apex_archive.py` uses Airflow's SDK and standard BashOperator provider. It runs ingest/export → warehouse load → dbt build/tests → gold publication → archive contract validation. Session selection is a typed enum generated from the bundled session catalog, passed through a quoted environment variable. Failed ingestion retries twice; the HTTP client has bounded retry/backoff internally. No production schedule is configured.

Install Airflow in a **separate Python 3.12 environment** using the official version constraints, as documented in [Airflow installation](https://airflow.apache.org/docs/apache-airflow/stable/installation/index.html). Pin Airflow 3.3.2 and its matching Python 3.12 constraint file. Include `apache-airflow-providers-standard`. Do not install Airflow into the dbt environment because its dependency constraints differ.

Before starting the scheduler, set `APEX_ROOT` to the absolute checkout path, set `AIRFLOW__CORE__DAGS_FOLDER` to that checkout's `dags/`, and create the pipeline `.venv` with `make setup`. All Airflow workers must see the same checkout path, pipeline venv, cache and DuckDB file. Use a single local worker for this learning project. Start with `airflow standalone`, then trigger `apex_archive` with the chosen session parameter. Standalone is for local learning; it is not a production deployment.

The Site does not run an Airflow scheduler or a Python process. Newly exported files reach the website only after a normal source commit and Site deployment. Airflow is an optional local orchestration exercise.

## Rebuild seasons or add another session

`make backfill` discovers the 2024, 2025 and 2026 race calendars and builds missing archives. It batches the dimension/timing endpoints across session keys, then downloads a bounded GPS/telemetry window for each race. OpenF1 can temporarily require authentication even for historical sessions while a live session is running. The pipeline supports a bearer token via the process-only `OPENF1_ACCESS_TOKEN` environment variable. It does not store credentials or bypass provider access controls. If GPS extraction returns 401/403 and session timing is already cached, it emits a clearly marked timing-only read model; rerunning upgrades these sessions after access returns. It respects the public API request budget, retries transient errors, skips completed GPS read models, and records failures in ignored `data/backfill-failures.json` for repair. Re-running resumes from the cache and completed exports.

Each new excerpt starts 15 seconds before a valid reference lap from lap 8 onward. There is no lap-20 cutoff: a source that begins later in the race uses its first suitable observed lap instead of inventing earlier coverage. The exporter reconstructs the circuit from a complete measured lap with no GPS gap over five seconds. This uses actual lap timestamps, including delayed or restarted races, rather than assuming a fixed offset from scheduled start. Retired participants remain in the driver dimension and timing tower even if they have no GPS in the excerpt.

`make pipeline SESSION=<key>` explicitly rebuilds a single catalogued race. Follow it with `make warehouse`, `make transform` and `make test`. The UI reads `dist/data/session-catalog.json`; session IDs, years, rounds, venues and participant line-ups are data driven. The Airflow session enum follows the same catalog.

To extend to another year, update `pipeline/catalog.py` and its calendar contract, discover races via the [OpenF1 API reference](https://openf1.org/docs/), and run the same workflow. For full-race GPS replay, extract GPS and telemetry in bounded time chunks, deduplicate `(driver_number, date)`, then update excerpt duration and related tests. The current product intentionally publishes eight-minute excerpts per Grand Prix; Sprint, practice and qualifying sessions are excluded.

## Exercises

1. Add a telemetry mart with per-driver maximum speed and mean throttle. Test gear and percentage domains.
2. Partition bronze files by year/session/endpoint; record SHA-256 and row-count manifests per extraction.
3. Add GPS coverage and longest-gap checks per driver and show them in Data lab.
4. Build a tyre degradation model with fuel/traffic caveats and explicit uncertainty, rather than treating every lap as comparable.
5. Replace local JSON storage with Parquet partitions and publish small read models from object storage.
6. Add an Airflow backfill parameter and a bounded session mapping; keep API request pacing shared across tasks.

## Validation scope

Node tests cover binary seeking, GPS interpolation, gaps and session-time lap/tyre selection. Python checks cover every bundled archive. dbt checks cover lap keys, required fields, positive durations and telemetry domains. Browser QA covers 3D rendering, playback, cameras, driver selection, season and race selections, telemetry comparisons, exports and mobile layout. Airflow DAG parsing is checked separately; running a scheduler is an optional local exercise.

## Upstream completeness

A full-session endpoint query can still contain missing laps or retired participants. Charts retain the recorded lap numbers and leave unobserved regions empty. Missing durations are null and never replaced with plausible values. The bundled 2025 Miami timing feed, for example, begins partway through the race; available coverage and valid-lap counts should be considered when comparing pace.


## Performance desk and 2026 sensor contract

The browser exposes median pace, same-lap median delta, population lap standard deviation, independent best-sector sum/potential, peak excerpt speed, full-throttle time (≥95%), braking time (>0) and input coverage. Timed intervals must be positive and at most five seconds; the last sample is not extrapolated. Sensor proportions use observed time, not all 480 seconds. Missing metrics remain null. `dist/metrics.js` is pure and regression-tested. The dbt pace mart independently publishes population lap spread and the three best observed sectors; SQL tests enforce bounds.

The 2026 source returns null DRS measurements. Export retains those nulls while preserving the measured speed, throttle, brake, gear and RPM. It does not invent a DRS/active-aero/energy-deployment signal. Only this explicitly optional sensor may be null inside compact telemetry rows; core sensor fields must remain finite.

Circuit lenses colour the reconstructed reference lap from its driver's time-aligned measured speed or brake inputs. The legend identifies the reference driver/lap; grey means no fresh sample. They do not represent the selected driver's entire race. Surface colours interpolate between sampled vertices. The plinth, supports and surrounding buildings are illustrative. Reduced motion disables the pulsing selection ring and CSS motion.

2026 discovery refreshes the active season's API metadata once per UTC day and includes only non-cancelled sessions whose source end time has passed. Displayed event indices follow included source chronology, rather than claiming official championship round numbering after cancellations. Source meeting and circuit labels are retained. Future races are not represented as recordings. Refresh the calendar with `python pipeline/catalog.py`, then `make backfill`, `make warehouse`, `make transform` and `make test` to extend the release.

The downloaded engineering brief records the current comparison, metrics, sample coverage, methodology and investigation prompts. It is a starting point for a reproducible case study: investigate matched tyre-age stints and neutralisations before making performance claims. No fuel/traffic/weather adjustments or causal driver ranking are implemented.
