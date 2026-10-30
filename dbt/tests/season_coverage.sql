-- Each complete Grand Prix calendar must be represented exactly once.
with coverage as (
  select season, count(*) as race_count, count(distinct session_key) as session_count
  from {{ source('bronze', 'sessions') }}
  group by season
)
select * from coverage
where season not in (2024, 2025) or race_count != 24 or session_count != 24
union all
select year, 0, 0 from (values (2024), (2025)) expected(year)
where year not in (select season from coverage)
