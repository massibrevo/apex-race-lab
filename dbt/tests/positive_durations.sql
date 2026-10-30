select * from {{ ref('stg_laps') }} where lap_duration <= 0
