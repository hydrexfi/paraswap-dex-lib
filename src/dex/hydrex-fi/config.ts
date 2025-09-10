import { DexParams } from './types';
import { DexConfigMap } from '../../types';
import { Network } from '../../constants';

export const HydrexFiConfig: DexConfigMap<DexParams> = {
  HydrexFi: {
    [Network.BASE]: {
      factory: '0x36077D39cdC65E1e3FB65810430E5b2c4D5fA29E', // AlgebraFactory
      subgraphURL:
        'https://api.goldsky.com/api/public/project_cmafph25ltm5g01yv3vr7bsoe/subgraphs/analytics/v1.0.1/gn',
      quoter: '0x08b46265643a5389529D6f6616FA4a0d66F13Fdb', // QuoterV2
      router: '0x6f4bE24d7dC93b6ffcBAb3Fd0747c5817Cea3F9e', // SwapRouter
      chunksCount: 10,
    },
  },
};
