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
