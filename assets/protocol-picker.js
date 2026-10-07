// Keep the original select as the form value and event source; style its menu consistently.
const states=new Set(),selector='#foundry-quantity,#foundry-count[data-picker-foundry],[data-stake-sort]';
let serial=0,queued=false;
const enabled=s=>s.items.filter(item=>!item.button.disabled);
function place(s){
 const r=s.trigger.getBoundingClientRect(),margin=12,gap=6;
 if(r.bottom<0||r.top>innerHeight){close(s);return;}
 const width=Math.min(Math.max(r.width,180),innerWidth-margin*2);
 s.menu.style.width=width+'px';s.menu.style.left=Math.max(margin,Math.min(r.left,innerWidth-width-margin))+'px';
 const below=innerHeight-r.bottom-gap-margin,above=r.top-gap-margin;
 const up=below<180&&above>below,room=Math.max(60,up?above:below);
 s.menu.style.maxHeight=Math.min(340,room)+'px';
 const height=s.menu.getBoundingClientRect().height;
 s.menu.style.top=(up?Math.max(margin,r.top-gap-height):r.bottom+gap)+'px';
}
function close(s,focus=false){s.menu.hidden=true;s.trigger.setAttribute('aria-expanded','false');if(focus&&s.trigger.isConnected)s.trigger.focus();}
function sync(s){
 const value=s.select.selectedOptions[0]?.textContent||'Choose';
 if(s.value.textContent!==value)s.value.textContent=value;
 if(s.trigger.disabled!==s.select.disabled)s.trigger.disabled=s.select.disabled;
 if(s.select.disabled)close(s);
 const signature=[...s.select.options].map(o=>[o.value,o.textContent,o.disabled].join('|')).join('\n');
 if(signature!==s.signature){s.signature=signature;s.menu.replaceChildren();s.items=[];
  for(const option of s.select.options){const b=document.createElement('button');b.type='button';b.role='option';b.tabIndex=-1;b.textContent=option.textContent;b.disabled=option.disabled;b.dataset.value=option.value;
   b.addEventListener('click',()=>{if(s.select.disabled)return;s.select.value=option.value;s.select.dispatchEvent(new Event('input',{bubbles:true}));s.select.dispatchEvent(new Event('change',{bubbles:true}));sync(s);close(s,true);});
   s.items.push({button:b,value:option.value});s.menu.append(b);
  }
 }
 for(const item of s.items)item.button.setAttribute('aria-selected',String(item.value===s.select.value));
}
function open(s,focus=false){
 if(s.select.disabled)return;for(const other of states)if(other!==s)close(other);
 sync(s);s.menu.hidden=false;s.trigger.setAttribute('aria-expanded','true');place(s);
 if(focus)(s.items.find(item=>item.value===s.select.value&&!item.button.disabled)||enabled(s)[0])?.button.focus({preventScroll:true});
}
function enhance(select){
 if(select.dataset.protocolPicker)return;select.dataset.protocolPicker='true';
 const wrapper=document.createElement('span');wrapper.className='protocol-picker';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='protocol-picker-trigger';trigger.role='combobox';trigger.id='protocol-picker-'+(++serial);
 trigger.setAttribute('aria-label',select.getAttribute('aria-label')||(select.id==='foundry-quantity'||select.id==='foundry-count'?'Foundry NFTs to mint':'Sort stakes by'));
 trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 const value=document.createElement('span'),chevron=document.createElement('span');chevron.className='protocol-picker-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');trigger.append(value,chevron);wrapper.append(trigger);select.after(wrapper);
 select.classList.add('protocol-picker-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const menu=document.createElement('div');menu.className='protocol-picker-menu';menu.hidden=true;menu.role='listbox';menu.id=trigger.id+'-options';menu.setAttribute('aria-labelledby',trigger.id);trigger.setAttribute('aria-controls',menu.id);document.body.append(menu);
 const s={select,wrapper,trigger,value,menu,items:[],signature:null};states.add(s);sync(s);
 trigger.addEventListener('click',event=>{event.preventDefault();s.menu.hidden?open(s):close(s);});
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open(s,true);if(event.key==='Home')enabled(s)[0]?.button.focus();if(event.key==='End')enabled(s).at(-1)?.button.focus();}else if(event.key==='Escape'){event.preventDefault();close(s,true);}});
 menu.addEventListener('keydown',event=>{
  const items=enabled(s),i=items.findIndex(item=>item.button===document.activeElement);
  if(event.key==='Escape'){event.preventDefault();close(s,true);}
  else if(event.key==='Tab')close(s,true);
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const n=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[n]?.button.focus();}
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){const match=items.find(item=>item.button.textContent.toLowerCase().startsWith(event.key.toLowerCase()));if(match){event.preventDefault();match.button.focus();}}
 });
 select.addEventListener('change',()=>sync(s));select.addEventListener('input',()=>sync(s));
 // A label should focus the custom control, never reopen the native browser menu.
 for(const label of select.labels||[])label.addEventListener('click',event=>{if(event.target===label){event.preventDefault();trigger.focus();}});
}
function scan(){
 for(const s of states){if(!s.select.isConnected){s.menu.remove();states.delete(s);}else sync(s);}
 document.querySelectorAll(selector).forEach(enhance);
}
const observer=new MutationObserver(records=>{if(!records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))return;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan();});});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
document.addEventListener('pointerdown',event=>{for(const s of states)if(!s.menu.hidden&&!s.wrapper.contains(event.target)&&!s.menu.contains(event.target))close(s);});
window.addEventListener('resize',()=>{for(const s of states)if(!s.menu.hidden)place(s);});
window.addEventListener('scroll',()=>{for(const s of states)if(!s.menu.hidden)place(s);},true);
scan();
