// Independent pool and wallet reads share a block and run concurrently.
export const cycleDays=[8,28,88,288];

export async function readPositions(position,next,saved,options){
  for(let start=1n;start<next;start+=50n){
    const ids=[];
    for(let id=start;id<next&&id<start+50n;id++)if(!saved.has(id.toString()))ids.push(id);
    const rows=await Promise.all(ids.map(id=>position.positions(id,options)));
    rows.forEach((p,j)=>saved.set(ids[j].toString(),{id:ids[j],burned:p.burned,power:p.initialPower,created:p.createdAt,maturity:p.maturity}));
  }
  return [...saved.values()].filter(p=>p.id<next);
}

export async function readPool(v,i,now,options,quoteBitcoin){
  const current=await v.cycleAt(now,options);
  const ids=Array.from({length:Number(current-1n)},(_,j)=>BigInt(j+1));
  const [deadline,balance,native,states]=await Promise.all([
    v.deadline(current,options),v.cycleBalance(current,options),
    i===3?v.nativeCycleBalance(current,options):0n,
    Promise.all(ids.map(cycle=>v.cycles(cycle,options)))
  ]);
  const unsettled=ids.filter((cycle,j)=>!states[j].settled);
  const [btcQuote,funding]=await Promise.all([
    i===3&&native>0n?quoteBitcoin(v,native,options):0n,
    Promise.all(unsettled.map(async cycle=>{
      const [tokens,coin]=await Promise.all([v.cycleBalance(cycle,options),i===3?v.nativeCycleBalance(cycle,options):0n]);
      return tokens+coin;
    }))
  ]);
  const oldest=unsettled.find((cycle,j)=>funding[j]>0n);
  return {pool:{i,current,deadline,balance,native,btcQuote,days:cycleDays[i]},due:oldest?[i,oldest,15]:null,ids,states};
}

export async function readClaims(v,record,owned,launchTime,options){
  const {pool,ids,states}=record,candidates=[];
  ids.forEach((cycle,j)=>{
    if(!states[j].settled)return;
    const deadline=BigInt(launchTime)+cycle*BigInt(pool.days*86400);
    for(const p of owned)if(p.created<deadline&&p.maturity>=deadline)candidates.push({pool:pool.i,cycle,id:p.id});
  });
  const values=await Promise.all(candidates.map(c=>v.claimable(c.cycle,c.id,options)));
  return candidates.flatMap((c,j)=>values[j]>0n?[{...c,value:values[j]}]:[]);
}
