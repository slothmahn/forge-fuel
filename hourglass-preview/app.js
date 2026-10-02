const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
const sample = { staked: 1000, wallet: 250, rewards: 10, fuelPerReceipt: 500000, ethPerReceipt: .005, ethUsd: 2700, fuelUsd: .000027 };
const usd = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const receiptValue = n => n * (sample.fuelPerReceipt * sample.fuelUsd + sample.ethPerReceipt * sample.ethUsd);
const depositEth = () => Number($("eth").value) / ($("deposit-unit").value === "usd" ? sample.ethUsd : 1);
let paired = false, demo = false, redeem = false;

export function feeBreakdown(receipts, stake) {
  if (!Number.isFinite(receipts) || receipts < 0) throw new Error('Invalid receipt amount');
  return { gross: receipts, fee: stake ? receipts * .1 : 0, stakers: stake ? receipts * .07 : 0, dev: stake ? receipts * .03 : 0, net: stake ? receipts * .9 : receipts };
}
function depositValid() {
  const eth = depositEth(), fuel = Number($('fuel').value);
  return Number.isFinite(eth) && eth > 0 && eth <= 1e12 && (!paired || Number.isFinite(fuel) && fuel > 0 && fuel <= 1e20);
}
function quote() {
  const eth = depositEth(), fuel = Number($('fuel').value);
  const receipts = depositValid() ? (paired ? Math.min(eth, fuel / 1e8) * 200 : eth * 100) : 0;
  return feeBreakdown(receipts, document.querySelector('[name=destination]:checked').value === 'stake');
}
function update() {
  const q = quote(), stake = document.querySelector('[name=destination]:checked').value === 'stake';
  $('deposit-value').textContent = depositValid() ? `${fmt(depositEth())} ETH ≈ ${usd(depositEth() * sample.ethUsd)}${paired ? ` + ${usd(Number($('fuel').value) * sample.fuelUsd)} in FUEL` : ''} · sample prices` : 'Enter a positive amount.';
  $('receipt-usd').textContent = depositValid() ? `Estimated receipt backing: ≈ ${usd(receiptValue(q.net))} USD · sample prices` : 'USD estimate unavailable';
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
  show('Your sample deposit', `${fmt(eth)} ETH${paired ? ' + ' + fmt(fuel) + ' FUEL' : ''} → ${fmt(q.gross)} sample LP receipts.\n\n${stake ? `Staking entry fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\nYou receive ${fmt(q.net)} staked receipts. A separate 10% fee applies when unstaking.` : `You receive ${fmt(q.net)} wallet receipts. No staking entry fee and no protocol redemption fee.`}\n\nSample ratios only, not a live quote. Unused assets are refunded. DEX fees and gas still apply.`);
};
function walletUpdate() {
  const held = sample.staked + sample.wallet, users = held + sample.rewards;
  $('total-demo').textContent = fmt(users + 1);
  $('user-demo').textContent = fmt(users);
  $('demo-total-note').textContent = `${fmt(held)} held + ${fmt(sample.rewards)} reward units`;
  $('compound-total').textContent = `${fmt(users + 3)} LP`;
  document.querySelector('.liquidity-bar span').style.width = `${users / (users + 1) * 100}%`;
  $('wallet').querySelector('span').textContent = demo ? 'Demo wallet active' : 'Try demo wallet';
  $('wallet').setAttribute('aria-pressed', String(demo));
  $('wallet-state').textContent = demo ? 'Sample wallet. These balances are for exploring the preview.' : 'Try the demo wallet to explore a sample position.';
  $('stake-balance').textContent = demo ? `${fmt(sample.staked)} LP` : '—';
  $('reward-balance').textContent = demo ? `${fmt(sample.rewards)} LP` : '—';
  $('wallet-balance').textContent = demo ? `${fmt(sample.wallet)} LP` : '—';
  $('reward-fuel').textContent = demo ? `${fmt(sample.rewards * sample.fuelPerReceipt)} FUEL` : '— FUEL';
  $('reward-eth').textContent = demo ? `${fmt(sample.rewards * sample.ethPerReceipt)} ETH` : '— ETH';
  $('stake-usd').textContent = demo ? `≈ ${usd(receiptValue(sample.staked))} USD backing · before exit fee · sample prices` : 'Participating in Furnace rewards';
  $('reward-usd').textContent = demo ? `≈ ${usd(receiptValue(sample.rewards))} USD · sample prices` : '— USD';
  $('claim').disabled = !demo;
  exitUpdate();
}
$('wallet').onclick = () => { demo = !demo; walletUpdate(); };
$('demo-staked').addEventListener('input', () => {
  const n = Number($('demo-staked').value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) return;
  sample.staked = n; sample.wallet = n * .25; sample.rewards = n * .01;
  withdrawalMode(redeem); walletUpdate();
});
$('deposit-unit').onchange = () => {
  const inUsd = $('deposit-unit').value === 'usd';
  const current = Number($('eth').value);
  $('eth').value = inUsd ? current * sample.ethUsd : current / sample.ethUsd;
  $('eth').step = inUsd ? '.01' : '.0001';
  $('deposit-symbol').textContent = inUsd ? 'USD' : 'ETH';
  mode(paired);
};
function exitUpdate() {
  const value = Number($('withdraw').value), max = redeem ? sample.wallet : sample.staked;
  const valid = Number.isFinite(value) && value > 0 && value <= max;
  const q = feeBreakdown(valid ? value : 0, !redeem);
  $('exit-fee').textContent = valid ? `${fmt(q.fee)} LP` : `Enter 0–${max} LP`;
  $('exit-split').textContent = `${fmt(q.stakers)} LP / ${fmt(q.dev)} LP`;
  $('exit-net').textContent = `${fmt(q.net * sample.fuelPerReceipt)} FUEL`;
  $('redeem-eth').textContent = `${fmt(q.net * sample.ethPerReceipt)} ETH`;
  $('withdraw-usd').textContent = valid ? `Estimated returned assets: ≈ ${usd(receiptValue(q.net))} USD · ${redeem ? 'no redemption fee' : 'after exit fee'} · sample prices` : 'USD estimate unavailable';
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
  $('available-line').textContent = `Demo balance: ${redeem ? fmt(sample.wallet) + ' wallet' : fmt(sample.staked) + ' staked'} LP`;
  $('exit-fee-label').textContent = redeem ? 'Redemption fee · 0%' : 'Staking exit fee · 10%';
  $('exit-split-row').hidden = redeem;
  $('redeem-eth-row').hidden = false;
  $('exit-net-label').textContent = 'FUEL returned';
  $('withdraw-note').textContent = redeem ? 'Sample ratio: 1 receipt = 500,000 FUEL + 0.005 ETH. Real output changes with pool price. WETH is unwrapped automatically; no token sale or redemption fee.' : 'Unstake and redeem principal in one transaction. After the 10% staking exit fee, net receipts return FUEL + ETH. Earned rewards stay in Claim Rewards.';
  $('exit').innerHTML = `${redeem ? 'Review sample redemption' : 'Review sample unstake'} <svg aria-hidden="true"><use href="#i-arrow"/></svg>`;
  exitUpdate();
}
$('unstake-tab').onclick = () => withdrawalMode(false);
$('redeem-tab').onclick = () => withdrawalMode(true);
$('withdraw').addEventListener('input', exitUpdate);
$('exit').onclick = () => {
  const q = exitUpdate();
  if (redeem) show('Your sample redemption', `Redeem ${fmt(q.gross)} wallet receipts for an illustrative ${fmt(q.net * sample.fuelPerReceipt)} FUEL + ${fmt(q.net * sample.ethPerReceipt)} ETH.\n\nProtocol redemption fee: 0%. The WETH portion is automatically unwrapped into native ETH. Gas still applies.\n\nReal outputs depend on pool price and your minimum amounts. This demo does not change sample balances.`);
  else show('Your sample unstake', `Unstake ${fmt(q.gross)} receipts.\n\nExit fee: ${fmt(q.fee)} LP — ${fmt(q.stakers)} to eligible stakers and ${fmt(q.dev)} to development.\n\n${fmt(q.net)} net receipts are redeemed for an illustrative ${fmt(q.net * sample.fuelPerReceipt)} FUEL + ${fmt(q.net * sample.ethPerReceipt)} native ETH in the same transaction. No extra redemption fee.\n\nEarned rewards stay in Claim Rewards for a separate claim, even after a full unstake. This demo does not change sample balances.`);
};
$('claim').onclick = () => show('Your sample reward claim', `${fmt(sample.rewards)} sample reward receipts → ${fmt(sample.rewards * sample.fuelPerReceipt)} FUEL + ${fmt(sample.rewards * sample.ethPerReceipt)} native ETH. Estimated backing: ${usd(receiptValue(sample.rewards))} USD at sample prices. WETH is automatically unwrapped. No protocol claim or redemption fee; gas still applies. Sample balances remain unchanged.`);
$('compound-action').onclick = () => show('Your sample compound', `2 new liquidity units: 1 issues reward receipts for eligible stakers, and 1 is retained as protocol-owned liquidity.\n\nTotal liquidity would rise from ${fmt(sample.staked + sample.wallet + sample.rewards + 1)} to ${fmt(sample.staked + sample.wallet + sample.rewards + 3)}. Unmatched trading fees carry forward. No balancing swaps are made. This demo does not change sample balances.`);
$('how-it-works').onclick = () => show('Inside the Furnace', '1. Add ETH, or FUEL + ETH, to the shared full-range V3 vault. Existing position NFTs are not accepted.\n\n2. Receive transferable LP receipts. Hold them, or stake them to participate in rewards. Staking entry and exit each take 10%: 7% for eligible stakers and 3% for development. If none are eligible, the reward portion goes to the protocol reserve.\n\n3. Unstake and redeem principal for FUEL + native ETH in one transaction. Accrued rewards remain separately claimable, even after a full exit. Claim Rewards also redeems reward receipts for FUEL + ETH. Wallet receipt redemption remains available. No extra claim or redemption fee. Outputs change with pool price; gas still applies.');
document.querySelectorAll('.close').forEach(button => button.onclick = () => $('modal').close());
update(); withdrawalMode(false); walletUpdate();
