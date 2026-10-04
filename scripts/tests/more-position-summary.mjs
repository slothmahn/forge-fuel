import assert from 'node:assert/strict';
import {positionMarkup,positionState,updatePositionCard} from '../../moreforge/position-ui.js';
const DAY=86400n,principal=300000n*10n**18n,p={id:1n,principal,power:principal*5n,created:100n,maturity:100n+1000n*DAY,closed:0n};
for(const [time,phase,mature] of [[100n,'locked',false],[p.maturity,'grace',true],[p.maturity+8n*DAY,'decay',true],[p.maturity+14n*DAY,'expired',true]]){
 const s=positionState(p,time);assert.equal(s.phase,phase);assert.equal(s.mature,mature);const markup=positionMarkup(p,time);assert(markup.includes(`data-ready="${mature}"`));assert(markup.includes('data-transfer="1"'));if(!mature)assert(markup.includes('disabled'));
 const nodes=new Map();for(const selector of ['.position-state','[data-live-principal]','[data-live-power]','[data-live-progress]','.position-timeline-track>span','[data-withdraw]'])nodes.set(selector,{style:{},dataset:{}});
 updatePositionCard({dataset:{},querySelector:s=>nodes.get(s)},p,time,true);assert.equal(nodes.get('[data-withdraw]').disabled,true);
}
assert.equal(positionState(p,p.maturity+14n*DAY).principal,0n);
const closed=positionMarkup({...p,closed:p.maturity},p.maturity);assert(!closed.includes('data-transfer'));assert(!closed.includes('data-withdraw'));assert(closed.includes('Earned rewards'));
console.log('Locked, grace, decay, expired and ended summaries preserve withdrawal eligibility and busy-state action guards.');
