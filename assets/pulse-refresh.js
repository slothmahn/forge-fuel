import {integrateRewardNfts} from './rewards-nfts.js?v=reward-nfts-128';
import './chain-navigation.js?v=chain-switch-132';
// Presentation-only entry. The deployed application's wallet, reads, and transactions
// remain in the existing, unchanged module below.
import './pulse-mainnet.js?v=whitepapers-133';
// Some mobile browsers apply a saved position or URL fragment after load.
// Hold the initial view at the top until the visitor interacts, then release control.
let initialScrollGuard = true;
function releaseInitialScrollGuard() {
  initialScrollGuard = false;
  window.removeEventListener('scroll', keepInitialViewAtTop);
}
function keepInitialViewAtTop() {
  if (initialScrollGuard && window.scrollY > 0) window.scrollTo(0, 0);
}
for (const eventName of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
  window.addEventListener(eventName, releaseInitialScrollGuard, { once: true, passive: true });
}
window.addEventListener('scroll', keepInitialViewAtTop, { passive: true });
window.addEventListener('pageshow', keepInitialViewAtTop);
window.addEventListener('load', () => requestAnimationFrame(keepInitialViewAtTop), { once: true });
keepInitialViewAtTop();
window.setTimeout(releaseInitialScrollGuard, 4000);
const app = document.querySelector('#app');
if (app) {
  app.classList.add('forge-refresh');
  const nav = app.querySelector('.site-tabs');
  const startAnchor = app.querySelector('#start');
  if (startAnchor) {
    startAnchor.id = 'wallet-start';
    app.insertAdjacentHTML('afterbegin', '<span id="start" aria-hidden="true" style="display:block;height:0"></span>');
  }
  const hero = document.createElement('section');
  hero.className = 'ff-hero';
  hero.setAttribute('aria-labelledby', 'ff-hero-title');
  hero.innerHTML = `<div class="ff-hero-copy"><h1 id="ff-hero-title">Put your $FUEL<br><em>to work.</em></h1><p>Forge a position. Follow $PLS and $wBTC reward pools.<br>Keep the fire burning.</p><a class="ff-explore" href="#start">Explore the Forge <span aria-hidden="true">↗</span></a></div><div class="ff-art" aria-hidden="true"><div class="ff-atmosphere"><div class="ff-orbit"></div><div class="ff-orbit ff-orbit-two"></div><div class="ff-orbit ff-orbit-three"></div><div class="ff-glow"></div></div><img src="./pulsechain-preview/forge-f-approved.png" alt="" width="420" height="480"><span class="ff-token ff-eth"><img class="orbit-token-logo" src="./moreforge/assets/pulsechain-token.svg" alt="PLS"> $PLS</span><span class="ff-token ff-btc"><img class="orbit-token-logo" src="./assets/token-logos/wbtc.png" alt="wBTC"> $wBTC</span><span class="ff-caption">A NEW CHAIN. THE SAME FORGE.</span></div>`;
  nav.after(hero);
  // Both badges follow the same tilted ellipse, half a lap apart, without rotating their text.
  const orbitArt = hero.querySelector('.ff-art');
  if (CSS.supports('offset-path', 'path("M 0 0 L 1 1")')) {
    orbitArt.classList.add('ff-ticker-motion');
    const badges = [...orbitArt.querySelectorAll('.ff-token')];
    function sizeTickerOrbit() {
      const width = orbitArt.clientWidth, height = orbitArt.clientHeight;
      const badgeWidth = Math.max(...badges.map(badge => badge.offsetWidth));
      const badgeHeight = Math.max(...badges.map(badge => badge.offsetHeight));
      const tilt = -25 * Math.PI / 180, squash = .55;
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const radius = Math.max(0, Math.min(
        (width - badgeWidth - 16) / (2 * Math.hypot(c, squash * s)),
        (height - badgeHeight - 42) / (2 * Math.hypot(s, squash * c))
      ));
      const points = Array.from({length: 97}, (_, i) => {
        const angle = i / 96 * Math.PI * 2;
        const x = radius * Math.cos(angle), y = radius * squash * Math.sin(angle);
        return `${i ? 'L' : 'M'} ${(width / 2 + x*c - y*s).toFixed(2)} ${(height / 2 + x*s + y*c).toFixed(2)}`;
      });
      orbitArt.style.setProperty('--ff-ticker-path', `path("${points.join(' ')} Z")`);
      orbitArt.style.setProperty('--ff-ticker-diameter', `${radius * 2}px`);
    }
    new ResizeObserver(sizeTickerOrbit).observe(orbitArt);
    sizeTickerOrbit();
  }
  const wallet = app.querySelector('.wallet-section');
  if (wallet) {
    wallet.removeAttribute('data-view');
    hero.after(wallet);
  }
  const ribbon = app.querySelector('.price-ribbon');
  if (ribbon) { nav.before(ribbon); ribbon.hidden = false; }
  // The welcome content belongs to Build; every other tab begins at its own section.
  function showWelcomeForBuild() {
    const isBuild = !['#pools', '#rewards', '#positions', '#burns'].includes(location.hash);
    hero.hidden = !isBuild;
    if (wallet) wallet.hidden = !isBuild;
    if (ribbon) ribbon.hidden = false;
  }
  window.addEventListener('hashchange', showWelcomeForBuild);
  showWelcomeForBuild();
  const brand = app.querySelector('.brand-wordmark-art');
  if (brand) brand.src = './images/forge-wordmark-underlined.png';
  const whitePaper = app.querySelector('.top-actions .litepaper-link');
  if (whitePaper) {
    const telegram = document.createElement('a');
    telegram.className = 'litepaper-link telegram-link';
    telegram.href = 'https://t.me/+82zdpAjhJ-dmNWJh';
    telegram.target = '_blank';
    telegram.rel = 'noopener noreferrer';
    telegram.innerHTML = '<span>Telegram</span><span class="telegram-arrow" aria-hidden="true">↗</span>';
    telegram.setAttribute('aria-label', 'Fuel Forge Telegram (opens in a new tab)');
    whitePaper.after(telegram);
    const moreForge = document.createElement('a');
    moreForge.className = 'litepaper-link more-forge-link';
    moreForge.href = '/moreforge/?chain=pls#build';
    moreForge.setAttribute('aria-label', 'MORE Forge on PulseChain');
    const moreLogo = document.createElement('img');
    moreLogo.src = './moreforge/assets/more-forge-metal-wordmark.png';
    moreLogo.alt = 'MORE Forge';
    moreLogo.width = 2172;
    moreLogo.height = 724;
    moreForge.append(moreLogo);
    whitePaper.before(moreForge);
  }
  app.querySelectorAll('.section-heading .eyebrow').forEach(label => {
    label.textContent = label.textContent.replace(/^\d{2}\s*·\s*/, '');
  });
  const names = ['Build', 'Payout Pools', 'Rewards', 'Your NFTs', 'Buy & Burn'];
  // Match the PulseChain preview's crisp, consistently sized navigation icons.
  const icons = [
    '<svg viewBox="0 0 24 24"><path d="m14 3-9 11h6l-1 7 9-12h-6z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v5H4zM14 15h6v5h-6z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M4 8h16v4H4zM6 12v9h12v-9M12 8v13M12 8C3 9 6 0 10 4l2 4Zm0 0c9 1 6-8 2-4l-2 4Z"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/></svg>',
    '<span class="ff-fire-icon">🔥</span>'
  ];
  app.querySelectorAll('[data-site-tab]').forEach((link, i) => {
    link.setAttribute('aria-label', names[i]);
    link.innerHTML = `<span class="ff-tab-icon" aria-hidden="true">${icons[i]}</span><span class="ff-tab-full">${names[i]}</span><span class="ff-tab-short" aria-hidden="true">${['Build','Pools','Rewards','NFTs','Burn'][i]}</span>`;
  });
  const buildTitle = app.querySelector('#build .section-heading h2');
  if (buildTitle) buildTitle.textContent = 'Make it yours.';
  const preview = app.querySelector('.build-preview');
  if (preview) {
    const ring = document.createElement('div');
    ring.className = 'ff-power-ring';
    ring.innerHTML = '<div><strong id="ff-multiplier">—</strong><span>initial power multiplier</span></div>';
    preview.querySelector('.preview-power').before(ring);
    const power = app.querySelector('#preview-power');
    const principal = app.querySelector('#forge-principal');
    const parts = new Intl.NumberFormat().formatToParts(12345.6);
    const group = parts.find(p => p.type === 'group')?.value;
    const decimal = parts.find(p => p.type === 'decimal')?.value || '.';
    function renderMultiplier() {
      let text = power.textContent;
      if (group) text = text.split(group).join('');
      text = text.replace(decimal, '.');
      const p = Number(principal.value);
      const value = Number(text);
      const ratio = p > 0 && Number.isFinite(value) && text.trim() !== '' ? value / p : null;
      ring.querySelector('strong').textContent = ratio === null ? '—' : `${ratio.toFixed(2)}×`;
      ring.style.setProperty('--ff-angle', `${ratio === null ? 0 : Math.min(5, Math.max(0, ratio)) / 5 * 360}deg`);
    }
    new MutationObserver(renderMultiplier).observe(power, {childList:true, characterData:true, subtree:true});
    principal.addEventListener('input', renderMultiplier);
    renderMultiplier();
  }
  const term = app.querySelector('#forge-form [name="term"]');
  if (term) {
    const presets = document.createElement('div');
    presets.className = 'ff-term-presets';
    presets.setAttribute('aria-label', 'Term presets');
    [8,28,88,1000].forEach(days => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${days.toLocaleString()} days`;
      button.addEventListener('click', () => { term.value = String(days); term.dispatchEvent(new Event('input', {bubbles:true})); });
      presets.append(button);
    });
    term.closest('label').after(presets);
  }
  const status = app.querySelector('.mainnet-preview-banner');
  const launch = app.querySelector('.mainnet-launch-banner');
  const footer = app.querySelector('footer');
  const topbar = app.querySelector('.topbar');
  function refreshStatus() {
    const verified = status?.textContent.includes('verified on-chain.') || false;
    status?.classList.toggle('ff-verified', verified);
    if (status && footer && topbar) {
      if (verified && status.parentElement !== footer) footer.append(status);
      else if (!verified && status.previousElementSibling !== topbar) topbar.after(status);
    }
    const live = app.querySelector('#mainnet-launch-clock')?.textContent === 'LIVE';
    launch?.classList.toggle('ff-cycles-live', live);
    app.classList.toggle('ff-live', live);
  }
  // A brief public-RPC failure can occur during the initial contract check.
  // Retry only transport failures; contract mismatches remain locked.
  if (status) {
    const retryKey = 'forge-mainnet-rpc-retries';
    let retryTimer;
    function recoverTransientRpcFailure() {
      const message = status.textContent || '';
      if (message.includes('verified on-chain.')) {
        sessionStorage.removeItem(retryKey);
        return;
      }
      if (!message.includes('Mainnet build is locked') || !message.includes('Failed to fetch') || retryTimer) return;
      const attempt = Number(sessionStorage.getItem(retryKey) || 0);
      if (attempt >= 3) return;
      sessionStorage.setItem(retryKey, String(attempt + 1));
      status.querySelector('span')?.append(' Retrying connection…');
      retryTimer = window.setTimeout(() => location.reload(), [1500, 3500, 7000][attempt]);
    }
    new MutationObserver(() => { refreshStatus(); recoverTransientRpcFailure(); })
      .observe(status, {childList:true, subtree:true, characterData:true});
    recoverTransientRpcFailure();
  }
  if (launch) new MutationObserver(refreshStatus).observe(launch, {childList:true, subtree:true, characterData:true});
  refreshStatus();
  hero.querySelector('.ff-explore').addEventListener('click', event => {
    event.preventDefault();
    const scroll = () => requestAnimationFrame(() => app.querySelector('#build').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
    if (location.hash === '#start') scroll();
    else { window.addEventListener('hashchange', scroll, {once:true}); location.hash = 'start'; }
  });
}


// The root asset base must not send tab links back to the Robinhood home page.
for(const anchor of document.querySelectorAll('a[href^="#"]'))anchor.href=location.pathname+location.search+anchor.getAttribute('href');
const paperLink=document.querySelector('.top-actions .litepaper-link:not(.more-forge-link):not(.telegram-link)');if(paperLink){paperLink.textContent='White Paper ↗';paperLink.href='./Fuel_Forge_White_Paper_PulseChain_V1.1.pdf';paperLink.title='Read the Fuel Forge PulseChain White Paper';}


integrateRewardNfts();
