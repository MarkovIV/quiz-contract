require("@nomicfoundation/hardhat-toolbox")
require("solidity-coverage")
require("dotenv").config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html

// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// module.exports = {
//   defaultNetwork: "testnet",
//   networks: {
// 	localhost: {
//       url: "http://127.0.0.1:8545"
//     },
//     hardhat: {
// 		blockGasLimit: 30000,
//       	accounts: {
// 			count:100
//       	}
//     },
// 	// BSC Testnet
// 	testnet: {
//       url: "https://data-seed-prebsc-1-s1.binance.org:8545",
//       chainId: 97,
//       gasPrice: 20000000000,
//       accounts: [process.env.PRIVATE_KEY]
//     },
// 	// BSC Mainnet
// 	mainnet: {
//       url: "https://bsc-dataseed.binance.org/",
//       chainId: 56,
//       gasPrice: 20000000000,
//       accounts: [process.env.PRIVATE_KEY]
//     },
//     goerli: {
//       url: "https://goerli.infura.io/v3/4b584832ca034d68af836c6596e8e9e2",
//       accounts: [process.env.PRIVATE_KEY]
//     }
//   },
//   solidity: {
//     version: "0.8.17",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   },
//   paths: {
//     sources: "./contracts",
//     tests: "./test",
//     cache: "./cache",
//     artifacts: "./artifacts"
//   },
//   mocha: {
//     timeout: 40000
//   },
//   etherscan: {
// 	// For ETHERSCAN
//     // apiKey: process.env.ETHERSCAN_API_KEY,
// 	// For BSCSCAN
// 	apiKey: process.env.BSCSCAN_API_KEY,
//   }
// }

module.exports = {
  solidity: {
    version: "0.8.17"
  }
}