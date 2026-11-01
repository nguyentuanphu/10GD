// v1.7.1 receipt-reading fixtures: OCR-like TEXT transcriptions of the 15 review photos (6 family
// ALDI receipts, 9 public Woolworths/Coles receipts). No photo is committed. Every payment / bank
// line below is a SYNTHETIC placeholder (fake card, AID, ARQC, TVR, terminal, reference, auth code,
// merchant id, transaction numbers) so the parser can be tested to ignore and redact such lines;
// staff / store-manager names are replaced by "Sample Person". Store, item, price and date lines are
// as printed (public and family receipts), not invented.
//
// `old-app-ocr` reproduces what the previous app's OCR produced for aldi-wolli-creek (junk prefixes,
// l/1 and S/5 size confusions, "1689" for "168g").
const EFT_ALDI=(total:string,date:string,kind='PURCHASE')=>`COMMONWEALTH BANK
EFTPOS
ALDI STORES - WOLLI
WOLLI CREEK NSW
TERMINAL: 00000000
REFERENCE: 000000
CARD NO.: 0000 (t)
CREDIT 000000000000
AID: A0000000000000
TVR: 0000000000
TSI: 0000
ATC: 00000000
ARQC 0000000000000000
${kind} $${total}
TOTAL AUD $${total}
MASTERCARD
AUTH CODE: 000000
${date}
APPROVED 00`;

export const RECEIPTS:Record<string,{text:string,expect:any}>={
 'aldi-wolli-creek-old-app-ocr':{text:`aS
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Tax Invoice
Si 380307 Rockmelon ea 4.99 A
hen 566385 Cut Wtrmelon Loose 5.62 A
Ba 1.611kg Net @ 3.49 $/kg
Bie 286737 Frz Salmon ikg 25.99 A
STE ve 535943 ChpsThaiChillil75g 2.99 B
Arla 548623 DSChips HSChknl75g 2.99 B
EE 402615 SrdoughSyLinsd630g 5.99 A
Bhp 400311 ChsStrips 8pk/1689 3.99 A
: 400311 ChsStrips 8pk/168g 3.99 A
: 689271 BurratalS0g 4.99 A
: 689271 Burratal50g 4.99 A
fy 380204 Blueberries 1709 3.79 A
Gu 380335 Sweet Corn 500g 3.49 A
J 399121 Chs Strm 8Pk 160g 4.49 A
i 399121 Chs Strm 8Pk 1609 4.49 A
364045 Strawberries 250g 2.79 A
i 364045 Strawberries 250g 2.79 A
: Subtotal 88.37
SUBTOTAL (INCL GST) 88.37
EFTPOS FROM WESTPAC
Wolli Creek
CUSTOMER COPY
DEBIT MASTERCARD`,expect:{retailer:'aldi',store:'ALDI Wolli Creek',items:16,printedTotal:88.37,lineSum:88.37,
  names:['Rockmelon','Cut Wtrmelon Loose','Frz Salmon 1kg','ChpsThaiChilli 175g','DSChips HSChkn 175g','SrdoughSyLinsd 630g','ChsStrips 8pk/168g','ChsStrips 8pk/168g','Burrata 150g','Burrata 150g','Blueberries 170g','Sweet Corn 500g','Chs Strm 8pk/160g','Chs Strm 8pk/160g','Strawberries 250g','Strawberries 250g']}},
 'aldi-wolli-creek':{text:`ALDI STORES
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Tax Invoice
$
380307 Rockmelon ea 4.99 A
566385 Cut Wtrmelon Loose 5.62 A
1.611kg Net @ 3.49 $/kg
286737 Frz Salmon 1kg 25.99 A
535943 ChpsThaiChilli175g 2.99 B
548623 DSChips HSChkn175g 2.99 B
402615 SrdoughSyLinsd630g 5.99 A
400311 ChsStrips 8pk/168g 3.99 A
400311 ChsStrips 8pk/168g 3.99 A
689271 Burrata150g 4.99 A
689271 Burrata150g 4.99 A
380204 Blueberries 170g 3.79 A
380335 Sweet Corn 500g 3.49 A
399121 Chs Strm 8Pk 160g 4.49 A
399121 Chs Strm 8Pk 160g 4.49 A
364045 Strawberries 250g 2.79 A
364045 Strawberries 250g 2.79 A
Subtotal 88.37
SUBTOTAL (INCL GST) 88.37
EFTPOS FROM WESTPAC
Wolli Creek
CUSTOMER COPY
DEBIT MASTERCARD`,expect:{retailer:'aldi',store:'ALDI Wolli Creek',items:16,printedTotal:88.37,lineSum:88.37}},
 'aldi-2025-03-03-a':{text:`ALDI STORES
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Tax Invoice
$
398866 Cream Whipped 250g 5.29 A
398866 Cream Whipped 250g 5.29 A
398949 a2 Fl Crm Milk 2L 6.89 A
585836 >20VSpreader 5.99 B
599722 *2in1PrunerHedg 99.99 B
380285 Strawberries 350g 5.49 A
380285 Strawberries 350g 5.49 A
Subtotal 134.43
SUBTOTAL (INCL GST) 134.43
341636 Le Bag Recycle 0.99 B
Subtotal 135.42
SUBTOTAL (INCL GST) 135.42
${EFT_ALDI('135.42','03 MAR 2025 16:36')}
Rounding 0.00
Total (INCL GST) $ 135.42
8 Items
EFTPOS $ 135.42
A 00.0% Net 28.43 GST 0.00
B 10.0% Net 97.25 GST 9.74
*0000 0563/001/028 03.03.25 16:36
Warranty
585836 >20VSpreader:
60 months
599722 *2in1PrunerHedg:
60 months
THANK YOU FOR SHOPPING AT ALDI`,expect:{retailer:'aldi',store:'ALDI Wolli Creek',items:8,printedTotal:135.42,lineSum:135.42,printedCount:8,date:'2025-03-03',time:'16:36'}},
 'aldi-2025-03-03-b':{text:`ALDI STORES
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Tax Invoice
398866 Cream Whipped 250g 5.29 A
398866 Cream Whipped 250g 5.29 A
398949 a2 Fl Crm Milk 2L 6.89 A
585836 >20VSpreader 5.9?
599722 *2in1PrunerHedg 99.99 B
380285 Strawberries 350g 5.4?
380285 Strawberries 350g 5.49 A
Subtotal 134.43
341636 Le Bag Recycle 0.99 B
Subtotal 135.42
${EFT_ALDI('135.42','03 MAR 2025 16:36')}
Total (INCL GST) $ 135.42
8 Items
*0000 0563/001/028 03.03.25 16:36`,expect:{retailer:'aldi',items:8,printedTotal:135.42,lineSum:135.42,repaired:2,date:'2025-03-03',time:'16:36'}},
 'aldi-2021-refund':{text:`ALDI STORES
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Refund Tax Invoice
701806 >Monitor Arm S/D -49.99 B
SUBTOTAL (INCL GST) -49.99
${EFT_ALDI('50.23','18 AUG 2021 13:37','REFUND')}
CREDIT SURCHARGE GST B -0.24 B
TOTAL SURCHARGE 0.50% -0.24
Rounding 0.00
Total (INCL GST) $ -50.23
-1 Items
MASTERCARD $ -50.23
B 10.0% Net -45.66 GST -4.57
*0000 0000/000/000/000 18.08.21 13:37
THANK YOU FOR SHOPPING AT ALDI`,expect:{retailer:'aldi',refund:true,items:2,printedTotal:-50.23,lineSum:-50.23,printedCount:-1,date:'2021-08-18'}},
 'aldi-2020-full':{text:`ALDI STORES
A LIMITED PARTNERSHIP
Wolli Creek
ABN: 90 196 565 019
Tax Invoice
$
58599 P/Towel 2ply 4pk 2.99 B
701841 *20V Battery 4.0Ah 39.99 B
701841 *20V Battery 4.0Ah 39.99 B
701842 >20V Batt&ChrgrKit 39.99 B
701048 *20VBrshlesHamDril 99.99 B
64158 Drill Accessory 9.99 B
701104 >Stick Mixer Prof. 59.99 B
700584 >FryerAirDig 2.5L 39.99 B
64158 Drill Accessory 9.99 B
800310 Cutting Disc/Blade 9.99 B
800310 Cutting Disc/Blade 9.99 B
701045 >20VBrshlessDrill 49.99 B
800310 Cutting Disc/Blade 9.99 B
64158 Drill Accessory 9.99 B
64158 Drill Accessory 9.99 B
99764 Garden Hand Tools 3.99 B
53313 FacialTis2ply224pk 0.95 B
53313 FacialTis2ply224pk 0.95 B
5567 Dog Food Beef 100g 4.50 B
Qty 6 @ $0.75 ea.
SUBTOTAL (INCL GST) 453.24
${EFT_ALDI('455.50','23 MAY 2020 08:51')}
CREDIT SURCHARGE GST B 2.26 B
TOTAL SURCHARGE 0.50% 2.26
Rounding 0.00
Total (INCL GST) $ 455.50
24 Items
MASTERCARD $ 455.50
B 10.0% Net 414.09 GST 41.41
*0000 504/145/005/021 23.05.20 08:51
Warranty
701841 *20V Battery 4.0Ah:
1 year
701842 >20V Batt&ChrgrKit:
1 year
701048 *20VBrshlesHamDril:
5 years
701104 >Stick Mixer Prof.:
36 months
700584 >FryerAirDig 2.5L:
12 months
701045 >20VBrshlessDrill:
5 years
THANK YOU FOR SHOPPING AT ALDI
VISIT ALDI.COM.AU FOR TRADING HOURS`,expect:{retailer:'aldi',items:20,goods:19,printedTotal:455.5,lineSum:455.5,printedCount:24,countRead:24,date:'2020-05-23',time:'08:51'}},
 'aldi-2020-bottom':{text:`${EFT_ALDI('455.50','23 MAY 2020 08:51')}
CREDIT SURCHARGE GST B 2.26 B
TOTAL SURCHARGE 0.50% 2.26
Rounding 0.00
Total (INCL GST) $ 455.50
24 Items
MASTERCARD $ 455.50
B 10.0% Net 414.09 GST 41.41
*0000 504/145/005/021 23.05.20 08:51
Warranty
701841 *20V Battery 4.0Ah:
1 year
701045 >20VBrshlessDrill:
5 years
THANK YOU FOR SHOPPING AT ALDI`,expect:{retailer:'aldi',goods:0,printedTotal:455.5,date:'2020-05-23',warning:'no-items'}},
 'ww-9-frenchs-forest':{text:`Woolworths
The fresh food people
1063 Frenchs Forest PH: 02 9308 7355
Cnr Russell Avenue and Forest Way
TAX INVOICE - ABN 88 000 014 675
$
^ Gippsland Dairy Yogurt Mang/Orange 700g 5.50
Nothing but 100 Apple Juice 1L 6.00
#WW Choc Coated Sticks 10pk 865ml
Qty 2 @ $4.20 each 8.40
Cracker Barrel SliceExtra Sharp 250g 9.20
Dairy Farmers Milk Whole 1L BTL 2.80
#Energizer Ultimate Lithium 2032 2Pk 13.00
#Bickfords Cordial Lemon 750ml 5.00
Praise Mayonnaise Whole Egg 670g 6.30
Dorsogna PremiumAust Ham Off Bone Shaved 36.00
Thank you for shopping with us
STORE 1063 POS 001 TRANS 0000 16:41 27/02/2024`,expect:{retailer:'woolworths',store:'Woolworths Frenchs Forest',items:9,printedTotal:null,date:'2024-02-27',time:'16:41',warning:'no-total'}},
 'ww-10-dee-why-two':{text:`Woolworths
The fresh food people
1472 Dee Why PH: 02 8565 9384
37 Howard Avenue
TAX INVOICE - ABN 88 000 014 675
$
Wagyu Beef Porterhouse Steak 24.96
Bean Round
0.177 kg NET @ $4.90/kg 0.87
#MARINATED 4.50
#MARINATED 4.50
Bellis Ice 5kg
Kenilworth Rich Choc Mousse 170g 7.20
Qty 2 @ $3.60 each
Carrot Dutch Bunch 3.50
Broccolini Bunch 2.00
Mushroom Oyster 150g P/P 4.00
Berry Blackberry Premium 125g P/P 5.50
Berry Blackberry 125g P/P 4.50
11 SUBTOTAL $61.53
TOTAL $61.53
WOOLWORTHS 1472
DEE WHY T/C NSW
MERCH ID:000000000000000
TERM ID: W0000000
Woolworths
The fresh food people
1472 Dee Why PH: 02 8565 9384
37 Howard Avenue
TAX INVOICE - ABN 88 000 014 675
Berry Blackberry Premium 125g P/P
Qty 2 @ $5.90 each 11.80
2 SUBTOTAL $11.80
TOTAL $11.80
APPROVED 00
08/05/20 15:23 000000`,expect:{retailer:'woolworths',store:'Woolworths Dee Why',goods:10,printedTotal:61.53,lineSum:61.53,printedCount:11,countRead:11,warning:'multiple'}},
 'ww-11-eastlands':{text:`Woolworths
The fresh food people
7014 Eastlands PH: 03 6227 4833
25 Bligh Street
TAX INVOICE - ABN 88 000 014 675
$
Grape White Seedless
1.100 kg NET @ $8.90/kg 9.79
Don Cocktail Frankfurts 8.22
Dorsogna Tasty Sticks Mild Kg 300.65
Apple Jazz
0.567 kg NET @ $6.90/kg 3.91
Melon Watermelon Cut
2.055 kg NET @ $1.90/kg 3.90
Broccoli
0.292 kg NET @ $5.00/kg 1.
Banana Cavendish
0.737 kg NET @ $3.50/kg
Apricot
0.307 kg NET @ $6.90/kg
Sevalle Toiletissue 3ply 190sh 24pk
Kleenex FacialTiss XcareAloevera 95pk`,expect:{retailer:'woolworths',store:'Woolworths Eastlands',printedTotal:null,warning:'odd-price'}},
 'ww-uk-12':{text:`WOOLWORTHS
Unit 4, Beckton Retail Park
London, E6 4LA
VAT No:927 4915 94
www.woolworths.co.uk
200059140 WW PAPER TRIMMER 4.99
D200 You have saved 50% -2.50
340016600 2 CLIP HANGERS 1.20
D340 You have saved 50% -0.60
340016600 2 CLIP HANGERS 1.20
D340 You have saved 50% -0.60
340016600 2 CLIP HANGERS 1.20
D340 You have saved 50% -0.60
340016600 2 CLIP HANGERS 1.20
D340 You have saved 50% -0.60
252020510 OVAL HOOKS LRG SEL 0.50
D252 You have saved 50% -0.25
010055170 WW MINT HUMBUGS 0.79
D010 You have saved 50% -0.40
252020410 ROUND HOOKS SELF A 1.49
D252 You have saved 50% -0.75
252020480 CLOTH HOLDER RUBBE 1.49
D252 You have saved 50% -0.75
260061600 1M HDMI TO HDMI L 15.99
D260 You have saved 50% -8.00
Subtotal £15.00
Total £15.00
Cash 20.00
Cash Change 5.00`,expect:{retailer:'woolworths-uk',currency:'GBP',items:10,printedTotal:15,lineSum:15,warning:'non-aud'}},
 'ww-13-mt-pleasant':{text:`Woolworths
The fresh food people
4857 New - Mt Pleasant PH: 08 9203 3545
Cnr Canning Hwy and Reynolds Rd
TAX INVOICE - ABN 88 000 014 675
$
Tomato Gourmet
0.177 kg NET @ $5.90/kg 1.04
^ Helgas Traditional White Wraps 508g 8pk 4.00
The Good Farmer Free Range 700g 6.90
^#Lindt Excellence S/Salt Caramel 100g 2.50
^#Lindt Excellence Crbry Almnd Hzlnut 100g 2.50
^#McCain Pizza U/Thin Crust Angus Beef320g 3.75
^#McCain Pizza U/Thin Crust Tandoori 320g 3.75
^#Chandler Original Cat Litter 7L 6.00
8 SUBTOTAL $30.44
TOTAL $30.44`,expect:{retailer:'woolworths',store:'Woolworths Mt Pleasant',items:8,printedTotal:30.44,lineSum:30.44,printedCount:8,countRead:8,
  names:['Tomato Gourmet','Helgas Traditional White Wraps 508g 8pk','The Good Farmer Free Range 700g','Lindt Excellence S/Salt Caramel 100g','Lindt Excellence Crbry Almnd Hzlnut 100g','McCain Pizza U/Thin Crust Angus Beef 320g','McCain Pizza U/Thin Crust Tandoori 320g','Chandler Original Cat Litter 7L']}},
 'coles-14-partial':{text:`Description $
* UNCLE TOBYS PLUS 410GRAM 2.25
* MT FRANKLIN WATER 12PACK 3.50
*%KELLOGG'S LCM'S SPLI 138GRAM 6.00
2 @ $3.00 EACH
% ANNABEL KARMEL CHLAS 200GRAM 1.00
2 @ $0.50 EACH
% AK BEEF & KALE CANNE 200GRAM 1.00
2 @ $0.50 EACH
*%KETTEL 5PACK 92GRAM 0.50
*%PETERS DRUMSTICK 475ML 4.00
GREAT OCEAN ROAD FRE 1LITRE 1.79
FARM FRESH CAGE 12PK 700GRAM 3.00
BANANAS PERKG 3.32
0.851 kg NET @ $3.90/kg
Sub Total: $26.36
Rounding: -$0.01
Total for 13 items: $26.35
Cash $50.00`,expect:{retailer:'coles',items:11,goods:10,printedTotal:26.35,lineSum:26.35,printedCount:13,countRead:13}},
 'coles-15-victoria-park':{text:`Store: 340 - CS VICTORIA PARK EAS
Store Manager: Sample Person
Phone: 08 6112 6300
Served By: Assisted Checkout
Register: 112 Receipt: 0000
Date: 31/10/2024 Time: 13:30
Description $
BEEF 3 STAR REGULAR 1KG 11.00
V2 BEEF BURGER 4PK 452GRAM 5.40
BROWN ONIONS 1KG 1.70
BRUSHED POTATOES 2KG 6.50
IMPERFECT MANDARINS 1KG 4.50
COLES AUS CHEDDAR 1KG 9.90
COLES SIMPLY MIX VEG 1KG 2.80
CLS CHKN BURGER BULK 1.2KG 11.00
I'M PERFECT CARROTS 1.5KG 2.60
JUMBO PK BBY SPN 400GRAM 6.00
COLES TOMATO SAUCE 2LITRE 5.30
COLES FISH CAKES 350GRAM 9.20
2 @ $4.60 EACH
* GEO EV CANOLA OIL 4LITRE 19.00
COLES SOFT WHOLEMEAL 650GRAM 2.80
COLES ROLLS 540GRAM 2.30
Total for 16 items: $100.00
EFT $100.00
GST INCLUDED IN TOTAL $0.00`,expect:{retailer:'coles',store:'Coles Victoria Park Eas',items:15,printedTotal:100,lineSum:100,printedCount:16,countRead:16,date:'2024-10-31',time:'13:30'}},
 'coles-16-waterloo':{text:`coles
Value the Australian way
Store: 987 - CS WATERLOO
Store Manager: Sample Person
Phone: 02 9549 3700
Served By: Assisted Checkout
Register: 118 Receipt: 0000
Date: 24/05/2023 Time: 19:56
Description $
WESTERN STAR SPREADA 375GRAM 5.50
A2 DAIRY FULL CREAM 1LITRE 3.80
WNDER WHTE H FIBRE 700GRAM 4.40
VEGEMITE 380GRAM 7.00
BEGA NATURAL D 500GRAM 10.50
Total for 5 items: $31.20
EFT $31.20
GST INCLUDED IN TOTAL $0.00
Coles NSW AU`,expect:{retailer:'coles',store:'Coles Waterloo',items:5,printedTotal:31.2,lineSum:31.2,printedCount:5,date:'2023-05-24',time:'19:56'}},
 'coles-17-casuarina':{text:`Coles Supermarkets Australia Pty Ltd
Tax Invoice ABN: 45 004 189 708
coles
Store: 4460 - CS CASUARINA
Store Manager: .
Phone: 02 83985900
Served By: Assisted Checkout
Register: 113 Receipt: 0000
Date: 31/03/2024 Time: 17:16
Description $
% SNICKERS ICE CREAM B 300ML 9.50
% RANI SP MALAI KULFI 475GRAM 8.75
*%SMITHS DOUBLE CRUNCH 150GRAM 2.40
*%SMITHS DOUBLE CRUNCH 150GRAM 2.40
Credit -$17.17
Total for 4 items: $5.88
EFT $5.88
GST INCLUDED IN TOTAL $0.53`,expect:{retailer:'coles',store:'Coles Casuarina',items:5,goods:4,printedTotal:5.88,lineSum:5.88,printedCount:4,countRead:4,date:'2024-03-31',time:'17:16'}}
};
