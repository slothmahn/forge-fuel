const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const [chain,native,bitcoin] of [['ethereum','ETH','wBTC'],['avalanche','AVAX','BTC.b']]){
 const source=fs.readFileSync(`${chain}/${chain}-live.js`,'utf8'),render=source.slice(source.indexOf('function drawPools()'),source.indexOf('function drawPositions('));
 const nodes={};function node(){return{children:[],innerHTML:'',textContent:'',append(...v){this.children.push(...v)},replaceChildren(){this.children=[]}};}const $=id=>nodes[id]??=node();
 const E=10n**18n,base={days:8,cycle:1n,deadline:1791997200n,balance:10000n*E,powers:[3n,1n],totalPower:4n,count:0n,contract:{}};
 const state={now:1791392400,ethUsd:1,btcUsd:10,claims:[{days:8,value:7n*E},{days:288,value:5000000n}],positions:[{owner:'me'},{owner:'other'}],foundry:[{owner:'me',cycle:1n},{owner:'me',cycle:1n},{owner:'other',cycle:1n}],pools:[base,{...base,days:28},{...base,days:88,totalPower:0n,powers:[0n,0n]},{...base,days:288,count:3n,balance:10001n,powers:[],totalPower:0n}]};
 const context={state,account:'me',config:{launchTime:1791306000},document:{createElement:node},$,num:(v,d=18)=>Number(v)/10**d,f:v=>String(v),amount:(v,d=18)=>String(Number(v)/10**d),usd:(v,r)=>String(v*r),same:(a,b)=>a===b,text:(id,t)=>$(id).textContent=t,button:()=>node(),Date,Math,BigInt};vm.createContext(context);vm.runInContext(render+';drawPools();',context);
 assert.equal(nodes['#pool-grid'].children.length,4);const cards=nodes['#pool-grid'].children;
 assert.match(cards[0].innerHTML,/75.00%/);assert.ok(cards[0].innerHTML.includes(`7481.25 ${native}`));assert.ok(cards[2].innerHTML.includes('0.00%'));assert.ok(cards[3].innerHTML.includes(`0.0000665 ${bitcoin}`));
 assert.equal((nodes['#live-pool-totals'].innerHTML.match(/<strong/g)||[]).length,3);assert.ok(nodes['#live-pool-totals'].innerHTML.includes(`7 ${native} · 0.05 ${bitcoin}`));assert.equal(nodes['#settle-available'].disabled,true);
 context.account=null;vm.runInContext('drawPools()',context);assert.match(nodes['#pool-grid'].children[0].innerHTML,/Connect wallet/);assert.ok(!nodes['#pool-grid'].children[0].innerHTML.includes(`7481.25 ${native}`));
 console.log(`${chain}: projection, per-NFT rounding, zero-power eligibility, claim token totals, three summaries, and disconnected state passed.`);
}
