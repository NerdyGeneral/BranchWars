"""Content/structure safeguards for the local manual builder (not gameplay QA)."""
import re
import unittest
from pathlib import Path

from build_candidate_manual import flowables, inline, normalized, sections


class CandidateManualTests(unittest.TestCase):
    def test_every_source_section_is_present_once(self):
        source = (Path(__file__).resolve().parents[1] / 'docs/player-guide.md').read_text(encoding='utf-8')
        chapters = sections(source)
        self.assertEqual(len(chapters), len(re.findall(r'^#{2,3} ', source, re.M)) + 1)
        self.assertEqual(len({chapter['sourceLine'] for chapter in chapters}), len(chapters))
        before = sorted(line for line in source.splitlines() if not re.match(r'^#{1,3} ', line))
        after = sorted(line for chapter in chapters for line in chapter['lines'])
        self.assertEqual(before, after)
        for chapter in chapters:
            self.assertTrue(flowables(chapter['lines']), chapter['title'])

    def test_historical_children_stay_with_their_appendix(self):
        chapters = sections('## HISTORICAL RELEASE NOTES\nOld.\n### v7.1 foundation\nOlder.\n## CURRENT\nNew.')
        self.assertEqual([c['title'] for c in chapters],
                         ['Edition briefing', 'CURRENT', 'HISTORICAL RELEASE NOTES', 'v7.1 foundation'])
        self.assertTrue(chapters[-1]['historical'])
        self.assertFalse(chapters[1]['historical'])

    def test_inline_xml_is_escaped_and_only_web_links_are_active(self):
        text = inline('**Cash & capital** <unsafe> `0.25` [Guide](../docs/player-guide.md) [Source](https://example.org/?a=1&b=2)')
        self.assertIn('<b>Cash &amp; capital</b>', text)
        self.assertIn('&lt;unsafe&gt;', text)
        self.assertNotIn('href="../', text)
        self.assertEqual(text.count('<link '), 1)

    def test_broken_fences_and_tables_fail_instead_of_omitting_content(self):
        with self.assertRaises(ValueError):
            flowables(['```text', 'unfinished'])
        with self.assertRaises(ValueError):
            flowables(['| a | b |', '| --- | --- |', '| missing |'])

    def test_dashes_have_no_missing_glyph_variant(self):
        text = normalized('a\u2011b\u2013c\u2014d\u2010e\u2212f')
        self.assertFalse(any(char in text for char in '\u2010\u2011\u2012\u2013\u2014\u2212'))


if __name__ == '__main__':
    unittest.main()
