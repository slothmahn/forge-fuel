import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../assets/chain-navigation.js',import.meta.url),'utf8');
function page(path) {
  let href='https://thefuelforge.com'+path;
  const redirects=[];
  const location={get href(){return href;},get pathname(){return new URL(href).pathname;},get search(){return new URL(href).search;},get hash(){return new URL(href).hash;},replace(value){redirects.push(value);}};
  const window={addEventListener(){}};
  const context={URL,location,window,history:{state:null,replaceState(state,title,value){href=new URL(value,href).href;}},document:{documentElement:{},querySelector(){return null;}},MutationObserver:class {observe(){}},console};
  vm.runInNewContext(source,context);
  return {route:window.forgeRouteWalletChain,redirects,location};
}
for (const [path,selected,old,destination] of [['/pulsechain/',369,4663,'/'],['/',4663,369,'/pulsechain/']]) {
  const manual=page(path+'?chain='+selected+'#burns');
  assert.equal(manual.route(old),false,'Old wallet network must not override manual choice');
  assert.deepEqual(manual.redirects,[]);
  assert.equal(manual.route(selected),false,'Selected network confirms the chosen page');
  assert.equal(manual.location.search,'','Remove intent only after wallet catches up');
  assert.equal(manual.location.hash,'#burns');
  assert.equal(manual.route(old),true,'Subsequent wallet network changes still route');
  assert.deepEqual(manual.redirects,[destination+'#burns']);
  const automatic=page(path+'#rewards');
  assert.equal(automatic.route(old),true,'Normal authorized-wallet routing stays enabled');
  assert.deepEqual(automatic.redirects,[destination+'#rewards']);
}
const unknown=page('/pulsechain/?chain=369');
assert.equal(unknown.route('0x1'),false);
assert.equal(unknown.route('invalid'),false);
console.log('Both chain selections resist old-wallet redirects, then resume wallet routing after confirmation.');
