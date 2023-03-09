// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract QuizContract {
    struct Quiz {
        uint256 startedAt; // game start time
        uint256 guessingPeriod; // period for guessing the number
        uint256 proofPeriod; // period to prove the hidden number
        address quizOwner; // quiz owner
        uint256 bid; // the bet of the player who guessed the number
        bytes32 proofHash; // hash to concatenate "proof of hidden number" + hidden number
        uint256 maxAttempt; // maximum number of response attempts
        uint256 interval; // the interval in which the number is guessed (for example, a value of 100 indicates that a number from 0 to 99 is guessed)
        uint256 attemptCost; // cost of an attempt to answer
        uint256 secret; // hidden number
        address winner; // winner
        uint256 bank; // the total bank minus the site commission (the initial bet of the player who guessed the number, plus the cost of all answer options given by the guessing player)
        address responder; // responder
        uint256 currentAttempt; // number of response options given
        mapping(uint256 => uint256) variants; // answer options
        string proof; // proof for the hidden number
        bool status; // game status: true - active (the game is active until the winner takes the pot), false - completed
    }

    address public owner; // владелец контракта
    uint256 private ownerBalance; // комиссия, которую может снять владелец контракта
    uint256 public counter; // число созданных игр
    uint8 public immutable comission; // процент комиссии (взимается со взносов игроков)
    mapping(uint256 => Quiz) private quizes; // зарегистрированные игры

    constructor(uint8 _comission) {
        owner = msg.sender;
        comission = _comission;
    }

    function startQuiz(
        uint256 _guessingPeriod,
        uint256 _proofPeriod,
        bytes32 _proofHash,
        uint256 _maxAttempt,
        uint256 _interval,
        uint256 _attemptCost
    ) public payable returns (uint256) {
        quizes[counter].quizOwner = msg.sender;
        quizes[counter].guessingPeriod = _guessingPeriod;
        quizes[counter].proofPeriod = _proofPeriod;
        quizes[counter].proofHash = _proofHash;
        quizes[counter].maxAttempt = _maxAttempt;
        quizes[counter].interval = _interval;
        quizes[counter].attemptCost = _attemptCost;
        quizes[counter].bid = msg.value;

        uint256 ownersComission = (comission * msg.value) / 100;
        ownerBalance += ownersComission;
        quizes[counter].bank = msg.value - ownersComission;

        quizes[counter].startedAt = block.timestamp;
        quizes[counter].status = true;

        emit quizStarted(counter, block.timestamp);

        counter++;

        return counter - 1;
    }

    function solveQuiz(uint8 _quizID, uint256 _answer) public payable {
        require(quizes[_quizID].quizOwner != address(0), "Quiz isn't exist");
        require(
            (quizes[_quizID].responder == address(0)) ||
                (quizes[_quizID].responder == msg.sender),
            "Another responder already found"
        );
        require(
            quizes[_quizID].currentAttempt < quizes[_quizID].maxAttempt,
            "Number of tries out"
        );
        require(
            (quizes[_quizID].startedAt + quizes[_quizID].guessingPeriod) >
                block.timestamp,
            "Answers time is ended"
        );
        require(msg.value == quizes[_quizID].attemptCost, "Wrong payment");

        uint256 ownersComission = (comission * msg.value) / 100;
        ownerBalance += ownersComission;
        quizes[_quizID].bank += msg.value - ownersComission;

        if (quizes[_quizID].responder == address(0))
            quizes[_quizID].responder = msg.sender;

        quizes[_quizID].variants[quizes[_quizID].currentAttempt] = _answer;

        quizes[_quizID].currentAttempt++;

        emit answerAdded(_quizID, _answer);
    }

    function proofQuiz(
        uint8 _quizID,
        uint256 _secret,
        string memory _proof
    ) public {
        require(
            quizes[_quizID].responder != address(0),
            "The quiz did not take place"
        );
        require(
            quizes[_quizID].quizOwner == msg.sender,
            "You're not a quiz owner"
        );
        require(
            (quizes[_quizID].startedAt + quizes[_quizID].guessingPeriod) <=
                block.timestamp,
            "Proof time isn't started"
        );
        require(
            (quizes[_quizID].startedAt +
                quizes[_quizID].guessingPeriod +
                quizes[_quizID].proofPeriod) > block.timestamp,
            "Proof time is ended"
        );
        require(_secret < quizes[_quizID].interval, "The secret isn't correct");
        require(
            keccak256(abi.encode(_proof, _secret)) == quizes[_quizID].proofHash,
            "The proof isn't true"
        );
        require(!isQuizSolved(_quizID, _secret), "The quiz is solved");

        quizes[_quizID].secret = _secret;
        quizes[_quizID].proof = _proof;
        quizes[_quizID].winner = msg.sender;

        emit proofAdded(_quizID, _secret, _proof);
    }

    function isQuizSolved(
        uint8 _quizID,
        uint256 _secret
    ) private view returns (bool) {
        for (uint256 i = 0; i < quizes[_quizID].currentAttempt; i++) {
            if (_secret == quizes[_quizID].variants[i]) return true;
        }
        return false;
    }

    function getQuizOwnerPrize(uint256 _quizID) public {
        require(
            quizes[_quizID].quizOwner == msg.sender,
            "You're not a quiz owner"
        );
        require(quizes[_quizID].status, "Prize already received");
        require(
            ((quizes[_quizID].responder == address(0)) &&
                ((quizes[_quizID].startedAt + quizes[_quizID].guessingPeriod) <=
                    block.timestamp)) || (quizes[_quizID].winner == msg.sender),
            "You are not a winner"
        );

        uint256 bank = quizes[_quizID].bank;
        quizes[_quizID].bank = 0;
        quizes[_quizID].status = false;
        payable(msg.sender).transfer(bank);

        emit quizEnded(_quizID, block.timestamp);
    }

    function getResponderPrize(uint256 _quizID) public {
        require(
            quizes[_quizID].responder == msg.sender,
            "You're not a responder"
        );
        require(quizes[_quizID].status, "Prize already received");
        require(
            ((quizes[_quizID].startedAt +
                quizes[_quizID].guessingPeriod +
                quizes[_quizID].proofPeriod) <= block.timestamp) &&
                (quizes[_quizID].winner == address(0)),
            "You are not a winner"
        );

        uint256 bank = quizes[_quizID].bank;
        quizes[_quizID].bank = 0;
        quizes[_quizID].status = false;
        payable(msg.sender).transfer(bank);

        emit quizEnded(_quizID, block.timestamp);
    }

    function getQuizOwner(uint256 _quizID) public view returns (address) {
        return quizes[_quizID].quizOwner;
    }

    function getQuizGuessingPeriod(
        uint256 _quizID
    ) public view returns (uint256) {
        return quizes[_quizID].guessingPeriod;
    }

    function getQuizProofPeriod(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].proofPeriod;
    }

    function getQuizProofHash(uint256 _quizID) public view returns (bytes32) {
        return quizes[_quizID].proofHash;
    }

    function getQuizMaxAttempt(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].maxAttempt;
    }

    function getQuizInterval(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].interval;
    }

    function getQuizAttemptCost(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].attemptCost;
    }

    function getQuizBid(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].bid;
    }

    function getQuizBank(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].bank;
    }

    function getQuizStartedAt(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].startedAt;
    }

    function getQuizSecret(uint256 _quizID) public view returns (uint256) {
        return quizes[_quizID].secret;
    }

    function getQuizWinner(uint256 _quizID) public view returns (address) {
        return quizes[_quizID].winner;
    }

    function getQuizResponder(uint256 _quizID) public view returns (address) {
        return quizes[_quizID].responder;
    }

    function getQuizCurrentAttempt(
        uint256 _quizID
    ) public view returns (uint256) {
        return quizes[_quizID].currentAttempt;
    }

    function getQuizAnswers(
        uint256 _quizID
    ) public view returns (uint256[] memory) {
        uint256[] memory answers = new uint256[](
            quizes[_quizID].currentAttempt
        );

        for (uint256 i = 0; i < quizes[_quizID].currentAttempt; i++) {
            answers[i] = quizes[_quizID].variants[i];
        }

        return answers;
    }

    function getQuizProof(uint256 _quizID) public view returns (string memory) {
        return quizes[_quizID].proof;
    }

    function getQuizStatus(uint256 _quizID) public view returns (bool) {
        return quizes[_quizID].status;
    }

    function showComission() public view onlyOwner returns (uint256) {
        return ownerBalance;
    }

    function withdrawComission() public onlyOwner {
        uint256 ownerComission;

        ownerComission = ownerBalance;
        ownerBalance = 0;
        payable(msg.sender).transfer(ownerComission);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You're not the contract owner!");
        _;
    }

    function calculateHash(
        uint256 _secret,
        string memory _proof
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_proof, _secret));
    }

    event quizStarted(uint256 indexed quizID, uint256 startedAt);
    event quizEnded(uint256 indexed quizID, uint256 endedAt);
    event answerAdded(uint256 indexed quizID, uint256 answer);
    event proofAdded(uint256 indexed quizID, uint256 secret, string proof);
}
