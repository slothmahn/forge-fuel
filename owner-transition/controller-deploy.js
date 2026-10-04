import {BrowserProvider,Contract,ContractFactory,formatEther} from '../moreforge/vendor/ethers-6.15.0.js';
const data=await fetch('./controller-deployment-payload.json').then(r=>r.json());
const $=s=>document.querySelector(s),same=(a,b)=>a.toLowerCase()===b.toLowerCase();
let prepared=null,saved=null,busy=false;
const show=t=>$('#status').textContent=t;
$('#chain').onchange=()=>{prepared=null;$('#deploy').disabled=true;show('Choose the same chain in your wallet, then connect again.');};
async function validate(){
 if(!window.ethereum)throw Error('Open this page in your desktop browser with your wallet extension enabled.');
 const p=new BrowserProvider(window.ethereum),network=await p.getNetwork(),id=$('#chain').value,config=data.chains[id];
 if(network.chainId!==BigInt(id))throw Error('Switch your wallet to '+config.name+' first.');
 const signer=await p.getSigner(),address=await signer.getAddress();
 if(!same(address,config.manager))throw Error('Connect the existing owner wallet: '+config.manager);
 for(const engine of config.engines){const c=new Contract(engine,['function owner() view returns(address)'],p);if(!same(await c.owner(),config.manager))throw Error('Engine ownership changed. Stop and review: '+engine);}
 return {p,signer,id,config};
}
$('#prepare').onclick=async()=>{
 if(busy)return;busy=true;prepared=null;$('#deploy').disabled=true;
 try{if(!window.ethereum)throw Error('Open in a browser with your wallet extension.');await window.ethereum.request({method:'eth_requestAccounts'});const x=await validate();const factory=new ContractFactory(data.abi,data.bytecode,x.signer),request=await factory.getDeployTransaction(x.config.manager,x.config.engines),gas=await x.p.estimateGas({...request,from:x.config.manager}),fees=await x.p.getFeeData();prepared=x;show('Chain: '+x.config.name+'\nManager: '+x.config.manager+'\nBurn engines: '+x.config.engines.length+'\nEstimated gas: '+gas+'\nEstimated maximum fee: '+formatEther(gas*(fees.maxFeePerGas??fees.gasPrice??0n))+' '+(x.id==='369'?'PLS':'ETH')+'\n\nReview the deployment in your wallet. Existing ownership will remain unchanged.');$('#deploy').disabled=false;}
 catch(e){show(e.shortMessage||e.message);}finally{busy=false;}
};
$('#deploy').onclick=async()=>{
 if(busy||!prepared)return;busy=true;$('#deploy').disabled=true;
 try{const x=await validate();if(x.id!==prepared.id)throw Error('Chain changed. Prepare again.');show('Review and approve deployment in your wallet.');const controller=await new ContractFactory(data.abi,data.bytecode,x.signer).deploy(x.config.manager,x.config.engines);const tx=controller.deploymentTransaction();show('Deployment submitted: '+tx.hash+'\nWaiting for confirmation…');const receipt=await tx.wait();if(receipt.status!==1)throw Error('Deployment failed.');const address=await controller.getAddress();saved={chainId:Number(x.id),address,manager:x.config.manager,engines:x.config.engines,transactionHash:tx.hash,blockNumber:receipt.blockNumber};show('Controller deployed: '+address+'\nTransaction: '+tx.hash+'\n\nSave the receipt and send the controller address to Codex. Do not transfer or renounce ownership yet; the site must first support the controller.');$('#save').hidden=false;}
 catch(e){show(e.shortMessage||e.message);prepared=null;}finally{busy=false;}
};
$('#save').onclick=()=>{if(!saved)return;const url=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='forge-drip-controller-'+saved.chainId+'.json';a.click();URL.revokeObjectURL(url);};
