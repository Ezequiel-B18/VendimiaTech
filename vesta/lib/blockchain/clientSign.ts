import { ethers } from "ethers";
import ABI from "@/lib/abi.json";

export interface ClientMintParams {
  bodega: string;
  coordenadas: string;
  imageHash: string;
  ndvi: number;
  ndre: number;
  ndwi: number;
  climateEvent: string;
}

export interface ClientMintResult {
  chain: "bnb" | "rsk";
  status: "success";
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

const CHAIN_CONFIG = {
  bnb: {
    chainId: 97,
    contractEnvKey: "NEXT_PUBLIC_CONTRACT_BSC",
    explorerBase: "https://testnet.bscscan.com/tx",
    name: "BSC Testnet",
    addChainParams: {
      chainId: "0x61",
      chainName: "BSC Testnet",
      nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
      rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
      blockExplorerUrls: ["https://testnet.bscscan.com"],
    },
  },
  rsk: {
    chainId: 31,
    contractEnvKey: "NEXT_PUBLIC_CONTRACT_RSK",
    explorerBase: "https://explorer.testnet.rootstock.io/tx",
    name: "RSK Testnet",
    addChainParams: {
      chainId: "0x1f",
      chainName: "RSK Testnet",
      nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
      rpcUrls: ["https://public-node.testnet.rsk.co"],
      blockExplorerUrls: ["https://explorer.testnet.rootstock.io"],
    },
  },
};

export async function mintWithWallet(
  eip1193Provider: unknown,
  chain: "bnb" | "rsk",
  params: ClientMintParams
): Promise<ClientMintResult> {
  const cfg = CHAIN_CONFIG[chain];

  const contractAddress =
    chain === "bnb"
      ? process.env.NEXT_PUBLIC_CONTRACT_BSC
      : process.env.NEXT_PUBLIC_CONTRACT_RSK;

  if (!contractAddress) {
    throw new Error(
      `${cfg.contractEnvKey} no está configurado. Completá el .env.local.`
    );
  }

  // Wrap EIP-1193 provider with ethers BrowserProvider (v6)
  const provider = new ethers.BrowserProvider(
    eip1193Provider as ethers.Eip1193Provider
  );

  // Switch to the correct chain if needed
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== cfg.chainId) {
    const eth = eip1193Provider as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cfg.addChainParams.chainId }],
      });
    } catch (switchError: unknown) {
      // Chain not added to wallet — try adding it
      if ((switchError as { code?: number }).code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [cfg.addChainParams],
        });
      } else {
        throw switchError;
      }
    }
  }

  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, ABI, signer);

  const ndviInt = Math.round(params.ndvi * 1000);
  const ndreInt = Math.round(params.ndre * 1000);
  const ndwiInt = Math.round(params.ndwi * 1000);

  const tx = await contract.mintCertificate(
    params.bodega,
    params.coordenadas,
    params.imageHash,
    ndviInt,
    ndreInt,
    ndwiInt,
    params.climateEvent
  );

  const receipt = await tx.wait();

  let tokenId = "0";
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
        tokenId = parsed.args[2].toString();
        break;
      }
    } catch {
      // skip
    }
  }

  return {
    chain,
    status: "success",
    txHash: receipt.hash,
    tokenId,
    explorerUrl: `${cfg.explorerBase}/${receipt.hash}`,
  };
}
