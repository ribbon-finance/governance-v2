const {TEST_BENEFICIARY, DAO_MULTISIG} = require("./constants/constants");

const isTest = process.env.CI;
const beneficiary = isTest ? DAO_MULTISIG : DAO_MULTISIG;

// FOR MAINNET
const TOKEN_PARAMS = {
  NAME: "Aevo",
  SYMBOL: "AEVO",
  DECIMALS: "18",
  BENEFICIARY: beneficiary,
};

module.exports = {
  TOKEN_PARAMS,
};
