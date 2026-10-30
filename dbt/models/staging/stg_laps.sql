select
  session_key,
  driver_number,
  lap_number,
  lap_duration,
  sector_1,
  sector_2,
  sector_3,
  is_pit_out_lap,
  concat(session_key, '-', driver_number, '-', lap_number) as lap_id
from {{ source('bronze', 'laps') }}
