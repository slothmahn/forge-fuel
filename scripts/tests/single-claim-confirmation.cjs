const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const name of ['mainnet-white-paper-v1.js','pulse-mainnet.js']){
 const source=fs.readFileSync('assets/'+name,'utf8');const guard=source.match(/if\((n\.length<=1\|\|window\.confirm\(`Claiming rewards needs[^\n]+?`\))\)/)?.[1];assert(guard,'Claim transaction-count guard is present');
 for(const count of [0,1,2,5])for(const accept of [true,false]){
  let prompts=0;const result=vm.runInNewContext(guard,{n:Array(count),window:{confirm(text){prompts++;assert(text.includes(`${count} wallet confirmations`));return accept;}}});
  assert.equal(prompts,count>1?1:0);assert.equal(result,count<=1||accept);
 }
 console.log(name+': single claims bypass the extra popup; multiple claims respect Continue and Cancel.');
}
