import {sortStakeRecords,stakeSortOptions} from './stake-sort-model.js?v=stake-sort-154';
const storageKey='forge-stake-sort';
let choice='soonest';try{const saved=localStorage.getItem(storageKey);if(stakeSortOptions.some(([value])=>value===saved))choice=saved;}catch{}
const views=[
 {root:'#positions',before:'.position-tabs',lists:['#positions-list','#ended-positions-list']},
 {root:'.stake-wallet',before:'.stake-filters',lists:['#reward-positions']},
 {root:'#position-controls',before:'.position-filters',lists:['#position-list']}
];
function sortList(list){
 const cards=[...list.children].filter(e=>e.hasAttribute('data-stake-id'));
 const ordered=sortStakeRecords(cards.map(node=>({node,id:node.dataset.stakeId,maturity:node.dataset.stakeMaturity,created:node.dataset.stakeCreated})),choice).map(record=>record.node);
 if(ordered.every((node,index)=>node===cards[index]))return;
 const scroll=list.scrollTop;for(const node of ordered)list.append(node);list.scrollTop=scroll;
}
function update(){
 for(const view of views){const root=document.querySelector(view.root);if(!root)continue;
  let select=root.querySelector('[data-stake-sort]');
  if(!select){const label=document.createElement('label');label.className='stake-sort-control';label.append(document.createTextNode('Sort by'));
   select=document.createElement('select');select.dataset.stakeSort='';select.setAttribute('aria-label','Sort stakes by');
   for(const [value,text] of stakeSortOptions){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
   label.append(select);const before=root.querySelector(view.before)||root.querySelector(view.lists[0]);if(before)before.before(label);else root.append(label);
   select.addEventListener('change',()=>{choice=select.value;try{localStorage.setItem(storageKey,choice);}catch{}update();});
  }
  if(select.value!==choice)select.value=choice;
  for(const selector of view.lists){const list=root.querySelector(selector);if(list)sortList(list);}
 }
}
let queued=false;
const observer=new MutationObserver(records=>{
 // Only mounts and list replacements need sorting; live countdown text is ignored.
 if(!records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1)))return;
 if(queued)return;queued=true;queueMicrotask(()=>{queued=false;update();});
});
observer.observe(document.body,{childList:true,subtree:true});update();
