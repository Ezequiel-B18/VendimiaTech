import { ethers } from "ethers";
import ABI from "@/lib/abi.json";

interface MintParams {
  bodega: string;
  coordenadas: string;
  imageHash: string;
  ndvi: number;  // 0–1 float → x1000 int
  ndre: number;
  ndwi: number;
  climateEvent: string;
  walletAddress: string;
}

interface MintResult {
  chain: "bnb";
  status: "success";
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

export async function mintOnBNB(params: MintParams): Promise<MintResult> {
  const rpc = process.env.NEXT_PUBLIC_BSC_RPC ?? "https://data-seed-prebsc-1-s1.binance.org:8545";
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_BSC;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!contractAddress) throw new Error("NEXT_PUBLIC_CONTRACT_BSC no configurado en .env.local");
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY no configurado en .env.local");

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ABI, signer);

  // Convert float indices to int x1000
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

  // Extract tokenId from Transfer event (ERC-721 standard)
  let tokenId = "0";
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
        tokenId = parsed.args[2].toString();
        break;
      }
    } catch {
      // skip unparseable logs
    }
  }

  // Si hay wallet del usuario, transferir el NFT a su address
  if (params.walletAddress && ethers.isAddress(params.walletAddress)) {
    const transferTx = await contract["safeTransferFrom(address,address,uint256)"](
      signer.address,
      params.walletAddress,
      BigInt(tokenId)
    );
    await transferTx.wait();
  }

  return {
    chain: "bnb",
    status: "success",
    txHash: receipt.hash,
    tokenId,
    explorerUrl: `https://testnet.bscscan.com/tx/${receipt.hash}`,
  };
}
