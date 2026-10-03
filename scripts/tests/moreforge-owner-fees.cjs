const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict');
(async()=>{
 const {feeSettings}=await import('../../moreforge/owner-fees.js');
 for(const percent of ['0','100.01','0.001','1e2'])assert.throws(()=>feeSettings({percent,minimum:'1',maximum:'2',bounds:true}));
 assert.throws(()=>feeSettings({percent:'1',minimum:'3',maximum:'2',bounds:true}));
 assert.throws(()=>feeSettings({percent:'1',minimum:'0',maximum:'2',bounds:true}));
 assert.equal(feeSettings({percent:'0.01',minimum:'0',maximum:'0',bounds:false}).bps,1n);
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/live-v2.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.route('https://**/*',r=>r.fulfill({contentType:'application/json',body:'{"pairs":[]}'}));
 await page.goto('http://127.0.0.1:8769/moreforge/#build');
 await page.evaluate(async()=>{
 const {installFeeSettings}=await import('/moreforge/owner-fees.js');
 const {Interface}=await import('/moreforge/vendor/ethers-6.15.0.js');const {positionAbi}=await import('/moreforge/v2-model.js');const abi=new Interface(positionAbi);
 const owner='0x0000000000000000000000000000000000000001';
 window.fixture={who:owner,busy:false,sent:[],ctx:{key:'rh',forgeReady:true,dataLoaded:true,owner,n:{unit:'ETH'},m:{position:'0x0000000000000000000000000000000000000002'},feePolicy:{bps:10000n,bounds:true,min:10n**15n,max:10n**18n}}};
 const f=window.fixture;f.live={...f.ctx.feePolicy};
 const signer={getAddress:async()=>owner,call:async tx=>{const name=abi.parseTransaction(tx).name;return abi.encodeFunctionResult(name,[{owner,feeBps:f.live.bps,feeBoundsEnabled:f.live.bounds,minFeeWei:f.live.min,maxFeeWei:f.live.max}[name]]);},sendTransaction:async tx=>{f.sent.push(tx);return{hash:'0x'+'1'.repeat(64)};}};
 f.controller=installFeeSettings({context:()=>f.ctx,account:()=>f.who,isBusy:()=>f.busy,status:()=>{},action:async(label,fn)=>{try{await fn(signer);return {status:1};}catch(e){f.failure=e.message;return null;}}});f.controller.render();
 });
 assert(await page.locator('#owner-fees').isVisible());
 await page.locator('[name=percent]').fill('50');await page.locator('#owner-fee-form button').click();assert(await page.locator('#owner-fee-review').isVisible());
 await page.locator('#owner-fee-confirm').click();await page.waitForFunction(()=>fixture.sent.length===1);
 const decoded=await page.evaluate(async()=>{const {Interface}=await import('/moreforge/vendor/ethers-6.15.0.js');const {positionAbi}=await import('/moreforge/v2-model.js');return [...new Interface(positionAbi).parseTransaction(fixture.sent[0]).args].map(String);});assert.deepEqual(decoded,['5000','true','1000000000000000','1000000000000000000']);
 await page.locator('#owner-fee-form button').click();await page.evaluate(()=>{fixture.live.bps=9000n});await page.locator('#owner-fee-confirm').click();await page.waitForFunction(()=>fixture.failure?.includes('policy changed'));assert.equal(await page.evaluate(()=>fixture.sent.length),1);
 await page.evaluate(()=>{fixture.who='0x0000000000000000000000000000000000000003';fixture.controller.render()});assert(await page.locator('#owner-fees').isHidden());
 await page.evaluate(()=>{fixture.who=fixture.ctx.owner;fixture.ctx={...fixture.ctx,key:'pls',n:{unit:'PLS'},feePolicy:{bps:10000n,bounds:true,min:200000n*10n**18n,max:200000000n*10n**18n}};fixture.controller.render()});
 assert.equal(await page.locator('[name=maximum]').inputValue(),'200000000.0');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 if(width===390)await page.locator('#owner-fees').screenshot({path:'/tmp/more-owner-fees-mobile.png'});
 await page.locator('[name=percent]').fill('10');await page.locator('#owner-fee-form button').click();await page.evaluate(()=>{fixture.ctx.dataLoaded=false;fixture.controller.render()});assert(await page.locator('#owner-fee-review').isHidden());assert(await page.locator('#owner-fees').isHidden());
 await page.close();console.log(width+'px: owner visibility, exact save arguments, stale-policy guard, PLS amounts and layout PASS');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
