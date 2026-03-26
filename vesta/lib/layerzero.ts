// Endpoints y EIDs de LayerZero V2 por red (Testnet)
// EID (Endpoint ID) es el identificador que usa LayerZero internamente — distinto al EVM chainId.

export const LZ_ENDPOINTS = {
  bscTestnet: {
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    eid: 40102,
    evmChainId: 97,
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
    name: "BSC Testnet",
  },
  rskTestnet: {
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    eid: 40219,
    evmChainId: 31,
    rpc: "https://public-node.testnet.rsk.co",
    name: "RSK Testnet",
  },
  hederaTestnet: {
    endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    eid: 40285,
    evmChainId: 296,
    rpc: "https://testnet.hashio.io/api",
    name: "Hedera Testnet",
  },
} as const;

export type LZNetwork = keyof typeof LZ_ENDPOINTS;

// Gas límite recomendado para ejecutar _lzReceive en el spoke
export const LZ_RECEIVE_GAS = 200_000;
