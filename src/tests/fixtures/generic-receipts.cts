// v1.7.2 SYNTHETIC local-grocer receipts (Vietnamese / Asian grocer, butcher, greengrocer style). Invented for tests:
// store names, ABNs, prices and times are made up; no real receipt is committed (Henry will send real ones, used
// locally only). They print department words or prices only, so no item can be read from the text.
const GENERIC_RECEIPTS:any={
 'tan-viet-cabramatta':{text:`TAN VIET GROCERY CABRAMATTA
123 John St Cabramatta NSW 2166
ABN 00 000 000 000
02/11/2026 10:42
GROCERY 4.50
VEG 3.20
MEAT 11.04
0.850kg @ 12.99/kg
VEG 8.40
3.50
PLU 4011 2.10
TOTAL 32.74
CASH 40.00
CHANGE 7.26`,
  expect:{store:'TAN VIET GROCERY CABRAMATTA',date:'2026-11-02',time:'10:42',printedTotal:32.74,retailer:null,
   lines:[['l:grocery',4.5],['l:veg',3.2],['l:meat',11.04],['l:veg',8.4],['price',3.5],['p:4011',2.1]]}},
 'hoang-phat-butcher':{text:`HOANG PHAT BUTCHER & SEAFOOD
Canley Vale NSW 2166
01/11/2026 17:05
DEPT 01 12.80
0.85kg @ 12.99/kg 11.04
SEAFOOD 18.00
DELI 6.50
MISC 2.00
TOTAL 50.34
EFTPOS 50.34`,
  expect:{store:'HOANG PHAT BUTCHER & SEAFOOD',printedTotal:50.34,retailer:null,
   lines:[['d:01',12.8],['w',11.04],['l:seafood',18],['l:deli',6.5],['l:misc',2]]}},
 'fresh-fruit-market':{text:`FRESH FRUIT MARKET BANKSTOWN
31/10/2026 09:15
PRODUCE 5.60
FRUIT 7.95
VEGETABLES 3.30
ITEM 1.99
TOTAL 18.84`,
  expect:{store:'FRESH FRUIT MARKET BANKSTOWN',printedTotal:18.84,retailer:null,
   lines:[['l:produce',5.6],['l:fruit',7.95],['l:veg',3.3],['l:item',1.99]]}}
};
module.exports={GENERIC_RECEIPTS};
