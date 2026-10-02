(function(root){
 'use strict';
 function termReward({term,firstDeadline,cycleDays,fundingUsd,feeUsd,allocationBps,share,valid=true}) {
  if(!valid||term<firstDeadline)return {count:0,usd:0};
  const count=1+Math.floor((term-firstDeadline)/cycleDays);
  return {count,usd:(fundingUsd*count+feeUsd*allocationBps/10000)*0.9975*share};
 }
 const api={termReward};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MoreForgeEstimates=api;
})(typeof globalThis!=='undefined'?globalThis:this);
