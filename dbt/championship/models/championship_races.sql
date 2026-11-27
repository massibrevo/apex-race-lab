select *
from {{ source('openf1', 'race_calendar') }}
