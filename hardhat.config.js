require("@nomicfoundation/hardhat-toolbox")
require("solidity-coverage")
require("dotenv").config()
require("./tasks/tasks")

module.exports = {
	solidity: {
		version: "0.8.17"
	}
}