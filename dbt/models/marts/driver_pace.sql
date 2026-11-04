select
  l.session_key,
  l.driver_number,
  d.name_acronym,
  d.team_name,
  count(*) as valid_laps,
  min(l.lap_duration) as fastest_lap_seconds,
  avg(l.lap_duration) as mean_lap_seconds,
  median(l.lap_duration) as median_lap_seconds,
  stddev_pop(l.lap_duration) as lap_stddev_seconds,
  min(case when l.sector_1 > 0 then l.sector_1 end) as best_sector_1,
  min(case when l.sector_2 > 0 then l.sector_2 end) as best_sector_2,
  min(case when l.sector_3 > 0 then l.sector_3 end) as best_sector_3
from {{ ref('stg_laps') }} l
join {{ source('bronze', 'drivers') }} d using (session_key, driver_number)
where lap_duration > 0 and not coalesce(is_pit_out_lap, false)
group by 1,2,3,4
