// Display-only reference from the existing MORE/WETH V3 pool (both tokens use 18 decimals).
const MORE = '0xbeef3bb9da340ebdf0f5bae2e85368140d7d85d0';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export function moreUsdFromPool({token0, token1, sqrtPriceX96, liquidity, ethUsd}) {
  const first = token0.toLowerCase(), second = token1.toLowerCase();
  if (!((first === MORE && second === WETH) || (first === WETH && second === MORE))) throw Error('Unexpected pool tokens');
  if (!(liquidity > 0n && sqrtPriceX96 > 0n && ethUsd > 0 && Number.isFinite(ethUsd))) throw Error('Pool reference unavailable');
  const ratio = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  const price = (first === MORE ? ratio : 1 / ratio) * ethUsd;
  if (!(price > 0 && Number.isFinite(price))) throw Error('Invalid pool reference');
  return price;
}
