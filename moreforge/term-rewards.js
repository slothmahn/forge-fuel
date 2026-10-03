// Fuel Forge's illustrative term scenario, extended to all four MORE pools.
// Repeat existing funding only; include this entry's routed funding once.
export function estimateTermRewards({days,power,existingPower,fee,pools,bitcoinEntry}) {
 if(!Number.isInteger(days)||days<8||days>1000||power<=0n||existingPower<0n||fee<0n)throw Error('Invalid reward scenario inputs');
 const allocations=[2688n,2268n,1764n,1680n],durations=[8,28,88,288];
 const payout=balance=>(balance-balance*25n/10000n)*power/(existingPower+power);
 return pools.map(p=>{
  const cycles=Math.floor(days/durations[p.i]);
  if(!cycles)return {i:p.i,days:durations[p.i],cycles,amount:0n};
  const entry=p.i===3?bitcoinEntry:fee*allocations[p.i]/10000n;
  if(entry===null)return {i:p.i,days:durations[p.i],cycles,amount:null};
  const balance=p.balance+(p.i===3?(p.btcQuote||0n):0n);
  const perCycle=payout(balance);
  return {i:p.i,days:durations[p.i],cycles,amount:perCycle*BigInt(cycles)+payout(balance+entry)-perCycle};
 });
}
