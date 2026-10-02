import {readPositions,readPool,readClaims} from './chain-data.js?v=more-forge-loading-47';
import {installInputSizing,fitAmountInputs} from './input-sizing.js?v=more-forge-polish-33';
import {displayAmount,amountText} from './amounts.js?v=more-forge-polish-33';
import {burnAbi,readBurn,burnMarkup,burnTotal,ownerSetting} from './burn-ui.js?v=more-forge-polish-33';
import {poolMarkup} from './pool-ui.js?v=more-forge-bitcoin-convert-38';
import {installBitcoinConversion} from './bitcoin-ui.js?v=more-forge-conversion-block-46';
import {installBuy} from './buy-ui.js?v=more-forge-polish-33';
import {referenceMarkup,setReference,refreshReferences,clearReferences} from './usd-reference.js?v=more-forge-burns-32';
import {BrowserProvider,JsonRpcProvider,Contract,Interface,parseUnits,formatUnits,isAddress} from './vendor/ethers-6.15.0.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const networks={rh:{id:4663,rpc:'https://rpc.mainnet.chain.robinhood.com/',unit:'ETH',btc:'cbBTC',explorer:'https://explorer.robinhood.com'},pls:{id:369,rpc:'https://rpc.pulsechain.com',unit:'PLS',btc:'wBTC',explorer:'https://scan.pulsechain.com'}};
const erc20=['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)','function decimals() view returns(uint8)'];
const positionAbi=['function requiredFee(uint256) view returns(uint256)','function previewPower(uint256,uint256) view returns(uint256)','function createPosition(uint256,uint256) payable returns(uint256)','function nextTokenId() view returns(uint256)','function positions(uint256) view returns(uint256 burned,uint256 initialPower,uint256 createdAt,uint256 maturity)','function ownerOf(uint256) view returns(address)','function safeTransferFrom(address,address,uint256)'];
const vaultAbi=['function cycleAt(uint256) view returns(uint256)','function deadline(uint256) view returns(uint256)','function cycleBalance(uint256) view returns(uint256)','function nativeCycleBalance(uint256) view returns(uint256)','function cycles(uint256) view returns(uint256 cursor,uint256 upperTokenId,uint256 totalPower,uint256 participantPool,uint256 claimed,uint256 callerPaid,bool started,bool settled)','function claimable(uint256,uint256) view returns(uint256)','function referenceQuote() view returns(address)'];
const helperAbi=['function settle((uint8 pool,uint256 cycleId,uint256 maxPositions)[])','function claim((uint8 pool,uint256 cycleId,uint256 tokenId)[])'];
let deployments={},ctx,epoch=0,provider,account,busy=false,poolsRefreshing=false,quotes={},reviewed=null;const cache=new Map(),refreshes=new WeakMap();
const fmt=(n,d=6)=>Number.isFinite(Number(n))?Number(n).toLocaleString(undefined,{maximumFractionDigits:d}):'—';const units=(n,d=18)=>formatUnits(n,d);const showUnits=(n,d=18)=>displayAmount(n,d,8);const date=n=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(n)*1000));
function status(t){$('#connection-status').textContent=t;}function error(e){return e.shortMessage||e.message||String(e);}function tab(key){window.moreForgeTabs.select(key);}
function validInput(){const raw=$('#amount').value;if(!/^(?:\d+)(?:\.\d{0,18})?$/.test(raw))throw Error('Enter a MORE amount with up to 18 decimals.');const amount=parseUnits(raw,18),days=Number($('#term').value);if(amount<=0n||!Number.isInteger(days)||days<8||days>1000)throw Error('Choose a positive burn and a term from 8 to 1,000 days.');return{amount,days};}
function disable(){for(const e of $$('button,select,input'))e.disabled=busy;$$('[data-execute]').forEach(b=>b.disabled=busy||!ctx?.ready||b.dataset.ready!=='true'||!account);$('#claim-reset').hidden=true;$('#claim-open').disabled=busy||!ctx?.dataLoaded||!ctx?.claims?.length;$('#settle-due').disabled=busy||poolsRefreshing||!account||!ctx?.due?.length;$('#refresh-pools').disabled=busy||poolsRefreshing||!ctx?.ready;$('#build-form .primary-button').disabled=busy||!ctx?.dataLoaded||!account||ctx.now<ctx.m.siteOpeningTime;buyUi.disable();bitcoinUi.disable();}
const contracts=(m,r)=>({position:new Contract(m.position,positionAbi,r),more:new Contract(m.more,erc20,r),vaults:m.vaults.map(v=>new Contract(v,vaultAbi,r)),burners:m.burners.map(b=>new Contract(b,burnAbi,r)),helper:new Contract(m.helper,helperAbi,r)});
const buyUi=installBuy({context:()=>ctx,account:()=>account,isBusy:()=>busy,marketPrices:()=>quotes,action,tab,status});
const bitcoinUi=installBitcoinConversion({context:()=>ctx,account:()=>account,isBusy:()=>busy,action});
function blank(){bitcoinUi.update();$('#settle-status').textContent='Settlement status appears after chain data loads.';clearReferences(document);for(const id of ['#term-payouts','#payouts','#pool-overview','#pool-cards','#burn-cards','#burn-overview','#claim-totals','#claim-cycles','#position-controls'])$(id).replaceChildren();for(const id of ['#native-fee','#total-cost','#burn-value','#share','#power','#multiplier','#claim-usd','#term-native-total','#term-bitcoin-total','#term-usd-total'])$(id).textContent='—';}
async function load(){if(busy)return;const e=++epoch,key=$('#chain').value;status('Loading selected chain…');ctx=null;reviewed=null;blank();buyUi.update();disable();quotes={};window.dispatchEvent(new Event('more-chain-change'));const n=networks[key],m=deployments[key];if(!n||!m){status('This chain is planned for a future deployment.');return;}$('#hero-native').textContent='$'+n.unit;$('#hero-bitcoin').textContent='$'+n.btc;$('.native-symbol').textContent=key==='rh'?'◇':'⬡';if(m.status!=='deployed'){status('Launch preparation · contracts are not activated. Wallet transactions are disabled.');return;}try{const r=new JsonRpcProvider(m.rpc||n.rpc,n.id,{staticNetwork:true});const codes=await Promise.all([m.position,m.helper,...m.vaults,...m.burners].map(a=>r.getCode(a)));if(codes.some(c=>c==='0x'))throw Error('Deployment verification failed.');if(e!==epoch)return;ctx={key,n,m,r,c:contracts(m,r),ready:true,dataLoaded:false,now:0,positions:[],owned:[],claims:[],due:[],pools:[]};buyUi.update();disable();await refresh();}catch(err){if(e===epoch){ctx=null;status('Unable to load this chain: '+error(err));disable();}}}
async function wallet(){if(!provider)throw Error('Connect your wallet first.');const accounts=await provider.request({method:'eth_accounts'});if(accounts[0]?.toLowerCase()!==account?.toLowerCase())throw Error('Wallet account changed. Reconnect before continuing.');if(Number(BigInt(await provider.request({method:'eth_chainId'})))!==ctx.n.id){await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+ctx.n.id.toString(16)}]});}const browser=new BrowserProvider(provider);return await browser.getSigner(account);}
const discovered=[],listening=new WeakSet();
function addProvider(p,info={}){if(typeof p?.request!=='function')return;const existing=discovered.find(x=>x.p===p);if(existing){existing.info={...existing.info,...info};return;}discovered.push({p,info});}
window.addEventListener('eip6963:announceProvider',e=>addProvider(e.detail?.provider,e.detail?.info));
window.dispatchEvent(new Event('eip6963:requestProvider'));
function preferredProvider(){
  addProvider(window.ethereum);for(const p of window.ethereum?.providers||[])addProvider(p);addProvider(window.rabby);
  const rabby=discovered.find(x=>x.info?.rdns==='io.rabby'||x.p.isRabby===true);
  return rabby?.p||(typeof window.ethereum?.request==='function'?window.ethereum:null)||discovered[0]?.p;
}
$('#connect-wallet').onclick=async()=>{try{window.dispatchEvent(new Event('eip6963:requestProvider'));provider=preferredProvider();await connect();}catch(e){status(error(e));}};
async function connect(){
  if(!provider)throw Error('Open this page in a browser with your wallet extension.');
  const selected=provider,a=await selected.request({method:'eth_requestAccounts'});
  if(!Array.isArray(a)||!a[0])throw Error('Unlock your wallet and try connecting again.');
  if(selected!==provider)throw Error('Wallet changed. Connect again.');
  account=a[0];if(ctx){ctx.dataLoaded=false;ctx.claims=[];ctx.owned=[];ctx.balance=0n;}buyUi.update();disable();$('#connect-wallet').textContent=account.slice(0,6)+'…'+account.slice(-4);
  if(!listening.has(selected)){
    selected.on?.('accountsChanged',a=>{if(provider!==selected)return;account=a[0]||null;$('#connect-wallet').textContent=account?account.slice(0,6)+'…'+account.slice(-4):'Connect wallet';if(ctx){ctx.dataLoaded=false;ctx.claims=[];ctx.owned=[];ctx.balance=0n;}buyUi.update();disable();if(!busy)refresh().catch(e=>status(error(e)));});
    selected.on?.('chainChanged',()=>{if(provider===selected&&!busy)refresh().catch(e=>status(error(e)));});
    listening.add(selected);
  }
  await refresh();
}
// Coalesce overlapping timer, wallet and manual refreshes. A requested rerun
// completes before callers continue, including refreshes after a transaction.
async function refresh(){
 const x=ctx;if(!x)return;
 const running=refreshes.get(x);
 if(running){running.again=true;return running.promise;}
 const entry={again:false};refreshes.set(x,entry);
 entry.promise=(async()=>{do{entry.again=false;await readChain(x);}while(entry.again&&ctx===x);})().finally(()=>refreshes.delete(x));
 return entry.promise;
}
async function readChain(x){
 const e=epoch,a=account,current=()=>e===epoch&&x===ctx&&a===account;
 if(x!==ctx)return;
 try{
 status('Reading live balances…');
 const block=await x.r.getBlock('latest');
 if(!current())return;
 const options={blockTag:block.number},key=x.key+':'+x.m.position,saved=cache.get(key)||new Map();
 cache.set(key,saved);x.now=block.timestamp;x.block=block.number;
 const quoteBitcoin=async(v,amount,opts)=>{
   const address=await v.referenceQuote(opts);
   const q=new Contract(address,['function quote(uint256) view returns(uint256,uint256)'],x.r);
   const [value]=await q.quote(amount,opts);return value;
 };
 // Pool reads, position discovery and burner checks do not depend on each other.
 // Handle the burner promise immediately so a slow or failed burner cannot
 // prevent balances, rewards, or the buy form from being displayed.
 const burns=renderBurns(x,a,current).then(()=>({ok:true}),err=>({ok:false,err}));
 const poolReads=Promise.all(x.c.vaults.map((v,i)=>readPool(v,i,block.timestamp,options,quoteBitcoin)));
 const walletReads=(async()=>{
   const [next,balance]=await Promise.all([x.c.position.nextTokenId(options),a?x.c.more.balanceOf(a,options):0n]);
   const positions=await readPositions(x.c.position,next,saved,options);
   const owners=a?await Promise.all(positions.map(p=>x.c.position.ownerOf(p.id,options))):[];
   const owned=a?positions.filter((p,i)=>owners[i].toLowerCase()===a.toLowerCase()):[];
   return {positions,owned,balance};
 })();
 const [records,{positions,owned,balance}]=await Promise.all([poolReads,walletReads]);
 const claims=(await Promise.all(records.map((record,i)=>readClaims(x.c.vaults[i],record,owned,x.m.launchTime,options)))).flat();
 if(!current()){await burns;return;}
 Object.assign(x,{positions,owned,balance,pools:records.map(r=>r.pool),due:records.flatMap(r=>r.due?[r.due]:[]),claims,dataLoaded:true});
 $('.field-help').textContent=a?'Wallet balance: '+displayAmount(balance)+' MORE':'Connect wallet to see your MORE balance';
 $('.field-help').title=a?'Exact balance: '+units(balance)+' MORE':'';
 status(x.now<x.m.siteOpeningTime?'Opening '+date(x.m.siteOpeningTime):a?'Connected · live '+x.n.unit+' chain balances':'Live chain balances · connect wallet to burn or claim');
 renderPools(x);renderRewards(x);buyUi.update();refreshReferences(document,quotes);disable();
 const [burnResult]=await Promise.all([burns,preview()]);
 if(!current())return;
 if(!burnResult.ok){$('#burn-cards').replaceChildren();$('#burn-overview').textContent='Burn data is temporarily unavailable. Refresh to retry.';status('Balances loaded · burn data unavailable: '+error(burnResult.err));}
 disable();
 }catch(err){if(current())throw err;}
}
async function preview(){fitAmountInputs();const x=ctx,e=epoch;if(!x)return;let v;try{v=validInput();}catch{clearReferences($('#panel-build'));disable();$('#build-form .primary-button').disabled=true;return;}try{const [fee,power]=await Promise.all([x.c.position.requiredFee(v.amount),x.c.position.previewPower(v.amount,v.days)]);if(e!==epoch||x!==ctx)return;x.preview={...v,fee,power};const mult=Number(power)/Number(v.amount),bigger=1+Math.min(Number(units(v.amount))/1000,1);amountText($('#burn-value'),v.amount,'MORE');$('#native-fee').textContent=showUnits(fee)+' '+x.n.unit;$('#total-cost').textContent='Burn value + protocol fee';setReference($('#burn-usd'),{MORE:v.amount});setReference($('#fee-usd'),{NATIVE:fee});setReference($('#total-usd'),{MORE:v.amount,NATIVE:fee});amountText($('#power'),power,'power',2);$('#multiplier').textContent=fmt(mult,4)+'×';$('#power-ring').style.setProperty('--power-angle',Math.min(mult/5,1)*360+'deg');$('#amount-bonus').textContent=fmt(bigger,4)+'×';$('#term-bonus').textContent=fmt(mult/bigger,4)+'×';$('#detail-burned').innerHTML=displayAmount(v.amount)+' MORE'+referenceMarkup({MORE:v.amount});$('#detail-burned').title='Exact amount: '+units(v.amount)+' MORE';$('#detail-term').textContent=v.days+' days · earning power ends '+date(x.now+v.days*86400);$('#term-estimate-title').textContent='Estimated rewards from current cycles';let native=0n,btc=0n;const shares=[];const rows=x.pools.map(p=>{const deadline=BigInt(p.deadline);const existing=x.positions.reduce((n,z)=>n+(z.created<deadline&&z.maturity>=deadline?z.power:0n),0n);const eligible=x.now<Number(deadline)&&x.now+v.days*86400>=Number(deadline);const denom=existing+power;const share=eligible&&denom?Number(power*1000000n/denom)/10000:0;shares.push(share);const addition=fee*BigInt([2688,2268,1764,1680][p.i])/10000n;let funding=p.balance;if(p.i<3)funding+=addition;else if(p.native>0n)funding+=p.btcQuote;const payout=eligible&&denom?funding*9975n/10000n*power/denom:0n;if(p.i<3)native+=payout;else btc+=payout;return `<div><b>${p.days} Day<small>${date(deadline)}</small></b><div><strong>${eligible?'≈ '+showUnits(payout,p.i===3?8:18)+' '+(p.i===3?x.n.btc:x.n.unit):'Term ends before deadline'}</strong>${eligible?referenceMarkup({[p.i===3?'BTC':'NATIVE']:payout}):''}<small>${p.i===3?'Bitcoin estimate excludes your unconverted entry contribution':fmt(share,4)+'% estimated share'}</small></div></div>`;}).join('');$('#payouts').innerHTML=$('#term-payouts').innerHTML=rows;$('#share').textContent=fmt(shares[0],4)+'%';$('#term-native-total').textContent='≈ '+showUnits(native)+' '+x.n.unit;$('#term-bitcoin-total').textContent='+ '+showUnits(btc,8)+' '+x.n.btc;setReference($('#term-usd-total'),{NATIVE:native,BTC:btc});refreshReferences(document,quotes);disable();if(account&&v.amount>x.balance)$('#build-form .primary-button').disabled=true;}catch(e){$('#native-fee').textContent='Quote unavailable';clearReferences($('#panel-build'));$('#build-form .primary-button').disabled=true;status(error(e));}}
function renderPools(x){
 const view=poolMarkup(x,Boolean(account));$('#pool-overview').innerHTML=view.overview;$('#pool-cards').innerHTML=view.cards;bitcoinUi.update();refreshReferences($('#panel-pools'),quotes);
 $('[data-pool-rewards]').onclick=e=>{e.preventDefault();tab('rewards');};
 $('#settle-status').textContent=x.due.length?`${x.due.length} closed funded cycle${x.due.length===1?'':'s'} require on-chain processing. One transaction processes up to 15 position records per pool; large snapshots require further calls. The caller receives its share of the 0.25% settlement reward.`:'No funded cycles are ready to settle.';
}
async function refreshPools(){if(busy||poolsRefreshing||!ctx?.ready)return; poolsRefreshing=true;disable();try{await refresh();return true;}catch(e){status(error(e));return false;}finally{poolsRefreshing=false;disable();}}
$('#refresh-pools').onclick=refreshPools;
function renderRewards(x){let native=0n,btc=0n;for(const c of x.claims)c.pool===3?btc+=c.value:native+=c.value;$('#claim-totals').innerHTML=`<div><b>${showUnits(native)} ${x.n.unit}</b>${referenceMarkup({NATIVE:native})}</div><div><b>${showUnits(btc,8)} ${x.n.btc}</b>${referenceMarkup({BTC:btc})}</div>`;setReference($('#claim-usd'),{NATIVE:native,BTC:btc});$('#claim-cycles').innerHTML=x.claims.map(c=>`<div>Position #${c.id} · ${[8,28,88,288][c.pool]} Day · Cycle ${c.cycle}: ${showUnits(c.value,c.pool===3?8:18)} ${c.pool===3?x.n.btc:x.n.unit}${referenceMarkup({[c.pool===3?'BTC':'NATIVE']:c.value})}</div>`).join('');$('#claim-status').textContent=account?(x.claims.length?x.claims.length+' rewards ready. Up to 20 reward records per claim transaction.':'No settled rewards available for this wallet.'):'Connect wallet to load your rewards.';$('#position-controls').innerHTML=x.owned.length?'<details><summary>Transfer reward rights to another wallet</summary>'+x.owned.map(p=>`<p>Position #${p.id} · ${date(p.maturity)} · ${Number(p.maturity)>=x.now?'earning power active':'earning power ended'} <button data-transfer="${p.id}">Transfer position</button></p>`).join('')+'<p>A transfer gives the recipient all future and unclaimed rewards for that position.</p></details>':'';$$('[data-transfer]').forEach(b=>b.onclick=()=>transfer(BigInt(b.dataset.transfer)));}
async function renderBurns(x,a=account,current=()=>x===ctx&&a===account){
 const rows=await Promise.all(x.c.burners.map((b,i)=>readBurn(b,x.r,x.m.burners[i],a||x.m.owner,x.now)));
 if(!current())return;
 const open=$$('.owner-burn-settings').map(d=>d.open);
 const active=document.activeElement,editing=active?.dataset.burnSetting,typed=editing?active.value:null;
 const view=burnMarkup(x,rows,a);$('#burn-overview').innerHTML=view.overview;$('#burn-cards').innerHTML=view.cards;
 $$('.owner-burn-settings').forEach((d,i)=>d.open=Boolean(open[i]));
 if(editing){const input=$(`[data-burn-setting="${editing}"]`);if(input){input.value=typed;input.focus({preventScroll:true});}}

 $$('[data-execute]').forEach(b=>b.onclick=()=>action('Executing '+['FUEL','MORE','PAMP'][b.dataset.execute]+' burn',async s=>new Contract(x.m.burners[Number(b.dataset.execute)],burnAbi,s).execute()));
 $$('[data-save-burn]').forEach(button=>button.onclick=async()=>{
  if(busy||x!==ctx)return;const [i,field]=button.dataset.saveBurn.split('-');
  if(account?.toLowerCase()!==rows[Number(i)].owner.toLowerCase()){status('Only the burner owner can change these settings.');return;}
  let value;try{value=ownerSetting(field,$(`[data-burn-setting="${i}-${field}"]`).value);}catch(e){status(error(e));return;}
  const method={cap:'setMaxSwapEth',drip:'setDailyPoolBps',slippage:'setMaxSlippageBps'}[field];
  await action('Updating owner '+field,s=>new Contract(x.m.burners[Number(i)],burnAbi,s)[method](value));
 });
 x.burnHistory??=new Map();
 const paint=(i,value)=>{if(x!==ctx)return;const el=$(`[data-burn-total="${i}"]`);if(!el)return;const tok=['FUEL','MORE','PAMP'][i];el.innerHTML=value===null?'History unavailable':showUnits(value)+' '+tok+referenceMarkup({[tok]:value});refreshReferences($('#panel-burns'),quotes);};
 let historyStorage;try{historyStorage=localStorage;}catch{}
 x.m.burners.forEach((address,i)=>{
  const old=x.burnHistory.get(i);if(old?.value!==undefined)paint(i,old.value);if(old?.pending)return;
  const entry={...old,pending:true};x.burnHistory.set(i,entry);
  burnTotal(x.r,address,x.n.id,Number(x.m.deploymentBlock),x.block,historyStorage).then(value=>{entry.value=value;paint(i,value);}).catch(()=>{entry.value=null;paint(i,null);}).finally(()=>{entry.pending=false;});
 });
 refreshReferences($('#panel-burns'),quotes);disable();
}
async function action(label,fn){if(busy)return;const x=ctx;if(!x?.ready)throw Error('Deployment is not active.');busy=true;disable();let result,receipt;try{const s=await wallet();if(ctx!==x)throw Error('Chain changed.');status(label+' · confirm in wallet');const tx=await fn(s);status(label+' · waiting for confirmation');receipt=await tx.wait();if(receipt.status!==1)throw Error('Transaction reverted.');result='Confirmed: '+tx.hash;}catch(e){result=error(e);}finally{busy=false;await refresh().catch(e=>status(error(e)));disable();if(result)status(result);}return receipt?.status===1?receipt:null;}
$('#build-form').onsubmit=async e=>{e.preventDefault();if(!ctx?.ready)return;try{const v=validInput();const fee=await ctx.c.position.requiredFee(v.amount);reviewed={...v,fee,key:ctx.key};$('#review-title').textContent='Confirm permanent MORE burn';$('#review-body').textContent=`Burn ${units(v.amount)} MORE permanently to the dead address. Pay ${units(fee)} ${ctx.n.unit} as protocol fee, plus gas. Reward term: ${v.days} days. No MORE is returned. The spot fee may change before confirmation; a changed fee will require reviewing a new quote.`;$('#review').showModal();}catch(e){status(error(e));}};
$('#review-close').onclick=$('.dialog-close').onclick=()=>{$('#review').close();reviewed=null;};$('#review-confirm').onclick=async()=>{const v=reviewed,x=ctx;if(!v||v.key!==x?.key)return;$('#review').close();await action('Creating permanent MORE burn',async signer=>{const signingAccount=await signer.getAddress();const token=new Contract(x.m.more,erc20,signer);if(await token.allowance(account,x.m.position)<v.amount){status('Approve exactly '+units(v.amount)+' MORE in your wallet');const approve=await token.approve(x.m.position,v.amount);await approve.wait();}if(account?.toLowerCase()!==signingAccount.toLowerCase()||Number(BigInt(await provider.request({method:'eth_chainId'})))!==x.n.id)throw Error('Wallet changed during approval. Reconnect and review.');const position=new Contract(x.m.position,positionAbi,signer);const fee=await position.requiredFee(v.amount);if(fee!==v.fee)throw Error('MORE price changed. Review the refreshed fee before burning. Your approval remains; no MORE was burned.');status('Confirm permanent burn in your wallet');return position.createPosition(v.amount,v.days,{value:fee});});};
$('#settle-due').onclick=async()=>{
 if(busy||poolsRefreshing||!account)return;const x=ctx;if(!await refreshPools())return;if(ctx!==x||!account||!x.due.length)return;
 if(!confirm(`${x.due.length} closed funded cycle${x.due.length===1?'':'s'} will be processed in one wallet transaction. Large snapshots may require further calls. You receive your share of the 0.25% settlement reward. Continue?`))return;
 return action('Settling due pools',s=>new Contract(x.m.helper,helperAbi,s).settle(x.due));
};$('#claim-open').onclick=()=>{const x=ctx;const items=x.claims.slice(0,20).map(c=>[c.pool,c.cycle,c.id]);return action('Claiming available rewards',s=>new Contract(x.m.helper,helperAbi,s).claim(items));};
async function transfer(id){const destination=prompt('Recipient wallet address. This transfers all unclaimed and future rewards for this position.');if(!destination)return;if(!isAddress(destination)||/^0x0{40}$/i.test(destination)){status('Enter a valid nonzero wallet address.');return;}if(!confirm('Transfer position #'+id+' and its reward rights to '+destination+'?'))return;const x=ctx;await action('Transferring position',s=>new Contract(x.m.position,positionAbi,s).safeTransferFrom(account,destination,id));}
let timer;$('#amount').oninput=()=>{clearTimeout(timer);timer=setTimeout(preview,200);};$('#term').oninput=$('#amount').oninput;$('#max-amount').onclick=()=>{if(ctx){$('#amount').value=units(ctx.balance);preview();}};$('#max-term').onclick=()=>{$('#term').value='1000';preview();};$$('[data-term]').forEach(b=>b.onclick=()=>{$('#term').value=b.dataset.term;preview();});$('#chain').onchange=()=>load();window.addEventListener('more-market-prices',e=>{if(e.detail.key===$('#chain').value){quotes=e.detail.quotes;refreshReferences(document,quotes);}});
$('#bonus-examples').innerHTML=[100,500,1000,2000].map(n=>{const b=1+Math.min(n/1000,1);return `<tr><td>${n} MORE</td><td>${b}×</td><td>${n*b}</td><td>${n*b*2.5}</td></tr>`;}).join('');
installInputSizing();
try{deployments=await fetch('deployments.json',{cache:'no-store'}).then(r=>r.json());await load();}catch(e){status(error(e));}setInterval(()=>{if(!busy&&!document.hidden)refresh().catch(e=>status(error(e)));},30000);
