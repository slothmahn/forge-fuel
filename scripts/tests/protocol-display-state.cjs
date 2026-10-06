const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const chain of ['ethereum','avalanche']){
 const source=fs.readFileSync(`${chain}/${chain}-live.js`,'utf8');
 const render=source.slice(source.indexOf('function drawPositions('),source.indexOf('async function transfer('));
 const nodes={};const node=()=>({dataset:{},children:[],innerHTML:'',textContent:'',append(...a){this.children.push(...a)},replaceChildren(){this.children=[]},setAttribute(){},querySelector(){return node()}});
 const $=s=>nodes[s]??=node();const createdAt=1000000n,maturity=createdAt+8n*86400n;
 const p={principal:100n,createdAt,maturity,closedAt:0n};
 const state={now:Number(createdAt),positions:[{id:1n,owner:'me',p}]};
 const context={state,account:'me',ended:false,$,document:{createElement:node},same:(a,b)=>a===b,text:(s,t)=>$(s).textContent=t,amount:String,f:String,button:node,Math,Date};
 vm.createContext(context);vm.runInContext(render,context);
 for(const [offset,phase,label] of [[0,'active','Active'],[8*86400,'grace','Grace period'],[15*86400,'decay','Decaying'],[22*86400,'expired','Fully decayed']]){
  state.now=Number(createdAt)+offset;vm.runInContext('drawPositions()',context);
  const item=nodes['#reward-positions'].children[0];assert.equal(item.dataset.phase,phase);assert.ok(item.innerHTML.includes(label));
 }
 assert.ok(nodes['#reward-positions'].children[0].innerHTML.includes('width:100%'));
 context.account=null;vm.runInContext('drawPositions()',context);assert.equal(nodes['#active-filter'].textContent,'Active · —');assert.match(nodes['#reward-positions'].textContent,/Connect your wallet/);
 const usd=source.slice(source.indexOf('const usd='),source.indexOf('const same='));
 vm.runInContext("const f=(v,d)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(v);"+usd+';result=usd(0.000000001,2700);',context);
 assert.match(context.result,/0\.0000027/);
 console.log(`${chain}: timeline phases, complete decay, disconnected counts and nonzero small USD references passed.`);
}
