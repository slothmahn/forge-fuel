import assert from 'node:assert/strict';
import {switchWalletChain} from '../../assets/wallet-chain-switch.js';
const pls={id:369,name:'PulseChain',unit:'PLS',rpc:'https://rpc.pulsechain.com',explorer:'https://scan.pulsechain.com'};
const rh={id:4663,name:'Robinhood Chain',unit:'ETH',rpc:'https://rpc.mainnet.chain.robinhood.com/',explorer:'https://robinhoodchain.blockscout.com'};
for(const target of [pls,rh]){
 let current=target===pls?4663n:369n;const calls=[];
 const p={async request(req){calls.push(req);if(req.method==='eth_chainId')return '0x'+current.toString(16);if(req.method==='wallet_switchEthereumChain')current=BigInt(req.params[0].chainId);}};
 await switchWalletChain(p,target);assert.equal(current,BigInt(target.id));assert.equal(calls.filter(c=>c.method==='wallet_switchEthereumChain').length,1);assert(!calls.some(c=>c.method==='eth_requestAccounts'));assert(!calls.some(c=>c.method.startsWith('eth_send')));
 calls.length=0;await switchWalletChain(p,target);assert.equal(calls.length,1);
}
let current=4663n,registered=false;const calls=[];
await switchWalletChain({async request(req){calls.push(req);if(req.method==='eth_chainId')return '0x'+current.toString(16);if(req.method==='wallet_switchEthereumChain'){if(!registered)throw {code:4902};current=BigInt(req.params[0].chainId);}if(req.method==='wallet_addEthereumChain'){registered=true;assert.equal(req.params[0].rpcUrls[0],pls.rpc);}}},pls);
assert.equal(current,369n);assert.equal(calls.filter(c=>c.method==='wallet_addEthereumChain').length,1);
const rejected=[];await assert.rejects(switchWalletChain({async request(req){rejected.push(req.method);if(req.method==='eth_chainId')return '0x1237';throw Error('User rejected');}},pls),/User rejected/);assert(!rejected.includes('wallet_addEthereumChain'));
await assert.rejects(switchWalletChain({async request(req){if(req.method==='eth_chainId')return '0x1237';}},pls),/did not switch/);
console.log('Both chain directions, matching chain, network registration, rejection and unchanged-wallet guards passed. No account prompts or transactions.');
