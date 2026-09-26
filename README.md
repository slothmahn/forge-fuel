# Fuel Forge mainnet site

Static GitHub Pages build for `https://slothmahn.github.io/forge-fuel/`.

The root `index.html` and `mainnet.html` serve the same mainnet app. The app reads `mainnet-deployment.json`, then verifies the listed contracts and their wiring on Robinhood Chain before enabling wallet actions. The 1:00 PM Eastern launch timestamp and contract addresses come from 28 successful deployment receipts.

This repository intentionally contains no private keys or wallet credentials. The prior testnet remains at `https://slothmahn.github.io/forge-test/`.
