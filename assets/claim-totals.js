// Token totals stay separate; USD references can be combined across reward assets.
export function claimTotalsMarkup({connected,complete,nativeAmount,bitcoinAmount,nativeSymbol,bitcoinSymbol,format,usd}) {
  if(!connected)return '<strong class="claim-reward-total">Connect wallet</strong>';
  if(!complete)return '<strong class="claim-reward-total">Checking rewards…</strong>';
  const totals=[];
  if(nativeAmount>0n || bitcoinAmount===0n)totals.push(`${format(nativeAmount,18,6)} ${nativeSymbol}`);
  if(bitcoinAmount>0n)totals.push(`${format(bitcoinAmount,8,8)} ${bitcoinSymbol}`);
  const dollar=usd===null || !Number.isFinite(usd)?'USD reference unavailable':usd>0&&usd<0.01?'≈ &lt;$0.01 USD':`≈ ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(usd)} USD`;
  return `<strong class="claim-reward-total">${totals.join('<br>+ ')}</strong><small class="claim-reward-usd">${dollar}</small>`;
}
