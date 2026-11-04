-- Descriptive KPIs must preserve their basic mathematical bounds.
select * from {{ ref('driver_pace') }}
where lap_stddev_seconds < 0
   or fastest_lap_seconds > median_lap_seconds
   or fastest_lap_seconds > mean_lap_seconds
   or best_sector_1 <= 0 or best_sector_2 <= 0 or best_sector_3 <= 0
