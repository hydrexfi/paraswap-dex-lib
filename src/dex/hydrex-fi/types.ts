import { Address } from '../../types';

export type HydrexFiData = {
  path: {
    tokenIn: Address;
    tokenOut: Address;
    deployer: Address;
  }[];
  feeOnTransfer: boolean;
  isApproved?: boolean;
};

export type HydrexDataWithFee = {
  tokenIn: Address;
  tokenOut: Address;
};

export type DexParams = {
  factory: Address;
  quoter: Address;
  router: Address;
  subgraphURL: string;
  chunksCount: number;
};

export type Pool = {
  poolAddress: Address;
  token0: Address;
  token1: Address;
  deployer: string;
  tvlUSD: number;
};

export type FactoryState = Record<string, never>;

export type PoolState = {
  // Algebra Integral pool state
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
  // Optional pool metadata
  token0?: Address;
  token1?: Address;
  fee?: number;
};

export enum HydrexFiFunctions {
  exactInput = 'exactInput',
  exactOutput = 'exactOutput',
  exactInputWithFeeToken = 'exactInputSingleSupportingFeeOnTransferTokens',
}
