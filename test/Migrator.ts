import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory, Signer } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { NULL_ADDR, RBN_ADDR, TOKEN_PARAMS } from "../constants/constants";
import { assert } from "./helpers/assertions";
const { parseEther } = ethers.utils;

describe("Migrator", function () {
  let AevoToken: ContractFactory;
  let Migrator: ContractFactory;
  let aevoToken: Contract;
  let rbnToken: Contract;
  let migrator: Contract;
  let owner: SignerWithAddress;
  let user: string;
  let userSigner: Signer;
  let beneficiarySigner: Signer;
  let aevoMaxSupply: BigNumber;

  beforeEach(async function () {
    AevoToken = await ethers.getContractFactory("Aevo");
    [owner] = await ethers.getSigners();

    // deploy AEVO token
    aevoToken = await AevoToken.deploy(
      TOKEN_PARAMS.NAME,
      TOKEN_PARAMS.SYMBOL,
      TOKEN_PARAMS.BENEFICIARY
    );

    // impersonate beneficiary
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [TOKEN_PARAMS.BENEFICIARY],
    });

    beneficiarySigner = await ethers.provider.getSigner(
      TOKEN_PARAMS.BENEFICIARY
    );

    // deploy migrator contract
    Migrator = await ethers.getContractFactory("Migrator");
    migrator = await Migrator.deploy(RBN_ADDR, aevoToken.address);

    // owner mints the total AEVO supply to migrator address
    aevoMaxSupply = parseEther("1000000000"); // 1000M AEVO tokens - same as RBN supply

    await aevoToken
      .connect(beneficiarySigner)
      .mint(migrator.address, aevoMaxSupply);

    // set up user
    user = "0xaddfB9a442a32225d866ffdB983AaB115199e662";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [user],
    });
    userSigner = await ethers.provider.getSigner(user);

    // set up RBN contract
    rbnToken = await ethers.getContractAt("IERC20", RBN_ADDR);
  });

  describe("#constructor", function () {
    it("reverts if RBN address is 0", async function () {
      const TestMigrator = await ethers.getContractFactory("Migrator");

      await expect(
        TestMigrator.deploy(NULL_ADDR, aevoToken.address)
      ).to.be.revertedWith("!_rbn");
    });
    it("reverts if AEVO address is 0", async function () {
      const TestMigrator = await ethers.getContractFactory("Migrator");

      await expect(TestMigrator.deploy(RBN_ADDR, NULL_ADDR)).to.be.revertedWith(
        "!_aevo"
      );
    });
    it("successfully sets the constructor", async function () {
      assert.equal(await migrator.RBN(), RBN_ADDR);
      assert.equal(await migrator.AEVO(), aevoToken.address);
    });
  });

  describe("#migrateToAEVO", function () {
    it("reverts if amount is 0", async function () {
      await expect(migrator.migrateToAEVO(0)).to.be.revertedWith("!_amount");
    });
    it("user successfully migrates 1 RBN token", async function () {
      const migratorAEVOBalBefore = await aevoToken.balanceOf(migrator.address);
      const rbnContractBalBefore = await rbnToken.balanceOf(rbnToken.address);
      const userRBNBalBefore = await rbnToken.balanceOf(user);
      const userAEVOBalBefore = await aevoToken.balanceOf(user);

      assert.bnEqual(migratorAEVOBalBefore, aevoMaxSupply);

      // user migrates 1 RBN token
      const migrateAmount = parseEther("1");
      await rbnToken
        .connect(userSigner)
        .approve(migrator.address, migrateAmount);

      const tx = await migrator
        .connect(userSigner)
        .migrateToAEVO(migrateAmount);

      const migratorAEVOBalAfter = await aevoToken.balanceOf(migrator.address);
      const rbnContractBalAfter = await rbnToken.balanceOf(rbnToken.address);
      const userRBNBalAfter = await rbnToken.balanceOf(user);
      const userAEVOBalAfter = await aevoToken.balanceOf(user);

      // AEVO flows
      assert.bnEqual(
        migratorAEVOBalBefore.sub(migratorAEVOBalAfter),
        migrateAmount
      );
      assert.bnEqual(userAEVOBalAfter.sub(userAEVOBalBefore), migrateAmount);

      // RBN flows
      assert.bnEqual(
        rbnContractBalAfter.sub(rbnContractBalBefore),
        migrateAmount
      );
      assert.bnEqual(userRBNBalBefore.sub(userRBNBalAfter), migrateAmount);

      // emits event
      await expect(tx)
        .to.emit(migrator, "Migrated")
        .withArgs(user, migrateAmount);
    });
  });

  describe("#rescue", function () {
    it("user calls rescue without any RBN in the contract and no changes occur", async function () {
      const migratorRBNBalBefore = await rbnToken.balanceOf(migrator.address);
      const ownerRBNBalBefore = await rbnToken.balanceOf(owner.address);

      // user calls rescue
      const tx = await migrator.connect(userSigner).rescue();

      const ownerRBNBalAfter = await rbnToken.balanceOf(owner.address);
      const migratorRBNBalAfter = await rbnToken.balanceOf(migrator.address);

      assert.equal(ownerRBNBalAfter.sub(ownerRBNBalBefore), 0);
      assert.equal(migratorRBNBalAfter.sub(migratorRBNBalBefore), 0);

      // emits event
      await expect(tx).to.emit(migrator, "Rescued").withArgs(0);
    });
    it("user calls rescue and successfully moves the RBN tokens to the owner after accidentally sending them to contract", async function () {
      const userRBNBalBefore = await rbnToken.balanceOf(user);
      const migratorRBNBalBefore = await rbnToken.balanceOf(migrator.address);
      const ownerRBNBalBefore = await rbnToken.balanceOf(owner.address);

      // acidentally user sends RBN to contract
      const accidentalAmount = BigNumber.from("10000").mul(
        BigNumber.from("10").pow(18)
      );
      await rbnToken
        .connect(userSigner)
        .transfer(migrator.address, accidentalAmount);

      const userRBNBalPostAccident = await rbnToken.balanceOf(user);
      const migratorRBNBalPostAccident = await rbnToken.balanceOf(
        migrator.address
      );

      // user calls rescue
      const tx = await migrator.connect(userSigner).rescue();

      const ownerRBNBalAfter = await rbnToken.balanceOf(owner.address);
      const migratorRBNBalAfter = await rbnToken.balanceOf(migrator.address);

      assert.bnEqual(ownerRBNBalAfter.sub(ownerRBNBalBefore), accidentalAmount);
      assert.bnEqual(
        migratorRBNBalPostAccident.sub(migratorRBNBalBefore),
        accidentalAmount
      );
      assert.bnEqual(
        migratorRBNBalPostAccident.sub(migratorRBNBalAfter),
        accidentalAmount
      );
      assert.bnEqual(
        userRBNBalBefore.sub(userRBNBalPostAccident),
        accidentalAmount
      );

      // emits event
      await expect(tx).to.emit(migrator, "Rescued").withArgs(accidentalAmount);
    });
  });
});
