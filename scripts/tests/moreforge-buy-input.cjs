const assert=require('assert/strict');
const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/live-v2.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.route('https://**/*',r=>r.fulfill({json:{pairs:[]}}));
 await page.goto('http://127.0.0.1:8769/moreforge/#buy');
 await page.evaluate(async()=>{
  const {installBuy}=await import('/moreforge/buy-ui-v2.js');
  const {AbiCoder,Interface}=await import('/moreforge/vendor/ethers-6.15.0.js');
  const {routes}=await import('/moreforge/swaps.js');const abi=AbiCoder.defaultAbiCoder();
  const v2=new Interface(['function getAmountsOut(uint256,address[]) view returns(uint256[])']);
  const v4=new Interface(['function quoteExactInputSingle(tuple(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256,uint256)']);
  window.fixture={calls:[],wallet:'0x0000000000000000000000000000000000000001'};const f=fixture;
  f.x={key:'rh',n:{unit:'ETH',id:4663},ready:true,m:{contracts:{mainQuote:'0x0000000000000000000000000000000000000002'}}};
  f.x.r={getBalance:async()=>10n**18n,getFeeData:async()=>({gasPrice:1000000000n}),getBlock:async()=>({timestamp:1791010000}),estimateGas:async tx=>{f.tx=tx;return 100000n},call:async tx=>{
   if(tx.to.toLowerCase()===f.x.m.contracts.mainQuote.toLowerCase())return abi.encode(['uint256','uint256'],[1000n*10n**18n,1791010000]);
   const amount=f.x.key==='rh'?v4.decodeFunctionData('quoteExactInputSingle',tx.data)[0].exactAmount:v2.decodeFunctionData('getAmountsOut',tx.data)[0];f.calls.push(amount);
   return f.x.key==='rh'?abi.encode(['uint256','uint256'],[amount*1000n,100000n]):abi.encode(['uint256[]'],[[amount,amount*1000n]]);
  }};
  f.buy=installBuy({context:()=>f.x,account:()=>f.wallet,isBusy:()=>false,marketPrices:()=>({}),action:()=>{throw Error('No transaction authorized')},tab:()=>{},status:()=>{}});
 });
 for(const chain of ['rh','pls']){
  await page.evaluate(chain=>{fixture.x={...fixture.x,key:chain,n:{unit:chain==='rh'?'ETH':'PLS',id:chain==='rh'?4663:369}};fixture.buy.update()},chain);
  for(const input of ['.003','0.003']){
   await page.locator('#buy-amount').fill(input);
   await page.waitForFunction(()=>document.querySelector('#buy-status').textContent.startsWith('Quote ready'));
   assert.match(await page.locator('#buy-output').innerText(),/3 MORE/);
   assert.equal(await page.evaluate(()=>fixture.calls.at(-1).toString()),'3000000000000000');
   assert.equal(await page.evaluate(()=>fixture.tx.value.toString()),'3000000000000000');
   assert(!(await page.locator('#buy-submit').isDisabled()));
   await page.locator('#buy-form').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
   assert.match(await page.locator('#buy-review-body').innerText(),/Spend 0\.003 (ETH|PLS) to buy an estimated 3\.0 MORE/);
   await page.locator('#buy-cancel').click();
  }
 }
 for(const input of ['.','0','.0000000000000000001','-1','1e-3']){
  await page.locator('#buy-amount').fill(input);await page.waitForTimeout(500);
  assert(await page.locator('#buy-submit').isDisabled());assert.equal(await page.locator('#buy-output').innerText(),'—');
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('PASS: mobile .003 and 0.003 estimates, exact spend and review on both chains; invalid/zero/excess precision blocked; no wallet transactions.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
