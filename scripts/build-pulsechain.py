"""Build a separate PulseChain entry from the existing production wallet UI.
Fail closed when the compiled upstream entry changes. Never supplies deployment addresses.
"""
from pathlib import Path
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
root=Path(__file__).resolve().parents[1]
s=(root/'assets/mainnet-white-paper-v1.js').read_text()
head,sep,app=s.partition('var Pd=4663n')
assert sep, 'Upstream application marker changed'
app=sep+app
replacements={
'4663n':'369n',
'https://rpc.mainnet.chain.robinhood.com':'https://rpc.pulsechain.com',
'https://robinhoodchain.blockscout.com':'https://scan.pulsechain.com',
'./mainnet-deployment.json':'./pulsechain-deployment.json',
'Robinhood Chain':'PulseChain','Robinhood endpoint':'PulseChain endpoint','ROBINHOOD CHAIN':'PULSECHAIN','robinhood':'pulsechain',
'0xe60C1F5d9bA7f62a392a78472a3Ab83DD62467A3':'0x6633aeDbB64115391238D7ce56D2DFAa2e0c7b45',
'0xc0F1A40512114b25cc1F30b5DF0bb48691405555':'0xbEEf3bB9dA340EbdF0f5bae2E85368140d7D85D0',
'0x64D1472d061a6B4a0ebE4B31Ad30f3774df219a6':'0xd5E952eA1B17034Ad3368805ed9CFB08009deA79',
'0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4':'0xb17D901469B9208B17d916112988A3FeD19b5cA1',
'0xff40c99525ffa6b6cf79ecbe370ef7c887d68f69':'0x0bB20331f424e59612668f3294A23CAa83CC06ef',
'0xd77dcda732a762ec8b04ee44a1c7370602759d2372037a5008135ab9f60305ef':'0x3D3B080A1Ec1AFc121a27AE4cBad17A14E80f7B5',
'0xc774a953079b7411f313a2d23ecacafb19682b6e':'0x5A6ed52a40983BDE815Cffe445F2175E80456F6B',
'0xd30e44aae604b42a63f6f9a8109fd0408f35b9fb':'0x8c52470a05eEB2fCe4905688Ec59bFDd32E71D07',
'feeBps:3300':'feeBps:2800','feeBps:500':'feeBps:1000',
'ETH':'PLS','cbBTC':'wBTC',
}
for old,new in replacements.items():
 assert old in app, f'Missing upstream text: {old}'
 app=app.replace(old,new)
# The wallet-add-chain helper precedes the application marker.
assert 'nativeCurrency:{name:`Ether`,symbol:`ETH`,decimals:18}' in head
head=head.replace('nativeCurrency:{name:`Ether`,symbol:`ETH`,decimals:18}', 'nativeCurrency:{name:`Pulse`,symbol:`PLS`,decimals:18}').replace(':4663:',':369:')
# Static HTML and wallet helper live before the chain constants.
for old,new in replacements.items():
 if old.startswith('0x'):head=head.replace(old,new)
head=head.replace('dexscreener.com/robinhood/','dexscreener.com/pulsechain/').replace('Robinhood mainnet token prices','PulseChain mainnet token prices')
lib,marker,template=head.partition('_d=`')
assert marker
template=template.replace('ETH','PLS').replace('cbBTC','wBTC').replace('Robinhood Chain','PulseChain')
head=lib+marker+template
head=head.replace('within the current 0.001–0.01 PLS fee limits.', 'subject to the current on-chain fee percentage and limits.')
app=app.replace('Cycles begin at 1:00 PM','Cycles begin at 4:00 PM').replace('Robinhood testnet','PulseChain mainnet')
head=head.replace('Robinhood testnet','PulseChain mainnet')
app=app.replace('within the current 0.001–0.01 PLS fee limits.', 'subject to the current on-chain fee percentage and limits.')
def patch(old,new):
 global app
 assert app.count(old)==1, f'Expected one upstream match: {old[:100]} ({app.count(old)})'
 app=app.replace(old,new,1)
patch('router:[', 'router:[`function owner() view returns(address)`,`function fuelBurnBps() view returns(uint256)`,`function moreBurnBps() view returns(uint256)`,`function pampBurnBps() view returns(uint256)`,`function setBurnShares(uint256,uint256,uint256)`,')
patch('vault:[','vault:[`function anchorDay() view returns(uint256)`,')
# Foundry ABI must be distinguished from the state object's foundry array.
patch('foundry:`event Transfer', 'foundry:`function anchorDay() view returns(uint256).event Transfer')
patch('if(Vd(t).length)', 'if(t.status!==`deployed`||Vd(t).length)')
# Verify local-date anchor and DST-aware first closes rather than fixed UTC intervals.
start=datetime(2026,9,30,13,tzinfo=ZoneInfo('America/New_York'))
deadlines={k:int((start+timedelta(days=d)).timestamp()) for k,d in [('vault8',8),('vault28',28),('vault88',88),('foundry',288)]}
checks=';for(const [key,deadline] of '+json.dumps(list(deadlines.items()))+'){const contract=Q(key,key===`foundry`?`foundry`:`vault`);if(await contract.anchorDay()!==20726n||await contract.deadline(1)!==BigInt(deadline))throw Error(`PulseChain payout schedule does not match the reviewed launch.`)}'
patch('async function gf(){','async function gf(){') # anchor existence assertion
needle='throw Error(`A configured token has an unexpected decimal count.`)}'
patch(needle,'throw Error(`A configured token has an unexpected decimal count.`)'+checks+'}')
patch('Z.block=e;void forgeSharePreview.refresh(e);let[t,n]', 'Z.block=e;void forgeSharePreview.refresh(e);await pulseReadBurnShares();let[t,n]')
patch('async function Wf(){','async function Wf(){pulseRenderBurnShares();')
# Format displayed PLS fees for readability; transaction values remain exact bigint quotes.
# Presentation precision only: swap/fee arithmetic remains in BigInt.
patch('${X(e.gross,18,10)} PLS · ${t} intervals ready','<span class="burn-amount">${X(e.gross,18,4)} PLS</span><small class="burn-intervals">${t} ${t===1n?`interval`:`intervals`} ready</small>')
patch('${X(e.callerReward,18,12)} PLS','${X(e.callerReward,18,6)} PLS')
patch('Position fee: ${_t(t)} PLS','Position fee: ${X(t,18,2)} PLS')
patch('Y(`#preview-fee`,`${_t(t)} PLS`)','Y(`#preview-fee`,`${X(t,18,2)} PLS`)')
patch('Y(`#foundry-fee`,`${_t(e)} PLS total`)','Y(`#foundry-fee`,`${X(e,18,2)} PLS total`)')
# Globals remain internal; only an explicit opt-in localhost test hook can expose them.
extra=r'''
async function pulseReadBurnShares(){
 const router=Q(`feeRouter`,`router`);
 const values=await Promise.all([router.fuelBurnBps(),router.moreBurnBps(),router.pampBurnBps()]);
 if(values.reduce((sum,value)=>sum+value,0n)!==5800n)throw Error(`Burn fee shares must total 58% of protocol fees.`);
 wf.forEach((pool,index)=>pool.feeBps=Number(values[index]));
}
function pulseRenderBurnShares(){
 const section=J(`#pulse-burn-share-settings`);if(!section)return;
 section.hidden=!qd(Z.address,Ld);
 if(!section.contains(document.activeElement))wf.forEach(pool=>section.querySelector(`[name="${pool.key}"]`).value=pool.feeBps/100);
}
const pulseShareSection=document.createElement(`section`);
pulseShareSection.id=`pulse-burn-share-settings`;pulseShareSection.className=`card`;pulseShareSection.hidden=true;
pulseShareSection.innerHTML=`<h3>Burn fee shares</h3><p>Set all three shares together. They must total 58% of protocol fees. Daily drip is a separate setting on each burn pool.</p><form id="pulse-share-form">${wf.map(pool=>`<label>${pool.token} %<input name="${pool.key}" type="number" min="0" max="58" step="0.01" required></label>`).join(``)}<p id="pulse-share-total" aria-live="polite"></p><button class="button button-outline" type="submit">Save all three shares</button></form>`;
J(`.fee-settings-grid`).append(pulseShareSection);
J(`#pulse-share-form`).addEventListener(`input`,()=>{const total=wf.reduce((sum,pool)=>sum+Number(J(`#pulse-share-form`).elements[pool.key].value),0);Y(`#pulse-share-total`,`${total.toFixed(2)}% of 58%`)});
J(`#pulse-share-form`).addEventListener(`submit`,event=>{event.preventDefault();mf(async()=>{
 if(!qd(Z.address,Ld))throw Error(`Only the owner wallet can update burn fee shares.`);
 const values=wf.map(pool=>{const raw=J(`#pulse-share-form`).elements[pool.key].value.trim();if(!/^\d+(\.\d{1,2})?$/.test(raw))throw Error(`Use at most two decimal places.`);return Math.round(Number(raw)*100)});
 if(values.some(value=>value<0||value>5800)||values.reduce((sum,value)=>sum+value,0)!==5800)throw Error(`Shares must total exactly 58%.`);
 await $(`Burn fee shares`,()=>Q(`feeRouter`,`router`,true).setBurnShares(...values));
})});
if([`localhost`,`127.0.0.1`].includes(location.hostname)&&new URLSearchParams(location.search).has(`local-test`))window.__pulseTest={Z,Q,Rf};
'''
# Must create new forms before asynchronous initialization starts; existing form bindings are safe.
patch(')),gf(),Af(),setInterval', '));'+extra+'gf(),Af(),setInterval')
(root/'assets/pulse-mainnet.js').write_text(head+app)
r=(root/'assets/forge-refresh.js').read_text().replace('./mainnet-white-paper-v1.js?v=layout-5','./pulse-mainnet.js?v=layout-5').replace('Robinhood Chain','PulseChain').replace('$ETH','$PLS').replace('$cbBTC','$wBTC').replace('./images/forge-f-isolated.png','./pulsechain-preview/forge-f-approved.png')
r=r.replace('BUILT AROUND FUEL.','A NEW CHAIN. THE SAME FORGE.').replace('◇ $PLS','<i class="pulse-pls-icon"></i> $PLS').replace('₿ $wBTC','<b class="pulse-btc-icon">₿</b> $wBTC')
r+='\n'+r'''
// The root asset base must not send tab links back to the Robinhood home page.
for(const anchor of document.querySelectorAll('a[href^="#"]'))anchor.href=location.pathname+location.search+anchor.getAttribute('href');
const paperLink=document.querySelector('.litepaper-link');if(paperLink){paperLink.textContent='White Paper ↗';paperLink.href='./Fuel_Forge_White_Paper_PulseChain_V1.0.pdf';paperLink.title='Read the Fuel Forge PulseChain White Paper';}

'''
(root/'assets/pulse-refresh.js').write_text(r)
# Give PulseChain its own base styles so Robinhood's literal green colors,
# including !important rules, cannot leak through presentation overrides.
import colorsys, re
def pulse_color(match):
    raw=match.group(1)
    if len(raw) in (3,4): raw=''.join(c*2 for c in raw)
    rgb=tuple(int(raw[i:i+2],16)/255 for i in (0,2,4))
    hue,light,saturation=colorsys.rgb_to_hls(*rgb)
    if 65 <= hue*360 <= 180:
        if light < .30:
            hue=278/360
        elif saturation > .55 and light < .85:
            hue=322/360
        else:
            hue=280/360
        rgb=colorsys.hls_to_rgb(hue,light,saturation)
        return '#'+''.join(f'{round(c*255):02x}' for c in rgb)+raw[6:]
    return match.group(0)
for source,target in [('mainnet-HhRsVR2f.css','pulse-base.css'),('forge-refresh.css','pulse-components.css')]:
    content=(root/'assets'/source).read_text()
    content=re.sub(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])',pulse_color,content)
    (root/'assets'/target).write_text('/* Generated PulseChain controls; see build-pulsechain.py. */\n'+content)
html=(root/'index.html').read_text().replace('<head>','<head>\n    <base href="../">').replace('./assets/mainnet-HhRsVR2f.css','./assets/pulse-base.css?v=pulse-theme-6').replace('./assets/forge-refresh.css?v=robinhood-polish-1','./assets/pulse-components.css?v=pulse-theme-6').replace('<title>Fuel Forge</title>','<title>Fuel Forge · PulseChain</title>').replace('./assets/forge-refresh.js?v=layout-5','./assets/pulse-refresh.js?v=layout-5').replace('    <link rel="stylesheet" href="./assets/robinhood-polish.css?v=3">','').replace('</head>','<link rel="stylesheet" href="./assets/pulsechain-live.css?v=hero-align-1">\n  </head>')
(root/'pulsechain/index.html').write_text(html)
manifest=root/'pulsechain-deployment.json'
if not manifest.exists():manifest.write_text(json.dumps({'status':'pending','chainId':369,'owner':'0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9','development':'0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9','deploymentBlock':None,'launchTime':1790798400,'contracts':{}},indent=2)+'\n')
print('Built separate PulseChain wallet entry; deployment manifest remains locked.')
