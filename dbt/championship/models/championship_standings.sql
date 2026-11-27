select
    concat(season, ':', category, ':', entrant_id) as standing_id,
    *,
    max(points) over (partition by season, category) - points as gap_to_leader
from {{ source('openf1', 'standings') }}
