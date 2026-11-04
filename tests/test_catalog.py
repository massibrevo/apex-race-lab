import unittest,sys
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pipeline'))
from catalog import completed_races
class CalendarEligibility(unittest.TestCase):
    def test_excludes_future_cancelled_and_running_sessions(self):
        def race(key,end,**extra):return dict(session_key=key,date_start='2026-01-01T00:00:00Z',date_end=end,**extra)
        rows=[race(1,'2026-01-02T00:00:00Z'),race(2,'2026-12-01T00:00:00Z'),race(3,'2026-01-02T00:00:00Z',is_cancelled=True),race(4,None)]
        self.assertEqual([s['session_key'] for s in completed_races(rows,datetime(2026,11,4,tzinfo=timezone.utc))],[1])
