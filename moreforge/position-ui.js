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

export function positionMarkup(p,now){
 now=BigInt(now);
 const closed=p.closed!==0n,mature=now>=p.maturity;
 const principal=closed?0n:remaining(p.principal,p.maturity,now);
 const power=closed?0n:powerAt(p,now);
 const end=p.maturity+14n*DAY,grace=p.maturity+7n*DAY;
 const phase=closed?'closed':!mature?'locked':principal===0n?'expired':now<=grace?'grace':'decay';
 const status={closed:'Closed',locked:'Locked',expired:'Fully decayed',grace:'Ready to withdraw',decay:'Withdraw now'}[phase];
 const duration=Number((p.maturity-p.created)/DAY);
 const progress=closed?100:Math.min(100,Math.max(0,Number((now-p.created)*100n/(end-p.created))));
 return `<article class="position-card" data-phase="${phase}"><div class="position-heading"><div><p class="eyebrow">MORE FORGE POSITION</p><h4>MORE NFT #${p.id}</h4></div><span class="position-state">${status}</span></div>
 <div class="position-stats"><div><span>Principal now</span>${amount(principal)}</div><div><span>Power now</span>${amount(power,'power')}</div></div>
 <dl class="position-dates"><div><dt>Original principal</dt><dd>${amount(p.principal)}</dd></div><div><dt>Lock duration</dt><dd>${duration.toLocaleString()} days</dd></div><div><dt>Maturity</dt><dd>${dateMarkup(p.maturity)}</dd></div><div><dt>Full withdrawal through</dt><dd>${dateMarkup(grace)}</dd></div><div><dt>Decay ends</dt><dd>${dateMarkup(end)}</dd></div></dl>
 <div class="position-timeline"><div><span>Position timeline</span><strong>${progress}%</strong></div><div class="position-timeline-track"><span style="width:${progress}%"></span></div></div>
 ${closed?'<p class="position-note">This position is closed. Earned rewards remain claimable above.</p>':`<div class="button-row"><button type="button" class="primary-button" data-withdraw="${p.id}" data-ready="${mature}" ${mature?'':'disabled'}>${principal===0n?'Close expired position':mature?'Review withdrawal':'Locked until maturity'}</button><button type="button" class="review-cancel" data-transfer="${p.id}">Transfer NFT</button></div><p class="position-note">Transferring this NFT transfers its principal and all unclaimed reward rights. Return to withdraw before the decay period ends.</p>`}</article>`;
}
