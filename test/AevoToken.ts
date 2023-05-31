import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory, Wallet } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { generateWallet, getPermitSignature } from "./helpers/utils";

import { TOKEN_PARAMS } from "../constants/constants";

describe("Aevo contract", function () {
  let AevoToken: ContractFactory;
  let aevoToken: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let withSigner: Contract;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here
    AevoToken = await ethers.getContractFactory("Aevo");
    [owner, addr1, addr2] = await ethers.getSigners();

    aevoToken = await AevoToken.deploy(
      TOKEN_PARAMS.NAME,
      TOKEN_PARAMS.SYMBOL,
      TOKEN_PARAMS.BENEFICIARY
    );

    await aevoToken.deployed();

    await owner.sendTransaction({
      to: TOKEN_PARAMS.BENEFICIARY,
      value: ethers.utils.parseEther("5.0"),
    });

    // Allow impersonation of new account
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [TOKEN_PARAMS.BENEFICIARY],
    });
    const signer = await ethers.provider.getSigner(TOKEN_PARAMS.BENEFICIARY);
    let token = await ethers.getContractAt("Aevo", aevoToken.address);
    withSigner = await token.connect(signer);
  });

  // Test initial setup
  describe("Deployment", function () {
    it("Should grant beneficiary minting rights", async function () {
      expect(
        await withSigner.hasRole(
          await aevoToken.MINTER_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.be.true;
    });

    it("Should grant beneficiary admin rights", async function () {
      expect(
        await withSigner.hasRole(
          await aevoToken.ADMIN_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.be.true;
    });

    it("Admin role of minter role should be ADMIN_ROLE", async function () {
      expect(
        await withSigner.getRoleAdmin(await aevoToken.MINTER_ROLE())
      ).to.equal(await aevoToken.ADMIN_ROLE());
    });
  });

  // Test token parameter
  describe("Token Parameters", function () {
    it("Should have the correct decimals", async function () {
      expect(await aevoToken.decimals()).to.equal(
        parseInt(TOKEN_PARAMS.DECIMALS)
      );
    });

    it("Should have the correct name", async function () {
      expect(await aevoToken.name()).to.equal(TOKEN_PARAMS.NAME);
    });

    it("Should have the correct symbol", async function () {
      expect(await aevoToken.symbol()).to.equal(TOKEN_PARAMS.SYMBOL);
    });
  });

  // Test minter privileges
  describe("Mintability", function () {
    it("Should allow the beneficiary to mint", async function () {
      await expect(await withSigner.mint(addr1.address, 50)).to.emit(
        aevoToken,
        "Transfer"
      );
    });

    it("Should revert mint attempts by non-minter", async function () {
      await expect(aevoToken.mint(addr1.address, 50)).to.be.revertedWith(
        "Aevo: only minter"
      );
    });

    it("Should revert mint attempts by minter after role renounced", async function () {
      await withSigner.renounceRole(
        await aevoToken.MINTER_ROLE(),
        TOKEN_PARAMS.BENEFICIARY
      );
      await expect(withSigner.mint(addr1.address, 50)).to.be.revertedWith(
        "Aevo: only minter"
      );
    });
  });

  // Test admin privileges
  describe("Admin", function () {
    it("Should let admin assign minter role to another", async function () {
      await withSigner.grantRole(await aevoToken.MINTER_ROLE(), addr1.address);
      expect(
        await withSigner.hasRole(await aevoToken.MINTER_ROLE(), addr1.address)
      ).to.be.true;
      await withSigner.mint(addr1.address, 50);
    });

    it("Should let admin revoke minter role from another", async function () {
      await withSigner.grantRole(await aevoToken.MINTER_ROLE(), addr1.address);
      await withSigner.revokeRole(await aevoToken.MINTER_ROLE(), addr1.address);
      await expect(
        aevoToken.connect(addr1).mint(addr1.address, 50)
      ).to.be.revertedWith("Aevo: only minter");
      expect(
        await withSigner.hasRole(await aevoToken.MINTER_ROLE(), addr1.address)
      ).to.be.false;
    });

    it("Should not let admin mint nor assign minter role to another after renouncing both admin and minter role", async function () {
      await withSigner.renounceRole(
        await aevoToken.MINTER_ROLE(),
        TOKEN_PARAMS.BENEFICIARY
      );

      await withSigner.renounceRole(
        await aevoToken.ADMIN_ROLE(),
        TOKEN_PARAMS.BENEFICIARY
      );

      expect(
        await withSigner.hasRole(
          await aevoToken.MINTER_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.be.false;

      expect(
        await withSigner.hasRole(
          await aevoToken.ADMIN_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.be.false;

      await expect(withSigner.mint(addr1.address, 50)).to.be.revertedWith(
        "Aevo: only minter"
      );

      await expect(
        withSigner.grantRole(await aevoToken.MINTER_ROLE(), addr1.address)
      ).to.be.reverted;
    });

    it("Should not let admin assign admin role to another", async function () {
      await expect(
        withSigner.grantRole(await aevoToken.ADMIN_ROLE(), addr1.address)
      ).to.be.reverted;
    });

    it("Should let admin renounce own admin role", async function () {
      await expect(
        withSigner.renounceRole(
          await aevoToken.ADMIN_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.emit(aevoToken, "RoleRevoked");
      expect(
        await withSigner.hasRole(
          await aevoToken.ADMIN_ROLE(),
          TOKEN_PARAMS.BENEFICIARY
        )
      ).to.be.false;
    });
  });

  // Test arbitrary aevo token transfer attempts
  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // mint 50 tokens to owner to make the transfer
      await withSigner.mint(TOKEN_PARAMS.BENEFICIARY, 50);

      // Transfer 50 tokens from owner to addr1
      await withSigner.transfer(addr1.address, 50);
      const addr1Balance = await aevoToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await aevoToken.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await aevoToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await aevoToken.balanceOf(
        TOKEN_PARAMS.BENEFICIARY
      );

      // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens)
      // `require` will evaluate false and revert the transaction
      await expect(
        aevoToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Owner balance shouldn't have changed
      expect(await aevoToken.balanceOf(TOKEN_PARAMS.BENEFICIARY)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
      // mint 150 tokens to owner to make the transfers
      await withSigner.mint(
        TOKEN_PARAMS.BENEFICIARY,
        BigNumber.from("150").mul(
          BigNumber.from("10").pow(BigNumber.from(TOKEN_PARAMS.DECIMALS))
        )
      );

      const initialOwnerBalance = await aevoToken.balanceOf(
        TOKEN_PARAMS.BENEFICIARY
      );

      // Transfer 100 tokens from owner to addr1
      const toTransfer1 = BigNumber.from("100")
        .mul(BigNumber.from("10").pow(BigNumber.from(TOKEN_PARAMS.DECIMALS)))
        .toString();
      await withSigner.transfer(addr1.address, toTransfer1);

      // Transfer another 50 tokens from owner to addr2
      const toTransfer2 = BigNumber.from("50")
        .mul(BigNumber.from("10").pow(BigNumber.from(TOKEN_PARAMS.DECIMALS)))
        .toString();
      await withSigner.transfer(addr2.address, toTransfer2);

      const amountLost = BigNumber.from("150").mul(
        BigNumber.from("10").pow(BigNumber.from(TOKEN_PARAMS.DECIMALS))
      );

      // Check balances
      const finalOwnerBalance = await aevoToken.balanceOf(
        TOKEN_PARAMS.BENEFICIARY
      );
      expect(finalOwnerBalance.toString()).to.equal(
        initialOwnerBalance.sub(amountLost).toString()
      );

      const addr1Balance = await aevoToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(toTransfer1);

      const addr2Balance = await aevoToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(toTransfer2);
    });

    it("Should transfer tokens using permit", async function () {
      const deadline = ethers.constants.MaxUint256;
      const permitAmount = BigNumber.from("50");

      // mint 50 tokens to address 1 to make the transfer using permit
      await withSigner.mint(addr1.address, permitAmount);

      // set up address 1 permit
      let addr1Wallet: Wallet = await generateWallet(
        aevoToken,
        permitAmount,
        addr1
      );

      const { v, r, s } = await getPermitSignature(
        addr1Wallet,
        aevoToken,
        addr2.address,
        permitAmount,
        deadline,
        {
          nonce: BigNumber.from("0"),
          name: TOKEN_PARAMS.NAME,
          chainId: 1,
          version: "1",
        }
      );

      // address 2 calls permit
      await aevoToken
        .connect(addr2)
        .permit(
          addr1Wallet.address,
          addr2.address,
          permitAmount,
          deadline,
          v,
          r,
          s
        );

      const addr1BalBefore = await aevoToken.balanceOf(addr1Wallet.address);
      const addr2BalBefore = await aevoToken.balanceOf(addr2.address);

      // address 2 transfers funds from address 1 to itself
      await aevoToken
        .connect(addr2)
        .transferFrom(addr1Wallet.address, addr2.address, permitAmount);

      const addr1BalAfter = await aevoToken.balanceOf(addr1Wallet.address);
      const addr2BalAfter = await aevoToken.balanceOf(addr2.address);

      expect(addr2BalAfter.sub(addr2BalBefore)).to.equal(permitAmount);
      expect(addr1BalBefore.sub(addr1BalAfter)).to.equal(permitAmount);
    });
  });
});
