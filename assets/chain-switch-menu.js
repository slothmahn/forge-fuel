import {findWalletProvider} from './wallet-session.js?v=wallet-session-95';
import {switchWalletChain} from './wallet-chain-switch.js?v=chain-switch-132';
const chains=[
 {id:4663n,name:'Robinhood',unit:'ETH',rpc:'https://rpc.mainnet.chain.robinhood.com/',explorer:'https://robinhoodchain.blockscout.com',path:'/'},
 {id:369n,name:'PulseChain',unit:'PLS',rpc:'https://rpc.pulsechain.com',explorer:'https://scan.pulsechain.com',path:'/pulsechain/'},
 {id:43114n,name:'Avalanche',unit:'AVAX',rpc:'https://api.avax.network/ext/bc/C/rpc',explorer:'https://snowtrace.io',path:'/avalanche/'},
 {id:1n,name:'Ethereum',unit:'ETH',rpc:'https://ethereum-rpc.publicnode.com',explorer:'https://etherscan.io',path:'/ethereum/'}
];
const siteRoot=new URL('../',import.meta.url);
for(const link of document.querySelectorAll('.chain-options a')){
 const url=new URL(link.href),chain=chains.find(c=>url.pathname===new URL(c.path.slice(1),siteRoot).pathname);
 if(!chain)continue;
 url.searchParams.set('chain',String(chain.id));link.href=url.href;
 link.addEventListener('click',async event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(window.forgeManualChainSwitch)return;
  window.forgeManualChainSwitch=true;
  const menu=link.closest('details');menu.open=false;
  try{
   const found=window.forgeConnectedWalletProvider?{provider:window.forgeConnectedWalletProvider}:await findWalletProvider(true);
   if(found)await switchWalletChain(found.provider,chain);
   const target=new URL(link.href);target.searchParams.set('chain',String(chain.id));
   location.assign(target.href);
  }catch(error){window.notify?.(Number(error?.code)===4001?'Network switch cancelled. You are still on this page.':error?.message||'Unable to switch networks. Try again.');}
  finally{window.forgeManualChainSwitch=false;}
 });
}
