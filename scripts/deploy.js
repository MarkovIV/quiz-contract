const { ethers } = require("hardhat")

async function main() {
	const commission = 1
    const QuizContract = await ethers.getContractFactory("QuizContract")
    console.log("Deploying QuizContract...")
    const quizContract = await QuizContract.deploy(commission)
    await quizContract.deployed()
    console.log("QuizContract deployed to:", quizContract.address)
}

main()
.catch( error => {
	console.error(error)
	process.exitCode = 1
})

