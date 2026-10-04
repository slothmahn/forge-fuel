import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
for(const file of ['mainnet-white-paper-v1.js','pulse-mainnet.js']) {
 const source=await readFile(new URL(`../../assets/${file}`,import.meta.url),'utf8');
 const start=source.indexOf('function kf()'),end=source.indexOf('var fuelMarketPending',start);
 const labels={};
 const Z={prices:{cbbtc:{price:85000,native:8500000000}},burners:[],burnTotals:{}};
 const context=vm.createContext({Z,Y:(key,value)=>labels[key]=value,Md:(usd,native)=>usd/native,Nd:(amount,decimals,price)=>price>0?Number(amount)/10**decimals*price:null,Df:value=>value===null?'USD reference unavailable':`USD ${value.toFixed(2)}`});
 vm.runInContext(source.slice(start,end),context);
 vm.runInContext('kf()',context);
 assert.equal(labels['#burn-total-usd'],'Checking burn balances…');
 Z.burners=[{key:'fuelBurner',token:'FUEL',balance:11189430550965000000000000n,gross:0n,callerReward:0n}];
 vm.runInContext('kf()',context);
 assert.equal(labels['#burn-total-usd'],'USD 111.89','Balance arriving after price updates total');
 Z.burners[0].balance=0n;vm.runInContext('kf()',context);assert.equal(labels['#burn-total-usd'],'USD 0.00');
 Z.prices={};vm.runInContext('kf()',context);
 Z.prices={cbbtc:{price:85000,native:8500000000}};Z.burners[0].balance=100000000000000000000000n;vm.runInContext('kf()',context);
 assert.equal(labels['#burn-total-usd'],'USD 1.00','Price arriving after balance updates total');
}
console.log('PASS: both chains, prices first, balances first, zero balance');
