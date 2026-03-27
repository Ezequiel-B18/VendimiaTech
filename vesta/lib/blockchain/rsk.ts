import { ethers } from "ethers";
import ABI from "@/lib/abi.json";

interface MintParams {
  bodega: string;
  coordenadas: string;
  imageHash: string;
  ndvi: number;
  ndre: number;
  ndwi: number;
  climateEvent: string;
  walletAddress: string;
}

interface MintResult {
  chain: "rsk";
  status: "success";
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

export async function mintOnRSK(params: MintParams): Promise<MintResult> {
  const rpc =
    process.env.NEXT_PUBLIC_RSK_RPC ?? "https://public-node.testnet.rsk.co";
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_RSK;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!contractAddress)
    throw new Error("NEXT_PUBLIC_CONTRACT_RSK no configurado en .env.local");
  if (!privateKey)
    throw new Error("DEPLOYER_PRIVATE_KEY no configurado en .env.local");

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(privateKey, provider);
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
    chain: "rsk",
    status: "success",
    txHash: receipt.hash,
    tokenId,
    explorerUrl: `https://explorer.testnet.rootstock.io/tx/${receipt.hash}`,
  };
}
