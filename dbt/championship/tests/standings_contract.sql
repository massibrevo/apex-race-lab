select *
from {{ ref('championship_standings') }}
where position is null or position < 1 or points is null or points < 0
   or name is null or trim(name) = '' or category not in ('drivers', 'teams')
