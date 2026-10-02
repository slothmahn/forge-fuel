const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
const sample = { staked: 1000, wallet: 250, rewards: 10, fuelPerReceipt: 0, ethPerReceipt: 0, ethUsd: 0, fuelUsd: 0 };
const usd = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const receiptValue = n => n * (sample.fuelPerReceipt * sample.fuelUsd + sample.ethPerReceipt * sample.ethUsd);
const depositEth = () => Number($("eth").value) / ($("deposit-unit").value === "usd" ? sample.ethUsd : 1);
let paired = false, demo = false, redeem = false, marketReady = false;
let marketTime = 0;

export function feeBreakdown(receipts, stake) {
  if (!Number.isFinite(receipts) || receipts < 0) throw new Error('Invalid receipt amount');
  return { gross: receipts, fee: stake ? receipts * .1 : 0, stakers: stake ? receipts * .07 : 0, dev: stake ? receipts * .03 : 0, net: stake ? receipts * .9 : receipts };
}
function depositValid() {
  const eth = depositEth(), fuel = Number($('fuel').value);
  return marketReady && Number.isFinite(eth) && eth > 0 && eth <= 1e12 && (!paired || Number.isFinite(fuel) && fuel > 0 && fuel <= 1e20);
}
function quote() {
  const eth = depositEth(), fuel = Number($('fuel').value);
  const receipts = depositValid() ? (paired ? Math.min(eth / sample.ethPerReceipt, fuel / sample.fuelPerReceipt) : eth / 2 / sample.ethPerReceipt) : 0;
  return feeBreakdown(receipts, document.querySelector('[name=destination]:checked').value === 'stake');
}
function update() {
  const q = quote(), stake = document.querySelector('[name=destination]:checked').value === 'stake';
  $('deposit-value').textContent = depositValid() ? `${fmt(depositEth())} ETH ≈ ${usd(depositEth() * sample.ethUsd)}${paired ? ` + ${usd(Number($('fuel').value) * sample.fuelUsd)} in FUEL` : ''} · current prices` : marketReady ? 'Enter a positive amount.' : 'Current prices unavailable; refresh to retry.';
  $('receipt-usd').textContent = depositValid() ? `Estimated receipt backing: ≈ ${usd(receiptValue(q.net))} USD · current prices` : 'USD estimate unavailable';
  $('pair-ratio').textContent = marketReady ? `1 ETH pairs with ≈ ${fmt(sample.fuelPerReceipt / sample.ethPerReceipt)} FUEL at the current pool price.` : 'Loading the current pool ratio…';
  $('match-fuel').disabled = !marketReady;
  $('deposit-unit').disabled = !marketReady;
  $('review').disabled = !depositValid();
  $('gross').title = 'Approximate displayed receipts; final mint uses integer liquidity units.';
  $('net').textContent = depositValid() ? fmt(q.net) : '—';
  $('gross').textContent = `${fmt(q.gross)} LP`;
  $('entry-rate').textContent = stake ? '10%' : '0%';
  $('entry').textContent = `${fmt(q.fee)} LP`;
  $('stakers').textContent = `${fmt(q.stakers)} LP`;
  $('dev').textContent = `${fmt(q.dev)} LP`;
  $('staker-row').hidden = $('dev-row').hidden = !stake;
  $('receive').textContent = `${fmt(q.net)} ${stake ? 'staked' : 'wallet'} receipts`;
  $('destination-title').textContent = stake ? 'Your Furnace stake' : 'Receipts in your wallet';
  $('receipt-fuel').textContent = depositValid() ? `${fmt(q.net * sample.fuelPerReceipt)} FUEL` : '—';
  $('receipt-eth').textContent = depositValid() ? `${ethAmount(q.net * sample.ethPerReceipt)} ETH` : '—';
  $('spot-note').textContent = paired ? 'Matched full-range liquidity estimate. Unused paired assets are refunded; gas is extra.' : 'ETH-only uses a spot estimate; swap price impact, DEX fees and gas are excluded. A final zap quote is required.';
  $('receipt-caption').textContent = stake ? 'Your stake participates in Furnace rewards.' : 'Transferable. Redeemable. Yours.';
  if (depositValid()) { $('validation').textContent = 'Demo only. No assets move.'; $('validation').classList.remove('error'); }
}
function show(title, body) {
  $('modal-title').textContent = title;
  $('modal-body').textContent = body;
  $('modal').showModal();
}
function mode(pair) {
  paired = pair;
  $('fuel-label').hidden = !pair;
  $('pair-helper').hidden = !pair;
  $('eth-tab').setAttribute('aria-pressed', String(!pair));
  $('pair-tab').setAttribute('aria-pressed', String(pair));
  $('deposit-note').textContent = pair ? 'USD sets the ETH portion only; FUEL is entered separately. Both assets create liquidity. Unused assets are refunded.' : 'USD is a planning amount; the actual deposit uses ETH. Part buys FUEL, then both assets are added to liquidity.';
  update();
}
$('eth-tab').onclick = () => mode(false);
$('pair-tab').onclick = () => mode(true);
['eth', 'fuel'].forEach(id => $(id).addEventListener('input', update));
document.querySelectorAll('[name=destination]').forEach(el => el.addEventListener('change', update));
const tabs = [...document.querySelectorAll('[data-tab]')];
function selectTab(id, focus = false) {
  tabs.forEach(button => {
    const selected = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  document.querySelectorAll('.tab-panel').forEach(panel => panel.hidden = panel.id !== id);
}
tabs.forEach((button, index) => {
  button.onclick = () => selectTab(button.dataset.tab);
  button.onkeydown = e => {
    let next;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { e.preventDefault(); selectTab(tabs[next].dataset.tab, true); }
  };
});
$('review').onclick = () => {
  const eth = depositEth(), fuel = Number($('fuel').value), slip = Number($('slippage').value), deadline = Number($('deadline').value);
  if (!depositValid() || !(slip >= .1 && slip <= 5) || !(deadline >= 1 && deadline <= 60)) {
    $('validation').textContent = 'Enter positive deposit amounts, slippage from 0.1–5%, and a deadline from 1–60 minutes.';
    $('validation').classList.add('error');
    return;
  }
  const q = quote(), stake = document.querySelector('[name=destination]:checked').value === 'stake';
  show('Your sample deposit', `${fmt(eth)} ETH${paired ? ' + ' + fmt(fuel) + ' FUEL' : ''} → ${fmt(q.gross)} estimated LP receipts.\n\n${stake ? `Staking entry fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\nYou receive ${fmt(q.net)} staked receipts. A separate 10% fee applies when unstaking.` : `You receive ${fmt(q.net)} wallet receipts. No staking entry fee and no protocol redemption fee.`}\n\nCurrent-price spot estimate for the prototype full-range vault, not an executable zap quote. Swap price impact, DEX fees and gas are excluded. Unused paired assets are refunded.`);
};
const fuelAmount = n => new Intl.NumberFormat('en-US', {maximumFractionDigits:2}).format(n);
const ethAmount = n => new Intl.NumberFormat('en-US', {maximumSignificantDigits:6}).format(n);
function compoundUpdate() {
  const state = $('compound-scenario').value;
  const backing = units => marketReady ? `≈ ${fuelAmount(units * sample.fuelPerReceipt)} FUEL + ${ethAmount(units * sample.ethPerReceipt)} ETH equivalent
≈ ${usd(receiptValue(units))} USD` : 'Current backing unavailable';
  $('compound-added-assets').textContent = backing(2);
  $('compound-reward-assets').textContent = backing(1);
  $('compound-protocol-assets').textContent = backing(1);
  $('compound-total-assets').textContent = backing(sample.staked + sample.wallet + sample.rewards + 3);
  $('compound-available').textContent = marketReady ? `${fuelAmount((state === 'fuel' ? 3 : 2) * sample.fuelPerReceipt)} FUEL
${ethAmount((state === 'eth' ? 3 : 2) * sample.ethPerReceipt)} WETH` : 'Unavailable';
  $('compound-used').textContent = marketReady ? `${fuelAmount(2 * sample.fuelPerReceipt)} FUEL
${ethAmount(2 * sample.ethPerReceipt)} WETH` : 'Unavailable';
  $('compound-unmatched').textContent = !marketReady ? 'Unavailable' : state === 'balanced' ? '0 FUEL + 0 WETH · fully matched' : state === 'fuel' ? `${fuelAmount(sample.fuelPerReceipt)} FUEL + 0 WETH
≈ ${usd(sample.fuelPerReceipt * sample.fuelUsd)} USD waiting` : `0 FUEL + ${ethAmount(sample.ethPerReceipt)} WETH
≈ ${usd(sample.ethPerReceipt * sample.ethUsd)} USD waiting`;
  $('compound-action').disabled = !marketReady;
}
$('compound-scenario').onchange = compoundUpdate;
function walletUpdate() {
  const held = sample.staked + sample.wallet, users = held + sample.rewards;
  $('total-demo').textContent = fmt(users + 1);
  [['total', users + 1], ['user', users], ['protocol', 1]].forEach(([prefix, units]) => {
    $(prefix + '-fuel').textContent = marketReady ? `≈ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(units * sample.fuelPerReceipt)} FUEL` : '— FUEL';
    $(prefix + '-eth').textContent = marketReady ? `≈ ${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(units * sample.ethPerReceipt)} ETH equivalent` : '— ETH equivalent';
    $(prefix + '-usd').textContent = marketReady ? `≈ ${usd(receiptValue(units))} USD · current prices` : 'Asset estimate unavailable';
  });
  $('user-demo').textContent = fmt(users);
  $('demo-total-note').textContent = `${fmt(held)} held + ${fmt(sample.rewards)} reward units`;
  $('compound-total').textContent = `${fmt(users + 3)} LP`;
  compoundUpdate();
  document.querySelector('.liquidity-bar span').style.width = `${users / (users + 1) * 100}%`;
  $('wallet').querySelector('span').textContent = demo ? 'Demo wallet active' : 'Try demo wallet';
  $('wallet').setAttribute('aria-pressed', String(demo));
  $('wallet-state').textContent = demo ? 'Sample wallet. These balances are for exploring the preview.' : 'Try the demo wallet to explore a sample position.';
  const assets = units => demo && marketReady ? `≈ ${fuelAmount(units * sample.fuelPerReceipt)} FUEL
+ ${ethAmount(units * sample.ethPerReceipt)} ETH equivalent` : '— FUEL + ETH';
  $('staked-assets').textContent = assets(sample.staked);
  $('wallet-assets').textContent = assets(sample.wallet);
  $('wallet-usd').textContent = demo && marketReady ? `≈ ${usd(receiptValue(sample.wallet))} USD` : '— USD';
  $('position-demo').hidden = demo;
  $('stake-balance').textContent = demo ? `${fmt(sample.staked)} LP receipts` : '—';
  $('reward-balance').textContent = demo ? `${fmt(sample.rewards)} LP` : '—';
  $('wallet-balance').textContent = demo ? `${fmt(sample.wallet)} LP receipts` : '—';
  $('reward-fuel').textContent = demo && marketReady ? `${fmt(sample.rewards * sample.fuelPerReceipt)} FUEL` : '— FUEL';
  $('reward-eth').textContent = demo && marketReady ? `${ethAmount(sample.rewards * sample.ethPerReceipt)} ETH` : '— ETH';
  $('stake-usd').textContent = demo && marketReady ? `≈ ${usd(receiptValue(sample.staked))} USD backing · before exit fee · current prices` : 'Participating in Furnace rewards';
  $('reward-usd').textContent = demo && marketReady ? `≈ ${usd(receiptValue(sample.rewards))} USD · current prices` : '— USD';
  $('claim').disabled = !demo || !marketReady || sample.rewards <= 0;
  $('compound-rewards').disabled = !demo || !marketReady || sample.rewards <= 0;
  const reinvest = feeBreakdown(sample.rewards, true);
  $('reinvest-summary').textContent = demo ? `Compounding ${fmt(sample.rewards)} reward receipts adds ${fmt(reinvest.net)} to your stake after the 10% entry fee. No asset swap or redemption. A later staking exit still has its 10% fee.` : 'Show sample balances to preview compounding.';
  exitUpdate();
}
$('wallet').onclick = () => { demo = !demo; walletUpdate(); };
$('position-demo').onclick = () => { demo = true; walletUpdate(); };
$('demo-staked').addEventListener('input', () => {
  const n = Number($('demo-staked').value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) return;
  sample.staked = n; sample.wallet = n * .25; sample.rewards = n * .01;
  withdrawalMode(redeem); walletUpdate();
});
$('deposit-unit').onchange = () => {
  const inUsd = $('deposit-unit').value === 'usd';
  const current = Number($('eth').value);
  $('eth').value = String(Number((inUsd ? current * sample.ethUsd : current / sample.ethUsd).toFixed(inUsd ? 2 : 8)));
  $('eth').step = inUsd ? '.01' : '.0001';
  $('deposit-symbol').textContent = inUsd ? 'USD' : 'ETH';
  mode(paired);
};
function exitUpdate() {
  const value = Number($('withdraw').value), max = redeem ? sample.wallet : sample.staked;
  const valid = marketReady && Number.isFinite(value) && value > 0 && value <= max;
  const q = feeBreakdown(valid ? value : 0, !redeem);
  $('exit-fee').textContent = valid ? `${fmt(q.fee)} LP` : `Enter 0–${max} LP`;
  $('exit-split').textContent = `${fmt(q.stakers)} LP / ${fmt(q.dev)} LP`;
  $('exit-net').textContent = valid ? `${fmt(q.net * sample.fuelPerReceipt)} FUEL` : '— FUEL';
  $('redeem-eth').textContent = valid ? `${ethAmount(q.net * sample.ethPerReceipt)} ETH` : '— ETH';
  $('withdraw-usd').textContent = valid ? `Estimated returned assets: ≈ ${usd(receiptValue(q.net))} USD · ${redeem ? 'no redemption fee' : 'after exit fee'} · current prices` : 'USD estimate unavailable';
  $('exit').disabled = !demo || !valid;
  $('withdraw-max').disabled = !demo || max <= 0;
  return q;
}
function withdrawalMode(isRedeem) {
  redeem = isRedeem;
  $('unstake-tab').setAttribute('aria-pressed', String(!redeem));
  $('redeem-tab').setAttribute('aria-pressed', String(redeem));
  $('withdraw-label').textContent = redeem ? 'Wallet receipts to redeem' : 'Receipts to unstake';
  $('withdraw-max').setAttribute('aria-label', redeem ? 'Use maximum wallet receipts' : 'Use maximum staked receipts');
  $('withdraw').max = redeem ? sample.wallet : sample.staked;
  $('withdraw').value = redeem ? sample.wallet : sample.staked;
  $('available-line').textContent = `Demo balance: ${redeem ? fmt(sample.wallet) + ' wallet' : fmt(sample.staked) + ' staked'} LP`;
  $('exit-fee-label').textContent = redeem ? 'Redemption fee · 0%' : 'Staking exit fee · 10%';
  $('exit-fee-label').parentElement.hidden = redeem;
  $('exit-split-row').hidden = redeem;
  $('redeem-eth-row').hidden = false;
  $('exit-net-label').textContent = 'FUEL returned';
  $('withdraw-source-note').textContent = redeem ? 'Redeem receipts held in your wallet for FUEL and native ETH. This does not withdraw your staked balance.' : 'Withdraw deposited liquidity from staking. A 10% exit fee applies; earned rewards stay separately claimable.';
  $('withdraw-note').textContent = redeem ? 'Backing uses the current pool price and prototype full-range liquidity formula. Output changes with pool price. WETH is unwrapped; no redemption fee.' : 'Unstake and redeem principal in one transaction. After the 10% staking exit fee, net receipts return FUEL + ETH. Earned rewards stay in Claim Rewards.';
  $('exit').innerHTML = `${redeem ? 'Review sample redemption' : 'Review sample unstake'} <svg aria-hidden="true"><use href="#i-arrow"/></svg>`;
  exitUpdate();
}
$('unstake-tab').onclick = () => withdrawalMode(false);
$('redeem-tab').onclick = () => withdrawalMode(true);
$('withdraw').addEventListener('input', exitUpdate);
$('withdraw-max').onclick = () => {
  // Fill the available balance, never the rounded display amount.
  $('withdraw').value = String(redeem ? sample.wallet : sample.staked);
  exitUpdate();
};
$('exit').onclick = () => {
  const q = exitUpdate();
  if (redeem) show('Your sample redemption', `Redeem ${fmt(q.gross)} wallet receipts for an illustrative ${fmt(q.net * sample.fuelPerReceipt)} FUEL + ${ethAmount(q.net * sample.ethPerReceipt)} ETH.\n\nProtocol redemption fee: 0%. The WETH portion is automatically unwrapped into native ETH. Gas still applies.\n\nReal outputs depend on pool price and your minimum amounts. This demo does not change sample balances.`);
  else show('Your sample unstake', `Unstake ${fmt(q.gross)} receipts.\n\nExit fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\n${fmt(q.net)} net receipts are redeemed for an illustrative ${fmt(q.net * sample.fuelPerReceipt)} FUEL + ${ethAmount(q.net * sample.ethPerReceipt)} native ETH in the same transaction. No extra redemption fee.\n\nEarned rewards stay in Claim Rewards for a separate claim, even after a full unstake. This demo does not change sample balances.`);
};
$('claim').onclick = () => show('Your sample reward claim', `${fmt(sample.rewards)} sample reward receipts → ${fmt(sample.rewards * sample.fuelPerReceipt)} FUEL + ${ethAmount(sample.rewards * sample.ethPerReceipt)} native ETH. Estimated backing: ${usd(receiptValue(sample.rewards))} USD at current prices. WETH is automatically unwrapped. No protocol claim or redemption fee; gas still applies. Sample balances remain unchanged.`);
$('compound-rewards').onclick = () => {
  const q = feeBreakdown(sample.rewards, true);
  show('Compound earned rewards into your stake', `${fmt(q.gross)} reward receipts → ${fmt(q.net)} additional staked receipts.

Entry fee: ${fmt(q.fee)} LP (${fmt(q.stakers)} to eligible stakes; ${fmt(q.dev)} to development).

Your stake would increase from ${fmt(sample.staked)} to ${fmt(sample.staked + q.net)} LP. Added backing: ≈ ${fuelAmount(q.net * sample.fuelPerReceipt)} FUEL + ${ethAmount(q.net * sample.ethPerReceipt)} ETH equivalent (≈ ${usd(receiptValue(q.net))} USD).

Receipts stay invested; no FUEL/ETH redemption or swap. Your existing stake may receive its share of the entry-fee distribution, which remains separately claimable. A later exit has the normal staking exit fee. Trading-fee rewards must first be collected and compounded by the vault. Demo only; balances do not change.`);
};
$('compound-action').onclick = () => show('Your sample compound', `2 new liquidity units: 1 issues reward receipts for eligible stakers, and 1 is retained as protocol-owned liquidity.\n\nTotal liquidity would rise from ${fmt(sample.staked + sample.wallet + sample.rewards + 1)} to ${fmt(sample.staked + sample.wallet + sample.rewards + 3)}. Unmatched fees after this example: ${$('compound-unmatched').textContent}. No balancing swaps are made. This demo does not change sample balances.`);
$('how-it-works').onclick = () => show('Inside the Furnace', '1. Add ETH, or FUEL + ETH, to the shared full-range V3 vault. Existing position NFTs are not accepted.\n\n2. Receive transferable LP receipts. Hold them, or stake them to participate in rewards. Staking entry and exit each take 10%: 7% for eligible stakers and 3% for development. If none are eligible, the reward portion goes to the protocol reserve.\n\n3. Unstake and redeem principal for FUEL + native ETH in one transaction. Accrued rewards remain separately claimable, even after a full exit. Claim Rewards also redeems reward receipts for FUEL + ETH. Wallet receipt redemption remains available. No extra claim or redemption fee. Outputs change with pool price; gas still applies.');
document.querySelectorAll('.close').forEach(button => button.onclick = () => $('modal').close());
update(); withdrawalMode(false); walletUpdate();

const poolAddress = '0xFF40c99525ffA6b6cf79ecbE370eF7C887D68F69';
const fuelAddress = '0xe60C1F5d9bA7f62a392a78472a3Ab83DD62467A3';
const wethAddress = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73';
async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Market request failed');
  return response.json();
}
async function refreshMarket() {
  $('refresh-market').disabled = true;
  $('market-status').textContent = 'Refreshing current prices and pool ratio…';
  try {
    const [dex, rpc] = await Promise.all([
      fetchJson(`https://api.dexscreener.com/latest/dex/pairs/robinhood/${poolAddress}`),
      fetchJson('https://rpc.mainnet.chain.robinhood.com', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify([
        {jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:poolAddress,data:'0x3850c7bd'},'latest']},
        {jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:poolAddress,data:'0xd0c93a7c'},'latest']},
        {jsonrpc:'2.0',id:3,method:'eth_call',params:[{to:fuelAddress,data:'0x313ce567'},'latest']},
        {jsonrpc:'2.0',id:4,method:'eth_call',params:[{to:wethAddress,data:'0x313ce567'},'latest']}
      ])})
    ]);
    const pair = dex.pairs?.find(p => p.pairAddress.toLowerCase() === poolAddress.toLowerCase());
    if (!pair || pair.baseToken.address.toLowerCase() !== fuelAddress.toLowerCase() || pair.quoteToken.address.toLowerCase() !== wethAddress.toLowerCase()) throw new Error('Unexpected pool');
    const result = id => { const r = rpc.find(x => x.id === id); if (!r?.result || r.error) throw new Error('Pool read failed'); return r.result; };
    if (BigInt(result(3)) !== 18n || BigInt(result(4)) !== 18n) throw new Error('Unexpected token decimals');
    const sqrt = Number(BigInt('0x' + result(1).slice(2,66))) / 2 ** 96;
    const spacing = Number(BigInt(result(2)));
    if (!(spacing > 0 && spacing <= 887272)) throw new Error('Invalid pool range');
    const upperTick = Math.floor(887272 / spacing) * spacing;
    const lower = Math.pow(1.0001, -upperTick / 2), upper = Math.pow(1.0001, upperTick / 2);
    // WETH is token0, FUEL token1; both have 18 decimals. One displayed receipt is 1e18 liquidity units.
    const ethPerReceipt = 1 / sqrt - 1 / upper, fuelPerReceipt = sqrt - lower;
    const fuelUsd = Number(pair.priceUsd), ethUsd = fuelUsd / Number(pair.priceNative);
    if (![ethPerReceipt, fuelPerReceipt, fuelUsd, ethUsd].every(v => Number.isFinite(v) && v > 0)) throw new Error('Invalid market data');
    Object.assign(sample, {ethPerReceipt, fuelPerReceipt, fuelUsd, ethUsd});
    const firstLoad = marketTime === 0;
    marketReady = true; marketTime = Date.now();
    if (firstLoad) $('fuel').value = String(Math.round(depositEth() * fuelPerReceipt / ethPerReceipt));
    $('market-status').textContent = `FUEL ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumSignificantDigits:5}).format(fuelUsd)} · ETH ${usd(ethUsd)} · updated ${new Date(marketTime).toLocaleTimeString()} · DexScreener + pool RPC`;
    $('estimate-description').textContent = 'Current-price estimate for the prototype full-range vault. Receipt amounts use its liquidity formula and 18 decimals. USD backing = FUEL amount × FUEL price + ETH amount × ETH price. Demo balances are simulated; Furnace contracts are not deployed. ETH-only estimates assume a half-ETH swap at the spot price and exclude swap price impact, DEX fees and gas. A final zap quote is required before any real deposit.';
    $('withdraw-note').textContent = redeem ? 'Current-price full-range backing estimate. WETH is unwrapped; no redemption fee. Output changes with pool price.' : 'Current-price backing after the 10% exit fee. Earned rewards remain separately claimable. Demo balances only.';
  } catch {
    marketReady = false;
    $('market-status').textContent = 'Current market data unavailable. Estimates are disabled; refresh to retry.';
  } finally {
    $('refresh-market').disabled = false;
    update(); walletUpdate();
  }
}
$('match-fuel').onclick = () => {
  if (!marketReady || !Number.isFinite(depositEth()) || depositEth() <= 0 || depositEth() > 1e12) return;
  $('fuel').value = String(Math.round(depositEth() * sample.fuelPerReceipt / sample.ethPerReceipt)); update();
};
$('refresh-market').onclick = refreshMarket;
refreshMarket();
setInterval(() => { if (!document.hidden) refreshMarket(); }, 60000);

// The visible orbit and token animation share the exact transformed path.
const furnaceArt = document.querySelector('.liquidity-art');
function sizeFurnaceOrbit() {
  const width = furnaceArt.clientWidth, height = furnaceArt.clientHeight;
  if (!width || !height) return;
  const badges = [...furnaceArt.querySelectorAll('.art-asset')];
  const badgeWidth = Math.max(...badges.map(b => b.offsetWidth));
  const badgeHeight = Math.max(...badges.map(b => b.offsetHeight));
  const tilt = -25 * Math.PI / 180, squash = .55;
  const c = Math.cos(tilt), s = Math.sin(tilt), cy = 105;
  const radius = Math.max(0, Math.min(
    (width - badgeWidth - 16) / (2 * Math.hypot(c, squash * s)),
    (cy - badgeHeight / 2 - 8) / Math.hypot(s, squash * c)
  ));
  const path = scale => Array.from({length:97}, (_,i) => {
    const angle = i / 96 * Math.PI * 2;
    const x = radius * scale * Math.cos(angle), y = radius * scale * squash * Math.sin(angle);
    return `${i ? 'L' : 'M'} ${(width/2 + x*c - y*s).toFixed(2)} ${(cy + x*s + y*c).toFixed(2)}`;
  }).join(' ') + ' Z';
  const main = path(1);
  furnaceArt.style.setProperty('--furnace-orbit-path', `path("${main}")`);
  furnaceArt.querySelector('.orbit-main').setAttribute('d', main);
  furnaceArt.querySelector('.orbit-inner').setAttribute('d', path(.8));
  furnaceArt.querySelector('.orbit-outer').setAttribute('d', path(1.14));
}
new ResizeObserver(sizeFurnaceOrbit).observe(furnaceArt);
sizeFurnaceOrbit();
const flameFiles = {ember:'furnace-flame.svg',rising:'furnace-flame-rising.svg',spark:'furnace-flame-spark.svg'};
document.querySelectorAll('[data-flame]').forEach(button => {
  button.onclick = () => {
    furnaceArt.querySelector('.furnace-emblem').src = `assets/${flameFiles[button.dataset.flame]}`;
    document.querySelectorAll('[data-flame]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  };
});
