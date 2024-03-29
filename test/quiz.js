const { expect, use } = require("chai")
const { ethers } = require("hardhat")
const { solidity } = require("ethereum-waffle")

use(solidity)

describe("QuizContract", function () {
	describe("Variant 1 - The responder does not guess the number, the quiz owner wins and takes the prize", function () {
		let accounts
		let contractOwner
		let contractOwnerBalance
		let myQuizContract
		let quizOwner
		let bank
		let startedAt
		let responder
		const commission = 1
		const provider = ethers.provider
		const guessingPeriod = 180
		const proofPeriod = 120
		const maxAttempt = 3
		const interval = 10
		const attemptCost = 100
		const bid = 1000
		const secret = 5
		const proof = "proof string"
		const proofHash = "0x69d6366c29581462e386100a108047308f03716222796a8bf2ab7ea26e7eec5e"
		const answer1 = 1
		const answer2 = 2
		const answer3 = 3

		it("Contract should be successfully deployed, account 0 is owner, commission is correct and quizes counter is zero", async function () {
			accounts = await ethers.getSigners()
			contractOwner = accounts[0]
			const QuizContract = await ethers.getContractFactory("QuizContract")
			myQuizContract = await QuizContract.deploy(commission)
			await myQuizContract.deployed()
			expect(myQuizContract.address).to.be.properAddress
			expect(await myQuizContract.owner()).to.equal(contractOwner.address)
			expect(await myQuizContract.commission()).to.equal(commission)
			expect(await myQuizContract.counter()).to.equal(0)
		})

		it("After contract deployment owner's and contract's balances are zero", async function() {
			expect(await myQuizContract.showCommission()).to.equal(0)
			expect(await provider.getBalance(myQuizContract.address)).to.equal(0)
		})

		it("Hash calculated correctly", async function() {
			expect(await myQuizContract.calculateHash(secret, proof)).to.equal(proofHash)
		})

		it("Account 1 starts the quiz", async function() {
			quizOwner = accounts[1]

			const ownersCommission = Math.floor((commission * bid) / 100)
			contractOwnerBalance = ownersCommission
			bank = bid - ownersCommission
			
			const tx = await myQuizContract.connect(quizOwner).startQuiz(
				guessingPeriod,
				proofPeriod,
				proofHash,
				maxAttempt,
				interval,
				attemptCost,
				{ value: bid }
			)

			startedAt = await getTimestamp(tx.blockNumber)

			await expect(() => tx)
			.to.emit(myQuizContract, "quizStarted")
			.withArgs(0, startedAt)

			expect(await myQuizContract.counter()).to.equal(1)
			expect(await myQuizContract.connect(contractOwner).showCommission()).to.equal(contractOwnerBalance)
			expect(await provider.getBalance(myQuizContract.address)).to.equal(bid)	
		})

		it("The quiz has a correct owner", async function() {
			expect(await myQuizContract.getQuizOwner(0)).to.equal(quizOwner.address)	
		})

		it("The quiz has a correct guessing period", async function() {
			expect(await myQuizContract.getQuizGuessingPeriod(0)).to.equal(guessingPeriod)	
		})

		it("The quiz has a correct proof period", async function() {
			expect(await myQuizContract.getQuizProofPeriod(0)).to.equal(proofPeriod)	
		})

		it("The quiz has a correct proof hash", async function() {
			expect(await myQuizContract.getQuizProofHash(0)).to.equal(proofHash)	
		})

		it("The quiz has a correct max attempt number", async function() {
			expect(await myQuizContract.getQuizMaxAttempt(0)).to.equal(maxAttempt)	
		})

		it("The quiz has a correct interval", async function() {
			expect(await myQuizContract.getQuizInterval(0)).to.equal(interval)	
		})

		it("The quiz has a correct attempt cost", async function() {
			expect(await myQuizContract.getQuizAttemptCost(0)).to.equal(attemptCost)	
		})

		it("The quiz has a correct bid", async function() {
			expect(await myQuizContract.getQuizBid(0)).to.equal(bid)	
		})

		it("The quiz has a correct bank", async function() {
			const ownersCommission = await myQuizContract.connect(contractOwner).showCommission()

			expect(await myQuizContract.getQuizBank(0)).to.equal(bid - ownersCommission)	
		})

		it("The quiz has a correct status", async function() {
			expect(await myQuizContract.getQuizStatus(0)).to.equal(true)	
		})

		it("The quiz has a correct started at time", async function() {
			expect(await myQuizContract.getQuizStartedAt(0)).to.equal(startedAt)	
		})

		it("Only the owner of the contract can see his commission", async function() {
			await expect(myQuizContract.connect(quizOwner).showCommission()).to.be.revertedWith("You're not the contract owner!")
		})

		it("Account 2 sent the first reply, but indicated incorrect quiz number", async function() {
			responder = accounts[2]
			let pay = attemptCost

			await expect(myQuizContract.connect(responder).solveQuiz(
				1,
				answer1,
				{ value: pay }
			)).to.be.revertedWith("Quiz isn't exist")
		})

		it("Account 2 sent the first reply with wrong payment", async function() {
			let pay = attemptCost - 1

			await expect(myQuizContract.connect(responder).solveQuiz(
				0,
				answer1,
				{ value: pay }
			)).to.be.revertedWith("Wrong payment")
		})

		it("Account 2 sent the first reply correctly", async function() {
			const tx = await myQuizContract.connect(responder).solveQuiz(
				0,
				answer1,
				{ value: attemptCost }
			)

			await expect(() => tx)
			.to.emit(myQuizContract, "answerAdded")
			.withArgs(0, answer1)

			const ownersCommission = Math.floor((commission * attemptCost) / 100)
			contractOwnerBalance += ownersCommission
			bank += attemptCost - ownersCommission

			expect(await myQuizContract.connect(contractOwner).showCommission()).to.equal(contractOwnerBalance)
			expect(await myQuizContract.getQuizBank(0)).to.equal(bank)
		})

		it("The quiz has a correct responder", async function() {
			expect(await myQuizContract.getQuizResponder(0)).to.equal(responder.address)	
		})

		it("The quiz has a correct current attempt number", async function() {
			expect(await myQuizContract.getQuizCurrentAttempt(0)).to.equal(1)	
		})

		it("The quiz has a correct answer1 saved", async function() {
			const res = await myQuizContract.getQuizAnswers(0)

			expect(res[0]).to.equal(ethers.BigNumber.from(answer1))	
		})

		it("Another respondent is trying to send his reply", async function() {
			await expect(myQuizContract.connect(accounts[3]).solveQuiz(
				0,
				answer1,
				{ value: attemptCost }
			)).to.be.revertedWith("Another responder already found")
		})

		it("Quiz owner sent his proof, but proof time isn't started yet", async function() {
			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret,
				proof
			)).to.be.revertedWith("Proof time isn't started")
		})

		it("Responder sent the second reply correctly", async function() {
			const tx = await myQuizContract.connect(responder).solveQuiz(
				0,
				answer2,
				{ value: attemptCost }
			)

			await expect(() => tx)
			.to.emit(myQuizContract, "answerAdded")
			.withArgs(0, answer2)

			const ownersCommission = Math.floor((commission * attemptCost) / 100)
			contractOwnerBalance += ownersCommission
			bank += attemptCost - ownersCommission
		})

		it("Respondent is trying to send his reply when answers time is ended", async function() {
			await network.provider.send("evm_increaseTime", [guessingPeriod])
			await network.provider.send("evm_mine")

			await expect(myQuizContract.connect(responder).solveQuiz(
				0,
				answer3,
				{ value: attemptCost }
			)).to.be.revertedWith("Answers time is ended")
		})

		it("Not the owner of the quiz sent proof", async function() {
			await expect(myQuizContract.connect(accounts[3]).proofQuiz(
				0,
				secret,
				proof
			)).to.be.revertedWith("You're not a quiz owner")
		})

		it("Incorrect number of a quiz in proof message", async function() {
			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				1,
				secret,
				proof
			)).to.be.revertedWith("The quiz did not take place")
		})

		it("Incorrect secret in proof message", async function() {
			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret + interval,
				proof
			)).to.be.revertedWith("The secret isn't correct")
		})

		it("Incorrect proof", async function() {
			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret,
				"Incorrect proof"
			)).to.be.revertedWith("The proof isn't true")
		})

		it("The quiz owner is trying to get prize without sending the proof", async function() {
			await expect(myQuizContract.connect(quizOwner).getQuizOwnerPrize(0))
			.to.be.revertedWith("You are not a winner")
		})

		it("Correct proof", async function() {
			const tx = await myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret,
				proof
			)

			await expect(() => tx)
			.to.emit(myQuizContract, "proofAdded")
			.withArgs(0, secret, proof)
		})

		it("The quiz has a correct secret", async function() {
			expect(await myQuizContract.getQuizSecret(0)).to.equal(secret)	
		})

		it("The quiz has a correct proof", async function() {
			expect(await myQuizContract.getQuizProof(0)).to.equal(proof)	
		})

		it("The quiz has a correct winner", async function() {
			expect(await myQuizContract.getQuizWinner(0)).to.equal(quizOwner.address)	
		})

		it("Not a quiz owner is trying to get quiz owner's prize", async function() {
			await expect(myQuizContract.connect(responder).getQuizOwnerPrize(0))
			.to.be.revertedWith("You're not a quiz owner")
		})

		it("Not the responder is trying to get responder's prize", async function() {
			await expect(myQuizContract.connect(quizOwner).getResponderPrize(0))
			.to.be.revertedWith("You're not a responder")	
		})

		it("Responder is trying to get the prize when he isn't a winner", async function() {
			await expect(myQuizContract.connect(responder).getResponderPrize(0))
			.to.be.revertedWith("You are not a winner")	
		})

		it("Quiz owner got his prize", async function() {
			const tx = await myQuizContract.connect(quizOwner).getQuizOwnerPrize(0)

			const timestamp = await getTimestamp(tx.blockNumber)

			await expect(() => tx)
			.to.emit(myQuizContract, "quizEnded")
			.withArgs(0, timestamp)

			await expect(() => tx)
			.to.changeEtherBalances([myQuizContract, quizOwner], [-bank, bank])

			expect(await myQuizContract.getQuizBank(0)).to.equal(0)
			expect(await myQuizContract.getQuizStatus(0)).to.equal(false)
		})

		it("Quiz owner is trying to retake the prize", async function() {
			await expect(myQuizContract.connect(quizOwner).getQuizOwnerPrize(0))
			.to.be.revertedWith("Prize already received")	
		})

		it("Responder is trying to get prize, which is already received", async function() {
			await expect(myQuizContract.connect(responder).getResponderPrize(0))
			.to.be.revertedWith("Prize already received")	
		})

		it("The owner of the contract withdraw his commission", async function() {
			const tx = await myQuizContract.connect(contractOwner).withdrawCommission()

			await expect(() => tx)
			.to.changeEtherBalances([myQuizContract, contractOwner], [-contractOwnerBalance, contractOwnerBalance])

			expect(await myQuizContract.showCommission()).to.equal(0)
		})

		it("Not the owner of the contract is trying to withdraw commission", async function() {
			await expect(myQuizContract.connect(responder).withdrawCommission())
			.to.be.revertedWith("You're not the contract owner!")		
		})
	})

	describe("Variant 2 - The responder guesses the number and takes the prize", function () {
		let accounts
		let myQuizContract
		let quizOwner
		let bank
		let responder
		const commission = 1
		const guessingPeriod = 180
		const proofPeriod = 120
		const interval = 10
		const attemptCost = 100
		const bid = 1000
		const maxAttempt = 1
		const secret = 5
		const proof = "proof string"
		const proofHash = "0x69d6366c29581462e386100a108047308f03716222796a8bf2ab7ea26e7eec5e"
		const answer1 = 5
		const answer2 = 3

		it("Contract should be successfully deployed", async function () {
			accounts = await ethers.getSigners()
			const QuizContract = await ethers.getContractFactory("QuizContract")
			myQuizContract = await QuizContract.deploy(commission)
			await myQuizContract.deployed()
			expect(myQuizContract.address).to.be.properAddress
		})

		it("Account 1 starts the quiz", async function() {
			quizOwner = accounts[1]

			const ownersCommission = Math.floor((commission * bid) / 100)
			bank = bid - ownersCommission
			
			const tx = await myQuizContract.connect(quizOwner).startQuiz(
				guessingPeriod,
				proofPeriod,
				proofHash,
				maxAttempt,
				interval,
				attemptCost,
				{ value: bid }
			)

			expect(await myQuizContract.counter()).to.equal(1)
		})

		it("Account 2 sent the first reply, which solved the quiz", async function() {
			responder = accounts[2]

			const tx = await myQuizContract.connect(responder).solveQuiz(
				0,
				answer1,
				{ value: attemptCost }
			)

			await expect(() => tx)
			.to.emit(myQuizContract, "answerAdded")
			.withArgs(0, answer1)

			const ownersCommission = Math.floor((commission * attemptCost) / 100)
			bank += attemptCost - ownersCommission
		})

		it("Responder is trying to send the next answer, but number of attempts exceeded", async function() {
			await expect(myQuizContract.connect(responder).solveQuiz(
				0,
				answer2,
				{ value: attemptCost }
			)).to.be.revertedWith("Number of tries out")
		})

		it("The owner of the quiz sent proof", async function() {
			await network.provider.send("evm_increaseTime", [guessingPeriod])
			await network.provider.send("evm_mine")

			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret,
				proof
			)).to.be.revertedWith("The quiz is solved")
		})

		it("Responder got his prize", async function() {
			await network.provider.send("evm_increaseTime", [proofPeriod])
			await network.provider.send("evm_mine")

			const tx = await myQuizContract.connect(responder).getResponderPrize(0)

			const timestamp = await getTimestamp(tx.blockNumber)

			await expect(() => tx)
			.to.emit(myQuizContract, "quizEnded")
			.withArgs(0, timestamp)

			await expect(() => tx)
			.to.changeEtherBalances([myQuizContract, responder], [-bank, bank])

			expect(await myQuizContract.getQuizBank(0)).to.equal(0)
			expect(await myQuizContract.getQuizStatus(0)).to.equal(false)
		})
	})

	describe("Variant 3 - The responder does not guess the number, but the quiz owner does not send the proof in the time and the responder takes the prize", function () {
		let accounts
		let myQuizContract
		let quizOwner
		let bank
		let responder
		const commission = 1
		const guessingPeriod = 180
		const proofPeriod = 120
		const interval = 10
		const attemptCost = 100
		const bid = 1000
		const maxAttempt = 1
		const secret = 5
		const proof = "proof string"
		const proofHash = "0x69d6366c29581462e386100a108047308f03716222796a8bf2ab7ea26e7eec5e"
		const answer1 = 3

		it("Contract should be successfully deployed", async function () {
			accounts = await ethers.getSigners()
			const QuizContract = await ethers.getContractFactory("QuizContract")
			myQuizContract = await QuizContract.deploy(commission)
			await myQuizContract.deployed()
			expect(myQuizContract.address).to.be.properAddress
		})

		it("Account 1 starts the quiz", async function() {
			quizOwner = accounts[1]

			const ownersCommission = Math.floor((commission * bid) / 100)
			bank = bid - ownersCommission
			
			const tx = await myQuizContract.connect(quizOwner).startQuiz(
				guessingPeriod,
				proofPeriod,
				proofHash,
				maxAttempt,
				interval,
				attemptCost,
				{ value: bid }
			)

			expect(await myQuizContract.counter()).to.equal(1)
		})

		it("Account 2 sent the reply, which doesn't solve the quiz", async function() {
			responder = accounts[2]

			const tx = await myQuizContract.connect(responder).solveQuiz(
				0,
				answer1,
				{ value: attemptCost }
			)

			await expect(() => tx)
			.to.emit(myQuizContract, "answerAdded")
			.withArgs(0, answer1)

			const ownersCommission = Math.floor((commission * attemptCost) / 100)
			bank += attemptCost - ownersCommission
		})

		it("The owner of the quiz sent proof too late", async function() {
			await network.provider.send("evm_increaseTime", [guessingPeriod + proofPeriod])
			await network.provider.send("evm_mine")

			await expect(myQuizContract.connect(quizOwner).proofQuiz(
				0,
				secret,
				proof
			)).to.be.revertedWith("Proof time is ended")
		})

		it("Responder got his prize", async function() {
			const tx = await myQuizContract.connect(responder).getResponderPrize(0)

			const timestamp = await getTimestamp(tx.blockNumber)

			await expect(() => tx)
			.to.emit(myQuizContract, "quizEnded")
			.withArgs(0, timestamp)

			await expect(() => tx)
			.to.changeEtherBalances([myQuizContract, responder], [-bank, bank])

			expect(await myQuizContract.getQuizBank(0)).to.equal(0)
			expect(await myQuizContract.getQuizStatus(0)).to.equal(false)
		})
	})

	describe("Variant 4 - The responder is not located, the owner of the game takes his bet", function () {
		let accounts
		let myQuizContract
		let quizOwner
		let bank
		const commission = 1
		const guessingPeriod = 180
		const proofPeriod = 120
		const maxAttempt = 2
		const interval = 10
		const attemptCost = 100
		const bid = 1000
		const proofHash = "0x69d6366c29581462e386100a108047308f03716222796a8bf2ab7ea26e7eec5e"

		it("Contract should be successfully deployed", async function () {
			accounts = await ethers.getSigners()
			const QuizContract = await ethers.getContractFactory("QuizContract")
			myQuizContract = await QuizContract.deploy(commission)
			await myQuizContract.deployed()
		
			expect(myQuizContract.address).to.be.properAddress
		})

		it("Account 1 starts the quiz", async function() {
			quizOwner = accounts[1]

			const ownersCommission = Math.floor((commission * bid) / 100)
			bank = bid - ownersCommission
			
			const tx = await myQuizContract.connect(quizOwner).startQuiz(
				guessingPeriod,
				proofPeriod,
				proofHash,
				maxAttempt,
				interval,
				attemptCost,
				{ value: bid }
			)

			expect(await myQuizContract.counter()).to.equal(1)
		})

		it("Responder isn't located and quiz owner return his bid", async function() {
			await network.provider.send("evm_increaseTime", [guessingPeriod])
			await network.provider.send("evm_mine")

			const tx = await myQuizContract.connect(quizOwner).getQuizOwnerPrize(0)

			await expect(() => tx)
			.to.changeEtherBalances([myQuizContract, quizOwner], [-bank, bank])

			expect(await myQuizContract.getQuizBank(0)).to.equal(0)
			expect(await myQuizContract.getQuizStatus(0)).to.equal(false)
		})
	})
})

async function getTimestamp(bn) {
	return (
		await ethers.provider.getBlock(bn)
	).timestamp
}