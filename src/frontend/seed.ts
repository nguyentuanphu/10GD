'use strict';
const INGREDIENTS={
pork:['Thịt heo','g','meat',.018,'🥩',500],ribs:['Sườn heo','g','meat',.022,'🥩',500],chicken:['Thịt gà','g','meat',.013,'🍗',500],beef:['Thịt bò','g','meat',.026,'🥩',500],salmon:['Cá hồi','g','meat',.036,'🐟',250],fish:['Cá trắng','g','meat',.021,'🐟',500],shrimp:['Tôm','g','meat',.025,'🦐',250],tofu:['Đậu hũ','g','dry',.008,'◻️',300],egg:['Trứng','quả','dry',.55,'🥚',6],rice:['Gạo','g','dry',.003,'🍚',1000],noodle:['Bún tươi','g','dry',.008,'🍜',500],spinach:['Rau cải','g','veg',.008,'🥬',250],waterSpinach:['Rau muống','g','veg',.012,'🌿',300],cabbage:['Bắp cải','g','veg',.004,'🥬',500],bokchoy:['Cải thìa','g','veg',.008,'🥬',250],broccoli:['Bông cải xanh','g','veg',.007,'🥦',300],carrot:['Cà rốt','g','veg',.003,'🥕',500],potato:['Khoai tây','g','veg',.004,'🥔',500],pumpkin:['Bí đỏ','g','veg',.004,'🎃',500],gourd:['Bí xanh','g','veg',.007,'🥒',500],tomato:['Cà chua','g','veg',.006,'🍅',250],cucumber:['Dưa leo','g','veg',.005,'🥒',250],mushroom:['Nấm','g','veg',.014,'🍄',200],onion:['Hành tây','g','veg',.003,'🧅',250],scallion:['Hành lá','g','veg',.018,'🌱',50],garlic:['Tỏi','g','veg',.018,'🧄',100],ginger:['Gừng','g','veg',.015,'🫚',100],lemongrass:['Sả','g','veg',.020,'🌾',100],pineapple:['Dứa','g','veg',.005,'🍍',500],okra:['Đậu bắp','g','veg',.012,'🌿',250],bean:['Đậu que','g','veg',.009,'🫛',250],fishSauce:['Nước mắm','ml','dry',.012,'🧂',500],soy:['Nước tương','ml','dry',.009,'🫙',250],oil:['Dầu ăn','ml','dry',.004,'🫗',1000],sugar:['Đường','g','dry',.002,'🧂',1000],salt:['Muối','g','dry',.001,'🧂',500],pepper:['Tiêu','g','dry',.04,'🧂',50],coconut:['Nước dừa','ml','dry',.005,'🥥',500]};
const GROUPS={meat:['🥩','Thịt, cá & hải sản'],veg:['🥬','Rau củ & nấm'],dry:['🧂','Trứng, gia vị & đồ khô'],other:['🛍️','Đồ dùng khác']};
const CATEGORY={main:'Món mặn',soup:'Món canh',veg:'Món rau'};
const recipe=(id,name,category,protein,time,ingredients,prep,steps)=>({id,name,category,protein,time,servings:4,ingredients:Object.entries(ingredients).map(([id,qty])=>({id,qty})),prep,steps,favorite:false,custom:false});
const RECIPES=[
recipe('r1','Sườn rim mặn ngọt','main','pork',35,{ribs:600,garlic:15,fishSauce:25,sugar:20,oil:15,scallion:15},'Chia sườn thành miếng vừa ăn; chuẩn bị hỗn hợp nước mắm và đường.',['Làm sạch sườn và để ráo. Băm tỏi, cắt hành lá.','Ướp sườn với một phần nước mắm, đường và tỏi khoảng 20 phút trong ngăn mát.','Phi phần tỏi còn lại với dầu, cho sườn vào đảo săn. Thêm nước vừa đủ, đậy nắp và nấu đến khi sườn chín mềm.','Mở nắp, rim cho sốt sánh; nêm lại theo khẩu vị, thêm hành lá.']),
recipe('r2','Gà kho gừng','main','chicken',35,{chicken:650,ginger:30,fishSauce:25,sugar:12,oil:15,garlic:10},'Thái gừng thành sợi, chia gà thành miếng.',['Làm sạch gà, để ráo. Thái gừng và băm tỏi.','Ướp gà với gừng, nước mắm và đường trong ngăn mát khoảng 15 phút.','Phi tỏi, đảo gà săn; thêm nước vừa đủ và kho đến khi thịt chín hoàn toàn.','Mở nắp cho sốt sánh nhẹ, nếm và điều chỉnh gia vị.']),
recipe('r3','Cá hồi áp chảo','main','fish',20,{salmon:600,garlic:10,oil:20,salt:3,pepper:2},'Thấm khô cá trước khi áp chảo để bề mặt vàng đẹp.',['Kiểm tra và bỏ xương dăm, thấm khô cá.','Nêm nhẹ muối, tiêu. Làm nóng chảo với dầu.','Đặt cá vào chảo, áp chảo từng mặt đến khi cá chín hoàn toàn; điều chỉnh lửa để không cháy.','Thêm tỏi ở cuối, dùng cùng rau và cơm.']),
recipe('r4','Thịt kho trứng','main','pork',55,{pork:600,egg:4,coconut:300,fishSauce:30,sugar:15,garlic:15},'Luộc trứng và bóc vỏ trước; cắt thịt miếng vừa ăn.',['Luộc chín trứng và bóc vỏ. Cắt thịt, băm tỏi.','Ướp thịt với nước mắm, đường và tỏi trong ngăn mát.','Cho thịt vào nồi đảo săn, thêm nước dừa và nước vừa đủ. Kho lửa nhỏ đến khi thịt chín mềm.','Cho trứng vào kho tiếp để thấm vị; nếm lại trước khi dùng.']),
recipe('r5','Bò xào bông cải','main','beef',25,{beef:500,broccoli:400,garlic:15,soy:20,oil:20,onion:100},'Thái bò mỏng ngang thớ; chia bông cải thành miếng nhỏ.',['Thái bò, cắt hành tây và bông cải.','Ướp bò với một ít nước tương và tỏi trong ngăn mát.','Xào bò nhanh với dầu rồi lấy ra. Cho rau vào xào đến độ mềm mong muốn.','Cho bò trở lại chảo, thêm nước tương, đảo đến khi chín và dùng ngay.']),
recipe('r6','Tôm rim tỏi','main','shrimp',20,{shrimp:600,garlic:20,fishSauce:20,sugar:15,oil:15},'Bóc vỏ hoặc cắt gọn tôm, bỏ chỉ lưng.',['Sơ chế tôm và để ráo, băm tỏi.','Phi tỏi với dầu rồi thêm tôm, đảo đều.','Thêm nước mắm, đường và một ít nước; rim đến khi tôm chín và sốt bám nhẹ.','Nếm lại và dùng nóng.']),
recipe('r7','Đậu hũ sốt cà chua','main','plant',25,{tofu:600,tomato:350,scallion:20,oil:25,soy:20,sugar:8},'Cắt đậu thành miếng; băm nhỏ cà chua.',['Cắt đậu và thấm khô, cắt cà chua và hành lá.','Áp chảo đậu với một phần dầu cho vàng nhẹ.','Nấu cà chua với phần dầu còn lại, nước tương, đường và ít nước thành sốt.','Cho đậu vào sốt, nấu thấm vị, rắc hành lá.']),
recipe('r8','Gà xào sả','main','chicken',30,{chicken:600,lemongrass:40,garlic:15,fishSauce:25,oil:20,onion:150,sugar:10},'Băm sả mịn; cắt gà thành miếng đều.',['Sơ chế gà, băm sả và tỏi, cắt hành tây.','Ướp gà với một phần sả, nước mắm và đường trong ngăn mát.','Phi tỏi và sả còn lại với dầu, cho gà vào đảo đều.','Thêm chút nước nếu cần, nấu gà chín hoàn toàn rồi thêm hành tây, nêm lại.']),
recipe('r9','Cá kho cà chua','main','fish',35,{fish:650,tomato:300,fishSauce:25,sugar:12,oil:15,scallion:15},'Kiểm tra xương cá; cắt cà chua miếng nhỏ.',['Làm sạch cá, kiểm tra xương; sơ chế cà chua và hành.','Nấu cà chua với dầu cho mềm, thêm nước mắm, đường và nước.','Cho cá vào, kho lửa nhỏ đến khi chín và thấm vị; hạn chế đảo làm nát cá.','Nêm lại và thêm hành lá trước khi dùng.']),
recipe('r10','Trứng chiên hành','main','egg',15,{egg:6,scallion:30,fishSauce:10,oil:20},'Đập trứng vào bát riêng, thái nhỏ hành lá.',['Đập trứng, thêm hành lá và nước mắm rồi đánh đều.','Làm nóng chảo, thêm dầu và đổ trứng vào.','Hạ lửa, chiên đến khi trứng chín đều cả hai mặt.','Cắt miếng vừa ăn và dùng nóng.']),
recipe('r11','Thịt viên sốt nấm','main','pork',30,{pork:500,mushroom:250,onion:100,soy:25,oil:20,pepper:2},'Băm thịt hoặc dùng thịt xay; thái nấm.',['Băm thịt và hành tây, trộn với một phần nước tương và tiêu, vo viên nhỏ.','Áp chảo thịt viên với dầu cho săn mặt.','Thêm nấm, nước tương còn lại và ít nước. Đậy nắp nấu đến khi thịt chín hoàn toàn.','Nấu sốt sánh vừa và nếm lại.']),
recipe('r12','Bò xào đậu que','main','beef',25,{beef:500,bean:400,garlic:15,soy:20,oil:20,carrot:100},'Tước xơ đậu que, thái bò ngang thớ.',['Thái bò mỏng, cắt đậu que và cà rốt.','Xào bò với dầu và tỏi đến khi săn rồi lấy ra.','Xào rau đến khi chín, thêm chút nước nếu cần.','Cho bò trở lại, nêm nước tương và đảo đến khi chín.']),
recipe('r13','Canh bí đỏ thịt bằm','soup','pork',25,{pumpkin:500,pork:150,scallion:15,fishSauce:12,salt:2},'Gọt và cắt bí đỏ thành miếng đều.',['Gọt bí đỏ và cắt miếng, băm thịt và hành.','Đun nước, cho thịt vào khuấy tơi và hớt bọt.','Cho bí vào nấu đến mềm; nêm nước mắm và muối vừa ăn.','Thêm hành lá, tắt bếp và dùng nóng.']),
recipe('r14','Canh cải nấu tôm','soup','shrimp',20,{spinach:400,shrimp:180,ginger:10,fishSauce:12,salt:2},'Rửa rau, sơ chế và cắt nhỏ tôm.',['Rửa rau, cắt vừa ăn; sơ chế tôm.','Đun nước với gừng, thêm tôm và nấu chín.','Cho rau vào nấu đến độ mềm mong muốn.','Nêm nhẹ nước mắm và muối, dùng nóng.']),
recipe('r15','Canh chua cá','soup','fish',30,{fish:350,tomato:200,pineapple:200,okra:150,fishSauce:20,sugar:10},'Sơ chế cá và kiểm tra xương; cắt rau củ.',['Sơ chế cá, cắt cà chua, dứa và đậu bắp.','Đun nước với dứa và cà chua cho ra vị chua tự nhiên.','Cho cá vào nấu chín, thêm đậu bắp và gia vị.','Nếm lại độ chua ngọt; kiểm tra xương khi chia phần cho trẻ.']),
recipe('r16','Canh bí xanh','soup','pork',25,{gourd:500,pork:150,scallion:15,fishSauce:12,salt:2},'Gọt bí, cắt miếng; chuẩn bị thịt bằm.',['Gọt bí và cắt miếng, băm thịt.','Đun nước và cho thịt vào, khuấy tơi.','Thêm bí, nấu chín mềm rồi nêm nhẹ.','Rắc hành lá và dùng nóng.']),
recipe('r17','Canh nấm đậu hũ','soup','plant',20,{mushroom:250,tofu:300,carrot:100,soy:15,salt:3,scallion:10},'Thái nấm, cà rốt và đậu hũ.',['Sơ chế nấm, cắt đậu và cà rốt.','Đun nước, cho cà rốt và nấm vào nấu chín.','Thêm đậu, nấu nhẹ để không vỡ; nêm nước tương và muối.','Thêm hành lá và dùng nóng.']),
recipe('r18','Canh cà chua trứng','soup','egg',15,{tomato:300,egg:3,scallion:20,oil:10,salt:3},'Cắt cà chua, đánh trứng trong bát.',['Cắt cà chua, thái hành và đánh trứng.','Xào cà chua với dầu cho mềm, thêm nước và đun sôi.','Rót trứng từ từ, khuấy nhẹ và nấu đến chín.','Nêm muối, thêm hành lá và dùng ngay.']),
recipe('r19','Canh bắp cải','soup','pork',20,{cabbage:450,pork:150,carrot:100,fishSauce:12,salt:2},'Cắt bắp cải và cà rốt, chuẩn bị thịt.',['Rửa và cắt bắp cải, thái cà rốt; băm thịt.','Đun nước, cho thịt và cà rốt vào nấu.','Thêm bắp cải, nấu đến độ mềm mong muốn.','Nêm nước mắm và muối, dùng nóng.']),
recipe('r20','Canh khoai tây cà rốt','soup','chicken',35,{potato:300,carrot:200,chicken:200,scallion:15,salt:3},'Gọt khoai và cà rốt thành miếng đều.',['Sơ chế gà, cắt khoai tây và cà rốt.','Cho gà vào nước, đun sôi rồi hớt bọt.','Thêm khoai và cà rốt, nấu đến khi gà chín hoàn toàn và rau củ mềm.','Nêm muối vừa ăn, thêm hành lá.']),
recipe('r21','Canh cải thìa nấm','soup','plant',20,{bokchoy:400,mushroom:150,ginger:10,salt:3,soy:10},'Tách lá cải thìa, rửa kỹ phần gốc.',['Sơ chế cải thìa, nấm và gừng.','Đun nước với gừng, thêm nấm và nấu chín.','Cho cải thìa vào nấu vừa mềm.','Nêm muối và nước tương, dùng nóng.']),
recipe('r22','Canh rau củ đậu hũ','soup','plant',25,{tofu:300,carrot:150,broccoli:250,salt:3,soy:15},'Cắt đậu và rau củ thành miếng vừa ăn.',['Cắt cà rốt, bông cải và đậu.','Đun nước, thêm cà rốt trước để nấu mềm.','Cho bông cải và đậu vào nấu chín.','Nêm muối, nước tương và dùng nóng.']),
recipe('r23','Rau muống xào tỏi','veg','plant',15,{waterSpinach:500,garlic:25,oil:20,salt:3},'Nhặt rau, rửa sạch và để ráo; đập dập tỏi.',['Nhặt và rửa rau, cắt đoạn; đập dập tỏi.','Làm nóng dầu, phi tỏi thơm nhẹ.','Cho rau vào đảo đều, thêm ít nước nếu cần và xào chín.','Nêm nhẹ muối, đảo đều và dùng ngay.']),
recipe('r24','Bông cải luộc','veg','plant',15,{broccoli:500,salt:2},'Chia bông cải thành miếng nhỏ đều nhau.',['Rửa bông cải, chia miếng vừa ăn.','Đun nước với ít muối.','Cho bông cải vào luộc đến độ mềm mong muốn.','Vớt ra để ráo và dùng nóng.']),
recipe('r25','Cải thìa xào nấm','veg','plant',20,{bokchoy:450,mushroom:200,garlic:15,soy:15,oil:20},'Tách và rửa lá cải, thái nấm.',['Rửa cải thìa và nấm, băm tỏi.','Phi tỏi với dầu rồi thêm nấm, xào chín.','Cho cải vào đảo đều, thêm chút nước nếu cần.','Nêm nước tương và xào đến khi rau chín.']),
recipe('r26','Bắp cải xào cà rốt','veg','plant',15,{cabbage:400,carrot:150,garlic:10,oil:20,salt:3},'Thái sợi bắp cải và cà rốt.',['Thái bắp cải và cà rốt, băm tỏi.','Làm nóng dầu, phi tỏi nhẹ.','Cho cà rốt vào xào trước, sau đó thêm bắp cải.','Xào đến chín, nêm muối và dùng nóng.']),
recipe('r27','Đậu que xào tỏi','veg','plant',20,{bean:450,garlic:20,oil:20,soy:15},'Tước xơ đậu, cắt đoạn và băm tỏi.',['Nhặt và rửa đậu, cắt đoạn; băm tỏi.','Phi tỏi với dầu, thêm đậu và đảo đều.','Thêm ít nước, đậy nắp nấu đậu chín.','Nêm nước tương, đảo lại và dùng nóng.']),
recipe('r28','Rau cải luộc','veg','plant',15,{spinach:500,salt:2},'Nhặt và rửa rau nhiều lần, cắt đoạn.',['Nhặt rau và rửa sạch, cắt đoạn vừa ăn.','Đun nước với ít muối.','Cho phần thân rau vào trước, tiếp theo là lá.','Luộc đến độ mềm mong muốn và vớt ra.']),
recipe('r29','Dưa leo cà chua','veg','plant',10,{cucumber:350,tomato:250,oil:10,salt:2},'Rửa sạch rau củ, dùng dao và thớt sạch riêng.',['Rửa sạch dưa leo và cà chua dưới nước sạch.','Dùng dao và thớt sạch, cắt miếng vừa ăn.','Trộn nhẹ với dầu và một chút muối ngay trước khi dùng.','Chia phần và dùng cùng món chính.']),
recipe('r30','Nấm xào hành tây','veg','plant',15,{mushroom:350,onion:200,garlic:15,soy:20,oil:20},'Làm sạch nấm, thái hành tây thành múi mỏng.',['Sơ chế nấm, hành tây và tỏi.','Làm nóng dầu, phi tỏi rồi cho nấm vào xào.','Thêm hành tây, xào đến khi nấm chín và hành mềm.','Nêm nước tương, đảo đều và dùng nóng.'])
];
// Món nước là bữa chính hoàn chỉnh. Thời gian dựa trên nước dùng có sẵn.
Object.assign(INGREDIENTS,{
broth:['Nước dùng ít muối có sẵn','ml','dry',.004,'🥣',1000],riceNoodle:['Bánh phở','g','dry',.008,'🍜',500],eggNoodle:['Mì trứng','g','dry',.009,'🍜',400],vermicelli:['Miến khô','g','dry',.012,'🍜',200],udon:['Mì udon','g','dry',.009,'🍜',400],corn:['Bắp hạt','g','veg',.006,'🌽',300],peas:['Đậu Hà Lan','g','veg',.006,'🫛',300],wonton:['Hoành thánh đông lạnh','g','dry',.016,'🥟',400],fishBall:['Cá viên','g','meat',.014,'🍥',250],cookedChicken:['Gà chín có sẵn','g','meat',.02,'🍗',300],seaweed:['Rong biển khô','g','dry',.08,'🌿',20],miso:['Tương miso','g','dry',.02,'🫙',200],starch:['Bột bắp','g','dry',.005,'🥣',250],lime:['Chanh','quả','veg',.6,'🍋',1],herbs:['Rau thơm','g','veg',.025,'🌿',50],pasta:['Nui','g','dry',.005,'🍝',500]});
Object.assign(INGREDIENTS,{cookedRice:['Cơm chín có sẵn','g','dry',.002,'🍚',500],huTieu:['Sợi hủ tiếu','g','dry',.008,'🍜',500],banhCanh:['Sợi bánh canh','g','dry',.008,'🍜',500],vegBroth:['Nước dùng rau củ có sẵn','ml','dry',.004,'🥣',1000]});
CATEGORY.noodle='Món nước / súp';
const quickSoup=(id,name,protein,time,ingredients,prep,steps,tags=[])=>({...recipe(id,name,'noodle',protein,time,ingredients,prep,steps),tags:['Bữa chính món nước',...tags]});
RECIPES.push(
quickSoup('n1','Phở gà nhanh','chicken',20,{riceNoodle:600,cookedChicken:400,broth:1800,ginger:20,onion:100,scallion:20,herbs:30,fishSauce:15,lime:1},'Dùng gà đã chín và nước dùng có sẵn; không tính thời gian tự hầm nước dùng.',['Nướng hoặc áp chảo gừng, hành tây cho thơm, cho vào nước dùng và đun nóng.','Trụng bánh phở theo hướng dẫn trên bao bì. Xé gà chín, rửa rau thơm.','Cho gà vào nước dùng, đun nóng kỹ; nêm nước mắm vừa ăn.','Chia bánh phở, gà và nước dùng ra tô; thêm hành, rau thơm, chanh theo ý thích.'],['Nước dùng có sẵn','Gà đã chín']),
quickSoup('n2','Phở bò nhanh','beef',25,{riceNoodle:600,beef:400,broth:1800,ginger:20,onion:100,scallion:20,herbs:30,fishSauce:15},'Dùng nước dùng có sẵn; thái bò mỏng và nấu chín trong nồi.',['Đun nước dùng với gừng và hành tây áp chảo.','Trụng bánh phở, chuẩn bị rau thơm và hành lá.','Cho thịt bò thái mỏng vào nồi, nấu chín hoàn toàn.','Chia bánh phở, thịt và nước dùng ra tô, thêm rau thơm.'],['Nước dùng có sẵn']),
quickSoup('n3','Bún mọc nấm','pork',25,{noodle:600,pork:350,mushroom:200,broth:1800,scallion:25,fishSauce:15,pepper:2},'Dùng thịt heo xay; vo viên nhỏ để nấu nhanh, không thay cho giò sống truyền thống.',['Trộn thịt xay với chút nước mắm, tiêu, vo thành viên nhỏ.','Đun nước dùng, thêm thịt viên và nấu chín hoàn toàn.','Thêm nấm đã sơ chế, nấu chín; trụng bún theo bao bì.','Chia bún và nước dùng ra tô, thêm hành lá.'],['Một nồi','Nước dùng có sẵn']),
quickSoup('n4','Bún cá cà chua','fish',25,{noodle:600,fish:450,tomato:350,broth:1600,ginger:15,fishSauce:20,scallion:20,oil:10},'Dùng phi lê cá đã bỏ xương và nước dùng có sẵn.',['Cắt cá miếng vừa ăn, kiểm tra xương; cắt cà chua, gừng và hành.','Xào mềm cà chua với dầu, thêm gừng và nước dùng.','Cho cá vào nấu chín, nêm nước mắm.','Trụng bún rồi chia ra tô, chan nước cá cà chua và thêm hành.'],['Nước dùng có sẵn']),
quickSoup('n5','Bún tôm cải xanh','shrimp',20,{noodle:600,shrimp:400,spinach:350,broth:1800,ginger:10,fishSauce:15,scallion:20},'Sơ chế tôm bỏ chỉ lưng; dùng nước dùng có sẵn.',['Sơ chế tôm, rau cải và hành.','Đun nước dùng với gừng, cho tôm vào nấu chín.','Thêm rau cải, nấu mềm vừa và nêm nước mắm.','Trụng bún, chia ra tô rồi chan nước dùng cùng tôm và rau.'],['20 phút','Nước dùng có sẵn']),
quickSoup('n6','Bún đậu hũ nấm','plant',20,{noodle:600,tofu:500,mushroom:250,tomato:250,broth:1600,soy:20,oil:10},'Chọn nước dùng rau củ nếu muốn nấu chay.',['Cắt đậu hũ, nấm và cà chua.','Xào cà chua với dầu cho mềm, thêm nước dùng rau củ.','Cho nấm và đậu vào nấu chín, nêm nước tương.','Trụng bún và chia tô, thêm nước dùng, nấm và đậu.'],['Nước dùng rau củ','Một nồi']),
quickSoup('n7','Hủ tiếu thịt bằm','pork',20,{huTieu:600,pork:350,broth:1800,bokchoy:300,garlic:15,scallion:20,fishSauce:15,oil:10},'Dùng hủ tiếu mềm hoặc trụng hủ tiếu khô theo thời gian trên bao bì.',['Phi tỏi với dầu, cho thịt bằm vào đảo tơi.','Thêm nước dùng, đun đến khi thịt chín hoàn toàn.','Cho cải thìa vào nấu chín, nêm nước mắm.','Trụng hủ tiếu, chia tô và chan nước dùng, rắc hành lá.'],['20 phút','Nước dùng có sẵn']),
quickSoup('n8','Hủ tiếu tôm thịt','shrimp',25,{huTieu:600,shrimp:300,pork:200,bokchoy:300,broth:1800,scallion:20,fishSauce:15},'Thái thịt mỏng, sơ chế tôm; dùng nước dùng có sẵn.',['Sơ chế tôm và thái thịt thành miếng mỏng.','Đun nước dùng, cho thịt vào nấu chín rồi thêm tôm.','Thêm cải thìa, nấu chín và nêm nước mắm.','Trụng hủ tiếu và chia tô, chan nước dùng cùng tôm thịt và rau.'],['Nước dùng có sẵn']),
quickSoup('n9','Mì hoành thánh cải thìa','pork',20,{eggNoodle:500,wonton:500,bokchoy:350,broth:1800,scallion:20,soy:15},'Dùng hoành thánh đông lạnh có sẵn; kiểm tra nhãn thành phần và thời gian nấu.',['Đun nước dùng; nấu hoành thánh theo hướng dẫn trên bao bì đến chín hoàn toàn.','Trụng mì trứng riêng để nước dùng trong.','Cho cải thìa vào nước dùng, nấu chín rồi nêm nhẹ nước tương.','Chia mì ra tô, thêm hoành thánh, rau, nước dùng và hành lá.'],['Hoành thánh có sẵn','20 phút']),
quickSoup('n10','Mì gà nấm','chicken',25,{eggNoodle:500,chicken:400,mushroom:200,carrot:150,broth:1800,scallion:20,salt:3},'Thái gà mỏng; dùng nước dùng có sẵn.',['Cắt gà, nấm và cà rốt thành miếng vừa ăn.','Đun nước dùng, thêm cà rốt và gà, nấu gà chín hoàn toàn.','Thêm nấm, nấu chín và nêm muối vừa ăn.','Trụng mì riêng, chia ra tô rồi thêm thịt gà, rau và nước dùng.'],['Nước dùng có sẵn']),
quickSoup('n11','Mì bò rau củ','beef',25,{eggNoodle:500,beef:400,broccoli:250,carrot:150,broth:1800,soy:20,ginger:15},'Thái bò mỏng ngang thớ, cắt rau củ nhỏ.',['Đun nước dùng với gừng và cà rốt.','Trụng mì riêng theo bao bì.','Thêm bông cải rồi thịt bò; nấu chín hoàn toàn, nêm nước tương.','Chia mì và các nguyên liệu ra tô, chan nước dùng nóng.'],['Nước dùng có sẵn']),
quickSoup('n12','Udon trứng nấm','egg',20,{udon:700,egg:4,mushroom:250,bokchoy:250,broth:1600,soy:20,scallion:20},'Dùng mì udon đóng gói và nước dùng có sẵn.',['Luộc trứng chín, bóc vỏ. Sơ chế nấm và cải.','Đun nước dùng, thêm nấm và rau, nấu chín.','Nêm nước tương, thêm mì udon và nấu theo hướng dẫn bao bì.','Chia tô, thêm trứng cắt đôi và hành lá.'],['20 phút','Nước dùng có sẵn']),
quickSoup('n13','Miến gà nấm','chicken',20,{vermicelli:250,cookedChicken:400,mushroom:250,broth:1800,scallion:20,ginger:15,fishSauce:15},'Dùng gà chín có sẵn; ngâm miến theo hướng dẫn bao bì.',['Ngâm hoặc trụng miến theo bao bì, xé gà và thái nấm.','Đun nước dùng với gừng, thêm nấm và nấu chín.','Cho gà chín vào làm nóng kỹ, nêm nước mắm.','Thêm miến vừa đủ mềm rồi chia tô, rắc hành lá.'],['Gà đã chín','20 phút']),
quickSoup('n14','Miến tôm rau củ','shrimp',20,{vermicelli:250,shrimp:400,carrot:150,cabbage:250,broth:1800,fishSauce:15,scallion:20},'Ngâm miến và sơ chế tôm trong lúc chuẩn bị rau.',['Ngâm miến theo bao bì; sơ chế tôm, thái cà rốt và bắp cải.','Đun nước dùng với cà rốt, thêm tôm và nấu chín.','Cho bắp cải và miến vào, nấu vừa mềm và nêm nước mắm.','Chia ra tô, thêm hành lá và dùng nóng.'],['20 phút','Một nồi']),
quickSoup('n15','Nui gà rau củ','chicken',30,{pasta:300,chicken:400,carrot:200,potato:250,broth:1800,scallion:20,salt:3},'Dùng nước dùng có sẵn; cắt rau củ nhỏ để chín nhanh.',['Cắt gà và rau củ thành miếng nhỏ.','Luộc nui theo bao bì trong nồi riêng.','Đun nước dùng, nấu gà và rau củ chín hoàn toàn, nêm nhẹ muối.','Chia nui ra tô và thêm gà, rau củ, nước dùng và hành lá.'],['Nước dùng có sẵn']),
quickSoup('n16','Nui thịt bằm cà chua','pork',25,{pasta:300,pork:350,tomato:350,carrot:150,broth:1600,oil:15,salt:3},'Chuẩn bị thịt xay, cắt nhỏ cà chua và cà rốt.',['Luộc nui theo hướng dẫn bao bì.','Xào thịt và cà chua với dầu cho săn, thêm nước dùng và cà rốt.','Nấu đến khi thịt chín hoàn toàn và cà rốt mềm, nêm nhẹ muối.','Chia nui ra tô, thêm thịt, rau và nước dùng.'],['Nước dùng có sẵn']),
quickSoup('n17','Cháo gà từ cơm chín','chicken',25,{cookedRice:650,cookedChicken:400,broth:1800,ginger:15,scallion:25,salt:3},'Dùng khoảng 600–700 g cơm chín nấu từ 250 g gạo; thời gian 25 phút không bao gồm nấu cơm.',['Cho cơm chín bảo quản đúng cách vào nước dùng, đun sôi và khuấy tơi.','Nấu nhỏ lửa đến độ sánh mong muốn; thêm nước nếu cần.','Thêm gừng, gà chín xé nhỏ và làm nóng kỹ.','Nêm nhẹ muối, thêm hành lá và dùng ngay.'],['Cơm đã nấu','Gà đã chín']),
quickSoup('n18','Cháo thịt bằm bí đỏ','pork',30,{cookedRice:650,pork:300,pumpkin:350,broth:1800,scallion:20,fishSauce:15},'Dùng cơm chín từ khoảng 250 g gạo; không tính thời gian nấu cơm.',['Cắt bí đỏ nhỏ; cho cơm chín bảo quản đúng cách vào nước dùng và đun sôi.','Thêm bí đỏ, khuấy tơi và nấu đến mềm.','Cho thịt bằm vào khuấy đều, nấu chín hoàn toàn.','Nêm nhẹ nước mắm, thêm hành lá, điều chỉnh độ đặc bằng nước.'],['Cơm đã nấu','Một nồi']),
quickSoup('n19','Cháo tôm cà rốt','shrimp',25,{cookedRice:650,shrimp:350,carrot:200,broth:1800,scallion:20,salt:3},'Dùng cơm chín từ khoảng 250 g gạo; sơ chế tôm và băm cà rốt.',['Đun cơm chín bảo quản đúng cách với nước dùng, khuấy tơi.','Thêm cà rốt băm, nấu đến mềm và cháo sánh.','Cho tôm cắt nhỏ vào nấu chín hoàn toàn.','Nêm nhẹ muối, thêm hành lá và chia tô.'],['Cơm đã nấu']),
quickSoup('n20','Súp gà bắp trứng','chicken',25,{cookedChicken:350,corn:300,egg:3,mushroom:150,broth:1600,starch:30,scallion:20,salt:3},'Dùng gà chín và nước dùng có sẵn; hòa bột bắp với nước nguội.',['Xé gà, thái nấm; đun nước dùng với bắp và nấm đến chín.','Thêm gà chín và làm nóng kỹ.','Hòa bột bắp với nước nguội rồi rót từ từ vào nồi, khuấy đến độ sánh mong muốn.','Rót trứng đánh tan từ từ, khuấy nhẹ và nấu chín; nêm muối, thêm hành.'],['Gà đã chín','Bữa nhẹ']),
quickSoup('n21','Súp đậu hũ rong biển','plant',15,{tofu:500,seaweed:12,mushroom:250,broth:1600,miso:45,scallion:20},'Chọn nước dùng rau củ; kiểm tra thành phần tương miso.',['Sơ chế nấm, cắt đậu hũ và ngâm rong biển theo bao bì.','Đun nước dùng rau củ, thêm nấm và nấu chín.','Cho đậu và rong biển vào, nấu nóng nhẹ.','Hòa miso với một ít nước dùng rồi cho lại nồi; chia tô và thêm hành.'],['15 phút','Bữa nhẹ']),
quickSoup('n22','Súp rau củ nui','plant',30,{pasta:250,potato:250,carrot:200,tomato:250,peas:150,broth:1800,oil:15,salt:3},'Chọn nước dùng rau củ, cắt rau củ nhỏ và đều.',['Xào mềm cà chua với dầu rồi thêm nước dùng rau củ.','Cho khoai tây và cà rốt vào nấu đến gần mềm.','Thêm nui và đậu Hà Lan, nấu theo thời gian trên bao bì đến chín.','Thêm nước nếu cần, nêm nhẹ muối và chia tô.'],['Một nồi','Nước dùng rau củ']),
quickSoup('n23','Bánh canh cá viên nhanh','fish',20,{banhCanh:650,fishBall:400,bokchoy:300,broth:1800,scallion:20,fishSauce:15},'Dùng sợi bánh canh và nước dùng có sẵn; kiểm tra nhãn cá viên.',['Đun nước dùng, cho cá viên vào nấu theo bao bì đến chín hoàn toàn.','Trụng sợi bánh canh theo thời gian ghi trên bao bì.','Thêm cải thìa vào nước dùng, nấu chín rồi nêm nước mắm.','Chia sợi, cá viên và rau ra tô, chan nước dùng và thêm hành.'],['Cá viên có sẵn','20 phút']),
quickSoup('n24','Mì trứng cà chua','egg',15,{eggNoodle:500,egg:4,tomato:350,bokchoy:250,broth:1600,oil:10,salt:3},'Dùng mì trứng và nước dùng có sẵn.',['Cắt cà chua, sơ chế cải và đánh trứng.','Xào cà chua với dầu cho mềm, thêm nước dùng và đun sôi.','Cho rau và mì vào nấu theo bao bì; rót trứng vào và nấu chín hoàn toàn.','Nêm nhẹ muối, điều chỉnh nước và chia ra tô.'],['15 phút','Một nồi'])
);

for(const r of RECIPES){if(r.category==='noodle'&&r.protein==='plant')for(const i of r.ingredients)if(i.id==='broth')i.id='vegBroth';}

// Reference ingredients introduced with the Western/Italian/Healthy collection. Price 0 means unknown.
const WESTERN_INGREDIENTS={
  "spaghetti": [
    "Mì spaghetti khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "penne": [
    "Mì penne khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "lasagne": [
    "Lá lasagna khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "arborio": [
    "Gạo arborio",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "flour": [
    "Bột mì đa dụng",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "bread": [
    "Bánh mì ổ",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "wholeBread": [
    "Bánh mì nguyên cám",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "oats": [
    "Yến mạch cán dẹt",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "quinoa": [
    "Hạt quinoa khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "brownRice": [
    "Gạo lứt khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "chickpea": [
    "Đậu gà chín, để ráo",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "lentil": [
    "Đậu lăng khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "kidneyBean": [
    "Đậu đỏ chín, để ráo",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "tuna": [
    "Cá ngừ hộp, để ráo",
    "g",
    "meat",
    0,
    "🌿",
    null
  ],
  "whiteBean": [
    "Đậu trắng chín, để ráo",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "milk": [
    "Sữa tươi không đường",
    "ml",
    "dry",
    0,
    "🌿",
    null
  ],
  "yogurt": [
    "Sữa chua tự nhiên không đường",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "cream": [
    "Kem tươi dùng nấu ăn",
    "ml",
    "dry",
    0,
    "🌿",
    null
  ],
  "butter": [
    "Bơ lạt",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "parmesan": [
    "Phô mai Parmesan",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "mozzarella": [
    "Phô mai mozzarella",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "feta": [
    "Phô mai feta",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "basil": [
    "Húng quế Ý tươi",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "oregano": [
    "Lá oregano khô",
    "g",
    "dry",
    0,
    "🌿",
    null
  ],
  "lemon": [
    "Chanh vàng",
    "quả",
    "veg",
    0,
    "🌿",
    null
  ],
  "lettuce": [
    "Xà lách",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "zucchini": [
    "Bí ngòi",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "eggplant": [
    "Cà tím",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "bellPepper": [
    "Ớt chuông",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "asparagus": [
    "Măng tây",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "avocado": [
    "Quả bơ, phần ăn được",
    "g",
    "veg",
    0,
    "🌿",
    null
  ],
  "olive": [
    "Quả ô liu ngâm, để ráo",
    "g",
    "dry",
    0,
    "🌿",
    null
  ]
};
Object.assign(INGREDIENTS,WESTERN_INGREDIENTS);
