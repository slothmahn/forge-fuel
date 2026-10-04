import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {attachRpcTransportRetry,isTemporaryRpcFailure} from '../../assets/forge-rpc-retry.js';
for(const message of ['Load failed','Failed to fetch','network error','request timeout'])assert(isTemporaryRpcFailure(Error(message)));
for(const message of ['Mainnet contract wiring does not match the reviewed deployment manifest.','Mainnet RPC returned the wrong chain.'])assert(!isTemporaryRpcFailure(Error(message)));
let calls=0;const payload=[{method:'eth_call',id:1}];
const provider={async _send(received){assert.equal(received,payload);calls++;if(calls<3)throw TypeError('Load failed');return [{id:1,result:'0x01'}];}};
attachRpcTransportRetry(provider,{wait:async()=>{}});assert.deepEqual(await provider._send(payload),[{id:1,result:'0x01'}]);assert.equal(calls,3);
let failedCalls=0;const offline={async _send(){failedCalls++;throw TypeError('Load failed');}};attachRpcTransportRetry(offline,{wait:async()=>{}});await assert.rejects(offline._send(payload),/Load failed/);assert.equal(failedCalls,3);
const source=fs.readFileSync(new URL('../../assets/mainnet-white-paper-v1.js',import.meta.url),'utf8');
const part=source.slice(source.indexOf('let fuelPublicReadsAllowed=false;'),source.indexOf('function _f()',source.indexOf('let fuelPublicReadsAllowed=false;')));
for(const transport of [true,false]){
 const events=[];const state={ready:false};let retry;
 const ctx=vm.createContext({Z:state,fetch:async()=>({ok:true,json:async()=>({contracts:{}})}),Vd:()=>[],tf:()=>{},Rf:async()=>{},hf:async()=>{throw Error(transport?'Load failed':'Wrong owner');},of:{},cf:()=>{},pf:()=>{},uf:()=>{},J:()=>({addEventListener:(event,handler)=>retry=handler}),_f:()=>events.push('cleared'),Zd:String,isTemporaryRpcFailure,forgeSharePreview:{},Error});
 vm.runInContext(part,ctx);await ctx.gf();assert.equal(state.ready,false);assert.equal(events.includes('cleared'),!transport);assert.equal(ctx.of.innerHTML.includes('Robinhood connection interrupted'),transport);assert.equal(typeof retry,transport?'function':'undefined');
 if(transport){ctx.hf=async()=>{};ctx.xf=async()=>{};await retry();await new Promise(r=>setImmediate(r));assert.equal(state.ready,true);}
}
console.log('Safari transport failures retry each failed RPC batch, stop after three attempts, and can recover through Retry connection. Validation failures remain locked.');
