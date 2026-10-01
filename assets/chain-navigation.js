// Shared navigation for the two live chain experiences.
const chains = [{id:4663n,name:'Robinhood Chain',path:'/'},{id:369n,name:'PulseChain',path:'/pulsechain/'}];
const current = location.pathname.startsWith('/pulsechain/') ? 369n : 4663n;
function routeChain(value) {
  let target; try { target=chains.find(chain=>chain.id===BigInt(value)); } catch { return false; }
  if (!target) return false;
  const url=new URL(location.href);
  const explicitChoice=url.searchParams.get('chain')===String(current);
  if (target.id===current) {
    // The wallet has caught up with the manually selected site.
    if (explicitChoice) {url.searchParams.delete('chain');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}
    return false;
  }
  // Do not bounce back to the wallet's old chain while opening a selected site.
  // Returning false also lets the connection flow request the selected network.
  if (explicitChoice) return false;
  const hash=['#start','#pools','#rewards','#positions','#burns'].includes(location.hash)?location.hash:'#start';
  location.replace(target.path+hash);
  return true;
}
window.forgeRouteWalletChain=routeChain;
// Only inspect an already authorized wallet; never trigger a connection prompt on load.
async function followAuthorizedWallet(provider) {
  if (!provider?.request) return;
  try {
    const accounts=await provider.request({method:'eth_accounts'});
    if (accounts?.length) routeChain(await provider.request({method:'eth_chainId'}));
  } catch { /* Visitors can still use the manual chain selector. */ }
}
function addNavigation() {
 const pill=document.querySelector('#network-pill');
 if (!pill || pill.closest('.forge-chain-select')) return;
 const menu=document.createElement('details'); menu.className='forge-chain-select';
 const summary=document.createElement('summary'); summary.setAttribute('aria-label','Choose blockchain');
 pill.before(menu); menu.append(summary); summary.append(pill);
 const arrow=document.createElement('span'); arrow.textContent='⌄'; arrow.setAttribute('aria-hidden','true'); summary.append(arrow);
 const links=document.createElement('nav'); links.setAttribute('aria-label','Live blockchain sites');
 for (const chain of chains) {
   const link=document.createElement('a'); link.href=chain.path+'?chain='+chain.id; link.textContent=chain.name;
   if(chain.id===current) link.setAttribute('aria-current','page');
   const status=document.createElement('small'); status.textContent='Live site ↗'; link.append(status); links.append(link);
 }
 menu.append(links);
 document.addEventListener('click',event=>{if(!menu.contains(event.target)) menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape') menu.open=false;});
}
const navigationObserver=new MutationObserver(()=>{addNavigation();if(document.querySelector('.forge-chain-select'))navigationObserver.disconnect();});
navigationObserver.observe(document.documentElement,{childList:true,subtree:true});
addNavigation();
followAuthorizedWallet(window.ethereum);
window.addEventListener('ethereum#initialized',()=>followAuthorizedWallet(window.ethereum),{once:true});
