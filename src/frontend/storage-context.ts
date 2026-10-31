'use strict';
// Each signed-in household has its own device cache. The legacy cache is left intact.
const storageScope=globalThis.BEP_SESSION?.mode==='account'&&globalThis.BEP_SESSION.household?.id?'account/'+globalThis.BEP_SESSION.household.id+'/':'guest/';
const familyStorage={getItem:key=>localStorage.getItem(storageScope+key),setItem:(key,value)=>localStorage.setItem(storageScope+key,value),removeItem:key=>localStorage.removeItem(storageScope+key)};
