'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const fmt = (n, places = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: places }).format(n);
let DEMO_BALANCE = 0;
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
function updateEstimates(share, term) {
 payoutRows.innerHTML=''; scenario.innerHTML='<h4 class="details-title">Position details</h4>';
 if(window.ethereumRenderEstimate) window.ethereumRenderEstimate(term, payoutRows, scenario);
 else { $('#demo-share').textContent='—'; $('.demo-share>p').textContent='Loading live cycle data…'; }
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
  $(id).addEventListener('input', () => { cleanInput($(id)); clampFuel(); updatePreview(); window.ethereumQuote?.(); });
  $(id).addEventListener('blur', () => { if (!$(id).value || $(id).value === '.') $(id).value = '0'; clampFuel(); updatePreview(); window.ethereumQuote?.(); });
});
$('#term').addEventListener('input', () => { cleanInput($('#term'), true); if (val('#term') > 1000) $('#term').value = '1000'; updatePreview(); });
$('#term').addEventListener('blur', () => { $('#term').value = formValues().term; updatePreview(); });
$$('[data-max]').forEach(button => button.addEventListener('click', () => {
  const { principal, burn } = formValues();
  if (button.dataset.max === 'principal') $('#principal').value = Math.max(0, DEMO_BALANCE - burn);
  if (button.dataset.max === 'burn') $('#burn').value = Math.max(0, Math.min(principal * 3, DEMO_BALANCE - principal));
  if (button.dataset.max === 'term') $('#term').value = '1000';
  clampFuel(); updatePreview(); window.ethereumQuote?.();
}));
$$('[data-term]').forEach(button => button.addEventListener('click', () => { $('#term').value = button.dataset.term; updatePreview(); }));
$('#active-filter').addEventListener('click',()=>window.ethereumDrawPositions?.(false));
$('#ended-filter').addEventListener('click',()=>window.ethereumDrawPositions?.(true));
updatePreview(); switchTab(location.hash.slice(1),false);
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

function updateFoundryPreview() { window.ethereumQuote?.(); }
$('#foundry-count').addEventListener('input',()=>{cleanInput($('#foundry-count'),true);updateFoundryPreview();});
$('#foundry-count').addEventListener('blur',()=>{ $('#foundry-count').value=Math.max(1,Math.min(32,Math.floor(Number($('#foundry-count').value)||1)));updateFoundryPreview();});
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
