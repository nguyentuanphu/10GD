// v1.7.19 (owner, 13 Nov 2026: “do everything in this round”, rule 29): the browser's own bubbles (“Please select an item in the
// list.”, “Please fill out this field.”) follow the phone's language, not the app's. One shared helper gives every required or
// constrained input, select and textarea in the app a message in the app's language (VI/EN), and clears it as soon as the field
// is changed, so the browser checks the field again. A message an app form set itself (setCustomValidity elsewhere) is kept.
const FV_MARK='fvMsg';
function fvT(vi:string,en:string){return typeof tr==='function'?tr(vi,en):(typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi)}
function fvNumber(v:string){const n=Number(v);return Number.isFinite(n)?(typeof appLanguage!=='undefined'&&appLanguage==='en'?String(n):String(n).replace('.',',')):v}
/** The VI/EN message for a field that fails its own constraints, or '' when it is valid. */
function formValidityMessage(el:any):string{
 if(!el||!el.validity)return'';const v=el.validity,tag=String(el.tagName||'').toLowerCase(),type=String(el.type||'').toLowerCase();
 if(v.valueMissing){
  if(tag==='select')return fvT('Hãy chọn một mục trong danh sách.','Please choose an item from the list.');
  if(type==='checkbox')return fvT('Hãy đánh dấu ô này để tiếp tục.','Please tick this box to continue.');
  if(type==='radio')return fvT('Hãy chọn một trong các lựa chọn.','Please choose one of the options.');
  if(type==='file')return fvT('Hãy chọn một tệp.','Please choose a file.');
  if(type==='number')return fvT('Hãy nhập số vào ô này.','Please enter a number here.');
  if(type==='date')return fvT('Hãy chọn ngày.','Please choose a date.');
  if(type==='time')return fvT('Hãy chọn giờ.','Please choose a time.');
  return fvT('Hãy điền vào ô này.','Please fill in this field.');
 }
 if(v.badInput)return type==='number'?fvT('Hãy nhập một số.','Please enter a number.'):fvT('Giá trị này chưa đúng.','This value is not valid.');
 if(v.typeMismatch){if(type==='email')return fvT('Hãy nhập địa chỉ email đúng, ví dụ ten@vidu.com.','Please enter a valid email address, like name@example.com.');if(type==='url')return fvT('Hãy nhập địa chỉ web đúng, bắt đầu bằng https://.','Please enter a valid web address starting with https://.');return fvT('Giá trị này chưa đúng.','This value is not valid.')}
 if(v.rangeUnderflow)return type==='date'?fvT(`Hãy chọn ngày từ ${el.min} trở đi.`,`Please choose a date on or after ${el.min}.`):type==='time'?fvT(`Hãy chọn giờ từ ${el.min} trở đi.`,`Please choose a time from ${el.min}.`):fvT(`Số phải từ ${fvNumber(el.min)} trở lên.`,`The number must be ${fvNumber(el.min)} or more.`);
 if(v.rangeOverflow)return type==='date'?fvT(`Hãy chọn ngày không sau ${el.max}.`,`Please choose a date no later than ${el.max}.`):type==='time'?fvT(`Hãy chọn giờ không sau ${el.max}.`,`Please choose a time no later than ${el.max}.`):fvT(`Số không được lớn hơn ${fvNumber(el.max)}.`,`The number must be ${fvNumber(el.max)} or less.`);
 if(v.stepMismatch)return fvT(`Số này chưa đúng bước ${fvNumber(el.step)}. Hãy nhập số gần nhất hợp lệ.`,`This number does not fit steps of ${fvNumber(el.step)}. Please enter the nearest valid number.`);
 if(v.tooShort)return fvT(`Cần ít nhất ${el.minLength} ký tự (đang có ${String(el.value||'').length}).`,`Please use at least ${el.minLength} characters (now ${String(el.value||'').length}).`);
 if(v.tooLong)return fvT(`Tối đa ${el.maxLength} ký tự.`,`At most ${el.maxLength} characters.`);
 if(v.patternMismatch)return el.dataset?.patternVi||el.dataset?.patternEn?fvT(el.dataset.patternVi||el.dataset.patternEn,el.dataset.patternEn||el.dataset.patternVi):fvT('Hãy nhập đúng dạng được yêu cầu.','Please match the requested format.');
 return'';
}
function fvField(t:any){return t&&(t instanceof HTMLInputElement||t instanceof HTMLSelectElement||t instanceof HTMLTextAreaElement)?t:null}
// The browser fires “invalid” (it does not bubble, so listen in the capture phase) before it shows its bubble; the message set here
// is what the bubble shows. A field the app already marked with its own message keeps it.
document.addEventListener('invalid',e=>{const el:any=fvField(e.target);if(!el)return;if(el.validity.customError&&!el.dataset[FV_MARK])return;
 el.setCustomValidity('');const msg=formValidityMessage(el);if(!msg)return;el.setCustomValidity(msg);el.dataset[FV_MARK]='1'},true);
// Changing the field clears the message, so the browser's own checks decide again on the next submit.
function fvClear(e:Event){const el:any=fvField(e.target);if(!el||!el.dataset[FV_MARK])return;el.setCustomValidity('');delete el.dataset[FV_MARK];
 if(el.type==='radio'&&el.name&&el.form)for(const r of el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)){if((r as any).dataset[FV_MARK]){(r as any).setCustomValidity('');delete (r as any).dataset[FV_MARK]}}}
document.addEventListener('input',fvClear,true);document.addEventListener('change',fvClear,true);
(globalThis as any).formValidityMessage=formValidityMessage;
