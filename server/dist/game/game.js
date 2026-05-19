import { createDeck, shuffleDeck, dealCards, sortCards, levelToRank } from './rules.js';
import { analyzePattern, canBeat } from './judge.js';
export class GuandanGame {
    constructor(roomId) {
        this.state = {
            roomId,
            status: 'waiting',
            players: [],
            currentPlayerIndex: 0,
            playedCards: [],
            currentLevel: 2,
            levelRank: levelToRank(2),
            lastRoundRanking: null,
            roundFinishOrder: [],
            lastPlayedPattern: null,
            lastPlayerIndex: -1,
            firstPlayerIndex: 0,
            roundNumber: 1,
            tributeQueue: null,
            tributeStepIndex: 0,
            tributeRoundHead: null,
        };
    }
    getJudgeContext() {
        return { levelRank: levelToRank(this.state.currentLevel) };
    }
    firstSeatFromReveal(card) {
        if (card.suit === 'joker')
            return 0;
        return ((((card.value - 3) % 4) + 4) % 4);
    }
    isSameTeam(a, b) {
        return (a + b) % 2 === 0;
    }
    countBigJoker(pos) {
        return this.state.players[pos].cards.filter((c) => c.rank === 'BJ').length;
    }
    /** 逆时针下一个仍有手牌的玩家 */
    nextActivePlayer(from) {
        for (let i = 1; i <= 4; i++) {
            const p = ((from + i) % 4);
            if (this.state.players[p].cards.length > 0)
                return p;
        }
        return from;
    }
    /**
     * 接风：一名玩家刚出完牌且无手牌时，下一圈由**其对家（队友）**领出（若其仍有牌）；
     * 对家也已出完则按逆时针找下一个仍有牌者。
     */
    leaderAfterPlayerFinishedOut(finishedPos) {
        const partner = ((finishedPos + 2) % 4);
        if (this.state.players[partner].cards.length > 0) {
            return partner;
        }
        return this.nextActivePlayer(finishedPos);
    }
    removeCardFromPlayer(pos, card) {
        const p = this.state.players[pos];
        const i = p.cards.findIndex((c) => c.id === card.id);
        if (i >= 0)
            p.cards.splice(i, 1);
    }
    isFengRenPei(card) {
        return card.suit === 'hearts' && card.rank === this.state.levelRank;
    }
    /** 进贡牌须为手中最大（逢人配不可进贡） */
    isValidTributePick(player, card) {
        if (!player.cards.some((c) => c.id === card.id))
            return false;
        if (this.isFengRenPei(card))
            return false;
        const pool = player.cards.filter((c) => !this.isFengRenPei(c));
        const use = pool.length ? pool : player.cards;
        const maxV = Math.max(...use.map((c) => c.value));
        return card.value === maxV;
    }
    /** 还牌：有 10 点及以下时任选一张 ≤10；否则须还最小的一张 */
    isValidReturnPick(player, card) {
        if (!player.cards.some((c) => c.id === card.id))
            return false;
        const low = player.cards.filter((c) => c.value <= 10);
        if (low.length)
            return low.some((c) => c.id === card.id);
        const minV = Math.min(...player.cards.map((c) => c.value));
        return card.value === minV;
    }
    buildTributeQueue(ranking) {
        const [head, second, third, last] = ranking;
        const doubleDown = this.isSameTeam(head, second);
        const anti = doubleDown
            ? this.countBigJoker(third) >= 2 ||
                this.countBigJoker(last) >= 2 ||
                (this.countBigJoker(third) >= 1 && this.countBigJoker(last) >= 1)
            : this.countBigJoker(last) >= 2;
        if (anti)
            return null;
        if (doubleDown) {
            return [
                { type: 'tribute', from: last, to: head },
                { type: 'tribute', from: third, to: second },
                { type: 'return', from: head, to: last },
                { type: 'return', from: second, to: third },
            ];
        }
        return [
            { type: 'tribute', from: last, to: head },
            { type: 'return', from: head, to: last },
        ];
    }
    syncTributeCurrentPlayer() {
        if (this.state.status !== 'tribute' || !this.state.tributeQueue)
            return;
        const step = this.state.tributeQueue[this.state.tributeStepIndex];
        if (step) {
            this.state.currentPlayerIndex = step.from;
            this.state.firstPlayerIndex = step.from;
        }
    }
    startTributePhase(ranking) {
        const q = this.buildTributeQueue(ranking);
        if (!q) {
            this.state.firstPlayerIndex = ranking[0];
            this.state.currentPlayerIndex = ranking[0];
            this.state.status = 'playing';
            this.state.tributeQueue = null;
            this.state.tributeStepIndex = 0;
            return;
        }
        this.state.tributeQueue = q;
        this.state.tributeStepIndex = 0;
        this.state.tributeRoundHead = ranking[0];
        this.state.status = 'tribute';
        this.syncTributeCurrentPlayer();
    }
    /** 提交进贡或还牌（仅轮到 from 座位的玩家） */
    submitTributeAction(playerId, cardId) {
        if (this.state.status !== 'tribute' || !this.state.tributeQueue) {
            return { success: false, message: '当前不在进贡阶段' };
        }
        const step = this.state.tributeQueue[this.state.tributeStepIndex];
        if (!step)
            return { success: false, message: '进贡已完成' };
        const playerIndex = this.state.players.findIndex((p) => p.id === playerId);
        if (playerIndex === -1)
            return { success: false, message: '玩家不存在' };
        if (playerIndex !== step.from)
            return { success: false, message: '未轮到你进贡/还牌' };
        const card = this.state.players[playerIndex].cards.find((c) => c.id === cardId);
        if (!card)
            return { success: false, message: '你没有这张牌' };
        if (step.type === 'tribute') {
            if (!this.isValidTributePick(this.state.players[playerIndex], card)) {
                return { success: false, message: '须进贡手中最大牌（红心级牌不可进贡）' };
            }
        }
        else {
            if (!this.isValidReturnPick(this.state.players[playerIndex], card)) {
                return { success: false, message: '还牌须为 10 及以下（若无则任意最小）' };
            }
        }
        this.removeCardFromPlayer(playerIndex, card);
        this.state.players[step.to].cards.push(card);
        this.state.players[step.from].cards = sortCards(this.state.players[step.from].cards);
        this.state.players[step.to].cards = sortCards(this.state.players[step.to].cards);
        this.state.tributeStepIndex++;
        if (this.state.tributeStepIndex >= this.state.tributeQueue.length) {
            const head = this.state.tributeRoundHead ?? 0;
            this.state.tributeRoundHead = null;
            this.state.firstPlayerIndex = head;
            this.state.currentPlayerIndex = head;
            this.state.tributeQueue = null;
            this.state.tributeStepIndex = 0;
            this.state.status = 'playing';
        }
        else {
            this.syncTributeCurrentPlayer();
        }
        return { success: true };
    }
    /** AI 自动进贡/还牌一步 */
    autoAdvanceTributeStep() {
        if (this.state.status !== 'tribute' || !this.state.tributeQueue)
            return;
        const step = this.state.tributeQueue[this.state.tributeStepIndex];
        if (!step)
            return;
        const from = this.state.players[step.from];
        if (!from.isAI)
            return;
        if (step.type === 'tribute') {
            const pool = from.cards.filter((c) => !this.isFengRenPei(c));
            const use = pool.length ? pool : from.cards;
            const maxV = Math.max(...use.map((c) => c.value));
            const card = use.find((c) => c.value === maxV);
            this.submitTributeAction(from.id, card.id);
        }
        else {
            const low = from.cards.filter((c) => c.value <= 10);
            const pool = low.length ? low : from.cards;
            const card = [...pool].sort((a, b) => a.value - b.value)[0];
            this.submitTributeAction(from.id, card.id);
        }
    }
    getCurrentTributeStep() {
        if (this.state.status !== 'tribute' || !this.state.tributeQueue)
            return null;
        return this.state.tributeQueue[this.state.tributeStepIndex] ?? null;
    }
    addPlayer(id, name, isAI) {
        if (this.state.players.length >= 4)
            return null;
        const position = this.state.players.length;
        const player = {
            id,
            name,
            position,
            isAI,
            cards: [],
            isReady: false,
            isOnline: true,
            level: 2,
        };
        this.state.players.push(player);
        return player;
    }
    removePlayer(id) {
        const index = this.state.players.findIndex((p) => p.id === id);
        if (index > -1)
            this.state.players.splice(index, 1);
    }
    startGame() {
        if (this.state.players.length < 4)
            return;
        this.state.status = 'dealing';
        this.state.levelRank = levelToRank(this.state.currentLevel);
        this.state.lastRoundRanking = null;
        this.state.roundFinishOrder = [];
        const deck = shuffleDeck(createDeck());
        const reveal = deck[0];
        const hands = dealCards(deck, 4);
        this.state.players.forEach((player, i) => {
            player.cards = hands[i];
        });
        this.state.status = 'playing';
        const first = this.firstSeatFromReveal(reveal);
        this.state.firstPlayerIndex = first;
        this.state.currentPlayerIndex = first;
        this.state.lastPlayerIndex = -1;
        this.state.lastPlayedPattern = null;
        this.state.playedCards = [];
        this.state.tributeQueue = null;
        this.state.tributeStepIndex = 0;
        this.state.tributeRoundHead = null;
    }
    playCards(playerId, cards) {
        const playerIndex = this.state.players.findIndex((p) => p.id === playerId);
        if (playerIndex === -1)
            return { success: false, message: '玩家不存在' };
        if (this.state.status !== 'playing')
            return { success: false, message: '当前不可出牌' };
        if (playerIndex !== this.state.currentPlayerIndex) {
            return { success: false, message: '还未轮到你出牌' };
        }
        const player = this.state.players[playerIndex];
        if (player.cards.length === 0)
            return { success: false, message: '你已出完牌' };
        const hasCards = cards.every((c) => player.cards.some((pc) => pc.id === c.id));
        if (!hasCards)
            return { success: false, message: '你没有这些牌' };
        const pattern = analyzePattern(cards, this.getJudgeContext());
        if (!pattern)
            return { success: false, message: '无效的牌型' };
        if (this.state.lastPlayerIndex !== -1 && !canBeat(pattern, this.state.lastPlayedPattern)) {
            return { success: false, message: '牌型不足以压制上家' };
        }
        cards.forEach((c) => {
            const idx = player.cards.findIndex((pc) => pc.id === c.id);
            if (idx > -1)
                player.cards.splice(idx, 1);
        });
        this.state.playedCards.push({
            position: playerIndex,
            cards,
            pattern,
        });
        this.state.lastPlayedPattern = pattern;
        this.state.lastPlayerIndex = playerIndex;
        if (player.cards.length === 0) {
            this.state.roundFinishOrder.push(playerIndex);
            if (this.state.roundFinishOrder.length === 3) {
                const fourth = [0, 1, 2, 3].find((p) => !this.state.roundFinishOrder.includes(p));
                if (fourth !== undefined)
                    this.state.roundFinishOrder.push(fourth);
                return this.handleRoundEnd();
            }
            this.startTrickAfterPlayerOut(this.state.lastPlayerIndex);
            return { success: true };
        }
        this.nextPlayer();
        return { success: true };
    }
    pass(playerId) {
        const playerIndex = this.state.players.findIndex((p) => p.id === playerId);
        if (playerIndex === -1)
            return { success: false, message: '玩家不存在' };
        if (this.state.status !== 'playing')
            return { success: false, message: '当前不可不出' };
        if (playerIndex !== this.state.currentPlayerIndex) {
            return { success: false, message: '还未轮到你出牌' };
        }
        if (this.state.lastPlayerIndex === -1) {
            return { success: false, message: '你是第一个出牌的，不能不出' };
        }
        this.nextPlayer();
        return { success: true };
    }
    /** 有人出完牌后新开一圈：领出者依「接风」由对家优先（见 leaderAfterPlayerFinishedOut） */
    startTrickAfterPlayerOut(lastWinner) {
        this.state.lastPlayedPattern = null;
        this.state.lastPlayerIndex = -1;
        this.state.playedCards = [];
        const leader = this.state.players[lastWinner].cards.length > 0
            ? lastWinner
            : this.leaderAfterPlayerFinishedOut(lastWinner);
        this.state.firstPlayerIndex = leader;
        this.state.currentPlayerIndex = leader;
    }
    nextPlayer() {
        const next = this.nextActivePlayer(this.state.currentPlayerIndex);
        if (this.state.lastPlayerIndex !== -1 && next === this.state.lastPlayerIndex) {
            this.startNextTrick(this.state.lastPlayerIndex);
            return;
        }
        this.state.currentPlayerIndex = next;
    }
    startNextTrick(winnerIndex) {
        const leader = this.state.players[winnerIndex].cards.length > 0
            ? winnerIndex
            : this.leaderAfterPlayerFinishedOut(winnerIndex);
        this.state.firstPlayerIndex = leader;
        this.state.currentPlayerIndex = leader;
        this.state.lastPlayerIndex = -1;
        this.state.lastPlayedPattern = null;
        this.state.playedCards = [];
    }
    handleRoundEnd() {
        this.state.lastRoundRanking = [...this.state.roundFinishOrder];
        const ranking = this.state.lastRoundRanking;
        const { upgrades, needContinueA } = this.calculateUpgrades(ranking);
        this.state.currentLevel += upgrades;
        this.state.roundFinishOrder = [];
        if (this.state.currentLevel > 14) {
            if (needContinueA) {
                this.state.status = 'playing';
                this.state.levelRank = levelToRank(this.state.currentLevel);
                this.startNewRound();
                return { success: true, message: '打 A 未成功，继续打 A', roundFinished: true };
            }
            this.state.status = 'game_over';
            return { success: true, message: '游戏结束', roundFinished: true };
        }
        this.state.levelRank = levelToRank(this.state.currentLevel);
        this.startNewRound();
        return { success: true, message: `升级${upgrades}级，当前等级${this.state.currentLevel}`, roundFinished: true };
    }
    calculateUpgrades(ranking) {
        const isSameTeam = (a, b) => (a + b) % 2 === 0;
        if (isSameTeam(ranking[0], ranking[1])) {
            if (this.state.currentLevel === 14) {
                if (ranking[2] === (ranking[0] + 2) % 4) {
                    return { upgrades: 0, needContinueA: true };
                }
                return { upgrades: 3, needContinueA: false };
            }
            return { upgrades: 3, needContinueA: false };
        }
        if (isSameTeam(ranking[0], ranking[2])) {
            if (this.state.currentLevel === 14) {
                if (ranking[3] === (ranking[0] + 2) % 4) {
                    return { upgrades: 0, needContinueA: true };
                }
                return { upgrades: 2, needContinueA: false };
            }
            return { upgrades: 2, needContinueA: false };
        }
        return { upgrades: 1, needContinueA: false };
    }
    startNewRound() {
        this.state.roundNumber++;
        this.state.lastPlayerIndex = -1;
        this.state.lastPlayedPattern = null;
        this.state.playedCards = [];
        this.state.roundFinishOrder = [];
        const pendingRanking = this.state.lastRoundRanking;
        const deck = shuffleDeck(createDeck());
        const reveal = deck[0];
        const hands = dealCards(deck, 4);
        this.state.players.forEach((player, i) => {
            player.cards = hands[i];
        });
        this.state.levelRank = levelToRank(this.state.currentLevel);
        if (pendingRanking && pendingRanking.length === 4) {
            this.startTributePhase(pendingRanking);
        }
        else {
            const first = this.firstSeatFromReveal(reveal);
            this.state.firstPlayerIndex = first;
            this.state.currentPlayerIndex = first;
            this.state.status = 'playing';
        }
        this.state.lastRoundRanking = null;
    }
    getState() {
        return {
            ...this.state,
            levelRank: levelToRank(this.state.currentLevel),
        };
    }
    getPlayer(id) {
        return this.state.players.find((p) => p.id === id);
    }
}
