// Retry transport failures only; wrong-chain and contract validation failures remain locked.
export function isTemporaryRpcFailure(error) {
  const status=Number(error?.info?.responseStatus ?? error?.status);
  if(status===429 || status>=500 && status<=599)return true;
  const messages=[error?.message,error?.shortMessage,error?.error?.message,error?.info?.error?.message].filter(Boolean).join(' ');
  return /load failed|failed to fetch|network(?: request)? (?:failed|error)|networkerror|fetch failed|timed? ?out|timeout|connection (?:reset|refused)|failed to detect network|rate limit|too many requests/i.test(messages);
}
const publicReadMethods=new Set(['eth_chainId','eth_blockNumber','eth_call','eth_getBalance','eth_getCode','eth_getLogs','eth_getBlockByNumber','eth_getBlockByHash','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getTransactionCount']);
export function attachRpcTransportRetry(provider,{attempts=3,concurrency=2,getWallet=()=>null,chainId,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  const send=provider._send.bind(provider),queue=[];let active=0;
  async function acquire(){if(active>=concurrency)await new Promise(resolve=>queue.push(resolve));else active++;}
  function release(){const next=queue.shift();if(next)next();else active--;}
  provider._send=async payload=>{
    await acquire();
    try{
      for(let attempt=0;;attempt++) {
        try{
          const result=await send(payload);
          const temporary=result.find?.(entry=>entry.error&&isTemporaryRpcFailure(entry.error));
          if(temporary)throw Object.assign(Error(temporary.error.message),{error:temporary.error});
          return result;
        }catch(error){
          if(!isTemporaryRpcFailure(error))throw error;
          if(attempt+1<attempts){await wait(500*2**attempt);continue;}
          // Wallet transport can bypass a wallet browser's failing cross-origin fetch.
          // This never asks for accounts, changes networks, or submits transactions.
          const wallet=getWallet(),requests=Array.isArray(payload)?payload:[payload];
          if(!wallet?.request || chainId==null || !requests.every(item=>publicReadMethods.has(item.method)))throw error;
          if(BigInt(await wallet.request({method:'eth_chainId'}))!==BigInt(chainId))throw error;
          return await Promise.all(requests.map(async item=>{
            try{return {id:item.id,jsonrpc:'2.0',result:await wallet.request({method:item.method,params:item.params||[]})};}
            catch(failure){return {id:item.id,jsonrpc:'2.0',error:{code:Number(failure.code)||-32000,message:failure.message||'Wallet read failed'}};}
          }));
        }
      }
    }finally{release();}
  };
  return provider;
}
