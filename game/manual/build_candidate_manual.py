"""Local candidate handbook from the maintained guide, never the frozen manual.

Reuses the original field-manual typography and bank illustration. No second
manually copied mechanics catalogue: the guide remains the content authority.
Output is exclusive, fingerprinted and explicitly not a release certification.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, PageBreak, Spacer,
    Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents
from build_v3_manual import W, H, CW, PAPER, INK, RED, GOLD, MUTED, S, clean, bank_art


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def normalized(text):
    return clean(text).replace('\u2010', '-').replace('\u2012', '-').replace('\u2212', '-')


def inline(text):
    """Render the guide's inline vocabulary; never pass unescaped source XML."""
    pattern = r'\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|`([^`]+)`'
    result, end = [], 0
    for match in re.finditer(pattern, normalized(text)):
        result.append(escape(normalized(text)[end:match.start()]))
        label, target, strong, code = match.groups()
        if label is not None:
            if target.startswith(('https://', 'http://')):
                result.append('<link href=' + quoteattr(target) + ' color="#922e29">' + escape(label) + '</link>')
            else:
                result.append(escape(label))
        elif strong is not None:
            result.append('<b>' + escape(strong) + '</b>')
        else:
            result.append('<font name="Mono">' + escape(code) + '</font>')
        end = match.end()
    result.append(escape(normalized(text)[end:]))
    return ''.join(result)


def para(text, style='body'):
    return Paragraph(inline(text), S[style])


def sections(text):
    """Every guide section appears once; historical setup goes to the appendix."""
    rows = []
    current = {'title': 'Edition briefing', 'lines': [], 'sourceLine': 1, 'level': 2, 'historical': False}
    parent_historical = False
    for number, line in enumerate(text.splitlines(), 1):
        heading = re.match(r'^(#{2,3})\s+(.+)$', line)
        if line.startswith('# '):
            continue
        if heading:
            rows.append(current)
            level, title = len(heading.group(1)), heading.group(2)
            historical = 'historical' in title.lower() and not title.startswith('REGIONAL DEMAND')
            if level == 2:
                parent_historical = historical
            current = {'title': title, 'lines': [], 'sourceLine': number, 'level': level,
                       'historical': historical or parent_historical}
        else:
            current['lines'].append(line)
    rows.append(current)
    priority = ['Edition briefing', 'QUICK START', 'COMMAND CENTER WORKSPACES',
                'HOW A PLANNING CYCLE WORKS', 'Your first staffing and planning decisions',
                'Income is not the size of your loan book', 'Understanding a shrinking loan book']
    order = {name: i for i, name in enumerate(priority)}
    def sort_key(row):
        return (2 if row['historical'] else 0 if row['title'] in order else 1,
                order.get(row['title'], row['sourceLine']))
    return sorted(rows, key=sort_key)


def flowables(lines):
    """Small explicit parser for the maintained guide's blocks, with table headers."""
    story, i = [], 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith('```'):
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                story.append(para('`' + lines[i].strip() + '`', 'small'))
                i += 1
            if i == len(lines):
                raise ValueError('Unclosed code fence')
            i += 1
            continue
        if line.startswith('|'):
            cells = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [cell.strip() for cell in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', cell) for cell in row):
                    cells.append(row)
                i += 1
            size = len(cells[0])
            if any(len(row) != size for row in cells):
                raise ValueError('Ragged guide table')
            widths = [CW * .29, CW * .71] if size == 2 else [CW / size] * size
            table = Table([[para(cell, 'th' if r == 0 else 'table') for cell in row]
                           for r, row in enumerate(cells)], colWidths=widths,
                          repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), INK),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#e3ddca'), colors.HexColor('#f5efdf')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
                ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, 0), (-1, 0), 1, RED),
            ]))
            story.extend([table, Spacer(1, 9)])
            continue
        item = re.match(r'^(?:- |\d+\. )', line)
        paragraph = [line]
        i += 1
        while i < len(lines) and lines[i].strip():
            following = lines[i].strip()
            if following.startswith(('|', '```')) or re.match(r'^(?:- |\d+\. )', following):
                break
            paragraph.append(following)
            i += 1
        text = ' '.join(paragraph)
        if item and text.startswith('- '):
            story.append(Paragraph(inline(text[2:]), ParagraphStyle(
                'list-item', parent=S['body'], leftIndent=12, firstLineIndent=0), bulletText='-'))
        else:
            story.append(para(text))
    return story


class CandidateManual(BaseDocTemplate):
    def __init__(self, path, fingerprint):
        self.fingerprint = fingerprint
        super().__init__(str(path), pagesize=(W, H), title="Branch Wars - Development Director's Handbook",
                         author='Branch Wars', subject='Local Core 8.19 / Expanded 9.32 candidate; not a published release')
        self.addPageTemplates(PageTemplate(id='candidate', frames=[
            Frame(46, 57, CW, H - 114, id='body', leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0)], onPage=self.background))

    def background(self, c, doc):
        c.saveState()
        c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
        if doc.page == 1:
            c.setFillColor(INK); c.rect(16, 16, W-32, H-32, fill=1, stroke=0)
            c.setStrokeColor(GOLD); c.rect(26, 26, W-52, H-52, stroke=1, fill=0)
            c.setFillColor(GOLD); c.setFont('Mono', 9)
            c.drawCentredString(W/2, H-66, 'DIRECTORATE FIELD PUBLICATION / DEVELOPMENT COPY')
            c.setFillColor(PAPER); c.setFont('Display', 67)
            c.drawCentredString(W/2, H-141, 'BRANCH WARS')
            c.setFont('Display', 26)
            c.drawCentredString(W/2, H-176, "THE DIRECTOR'S HANDBOOK")
            bank_art(c)
            c.setFillColor(RED); c.rect(85, 151, W-170, 42, fill=1, stroke=0)
            c.setFillColor(PAPER); c.setFont('Display', 22)
            c.drawCentredString(W/2, 165, 'CORE 8.19 / EXPANDED 9.32')
            c.setFont('Body', 11); c.drawCentredString(W/2, 113, 'Capital is finite. Read the consequences.')
            c.setFont('Mono', 8); c.drawCentredString(W/2, 77, 'LOCAL CANDIDATE - NOT THE PUBLISHED V3/V4 MANUAL')
            c.drawCentredString(W/2, 59, 'SEPTEMBER 2026 / SOURCE ' + self.fingerprint[:12])
        else:
            c.setFillColor(INK); c.rect(0, H-35, W, 35, fill=1, stroke=0)
            c.setFillColor(PAPER); c.setFont('Mono', 8)
            c.drawString(46, H-22, 'BRANCH WARS / DIRECTORATE OF OPERATIONS')
            c.drawRightString(W-46, H-22, 'DEVELOPMENT')
            c.setStrokeColor(GOLD); c.line(46, 43, W-46, 43)
            c.setFillColor(MUTED); c.setFont('Mono', 7.5)
            c.drawString(46, 28, 'CORE 8.19 / EXPANDED 9.32 - CHECK YOUR SAVED RULES')
            c.setFillColor(RED); c.setFont('Display', 15)
            c.drawRightString(W-46, 25, '%02d' % doc.page)
        c.restoreState()

    def afterFlowable(self, item):
        if getattr(item, 'manual_key', None):
            key = item.manual_key
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(item.getPlainText(), key, 0, False)
            self.notify('TOCEntry', (0, item.getPlainText(), self.page, key))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--guide', required=True)
    ap.add_argument('--runtime', required=True)
    ap.add_argument('--expect-runtime-sha', required=True)
    ap.add_argument('--output', required=True)
    a = ap.parse_args()
    guide, runtime, output = Path(a.guide), Path(a.runtime), Path(a.output)
    fingerprint = sha(runtime)
    if fingerprint != a.expect_runtime_sha.lower():
        raise ValueError('The requested manual candidate does not match the runtime')
    manifest = output.with_suffix('.json')
    if output.exists() or manifest.exists():
        raise FileExistsError('Preserve prior manuals; choose a new candidate filename')
    source = guide.read_text(encoding='utf-8')
    if 'Core8.19' not in source or 'Expanded9.32' not in source:
        raise ValueError('Review edition labels before using this candidate template')
    chapters = sections(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    story = [Spacer(1, 1), PageBreak(), para('READ BEFORE TAKING COMMAND', 'title'),
             para('This is a local development handbook for the exact game fingerprint below. It does not replace the frozen V3/V4 manuals or certify release, gameplay balance or a real two-computer session.'),
             para('Use Core for the simpler institution or Expanded for connected banking, departments and optional group diversification. Campaigns retain their saved rules; opening this guide never upgrades them.'),
             para('Current automatic campaign-ending rules remain in effect and are under review for future campaigns. See How a campaign is won before starting a long game. National Empire and insurance underwriting remain outside this build.'),
             para('The maintained player guide is reproduced by subject, with historical foundation/setup notes at the back. Historical paragraphs inside current chapters are explicitly labeled. Values and examples apply only to their stated versions; the saved game and reviewed in-game quote govern your actual order.'),
             para('Original boxed-strategy-manual styling; no franchise artwork, actors or dialogue. Fictional gameplay, not professional banking or legal guidance. Never put real customer information or credentials in campaign exports.'),
             para('GAME FINGERPRINT', 'h2'), para(fingerprint[:32] + ' ' + fingerprint[32:], 'small'),
             para('GUIDE FINGERPRINT', 'h2'), para(sha(guide)[:32] + ' ' + sha(guide)[32:], 'small'),
             PageBreak(), para('COMMAND INDEX', 'title')]
    toc = TableOfContents(tableStyle=TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    toc.levelStyles = [ParagraphStyle('candidate-index', parent=S['body'], fontSize=8.5,
                                      leading=12, spaceBefore=0, spaceAfter=0)]
    story.append(toc)
    for i, chapter in enumerate(chapters):
        # Short subsections flow together rather than manufacturing nearly-empty
        # pages. Chapter starts and substantial standalone dossiers still break.
        fresh = (i == 0 or chapter['level'] == 2 or len('\n'.join(chapter['lines'])) > 3600
                 or chapter['historical'] != chapters[i-1]['historical'])
        heading = para(chapter['title'], 'title' if fresh else 'h2')
        heading.manual_key = 'guide-section-%d' % i
        if fresh:
            story.extend([PageBreak(), para(('HISTORICAL APPENDIX' if chapter['historical'] else 'FIELD REFERENCE')
                                           + ' / SECTION %02d' % (i+1), 'kicker')])
        story.append(heading)
        story.extend(flowables(chapter['lines']))
    CandidateManual(output, fingerprint).multiBuild(story)
    # Detect concurrent edits rather than attach evidence to the wrong source.
    if sha(runtime) != fingerprint or guide.read_text(encoding='utf-8') != source:
        raise RuntimeError('Source changed during authoring; candidate requires rebuilding')
    result = {'output': str(output.resolve()), 'runtimeSha256': fingerprint, 'guideSha256': sha(guide),
              'pdfSha256': sha(output), 'status': 'development draft; requires render and content acceptance',
              'sections': [{'title': c['title'], 'sourceLine': c['sourceLine'],
                            'historical': c['historical']} for c in chapters]}
    with manifest.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2)
    print(json.dumps({k: v for k, v in result.items() if k != 'sections'}))


if __name__ == '__main__':
    main()
