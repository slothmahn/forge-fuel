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

export function estimateTermPayout(perCycle, termDays, cycleDays) {
  if (typeof perCycle !== 'bigint' || perCycle < 0n || !Number.isInteger(termDays) || termDays < 8 || termDays > 1000 || ![8,28,88].includes(cycleDays)) return null;
  const cycles = Math.floor(termDays / cycleDays);
  return {cycles, amount:perCycle * BigInt(cycles)};
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

export function createForgeSharePreview({root, getProposedPower, getPosition, getPools = () => [], getNativeUsd = () => null, getTermDays = () => null, nativeSymbol = 'ETH', formatNative = value => String(value)}) {
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
  const termPanel = document.createElement('section');
  termPanel.className = 'forge-term-estimate';
  termPanel.setAttribute('aria-label','Illustrative rewards over selected term');
  termPanel.innerHTML = '<h4>Over your selected term</h4><p class="term-assumption">If today’s funding per cycle and your share stayed the same</p><div class="forge-payout-estimates term-rows"></div><div class="term-total"><span>Illustrative total rewards</span><strong></strong><small></small></div><p class="term-note">Assumes every future cycle receives the same funding as today’s current cycle. Counts complete cycles in your term; actual closing dates can change the count. No compounding. Rewards only, before entry fees and gas. This is a scenario, not a forecast.</p>';
  panel.after(termPanel);
  const termHeading = termPanel.querySelector('h4');
  const termRows = [8,28,88].map(days => {
    const row = document.createElement('div');
    row.innerHTML = `<span>${days} Day<small class="term-count"></small></span><div><strong></strong><small class="term-usd"></small></div>`;
    termPanel.querySelector('.term-rows').append(row);
    return {days,count:row.querySelector('.term-count'),amount:row.querySelector('strong'),usd:row.querySelector('.term-usd')};
  });
  function usdText(amount, price) {
    const usd = amount === null || !(Number.isFinite(price) && price > 0) ? null : Number(amount) / 1e18 * price;
    return usd === null ? 'USD reference unavailable' : `≈ ${usd.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:usd > 0 && usd < .01 ? 6 : 2})} USD`;
  }
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
      row.usd.textContent = usdText(amount,price);
    });
    const termDays = getTermDays();
    termHeading.textContent = Number.isInteger(termDays) && termDays >= 8 && termDays <= 1000 ? `Over your ${termDays.toLocaleString()}-day term` : 'Over your selected term';
    let combined = 0n;
    let complete = true;
    termRows.forEach((row,index) => {
      const perCycle = total === null ? null : estimateForgePayout(pools[index]?.balance,proposed,total);
      const scenario = estimateTermPayout(perCycle,termDays,row.days);
      row.count.textContent = scenario ? `${scenario.cycles} complete ${scenario.cycles===1?'cycle':'cycles'}` : 'Check term / data';
      row.amount.textContent = scenario ? `≈ ${formatNative(scenario.amount)} ${nativeSymbol}` : 'Unavailable';
      row.usd.textContent = usdText(scenario?.amount ?? null,price);
      if (scenario) combined += scenario.amount; else complete = false;
    });
    termPanel.querySelector('.term-total strong').textContent = complete ? `≈ ${formatNative(combined)} ${nativeSymbol}` : 'Unavailable';
    termPanel.querySelector('.term-total small').textContent = usdText(complete?combined:null,price);
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
