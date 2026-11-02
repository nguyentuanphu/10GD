import json,os,textwrap
from PIL import Image,ImageDraw,ImageFont
p=json.load(open('docs/reviews/artwork-audit-20261102/source.json')); rows=sorted(p['recipes'],key=lambda r:r['cell'] if r['cell'] is not None else 99999)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17); small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
os.makedirs('/tmp/10gd-audit',exist_ok=True)
for start in range(0,len(rows),24):
 out=Image.new('RGB',(1440,1920),'#eeeeee');d=ImageDraw.Draw(out)
 for j,r in enumerate(rows[start:start+24]):
  x=j%4*360;y=j//4*320
  im=Image.open('dist/'+r['thumbnail']).convert('RGB');im.thumbnail((200,190));out.paste(im,(x+80,y))
  words=f"{start+j+1}. {r['name']}"
  lines=textwrap.wrap(words,34)+textwrap.wrap(', '.join(p['ingredients'][i['id']][0] for i in r['ingredients']),44)
  d.multiline_text((x+6,y+192),'\n'.join(lines[:7]),font=small,fill='black',spacing=2)
 out.save(f'/tmp/10gd-audit/page-{start//24+1:02}.jpg')
json.dump([r['id'] for r in rows],open('/tmp/10gd-audit/order.json','w'))
print(f'{(len(rows)+23)//24} contact sheets created in /tmp/10gd-audit')
