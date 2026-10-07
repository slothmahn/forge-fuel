import assert from 'node:assert/strict';
import {moreUsdFromPool} from '../../ethereum/more-market-price.js';
const MORE='0xbEEf3bB9dA340EbdF0f5bae2E85368140d7D85D0',WETH='0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const q=2n**96n;
assert.equal(moreUsdFromPool({token0:MORE,token1:WETH,sqrtPriceX96:q/2n,liquidity:1n,ethUsd:2000}),500);
assert.equal(moreUsdFromPool({token0:WETH,token1:MORE,sqrtPriceX96:q*2n,liquidity:1n,ethUsd:2000}),500);
for(const override of [{token0:'0x123'},{liquidity:0n},{sqrtPriceX96:0n},{ethUsd:null},{ethUsd:Infinity}])assert.throws(()=>moreUsdFromPool({token0:MORE,token1:WETH,sqrtPriceX96:q,liquidity:1n,ethUsd:2000,...override}));
console.log('PASS: MORE/WETH price, inverse ordering, wrong token and unavailable reference rejection');
