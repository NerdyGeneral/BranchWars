"""Audit candidate fingerprints, guide coverage and PDF navigation after rendering."""
import argparse
from collections import Counter
import html
import json
from pathlib import Path
import re

from pypdf import PdfReader
from build_candidate_manual import inline, sections, sha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--guide', required=True)
    ap.add_argument('--runtime', required=True)
    args = ap.parse_args()
    candidate = Path(args.pdf)
    manifest = json.loads(candidate.with_suffix('.json').read_text(encoding='utf-8'))
    reader = PdfReader(candidate)
    source = Path(args.guide).read_text(encoding='utf-8')
    plain = '\n'.join(page.extract_text() for page in reader.pages)
    expected = []
    for section in sections(source):
        for line in section['lines']:
            if line.strip().startswith('```') or re.fullmatch(r'[\s|:\-]+', line or ' '):
                continue
            expected.append(html.unescape(re.sub(r'<[^>]*>', '', inline(line))))
    words = lambda text: Counter(re.findall(r'[a-z0-9]+', text.lower()))
    missing = words(' '.join(expected)) - words(plain)
    if missing:
        raise ValueError('Guide words missing from PDF: ' + repr(dict(missing)))
    for path, field in [(args.runtime, 'runtimeSha256'), (args.guide, 'guideSha256'), (candidate, 'pdfSha256')]:
        if sha(path) != manifest[field]:
            raise ValueError('Fingerprint mismatch: ' + str(path))
    count = len(sections(source))
    if len(reader.outline) != count or len(manifest['sections']) != count:
        raise ValueError('Guide sections/bookmarks do not match')
    page_ids = {page.indirect_reference.idnum for page in reader.pages}
    links = 0
    for page in reader.pages:
        for ref in page.get('/Annots', []):
            annotation = ref.get_object()
            if '/Dest' in annotation:
                if annotation['/Dest'][0].idnum not in page_ids:
                    raise ValueError('Broken internal PDF destination')
                links += 1
    if links < count:
        raise ValueError('Missing index links')
    for destination in reader.outline:
        if not 0 <= reader.get_destination_page_number(destination) < len(reader.pages):
            raise ValueError('Bookmark points outside the manual')
    print(json.dumps({'pages': len(reader.pages), 'guideSections': count,
                      'outlineTargetsVerified': count, 'internalLinkTargetsVerified': links,
                      'sourceWordCoverage': 'pass', 'candidateAndGuideHashes': 'pass',
                      'pdfSha256': sha(candidate)}))


if __name__ == '__main__':
    main()
