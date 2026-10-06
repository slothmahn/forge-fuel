// Move the live, already-bound controls rather than cloning wallet actions or IDs.
export function integrateRewardNfts() {
  const app = document.querySelector('#app');
  const rewards = app?.querySelector('#rewards');
  const collection = app?.querySelector('.nft-layout');
  const claims = rewards?.querySelector('.claim-card');
  if (!rewards || !collection || !claims) return;
  const pair = document.createElement('div');
  pair.className = 'reward-wallet-layout';
  rewards.append(pair);
  pair.append(claims, collection);
  collection.removeAttribute('data-view');
  collection.hidden = false;
  collection.classList.add('reward-wallet-nfts');
  app.querySelector('[data-site-tab="nfts"]')?.remove();
  const title = collection.querySelector('#positions h2');
  if (title) title.textContent = 'Your Stakes';
  const foundryTitle = collection.querySelector('#foundry-collection h2');
  if (foundryTitle) foundryTitle.textContent = 'Your Foundry NFTs';
  const eyebrow = collection.querySelector('#positions .eyebrow');
  if (eyebrow) eyebrow.textContent = 'YOUR STAKES';
  // Existing NFT bookmarks continue to open the same controls within Rewards.
  function routeLegacyNfts() {
    if (location.hash === '#positions' || location.hash === '#foundry-collection') location.replace(location.pathname + location.search + '#rewards');
  }
  window.addEventListener('hashchange', routeLegacyNfts);
  routeLegacyNfts();
}
