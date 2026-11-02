"""Generate evidence inventory from the frozen source.json and explicit visual findings.
Run from repository root: python docs/reviews/artwork-audit-20261102/make-report.py
No application data/artwork is modified. Contact-sheet ordinals follow ascending artwork cell.
"""
import json, hashlib, csv, html, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
source=json.loads((root/'source.json').read_text())
rows=sorted(source['recipes'],key=lambda r:r['cell'] if r['cell'] is not None else 99999)
issues={}
def add(nums,kind,note,action):
 for n in nums: issues.setdefault(n,[]).append(dict(kind=kind,note=note,action=action))
add([84,132,180,203],'wrong-vegetable','Hình vẽ nhiều đậu nguyên quả/đậu que; công thức dùng peas (đậu Hà Lan hạt), thể hiện bằng hạt tròn ở các món cùng nguyên liệu.','Vẽ lại phần đậu thành hạt tròn; giữ đạm và cà rốt.')

add([1,4,14,125,160],'extra-garnish','Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá.','Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức.')
add([5,6,21],'extra-garnish','Hình có lá rau mùi/ngò dạng lá xẻ bên trên, ngoài danh sách nguyên liệu (hành lá không phải ngò).','Bỏ lá ngò; giữ hành lá đã được ghi trong công thức.')
add([130,178],'extra-vegetable','Hình có các múi hành tây rõ bên cạnh nấm/gừng, nhưng công thức không có hành tây.','Bỏ múi hành tây khỏi artwork.')
add([395,396,397],'catalog-art-conflict','Tên và hướng dẫn là mì Ý sợi; hình vẽ spaghetti nhưng ingredient id pasta hiện mang tên Nui.','Dùng ingredient spaghetti hiện có, rà lại định lượng/đơn vị; giữ hình nếu tiếp tục dùng tên mì Ý sợi. Không tự đổi số lượng.')
add([55],'catalog-description-conflict','Tên món ghi bơ tỏi nhưng công thức chỉ có dầu ăn, không có bơ. Hình không thể chứng minh loại chất béo.','Đổi tên thành cá hồi áp chảo tỏi hoặc bổ sung bơ theo định lượng được duyệt; không xác nhận ảnh là món bơ tỏi hiện tại.')
add([215,396],'catalog-description-conflict','Tên món ghi sốt/súp kem nhưng công thức không có kem hoặc sữa; hình thể hiện sốt/súp có vẻ kem.','Chốt tên và công thức trước khi duyệt ảnh; không tự suy ra kem từ màu trắng/vàng của hình.')
uncertain={}
def pending(nums,note):
 for n in nums: uncertain[n]=note
pending([427],'Hình có cả gà xé và cụm giống thịt băm màu hồng/nâu. Công thức chỉ có thịt gà nhưng không quy định rõ dạng cắt; chưa đủ bằng chứng nhận diện loại thịt trong cụm này. Nên thống nhất hình bằng gà đã nấu chín, bỏ cụm thịt mơ hồ.')
pending([82,154,201,207],'Có miếng trắng/ring nhạt khó phân biệt là thân nấm, gừng hay hành/tỏi ngoài công thức; cần xem lại khi chỉnh artwork, chưa kết luận sai.')
pending([321,325,329,333,337,341,345,349,353,357,361,365,369,373,377,381,385,389,393],'Ngoài gừng sợi có hạt trắng giống tỏi băm, nhưng có thể là gừng băm. Không đủ bằng chứng để khẳng định là nguyên liệu thừa.')
pending([563,593,594],'Có chấm/lá xanh nhỏ giống rau thơm ngoài công thức; độ chi tiết chưa đủ xác định loại, cần bỏ chi tiết trang trí mơ hồ khi sửa.')
records=[]
for n,r in enumerate(rows,1):
 status='needs-correction' if n in issues else 'needs-detail-review' if n in uncertain else 'visual-limit' if n>=716 else 'plausible-match'
 note='Hình phù hợp thành phần chính và hình thức món ở mức minh họa; không xác nhận định lượng, chất béo, loại nước dùng hoặc độ chín từ hình.'
 if n>=716: note='Màu/độ sệt hợp lý cho dressing đã mô tả; không thể phân biệt chính xác các hạt, tahini, sữa chua, dầu hoặc chất gây dị ứng sau xay chỉ bằng hình.'
 if n in uncertain: note=uncertain[n]
 if n in issues: note=' '.join(a['note'] for a in issues[n])
 assets={}
 for key in ['asset','thumbnail']:
  path=Path('dist')/r[key]; assets[key]={'path':str(path),'exists':path.exists(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None}
 records.append(dict(ordinal=n,id=r['id'],name=r['name'],status=status,note=note,findings=issues.get(n,[]),ingredients=[dict(id=i['id'],name=source['ingredients'][i['id']][0],qty=i['qty']) for i in r['ingredients']],prep=r['prep'],steps=r['steps'],cell=r['cell'],**assets))
from collections import Counter
counts=dict(Counter(r['status'] for r in records))
report={'audited_commit':'d625b643221cdfc9109fba71fd291d932f9203fb','date':'2026-11-02','scope':'740 catalog recipes; all displayed thumbnails visually inspected; suspicious references enlarged; recipe name/ingredient list and cooking method considered. Not a live-device, custom-family-recipe, or independent ingredient-art audit.','counts':counts,'missing_assets':sum(not v['exists'] for r in records for v in [r['asset'],r['thumbnail']]),'recipes':records}
(root/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
with (root/'audit.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['ordinal','recipe_id','name','status','note','thumbnail','full_artwork'])
 for r in records:w.writerow([r['ordinal'],r['id'],r['name'],r['status'],r['note'],r['thumbnail']['path'],r['asset']['path']])
lines=['# Audit hình món ăn — 02/11/2026','','Bản được kiểm tra: `d625b64` (main, v1.7.3). Đã xem trực quan toàn bộ 740 thumbnail, đối chiếu tên/thành phần và hình thức chế biến; mở ảnh nguồn lớn hơn cho các trường hợp nghi vấn. Mỗi bản ghi JSON giữ nguyên công thức và SHA-256 của hình đã kiểm tra.','','| Kết quả | Số món |','|---|---:|']
labels={'plausible-match':'Phù hợp trực quan ở mức minh họa','needs-correction':'Cần sửa hình hoặc mâu thuẫn công thức/tên','needs-detail-review':'Cần rà chi tiết còn mơ hồ','visual-limit':'Dressing: hợp màu/độ sệt, chưa thể xác nhận thành phần từ hình'}
for key,value in counts.items():lines.append(f'| {labels[key]} | {value} |')
lines+=['','740/740 có thumbnail và ảnh nguồn, không thiếu file. Việc có file và gán đúng ô ảnh không chứng minh hình đúng nội dung. Không kết luận toàn bộ catalog đã đúng hoàn toàn.','','## Các món cần sửa','', '| Món / ID | Phát hiện | Hướng xử lý |','|---|---|---|']
for r in records:
 if r['status']=='needs-correction':lines.append(f"| {r['name']} (`{r['id']}`) | {r['note']} | {' '.join(x['action'] for x in r['findings'])} |")
lines+=['','## Chi tiết cần xác minh','','Các món có trạng thái `needs-detail-review` được liệt kê đầy đủ trong CSV/JSON và gallery. Đây là nghi vấn về hình dạng chi tiết nhỏ, chưa phải bằng chứng nguyên liệu sai.','','## Giới hạn và bằng chứng','','- Đã xem tất cả hình món; ảnh nguồn lớn hơn được dùng để xác minh nghi vấn. Không thể xác nhận định lượng, dị ứng, chất béo, nước dùng hoặc nhiệt độ chín bằng artwork.','- 25 dressing giữ trạng thái giới hạn thị giác, không được tính vào nhóm đã khớp thành phần.','- Không audit ảnh nguyên liệu độc lập, ảnh do gia đình tự tải, dữ liệu đồng bộ riêng hoặc giao diện trên thiết bị thật trong lượt này.','- Chỉ thêm hồ sơ audit; chưa thay hình, chưa đổi công thức, chưa triển khai sản phẩm.','- [Danh sách 740 món (CSV)](audit.csv) · [Dữ liệu và hash ảnh (JSON)](audit.json) · [Gallery có công thức và bộ lọc](gallery.html).','- [Ảnh phóng lớn các trường hợp đã kiểm tra](zoom-evidence.jpg); số thứ tự khớp cột ordinal trong CSV/JSON. Một số nghi vấn trong ảnh đã được loại bỏ sau phóng lớn, không phải mọi món trong ảnh đều sai.',
'- Gallery mở từ checkout repo để tải ảnh tương đối từ dist; GitHub không trực tiếp render trang HTML.','- `source.json` là snapshot công thức tại commit audit; `make-report.py` tái tạo báo cáo từ snapshot và ghi nhận trực quan.']
(root/'README.md').write_text('\n'.join(lines)+'\n')
cards=[]
for r in records:
 e=html.escape;ing=', '.join(i['name'] for i in r['ingredients']);path='../../../'+r['thumbnail']['path']
 cards.append(f'<article data-status="{r["status"]}"><img loading="lazy" src="{path}" alt="{e(r["name"])}"><h2>{r["ordinal"]}. {e(r["name"])}</h2><code>{r["id"]}</code><p><b>{e(labels[r["status"]])}</b></p><p>{e(r["note"])}</p><details><summary>Công thức / ảnh nguồn</summary><p>{e(ing)}</p><p>{e(r["prep"])}</p><p>{e(" / ".join(r["steps"]))}</p><a href="../../../{r["asset"]["path"]}">Ảnh nguồn</a></details></article>')
(root/'gallery.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Audit 740 món</title><style>body{font:16px system-ui;margin:24px;background:#fffefa;color:#21251d}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article{border:1px solid #bbb;padding:16px;border-radius:12px}img{width:192px;height:192px;object-fit:contain}h2{font-size:18px}article[hidden]{display:none}select,input{font:inherit;padding:10px;margin:8px}</style><h1>Audit 740 món · d625b64</h1><p>Kết quả trực quan có giới hạn; xem README và audit.json để biết phạm vi.</p><input placeholder="Tìm tên hoặc ID" aria-label="Tìm món"><select aria-label="Lọc kết quả"><option value="">Tất cả</option>'+''.join(f'<option value="{k}">{html.escape(v)}</option>' for k,v in labels.items())+'</select><main>'+''.join(cards)+'</main><script>function filter(){const q=document.querySelector("input").value.toLocaleLowerCase("vi"),s=document.querySelector("select").value;document.querySelectorAll("article").forEach(a=>a.hidden=(s&&a.dataset.status!==s)||!a.textContent.toLocaleLowerCase("vi").includes(q))}document.querySelector("input").oninput=filter;document.querySelector("select").onchange=filter</script></html>')
print(json.dumps({'counts':counts,'total':len(records),'missing_assets':report['missing_assets']},ensure_ascii=False))
