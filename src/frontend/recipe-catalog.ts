'use strict';
// Named recipe variants use explicit ingredients and cooking steps, not title-only records.
const EXPANDED_RECIPES=[];
(function expandFamilyCatalog(){
 const seen=new Set(RECIPES.map(r=>r.name));let number=0;
 const push=(name,cat,protein,time,ingredients,prep,steps,tags)=>{if(seen.has(name))return;seen.add(name);EXPANDED_RECIPES.push({...recipe('family-v3-'+(++number),name,cat,protein,time,ingredients,prep,steps),expanded:true,tags:tags||[]})};
 const curatedWesternAndHealthy=[
  ['Mì Ý Bolognese bò bằm sốt cà chua','noodle','beef',30,{pasta:400,beef:450,tomato:500,onion:150,carrot:100,garlic:20,oil:20,salt:4,pepper:2},'Băm nhỏ hành tây, cà rốt, tỏi; cà chua khứa chữ thập trụng sơ bóc vỏ băm nhuyễn.',['Đun sôi nồi nước có pha 1 thìa cà phê muối, luộc mì Ý 8–10 phút đến độ chín vừa (al dente) rồi vớt ra trộn nhẹ 1 thìa dầu.', 'Làm nóng dầu trên chảo sâu lòng, phi thơm tỏi, hành tây và cà rốt băm 3 phút cho dậy mùi ngọt tự nhiên.', 'Cho thịt bò bằm vào đảo lửa lớn đến khi săn tơi, thêm cà chua băm và 120ml nước luộc mì, hạ lửa nhỏ ninh 12 phút cho sốt sánh đậm.', 'Nêm muối, tiêu đen vừa ăn, đảo đều mì với sốt bò bằm nóng hổi hoặc rưới sốt lên từng đĩa mì.'],['Món Âu & Ý','Món Ý','Đổi vị cuối tuần']],
  ['Mì Ý cá hồi sốt kem nấm tỏi','noodle','fish',25,{pasta:380,salmon:420,broth:180,mushroom:200,garlic:20,onion:100,oil:15,salt:4,pepper:2},'Thấm khô phi lê cá hồi, cắt quân cờ 2.5cm, ướp chút muối tiêu; nấm rửa nhanh thái lát.',['Luộc mì Ý trong nước sôi có muối khoảng 8–9 phút cho vừa chín tới, giữ lại 80ml nước luộc mì rồi để ráo.', 'Áp chảo cá hồi với chút dầu ở lửa vừa 2 phút mỗi mặt cho vàng thơm bên ngoài mà bên trong vẫn mềm ẩm, gắp ra đĩa.', 'Phi thơm tỏi và hành tây băm trên cùng chảo, cho nấm vào xào chín tới rồi rót sốt kem / nước dùng và nước luộc mì vào đun sôi lăn tăn.', 'Cho mì Ý và cá hồi vào đảo nhẹ tay 1–2 phút cho sốt áo đều sợi mì, rắc tiêu đen và dùng nóng.'],['Món Âu & Ý','Món Ý','Nhanh trong tuần']],
  ['Mì Ý ức gà áp chảo nấm sốt tỏi','noodle','chicken',25,{pasta:380,chicken:480,mushroom:220,broccoli:200,garlic:25,oil:25,salt:4,pepper:2},'Ức gà thấm khô, thái lát vừa ăn ướp muối tiêu; bông cải tách nhánh nhỏ; tỏi thái lát mỏng.',['Luộc mì Ý trong nước sôi có muối 8 phút; 2 phút cuối cho bông cải xanh vào chần chung rồi vớt ra để ráo, giữ lại 80ml nước luộc.', 'Áp chảo ức gà với 1 thìa dầu ở lửa vừa 3–4 phút mỗi mặt đến khi vàng chín, lấy ra để nghỉ.', 'Phi vàng tỏi lát ở lửa nhỏ cho thơm dịu, cho nấm vào xào săn với chút muối và nước luộc mì.', 'Trộn mì Ý, bông cải và ức gà vào chảo, đảo đều trên lửa vừa 1 phút, rắc tiêu đen xay.'],['Món Âu & Ý','Món Ý','Healthy · Thanh đạm']],
  ['Cá hồi áp chảo bơ tỏi kèm khoai tây & bông cải','main','fish',25,{salmon:550,potato:400,broccoli:300,garlic:20,lime:1,oil:20,salt:4,pepper:2},'Thấm thật khô miếng cá hồi, ướp muối tiêu hai mặt; khoai tây cắt múi cau; bông cải cắt miếng vừa ăn.',['Hấp hoặc luộc chín tới khoai tây (10 phút) và bông cải xanh (3 phút) để giữ màu xanh giòn.', 'Làm nóng chảo chống dính với dầu, đặt mặt da cá hồi xuống áp chảo lửa vừa 4 phút cho da giòn vàng, lật mặt áp tiếp 2–3 phút cùng tỏi đập dập.', 'Đảo nhanh khoai tây và bông cải qua phần dầu tỏi thơm trong chảo 2 phút cho thấm vị.', 'Bày cá hồi cùng rau củ ra đĩa, vắt nhẹ nước cốt chanh tươi lên mặt cá trước khi thưởng thức.'],['Món Âu & Ý','Healthy · Thanh đạm','Ít dầu mỡ']],
  ['Bò bít tết áp chảo kèm khoai tây & đậu que','main','beef',25,{beef:550,potato:450,bean:280,garlic:20,onion:120,oil:25,salt:4,pepper:3},'Để thịt bò hết lạnh hoàn toàn, thấm khô mặt thịt, ướp muối và tiêu đen xay trước khi áp chảo 10 phút.',['Khoai tây gọt vỏ cắt múi cau, luộc sơ 7 phút rồi áp chảo vàng giòn các mặt; đậu que tước xơ chần chín tới.', 'Làm nóng già chảo gang hoặc chảo đáy dày, cho dầu và áp chảo miếng thịt bò cùng tép tỏi đập dập 2.5–3 phút mỗi mặt tùy độ chín mong muốn.', 'Lấy thịt bò ra đĩa ấm để nghỉ 5 phút giúp giữ trọn nước ngọt bên trong rồi thái lát dày vừa ăn.', 'Xào nhanh hành tây và đậu que trên chảo vừa áp bò, bày kèm khoai tây và thịt bò.'],['Món Âu & Ý','Món Âu','Đổi vị cuối tuần']],
  ['Ức gà áp chảo thảo mộc & rau củ nướng chảo','main','chicken',25,{chicken:600,broccoli:280,carrot:180,potato:300,garlic:20,lime:1,oil:20,salt:4,pepper:2},'Ức gà lạng đôi cho đều độ dày, ướp muối, tiêu, tỏi băm và chút nước cốt chanh trong 10 phút.',['Cà rốt và khoai tây cắt miếng vừa ăn, hấp hoặc luộc sơ 6 phút; bông cải xanh rửa sạch để ráo.', 'Làm nóng chảo với 1 thìa dầu, áp chảo ức gà lửa vừa 4 phút mỗi mặt đến khi vàng ruộm và chín mềm bên trong.', 'Cho khoai tây, cà rốt và bông cải vào chảo đảo đều 4–5 phút cho xém cạnh thơm nhẹ.', 'Thái ức gà thành lát vừa ăn, xếp cùng rau củ nóng hổi.'],['Món Âu & Ý','Healthy · Thanh đạm','Giàu đạm']],
  ['Súp bí đỏ kem tươi kiểu Âu','soup','plant',25,{pumpkin:600,potato:200,onion:120,vegBroth:900,garlic:15,oil:15,salt:3,pepper:2},'Bí đỏ và khoai tây gọt vỏ, rửa sạch, cắt khối vuông 2cm để nhanh chín mềm.',['Làm nóng chút dầu trong nồi, xào thơm hành tây và tỏi băm 2 phút ở lửa vừa cho trong mà không cháy.', 'Cho bí đỏ, khoai tây và nước dùng rau củ vào nồi, đun sôi rồi hạ lửa nhỏ nấu 15 phút đến khi củ mềm nhừ.', 'Dùng máy xay hoặc muôi tán nhuyễn mịn hỗn hợp bí đỏ trên lửa nhỏ 2 phút cho sánh mịn.', 'Nêm muối và tiêu đen vừa vị, múc ra chén dùng ấm.'],['Món Âu & Ý','Món Âu','Một nồi']],
  ['Súp bò hầm khoai tây cà rốt kiểu Âu','soup','beef',40,{beef:450,potato:350,carrot:220,tomato:250,onion:150,peas:120,broth:1200,garlic:15,oil:15,salt:4,pepper:2},'Thịt bò rửa sạch cắt khối vuông 2.5cm; khoai tây, cà rốt, cà chua và hành tây cắt miếng vừa ăn.',['Làm nóng dầu trong nồi đáy dày, áp sơ thịt bò cho săn vàng các mặt rồi cho hành tây, tỏi và cà chua vào đảo 3 phút.', 'Rót nước dùng vào nồi, đun sôi và hớt bọt, hạ lửa nhỏ hầm thịt bò 20 phút cho mềm.', 'Thêm khoai tây và cà rốt vào nấu tiếp 12 phút, sau đó cho đậu Hà Lan vào nấu thêm 3 phút.', 'Nêm muối và tiêu đen vừa ăn, dùng nóng cùng cơm hoặc bánh mì.'],['Món Âu & Ý','Món Âu','Một nồi']],
  ['Cá hồi hấp gừng hành & bông cải xanh Healthy','main','fish',20,{salmon:520,broccoli:350,mushroom:180,ginger:25,scallion:30,soy:20,oil:10},'Cá hồi thấm khô, khử mùi tanh bằng vài lát gừng; bông cải xanh và nấm rửa sạch cắt vừa ăn.',['Xếp cá hồi cùng gừng thái sợi lên đĩa sứ sâu lòng, đặt bông cải xanh và nấm xung quanh.', 'Đun sôi nước trong xửng hấp, cho đĩa cá và rau vào hấp lửa vừa 8–10 phút đến khi cá vừa chín tới mềm ngọt.', 'Xếp hành lá thái sợi lên trên, rưới nước tương pha ấm và 1 thìa nhỏ dầu nóng cho dậy mùi thơm.', 'Dùng nóng ngay để giữ trọn vị ngọt tự nhiên và dinh dưỡng.'],['Healthy · Thanh đạm','Ít dầu mỡ','Nhanh trong tuần']],
  ['Ức gà áp chảo salad dưa leo cà chua thanh mát','main','chicken',20,{chicken:550,cucumber:300,tomato:250,spinach:250,corn:150,lime:1,oil:15,salt:3,pepper:2},'Ức gà thấm khô ướp muối tiêu; rau xanh, dưa leo, cà chua rửa sạch để thật ráo nước.',['Áp chảo ức gà với 1 thìa nhỏ dầu ở lửa vừa 4 phút mỗi mặt đến khi chín vàng, để nguội bớt rồi thái lát.', 'Cắt dưa leo, cà chua vừa ăn, trộn nhẹ với rau xanh và bắp ngọt đã chần chín.', 'Pha sốt trộn thanh mát gồm nước cốt chanh, 1 thìa dầu, chút muối và tiêu đen.', 'Xếp ức gà lên đĩa rau trộn, rưới sốt ngay trước khi ăn để rau giữ độ giòn.'],['Healthy · Thanh đạm','Món Âu & Ý','Ít dầu mỡ']],
  ['Đậu hũ non sốt nấm đông cô & cải thìa thanh đạm','main','plant',20,{tofu:600,mushroom:250,bokchoy:350,garlic:15,ginger:15,soy:25,oil:10,scallion:20},'Đậu hũ cắt khối vuông 3cm; nấm rửa sạch thái lát; cải thìa chẻ đôi rửa sạch.',['Chần nhanh cải thìa trong nước sôi 1.5 phút rồi xếp gọn quanh đĩa; chần sơ đậu hũ 1 phút để miếng đậu săn chắc.', 'Làm nóng 1 thìa nhỏ dầu, phi thơm tỏi và gừng băm, cho nấm vào xào chín mềm với nước tương và 80ml nước lọc.', 'Cho đậu hũ vào đảo nhẹ tay 3 phút trên lửa nhỏ để thấm sốt nấm.', 'Trút đậu hũ và sốt nấm lên đĩa cải thìa, rắc hành lá thái nhỏ.'],['Healthy · Thanh đạm','Đạm thực vật','Ít dầu mỡ']],
  ['Tôm hấp sả gừng & rau củ thanh ngọt','main','shrimp',20,{shrimp:550,broccoli:280,carrot:150,mushroom:150,lemongrass:45,ginger:20,lime:1,salt:3},'Tôm cắt râu, rút chỉ lưng, rửa sạch; sả đập dập cắt khúc; bông cải, cà rốt và nấm cắt vừa ăn.',['Lót sả đập dập và gừng thái lát dưới đáy xửng hấp, xếp tôm ở một bên và rau củ ở bên cạnh.', 'Hấp trên lửa vừa 7–8 phút tính từ khi nước sôi đến khi tôm chuyển màu đỏ hồng và rau củ chín giòn ngọt.', 'Pha muối tiêu chanh ớt nhẹ để chấm kèm tôm và rau củ hấp.', 'Bày ra đĩa dùng nóng, giữ nguyên vị ngọt tự nhiên không dầu mỡ.'],['Healthy · Thanh đạm','Ít dầu mỡ','Nhanh trong tuần']],
  ['Canh rong biển đậu hũ nấm thanh đạm','soup','plant',15,{seaweed:15,tofu:350,mushroom:200,carrot:120,ginger:15,scallion:20,salt:3,soy:10},'Ngâm rong biển khô 5 phút cho nở mềm rồi rửa sạch; đậu hũ cắt khối nhỏ; nấm và cà rốt thái mỏng.',['Đun sôi 1.2 lít nước với vài lát gừng và cà rốt thái mỏng trong 4 phút.', 'Cho nấm vào nấu sôi 3 phút, sau đó thả đậu hũ và rong biển vào nấu lửa vừa thêm 2 phút.', 'Nêm muối và 1 thìa nhỏ nước tương cho thanh vị, tránh đun rong biển quá lâu.', 'Rắc hành lá thái nhỏ và tắt bếp, múc ra tô dùng nóng.'],['Healthy · Thanh đạm','Canh gia đình','Một nồi']],
  ['Bông cải xanh xào nấm đông cô ít dầu','veg','plant',15,{broccoli:400,mushroom:220,carrot:120,garlic:15,soy:15,oil:10},'Bông cải xanh tách nhánh vừa ăn, ngâm rửa sạch; nấm thái lát; cà rốt tỉa hoa thái mỏng.',['Chần bông cải xanh và cà rốt trong nước sôi 1.5 phút rồi vớt ngay ra để ráo giúp rau xanh giòn và không cần dùng nhiều dầu.', 'Làm nóng 1 thìa nhỏ dầu trên chảo, phi thơm tỏi băm rồi cho nấm vào xào 2 phút với 2 thìa nước lọc.', 'Cho bông cải xanh và cà rốt vào đảo nhanh lửa lớn 1.5 phút cùng nước tương.', 'Tắt bếp và bày ra đĩa khi rau củ vừa chín tới giòn ngọt.'],['Healthy · Thanh đạm','Món rau gia đình','Ít dầu mỡ']]
 ];
 for(const[name,cat,protein,time,ingredients,prep,steps,tags]of curatedWesternAndHealthy)push(name,cat,protein,time,ingredients,prep,steps,tags);
 const proteins=[['Thịt heo','pork','pork',500],['Thịt gà','chicken','chicken',600],['Thịt bò','beef','beef',500],['Cá trắng','fish','fish',600],['Cá hồi','salmon','fish',550],['Tôm','shrimp','shrimp',550],['Đậu hũ','tofu','plant',650]];
 const styles=[
 ['rim gừng',{ginger:25,fishSauce:20,sugar:12,oil:15},'rim',30],['rim tỏi',{garlic:25,fishSauce:20,sugar:12,oil:15},'rim',25],['xào nấm',{mushroom:250,garlic:15,soy:20,oil:20},'xào',25],['xào đậu que',{bean:300,garlic:15,soy:20,oil:20},'xào',25],['xào bông cải',{broccoli:350,garlic:15,soy:20,oil:20},'xào',25],['xào cà rốt hành tây',{carrot:180,onion:180,soy:20,oil:20},'xào',25],['xào sả thơm',{lemongrass:35,onion:120,soy:20,oil:20},'xào',30],['xào hành tây',{onion:300,garlic:15,soy:20,oil:20},'xào',25],['sốt cà chua',{tomato:350,garlic:15,soy:20,oil:15,sugar:8},'sốt',30],['kho nước tương',{soy:30,ginger:20,sugar:12,oil:15},'kho',40],['kho nước dừa',{coconut:300,soy:25,sugar:10,garlic:15},'kho',45],['áp chảo tỏi',{garlic:20,oil:25,salt:3,pepper:2},'áp chảo',25],['sốt nấm hành',{mushroom:250,onion:150,soy:25,oil:15},'sốt',30],['rim chua ngọt dứa',{pineapple:250,tomato:150,soy:20,sugar:15,oil:15},'rim',30],['hấp gừng hành',{ginger:30,scallion:35,soy:20,oil:10},'hấp',35],['hấp sả',{lemongrass:50,ginger:20,salt:3},'hấp',35],['rim tiêu nhẹ',{pepper:2,soy:25,sugar:12,oil:15,scallion:20},'rim',30],['xào cải thìa',{bokchoy:350,garlic:15,soy:20,oil:20},'xào',25],['xào bắp cải',{cabbage:350,carrot:100,soy:20,oil:20},'xào',25],['xào bí đỏ',{pumpkin:300,onion:150,soy:20,oil:20},'xào',30],['sốt gừng nấm',{mushroom:220,ginger:25,soy:25,oil:15},'sốt',30],['rim bắp ngọt',{corn:200,garlic:15,soy:20,oil:15,sugar:8},'rim',30],['xào đậu Hà Lan',{peas:250,carrot:120,soy:20,oil:20},'xào',25],['kho cà chua dứa',{tomato:250,pineapple:200,soy:25,sugar:10,oil:15},'kho',40]];
 for(const[name,id,protein,qty]of proteins)for(const[style,extras,method,time]of styles){const ingredients={[id]:qty,...extras};const lead=protein==='plant'?'Cắt đậu hũ và thấm khô.':id==='shrimp'?'Bóc vỏ, bỏ chỉ lưng tôm và để ráo.':protein==='fish'?'Kiểm tra xương cá, chia miếng đều và thấm khô.':`Cắt ${name.toLowerCase()} thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống.`;push(name+' '+style,'main',protein,time,ingredients,lead+' Sơ chế rau và gia vị trước khi nấu.',[lead+' Rửa, cắt rau và băm hoặc thái gia vị trong công thức.',method==='hấp'?`Đặt ${name.toLowerCase()} cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.`:method==='kho'?`Đảo săn ${name.toLowerCase()} nếu phù hợp, thêm phần nước và gia vị của công thức.`:`Làm nóng dầu, nấu ${name.toLowerCase()} đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.`,method==='hấp'?'Hấp đến khi nguyên liệu chín hoàn toàn; thời gian phụ thuộc độ dày và lượng thực phẩm.':`Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, ${method} đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.`,'Nếm và điều chỉnh gia vị, chia phần theo số người ăn. Món ăn kèm cơm và các món rau/canh được chọn riêng.'],['Biến thể công thức gia đình',time<=30?'Nhanh trong tuần':'Nấu thong thả'])}
 const soupVeg=[['bí đỏ',{pumpkin:450}],['bí xanh',{gourd:450}],['rau cải',{spinach:400}],['cải thìa',{bokchoy:400}],['nấm cà rốt',{mushroom:200,carrot:150}],['bắp cải',{cabbage:400}],['khoai tây cà rốt',{potato:250,carrot:180}],['bông cải',{broccoli:350}],['cà chua',{tomato:350}],['dứa cà chua',{pineapple:200,tomato:200}],['rong biển nấm',{seaweed:10,mushroom:150}],['đậu Hà Lan cà rốt',{peas:200,carrot:150}],['bắp ngọt',{corn:300}],['đậu que cà rốt',{bean:250,carrot:150}],['cải thìa đậu hũ',{bokchoy:300,tofu:200}]];
 const soupProteins=[['thịt bằm','pork','pork',180],['gà','chicken','chicken',250],['tôm','shrimp','shrimp',200],['cá','fish','fish',250],['đậu hũ','tofu','plant',300],['trứng','egg','egg',3],['bò','beef','beef',180],['cá viên','fishBall','fish',250]];
 for(const[v,veg]of soupVeg)for(const[p,id,protein,qty]of soupProteins){const ingredients={...veg,[id]:(veg[id]||0)+qty,scallion:15,salt:3};push('Canh '+v+' nấu '+p,'soup',protein,['potato','pumpkin'].some(i=>veg[i])?30:20,ingredients,`Sơ chế ${v}, cắt đều để chín cùng lúc; chuẩn bị ${p}.`,[`Rửa và cắt phần rau củ. Sơ chế ${p}; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.`,`Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm ${p}; nấu chín hoàn toàn.`,id==='egg'?'Đánh trứng riêng, rót vào nồi và nấu đến khi trứng chín. Nếu đã cho trứng ở bước trước, kiểm tra lại độ chín.':'Thêm phần rau hoặc nấm còn lại, nấu tới độ mềm phù hợp; đậu hũ cần đảo nhẹ.','Nêm muối vừa ăn, thêm hành lá. Chia canh theo khẩu phần, dùng cùng những món đã chọn.'],['Canh gia đình','Một nồi'])}
 const vegPairs=[['Cải thìa và nấm',{bokchoy:350,mushroom:180}],['Bắp cải và cà rốt',{cabbage:350,carrot:150}],['Bông cải và cà rốt',{broccoli:350,carrot:150}],['Đậu que và nấm',{bean:350,mushroom:150}],['Rau cải và nấm',{spinach:350,mushroom:150}],['Bí đỏ và nấm',{pumpkin:350,mushroom:150}],['Cà rốt và đậu Hà Lan',{carrot:250,peas:250}],['Bắp cải và hành tây',{cabbage:350,onion:150}],['Đậu que và cà rốt',{bean:350,carrot:150}],['Bông cải và nấm',{broccoli:350,mushroom:180}],['Cải thìa và cà rốt',{bokchoy:350,carrot:150}],['Rau cải và đậu hũ',{spinach:350,tofu:250}],['Nấm và bắp ngọt',{mushroom:250,corn:220}],['Bí đỏ và cà rốt',{pumpkin:300,carrot:180}],['Bắp cải và nấm',{cabbage:350,mushroom:180}],['Bông cải và đậu Hà Lan',{broccoli:300,peas:200}],['Đậu que và hành tây',{bean:350,onion:150}],['Cải thìa và bắp ngọt',{bokchoy:350,corn:180}],['Khoai tây và cà rốt',{potato:300,carrot:180}],['Rau muống và nấm',{waterSpinach:350,mushroom:150}]];
 for(const[name,veg]of vegPairs)for(const method of ['xào tỏi','xào gừng','hấp','luộc']){const extras=method==='xào tỏi'?{garlic:18,oil:20,soy:15}:method==='xào gừng'?{ginger:20,oil:20,soy:15}:{salt:3};push(name+' '+method,'veg','plant',veg.potato||veg.pumpkin?25:15,{...veg,...extras},'Sơ chế và cắt rau củ; phần lâu chín nên cắt nhỏ hơn.', ['Rửa và cắt rau củ đều nhau; nấm làm sạch, đậu hũ cắt miếng nếu có.',method.startsWith('xào')?'Làm nóng dầu, phi tỏi hoặc gừng. Cho phần rau củ lâu chín vào trước, thêm chút nước nếu cần.':method==='hấp'?'Đun nước trong xửng và cho rau củ vào hấp, tránh chạm trực tiếp vào nước.':'Đun nước với ít muối, cho phần rau củ lâu mềm vào trước.',method.startsWith('xào')?'Cho phần rau còn lại vào, xào đến chín, thêm nước tương vừa ăn.':'Nấu đến độ mềm mong muốn, kiểm tra phần củ đã chín rồi lấy ra.','Chia phần và dùng cùng món chính. Khẩu phần món này có thể chia nhỏ khi bữa có nhiều món rau.'],['Món rau gia đình',method.startsWith('xào')?'Xào nhanh':'Ít thao tác'])}
 // Porridge comes before noodle variants so it remains represented in the quota.
 for(const[p,id,protein,qty]of soupProteins.filter(x=>x[1]!=='egg'&&x[1]!=='fishBall'))for(const[v,veg]of soupVeg.slice(0,4)){push('Cháo '+p+' '+v+' từ cơm chín','noodle',protein,30,{cookedRice:650,[id]:qty*1.5,...veg,[protein==='plant'?'vegBroth':'broth']:1800,scallion:20,salt:3},'Dùng cơm đã nấu và nước dùng có sẵn; thời gian không gồm nấu cơm hoặc hầm nước dùng.',['Sơ chế phần rau củ, cắt nhỏ. Chuẩn bị đạm, kiểm tra xương nếu có cá.','Đun cơm chín được bảo quản đúng cách với nước dùng, khuấy tơi và nấu cùng phần củ lâu mềm.','Thêm nguyên liệu đạm và rau còn lại, nấu đến khi tất cả chín hoàn toàn; thêm nước để điều chỉnh độ đặc.','Nêm nhẹ, thêm hành lá và dùng ngay.'],['Cơm đã nấu','Nước dùng có sẵn','Biến thể cháo'])}
 const noodleBases=[['Phở','riceNoodle',600],['Bún','noodle',600],['Hủ tiếu','huTieu',600],['Mì trứng','eggNoodle',500],['Miến','vermicelli',250],['Udon','udon',700],['Nui','pasta',300],['Bánh canh','banhCanh',650]];
 const brothStyles=[['nấm cải',{mushroom:180,bokchoy:300}],['cà chua rau cải',{tomato:300,spinach:250}],['rau củ',{carrot:150,cabbage:250}]];
 for(const[base,noodle,amount]of noodleBases)for(const[p,id,protein,qty]of soupProteins)for(const[style,veg]of brothStyles){push(base+' '+p+' '+style,'noodle',protein,base==='Nui'?30:25,{[noodle]:amount,[id]:id==='egg'?4:qty*1.7,...veg,[protein==='plant'?'vegBroth':'broth']:1800,scallion:20,salt:3},'Dùng nước dùng có sẵn; thời gian không tính hầm nước dùng. Trụng sợi theo bao bì.',['Sơ chế nguyên liệu đạm, kiểm tra xương nếu có cá; rau củ rửa và cắt vừa ăn.',`Đun nước dùng, cho phần rau củ lâu mềm và ${p} vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.`,`Trụng hoặc nấu ${base.toLowerCase()} theo hướng dẫn trên bao bì. Cho rau còn lại vào nước dùng, nấu vừa chín.`,'Nêm nhẹ, chia sợi và các nguyên liệu ra tô, chan nước dùng nóng, thêm hành lá. Đây là món nước làm bữa chính; cơm và món khác được chọn riêng.'],['Nước dùng có sẵn','Bữa chính món nước','Biến thể gia đình'])}
 const quotas={main:160,soup:100,veg:80,noodle:146};const selected=[];for(const[cat,count]of Object.entries(quotas))selected.push(...EXPANDED_RECIPES.filter(r=>r.category===cat).slice(0,count));for(const r of EXPANDED_RECIPES){if(selected.length>=486)break;if(!selected.some(x=>x.id===r.id))selected.push(r)}RECIPES.push(...selected.slice(0,486));
})();

// 100 authored reference recipes; existing recipes and IDs are preserved.
const WESTERN_HEALTHY_RECIPES=[
  {
    "id": "west-v4-001",
    "name": "Spaghetti sốt cà chua húng quế",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "tomato",
        "qty": 700
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "parmesan",
        "qty": 40
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu cà chua băm với tỏi 15 phút cho thành sốt; tắt lửa rồi xé húng quế vào, dùng Parmesan lúc trộn mì.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Nấu cà chua băm với tỏi 15 phút cho thành sốt; tắt lửa rồi xé húng quế vào, dùng Parmesan lúc trộn mì.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-002",
    "name": "Spaghetti tỏi dầu và chanh vàng",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "garlic",
        "qty": 30
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Phi tỏi lát nhẹ lửa trong dầu, không để cháy; thêm vỏ chanh bào mỏng và nước cốt, rắc húng quế sau khi trộn mì.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Phi tỏi lát nhẹ lửa trong dầu, không để cháy; thêm vỏ chanh bào mỏng và nước cốt, rắc húng quế sau khi trộn mì.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-003",
    "name": "Spaghetti tôm chanh vàng húng quế",
    "category": "main",
    "protein": "shrimp",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "shrimp",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Bóc vỏ bỏ chỉ tôm; phi tỏi, nấu cà chua mềm rồi thêm tôm đến chín đục; thêm chanh và húng quế lúc trộn mì.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Bóc vỏ bỏ chỉ tôm; phi tỏi, nấu cà chua mềm rồi thêm tôm đến chín đục; thêm chanh và húng quế lúc trộn mì.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-004",
    "name": "Spaghetti cá ngừ ô liu sốt cà chua",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "tuna",
        "qty": 300
      },
      {
        "id": "olive",
        "qty": 80
      },
      {
        "id": "tomato",
        "qty": 550
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu cà chua và tỏi thành sốt, thêm ô liu thái lát, oregano và cá ngừ đã để ráo; đun nóng kỹ rồi trộn mì.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Nấu cà chua và tỏi thành sốt, thêm ô liu thái lát, oregano và cá ngừ đã để ráo; đun nóng kỹ rồi trộn mì.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-005",
    "name": "Spaghetti gà bí ngòi sốt chanh",
    "category": "main",
    "protein": "chicken",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "chicken",
        "qty": 450
      },
      {
        "id": "zucchini",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "parmesan",
        "qty": 40
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo gà thái mỏng đến chín hoàn toàn, thêm bí ngòi xào vừa mềm; thêm nước chanh, nước mì và Parmesan để tạo sốt nhẹ.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Áp chảo gà thái mỏng đến chín hoàn toàn, thêm bí ngòi xào vừa mềm; thêm nước chanh, nước mì và Parmesan để tạo sốt nhẹ.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-006",
    "name": "Spaghetti nấm sốt kem Parmesan",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "mushroom",
        "qty": 450
      },
      {
        "id": "cream",
        "qty": 180
      },
      {
        "id": "parmesan",
        "qty": 60
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành, tỏi và nấm đến bay nước; rót kem, đun lăn tăn 3 phút rồi khuấy Parmesan vào lửa nhỏ, không đun sôi mạnh.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Xào hành, tỏi và nấm đến bay nước; rót kem, đun lăn tăn 3 phút rồi khuấy Parmesan vào lửa nhỏ, không đun sôi mạnh.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-007",
    "name": "Spaghetti kiểu Carbonara thịt heo",
    "category": "main",
    "protein": "pork",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "pork",
        "qty": 300
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "parmesan",
        "qty": 80
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Thái thịt heo hạt lựu, áp chảo đến chín; đánh trứng với Parmesan. Trộn cùng mì và chút nước mì trên lửa nhỏ, đảo liên tục đến sốt đạt 71°C; không để sốt sống.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Thái thịt heo hạt lựu, áp chảo đến chín; đánh trứng với Parmesan. Trộn cùng mì và chút nước mì trên lửa nhỏ, đảo liên tục đến sốt đạt 71°C; không để sốt sống.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-008",
    "name": "Spaghetti đậu lăng sốt cà chua",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 320
      },
      {
        "id": "lentil",
        "qty": 160
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "carrot",
        "qty": 120
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc đậu lăng trong nước 20–25 phút cho mềm; xào hành, tỏi, cà rốt rồi nấu cà chua, thêm đậu và oregano tạo sốt đặc.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Luộc đậu lăng trong nước 20–25 phút cho mềm; xào hành, tỏi, cà rốt rồi nấu cà chua, thêm đậu và oregano tạo sốt đặc.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-009",
    "name": "Spaghetti pesto húng quế không hạt",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "basil",
        "qty": 50
      },
      {
        "id": "parmesan",
        "qty": 70
      },
      {
        "id": "garlic",
        "qty": 10
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xay hoặc giã húng quế, tỏi, Parmesan với dầu và ít nước mì; trộn ngoài bếp để giữ màu xanh, thêm nước chanh vừa đủ. Không dùng hạt hoặc sốt pesto mua sẵn.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Xay hoặc giã húng quế, tỏi, Parmesan với dầu và ít nước mì; trộn ngoài bếp để giữ màu xanh, thêm nước chanh vừa đủ. Không dùng hạt hoặc sốt pesto mua sẵn.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-010",
    "name": "Spaghetti thịt viên bò sốt cà chua",
    "category": "main",
    "protein": "beef",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "beef",
        "qty": 450
      },
      {
        "id": "bread",
        "qty": 60
      },
      {
        "id": "egg",
        "qty": 1
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Băm bò, trộn bánh mì vụn và trứng thành 16 viên; áp chảo rồi nấu trong cà chua tỏi oregano đến giữa viên đạt 71°C.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Băm bò, trộn bánh mì vụn và trứng thành 16 viên; áp chảo rồi nấu trong cà chua tỏi oregano đến giữa viên đạt 71°C.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-011",
    "name": "Penne cà tím cà chua mozzarella",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "eggplant",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "mozzarella",
        "qty": 120
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo cà tím cắt khối cho mềm, nấu cùng cà chua và tỏi; trộn penne, thêm mozzarella xé và húng quế lúc nóng.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Áp chảo cà tím cắt khối cho mềm, nấu cùng cà chua và tỏi; trộn penne, thêm mozzarella xé và húng quế lúc nóng.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-012",
    "name": "Penne gà ớt chuông sốt cà chua",
    "category": "main",
    "protein": "chicken",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "chicken",
        "qty": 450
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào gà thái miếng đến chín, thêm hành và ớt chuông; nấu cà chua cùng oregano thành sốt rồi trộn penne.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Xào gà thái miếng đến chín, thêm hành và ớt chuông; nấu cà chua cùng oregano thành sốt rồi trộn penne.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-013",
    "name": "Penne cá hồi măng tây sốt kem",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "salmon",
        "qty": 450
      },
      {
        "id": "asparagus",
        "qty": 300
      },
      {
        "id": "cream",
        "qty": 160
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo cá hồi đến chín, xào măng tây với tỏi; thêm kem đun lăn tăn rồi nhẹ tay trộn penne, cá hồi và ít chanh.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Áp chảo cá hồi đến chín, xào măng tây với tỏi; thêm kem đun lăn tăn rồi nhẹ tay trộn penne, cá hồi và ít chanh.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-014",
    "name": "Penne đậu trắng cà chua húng quế",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 320
      },
      {
        "id": "whiteBean",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu cà chua tỏi 12 phút, cho đậu trắng chín vào đun nóng; trộn penne và húng quế, không thêm thịt.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Nấu cà chua tỏi 12 phút, cho đậu trắng chín vào đun nóng; trộn penne và húng quế, không thêm thịt.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-015",
    "name": "Penne bò bằm bí ngòi oregano",
    "category": "main",
    "protein": "beef",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "beef",
        "qty": 400
      },
      {
        "id": "zucchini",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Băm bò, xào tơi đến chín hoàn toàn; thêm bí ngòi, cà chua và oregano, nấu 12 phút để làm sốt.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Băm bò, xào tơi đến chín hoàn toàn; thêm bí ngòi, cà chua và oregano, nấu 12 phút để làm sốt.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-016",
    "name": "Penne bông cải sốt sữa Parmesan",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "broccoli",
        "qty": 450
      },
      {
        "id": "milk",
        "qty": 300
      },
      {
        "id": "parmesan",
        "qty": 70
      },
      {
        "id": "flour",
        "qty": 15
      },
      {
        "id": "butter",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Chần bông cải 3 phút. Đun bơ với bột mì 1 phút, rót sữa từ từ khuấy mịn, đun sánh rồi thêm Parmesan và bông cải.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Chần bông cải 3 phút. Đun bơ với bột mì 1 phút, rót sữa từ từ khuấy mịn, đun sánh rồi thêm Parmesan và bông cải.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-017",
    "name": "Penne tôm ớt chuông tỏi",
    "category": "main",
    "protein": "shrimp",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "shrimp",
        "qty": 450
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "garlic",
        "qty": 25
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào tỏi và ớt chuông, cho tôm đã sơ chế vào nấu chín; trộn penne với ít nước mì và nước chanh, không dùng sốt kem.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Xào tỏi và ớt chuông, cho tôm đã sơ chế vào nấu chín; trộn penne với ít nước mì và nước chanh, không dùng sốt kem.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-018",
    "name": "Penne nấm rau cải sốt cà chua",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "mushroom",
        "qty": 350
      },
      {
        "id": "spinach",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào nấm và tỏi cho thơm, thêm cà chua nấu mềm; cho rau cải đã cắt vào nấu chín trước khi trộn penne.",
    "method": "pasta",
    "steps": [
      "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.",
      "Xào nấm và tỏi cho thơm, thêm cà chua nấu mềm; cho rau cải đã cắt vào nấu chín trước khi trộn penne.",
      "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-019",
    "name": "Salad penne cá ngừ đậu que",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 320
      },
      {
        "id": "tuna",
        "qty": 300
      },
      {
        "id": "bean",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "olive",
        "qty": 60
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc penne và đậu que riêng theo độ chín, làm nguội nhanh rồi trộn cá ngừ để ráo, cà chua, ô liu với dầu và nước chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc penne và đậu que riêng theo độ chín, làm nguội nhanh rồi trộn cá ngừ để ráo, cà chua, ô liu với dầu và nước chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-020",
    "name": "Salad penne đậu gà ớt chuông",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 280
      },
      {
        "id": "chickpea",
        "qty": 400
      },
      {
        "id": "bellPepper",
        "qty": 300
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc penne rồi làm nguội; cắt ớt chuông, dưa leo và trộn cùng đậu gà chín, húng quế, dầu và nước chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc penne rồi làm nguội; cắt ớt chuông, dưa leo và trộn cùng đậu gà chín, húng quế, dầu và nước chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-021",
    "name": "Risotto nấm Parmesan",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "mushroom",
        "qty": 450
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "parmesan",
        "qty": 60
      },
      {
        "id": "butter",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành và nấm, lấy một nửa nấm ra. Đảo gạo arborio với phần còn lại 2 phút trước khi châm nước dùng; cuối cùng trộn bơ, Parmesan và nấm đã để riêng.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Xào hành và nấm, lấy một nửa nấm ra. Đảo gạo arborio với phần còn lại 2 phút trước khi châm nước dùng; cuối cùng trộn bơ, Parmesan và nấm đã để riêng.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-022",
    "name": "Risotto bí đỏ húng quế",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "pumpkin",
        "qty": 500
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "parmesan",
        "qty": 50
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành và bí đỏ hạt lựu; thêm gạo arborio đảo 2 phút. Bí đỏ mềm hòa vào nước gạo tạo màu cam; trộn Parmesan và húng quế khi gạo chín.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Xào hành và bí đỏ hạt lựu; thêm gạo arborio đảo 2 phút. Bí đỏ mềm hòa vào nước gạo tạo màu cam; trộn Parmesan và húng quế khi gạo chín.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-023",
    "name": "Risotto tôm chanh vàng",
    "category": "main",
    "protein": "shrimp",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "shrimp",
        "qty": 450
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "broth",
        "qty": 1200
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "parmesan",
        "qty": 40
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo tôm đã sơ chế đến chín rồi để riêng. Xào hành, đảo gạo; sau khi gạo chín cùng nước dùng, trộn lại tôm, Parmesan và chanh.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Áp chảo tôm đã sơ chế đến chín rồi để riêng. Xào hành, đảo gạo; sau khi gạo chín cùng nước dùng, trộn lại tôm, Parmesan và chanh.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-024",
    "name": "Risotto gà đậu Hà Lan",
    "category": "main",
    "protein": "chicken",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "chicken",
        "qty": 450
      },
      {
        "id": "peas",
        "qty": 250
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "broth",
        "qty": 1200
      },
      {
        "id": "parmesan",
        "qty": 50
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào gà hạt lựu đến chín, thêm hành và gạo. Châm nước dùng từng vá; cho đậu Hà Lan vào 5 phút cuối, khuấy Parmesan khi gạo chín.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Xào gà hạt lựu đến chín, thêm hành và gạo. Châm nước dùng từng vá; cho đậu Hà Lan vào 5 phút cuối, khuấy Parmesan khi gạo chín.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-025",
    "name": "Risotto măng tây chanh vàng",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "asparagus",
        "qty": 400
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "parmesan",
        "qty": 60
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Cắt măng tây đoạn ngắn, chần sơ và để riêng. Xào hành và gạo; trộn măng tây, Parmesan cùng chanh vào khi cơm risotto vừa chín.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Cắt măng tây đoạn ngắn, chần sơ và để riêng. Xào hành và gạo; trộn măng tây, Parmesan cùng chanh vào khi cơm risotto vừa chín.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-026",
    "name": "Risotto cà chua mozzarella",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "mozzarella",
        "qty": 140
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1100
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành và cà chua băm cho mềm rồi đảo gạo; nấu với nước dùng từng ít. Cuối cùng trộn mozzarella và húng quế cho vừa tan.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Xào hành và cà chua băm cho mềm rồi đảo gạo; nấu với nước dùng từng ít. Cuối cùng trộn mozzarella và húng quế cho vừa tan.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-027",
    "name": "Risotto cá hồi bí ngòi",
    "category": "main",
    "protein": "fish",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 320
      },
      {
        "id": "salmon",
        "qty": 450
      },
      {
        "id": "zucchini",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "broth",
        "qty": 1200
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo cá hồi đến chín hoàn toàn, chia miếng để riêng. Xào hành, gạo và bí ngòi; nấu với nước dùng, trộn cá hồi và chanh sau cùng.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Áp chảo cá hồi đến chín hoàn toàn, chia miếng để riêng. Xào hành, gạo và bí ngòi; nấu với nước dùng, trộn cá hồi và chanh sau cùng.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-028",
    "name": "Risotto đậu trắng rau cải",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "arborio",
        "qty": 300
      },
      {
        "id": "whiteBean",
        "qty": 400
      },
      {
        "id": "spinach",
        "qty": 300
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "parmesan",
        "qty": 50
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành và gạo, châm nước dùng từng vá; gần cuối thêm đậu trắng chín, rau cải và Parmesan, nấu rau chín rồi mới dùng.",
    "method": "risotto",
    "steps": [
      "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.",
      "Xào hành và gạo, châm nước dùng từng vá; gần cuối thêm đậu trắng chín, rau cải và Parmesan, nấu rau chín rồi mới dùng.",
      "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-029",
    "name": "Lasagna bò bằm sốt sữa",
    "category": "main",
    "protein": "beef",
    "time": 70,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lasagne",
        "qty": 250
      },
      {
        "id": "beef",
        "qty": 500
      },
      {
        "id": "tomato",
        "qty": 700
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "milk",
        "qty": 500
      },
      {
        "id": "flour",
        "qty": 35
      },
      {
        "id": "butter",
        "qty": 30
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào bò bằm, hành, tỏi rồi nấu với cà chua 15 phút. Nồi khác đun bơ với bột, rót sữa khuấy sánh; dùng cả sốt bò và sốt sữa để xếp lớp.",
    "method": "lasagna",
    "steps": [
      "Làm nóng lò 190°C. Chuẩn bị lá lasagna theo hướng dẫn trên bao bì; dùng khay chịu nhiệt vừa cho bốn suất.",
      "Xào bò bằm, hành, tỏi rồi nấu với cà chua 15 phút. Nồi khác đun bơ với bột, rót sữa khuấy sánh; dùng cả sốt bò và sốt sữa để xếp lớp.",
      "Xếp xen kẽ lá lasagna và nhân/sốt, kết thúc bằng phần phô mai trong công thức. Đậy giấy bạc, nướng 25 phút rồi mở giấy nướng tiếp 10–15 phút đến khi lá mì mềm; để nghỉ 10 phút trước khi cắt.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-030",
    "name": "Lasagna cà tím bí ngòi",
    "category": "main",
    "protein": "plant",
    "time": 65,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lasagne",
        "qty": 250
      },
      {
        "id": "eggplant",
        "qty": 400
      },
      {
        "id": "zucchini",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 700
      },
      {
        "id": "mozzarella",
        "qty": 180
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo cà tím và bí ngòi lát mỏng đến mềm. Nấu sốt cà chua tỏi, xếp lớp với rau, lá mì, mozzarella và húng quế.",
    "method": "lasagna",
    "steps": [
      "Làm nóng lò 190°C. Chuẩn bị lá lasagna theo hướng dẫn trên bao bì; dùng khay chịu nhiệt vừa cho bốn suất.",
      "Áp chảo cà tím và bí ngòi lát mỏng đến mềm. Nấu sốt cà chua tỏi, xếp lớp với rau, lá mì, mozzarella và húng quế.",
      "Xếp xen kẽ lá lasagna và nhân/sốt, kết thúc bằng phần phô mai trong công thức. Đậy giấy bạc, nướng 25 phút rồi mở giấy nướng tiếp 10–15 phút đến khi lá mì mềm; để nghỉ 10 phút trước khi cắt.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-031",
    "name": "Lasagna gà nấm sốt trắng",
    "category": "main",
    "protein": "chicken",
    "time": 70,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lasagne",
        "qty": 250
      },
      {
        "id": "chicken",
        "qty": 500
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "milk",
        "qty": 600
      },
      {
        "id": "flour",
        "qty": 40
      },
      {
        "id": "butter",
        "qty": 30
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gà thái nhỏ và nấm đến chín. Đun bơ với bột, rót sữa khuấy sánh; dùng sốt trắng phủ đều mỗi lớp mì và nhân gà nấm.",
    "method": "lasagna",
    "steps": [
      "Làm nóng lò 190°C. Chuẩn bị lá lasagna theo hướng dẫn trên bao bì; dùng khay chịu nhiệt vừa cho bốn suất.",
      "Nấu gà thái nhỏ và nấm đến chín. Đun bơ với bột, rót sữa khuấy sánh; dùng sốt trắng phủ đều mỗi lớp mì và nhân gà nấm.",
      "Xếp xen kẽ lá lasagna và nhân/sốt, kết thúc bằng phần phô mai trong công thức. Đậy giấy bạc, nướng 25 phút rồi mở giấy nướng tiếp 10–15 phút đến khi lá mì mềm; để nghỉ 10 phút trước khi cắt.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-032",
    "name": "Lasagna đậu lăng cà chua",
    "category": "main",
    "protein": "plant",
    "time": 75,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lasagne",
        "qty": 250
      },
      {
        "id": "lentil",
        "qty": 200
      },
      {
        "id": "tomato",
        "qty": 800
      },
      {
        "id": "carrot",
        "qty": 150
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc đậu lăng mềm 20–25 phút. Nấu hành, cà rốt, cà chua, oregano thành sốt rồi trộn đậu; dùng sốt hơi lỏng để lá mì chín đều.",
    "method": "lasagna",
    "steps": [
      "Làm nóng lò 190°C. Chuẩn bị lá lasagna theo hướng dẫn trên bao bì; dùng khay chịu nhiệt vừa cho bốn suất.",
      "Luộc đậu lăng mềm 20–25 phút. Nấu hành, cà rốt, cà chua, oregano thành sốt rồi trộn đậu; dùng sốt hơi lỏng để lá mì chín đều.",
      "Xếp xen kẽ lá lasagna và nhân/sốt, kết thúc bằng phần phô mai trong công thức. Đậy giấy bạc, nướng 25 phút rồi mở giấy nướng tiếp 10–15 phút đến khi lá mì mềm; để nghỉ 10 phút trước khi cắt.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-033",
    "name": "Pizza bánh mì cà chua mozzarella",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bread",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "mozzarella",
        "qty": 180
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 10
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Băm một nửa cà chua, nấu với tỏi thành sốt; phần còn lại thái lát. Phết sốt lên bánh mì rồi xếp cà chua và mozzarella; húng quế thêm sau khi nướng.",
    "method": "breadPizza",
    "steps": [
      "Làm nóng lò 200°C. Cắt bánh mì thành lát dày, đặt trên khay; không làm đế bột hoặc thêm men ngoài công thức.",
      "Băm một nửa cà chua, nấu với tỏi thành sốt; phần còn lại thái lát. Phết sốt lên bánh mì rồi xếp cà chua và mozzarella; húng quế thêm sau khi nướng.",
      "Phủ phần rau/đạm đã sơ chế lên bánh mì, chia đều phô mai; nướng 8–12 phút đến khi bánh nóng giòn và phô mai tan.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-034",
    "name": "Pizza bánh mì gà nấm",
    "category": "main",
    "protein": "chicken",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bread",
        "qty": 400
      },
      {
        "id": "chicken",
        "qty": 400
      },
      {
        "id": "mushroom",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu cà chua thành sốt; xào gà thái nhỏ và nấm đến chín, phết sốt và xếp nhân cùng oregano lên bánh mì trước khi phủ phô mai.",
    "method": "breadPizza",
    "steps": [
      "Làm nóng lò 200°C. Cắt bánh mì thành lát dày, đặt trên khay; không làm đế bột hoặc thêm men ngoài công thức.",
      "Nấu cà chua thành sốt; xào gà thái nhỏ và nấm đến chín, phết sốt và xếp nhân cùng oregano lên bánh mì trước khi phủ phô mai.",
      "Phủ phần rau/đạm đã sơ chế lên bánh mì, chia đều phô mai; nướng 8–12 phút đến khi bánh nóng giòn và phô mai tan.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-035",
    "name": "Pizza bánh mì cá ngừ ô liu",
    "category": "main",
    "protein": "fish",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bread",
        "qty": 400
      },
      {
        "id": "tuna",
        "qty": 300
      },
      {
        "id": "olive",
        "qty": 80
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu cà chua băm với hành thành sốt; phết lên bánh mì, thêm cá ngừ để ráo và ô liu thái lát trước khi phủ mozzarella.",
    "method": "breadPizza",
    "steps": [
      "Làm nóng lò 200°C. Cắt bánh mì thành lát dày, đặt trên khay; không làm đế bột hoặc thêm men ngoài công thức.",
      "Nấu cà chua băm với hành thành sốt; phết lên bánh mì, thêm cá ngừ để ráo và ô liu thái lát trước khi phủ mozzarella.",
      "Phủ phần rau/đạm đã sơ chế lên bánh mì, chia đều phô mai; nướng 8–12 phút đến khi bánh nóng giòn và phô mai tan.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-036",
    "name": "Pizza bánh mì ớt chuông bí ngòi",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bread",
        "qty": 400
      },
      {
        "id": "bellPepper",
        "qty": 250
      },
      {
        "id": "zucchini",
        "qty": 250
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "mozzarella",
        "qty": 150
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào bí ngòi và ớt chuông vừa mềm; nấu cà chua thành sốt, phết lên bánh mì rồi thêm rau, oregano và mozzarella.",
    "method": "breadPizza",
    "steps": [
      "Làm nóng lò 200°C. Cắt bánh mì thành lát dày, đặt trên khay; không làm đế bột hoặc thêm men ngoài công thức.",
      "Xào bí ngòi và ớt chuông vừa mềm; nấu cà chua thành sốt, phết lên bánh mì rồi thêm rau, oregano và mozzarella.",
      "Phủ phần rau/đạm đã sơ chế lên bánh mì, chia đều phô mai; nướng 8–12 phút đến khi bánh nóng giòn và phô mai tan.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-037",
    "name": "Salad Caprese cà chua mozzarella",
    "category": "veg",
    "protein": "plant",
    "time": 15,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tomato",
        "qty": 700
      },
      {
        "id": "mozzarella",
        "qty": 250
      },
      {
        "id": "basil",
        "qty": 30
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Thái cà chua và mozzarella thành lát, xếp xen kẽ với lá húng quế; trộn dầu, nước chanh và chút muối tiêu thành sốt.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Thái cà chua và mozzarella thành lát, xếp xen kẽ với lá húng quế; trộn dầu, nước chanh và chút muối tiêu thành sốt.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-038",
    "name": "Bruschetta cà chua húng quế",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bread",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "basil",
        "qty": 25
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nướng bánh mì giòn, chà nhẹ tỏi lên mặt; trộn cà chua hạt lựu, húng quế, dầu và chanh, múc lên bánh ngay lúc ăn.",
    "method": "toast",
    "steps": [
      "Cắt bánh mì nguyên cám thành lát và nướng/áp chảo khô đến giòn nhẹ. Sơ chế phần rau và đạm riêng.",
      "Nướng bánh mì giòn, chà nhẹ tỏi lên mặt; trộn cà chua hạt lựu, húng quế, dầu và chanh, múc lên bánh ngay lúc ăn.",
      "Chia nhân lên bánh mì ngay trước khi dùng. Trứng, thịt và cá sống phải được nấu chín trước khi đặt lên bánh.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-039",
    "name": "Minestrone penne đậu trắng",
    "category": "soup",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 160
      },
      {
        "id": "whiteBean",
        "qty": 400
      },
      {
        "id": "carrot",
        "qty": 180
      },
      {
        "id": "zucchini",
        "qty": 250
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1400
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào hành và cà rốt, thêm cà chua, nước dùng và oregano; nấu penne trong súp theo bao bì, cho bí ngòi và đậu trắng chín vào cuối.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành và cà rốt, thêm cà chua, nước dùng và oregano; nấu penne trong súp theo bao bì, cho bí ngòi và đậu trắng chín vào cuối.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-040",
    "name": "Súp đậu gà cà chua oregano kiểu Ý",
    "category": "soup",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 500
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "carrot",
        "qty": 180
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Ý",
    "tags": [
      "Món Ý",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, tỏi và cà rốt; thêm cà chua, nước dùng, oregano và đậu gà chín, nấu nhỏ lửa 20 phút. Nghiền một ít đậu để tạo độ sánh.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành, tỏi và cà rốt; thêm cà chua, nước dùng, oregano và đậu gà chín, nấu nhỏ lửa 20 phút. Nghiền một ít đậu để tạo độ sánh.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-041",
    "name": "Gà nướng chanh vàng oregano",
    "category": "main",
    "protein": "chicken",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 650
      },
      {
        "id": "potato",
        "qty": 450
      },
      {
        "id": "carrot",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "oregano",
        "qty": 3
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc sơ khoai và cà rốt 6 phút. Ướp gà với chanh, tỏi và oregano, xếp cùng củ lên khay; phần gà dày cần thêm thời gian và đạt 75°C.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Luộc sơ khoai và cà rốt 6 phút. Ướp gà với chanh, tỏi và oregano, xếp cùng củ lên khay; phần gà dày cần thêm thời gian và đạt 75°C.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-042",
    "name": "Gà nướng ớt chuông bí ngòi",
    "category": "main",
    "protein": "chicken",
    "time": 45,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 650
      },
      {
        "id": "bellPepper",
        "qty": 400
      },
      {
        "id": "zucchini",
        "qty": 400
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Ướp gà với tỏi và oregano; nướng gà 15 phút trước, sau đó thêm ớt chuông và bí ngòi để rau không nhũn.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Ướp gà với tỏi và oregano; nướng gà 15 phút trước, sau đó thêm ớt chuông và bí ngòi để rau không nhũn.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-043",
    "name": "Thịt heo nướng chanh tỏi kèm đậu que",
    "category": "main",
    "protein": "pork",
    "time": 45,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pork",
        "qty": 650
      },
      {
        "id": "potato",
        "qty": 450
      },
      {
        "id": "bean",
        "qty": 350
      },
      {
        "id": "garlic",
        "qty": 25
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Dùng thịt heo nạc thái lát dày 2 cm, ướp chanh tỏi oregano; luộc sơ khoai, thêm đậu que vào khay ở 10 phút cuối.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Dùng thịt heo nạc thái lát dày 2 cm, ướp chanh tỏi oregano; luộc sơ khoai, thêm đậu que vào khay ở 10 phút cuối.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-044",
    "name": "Bò nướng khay khoai tây ớt chuông",
    "category": "main",
    "protein": "beef",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "beef",
        "qty": 600
      },
      {
        "id": "potato",
        "qty": 500
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 180
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc sơ khoai 8 phút rồi nướng trước 15 phút; thêm bò thái dày 1,5 cm, ớt chuông và hành, nướng đến độ chín phù hợp, dùng thớt sạch chia thịt.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Luộc sơ khoai 8 phút rồi nướng trước 15 phút; thêm bò thái dày 1,5 cm, ớt chuông và hành, nướng đến độ chín phù hợp, dùng thớt sạch chia thịt.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-045",
    "name": "Cá trắng nướng cà chua ô liu",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "fish",
        "qty": 650
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "olive",
        "qty": 90
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xếp cá trên cà chua và hành thái mỏng; thêm ô liu, oregano và chanh, phủ giấy bạc để giữ nước rồi nướng chín.",
    "method": "fishBake",
    "steps": [
      "Làm nóng lò 190°C. Kiểm tra xương, thấm khô cá; cắt rau thành miếng vừa ăn.",
      "Xếp cá trên cà chua và hành thái mỏng; thêm ô liu, oregano và chanh, phủ giấy bạc để giữ nước rồi nướng chín.",
      "Nướng cá và rau 15–20 phút tùy độ dày; cá cần đạt 63°C ở phần dày nhất. Củ lâu chín cần luộc sơ hoặc nướng trước khi cho cá vào.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-046",
    "name": "Cá hồi nướng chanh măng tây",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "salmon",
        "qty": 650
      },
      {
        "id": "asparagus",
        "qty": 450
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xếp cá hồi và măng tây vào khay, rưới dầu, tỏi băm và chanh; nướng đến khi cá đạt 63°C, không thêm sốt kem.",
    "method": "fishBake",
    "steps": [
      "Làm nóng lò 190°C. Kiểm tra xương, thấm khô cá; cắt rau thành miếng vừa ăn.",
      "Xếp cá hồi và măng tây vào khay, rưới dầu, tỏi băm và chanh; nướng đến khi cá đạt 63°C, không thêm sốt kem.",
      "Nướng cá và rau 15–20 phút tùy độ dày; cá cần đạt 63°C ở phần dày nhất. Củ lâu chín cần luộc sơ hoặc nướng trước khi cho cá vào.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-047",
    "name": "Tôm nướng khay ớt chuông bí ngòi",
    "category": "main",
    "protein": "shrimp",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "shrimp",
        "qty": 650
      },
      {
        "id": "bellPepper",
        "qty": 400
      },
      {
        "id": "zucchini",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Bóc vỏ bỏ chỉ tôm. Nướng rau trước 15 phút, thêm tôm trộn chanh tỏi và nướng 7–10 phút cuối đến khi tôm chín đục.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Bóc vỏ bỏ chỉ tôm. Nướng rau trước 15 phút, thêm tôm trộn chanh tỏi và nướng 7–10 phút cuối đến khi tôm chín đục.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-048",
    "name": "Bò hầm cà chua đậu đỏ",
    "category": "main",
    "protein": "beef",
    "time": 110,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "beef",
        "qty": 600
      },
      {
        "id": "kidneyBean",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 650
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "onion",
        "qty": 180
      },
      {
        "id": "broth",
        "qty": 900
      },
      {
        "id": "oregano",
        "qty": 3
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Áp vàng bò khối, xào hành, cà rốt và cà chua; hầm bò nhỏ lửa 75–90 phút đến mềm, cho đậu đỏ chín và oregano vào 10 phút cuối.",
    "method": "stew",
    "steps": [
      "Cắt đạm và củ thành khối đều; đậu đã chín để ráo. Làm nóng nồi đáy dày với lượng dầu đã cân.",
      "Áp vàng bò khối, xào hành, cà rốt và cà chua; hầm bò nhỏ lửa 75–90 phút đến mềm, cho đậu đỏ chín và oregano vào 10 phút cuối.",
      "Thêm lượng nước dùng hoặc cà chua đã cân, đậy hé nắp và hầm nhỏ lửa đến khi đạm chín mềm. Cho phần rau nhanh chín vào sau, thêm nước nóng nếu cần để không khê.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-049",
    "name": "Gà hầm đậu trắng nấm",
    "category": "main",
    "protein": "chicken",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 650
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "mushroom",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "broth",
        "qty": 900
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào gà và hành cho săn, thêm nấm và nước dùng; hầm 25 phút, cho đậu trắng chín cùng oregano vào 10 phút cuối.",
    "method": "stew",
    "steps": [
      "Cắt đạm và củ thành khối đều; đậu đã chín để ráo. Làm nóng nồi đáy dày với lượng dầu đã cân.",
      "Xào gà và hành cho săn, thêm nấm và nước dùng; hầm 25 phút, cho đậu trắng chín cùng oregano vào 10 phút cuối.",
      "Thêm lượng nước dùng hoặc cà chua đã cân, đậy hé nắp và hầm nhỏ lửa đến khi đạm chín mềm. Cho phần rau nhanh chín vào sau, thêm nước nóng nếu cần để không khê.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-050",
    "name": "Đậu lăng hầm cà tím cà chua",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "eggplant",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 650
      },
      {
        "id": "onion",
        "qty": 180
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "oregano",
        "qty": 3
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, tỏi và cà tím, thêm cà chua, đậu lăng khô, oregano và nước dùng; hầm 30–35 phút đến khi đậu mềm, không dùng thịt.",
    "method": "stew",
    "steps": [
      "Cắt đạm và củ thành khối đều; đậu đã chín để ráo. Làm nóng nồi đáy dày với lượng dầu đã cân.",
      "Xào hành, tỏi và cà tím, thêm cà chua, đậu lăng khô, oregano và nước dùng; hầm 30–35 phút đến khi đậu mềm, không dùng thịt.",
      "Thêm lượng nước dùng hoặc cà chua đã cân, đậy hé nắp và hầm nhỏ lửa đến khi đạm chín mềm. Cho phần rau nhanh chín vào sau, thêm nước nóng nếu cần để không khê.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-051",
    "name": "Súp bông cải sữa Parmesan",
    "category": "soup",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "broccoli",
        "qty": 650
      },
      {
        "id": "potato",
        "qty": 250
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "milk",
        "qty": 450
      },
      {
        "id": "vegBroth",
        "qty": 800
      },
      {
        "id": "parmesan",
        "qty": 60
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, nấu khoai với nước dùng 12 phút rồi thêm bông cải 6 phút; xay mịn, thêm sữa đun nóng nhẹ và khuấy Parmesan.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành, nấu khoai với nước dùng 12 phút rồi thêm bông cải 6 phút; xay mịn, thêm sữa đun nóng nhẹ và khuấy Parmesan.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-052",
    "name": "Súp cà chua nướng húng quế",
    "category": "soup",
    "protein": "plant",
    "time": 45,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tomato",
        "qty": 1000
      },
      {
        "id": "onion",
        "qty": 180
      },
      {
        "id": "garlic",
        "qty": 25
      },
      {
        "id": "vegBroth",
        "qty": 700
      },
      {
        "id": "basil",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng cà chua, hành và tỏi 25 phút ở 200°C; cho vào nồi cùng nước dùng, đun 5 phút rồi xay mịn, thêm húng quế sau cùng.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Nướng cà chua, hành và tỏi 25 phút ở 200°C; cho vào nồi cùng nước dùng, đun 5 phút rồi xay mịn, thêm húng quế sau cùng.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-053",
    "name": "Súp nấm kem tươi kiểu Âu",
    "category": "soup",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "mushroom",
        "qty": 650
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "cream",
        "qty": 180
      },
      {
        "id": "vegBroth",
        "qty": 1000
      },
      {
        "id": "flour",
        "qty": 20
      },
      {
        "id": "butter",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, tỏi và nấm với bơ cho bay nước; rắc bột mì đảo 1 phút rồi thêm nước dùng, nấu 15 phút; thêm kem và xay một phần súp.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành, tỏi và nấm với bơ cho bay nước; rắc bột mì đảo 1 phút rồi thêm nước dùng, nấu 15 phút; thêm kem và xay một phần súp.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-054",
    "name": "Súp khoai tây bắp hạt sữa tươi",
    "category": "soup",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "potato",
        "qty": 500
      },
      {
        "id": "corn",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "milk",
        "qty": 500
      },
      {
        "id": "vegBroth",
        "qty": 900
      },
      {
        "id": "butter",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành với bơ, thêm khoai và nước dùng nấu mềm; nghiền một phần khoai, thêm bắp và sữa rồi đun lăn tăn 5 phút.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành với bơ, thêm khoai và nước dùng nấu mềm; nghiền một phần khoai, thêm bắp và sữa rồi đun lăn tăn 5 phút.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-055",
    "name": "Súp gà đậu trắng cà rốt",
    "category": "soup",
    "protein": "chicken",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 450
      },
      {
        "id": "whiteBean",
        "qty": 400
      },
      {
        "id": "carrot",
        "qty": 300
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "broth",
        "qty": 1400
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nấu gà và cà rốt với hành, nước dùng và oregano đến gà chín; xé gà bằng dụng cụ sạch, cho lại nồi cùng đậu trắng chín và đun nóng.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Nấu gà và cà rốt với hành, nước dùng và oregano đến gà chín; xé gà bằng dụng cụ sạch, cho lại nồi cùng đậu trắng chín và đun nóng.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-056",
    "name": "Súp đậu lăng cà chua chanh vàng",
    "category": "soup",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 220
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1500
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành và cà rốt, thêm đậu lăng, cà chua và nước dùng; nấu 25–30 phút đến mềm rồi vắt chanh trước khi chia bát.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành và cà rốt, thêm đậu lăng, cà chua và nước dùng; nấu 25–30 phút đến mềm rồi vắt chanh trước khi chia bát.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-057",
    "name": "Trứng nướng chảo cà chua ớt chuông",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "tomato",
        "qty": 650
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nấu hành, tỏi, ớt chuông và cà chua thành sốt 15 phút; tạo tám hõm, đập trứng vào, đậy nắp nấu đến cả lòng trắng và lòng đỏ chín.",
    "method": "eggs",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; đánh tan hoặc giữ nguyên theo mô tả món. Rửa và cắt rau trước khi bật bếp.",
      "Nấu hành, tỏi, ớt chuông và cà chua thành sốt 15 phút; tạo tám hõm, đập trứng vào, đậy nắp nấu đến cả lòng trắng và lòng đỏ chín.",
      "Nấu lửa vừa đến khi trứng chín hẳn; nếu đậy nắp, kiểm tra phần giữa không còn trứng lỏng. Chia thành bốn phần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-058",
    "name": "Frittata bí ngòi phô mai feta",
    "category": "main",
    "protein": "egg",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "zucchini",
        "qty": 450
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "feta",
        "qty": 100
      },
      {
        "id": "milk",
        "qty": 100
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào bí ngòi và hành cho ráo; trộn trứng đã đánh với sữa, feta rồi đổ vào chảo rau, đậy nắp nấu lửa nhỏ đến giữa chín hẳn.",
    "method": "eggs",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; đánh tan hoặc giữ nguyên theo mô tả món. Rửa và cắt rau trước khi bật bếp.",
      "Xào bí ngòi và hành cho ráo; trộn trứng đã đánh với sữa, feta rồi đổ vào chảo rau, đậy nắp nấu lửa nhỏ đến giữa chín hẳn.",
      "Nấu lửa vừa đến khi trứng chín hẳn; nếu đậy nắp, kiểm tra phần giữa không còn trứng lỏng. Chia thành bốn phần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-059",
    "name": "Omelette nấm phô mai mozzarella",
    "category": "main",
    "protein": "egg",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "mozzarella",
        "qty": 120
      },
      {
        "id": "scallion",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào nấm đến bay nước; đổ trứng đánh cùng hành lá, thêm mozzarella, gập trứng khi đã se rồi nấu đến giữa chín hẳn.",
    "method": "eggs",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; đánh tan hoặc giữ nguyên theo mô tả món. Rửa và cắt rau trước khi bật bếp.",
      "Xào nấm đến bay nước; đổ trứng đánh cùng hành lá, thêm mozzarella, gập trứng khi đã se rồi nấu đến giữa chín hẳn.",
      "Nấu lửa vừa đến khi trứng chín hẳn; nếu đậy nắp, kiểm tra phần giữa không còn trứng lỏng. Chia thành bốn phần.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-060",
    "name": "Pancake yến mạch sữa chua mặn",
    "category": "main",
    "protein": "egg",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "oats",
        "qty": 200
      },
      {
        "id": "flour",
        "qty": 120
      },
      {
        "id": "egg",
        "qty": 2
      },
      {
        "id": "milk",
        "qty": 350
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Xay yến mạch thành bột thô; trộn cùng bột mì, trứng, sữa và hành lá. Dùng sữa chua tự nhiên làm sốt khi bánh đã chín.",
    "method": "pancake",
    "steps": [
      "Trộn bột mì và/hoặc yến mạch với trứng, sữa trong công thức; nghỉ bột 10 phút cho hút nước, không thêm đường ngoài danh sách.",
      "Xay yến mạch thành bột thô; trộn cùng bột mì, trứng, sữa và hành lá. Dùng sữa chua tự nhiên làm sốt khi bánh đã chín.",
      "Múc bột thành bánh nhỏ, áp chảo chống dính với lượng dầu đã cân ở lửa vừa nhỏ 2–3 phút mỗi mặt; giữa bánh phải chín.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-061",
    "name": "Toast trứng bơ quả cà chua",
    "category": "main",
    "protein": "egg",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "wholeBread",
        "qty": 360
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "avocado",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc trứng chín hoàn toàn rồi thái lát; nghiền quả bơ với chanh, phết lên bánh, thêm cà chua và trứng.",
    "method": "toast",
    "steps": [
      "Cắt bánh mì nguyên cám thành lát và nướng/áp chảo khô đến giòn nhẹ. Sơ chế phần rau và đạm riêng.",
      "Luộc trứng chín hoàn toàn rồi thái lát; nghiền quả bơ với chanh, phết lên bánh, thêm cà chua và trứng.",
      "Chia nhân lên bánh mì ngay trước khi dùng. Trứng, thịt và cá sống phải được nấu chín trước khi đặt lên bánh.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-062",
    "name": "Toast cá ngừ sữa chua dưa leo",
    "category": "main",
    "protein": "fish",
    "time": 15,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "wholeBread",
        "qty": 360
      },
      {
        "id": "tuna",
        "qty": 300
      },
      {
        "id": "yogurt",
        "qty": 160
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "lettuce",
        "qty": 150
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Trộn cá ngừ để ráo với sữa chua và chanh, xếp xà lách và dưa leo lên bánh rồi thêm nhân; không thêm mayonnaise.",
    "method": "toast",
    "steps": [
      "Cắt bánh mì nguyên cám thành lát và nướng/áp chảo khô đến giòn nhẹ. Sơ chế phần rau và đạm riêng.",
      "Trộn cá ngừ để ráo với sữa chua và chanh, xếp xà lách và dưa leo lên bánh rồi thêm nhân; không thêm mayonnaise.",
      "Chia nhân lên bánh mì ngay trước khi dùng. Trứng, thịt và cá sống phải được nấu chín trước khi đặt lên bánh.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-063",
    "name": "Chả bò yến mạch kiểu burger không bánh",
    "category": "main",
    "protein": "beef",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "beef",
        "qty": 550
      },
      {
        "id": "oats",
        "qty": 70
      },
      {
        "id": "egg",
        "qty": 1
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "lettuce",
        "qty": 200
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "yogurt",
        "qty": 120
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Băm bò và hành, trộn yến mạch cùng trứng thành miếng dẹt; dùng với xà lách, cà chua và sữa chua sau khi chả đạt 71°C.",
    "method": "patties",
    "steps": [
      "Băm nhỏ rau, để ráo nước. Nếu dùng đậu chín, nghiền thô; nếu dùng đạm sống, giữ lạnh đến lúc trộn.",
      "Băm bò và hành, trộn yến mạch cùng trứng thành miếng dẹt; dùng với xà lách, cà chua và sữa chua sau khi chả đạt 71°C.",
      "Chia thành tám miếng dẹt, áp chảo với lượng dầu đã cân ở lửa vừa, khoảng 4–5 phút mỗi mặt tùy độ dày; kiểm tra phần giữa chín hoàn toàn.",
      "Thịt bằm cần đạt 71°C ở giữa; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-064",
    "name": "Chả gà bí ngòi áp chảo",
    "category": "main",
    "protein": "chicken",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 600
      },
      {
        "id": "zucchini",
        "qty": 350
      },
      {
        "id": "oats",
        "qty": 80
      },
      {
        "id": "egg",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Băm gà, vắt nhẹ bí ngòi bào, trộn yến mạch, trứng và tỏi; áp chảo đến phần giữa đạt 75°C rồi thêm chanh.",
    "method": "patties",
    "steps": [
      "Băm nhỏ rau, để ráo nước. Nếu dùng đậu chín, nghiền thô; nếu dùng đạm sống, giữ lạnh đến lúc trộn.",
      "Băm gà, vắt nhẹ bí ngòi bào, trộn yến mạch, trứng và tỏi; áp chảo đến phần giữa đạt 75°C rồi thêm chanh.",
      "Chia thành tám miếng dẹt, áp chảo với lượng dầu đã cân ở lửa vừa, khoảng 4–5 phút mỗi mặt tùy độ dày; kiểm tra phần giữa chín hoàn toàn.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-065",
    "name": "Chả cá ngừ khoai tây",
    "category": "main",
    "protein": "fish",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tuna",
        "qty": 400
      },
      {
        "id": "potato",
        "qty": 500
      },
      {
        "id": "egg",
        "qty": 1
      },
      {
        "id": "scallion",
        "qty": 30
      },
      {
        "id": "flour",
        "qty": 35
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc khoai mềm và nghiền; trộn cá ngừ để ráo, trứng, hành và bột thành miếng dẹt. Áp chảo chín hoàn toàn, thêm chanh khi ăn.",
    "method": "patties",
    "steps": [
      "Băm nhỏ rau, để ráo nước. Nếu dùng đậu chín, nghiền thô; nếu dùng đạm sống, giữ lạnh đến lúc trộn.",
      "Luộc khoai mềm và nghiền; trộn cá ngừ để ráo, trứng, hành và bột thành miếng dẹt. Áp chảo chín hoàn toàn, thêm chanh khi ăn.",
      "Chia thành tám miếng dẹt, áp chảo với lượng dầu đã cân ở lửa vừa, khoảng 4–5 phút mỗi mặt tùy độ dày; kiểm tra phần giữa chín hoàn toàn.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-066",
    "name": "Chả đậu gà cà rốt yến mạch",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 500
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "oats",
        "qty": 100
      },
      {
        "id": "egg",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "yogurt",
        "qty": 150
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nghiền đậu gà chín, trộn cà rốt bào, yến mạch, trứng và tỏi; nghỉ 10 phút cho hút ẩm rồi tạo miếng, dùng sữa chua làm sốt.",
    "method": "patties",
    "steps": [
      "Băm nhỏ rau, để ráo nước. Nếu dùng đậu chín, nghiền thô; nếu dùng đạm sống, giữ lạnh đến lúc trộn.",
      "Nghiền đậu gà chín, trộn cà rốt bào, yến mạch, trứng và tỏi; nghỉ 10 phút cho hút ẩm rồi tạo miếng, dùng sữa chua làm sốt.",
      "Chia thành tám miếng dẹt, áp chảo với lượng dầu đã cân ở lửa vừa, khoảng 4–5 phút mỗi mặt tùy độ dày; kiểm tra phần giữa chín hoàn toàn.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-067",
    "name": "Salad kiểu Hy Lạp feta ô liu",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tomato",
        "qty": 450
      },
      {
        "id": "cucumber",
        "qty": 450
      },
      {
        "id": "bellPepper",
        "qty": 250
      },
      {
        "id": "feta",
        "qty": 150
      },
      {
        "id": "olive",
        "qty": 80
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Cắt rau miếng vuông, xếp feta và ô liu lên trên; pha dầu, chanh và oregano thành sốt, không thêm thịt hoặc bánh mì.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Cắt rau miếng vuông, xếp feta và ô liu lên trên; pha dầu, chanh và oregano thành sốt, không thêm thịt hoặc bánh mì.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-068",
    "name": "Salad khoai tây trứng sốt sữa chua",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "potato",
        "qty": 700
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc khoai cắt khối đến chín, luộc trứng chín; để nguội an toàn rồi trộn cùng dưa leo, hành, sữa chua và chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc khoai cắt khối đến chín, luộc trứng chín; để nguội an toàn rồi trộn cùng dưa leo, hành, sữa chua và chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-069",
    "name": "Salad gà áp chảo Parmesan chanh",
    "category": "main",
    "protein": "chicken",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 550
      },
      {
        "id": "lettuce",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "wholeBread",
        "qty": 120
      },
      {
        "id": "parmesan",
        "qty": 50
      },
      {
        "id": "yogurt",
        "qty": 160
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 10
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo gà đạt 75°C rồi thái lát; nướng bánh mì hạt lựu giòn. Trộn xà lách, cà chua, gà với sốt sữa chua chanh tỏi, rắc Parmesan và bánh mì.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Áp chảo gà đạt 75°C rồi thái lát; nướng bánh mì hạt lựu giòn. Trộn xà lách, cà chua, gà với sốt sữa chua chanh tỏi, rắc Parmesan và bánh mì.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-070",
    "name": "Salad đậu trắng cá ngừ hành tây",
    "category": "main",
    "protein": "fish",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "whiteBean",
        "qty": 500
      },
      {
        "id": "tuna",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Âu",
    "tags": [
      "Món Âu",
      "Món Âu & Ý"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Tráng và để ráo đậu trắng, cá ngừ; thái hành mỏng, trộn cùng cà chua, húng quế, dầu và chanh ngay trước khi dùng.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Tráng và để ráo đậu trắng, cá ngừ; thái hành mỏng, trộn cùng cà chua, húng quế, dầu và chanh ngay trước khi dùng.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-071",
    "name": "Bowl quinoa gà bông cải chanh vàng",
    "category": "main",
    "protein": "chicken",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 260
      },
      {
        "id": "chicken",
        "qty": 500
      },
      {
        "id": "broccoli",
        "qty": 450
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "yogurt",
        "qty": 160
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Hấp bông cải và cà rốt; áp chảo gà đạt 75°C rồi thái lát. Pha sữa chua với chanh làm sốt, không thêm phô mai.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Hấp bông cải và cà rốt; áp chảo gà đạt 75°C rồi thái lát. Pha sữa chua với chanh làm sốt, không thêm phô mai.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-072",
    "name": "Bowl gạo lứt cá hồi măng tây",
    "category": "main",
    "protein": "fish",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 280
      },
      {
        "id": "salmon",
        "qty": 500
      },
      {
        "id": "asparagus",
        "qty": 400
      },
      {
        "id": "cucumber",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nướng cá hồi đến 63°C và hấp măng tây; dưa leo ăn sống dùng dao sạch. Rưới dầu và chanh vừa đủ lên các phần đã chia.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Nướng cá hồi đến 63°C và hấp măng tây; dưa leo ăn sống dùng dao sạch. Rưới dầu và chanh vừa đủ lên các phần đã chia.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-073",
    "name": "Bowl quinoa đậu gà bí đỏ",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 240
      },
      {
        "id": "chickpea",
        "qty": 450
      },
      {
        "id": "pumpkin",
        "qty": 450
      },
      {
        "id": "spinach",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nướng bí đỏ mềm 20–25 phút; hấp rau cải, làm nóng đậu gà chín. Xếp riêng từng phần, trộn chanh và dầu làm sốt.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Nướng bí đỏ mềm 20–25 phút; hấp rau cải, làm nóng đậu gà chín. Xếp riêng từng phần, trộn chanh và dầu làm sốt.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-074",
    "name": "Bowl gạo lứt đậu hũ rau củ",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 280
      },
      {
        "id": "tofu",
        "qty": 550
      },
      {
        "id": "broccoli",
        "qty": 350
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo đậu hũ, hấp bông cải và cà rốt; pha nước tương cùng chanh và ít nước làm sốt, không thêm đường.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Áp chảo đậu hũ, hấp bông cải và cà rốt; pha nước tương cùng chanh và ít nước làm sốt, không thêm đường.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-075",
    "name": "Bowl quinoa tôm bí ngòi",
    "category": "main",
    "protein": "shrimp",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 260
      },
      {
        "id": "shrimp",
        "qty": 500
      },
      {
        "id": "zucchini",
        "qty": 400
      },
      {
        "id": "bellPepper",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Bóc vỏ bỏ chỉ tôm rồi xào chín với tỏi; xào nhanh bí ngòi, ớt chuông. Chia quinoa đã chín, rưới chanh khi ăn.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Bóc vỏ bỏ chỉ tôm rồi xào chín với tỏi; xào nhanh bí ngòi, ớt chuông. Chia quinoa đã chín, rưới chanh khi ăn.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-076",
    "name": "Bowl gạo lứt bò đậu que",
    "category": "main",
    "protein": "beef",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 280
      },
      {
        "id": "beef",
        "qty": 450
      },
      {
        "id": "bean",
        "qty": 400
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "ginger",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Thái bò mỏng, xào chín với gừng; luộc đậu que và cà rốt rồi chia bát, dùng lượng nước tương đã cân làm sốt.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Thái bò mỏng, xào chín với gừng; luộc đậu que và cà rốt rồi chia bát, dùng lượng nước tương đã cân làm sốt.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-077",
    "name": "Bowl quinoa cá ngừ quả bơ",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 240
      },
      {
        "id": "tuna",
        "qty": 350
      },
      {
        "id": "avocado",
        "qty": 250
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Để quinoa chín nguội an toàn; trộn cá ngừ để ráo, quả bơ, dưa leo và cà chua. Pha chanh với dầu, không dùng sốt mayonnaise.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Để quinoa chín nguội an toàn; trộn cá ngừ để ráo, quả bơ, dưa leo và cà chua. Pha chanh với dầu, không dùng sốt mayonnaise.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-078",
    "name": "Bowl gạo lứt đậu đỏ bắp",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 260
      },
      {
        "id": "kidneyBean",
        "qty": 450
      },
      {
        "id": "corn",
        "qty": 250
      },
      {
        "id": "bellPepper",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Làm nóng đậu đỏ chín và bắp; áp chảo ớt chuông, cắt cà chua sống bằng thớt sạch. Chia cùng gạo lứt, rưới chanh.",
    "method": "bowl",
    "steps": [
      "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.",
      "Làm nóng đậu đỏ chín và bắp; áp chảo ớt chuông, cắt cà chua sống bằng thớt sạch. Chia cùng gạo lứt, rưới chanh.",
      "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-079",
    "name": "Salad quinoa đậu trắng rau củ",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "bellPepper",
        "qty": 200
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa theo bao bì rồi làm nguội nhanh; trộn đậu trắng để ráo cùng rau cắt nhỏ, dầu và chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Nấu quinoa theo bao bì rồi làm nguội nhanh; trộn đậu trắng để ráo cùng rau cắt nhỏ, dầu và chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-080",
    "name": "Salad đậu gà quả bơ chanh vàng",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 500
      },
      {
        "id": "avocado",
        "qty": 250
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lettuce",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Cắt quả bơ và cà chua, xé xà lách; trộn với đậu gà đã để ráo, nước chanh và dầu ngay trước khi ăn.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Cắt quả bơ và cà chua, xé xà lách; trộn với đậu gà đã để ráo, nước chanh và dầu ngay trước khi ăn.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-081",
    "name": "Salad cá hồi hấp dưa leo",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "salmon",
        "qty": 500
      },
      {
        "id": "cucumber",
        "qty": 450
      },
      {
        "id": "lettuce",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "yogurt",
        "qty": 180
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Hấp cá hồi đến 63°C, tách miếng bằng dụng cụ sạch; trộn rau với sốt sữa chua chanh, đặt cá lên trên.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Hấp cá hồi đến 63°C, tách miếng bằng dụng cụ sạch; trộn rau với sốt sữa chua chanh, đặt cá lên trên.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-082",
    "name": "Salad gà đậu trắng rau cải chín",
    "category": "main",
    "protein": "chicken",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 500
      },
      {
        "id": "whiteBean",
        "qty": 400
      },
      {
        "id": "spinach",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc hoặc hấp gà đạt 75°C rồi xé; chần rau cải và làm nguội nhanh, trộn với đậu trắng chín, cà chua và nước chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc hoặc hấp gà đạt 75°C rồi xé; chần rau cải và làm nguội nhanh, trộn với đậu trắng chín, cà chua và nước chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-083",
    "name": "Salad tôm quinoa ớt chuông",
    "category": "main",
    "protein": "shrimp",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "shrimp",
        "qty": 500
      },
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc tôm đã sơ chế đến chín đục; nấu quinoa theo bao bì rồi để nguội an toàn. Trộn cùng rau, húng quế, dầu và chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc tôm đã sơ chế đến chín đục; nấu quinoa theo bao bì rồi để nguội an toàn. Trộn cùng rau, húng quế, dầu và chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-084",
    "name": "Salad đậu lăng cà chua feta",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 220
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "feta",
        "qty": 100
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "basil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc đậu lăng 20–25 phút đến mềm, để ráo và làm nguội; trộn rau, feta, húng quế với dầu và chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Luộc đậu lăng 20–25 phút đến mềm, để ráo và làm nguội; trộn rau, feta, húng quế với dầu và chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-085",
    "name": "Salad bông cải trứng sữa chua",
    "category": "main",
    "protein": "egg",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "broccoli",
        "qty": 600
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Hấp bông cải chín vừa, luộc trứng chín hoàn toàn; làm nguội an toàn rồi trộn với dưa leo và sốt sữa chua chanh.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Hấp bông cải chín vừa, luộc trứng chín hoàn toàn; làm nguội an toàn rồi trộn với dưa leo và sốt sữa chua chanh.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-086",
    "name": "Salad đậu đỏ bắp quả bơ",
    "category": "main",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "kidneyBean",
        "qty": 450
      },
      {
        "id": "corn",
        "qty": 250
      },
      {
        "id": "avocado",
        "qty": 250
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nấu bắp chín rồi để nguội, trộn cùng đậu đỏ chín, quả bơ và cà chua; dùng dầu và nước chanh làm sốt.",
    "method": "salad",
    "steps": [
      "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.",
      "Nấu bắp chín rồi để nguội, trộn cùng đậu đỏ chín, quả bơ và cà chua; dùng dầu và nước chanh làm sốt.",
      "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-087",
    "name": "Cá trắng nướng giấy bí ngòi chanh",
    "category": "main",
    "protein": "fish",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "fish",
        "qty": 600
      },
      {
        "id": "zucchini",
        "qty": 450
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Cà rốt thái lát mỏng chần sơ; đặt cá và rau vào giấy nướng, thêm dầu, oregano và chanh, gấp kín mép rồi nướng cá đến 63°C.",
    "method": "fishBake",
    "steps": [
      "Làm nóng lò 190°C. Kiểm tra xương, thấm khô cá; cắt rau thành miếng vừa ăn.",
      "Cà rốt thái lát mỏng chần sơ; đặt cá và rau vào giấy nướng, thêm dầu, oregano và chanh, gấp kín mép rồi nướng cá đến 63°C.",
      "Nướng cá và rau 15–20 phút tùy độ dày; cá cần đạt 63°C ở phần dày nhất. Củ lâu chín cần luộc sơ hoặc nướng trước khi cho cá vào.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-088",
    "name": "Cá hồi nướng bông cải cà chua",
    "category": "main",
    "protein": "fish",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "salmon",
        "qty": 600
      },
      {
        "id": "broccoli",
        "qty": 500
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Chần bông cải 2 phút; xếp cá hồi, bông cải và cà chua lên khay, rưới tỏi dầu và chanh, nướng cá đạt 63°C.",
    "method": "fishBake",
    "steps": [
      "Làm nóng lò 190°C. Kiểm tra xương, thấm khô cá; cắt rau thành miếng vừa ăn.",
      "Chần bông cải 2 phút; xếp cá hồi, bông cải và cà chua lên khay, rưới tỏi dầu và chanh, nướng cá đạt 63°C.",
      "Nướng cá và rau 15–20 phút tùy độ dày; cá cần đạt 63°C ở phần dày nhất. Củ lâu chín cần luộc sơ hoặc nướng trước khi cho cá vào.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-089",
    "name": "Gà nướng sữa chua bí ngòi",
    "category": "main",
    "protein": "chicken",
    "time": 65,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 650
      },
      {
        "id": "yogurt",
        "qty": 180
      },
      {
        "id": "zucchini",
        "qty": 500
      },
      {
        "id": "bellPepper",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Ướp gà với sữa chua, chanh và oregano 20 phút trong ngăn mát; nướng gà trước, thêm rau sau 15 phút và kiểm tra gà đạt 75°C. Thời gian món đã gồm ướp.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Ướp gà với sữa chua, chanh và oregano 20 phút trong ngăn mát; nướng gà trước, thêm rau sau 15 phút và kiểm tra gà đạt 75°C. Thời gian món đã gồm ướp.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-090",
    "name": "Đậu hũ nướng nấm ớt chuông",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 650
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Thấm khô đậu, trộn với nấm, ớt chuông, tỏi và nước tương; trải một lớp trên khay, nướng 25–30 phút cho nóng chín và xém nhẹ.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Thấm khô đậu, trộn với nấm, ớt chuông, tỏi và nước tương; trải một lớp trên khay, nướng 25–30 phút cho nóng chín và xém nhẹ.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-091",
    "name": "Gà nướng khay bí đỏ đậu que",
    "category": "main",
    "protein": "chicken",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 650
      },
      {
        "id": "pumpkin",
        "qty": 450
      },
      {
        "id": "bean",
        "qty": 350
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Cắt bí đỏ 2 cm và nướng với gà trước; thêm đậu que ở 12 phút cuối, kiểm tra gà đạt 75°C và bí đã mềm.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Cắt bí đỏ 2 cm và nướng với gà trước; thêm đậu que ở 12 phút cuối, kiểm tra gà đạt 75°C và bí đã mềm.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-092",
    "name": "Tôm nướng chanh măng tây cà chua",
    "category": "main",
    "protein": "shrimp",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "shrimp",
        "qty": 650
      },
      {
        "id": "asparagus",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Sơ chế tôm, cắt măng tây, trộn với tỏi dầu và chanh; nướng rau trước 10 phút, cho tôm vào nướng tiếp 7–10 phút đến chín đục.",
    "method": "roast",
    "steps": [
      "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.",
      "Sơ chế tôm, cắt măng tây, trộn với tỏi dầu và chanh; nướng rau trước 10 phút, cho tôm vào nướng tiếp 7–10 phút đến chín đục.",
      "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-093",
    "name": "Súp đậu lăng bí đỏ rau cải",
    "category": "soup",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "pumpkin",
        "qty": 450
      },
      {
        "id": "spinach",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1500
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, thêm đậu lăng khô, bí đỏ và nước dùng; nấu 25–30 phút cho mềm, cho rau cải vào 5 phút cuối.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành, thêm đậu lăng khô, bí đỏ và nước dùng; nấu 25–30 phút cho mềm, cho rau cải vào 5 phút cuối.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-094",
    "name": "Súp đậu trắng bí ngòi cà chua",
    "category": "soup",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "whiteBean",
        "qty": 500
      },
      {
        "id": "zucchini",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành rồi thêm cà chua, bí ngòi và nước dùng; nấu rau mềm, thêm đậu trắng chín và oregano đun nóng kỹ.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào hành rồi thêm cà chua, bí ngòi và nước dùng; nấu rau mềm, thêm đậu trắng chín và oregano đun nóng kỹ.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-095",
    "name": "Súp gà quinoa rau củ",
    "category": "soup",
    "protein": "chicken",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chicken",
        "qty": 450
      },
      {
        "id": "quinoa",
        "qty": 160
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "zucchini",
        "qty": 300
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "broth",
        "qty": 1600
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Rửa quinoa rồi cho vào nồi nước dùng với gà, hành và cà rốt; nấu 20 phút, cho bí ngòi vào cuối và kiểm tra gà đạt 75°C.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Rửa quinoa rồi cho vào nồi nước dùng với gà, hành và cà rốt; nấu 20 phút, cho bí ngòi vào cuối và kiểm tra gà đạt 75°C.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-096",
    "name": "Súp đậu gà bông cải cà chua",
    "category": "soup",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 500
      },
      {
        "id": "broccoli",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 500
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "vegBroth",
        "qty": 1300
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào tỏi và cà chua, thêm nước dùng cùng đậu gà chín; nấu 10 phút rồi cho bông cải vào nấu chín vừa.",
    "method": "soup",
    "steps": [
      "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.",
      "Xào tỏi và cà chua, thêm nước dùng cùng đậu gà chín; nấu 10 phút rồi cho bông cải vào nấu chín vừa.",
      "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-097",
    "name": "Yến mạch mặn nấm trứng",
    "category": "main",
    "protein": "egg",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "oats",
        "qty": 220
      },
      {
        "id": "milk",
        "qty": 600
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "mushroom",
        "qty": 300
      },
      {
        "id": "scallion",
        "qty": 25
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu nấm trong ít nước đến chín, luộc trứng chín rồi cắt đôi. Cho nấm vào cháo yến mạch, đặt trứng và hành lá lên khi chia phần.",
    "method": "oatmeal",
    "steps": [
      "Cho yến mạch và lượng sữa trong công thức vào nồi, thêm nước vừa đủ để yến mạch ngập và có thể khuấy.",
      "Nấu nấm trong ít nước đến chín, luộc trứng chín rồi cắt đôi. Cho nấm vào cháo yến mạch, đặt trứng và hành lá lên khi chia phần.",
      "Nấu nhỏ lửa 5–8 phút đến khi yến mạch mềm; khuấy đều và thêm nước nếu đặc. Chia bốn phần và thêm topping đã chuẩn bị.",
      "Trứng cần chín hoàn toàn; chia đúng bốn suất. Không thêm muối, tiêu hoặc đường ngoài công thức."
    ]
  },
  {
    "id": "west-v4-098",
    "name": "Yến mạch qua đêm sữa chua quả bơ",
    "category": "main",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "oats",
        "qty": 200
      },
      {
        "id": "milk",
        "qty": 500
      },
      {
        "id": "yogurt",
        "qty": 400
      },
      {
        "id": "avocado",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Yến mạch được ngâm cùng sữa và sữa chua; quả bơ chỉ cắt lúc ăn, trộn ít nước chanh rồi đặt lên các hộp đã ngâm lạnh.",
    "method": "overnight",
    "steps": [
      "Trộn yến mạch với sữa và sữa chua trong công thức; chia vào bốn hộp sạch có nắp.",
      "Yến mạch được ngâm cùng sữa và sữa chua; quả bơ chỉ cắt lúc ăn, trộn ít nước chanh rồi đặt lên các hộp đã ngâm lạnh.",
      "Đậy kín và để ngăn mát qua đêm (ít nhất 6 giờ ở ≤4°C). Thời gian công thức là thời gian thao tác, chưa gồm thời gian chờ lạnh.",
      "Không thêm đường ngoài công thức. Chia đúng bốn suất; đây là gợi ý ăn uống thông thường, không phải thực đơn điều trị hoặc khẩu phần giảm cân cá nhân."
    ]
  },
  {
    "id": "west-v4-099",
    "name": "Toast đậu trắng quả bơ cà chua",
    "category": "main",
    "protein": "plant",
    "time": 15,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "wholeBread",
        "qty": 360
      },
      {
        "id": "whiteBean",
        "qty": 350
      },
      {
        "id": "avocado",
        "qty": 250
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nghiền đậu trắng chín cùng quả bơ và chanh; phết lên bánh mì nguyên cám rồi xếp cà chua thái lát.",
    "method": "toast",
    "steps": [
      "Cắt bánh mì nguyên cám thành lát và nướng/áp chảo khô đến giòn nhẹ. Sơ chế phần rau và đạm riêng.",
      "Nghiền đậu trắng chín cùng quả bơ và chanh; phết lên bánh mì nguyên cám rồi xếp cà chua thái lát.",
      "Chia nhân lên bánh mì ngay trước khi dùng. Trứng, thịt và cá sống phải được nấu chín trước khi đặt lên bánh.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  },
  {
    "id": "west-v4-100",
    "name": "Pancake yến mạch bí đỏ sữa chua",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "oats",
        "qty": 220
      },
      {
        "id": "flour",
        "qty": 80
      },
      {
        "id": "pumpkin",
        "qty": 300
      },
      {
        "id": "egg",
        "qty": 2
      },
      {
        "id": "milk",
        "qty": 350
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "salt",
        "qty": 3
      },
      {
        "id": "pepper",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.",
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 4,
    "collection": "Healthy",
    "tags": [
      "Healthy · Thanh đạm",
      "Rau, đạm & ngũ cốc"
    ],
    "purposes": [
      "breakfast"
    ],
    "stapleIncluded": true,
    "artBrief": "Hấp bí đỏ chín rồi nghiền mịn; xay yến mạch thành bột, trộn vào bột bánh cùng bí đỏ. Dùng sữa chua không đường làm sốt.",
    "method": "pancake",
    "steps": [
      "Trộn bột mì và/hoặc yến mạch với trứng, sữa trong công thức; nghỉ bột 10 phút cho hút nước, không thêm đường ngoài danh sách.",
      "Hấp bí đỏ chín rồi nghiền mịn; xay yến mạch thành bột, trộn vào bột bánh cùng bí đỏ. Dùng sữa chua không đường làm sốt.",
      "Múc bột thành bánh nhỏ, áp chảo chống dính với lượng dầu đã cân ở lửa vừa nhỏ 2–3 phút mỗi mặt; giữa bánh phải chín.",
      "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất."
    ]
  }
];
RECIPES.push(...WESTERN_HEALTHY_RECIPES);

// 40 vegetarian dishes, 35 seed/grain salads and 25 dressings.
const PLANT_RECIPES=[
  {
    "id": "plant-v5-001",
    "name": "Đậu hũ sốt mè tahini chanh vàng",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 650
      },
      {
        "id": "tahini",
        "qty": 60
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "broccoli",
        "qty": 400
      },
      {
        "id": "soy",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Áp chảo đậu hũ; hấp bông cải. Pha tahini, chanh, tỏi, nước tương với ít nước thành sốt sánh, rưới khi chia phần.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Áp chảo đậu hũ; hấp bông cải. Pha tahini, chanh, tỏi, nước tương với ít nước thành sốt sánh, rưới khi chia phần.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-002",
    "name": "Đậu hũ nướng mù tạt rau củ",
    "category": "main",
    "protein": "plant",
    "time": 45,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 650
      },
      {
        "id": "mustard",
        "qty": 35
      },
      {
        "id": "potato",
        "qty": 400
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Luộc sơ khoai và cà rốt 6 phút, trộn đậu hũ cùng mù tạt và chanh rồi nướng với củ.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc sơ khoai và cà rốt 6 phút, trộn đậu hũ cùng mù tạt và chanh rồi nướng với củ.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "đậu nành",
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-003",
    "name": "Đậu hũ xào bắp cải đậu phộng",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 600
      },
      {
        "id": "cabbage",
        "qty": 450
      },
      {
        "id": "carrot",
        "qty": 150
      },
      {
        "id": "peanut",
        "qty": 60
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Áp chảo đậu hũ; xào bắp cải cà rốt với tỏi và nước tương, cho đậu trở lại, rắc đậu phộng giã sau cùng.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Áp chảo đậu hũ; xào bắp cải cà rốt với tỏi và nước tương, cho đậu trở lại, rắc đậu phộng giã sau cùng.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-004",
    "name": "Đậu hũ kho nấm tiêu nhẹ",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 650
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "soy",
        "qty": 25
      },
      {
        "id": "pepper",
        "qty": 2
      },
      {
        "id": "ginger",
        "qty": 20
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Áp chảo đậu hũ, nấu cùng nấm, gừng, nước tương và tiêu đen đã cân; thêm nước rồi rim nhỏ lửa 12 phút.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Áp chảo đậu hũ, nấu cùng nấm, gừng, nước tương và tiêu đen đã cân; thêm nước rồi rim nhỏ lửa 12 phút.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-005",
    "name": "Đậu gà hầm cà chua gừng",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 600
      },
      {
        "id": "tomato",
        "qty": 600
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "ginger",
        "qty": 25
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "vegBroth",
        "qty": 700
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Xào hành tỏi gừng, nấu cà chua mềm rồi thêm đậu gà chín và nước dùng rau củ; hầm nhẹ 20 phút.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành tỏi gừng, nấu cà chua mềm rồi thêm đậu gà chín và nước dùng rau củ; hầm nhẹ 20 phút.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-006",
    "name": "Đậu trắng sốt rau cải tahini",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "whiteBean",
        "qty": 600
      },
      {
        "id": "spinach",
        "qty": 450
      },
      {
        "id": "tahini",
        "qty": 50
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Xào tỏi và rau cải đến chín, cho đậu trắng chín vào làm nóng; pha tahini chanh với nước rồi đảo nhẹ lúc tắt bếp.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào tỏi và rau cải đến chín, cho đậu trắng chín vào làm nóng; pha tahini chanh với nước rồi đảo nhẹ lúc tắt bếp.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-007",
    "name": "Đậu đỏ hầm bí đỏ cà chua",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "kidneyBean",
        "qty": 600
      },
      {
        "id": "pumpkin",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 900
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Xào hành và bí đỏ, nấu với cà chua, oregano và nước dùng rau củ; cho đậu đỏ chín vào sau khi bí mềm.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành và bí đỏ, nấu với cà chua, oregano và nước dùng rau củ; cho đậu đỏ chín vào sau khi bí mềm.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-008",
    "name": "Đậu lăng hầm nấm óc chó",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "walnut",
        "qty": 60
      },
      {
        "id": "tomato",
        "qty": 450
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Xào hành, nấm và cà chua; thêm đậu lăng khô cùng nước dùng, nấu mềm rồi rắc óc chó băm.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, nấm và cà chua; thêm đậu lăng khô cùng nước dùng, nấu mềm rồi rắc óc chó băm.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-009",
    "name": "Cà tím nhồi đậu gà quinoa",
    "category": "main",
    "protein": "plant",
    "time": 60,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "eggplant",
        "qty": 700
      },
      {
        "id": "chickpea",
        "qty": 400
      },
      {
        "id": "quinoa",
        "qty": 180
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Làm nóng lò 190°C. Cắt rau dùng để nhồi và chuẩn bị phần nhân; đậu phải chín trước khi nhồi.",
      "Nấu quinoa riêng; bổ đôi cà tím, lấy bớt ruột băm và xào với hành, cà chua, oregano; trộn cùng quinoa chín và đậu gà để nhồi.",
      "Nhồi nhân vào phần rau đã chuẩn bị, thêm nước lọc mỏng đáy khay rồi đậy giấy bạc nướng 25 phút; mở giấy nướng thêm 10 phút đến khi rau mềm.",
      "Chia bốn suất; làm nguội nhanh và giữ lạnh phần dư ở ≤4°C. Không tự thêm thịt hoặc phô mai vào nhân."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa riêng; bổ đôi cà tím, lấy bớt ruột băm và xào với hành, cà chua, oregano; trộn cùng quinoa chín và đậu gà để nhồi.",
    "method": "stuffed",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-010",
    "name": "Ớt chuông nhồi gạo lứt đậu đỏ",
    "category": "main",
    "protein": "plant",
    "time": 70,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bellPepper",
        "qty": 700
      },
      {
        "id": "brownRice",
        "qty": 220
      },
      {
        "id": "kidneyBean",
        "qty": 400
      },
      {
        "id": "corn",
        "qty": 200
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Làm nóng lò 190°C. Cắt rau dùng để nhồi và chuẩn bị phần nhân; đậu phải chín trước khi nhồi.",
      "Nấu gạo lứt trước; cắt đôi bỏ hạt ớt chuông, xào hành và cà chua rồi trộn với cơm, đậu đỏ và bắp làm nhân.",
      "Nhồi nhân vào phần rau đã chuẩn bị, thêm nước lọc mỏng đáy khay rồi đậy giấy bạc nướng 25 phút; mở giấy nướng thêm 10 phút đến khi rau mềm.",
      "Chia bốn suất; làm nguội nhanh và giữ lạnh phần dư ở ≤4°C. Không tự thêm thịt hoặc phô mai vào nhân."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt trước; cắt đôi bỏ hạt ớt chuông, xào hành và cà chua rồi trộn với cơm, đậu đỏ và bắp làm nhân.",
    "method": "stuffed",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-011",
    "name": "Bí ngòi nhồi đậu trắng nấm",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "zucchini",
        "qty": 800
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "mushroom",
        "qty": 300
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Làm nóng lò 190°C. Cắt rau dùng để nhồi và chuẩn bị phần nhân; đậu phải chín trước khi nhồi.",
      "Bổ đôi bí ngòi, lấy ruột băm; xào với nấm tỏi và cà chua, trộn đậu trắng nghiền thô làm nhân.",
      "Nhồi nhân vào phần rau đã chuẩn bị, thêm nước lọc mỏng đáy khay rồi đậy giấy bạc nướng 25 phút; mở giấy nướng thêm 10 phút đến khi rau mềm.",
      "Chia bốn suất; làm nguội nhanh và giữ lạnh phần dư ở ≤4°C. Không tự thêm thịt hoặc phô mai vào nhân."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Bổ đôi bí ngòi, lấy ruột băm; xào với nấm tỏi và cà chua, trộn đậu trắng nghiền thô làm nhân.",
    "method": "stuffed",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-012",
    "name": "Nấm xào óc chó rau cải",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "mushroom",
        "qty": 500
      },
      {
        "id": "spinach",
        "qty": 450
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Xào nấm và tỏi đến bay nước, cho rau cải vào nấu chín; thêm nước tương rồi rắc óc chó bẻ nhỏ sau cùng.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào nấm và tỏi đến bay nước, cho rau cải vào nấu chín; thêm nước tương rồi rắc óc chó bẻ nhỏ sau cùng.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-013",
    "name": "Bông cải nướng tahini hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "broccoli",
        "qty": 800
      },
      {
        "id": "tahini",
        "qty": 70
      },
      {
        "id": "pumpkinSeed",
        "qty": 50
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Cắt bông cải thành nhánh, trộn tỏi dầu rồi nướng; pha tahini chanh với nước làm sốt, rắc hạt bí sau khi nướng.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Cắt bông cải thành nhánh, trộn tỏi dầu rồi nướng; pha tahini chanh với nước làm sốt, rắc hạt bí sau khi nướng.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-014",
    "name": "Bí đỏ nướng hạnh nhân oregano",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pumpkin",
        "qty": 900
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "oregano",
        "qty": 2
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Nướng bí đỏ cắt khối với oregano và dầu; hạnh nhân thái hoặc giã thô, thêm ở 5 phút cuối rồi vắt chanh.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng bí đỏ cắt khối với oregano và dầu; hạnh nhân thái hoặc giã thô, thêm ở 5 phút cuối rồi vắt chanh.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-015",
    "name": "Cà tím sốt miso mè",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "eggplant",
        "qty": 800
      },
      {
        "id": "miso",
        "qty": 40
      },
      {
        "id": "sesame",
        "qty": 30
      },
      {
        "id": "ginger",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Chọn miso nguyên chất không có dashi/cá. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Nướng cà tím bổ đôi 20 phút. Pha miso gừng với nước và chút chanh, phết lên nướng thêm 8 phút, rắc mè.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng cà tím bổ đôi 20 phút. Pha miso gừng với nước và chút chanh, phết lên nướng thêm 8 phút, rắc mè.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-016",
    "name": "Bắp cải áp chảo sốt đậu phộng",
    "category": "veg",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "cabbage",
        "qty": 800
      },
      {
        "id": "peanut",
        "qty": 80
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Cắt bắp cải miếng dày, áp chảo hai mặt và đậy nắp với ít nước đến mềm; xay đậu phộng với chanh, tỏi và nước tương làm sốt.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Cắt bắp cải miếng dày, áp chảo hai mặt và đậy nắp với ít nước đến mềm; xay đậu phộng với chanh, tỏi và nước tương làm sốt.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-017",
    "name": "Chả đậu lăng hạt hướng dương",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "sunflowerSeed",
        "qty": 70
      },
      {
        "id": "oats",
        "qty": 100
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đậu phải được nấu chín và để ráo trước khi nghiền; băm rau nhỏ, vắt bớt nước ở rau bào.",
      "Luộc đậu lăng mềm rồi để ráo; nghiền với yến mạch, cà rốt bào, hành băm và hạt hướng dương giã thô. Không dùng trứng.",
      "Nghỉ hỗn hợp 10 phút cho yến mạch/bột hút ẩm; chia tám miếng dẹt, áp chảo chống dính với lượng dầu đã cân 4–5 phút mỗi mặt đến khi nóng chín ở giữa.",
      "Chia bốn suất, chỉ dùng phần sốt và rau ăn kèm được ghi trong danh sách. Không dùng trứng làm chất kết dính nếu công thức không có trứng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc đậu lăng mềm rồi để ráo; nghiền với yến mạch, cà rốt bào, hành băm và hạt hướng dương giã thô. Không dùng trứng.",
    "method": "patties",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-018",
    "name": "Chả đậu đỏ hạt bí",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "kidneyBean",
        "qty": 600
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "oats",
        "qty": 100
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đậu phải được nấu chín và để ráo trước khi nghiền; băm rau nhỏ, vắt bớt nước ở rau bào.",
      "Nghiền đậu đỏ chín với yến mạch, hành, tỏi và hạt bí giã; hỗn hợp phải đủ dẻo trước khi tạo miếng.",
      "Nghỉ hỗn hợp 10 phút cho yến mạch/bột hút ẩm; chia tám miếng dẹt, áp chảo chống dính với lượng dầu đã cân 4–5 phút mỗi mặt đến khi nóng chín ở giữa.",
      "Chia bốn suất, chỉ dùng phần sốt và rau ăn kèm được ghi trong danh sách. Không dùng trứng làm chất kết dính nếu công thức không có trứng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nghiền đậu đỏ chín với yến mạch, hành, tỏi và hạt bí giã; hỗn hợp phải đủ dẻo trước khi tạo miếng.",
    "method": "patties",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-019",
    "name": "Chả đậu hũ mè cà rốt",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tofu",
        "qty": 650
      },
      {
        "id": "sesame",
        "qty": 40
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "oats",
        "qty": 100
      },
      {
        "id": "scallion",
        "qty": 30
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đậu phải được nấu chín và để ráo trước khi nghiền; băm rau nhỏ, vắt bớt nước ở rau bào.",
      "Vắt đậu hũ bớt nước rồi bóp nhuyễn; trộn cà rốt bào, yến mạch, mè và hành lá thành hỗn hợp dẻo.",
      "Nghỉ hỗn hợp 10 phút cho yến mạch/bột hút ẩm; chia tám miếng dẹt, áp chảo chống dính với lượng dầu đã cân 4–5 phút mỗi mặt đến khi nóng chín ở giữa.",
      "Chia bốn suất, chỉ dùng phần sốt và rau ăn kèm được ghi trong danh sách. Không dùng trứng làm chất kết dính nếu công thức không có trứng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Vắt đậu hũ bớt nước rồi bóp nhuyễn; trộn cà rốt bào, yến mạch, mè và hành lá thành hỗn hợp dẻo.",
    "method": "patties",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-020",
    "name": "Chả đậu trắng óc chó nấm",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "whiteBean",
        "qty": 600
      },
      {
        "id": "walnut",
        "qty": 60
      },
      {
        "id": "mushroom",
        "qty": 300
      },
      {
        "id": "oats",
        "qty": 100
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đậu phải được nấu chín và để ráo trước khi nghiền; băm rau nhỏ, vắt bớt nước ở rau bào.",
      "Xào nấm băm đến ráo, để nguội rồi trộn đậu trắng nghiền, yến mạch, tỏi và óc chó giã; không thêm trứng.",
      "Nghỉ hỗn hợp 10 phút cho yến mạch/bột hút ẩm; chia tám miếng dẹt, áp chảo chống dính với lượng dầu đã cân 4–5 phút mỗi mặt đến khi nóng chín ở giữa.",
      "Chia bốn suất, chỉ dùng phần sốt và rau ăn kèm được ghi trong danh sách. Không dùng trứng làm chất kết dính nếu công thức không có trứng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào nấm băm đến ráo, để nguội rồi trộn đậu trắng nghiền, yến mạch, tỏi và óc chó giã; không thêm trứng.",
    "method": "patties",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-021",
    "name": "Couscous đậu gà hạt bí rau củ",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 260
      },
      {
        "id": "chickpea",
        "qty": 450
      },
      {
        "id": "pumpkinSeed",
        "qty": 50
      },
      {
        "id": "zucchini",
        "qty": 350
      },
      {
        "id": "bellPepper",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Ngâm couscous bằng nước nóng theo bao bì rồi xới tơi; áp chảo bí ngòi và ớt chuông, làm nóng đậu gà, rắc hạt bí và chanh.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Ngâm couscous bằng nước nóng theo bao bì rồi xới tơi; áp chảo bí ngòi và ớt chuông, làm nóng đậu gà, rắc hạt bí và chanh.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-022",
    "name": "Bulgur đậu trắng nấm húng quế",
    "category": "main",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 260
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Nấu bulgur bằng nước; xào nấm tỏi đến chín, thêm đậu trắng làm nóng rồi trộn húng quế với hạt đã chín.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur bằng nước; xào nấm tỏi đến chín, thêm đậu trắng làm nóng rồi trộn húng quế với hạt đã chín.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-023",
    "name": "Quinoa đậu lăng rau củ nướng",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 240
      },
      {
        "id": "lentil",
        "qty": 180
      },
      {
        "id": "pumpkin",
        "qty": 350
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "zucchini",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Luộc đậu lăng riêng đến mềm, nướng bí đỏ và cà rốt trước rồi thêm bí ngòi; xếp cùng quinoa chín, rưới chanh.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc đậu lăng riêng đến mềm, nướng bí đỏ và cà rốt trước rồi thêm bí ngòi; xếp cùng quinoa chín, rưới chanh.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-024",
    "name": "Gạo lứt đậu gà sốt mè chanh",
    "category": "main",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 260
      },
      {
        "id": "chickpea",
        "qty": 500
      },
      {
        "id": "tahini",
        "qty": 60
      },
      {
        "id": "broccoli",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Nấu gạo lứt, hấp bông cải và làm nóng đậu gà; pha tahini chanh với nước rồi rưới lên phần cơm và rau đã chia.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt, hấp bông cải và làm nóng đậu gà; pha tahini chanh với nước rồi rưới lên phần cơm và rau đã chia.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-025",
    "name": "Penne sốt óc chó nấm thuần chay",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 360
      },
      {
        "id": "mushroom",
        "qty": 450
      },
      {
        "id": "walnut",
        "qty": 80
      },
      {
        "id": "garlic",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Luộc penne theo bao bì; xay óc chó, tỏi, chanh và ít nước mì thành sốt, trộn cùng nấm đã xào chín. Không dùng kem hoặc phô mai.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc penne theo bao bì; xay óc chó, tỏi, chanh và ít nước mì thành sốt, trộn cùng nấm đã xào chín. Không dùng kem hoặc phô mai.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-026",
    "name": "Spaghetti bí ngòi hạnh nhân húng quế",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "spaghetti",
        "qty": 360
      },
      {
        "id": "zucchini",
        "qty": 500
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "basil",
        "qty": 30
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Luộc spaghetti; xào bí ngòi với tỏi, giã hạnh nhân và húng quế với dầu cùng nước mì làm sốt rồi trộn đều.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc spaghetti; xào bí ngòi với tỏi, giã hạnh nhân và húng quế với dầu cùng nước mì làm sốt rồi trộn đều.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-027",
    "name": "Mì udon đậu hũ mè nấm",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "udon",
        "qty": 700
      },
      {
        "id": "tofu",
        "qty": 550
      },
      {
        "id": "mushroom",
        "qty": 350
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "soy",
        "qty": 25
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Nấu udon theo bao bì rồi để ráo; xào nấm và đậu hũ áp chảo, trộn mì với nước tương, mè và hành lá, không chan nước dùng thịt.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu udon theo bao bì rồi để ráo; xào nấm và đậu hũ áp chảo, trộn mì với nước tương, mè và hành lá, không chan nước dùng thịt.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-028",
    "name": "Cuốn xà lách bún đậu hũ đậu phộng",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "noodle",
        "qty": 500
      },
      {
        "id": "tofu",
        "qty": 550
      },
      {
        "id": "lettuce",
        "qty": 350
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "peanut",
        "qty": 70
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Trụng bún, áp chảo đậu hũ; đặt bún, đậu và dưa leo vào lá xà lách để cuốn. Giã đậu phộng với chanh, nước tương và nước làm sốt.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Trụng bún, áp chảo đậu hũ; đặt bún, đậu và dưa leo vào lá xà lách để cuốn. Giã đậu phộng với chanh, nước tương và nước làm sốt.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-029",
    "name": "Canh bí đỏ đậu lăng mè",
    "category": "soup",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pumpkin",
        "qty": 600
      },
      {
        "id": "lentil",
        "qty": 200
      },
      {
        "id": "sesame",
        "qty": 25
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "vegBroth",
        "qty": 1500
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Xào hành rồi thêm bí đỏ, đậu lăng khô và nước dùng rau củ; nấu mềm, rắc mè khi chia bát.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành rồi thêm bí đỏ, đậu lăng khô và nước dùng rau củ; nấu mềm, rắc mè khi chia bát.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-030",
    "name": "Súp bông cải đậu trắng hạt bí",
    "category": "soup",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "broccoli",
        "qty": 650
      },
      {
        "id": "whiteBean",
        "qty": 500
      },
      {
        "id": "pumpkinSeed",
        "qty": 50
      },
      {
        "id": "onion",
        "qty": 120
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Xào hành, nấu bông cải với nước dùng đến mềm; thêm đậu trắng chín, xay mịn một phần, rắc hạt bí lúc ăn.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegan",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, nấu bông cải với nước dùng đến mềm; thêm đậu trắng chín, xay mịn một phần, rắc hạt bí lúc ăn.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-031",
    "name": "Trứng hấp đậu hũ nấm mè",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 6
      },
      {
        "id": "tofu",
        "qty": 400
      },
      {
        "id": "mushroom",
        "qty": 300
      },
      {
        "id": "sesame",
        "qty": 25
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "soy",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; cắt rau và thấm khô đậu hũ trước khi nấu.",
      "Đánh trứng với 150 ml nước lọc và nước tương; trộn đậu hũ, nấm đã xào ráo, hấp trong bát chịu nhiệt; rắc mè và hành khi chín.",
      "Nấu lửa vừa nhỏ và đậy nắp hoặc hấp đến khi phần giữa trứng chín hẳn, không còn lỏng; kiểm tra món nóng chín đều.",
      "Chia bốn phần; đây là món chay có trứng, không gắn nhãn thuần chay. Dùng nóng, không giữ trứng ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Đánh trứng với 150 ml nước lọc và nước tương; trộn đậu hũ, nấm đã xào ráo, hấp trong bát chịu nhiệt; rắc mè và hành khi chín.",
    "method": "eggs",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten",
      "trứng",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-032",
    "name": "Trứng cuộn rau cải hạt hướng dương",
    "category": "main",
    "protein": "egg",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "spinach",
        "qty": 400
      },
      {
        "id": "sunflowerSeed",
        "qty": 45
      },
      {
        "id": "onion",
        "qty": 100
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; cắt rau và thấm khô đậu hũ trước khi nấu.",
      "Xào rau cải và hành thật ráo; đổ trứng đánh vào chảo thành lớp mỏng, cuộn cùng rau đã nấu và hạt hướng dương, nấu chín giữa.",
      "Nấu lửa vừa nhỏ và đậy nắp hoặc hấp đến khi phần giữa trứng chín hẳn, không còn lỏng; kiểm tra món nóng chín đều.",
      "Chia bốn phần; đây là món chay có trứng, không gắn nhãn thuần chay. Dùng nóng, không giữ trứng ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào rau cải và hành thật ráo; đổ trứng đánh vào chảo thành lớp mỏng, cuộn cùng rau đã nấu và hạt hướng dương, nấu chín giữa.",
    "method": "eggs",
    "pairingNotes": "",
    "allergenNotes": [
      "trứng"
    ]
  },
  {
    "id": "plant-v5-033",
    "name": "Omelette ớt chuông mè rang",
    "category": "main",
    "protein": "egg",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "bellPepper",
        "qty": 400
      },
      {
        "id": "sesame",
        "qty": 30
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; cắt rau và thấm khô đậu hũ trước khi nấu.",
      "Xào ớt chuông mềm, trộn trứng với mè rang và hành lá, đổ vào chảo, gập trứng và nấu chín hoàn toàn.",
      "Nấu lửa vừa nhỏ và đậy nắp hoặc hấp đến khi phần giữa trứng chín hẳn, không còn lỏng; kiểm tra món nóng chín đều.",
      "Chia bốn phần; đây là món chay có trứng, không gắn nhãn thuần chay. Dùng nóng, không giữ trứng ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào ớt chuông mềm, trộn trứng với mè rang và hành lá, đổ vào chảo, gập trứng và nấu chín hoàn toàn.",
    "method": "eggs",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "trứng"
    ]
  },
  {
    "id": "plant-v5-034",
    "name": "Đậu gà rau củ sốt sữa chua chanh",
    "category": "main",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 550
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "zucchini",
        "qty": 350
      },
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.",
      "Xào cà rốt, bí ngòi và tỏi đến chín, thêm đậu gà làm nóng; để bớt nóng rồi thêm sốt sữa chua chanh, không đun sôi sữa chua.",
      "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.",
      "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào cà rốt, bí ngòi và tỏi đến chín, thêm đậu gà làm nóng; để bớt nóng rồi thêm sốt sữa chua chanh, không đun sôi sữa chua.",
    "method": "saute",
    "pairingNotes": "",
    "allergenNotes": [
      "sữa"
    ]
  },
  {
    "id": "plant-v5-035",
    "name": "Cà tím nướng sữa chua hạt bí",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "eggplant",
        "qty": 850
      },
      {
        "id": "yogurt",
        "qty": 250
      },
      {
        "id": "pumpkinSeed",
        "qty": 60
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Nướng cà tím đến mềm; pha sữa chua, chanh và tỏi làm sốt nguội, rưới lên cà rồi rắc hạt bí.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng cà tím đến mềm; pha sữa chua, chanh và tỏi làm sốt nguội, rưới lên cà rồi rắc hạt bí.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "sữa"
    ]
  },
  {
    "id": "plant-v5-036",
    "name": "Bí đỏ đậu trắng nướng sữa chua mè",
    "category": "main",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pumpkin",
        "qty": 650
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "sesame",
        "qty": 30
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.",
      "Nướng bí đỏ 25 phút, cho đậu trắng chín vào khay 5 phút cuối; thêm sốt sữa chua chanh và mè sau khi lấy ra.",
      "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.",
      "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng bí đỏ 25 phút, cho đậu trắng chín vào khay 5 phút cuối; thêm sốt sữa chua chanh và mè sau khi lấy ra.",
    "method": "roast",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "sữa"
    ]
  },
  {
    "id": "plant-v5-037",
    "name": "Trứng đậu đỏ sốt cà chua hạt bí",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "egg",
        "qty": 8
      },
      {
        "id": "kidneyBean",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 650
      },
      {
        "id": "pumpkinSeed",
        "qty": 40
      },
      {
        "id": "onion",
        "qty": 150
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Đập trứng vào bát riêng để kiểm tra; cắt rau và thấm khô đậu hũ trước khi nấu.",
      "Xào hành, nấu cà chua thành sốt rồi thêm đậu đỏ; tạo hõm, cho trứng vào đậy nắp nấu chín, rắc hạt bí sau cùng.",
      "Nấu lửa vừa nhỏ và đậy nắp hoặc hấp đến khi phần giữa trứng chín hẳn, không còn lỏng; kiểm tra món nóng chín đều.",
      "Chia bốn phần; đây là món chay có trứng, không gắn nhãn thuần chay. Dùng nóng, không giữ trứng ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": false,
    "artBrief": "Xào hành, nấu cà chua thành sốt rồi thêm đậu đỏ; tạo hõm, cho trứng vào đậy nắp nấu chín, rắc hạt bí sau cùng.",
    "method": "eggs",
    "pairingNotes": "",
    "allergenNotes": [
      "trứng"
    ]
  },
  {
    "id": "plant-v5-038",
    "name": "Đậu lăng rau cải sốt sữa chua",
    "category": "soup",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "spinach",
        "qty": 450
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "vegBroth",
        "qty": 1200
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.",
      "Nấu đậu lăng và cà chua trong nước dùng đến mềm, thêm rau cải nấu chín; chia bát rồi thêm sữa chua, không đun sôi sau khi thêm.",
      "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.",
      "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nấu đậu lăng và cà chua trong nước dùng đến mềm, thêm rau cải nấu chín; chia bát rồi thêm sữa chua, không đun sôi sau khi thêm.",
    "method": "soup",
    "pairingNotes": "",
    "allergenNotes": [
      "sữa"
    ]
  },
  {
    "id": "plant-v5-039",
    "name": "Bulgur nấm trứng hạt lanh",
    "category": "main",
    "protein": "egg",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 260
      },
      {
        "id": "mushroom",
        "qty": 400
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "flax",
        "qty": 30
      },
      {
        "id": "scallion",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Nấu bulgur, xào nấm, luộc trứng chín; xếp trứng cắt đôi trên bulgur, thêm hành và hạt lanh xay.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur, xào nấm, luộc trứng chín; xếp trứng cắt đôi trên bulgur, thêm hành và hạt lanh xay.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten",
      "trứng"
    ]
  },
  {
    "id": "plant-v5-040",
    "name": "Quinoa đậu gà sữa chua óc chó",
    "category": "main",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 240
      },
      {
        "id": "chickpea",
        "qty": 450
      },
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "walnut",
        "qty": 60
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.",
      "Nấu quinoa và để nguội an toàn; làm nóng đậu gà rồi để bớt nóng, thêm dưa leo, óc chó và sốt sữa chua chanh.",
      "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.",
      "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "vegetarian",
    "diet": "vegetarian",
    "recipeKind": "vegetarian",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa"
    ],
    "purposes": [
      "main",
      "friday",
      "feast"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa và để nguội an toàn; làm nóng đậu gà rồi để bớt nóng, thêm dưa leo, óc chó và sốt sữa chua chanh.",
    "method": "grain",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "sữa"
    ]
  },
  {
    "id": "plant-v5-041",
    "name": "Salad quinoa táo óc chó chanh",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "apple",
        "qty": 400
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "lettuce",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa rồi làm nguội nhanh; cắt táo trộn chút chanh để đỡ thâm, thêm xà lách và óc chó.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa rồi làm nguội nhanh; cắt táo trộn chút chanh để đỡ thâm, thêm xà lách và óc chó.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-042",
    "name": "Salad quinoa cam hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "orange",
        "qty": 450
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa và để nguội; tách múi cam bỏ hạt, cắt dưa leo, trộn với hạt bí và sốt chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa và để nguội; tách múi cam bỏ hạt, cắt dưa leo, trộn với hạt bí và sốt chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-043",
    "name": "Salad quinoa đậu đỏ mè rang",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "kidneyBean",
        "qty": 450
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa, làm nguội rồi trộn đậu đỏ chín, cà chua, dưa leo và mè; pha giấm táo với dầu làm sốt.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa, làm nguội rồi trộn đậu đỏ chín, cà chua, dưa leo và mè; pha giấm táo với dầu làm sốt.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-044",
    "name": "Salad quinoa bí ngòi hạt hướng dương",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "zucchini",
        "qty": 450
      },
      {
        "id": "sunflowerSeed",
        "qty": 70
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Áp chảo bí ngòi rồi làm nguội; trộn với quinoa đã nấu, húng quế và hạt hướng dương, rưới chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo bí ngòi rồi làm nguội; trộn với quinoa đã nấu, húng quế và hạt hướng dương, rưới chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-045",
    "name": "Salad quinoa đậu gà hạnh nhân cam",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 200
      },
      {
        "id": "chickpea",
        "qty": 400
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "orange",
        "qty": 400
      },
      {
        "id": "lettuce",
        "qty": 200
      },
      {
        "id": "vinegar",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa, làm nguội; trộn đậu gà chín, múi cam, xà lách và hạnh nhân giã thô, dùng giấm dầu làm sốt.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa, làm nguội; trộn đậu gà chín, múi cam, xà lách và hạnh nhân giã thô, dùng giấm dầu làm sốt.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-046",
    "name": "Salad bulgur cà chua húng quế mè",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 240
      },
      {
        "id": "tomato",
        "qty": 550
      },
      {
        "id": "basil",
        "qty": 30
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu bulgur theo bao bì rồi làm nguội; cắt nhỏ cà chua dưa leo, trộn với húng quế, mè và chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur theo bao bì rồi làm nguội; cắt nhỏ cà chua dưa leo, trộn với húng quế, mè và chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-047",
    "name": "Salad bulgur cà tím hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 240
      },
      {
        "id": "eggplant",
        "qty": 500
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nướng cà tím đến mềm rồi làm nguội; trộn với bulgur chín, cà chua và hạt bí, rưới chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nướng cà tím đến mềm rồi làm nguội; trộn với bulgur chín, cà chua và hạt bí, rưới chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-048",
    "name": "Salad bulgur đậu trắng óc chó",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 220
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu bulgur và làm nguội; trộn đậu trắng chín, dưa leo, húng quế và óc chó với giấm dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur và làm nguội; trộn đậu trắng chín, dưa leo, húng quế và óc chó với giấm dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-049",
    "name": "Salad bulgur táo nho khô hạnh nhân",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 240
      },
      {
        "id": "apple",
        "qty": 350
      },
      {
        "id": "raisin",
        "qty": 70
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu bulgur rồi để nguội; ngâm nho khô 5 phút trong nước sạch rồi để ráo, thêm táo và hạnh nhân với chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur rồi để nguội; ngâm nho khô 5 phút trong nước sạch rồi để ráo, thêm táo và hạnh nhân với chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-050",
    "name": "Salad bulgur bí đỏ hạt hướng dương",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 220
      },
      {
        "id": "pumpkin",
        "qty": 500
      },
      {
        "id": "sunflowerSeed",
        "qty": 70
      },
      {
        "id": "spinach",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nướng bí đỏ, chần rau cải và làm nguội; trộn cùng bulgur chín và hạt hướng dương, dùng chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nướng bí đỏ, chần rau cải và làm nguội; trộn cùng bulgur chín và hạt hướng dương, dùng chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-051",
    "name": "Salad couscous cam hạnh nhân",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 240
      },
      {
        "id": "orange",
        "qty": 450
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Ngâm couscous theo bao bì rồi xới tơi, làm nguội; trộn múi cam, dưa leo và hạnh nhân, thêm chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Ngâm couscous theo bao bì rồi xới tơi, làm nguội; trộn múi cam, dưa leo và hạnh nhân, thêm chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-052",
    "name": "Salad couscous đậu đỏ hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 220
      },
      {
        "id": "kidneyBean",
        "qty": 450
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Ngâm couscous, làm nguội rồi trộn đậu đỏ chín, ớt chuông hạt lựu và hạt bí, rưới giấm dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Ngâm couscous, làm nguội rồi trộn đậu đỏ chín, ớt chuông hạt lựu và hạt bí, rưới giấm dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-053",
    "name": "Salad couscous đậu gà mè chanh",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 220
      },
      {
        "id": "chickpea",
        "qty": 450
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Ngâm couscous rồi xới tơi, làm nguội; thêm đậu gà chín, cà chua và mè với chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Ngâm couscous rồi xới tơi, làm nguội; thêm đậu gà chín, cà chua và mè với chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-054",
    "name": "Salad couscous bí ngòi óc chó",
    "category": "veg",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 240
      },
      {
        "id": "zucchini",
        "qty": 450
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Áp chảo bí ngòi rồi làm nguội, trộn cùng couscous đã ngâm, húng quế và óc chó, rưới chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Áp chảo bí ngòi rồi làm nguội, trộn cùng couscous đã ngâm, húng quế và óc chó, rưới chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây",
      "gluten"
    ]
  },
  {
    "id": "plant-v5-055",
    "name": "Salad couscous táo nho khô hạt chia",
    "category": "veg",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "couscous",
        "qty": 220
      },
      {
        "id": "apple",
        "qty": 400
      },
      {
        "id": "raisin",
        "qty": 60
      },
      {
        "id": "chia",
        "qty": 25
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Ngâm couscous theo bao bì; ngâm chia với 100 ml nước 10 phút đến nở, trộn cùng táo, nho khô và chanh khi hạt đã nguội.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Ngâm couscous theo bao bì; ngâm chia với 100 ml nước 10 phút đến nở, trộn cùng táo, nho khô và chanh khi hạt đã nguội.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "gluten"
    ]
  },
  {
    "id": "plant-v5-056",
    "name": "Salad gạo lứt đậu trắng hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 240
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu gạo lứt rồi làm nguội nhanh; trộn đậu trắng chín, dưa leo và hạt bí với chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt rồi làm nguội nhanh; trộn đậu trắng chín, dưa leo và hạt bí với chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-057",
    "name": "Salad gạo lứt bắp hạnh nhân",
    "category": "veg",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 240
      },
      {
        "id": "corn",
        "qty": 300
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "bellPepper",
        "qty": 350
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu gạo lứt và bắp riêng, làm nguội nhanh; thêm ớt chuông và hạnh nhân, trộn giấm dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt và bắp riêng, làm nguội nhanh; thêm ớt chuông và hạnh nhân, trộn giấm dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-058",
    "name": "Salad gạo lứt đậu gà mè cam",
    "category": "veg",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 220
      },
      {
        "id": "chickpea",
        "qty": 450
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "orange",
        "qty": 400
      },
      {
        "id": "cucumber",
        "qty": 250
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu gạo lứt và làm nguội, trộn đậu gà chín, dưa leo, mè và múi cam; dùng ít nước cam cùng dầu làm sốt.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt và làm nguội, trộn đậu gà chín, dưa leo, mè và múi cam; dùng ít nước cam cùng dầu làm sốt.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-059",
    "name": "Salad gạo lứt nấm óc chó",
    "category": "veg",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 240
      },
      {
        "id": "mushroom",
        "qty": 450
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "spinach",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Xào nấm và chần rau cải đến chín; làm nguội cùng cơm gạo lứt, thêm óc chó và chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Xào nấm và chần rau cải đến chín; làm nguội cùng cơm gạo lứt, thêm óc chó và chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-060",
    "name": "Salad gạo lứt bí đỏ hạt lanh",
    "category": "veg",
    "protein": "plant",
    "time": 50,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "brownRice",
        "qty": 240
      },
      {
        "id": "pumpkin",
        "qty": 500
      },
      {
        "id": "flax",
        "qty": 30
      },
      {
        "id": "lettuce",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu gạo lứt, nướng bí đỏ; làm nguội nhanh rồi xếp lên xà lách, rắc hạt lanh xay và thêm chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu gạo lứt, nướng bí đỏ; làm nguội nhanh rồi xếp lên xà lách, rắc hạt lanh xay và thêm chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-061",
    "name": "Salad đậu lăng táo óc chó",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "apple",
        "qty": 400
      },
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Luộc đậu lăng 25–30 phút, để ráo làm nguội; trộn táo, dưa leo và óc chó với chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc đậu lăng 25–30 phút, để ráo làm nguội; trộn táo, dưa leo và óc chó với chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-062",
    "name": "Salad đậu lăng cà rốt hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "carrot",
        "qty": 350
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Luộc đậu lăng và hấp cà rốt đến chín, làm nguội; trộn cà chua và hạt bí với giấm dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc đậu lăng và hấp cà rốt đến chín, làm nguội; trộn cà chua và hạt bí với giấm dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-063",
    "name": "Salad đậu lăng cam hạnh nhân",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lentil",
        "qty": 240
      },
      {
        "id": "orange",
        "qty": 450
      },
      {
        "id": "almond",
        "qty": 70
      },
      {
        "id": "lettuce",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Luộc đậu lăng mềm rồi làm nguội, trộn với múi cam, xà lách và hạnh nhân, dùng chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Luộc đậu lăng mềm rồi làm nguội, trộn với múi cam, xà lách và hạnh nhân, dùng chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-064",
    "name": "Salad đậu gà tahini hạt hướng dương",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 600
      },
      {
        "id": "tahini",
        "qty": 50
      },
      {
        "id": "sunflowerSeed",
        "qty": 60
      },
      {
        "id": "cucumber",
        "qty": 400
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Pha tahini với chanh và nước làm sốt; trộn đậu gà chín, rau cắt nhỏ và hạt hướng dương ngay trước khi ăn.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Pha tahini với chanh và nước làm sốt; trộn đậu gà chín, rau cắt nhỏ và hạt hướng dương ngay trước khi ăn.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-065",
    "name": "Salad đậu trắng mè cà tím nướng",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "whiteBean",
        "qty": 600
      },
      {
        "id": "eggplant",
        "qty": 500
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nướng cà tím và làm nguội; trộn với đậu trắng chín, cà chua và mè, rưới chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng cà tím và làm nguội; trộn với đậu trắng chín, cà chua và mè, rưới chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-066",
    "name": "Salad đậu đỏ quinoa hạt chia",
    "category": "veg",
    "protein": "plant",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "kidneyBean",
        "qty": 500
      },
      {
        "id": "quinoa",
        "qty": 180
      },
      {
        "id": "chia",
        "qty": 25
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "tomato",
        "qty": 350
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa và làm nguội; ngâm chia trong 100 ml nước 10 phút rồi trộn với đậu đỏ chín, rau và giấm dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa và làm nguội; ngâm chia trong 100 ml nước 10 phút rồi trộn với đậu đỏ chín, rau và giấm dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-067",
    "name": "Salad ba loại đậu hạt bí",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "chickpea",
        "qty": 250
      },
      {
        "id": "whiteBean",
        "qty": 250
      },
      {
        "id": "kidneyBean",
        "qty": 250
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "bellPepper",
        "qty": 300
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Tráng và để ráo ba loại đậu chín, trộn với ớt chuông, hạt bí và chanh dầu; không dùng đậu sống.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Tráng và để ráo ba loại đậu chín, trộn với ớt chuông, hạt bí và chanh dầu; không dùng đậu sống.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-068",
    "name": "Salad bông cải mè đậu phộng",
    "category": "veg",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "broccoli",
        "qty": 700
      },
      {
        "id": "sesame",
        "qty": 25
      },
      {
        "id": "peanut",
        "qty": 80
      },
      {
        "id": "carrot",
        "qty": 250
      },
      {
        "id": "soy",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Hấp bông cải cà rốt rồi làm nguội; giã thô đậu phộng, pha nước tương chanh và dầu làm sốt, rắc mè.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Hấp bông cải cà rốt rồi làm nguội; giã thô đậu phộng, pha nước tương chanh và dầu làm sốt, rắc mè.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-069",
    "name": "Salad bắp cải táo hạt hướng dương",
    "category": "veg",
    "protein": "plant",
    "time": 20,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "cabbage",
        "qty": 600
      },
      {
        "id": "apple",
        "qty": 400
      },
      {
        "id": "sunflowerSeed",
        "qty": 80
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "vinegar",
        "qty": 30
      },
      {
        "id": "mustard",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Bào bắp cải và cà rốt, thái táo; pha mù tạt, giấm và dầu làm sốt, trộn rồi rắc hạt hướng dương.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Bào bắp cải và cà rốt, thái táo; pha mù tạt, giấm và dầu làm sốt, trộn rồi rắc hạt hướng dương.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-070",
    "name": "Salad bí đỏ rau cải hạnh nhân",
    "category": "veg",
    "protein": "plant",
    "time": 40,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pumpkin",
        "qty": 650
      },
      {
        "id": "spinach",
        "qty": 400
      },
      {
        "id": "almond",
        "qty": 80
      },
      {
        "id": "raisin",
        "qty": 60
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nướng bí đỏ và chần rau cải; làm nguội rồi trộn hạnh nhân, nho khô với chanh dầu.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Nướng bí đỏ và chần rau cải; làm nguội rồi trộn hạnh nhân, nho khô với chanh dầu.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-071",
    "name": "Salad dưa leo cam hạt lanh",
    "category": "veg",
    "protein": "plant",
    "time": 15,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "cucumber",
        "qty": 650
      },
      {
        "id": "orange",
        "qty": 500
      },
      {
        "id": "flax",
        "qty": 35
      },
      {
        "id": "lettuce",
        "qty": 250
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Thái dưa leo, tách múi cam, xé xà lách; rắc hạt lanh xay và trộn chanh dầu ngay trước khi ăn.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": false,
    "artBrief": "Thái dưa leo, tách múi cam, xé xà lách; rắc hạt lanh xay và trộn chanh dầu ngay trước khi ăn.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-072",
    "name": "Salad quinoa trứng hạt bí sữa chua",
    "category": "veg",
    "protein": "egg",
    "time": 30,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "quinoa",
        "qty": 220
      },
      {
        "id": "egg",
        "qty": 4
      },
      {
        "id": "pumpkinSeed",
        "qty": 60
      },
      {
        "id": "cucumber",
        "qty": 350
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu quinoa và luộc trứng chín; làm nguội an toàn, cắt trứng rồi trộn rau với sốt sữa chua chanh, rắc hạt bí.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegetarian",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu quinoa và luộc trứng chín; làm nguội an toàn, cắt trứng rồi trộn rau với sốt sữa chua chanh, rắc hạt bí.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "sữa",
      "trứng"
    ]
  },
  {
    "id": "plant-v5-073",
    "name": "Salad bulgur đậu trắng sữa chua mè",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "bulgur",
        "qty": 220
      },
      {
        "id": "whiteBean",
        "qty": 450
      },
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "sesame",
        "qty": 30
      },
      {
        "id": "tomato",
        "qty": 400
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Nấu bulgur và làm nguội; trộn cùng đậu trắng chín, cà chua và sốt sữa chua chanh, rắc mè.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegetarian",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Nấu bulgur và làm nguội; trộn cùng đậu trắng chín, cà chua và sốt sữa chua chanh, rắc mè.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "mè",
      "gluten",
      "sữa"
    ]
  },
  {
    "id": "plant-v5-074",
    "name": "Salad khoai tây hạt bí mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 35,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "potato",
        "qty": 750
      },
      {
        "id": "pumpkinSeed",
        "qty": 70
      },
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "vinegar",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Luộc khoai chín, làm nguội nhanh; pha sữa chua mù tạt giấm thành sốt, trộn với dưa leo và hạt bí.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegetarian",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc khoai chín, làm nguội nhanh; pha sữa chua mù tạt giấm thành sốt, trộn với dưa leo và hạt bí.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "sữa",
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-075",
    "name": "Salad penne rau củ đậu phộng",
    "category": "veg",
    "protein": "plant",
    "time": 25,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "penne",
        "qty": 280
      },
      {
        "id": "peanut",
        "qty": 80
      },
      {
        "id": "bellPepper",
        "qty": 300
      },
      {
        "id": "cucumber",
        "qty": 300
      },
      {
        "id": "carrot",
        "qty": 200
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 2
      },
      {
        "id": "oil",
        "qty": 10
      }
    ],
    "prep": "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.",
      "Luộc penne và hấp cà rốt rồi làm nguội; trộn rau còn lại với sốt đậu phộng giã, nước tương, chanh và nước.",
      "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.",
      "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "seed-salad",
    "diet": "vegan",
    "recipeKind": "seed-salad",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad hạt & ngũ cốc"
    ],
    "purposes": [
      "side"
    ],
    "stapleIncluded": true,
    "artBrief": "Luộc penne và hấp cà rốt rồi làm nguội; trộn rau còn lại với sốt đậu phộng giã, nước tương, chanh và nước.",
    "method": "salad",
    "pairingNotes": "",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-076",
    "name": "Dressing chanh vàng mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 40
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Đánh mù tạt với nước chanh và muối, rót dầu thành tia nhỏ trong khi khuấy để tạo nhũ tương.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Đánh mù tạt với nước chanh và muối, rót dầu thành tia nhỏ trong khi khuấy để tạo nhũ tương.",
    "method": "dressing",
    "pairingNotes": "Hợp salad rau lá và quinoa.",
    "allergenNotes": [
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-077",
    "name": "Dressing giấm táo oregano",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "vinegar",
        "qty": 35
      },
      {
        "id": "oil",
        "qty": 40
      },
      {
        "id": "oregano",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Đánh giấm táo với oregano và muối rồi thêm dầu từ từ; để 5 phút cho oregano mềm.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Đánh giấm táo với oregano và muối rồi thêm dầu từ từ; để 5 phút cho oregano mềm.",
    "method": "dressing",
    "pairingNotes": "Hợp salad đậu và rau nướng.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-078",
    "name": "Dressing cam mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "orange",
        "qty": 180
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 30
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Vắt phần cam đã cân, lọc bỏ hạt; đánh với mù tạt và muối rồi rót dầu chậm để hòa quyện.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Vắt phần cam đã cân, lọc bỏ hạt; đánh với mù tạt và muối rồi rót dầu chậm để hòa quyện.",
    "method": "dressing",
    "pairingNotes": "Hợp salad bulgur, couscous và bắp cải.",
    "allergenNotes": [
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-079",
    "name": "Dressing chanh húng quế",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "basil",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 40
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay húng quế với chanh, dầu và muối; chỉ xay ngắn để sốt xanh, không thêm phô mai.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay húng quế với chanh, dầu và muối; chỉ xay ngắn để sốt xanh, không thêm phô mai.",
    "method": "dressing",
    "pairingNotes": "Hợp cà chua, penne và rau củ.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-080",
    "name": "Dressing tahini chanh tỏi",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tahini",
        "qty": 80
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 8
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Khuấy tahini với chanh, tỏi nghiền và muối; thêm nước từng thìa đến khi sốt mịn, không dùng sữa.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Khuấy tahini với chanh, tỏi nghiền và muối; thêm nước từng thìa đến khi sốt mịn, không dùng sữa.",
    "method": "dressing",
    "pairingNotes": "Hợp salad đậu gà, bông cải và bí đỏ.",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-081",
    "name": "Dressing tahini cam",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tahini",
        "qty": 80
      },
      {
        "id": "orange",
        "qty": 200
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Lấy nước cam, bỏ hạt rồi khuấy với tahini và muối; thêm ít nước cho vừa độ rưới.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Lấy nước cam, bỏ hạt rồi khuấy với tahini và muối; thêm ít nước cho vừa độ rưới.",
    "method": "dressing",
    "pairingNotes": "Hợp salad quinoa và rau củ nướng.",
    "allergenNotes": [
      "mè"
    ]
  },
  {
    "id": "plant-v5-082",
    "name": "Dressing đậu phộng chanh nước tương",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "peanut",
        "qty": 80
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "soy",
        "qty": 20
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Giã hoặc xay đậu phộng rang, trộn với nước chanh và nước tương; thêm nước lọc đến khi thành sốt.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Giã hoặc xay đậu phộng rang, trộn với nước chanh và nước tương; thêm nước lọc đến khi thành sốt.",
    "method": "dressing",
    "pairingNotes": "Hợp bắp cải, bún và salad penne.",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-083",
    "name": "Dressing đậu phộng gừng giấm táo",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "peanut",
        "qty": 80
      },
      {
        "id": "ginger",
        "qty": 15
      },
      {
        "id": "vinegar",
        "qty": 30
      },
      {
        "id": "soy",
        "qty": 15
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay đậu phộng, gừng, giấm và nước tương với nước lọc vừa đủ; sốt có màu be nâu, không thêm sữa.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay đậu phộng, gừng, giấm và nước tương với nước lọc vừa đủ; sốt có màu be nâu, không thêm sữa.",
    "method": "dressing",
    "pairingNotes": "Hợp rau luộc nguội và salad gạo lứt.",
    "allergenNotes": [
      "đậu phộng",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-084",
    "name": "Dressing mè gừng chanh",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "sesame",
        "qty": 45
      },
      {
        "id": "ginger",
        "qty": 15
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "soy",
        "qty": 20
      },
      {
        "id": "oil",
        "qty": 20
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Giã mè rang cho vỡ thơm, trộn gừng băm, nước chanh và nước tương rồi đánh với dầu.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Giã mè rang cho vỡ thơm, trộn gừng băm, nước chanh và nước tương rồi đánh với dầu.",
    "method": "dressing",
    "pairingNotes": "Hợp dưa leo, bông cải và đậu hũ.",
    "allergenNotes": [
      "mè",
      "gluten",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-085",
    "name": "Dressing mè miso",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "miso",
        "qty": 35
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 20
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Chọn miso nguyên chất không có dashi/cá. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Giã mè; khuấy miso nguyên chất không dashi với giấm và ít nước, thêm mè và dầu, không dùng nước mắm.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Giã mè; khuấy miso nguyên chất không dashi với giấm và ít nước, thêm mè và dầu, không dùng nước mắm.",
    "method": "dressing",
    "pairingNotes": "Hợp salad đậu trắng và rau củ.",
    "allergenNotes": [
      "mè",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-086",
    "name": "Dressing quả bơ chanh",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "avocado",
        "qty": 180
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "oil",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay phần thịt quả bơ với chanh, dầu, muối và nước lọc vừa đủ; giữ sốt xanh, không dùng sữa.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay phần thịt quả bơ với chanh, dầu, muối và nước lọc vừa đủ; giữ sốt xanh, không dùng sữa.",
    "method": "dressing",
    "pairingNotes": "Hợp xà lách, quinoa và bánh mì salad.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-087",
    "name": "Dressing quả bơ húng quế",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "avocado",
        "qty": 180
      },
      {
        "id": "basil",
        "qty": 25
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay quả bơ, húng quế và giấm với ít nước đến mịn; không tự thêm phô mai, sữa chua hoặc hạt.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay quả bơ, húng quế và giấm với ít nước đến mịn; không tự thêm phô mai, sữa chua hoặc hạt.",
    "method": "dressing",
    "pairingNotes": "Hợp salad cà chua và penne.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-088",
    "name": "Dressing hạt hướng dương chanh",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "sunflowerSeed",
        "qty": 80
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 8
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Ngâm hạt trong nước nóng 20 phút rồi để ráo, xay cùng chanh, tỏi và nước sạch thành sốt mịn. Thời gian món chưa gồm 20 phút ngâm.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Ngâm hạt trong nước nóng 20 phút rồi để ráo, xay cùng chanh, tỏi và nước sạch thành sốt mịn. Thời gian món chưa gồm 20 phút ngâm.",
    "method": "dressing",
    "pairingNotes": "Hợp salad rau lá và đậu gà.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-089",
    "name": "Dressing hạt bí mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "pumpkinSeed",
        "qty": 80
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Ngâm hạt bí trong nước nóng 20 phút rồi để ráo; xay với mù tạt, giấm và nước. Thời gian món chưa gồm ngâm.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Ngâm hạt bí trong nước nóng 20 phút rồi để ráo; xay với mù tạt, giấm và nước. Thời gian món chưa gồm ngâm.",
    "method": "dressing",
    "pairingNotes": "Hợp salad bí đỏ và gạo lứt.",
    "allergenNotes": [
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-090",
    "name": "Dressing óc chó giấm táo",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "walnut",
        "qty": 70
      },
      {
        "id": "vinegar",
        "qty": 30
      },
      {
        "id": "oil",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay óc chó với giấm, dầu và ít nước cho sánh, không thêm phô mai hoặc sữa.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay óc chó với giấm, dầu và ít nước cho sánh, không thêm phô mai hoặc sữa.",
    "method": "dressing",
    "pairingNotes": "Hợp táo, bắp cải và salad đậu lăng.",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-091",
    "name": "Dressing hạnh nhân chanh",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "almond",
        "qty": 80
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 8
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Ngâm hạnh nhân trong nước nóng 30 phút rồi để ráo, xay với chanh, tỏi và nước sạch. Thời gian món chưa gồm ngâm.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Ngâm hạnh nhân trong nước nóng 30 phút rồi để ráo, xay với chanh, tỏi và nước sạch. Thời gian món chưa gồm ngâm.",
    "method": "dressing",
    "pairingNotes": "Hợp bông cải và salad quinoa.",
    "allergenNotes": [
      "hạt cây"
    ]
  },
  {
    "id": "plant-v5-092",
    "name": "Dressing táo mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "apple",
        "qty": 180
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 20
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Bỏ lõi táo, xay phần táo đã cân với mù tạt, giấm, dầu và muối; không thêm đường.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Bỏ lõi táo, xay phần táo đã cân với mù tạt, giấm, dầu và muối; không thêm đường.",
    "method": "dressing",
    "pairingNotes": "Hợp bắp cải và salad đậu.",
    "allergenNotes": [
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-093",
    "name": "Dressing cam hạt chia",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "orange",
        "qty": 220
      },
      {
        "id": "chia",
        "qty": 20
      },
      {
        "id": "vinegar",
        "qty": 15
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Vắt cam bỏ hạt; trộn nước cam với chia, giấm và muối, để 15 phút cho chia nở rồi khuấy lại. Thời gian món chưa gồm chờ nở.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Vắt cam bỏ hạt; trộn nước cam với chia, giấm và muối, để 15 phút cho chia nở rồi khuấy lại. Thời gian món chưa gồm chờ nở.",
    "method": "dressing",
    "pairingNotes": "Hợp salad trái cây, couscous và rau lá.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-094",
    "name": "Dressing cà chua húng quế",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "tomato",
        "qty": 220
      },
      {
        "id": "basil",
        "qty": 20
      },
      {
        "id": "vinegar",
        "qty": 25
      },
      {
        "id": "oil",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay cà chua đã rửa cùng húng quế, giấm, dầu và muối; chỉ dùng cà chua tươi, không tự thêm tương cà.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay cà chua đã rửa cùng húng quế, giấm, dầu và muối; chỉ dùng cà chua tươi, không tự thêm tương cà.",
    "method": "dressing",
    "pairingNotes": "Hợp salad đậu trắng và penne.",
    "allergenNotes": []
  },
  {
    "id": "plant-v5-095",
    "name": "Dressing miso chanh gừng",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "miso",
        "qty": 40
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "ginger",
        "qty": 15
      },
      {
        "id": "oil",
        "qty": 20
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Chọn miso nguyên chất không có dashi/cá.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Khuấy miso không dashi với chanh, gừng băm, dầu và nước cho hòa quyện; không thêm nước mắm hoặc dashi.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegan",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Thuần chay",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Khuấy miso không dashi với chanh, gừng băm, dầu và nước cho hòa quyện; không thêm nước mắm hoặc dashi.",
    "method": "dressing",
    "pairingNotes": "Hợp salad hạt và đậu hũ.",
    "allergenNotes": [
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-096",
    "name": "Dressing sữa chua chanh mù tạt",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "mustard",
        "qty": 25
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Khuấy sữa chua tự nhiên với chanh, mù tạt và muối; không đun nóng và không thêm mayonnaise.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegetarian",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Khuấy sữa chua tự nhiên với chanh, mù tạt và muối; không đun nóng và không thêm mayonnaise.",
    "method": "dressing",
    "pairingNotes": "Hợp salad khoai tây và trứng.",
    "allergenNotes": [
      "sữa",
      "mù tạt"
    ]
  },
  {
    "id": "plant-v5-097",
    "name": "Dressing sữa chua mè rang",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "sesame",
        "qty": 35
      },
      {
        "id": "vinegar",
        "qty": 20
      },
      {
        "id": "soy",
        "qty": 10
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Giã mè rang rồi khuấy với sữa chua, giấm và nước tương, dùng ít nước nếu cần chỉnh độ loãng.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegetarian",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Giã mè rang rồi khuấy với sữa chua, giấm và nước tương, dùng ít nước nếu cần chỉnh độ loãng.",
    "method": "dressing",
    "pairingNotes": "Hợp bông cải, bắp cải và salad đậu.",
    "allergenNotes": [
      "mè",
      "gluten",
      "sữa",
      "đậu nành"
    ]
  },
  {
    "id": "plant-v5-098",
    "name": "Dressing sữa chua quả bơ",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "avocado",
        "qty": 140
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay quả bơ với sữa chua, chanh và muối cho mịn; dùng ngay để giữ màu, không thêm phô mai.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegetarian",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay quả bơ với sữa chua, chanh và muối cho mịn; dùng ngay để giữ màu, không thêm phô mai.",
    "method": "dressing",
    "pairingNotes": "Hợp rau lá và salad quinoa.",
    "allergenNotes": [
      "sữa"
    ]
  },
  {
    "id": "plant-v5-099",
    "name": "Dressing sữa chua húng quế",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "yogurt",
        "qty": 220
      },
      {
        "id": "basil",
        "qty": 25
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "garlic",
        "qty": 8
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Xay ngắn húng quế, tỏi và chanh với sữa chua, nêm muối; không tự thêm hạt hoặc phô mai.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegetarian",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Xay ngắn húng quế, tỏi và chanh với sữa chua, nêm muối; không tự thêm hạt hoặc phô mai.",
    "method": "dressing",
    "pairingNotes": "Hợp salad cà chua và couscous.",
    "allergenNotes": [
      "sữa"
    ]
  },
  {
    "id": "plant-v5-100",
    "name": "Dressing sữa chua tahini",
    "category": "veg",
    "protein": "plant",
    "time": 10,
    "servings": 4,
    "yield": 4,
    "ingredients": [
      {
        "id": "yogurt",
        "qty": 200
      },
      {
        "id": "tahini",
        "qty": 60
      },
      {
        "id": "lemon",
        "qty": 1
      },
      {
        "id": "salt",
        "qty": 1
      }
    ],
    "prep": "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.",
    "steps": [
      "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.",
      "Khuấy tahini với chanh cho mịn rồi trộn sữa chua, muối và ít nước; sốt trắng ngà, không thêm đậu phộng.",
      "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.",
      "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng."
    ],
    "favorite": false,
    "custom": false,
    "expanded": true,
    "catalogEdition": 5,
    "collection": "dressing",
    "diet": "vegetarian",
    "recipeKind": "dressing",
    "tags": [
      "Vegetarian",
      "Ăn chay",
      "Chay có trứng/sữa",
      "Salad dressing",
      "Sốt trộn salad"
    ],
    "purposes": [],
    "stapleIncluded": false,
    "artBrief": "Khuấy tahini với chanh cho mịn rồi trộn sữa chua, muối và ít nước; sốt trắng ngà, không thêm đậu phộng.",
    "method": "dressing",
    "pairingNotes": "Hợp salad đậu gà và cà tím nướng.",
    "allergenNotes": [
      "mè",
      "sữa"
    ]
  }
];
RECIPES.push(...PLANT_RECIPES);

const PLANT_VERIFIED_INGREDIENT_IDS=new Set(Object.keys(INGREDIENTS));
const NON_VEGETARIAN_INGREDIENT_IDS=new Set(['pork','ribs','chicken','beef','salmon','fish','shrimp','fishSauce','broth','wonton','fishBall','cookedChicken','tuna']);
const DAIRY_EGG_INGREDIENT_IDS=new Set(['egg','milk','yogurt','cream','butter','parmesan','mozzarella','feta']);
function isDressingRecipe(r){return r?.recipeKind==='dressing'}
function isVegetarianRecipe(r){return ['vegetarian','vegan'].includes(r?.diet)&&r.ingredients?.length>0&&r.ingredients.every(i=>PLANT_VERIFIED_INGREDIENT_IDS.has(i.id)&&!NON_VEGETARIAN_INGREDIENT_IDS.has(i.id))}
function isVeganRecipe(r){return r?.diet==='vegan'&&isVegetarianRecipe(r)&&r.ingredients.every(i=>!DAIRY_EGG_INGREDIENT_IDS.has(i.id))}
function isSeedSaladRecipe(r){return r?.recipeKind==='seed-salad'&&isVegetarianRecipe(r)}
function recipeCategoryLabel(r){const en=typeof appLanguage!=='undefined'&&appLanguage==='en';return isDressingRecipe(r)?(en?'Salad dressing':'Sốt dressing'):isSeedSaladRecipe(r)?(en?'Seed & grain salad':'Salad hạt & ngũ cốc'):CATEGORY[r.category]}

function recipePortionLabel(r,n){const en=typeof appLanguage!=='undefined'&&appLanguage==='en';return n+' '+(isDressingRecipe(r)?(en?'salad dressing portions':'phần sốt salad'):(en?'standard portions':'suất chuẩn'))}
