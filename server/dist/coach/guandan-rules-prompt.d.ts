/**
 * 供「出牌建议」LLM 使用的规则与局面说明（与服务端 judge 一致；勿写死具体一步，只描述规则空间）
 */
/**
 * 教练讲解 / 出牌建议共用：防止模型把「顺子」误称「炸弹」
 */
export declare const GUANDAN_TERMINOLOGY_BLOCK: string;
export declare const GUANDAN_PLAY_RULES_BLOCK: string;
