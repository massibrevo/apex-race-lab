"""Reference windows must work with sparse but genuine historical timing."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pipeline'))
from build_archive import select_reference

def lap(number,driver=16):
    return dict(driver_number=driver,lap_number=number,date_start='2025-05-04T20:00:00+00:00',lap_duration=90,is_pit_out_lap=False)

class ReferenceWindow(unittest.TestCase):
    def test_late_observed_lap_is_not_rejected(self):
        self.assertEqual(select_reference([lap(25),lap(26)])['lap_number'],25)
    def test_prefers_clean_early_observation_for_reference_driver(self):
        dirty=lap(8);dirty['is_pit_out_lap']=True
        slow=lap(9);slow['lap_duration']=300
        self.assertEqual(select_reference([lap(11),dirty,slow,lap(10),lap(8,4)])['lap_number'],10)
    def test_falls_back_to_another_recorded_participant(self):
        self.assertEqual(select_reference([lap(9,23)])['driver_number'],23)
    def test_missing_timing_is_not_fabricated(self):
        missing=lap(8);missing['lap_duration']=None
        with self.assertRaises(ValueError):select_reference([lap(1),missing])
if __name__=='__main__':unittest.main()
