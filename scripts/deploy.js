// const { ethers, upgrades } = require("hardhat")

// async function main() {
//     const BeeV1 = await ethers.getContractFactory("BeeV1")
//     console.log("Deploying Bee...")
//     const box = await upgrades.deployProxy(BeeV1, [], {
//         initializer: "initialize",
//     })
//     await box.deployed()
//     console.log("Bee deployed to:", box.address)
// }

// main()