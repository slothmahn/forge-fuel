// Fit long decimal inputs without changing the value the user will submit.
const canvas=document.createElement('canvas'),measure=canvas.getContext('2d');
export function fitAmountInputs(){
 for(const input of document.querySelectorAll('.amount-field input, #buy-amount, #buy-output')){
  if(!input.clientWidth)continue;
  input.style.removeProperty('font-size');
  const style=getComputedStyle(input),base=parseFloat(style.fontSize),space=input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-4;
  measure.font=`${style.fontWeight} ${base}px ${style.fontFamily}`;
  const width=measure.measureText(input.value||input.placeholder||'0').width;
  if(width>space)input.style.fontSize=Math.max(11,Math.floor(base*space/width*10)/10)+'px';
 }
}
export function installInputSizing(){
 const schedule=()=>requestAnimationFrame(fitAmountInputs);
 document.addEventListener('input',schedule);document.addEventListener('click',schedule);
 const observer=new ResizeObserver(schedule);document.querySelectorAll('.amount-field, .buy-token-row').forEach(el=>observer.observe(el));schedule();
}
