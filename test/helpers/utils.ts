import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, Contract, Signature, Wallet } from "ethers";
import { splitSignature } from "ethers/lib/utils";

require("dotenv").config();

export async function getPermitSignature(
  wallet: Wallet,
  token: Contract,
  spender: string,
  value: BigNumberish,
  deadline: BigNumberish,
  permitConfig?: {
    nonce: BigNumberish;
    name: string;
    chainId: number;
    version: string;
  }
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? "0",
    permitConfig?.name ?? "USD Coin",
    permitConfig?.version ?? "2",
    permitConfig?.chainId ?? "1",
  ]);

  return splitSignature(
    await wallet._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: wallet.address,
        spender,
        value,
        nonce,
        deadline,
      }
    )
  );
}

export async function generateWallet(
  asset: Contract,
  amount: BigNumber,
  owner: SignerWithAddress
) {
  let provider = new ethers.providers.JsonRpcProvider(process.env.TEST_URI);
  let signer = new ethers.Wallet(
    "0ce495bd7bab5341ae5a7ac195173fba1aa56f6561e35e1fec6176e2519ab8da",
    provider
  );

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [signer.address],
  });

  await asset.connect(owner).transfer(signer.address, amount);

  // Create a transaction object
  let tx = {
    to: signer.address,
    // Convert currency unit from ether to wei
    value: ethers.utils.parseEther("10"),
  };

  await owner.sendTransaction(tx);

  return signer;
}
