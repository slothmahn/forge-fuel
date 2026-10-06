// Called only after the user selects a chain, never during silent restoration.
export async function switchWalletChain(provider, chain) {
 const target=BigInt(chain.id), chainId='0x'+target.toString(16);
 if(BigInt(await provider.request({method:'eth_chainId'}))===target)return;
 try {await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});}
 catch(error){
  if(![error?.code,error?.data?.code,error?.data?.originalError?.code].some(code=>Number(code)===4902))throw error;
  await provider.request({method:'wallet_addEthereumChain',params:[{chainId,chainName:chain.name,nativeCurrency:{name:chain.unit==='PLS'?'Pulse':chain.unit==='AVAX'?'Avalanche':'Ether',symbol:chain.unit,decimals:18},rpcUrls:[chain.rpc],blockExplorerUrls:[chain.explorer]}]});
  if(BigInt(await provider.request({method:'eth_chainId'}))!==target)await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});
 }
 if(BigInt(await provider.request({method:'eth_chainId'}))!==target)throw Error('The wallet did not switch to '+chain.name+'. Try again.');
}
