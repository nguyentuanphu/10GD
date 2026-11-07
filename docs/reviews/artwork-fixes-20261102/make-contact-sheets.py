"""Run from repository root after make-report.cts; needs Pillow and DejaVu Sans."""
import json,textwrap
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('docs/reviews/artwork-fixes-20261102')
p=json.loads((root/'verification.json').read_text());rs=[r for r in p['recipes'] if r['artworkReplaced']]
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
for start in range(0,len(rs),16):
 out=Image.new('RGB',(1440,1360),'#eee');d=ImageDraw.Draw(out)
 for j,r in enumerate(rs[start:start+16]):
  x=j%4*360;y=j//4*340;im=Image.open('dist/'+r['thumbnail']).convert('RGB').resize((220,220));out.paste(im,(x+70,y))
  lines=textwrap.wrap(r['name'],37)+textwrap.wrap(', '.join(i['name'] for i in r['ingredients']),42)
  d.multiline_text((x+5,y+225),'\n'.join(lines[:6]),font=f,fill='black')
 out.save(root/f'after-{start//16+1}.jpg')
