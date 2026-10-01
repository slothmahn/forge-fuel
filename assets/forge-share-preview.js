// Read-only estimate for a proposed position, independent of wallet connection.
export function estimateForgeShare(proposedPower, existingPower) {
  if (typeof proposedPower !== 'bigint' || proposedPower <= 0n || typeof existingPower !== 'bigint' || existingPower < 0n) return null;
  const units = proposedPower * 1000000n / (existingPower + proposedPower);
  return units === 0n ? '<0.0001%' : `${(Number(units) / 10000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`;
}

export function estimateForgePayout(balance, proposedPower, existingPower) {
  if (typeof balance !== 'bigint' || balance < 0n || typeof proposedPower !== 'bigint' || proposedPower <= 0n || typeof existingPower !== 'bigint' || existingPower < 0n) return null;
  return balance * 9975n / 10000n * proposedPower / (existingPower + proposedPower);
}

export async function readForgePower(contract, block) {
  const options = {blockTag: block.number};
  const next = await contract.nextTokenId(options);
  let total = 0n;
  for (let first = 1n; first < next; first += 20n) {
    const count = Number(next - first > 20n ? 20n : next - first);
    const powers = await Promise.all(Array.from({length: count}, (_, index) =>
      contract.powerAt(first + BigInt(index), block.timestamp, options)));
    total += powers.reduce((sum, power) => sum + power, 0n);
  }
  return total;
}

export function createForgeSharePreview({root, getProposedPower, getPosition, getPools = () => [], getNativeUsd = () => null, nativeSymbol = 'ETH', formatNative = value => String(value)}) {
  const panel = document.createElement('div');
  panel.className = 'forge-share-preview';
  panel.innerHTML = '<span>Estimated pool share after entry</span><strong id="preview-share">Checking…</strong><div class="forge-payout-estimates" aria-label="Estimated payouts from current pool balances"></div><p>Based on this position’s power divided by total current Forge power, including this position. The 8-, 28-, and 88-day pools use power at their deadlines, so final shares can change as positions enter, end, or decay. Payouts use current funding after the 0.25% settlement incentive; future fees, changes in power and USD prices can change the result. Your position must remain eligible at each deadline.</p>';
  root.querySelector('.preview-power').after(panel);
  const value = panel.querySelector('strong');
  const payouts = panel.querySelector('.forge-payout-estimates');
  const rows = [8,28,88].map(days => {
    const row = document.createElement('div');
    row.innerHTML = `<span>${days} Day</span><div><strong></strong><small></small></div>`;
    payouts.append(row);
    return {amount:row.querySelector('strong'), usd:row.querySelector('small')};
  });
  let total = null;
  let status = 'Checking…';
  let version = 0;
  function render() {
    let proposed;
    try { proposed = getProposedPower(); } catch { proposed = null; }
    value.textContent = typeof proposed !== 'bigint' || proposed <= 0n ? 'Check inputs' : total === null ? status : estimateForgeShare(proposed, total);
    const pools = getPools();
    const price = getNativeUsd();
    rows.forEach((row,index) => {
      const amount = total === null ? null : estimateForgePayout(pools[index]?.balance, proposed, total);
      row.amount.textContent = amount === null ? (total === null ? status : 'Unavailable') : `≈ ${formatNative(amount)} ${nativeSymbol}`;
      const usd = amount === null || !(Number.isFinite(price) && price > 0) ? null : Number(amount) / 1e18 * price;
      row.usd.textContent = usd === null ? 'USD reference unavailable' : `≈ ${usd.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:usd > 0 && usd < .01 ? 6 : 2})} USD`;
    });
  }
  async function refresh(block) {
    const request = ++version;
    total = null;
    status = 'Checking…';
    render();
    try {
      const power = await readForgePower(getPosition(), block);
      if (request !== version) return;
      total = power;
    } catch {
      if (request !== version) return;
      status = 'Unavailable · refresh to retry';
    }
    render();
  }
  render();
  return {render, refresh};
}
