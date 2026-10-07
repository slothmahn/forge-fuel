// Cache confirmed log windows; always reread the recent tail for reorganizations.
export function createBurnHistoryReader(provider,startBlock,{windowSize=2000,confirmations=64}={}){
 const cache=new Map(),pending=new Map(),totals=new Map();
 return {
  peek(address){return totals.get(address.toLowerCase())??null;},
  load(contract,head){
   const key=contract.target.toLowerCase();if(pending.has(key))return pending.get(key);
   const task=(async()=>{
    const prior=cache.get(key);let base=prior;
    if(base){const block=await provider.getBlock(base.block);if(!block||block.hash!==base.hash)base=null;}
    const confirmed=Math.max(startBlock-1,head-confirmations);
    let sum=base?.sum??0n;
    const topic=contract.interface.getEvent('Executed').topicHash;
    async function range(first,last){
     let total=0n;
     for(let batch=first;batch<=last;batch+=windowSize*4){
      const logs=await Promise.all(Array.from({length:Math.min(4,Math.ceil((last-batch+1)/windowSize))},(_,i)=>{
       const fromBlock=batch+i*windowSize;return provider.getLogs({address:contract.target,topics:[topic],fromBlock,toBlock:Math.min(last,fromBlock+windowSize-1)});
      }));
      for(const entries of logs)for(const log of entries)total+=contract.interface.parseLog(log).args.tokensBurned;
     }
     return total;
    }
    // Do not use a cached checkpoint ahead of the current chain head.
    if(base&&base.block>confirmed){base=null;sum=0n;}
    sum+=await range(base?base.block+1:startBlock,confirmed);
    if(confirmed>=startBlock){const block=await provider.getBlock(confirmed);if(!block)throw Error('History checkpoint unavailable');cache.set(key,{block:confirmed,hash:block.hash,sum});}
    const total=sum+await range(confirmed+1,head);totals.set(key,total);return total;
   })().finally(()=>pending.delete(key));pending.set(key,task);return task;
  }
 };
}
