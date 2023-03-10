const guessingPeriod = 120 // default guessing period
const proofPeriod = 120 // default proof period
const maxAttempt = 3 // default maximum number of response attempts
const interval = 10 // default interval
const attemptCost = 1000000 // default attempt cost
const bid = 10000000 // default bid

const contract = '0x5fbdb2315678afecb367f032d93f642f64180aa3' // contract address after deployment

async function getContract(address, hre) {
	const QuizContract = await hre.ethers.getContractFactory('QuizContract')

	return (
		await QuizContract.attach(address)
	)
}

task('owner', 'Prints the owner of the Quiz Contract')
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const owner = await quizContract.owner()

		console.log('Owner of the Quiz Contract: ', owner)
	})

task('counter', 'Prints the number of registered quizes')
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const counter = await quizContract.counter()

		console.log('Contract\'s counter: ', counter.toString())
	})

task('commission', 'Prints the commission percentage')
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const commission = await quizContract.commission()

		console.log('Commission percentage: ', commission.toString())
	})

task('startQuiz', 'Start the quiz')
	.addParam('proofHash', 'Hash to concatenate \"proof of hidden number\" + hidden number', types.bytes32)
	.addOptionalParam('guessingPeriod', 'Period for guessing the number', `${guessingPeriod}`, types.uint)
	.addOptionalParam('proofPeriod', 'Period to prove the hidden number', `${proofPeriod}`, types.uint)
	.addOptionalParam('maxAttempt', 'Maximum number of response attempts', `${maxAttempt}`, types.uint)
	.addOptionalParam('interval', 'The interval in which the number is guessed (for example, a value of 100 indicates that a number from 0 to 99 is guessed)', `${interval}`, types.uint)
	.addOptionalParam('attemptCost', 'The cost of an attempt to answer', `${attemptCost}`, types.uint)
	.addOptionalParam('bid', 'The bet of the player who guessed the number', `${bid}`, types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const accounts = await hre.ethers.getSigners()
		const quizOwner = accounts[1]

		await quizContract.connect(quizOwner).startQuiz(
			taskArgs.guessingPeriod,
			taskArgs.proofPeriod,
			taskArgs.proofHash,
			taskArgs.maxAttempt,
			taskArgs.interval,
			taskArgs.attemptCost,
			{ value: taskArgs.bid }
		)

		const quizID = (await quizContract.counter()) - 1
		const startedAt = await quizContract.getQuizStartedAt(quizID)

		console.log(`The Quiz with number ${quizID} started at ${startedAt}`)
	})

task('calculateHash', 'Calculate the hash of the secret number')
	.addParam('secret', 'Secret number', types.uint)
	.addOptionalParam('proof', 'Proof for the secret number', '', types.string)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const hash = await quizContract.calculateHash(taskArgs.secret, taskArgs.proof)

		console.log('Secret: ', taskArgs.secret)
		console.log('Proof: ', taskArgs.proof)
		console.log('Hash: ', hash)
	})

task('solveQuiz', 'Solve the quiz')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addParam('answer', 'Answer', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const accounts = await hre.ethers.getSigners()
		const responder = accounts[2]

		const attemptCost = await quizContract.getQuizAttemptCost(taskArgs.quizNum)

		await quizContract.connect(responder).solveQuiz(
			taskArgs.quizNum,
			taskArgs.answer,
			{ value: attemptCost }
		)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Added answer: ', taskArgs.answer)
	})

task('proofQuiz', 'Send the proof for the quiz')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addParam('secret', 'Secret number', types.uint)
	.addOptionalParam('proof', 'Proof', '', types.string)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const accounts = await hre.ethers.getSigners()
		const quizOwner = accounts[1]

		await quizContract.connect(quizOwner).proofQuiz(
				taskArgs.quizNum,
				taskArgs.secret,
				taskArgs.proof
			)
			
		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Secret: ', taskArgs.secret)
		console.log('Proof: ', taskArgs.proof)
	})

task('getQuizOwnerPrize', 'Get quiz owner prize')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const accounts = await hre.ethers.getSigners()
		const quizOwner = accounts[1]

		const balanceBefore = (await hre.ethers.provider.getBalance(quizOwner.address)).toString()

		await quizContract.connect(quizOwner).getQuizOwnerPrize(taskArgs.quizNum)

		const balanceAfter = (await hre.ethers.provider.getBalance(quizOwner.address)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Prize received by quiz owner:')
		console.log('Quiz owner\'s balance before: ', balanceBefore)
		console.log('Quiz owner\'s balance after: ', balanceAfter)
	})

task('getResponderPrize', 'Get responder prize')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const accounts = await hre.ethers.getSigners()
		const responder = accounts[2]

		const balanceBefore = (await hre.ethers.provider.getBalance(responder.address)).toString()

		await quizContract.connect(responder).getResponderPrize(taskArgs.quizNum)

		const balanceAfter = (await hre.ethers.provider.getBalance(responder.address)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Prize received by responder:')
		console.log('Responder\'s balance before: ', balanceBefore)
		console.log('Responder\'s balance after: ', balanceAfter)
	})

task('getQuizOwner', 'Get quiz owner')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizOwner(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz owner: ', res)
	})

task('getQuizGuessingPeriod', 'Get quiz guessing period')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizGuessingPeriod(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz guessing period: ', res)
	})

task('getQuizProofPeriod', 'Get quiz proof period')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizProofPeriod(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz proof period: ', res)
	})

task('getQuizProofHash', 'Get quiz proof hash')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizProofHash(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz proof hash: ', res)
	})

task('getQuizMaxAttempt', 'Get quiz max attempt number')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizMaxAttempt(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz max attempt number: ', res)
	})

task('getQuizInterval', 'Get quiz interval')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizInterval(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log(`Quiz interval: 0 - ${res - 1}`)
	})

task('getQuizAttemptCost', 'Get quiz attempt cost')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizAttemptCost(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz attempt cost: ', res)
	})

task('getQuizBid', 'Get quiz bid')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizBid(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz bid: ', res)
	})

task('getQuizBank', 'Get quiz bank')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizBank(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz bank: ', res)
	})

task('getQuizStartedAt', 'Get quiz started at time')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizStartedAt(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz started at: ', res)
	})

task('getQuizSecret', 'Get quiz secret')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizSecret(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz secret: ', res)
	})

task('getQuizWinner', 'Get quiz winner')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizWinner(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz winner: ', res)
	})

task('getQuizResponder', 'Get quiz responder')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizResponder(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz responder: ', res)
	})

task('getQuizCurrentAttempt', 'Get quiz current attempt')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = (await quizContract.getQuizCurrentAttempt(taskArgs.quizNum)).toString()

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz current attempt: ', res)
	})

task('getQuizAnswers', 'Get quiz answers')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizAnswers(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		
		console.log('Quiz answers: ')
		for (let i = 0; i < res.length; i ++) {
			console.log(`answer ${i + 1}:`, res[i].toString())
		}
	})

task('getQuizProof', 'Get quiz proof')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizProof(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz proof: ', res)
	})

task('getQuizStatus', 'Get quiz status')
	.addParam('quizNum', 'Quiz number', types.uint)
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
		const quizContract = await getContract(taskArgs.contract, hre)

		const res = await quizContract.getQuizStatus(taskArgs.quizNum)

		console.log('Quiz number: ', taskArgs.quizNum)
		console.log('Quiz status: ', res)
	})

task('showCommission', 'Show contract\'s accumulated commission')
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
	const quizContract = await getContract(taskArgs.contract, hre)

	const accounts = await hre.ethers.getSigners()
	const owner = accounts[0]

	const res = (await quizContract.connect(owner).showCommission()).toString()

	console.log('Contract\'s commission: ', res)
})

task('withdrawCommission', 'Withdraw contract\'s commission')
	.addOptionalParam('contract', 'Contract address', `${contract}`, types.address)
	.setAction(async (taskArgs, hre) => {
	const quizContract = await getContract(taskArgs.contract, hre)

	const accounts = await hre.ethers.getSigners()
	const owner = accounts[0]

	const balanceBefore = (await hre.ethers.provider.getBalance(owner.address)).toString()

	await quizContract.connect(owner).withdrawCommission()

	const balanceAfter = (await hre.ethers.provider.getBalance(owner.address)).toString()

	console.log('Contract\'s commission withdrawn:')
	console.log('Owner\'s balance before: ', balanceBefore)
	console.log('Owner\'s balance after: ', balanceAfter)
})