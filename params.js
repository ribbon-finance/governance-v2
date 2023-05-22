const isTest = process.env.CI;
const TEST_BENEFICIARY = "0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e";
const DAO_MULTISIG = "0xDAEada3d210D2f45874724BeEa03C7d4BBD41674";
const beneficiary = isTest ? TEST_BENEFICIARY : DAO_MULTISIG;

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