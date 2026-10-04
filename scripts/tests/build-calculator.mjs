import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {inputs} from '../../moreforge/v2-model.js';
const unit=10n**18n;
for(const file of ['mainnet-white-paper-v1.js','pulse-mainnet.js']){
 const source=fs.readFileSync(new URL('../../assets/'+file,import.meta.url),'utf8');
 const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
 const fields={'#forge-principal':{value:'1000',removeAttribute(name){delete this[name];}},'#forge-burn':{value:'3000'},'#forge-form [name="term"]':{value:'88'}};
 const labels={},state={fuelBalance:1n*unit};let previewRenders=0;
 const ctx=vm.createContext({Z:state,J:s=>fields[s],Y:(s,v)=>labels[s]=v,gt:v=>BigInt(v)*unit,ht:v=>String(v/unit),X:v=>String(v/unit),forgeSharePreview:{render(){previewRenders++;}},foundrySharePreview:{render(){}},pf(){},Number});
 vm.runInContext(extract('function Hd(','function Ud(')+extract('function Wd(','var Gd=')+extract('function yf(){','let forgeEntryFunding=') +extract('function bf(){','let foundryQuoteVersion=0;'),ctx);
 ctx.bf();
 assert.equal(fields['#forge-principal'].value,'1000');assert.equal(fields['#forge-burn'].value,'3000');
 assert.equal(labels['#preview-power'],'4080');assert.equal(labels['#preview-max-burn'],'3000');assert(labels['#build-balance-note'].includes('Preview only'));
 assert.equal(ctx.yf(),false,'Insufficient connected wallet cannot create hypothetical position');
 state.fuelBalance=null;ctx.bf();assert.equal(labels['#preview-power'],'4080');assert.equal(ctx.yf(),false);
 state.fuelBalance=4000n*unit;ctx.bf();assert.equal(ctx.yf(),true);
 state.fuelBalance=0n;ctx.bf();assert.equal(labels['#preview-power'],'4080');
 assert.equal(ctx.Hd(1000n*unit,3000n*unit,unit).maxBurn,0n,'Max burn never produces a negative amount');
 fields['#forge-burn'].value='3001';ctx.bf();assert.equal(labels['#preview-power'],'Check inputs');assert.equal(fields['#forge-burn'].value,'3001');assert.equal(ctx.yf(),false);
 assert.equal(ctx.Wd(-unit,0n,88),null);assert.equal(ctx.Wd(unit,-unit,88),null);assert(previewRenders>=5);
 assert(source.includes('e+t>r'),'Fresh balance guard retained before approvals');
}
const more=fs.readFileSync(new URL('../../moreforge/live-v2.js',import.meta.url),'utf8');
for(const chain of ['rh','pls']){
 const scenario=inputs('1000','3000','88');assert.equal(scenario.power,4000n*unit+1000n*unit*80n/992n);assert(scenario.total>unit);
 assert(more.includes('v.total>x.balance'));assert(more.includes('balance<v.total'));
 assert.throws(()=>inputs('1000','3001','88'));assert.throws(()=>inputs('1000','0','1001'));
}
console.log('All four builders preserve hypothetical inputs and power; wallet and fresh-balance creation guards remain in place.');
