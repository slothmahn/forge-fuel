// Restore wallet permission, never a cached address or signing authority.
const providers = new Map();
const storageKey = 'forge-wallet-provider';
let preferred = '';
try { preferred = localStorage.getItem(storageKey) || ''; } catch {}
function add(provider, info = {}) {
  if (typeof provider?.request !== 'function') return;
  providers.set(provider, {...providers.get(provider), ...info});
}
window.addEventListener('eip6963:announceProvider', event => add(event.detail?.provider, event.detail?.info));
function collect() {
  add(window.ethereum); add(window.rabby, {rdns: 'io.rabby'});
  for (const provider of window.ethereum?.providers || []) add(provider);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}
export function rememberWalletProvider(provider) {
  const id = providers.get(provider)?.rdns;
  if (id) try { localStorage.setItem(storageKey, id); } catch {}
}
export async function findWalletProvider(authorizedOnly = false) {
  collect();
  // Allow EIP-6963 wallets and mobile wallet injection to announce themselves.
  await new Promise(resolve => setTimeout(resolve, providers.size ? 150 : 1200));
  collect();
  const candidates = [...providers.keys()].sort((a, b) => {
    const score = p => (preferred && providers.get(p)?.rdns === preferred ? 4 : 0) +
      (p.isRabby || providers.get(p)?.rdns === 'io.rabby' ? 2 : 0) + (p === window.ethereum ? 1 : 0);
    return score(b) - score(a);
  });
  for (const provider of candidates) {
    try {
      const accounts = await provider.request({method: 'eth_accounts'});
      if (Array.isArray(accounts) && accounts[0]) return {provider, accounts};
    } catch { /* A locked/unavailable wallet must not block public data. */ }
  }
  return authorizedOnly ? null : (candidates[0] ? {provider: candidates[0], accounts: []} : null);
}
