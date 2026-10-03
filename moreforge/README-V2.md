# MORE Forge V2 interface

The main MORE Forge page is the V2 interface. `legacy.html` preserves the paused-entry V1 application, including current rewards, settlement, Bitcoin conversion, burn pools and the V1 white paper. `deployments.json`, `live.js`, and their V1 modules are unchanged. Do not remove legacy access when V2 opens.

`deployments-v2.json` intentionally contains **no deployment addresses** and has `status: pending` plus `entriesEnabled: false` for both chains. No fork address may be copied into this public file. In this state the builder previews the candidate lock/optional-burn mechanics and explicitly labels planned fee settings. Swap purchases use existing MORE markets; no V1 position function is called by the V2 interface. V2 pool funding is shown as unavailable, not as fabricated balances.

## Activation after a real deployment

Add a verified, separate V2 manifest for each chain: version 2, deployed status, chain ID, owner, MORE/Bitcoin token addresses, position, settlement helper, four vaults, three burners, contract quote/router addresses, deployment block, entry opening time and fixed-UTC launch anchor. Keep the manifest layout used by the fork rehearsal, but use **real deployment receipts**. The UI rejects V1 position/vault/burner/helper reuse, invalid token identities, mismatched wiring or a non-17:00 UTC anchor.

The site requires both `entriesEnabled: true` and an unpaused V2 position contract, as well as the entry opening time, before enabling review. Opening the contract is a separate owner transaction; the public owner deployment page at `deploy/` submits the two rehearsed deployment transactions and gates the third activation transaction on a matching, enabled public V2 manifest. The final anchor should be the next 17:00 UTC after launch, giving first cycles any extra hours between opening and anchor. UTC stays fixed; local Eastern time changes with daylight saving.

## Behavior

- Separate locked principal and optional extra burn, limited to three times principal. Lock-only is supported.
- All arithmetic used for amounts, power, fee bounds and principal decay uses integer base units. Protocol fees are read from V2 once deployed; the pending preview explicitly uses candidate bounds and an existing on-chain MORE quote.
- Exact principal-plus-burn approval. Recheck account, chain, balance, pause and fee after approval; changed fees require a new review. Entry calls the V2 three-argument ABI and simulates before submission.
- Principal withdrawal with maturity, grace and decay dates. Closed NFT records still use `rewardOwner` for past claims; no `ownerOf` call is made for closed records during discovery.
- Current-pool estimates include grace/decay and exact deadline closure behavior. Builder estimates use currently funded balances only, without adding speculative entry contributions.
- Bitcoin is bought during entry. V2 has no separate conversion button. The V1 conversion UI remains on `legacy.html`.
- The existing per-token buy-and-burn controls and four-pool settlement/claim interface are retained with V2 recipients.
- `v2-guide.html` describes the candidate and distinguishes it from V1.

## Validation

`node scripts/tests/moreforge-v2-model.mjs` checks input limits, exact power examples, grace/decay, deadline boundaries, fee floors/caps and closed-position reward discovery. The existing `moreforge-chain-data.mjs` regression test remains passing.

`moreforge-v2-browser.cjs` tests 320/390/768/1440-pixel layouts on both chains, pending-entry guards, the mobile chain menu, V1 access and inactive future chains. With isolated Anvil V2 fixtures, it purchases actual MORE via the configured liquidity route, approves exactly principal plus burn, verifies the three entry arguments and immediate Bitcoin funding, and withdraws principal through the UI. All wallet requests are redirected to loopback forks; no real wallet is signed or public transaction sent. It is a simulated EIP-1193 browser wallet, not a mobile Rabby app test.

Local fixtures are generated with `more-forge/v2/rehearse-batch.mjs <rh|pls> --keep-deployment-state` from the enclosing workspace. Serve this repository on loopback port 8769. The browser test intercepts deployment manifests in memory; production manifests remain pending throughout.

## Hosted owner deployment

`https://thefuelforge.com/moreforge/deploy/` is a static, mobile-compatible signing page. It prefers Rabby, restricts signing to the confirmed owner and selected chain, prepares a fresh nonce-bound helper commitment and next-17:00-UTC cycle anchor in the browser, and keeps progress in local storage. No fork address or rehearsal nonce is published. `artifacts.json` contains the pinned compiled templates, ABIs and immutable runtime masks; `chains.json` contains the reviewed chain inputs. Neither includes keys or credentials.

The first two buttons request wallet confirmations for the helper and suite, using the rehearsed gas limits. Before resuming, the plan is reconstructed from the compiled templates and checked for exact equality. Confirmed receipts, calldata, sender/nonces, predicted addresses, runtime bytes (masking immutable slots), ownership, fee settings, schedule and recipient/adapter wiring are verified. The setup starts paused. The third confirmation remains disabled until `deployments-v2.json` lists this verified suite with `entriesEnabled: true` and the V2 interface is available. Publish that manifest and the revised white paper before opening.

After setup, the user copies or downloads a deployment report for independent verification and publication. Public page actions only request signing through the connected wallet; no server holds a wallet key. Refresh-and-resume uses the same browser storage. Do not clear site storage during deployment.

`node scripts/tests/moreforge-v2-deploy.cjs` rehearsed all three wallet requests on refreshed isolated RH/PLS forks at a 390-pixel viewport, including refresh after the helper, exact suite deployment, bytecode/wiring checks, the website activation gate and rejection of corrupted saved calldata. Actual mobile Rabby signing remains to be performed by the owner.

## PulseChain wallet RPC compatibility

The 61,828-byte setup is an ordinary call to the confirmed helper. PulseChain Erigon 2.4.1 rejects this payload because its transaction pool applies the 49,152-byte initcode limit without checking whether the transaction creates a contract. Anvil fork execution does not exercise that public transaction-pool check. PublicNode’s endpoint, `https://pulsechain-rpc.publicnode.com`, reports Geth v3.2.0 and chain 369. The owner must change the wallet’s custom PulseChain RPC; changing the site’s read RPC alone cannot change wallet broadcasting.

The signing page displays these instructions on PulseChain, checks the wallet client version before setup, blocks the known affected client and explains initcode-size errors. Existing confirmed helpers and committed plans are preserved. The signed setup explicitly includes its destination and chain ID. A missing client-version response is reported; it cannot prove compatibility.

`MORE_CONFIRMED_PLAN=/path/to/verified-plan.json node scripts/tests/moreforge-v2-rpc-compat.cjs` is a targeted regression for the confirmed PulseChain helper at `0x2700F271082De265bDe9A837851Baa136ce6B284`. Serve the repository on port 8769. It reads the helper and chain state through PublicNode, resumes the saved plan, rejects the affected client and intercepts the Geth signing request to verify unchanged destination, calldata and nonce. It never broadcasts a public transaction. Actual Rabby retry remains an owner action.
