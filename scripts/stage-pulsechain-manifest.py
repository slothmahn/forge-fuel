"""Stage a site manifest from confirmed live receipts, never from dry-run addresses.
Writes a candidate for on-chain review; does not enable the public site.
"""
import argparse,json,urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('broadcast',type=Path);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
d=json.loads(args.broadcast.read_text())
assert 'dry-run' not in args.broadcast.parts and 'local-fork' not in args.broadcast.name,'Rehearsal addresses cannot be published'
assert d.get('chain')==369,'Wrong deployment chain'
def live_rpc(method,params):
 request=urllib.request.Request('https://rpc.pulsechain.com',data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json'})
 result=json.load(urllib.request.urlopen(request,timeout=30));assert 'error' not in result,result;return result['result']
assert int(live_rpc('eth_chainId',[]),16)==369,'Wrong live RPC chain'
receipts=d.get('receipts',[]);assert receipts and len(receipts)==len(d['transactions']),'Every transaction needs a receipt'
assert all(int(r['status'],16)==1 for r in receipts),'A deployment transaction failed'
for receipt in receipts:
 confirmed=live_rpc('eth_getTransactionReceipt',[receipt['transactionHash']])
 assert confirmed and int(confirmed['status'],16)==1,'Receipt not confirmed on live PulseChain'
 assert confirmed['blockHash']==receipt['blockHash'],'Receipt belongs to a fork or different block'
# Local fork rehearsals require their own separate test manifest. A caller must supply a real run.
keys={'ForgePosition':['position'],'PulseFoundry':['foundry'],'PulsePositionRewardVault':['vault8','vault28','vault88'],'ForkBurnEngine':['fuelBurner','moreBurner','pampBurner'],'PulseFeeRouter':['feeRouter'],'OneTimeFeeForwarder':['feeForwarder'],'SettlementBatcher':['settlementBatcher']}
contracts={};owner='0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9'
for tx in d['transactions']:
 assert tx['transaction']['from'].lower()==owner.lower(),'Unexpected deployer'
 if tx.get('transactionType')=='CREATE' and tx['contractName'] in keys:
  names=keys[tx['contractName']];assert names,'Unexpected extra deployment';contracts[names.pop(0)]=tx['contractAddress']
assert len(contracts)==11 and all(not remaining for remaining in keys.values()),'Incomplete contract graph'
assert len(set(v.lower() for v in contracts.values()))==11,'Duplicate addresses'
assert args.output.name!='pulsechain-deployment.json','Stage a candidate first; verify it against live RPC before enabling'
manifest={'status':'deployed','chainId':369,'owner':owner,'development':owner,'deploymentBlock':min(int(r['blockNumber'],16) for r in receipts),'launchTime':json.loads((args.broadcast.parent/'plan.json').read_text())['launchTime'] if (args.broadcast.parent/'plan.json').exists() else d['returns']['launchTime']['value'],'contracts':contracts,'transactionHashes':[r['transactionHash'] for r in receipts]}
args.output.write_text(json.dumps(manifest,indent=2)+'\n');print('Candidate staged. Live on-chain verification is still required before publication.')
