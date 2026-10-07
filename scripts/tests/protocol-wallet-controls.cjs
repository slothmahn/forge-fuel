const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const chain of ['ethereum','avalanche']){
 const source=fs.readFileSync(chain+'/'+chain+'-live.js','utf8');
 const controls=new Map();const $=s=>{if(!controls.has(s))controls.set(s,{disabled:false,hidden:false});return controls.get(s)};
 const maxes=[{disabled:false},{disabled:false}];const ctx={account:null,ready:true,busy:false,refreshing:false,$,document:{querySelectorAll:()=>maxes}};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function syncWalletControls(){'),source.indexOf('async function connect(){')),ctx);ctx.syncWalletControls();assert(maxes.every(b=>b.disabled));assert($('#forge-form button[type=submit]').disabled);assert.equal($('#connect-rewards').hidden,false);
 ctx.account='0x1111111111111111111111111111111111111111';ctx.syncWalletControls();assert(maxes.every(b=>!b.disabled));assert.equal($('#forge-form button[type=submit]').disabled,false);assert.equal($('#connect-rewards').hidden,true);assert.equal($('#refresh-rewards').hidden,false);
 ctx.busy=true;ctx.syncWalletControls();assert(maxes.every(b=>b.disabled));assert($('#foundry-form button[type=submit]').disabled);
 ctx.busy=false;ctx.refreshing=true;ctx.syncWalletControls();assert(maxes.every(b=>b.disabled));ctx.refreshing=false;ctx.ready=false;ctx.syncWalletControls();assert($('#forge-form button[type=submit]').disabled);
 console.log(chain+': disconnected/connected/loading/busy controls behave consistently; preview inputs are not disabled.');
}
