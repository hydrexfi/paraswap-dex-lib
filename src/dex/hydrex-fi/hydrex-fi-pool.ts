import { Interface } from '@ethersproject/abi';
import { DeepReadonly } from 'ts-essentials';
import { Log, Logger } from '../../types';
import { catchParseLogError } from '../../utils';
import { StatefulEventSubscriber } from '../../stateful-event-subscriber';
import { IDexHelper } from '../../dex-helper/idex-helper';
import { PoolState } from './types';
import AlgebraPoolABI from '../../abi/algebra/AlgebraPool-v1_9.abi.json';

export class HydrexFiEventPool extends StatefulEventSubscriber<PoolState> {
  handlers: {
    [event: string]: (
      event: any,
      state: DeepReadonly<PoolState>,
      log: Readonly<Log>,
    ) => DeepReadonly<PoolState> | null;
  } = {};

  logDecoder: (log: Log) => any;

  addressesSubscribed: string[];

  constructor(
    readonly parentName: string,
    protected network: number,
    protected dexHelper: IDexHelper,
    logger: Logger,
    protected hydrexFiIface = new Interface(AlgebraPoolABI),
  ) {
    super(parentName, 'HydrexFi Pool', dexHelper, logger);

    this.logDecoder = (log: Log) => this.hydrexFiIface.parseLog(log);
    this.addressesSubscribed = [
      '0x82dbe18346a8656dbb5e76f74bf3ae279cc16b29', // WETH/USDC pool ($283K TVL)
      '0x3f9b863ef4b295d6ba370215bcca3785fcc44f44', // WETH/cbBTC pool ($401K TVL)
      '0xd604cf300a4ae4345426df42ffb296aa35b4bef2', // DAI/USDC pool ($206K TVL)
    ];

    // Set up Algebra event handlers
    this.handlers['Swap'] = this.handleSwap.bind(this);
    this.handlers['Mint'] = this.handleMint.bind(this);
    this.handlers['Burn'] = this.handleBurn.bind(this);
    this.handlers['Collect'] = this.handleCollect.bind(this);
  }

  /**
   * The function is called every time any of the subscribed
   * addresses release log. The function accepts the current
   * state, updates the state according to the log, and returns
   * the updated state.
   * @param state - Current state of event subscriber
   * @param log - Log released by one of the subscribed addresses
   * @returns Updates state of the event subscriber after the log
   */
  protected processLog(
    state: DeepReadonly<PoolState>,
    log: Readonly<Log>,
  ): DeepReadonly<PoolState> | null {
    try {
      const event = this.logDecoder(log);
      if (event.name in this.handlers) {
        return this.handlers[event.name](event, state, log);
      }
    } catch (e) {
      catchParseLogError(e, this.logger);
    }

    return null;
  }

  /**
   * The function generates state using on-chain calls. This
   * function is called to regenerate state if the event based
   * system fails to fetch events and the local state is no
   * more correct.
   * @param blockNumber - Blocknumber for which the state should
   * should be generated
   * @returns state of the event subscriber at blocknumber
   */
  async generateState(blockNumber: number): Promise<DeepReadonly<PoolState>> {
    
    if (this.addressesSubscribed.length === 0) {
      return {
        sqrtPriceX96: 0n,
        liquidity: 0n,
        tick: 0,
        feeGrowthGlobal0X128: 0n,
        feeGrowthGlobal1X128: 0n,
      };
    }

    try {
      // Use the first pool address for state generation
      const poolAddress = this.addressesSubscribed[0];
      const calldata = [
        {
          target: poolAddress,
          callData: this.hydrexFiIface.encodeFunctionData('globalState'),
        },
        {
          target: poolAddress,
          callData: this.hydrexFiIface.encodeFunctionData('liquidity'),
        },
      ];

      const { returnData } = await this.dexHelper.multiContract.methods
        .aggregate(calldata)
        .call({}, blockNumber);

      const globalStateData = this.hydrexFiIface.decodeFunctionResult('globalState', returnData[0]);
      const liquidityData = this.hydrexFiIface.decodeFunctionResult('liquidity', returnData[1]);

      return {
        sqrtPriceX96: BigInt(globalStateData.sqrtPriceX96?.toString() || '0'),
        liquidity: BigInt(liquidityData[0]?.toString() || '0'),
        tick: Number(globalStateData.tick || 0),
        feeGrowthGlobal0X128: BigInt(globalStateData.feeGrowthGlobal0X128?.toString() || '0'),
        feeGrowthGlobal1X128: BigInt(globalStateData.feeGrowthGlobal1X128?.toString() || '0'),
      };
    } catch (error) {
      // Return default state if on-chain call fails
      return {
        sqrtPriceX96: 0n,
        liquidity: 0n,
        tick: 0,
        feeGrowthGlobal0X128: 0n,
        feeGrowthGlobal1X128: 0n,
      };
    }
  }

  // Algebra pool event handlers
  handleSwap(
    event: any,
    state: DeepReadonly<PoolState>,
    log: Readonly<Log>,
  ): DeepReadonly<PoolState> | null {
    try {
      return {
        ...state,
        sqrtPriceX96: BigInt(event.args.sqrtPriceX96?.toString() || state.sqrtPriceX96),
        tick: Number(event.args.tick || state.tick),
      };
    } catch (error) {
      return state;
    }
  }

  handleMint(
    event: any,
    state: DeepReadonly<PoolState>,
    log: Readonly<Log>,
  ): DeepReadonly<PoolState> | null {
    try {
      const liquidityDelta = BigInt(event.args.liquidity?.toString() || '0');
      return {
        ...state,
        liquidity: state.liquidity + liquidityDelta,
      };
    } catch (error) {
      return state;
    }
  }

  handleBurn(
    event: any,
    state: DeepReadonly<PoolState>,
    log: Readonly<Log>,
  ): DeepReadonly<PoolState> | null {
    try {
      const liquidityDelta = BigInt(event.args.liquidity?.toString() || '0');
      return {
        ...state,
        liquidity: state.liquidity - liquidityDelta,
      };
    } catch (error) {
      return state;
    }
  }

  handleCollect(
    event: any,
    state: DeepReadonly<PoolState>,
    log: Readonly<Log>,
  ): DeepReadonly<PoolState> | null {
    try {
      return state;
    } catch (error) {
      return state;
    }
  }
}
