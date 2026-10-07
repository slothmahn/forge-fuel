export const stakeSortOptions=[['soonest','Ending soonest'],['latest','Ending latest'],['newest','Newest first'],['oldest','Oldest first']];
function timestamp(value){try{return value==null||value===''?null:BigInt(value);}catch{return null;}}
export function sortStakeRecords(records,choice='soonest'){
 const mode=stakeSortOptions.some(([key])=>key===choice)?choice:'soonest';
 const field=mode==='newest'||mode==='oldest'?'created':'maturity',descending=mode==='latest'||mode==='newest';
 return [...records].sort((a,b)=>{
  const x=timestamp(a[field]),y=timestamp(b[field]);
  if(x===null&&y!==null)return 1;if(y===null&&x!==null)return -1;
  if(x!==null&&y!==null&&x!==y)return (x<y?-1:1)*(descending?-1:1);
  const i=timestamp(a.id)??0n,j=timestamp(b.id)??0n;return i===j?0:(i<j?-1:1)*(mode==='newest'?-1:1);
 });
}
