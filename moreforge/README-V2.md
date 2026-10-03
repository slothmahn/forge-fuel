# MORE Forge V2 interface

The main MORE Forge page is the V2 interface. `legacy.html` preserves the paused-entry V1 application, including current rewards, settlement, Bitcoin conversion, burn pools and the V1 white paper. `deployments.json`, `live.js`, and their V1 modules are unchanged. Do not remove legacy access when V2 opens.

`deployments-v2.json` contains the independently verified Robinhood V2 deployment. Its website activation flag is ready, while the contract remains paused until the owner approves opening. PulseChain remains `status: pending` with `entriesEnabled: false`; no unconfirmed suite addresses are published. No fork address may be copied into this public file. In this state the builder previews the candidate lock/optional-burn mechanics and explicitly labels planned fee settings. Swap purchases use existing MORE markets; no V1 position function is called by the V2 interface. V2 pool funding is shown as unavailable, not as fabricated balances.

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

## Robinhood deployment verified October 3, 2026

Helper transaction: `0xcb181709370a2ff908de3ad9e55cbfe147408c2a04a9859e57c155cd91ec1cf3`. Suite transaction: `0xad1ba7c794a54358693be79859af54ef527dc9585418e38527df0c8cfd8c76d3`, block 79018317. Both succeeded. Reconstruction from the actual helper nonce and block time produced the same initcode, full setup calldata and plan hash. Runtime bytes for the helper and all 19 suite contracts matched pinned artifacts, with immutable slots masked; immutable identities and wiring were checked separately. Ownership, fee percentage/bounds, four vaults, adapters, fee recipients and 17:00 UTC cycle anchor all passed. Entry pause was true.

The owner opening transaction is still separate. `entriesEnabled: true` is the website readiness gate, not evidence that the contract has opened. The live application also reads the contract pause before allowing entry. `MORE_Forge_White_Paper_V2.0.pdf` documents V2 mechanics and verified Robinhood addresses; PulseChain is explicitly pending. V1 application, manifests and white paper are retained.

A read-only browser check against the real Robinhood deployment confirmed pool loading, the on-chain paused-entry guard, 320/390/1440-pixel layouts, the white-paper link and successful saved-plan verification with the owner opening gate ready. No transaction was requested or broadcast during this check. The six-page PDF was rendered and visually inspected; text extraction confirmed all six pages and the four first deadline dates.

## PulseChain compatibility recovery (October 3, 2026)

The initial PulseChain helper and suite transactions succeeded (`0x6d6e9462b55f0d84ceebf8a4246a88ca351f2d58fa2bcf4885c852d3dc6ddaac` and `0xdb7272b4e5ec33daefedd4054b63dccc37f7b8eea4b95e937ed90138397ba3ef`, block 27702339). Bytecode, commitment, ownership and wiring matched, but a live `name()` call failed with `invalid opcode: MCOPY` on both official Erigon and PublicNode Geth endpoints. The initial suite is incompatible with PulseChain and must remain paused. It is not published as an enabled V2 deployment. Cancun Anvil execution did not catch this chain compatibility error.

The recovery package `deploy/artifacts-pulsechain-shanghai.json` is compiled with Solidity 0.8.30, optimizer 200, EVM Shanghai. The original Robinhood package remains unchanged. PulseChain alone uses the replacement package and `more-v2-launch-2-pls-<owner>` storage key; the old saved report is preserved at its original key. A new helper commitment and complete suite are necessary because the original helper is executed and the suite is not upgradeable. PublicNode remains required for the approximately 62 KB setup call due to the separately identified Erigon transaction-pool size check.

The replacement batch passed on an isolated PulseChain fork running Shanghai: helper 712,653 gas; setup 19,027,483 gas; calldata 61,892 bytes. Name, required fee, pause, ownership and wiring checks passed. Real liquidity acquisition, principal-plus-burn entry, immediate Bitcoin conversion, all three burns, full principal withdrawal, four-pool settlement and claims passed. All 13 templates were disassembled (excluding metadata and PUSH data) to verify no executable MCOPY. The profile test run had 38 passed, 0 failed, 2 fork-environment tests skipped; the dedicated Shanghai fork rehearsal independently covers actual liquidity routes.

Before publishing a replacement manifest, verify its new real receipts and runtime, plus successful name and required-fee calls. Publish the revised white paper with replacement addresses before the owner opens entries. The original V2.0 white paper continues to mark PulseChain pending; the unpublished dual-chain draft must not be used for the incompatible suite.

The corrected mobile deployment test on the Shanghai fork passed all three simulated confirmations, refresh/resume, exact suite verification, the website activation gate, opening and tampered-plan rejection. Read-only live checks confirmed the incompatible original PulseChain suite remained paused with nextTokenId 1 and zero locked MORE. No replacement transaction has been submitted publicly.

### Owner position fee controls

The Build power tab exposes Forge Position Fee settings only when the connected wallet matches the current on-chain position owner. Percentage (0.01–100%), native minimum/maximum, and bounds toggle are saved together via `setFeePolicy` after a review. Saving rechecks ownership and the reviewed prior policy through the signer; changed policies require a new review. Account/chain changes or unavailable data hide the panel and invalidate its review. Confirmed updates refresh entry quotes. No fee values are changed by publishing this UI. Pending chains expose no owner controls until their verified V2 manifest is connected.

Validation: `scripts/tests/moreforge-owner-fees.cjs` covers input limits, owner visibility, exact transaction arguments, stale policy rejection, ETH/PLS units, mobile/desktop overflow, and review invalidation. A read-only browser check also loaded Robinhood’s live owner and fee policy without requesting a transaction.
