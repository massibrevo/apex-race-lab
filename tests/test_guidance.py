"""Exercise discovery/link failures without depending on documentation wording."""
import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('guidance',Path(__file__).resolve().parents[1]/'scripts/check_agent_guidance.py')
guidance=importlib.util.module_from_spec(spec);spec.loader.exec_module(guidance)

class GuidanceContract(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        (self.root/'AGENTS.md').write_text('# Project\n[Workflow](.agents/skills/race-data/SKILL.md)\n')
        self.skill=self.root/'.agents/skills/race-data/SKILL.md';self.skill.parent.mkdir(parents=True)
        self.skill.write_text('---\nname: race-data\ndescription: Validate recorded race data.\n---\nRead [root instructions](../../../AGENTS.md).\n')
    def test_valid_discovery_and_nested_links(self):
        errors,files,skills=guidance.validate(self.root)
        self.assertEqual(errors,[]);self.assertEqual(skills,1);self.assertEqual(files,2)
    def test_missing_link_is_rejected(self):
        (self.root/'AGENTS.md').write_text('[Missing](missing.md)')
        self.assertTrue(guidance.validate(self.root)[0])
    def test_link_outside_repository_is_rejected(self):
        (self.root/'AGENTS.md').write_text('[Outside](../outside.md)')
        self.assertTrue(guidance.validate(self.root)[0])
    def test_malformed_metadata_is_rejected(self):
        self.skill.write_text('---\nname: [\n---\nInstructions')
        self.assertTrue(guidance.validate(self.root)[0])
    def test_wrong_discovery_name_is_rejected(self):
        self.skill.write_text('---\nname: other-skill\ndescription: Analyze records.\n---\nInstructions')
        self.assertTrue(guidance.validate(self.root)[0])
    def test_missing_root_instructions_is_rejected(self):
        (self.root/'AGENTS.md').unlink()
        self.assertTrue(guidance.validate(self.root)[0])
    def test_code_examples_are_not_treated_as_links(self):
        (self.root/'AGENTS.md').write_text('```md\n[Example](nonexistent.md)\n```\n[External](https://example.com/)')
        self.assertEqual(guidance.validate(self.root)[0],[])
if __name__=='__main__':unittest.main()
