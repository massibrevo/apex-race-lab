import unittest,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ArchiveContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.catalog=json.loads((ROOT/'dist/data/session-catalog.json').read_text())['sessions']
    def test_complete_calendars(self):
        self.assertEqual(len(self.catalog),48)
        self.assertEqual(len({s['key'] for s in self.catalog}),48)
        for year in (2024,2025):
            races=[s for s in self.catalog if s['year']==year]
            self.assertEqual([s['round'] for s in races],list(range(1,25)))
    def test_all_bundled_sessions(self):
        for session in self.catalog:
            key=session['key']
            with self.subTest(session=key,year=session['year']):
                d=json.loads((ROOT/'dist/data'/f'{key}.json').read_text())
                self.assertEqual(d['session']['year'],session['year'])
                self.assertEqual(d['session']['duration'],480)
                self.assertGreaterEqual(len(d['drivers']),18)
                if d['session'].get('replay_available',bool(d['track'])):
                    self.assertGreaterEqual(len(d['gps']),10)
                    self.assertGreater(len(d['track']),40)
                else:
                    self.assertEqual(d['track'],[])
                    self.assertEqual(d['gps'],{})
                    self.assertEqual(d['telemetry'],{})
                    self.assertEqual(d['availability']['replay'],'pending_source_access')
                    self.assertTrue(d['availability']['reason'])
                self.assertEqual(bool(d['track']),session['replay_available'])
                self.assertGreater(len(d['laps']),300)
                participants={str(p['driver_number']) for p in d['drivers']}
                self.assertEqual(len(participants),len(d['drivers']))
                ids=[(l['driver_number'],l['lap_number']) for l in d['laps']]
                self.assertEqual(len(ids),len(set(ids)))
                self.assertEqual(max(l['lap_number'] for l in d['laps']),d['session']['total_laps'])
                for source in ('gps','telemetry'):
                    for n,rows in d[source].items():
                        self.assertIn(n,participants)
                        self.assertTrue(all(b[0]>a[0] for a,b in zip(rows,rows[1:])))
                        self.assertTrue(all(math.isfinite(v) for r in rows for v in r))
                        self.assertTrue(all(0<=r[0]<=480 for r in rows))
                for rows in d['telemetry'].values():
                    for r in rows:
                        self.assertTrue(0<=r[1]<=400)
                        self.assertTrue(0<=r[2]<=100)
                        self.assertTrue(0<=r[3]<=100)
                        self.assertTrue(0<=r[4]<=8)
                if 'warehouse' in d['provenance']:
                    self.assertGreater(d['provenance']['warehouse']['dbt_tests_passed'],0)
if __name__=='__main__':unittest.main()
