// Match the established activity banner while retaining the existing notify API.
(()=>{
 const notice=document.querySelector('#toast');if(!notice)return;
 let timer;
 window.forgeTransactionNotice=message=>{
  clearTimeout(timer);
  const content=notice.querySelector('span');content.replaceChildren();
  const match=String(message).match(/https:\/\/[^\s]+$/);let link;
  if(match){try{const url=new URL(match[0]);if(['etherscan.io','snowtrace.io'].includes(url.hostname)&&/^\/tx\/0x[\da-f]{64}$/i.test(url.pathname)){link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View transaction ↗';}}catch{}}
  content.append(document.createTextNode(link?String(message).slice(0,-match[0].length).replace(/View transaction:\s*$/,''):String(message)));if(link)content.append(link);
  notice.hidden=false;timer=setTimeout(()=>{notice.hidden=true;},10000);
 };
 notice.querySelector('button').addEventListener('click',()=>{clearTimeout(timer);notice.hidden=true;});
})();
