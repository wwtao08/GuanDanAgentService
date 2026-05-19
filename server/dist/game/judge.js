import { CARD_VALUES } from './rules.js';
function isFengRenPei(card, levelRank) {
    return card.suit === 'hearts' && card.rank === levelRank;
}
function partitionWild(cards, levelRank) {
    const wild = [];
    const real = [];
    for (const c of cards) {
        if (isFengRenPei(c, levelRank))
            wild.push(c);
        else
            real.push(c);
    }
    return { wild, real };
}
function buildValueCounts(cards) {
    const m = new Map();
    for (const c of cards) {
        m.set(c.value, (m.get(c.value) || 0) + 1);
    }
    return m;
}
/** 顺子：不含 2 与王牌；逢人配作万能补缺 */
function straightTopValue(counts, wild, len) {
    if (len < 5)
        return null;
    for (let start = 3; start <= 14; start++) {
        const end = start + len - 1;
        if (end > 14)
            continue;
        let w = wild;
        for (let v = start; v <= end; v++) {
            if (v === 15) {
                w = -1;
                break;
            }
            const need = Math.max(0, 1 - (counts.get(v) || 0));
            w -= need;
        }
        if (w < 0)
            continue;
        let extra = 0;
        for (const [rv, c] of counts) {
            if (rv >= start && rv <= end)
                extra += Math.max(0, c - 1);
            else
                extra += c;
        }
        if (extra === 0 && w === 0)
            return end;
    }
    return null;
}
/** 钢板（三同连张）：相邻两副三张，6 张 */
function tripleRunTopValue(counts, wild) {
    for (let v = 3; v <= 13; v++) {
        const a = v;
        const b = v + 1;
        if (b > 14)
            continue;
        const needA = Math.max(0, 3 - (counts.get(a) || 0));
        const needB = Math.max(0, 3 - (counts.get(b) || 0));
        if (needA + needB > wild)
            continue;
        const wRem = wild - needA - needB;
        let extra = 0;
        for (const [rv, c] of counts) {
            if (rv === a)
                extra += Math.max(0, c - 3);
            else if (rv === b)
                extra += Math.max(0, c - 3);
            else
                extra += c;
        }
        if (extra === 0 && wRem === 0)
            return b;
    }
    return null;
}
/** 三连对：三对连续对子，6 张 */
function straightPairTopValue(counts, wild) {
    for (let v = 3; v <= 12; v++) {
        const rs = [v, v + 1, v + 2];
        if (rs.some((r) => r > 14))
            continue;
        const need = Math.max(0, 2 - (counts.get(rs[0]) || 0)) +
            Math.max(0, 2 - (counts.get(rs[1]) || 0)) +
            Math.max(0, 2 - (counts.get(rs[2]) || 0));
        if (need > wild)
            continue;
        const wRem = wild - need;
        let extra = 0;
        for (const [rv, c] of counts) {
            const idx = rs.indexOf(rv);
            if (idx >= 0)
                extra += Math.max(0, c - 2);
            else
                extra += c;
        }
        if (extra === 0 && wRem === 0)
            return rs[2];
    }
    return null;
}
function bombMainValue(counts, wild, n) {
    if (n < 4 || n > 10)
        return null;
    for (const [rv, c] of counts) {
        if (rv >= 16)
            continue;
        const needWild = n - c;
        if (needWild < 0 || needWild > wild)
            continue;
        let other = 0;
        for (const [r2, c2] of counts) {
            if (r2 !== rv)
                other += c2;
        }
        if (other === 0 && needWild === wild)
            return rv;
    }
    return null;
}
function tripleWithPairBrute(counts, wild) {
    const entries = [...counts.entries()].filter(([v]) => v < 16);
    for (const [tv, _] of entries) {
        for (const [pv, __] of entries) {
            if (tv === pv)
                continue;
            let w = wild;
            const test = new Map(counts);
            const nt = Math.max(0, 3 - (test.get(tv) || 0));
            if (nt > w)
                continue;
            w -= nt;
            test.set(tv, Math.max(0, (test.get(tv) || 0) - (3 - nt)));
            const np = Math.max(0, 2 - (test.get(pv) || 0));
            if (np > w)
                continue;
            w -= np;
            test.set(pv, Math.max(0, (test.get(pv) || 0) - (2 - np)));
            let rest = 0;
            for (const [, c] of test)
                rest += c;
            if (rest === 0 && w === 0)
                return { main: tv };
        }
    }
    return null;
}
function sortedUnion(cards) {
    return [...cards].sort((a, b) => a.value - b.value);
}
function straightBombTop(cards, wild, reals) {
    if (reals.some((c) => c.rank === '2' || c.suit === 'joker'))
        return null;
    const w = wild.length;
    for (const suit of ['spades', 'hearts', 'clubs', 'diamonds']) {
        const inSuit = reals.filter((c) => c.suit === suit);
        const out = reals.filter((c) => c.suit !== suit);
        if (out.length > 0)
            continue;
        const counts = buildValueCounts(inSuit);
        const top = straightTopValue(counts, w, cards.length);
        if (top !== null)
            return top;
    }
    return null;
}
export function analyzePattern(cards, ctx) {
    if (cards.length === 0)
        return null;
    const levelRank = ctx?.levelRank ?? '3';
    const { wild, real } = partitionWild(cards, levelRank);
    const sorted = sortedUnion(cards);
    if (cards.length === 4 && cards.every((c) => c.suit === 'joker')) {
        return { type: 'joker_bomb', cards: sorted, mainValue: 100 };
    }
    const realNoJoker = real.filter((c) => c.suit !== 'joker');
    const countsNoJokers = buildValueCounts(realNoJoker);
    const wildCount = wild.length;
    const n = cards.length;
    /* 先判顺子/同花顺/三带二等，再判炸弹，避免与「顺子≠炸弹」的惯蛋常识冲突（同点炸弹仍会在后文命中） */
    if (n >= 5 && realNoJoker.length + wild.length === n) {
        const sb = straightBombTop(cards, wild, realNoJoker);
        if (sb !== null)
            return { type: 'straight_bomb', cards: sorted, mainValue: sb };
    }
    if (n === 6) {
        const tr = tripleRunTopValue(countsNoJokers, wildCount);
        if (tr !== null)
            return { type: 'triple_run', cards: sorted, mainValue: tr };
        const sp = straightPairTopValue(countsNoJokers, wildCount);
        if (sp !== null)
            return { type: 'straight_pair', cards: sorted, mainValue: sp };
    }
    if (n >= 5) {
        if (!realNoJoker.some((c) => c.rank === '2' || c.suit === 'joker')) {
            const st = straightTopValue(countsNoJokers, wildCount, n);
            if (st !== null)
                return { type: 'straight', cards: sorted, mainValue: st };
        }
    }
    if (n === 5) {
        const tw = tripleWithPairBrute(countsNoJokers, wildCount);
        if (tw !== null)
            return { type: 'triple_with_pair', cards: sorted, mainValue: tw.main };
    }
    if (n >= 4 && n <= 10) {
        const bm = bombMainValue(countsNoJokers, wildCount, n);
        if (bm !== null)
            return { type: 'bomb', cards: sorted, mainValue: bm };
    }
    if (n === 3) {
        for (const [rv, c] of countsNoJokers) {
            const need = Math.max(0, 3 - c);
            if (need <= wildCount) {
                let other = 0;
                for (const [r2, c2] of countsNoJokers) {
                    if (r2 !== rv)
                        other += c2;
                }
                if (other === 0 && need === wildCount)
                    return { type: 'triple', cards: sorted, mainValue: rv };
            }
        }
    }
    if (n === 2) {
        for (const [rv, c] of countsNoJokers) {
            const need = Math.max(0, 2 - c);
            if (need <= wildCount) {
                let other = 0;
                for (const [r2, c2] of countsNoJokers) {
                    if (r2 !== rv)
                        other += c2;
                }
                if (other === 0 && need === wildCount)
                    return { type: 'pair', cards: sorted, mainValue: rv };
            }
        }
        if (wildCount === 2 && realNoJoker.length === 0) {
            return { type: 'pair', cards: sorted, mainValue: CARD_VALUES[levelRank] };
        }
    }
    if (n === 1) {
        if (wildCount === 1)
            return null;
        const only = real[0];
        if (!only)
            return null;
        return { type: 'single', cards: sorted, mainValue: only.value };
    }
    return null;
}
function patternCategory(p) {
    if (p.type === 'joker_bomb')
        return 6;
    if (p.type === 'bomb' && p.cards.length >= 6)
        return 5;
    if (p.type === 'straight_bomb')
        return 4;
    if (p.type === 'bomb' && p.cards.length === 5)
        return 3;
    if (p.type === 'bomb' && p.cards.length === 4)
        return 2;
    return 0;
}
export function canBeat(pattern, target) {
    if (!target)
        return true;
    if (pattern.type === 'joker_bomb')
        return true;
    if (target.type === 'joker_bomb')
        return false;
    const pc = patternCategory(pattern);
    const tc = patternCategory(target);
    if (pc > 0 && tc === 0)
        return true;
    if (pc === 0 && tc > 0)
        return false;
    if (pc > 0 && tc > 0) {
        if (pc !== tc)
            return pc > tc;
        if (pattern.type === 'straight_bomb' && target.type === 'straight_bomb')
            return pattern.mainValue > target.mainValue;
        if (pattern.type === 'bomb' && target.type === 'bomb') {
            if (pattern.cards.length !== target.cards.length)
                return pattern.cards.length > target.cards.length;
            return pattern.mainValue > target.mainValue;
        }
        return false;
    }
    if (pattern.type !== target.type)
        return false;
    if (pattern.cards.length !== target.cards.length)
        return false;
    return pattern.mainValue > target.mainValue;
}
export function getPatternName(type) {
    const names = {
        single: '单张',
        pair: '对子',
        triple: '三张',
        triple_with_pair: '三带二',
        straight: '顺子',
        straight_pair: '三连对',
        triple_run: '钢板',
        bomb: '炸弹',
        straight_bomb: '同花顺',
        joker_bomb: '四王',
    };
    return names[type];
}
