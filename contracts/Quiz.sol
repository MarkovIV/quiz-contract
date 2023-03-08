// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract QuizContract {
    struct Quiz {
        uint256 startedAt; // время начала игры
        uint256 guessingPeriod; // период на разгадку числа
        uint256 proofPeriod; // период для доказательства загаданного числа
        address quizOwner; // игрок, загадавший число
        uint256 bid; // ставка игрока, загадавшего число
        bytes32 proofHash; // хэш для конкатенации "доказательство загаданного числа" + загаданное число
        uint256 maxAttempt; // максимальное число попыток ответа
        uint256 interval; // интервал, в котором загадано число (например, значение 100 определяет, что загадано число от 0 до 99)
        uint256 attemptCost; // стоимость попытки ответа
        uint256 secret; // загаданное число
        address winner; // победитель
        uint256 bank; // общий банк за вычетом комиссии площадки (начальная ставка игрока, загадавшего число, плюс стоимости всех вариантов ответа, данных отгадывающим игроком)
        address responder; // игрок, отгадывающий число
        uint256 currentAttempt; // число данных вариантов ответа
        mapping(uint256 => uint256) variants; // варианты ответа
        string proof; // доказательство для загаданного числа
        bool status; // статус игры: true - активна (игра активна, пока победитель не заберет банк), false - завершена
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
