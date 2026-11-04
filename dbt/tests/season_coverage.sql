-- Closed 2024/2025 calendars remain complete; 2026 is an observed partial season.
with coverage as (
  select season, count(*) as race_count, count(distinct session_key) as session_count
  from {{ source('bronze', 'sessions') }}
  group by season
)
select * from coverage
where season not in (2024, 2025, 2026)
   or race_count != session_count
   or (season in (2024, 2025) and race_count != 24)
   or (season = 2026 and race_count < 1)
union all
select year, 0, 0 from (values (2024), (2025)) expected(year)
where year not in (select season from coverage)
