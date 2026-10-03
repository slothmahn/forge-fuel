// Shared read-only loading for the Robinhood and PulseChain Fuel Forge apps.
// Bound NFT/cycle work so larger wallets do not launch unbounded RPC requests.
export async function mapReads(items,read,size=10){
  const results=[];
  for(let first=0;first<items.length;first+=size){
    results.push(...await Promise.all(items.slice(first,first+size).map(read)));
  }
  return results;
}

export async function readPoolSnapshot(contract,config,block,launchTime){
  const foundry=config.key==='foundry';
  const cycle=await contract.cycleAt(block.timestamp);
  const [deadline,record,balance,mintCount,start]=await Promise.all([
    contract.deadline(cycle),contract.cycles(cycle),
    foundry?null:contract.cycleBalance(cycle),
    foundry?contract.cycleMintCount(cycle):0n,
    cycle>1n?contract.deadline(cycle-1n):BigInt(launchTime)
  ]);
  const duration=Number(deadline-start),elapsed=Math.max(0,Math.min(duration,Number(block.timestamp)-Number(start)));
  return {...config,cycle,deadline,record,balance:foundry?record.cbbtcBalance:balance,mintCount,progress:duration?elapsed/duration:0};
}

export async function readPortfolio(position,foundry,address,sameAddress){
  const [nextPosition,nextFoundry]=await Promise.all([position.nextTokenId(),foundry.nextTokenId()]);
  const ids=next=>Array.from({length:Number(next-1n)},(_,i)=>BigInt(i+1));
  const [positions,nfts]=await Promise.all([
    mapReads(ids(nextPosition),async id=>{
      const [data,owner]=await Promise.all([position.positions(id),position.rewardOwner(id)]);
      const active=data.closedAt===0n,owned=sameAddress(owner,address);
      const [power,principal]=await Promise.all([
        active?position.currentPower(id):0n,
        active&&owned?position.currentPrincipal(id):0n
      ]);
      return {id,data,active,power,principal,owned};
    }),
    mapReads(ids(nextFoundry),async id=>sameAddress(await foundry.ownerOf(id),address)?{id,cycle:await foundry.tokenCycle(id)}:null)
  ]);
  return {
    allPower:positions.reduce((sum,p)=>sum+p.power,0n),
    positions:positions.filter(p=>p.owned).map(({owned,...p})=>p).sort((a,b)=>Number(b.id-a.id)),
    foundry:nfts.filter(Boolean).sort((a,b)=>Number(b.id-a.id)),portfolioComplete:true
  };
}

export async function readRewards({pools,configs,getVault,position,positions,foundry,address,portfolioComplete}){
  const results=await Promise.all(configs.map(async(config,pool)=>{
    const vault=getVault(config.key,pool===3?'foundry':'vault'),claims=[],settlements=[];
    const ids=Array.from({length:Number(pools[pool].cycle-1n)},(_,i)=>BigInt(i+1));
    const states=await mapReads(ids,cycle=>vault.cycles(cycle));
    for(let index=0;index<ids.length;index++){
      const cycleId=ids[index],record=states[index];
      if(!record.settled){
        const funding=pool===3?record.cbbtcBalance:await vault.cycleBalance(cycleId);
        if(funding>0n)settlements.push({pool,cycleId,started:pool===3||record.started,cursor:pool===3?0n:record.cursor,upperTokenId:pool===3?0n:record.upperTokenId});
        continue;
      }
      if(!address)continue;
      const candidates=pool===3?foundry.filter(nft=>nft.cycle===cycleId):positions;
      const deadline=pool===3||!candidates.length?null:await vault.deadline(cycleId);
      const rewards=await mapReads(candidates,async nft=>{
        const [claimed,power]=await Promise.all([vault.hasClaimed(cycleId,nft.id),pool===3?1n:position.powerAt(nft.id,deadline)]);
        if(claimed||power===0n)return null;
        return {pool,cycleId,tokenId:nft.id,amount:await vault.claimable(cycleId,nft.id),token:config.token};
      });
      claims.push(...rewards.filter(Boolean));
    }
    return {claims,settlements};
  }));
  return {claims:results.flatMap(r=>r.claims),settlements:results.flatMap(r=>r.settlements),claimScanComplete:!!(address&&portfolioComplete)};
}
