// Retry only temporary RPC transport failures; contract validation errors are never retried.
export function isTemporaryRpcFailure(error) {
  const status=Number(error?.info?.responseStatus ?? error?.status);
  if(status===429 || status>=500 && status<=599)return true;
  const messages=[error?.message,error?.shortMessage,error?.error?.message,error?.info?.error?.message].filter(Boolean).join(' ');
  return /load failed|failed to fetch|network(?: request)? (?:failed|error)|networkerror|fetch failed|timed? ?out|timeout|connection (?:reset|refused)|failed to detect network/i.test(messages);
}
export function attachRpcTransportRetry(provider,{attempts=3,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  const send=provider._send.bind(provider);
  provider._send=async payload=>{
    for(let attempt=0;;attempt++) {
      try{return await send(payload);}
      catch(error){
        if(attempt+1>=attempts || !isTemporaryRpcFailure(error))throw error;
        await wait(500*2**attempt);
      }
    }
  };
  return provider;
}
