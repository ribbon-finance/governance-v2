import { CHAINID } from "../../constants/constants";

require("dotenv").config();

export const TEST_URI = {
  [CHAINID.ETH_MAINNET]: process.env.TEST_URI,
};
