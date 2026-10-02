const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
const sample = Object.freeze({ staked: 100, wallet: 25, rewards: 1, fuelPerReceipt: 500000, ethPerReceipt: .005 });
let paired = false, demo = false, redeem = false;

export function feeBreakdown(receipts, stake) {
  if (!Number.isFinite(receipts) || receipts < 0) throw new Error('Invalid receipt amount');
  return { gross: receipts, fee: stake ? receipts * .1 : 0, stakers: stake ? receipts * .07 : 0, dev: stake ? receipts * .03 : 0, net: stake ? receipts * .9 : receipts };
}
function depositValid() {
  const eth = Number($('eth').value), fuel = Number($('fuel').value);
  return Number.isFinite(eth) && eth > 0 && eth <= 1e12 && (!paired || Number.isFinite(fuel) && fuel > 0 && fuel <= 1e20);
}
function quote() {
  const eth = Number($('eth').value), fuel = Number($('fuel').value);
  const receipts = depositValid() ? (paired ? Math.min(eth, fuel / 1e8) * 200 : eth * 100) : 0;
  return feeBreakdown(receipts, document.querySelector('[name=destination]:checked').value === 'stake');
}
function update() {
  const q = quote(), stake = document.querySelector('[name=destination]:checked').value === 'stake';
  $('net').textContent = depositValid() ? fmt(q.net) : '—';
  $('gross').textContent = `${fmt(q.gross)} LP`;
  $('entry-rate').textContent = stake ? '10%' : '0%';
  $('entry').textContent = `${fmt(q.fee)} LP`;
  $('stakers').textContent = `${fmt(q.stakers)} LP`;
  $('dev').textContent = `${fmt(q.dev)} LP`;
  $('staker-row').hidden = $('dev-row').hidden = !stake;
  $('receive').textContent = `${fmt(q.net)} ${stake ? 'staked' : 'wallet'} receipts`;
  $('destination-title').textContent = stake ? 'Your Furnace stake' : 'Receipts in your wallet';
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
  $('eth-tab').setAttribute('aria-pressed', String(!pair));
  $('pair-tab').setAttribute('aria-pressed', String(pair));
  $('deposit-note').textContent = pair ? 'Both assets create liquidity. Any unused FUEL / WETH is refunded.' : 'Part of your ETH buys FUEL. Both assets are added to liquidity.';
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
  const eth = Number($('eth').value), fuel = Number($('fuel').value), slip = Number($('slippage').value), deadline = Number($('deadline').value);
  if (!depositValid() || !(slip >= .1 && slip <= 5) || !(deadline >= 1 && deadline <= 60)) {
    $('validation').textContent = 'Enter positive deposit amounts, slippage from 0.1–5%, and a deadline from 1–60 minutes.';
    $('validation').classList.add('error');
    return;
  }
  const q = quote(), stake = document.querySelector('[name=destination]:checked').value === 'stake';
  show('Your sample deposit', `${fmt(eth)} ETH${paired ? ' + ' + fmt(fuel) + ' FUEL' : ''} → ${fmt(q.gross)} sample LP receipts.\n\n${stake ? `Staking entry fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\nYou receive ${fmt(q.net)} staked receipts. A separate 10% fee applies when unstaking.` : `You receive ${fmt(q.net)} wallet receipts. No staking entry fee and no protocol redemption fee.`}\n\nSample ratios only, not a live quote. Unused assets are refunded. DEX fees and gas still apply.`);
};
$('wallet').onclick = () => {
  demo = !demo;
  $('wallet').querySelector('span').textContent = demo ? 'Demo wallet active' : 'Try demo wallet';
  $('wallet').setAttribute('aria-pressed', String(demo));
  $('wallet-state').textContent = demo ? 'Sample wallet. These balances are for exploring the preview.' : 'Try the demo wallet to explore a sample position.';
  $('stake-balance').textContent = demo ? `${fmt(sample.staked)} LP` : '—';
  $('reward-balance').textContent = demo ? `${fmt(sample.rewards)} LP` : '—';
  $('wallet-balance').textContent = demo ? `${fmt(sample.wallet)} LP` : '—';
  $('claim').disabled = !demo;
  exitUpdate();
};
function exitUpdate() {
  const value = Number($('withdraw').value), max = redeem ? sample.wallet : sample.staked;
  const valid = Number.isFinite(value) && value > 0 && value <= max;
  const q = feeBreakdown(valid ? value : 0, !redeem);
  $('exit-fee').textContent = valid ? `${fmt(q.fee)} LP` : `Enter 0–${max} LP`;
  $('exit-split').textContent = `${fmt(q.stakers)} LP / ${fmt(q.dev)} LP`;
  $('exit-net').textContent = redeem ? `${fmt(q.net * sample.fuelPerReceipt)} FUEL` : `${fmt(q.net)} LP`;
  $('redeem-eth').textContent = `${fmt(q.net * sample.ethPerReceipt)} ETH`;
  $('exit').disabled = !demo || !valid;
  return q;
}
function withdrawalMode(isRedeem) {
  redeem = isRedeem;
  $('unstake-tab').setAttribute('aria-pressed', String(!redeem));
  $('redeem-tab').setAttribute('aria-pressed', String(redeem));
  $('withdraw-label').textContent = redeem ? 'Wallet receipts to redeem' : 'Receipts to unstake';
  $('withdraw').max = redeem ? sample.wallet : sample.staked;
  $('withdraw').value = redeem ? sample.wallet : sample.staked;
  $('available-line').textContent = `Demo balance: ${redeem ? sample.wallet + ' wallet' : sample.staked + ' staked'} LP`;
  $('exit-fee-label').textContent = redeem ? 'Redemption fee · 0%' : 'Staking exit fee · 10%';
  $('exit-split-row').hidden = redeem;
  $('redeem-eth-row').hidden = !redeem;
  $('exit-net-label').textContent = redeem ? 'FUEL returned' : 'Receipts returned';
  $('withdraw-note').textContent = redeem ? 'Sample ratio: 1 receipt = 500,000 FUEL + 0.005 ETH. Real output changes with pool price. WETH is unwrapped automatically; no token sale or redemption fee.' : 'Unstake first to receive wallet receipts. Redeem them separately for FUEL + ETH, with no redemption fee.';
  $('exit').innerHTML = `${redeem ? 'Review sample redemption' : 'Review sample unstake'} <svg aria-hidden="true"><use href="#i-arrow"/></svg>`;
  exitUpdate();
}
$('unstake-tab').onclick = () => withdrawalMode(false);
$('redeem-tab').onclick = () => withdrawalMode(true);
$('withdraw').addEventListener('input', exitUpdate);
$('exit').onclick = () => {
  const q = exitUpdate();
  if (redeem) show('Your sample redemption', `Redeem ${fmt(q.gross)} wallet receipts for an illustrative ${fmt(q.net * sample.fuelPerReceipt)} FUEL + ${fmt(q.net * sample.ethPerReceipt)} ETH.\n\nProtocol redemption fee: 0%. The WETH portion is automatically unwrapped into native ETH. Gas still applies.\n\nReal outputs depend on pool price and your minimum amounts. This demo does not change sample balances.`);
  else show('Your sample unstake', `Unstake ${fmt(q.gross)} receipts.\n\nExit fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\n${fmt(q.net)} LP receipts return to your wallet. You can then redeem them separately for FUEL + ETH with no protocol redemption fee. This demo does not change sample balances.`);
};
$('claim').onclick = () => show('Your sample reward claim', 'Claim 1 LP receipt to your wallet with no protocol claim fee. You can hold it, stake it, or redeem it for underlying assets. Gas still applies. Sample balances remain unchanged.');
$('compound-action').onclick = () => show('Your sample compound', '2 new liquidity units: 1 issues reward receipts for eligible stakers, and 1 is retained as protocol-owned liquidity.\n\nTotal liquidity would rise from 302 to 304. Unmatched trading fees carry forward. No balancing swaps are made. This demo does not change sample balances.');
$('how-it-works').onclick = () => show('Inside the Furnace', '1. Add ETH, or FUEL + ETH, to the shared full-range V3 vault. Existing position NFTs are not accepted.\n\n2. Receive transferable LP receipts. Hold them, or stake them to participate in rewards. Staking entry and exit each take 10%: 7% for eligible stakers and 3% for development. If none are eligible, the reward portion goes to the protocol reserve.\n\n3. Redeem wallet receipts for FUEL + native ETH with no protocol redemption fee. Token amounts change with pool price; gas still applies.');
document.querySelectorAll('.close').forEach(button => button.onclick = () => $('modal').close());
update(); exitUpdate();
