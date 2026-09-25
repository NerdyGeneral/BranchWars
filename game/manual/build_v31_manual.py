"""Prepend the V3.1 revision to the complete, unchanged V3 field manual."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, PageBreak, Spacer
from pypdf import PdfReader, PdfWriter
from build_v3_manual import p, W, H, CW, PAPER, INK, GOLD, RED

RUNTIME_SHA = '65f469e82f2d747f12334caf84a1079ea4eade2406cfa9635239e2049416644e'
ORIGINAL_SHA = 'b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed'

def page_background(c, doc):
    c.saveState()
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK); c.rect(0, H-40, W, 40, fill=1, stroke=0)
    c.setFillColor(PAPER); c.setFont('Mono', 8)
    c.drawString(46, H-25, 'BRANCH WARS / V3.1 REVISION ORDERS')
    c.drawRightString(W-46, H-25, 'READ BEFORE THE ORIGINAL HANDBOOK')
    c.setStrokeColor(GOLD); c.line(46, 43, W-46, 43)
    c.setFillColor(INK); c.setFont('Mono', 7.5)
    c.drawString(46, 28, 'SEPTEMBER 2026 / NEW GROUP 7 / SAVE 9.6')
    c.setFillColor(RED); c.setFont('Display', 15)
    c.drawRightString(W-46, 25, 'U-%02d' % doc.page)
    c.restoreState()

def plain(s):
    s = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', s)
    s = s.replace('**', '').replace('`', '')
    for old,new in {'exact65f469e8':'exact 65f469e8', 'passes185':'passes 185',
                    'complete480':'complete 480', 'A46.6MB':'A 46.6 MB',
                    'cycle481':'cycle 481', 'in3,029ms':'in 3,029 ms',
                    'in618/590ms':'in 618/590 ms'}.items(): s=s.replace(old,new)
    return s

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--original', required=True)
    ap.add_argument('--addendum', required=True)
    ap.add_argument('--runtime', required=True)
    ap.add_argument('--output', required=True)
    ap.add_argument('--scratch', required=True)
    a=ap.parse_args()
    sha=lambda b:hashlib.sha256(b).hexdigest()
    original=Path(a.original); output=Path(a.output); scratch=Path(a.scratch)
    assert sha(original.read_bytes()) == ORIGINAL_SHA, 'Wrong original manual'
    assert sha(Path(a.runtime).read_bytes()) == RUNTIME_SHA, 'Wrong game build'
    output.parent.mkdir(parents=True, exist_ok=True); scratch.mkdir(parents=True, exist_ok=True)
    original_reader=PdfReader(original); assert len(original_reader.pages)==45
    revision=scratch/'v31-revision-pages.pdf'
    story=[p('DIRECTORATE BULLETIN / 09 SEPTEMBER 2026','kicker'),
           p('V3.1: KEEP THE BANK WORKING','title'),
           p('The V3 download now carries the long-campaign stability update. This revision is the current authority for changed behavior. The complete original 45-page V3 handbook follows, unchanged, so returning commanders retain their reference for older campaigns.'),
           p('EDITION CONTROL','h2'),
           p('V3 is the download family; V3.1 identifies this update. New optional Financial Group campaigns use Group 7 / save 9.6. Original handbook references to latest Group 6 / save 9.5 describe the preceding edition. Existing campaigns keep their historical rules; importing does not automatically grant Group 7 changes.'),
           p('The new pages supersede older guidance on AI staffing and project choices, funded corporate circulation, facility investment forecasts, shared cash reserves, and accounting-pilot endings. Unchanged chapters remain useful. Printed original page numbers and the original command index continue to refer to the original 45-page section; PDF bookmarks distinguish both parts.'),
           p('BEFORE UPDATING A MULTIPLAYER ROOM','h2'),
           p('Export from the host, retain the old package and export, and have both players download this same V3 update. New Group 7 games require matching peer support; older V3 clients may refuse them. Use each player\'s own repository token. Never upload tokens or personal saves with a bug report.'),
           p('TESTED, NOT INFALLIBLE','h2'),
           p('185 Windows checks passed; eight matched campaigns reached 480 months with 328 exact half-ready replays. This is not a zero-bug guarantee, live two-computer GitHub acceptance or proof of enjoyable balance. Opening pace, thin margins and deposit dominance still deserve player feedback. National Empire and insurance underwriting remain deferred.'),
           p('VERIFIED GAME FINGERPRINT','h2'),p(RUNTIME_SHA[:32]+' '+RUNTIME_SHA[32:],'small')]
    text=Path(a.addendum).read_text(encoding='utf-8')
    sections=re.split(r'^## ',text,flags=re.M)[1:]
    for index,section in enumerate(sections):
        heading,body=section.split('\n',1)
        new_page=index in (0,2,3,5,7)
        if new_page: story.append(PageBreak())
        story.append(p(plain(heading),'title' if new_page else 'h2'))
        for paragraph in re.split(r'\n\s*\n',body.strip()):
            normalized=plain(' '.join(x.strip() for x in paragraph.splitlines()))
            normalized=normalized.replace('Do not publish the candidate without separate approval.',
                                          'Distribution does not replace the physical two-computer acceptance test.')
            if paragraph.lstrip().startswith('- '):
                for item in re.split(r'^- ',paragraph,flags=re.M)[1:]:
                    story.append(p('- '+plain(' '.join(item.split())), 'small'))
            else: story.append(p(normalized))
    doc=SimpleDocTemplate(str(revision),pagesize=(W,H),leftMargin=46,rightMargin=46,topMargin=61,bottomMargin=58)
    doc.build(story,onFirstPage=page_background,onLaterPages=page_background)
    rev=PdfReader(revision); n=len(rev.pages)
    writer=PdfWriter()
    writer.append(rev, outline_item='V3.1 revision - read first')
    writer.append(original_reader, outline_item='Complete original V3 field manual - 45 pages')
    writer.add_metadata({'/Title':'Branch Wars V3.1 - Updated Director\'s Field Manual',
                         '/Author':'Branch Wars', '/Subject':'Group 7 / save 9.6 revision plus complete original V3 handbook'})
    with output.open('wb') as stream: writer.write(stream)
    final=PdfReader(output); assert len(final.pages)==n+45
    original_pages={page.indirect_reference.idnum:i for i,page in enumerate(original_reader.pages)}
    final_pages={page.indirect_reference.idnum:i for i,page in enumerate(final.pages)}
    links=0
    for i,page in enumerate(original_reader.pages):
        assert final.pages[n+i].extract_text()==page.extract_text(), 'Original page changed'
        before=page.get('/Annots',[]); after=final.pages[n+i].get('/Annots',[])
        assert len(before)==len(after), 'Original link count changed'
        for old_ref,new_ref in zip(before,after):
            old=old_ref.get_object(); new=new_ref.get_object()
            if '/Dest' in old:
                assert final_pages[new['/Dest'][0].idnum]==original_pages[old['/Dest'][0].idnum]+n
                links+=1
    assert links==74, 'Original command-index links must remain functional'
    print(json.dumps({'output':str(output),'pages':len(final.pages),'revisionPages':n,
                      'originalPagesPreserved':45,'verifiedOriginalLinks':links,
                      'sha256':sha(output.read_bytes()),'runtimeSha256':RUNTIME_SHA}))

if __name__=='__main__': main()
