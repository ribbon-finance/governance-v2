const hre = require("hardhat");
import { TOKEN_PARAMS, RBN_ADDR } from "../../constants/constants";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  // We get the contract to deploy
  const AevoToken = await hre.ethers.getContractFactory("Aevo", deployer);

  // Use a different name for obfuscation just in case anyone's watching
  const name =
    network === "goerli" || network === "sepolia"
      ? "TestToken"
      : TOKEN_PARAMS.NAME;
  const symbol =
    network === "goerli" || network === "sepolia" ? "TT" : TOKEN_PARAMS.SYMBOL;
  const beneficiary =
    network === "goerli" || network === "sepolia"
      ? deployer.address
      : TOKEN_PARAMS.BENEFICIARY;

  console.log("name", name);
  console.log("symbol", symbol);
  console.log("beneficiary", beneficiary);

  const aevoToken = await AevoToken.deploy(name, symbol, beneficiary, RBN_ADDR);

  await aevoToken.deployed();

  console.log(
    `\nAevo token is deployed at ${aevoToken.address}, verify with https://etherscan.io/proxyContractChecker?a=${aevoToken.address}\n`
  );

  await aevoToken.deployTransaction.wait(5);

  await hre.run("verify:verify", {
    address: aevoToken.address,
    constructorArguments: [name, symbol, beneficiary, RBN_ADDR],
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
