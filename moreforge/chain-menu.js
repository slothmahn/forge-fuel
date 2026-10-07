'use strict';
// Styled chain picker delegates to the existing chain-change flow.
(()=>{
 const menu=document.querySelector('#chain-menu'),select=document.querySelector('#chain');
 const choices=[...menu.querySelectorAll('[data-chain]')],summary=menu.querySelector('summary');
 const requested=new URL(location.href).searchParams.get('chain');
 const initialChain={rh:'rh',pls:'pls','4663':'rh','369':'pls',avax:'avax','43114':'avax',eth:'eth','1':'eth'}[requested];
 if(initialChain)select.value=initialChain;
 function sync(){
  const fuel=document.querySelector('.fuel-forge-link');
  fuel.dataset.chain=select.value;
  fuel.href=select.value==='avax'?'https://thefuelforge.com/avalanche/':select.value==='eth'?'https://thefuelforge.com/ethereum/':select.value==='pls'?'https://thefuelforge.com/pulsechain/?chain=369':'https://thefuelforge.com/?chain=4663';
  fuel.setAttribute('aria-label','Fuel Forge'+(select.value==='rh'?' on Robinhood Chain':select.value==='pls'?' on PulseChain':''));
  document.querySelector('#chain-name').textContent=select.selectedOptions[0].textContent.replace(' · future','');
  for(const button of choices){if(button.dataset.chain===select.value)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
 }
 for(const button of choices)button.addEventListener('click',()=>{
  if(select.disabled)return;
  const changed=select.value!==button.dataset.chain;
  select.value=button.dataset.chain;sync();menu.open=false;summary.focus();
  if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 select.addEventListener('change',()=>{sync();menu.open=false;});
 menu.addEventListener('toggle',()=>{if(select.disabled&&menu.open)menu.open=false;});
 document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu.open){menu.open=false;summary.focus();event.preventDefault();}
  if(menu.open&&event.key==='ArrowDown'&&document.activeElement===summary){event.preventDefault();(choices.find(b=>b.hasAttribute('aria-current'))||choices[0]).focus();}
  else if(menu.open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&choices.includes(document.activeElement)){
   event.preventDefault();const i=choices.indexOf(document.activeElement);
   choices[event.key==='Home'?0:event.key==='End'?choices.length-1:(i+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length].focus();
  }
 });
 window.addEventListener('more-chain-selection-reset',sync);
 sync();
})();
