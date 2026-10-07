import {AbiCoder,Contract,Interface,getAddress,isAddress} from './vendor/ethers-6.15.0.js';

// Pin the already-tested main MORE routes. Purchases never call Forge or its burn adapters.
export const routes={
  rh:{chainId:4663,unit:'ETH',wrapped:'0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73',more:'0xc0F1A40512114b25cc1F30b5DF0bb48691405555',router:'0x204FAca1764B154221e35c0d20aBb3c525710498',quoter:'0x8dc178efb8111bb0973dd9d722ebeff267c98f94',hook:'0xD2F759A1Cf13c30127C551c3aEe04629Aea200c0'},
  eth:{chainId:1,unit:'ETH',wrapped:'0x0000000000000000000000000000000000000000',more:'0xbEEf3bB9dA340EbdF0f5bae2E85368140d7D85D0',router:'0x23617e59A5925b2A4Bf75d73ff6711cD0b29De85',quoter:'0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',hook:'0x0000000000000000000000000000000000000000'},
  avax:{chainId:43114,unit:'AVAX',wrapped:'0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',more:'0xb2722d5f1b8F3E19bf026c62C47C1C7BC1CDB04E',router:'0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',quoter:'0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F',fee:10000},
  pls:{chainId:369,unit:'PLS',wrapped:'0xA1077a294dDE1B09bB078844df40758a5D0f9a27',more:'0xbEEf3bB9dA340EbdF0f5bae2E85368140d7D85D0',router:'0x165C3410fC91EF562C50559f7d2289fEbed552d9',pair:'0x3D3B080A1Ec1AFc121a27AE4cBad17A14E80f7B5'}
};
const keyType='tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)';
const quoterAbi=[`function quoteExactOutputSingle(tuple(${keyType} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256 amountIn,uint256 gasEstimate)`,`function quoteExactInputSingle(tuple(${keyType} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256 amountOut,uint256 gasEstimate)`];
const v2=new Interface(['function getAmountsIn(uint256,address[]) view returns(uint256[])','function getAmountsOut(uint256,address[]) view returns(uint256[])','function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])']);
const v3=new Interface(['function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns(uint256)','function multicall(uint256,bytes[]) payable returns(bytes[])','function refundETH() payable']);
const v3Quoter=['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns(uint256,uint160,uint32,uint256)','function quoteExactOutputSingle((address tokenIn,address tokenOut,uint256 amount,uint24 fee,uint160 sqrtPriceLimitX96)) returns(uint256,uint160,uint32,uint256)'];
const universal=new Interface(['function execute(bytes,bytes[],uint256) payable']);
const abi=AbiCoder.defaultAbiCoder();
function route(key){const r=routes[key];if(!r)throw Error('Buying MORE is available on Robinhood and PulseChain.');return r;}
const poolKey=r=>[r.wrapped,r.more,10000,200,r.hook];
export function minimumReceived(out,bps){if(out<=0n||!Number.isInteger(bps)||bps<1||bps>500)throw Error('Choose slippage from 0.01% to 5%.');const min=out*BigInt(10000-bps)/10000n;if(min===0n)throw Error('Purchase amount is too small.');return min;}
export async function quotePurchase(key,reader,amount){
  const r=route(key);if(amount<=0n||['rh','eth'].includes(key)&&amount>=2n**128n)throw Error('Enter a valid purchase amount.');
  if(key==='avax'){const q=new Contract(r.quoter,v3Quoter,reader);const [out]=await q.quoteExactInputSingle.staticCall([r.wrapped,r.more,amount,r.fee,0]);if(out<=0n)throw Error('No MORE liquidity available.');return out;}
  if(key==='pls'){const router=new Contract(r.router,v2,reader);const amounts=await router.getAmountsOut(amount,[r.wrapped,r.more]);if(amounts[1]<=0n)throw Error('No MORE liquidity available.');return amounts[1];}
  const q=new Contract(r.quoter,quoterAbi,reader);const [out]=await q.quoteExactInputSingle.staticCall([poolKey(r),true,amount,'0x']);if(out<=0n)throw Error('No MORE liquidity available.');return out;
}
// Reverse quotes estimate cost; execution retains the reviewed exact-input swap.
export async function quotePurchaseForOutput(key,reader,output){
  const r=route(key);if(output<=0n||['rh','eth'].includes(key)&&output>=2n**128n)throw Error('Enter a valid MORE amount.');
  let amount;
  if(key==='avax'){const q=new Contract(r.quoter,v3Quoter,reader);[amount]=await q.quoteExactOutputSingle.staticCall([r.wrapped,r.more,output,r.fee,0]);}
  else if(key==='pls'){const router=new Contract(r.router,v2,reader);const amounts=await router.getAmountsIn(output,[r.wrapped,r.more]);amount=amounts[0];}
  else{const q=new Contract(r.quoter,quoterAbi,reader);[amount]=await q.quoteExactOutputSingle.staticCall([poolKey(r),true,output,'0x']);}
  if(amount<=0n)throw Error('No MORE liquidity available.');return amount;
}
export function purchaseTransaction(key,amount,min,recipient,deadline){
  const r=route(key);if(amount<=0n||min<=0n||!isAddress(recipient)||/^0x0{40}$/i.test(recipient)||!Number.isSafeInteger(deadline)||deadline<=0)throw Error('Invalid purchase.');
  let data;if(key==='avax'){const swap=v3.encodeFunctionData('exactInputSingle',[[r.wrapped,r.more,r.fee,getAddress(recipient),amount,min,0]]);data=v3.encodeFunctionData('multicall',[deadline,[swap,v3.encodeFunctionData('refundETH')]]);}
  else if(key==='pls')data=v2.encodeFunctionData('swapExactETHForTokens',[min,[r.wrapped,r.more],getAddress(recipient),deadline]);
  else if(key==='eth'){
    if(amount>=2n**128n||min>=2n**128n)throw Error('Purchase amount is too large.');
    const swap=abi.encode([`tuple(${keyType} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData)`],[[poolKey(r),true,amount,min,0,'0x']]);
    const settle=abi.encode(['address','uint256'],[r.wrapped,amount]);
    const take=abi.encode(['address','address','uint256'],[r.more,getAddress(recipient),0]);
    const actions=abi.encode(['bytes','bytes[]'],['0x060c0e',[swap,settle,take]]);
    const refund=abi.encode(['address','address','uint256'],[r.wrapped,getAddress(recipient),0]);
    data=universal.encodeFunctionData('execute',['0x1004',[actions,refund],deadline]);
  }
  else{
    if(amount>=2n**128n||min>=2n**128n)throw Error('Purchase amount is too large.');
    // WRAP_ETH pays into the router. SETTLE pays from that balance, never Permit2.
    // TAKE explicitly sends the entire MORE credit to the reviewed wallet.
    const wrap=abi.encode(['address','uint256'],['0x0000000000000000000000000000000000000002',amount]);
    const swap=abi.encode([`tuple(${keyType} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData)`],[[poolKey(r),true,amount,min,0,'0x']]);
    const settle=abi.encode(['address','uint256','bool'],[r.wrapped,amount,false]);
    const take=abi.encode(['address','address','uint256'],[r.more,getAddress(recipient),0]);
    const actions=abi.encode(['bytes','bytes[]'],['0x060b0e',[swap,settle,take]]);
    data=universal.encodeFunctionData('execute',['0x0b10',[wrap,actions],deadline]);
  }
  return {to:r.router,data,value:amount};
}
export function receivedMore(key,receipt,recipient){
  const r=route(key),token=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)']);let amount=0n;
  for(const log of receipt.logs||[]){if(log.address.toLowerCase()!==r.more.toLowerCase())continue;try{const event=token.parseLog(log);if(event?.name==='Transfer'&&event.args.to.toLowerCase()===recipient.toLowerCase())amount+=event.args.value;}catch{}}
  return amount;
}
