select * from {{ source('bronze', 'telemetry') }}
where speed < 0 or speed > 400 or throttle not between 0 and 100
   or brake not between 0 and 100 or gear not between 0 and 8
