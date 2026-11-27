select *
from {{ ref('championship_races') }}
where week_start is null or race_start is null or race_end is null
   or week_start > race_start or race_start >= race_end
