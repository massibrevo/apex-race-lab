import unittest, json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ArchiveContract(unittest.TestCase):
    def test_bundled_sessions(self):
        for key in (9590,9558):
            with self.subTest(session=key):
                d=json.loads((ROOT/'dist'/'data'/f'{key}.json').read_text())
                self.assertEqual(d['session']['duration'],480)
                self.assertGreaterEqual(len(d['drivers']),18)
                self.assertGreater(len(d['track']),40)
                self.assertGreater(len(d['laps']),900)
                ids=[(l['driver_number'],l['lap_number']) for l in d['laps']]
                self.assertEqual(len(ids),len(set(ids)))
                for source in ('gps','telemetry'):
                    for n,rows in d[source].items():
                        self.assertTrue(all(b[0]>a[0] for a,b in zip(rows,rows[1:])))
                        self.assertTrue(all(math.isfinite(v) for r in rows for v in r))
                        self.assertTrue(all(0<=r[0]<=480 for r in rows))
                for rows in d['telemetry'].values():
                    for r in rows:
                        self.assertTrue(0<=r[1]<=400)
                        self.assertTrue(0<=r[2]<=100)
                        self.assertTrue(0<=r[3]<=100)
                        self.assertTrue(0<=r[4]<=8)
if __name__=='__main__':unittest.main()
