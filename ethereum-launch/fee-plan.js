export function feePlan(gasPrice, baseFee, suggestedTip, gasLimit){
 if(gasPrice<=0n||gasLimit<=0n)throw Error('Current fee information unavailable.');
 const maxFeePerGas=gasPrice*125n/100n;
 const implied=gasPrice>baseFee?gasPrice-baseFee:1000000n;
 const tip=suggestedTip>0n&&suggestedTip<implied?suggestedTip:implied;
 return {maxFeePerGas,maxPriorityFeePerGas:tip>maxFeePerGas?maxFeePerGas:tip,maximumCost:gasLimit*maxFeePerGas};
}
