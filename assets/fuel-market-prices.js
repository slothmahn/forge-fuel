// Market references only; never used to calculate an on-chain fee.
const memory = new Map();
const MAX_AGE = 15 * 60 * 1000;
export async function loadFuelMarketPrices({chain, pairs, onUpdate, storage = globalThis.localStorage, request = globalThis.fetch, now = Date.now}) {
  const key = `fuel-forge-market-prices:${chain}:1`;
  const quotes = {};
  try {
    let saved = memory.get(key) || {};
    try { saved = {...saved, ...JSON.parse(storage.getItem(key) || '{}')}; } catch {}
    for (const token of Object.keys(pairs)) {
      const quote = saved[token];
      if (quote && quote.price > 0 && quote.native > 0 && Number.isFinite(quote.price) && Number.isFinite(quote.native) && quote.checkedAt <= now() && now() - quote.checkedAt < MAX_AGE) quotes[token] = quote;
    }
  } catch {}
  const emit = (loading, failed = 0) => onUpdate({...quotes}, {loading, failed});
  emit(true);
  let failed = 0;
  await Promise.allSettled(Object.entries(pairs).map(async ([token, address]) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await request(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${address}`, {signal: controller.signal});
      if (!response.ok) throw new Error('Price service unavailable');
      const pair = (await response.json()).pairs?.find(pair => pair.chainId === chain && pair.pairAddress?.toLowerCase() === address.toLowerCase());
      const price = Number(pair?.priceUsd), native = Number(pair?.priceNative);
      if (!(price > 0 && native > 0 && Number.isFinite(price) && Number.isFinite(native))) throw new Error('Pair quote unavailable');
      quotes[token] = {price, native, checkedAt: now()};
      memory.set(key, {...quotes});
      try { storage.setItem(key, JSON.stringify(quotes)); } catch {}
      emit(true);
    } catch { failed++; }
    finally { clearTimeout(timeout); }
  }));
  emit(false, failed);
}
