'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const fmt = (n, places = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: places }).format(n);
const DEMO_BALANCE = 1200000000;
let mode = 'forge';
let walletVisible = true;
let toastTimer;
const modal = $('#preview-dialog');
function showModal(title, body) {
  $('#dialog-title').textContent = title;
  $('#dialog-body').textContent = body;
  if (!modal.open) modal.showModal();
}
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast span').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}
$('.toast button').addEventListener('click', () => { $('#toast').hidden = true; clearTimeout(toastTimer); });
$$('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => modal.close()));
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
function switchTab(name, updateHash = true) {
  if (name === 'nfts') name = 'rewards';
  if (!['build', 'pools', 'rewards', 'burns'].includes(name)) name = 'build';
  $$('[data-tab]').forEach(button => { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  $$('[id^="panel-"][role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== `panel-${name}`; });
  $$('.chain-options a').forEach(link => { const url = new URL(link.getAttribute('href'), location.href); url.hash = name === 'build' ? 'start' : name; link.href = url.href; });
  $('.hero').hidden = name !== 'build';
  $('.wallet-strip').hidden = name !== 'build';
  if (updateHash) window.scrollTo({top:0, behavior:'instant'});
  if (updateHash && location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
}
$$('[data-tab]').forEach(button => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
  button.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const buttons = $$('[data-tab]');
    const i = buttons.indexOf(button);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    switchTab(buttons[index].dataset.tab); buttons[index].focus();
  });
});
window.addEventListener('hashchange', () => switchTab(location.hash.slice(1), false));
$('.hero-link').addEventListener('click', () => { switchTab('build'); setTimeout(() => $('#panel-build').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'}), 0); });
$('.brand').addEventListener('click', () => switchTab('build'));
function val(id) { return Math.max(0, Number($(id).value) || 0); }
function cleanInput(input, integer = false) {
  const raw = input.value.replace(/,/g, '').replace(integer ? /[^0-9]/g : /[^0-9.]/g, '');
  const parts = raw.split('.');
  input.value = integer ? raw : parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 6) : '');
}
function formValues() {
  return { principal: val('#principal'), burn: val('#burn'), term: Math.max(8, Math.min(1000, Math.floor(val('#term')))) };
}
function clampFuel() {
  const maxBurn = val('#principal') * 3;
  if (val('#burn') > maxBurn) $('#burn').value = maxBurn;
}
const detailBlock = document.createElement('section');
detailBlock.className = 'position-details';
detailBlock.innerHTML = '';
detailBlock.append($('.preview-breakdown'),$('.timeline-note'));
$('.power-card').append(detailBlock);
const payoutRows = document.createElement('div');
payoutRows.className = 'estimate-rows';
$('.demo-share strong').after(payoutRows);
const scenario = document.createElement('section');
scenario.className = 'card term-scenario';
$('.builder-grid').insertBefore(scenario,$('.power-card'));
$('.builder-grid').classList.add('wide-forge-layout');
function updateEstimates(share, term, foundry = false) {
  const sampleEthUsd = 2700, sampleBtcUsd = 83000;
  const balances = foundry ? [{days:288,balance:.032,unit:'wBTC',usd:sampleBtcUsd}] : [{days:8,balance:.84,unit:'ETH',usd:sampleEthUsd},{days:28,balance:1.2,unit:'ETH',usd:sampleEthUsd},{days:88,balance:2.4,unit:'ETH',usd:sampleEthUsd}];
  const rows = balances.map(p=>({...p,payout:p.balance*.9975*share}));
  payoutRows.innerHTML=rows.map(p=>`<div><b>${p.days} Day</b><div><strong>≈ ${fmt(p.payout,p.unit==='ETH'?6:8)} ${p.unit}</strong><small>≈ $${fmt(p.payout*p.usd)} USD</small></div></div>`).join('');
  $('.demo-share>p').textContent=foundry?'Sample cycle has 12 existing NFTs. Share includes your selected quantity. Uses sample funding after the 0.25% settlement incentive, excluding your mint funding. Future mints change the share. Each NFT earns in its mint cycle only.':'Uses sample existing power and sample pool funding after the 0.25% settlement incentive. Actual shares use power at each deadline and change as positions enter, end or decay. Your position must remain eligible. USD uses illustrative prices, not live quotes.';
  scenario.hidden=foundry;
  const total=rows.reduce((sum,p)=>sum+p.payout*Math.floor(term/p.days)*p.usd,0);
  scenario.innerHTML=`<h4 class="details-title">Position details</h4><div class="scenario-estimate"><h4>Estimated rewards over your ${fmt(term)}-day term</h4><p>If the sample funding per cycle and your share stayed the same</p><div class="term-columns">${rows.map(p=>`<div><b>${p.days} Day</b><small>${Math.floor(term/p.days)} complete cycles</small><strong>≈ ${fmt(p.payout*Math.floor(term/p.days),p.unit==='ETH'?6:8)} ${p.unit}</strong><small>≈ $${fmt(p.payout*Math.floor(term/p.days)*p.usd)} USD</small></div>`).join('')}</div><div class="term-total"><span>Illustrative total rewards</span><strong>≈ $${fmt(total)} USD</strong></div><p>Sample data only. Assumes the same funding and share for every future cycle; actual deadlines can change the cycle count. No compounding. Before entry fees and gas. This is a scenario, not a forecast.</p></div>`;
}
function updatePreview() {
  const { principal, burn, term } = formValues();
  $$('[data-term]').forEach(button => button.classList.toggle('active', Number(button.dataset.term) === term));
  $('.builder-grid').classList.add('wide-forge-layout');
  const durationBonus = principal * (term - 8) / 992;
  const power = principal + durationBonus + burn;
  const multiplier = principal > 0 ? power / principal : 0;
  $('#power-ring').style.setProperty('--power-angle', `${Math.max(0, Math.min(5, multiplier)) / 5 * 360}deg`);
  $('#power-multiplier').innerHTML = `${multiplier.toFixed(2)}<span>×</span>`;
  $('#power-caption').textContent = 'initial power';
  $('#power-total').textContent = `${fmt(power, 0)} power`;
  $('#power-limit').textContent = 'Up to 5× your principal';
  $('#demo-share').textContent = `${(100 * power / (450000000 + power)).toFixed(2)}%`;
  updateEstimates(power/(450000000+power),term);
  scenario.append(detailBlock);
  $('#preview-principal').textContent = `${fmt(principal)} FUEL`;
  $('#preview-duration').textContent = `${fmt(term)} days`;
  $('#preview-burn').textContent = `${fmt(burn)} FUEL`;
  const labels = $$('.preview-breakdown dt');
  labels[1].lastChild.textContent = 'Term / maturity'; labels[2].lastChild.textContent = 'FUEL burned for extra power';
  $('#timeline-note').textContent = `${fmt(term)}-day term. After maturity, a 7-day grace period comes before 7 days of principal decay.`;
}
['#principal', '#burn'].forEach(id => {
  $(id).addEventListener('input', () => { cleanInput($(id)); clampFuel(); updatePreview(); });
  $(id).addEventListener('blur', () => { if (!$(id).value || $(id).value === '.') $(id).value = '0'; clampFuel(); updatePreview(); });
});
$('#term').addEventListener('input', () => { cleanInput($('#term'), true); if (val('#term') > 1000) $('#term').value = '1000'; updatePreview(); });
$('#term').addEventListener('blur', () => { $('#term').value = formValues().term; updatePreview(); });
$$('[data-max]').forEach(button => button.addEventListener('click', () => {
  const { principal, burn } = formValues();
  if (button.dataset.max === 'principal') $('#principal').value = Math.max(0, DEMO_BALANCE - burn);
  if (button.dataset.max === 'burn') $('#burn').value = Math.max(0, Math.min(principal * 3, DEMO_BALANCE - principal));
  if (button.dataset.max === 'term') $('#term').value = '1000';
  clampFuel(); updatePreview();
}));
$$('[data-term]').forEach(button => button.addEventListener('click', () => { $('#term').value = button.dataset.term; updatePreview(); }));
$('#forge-form').addEventListener('submit', event => {
  event.preventDefault(); clampFuel(); $('#term').value = formValues().term; updatePreview();
  const { principal, burn, term } = formValues();
  if (principal <= 0) { notify('Enter some principal FUEL to preview a position.'); $('#principal').focus(); return; }
  showModal('Your Forge position', `${fmt(principal)} FUEL locked for ${fmt(term)} days.\n${fmt(burn)} extra FUEL permanently burned.\n\nThis is a design preview. The entry fee is 100% of the quoted principal value, with no minimum or maximum. Regular stakes earn ETH rewards. WBTC requires a separate Foundry NFT. This example uses the existing Forge power mechanics for design purposes. No wallet request has been made.`);
});
$('#wallet-button').addEventListener('click', () => {
  walletVisible = !walletVisible;
  $('#wallet-address').textContent = walletVisible ? 'Demo wallet' : 'Not connected';
  $('#wallet-btc').textContent = walletVisible ? '0.0024' : '—';
  $('#wallet-label').textContent = walletVisible ? 'Demo wallet' : 'Show demo wallet';
  $('#wallet-fuel').innerHTML = walletVisible ? '1,200,000,000 <small>FUEL</small>' : '— <small>FUEL</small>';
  $('#wallet-pls').innerHTML = walletVisible ? '2.5 <small>ETH</small>' : '— <small>ETH</small>';
  notify(walletVisible ? 'Showing sample balances. No real wallet is connected.' : 'Sample balances hidden. The form still uses demo FUEL for exploration.');
});
const pools = [
  {days:8, name:'ETH reward pool', balance:.84, unit:'ETH', elapsed:62, left:'3d 1h left', share:1.25},
  {days:28, name:'ETH reward pool', balance:1.2, unit:'ETH', elapsed:43, left:'15d 23h left', share:.84},
  {days:88, name:'ETH reward pool', balance:2.4, unit:'ETH', elapsed:26, left:'65d 3h left', share:.62},
  {days:288, name:'Foundry WBTC reward pool', balance:.032, unit:'wBTC', elapsed:18, left:'236d 4h left', share:100/13}
];
$('#pool-grid').innerHTML = pools.map(p => {
  const rate=p.unit==='ETH'?2700:83000, payout=p.balance*.9975*p.share/100;
  return `<article class="card pool-card"><div class="pool-top"><span>CYCLE 1</span><span class="pool-live">PREVIEW · ETHEREUM</span></div><h3>${p.days}-Day ${p.unit==='ETH'?'Pool':'Foundry WBTC Pool'}</h3><div class="pool-value">${fmt(p.balance,8)} <small>${p.unit}</small></div><div class="pool-usd">≈ $${fmt(p.balance*rate,2)} USD reference</div><div class="pool-row"><span>Closes</span><strong>${p.left}</strong></div><div class="pool-row"><span>Your estimated share</span><strong>${p.share.toFixed(2)}%</strong></div><div class="pool-row"><span>Estimated payout</span><strong>${fmt(payout,p.unit==='ETH'?6:8)} ${p.unit}<small>≈ $${fmt(payout*rate,2)} USD reference</small></strong></div><div class="progress-track" role="progressbar" aria-label="${p.days}-day sample cycle" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.elapsed}"><span style="width:${p.elapsed}%"></span></div><div class="pool-foot">${p.elapsed.toFixed(2)}% of cycle elapsed · estimate updates when refreshed</div></article>`;
}).join('');
const burns = [
  {symbol:'FUEL',image:'fuel-token.jpg',share:15,drip:1,balance:.28,total:82400000},
  {symbol:'MORE',image:'more-token.jpg',share:10,drip:1,balance:.20,total:18920000}
];
$('#burn-grid').innerHTML = burns.map(b => {
  const next = b.balance * b.drip / 100 / 144;
  return `<article class="card burn-card"><div class="burn-card-top"><img class="burn-emblem" src="../images/${b.image}" alt="${b.symbol} logo"><div class="burn-card-heading"><p class="eyebrow">${b.symbol} BURN POOL</p><h3>${b.symbol} Buy &amp; Burn</h3></div></div><div class="burn-settings"><span><strong>${b.share}%</strong> of protocol fees</span><span><strong>${b.drip}%</strong> daily drip</span></div><div class="burn-metrics"><div><span>Burn Pool Balance</span><strong>${fmt(b.balance,6)} ETH<small>≈ $${fmt(b.balance*2700)} USD reference</small></strong></div><div><span>Next burn</span><strong>${fmt(next,8)} ETH<small>1 interval ready</small><small>≈ $${fmt(next*2700)} USD reference</small></strong></div><div><span>Caller reward (1.5%)</span><strong>${fmt(next*.015,10)} ETH<small>≈ $${fmt(next*.015*2700)} USD reference</small></strong></div><div><span>Next interval</span><strong class="burn-ready">Ready to burn</strong></div><div><span>Total ${b.symbol} burned</span><strong>${fmt(b.total)} ${b.symbol}</strong></div></div><div class="burn-card-actions"><button class="primary-button" data-dialog="${b.symbol} burn preview|This sample shows a ${fmt(next,8)} ETH execution and a ${fmt(next*.015,10)} ETH caller reward. No swap, burn, or wallet transaction will occur.">Preview burn</button><span>Sample pool</span></div></article>`;
}).join('');
function drawPositions(ended = false) {
  const items = ended ? [
    {id:'0003',status:'Ended',principal:'0 FUEL',power:'0',elapsed:100,label:'Position closed',remaining:'Principal returned',decay:100,decayLabel:'Closed during grace',decayRight:'No decay applied'}
  ] : [
    {id:'0042',status:'Active',principal:'100,000,000 FUEL',power:'300,000,000',elapsed:32,label:'Maturity',remaining:'680 days remaining',decay:0,decayLabel:'Grace & decay',decayRight:'Starts after maturity'},
    {id:'0017',status:'Grace period',principal:'50,000,000 FUEL',power:'51,008,065',elapsed:100,label:'Maturity reached',remaining:'4 days of grace left',decay:0,decayLabel:'Principal decay',decayRight:'Not started'},
    {id:'0009',status:'Decaying',principal:'20,000,000 FUEL',power:'20,000,000',elapsed:100,label:'Maturity reached',remaining:'Grace period ended',decay:50,decayLabel:'Principal decay',decayRight:'50% of principal remains'}
  ];
  const markup = items.map(p => { const phase=p.status==='Ended'?'ended':p.status==='Decaying'?'decay':p.status==='Grace period'?'grace':'active'; const progress=phase==='decay'?p.decay:p.elapsed; return `<details class="position-item compact-stake" data-phase="${phase}"><summary><div class="position-top"><strong>#${p.id} · ${p.principal}</strong><span class="status">${p.status}</span></div><div class="progress-track"><span style="width:${progress}%"></span></div><div class="progress-label"><span>${p.remaining}</span><b>${progress.toFixed(2)}%</b></div><span class="stake-hint">${phase==='ended'?'Expand for details or transfer stake':'Expand for details, end or transfer stake'}</span></summary><div class="stake-details"><div class="position-values"><div><span>Power now</span><strong>${p.power}</strong></div><div><span>Phase</span><strong>${p.status}</strong></div></div><p>${p.decayRight}</p><div class="claim-actions"><button ${phase==='active'||p.status==='Ended'?'disabled':''} data-stake-action="End stake">${phase==='active'?'Locked until maturity':'End stake'}</button><button data-stake-action="Transfer stake">Transfer stake</button></div></div></details>`; }).join('');
  $('#reward-positions').innerHTML = markup;
  $$('[data-stake-action]').forEach(b=>b.addEventListener('click',()=>showModal(b.dataset.stakeAction,'Preview only. No wallet transaction will be submitted.')));
  $('#active-filter').setAttribute('aria-pressed', String(!ended)); $('#ended-filter').setAttribute('aria-pressed', String(ended));
}
$('#active-filter').addEventListener('click', () => drawPositions(false));
$('#ended-filter').addEventListener('click', () => drawPositions(true));
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => { const [title, body] = button.dataset.dialog.split('|'); showModal(title, body); }));
drawPositions(false); updatePreview(); switchTab(location.hash.slice(1), false);

// Upright ticker badges follow a tilted ellipse around the approved stationary F.
const orbitArt = $('.hero-art');
if (CSS.supports('offset-path', 'path("M 0 0 L 1 1")')) {
  orbitArt.classList.add('orbit-motion');
  function sizeOrbit() {
    const width = orbitArt.clientWidth, height = orbitArt.clientHeight;
    if (!width || !height) return;
    const c = Math.cos(-25 * Math.PI / 180), s = Math.sin(-25 * Math.PI / 180);
    const radius = Math.max(0, Math.min((width - 110) / (2 * Math.hypot(c, .55*s)), (height - 76) / (2 * Math.hypot(s, .55*c))));
    const points = Array.from({length:97}, (_, i) => {
      const a = i / 96 * Math.PI * 2, x = radius*Math.cos(a), y = radius*.55*Math.sin(a);
      return `${i ? 'L' : 'M'} ${width/2+x*c-y*s} ${height/2+x*s+y*c}`;
    });
    orbitArt.style.setProperty('--orbit-diameter', `${radius * 2}px`);
    orbitArt.style.setProperty('--ticker-path', `path("${points.join(' ')} Z")`);
  }
  new ResizeObserver(sizeOrbit).observe(orbitArt);
  sizeOrbit();
}

const chainMenu = $('.chain-menu');
document.addEventListener('click', event => { if (!chainMenu.contains(event.target)) chainMenu.open = false; });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && chainMenu.open) { chainMenu.open = false; chainMenu.querySelector('summary').focus(); } });

function updateFoundryPreview() {
  const count=Math.max(1,Math.min(32,Math.floor(Number($('#foundry-count').value)||1)));
  const fee=count*.05, share=count/(12+count), pool=.032+fee*.99*2700/83000, reward=pool*.9975*share;
  $('#foundry-burn').textContent=`${fmt(count*100000000,0)} FUEL`;
  $('#foundry-fee').textContent=`${fmt(fee,6)} ETH · ≈ $${fmt(fee*2700)} USD reference`;
  $('#foundry-share').textContent=`${fmt(share*100)}% · ${count} of ${12+count} NFTs`;
  $('#foundry-reward').textContent=`${fmt(reward,8)} WBTC · ≈ $${fmt(reward*83000)} USD reference`;
}
$('#foundry-count').addEventListener('input',()=>{cleanInput($('#foundry-count'),true);updateFoundryPreview();});
$('#foundry-count').addEventListener('blur',()=>{ $('#foundry-count').value=Math.max(1,Math.min(32,Math.floor(Number($('#foundry-count').value)||1)));updateFoundryPreview();});
$('#foundry-form').addEventListener('submit',event=>{event.preventDefault();updateFoundryPreview();showModal('Foundry mint preview',`${$('#foundry-burn').textContent} permanently burned.\n${$('#foundry-fee').textContent} (illustrative fee).\n\nEach Foundry NFT earns an equal WBTC share in its mint cycle only. 99% of its ETH mint fee buys WBTC and 1% goes to development. This is sample data, not a quote; no wallet request is made.`);});
updateFoundryPreview();

function switchBuildProduct(product) {
  mode=product==='foundry'?'foundry':'forge';
  $('#forge-build').hidden=mode!=='forge';
  $('#foundry-mint').hidden=mode!=='foundry';
  $$('[data-build-product]').forEach(button=>{const selected=button.dataset.buildProduct===mode;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
}
$$('[data-build-product]').forEach(button=>{
  button.addEventListener('click',()=>switchBuildProduct(button.dataset.buildProduct));
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const buttons=$$('[data-build-product]');
    const selected=event.key==='Home'?buttons[0]:event.key==='End'?buttons[1]:buttons[button===buttons[0]?1:0];
    switchBuildProduct(selected.dataset.buildProduct);selected.focus();
  });
});
switchBuildProduct(new URLSearchParams(location.search).get('product'));
