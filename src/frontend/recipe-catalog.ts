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
