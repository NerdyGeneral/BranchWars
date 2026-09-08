"""Render every final PDF page and audit text bounds before delivery."""
import json, argparse, subprocess, hashlib
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import pdfplumber
from pypdf import PdfReader
def main():
    ap=argparse.ArgumentParser();ap.add_argument('pdf');ap.add_argument('out');a=ap.parse_args();pdf=Path(a.pdf);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    subprocess.run(['pdftoppm','-r','95','-png',str(pdf),str(out/'page')],check=True)
    pagefiles=sorted(out.glob('page-*.png'));records=[];issues=[]
    with pdfplumber.open(pdf) as doc:
        for i,page in enumerate(doc.pages,1):
            words=page.extract_words();records.append({'page':i,'words':len(words),'text':page.extract_text()})
            for w in words:
                if w['x0']<15 or w['x1']>page.width-15 or w['top']<8 or w['bottom']>page.height-12:issues.append({'page':i,'word':w['text'],'bounds':[w['x0'],w['top'],w['x1'],w['bottom']]})
            if not words:issues.append({'page':i,'error':'empty page'})
    for start in range(0,len(pagefiles),9):
        sheet=Image.new('RGB',(960,1350),'#65706d');draw=ImageDraw.Draw(sheet)
        for j,f in enumerate(pagefiles[start:start+9]):
            im=Image.open(f).convert('RGB');im.thumbnail((302,410));x=(j%3)*320+(320-im.width)//2;y=(j//3)*450+20;sheet.paste(im,(x,y));draw.text((j%3*320+12,y+415),f'PAGE {start+j+1:02}',fill='white')
        sheet.save(out/f'contact-{start//9+1}.jpg',quality=90)
    result={'pdf':pdf.name,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':len(records),'renderedPages':len(pagefiles),'outlineEntries':len(PdfReader(pdf).outline),'boundsIssues':issues,'pagesWithFewWords':[r['page'] for r in records if r['words']<75],'records':records}
    (out/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k!='records'}))
if __name__=='__main__':main()
