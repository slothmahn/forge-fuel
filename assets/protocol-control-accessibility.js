// Match keyboard behavior across the three chain-picker renderers.
const selector='.forge-chain-select,.chain-menu,.more-chain-select';
document.addEventListener('keydown',event=>{
 const menu=event.target.closest?.(selector);if(!menu?.open)return;
 const summary=menu.querySelector('summary'),choices=[...menu.querySelectorAll('nav a,nav button,.chain-options a,.chain-options>span')].filter(e=>e.matches('a,button'));
 if(event.key==='Escape'){menu.open=false;summary.focus();event.preventDefault();return;}
 // MORE already owns its roving keyboard controls.
 if(menu.matches('.more-chain-select'))return;
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||!choices.length)return;
 event.preventDefault();const index=choices.indexOf(document.activeElement);
 const next=event.key==='Home'?0:event.key==='End'?choices.length-1:index<0?(event.key==='ArrowUp'?choices.length-1:0):(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;
 choices[next].focus();
});
