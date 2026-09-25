"""Reproducible, original V3 field manual. No game behavior is changed."""
import argparse, json, math, hashlib
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
PAPER=colors.HexColor('#eee7d4'); INK=colors.HexColor('#202b2d'); RED=colors.HexColor('#922e29'); GOLD=colors.HexColor('#b69557'); MUTED=colors.HexColor('#536361')
W,H=612,792
CW=W-92
for name,file in [('Body','georgia.ttf'),('BodyBold','georgiab.ttf'),('Display','impact.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('C:/Windows/Fonts')/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='Body',boldItalic='BodyBold')
S={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.1,leading=14.5,textColor=INK,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8.2,leading=11.4,textColor=INK,spaceAfter=6),
 'table':ParagraphStyle('table',fontName='Body',fontSize=8.3,leading=11.2,textColor=INK),
 'th':ParagraphStyle('th',fontName='Mono',fontSize=8.3,leading=11.2,textColor=colors.white),
 'title':ParagraphStyle('chapter',fontName='Display',fontSize=29,leading=32,textColor=INK,spaceAfter=12),
 'kicker':ParagraphStyle('kicker',fontName='Mono',fontSize=8.3,leading=12,textColor=RED,spaceAfter=7),
 'h2':ParagraphStyle('h2',fontName='BodyBold',fontSize=12,leading=16,textColor=RED,spaceBefore=12,spaceAfter=7,keepWithNext=True),
 'brief':ParagraphStyle('brief',fontName='BodyBold',fontSize=10.5,leading=15,textColor=INK),
 'register':ParagraphStyle('register',fontName='Body',fontSize=9.7,leading=13.5,textColor=INK,spaceAfter=7),
 'reference':ParagraphStyle('reference',fontName='Body',fontSize=7.8,leading=10,textColor=INK,spaceAfter=2),
}
def clean(t):
    for a,b in {'\u2011':'-','\u2013':'-','\u2014':' - ','\u2018':"'",'\u2019':"'",'\u201c':'"','\u201d':'"','\u2192':' > ','\u2265':'>=','\u2264':'<='}.items():t=t.replace(a,b)
    return t
def p(t,style='body'):return Paragraph(escape(clean(str(t))),S[style])

class Ribbon(Flowable):
    def __init__(self,labels):super().__init__();self.labels=labels;self.width=CW;self.height=48
    def draw(self):
        c=self.canv;n=len(self.labels);bw=(CW-(n-1)*12)/n
        for i,label in enumerate(self.labels):
            x=i*(bw+12);c.setFillColor(INK if i%2==0 else RED);c.rect(x,6,bw,35,fill=1,stroke=0)
            c.setFillColor(PAPER);c.setFont('Mono',8);c.drawCentredString(x+bw/2,20,label)
            if i<n-1:c.setFillColor(GOLD);q=c.beginPath();q.moveTo(x+bw+3,19);q.lineTo(x+bw+9,24);q.lineTo(x+bw+3,29);q.close();c.drawPath(q,fill=1,stroke=0)

def bank_art(c):
    c.saveState();c.translate(W/2,H/2-14)
    c.setStrokeColor(GOLD);c.setLineWidth(.6)
    for r in [112,118,134]:c.circle(0,0,r,fill=0,stroke=1)
    for deg in range(0,360,10):
        a=math.radians(deg);c.line(121*math.cos(a),121*math.sin(a),128*math.cos(a),128*math.sin(a))
    c.setFillColor(PAPER);q=c.beginPath();q.moveTo(-89,31);q.lineTo(0,83);q.lineTo(89,31);q.close();c.drawPath(q,fill=1,stroke=0)
    c.setFillColor(INK);c.setFont('Display',25);c.drawCentredString(0,40,'BW')
    c.setFillColor(PAPER)
    for x in [-64,-27,10,47]:c.rect(x,-48,17,68,fill=1,stroke=0);c.rect(x-3,19,23,6,fill=1,stroke=0)
    for y,w in [(-58,162),(-69,180),(-80,196)]:c.rect(-w/2,y,w,7,fill=1,stroke=0)
    c.restoreState()

def background(c,doc):
    c.saveState();c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    if doc.page==1:
        c.setFillColor(INK);c.rect(16,16,W-32,H-32,fill=1,stroke=0)
        c.setStrokeColor(GOLD);c.rect(26,26,W-52,H-52,fill=0,stroke=1)
        c.setStrokeColor(colors.HexColor('#354244'));c.setLineWidth(.25)
        for x in range(40,int(W-40),20):c.line(x,180,x,H-194)
        for y in range(180,int(H-194),20):c.line(40,y,W-40,y)
        c.setFillColor(GOLD);c.setFont('Mono',9);c.drawCentredString(W/2,H-63,'EXECUTIVE COMMAND / FIELD PUBLICATION 003')
        c.setFillColor(PAPER);c.setFont('Display',67);c.drawCentredString(W/2,H-141,'BRANCH WARS')
        c.setFont('Display',26);c.drawCentredString(W/2,H-176,"THE DIRECTOR'S FIELD MANUAL")
        bank_art(c)
        c.setFillColor(RED);c.rect(W/2-168,150,336,41,fill=1,stroke=0);c.setFillColor(PAPER);c.setFont('Display',23);c.drawCentredString(W/2,163,'V3 / REGIONAL COMMAND EDITION')
        c.setFont('Body',11);c.drawCentredString(W/2,112,'Capital is finite. Consequences are not.')
        c.setFont('Mono',8);c.drawCentredString(W/2,69,'PLAYER HANDBOOK / SEPTEMBER 2026')
        c.drawCentredString(W/2,52,'ORIGINAL RETRO DESIGN - FICTIONAL BANKING STRATEGY')
    else:
        c.setFillColor(INK);c.rect(0,H-35,W,35,fill=1,stroke=0);c.setFillColor(PAPER);c.setFont('Mono',8)
        c.drawString(46,H-22,'BRANCH WARS / V3');c.drawRightString(W-46,H-22,'DIRECTORATE OF OPERATIONS')
        c.setStrokeColor(GOLD);c.setLineWidth(.8);c.line(46,43,W-46,43)
        c.setFillColor(MUTED);c.setFont('Mono',7.5);c.drawString(46,28,'FIELD EDITION / GROUP 6 RULES / SAVE 9.5')
        c.setFillColor(RED);c.setFont('Display',15);c.drawRightString(W-46,25,f'{doc.page:02d}')
    c.restoreState()

class Manual(BaseDocTemplate):
    def __init__(self,target):
        super().__init__(str(target),pagesize=(W,H),leftMargin=46,rightMargin=46,topMargin=57,bottomMargin=57,title="Branch Wars V3 - The Director's Field Manual",author='Branch Wars / Codex',pageCompression=1)
        self.addPageTemplates(PageTemplate(id='manual',frames=[Frame(46,57,CW,H-114,id='body',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=background))
    def afterFlowable(self,f):
        if isinstance(f,Paragraph) and f.style.name=='chapter' and f.getPlainText()!='COMMAND INDEX':
            label=f.getPlainText();key='section-'+str(self.seq.nextf('section'));self.canv.bookmarkPage(key);self.canv.addOutlineEntry(label,key,0,False);self.notify('TOCEntry',(0,label,self.page,key))

def table(data):
    headers=data['headers'];rows=data['rows'];n=len(headers)
    widths=([140,CW-140] if n==2 else [125]+[(CW-125)/(n-1)]*(n-1))
    cells=[[p(x,'th') for x in headers]]+[[p(x,'table') for x in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#e3ddca'),colors.HexColor('#f5efdf')]),('LINEBELOW',(0,0),(-1,0),1,RED),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#c7bda6'))]))
    return t

def main():
    args=argparse.ArgumentParser();args.add_argument('--output',required=True);a=args.parse_args();out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    content=json.loads((ROOT/'manual/v3-content.json').read_text(encoding='utf-8'))
    runtime=hashlib.sha256((ROOT/'BRANCH_WARS.html').read_bytes()).hexdigest()
    story=[Spacer(1,1),PageBreak(),p('READ THIS BEFORE YOU TAKE COMMAND','title'),p('EDITION CONTROL / IMPORTANT DISTINCTIONS','kicker')]
    story += [p('This manual describes the playable V3 snapshot, not the finished expansion blueprint. V3 is the distribution label. A new Financial Group campaign uses Group rules 6 and save format 9.5; older campaigns retain their original rules.'),p('The period briefing-room presentation is an original homage to boxed strategy-game manuals. It is not affiliated with Command & Conquer, its actors, or its publishers. No franchise artwork or dialogue is reproduced.'),p('The short director briefings are flavor text. The procedures and tables are gameplay guidance. The game is fictional, not financial advice. Never enter real customer records or credentials into campaign names or exports.'),p('This handbook is organized by decisions: start a campaign, plan a month, manage customers and credit, develop your institution, compete, then diagnose trouble. Conditional features are labeled. Disabled or unavailable systems are not secretly operating in the background.'),p('Read the V3 release report alongside this manual for exact test results and known balance limits. Automated checks do not establish enjoyable balance or certify a real two-computer session. Both friends should use the same V3 build.'),p('BUILD FINGERPRINT','h2'),p(runtime,'small'),p('The six-file player folder remains self-contained. This manual and the release report are companion documents, not required dependencies. Export your campaign before changing builds, browsers or hosting origins.'),PageBreak(),p('COMMAND INDEX','title')]
    toc=TableOfContents(tableStyle=TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),1),('BOTTOMPADDING',(0,0),(-1,-1),1)]));toc.levelStyles=[ParagraphStyle('TOC',fontName='Body',fontSize=9.5,leading=13.5,leftIndent=0,firstLineIndent=0,textColor=INK,spaceBefore=0)];story += [toc]
    for i,ch in enumerate(content['chapters'],1):
        story += [PageBreak(),p(f"DOSSIER {i:02d} / {ch.get('kicker','OPERATIONS')}",'kicker'),p(ch['title'],'title')]
        if ch.get('briefing'):
            box=Table([[p('DIRECTOR\'S BRIEFING','kicker')],[p(ch['briefing'],'brief')]],colWidths=[CW]);box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#ded6be')),('BOX',(0,0),(-1,-1),.7,GOLD),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));story += [box,Spacer(1,10)]
        diagrams={'The monthly command cycle':['PLAN','SEAL','RESOLVE','REVIEW'],'Run the financial parent':['BANK DIVIDEND','PARENT CASH','AGENCY CAPITAL'],'Offers and application queues':['APPLICATION','WAIT & PROCESS','FUNDED ACTIVATION']}
        if ch['title'] in diagrams:story += [Ribbon(diagrams[ch['title']]),Spacer(1,6)]
        if ch.get('diagram'):story += [Ribbon(ch['diagram']),Spacer(1,6)]
        for section in ch['sections']:
            if ch['title'].endswith(' dossier') and section.get('heading')=='Choose one permanent operating model':
                story += [PageBreak(),p(ch['title']+' / IMPLEMENTATION','kicker')]
            if section.get('heading'):story.append(p(section['heading'],'h2'))
            style='register' if ch['title']=='Department work and vendor register' else 'body'
            story += [p(x,style) for x in section.get('text',[])]
            if section.get('table'):
                grid=table(section['table'])
                if ch['title']=='Department work and vendor register':grid.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
                story += [grid,Spacer(1,8)]
    story += [PageBreak(),p('SOURCE & EDITION REGISTER','title'),p('The handbook was prepared against the V3 portable and its production source. Experiments outside the assembly manifest are not released mechanics. Exact values can be modified by market, research, staffing, condition and selected campaign rules; the current in-game quote is authoritative.'),p('PRIMARY PLAYER REFERENCES','h2'),p('game/docs/player-guide.md; game/docs/game-reference.md; game/docs/release-status.md; game/docs/roadmap.md. The generated reference contains detailed legacy formulas; current Group6 chapters here explain the newer staffing and facility boundaries.'),p('PRODUCTION MODULE REGISTER','h2')]
    sources=sorted(set(s for ch in content['chapters'] for s in ch.get('sources',[])))
    middle=(len(sources)+1)//2
    st=Table([[p(sources[i],'reference'),p(sources[i+middle] if i+middle<len(sources) else '','reference')] for i in range(middle)],colWidths=[CW/2,CW/2]);st.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),1),('BOTTOMPADDING',(0,0),(-1,-1),1)]));story.append(st)
    Manual(out).multiBuild(story)
    print(json.dumps({'output':str(out),'chapters':len(content['chapters']),'runtimeSha256':runtime,'bytes':out.stat().st_size}))
if __name__=='__main__':main()
