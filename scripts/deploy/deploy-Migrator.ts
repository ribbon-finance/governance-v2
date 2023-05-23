const hre = require("hardhat");
import { PLACEHOLDER_ADDR, RBN_ADDR } from "../../constants/constants";


// WIP - this script is waiting for AEVO token mainnet address
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\Deploying with ${deployer.address}`);

  // We get the contract to deploy
  const Migrator = await hre.ethers.getContractFactory(
    "RbnToAevoMigrator",
    deployer
  );

  // Use a different address for obfuscation just in case anyone's watching
  const AEVO_ADDR =
    network === "goerli" || network === "sepolia" ? PLACEHOLDER_ADDR : ""; // TBD AEVO mainnet address
  const RIBBON_ADDR =
    network === "goerli" || network === "sepolia" ? PLACEHOLDER_ADDR : RBN_ADDR;

  const migrator = await Migrator.deploy(RIBBON_ADDR, AEVO_ADDR);

  await migrator.deployed();

  console.log(`\nMigrator is deployed at ${migrator.address}`);

  await migrator.deployTransaction.wait(5);

  await hre.run("verify:verify", {
    address: migrator.address,
    constructorArguments: [RIBBON_ADDR, AEVO_ADDR],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });