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
  if (!['build', 'pools', 'rewards', 'nfts', 'burns'].includes(name)) name = 'build';
  $$('[data-tab]').forEach(button => { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  $$('[role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== `panel-${name}`; });
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
  const p = Math.min(DEMO_BALANCE, val('#principal'));
  if (val('#principal') > p) $('#principal').value = p;
  const maxBurn = Math.max(0, Math.min(p * 3, DEMO_BALANCE - p));
  if (val('#burn') > maxBurn) $('#burn').value = maxBurn;
}
const detailBlock = document.createElement('section');
detailBlock.className = 'position-details';
detailBlock.innerHTML = '<h4>Position details</h4>';
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
  const total=rows.reduce((sum,p)=>sum+p.payout*Math.floor(term/p.days),0);
  scenario.innerHTML=`<h4>Estimated rewards over your ${fmt(term)}-day term</h4><p>If the sample funding per cycle and your share stayed the same</p><div class="term-columns">${rows.map(p=>`<div><b>${p.days} Day</b><small>${Math.floor(term/p.days)} complete cycles</small><strong>≈ ${fmt(p.payout*Math.floor(term/p.days),6)} ETH</strong><small>≈ $${fmt(p.payout*Math.floor(term/p.days)*sampleEthUsd)} USD</small></div>`).join('')}</div><div class="term-total"><span>Illustrative total rewards</span><strong>≈ ${fmt(total,6)} ETH</strong><small>≈ $${fmt(total*sampleEthUsd)} USD</small></div><p>Sample data only. Assumes the same funding and share for every future cycle; actual deadlines can change the cycle count. No compounding. Before entry fees and gas. This is a scenario, not a forecast.</p>`;
}
function updatePreview() {
  const { principal, burn, term } = formValues();
  $$('[data-term]').forEach(button => button.classList.toggle('active', Number(button.dataset.term) === term));
  if (mode === 'foundry') {
    const quantity = Math.max(1, Math.min(10, Math.floor(val('#quantity'))));
    $('#power-ring').style.setProperty('--power-angle', '288deg');
    $('#power-multiplier').textContent = String(quantity);
    $('#power-caption').textContent = quantity === 1 ? 'Foundry NFT' : 'Foundry NFTs';
    $('#power-total').textContent = '288-day wBTC reward cycle';
    $('#power-limit').textContent = 'Equal shares within the same mint cycle';
    $('#demo-share').textContent = `${(100*quantity/(12+quantity)).toFixed(2)}%`;
    $('.power-card').append(detailBlock);
    $('.builder-grid').classList.remove('wide-forge-layout');
    updateEstimates(quantity/(12+quantity),288,true);
    $('#preview-principal').textContent = 'No principal locked';
    $('#preview-duration').textContent = '288-day cycle';
    $('#preview-burn').textContent = `${fmt(quantity * 100000000)} FUEL`;
    $('#foundry-burn').textContent = `${fmt(quantity * 100000000)} FUEL`;
    const labels = $$('.preview-breakdown dt');
    labels[1].lastChild.textContent = 'Reward cycle'; labels[2].lastChild.textContent = 'Permanent burn';
    $('#timeline-note').textContent = 'The FUEL burn is permanent. A Foundry NFT participates in its mint cycle, and unclaimed rewards follow the NFT when transferred.';
    return;
  }
  scenario.append(detailBlock);
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
  showModal('Your Forge position', `${fmt(principal)} FUEL locked for ${fmt(term)} days.\n${fmt(burn)} extra FUEL permanently burned.\n\nThis is a design preview. Ethereum fees, limits, token contracts and routes are pending. This example uses the existing Forge power mechanics for design purposes. No wallet request has been made.`);
});
function setMode(next) {
  mode = next;
  $('#forge-form').hidden = mode !== 'forge'; $('#foundry-form').hidden = mode !== 'foundry';
  $('#forge-mode').setAttribute('aria-pressed', String(mode === 'forge')); $('#foundry-mode').setAttribute('aria-pressed', String(mode === 'foundry'));
  updatePreview();
}
$('#forge-mode').addEventListener('click', () => setMode('forge'));
$('#foundry-mode').addEventListener('click', () => setMode('foundry'));
$('#quantity').addEventListener('input', () => { cleanInput($('#quantity'), true); if (val('#quantity') > 10) $('#quantity').value = '10'; updatePreview(); });
$('#quantity').addEventListener('blur', () => { $('#quantity').value = Math.max(1, Math.min(10, Math.floor(val('#quantity')))); updatePreview(); });
$('#quantity-max').addEventListener('click', () => { $('#quantity').value = '10'; updatePreview(); });
$('#foundry-form').addEventListener('submit', event => { event.preventDefault(); const n = Math.max(1, Math.min(10, Math.floor(val('#quantity')))); $('#quantity').value = n; updatePreview(); showModal('Your Foundry mint', `${n} ${n === 1 ? 'NFT' : 'NFTs'} · ${fmt(n * 100000000)} FUEL permanently burned.\n\nThis is a sample of the Foundry flow. Ethereum mint fees, burn requirements and swap routes are pending. This is an illustration of the existing Foundry flow. No transaction has been submitted.`); });
$('#wallet-button').addEventListener('click', () => {
  walletVisible = !walletVisible;
  $('#wallet-label').textContent = walletVisible ? 'Demo wallet' : 'Show demo wallet';
  $('#wallet-fuel').innerHTML = walletVisible ? '1,200,000,000 <small>FUEL</small>' : '— <small>FUEL</small>';
  $('#wallet-pls').innerHTML = walletVisible ? '2.5 <small>ETH</small>' : '— <small>ETH</small>';
  notify(walletVisible ? 'Showing sample balances. No real wallet is connected.' : 'Sample balances hidden. The form still uses demo FUEL for exploration.');
});
const pools = [
  {days:8, name:'ETH reward pool', balance:.84, unit:'ETH', elapsed:62, left:'3d 1h left', share:1.25},
  {days:28, name:'ETH reward pool', balance:1.2, unit:'ETH', elapsed:43, left:'15d 23h left', share:.84},
  {days:88, name:'ETH reward pool', balance:2.4, unit:'ETH', elapsed:26, left:'65d 3h left', share:.62},
  {days:288, name:'Foundry reward pool', balance:.032, unit:'wBTC', elapsed:18, left:'236d 4h left', share:.8}
];
$('#pool-grid').innerHTML = pools.map(p => `<article class="card pool-card"><div class="pool-top"><span class="pool-number"><b>${p.days}</b> DAY</span><span class="sample-pill">SAMPLE CYCLE</span></div><div class="pool-amount">${fmt(p.balance, 8)}<small>${p.unit}</small></div><h3>${p.name}</h3><div class="progress-label"><span>${p.elapsed}% of cycle elapsed</span><b>${p.left}</b></div><div class="progress-track" role="progressbar" aria-label="${p.days}-day sample cycle" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.elapsed}"><span style="width:${p.elapsed}%"></span></div><div class="pool-detail"><div><span>Your estimated share</span><strong>${p.share}%</strong></div><div><span>Estimated payout</span><strong>${fmt(p.balance * .9975 * p.share / 100, p.unit === 'ETH' ? 6 : 8)} ${p.unit}</strong></div></div></article>`).join('');
const burns = [
  {symbol:'FUEL',image:'fuel-token.jpg',share:28,drip:1,balance:.28,total:82400000},
  {symbol:'MORE',image:'more-token.jpg',share:20,drip:1,balance:.20,total:18920000},
  {symbol:'PAMP',image:'pamp-token.jpg',share:10,drip:1,balance:.10,total:3840000}
];
$('#burn-grid').innerHTML = burns.map(b => {
  const next = b.balance * b.drip / 100 / 144;
  return `<article class="card burn-card"><div class="burn-heading"><img src="../images/${b.image}" alt="${b.symbol} reference artwork"><div><h3>${b.symbol}</h3></div></div><div class="burn-settings"><span class="burn-share"><strong>${b.share}%</strong> of protocol fees</span><span class="burn-drip"><strong>${b.drip}%</strong> daily drip</span></div><div class="burn-balance"><span>Burn pool balance</span><strong>${fmt(b.balance)}</strong><small>ETH</small></div><div class="burn-row"><span>Next burn</span><strong>${fmt(next, 8)} ETH<small>1 sample interval ready</small></strong></div><div class="burn-row"><span>Caller reward · 1.5%</span><strong class="accent">${fmt(next * .015, 10)} ETH</strong></div><div class="burn-row"><span>Next interval</span><strong class="accent">Ready to burn</strong></div><div class="burn-row"><span>Total ${b.symbol} burned</span><strong>${fmt(b.total)}<small>${b.symbol}</small></strong></div><button class="primary-button" data-dialog="${b.symbol} burn preview|This sample shows a ${fmt(next, 8)} ETH execution and a ${fmt(next * .015, 10)} ETH caller reward. No swap, burn, or wallet transaction will occur.">Preview burn <span>↗</span></button></article>`;
}).join('');
function drawPositions(ended = false) {
  const items = ended ? [
    {id:'0003',status:'Ended',principal:'0 FUEL',power:'0',elapsed:100,label:'Position closed',remaining:'Principal returned',decay:100,decayLabel:'Closed during grace',decayRight:'No decay applied'}
  ] : [
    {id:'0042',status:'Active',principal:'100,000,000 FUEL',power:'300,000,000',elapsed:32,label:'Maturity',remaining:'680 days remaining',decay:0,decayLabel:'Grace & decay',decayRight:'Starts after maturity'},
    {id:'0017',status:'Grace period',principal:'50,000,000 FUEL',power:'51,008,065',elapsed:100,label:'Maturity reached',remaining:'4 days of grace left',decay:0,decayLabel:'Principal decay',decayRight:'Not started'},
    {id:'0009',status:'Decaying',principal:'20,000,000 FUEL',power:'20,000,000',elapsed:100,label:'Maturity reached',remaining:'Grace period ended',decay:50,decayLabel:'Principal decay',decayRight:'50% of principal remains'}
  ];
  $('#position-list').innerHTML = items.map(p => `<article class="position-item"><div class="position-top"><strong>Forge NFT #${p.id}</strong><span class="status">${p.status}</span></div><div class="position-values"><div><span>Principal now</span><strong>${p.principal}</strong></div><div><span>Power now</span><strong>${p.power}</strong></div></div><div class="progress-label"><span>${p.label}</span><b>${p.remaining}</b></div><div class="progress-track"><span style="width:${p.elapsed}%"></span></div><div class="progress-label"><span>${p.decayLabel}</span><b>${p.decayRight}</b></div><div class="progress-track decay"><span style="width:${p.decay}%"></span></div></article>`).join('');
  $('#active-filter').setAttribute('aria-pressed', String(!ended)); $('#ended-filter').setAttribute('aria-pressed', String(ended));
}
$('#active-filter').addEventListener('click', () => drawPositions(false));
$('#ended-filter').addEventListener('click', () => drawPositions(true));
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => { const [title, body] = button.dataset.dialog.split('|'); showModal(title, body); }));
drawPositions(); updatePreview(); switchTab(location.hash.slice(1), false);

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
