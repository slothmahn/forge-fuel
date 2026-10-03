# Fuel Forge mainnet site

Static GitHub Pages build for `https://slothmahn.github.io/forge-fuel/`.

The root `index.html` and `mainnet.html` serve the same mainnet app. The app reads `mainnet-deployment.json`, then verifies the listed contracts and their wiring on Robinhood Chain before enabling wallet actions. The 1:00 PM Eastern launch timestamp and contract addresses come from 28 successful deployment receipts.

This repository intentionally contains no private keys or wallet credentials. The prior testnet remains at `https://slothmahn.github.io/forge-test/`.

## September 26 visual refresh

`index.html` and `mainnet.html` load `assets/forge-refresh.js` and
`assets/forge-refresh.css`. The presentation entry imports the unchanged
`mainnet-white-paper-v1.js` application. It preserves the wallet provider,
contract manifest, event handlers, validation, and transaction logic; adds a
hero, live-derived power multiplier, term presets, and responsive styling.

When rebuilding the underlying app, preserve this presentation entry and update
its import to the new application bundle. Both HTML entry points must retain the
refresh stylesheet after the application stylesheet. No demo balances or
preview transactions are included in this deployment.

Validation: desktop and 390px mobile layout, matching amount/Max dimensions,
1,000-day preset and 5× preview, Forge/Foundry and section navigation, live
manifest verification, pool/burn/price reads, and disconnected transaction
controls. No live wallet transaction is submitted for visual regression checks.

## Shared chain loading

The Robinhood and PulseChain applications use `assets/forge-chain-reads.js` for
parallel pool, portfolio, and reward reads. Deployment checks still validate
every original contract, token, owner, routing, and schedule field. Independent
verification groups run together, NFT scans use bounded batches, and refreshes
are serialized so a wallet connection or confirmed transaction gets a fresh run.
Burn checks and owner settings no longer delay the payout cards or fee previews.

Validation: `node scripts/tests/fuel-chain-loading.mjs` compares pool, portfolio,
and reward results against the previous application and rejects each corrupted
deployment field. `node scripts/tests/fuel-loading-browser.cjs` compares both
versions against live read-only RPC data through a local server on port 8765.
Set `FUEL_LIVE=1` to smoke-test the published applications; no transactions are
signed or sent. Ethereum and Avalanche previews have no deployed contract reads,
and Fuel Furnace already batches its market/pool reads concurrently.
