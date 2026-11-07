'use strict';
// Named recipe variants use explicit ingredients and cooking steps, not title-only records.
const EXPANDED_RECIPES=[];
(function expandFamilyCatalog(){
 const seen=new Set(RECIPES.map(r=>r.name));let number=0;
 const push=(name,cat,protein,time,ingredients,prep,steps,tags)=>{if(seen.has(name))return;seen.add(name);EXPANDED_RECIPES.push({...recipe('family-v3-'+(++number),name,cat,protein,time,ingredients,prep,steps),expanded:true,tags:tags||[]})};
 const curatedWesternAndHealthy=[
  ['Mì Ý Bolognese bò bằm sốt cà chua','noodle','beef',30,{spaghetti:400,beef:450,tomato:500,onion:150,carrot:100,garlic:20,oil:20,salt:4,pepper:2},'Băm nhỏ hành tây, cà rốt, tỏi; cà chua khứa chữ thập trụng sơ bóc vỏ băm nhuyễn.',['Đun sôi nồi nước có pha 1 thìa cà phê muối, luộc mì Ý 8–10 phút đến độ chín vừa (al dente) rồi vớt ra trộn nhẹ 1 thìa dầu.', 'Làm nóng dầu trên chảo sâu lòng, phi thơm tỏi, hành tây và cà rốt băm 3 phút cho dậy mùi ngọt tự nhiên.', 'Cho thịt bò bằm vào đảo lửa lớn đến khi săn tơi, thêm cà chua băm và 120ml nước luộc mì, hạ lửa nhỏ ninh 12 phút cho sốt sánh đậm.', 'Nêm muối, tiêu đen vừa ăn, đảo đều mì với sốt bò bằm nóng hổi hoặc rưới sốt lên từng đĩa mì.'],['Món Âu & Ý','Món Ý','Đổi vị cuối tuần']],
  ['Mì Ý cá hồi nấm sốt tỏi nước dùng','noodle','fish',25,{spaghetti:380,salmon:420,broth:180,mushroom:200,garlic:20,onion:100,oil:15,salt:4,pepper:2},'Thấm khô phi lê cá hồi, cắt quân cờ 2.5cm, ướp chút muối tiêu; nấm rửa nhanh thái lát.',['Luộc mì Ý trong nước sôi có muối khoảng 8–9 phút cho vừa chín tới, giữ lại 80ml nước luộc mì rồi để ráo.', 'Áp chảo cá hồi với chút dầu ở lửa vừa 2 phút mỗi mặt cho vàng thơm bên ngoài mà bên trong vẫn mềm ẩm, gắp ra đĩa.', 'Phi thơm tỏi và hành tây băm trên cùng chảo, cho nấm vào xào chín tới rồi rót nước dùng và nước luộc mì vào đun sôi lăn tăn.', 'Cho mì Ý và cá hồi vào đảo nhẹ tay 1–2 phút cho sốt áo đều sợi mì, rắc tiêu đen và dùng nóng.'],['Món Âu & Ý','Món Ý','Nhanh trong tuần']],
  ['Mì Ý ức gà áp chảo nấm sốt tỏi','noodle','chicken',25,{spaghetti:380,chicken:480,mushroom:220,broccoli:200,garlic:25,oil:25,salt:4,pepper:2},'Ức gà thấm khô, thái lát vừa ăn ướp muối tiêu; bông cải tách nhánh nhỏ; tỏi thái lát mỏng.',['Luộc mì Ý trong nước sôi có muối 8 phút; 2 phút cuối cho bông cải xanh vào chần chung rồi vớt ra để ráo, giữ lại 80ml nước luộc.', 'Áp chảo ức gà với 1 thìa dầu ở lửa vừa 3–4 phút mỗi mặt đến khi vàng chín, lấy ra để nghỉ.', 'Phi vàng tỏi lát ở lửa nhỏ cho thơm dịu, cho nấm vào xào săn với chút muối và nước luộc mì.', 'Trộn mì Ý, bông cải và ức gà vào chảo, đảo đều trên lửa vừa 1 phút, rắc tiêu đen xay.'],['Món Âu & Ý','Món Ý','Healthy · Thanh đạm']],
  ['Cá hồi áp chảo tỏi kèm khoai tây & bông cải','main','fish',25,{salmon:550,potato:400,broccoli:300,garlic:20,lime:1,oil:20,salt:4,pepper:2},'Thấm thật khô miếng cá hồi, ướp muối tiêu hai mặt; khoai tây cắt múi cau; bông cải cắt miếng vừa ăn.',['Hấp hoặc luộc chín tới khoai tây (10 phút) và bông cải xanh (3 phút) để giữ màu xanh giòn.', 'Làm nóng chảo chống dính với dầu, đặt mặt da cá hồi xuống áp chảo lửa vừa 4 phút cho da giòn vàng, lật mặt áp tiếp 2–3 phút cùng tỏi đập dập.', 'Đảo nhanh khoai tây và bông cải qua phần dầu tỏi thơm trong chảo 2 phút cho thấm vị.', 'Bày cá hồi cùng rau củ ra đĩa, vắt nhẹ nước cốt chanh tươi lên mặt cá trước khi thưởng thức.'],['Món Âu & Ý','Healthy · Thanh đạm','Ít dầu mỡ']],
  ['Bò bít tết áp chảo kèm khoai tây & đậu que','main','beef',25,{beef:550,potato:450,bean:280,garlic:20,onion:120,oil:25,salt:4,pepper:3},'Để thịt bò hết lạnh hoàn toàn, thấm khô mặt thịt, ướp muối và tiêu đen xay trước khi áp chảo 10 phút.',['Khoai tây gọt vỏ cắt múi cau, luộc sơ 7 phút rồi áp chảo vàng giòn các mặt; đậu que tước xơ chần chín tới.', 'Làm nóng già chảo gang hoặc chảo đáy dày, cho dầu và áp chảo miếng thịt bò cùng tép tỏi đập dập 2.5–3 phút mỗi mặt tùy độ chín mong muốn.', 'Lấy thịt bò ra đĩa ấm để nghỉ 5 phút giúp giữ trọn nước ngọt bên trong rồi thái lát dày vừa ăn.', 'Xào nhanh hành tây và đậu que trên chảo vừa áp bò, bày kèm khoai tây và thịt bò.'],['Món Âu & Ý','Món Âu','Đổi vị cuối tuần']],
  ['Ức gà áp chảo thảo mộc & rau củ nướng chảo','main','chicken',25,{chicken:600,broccoli:280,carrot:180,potato:300,garlic:20,lime:1,oil:20,salt:4,pepper:2},'Ức gà lạng đôi cho đều độ dày, ướp muối, tiêu, tỏi băm và chút nước cốt chanh trong 10 phút.',['Cà rốt và khoai tây cắt miếng vừa ăn, hấp hoặc luộc sơ 6 phút; bông cải xanh rửa sạch để ráo.', 'Làm nóng chảo với 1 thìa dầu, áp chảo ức gà lửa vừa 4 phút mỗi mặt đến khi vàng ruộm và chín mềm bên trong.', 'Cho khoai tây, cà rốt và bông cải vào chảo đảo đều 4–5 phút cho xém cạnh thơm nhẹ.', 'Thái ức gà thành lát vừa ăn, xếp cùng rau củ nóng hổi.'],['Món Âu & Ý','Healthy · Thanh đạm','Giàu đạm']],
  ['Súp bí đỏ khoai tây kiểu Âu','soup','plant',25,{pumpkin:600,potato:200,onion:120,vegBroth:900,garlic:15,oil:15,salt:3,pepper:2},'Bí đỏ và khoai tây gọt vỏ, rửa sạch, cắt khối vuông 2cm để nhanh chín mềm.',['Làm nóng chút dầu trong nồi, xào thơm hành tây và tỏi băm 2 phút ở lửa vừa cho trong mà không cháy.', 'Cho bí đỏ, khoai tây và nước dùng rau củ vào nồi, đun sôi rồi hạ lửa nhỏ nấu 15 phút đến khi củ mềm nhừ.', 'Dùng máy xay hoặc muôi tán nhuyễn mịn hỗn hợp bí đỏ trên lửa nhỏ 2 phút cho sánh mịn.', 'Nêm muối và tiêu đen vừa vị, múc ra chén dùng ấm.'],['Món Âu & Ý','Món Âu','Một nồi']],
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
 const quotas={main:160,soup:100,veg:80,noodle:146};const selected=[];for(const[cat,count]of Object.entries(quotas))selected.push(...EXPANDED_RECIPES.filter(r=>r.category===cat).slice(0,count));for(const r of EXPANDED_RECIPES){if(selected.length>=486)break;if(!selected.some(x=>x.id===r.id))selected.push(r)}// Apply category repairs after quota selection so the original recipe IDs remain unchanged.
 for(const r of selected)if(['family-v3-1','family-v3-2','family-v3-3'].includes(r.id)){r.category='main';r.stapleIncluded=true}
 RECIPES.push(...selected.slice(0,486));
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
// v1.7.5 (owner, 5 Nov 2026): Vietnamese reference recipes are halved (534 → 269), evenly within each group (main /
// soup / veg / noodle), dropping near-duplicates, long or ingredient-heavy recipes first; the 54 original recipes,
// and every Western, healthy, seed-salad and dressing recipe stay. 740 → 475.
// Retired recipes leave a family's library only when that family never touched them (core.ts retireReferenceRecipes).
const RETIRED_REFERENCE_IDS=new Set(["family-v3-21", "family-v3-22", "family-v3-27", "family-v3-32", "family-v3-33", "family-v3-34", "family-v3-35", "family-v3-37", "family-v3-38", "family-v3-39", "family-v3-40", "family-v3-42", "family-v3-43", "family-v3-45", "family-v3-46", "family-v3-56", "family-v3-57", "family-v3-58", "family-v3-59", "family-v3-61", "family-v3-62", "family-v3-64", "family-v3-66", "family-v3-67", "family-v3-69", "family-v3-70", "family-v3-74", "family-v3-80", "family-v3-81", "family-v3-82", "family-v3-83", "family-v3-85", "family-v3-86", "family-v3-88", "family-v3-90", "family-v3-91", "family-v3-93", "family-v3-94", "family-v3-98", "family-v3-104", "family-v3-105", "family-v3-106", "family-v3-107", "family-v3-109", "family-v3-110", "family-v3-111", "family-v3-112", "family-v3-113", "family-v3-114", "family-v3-115", "family-v3-116", "family-v3-117", "family-v3-118", "family-v3-119", "family-v3-120", "family-v3-121", "family-v3-122", "family-v3-123", "family-v3-124", "family-v3-125", "family-v3-126", "family-v3-127", "family-v3-128", "family-v3-129", "family-v3-130", "family-v3-131", "family-v3-132", "family-v3-133", "family-v3-134", "family-v3-135", "family-v3-137", "family-v3-138", "family-v3-140", "family-v3-141", "family-v3-151", "family-v3-152", "family-v3-153", "family-v3-154", "family-v3-156", "family-v3-157", "family-v3-159", "family-v3-161", "family-v3-162", "family-v3-164", "family-v3-165", "family-v3-181", "family-v3-188", "family-v3-227", "family-v3-228", "family-v3-229", "family-v3-230", "family-v3-231", "family-v3-232", "family-v3-233", "family-v3-234", "family-v3-235", "family-v3-236", "family-v3-237", "family-v3-238", "family-v3-239", "family-v3-240", "family-v3-241", "family-v3-242", "family-v3-243", "family-v3-244", "family-v3-245", "family-v3-246", "family-v3-247", "family-v3-248", "family-v3-249", "family-v3-250", "family-v3-251", "family-v3-252", "family-v3-253", "family-v3-254", "family-v3-255", "family-v3-256", "family-v3-257", "family-v3-258", "family-v3-259", "family-v3-260", "family-v3-261", "family-v3-262", "family-v3-263", "family-v3-264", "family-v3-265", "family-v3-266", "family-v3-267", "family-v3-268", "family-v3-269", "family-v3-270", "family-v3-271", "family-v3-272", "family-v3-273", "family-v3-274", "family-v3-275", "family-v3-276", "family-v3-277", "family-v3-321", "family-v3-322", "family-v3-324", "family-v3-325", "family-v3-326", "family-v3-328", "family-v3-329", "family-v3-330", "family-v3-332", "family-v3-333", "family-v3-334", "family-v3-336", "family-v3-337", "family-v3-338", "family-v3-340", "family-v3-341", "family-v3-342", "family-v3-344", "family-v3-345", "family-v3-346", "family-v3-348", "family-v3-349", "family-v3-350", "family-v3-352", "family-v3-353", "family-v3-354", "family-v3-356", "family-v3-357", "family-v3-358", "family-v3-360", "family-v3-361", "family-v3-362", "family-v3-364", "family-v3-365", "family-v3-366", "family-v3-368", "family-v3-369", "family-v3-370", "family-v3-372", "family-v3-373", "family-v3-374", "family-v3-376", "family-v3-377", "family-v3-378", "family-v3-381", "family-v3-382", "family-v3-383", "family-v3-384", "family-v3-385", "family-v3-386", "family-v3-387", "family-v3-388", "family-v3-389", "family-v3-390", "family-v3-391", "family-v3-392", "family-v3-393", "family-v3-394", "family-v3-395", "family-v3-396", "family-v3-397", "family-v3-398", "family-v3-399", "family-v3-400", "family-v3-401", "family-v3-402", "family-v3-403", "family-v3-404", "family-v3-426", "family-v3-427", "family-v3-428", "family-v3-450", "family-v3-451", "family-v3-452", "family-v3-471", "family-v3-472", "family-v3-473", "family-v3-474", "family-v3-475", "family-v3-476", "family-v3-477", "family-v3-478", "family-v3-479", "family-v3-480", "family-v3-481", "family-v3-482", "family-v3-483", "family-v3-484", "family-v3-485", "family-v3-486", "family-v3-487", "family-v3-488", "family-v3-489", "family-v3-490", "family-v3-491", "family-v3-492", "family-v3-493", "family-v3-494", "family-v3-495", "family-v3-496", "family-v3-497", "family-v3-498", "family-v3-499", "family-v3-500", "family-v3-501", "family-v3-502", "family-v3-503", "family-v3-504", "family-v3-505", "family-v3-506", "family-v3-507", "family-v3-508", "family-v3-509", "family-v3-510", "family-v3-511", "family-v3-512", "family-v3-513", "family-v3-514", "family-v3-515", "family-v3-516", "family-v3-517", "family-v3-518", "family-v3-519", "family-v3-520", "family-v3-521", "family-v3-522", "family-v3-523"]);
// the retired definitions stay readable (artwork repair, recipes a family kept) but are no longer offered
const RETIRED_REFERENCE_RECIPES=RECIPES.filter(r=>RETIRED_REFERENCE_IDS.has(r.id));
for(const list of [RECIPES,WESTERN_HEALTHY_RECIPES,PLANT_RECIPES]){const keep=list.filter(r=>!RETIRED_REFERENCE_IDS.has(r.id));list.length=0;list.push(...keep)}

// v1.7.10 (Henry's choice, 7 Nov 2026): English for the reference recipes' prep and steps — a faithful translation of
// the existing Vietnamese text (same dishes, amounts, times and temperatures; nothing added). Family-authored recipes are
// never translated (they are [data-user-content]). It ships with the lazy recipe data; translateRecipeViToEn (language.ts) looks up exact sentences.
const RECIPE_TEXT_EN:Record<string,string>={"Chia sườn thành miếng vừa ăn; chuẩn bị hỗn hợp nước mắm và đường.": "Cut the ribs into bite-size pieces; mix the fish sauce and sugar.", "Làm sạch sườn và để ráo. Băm tỏi, cắt hành lá.": "Clean the ribs and drain. Mince the garlic and cut the spring onion.", "Ướp sườn với một phần nước mắm, đường và tỏi khoảng 20 phút trong ngăn mát.": "Marinate the ribs with part of the fish sauce, the sugar and garlic for about 20 minutes in the fridge.", "Phi phần tỏi còn lại với dầu, cho sườn vào đảo săn. Thêm nước vừa đủ, đậy nắp và nấu đến khi sườn chín mềm.": "Fry the rest of the garlic in oil, add the ribs and toss until firm. Add just enough water, cover and cook until the ribs are tender.", "Mở nắp, rim cho sốt sánh; nêm lại theo khẩu vị, thêm hành lá.": "Uncover and simmer until the sauce thickens; season to taste and add the spring onion.", "Thái gừng thành sợi, chia gà thành miếng.": "Cut the ginger into thin strips and the chicken into pieces.", "Làm sạch gà, để ráo. Thái gừng và băm tỏi.": "Clean the chicken and drain. Slice the ginger and mince the garlic.", "Ướp gà với gừng, nước mắm và đường trong ngăn mát khoảng 15 phút.": "Marinate the chicken with the ginger, fish sauce and sugar in the fridge for about 15 minutes.", "Phi tỏi, đảo gà săn; thêm nước vừa đủ và kho đến khi thịt chín hoàn toàn.": "Fry the garlic, toss the chicken until firm; add just enough water and braise until the meat is fully cooked.", "Mở nắp cho sốt sánh nhẹ, nếm và điều chỉnh gia vị.": "Uncover so the sauce thickens slightly; taste and adjust the seasoning.", "Thấm khô cá trước khi áp chảo để bề mặt vàng đẹp.": "Pat the fish dry before pan-frying so it browns nicely.", "Kiểm tra và bỏ xương dăm, thấm khô cá.": "Check for and remove fine bones; pat the fish dry.", "Nêm nhẹ muối, tiêu. Làm nóng chảo với dầu.": "Season lightly with salt and pepper. Heat the pan with oil.", "Đặt cá vào chảo, áp chảo từng mặt đến khi cá chín hoàn toàn; điều chỉnh lửa để không cháy.": "Put the fish in the pan and fry each side until fully cooked; adjust the heat so it does not burn.", "Thêm tỏi ở cuối, dùng cùng rau và cơm.": "Add the garlic at the end; serve with vegetables and rice.", "Luộc trứng và bóc vỏ trước; cắt thịt miếng vừa ăn.": "Boil and peel the eggs first; cut the meat into bite-size pieces.", "Luộc chín trứng và bóc vỏ. Cắt thịt, băm tỏi.": "Hard-boil and peel the eggs. Cut the meat and mince the garlic.", "Ướp thịt với nước mắm, đường và tỏi trong ngăn mát.": "Marinate the meat with fish sauce, sugar and garlic in the fridge.", "Cho thịt vào nồi đảo săn, thêm nước dừa và nước vừa đủ. Kho lửa nhỏ đến khi thịt chín mềm.": "Toss the meat in the pot until firm, add the coconut water and just enough water. Braise over low heat until the meat is tender.", "Cho trứng vào kho tiếp để thấm vị; nếm lại trước khi dùng.": "Add the eggs and keep braising so they take on the flavour; taste before serving.", "Thái bò mỏng ngang thớ; chia bông cải thành miếng nhỏ.": "Slice the beef thinly across the grain; cut the broccoli into small florets.", "Thái bò, cắt hành tây và bông cải.": "Slice the beef, cut the onion and broccoli.", "Ướp bò với một ít nước tương và tỏi trong ngăn mát.": "Marinate the beef with a little soy sauce and garlic in the fridge.", "Xào bò nhanh với dầu rồi lấy ra. Cho rau vào xào đến độ mềm mong muốn.": "Stir-fry the beef quickly in oil, then take it out. Stir-fry the vegetables until as tender as you like.", "Cho bò trở lại chảo, thêm nước tương, đảo đến khi chín và dùng ngay.": "Return the beef to the pan, add soy sauce, toss until cooked and serve at once.", "Bóc vỏ hoặc cắt gọn tôm, bỏ chỉ lưng.": "Peel or trim the prawns and remove the vein.", "Sơ chế tôm và để ráo, băm tỏi.": "Prepare the prawns and drain; mince the garlic.", "Phi tỏi với dầu rồi thêm tôm, đảo đều.": "Fry the garlic in oil, then add the prawns and toss well.", "Thêm nước mắm, đường và một ít nước; rim đến khi tôm chín và sốt bám nhẹ.": "Add fish sauce, sugar and a little water; simmer until the prawns are cooked and lightly coated in sauce.", "Nếm lại và dùng nóng.": "Taste again and serve hot.", "Cắt đậu thành miếng; băm nhỏ cà chua.": "Cut the tofu into pieces; finely chop the tomatoes.", "Cắt đậu và thấm khô, cắt cà chua và hành lá.": "Cut the tofu and pat dry; cut the tomatoes and spring onion.", "Áp chảo đậu với một phần dầu cho vàng nhẹ.": "Pan-fry the tofu in part of the oil until lightly golden.", "Nấu cà chua với phần dầu còn lại, nước tương, đường và ít nước thành sốt.": "Cook the tomatoes with the rest of the oil, soy sauce, sugar and a little water into a sauce.", "Cho đậu vào sốt, nấu thấm vị, rắc hành lá.": "Add the tofu to the sauce, simmer until it takes on the flavour and sprinkle with spring onion.", "Băm sả mịn; cắt gà thành miếng đều.": "Mince the lemongrass finely; cut the chicken into even pieces.", "Sơ chế gà, băm sả và tỏi, cắt hành tây.": "Prepare the chicken, mince the lemongrass and garlic, cut the onion.", "Ướp gà với một phần sả, nước mắm và đường trong ngăn mát.": "Marinate the chicken with part of the lemongrass, fish sauce and sugar in the fridge.", "Phi tỏi và sả còn lại với dầu, cho gà vào đảo đều.": "Fry the garlic and remaining lemongrass in oil, add the chicken and toss well.", "Thêm chút nước nếu cần, nấu gà chín hoàn toàn rồi thêm hành tây, nêm lại.": "Add a little water if needed, cook the chicken through, then add the onion and season again.", "Kiểm tra xương cá; cắt cà chua miếng nhỏ.": "Check the fish for bones; cut the tomatoes into small pieces.", "Làm sạch cá, kiểm tra xương; sơ chế cà chua và hành.": "Clean the fish and check for bones; prepare the tomatoes and onion.", "Nấu cà chua với dầu cho mềm, thêm nước mắm, đường và nước.": "Cook the tomatoes in oil until soft, add fish sauce, sugar and water.", "Cho cá vào, kho lửa nhỏ đến khi chín và thấm vị; hạn chế đảo làm nát cá.": "Add the fish and braise over low heat until cooked and flavoured; stir as little as possible so the fish stays whole.", "Nêm lại và thêm hành lá trước khi dùng.": "Season again and add spring onion before serving.", "Đập trứng vào bát riêng, thái nhỏ hành lá.": "Crack the eggs into a separate bowl; finely slice the spring onion.", "Đập trứng, thêm hành lá và nước mắm rồi đánh đều.": "Crack the eggs, add the spring onion and fish sauce and beat well.", "Làm nóng chảo, thêm dầu và đổ trứng vào.": "Heat the pan, add oil and pour in the eggs.", "Hạ lửa, chiên đến khi trứng chín đều cả hai mặt.": "Lower the heat and fry until the egg is cooked through on both sides.", "Cắt miếng vừa ăn và dùng nóng.": "Cut into bite-size pieces and serve hot.", "Băm thịt hoặc dùng thịt xay; thái nấm.": "Mince the pork or use minced pork; slice the mushrooms.", "Băm thịt và hành tây, trộn với một phần nước tương và tiêu, vo viên nhỏ.": "Mince the pork and onion, mix with part of the soy sauce and pepper, and roll into small balls.", "Áp chảo thịt viên với dầu cho săn mặt.": "Pan-fry the meatballs in oil until firm on the outside.", "Thêm nấm, nước tương còn lại và ít nước. Đậy nắp nấu đến khi thịt chín hoàn toàn.": "Add the mushrooms, the rest of the soy sauce and a little water. Cover and cook until the meat is fully cooked.", "Nấu sốt sánh vừa và nếm lại.": "Cook until the sauce is lightly thick and taste again.", "Tước xơ đậu que, thái bò ngang thớ.": "String the green beans; slice the beef across the grain.", "Thái bò mỏng, cắt đậu que và cà rốt.": "Slice the beef thinly, cut the green beans and carrot.", "Xào bò với dầu và tỏi đến khi săn rồi lấy ra.": "Stir-fry the beef with oil and garlic until firm, then take it out.", "Xào rau đến khi chín, thêm chút nước nếu cần.": "Stir-fry the vegetables until cooked, adding a little water if needed.", "Cho bò trở lại, nêm nước tương và đảo đến khi chín.": "Return the beef, season with soy sauce and toss until cooked.", "Gọt và cắt bí đỏ thành miếng đều.": "Peel the pumpkin and cut it into even pieces.", "Gọt bí đỏ và cắt miếng, băm thịt và hành.": "Peel the pumpkin and cut into pieces; mince the meat and onion.", "Đun nước, cho thịt vào khuấy tơi và hớt bọt.": "Bring water to the boil, add the meat, stir to break it up and skim off the foam.", "Cho bí vào nấu đến mềm; nêm nước mắm và muối vừa ăn.": "Add the pumpkin and cook until soft; season with fish sauce and salt to taste.", "Thêm hành lá, tắt bếp và dùng nóng.": "Add the spring onion, turn off the heat and serve hot.", "Rửa rau, sơ chế và cắt nhỏ tôm.": "Wash the greens; prepare and chop the prawns.", "Rửa rau, cắt vừa ăn; sơ chế tôm.": "Wash the greens and cut to bite size; prepare the prawns.", "Đun nước với gừng, thêm tôm và nấu chín.": "Bring water to the boil with ginger, add the prawns and cook through.", "Cho rau vào nấu đến độ mềm mong muốn.": "Add the greens and cook until as tender as you like.", "Nêm nhẹ nước mắm và muối, dùng nóng.": "Season lightly with fish sauce and salt; serve hot.", "Sơ chế cá và kiểm tra xương; cắt rau củ.": "Prepare the fish and check for bones; cut the vegetables.", "Sơ chế cá, cắt cà chua, dứa và đậu bắp.": "Prepare the fish; cut the tomatoes, pineapple and okra.", "Đun nước với dứa và cà chua cho ra vị chua tự nhiên.": "Boil water with the pineapple and tomatoes for a natural sour taste.", "Cho cá vào nấu chín, thêm đậu bắp và gia vị.": "Add the fish and cook through, then the okra and seasoning.", "Nếm lại độ chua ngọt; kiểm tra xương khi chia phần cho trẻ.": "Taste the sweet-sour balance again; check for bones when serving children.", "Gọt bí, cắt miếng; chuẩn bị thịt bằm.": "Peel the squash and cut into pieces; prepare the minced pork.", "Gọt bí và cắt miếng, băm thịt.": "Peel the squash and cut into pieces; mince the pork.", "Đun nước và cho thịt vào, khuấy tơi.": "Bring water to the boil, add the pork and stir to break it up.", "Thêm bí, nấu chín mềm rồi nêm nhẹ.": "Add the squash, cook until soft and season lightly.", "Rắc hành lá và dùng nóng.": "Sprinkle with spring onion and serve hot.", "Thái nấm, cà rốt và đậu hũ.": "Slice the mushrooms, carrot and tofu.", "Sơ chế nấm, cắt đậu và cà rốt.": "Prepare the mushrooms; cut the tofu and carrot.", "Đun nước, cho cà rốt và nấm vào nấu chín.": "Bring water to the boil, add the carrot and mushrooms and cook through.", "Thêm đậu, nấu nhẹ để không vỡ; nêm nước tương và muối.": "Add the tofu and simmer gently so it does not break; season with soy sauce and salt.", "Thêm hành lá và dùng nóng.": "Add the spring onion and serve hot.", "Cắt cà chua, đánh trứng trong bát.": "Cut the tomatoes; beat the eggs in a bowl.", "Cắt cà chua, thái hành và đánh trứng.": "Cut the tomatoes, slice the onion and beat the eggs.", "Xào cà chua với dầu cho mềm, thêm nước và đun sôi.": "Stir-fry the tomatoes in oil until soft, add water and bring to the boil.", "Rót trứng từ từ, khuấy nhẹ và nấu đến chín.": "Pour in the egg slowly, stir gently and cook until set.", "Nêm muối, thêm hành lá và dùng ngay.": "Season with salt, add spring onion and serve at once.", "Cắt bắp cải và cà rốt, chuẩn bị thịt.": "Cut the cabbage and carrot; prepare the meat.", "Rửa và cắt bắp cải, thái cà rốt; băm thịt.": "Wash and cut the cabbage, slice the carrot; mince the meat.", "Đun nước, cho thịt và cà rốt vào nấu.": "Bring water to the boil, add the meat and carrot and cook.", "Thêm bắp cải, nấu đến độ mềm mong muốn.": "Add the cabbage and cook until as tender as you like.", "Nêm nước mắm và muối, dùng nóng.": "Season with fish sauce and salt; serve hot.", "Gọt khoai và cà rốt thành miếng đều.": "Peel the potatoes and carrot and cut into even pieces.", "Sơ chế gà, cắt khoai tây và cà rốt.": "Prepare the chicken; cut the potatoes and carrot.", "Cho gà vào nước, đun sôi rồi hớt bọt.": "Put the chicken in water, bring to the boil and skim off the foam.", "Thêm khoai và cà rốt, nấu đến khi gà chín hoàn toàn và rau củ mềm.": "Add the potatoes and carrot and cook until the chicken is fully cooked and the vegetables are soft.", "Nêm muối vừa ăn, thêm hành lá.": "Season with salt to taste and add spring onion.", "Tách lá cải thìa, rửa kỹ phần gốc.": "Separate the bok choy leaves and wash the bases well.", "Sơ chế cải thìa, nấm và gừng.": "Prepare the bok choy, mushrooms and ginger.", "Đun nước với gừng, thêm nấm và nấu chín.": "Bring water to the boil with ginger, add the mushrooms and cook through.", "Cho cải thìa vào nấu vừa mềm.": "Add the bok choy and cook until just tender.", "Nêm muối và nước tương, dùng nóng.": "Season with salt and soy sauce; serve hot.", "Cắt đậu và rau củ thành miếng vừa ăn.": "Cut the tofu and vegetables into bite-size pieces.", "Cắt cà rốt, bông cải và đậu.": "Cut the carrot, broccoli and tofu.", "Đun nước, thêm cà rốt trước để nấu mềm.": "Bring water to the boil and add the carrot first to soften.", "Cho bông cải và đậu vào nấu chín.": "Add the broccoli and tofu and cook through.", "Nêm muối, nước tương và dùng nóng.": "Season with salt and soy sauce; serve hot.", "Nhặt rau, rửa sạch và để ráo; đập dập tỏi.": "Pick over the greens, wash and drain; crush the garlic.", "Nhặt và rửa rau, cắt đoạn; đập dập tỏi.": "Pick over and wash the greens, cut into lengths; crush the garlic.", "Làm nóng dầu, phi tỏi thơm nhẹ.": "Heat the oil and fry the garlic until lightly fragrant.", "Cho rau vào đảo đều, thêm ít nước nếu cần và xào chín.": "Add the greens and toss well, adding a little water if needed, and stir-fry until cooked.", "Nêm nhẹ muối, đảo đều và dùng ngay.": "Season lightly with salt, toss and serve at once.", "Chia bông cải thành miếng nhỏ đều nhau.": "Cut the broccoli into small, even florets.", "Rửa bông cải, chia miếng vừa ăn.": "Wash the broccoli and cut into bite-size florets.", "Đun nước với ít muối.": "Bring water to the boil with a little salt.", "Cho bông cải vào luộc đến độ mềm mong muốn.": "Boil the broccoli until as tender as you like.", "Vớt ra để ráo và dùng nóng.": "Lift out, drain and serve hot.", "Tách và rửa lá cải, thái nấm.": "Separate and wash the leaves; slice the mushrooms.", "Rửa cải thìa và nấm, băm tỏi.": "Wash the bok choy and mushrooms; mince the garlic.", "Phi tỏi với dầu rồi thêm nấm, xào chín.": "Fry the garlic in oil, then add the mushrooms and stir-fry until cooked.", "Cho cải vào đảo đều, thêm chút nước nếu cần.": "Add the bok choy and toss well, adding a little water if needed.", "Nêm nước tương và xào đến khi rau chín.": "Season with soy sauce and stir-fry until the greens are cooked.", "Thái sợi bắp cải và cà rốt.": "Shred the cabbage and carrot.", "Thái bắp cải và cà rốt, băm tỏi.": "Slice the cabbage and carrot; mince the garlic.", "Làm nóng dầu, phi tỏi nhẹ.": "Heat the oil and fry the garlic lightly.", "Cho cà rốt vào xào trước, sau đó thêm bắp cải.": "Stir-fry the carrot first, then add the cabbage.", "Xào đến chín, nêm muối và dùng nóng.": "Stir-fry until cooked, season with salt and serve hot.", "Tước xơ đậu, cắt đoạn và băm tỏi.": "String the beans, cut into lengths and mince the garlic.", "Nhặt và rửa đậu, cắt đoạn; băm tỏi.": "Pick over and wash the beans, cut into lengths; mince the garlic.", "Phi tỏi với dầu, thêm đậu và đảo đều.": "Fry the garlic in oil, add the beans and toss well.", "Thêm ít nước, đậy nắp nấu đậu chín.": "Add a little water, cover and cook until the beans are done.", "Nêm nước tương, đảo lại và dùng nóng.": "Season with soy sauce, toss again and serve hot.", "Nhặt và rửa rau nhiều lần, cắt đoạn.": "Pick over the greens, wash several times and cut into lengths.", "Nhặt rau và rửa sạch, cắt đoạn vừa ăn.": "Pick over and wash the greens; cut into bite-size lengths.", "Cho phần thân rau vào trước, tiếp theo là lá.": "Add the stems first, then the leaves.", "Luộc đến độ mềm mong muốn và vớt ra.": "Boil until as tender as you like and lift out.", "Rửa sạch rau củ, dùng dao và thớt sạch riêng.": "Wash the vegetables well; use a separate clean knife and board.", "Rửa sạch dưa leo và cà chua dưới nước sạch.": "Wash the cucumber and tomatoes under clean water.", "Dùng dao và thớt sạch, cắt miếng vừa ăn.": "With a clean knife and board, cut into bite-size pieces.", "Trộn nhẹ với dầu và một chút muối ngay trước khi dùng.": "Toss gently with oil and a pinch of salt just before serving.", "Chia phần và dùng cùng món chính.": "Divide into portions and serve with the main dish.", "Làm sạch nấm, thái hành tây thành múi mỏng.": "Clean the mushrooms; cut the onion into thin wedges.", "Sơ chế nấm, hành tây và tỏi.": "Prepare the mushrooms, onion and garlic.", "Làm nóng dầu, phi tỏi rồi cho nấm vào xào.": "Heat the oil, fry the garlic, then add the mushrooms and stir-fry.", "Thêm hành tây, xào đến khi nấm chín và hành mềm.": "Add the onion and stir-fry until the mushrooms are cooked and the onion is soft.", "Nêm nước tương, đảo đều và dùng nóng.": "Season with soy sauce, toss well and serve hot.", "Dùng gà đã chín và nước dùng có sẵn; không tính thời gian tự hầm nước dùng.": "Uses cooked chicken and ready-made broth; the time does not include making your own broth.", "Nướng hoặc áp chảo gừng, hành tây cho thơm, cho vào nước dùng và đun nóng.": "Char or pan-toast the ginger and onion until fragrant, add them to the broth and heat.", "Trụng bánh phở theo hướng dẫn trên bao bì. Xé gà chín, rửa rau thơm.": "Blanch the pho noodles following the packet. Shred the cooked chicken; wash the herbs.", "Cho gà vào nước dùng, đun nóng kỹ; nêm nước mắm vừa ăn.": "Add the chicken to the broth and heat it thoroughly; season with fish sauce to taste.", "Chia bánh phở, gà và nước dùng ra tô; thêm hành, rau thơm, chanh theo ý thích.": "Divide the noodles, chicken and broth into bowls; add spring onion, herbs and lime as you like.", "Dùng nước dùng có sẵn; thái bò mỏng và nấu chín trong nồi.": "Uses ready-made broth; slice the beef thinly and cook it in the pot.", "Đun nước dùng với gừng và hành tây áp chảo.": "Heat the broth with ginger and pan-toasted onion.", "Trụng bánh phở, chuẩn bị rau thơm và hành lá.": "Blanch the pho noodles; prepare the herbs and spring onion.", "Cho thịt bò thái mỏng vào nồi, nấu chín hoàn toàn.": "Add the thinly sliced beef to the pot and cook it through.", "Chia bánh phở, thịt và nước dùng ra tô, thêm rau thơm.": "Divide the noodles, beef and broth into bowls and add the herbs.", "Dùng thịt heo xay; vo viên nhỏ để nấu nhanh, không thay cho giò sống truyền thống.": "Uses minced pork; small balls cook quickly and do not replace traditional pork paste.", "Trộn thịt xay với chút nước mắm, tiêu, vo thành viên nhỏ.": "Mix the minced pork with a little fish sauce and pepper and roll into small balls.", "Đun nước dùng, thêm thịt viên và nấu chín hoàn toàn.": "Heat the broth, add the meatballs and cook them through.", "Thêm nấm đã sơ chế, nấu chín; trụng bún theo bao bì.": "Add the prepared mushrooms and cook; blanch the vermicelli following the packet.", "Chia bún và nước dùng ra tô, thêm hành lá.": "Divide the vermicelli and broth into bowls and add spring onion.", "Dùng phi lê cá đã bỏ xương và nước dùng có sẵn.": "Uses boned fish fillet and ready-made broth.", "Cắt cá miếng vừa ăn, kiểm tra xương; cắt cà chua, gừng và hành.": "Cut the fish into bite-size pieces and check for bones; cut the tomatoes, ginger and onion.", "Xào mềm cà chua với dầu, thêm gừng và nước dùng.": "Stir-fry the tomatoes in oil until soft, then add the ginger and broth.", "Cho cá vào nấu chín, nêm nước mắm.": "Add the fish, cook through and season with fish sauce.", "Trụng bún rồi chia ra tô, chan nước cá cà chua và thêm hành.": "Blanch the vermicelli, divide into bowls, ladle over the tomato fish broth and add onion.", "Sơ chế tôm bỏ chỉ lưng; dùng nước dùng có sẵn.": "Devein the prawns; uses ready-made broth.", "Sơ chế tôm, rau cải và hành.": "Prepare the prawns, greens and onion.", "Đun nước dùng với gừng, cho tôm vào nấu chín.": "Heat the broth with ginger, add the prawns and cook through.", "Thêm rau cải, nấu mềm vừa và nêm nước mắm.": "Add the greens, cook until just tender and season with fish sauce.", "Trụng bún, chia ra tô rồi chan nước dùng cùng tôm và rau.": "Blanch the vermicelli, divide into bowls and ladle over the broth with the prawns and greens.", "Chọn nước dùng rau củ nếu muốn nấu chay.": "Use vegetable broth for a vegetarian version.", "Cắt đậu hũ, nấm và cà chua.": "Cut the tofu, mushrooms and tomatoes.", "Xào cà chua với dầu cho mềm, thêm nước dùng rau củ.": "Stir-fry the tomatoes in oil until soft, then add the vegetable broth.", "Cho nấm và đậu vào nấu chín, nêm nước tương.": "Add the mushrooms and tofu, cook through and season with soy sauce.", "Trụng bún và chia tô, thêm nước dùng, nấm và đậu.": "Blanch the vermicelli, divide into bowls and add the broth, mushrooms and tofu.", "Dùng hủ tiếu mềm hoặc trụng hủ tiếu khô theo thời gian trên bao bì.": "Use fresh hu tieu noodles, or blanch dried ones for the time on the packet.", "Phi tỏi với dầu, cho thịt bằm vào đảo tơi.": "Fry the garlic in oil, add the minced pork and stir to break it up.", "Thêm nước dùng, đun đến khi thịt chín hoàn toàn.": "Add the broth and heat until the pork is fully cooked.", "Cho cải thìa vào nấu chín, nêm nước mắm.": "Add the bok choy, cook through and season with fish sauce.", "Trụng hủ tiếu, chia tô và chan nước dùng, rắc hành lá.": "Blanch the noodles, divide into bowls, ladle over the broth and sprinkle with spring onion.", "Thái thịt mỏng, sơ chế tôm; dùng nước dùng có sẵn.": "Slice the pork thinly and prepare the prawns; uses ready-made broth.", "Sơ chế tôm và thái thịt thành miếng mỏng.": "Prepare the prawns and slice the pork thinly.", "Đun nước dùng, cho thịt vào nấu chín rồi thêm tôm.": "Heat the broth, cook the pork through, then add the prawns.", "Thêm cải thìa, nấu chín và nêm nước mắm.": "Add the bok choy, cook through and season with fish sauce.", "Trụng hủ tiếu và chia tô, chan nước dùng cùng tôm thịt và rau.": "Blanch the noodles, divide into bowls and ladle over the broth with the prawns, pork and greens.", "Dùng hoành thánh đông lạnh có sẵn; kiểm tra nhãn thành phần và thời gian nấu.": "Uses ready-made frozen wontons; check the ingredient label and cooking time.", "Đun nước dùng; nấu hoành thánh theo hướng dẫn trên bao bì đến chín hoàn toàn.": "Heat the broth; cook the wontons following the packet until fully cooked.", "Trụng mì trứng riêng để nước dùng trong.": "Blanch the egg noodles separately to keep the broth clear.", "Cho cải thìa vào nước dùng, nấu chín rồi nêm nhẹ nước tương.": "Add the bok choy to the broth, cook through and season lightly with soy sauce.", "Chia mì ra tô, thêm hoành thánh, rau, nước dùng và hành lá.": "Divide the noodles into bowls; add the wontons, greens, broth and spring onion.", "Thái gà mỏng; dùng nước dùng có sẵn.": "Slice the chicken thinly; uses ready-made broth.", "Cắt gà, nấm và cà rốt thành miếng vừa ăn.": "Cut the chicken, mushrooms and carrot into bite-size pieces.", "Đun nước dùng, thêm cà rốt và gà, nấu gà chín hoàn toàn.": "Heat the broth, add the carrot and chicken and cook the chicken through.", "Thêm nấm, nấu chín và nêm muối vừa ăn.": "Add the mushrooms, cook through and season with salt to taste.", "Trụng mì riêng, chia ra tô rồi thêm thịt gà, rau và nước dùng.": "Blanch the noodles separately, divide into bowls, then add the chicken, vegetables and broth.", "Thái bò mỏng ngang thớ, cắt rau củ nhỏ.": "Slice the beef thinly across the grain; cut the vegetables small.", "Đun nước dùng với gừng và cà rốt.": "Heat the broth with ginger and carrot.", "Trụng mì riêng theo bao bì.": "Blanch the noodles separately following the packet.", "Thêm bông cải rồi thịt bò; nấu chín hoàn toàn, nêm nước tương.": "Add the broccoli, then the beef; cook through and season with soy sauce.", "Chia mì và các nguyên liệu ra tô, chan nước dùng nóng.": "Divide the noodles and toppings into bowls and ladle over the hot broth.", "Dùng mì udon đóng gói và nước dùng có sẵn.": "Uses packaged udon and ready-made broth.", "Luộc trứng chín, bóc vỏ. Sơ chế nấm và cải.": "Hard-boil and peel the eggs. Prepare the mushrooms and greens.", "Đun nước dùng, thêm nấm và rau, nấu chín.": "Heat the broth, add the mushrooms and greens and cook through.", "Nêm nước tương, thêm mì udon và nấu theo hướng dẫn bao bì.": "Season with soy sauce, add the udon and cook following the packet.", "Chia tô, thêm trứng cắt đôi và hành lá.": "Divide into bowls; add the halved eggs and spring onion.", "Dùng gà chín có sẵn; ngâm miến theo hướng dẫn bao bì.": "Uses ready-cooked chicken; soak the glass noodles following the packet.", "Ngâm hoặc trụng miến theo bao bì, xé gà và thái nấm.": "Soak or blanch the glass noodles following the packet; shred the chicken and slice the mushrooms.", "Đun nước dùng với gừng, thêm nấm và nấu chín.": "Heat the broth with ginger, add the mushrooms and cook through.", "Cho gà chín vào làm nóng kỹ, nêm nước mắm.": "Add the cooked chicken and heat it thoroughly; season with fish sauce.", "Thêm miến vừa đủ mềm rồi chia tô, rắc hành lá.": "Add the glass noodles until just soft, divide into bowls and sprinkle with spring onion.", "Ngâm miến và sơ chế tôm trong lúc chuẩn bị rau.": "Soak the glass noodles and prepare the prawns while you get the vegetables ready.", "Ngâm miến theo bao bì; sơ chế tôm, thái cà rốt và bắp cải.": "Soak the glass noodles following the packet; prepare the prawns, slice the carrot and cabbage.", "Đun nước dùng với cà rốt, thêm tôm và nấu chín.": "Heat the broth with the carrot, add the prawns and cook through.", "Cho bắp cải và miến vào, nấu vừa mềm và nêm nước mắm.": "Add the cabbage and glass noodles, cook until just soft and season with fish sauce.", "Chia ra tô, thêm hành lá và dùng nóng.": "Divide into bowls, add spring onion and serve hot.", "Dùng nước dùng có sẵn; cắt rau củ nhỏ để chín nhanh.": "Uses ready-made broth; cut the vegetables small so they cook quickly.", "Cắt gà và rau củ thành miếng nhỏ.": "Cut the chicken and vegetables into small pieces.", "Luộc nui theo bao bì trong nồi riêng.": "Boil the macaroni in a separate pot following the packet.", "Đun nước dùng, nấu gà và rau củ chín hoàn toàn, nêm nhẹ muối.": "Heat the broth, cook the chicken and vegetables through and season lightly with salt.", "Chia nui ra tô và thêm gà, rau củ, nước dùng và hành lá.": "Divide the macaroni into bowls and add the chicken, vegetables, broth and spring onion.", "Chuẩn bị thịt xay, cắt nhỏ cà chua và cà rốt.": "Prepare the minced pork; chop the tomatoes and carrot small.", "Luộc nui theo hướng dẫn bao bì.": "Boil the macaroni following the packet.", "Xào thịt và cà chua với dầu cho săn, thêm nước dùng và cà rốt.": "Stir-fry the pork and tomatoes in oil until firm, then add the broth and carrot.", "Nấu đến khi thịt chín hoàn toàn và cà rốt mềm, nêm nhẹ muối.": "Cook until the pork is fully cooked and the carrot is soft; season lightly with salt.", "Chia nui ra tô, thêm thịt, rau và nước dùng.": "Divide the macaroni into bowls and add the pork, vegetables and broth.", "Dùng khoảng 600–700 g cơm chín nấu từ 250 g gạo; thời gian 25 phút không bao gồm nấu cơm.": "Uses about 600–700 g of cooked rice from 250 g of raw rice; the 25 minutes do not include cooking the rice.", "Cho cơm chín bảo quản đúng cách vào nước dùng, đun sôi và khuấy tơi.": "Put the properly stored cooked rice into the broth, bring to the boil and stir to loosen it.", "Nấu nhỏ lửa đến độ sánh mong muốn; thêm nước nếu cần.": "Simmer over low heat until as thick as you like; add water if needed.", "Thêm gừng, gà chín xé nhỏ và làm nóng kỹ.": "Add the ginger and the shredded cooked chicken and heat thoroughly.", "Nêm nhẹ muối, thêm hành lá và dùng ngay.": "Season lightly with salt, add spring onion and serve at once.", "Dùng cơm chín từ khoảng 250 g gạo; không tính thời gian nấu cơm.": "Uses cooked rice from about 250 g of raw rice; rice cooking time not included.", "Cắt bí đỏ nhỏ; cho cơm chín bảo quản đúng cách vào nước dùng và đun sôi.": "Cut the pumpkin small; put the properly stored cooked rice into the broth and bring to the boil.", "Thêm bí đỏ, khuấy tơi và nấu đến mềm.": "Add the pumpkin, stir to loosen and cook until soft.", "Cho thịt bằm vào khuấy đều, nấu chín hoàn toàn.": "Stir in the minced pork and cook it through.", "Nêm nhẹ nước mắm, thêm hành lá, điều chỉnh độ đặc bằng nước.": "Season lightly with fish sauce, add spring onion and adjust the thickness with water.", "Dùng cơm chín từ khoảng 250 g gạo; sơ chế tôm và băm cà rốt.": "Uses cooked rice from about 250 g of raw rice; prepare the prawns and finely chop the carrot.", "Đun cơm chín bảo quản đúng cách với nước dùng, khuấy tơi.": "Heat the properly stored cooked rice with the broth, stirring to loosen it.", "Thêm cà rốt băm, nấu đến mềm và cháo sánh.": "Add the chopped carrot and cook until soft and the porridge is thick.", "Cho tôm cắt nhỏ vào nấu chín hoàn toàn.": "Add the chopped prawns and cook them through.", "Nêm nhẹ muối, thêm hành lá và chia tô.": "Season lightly with salt, add spring onion and divide into bowls.", "Dùng gà chín và nước dùng có sẵn; hòa bột bắp với nước nguội.": "Uses cooked chicken and ready-made broth; mix the cornflour with cold water.", "Xé gà, thái nấm; đun nước dùng với bắp và nấm đến chín.": "Shred the chicken and slice the mushrooms; cook the corn and mushrooms in the broth until done.", "Thêm gà chín và làm nóng kỹ.": "Add the cooked chicken and heat thoroughly.", "Hòa bột bắp với nước nguội rồi rót từ từ vào nồi, khuấy đến độ sánh mong muốn.": "Mix the cornflour with cold water, pour slowly into the pot and stir until as thick as you like.", "Rót trứng đánh tan từ từ, khuấy nhẹ và nấu chín; nêm muối, thêm hành.": "Pour in the beaten egg slowly, stir gently and cook until set; season with salt and add onion.", "Chọn nước dùng rau củ; kiểm tra thành phần tương miso.": "Use vegetable broth; check the ingredients of the miso paste.", "Sơ chế nấm, cắt đậu hũ và ngâm rong biển theo bao bì.": "Prepare the mushrooms, cut the tofu and soak the seaweed following the packet.", "Đun nước dùng rau củ, thêm nấm và nấu chín.": "Heat the vegetable broth, add the mushrooms and cook through.", "Cho đậu và rong biển vào, nấu nóng nhẹ.": "Add the tofu and seaweed and heat gently.", "Hòa miso với một ít nước dùng rồi cho lại nồi; chia tô và thêm hành.": "Mix the miso with a little broth and stir it back into the pot; divide into bowls and add onion.", "Chọn nước dùng rau củ, cắt rau củ nhỏ và đều.": "Use vegetable broth; cut the vegetables small and even.", "Xào mềm cà chua với dầu rồi thêm nước dùng rau củ.": "Stir-fry the tomatoes in oil until soft, then add the vegetable broth.", "Cho khoai tây và cà rốt vào nấu đến gần mềm.": "Add the potatoes and carrot and cook until nearly soft.", "Thêm nui và đậu Hà Lan, nấu theo thời gian trên bao bì đến chín.": "Add the macaroni and peas and cook for the time on the packet until done.", "Thêm nước nếu cần, nêm nhẹ muối và chia tô.": "Add water if needed, season lightly with salt and divide into bowls.", "Dùng sợi bánh canh và nước dùng có sẵn; kiểm tra nhãn cá viên.": "Uses ready-made banh canh noodles and broth; check the fish ball label.", "Đun nước dùng, cho cá viên vào nấu theo bao bì đến chín hoàn toàn.": "Heat the broth, add the fish balls and cook following the packet until fully cooked.", "Trụng sợi bánh canh theo thời gian ghi trên bao bì.": "Blanch the banh canh noodles for the time on the packet.", "Thêm cải thìa vào nước dùng, nấu chín rồi nêm nước mắm.": "Add the bok choy to the broth, cook through and season with fish sauce.", "Chia sợi, cá viên và rau ra tô, chan nước dùng và thêm hành.": "Divide the noodles, fish balls and greens into bowls, ladle over the broth and add onion.", "Dùng mì trứng và nước dùng có sẵn.": "Uses egg noodles and ready-made broth.", "Cắt cà chua, sơ chế cải và đánh trứng.": "Cut the tomatoes, prepare the greens and beat the eggs.", "Xào cà chua với dầu cho mềm, thêm nước dùng và đun sôi.": "Stir-fry the tomatoes in oil until soft, add the broth and bring to the boil.", "Cho rau và mì vào nấu theo bao bì; rót trứng vào và nấu chín hoàn toàn.": "Add the greens and noodles and cook following the packet; pour in the egg and cook until fully set.", "Nêm nhẹ muối, điều chỉnh nước và chia ra tô.": "Season lightly with salt, adjust the water and divide into bowls.", "Thấm thật khô miếng cá hồi, ướp muối tiêu hai mặt; khoai tây cắt múi cau; bông cải cắt miếng vừa ăn.": "Pat the salmon very dry and season both sides with salt and pepper; cut the potatoes into wedges and the broccoli into bite-size florets.", "Hấp hoặc luộc chín tới khoai tây (10 phút) và bông cải xanh (3 phút) để giữ màu xanh giòn.": "Steam or boil the potatoes (10 minutes) and broccoli (3 minutes) until just done, so the broccoli stays green and crisp.", "Làm nóng chảo chống dính với dầu, đặt mặt da cá hồi xuống áp chảo lửa vừa 4 phút cho da giòn vàng, lật mặt áp tiếp 2–3 phút cùng tỏi đập dập.": "Heat a non-stick pan with oil and fry the salmon skin side down over medium heat for 4 minutes until the skin is crisp and golden; turn and fry 2–3 minutes more with crushed garlic.", "Đảo nhanh khoai tây và bông cải qua phần dầu tỏi thơm trong chảo 2 phút cho thấm vị.": "Toss the potatoes and broccoli quickly in the garlic oil in the pan for 2 minutes to take on the flavour.", "Bày cá hồi cùng rau củ ra đĩa, vắt nhẹ nước cốt chanh tươi lên mặt cá trước khi thưởng thức.": "Plate the salmon with the vegetables and squeeze a little fresh lemon juice over the fish before eating.", "Để thịt bò hết lạnh hoàn toàn, thấm khô mặt thịt, ướp muối và tiêu đen xay trước khi áp chảo 10 phút.": "Let the beef lose its fridge chill completely, pat the surface dry and season with salt and freshly ground black pepper 10 minutes before searing.", "Khoai tây gọt vỏ cắt múi cau, luộc sơ 7 phút rồi áp chảo vàng giòn các mặt; đậu que tước xơ chần chín tới.": "Peel the potatoes and cut into wedges, parboil 7 minutes, then pan-fry until golden and crisp on all sides; string the green beans and blanch until just done.", "Làm nóng già chảo gang hoặc chảo đáy dày, cho dầu và áp chảo miếng thịt bò cùng tép tỏi đập dập 2.5–3 phút mỗi mặt tùy độ chín mong muốn.": "Heat a cast-iron or heavy-based pan until very hot, add oil and sear the beef with crushed garlic cloves for 2.5–3 minutes per side, depending on how you like it done.", "Lấy thịt bò ra đĩa ấm để nghỉ 5 phút giúp giữ trọn nước ngọt bên trong rồi thái lát dày vừa ăn.": "Rest the beef on a warm plate for 5 minutes to keep its juices, then cut into thick slices.", "Xào nhanh hành tây và đậu que trên chảo vừa áp bò, bày kèm khoai tây và thịt bò.": "Quickly stir-fry the onion and green beans in the pan used for the beef; serve with the potatoes and beef.", "Ức gà lạng đôi cho đều độ dày, ướp muối, tiêu, tỏi băm và chút nước cốt chanh trong 10 phút.": "Butterfly the chicken breast to an even thickness; marinate with salt, pepper, minced garlic and a little lemon juice for 10 minutes.", "Cà rốt và khoai tây cắt miếng vừa ăn, hấp hoặc luộc sơ 6 phút; bông cải xanh rửa sạch để ráo.": "Cut the carrot and potatoes into bite-size pieces and steam or parboil 6 minutes; wash and drain the broccoli.", "Làm nóng chảo với 1 thìa dầu, áp chảo ức gà lửa vừa 4 phút mỗi mặt đến khi vàng ruộm và chín mềm bên trong.": "Heat 1 tablespoon of oil in the pan and fry the chicken breast over medium heat for 4 minutes per side until golden and cooked through.", "Cho khoai tây, cà rốt và bông cải vào chảo đảo đều 4–5 phút cho xém cạnh thơm nhẹ.": "Add the potatoes, carrot and broccoli to the pan and toss for 4–5 minutes until lightly charred at the edges.", "Thái ức gà thành lát vừa ăn, xếp cùng rau củ nóng hổi.": "Slice the chicken breast and arrange with the hot vegetables.", "Cá hồi thấm khô, khử mùi tanh bằng vài lát gừng; bông cải xanh và nấm rửa sạch cắt vừa ăn.": "Pat the salmon dry and freshen it with a few slices of ginger; wash the broccoli and mushrooms and cut to bite size.", "Xếp cá hồi cùng gừng thái sợi lên đĩa sứ sâu lòng, đặt bông cải xanh và nấm xung quanh.": "Place the salmon with shredded ginger on a deep heatproof plate, with the broccoli and mushrooms around it.", "Đun sôi nước trong xửng hấp, cho đĩa cá và rau vào hấp lửa vừa 8–10 phút đến khi cá vừa chín tới mềm ngọt.": "Bring the water in the steamer to the boil and steam the fish and vegetables over medium heat for 8–10 minutes, until the fish is just cooked and tender.", "Xếp hành lá thái sợi lên trên, rưới nước tương pha ấm và 1 thìa nhỏ dầu nóng cho dậy mùi thơm.": "Top with shredded spring onion, pour over warm seasoned soy sauce and 1 teaspoon of hot oil to release the aroma.", "Dùng nóng ngay để giữ trọn vị ngọt tự nhiên và dinh dưỡng.": "Serve hot straight away to keep the natural sweetness and nutrients.", "Ức gà thấm khô ướp muối tiêu; rau xanh, dưa leo, cà chua rửa sạch để thật ráo nước.": "Pat the chicken breast dry and season with salt and pepper; wash the greens, cucumber and tomatoes and drain them very well.", "Áp chảo ức gà với 1 thìa nhỏ dầu ở lửa vừa 4 phút mỗi mặt đến khi chín vàng, để nguội bớt rồi thái lát.": "Pan-fry the chicken breast in 1 teaspoon of oil over medium heat for 4 minutes per side until golden and cooked, let it cool a little, then slice.", "Cắt dưa leo, cà chua vừa ăn, trộn nhẹ với rau xanh và bắp ngọt đã chần chín.": "Cut the cucumber and tomatoes to bite size and toss gently with the greens and the blanched sweetcorn.", "Pha sốt trộn thanh mát gồm nước cốt chanh, 1 thìa dầu, chút muối và tiêu đen.": "Mix a light dressing of lemon juice, 1 tablespoon of oil, a pinch of salt and black pepper.", "Xếp ức gà lên đĩa rau trộn, rưới sốt ngay trước khi ăn để rau giữ độ giòn.": "Lay the chicken on the salad and pour over the dressing just before eating so the greens stay crisp.", "Đậu hũ cắt khối vuông 3cm; nấm rửa sạch thái lát; cải thìa chẻ đôi rửa sạch.": "Cut the tofu into 3 cm cubes; wash and slice the mushrooms; halve and wash the bok choy.", "Chần nhanh cải thìa trong nước sôi 1.5 phút rồi xếp gọn quanh đĩa; chần sơ đậu hũ 1 phút để miếng đậu săn chắc.": "Blanch the bok choy in boiling water for 1.5 minutes and arrange it around the plate; blanch the tofu for 1 minute so it firms up.", "Làm nóng 1 thìa nhỏ dầu, phi thơm tỏi và gừng băm, cho nấm vào xào chín mềm với nước tương và 80ml nước lọc.": "Heat 1 teaspoon of oil, fry the minced garlic and ginger, add the mushrooms and cook until soft with the soy sauce and 80 ml of water.", "Cho đậu hũ vào đảo nhẹ tay 3 phút trên lửa nhỏ để thấm sốt nấm.": "Add the tofu and toss gently for 3 minutes over low heat to take on the mushroom sauce.", "Trút đậu hũ và sốt nấm lên đĩa cải thìa, rắc hành lá thái nhỏ.": "Pour the tofu and mushroom sauce over the bok choy and sprinkle with chopped spring onion.", "Tôm cắt râu, rút chỉ lưng, rửa sạch; sả đập dập cắt khúc; bông cải, cà rốt và nấm cắt vừa ăn.": "Trim the prawn feelers, devein and rinse; crush the lemongrass and cut into lengths; cut the broccoli, carrot and mushrooms to bite size.", "Lót sả đập dập và gừng thái lát dưới đáy xửng hấp, xếp tôm ở một bên và rau củ ở bên cạnh.": "Line the steamer with the crushed lemongrass and sliced ginger; put the prawns on one side and the vegetables beside them.", "Hấp trên lửa vừa 7–8 phút tính từ khi nước sôi đến khi tôm chuyển màu đỏ hồng và rau củ chín giòn ngọt.": "Steam over medium heat for 7–8 minutes from when the water boils, until the prawns turn pink and the vegetables are tender-crisp.", "Pha muối tiêu chanh ớt nhẹ để chấm kèm tôm và rau củ hấp.": "Mix a light salt, pepper, lime and chilli dip for the steamed prawns and vegetables.", "Bày ra đĩa dùng nóng, giữ nguyên vị ngọt tự nhiên không dầu mỡ.": "Plate and serve hot, keeping the natural sweetness with no oil.", "Cắt thịt heo thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Sơ chế rau và gia vị trước khi nấu.": "Cut the pork into thin bite-size pieces, using a separate knife and board for raw food. Prepare the vegetables and seasonings before cooking.", "Cắt thịt heo thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Cut the pork into thin bite-size pieces, using a separate knife and board for raw food. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu thịt heo đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and cook the pork until firm; for tofu, pan-fry gently so the pieces hold.", "Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, rim đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.": "Add the vegetables or sauce ingredients, plus just enough water if needed, and simmer until everything is fully cooked and the vegetables are as tender as you like.", "Nếm và điều chỉnh gia vị, chia phần theo số người ăn. Món ăn kèm cơm và các món rau/canh được chọn riêng.": "Taste and adjust the seasoning; divide by the number of people eating. Serve with rice and the vegetable dishes/soups chosen separately.", "Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, xào đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.": "Add the vegetables or sauce ingredients, plus just enough water if needed, and stir-fry until everything is fully cooked and the vegetables are as tender as you like.", "Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, sốt đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.": "Add the vegetables or sauce ingredients, plus just enough water if needed, and cook in the sauce until everything is fully cooked and the vegetables are as tender as you like.", "Đảo săn thịt heo nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the pork until firm if suitable, then add the recipe's water and seasonings.", "Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, kho đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.": "Add the vegetables or sauce ingredients, plus just enough water if needed, and braise until everything is fully cooked and the vegetables are as tender as you like.", "Cho rau hoặc nguyên liệu làm sốt vào, thêm nước vừa đủ nếu cần, áp chảo đến khi nguyên liệu chín hoàn toàn và rau đạt độ mềm mong muốn.": "Add the vegetables or sauce ingredients, plus just enough water if needed, and pan-fry until everything is fully cooked and the vegetables are as tender as you like.", "Đặt thịt heo cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.": "Place the pork with ginger, onion or lemongrass on a heatproof plate and get the steamer ready.", "Hấp đến khi nguyên liệu chín hoàn toàn; thời gian phụ thuộc độ dày và lượng thực phẩm.": "Steam until fully cooked; the time depends on the thickness and amount of food.", "Cắt thịt gà thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Sơ chế rau và gia vị trước khi nấu.": "Cut the chicken into thin bite-size pieces, using a separate knife and board for raw food. Prepare the vegetables and seasonings before cooking.", "Cắt thịt gà thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Cut the chicken into thin bite-size pieces, using a separate knife and board for raw food. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu thịt gà đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and cook the chicken until firm; for tofu, pan-fry gently so the pieces hold.", "Đảo săn thịt gà nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the chicken until firm if suitable, then add the recipe's water and seasonings.", "Đặt thịt gà cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.": "Place the chicken with ginger, onion or lemongrass on a heatproof plate and get the steamer ready.", "Cắt thịt bò thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Sơ chế rau và gia vị trước khi nấu.": "Cut the beef into thin bite-size pieces, using a separate knife and board for raw food. Prepare the vegetables and seasonings before cooking.", "Cắt thịt bò thành miếng mỏng vừa ăn, dùng dao thớt riêng cho thực phẩm sống. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Cut the beef into thin bite-size pieces, using a separate knife and board for raw food. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu thịt bò đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and cook the beef until firm; for tofu, pan-fry gently so the pieces hold.", "Đảo săn thịt bò nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the beef until firm if suitable, then add the recipe's water and seasonings.", "Đặt thịt bò cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.": "Place the beef with ginger, onion or lemongrass on a heatproof plate and get the steamer ready.", "Kiểm tra xương cá, chia miếng đều và thấm khô. Sơ chế rau và gia vị trước khi nấu.": "Check the fish for bones, cut into even pieces and pat dry. Prepare the vegetables and seasonings before cooking.", "Kiểm tra xương cá, chia miếng đều và thấm khô. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Check the fish for bones, cut into even pieces and pat dry. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu cá trắng đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and cook the white fish until firm; for tofu, pan-fry gently so the pieces hold.", "Đảo săn cá trắng nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the white fish until firm if suitable, then add the recipe's water and seasonings.", "Đặt cá trắng cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.": "Place the white fish with ginger, onion or lemongrass on a heatproof plate and get the steamer ready.", "Bóc vỏ, bỏ chỉ lưng tôm và để ráo. Sơ chế rau và gia vị trước khi nấu.": "Peel and devein the prawns and drain. Prepare the vegetables and seasonings before cooking.", "Bóc vỏ, bỏ chỉ lưng tôm và để ráo. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Peel and devein the prawns and drain. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu tôm đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and cook the prawns until firm; for tofu, pan-fry gently so the pieces hold.", "Đảo săn tôm nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the prawns until firm if suitable, then add the recipe's water and seasonings.", "Đặt tôm cùng gừng, hành hoặc sả vào đĩa chịu nhiệt, chuẩn bị xửng hấp.": "Place the prawns with ginger, onion or lemongrass on a heatproof plate and get the steamer ready.", "Cắt đậu hũ và thấm khô. Sơ chế rau và gia vị trước khi nấu.": "Cut the tofu and pat dry. Prepare the vegetables and seasonings before cooking.", "Cắt đậu hũ và thấm khô. Rửa, cắt rau và băm hoặc thái gia vị trong công thức.": "Cut the tofu and pat dry. Wash and cut the vegetables, and mince or slice the seasonings in the recipe.", "Làm nóng dầu, nấu đậu hũ đến khi săn; nếu là đậu hũ, áp chảo nhẹ để giữ miếng.": "Heat the oil and pan-fry the tofu gently until firm so the pieces hold.", "Đảo săn đậu hũ nếu phù hợp, thêm phần nước và gia vị của công thức.": "Toss the tofu gently if suitable, then add the recipe's water and seasonings.", "Bí đỏ và khoai tây gọt vỏ, rửa sạch, cắt khối vuông 2cm để nhanh chín mềm.": "Peel and wash the pumpkin and potatoes and cut into 2 cm cubes so they soften quickly.", "Làm nóng chút dầu trong nồi, xào thơm hành tây và tỏi băm 2 phút ở lửa vừa cho trong mà không cháy.": "Heat a little oil in the pot and soften the onion and minced garlic for 2 minutes over medium heat until clear but not burnt.", "Cho bí đỏ, khoai tây và nước dùng rau củ vào nồi, đun sôi rồi hạ lửa nhỏ nấu 15 phút đến khi củ mềm nhừ.": "Add the pumpkin, potatoes and vegetable broth, bring to the boil, then simmer on low for 15 minutes until very soft.", "Dùng máy xay hoặc muôi tán nhuyễn mịn hỗn hợp bí đỏ trên lửa nhỏ 2 phút cho sánh mịn.": "Blend or mash the pumpkin mixture smooth over low heat for 2 minutes until creamy.", "Nêm muối và tiêu đen vừa vị, múc ra chén dùng ấm.": "Season with salt and black pepper to taste and serve warm in bowls.", "Thịt bò rửa sạch cắt khối vuông 2.5cm; khoai tây, cà rốt, cà chua và hành tây cắt miếng vừa ăn.": "Wash the beef and cut into 2.5 cm cubes; cut the potatoes, carrot, tomatoes and onion into bite-size pieces.", "Làm nóng dầu trong nồi đáy dày, áp sơ thịt bò cho săn vàng các mặt rồi cho hành tây, tỏi và cà chua vào đảo 3 phút.": "Heat oil in a heavy-based pot, brown the beef on all sides, then add the onion, garlic and tomatoes and stir for 3 minutes.", "Rót nước dùng vào nồi, đun sôi và hớt bọt, hạ lửa nhỏ hầm thịt bò 20 phút cho mềm.": "Pour in the broth, bring to the boil and skim, then simmer the beef on low for 20 minutes until tender.", "Thêm khoai tây và cà rốt vào nấu tiếp 12 phút, sau đó cho đậu Hà Lan vào nấu thêm 3 phút.": "Add the potatoes and carrot and cook 12 minutes more, then add the peas for another 3 minutes.", "Nêm muối và tiêu đen vừa ăn, dùng nóng cùng cơm hoặc bánh mì.": "Season with salt and black pepper to taste; serve hot with rice or bread.", "Ngâm rong biển khô 5 phút cho nở mềm rồi rửa sạch; đậu hũ cắt khối nhỏ; nấm và cà rốt thái mỏng.": "Soak the dried seaweed for 5 minutes until soft, then rinse; cut the tofu into small cubes; slice the mushrooms and carrot thinly.", "Đun sôi 1.2 lít nước với vài lát gừng và cà rốt thái mỏng trong 4 phút.": "Boil 1.2 litres of water with a few slices of ginger and the thinly sliced carrot for 4 minutes.", "Cho nấm vào nấu sôi 3 phút, sau đó thả đậu hũ và rong biển vào nấu lửa vừa thêm 2 phút.": "Add the mushrooms and boil 3 minutes, then add the tofu and seaweed and cook over medium heat 2 minutes more.", "Nêm muối và 1 thìa nhỏ nước tương cho thanh vị, tránh đun rong biển quá lâu.": "Season with salt and 1 teaspoon of soy sauce for a light taste; do not boil the seaweed for too long.", "Rắc hành lá thái nhỏ và tắt bếp, múc ra tô dùng nóng.": "Sprinkle with chopped spring onion, turn off the heat and serve hot in bowls.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the chicken.", "Rửa và cắt phần rau củ. Sơ chế gà; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the chicken; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm gà; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the chicken; cook through.", "Thêm phần rau hoặc nấm còn lại, nấu tới độ mềm phù hợp; đậu hũ cần đảo nhẹ.": "Add the rest of the vegetables or mushrooms and cook until as tender as you like; stir tofu gently.", "Nêm muối vừa ăn, thêm hành lá. Chia canh theo khẩu phần, dùng cùng những món đã chọn.": "Season with salt to taste and add spring onion. Divide the soup into portions and serve with the chosen dishes.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the prawns.", "Rửa và cắt phần rau củ. Sơ chế tôm; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the prawns; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm tôm; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the prawns; cook through.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the fish.", "Rửa và cắt phần rau củ. Sơ chế cá; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the fish; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm cá; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the fish; cook through.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the tofu.", "Rửa và cắt phần rau củ. Sơ chế đậu hũ; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the tofu; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm đậu hũ; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the tofu; cook through.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the eggs.", "Rửa và cắt phần rau củ. Sơ chế trứng; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the eggs; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm trứng; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the eggs; cook through.", "Đánh trứng riêng, rót vào nồi và nấu đến khi trứng chín. Nếu đã cho trứng ở bước trước, kiểm tra lại độ chín.": "Beat the eggs separately, pour into the pot and cook until set. If the eggs went in at an earlier step, check they are cooked.", "Sơ chế bí đỏ, cắt đều để chín cùng lúc; chuẩn bị bò.": "Prepare the pumpkin and cut it evenly so it cooks at the same time; prepare the beef.", "Rửa và cắt phần rau củ. Sơ chế bò; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the beef; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm bò; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the beef; cook through.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị thịt bằm.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the minced pork.", "Rửa và cắt phần rau củ. Sơ chế thịt bằm; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the minced pork; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm thịt bằm; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the minced pork; cook through.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the chicken.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the prawns.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the fish.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the tofu.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the eggs.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị bò.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the beef.", "Sơ chế bí xanh, cắt đều để chín cùng lúc; chuẩn bị cá viên.": "Prepare the winter melon and cut it evenly so it cooks at the same time; prepare the fish balls.", "Rửa và cắt phần rau củ. Sơ chế cá viên; cá cần kiểm tra xương, thịt cần cắt nhỏ hoặc băm.": "Wash and cut the vegetables. Prepare the fish balls; check fish for bones, cut meat small or mince it.", "Đun nước vừa đủ cho 4 người. Cho nguyên liệu lâu mềm vào trước, sau đó thêm cá viên; nấu chín hoàn toàn.": "Bring enough water for 4 people to the boil. Add the slower-cooking ingredients first, then the fish balls; cook through.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị thịt bằm.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the minced pork.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the chicken.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the prawns.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the fish.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the tofu.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the eggs.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị bò.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the beef.", "Sơ chế rau cải, cắt đều để chín cùng lúc; chuẩn bị cá viên.": "Prepare the Asian greens and cut them evenly so they cook at the same time; prepare the fish balls.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị thịt bằm.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the minced pork.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the chicken.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the prawns.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the fish.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the tofu.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the eggs.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị bò.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the beef.", "Sơ chế cải thìa, cắt đều để chín cùng lúc; chuẩn bị cá viên.": "Prepare the bok choy and cut it evenly so it cooks at the same time; prepare the fish balls.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị thịt bằm.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the minced pork.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the chicken.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the prawns.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the fish.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the tofu.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the eggs.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị bò.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the beef.", "Sơ chế nấm cà rốt, cắt đều để chín cùng lúc; chuẩn bị cá viên.": "Prepare the mushrooms and carrot and cut them evenly so they cook at the same time; prepare the fish balls.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị thịt bằm.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the minced pork.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị gà.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the chicken.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị tôm.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the prawns.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị cá.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the fish.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị đậu hũ.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the tofu.", "Sơ chế bắp cải, cắt đều để chín cùng lúc; chuẩn bị trứng.": "Prepare the cabbage and cut it evenly so it cooks at the same time; prepare the eggs.", "Bông cải xanh tách nhánh vừa ăn, ngâm rửa sạch; nấm thái lát; cà rốt tỉa hoa thái mỏng.": "Cut the broccoli into bite-size florets, soak and wash; slice the mushrooms; cut the carrot into thin flower shapes.", "Chần bông cải xanh và cà rốt trong nước sôi 1.5 phút rồi vớt ngay ra để ráo giúp rau xanh giòn và không cần dùng nhiều dầu.": "Blanch the broccoli and carrot in boiling water for 1.5 minutes and drain at once, so they stay green and crisp and need little oil.", "Làm nóng 1 thìa nhỏ dầu trên chảo, phi thơm tỏi băm rồi cho nấm vào xào 2 phút với 2 thìa nước lọc.": "Heat 1 teaspoon of oil in the pan, fry the minced garlic, then add the mushrooms and stir-fry 2 minutes with 2 tablespoons of water.", "Cho bông cải xanh và cà rốt vào đảo nhanh lửa lớn 1.5 phút cùng nước tương.": "Add the broccoli and carrot and toss quickly over high heat for 1.5 minutes with the soy sauce.", "Tắt bếp và bày ra đĩa khi rau củ vừa chín tới giòn ngọt.": "Turn off the heat and plate as soon as the vegetables are tender-crisp.", "Sơ chế và cắt rau củ; phần lâu chín nên cắt nhỏ hơn.": "Prepare and cut the vegetables; cut the slower-cooking ones smaller.", "Rửa và cắt rau củ đều nhau; nấm làm sạch, đậu hũ cắt miếng nếu có.": "Wash the vegetables and cut them evenly; clean the mushrooms and cut the tofu, if using.", "Làm nóng dầu, phi tỏi hoặc gừng. Cho phần rau củ lâu chín vào trước, thêm chút nước nếu cần.": "Heat the oil and fry garlic or ginger. Add the slower-cooking vegetables first, with a little water if needed.", "Cho phần rau còn lại vào, xào đến chín, thêm nước tương vừa ăn.": "Add the rest of the vegetables, stir-fry until cooked and add soy sauce to taste.", "Chia phần và dùng cùng món chính. Khẩu phần món này có thể chia nhỏ khi bữa có nhiều món rau.": "Divide into portions and serve with the main dish. Portions can be smaller when the meal has several vegetable dishes.", "Đun nước trong xửng và cho rau củ vào hấp, tránh chạm trực tiếp vào nước.": "Bring water to the boil in the steamer and steam the vegetables without letting them touch the water.", "Nấu đến độ mềm mong muốn, kiểm tra phần củ đã chín rồi lấy ra.": "Cook until as tender as you like; check the root vegetables are done, then take them out.", "Đun nước với ít muối, cho phần rau củ lâu mềm vào trước.": "Bring water to the boil with a little salt and add the slower-cooking vegetables first.", "Băm nhỏ hành tây, cà rốt, tỏi; cà chua khứa chữ thập trụng sơ bóc vỏ băm nhuyễn.": "Finely chop the onion, carrot and garlic; score the tomatoes with a cross, blanch, peel and chop finely.", "Đun sôi nồi nước có pha 1 thìa cà phê muối, luộc mì Ý 8–10 phút đến độ chín vừa (al dente) rồi vớt ra trộn nhẹ 1 thìa dầu.": "Bring a pot of water with 1 teaspoon of salt to the boil, cook the spaghetti 8–10 minutes until al dente, then drain and toss with 1 tablespoon of oil.", "Làm nóng dầu trên chảo sâu lòng, phi thơm tỏi, hành tây và cà rốt băm 3 phút cho dậy mùi ngọt tự nhiên.": "Heat oil in a deep pan and fry the garlic, onion and chopped carrot for 3 minutes to bring out their natural sweetness.", "Cho thịt bò bằm vào đảo lửa lớn đến khi săn tơi, thêm cà chua băm và 120ml nước luộc mì, hạ lửa nhỏ ninh 12 phút cho sốt sánh đậm.": "Add the minced beef and stir over high heat until browned and crumbly, add the chopped tomatoes and 120 ml of pasta water, then simmer on low for 12 minutes until the sauce is thick and rich.", "Nêm muối, tiêu đen vừa ăn, đảo đều mì với sốt bò bằm nóng hổi hoặc rưới sốt lên từng đĩa mì.": "Season with salt and black pepper to taste; toss the spaghetti with the hot beef sauce or spoon the sauce over each plate.", "Thấm khô phi lê cá hồi, cắt quân cờ 2.5cm, ướp chút muối tiêu; nấm rửa nhanh thái lát.": "Pat the salmon fillet dry, cut into 2.5 cm cubes and season with a little salt and pepper; rinse the mushrooms quickly and slice.", "Luộc mì Ý trong nước sôi có muối khoảng 8–9 phút cho vừa chín tới, giữ lại 80ml nước luộc mì rồi để ráo.": "Cook the spaghetti in salted boiling water for about 8–9 minutes until just done; keep 80 ml of the pasta water and drain.", "Áp chảo cá hồi với chút dầu ở lửa vừa 2 phút mỗi mặt cho vàng thơm bên ngoài mà bên trong vẫn mềm ẩm, gắp ra đĩa.": "Pan-fry the salmon in a little oil over medium heat for 2 minutes per side, golden outside and still moist inside; set aside on a plate.", "Phi thơm tỏi và hành tây băm trên cùng chảo, cho nấm vào xào chín tới rồi rót nước dùng và nước luộc mì vào đun sôi lăn tăn.": "In the same pan fry the minced garlic and onion, add the mushrooms and cook until just done, then pour in the broth and pasta water and bring to a gentle boil.", "Cho mì Ý và cá hồi vào đảo nhẹ tay 1–2 phút cho sốt áo đều sợi mì, rắc tiêu đen và dùng nóng.": "Add the spaghetti and salmon and toss gently for 1–2 minutes so the sauce coats the pasta; sprinkle with black pepper and serve hot.", "Ức gà thấm khô, thái lát vừa ăn ướp muối tiêu; bông cải tách nhánh nhỏ; tỏi thái lát mỏng.": "Pat the chicken breast dry, slice to bite size and season with salt and pepper; cut the broccoli into small florets; slice the garlic thinly.", "Luộc mì Ý trong nước sôi có muối 8 phút; 2 phút cuối cho bông cải xanh vào chần chung rồi vớt ra để ráo, giữ lại 80ml nước luộc.": "Cook the spaghetti in salted boiling water for 8 minutes; add the broccoli for the last 2 minutes, then drain, keeping 80 ml of the cooking water.", "Áp chảo ức gà với 1 thìa dầu ở lửa vừa 3–4 phút mỗi mặt đến khi vàng chín, lấy ra để nghỉ.": "Pan-fry the chicken in 1 tablespoon of oil over medium heat for 3–4 minutes per side until golden and cooked; set aside to rest.", "Phi vàng tỏi lát ở lửa nhỏ cho thơm dịu, cho nấm vào xào săn với chút muối và nước luộc mì.": "Fry the sliced garlic gently over low heat until golden and fragrant, add the mushrooms and stir-fry with a pinch of salt and the pasta water.", "Trộn mì Ý, bông cải và ức gà vào chảo, đảo đều trên lửa vừa 1 phút, rắc tiêu đen xay.": "Add the spaghetti, broccoli and chicken to the pan, toss over medium heat for 1 minute and grind over black pepper.", "Dùng nước dùng có sẵn; thời gian không tính hầm nước dùng. Trụng sợi theo bao bì.": "Uses ready-made broth; the time does not include making broth. Blanch the noodles following the packet.", "Sơ chế nguyên liệu đạm, kiểm tra xương nếu có cá; rau củ rửa và cắt vừa ăn.": "Prepare the protein and check fish for bones; wash the vegetables and cut to bite size.", "Đun nước dùng, cho phần rau củ lâu mềm và thịt bằm vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the minced pork and cook through. The eggs can be boiled separately.", "Trụng hoặc nấu phở theo hướng dẫn trên bao bì. Cho rau còn lại vào nước dùng, nấu vừa chín.": "Blanch or cook the pho noodles following the packet. Add the rest of the vegetables to the broth and cook until just done.", "Nêm nhẹ, chia sợi và các nguyên liệu ra tô, chan nước dùng nóng, thêm hành lá. Đây là món nước làm bữa chính; cơm và món khác được chọn riêng.": "Season lightly, divide the noodles and toppings into bowls, ladle over the hot broth and add spring onion. This noodle soup is the main meal; rice and other dishes are chosen separately.", "Đun nước dùng, cho phần rau củ lâu mềm và gà vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the chicken and cook through. The eggs can be boiled separately.", "Đun nước dùng, cho phần rau củ lâu mềm và tôm vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the prawns and cook through. The eggs can be boiled separately.", "Đun nước dùng, cho phần rau củ lâu mềm và cá vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the fish and cook through. The eggs can be boiled separately.", "Đun nước dùng, cho phần rau củ lâu mềm và đậu hũ vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the tofu and cook through. The eggs can be boiled separately.", "Đun nước dùng, cho phần rau củ lâu mềm và trứng vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the eggs and cook through. The eggs can be boiled separately.", "Đun nước dùng, cho phần rau củ lâu mềm và bò vào nấu chín hoàn toàn. Trứng có thể luộc chín riêng.": "Heat the broth, add the slower-cooking vegetables and the beef and cook through. The eggs can be boiled separately.", "Trụng hoặc nấu bún theo hướng dẫn trên bao bì. Cho rau còn lại vào nước dùng, nấu vừa chín.": "Blanch or cook the vermicelli following the packet. Add the rest of the vegetables to the broth and cook until just done.", "Trụng hoặc nấu hủ tiếu theo hướng dẫn trên bao bì. Cho rau còn lại vào nước dùng, nấu vừa chín.": "Blanch or cook the hu tieu noodles following the packet. Add the rest of the vegetables to the broth and cook until just done.", "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu và cá hộp tính sau khi để ráo. Rửa rau, để ráo; dùng dao thớt riêng cho thực phẩm sống.": "Reference recipe for 4 serves. Weigh the edible part; weigh canned beans and fish after draining. Wash and drain the vegetables; use a separate knife and board for raw food.", "Đun nước sôi, luộc phần mì khô trong công thức theo thời gian trên bao bì; giữ lại 150 ml nước luộc rồi để ráo.": "Bring water to the boil and cook the recipe's dried pasta for the time on the packet; keep 150 ml of the cooking water and drain.", "Nấu cà chua băm với tỏi 15 phút cho thành sốt; tắt lửa rồi xé húng quế vào, dùng Parmesan lúc trộn mì.": "Cook the chopped tomatoes with garlic for 15 minutes into a sauce; turn off the heat, tear in the basil and add Parmesan when tossing the pasta.", "Trộn mì đã luộc với phần sốt/nước xào; thêm nước luộc từng ít một để sốt áo đều, không biến thành món nước.": "Toss the cooked pasta with the sauce; add the cooking water a little at a time so the sauce coats the pasta without turning into soup.", "nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất.": "Season to taste within the listed salt, pepper and sauce ingredients. Add basil/oregano/cheese only if they are in the list; divide into exactly four serves.", "Phi tỏi lát nhẹ lửa trong dầu, không để cháy; thêm vỏ chanh bào mỏng và nước cốt, rắc húng quế sau khi trộn mì.": "Fry the sliced garlic gently in the oil without burning; add finely grated lemon zest and juice, and sprinkle basil after tossing the pasta.", "Bóc vỏ bỏ chỉ tôm; phi tỏi, nấu cà chua mềm rồi thêm tôm đến chín đục; thêm chanh và húng quế lúc trộn mì.": "Peel and devein the prawns; fry the garlic, cook the tomatoes until soft, then add the prawns until opaque; add lemon and basil when tossing the pasta.", "Nấu cà chua và tỏi thành sốt, thêm ô liu thái lát, oregano và cá ngừ đã để ráo; đun nóng kỹ rồi trộn mì.": "Cook the tomatoes and garlic into a sauce, add sliced olives, oregano and the drained tuna; heat thoroughly, then toss with the pasta.", "Áp chảo gà thái mỏng đến chín hoàn toàn, thêm bí ngòi xào vừa mềm; thêm nước chanh, nước mì và Parmesan để tạo sốt nhẹ.": "Pan-fry the thinly sliced chicken until fully cooked, add the zucchini and stir-fry until just soft; add lemon juice, pasta water and Parmesan for a light sauce.", "Kiểm tra gà đạt 75°C ở phần dày nhất; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất.": "Check the chicken reaches 75°C at the thickest part; season to taste within the listed salt, pepper and sauce ingredients. Add basil/oregano/cheese only if they are in the list; divide into exactly four serves.", "Xào hành, tỏi và nấm đến bay nước; rót kem, đun lăn tăn 3 phút rồi khuấy Parmesan vào lửa nhỏ, không đun sôi mạnh.": "Stir-fry the onion, garlic and mushrooms until their liquid evaporates; pour in the cream, simmer 3 minutes, then stir in the Parmesan over low heat without boiling hard.", "Thái thịt heo hạt lựu, áp chảo đến chín; đánh trứng với Parmesan. Trộn cùng mì và chút nước mì trên lửa nhỏ, đảo liên tục đến sốt đạt 71°C; không để sốt sống.": "Dice the pork and pan-fry until cooked; beat the eggs with the Parmesan. Toss with the pasta and a little pasta water over low heat, stirring constantly until the sauce reaches 71°C; do not leave the sauce raw.", "Luộc đậu lăng trong nước 20–25 phút cho mềm; xào hành, tỏi, cà rốt rồi nấu cà chua, thêm đậu và oregano tạo sốt đặc.": "Boil the lentils for 20–25 minutes until soft; stir-fry the onion, garlic and carrot, then cook the tomatoes and add the lentils and oregano for a thick sauce.", "Xay hoặc giã húng quế, tỏi, Parmesan với dầu và ít nước mì; trộn ngoài bếp để giữ màu xanh, thêm nước chanh vừa đủ. Không dùng hạt hoặc sốt pesto mua sẵn.": "Blend or pound the basil, garlic and Parmesan with the oil and a little pasta water; mix off the heat to keep it green and add just enough lemon juice. Do not use nuts or bought pesto.", "Băm bò, trộn bánh mì vụn và trứng thành 16 viên; áp chảo rồi nấu trong cà chua tỏi oregano đến giữa viên đạt 71°C.": "Mince the beef and mix with breadcrumbs and egg into 16 balls; brown them, then cook in the tomato, garlic and oregano sauce until the centre reaches 71°C.", "Áp chảo cà tím cắt khối cho mềm, nấu cùng cà chua và tỏi; trộn penne, thêm mozzarella xé và húng quế lúc nóng.": "Pan-fry the cubed eggplant until soft and cook it with the tomatoes and garlic; toss with the penne and add torn mozzarella and basil while hot.", "Xào gà thái miếng đến chín, thêm hành và ớt chuông; nấu cà chua cùng oregano thành sốt rồi trộn penne.": "Stir-fry the sliced chicken until cooked, add the onion and capsicum; cook the tomatoes with oregano into a sauce and toss with the penne.", "Áp chảo cá hồi đến chín, xào măng tây với tỏi; thêm kem đun lăn tăn rồi nhẹ tay trộn penne, cá hồi và ít chanh.": "Pan-fry the salmon until cooked and stir-fry the asparagus with garlic; add the cream, simmer, then gently toss with the penne, salmon and a little lemon.", "Nấu cà chua tỏi 12 phút, cho đậu trắng chín vào đun nóng; trộn penne và húng quế, không thêm thịt.": "Cook the tomatoes and garlic for 12 minutes, add the cooked white beans and heat through; toss with the penne and basil, no meat added.", "Băm bò, xào tơi đến chín hoàn toàn; thêm bí ngòi, cà chua và oregano, nấu 12 phút để làm sốt.": "Mince the beef and stir-fry until crumbly and fully cooked; add the zucchini, tomatoes and oregano and cook 12 minutes for the sauce.", "Chần bông cải 3 phút. Đun bơ với bột mì 1 phút, rót sữa từ từ khuấy mịn, đun sánh rồi thêm Parmesan và bông cải.": "Blanch the broccoli 3 minutes. Cook the butter with the flour 1 minute, pour in the milk slowly and whisk smooth, cook until thick, then add the Parmesan and broccoli.", "Xào tỏi và ớt chuông, cho tôm đã sơ chế vào nấu chín; trộn penne với ít nước mì và nước chanh, không dùng sốt kem.": "Stir-fry the garlic and capsicum, add the prepared prawns and cook through; toss the penne with a little pasta water and lemon juice, no cream sauce.", "Xào nấm và tỏi cho thơm, thêm cà chua nấu mềm; cho rau cải đã cắt vào nấu chín trước khi trộn penne.": "Stir-fry the mushrooms and garlic until fragrant, add the tomatoes and cook until soft; add the cut greens and cook through before tossing with the penne.", "Rửa rau bằng nước sạch, để thật ráo. Đậu/cá hộp để ráo và cân đúng phần ăn được; dùng thớt sạch riêng cho rau ăn sống.": "Wash the vegetables in clean water and drain very well. Drain canned beans/fish and weigh the edible part; use a separate clean board for raw salad vegetables.", "Luộc penne và đậu que riêng theo độ chín, làm nguội nhanh rồi trộn cá ngừ để ráo, cà chua, ô liu với dầu và nước chanh.": "Boil the penne and green beans separately until done, cool quickly, then toss with the drained tuna, tomatoes and olives, oil and lemon juice.", "Trộn phần sốt từ đúng nguyên liệu trong công thức, rưới vào rau ngay trước khi dùng. Trộn nhẹ để giữ miếng rau và đạm.": "Mix the dressing from exactly the recipe's ingredients and pour it over just before serving. Toss gently to keep the vegetables and protein whole.", "Luộc penne rồi làm nguội; cắt ớt chuông, dưa leo và trộn cùng đậu gà chín, húng quế, dầu và nước chanh.": "Boil the penne and cool; cut the capsicum and cucumber and toss with the cooked chickpeas, basil, oil and lemon juice.", "Làm nóng nước dùng của công thức trong nồi riêng; thái nhỏ rau và băm hành, tỏi nếu có.": "Heat the recipe's broth in a separate pot; chop the vegetables and mince the onion and garlic, if used.", "Xào hành và nấm, lấy một nửa nấm ra. Đảo gạo arborio với phần còn lại 2 phút trước khi châm nước dùng; cuối cùng trộn bơ, Parmesan và nấm đã để riêng.": "Stir-fry the onion and mushrooms and take out half the mushrooms. Toss the arborio rice with the rest for 2 minutes before adding the broth; finally stir in the butter, Parmesan and the reserved mushrooms.", "Thêm nước dùng nóng từng vá vào gạo arborio, khuấy nhẹ; chờ gần cạn mới thêm tiếp. Nấu khoảng 18–22 phút đến khi hạt chín vừa và hỗn hợp sánh, thêm nước nóng nếu cần.": "Add the hot broth to the arborio rice one ladle at a time, stirring gently; wait until it is nearly absorbed before adding more. Cook about 18–22 minutes until the rice is just done and creamy, adding hot water if needed.", "Xào hành và bí đỏ hạt lựu; thêm gạo arborio đảo 2 phút. Bí đỏ mềm hòa vào nước gạo tạo màu cam; trộn Parmesan và húng quế khi gạo chín.": "Stir-fry the onion and diced pumpkin; add the arborio rice and stir 2 minutes. The soft pumpkin melts into the rice for an orange colour; stir in the Parmesan and basil when the rice is cooked.", "Áp chảo tôm đã sơ chế đến chín rồi để riêng. Xào hành, đảo gạo; sau khi gạo chín cùng nước dùng, trộn lại tôm, Parmesan và chanh.": "Pan-fry the prepared prawns until cooked and set aside. Stir-fry the onion and toast the rice; once the rice is cooked with the broth, stir the prawns back in with the Parmesan and lemon.", "Xào gà hạt lựu đến chín, thêm hành và gạo. Châm nước dùng từng vá; cho đậu Hà Lan vào 5 phút cuối, khuấy Parmesan khi gạo chín.": "Stir-fry the diced chicken until cooked, add the onion and rice. Add the broth one ladle at a time; add the peas for the last 5 minutes and stir in the Parmesan when the rice is cooked.", "Cắt măng tây đoạn ngắn, chần sơ và để riêng. Xào hành và gạo; trộn măng tây, Parmesan cùng chanh vào khi cơm risotto vừa chín.": "Cut the asparagus short, blanch briefly and set aside. Stir-fry the onion and rice; stir in the asparagus, Parmesan and lemon when the risotto is just cooked.", "Xào hành và cà chua băm cho mềm rồi đảo gạo; nấu với nước dùng từng ít. Cuối cùng trộn mozzarella và húng quế cho vừa tan.": "Stir-fry the onion and chopped tomatoes until soft, then toss in the rice; cook adding the broth a little at a time. Finally stir in the mozzarella and basil until just melted.", "Áp chảo cá hồi đến chín hoàn toàn, chia miếng để riêng. Xào hành, gạo và bí ngòi; nấu với nước dùng, trộn cá hồi và chanh sau cùng.": "Pan-fry the salmon until fully cooked, break into pieces and set aside. Stir-fry the onion, rice and zucchini; cook with the broth and fold in the salmon and lemon last.", "Xào hành và gạo, châm nước dùng từng vá; gần cuối thêm đậu trắng chín, rau cải và Parmesan, nấu rau chín rồi mới dùng.": "Stir-fry the onion and rice and add the broth one ladle at a time; near the end add the cooked white beans, greens and Parmesan and cook until the greens are done before serving.", "Làm nóng lò 190°C. Chuẩn bị lá lasagna theo hướng dẫn trên bao bì; dùng khay chịu nhiệt vừa cho bốn suất.": "Heat the oven to 190°C. Prepare the lasagne sheets following the packet; use an ovenproof dish that fits four serves.", "Xào bò bằm, hành, tỏi rồi nấu với cà chua 15 phút. Nồi khác đun bơ với bột, rót sữa khuấy sánh; dùng cả sốt bò và sốt sữa để xếp lớp.": "Stir-fry the minced beef, onion and garlic, then cook with the tomatoes for 15 minutes. In another pot cook butter with flour, pour in milk and whisk until thick; use both the beef sauce and the white sauce for the layers.", "Xếp xen kẽ lá lasagna và nhân/sốt, kết thúc bằng phần phô mai trong công thức. Đậy giấy bạc, nướng 25 phút rồi mở giấy nướng tiếp 10–15 phút đến khi lá mì mềm; để nghỉ 10 phút trước khi cắt.": "Layer the lasagne sheets and filling/sauce in turn, ending with the recipe's cheese. Cover with foil, bake 25 minutes, then uncover and bake 10–15 minutes more until the sheets are soft; rest 10 minutes before cutting.", "Áp chảo cà tím và bí ngòi lát mỏng đến mềm. Nấu sốt cà chua tỏi, xếp lớp với rau, lá mì, mozzarella và húng quế.": "Pan-fry the thinly sliced eggplant and zucchini until soft. Make a tomato-garlic sauce and layer it with the vegetables, lasagne sheets, mozzarella and basil.", "Nấu gà thái nhỏ và nấm đến chín. Đun bơ với bột, rót sữa khuấy sánh; dùng sốt trắng phủ đều mỗi lớp mì và nhân gà nấm.": "Cook the diced chicken and mushrooms until done. Cook butter with flour, pour in milk and whisk until thick; spread the white sauce over each layer of sheets and chicken-mushroom filling.", "Luộc đậu lăng mềm 20–25 phút. Nấu hành, cà rốt, cà chua, oregano thành sốt rồi trộn đậu; dùng sốt hơi lỏng để lá mì chín đều.": "Boil the lentils 20–25 minutes until soft. Cook the onion, carrot, tomatoes and oregano into a sauce and stir in the lentils; keep the sauce a little loose so the sheets cook evenly.", "Làm nóng lò 200°C. Cắt bánh mì thành lát dày, đặt trên khay; không làm đế bột hoặc thêm men ngoài công thức.": "Heat the oven to 200°C. Cut the bread into thick slices and put them on a tray; do not make a dough base or add yeast beyond the recipe.", "Băm một nửa cà chua, nấu với tỏi thành sốt; phần còn lại thái lát. Phết sốt lên bánh mì rồi xếp cà chua và mozzarella; húng quế thêm sau khi nướng.": "Chop half the tomatoes and cook with garlic into a sauce; slice the rest. Spread the sauce on the bread, then top with tomato slices and mozzarella; add basil after baking.", "Phủ phần rau/đạm đã sơ chế lên bánh mì, chia đều phô mai; nướng 8–12 phút đến khi bánh nóng giòn và phô mai tan.": "Top the bread with the prepared vegetables/protein, share out the cheese evenly and bake 8–12 minutes until hot and crisp and the cheese melts.", "Nấu cà chua thành sốt; xào gà thái nhỏ và nấm đến chín, phết sốt và xếp nhân cùng oregano lên bánh mì trước khi phủ phô mai.": "Cook the tomatoes into a sauce; stir-fry the diced chicken and mushrooms until cooked, spread the sauce and add the filling and oregano on the bread before the cheese.", "Nấu cà chua băm với hành thành sốt; phết lên bánh mì, thêm cá ngừ để ráo và ô liu thái lát trước khi phủ mozzarella.": "Cook the chopped tomatoes with onion into a sauce; spread on the bread and add the drained tuna and sliced olives before the mozzarella.", "Xào bí ngòi và ớt chuông vừa mềm; nấu cà chua thành sốt, phết lên bánh mì rồi thêm rau, oregano và mozzarella.": "Stir-fry the zucchini and capsicum until just soft; cook the tomatoes into a sauce, spread on the bread, then add the vegetables, oregano and mozzarella.", "Thái cà chua và mozzarella thành lát, xếp xen kẽ với lá húng quế; trộn dầu, nước chanh và chút muối tiêu thành sốt.": "Slice the tomatoes and mozzarella and layer them with basil leaves; mix oil, lemon juice and a pinch of salt and pepper for the dressing.", "Cắt bánh mì nguyên cám thành lát và nướng/áp chảo khô đến giòn nhẹ. Sơ chế phần rau và đạm riêng.": "Slice the wholemeal bread and toast or dry-fry until lightly crisp. Prepare the vegetables and protein separately.", "Nướng bánh mì giòn, chà nhẹ tỏi lên mặt; trộn cà chua hạt lựu, húng quế, dầu và chanh, múc lên bánh ngay lúc ăn.": "Toast the bread crisp and rub it lightly with garlic; mix the diced tomatoes, basil, oil and lemon and spoon onto the bread just before eating.", "Chia nhân lên bánh mì ngay trước khi dùng. Trứng, thịt và cá sống phải được nấu chín trước khi đặt lên bánh.": "Spoon the topping onto the bread just before serving. Eggs, meat and raw fish must be fully cooked before they go on the bread.", "Cắt phần rau củ trong công thức thành miếng nhỏ đều nhau; đậu chín/cá hộp để ráo trước khi cân.": "Cut the recipe's vegetables into small even pieces; drain cooked beans/canned fish before weighing.", "Xào hành và cà rốt, thêm cà chua, nước dùng và oregano; nấu penne trong súp theo bao bì, cho bí ngòi và đậu trắng chín vào cuối.": "Stir-fry the onion and carrot, add the tomatoes, broth and oregano; cook the penne in the soup following the packet and add the zucchini and cooked white beans at the end.", "Thêm lượng nước dùng đã cân; nấu nhỏ lửa đến khi củ hoặc đậu lăng mềm. Với đậu chín, chỉ cần đun nóng kỹ; thêm nước nóng nếu súp quá đặc.": "Add the weighed broth and simmer until the vegetables or lentils are soft. With cooked beans, just heat thoroughly; add hot water if the soup gets too thick.", "Xào hành, tỏi và cà rốt; thêm cà chua, nước dùng, oregano và đậu gà chín, nấu nhỏ lửa 20 phút. Nghiền một ít đậu để tạo độ sánh.": "Stir-fry the onion, garlic and carrot; add the tomatoes, broth, oregano and cooked chickpeas and simmer 20 minutes. Mash a few chickpeas to thicken.", "Làm nóng lò 200°C; cắt củ thành miếng 2 cm. Thấm khô đạm, trộn với lượng dầu và gia vị có trong công thức.": "Heat the oven to 200°C; cut the root vegetables into 2 cm pieces. Pat the protein dry and toss with the recipe's oil and seasonings.", "Luộc sơ khoai và cà rốt 6 phút. Ướp gà với chanh, tỏi và oregano, xếp cùng củ lên khay; phần gà dày cần thêm thời gian và đạt 75°C.": "Parboil the potatoes and carrots 6 minutes. Marinate the chicken with lemon, garlic and oregano and lay it on the tray with the vegetables; thick pieces of chicken need more time and must reach 75°C.", "Xếp nguyên liệu trên khay thành một lớp, nướng 25–35 phút; trở rau giữa chừng. Đạm mỏng hoặc rau nhanh chín được thêm vào sau, kiểm tra nhiệt độ trước khi lấy ra.": "Spread the ingredients on the tray in one layer and roast 25–35 minutes, turning the vegetables halfway. Add thin protein or quick-cooking vegetables later, and check the temperature before taking it out.", "Ướp gà với tỏi và oregano; nướng gà 15 phút trước, sau đó thêm ớt chuông và bí ngòi để rau không nhũn.": "Marinate the chicken with garlic and oregano; roast the chicken 15 minutes first, then add the capsicum and zucchini so the vegetables do not go mushy.", "Dùng thịt heo nạc thái lát dày 2 cm, ướp chanh tỏi oregano; luộc sơ khoai, thêm đậu que vào khay ở 10 phút cuối.": "Use lean pork cut into 2 cm thick slices, marinated with lemon, garlic and oregano; parboil the potatoes and add the green beans to the tray for the last 10 minutes.", "Luộc sơ khoai 8 phút rồi nướng trước 15 phút; thêm bò thái dày 1,5 cm, ớt chuông và hành, nướng đến độ chín phù hợp, dùng thớt sạch chia thịt.": "Parboil the potatoes 8 minutes, then roast them for 15 minutes first; add the beef cut 1.5 cm thick, capsicum and onion and roast until done as you like; cut the meat on a clean board.", "Làm nóng lò 190°C. Kiểm tra xương, thấm khô cá; cắt rau thành miếng vừa ăn.": "Heat the oven to 190°C. Check the fish for bones and pat dry; cut the vegetables to bite size.", "Xếp cá trên cà chua và hành thái mỏng; thêm ô liu, oregano và chanh, phủ giấy bạc để giữ nước rồi nướng chín.": "Lay the fish on thinly sliced tomatoes and onion; add olives, oregano and lemon, cover with foil to keep it moist and bake until cooked.", "Nướng cá và rau 15–20 phút tùy độ dày; cá cần đạt 63°C ở phần dày nhất. Củ lâu chín cần luộc sơ hoặc nướng trước khi cho cá vào.": "Bake the fish and vegetables 15–20 minutes depending on thickness; the fish must reach 63°C at the thickest part. Slow-cooking root vegetables need parboiling or roasting before the fish goes in.", "Xếp cá hồi và măng tây vào khay, rưới dầu, tỏi băm và chanh; nướng đến khi cá đạt 63°C, không thêm sốt kem.": "Lay the salmon and asparagus on the tray, drizzle with oil, minced garlic and lemon, and bake until the fish reaches 63°C; no cream sauce.", "Bóc vỏ bỏ chỉ tôm. Nướng rau trước 15 phút, thêm tôm trộn chanh tỏi và nướng 7–10 phút cuối đến khi tôm chín đục.": "Peel and devein the prawns. Roast the vegetables 15 minutes first, then add the prawns tossed in lemon and garlic and roast the last 7–10 minutes until opaque.", "Cắt đạm và củ thành khối đều; đậu đã chín để ráo. Làm nóng nồi đáy dày với lượng dầu đã cân.": "Cut the protein and vegetables into even chunks; drain the cooked beans. Heat a heavy-based pot with the weighed oil.", "Áp vàng bò khối, xào hành, cà rốt và cà chua; hầm bò nhỏ lửa 75–90 phút đến mềm, cho đậu đỏ chín và oregano vào 10 phút cuối.": "Brown the cubed beef, stir-fry the onion, carrot and tomatoes; simmer the beef on low for 75–90 minutes until tender and add the cooked kidney beans and oregano for the last 10 minutes.", "Thêm lượng nước dùng hoặc cà chua đã cân, đậy hé nắp và hầm nhỏ lửa đến khi đạm chín mềm. Cho phần rau nhanh chín vào sau, thêm nước nóng nếu cần để không khê.": "Add the weighed broth or tomatoes, cover partly and simmer on low until the protein is tender. Add quick-cooking vegetables later and add hot water if needed so it does not catch.", "Xào gà và hành cho săn, thêm nấm và nước dùng; hầm 25 phút, cho đậu trắng chín cùng oregano vào 10 phút cuối.": "Stir-fry the chicken and onion until firm, add the mushrooms and broth; simmer 25 minutes and add the cooked white beans and oregano for the last 10 minutes.", "Xào hành, tỏi và cà tím, thêm cà chua, đậu lăng khô, oregano và nước dùng; hầm 30–35 phút đến khi đậu mềm, không dùng thịt.": "Stir-fry the onion, garlic and eggplant, add the tomatoes, dried lentils, oregano and broth; simmer 30–35 minutes until the lentils are soft, no meat.", "Xào hành, nấu khoai với nước dùng 12 phút rồi thêm bông cải 6 phút; xay mịn, thêm sữa đun nóng nhẹ và khuấy Parmesan.": "Stir-fry the onion, cook the potatoes in the broth 12 minutes, then add the broccoli for 6 minutes; blend smooth, add the milk, warm gently and stir in the Parmesan.", "Nướng cà chua, hành và tỏi 25 phút ở 200°C; cho vào nồi cùng nước dùng, đun 5 phút rồi xay mịn, thêm húng quế sau cùng.": "Roast the tomatoes, onion and garlic 25 minutes at 200°C; put them in a pot with the broth, simmer 5 minutes, blend smooth and add the basil last.", "Xào hành, tỏi và nấm với bơ cho bay nước; rắc bột mì đảo 1 phút rồi thêm nước dùng, nấu 15 phút; thêm kem và xay một phần súp.": "Stir-fry the onion, garlic and mushrooms in butter until the liquid evaporates; sprinkle in the flour and stir 1 minute, add the broth and cook 15 minutes; add the cream and blend part of the soup.", "Xào hành với bơ, thêm khoai và nước dùng nấu mềm; nghiền một phần khoai, thêm bắp và sữa rồi đun lăn tăn 5 phút.": "Stir-fry the onion in butter, add the potatoes and broth and cook until soft; mash some of the potatoes, add the corn and milk and simmer 5 minutes.", "Nấu gà và cà rốt với hành, nước dùng và oregano đến gà chín; xé gà bằng dụng cụ sạch, cho lại nồi cùng đậu trắng chín và đun nóng.": "Cook the chicken and carrot with onion, broth and oregano until the chicken is done; shred the chicken with clean utensils, return it to the pot with the cooked white beans and heat through.", "Xào hành và cà rốt, thêm đậu lăng, cà chua và nước dùng; nấu 25–30 phút đến mềm rồi vắt chanh trước khi chia bát.": "Stir-fry the onion and carrot, add the lentils, tomatoes and broth; cook 25–30 minutes until soft, then squeeze in lemon before serving.", "Đập trứng vào bát riêng để kiểm tra; đánh tan hoặc giữ nguyên theo mô tả món. Rửa và cắt rau trước khi bật bếp.": "Crack the eggs into a separate bowl to check them; beat or keep whole as the dish describes. Wash and cut the vegetables before turning on the stove.", "Nấu hành, tỏi, ớt chuông và cà chua thành sốt 15 phút; tạo tám hõm, đập trứng vào, đậy nắp nấu đến cả lòng trắng và lòng đỏ chín.": "Cook the onion, garlic, capsicum and tomatoes into a sauce for 15 minutes; make eight wells, crack in the eggs, cover and cook until both whites and yolks are set.", "Nấu lửa vừa đến khi trứng chín hẳn; nếu đậy nắp, kiểm tra phần giữa không còn trứng lỏng. Chia thành bốn phần.": "Cook over medium heat until the eggs are fully set; if covered, check the centre has no runny egg. Divide into four portions.", "Xào bí ngòi và hành cho ráo; trộn trứng đã đánh với sữa, feta rồi đổ vào chảo rau, đậy nắp nấu lửa nhỏ đến giữa chín hẳn.": "Stir-fry the zucchini and onion until dry; mix the beaten eggs with milk and feta, pour over the vegetables in the pan, cover and cook on low until the centre is fully set.", "Xào nấm đến bay nước; đổ trứng đánh cùng hành lá, thêm mozzarella, gập trứng khi đã se rồi nấu đến giữa chín hẳn.": "Stir-fry the mushrooms until the liquid evaporates; pour in the eggs beaten with spring onion, add the mozzarella, fold when it sets and cook until the centre is fully set.", "Trộn bột mì và/hoặc yến mạch với trứng, sữa trong công thức; nghỉ bột 10 phút cho hút nước, không thêm đường ngoài danh sách.": "Mix the flour and/or oats with the recipe's eggs and milk; rest the batter 10 minutes to absorb, and add no sugar beyond the list.", "Xay yến mạch thành bột thô; trộn cùng bột mì, trứng, sữa và hành lá. Dùng sữa chua tự nhiên làm sốt khi bánh đã chín.": "Grind the oats into a coarse flour; mix with the flour, eggs, milk and spring onion. Use natural yoghurt as the sauce once the pancakes are cooked.", "Múc bột thành bánh nhỏ, áp chảo chống dính với lượng dầu đã cân ở lửa vừa nhỏ 2–3 phút mỗi mặt; giữa bánh phải chín.": "Spoon the batter into small pancakes and cook in a non-stick pan with the weighed oil over medium-low heat 2–3 minutes per side; the centre must be cooked.", "Luộc trứng chín hoàn toàn rồi thái lát; nghiền quả bơ với chanh, phết lên bánh, thêm cà chua và trứng.": "Hard-boil the eggs and slice them; mash the avocado with lemon, spread on the bread, then add the tomato and egg.", "Trộn cá ngừ để ráo với sữa chua và chanh, xếp xà lách và dưa leo lên bánh rồi thêm nhân; không thêm mayonnaise.": "Mix the drained tuna with yoghurt and lemon, lay lettuce and cucumber on the bread, then add the filling; no mayonnaise.", "Băm nhỏ rau, để ráo nước. Nếu dùng đậu chín, nghiền thô; nếu dùng đạm sống, giữ lạnh đến lúc trộn.": "Finely chop the vegetables and drain. Coarsely mash cooked beans; keep raw protein cold until mixing.", "Băm bò và hành, trộn yến mạch cùng trứng thành miếng dẹt; dùng với xà lách, cà chua và sữa chua sau khi chả đạt 71°C.": "Mince the beef and onion and mix with oats and egg into flat patties; serve with lettuce, tomato and yoghurt once the patties reach 71°C.", "Chia thành tám miếng dẹt, áp chảo với lượng dầu đã cân ở lửa vừa, khoảng 4–5 phút mỗi mặt tùy độ dày; kiểm tra phần giữa chín hoàn toàn.": "Shape into eight flat patties and pan-fry with the weighed oil over medium heat, about 4–5 minutes per side depending on thickness; check the centre is fully cooked.", "Thịt bằm cần đạt 71°C ở giữa; nêm theo khẩu vị từ lượng muối, tiêu và nguyên liệu sốt đã ghi. Chỉ thêm húng quế/oregano/phô mai nếu có trong danh sách; chia đúng bốn suất.": "Minced meat must reach 71°C in the centre; season to taste within the listed salt, pepper and sauce ingredients. Add basil/oregano/cheese only if they are in the list; divide into exactly four serves.", "Băm gà, vắt nhẹ bí ngòi bào, trộn yến mạch, trứng và tỏi; áp chảo đến phần giữa đạt 75°C rồi thêm chanh.": "Mince the chicken, lightly squeeze the grated zucchini, mix with oats, egg and garlic; pan-fry until the centre reaches 75°C, then add lemon.", "Luộc khoai mềm và nghiền; trộn cá ngừ để ráo, trứng, hành và bột thành miếng dẹt. Áp chảo chín hoàn toàn, thêm chanh khi ăn.": "Boil the potatoes until soft and mash; mix with the drained tuna, egg, onion and flour into flat cakes. Pan-fry until fully cooked and add lemon when eating.", "Nghiền đậu gà chín, trộn cà rốt bào, yến mạch, trứng và tỏi; nghỉ 10 phút cho hút ẩm rồi tạo miếng, dùng sữa chua làm sốt.": "Mash the cooked chickpeas, mix with grated carrot, oats, egg and garlic; rest 10 minutes to absorb moisture, then shape; serve with yoghurt as the sauce.", "Cắt rau miếng vuông, xếp feta và ô liu lên trên; pha dầu, chanh và oregano thành sốt, không thêm thịt hoặc bánh mì.": "Cut the vegetables into squares and top with feta and olives; mix oil, lemon and oregano for the dressing, no meat or bread added.", "Luộc khoai cắt khối đến chín, luộc trứng chín; để nguội an toàn rồi trộn cùng dưa leo, hành, sữa chua và chanh.": "Boil the cubed potatoes until done and hard-boil the eggs; cool safely, then toss with cucumber, onion, yoghurt and lemon.", "Áp chảo gà đạt 75°C rồi thái lát; nướng bánh mì hạt lựu giòn. Trộn xà lách, cà chua, gà với sốt sữa chua chanh tỏi, rắc Parmesan và bánh mì.": "Pan-fry the chicken to 75°C and slice; toast the diced bread until crisp. Toss the lettuce, tomatoes and chicken with a lemon-garlic yoghurt dressing and sprinkle with Parmesan and the croutons.", "Tráng và để ráo đậu trắng, cá ngừ; thái hành mỏng, trộn cùng cà chua, húng quế, dầu và chanh ngay trước khi dùng.": "Rinse and drain the white beans and tuna; slice the onion thinly and toss with tomatoes, basil, oil and lemon just before serving.", "Nấu gạo lứt hoặc quinoa theo hướng dẫn trên bao bì bằng nước; khối lượng ghi trong công thức là hạt khô. Để nghỉ 5 phút rồi xới tơi.": "Cook the brown rice or quinoa in water following the packet; the weight in the recipe is dry. Rest 5 minutes, then fluff up.", "Hấp bông cải và cà rốt; áp chảo gà đạt 75°C rồi thái lát. Pha sữa chua với chanh làm sốt, không thêm phô mai.": "Steam the broccoli and carrot; pan-fry the chicken to 75°C and slice. Mix yoghurt with lemon for the sauce, no cheese added.", "Chia ngũ cốc ra bốn bát, xếp đạm và rau đã chuẩn bị lên trên. Pha phần sốt từ nguyên liệu có trong công thức, rưới vừa đủ và dùng ngay.": "Divide the grains among four bowls and top with the prepared protein and vegetables. Mix the sauce from the recipe's ingredients, drizzle just enough and serve at once.", "Nướng cá hồi đến 63°C và hấp măng tây; dưa leo ăn sống dùng dao sạch. Rưới dầu và chanh vừa đủ lên các phần đã chia.": "Bake the salmon to 63°C and steam the asparagus; cut the raw cucumber with a clean knife. Drizzle just enough oil and lemon over each portion.", "Nướng bí đỏ mềm 20–25 phút; hấp rau cải, làm nóng đậu gà chín. Xếp riêng từng phần, trộn chanh và dầu làm sốt.": "Roast the pumpkin 20–25 minutes until soft; steam the greens and warm the cooked chickpeas. Arrange each part separately and mix lemon and oil for the dressing.", "Áp chảo đậu hũ, hấp bông cải và cà rốt; pha nước tương cùng chanh và ít nước làm sốt, không thêm đường.": "Pan-fry the tofu and steam the broccoli and carrot; mix soy sauce with lemon and a little water for the sauce, no sugar added.", "Bóc vỏ bỏ chỉ tôm rồi xào chín với tỏi; xào nhanh bí ngòi, ớt chuông. Chia quinoa đã chín, rưới chanh khi ăn.": "Peel and devein the prawns and stir-fry with garlic until cooked; quickly stir-fry the zucchini and capsicum. Divide the cooked quinoa and add lemon when eating.", "Thái bò mỏng, xào chín với gừng; luộc đậu que và cà rốt rồi chia bát, dùng lượng nước tương đã cân làm sốt.": "Slice the beef thinly and stir-fry with ginger until cooked; boil the green beans and carrot and divide into bowls, using the weighed soy sauce as the sauce.", "Để quinoa chín nguội an toàn; trộn cá ngừ để ráo, quả bơ, dưa leo và cà chua. Pha chanh với dầu, không dùng sốt mayonnaise.": "Let the cooked quinoa cool safely; toss with the drained tuna, avocado, cucumber and tomatoes. Mix lemon with oil, no mayonnaise.", "Làm nóng đậu đỏ chín và bắp; áp chảo ớt chuông, cắt cà chua sống bằng thớt sạch. Chia cùng gạo lứt, rưới chanh.": "Warm the cooked kidney beans and corn; pan-fry the capsicum and cut the raw tomatoes on a clean board. Divide with the brown rice and squeeze over lemon.", "Nấu quinoa theo bao bì rồi làm nguội nhanh; trộn đậu trắng để ráo cùng rau cắt nhỏ, dầu và chanh.": "Cook the quinoa following the packet, then cool quickly; toss the drained white beans with the chopped vegetables, oil and lemon.", "Cắt quả bơ và cà chua, xé xà lách; trộn với đậu gà đã để ráo, nước chanh và dầu ngay trước khi ăn.": "Cut the avocado and tomatoes and tear the lettuce; toss with the drained chickpeas, lemon juice and oil just before eating.", "Hấp cá hồi đến 63°C, tách miếng bằng dụng cụ sạch; trộn rau với sốt sữa chua chanh, đặt cá lên trên.": "Steam the salmon to 63°C and flake it with clean utensils; toss the vegetables with the lemon yoghurt dressing and put the fish on top.", "Luộc hoặc hấp gà đạt 75°C rồi xé; chần rau cải và làm nguội nhanh, trộn với đậu trắng chín, cà chua và nước chanh.": "Boil or steam the chicken to 75°C and shred it; blanch the greens and cool quickly, then toss with the cooked white beans, tomatoes and lemon juice.", "Luộc tôm đã sơ chế đến chín đục; nấu quinoa theo bao bì rồi để nguội an toàn. Trộn cùng rau, húng quế, dầu và chanh.": "Boil the prepared prawns until opaque; cook the quinoa following the packet and cool safely. Toss with the vegetables, basil, oil and lemon.", "Luộc đậu lăng 20–25 phút đến mềm, để ráo và làm nguội; trộn rau, feta, húng quế với dầu và chanh.": "Boil the lentils 20–25 minutes until soft, drain and cool; toss with the vegetables, feta and basil, oil and lemon.", "Hấp bông cải chín vừa, luộc trứng chín hoàn toàn; làm nguội an toàn rồi trộn với dưa leo và sốt sữa chua chanh.": "Steam the broccoli until just done and hard-boil the eggs; cool safely, then toss with cucumber and the lemon yoghurt dressing.", "Nấu bắp chín rồi để nguội, trộn cùng đậu đỏ chín, quả bơ và cà chua; dùng dầu và nước chanh làm sốt.": "Cook the corn and let it cool; toss with the cooked kidney beans, avocado and tomatoes, using oil and lemon juice as the dressing.", "Cà rốt thái lát mỏng chần sơ; đặt cá và rau vào giấy nướng, thêm dầu, oregano và chanh, gấp kín mép rồi nướng cá đến 63°C.": "Slice the carrot thinly and blanch; put the fish and vegetables on baking paper, add oil, oregano and lemon, fold the edges tight and bake until the fish reaches 63°C.", "Chần bông cải 2 phút; xếp cá hồi, bông cải và cà chua lên khay, rưới tỏi dầu và chanh, nướng cá đạt 63°C.": "Blanch the broccoli 2 minutes; lay the salmon, broccoli and tomatoes on a tray, drizzle with garlic oil and lemon and bake until the fish reaches 63°C.", "Ướp gà với sữa chua, chanh và oregano 20 phút trong ngăn mát; nướng gà trước, thêm rau sau 15 phút và kiểm tra gà đạt 75°C. Thời gian món đã gồm ướp.": "Marinate the chicken with yoghurt, lemon and oregano for 20 minutes in the fridge; roast the chicken first, add the vegetables after 15 minutes and check the chicken reaches 75°C. The recipe time includes marinating.", "Thấm khô đậu, trộn với nấm, ớt chuông, tỏi và nước tương; trải một lớp trên khay, nướng 25–30 phút cho nóng chín và xém nhẹ.": "Pat the tofu dry and toss with the mushrooms, capsicum, garlic and soy sauce; spread in one layer on the tray and roast 25–30 minutes until hot and lightly charred.", "Cắt bí đỏ 2 cm và nướng với gà trước; thêm đậu que ở 12 phút cuối, kiểm tra gà đạt 75°C và bí đã mềm.": "Cut the pumpkin into 2 cm pieces and roast with the chicken first; add the green beans for the last 12 minutes, and check the chicken reaches 75°C and the pumpkin is soft.", "Sơ chế tôm, cắt măng tây, trộn với tỏi dầu và chanh; nướng rau trước 10 phút, cho tôm vào nướng tiếp 7–10 phút đến chín đục.": "Prepare the prawns, cut the asparagus and toss with garlic oil and lemon; roast the vegetables 10 minutes first, then add the prawns for 7–10 minutes more until opaque.", "Xào hành, thêm đậu lăng khô, bí đỏ và nước dùng; nấu 25–30 phút cho mềm, cho rau cải vào 5 phút cuối.": "Stir-fry the onion, add the dried lentils, pumpkin and broth; cook 25–30 minutes until soft and add the greens for the last 5 minutes.", "Xào hành rồi thêm cà chua, bí ngòi và nước dùng; nấu rau mềm, thêm đậu trắng chín và oregano đun nóng kỹ.": "Stir-fry the onion, then add the tomatoes, zucchini and broth; cook until the vegetables are soft, add the cooked white beans and oregano and heat through.", "Rửa quinoa rồi cho vào nồi nước dùng với gà, hành và cà rốt; nấu 20 phút, cho bí ngòi vào cuối và kiểm tra gà đạt 75°C.": "Rinse the quinoa and put it in the pot of broth with the chicken, onion and carrot; cook 20 minutes, add the zucchini at the end and check the chicken reaches 75°C.", "Xào tỏi và cà chua, thêm nước dùng cùng đậu gà chín; nấu 10 phút rồi cho bông cải vào nấu chín vừa.": "Stir-fry the garlic and tomatoes, add the broth and cooked chickpeas; cook 10 minutes, then add the broccoli and cook until just done.", "Cho yến mạch và lượng sữa trong công thức vào nồi, thêm nước vừa đủ để yến mạch ngập và có thể khuấy.": "Put the oats and the recipe's milk in a pot and add just enough water to cover the oats so you can stir.", "Nấu nấm trong ít nước đến chín, luộc trứng chín rồi cắt đôi. Cho nấm vào cháo yến mạch, đặt trứng và hành lá lên khi chia phần.": "Cook the mushrooms in a little water until done; hard-boil the eggs and halve them. Stir the mushrooms into the oat porridge and top with egg and spring onion when serving.", "Nấu nhỏ lửa 5–8 phút đến khi yến mạch mềm; khuấy đều và thêm nước nếu đặc. Chia bốn phần và thêm topping đã chuẩn bị.": "Simmer 5–8 minutes until the oats are soft, stirring and adding water if it gets thick. Divide into four portions and add the prepared toppings.", "Trứng cần chín hoàn toàn; chia đúng bốn suất. Không thêm muối, tiêu hoặc đường ngoài công thức.": "Eggs must be fully cooked; divide into exactly four serves. Add no salt, pepper or sugar beyond the recipe.", "Trộn yến mạch với sữa và sữa chua trong công thức; chia vào bốn hộp sạch có nắp.": "Mix the oats with the recipe's milk and yoghurt; divide into four clean containers with lids.", "Yến mạch được ngâm cùng sữa và sữa chua; quả bơ chỉ cắt lúc ăn, trộn ít nước chanh rồi đặt lên các hộp đã ngâm lạnh.": "The oats soak in the milk and yoghurt; cut the avocado only when eating, toss with a little lemon juice and put it on the chilled oats.", "Đậy kín và để ngăn mát qua đêm (ít nhất 6 giờ ở ≤4°C). Thời gian công thức là thời gian thao tác, chưa gồm thời gian chờ lạnh.": "Cover and keep in the fridge overnight (at least 6 hours at ≤4°C). The recipe time is hands-on time and does not include chilling.", "Không thêm đường ngoài công thức. Chia đúng bốn suất; đây là gợi ý ăn uống thông thường, không phải thực đơn điều trị hoặc khẩu phần giảm cân cá nhân.": "Add no sugar beyond the recipe. Divide into exactly four serves; this is everyday eating advice, not a medical or personal weight-loss plan.", "Nghiền đậu trắng chín cùng quả bơ và chanh; phết lên bánh mì nguyên cám rồi xếp cà chua thái lát.": "Mash the cooked white beans with the avocado and lemon; spread on wholemeal bread and top with sliced tomato.", "Hấp bí đỏ chín rồi nghiền mịn; xay yến mạch thành bột, trộn vào bột bánh cùng bí đỏ. Dùng sữa chua không đường làm sốt.": "Steam the pumpkin until done and mash smooth; grind the oats into flour and mix into the batter with the pumpkin. Use unsweetened yoghurt as the sauce.", "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.": "Reference recipe for 4 serves. Weigh the edible part; use cooked, drained beans. Wash the vegetables and utensils; do not swap in fish sauce or meat broth. Nuts must be shelled and unsalted; check labels for allergens.", "Rửa và cắt rau củ, tách phần lâu chín; đậu dùng loại chín để ráo, đậu hũ thấm khô.": "Wash and cut the vegetables, keeping the slow-cooking ones apart; use cooked, drained beans and pat the tofu dry.", "Áp chảo đậu hũ; hấp bông cải. Pha tahini, chanh, tỏi, nước tương với ít nước thành sốt sánh, rưới khi chia phần.": "Pan-fry the tofu; steam the broccoli. Mix tahini, lemon, garlic and soy sauce with a little water into a thick sauce and drizzle it on when serving.", "Dùng lượng dầu và gia vị đã cân, nấu phần lâu chín trước, thêm rau nhanh chín sau; thêm ít nước lọc nếu cần để món không cháy.": "Use the weighed oil and seasonings; cook the slow-cooking parts first and add quick-cooking vegetables later, adding a little water if needed so nothing burns.", "Nấu đến khi rau và đậu nóng chín đều, chia bốn phần. Chỉ dùng gia vị trong danh sách, không dùng nước mắm/nước dùng thịt để nêm.": "Cook until the vegetables and beans are hot and cooked through; divide into four portions. Use only the listed seasonings, no fish sauce or meat broth.", "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt.": "Reference recipe for 4 serves. Weigh the edible part; use cooked, drained beans. Wash the vegetables and utensils; do not swap in fish sauce or meat broth.", "Làm nóng lò 200°C; cắt rau củ thành miếng đều, thấm khô đậu hũ/đậu chín trước khi trộn gia vị.": "Heat the oven to 200°C; cut the vegetables into even pieces and pat the tofu/cooked beans dry before seasoning.", "Luộc sơ khoai và cà rốt 6 phút, trộn đậu hũ cùng mù tạt và chanh rồi nướng với củ.": "Parboil the potatoes and carrot 6 minutes, toss the tofu with mustard and lemon and roast with the vegetables.", "Trải một lớp trên khay, nướng 25–35 phút, trở rau giữa chừng. Rau nhanh chín được thêm vào cuối; phần ngũ cốc nấu riêng theo bao bì nếu có.": "Spread in one layer on the tray and roast 25–35 minutes, turning the vegetables halfway. Add quick-cooking vegetables at the end; cook any grains separately following the packet.", "Chia bốn phần, thêm sốt hoặc hạt trong danh sách sau khi nấu. Không tự thêm phô mai, trứng hoặc thịt.": "Divide into four portions and add the listed sauce or seeds after cooking. Do not add cheese, egg or meat.", "Áp chảo đậu hũ; xào bắp cải cà rốt với tỏi và nước tương, cho đậu trở lại, rắc đậu phộng giã sau cùng.": "Pan-fry the tofu; stir-fry the cabbage and carrot with garlic and soy sauce, return the tofu and sprinkle with crushed peanuts at the end.", "Áp chảo đậu hũ, nấu cùng nấm, gừng, nước tương và tiêu đen đã cân; thêm nước rồi rim nhỏ lửa 12 phút.": "Pan-fry the tofu and cook it with the mushrooms, ginger, soy sauce and the weighed black pepper; add water and simmer on low for 12 minutes.", "Rửa và cắt rau củ nhỏ đều, tách phần lâu chín và phần nhanh chín. Đậu chín để ráo; đậu lăng khô rửa kỹ.": "Wash and cut the vegetables small and even, keeping slow- and quick-cooking ones apart. Drain the cooked beans; rinse dried lentils well.", "Xào hành tỏi gừng, nấu cà chua mềm rồi thêm đậu gà chín và nước dùng rau củ; hầm nhẹ 20 phút.": "Stir-fry the onion, garlic and ginger, cook the tomatoes until soft, then add the cooked chickpeas and vegetable broth; simmer gently 20 minutes.", "Nấu nhỏ lửa đến khi rau và đậu chín mềm; đậu lăng cần khoảng 25–30 phút. Chỉ dùng nước dùng rau củ hoặc nước lọc, thêm nước nóng nếu súp đặc.": "Simmer until the vegetables and beans are soft; lentils need about 25–30 minutes. Use only vegetable broth or water, adding hot water if the soup gets thick.", "Nêm từ lượng gia vị đã ghi và chia bốn phần; bảo quản phần dư trong ngăn mát ≤4°C sau khi làm nguội nhanh.": "Season within the listed amounts and divide into four portions; cool leftovers quickly and keep them in the fridge at ≤4°C.", "Xào tỏi và rau cải đến chín, cho đậu trắng chín vào làm nóng; pha tahini chanh với nước rồi đảo nhẹ lúc tắt bếp.": "Stir-fry the garlic and greens until cooked, add the cooked white beans and heat through; mix the tahini and lemon with water and toss gently once off the heat.", "Xào hành và bí đỏ, nấu với cà chua, oregano và nước dùng rau củ; cho đậu đỏ chín vào sau khi bí mềm.": "Stir-fry the onion and pumpkin, cook with the tomatoes, oregano and vegetable broth; add the cooked kidney beans once the pumpkin is soft.", "Xào hành, nấm và cà chua; thêm đậu lăng khô cùng nước dùng, nấu mềm rồi rắc óc chó băm.": "Stir-fry the onion, mushrooms and tomatoes; add the dried lentils and broth, cook until soft and sprinkle with chopped walnuts.", "Làm nóng lò 190°C. Cắt rau dùng để nhồi và chuẩn bị phần nhân; đậu phải chín trước khi nhồi.": "Heat the oven to 190°C. Cut the vegetables for stuffing and prepare the filling; beans must be cooked before stuffing.", "Nấu quinoa riêng; bổ đôi cà tím, lấy bớt ruột băm và xào với hành, cà chua, oregano; trộn cùng quinoa chín và đậu gà để nhồi.": "Cook the quinoa separately; halve the eggplants, scoop out some flesh, chop it and stir-fry with onion, tomatoes and oregano; mix with the cooked quinoa and chickpeas for the stuffing.", "Nhồi nhân vào phần rau đã chuẩn bị, thêm nước lọc mỏng đáy khay rồi đậy giấy bạc nướng 25 phút; mở giấy nướng thêm 10 phút đến khi rau mềm.": "Fill the prepared vegetables, add a thin layer of water to the tray, cover with foil and bake 25 minutes; uncover and bake 10 minutes more until the vegetables are soft.", "Chia bốn suất; làm nguội nhanh và giữ lạnh phần dư ở ≤4°C. Không tự thêm thịt hoặc phô mai vào nhân.": "Divide into four serves; cool quickly and keep leftovers cold at ≤4°C. Do not add meat or cheese to the filling.", "Nấu gạo lứt trước; cắt đôi bỏ hạt ớt chuông, xào hành và cà chua rồi trộn với cơm, đậu đỏ và bắp làm nhân.": "Cook the brown rice first; halve and seed the capsicums, stir-fry the onion and tomatoes and mix with the rice, kidney beans and corn for the filling.", "Bổ đôi bí ngòi, lấy ruột băm; xào với nấm tỏi và cà chua, trộn đậu trắng nghiền thô làm nhân.": "Halve the zucchini and scoop out and chop the flesh; stir-fry it with mushrooms, garlic and tomatoes and mix with coarsely mashed white beans for the filling.", "Xào nấm và tỏi đến bay nước, cho rau cải vào nấu chín; thêm nước tương rồi rắc óc chó bẻ nhỏ sau cùng.": "Stir-fry the mushrooms and garlic until the liquid evaporates, add the greens and cook through; add soy sauce and sprinkle with broken walnuts at the end.", "Cắt bông cải thành nhánh, trộn tỏi dầu rồi nướng; pha tahini chanh với nước làm sốt, rắc hạt bí sau khi nướng.": "Cut the cauliflower into florets, toss with garlic oil and roast; mix tahini and lemon with water for the sauce and sprinkle pumpkin seeds after roasting.", "Nướng bí đỏ cắt khối với oregano và dầu; hạnh nhân thái hoặc giã thô, thêm ở 5 phút cuối rồi vắt chanh.": "Roast the cubed pumpkin with oregano and oil; slice or roughly crush the almonds, add them for the last 5 minutes and squeeze over lemon.", "Công thức tham khảo cho 4 suất. Cân phần ăn được; đậu dùng loại đã chín, để ráo. Rửa rau và dụng cụ; không tự thay bằng nước mắm hoặc nước dùng thịt. Chọn miso nguyên chất không có dashi/cá. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.": "Reference recipe for 4 serves. Weigh the edible part; use cooked, drained beans. Wash the vegetables and utensils; do not swap in fish sauce or meat broth. Choose pure miso without dashi/fish. Nuts must be shelled and unsalted; check labels for allergens.", "Nướng cà tím bổ đôi 20 phút. Pha miso gừng với nước và chút chanh, phết lên nướng thêm 8 phút, rắc mè.": "Roast the halved eggplants 20 minutes. Mix ginger miso with water and a little lemon, brush on and roast 8 minutes more; sprinkle with sesame.", "Cắt bắp cải miếng dày, áp chảo hai mặt và đậy nắp với ít nước đến mềm; xay đậu phộng với chanh, tỏi và nước tương làm sốt.": "Cut the cabbage into thick wedges, pan-fry both sides, then cover with a little water until soft; blend peanuts with lemon, garlic and soy sauce for the sauce.", "Đậu phải được nấu chín và để ráo trước khi nghiền; băm rau nhỏ, vắt bớt nước ở rau bào.": "Beans must be cooked and drained before mashing; chop the vegetables finely and squeeze grated vegetables to remove some water.", "Luộc đậu lăng mềm rồi để ráo; nghiền với yến mạch, cà rốt bào, hành băm và hạt hướng dương giã thô. Không dùng trứng.": "Boil the lentils until soft and drain; mash with the oats, grated carrot, minced onion and roughly crushed sunflower seeds. No egg.", "Nghỉ hỗn hợp 10 phút cho yến mạch/bột hút ẩm; chia tám miếng dẹt, áp chảo chống dính với lượng dầu đã cân 4–5 phút mỗi mặt đến khi nóng chín ở giữa.": "Rest the mixture 10 minutes so the oats/flour absorb moisture; shape eight flat patties and pan-fry in a non-stick pan with the weighed oil 4–5 minutes per side until hot in the centre.", "Chia bốn suất, chỉ dùng phần sốt và rau ăn kèm được ghi trong danh sách. Không dùng trứng làm chất kết dính nếu công thức không có trứng.": "Divide into four serves, using only the listed sauce and sides. Do not use egg as a binder if the recipe has none.", "Nghiền đậu đỏ chín với yến mạch, hành, tỏi và hạt bí giã; hỗn hợp phải đủ dẻo trước khi tạo miếng.": "Mash the cooked kidney beans with the oats, onion, garlic and crushed pumpkin seeds; the mixture must be firm enough before shaping.", "Vắt đậu hũ bớt nước rồi bóp nhuyễn; trộn cà rốt bào, yến mạch, mè và hành lá thành hỗn hợp dẻo.": "Squeeze some water out of the tofu and crumble it; mix with grated carrot, oats, sesame and spring onion into a firm mixture.", "Xào nấm băm đến ráo, để nguội rồi trộn đậu trắng nghiền, yến mạch, tỏi và óc chó giã; không thêm trứng.": "Stir-fry the chopped mushrooms until dry, cool, then mix with mashed white beans, oats, garlic and crushed walnuts; no egg.", "Rửa hạt theo hướng dẫn; gạo lứt/quinoa/bulgur/couscous trong công thức tính khối lượng khô và nấu/ngâm bằng nước theo bao bì.": "Rinse the grains as directed; the brown rice/quinoa/bulgur/couscous weight in the recipe is dry; cook or soak in water following the packet.", "Ngâm couscous bằng nước nóng theo bao bì rồi xới tơi; áp chảo bí ngòi và ớt chuông, làm nóng đậu gà, rắc hạt bí và chanh.": "Soak the couscous in hot water following the packet and fluff up; pan-fry the zucchini and capsicum, warm the chickpeas and sprinkle with pumpkin seeds and lemon.", "Chia ngũ cốc chín thành bốn phần, thêm rau, đậu và sốt đã nấu. Không tự cộng thêm cơm trắng.": "Divide the cooked grains into four portions and add the vegetables, beans and sauce. Do not add extra white rice.", "Rắc phần hạt/rau thơm có trong danh sách khi dùng; nếu chuẩn bị trước, làm nguội nhanh và giữ lạnh ở ≤4°C.": "Sprinkle the listed seeds/herbs when serving; if made ahead, cool quickly and keep cold at ≤4°C.", "Nấu bulgur bằng nước; xào nấm tỏi đến chín, thêm đậu trắng làm nóng rồi trộn húng quế với hạt đã chín.": "Cook the bulgur in water; stir-fry the mushrooms and garlic until cooked, add the white beans to heat, then toss with basil and the cooked grain.", "Luộc đậu lăng riêng đến mềm, nướng bí đỏ và cà rốt trước rồi thêm bí ngòi; xếp cùng quinoa chín, rưới chanh.": "Boil the lentils separately until soft; roast the pumpkin and carrot first, then add the zucchini; arrange with the cooked quinoa and drizzle with lemon.", "Nấu gạo lứt, hấp bông cải và làm nóng đậu gà; pha tahini chanh với nước rồi rưới lên phần cơm và rau đã chia.": "Cook the brown rice, steam the broccoli and warm the chickpeas; mix tahini and lemon with water and drizzle over the divided rice and vegetables.", "Luộc penne theo bao bì; xay óc chó, tỏi, chanh và ít nước mì thành sốt, trộn cùng nấm đã xào chín. Không dùng kem hoặc phô mai.": "Boil the penne following the packet; blend walnuts, garlic, lemon and a little pasta water into a sauce and toss with the cooked mushrooms. No cream or cheese.", "Luộc spaghetti; xào bí ngòi với tỏi, giã hạnh nhân và húng quế với dầu cùng nước mì làm sốt rồi trộn đều.": "Boil the spaghetti; stir-fry the zucchini with garlic, pound the almonds and basil with oil and pasta water for the sauce, then toss together.", "Nấu udon theo bao bì rồi để ráo; xào nấm và đậu hũ áp chảo, trộn mì với nước tương, mè và hành lá, không chan nước dùng thịt.": "Cook the udon following the packet and drain; stir-fry the mushrooms and pan-fried tofu, toss the noodles with soy sauce, sesame and spring onion, no meat broth.", "Trụng bún, áp chảo đậu hũ; đặt bún, đậu và dưa leo vào lá xà lách để cuốn. Giã đậu phộng với chanh, nước tương và nước làm sốt.": "Blanch the vermicelli and pan-fry the tofu; put the vermicelli, tofu and cucumber in lettuce leaves to roll. Pound peanuts with lemon, soy sauce and water for the sauce.", "Xào hành rồi thêm bí đỏ, đậu lăng khô và nước dùng rau củ; nấu mềm, rắc mè khi chia bát.": "Stir-fry the onion, then add the pumpkin, dried lentils and vegetable broth; cook until soft and sprinkle with sesame when serving.", "Xào hành, nấu bông cải với nước dùng đến mềm; thêm đậu trắng chín, xay mịn một phần, rắc hạt bí lúc ăn.": "Stir-fry the onion and cook the broccoli in the broth until soft; add the cooked white beans, blend part of it smooth and sprinkle pumpkin seeds when eating.", "Đập trứng vào bát riêng để kiểm tra; cắt rau và thấm khô đậu hũ trước khi nấu.": "Crack the eggs into a separate bowl to check them; cut the vegetables and pat the tofu dry before cooking.", "Đánh trứng với 150 ml nước lọc và nước tương; trộn đậu hũ, nấm đã xào ráo, hấp trong bát chịu nhiệt; rắc mè và hành khi chín.": "Beat the eggs with 150 ml of water and soy sauce; mix in the tofu and well-drained stir-fried mushrooms and steam in a heatproof bowl; sprinkle sesame and onion when done.", "Nấu lửa vừa nhỏ và đậy nắp hoặc hấp đến khi phần giữa trứng chín hẳn, không còn lỏng; kiểm tra món nóng chín đều.": "Cook over medium-low heat covered, or steam, until the centre of the egg is fully set and not runny; check it is hot all through.", "Chia bốn phần; đây là món chay có trứng, không gắn nhãn thuần chay. Dùng nóng, không giữ trứng ở nhiệt độ phòng.": "Divide into four portions; this is a vegetarian dish with egg, not labelled vegan. Serve hot; do not leave eggs at room temperature.", "Xào rau cải và hành thật ráo; đổ trứng đánh vào chảo thành lớp mỏng, cuộn cùng rau đã nấu và hạt hướng dương, nấu chín giữa.": "Stir-fry the greens and onion until quite dry; pour the beaten egg into the pan in a thin layer, roll up with the cooked greens and sunflower seeds and cook through the middle.", "Xào ớt chuông mềm, trộn trứng với mè rang và hành lá, đổ vào chảo, gập trứng và nấu chín hoàn toàn.": "Stir-fry the capsicum until soft, mix the eggs with toasted sesame and spring onion, pour into the pan, fold and cook through.", "Xào cà rốt, bí ngòi và tỏi đến chín, thêm đậu gà làm nóng; để bớt nóng rồi thêm sốt sữa chua chanh, không đun sôi sữa chua.": "Stir-fry the carrot, zucchini and garlic until cooked, add the chickpeas to heat; let it cool a little, then add the lemon yoghurt sauce without boiling the yoghurt.", "Nướng cà tím đến mềm; pha sữa chua, chanh và tỏi làm sốt nguội, rưới lên cà rồi rắc hạt bí.": "Roast the eggplant until soft; mix yoghurt, lemon and garlic into a cool sauce, pour over the eggplant and sprinkle with pumpkin seeds.", "Nướng bí đỏ 25 phút, cho đậu trắng chín vào khay 5 phút cuối; thêm sốt sữa chua chanh và mè sau khi lấy ra.": "Roast the pumpkin 25 minutes and add the cooked white beans to the tray for the last 5 minutes; add the lemon yoghurt sauce and sesame after taking it out.", "Xào hành, nấu cà chua thành sốt rồi thêm đậu đỏ; tạo hõm, cho trứng vào đậy nắp nấu chín, rắc hạt bí sau cùng.": "Stir-fry the onion, cook the tomatoes into a sauce and add the kidney beans; make wells, add the eggs, cover and cook through, then sprinkle with pumpkin seeds.", "Nấu đậu lăng và cà chua trong nước dùng đến mềm, thêm rau cải nấu chín; chia bát rồi thêm sữa chua, không đun sôi sau khi thêm.": "Cook the lentils and tomatoes in the broth until soft, add the greens and cook through; divide into bowls and add the yoghurt, without boiling after it goes in.", "Nấu bulgur, xào nấm, luộc trứng chín; xếp trứng cắt đôi trên bulgur, thêm hành và hạt lanh xay.": "Cook the bulgur, stir-fry the mushrooms and hard-boil the eggs; arrange the halved eggs on the bulgur and add onion and ground flaxseed.", "Nấu quinoa và để nguội an toàn; làm nóng đậu gà rồi để bớt nóng, thêm dưa leo, óc chó và sốt sữa chua chanh.": "Cook the quinoa and cool it safely; warm the chickpeas and let them cool a little, then add cucumber, walnuts and the lemon yoghurt sauce.", "Rửa rau ăn sống bằng nước sạch, để ráo; đậu dùng loại đã chín và để ráo trước khi cân. Dùng dao thớt sạch.": "Wash raw salad vegetables in clean water and drain; use cooked beans drained before weighing. Use a clean knife and board.", "Nấu quinoa rồi làm nguội nhanh; cắt táo trộn chút chanh để đỡ thâm, thêm xà lách và óc chó.": "Cook the quinoa and cool quickly; cut the apple and toss with a little lemon to stop browning, then add lettuce and walnuts.", "Trộn các thành phần sốt có trong danh sách bằng bát riêng; trộn nhẹ vào rau hoặc hạt đã nguội ngay trước khi dùng. Không tự thêm phô mai hoặc protein ngoài công thức.": "Mix the listed dressing ingredients in a separate bowl; toss gently into the cooled vegetables or grains just before serving. Do not add cheese or protein beyond the recipe.", "Chia bốn phần. Nếu chuẩn bị trước, để phần sốt và hạt giòn riêng, giữ lạnh phần chín/rau ở ≤4°C và dùng trong ngày.": "Divide into four portions. If made ahead, keep the dressing and crunchy seeds separate and the cooked parts/vegetables cold at ≤4°C; eat the same day.", "Nấu quinoa và để nguội; tách múi cam bỏ hạt, cắt dưa leo, trộn với hạt bí và sốt chanh dầu.": "Cook the quinoa and cool; segment the oranges and remove the seeds, cut the cucumber and toss with pumpkin seeds and a lemon-oil dressing.", "Nấu quinoa, làm nguội rồi trộn đậu đỏ chín, cà chua, dưa leo và mè; pha giấm táo với dầu làm sốt.": "Cook the quinoa, cool, then toss with the cooked kidney beans, tomatoes, cucumber and sesame; mix apple cider vinegar with oil for the dressing.", "Áp chảo bí ngòi rồi làm nguội; trộn với quinoa đã nấu, húng quế và hạt hướng dương, rưới chanh dầu.": "Pan-fry the zucchini and cool; toss with the cooked quinoa, basil and sunflower seeds and drizzle with lemon and oil.", "Nấu quinoa, làm nguội; trộn đậu gà chín, múi cam, xà lách và hạnh nhân giã thô, dùng giấm dầu làm sốt.": "Cook the quinoa and cool; toss with the cooked chickpeas, orange segments, lettuce and roughly crushed almonds, with a vinegar-oil dressing.", "Nấu bulgur theo bao bì rồi làm nguội; cắt nhỏ cà chua dưa leo, trộn với húng quế, mè và chanh dầu.": "Cook the bulgur following the packet and cool; chop the tomatoes and cucumber small and toss with basil, sesame, lemon and oil.", "Nướng cà tím đến mềm rồi làm nguội; trộn với bulgur chín, cà chua và hạt bí, rưới chanh dầu.": "Roast the eggplant until soft and cool; toss with the cooked bulgur, tomatoes and pumpkin seeds and drizzle with lemon and oil.", "Nấu bulgur và làm nguội; trộn đậu trắng chín, dưa leo, húng quế và óc chó với giấm dầu.": "Cook the bulgur and cool; toss the cooked white beans, cucumber, basil and walnuts with vinegar and oil.", "Nấu bulgur rồi để nguội; ngâm nho khô 5 phút trong nước sạch rồi để ráo, thêm táo và hạnh nhân với chanh dầu.": "Cook the bulgur and let it cool; soak the raisins 5 minutes in clean water and drain, then add the apple and almonds with lemon and oil.", "Nướng bí đỏ, chần rau cải và làm nguội; trộn cùng bulgur chín và hạt hướng dương, dùng chanh dầu.": "Roast the pumpkin, blanch the greens and cool; toss with the cooked bulgur and sunflower seeds, using lemon and oil.", "Ngâm couscous theo bao bì rồi xới tơi, làm nguội; trộn múi cam, dưa leo và hạnh nhân, thêm chanh dầu.": "Soak the couscous following the packet, fluff and cool; toss with orange segments, cucumber and almonds and add lemon and oil.", "Ngâm couscous, làm nguội rồi trộn đậu đỏ chín, ớt chuông hạt lựu và hạt bí, rưới giấm dầu.": "Soak the couscous, cool, then toss with the cooked kidney beans, diced capsicum and pumpkin seeds and drizzle with vinegar and oil.", "Ngâm couscous rồi xới tơi, làm nguội; thêm đậu gà chín, cà chua và mè với chanh dầu.": "Soak the couscous, fluff and cool; add the cooked chickpeas, tomatoes and sesame with lemon and oil.", "Áp chảo bí ngòi rồi làm nguội, trộn cùng couscous đã ngâm, húng quế và óc chó, rưới chanh dầu.": "Pan-fry the zucchini and cool, toss with the soaked couscous, basil and walnuts and drizzle with lemon and oil.", "Ngâm couscous theo bao bì; ngâm chia với 100 ml nước 10 phút đến nở, trộn cùng táo, nho khô và chanh khi hạt đã nguội.": "Soak the couscous following the packet; soak the chia in 100 ml of water for 10 minutes until swollen and toss with apple, raisins and lemon once the grain has cooled.", "Nấu gạo lứt rồi làm nguội nhanh; trộn đậu trắng chín, dưa leo và hạt bí với chanh dầu.": "Cook the brown rice and cool quickly; toss the cooked white beans, cucumber and pumpkin seeds with lemon and oil.", "Nấu gạo lứt và bắp riêng, làm nguội nhanh; thêm ớt chuông và hạnh nhân, trộn giấm dầu.": "Cook the brown rice and corn separately and cool quickly; add capsicum and almonds and toss with vinegar and oil.", "Nấu gạo lứt và làm nguội, trộn đậu gà chín, dưa leo, mè và múi cam; dùng ít nước cam cùng dầu làm sốt.": "Cook the brown rice and cool; toss with the cooked chickpeas, cucumber, sesame and orange segments, with a little orange juice and oil as the dressing.", "Xào nấm và chần rau cải đến chín; làm nguội cùng cơm gạo lứt, thêm óc chó và chanh dầu.": "Stir-fry the mushrooms and blanch the greens until cooked; cool with the brown rice and add walnuts, lemon and oil.", "Nấu gạo lứt, nướng bí đỏ; làm nguội nhanh rồi xếp lên xà lách, rắc hạt lanh xay và thêm chanh dầu.": "Cook the brown rice and roast the pumpkin; cool quickly, arrange on lettuce, sprinkle with ground flaxseed and add lemon and oil.", "Luộc đậu lăng 25–30 phút, để ráo làm nguội; trộn táo, dưa leo và óc chó với chanh dầu.": "Boil the lentils 25–30 minutes, drain and cool; toss with apple, cucumber and walnuts with lemon and oil.", "Luộc đậu lăng và hấp cà rốt đến chín, làm nguội; trộn cà chua và hạt bí với giấm dầu.": "Boil the lentils and steam the carrot until cooked, then cool; toss with tomatoes and pumpkin seeds with vinegar and oil.", "Luộc đậu lăng mềm rồi làm nguội, trộn với múi cam, xà lách và hạnh nhân, dùng chanh dầu.": "Boil the lentils until soft, cool, and toss with orange segments, lettuce and almonds, using lemon and oil.", "Pha tahini với chanh và nước làm sốt; trộn đậu gà chín, rau cắt nhỏ và hạt hướng dương ngay trước khi ăn.": "Mix tahini with lemon and water for the sauce; toss the cooked chickpeas, chopped vegetables and sunflower seeds just before eating.", "Nướng cà tím và làm nguội; trộn với đậu trắng chín, cà chua và mè, rưới chanh dầu.": "Roast the eggplant and cool; toss with the cooked white beans, tomatoes and sesame and drizzle with lemon and oil.", "Nấu quinoa và làm nguội; ngâm chia trong 100 ml nước 10 phút rồi trộn với đậu đỏ chín, rau và giấm dầu.": "Cook the quinoa and cool; soak the chia in 100 ml of water for 10 minutes, then toss with the cooked kidney beans, vegetables, vinegar and oil.", "Tráng và để ráo ba loại đậu chín, trộn với ớt chuông, hạt bí và chanh dầu; không dùng đậu sống.": "Rinse and drain the three kinds of cooked beans and toss with capsicum, pumpkin seeds, lemon and oil; do not use raw beans.", "Hấp bông cải cà rốt rồi làm nguội; giã thô đậu phộng, pha nước tương chanh và dầu làm sốt, rắc mè.": "Steam the broccoli and carrot and cool; roughly crush the peanuts, mix soy sauce, lemon and oil for the dressing and sprinkle with sesame.", "Bào bắp cải và cà rốt, thái táo; pha mù tạt, giấm và dầu làm sốt, trộn rồi rắc hạt hướng dương.": "Shred the cabbage and carrot and slice the apple; mix mustard, vinegar and oil for the dressing, toss and sprinkle with sunflower seeds.", "Nướng bí đỏ và chần rau cải; làm nguội rồi trộn hạnh nhân, nho khô với chanh dầu.": "Roast the pumpkin and blanch the greens; cool, then toss with almonds and raisins with lemon and oil.", "Thái dưa leo, tách múi cam, xé xà lách; rắc hạt lanh xay và trộn chanh dầu ngay trước khi ăn.": "Slice the cucumber, segment the oranges and tear the lettuce; sprinkle with ground flaxseed and toss with lemon and oil just before eating.", "Nấu quinoa và luộc trứng chín; làm nguội an toàn, cắt trứng rồi trộn rau với sốt sữa chua chanh, rắc hạt bí.": "Cook the quinoa and hard-boil the eggs; cool safely, cut the eggs and toss the vegetables with the lemon yoghurt sauce; sprinkle with pumpkin seeds.", "Nấu bulgur và làm nguội; trộn cùng đậu trắng chín, cà chua và sốt sữa chua chanh, rắc mè.": "Cook the bulgur and cool; toss with the cooked white beans, tomatoes and the lemon yoghurt sauce and sprinkle with sesame.", "Luộc khoai chín, làm nguội nhanh; pha sữa chua mù tạt giấm thành sốt, trộn với dưa leo và hạt bí.": "Boil the potatoes until cooked and cool quickly; mix yoghurt, mustard and vinegar into a dressing and toss with cucumber and pumpkin seeds.", "Luộc penne và hấp cà rốt rồi làm nguội; trộn rau còn lại với sốt đậu phộng giã, nước tương, chanh và nước.": "Boil the penne and steam the carrot, then cool; toss the rest of the vegetables with a sauce of crushed peanuts, soy sauce, lemon and water.", "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày.": "A batch of dressing for 4 salads, not four main meals. Weigh the ingredients and use clean utensils; make what you will use that day.", "Cân nguyên liệu đúng lượng; rửa chanh/cam trước khi lấy nước, bỏ hạt. Không tự thêm nước mắm, mật ong hoặc mayonnaise.": "Weigh the ingredients exactly; wash lemons/oranges before juicing and remove the seeds. Do not add fish sauce, honey or mayonnaise.", "Đánh mù tạt với nước chanh và muối, rót dầu thành tia nhỏ trong khi khuấy để tạo nhũ tương.": "Whisk the mustard with the lemon juice and salt, then pour in the oil in a thin stream while whisking to emulsify.", "Đánh hoặc xay cho hòa quyện; dùng nước lọc từng thìa nhỏ nếu cần chỉnh độ loãng, nếm rồi chia thành bốn phần sốt.": "Whisk or blend until smooth; add water a teaspoon at a time if it needs thinning, taste and divide into four portions of dressing.", "Trộn vào rau ngay trước khi ăn. Phần dư đậy kín, giữ lạnh ở ≤4°C, dùng trong 24 giờ; không để sốt tỏi dầu ở nhiệt độ phòng.": "Toss into the salad just before eating. Cover leftovers, keep cold at ≤4°C and use within 24 hours; do not keep garlic-oil dressing at room temperature.", "Đánh giấm táo với oregano và muối rồi thêm dầu từ từ; để 5 phút cho oregano mềm.": "Whisk the apple cider vinegar with the oregano and salt, then add the oil slowly; leave 5 minutes for the oregano to soften.", "Vắt phần cam đã cân, lọc bỏ hạt; đánh với mù tạt và muối rồi rót dầu chậm để hòa quyện.": "Squeeze the weighed oranges and strain out the seeds; whisk with mustard and salt, then pour in the oil slowly to combine.", "Xay húng quế với chanh, dầu và muối; chỉ xay ngắn để sốt xanh, không thêm phô mai.": "Blend the basil with lemon, oil and salt; blend only briefly to keep the sauce green, no cheese added.", "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.": "A batch of dressing for 4 salads, not four main meals. Weigh the ingredients and use clean utensils; make what you will use that day. Nuts must be shelled and unsalted; check labels for allergens.", "Khuấy tahini với chanh, tỏi nghiền và muối; thêm nước từng thìa đến khi sốt mịn, không dùng sữa.": "Stir the tahini with lemon, crushed garlic and salt; add water a spoonful at a time until smooth, no milk.", "Lấy nước cam, bỏ hạt rồi khuấy với tahini và muối; thêm ít nước cho vừa độ rưới.": "Juice the orange, remove the seeds and stir with the tahini and salt; add a little water until it is pourable.", "Giã hoặc xay đậu phộng rang, trộn với nước chanh và nước tương; thêm nước lọc đến khi thành sốt.": "Pound or blend the roasted peanuts and mix with lemon juice and soy sauce; add water until it becomes a sauce.", "Xay đậu phộng, gừng, giấm và nước tương với nước lọc vừa đủ; sốt có màu be nâu, không thêm sữa.": "Blend the peanuts, ginger, vinegar and soy sauce with just enough water; the sauce is beige-brown, no milk added.", "Giã mè rang cho vỡ thơm, trộn gừng băm, nước chanh và nước tương rồi đánh với dầu.": "Crush the toasted sesame until fragrant, mix with minced ginger, lemon juice and soy sauce, then whisk in the oil.", "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Chọn miso nguyên chất không có dashi/cá. Hạt phải bóc vỏ, không muối; kiểm tra dị ứng theo nhãn nguyên liệu.": "A batch of dressing for 4 salads, not four main meals. Weigh the ingredients and use clean utensils; make what you will use that day. Choose pure miso without dashi/fish. Nuts must be shelled and unsalted; check labels for allergens.", "Giã mè; khuấy miso nguyên chất không dashi với giấm và ít nước, thêm mè và dầu, không dùng nước mắm.": "Crush the sesame; stir pure miso without dashi with vinegar and a little water, add the sesame and oil, no fish sauce.", "Xay phần thịt quả bơ với chanh, dầu, muối và nước lọc vừa đủ; giữ sốt xanh, không dùng sữa.": "Blend the avocado flesh with lemon, oil, salt and just enough water; keep the sauce green, no milk.", "Xay quả bơ, húng quế và giấm với ít nước đến mịn; không tự thêm phô mai, sữa chua hoặc hạt.": "Blend the avocado, basil and vinegar with a little water until smooth; do not add cheese, yoghurt or nuts.", "Ngâm hạt trong nước nóng 20 phút rồi để ráo, xay cùng chanh, tỏi và nước sạch thành sốt mịn. Thời gian món chưa gồm 20 phút ngâm.": "Soak the nuts in hot water for 20 minutes and drain, then blend with lemon, garlic and clean water into a smooth sauce. The time does not include the 20 minutes of soaking.", "Ngâm hạt bí trong nước nóng 20 phút rồi để ráo; xay với mù tạt, giấm và nước. Thời gian món chưa gồm ngâm.": "Soak the pumpkin seeds in hot water for 20 minutes and drain; blend with mustard, vinegar and water. The time does not include soaking.", "Xay óc chó với giấm, dầu và ít nước cho sánh, không thêm phô mai hoặc sữa.": "Blend the walnuts with vinegar, oil and a little water until thick, no cheese or milk added.", "Ngâm hạnh nhân trong nước nóng 30 phút rồi để ráo, xay với chanh, tỏi và nước sạch. Thời gian món chưa gồm ngâm.": "Soak the almonds in hot water for 30 minutes and drain, then blend with lemon, garlic and clean water. The time does not include soaking.", "Bỏ lõi táo, xay phần táo đã cân với mù tạt, giấm, dầu và muối; không thêm đường.": "Core the apple and blend the weighed apple with mustard, vinegar, oil and salt; no sugar added.", "Vắt cam bỏ hạt; trộn nước cam với chia, giấm và muối, để 15 phút cho chia nở rồi khuấy lại. Thời gian món chưa gồm chờ nở.": "Squeeze the oranges and remove the seeds; mix the juice with chia, vinegar and salt, leave 15 minutes for the chia to swell, then stir again. The time does not include the wait.", "Xay cà chua đã rửa cùng húng quế, giấm, dầu và muối; chỉ dùng cà chua tươi, không tự thêm tương cà.": "Blend the washed tomatoes with basil, vinegar, oil and salt; use only fresh tomatoes, no ketchup.", "Mẻ sốt cho 4 phần salad; không phải bốn bữa chính. Cân nguyên liệu, dùng dụng cụ sạch; làm lượng dùng trong ngày. Chọn miso nguyên chất không có dashi/cá.": "A batch of dressing for 4 salads, not four main meals. Weigh the ingredients and use clean utensils; make what you will use that day. Choose pure miso without dashi/fish.", "Khuấy miso không dashi với chanh, gừng băm, dầu và nước cho hòa quyện; không thêm nước mắm hoặc dashi.": "Stir the miso without dashi with lemon, minced ginger, oil and water until smooth; no fish sauce or dashi.", "Khuấy sữa chua tự nhiên với chanh, mù tạt và muối; không đun nóng và không thêm mayonnaise.": "Stir natural yoghurt with lemon, mustard and salt; do not heat and do not add mayonnaise.", "Giã mè rang rồi khuấy với sữa chua, giấm và nước tương, dùng ít nước nếu cần chỉnh độ loãng.": "Crush the toasted sesame and stir with yoghurt, vinegar and soy sauce, using a little water to thin if needed.", "Xay quả bơ với sữa chua, chanh và muối cho mịn; dùng ngay để giữ màu, không thêm phô mai.": "Blend the avocado with yoghurt, lemon and salt until smooth; serve at once to keep the colour, no cheese.", "Xay ngắn húng quế, tỏi và chanh với sữa chua, nêm muối; không tự thêm hạt hoặc phô mai.": "Briefly blend the basil, garlic and lemon with yoghurt and season with salt; do not add nuts or cheese.", "Khuấy tahini với chanh cho mịn rồi trộn sữa chua, muối và ít nước; sốt trắng ngà, không thêm đậu phộng.": "Stir tahini with lemon until smooth, then mix in yoghurt, salt and a little water; the sauce is ivory white, no peanuts added."};
// ==== BEP startup helpers ==== Everything below this marker is small and ships in the startup pack (recipe-catalog-core.js);
// everything above is reference data loaded lazily as recipe-catalog-data.js (see catalog-loader.ts and scripts/build).
// Diet labels are computed from ingredients for every recipe (reference and family). Only ingredients on this explicit
// allowlist count as plant-based; anything not listed (including family-added ingredients) leaves the dish unlabelled.
const PLANT_VERIFIED_INGREDIENT_IDS=new Set(['tofu','rice','noodle','spinach','waterSpinach','cabbage','bokchoy','broccoli','carrot','potato','pumpkin','gourd','tomato','cucumber','mushroom','onion','scallion','garlic','ginger','lemongrass','pineapple','okra','bean','soy','oil','sugar','salt','pepper','coconut','riceNoodle','vermicelli','udon','corn','peas','seaweed','starch','lime','herbs','cookedRice','huTieu','banhCanh','vegBroth','spaghetti','penne','arborio','flour','oats','quinoa','brownRice','chickpea','lentil','kidneyBean','whiteBean','basil','oregano','lemon','lettuce','zucchini','eggplant','bellPepper','asparagus','avocado','olive','sesame','tahini','peanut','almond','walnut','pumpkinSeed','sunflowerSeed','chia','flax','bulgur','couscous','apple','orange','raisin','mustard','vinegar']);
const NON_VEGETARIAN_INGREDIENT_IDS=new Set(['pork','ribs','chicken','beef','salmon','fish','shrimp','fishSauce','broth','wonton','fishBall','cookedChicken','tuna']);
// Vegetarian but not vegan.
const DAIRY_EGG_INGREDIENT_IDS=new Set(['egg','eggNoodle','milk','yogurt','cream','butter']);
// Often contain animal ingredients depending on the brand (dashi/fish in miso, animal rennet in cheese, milk/egg in
// bread or fresh pasta): never vegan, and vegetarian only after the family checks the label.
const DIET_CHECK_INGREDIENT_IDS=new Set(['miso','parmesan','mozzarella','feta','bread','wholeBread','pasta','lasagne']);
function recipeDiet(r){const ids=(r?.ingredients||[]).map(i=>i.id);if(!ids.length)return null;if(ids.some(id=>NON_VEGETARIAN_INGREDIENT_IDS.has(id)))return 'meat';if(ids.some(id=>!PLANT_VERIFIED_INGREDIENT_IDS.has(id)&&!DAIRY_EGG_INGREDIENT_IDS.has(id)&&!DIET_CHECK_INGREDIENT_IDS.has(id)))return 'unknown';if(ids.some(id=>DIET_CHECK_INGREDIENT_IDS.has(id)))return 'check';return ids.some(id=>DAIRY_EGG_INGREDIENT_IDS.has(id))?'vegetarian':'vegan'}
function isDressingRecipe(r){return r?.recipeKind==='dressing'}
function isVegetarianRecipe(r){const d=recipeDiet(r);return d==='vegetarian'||d==='vegan'}
function isVeganRecipe(r){return recipeDiet(r)==='vegan'}
function recipeNeedsDietCheck(r){return recipeDiet(r)==='check'}
function isSeedSaladRecipe(r){return r?.recipeKind==='seed-salad'}
function recipeCategoryLabel(r){const en=typeof appLanguage!=='undefined'&&appLanguage==='en';return isDressingRecipe(r)?(en?'Salad dressing':'Sốt dressing'):isSeedSaladRecipe(r)?(en?'Seed & grain salad':'Salad hạt & ngũ cốc'):CATEGORY[r.category]}

function recipePortionLabel(r,n){const en=typeof appLanguage!=='undefined'&&appLanguage==='en';return n+' '+(isDressingRecipe(r)?(en?'salad dressing portions':'phần sốt salad'):(en?'standard portions':'suất chuẩn'))}

// Artwork audit, 02 November 2026: repair only exact, unedited reference samples.
// No catalog edition bump or reseed: family edits, deleted recipes and authored menu entries remain intact.
function repairArtworkReferenceRecipe(r){
 if(!r||r.custom||r.origin==='family'||r.stapleIncluded!==undefined||!['family-v3-1','family-v3-2','family-v3-3','family-v3-4','family-v3-7'].includes(r.id))return false;
 const fixes={"family-v3-1":{"before":"[\"Mì Ý Bolognese bò bằm sốt cà chua\",\"noodle\",\"beef\",[[\"beef\",450],[\"carrot\",100],[\"garlic\",20],[\"oil\",20],[\"onion\",150],[\"pasta\",400],[\"pepper\",2],[\"salt\",4],[\"tomato\",500]],\"Băm nhỏ hành tây, cà rốt, tỏi; cà chua khứa chữ thập trụng sơ bóc vỏ băm nhuyễn.\",[\"Đun sôi nồi nước có pha 1 thìa cà phê muối, luộc mì Ý 8–10 phút đến độ chín vừa (al dente) rồi vớt ra trộn nhẹ 1 thìa dầu.\",\"Làm nóng dầu trên chảo sâu lòng, phi thơm tỏi, hành tây và cà rốt băm 3 phút cho dậy mùi ngọt tự nhiên.\",\"Cho thịt bò bằm vào đảo lửa lớn đến khi săn tơi, thêm cà chua băm và 120ml nước luộc mì, hạ lửa nhỏ ninh 12 phút cho sốt sánh đậm.\",\"Nêm muối, tiêu đen vừa ăn, đảo đều mì với sốt bò bằm nóng hổi hoặc rưới sốt lên từng đĩa mì.\"]]","patch":{"ingredients":[{"id":"spaghetti","qty":400},{"id":"beef","qty":450},{"id":"tomato","qty":500},{"id":"onion","qty":150},{"id":"carrot","qty":100},{"id":"garlic","qty":20},{"id":"oil","qty":20},{"id":"salt","qty":4},{"id":"pepper","qty":2}],"category":"main","stapleIncluded":true}},"family-v3-2":{"before":"[\"Mì Ý cá hồi sốt kem nấm tỏi\",\"noodle\",\"fish\",[[\"broth\",180],[\"garlic\",20],[\"mushroom\",200],[\"oil\",15],[\"onion\",100],[\"pasta\",380],[\"pepper\",2],[\"salmon\",420],[\"salt\",4]],\"Thấm khô phi lê cá hồi, cắt quân cờ 2.5cm, ướp chút muối tiêu; nấm rửa nhanh thái lát.\",[\"Luộc mì Ý trong nước sôi có muối khoảng 8–9 phút cho vừa chín tới, giữ lại 80ml nước luộc mì rồi để ráo.\",\"Áp chảo cá hồi với chút dầu ở lửa vừa 2 phút mỗi mặt cho vàng thơm bên ngoài mà bên trong vẫn mềm ẩm, gắp ra đĩa.\",\"Phi thơm tỏi và hành tây băm trên cùng chảo, cho nấm vào xào chín tới rồi rót sốt kem / nước dùng và nước luộc mì vào đun sôi lăn tăn.\",\"Cho mì Ý và cá hồi vào đảo nhẹ tay 1–2 phút cho sốt áo đều sợi mì, rắc tiêu đen và dùng nóng.\"]]","patch":{"ingredients":[{"id":"spaghetti","qty":380},{"id":"salmon","qty":420},{"id":"broth","qty":180},{"id":"mushroom","qty":200},{"id":"garlic","qty":20},{"id":"onion","qty":100},{"id":"oil","qty":15},{"id":"salt","qty":4},{"id":"pepper","qty":2}],"name":"Mì Ý cá hồi nấm sốt tỏi nước dùng","steps":["Luộc mì Ý trong nước sôi có muối khoảng 8–9 phút cho vừa chín tới, giữ lại 80ml nước luộc mì rồi để ráo.","Áp chảo cá hồi với chút dầu ở lửa vừa 2 phút mỗi mặt cho vàng thơm bên ngoài mà bên trong vẫn mềm ẩm, gắp ra đĩa.","Phi thơm tỏi và hành tây băm trên cùng chảo, cho nấm vào xào chín tới rồi rót nước dùng và nước luộc mì vào đun sôi lăn tăn.","Cho mì Ý và cá hồi vào đảo nhẹ tay 1–2 phút cho sốt áo đều sợi mì, rắc tiêu đen và dùng nóng."],"category":"main","stapleIncluded":true}},"family-v3-3":{"before":"[\"Mì Ý ức gà áp chảo nấm sốt tỏi\",\"noodle\",\"chicken\",[[\"broccoli\",200],[\"chicken\",480],[\"garlic\",25],[\"mushroom\",220],[\"oil\",25],[\"pasta\",380],[\"pepper\",2],[\"salt\",4]],\"Ức gà thấm khô, thái lát vừa ăn ướp muối tiêu; bông cải tách nhánh nhỏ; tỏi thái lát mỏng.\",[\"Luộc mì Ý trong nước sôi có muối 8 phút; 2 phút cuối cho bông cải xanh vào chần chung rồi vớt ra để ráo, giữ lại 80ml nước luộc.\",\"Áp chảo ức gà với 1 thìa dầu ở lửa vừa 3–4 phút mỗi mặt đến khi vàng chín, lấy ra để nghỉ.\",\"Phi vàng tỏi lát ở lửa nhỏ cho thơm dịu, cho nấm vào xào săn với chút muối và nước luộc mì.\",\"Trộn mì Ý, bông cải và ức gà vào chảo, đảo đều trên lửa vừa 1 phút, rắc tiêu đen xay.\"]]","patch":{"ingredients":[{"id":"spaghetti","qty":380},{"id":"chicken","qty":480},{"id":"mushroom","qty":220},{"id":"broccoli","qty":200},{"id":"garlic","qty":25},{"id":"oil","qty":25},{"id":"salt","qty":4},{"id":"pepper","qty":2}],"category":"main","stapleIncluded":true}},"family-v3-4":{"before":"[\"Cá hồi áp chảo bơ tỏi kèm khoai tây & bông cải\",\"main\",\"fish\",[[\"broccoli\",300],[\"garlic\",20],[\"lime\",1],[\"oil\",20],[\"pepper\",2],[\"potato\",400],[\"salmon\",550],[\"salt\",4]],\"Thấm thật khô miếng cá hồi, ướp muối tiêu hai mặt; khoai tây cắt múi cau; bông cải cắt miếng vừa ăn.\",[\"Hấp hoặc luộc chín tới khoai tây (10 phút) và bông cải xanh (3 phút) để giữ màu xanh giòn.\",\"Làm nóng chảo chống dính với dầu, đặt mặt da cá hồi xuống áp chảo lửa vừa 4 phút cho da giòn vàng, lật mặt áp tiếp 2–3 phút cùng tỏi đập dập.\",\"Đảo nhanh khoai tây và bông cải qua phần dầu tỏi thơm trong chảo 2 phút cho thấm vị.\",\"Bày cá hồi cùng rau củ ra đĩa, vắt nhẹ nước cốt chanh tươi lên mặt cá trước khi thưởng thức.\"]]","patch":{"name":"Cá hồi áp chảo tỏi kèm khoai tây & bông cải"}},"family-v3-7":{"before":"[\"Súp bí đỏ kem tươi kiểu Âu\",\"soup\",\"plant\",[[\"garlic\",15],[\"oil\",15],[\"onion\",120],[\"pepper\",2],[\"potato\",200],[\"pumpkin\",600],[\"salt\",3],[\"vegBroth\",900]],\"Bí đỏ và khoai tây gọt vỏ, rửa sạch, cắt khối vuông 2cm để nhanh chín mềm.\",[\"Làm nóng chút dầu trong nồi, xào thơm hành tây và tỏi băm 2 phút ở lửa vừa cho trong mà không cháy.\",\"Cho bí đỏ, khoai tây và nước dùng rau củ vào nồi, đun sôi rồi hạ lửa nhỏ nấu 15 phút đến khi củ mềm nhừ.\",\"Dùng máy xay hoặc muôi tán nhuyễn mịn hỗn hợp bí đỏ trên lửa nhỏ 2 phút cho sánh mịn.\",\"Nêm muối và tiêu đen vừa vị, múc ra chén dùng ấm.\"]]","patch":{"name":"Súp bí đỏ khoai tây kiểu Âu"}}};
 const fix=fixes[r.id],signature=JSON.stringify([r.name,r.category,r.protein,(r.ingredients||[]).map(i=>[i.id,i.qty]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),r.prep,r.steps]);
 if(signature!==fix.before)return false;
 Object.assign(r,JSON.parse(JSON.stringify(fix.patch)));return true;
}
function repairArtworkReferenceState(s){
 if(!s||typeof s!=='object')return 0;let repaired=0;
 for(const r of Array.isArray(s.recipes)?s.recipes:[])if(repairArtworkReferenceRecipe(r))repaired++;
 for(const week of Object.values(s.weeks||{}))for(const day of Object.values(week?.days||{}))for(const meal of Object.values(day||{}))for(const r of Array.isArray(meal?.recipes)?meal.recipes:[])if(repairArtworkReferenceRecipe(r))repaired++;
 return repaired;
}

