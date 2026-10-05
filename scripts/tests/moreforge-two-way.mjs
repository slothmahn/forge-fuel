import assert from 'node:assert/strict';
import {Interface} from '../../moreforge/vendor/ethers-6.15.0.js';
import {quotePurchase,quotePurchaseForOutput,minimumReceived} from '../../moreforge/swaps.js';
const key='tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)';
const v4=new Interface([`function quoteExactInputSingle(tuple(${key} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256,uint256)`,`function quoteExactOutputSingle(tuple(${key} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256,uint256)`]);
const v2=new Interface(['function getAmountsOut(uint256,address[]) view returns(uint256[])','function getAmountsIn(uint256,address[]) view returns(uint256[])']);
for(const chain of ['rh','pls']){
 const iface=chain==='rh'?v4:v2;
 const reader={call:async tx=>{const parsed=iface.parseTransaction(tx);const reverse=/Output|AmountsIn/.test(parsed.name);const amount=chain==='rh'?parsed.args[0].exactAmount:parsed.args[0];const result=reverse?(amount+2n)/3n:amount*3n;return iface.encodeFunctionResult(parsed.name,chain==='rh'?[result,100n]:[reverse?[result,amount]:[amount,result]]);}};
 assert.equal(await quotePurchaseForOutput(chain,reader,100n),34n);
 assert.equal(await quotePurchase(chain,reader,34n),102n);
 await assert.rejects(quotePurchaseForOutput(chain,reader,0n));
 const fail={call:async()=>{throw Error('Insufficient liquidity');}};
 await assert.rejects(quotePurchaseForOutput(chain,fail,10n),/Insufficient liquidity/);
}
assert.equal(minimumReceived(102n,100),100n);
await assert.rejects(quotePurchaseForOutput('rh',{call:async()=>''},2n**128n));
console.log('Two-way quote tests passed: both routes, rounding, slippage, invalid amounts and liquidity errors.');
