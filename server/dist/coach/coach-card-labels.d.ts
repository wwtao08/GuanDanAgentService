import { type JudgeContext } from '../game/judge.js';
import type { Card } from '../game/rules.js';
import type { CoachRecommended } from './types.js';
export declare function patternTypeToZh(type: string | null | undefined): string | null;
export declare function toReadableCardName(card: Card): string;
export declare function normalizeRecommended(cards: Card[], ctx: JudgeContext): CoachRecommended;
