import {positionMarkup,dateMarkup} from './position-ui.js?v=57';
import {installFeeSettings} from './owner-fees.js?v=1';
import {BrowserProvider,JsonRpcProvider,Contract,parseUnits,formatUnits,isAddress} from './vendor/ethers-6.15.0.js';
import {inputs,amount,powerAt,remaining,feeForValue,validateManifest,readV2Positions,readV2Claims,positionAbi,DAY} from './v2-model.js?v=53';
import {readPool} from './chain-data.js?v=more-forge-loading-47';
import {poolMarkup} from './pool-ui-v2.js?v=52';
import {burnAbi,readBurn,burnMarkup,burnTotal,ownerSetting} from './burn-ui.js?v=more-forge-polish-33';
import {installBuy} from './buy-ui-v2.js?v=56';
import {displayAmount,amountText} from './amounts.js';
import {installInputSizing,fitAmountInputs} from './input-sizing.js';
import {referenceMarkup,setReference,refreshReferences,clearReferences} from './usd-reference.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const networks={rh:{id:4663,rpc:'https://rpc.mainnet.chain.robinhood.com/',unit:'ETH',btc:'cbBTC',explorer:'https://explorer.robinhood.com'},pls:{id:369,rpc:'https://rpc.pulsechain.com',unit:'PLS',btc:'wBTC',explorer:'https://scan.pulsechain.com'}};
const erc20=['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)'];
const vaultAbi=['function positions() view returns(address)','function launchTime() view returns(uint256)','function cycleDuration() view returns(uint256)','function rewardToken() view returns(address)','function owner() view returns(address)','function cycleAt(uint256) view returns(uint256)','function deadline(uint256) view returns(uint256)','function cycleBalance(uint256) view returns(uint256)','function nativeCycleBalance(uint256) view returns(uint256)','function cycles(uint256) view returns(uint256 cursor,uint256 upperTokenId,uint256 totalPower,uint256 participantPool,uint256 claimed,uint256 callerPaid,bool started,bool settled)','function claimable(uint256,uint256) view returns(uint256)','function referenceQuote() view returns(address)'];
const helperAbi=['function vaults(uint256) view returns(address)','function bitcoin() view returns(address)','function settle((uint8 pool,uint256 cycleId,uint256 maxPositions)[])','function claim((uint8 pool,uint256 cycleId,uint256 tokenId)[])'];
const date=t=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(Number(t)*1000));
const display=(v,d=18)=>displayAmount(v,d,d===8?8:6),units=n=>formatUnits(n,18),same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
const error=e=>e.shortMessage||e.message||String(e),status=t=>$('#connection-status').textContent=t;
const tab=k=>window.moreForgeTabs.select(k),text=(id,t)=>$(id).textContent=t;
let legacy={},manifests={},ctx=null,epoch=0,previewId=0,account=null,provider=null,busy=false,quotes={},review=null,positionReview=null,positionFilter='active';
const listening=new WeakSet(),discovered=[],refreshes=new WeakMap();
const buy=installBuy({context:()=>ctx,account:()=>account,isBusy:()=>busy,marketPrices:()=>quotes,action,tab,status});
const ownerFees=installFeeSettings({context:()=>ctx,account:()=>account,isBusy:()=>busy,action,status});
function valid(){return inputs($('#amount').value,$('#boost').value||'0',$('#term').value);}
function canEnter(x=ctx){return Boolean(x?.forgeReady&&x.dataLoaded&&x.m.entriesEnabled===true&&!x.paused&&x.now>=x.m.siteOpeningTime);}
function disable(){
 for(const e of $$('button,select,input'))e.disabled=busy;
 const x=ctx;
 $('#build-submit').disabled=busy||!canEnter()||!account||!x?.preview;
 $('#review-confirm').disabled=busy||!canEnter();
 if(x?.preview&&account&&x.preview.total>x.balance)$('#build-submit').disabled=true;
 text('#build-submit',!x?.forgeReady?'Launch pending':!canEnter()?'New entries paused':!account?'Connect wallet to create position':'Review your position ↗');
 $('#claim-open').disabled=busy||!account||!x?.dataLoaded||!x.claims.length;
 $('#claim-reset').hidden=true;$('#settle-due').disabled=busy||!account||!x?.dataLoaded||!x.due.length;
 $('#refresh-pools').disabled=busy||!x?.forgeReady;
 $$('[data-withdraw],[data-transfer],[data-execute],[data-save-burn]').forEach(b=>b.disabled=busy||!account||!x?.dataLoaded||b.dataset.ready==='false');
 $('#position-confirm').disabled=busy||!positionReview;
 buy.disable();ownerFees.render();
}
function pending(){
 const future=!networks[$('#chain').value];
 const message=future?'This chain is planned for a later launch.':'Contracts are not deployed yet. No funds or rewards are shown.';
 $('#pool-overview').innerHTML=`<div class="v2-empty"><strong>Pools open after deployment</strong>${message}<br><a class="legacy-link" href="legacy.html#pools">View existing V1 pools ↗</a></div>`;
 $('#pool-cards').innerHTML=[8,28,88,288].map((d,i)=>`<article class="card pool-card pool-tone-${i}"><div class="pool-top"><span>PLANNED</span><span>${(future?[28.48,24.03,18.69,17.8]:[26.88,22.68,17.64,16.8])[i]}% of fees</span></div><h3>${d}-Day ${i===3?'Bitcoin ':''}Pool</h3><div class="pending-value">Not launched</div><p>Balances and local deadlines appear after deployment.${i===3?' Bitcoin is purchased during entry.':''}</p></article>`).join('');
 $('#burn-overview').innerHTML=`<div class="v2-empty"><strong>Buy-and-burn pools</strong>${message}</div>`;$('#burn-cards').replaceChildren();
 $('#claim-totals').innerHTML='<div><b>Rewards open after launch</b></div>';
 for(const id of ['#claim-cycles','#position-controls'])$(id).replaceChildren();
 text('#claim-usd','—');text('#claim-status',message);text('#settle-status','No settlement is available before deployment.');
 text('#v2-launch-label',future?'Future chain · not available yet':'MORE Forge · Preparing for launch');
 text('#v2-launch-copy','Explore the lock and optional-burn model. Entries open after deployment.');
}
function updateLinks(){for(const a of $$('.legacy-link')){const dest=new URL(a.getAttribute('href'),location.href);dest.searchParams.set('chain',$('#chain').value);a.href=dest.href;}}
async function load(){
 if(busy)return;const e=++epoch,key=$('#chain').value;previewId++;ctx=null;review=null;positionReview=null;quotes={};
 for(const d of $$('dialog[open]'))d.close();clearReferences(document);pending();updateLinks();buy.update();disable();
 const n=networks[key],old=legacy[key],m=manifests[key];
 text('#hero-native','$'+(n?.unit||'ETH'));text('#hero-bitcoin','$'+(n?.btc||'BTC'));
 window.dispatchEvent(new Event('more-chain-change'));
 if(!n||!old||!m){status('This chain is planned for a future deployment.');await preview();return;}
 const r=new JsonRpcProvider(n.rpc,n.id,{staticNetwork:true});
 const x={key,n,r,m,old,ready:false,forgeReady:false,dataLoaded:false,paused:true,positions:[],owned:[],pools:[],claims:[],due:[],balance:0n,now:Math.floor(Date.now()/1000),feePolicy:{bps:m.feeBps,bounds:m.feeBoundsEnabled,min:m.minFeeWei,max:m.maxFeeWei}};
 // Markets use existing token/quote contracts only. Never route actions to V1 positions.
 x.m={...m,more:old.more,contracts:{...m.contracts,mainQuote:m.contracts?.mainQuote||old.contracts.mainQuote}};
 x.token=new Contract(old.more,erc20,r);ctx=x;buy.update();status('Loading MORE market…');
 try{
  const code=await r.getCode(old.contracts.mainQuote);if(code==='0x')throw Error('MORE market quote is unavailable.');
  if(e!==epoch)return;x.ready=true;
  if(m.status==='deployed'){
   validateManifest(m,old);x.m=m;
   x.position=new Contract(m.position,positionAbi,r);x.vaults=m.vaults.map(a=>new Contract(a,vaultAbi,r));x.burners=m.burners.map(a=>new Contract(a,burnAbi,r));x.helper=new Contract(m.helper,helperAbi,r);
   await verify(x);if(e!==epoch)return;x.forgeReady=true;
  }
  buy.update();await refresh();
 }catch(err){if(e!==epoch)return;x.ready=false;x.forgeReady=false;x.dataLoaded=false;status('Unavailable: '+error(err));pending();await preview();disable();}
}
async function verify(x){
 const {m,r,position:p}=x;
 const [codes,name,owner,more,oracle,receiver,day,helperBtc,...vaultChecks]=await Promise.all([
  Promise.all([m.position,m.helper,...m.vaults,...m.burners].map(a=>r.getCode(a))),p.name(),p.owner(),p.more(),p.priceOracle(),p.feeReceiver(),p.dayDuration(),x.helper.bitcoin(),
  ...x.vaults.map(async(v,i)=>{const [pos,anchor,duration]=await Promise.all([v.positions(),v.launchTime(),v.cycleDuration()]);return same(pos,m.position)&&Number(anchor)===m.launchTime&&Number(duration)===[8,28,88,288][i]*86400;})
 ]);
 if(codes.some(c=>c==='0x')||name!=='MORE Forge Position V2'||!same(owner,m.owner)||!same(more,m.more)||!same(oracle,m.contracts.feeQuote)||!same(receiver,m.contracts.feeRouter)||day!==DAY||!same(helperBtc,m.vaults[3])||vaultChecks.some(ok=>!ok))throw Error('Contract verification failed.');
 for(let i=0;i<3;i++)if(!same(await x.helper.vaults(i),m.vaults[i]))throw Error('Settlement helper mismatch.');
 if(!same(await x.vaults[3].rewardToken(),m.bitcoinToken))throw Error('Bitcoin token mismatch.');
 const router=new Contract(m.contracts.feeRouter,['function eightDayVault() view returns(address)','function twentyEightDayVault() view returns(address)','function eightyEightDayVault() view returns(address)','function bitcoinVault() view returns(address)','function fuelBurner() view returns(address)','function moreBurner() view returns(address)','function pampBurner() view returns(address)','function development() view returns(address)'],r);
 const fields=['eightDayVault','twentyEightDayVault','eightyEightDayVault','bitcoinVault','fuelBurner','moreBurner','pampBurner','development'];
 const actual=await Promise.all(fields.map(k=>router[k]()));
 if(actual.some((a,i)=>!same(a,[...m.vaults,...m.burners,m.owner][i])))throw Error('Fee routing mismatch.');
}
async function refresh(){
 const x=ctx;if(!x)return;
 const running=refreshes.get(x);if(running){running.again=true;return running.promise;}
 const entry={again:false};refreshes.set(x,entry);
 entry.promise=(async()=>{do{entry.again=false;await readChain(x);}while(entry.again&&ctx===x);})().finally(()=>refreshes.delete(x));return entry.promise;
}
async function readChain(x){
 const e=epoch,a=account,current=()=>ctx===x&&e===epoch&&a===account;
 try{
  const [block,balance]=await Promise.all([x.r.getBlock('latest'),a?x.token.balanceOf(a):0n]);if(!current())return;
  x.now=block.timestamp;x.block=block.number;x.balance=balance;
  text('#balance-help',a?'Wallet balance: '+display(balance)+' MORE':'Connect wallet to see your MORE balance.');
  if(x.forgeReady){
   const o={blockTag:block.number};
   const [paused,bps,bounds,min,max,next,owner]=await Promise.all([x.position.entriesPaused(o),x.position.feeBps(o),x.position.feeBoundsEnabled(o),x.position.minFeeWei(o),x.position.maxFeeWei(o),x.position.nextTokenId(o),x.position.owner(o)]);
   const [positions,records]=await Promise.all([readV2Positions(x.position,next,o),Promise.all(x.vaults.map((v,i)=>readPool(v,i,x.now,o,async(v,amount,opts)=>{const q=await v.referenceQuote(opts);return(await new Contract(q,['function quote(uint256) view returns(uint256,uint256)'],x.r).quote(amount,opts))[0];})))]);
   const owned=a?positions.filter(p=>same(p.owner,a)):[];
   const claims=(await Promise.all(records.map((record,i)=>readV2Claims(x.vaults[i],record,owned,x.m.launchTime,o)))).flat();
   if(!current())return;
   Object.assign(x,{owner,paused,positions,owned,claims,pools:records.map(r=>r.pool),due:records.flatMap(r=>r.due?[r.due]:[]),feePolicy:{bps,bounds,min,max},dataLoaded:true});
   const view=poolMarkup(x,Boolean(a));$('#pool-overview').innerHTML=view.overview;$('#pool-cards').innerHTML=view.cards;$('[data-pool-rewards]').onclick=event=>{event.preventDefault();tab('rewards');};
   text('#settle-status',x.due.length?`${x.due.length} funded cycles ready. One transaction processes up to 15 position records per pool and pays the caller 0.25% of the processed rewards.`:'No funded cycles are ready to settle.');
   renderRewards(x);renderPositions(x);
   text('#v2-launch-label',canEnter(x)?'MORE Forge · Live':'MORE Forge · Entries paused');
   text('#v2-launch-copy',canEnter(x)?'Lock principal, add an optional burn, and earn from all four pools while eligible.':'Entries are paused. Existing positions and rewards remain accessible.');
   renderBurns(x,a,current).catch(err=>{if(current())$('#burn-cards').textContent='Burn data unavailable: '+error(err);});
  }
  status(x.forgeReady?'MORE Forge · '+(a?'wallet connected':'connect wallet for your positions'):'Launch pending · live MORE purchases remain available');
  buy.update();await preview();if(current()){refreshReferences(document,quotes);disable();}
 }catch(err){if(current()){x.dataLoaded=false;status('Unable to refresh: '+error(err));disable();}}
}
async function preview(){
 fitAmountInputs();const id=++previewId,x=ctx;
 if(x)x.preview=null;disable();let v;
 try{v=valid();}catch(err){text('#build-status',error(err));for(const s of ['#power','#multiplier','#native-fee','#total-cost','#power-principal','#power-burned','#term-bonus','#detail-principal','#detail-burned','#detail-term','#detail-grace','#detail-expiry']){text(s,'—');$(s).removeAttribute('title');}$('.more-power-ring').style.setProperty('--power-angle','0deg');$('#term-payouts').innerHTML='';text('#term-native-total','Check your inputs');text('#term-bitcoin-total','');clearReferences($('#panel-build'));return;}
 const now=x?.now||Math.floor(Date.now()/1000),maturity=BigInt(now)+BigInt(v.days)*DAY;
 amountText($('#power'),v.power,'power',4);text('#multiplier',(Number(v.power*10000n/v.principal)/10000).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'×');$('.more-power-ring').style.setProperty('--power-angle',Math.min(360,Number(v.power*36000n/v.principal)/500)+'deg');amountText($('#power-principal'),v.principal,'power',4);amountText($('#power-burned'),v.burned,'power',4);
 for(const [sel,n] of [['#principal-value',v.principal],['#burn-value',v.burned],['#detail-principal',v.principal],['#detail-burned',v.burned]])amountText($(sel),n,'MORE',4);
 amountText($('#term-bonus'),v.power-v.principal-v.burned,'power',4,18,'+');$('#detail-term').innerHTML=dateMarkup(maturity);$('#detail-grace').innerHTML=dateMarkup(maturity+7n*DAY);$('#detail-expiry').innerHTML=dateMarkup(maturity+14n*DAY);
 $$('[data-term]').forEach(b=>b.classList.toggle('active',Number(b.dataset.term)===v.days));$$('[data-boost]').forEach(b=>b.classList.toggle('active',v.burned===v.principal*BigInt(b.dataset.boost)));
 setReference($('#principal-usd'),{MORE:v.principal});setReference($('#burn-usd'),{MORE:v.burned});
 text('#native-fee','Loading quote…');text('#total-cost',displayAmount(v.total,18,4)+' MORE + fee');
 text('#build-status',!x?.forgeReady?'Preview only · entries open after deployment.':!canEnter(x)?'Entries are paused.':account&&v.total>x.balance?'Not enough MORE for principal plus optional burn.':'Review all amounts and withdrawal dates before creating your position.');
 if(!x?.forgeReady){$('#term-payouts').innerHTML='<p class="field-help">Funding and deadlines appear after deployment. Your preview does not create a position.</p>';text('#term-native-total','Available after launch');text('#term-bitcoin-total','');text('#term-usd-total','');}
 if(!x?.ready){text('#native-fee','Quote unavailable');return;}
 try{
  const fee=x.forgeReady?await x.position.requiredFee(v.principal):feeForValue(await new Contract(x.old.contracts.feeQuote,['function quoteMoreInNative(uint256) view returns(uint256)'],x.r).quoteMoreInNative(v.principal),x.feePolicy);
  if(id!==previewId||x!==ctx)return;
  x.preview={...v,fee};amountText($('#native-fee'),fee,x.n.unit,x.key==='pls'?2:6);text('#fee-label',x.forgeReady?'Protocol fee':'Estimated protocol fee');$('#total-cost').innerHTML=`<span>${displayAmount(v.total,18,4)} MORE</span><span>+ ${displayAmount(fee,18,x.key==='pls'?2:6)} ${x.n.unit}</span>`;$('#total-cost').title='Exact amounts: '+units(v.total)+' MORE + '+units(fee)+' '+x.n.unit+'; gas excluded';
  const p=x.feePolicy;
  text('#fee-policy',`${Number(p.bps)/100}% of the quoted locked-principal value.${p.bounds?' Minimum '+display(BigInt(p.min))+' '+x.n.unit+'; maximum '+display(BigInt(p.max))+' '+x.n.unit+'.':''} Optional burns and lock duration do not increase this fee.${x.forgeReady?'':' Final policy is verified at launch.'}`);
  setReference($('#fee-usd'),{NATIVE:fee});setReference($('#total-usd'),{MORE:v.total,NATIVE:fee});
  if(x.forgeReady){
   let native=0n,btc=0n;const prospective={created:BigInt(x.now),maturity,power:v.power,closed:0n};
   const rows=x.pools.map(p=>{const own=powerAt(prospective,p.deadline),total=x.positions.reduce((n,z)=>n+powerAt(z,p.deadline),0n)+own;
    // Current funds only; neither native nor Bitcoin estimates invent future contributions.
    const payout=total?(p.balance-p.balance*25n/10000n)*own/total:0n;
    p.i===3?btc+=payout:native+=payout;
    return `<div><b>${p.days}-day pool<small>${dateMarkup(p.deadline)}</small></b><div><strong title="Exact payout: ${formatUnits(payout,p.i===3?8:18)} ${p.i===3?x.n.btc:x.n.unit}">${own?displayAmount(payout,p.i===3?8:18,p.i===3?8:x.key==='pls'?2:6)+' '+(p.i===3?x.n.btc:x.n.unit):'No eligible power at this deadline'}</strong>${own?referenceMarkup({[p.i===3?'BTC':'NATIVE']:payout}):''}</div></div>`;});
   $('#term-payouts').innerHTML=rows.join('');amountText($('#term-native-total'),native,x.n.unit,x.key==='pls'?2:6);amountText($('#term-bitcoin-total'),btc,x.n.btc,8,8,'+ ');setReference($('#term-usd-total'),{NATIVE:native,BTC:btc});
  }
  refreshReferences(document,quotes);disable();
 }catch(err){if(id===previewId){x.preview=null;text('#native-fee','Quote unavailable');text('#build-status',error(err));clearReferences($('#fee-usd').parentElement);disable();}}
}
function renderRewards(x){
 let native=0n,btc=0n;for(const c of x.claims)c.pool===3?btc+=c.value:native+=c.value;
 $('#claim-totals').innerHTML=`<div><b>${display(native)} ${x.n.unit}</b>${referenceMarkup({NATIVE:native})}</div><div><b>${display(btc,8)} ${x.n.btc}</b>${referenceMarkup({BTC:btc})}</div>`;
 setReference($('#claim-usd'),{NATIVE:native,BTC:btc});
 $('#claim-cycles').innerHTML=x.claims.map(c=>`<div>Position #${c.id} · ${[8,28,88,288][c.pool]} Day · Cycle ${c.cycle}: ${display(c.value,c.pool===3?8:18)} ${c.pool===3?x.n.btc:x.n.unit}</div>`).join('');
 text('#claim-status',!account?'Connect wallet to load your rewards.':x.claims.length?`${x.claims.length} claimable reward records. Up to 20 can be claimed per transaction.`:'No settled rewards for this wallet.');
}
function renderPositions(x){
 const active=x.owned.filter(p=>p.closed===0n),ended=x.owned.filter(p=>p.closed!==0n),visible=positionFilter==='active'?active:ended;
 $('#position-controls').innerHTML='<h3>Your position NFTs</h3><p class="positions-intro">Principal, power and withdrawal dates for the NFTs you own.</p>'+(!account?'<p>Connect wallet to see your principal and withdrawal dates.</p>':`<div class="position-filters" aria-label="Position status"><button type="button" data-position-filter="active" aria-pressed="${positionFilter==='active'}">Active <span>${active.length}</span></button><button type="button" data-position-filter="ended" aria-pressed="${positionFilter==='ended'}">Ended <span>${ended.length}</span></button></div>`+(visible.length?visible.map(p=>positionMarkup(p,x.now)).join(''):`<p class="position-empty">No ${positionFilter} MORE position NFTs for this wallet.</p>`));
 $$('[data-position-filter]').forEach(b=>b.onclick=()=>{positionFilter=b.dataset.positionFilter;renderPositions(x);});
 $$('[data-withdraw]').forEach(b=>b.onclick=()=>reviewWithdrawal(BigInt(b.dataset.withdraw)));
 $$('[data-transfer]').forEach(b=>b.onclick=()=>transfer(BigInt(b.dataset.transfer)));
}

async function renderBurns(x,a,current){
 const rows=await Promise.all(x.burners.map((b,i)=>readBurn(b,x.r,x.m.burners[i],a||x.m.owner,x.now)));if(!current())return;
 const view=burnMarkup(x,rows,a);$('#burn-overview').innerHTML=view.overview;$('#burn-cards').innerHTML=view.cards;
 $$('[data-execute]').forEach(b=>b.onclick=()=>action('Executing burn',s=>new Contract(x.m.burners[Number(b.dataset.execute)],burnAbi,s).execute()));
 $$('[data-save-burn]').forEach(b=>b.onclick=async()=>{const [i,field]=b.dataset.saveBurn.split('-');if(!same(a,rows[Number(i)].owner))return;try{const v=ownerSetting(field,$(`[data-burn-setting="${i}-${field}"]`).value);await action('Updating burn settings',s=>new Contract(x.m.burners[Number(i)],burnAbi,s)[{cap:'setMaxSwapEth',drip:'setDailyPoolBps',slippage:'setMaxSlippageBps'}[field]](v));}catch(err){status(error(err));}});
 let storage;try{storage=localStorage;}catch{}
 x.m.burners.forEach((address,i)=>burnTotal(x.r,address,x.n.id,Number(x.m.deploymentBlock),x.block,storage).then(value=>{if(!current())return;const e=$(`[data-burn-total="${i}"]`);if(e)e.innerHTML=display(value)+' '+['FUEL','MORE','PAMP'][i]+referenceMarkup({[['FUEL','MORE','PAMP'][i]]:value});refreshReferences(document,quotes);}).catch(()=>{}));
 refreshReferences(document,quotes);disable();
}
function addProvider(p,info={}){if(typeof p?.request!=='function')return;const old=discovered.find(x=>x.p===p);if(old)Object.assign(old.info,info);else discovered.push({p,info});}
window.addEventListener('eip6963:announceProvider',e=>addProvider(e.detail?.provider,e.detail?.info));window.dispatchEvent(new Event('eip6963:requestProvider'));
function changed(accounts){account=accounts[0]||null;review=null;positionReview=null;for(const d of $$('dialog[open]'))d.close();if(ctx){ctx.dataLoaded=false;ctx.balance=0n;}text('#connect-wallet',account?account.slice(0,6)+'…'+account.slice(-4):'Connect wallet');buy.update();disable();if(!busy)refresh();}
$('#connect-wallet').onclick=async()=>{try{
 window.dispatchEvent(new Event('eip6963:requestProvider'));addProvider(window.ethereum);addProvider(window.rabby);for(const p of window.ethereum?.providers||[])addProvider(p);
 provider=discovered.find(x=>x.info.rdns==='io.rabby'||x.p.isRabby)?.p||window.ethereum||discovered[0]?.p;if(!provider)throw Error('Open this page in Rabby or another compatible wallet browser.');
 const p=provider;if(!listening.has(p)){p.on?.('accountsChanged',a=>{if(provider===p)changed(a);});p.on?.('chainChanged',()=>{if(provider===p&&!busy){review=null;positionReview=null;$('#review').close();$('#position-review').close();refresh();}});listening.add(p);}
 changed(await p.request({method:'eth_requestAccounts'}));
 }catch(err){status(error(err));}};
async function wallet(x){
 if(!provider||!account)throw Error('Connect your wallet first.');
 const accounts=await provider.request({method:'eth_accounts'});if(!same(accounts[0],account))throw Error('Wallet account changed. Reconnect and review.');
 if(Number(BigInt(await provider.request({method:'eth_chainId'})))!==x.n.id)await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x'+x.n.id.toString(16)}]});
 const signer=await new BrowserProvider(provider).getSigner(account);if(ctx!==x)throw Error('Selected chain changed.');return signer;
}
async function action(label,fn){
 if(busy)return null;const x=ctx;if(!x?.ready)return null;busy=true;disable();let receipt=null,message;
 try{const signer=await wallet(x);status(label+' · confirm in wallet');const tx=await fn(signer);status(label+' · waiting for confirmation');receipt=await tx.wait();if(receipt.status!==1)throw Error('Transaction reverted.');message='Confirmed: '+tx.hash;}
 catch(err){message=error(err);}finally{busy=false;await refresh();disable();status(message);}
 return receipt?.status===1?receipt:null;
}
$('#build-form').onsubmit=async event=>{
 event.preventDefault();const x=ctx;if(!canEnter(x)||!account){text('#build-status','entries are not open yet.');return;}
 try{const v=valid(),who=account,fee=await x.position.requiredFee(v.principal);if(ctx!==x||account!==who)return;if(v.total>x.balance)throw Error('Not enough MORE for principal and optional burn.');
 review={...v,fee,x,account:who};const maturity=BigInt(x.now)+BigInt(v.days)*DAY;
 text('#review-title','Review your MORE position');text('#review-body',`Lock ${units(v.principal)} MORE for ${v.days} days.\nPermanently burn ${units(v.burned)} extra MORE.\nProtocol fee: ${units(fee)} ${x.n.unit}, plus gas.\n\nEstimated maturity: ${date(maturity)}. Withdraw by ${date(maturity+7n*DAY)} for full principal. It declines to zero over the next 7 days. Dates are finalized by your entry’s block.\n\nYour optional burn is never returned. Bitcoin is bought during this entry. Approval and entry are separate confirmations.`);$('#review').showModal();
 }catch(err){status(error(err));}
};
$('#review-close').onclick=$('#review .dialog-close').onclick=()=>{review=null;$('#review').close();};
$('#review-confirm').onclick=async()=>{
 const v=review;review=null;$('#review').close();if(!v||ctx!==v.x||account!==v.account||!canEnter(v.x))return;
 await action('Creating MORE position',async signer=>{
  const x=v.x,who=await signer.getAddress(),position=new Contract(x.m.position,positionAbi,signer),token=new Contract(x.m.more,erc20,signer);
  if(!same(who,v.account)||await position.entriesPaused())throw Error('Wallet changed or entries paused. Review again.');
  if(await token.allowance(who,x.m.position)<v.total){status('Approve exactly '+units(v.total)+' MORE for principal plus optional burn');const approval=await token.approve(x.m.position,v.total);const receipt=await approval.wait();if(receipt.status!==1)throw Error('Approval failed.');}
  const [accounts,chain,fee,paused,balance]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'}),position.requiredFee(v.principal),position.entriesPaused(),token.balanceOf(who)]);
  if(ctx!==x||!same(accounts[0],who)||Number(BigInt(chain))!==x.n.id)throw Error('Wallet or chain changed during approval. Review again.');
  if(paused||!canEnter(x))throw Error('Entries paused. No position was created.');if(balance<v.total)throw Error('MORE balance changed. Review again.');
  if(fee!==v.fee)throw Error('Protocol fee changed. Review the new quote. No MORE was locked or burned.');
  await position.createPosition.staticCall(v.principal,v.burned,v.days,{value:fee});
  return position.createPosition(v.principal,v.burned,v.days,{value:fee});
 });
};
async function reviewWithdrawal(id){
 const x=ctx,p=x?.owned.find(p=>p.id===id);if(!p||p.closed||!account)return;
 try{const value=await x.position.currentPrincipal(id),who=account;if(ctx!==x)return;positionReview={x,id,account:who,value};
 text('#position-review-title',value===0n?'Close expired position':'Withdraw your principal');text('#position-review-body',`Position #${id}\nCurrently returnable: ${units(value)} MORE.\nForfeited principal: ${units(p.principal-value)} MORE.\n\nWithdrawal closes the position and ends future reward power. Already-earned rewards remain claimable. During the decay period, the returned amount continues decreasing until confirmation.`);$('#position-review').showModal();disable();
 }catch(err){status(error(err));}
}
$('#position-close').onclick=$('#position-cancel').onclick=()=>{positionReview=null;$('#position-review').close();};
$('#position-confirm').onclick=async()=>{const v=positionReview;positionReview=null;$('#position-review').close();if(!v||ctx!==v.x||!same(account,v.account))return;await action('Withdrawing principal',async s=>{const p=new Contract(v.x.m.position,positionAbi,s);if(!same(await p.ownerOf(v.id),v.account))throw Error('Position owner changed.');return p.withdraw(v.id);});};
async function transfer(id){const x=ctx,dest=prompt('Recipient wallet. This transfers locked principal and all unclaimed and future reward rights.');if(!dest)return;if(!isAddress(dest)||/^0x0{40}$/i.test(dest)){status('Enter a valid nonzero address.');return;}if(!confirm('Transfer position #'+id+', its principal and reward rights to '+dest+'?'))return;await action('Transferring position',s=>new Contract(x.m.position,positionAbi,s).safeTransferFrom(account,dest,id));}
$('#claim-open').onclick=()=>{const x=ctx;if(!x?.forgeReady||!account||!x.claims.length)return;const items=x.claims.slice(0,20).map(c=>[c.pool,c.cycle,c.id]);return action('Claiming rewards',s=>new Contract(x.m.helper,helperAbi,s).claim(items));};
$('#settle-due').onclick=async()=>{const x=ctx;if(!x?.forgeReady||!account||busy)return;await refresh();if(ctx!==x||!x.due.length)return;await action('Settling all due pools',s=>new Contract(x.m.helper,helperAbi,s).settle(x.due));};
$('#refresh-pools').onclick=()=>refresh();
let timer;for(const id of ['#amount','#boost','#term'])$(id).oninput=()=>{if(ctx)ctx.preview=null;disable();clearTimeout(timer);timer=setTimeout(preview,200);};
$('#max-amount').onclick=()=>{if(!account||!ctx)return;try{const burn=amount($('#boost').value||'0','Optional burn');$('#amount').value=units(ctx.balance>burn?ctx.balance-burn:0n);preview();}catch(err){status(error(err));}};
$('#max-boost').onclick=()=>{try{const principal=amount($('#amount').value,'Principal'),available=account&&ctx?ctx.balance>principal?ctx.balance-principal:0n:principal*3n;$('#boost').value=units(available<principal*3n?available:principal*3n);preview();}catch(err){status(error(err));}};
$('#max-term').onclick=()=>{$('#term').value='1000';preview();};$$('[data-term]').forEach(b=>b.onclick=()=>{$('#term').value=b.dataset.term;preview();});$$('[data-boost]').forEach(b=>b.onclick=()=>{try{$('#boost').value=units(amount($('#amount').value,'Principal')*BigInt(b.dataset.boost));preview();}catch(err){status(error(err));}});
$('#chain').onchange=load;window.addEventListener('more-market-prices',event=>{if(event.detail.key===$('#chain').value){quotes=event.detail.quotes;refreshReferences(document,quotes);}});
installInputSizing();pending();disable();
try{[legacy,manifests]=await Promise.all(['deployments.json','deployments-v2.json'].map(file=>fetch(file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Deployment data unavailable.');return r.json();})));await load();}catch(err){status(error(err));}
setInterval(()=>{if(!busy&&!document.hidden)refresh();},30000);
