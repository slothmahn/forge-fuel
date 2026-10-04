import {formatUnits} from './vendor/ethers-6.15.0.js';
import {displayAmount} from './amounts.js';
import {DAY,powerAt,remaining} from './v2-model.js?v=53';

export function dateMarkup(timestamp){
 const value=new Date(Number(timestamp)*1000);
 const day=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(value);
 const time=new Intl.DateTimeFormat(undefined,{timeStyle:'short'}).format(value);
 return `<time datetime="${value.toISOString()}"><span>${day}</span><small>${time}</small></time>`;
}
const amount=(value,unit='MORE')=>`<strong title="Exact amount: ${formatUnits(value,18)} ${unit}"><span class="position-amount">${displayAmount(value,18,2)}</span><small>${unit}</small></strong>`;

export function positionState(p,now){
 now=BigInt(now);
 const closed=p.closed!==0n,mature=now>=p.maturity;
 const principal=closed?0n:remaining(p.principal,p.maturity,now),power=closed?0n:powerAt(p,now);
 const end=p.maturity+14n*DAY,grace=p.maturity+7n*DAY;
 const phase=closed?'closed':!mature?'locked':principal===0n?'expired':now<=grace?'grace':'decay';
 const status={closed:'Ended',locked:'Locked',expired:'Fully decayed',grace:'Grace period',decay:'Decaying'}[phase];
 const until=phase==='locked'?p.maturity:phase==='grace'?grace:end;
 const seconds=until>now?until-now:0n;
 const clock=`${seconds/DAY}d ${String(seconds%DAY/3600n).padStart(2,'0')}h ${String(seconds%3600n/60n).padStart(2,'0')}m ${String(seconds%60n).padStart(2,'0')}s`;
 const countdown=closed?'Position ended · earned rewards remain claimable':phase==='expired'?'Decay complete · close this NFT':`${{locked:'Lock',grace:'Grace period',decay:'Decay'}[phase]} ends in ${clock}`;
 const elapsed=(closed?p.closed:now)-p.created;
 const progress=Math.min(100,Math.max(0,Number(elapsed*100n/(end-p.created))));
 return{closed,mature,principal,power,end,grace,phase,status,countdown,progress};
}
export function positionMarkup(p,now){
 const state=positionState(p,now),{closed,mature,principal,power,end,grace,phase,status,progress}=state;
 if(closed)return `<article class="position-card" data-position-id="${p.id}" data-phase="closed"><div class="position-heading"><h4>MORE NFT #${p.id}</h4><span class="position-state">Ended</span></div><p class="position-note">Closed ${dateMarkup(p.closed)}</p><p class="position-note">Earned rewards remain available on the Rewards tab.</p></article>`;
 const duration=Number((p.maturity-p.created)/DAY);
 return `<article class="position-card" data-position-id="${p.id}" data-phase="${phase}"><div class="position-heading"><div><p class="eyebrow">FORGE POSITION</p><h4>NFT #${p.id}</h4></div><span class="position-state">${status}</span></div>
 <div class="position-stats"><div><span>Principal now</span><div data-live-principal>${amount(principal)}</div></div><div><span>Power now</span><div data-live-power>${amount(power,'power')}</div></div><div><span>Matures</span>${dateMarkup(p.maturity)}</div><div><span>Decay ends</span>${dateMarkup(end)}</div></div>
 <div class="position-timeline"><div><span>Position timeline</span><strong data-live-progress>${progress}%</strong></div><div class="position-timeline-track"><span style="width:${progress}%"></span></div></div>
 <div class="button-row"><button type="button" class="primary-button" data-withdraw="${p.id}" data-ready="${mature}" ${mature?'':'disabled'}>${principal===0n?'Close expired position':mature?'Review withdrawal':'Locked until maturity'}</button><button type="button" class="review-cancel" data-transfer="${p.id}">Transfer NFT</button></div>
 <details class="position-withdrawal-details"><summary>Withdrawal details</summary><dl class="position-dates"><div><dt>Original principal</dt><dd>${amount(p.principal)}</dd></div><div><dt>Lock duration</dt><dd>${duration.toLocaleString()} days</dd></div><div><dt>Full withdrawal through</dt><dd>${dateMarkup(grace)}</dd></div></dl><p class="position-note">Full principal is available for 7 days after maturity, then declines to zero over the next 7 days. The amount returned uses the transaction’s block time. Closing requires a transaction. Transferring this NFT transfers its principal and unclaimed reward rights.</p></details></article>`;
}
// Update estimates in place so the live clock never replaces a focused action.
export function updatePositionCard(card,p,now,busy=false){
 const state=positionState(p,now);
 card.dataset.phase=state.phase;
 card.querySelector('.position-state').textContent=state.status;
 if(state.closed)return;
 card.querySelector('[data-live-principal]').innerHTML=amount(state.principal);
 card.querySelector('[data-live-power]').innerHTML=amount(state.power,'power');
 card.querySelector('[data-live-progress]').textContent=state.progress+'%';
 card.querySelector('.position-timeline-track>span').style.width=state.progress+'%';
 const button=card.querySelector('[data-withdraw]');
 if(button){button.dataset.ready=String(state.mature);button.disabled=busy||!state.mature;button.textContent=state.principal===0n?'Close expired position':state.mature?'Review withdrawal':'Locked until maturity';}
}
