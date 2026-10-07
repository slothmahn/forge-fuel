// Check the immutable Bitcoin conversion limits before asking for MORE approval.
export async function checkBitcoinFunding(quote,fee,{bitcoinBps=1780,cap}){
 const funding=fee*BigInt(bitcoinBps)/10000n,limit=BigInt(cap);
 if(funding<=0n)throw Error('Increase the locked MORE amount: its Bitcoin allocation is too small.');
 if((funding-1n)/limit+1n>32n)throw Error('This entry needs more than 32 Bitcoin swaps. Reduce the locked MORE amount.');
 const first=funding>limit?limit:funding,last=funding%limit||first;
 let values;try{const firstQuote=quote.quote(first);values=await Promise.all([firstQuote,last!==first?quote.quote(last):firstQuote]);}catch(e){const data=e.data||e.info?.error?.data;if(data?.slice(0,10)==='0x69f8a2c0')throw Error('Increase the locked MORE amount: its Bitcoin allocation is below usable Bitcoin token precision.');throw Error('Bitcoin conversion quote unavailable. Refresh before creating a position.');}
 if(values.some(v=>v[0]*9000n/10000n===0n))throw Error('Increase the locked MORE amount: its Bitcoin allocation is below usable Bitcoin token precision.');
 return funding;
}
