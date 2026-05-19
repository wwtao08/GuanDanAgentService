/**
 * 前后端共用的游戏参数（不含密钥，可被前端安全打包）
 */
export declare const clientGameConfig: {
    /**
     * 手牌长按多少毫秒后，进入「刷选」模式（按住拖过多张牌一并选中）
     */
    readonly handLongPressMs: 420;
    /**
     * 手牌按下后，若指针移动超过该像素（直线距离），则取消本次长按判定，避免与页面滚动误触冲突
     */
    readonly handMoveCancelPx: 14;
    /**
     * Socket.IO 默认连接的服务端地址（本地开发一般为 localhost）
     * 若设置环境变量 `VITE_SOCKET_URL`，则优先使用该变量
     */
    readonly socketUrl: "http://localhost:3001";
};
export declare const serverGameConfigBase: {
    /**
     * AI 出完一手牌后，等待多少毫秒再执行下一步（出牌或进贡等），用于控制对局节奏
     */
    readonly aiPlayDelayMs: 1000;
    /**
     * AI 选择「不要/过」后，等待多少毫秒再轮到后续逻辑
     */
    readonly aiPassDelayMs: 500;
    /**
     * 进贡、还牌阶段，每一步由 AI 自动完成时，步骤之间的间隔（毫秒），便于玩家看清过程
     */
    readonly tributeStepDelayMs: 550;
    /**
     * 教练功能中，调用大模型生成「理由」时的网络超时（毫秒）
     * 若进程环境变量 `COACH_REASON_TIMEOUT_MS` 已设置，则以环境变量为准；否则用本默认值。
     * 云端 API（尤其 Kimi）常超过 3s，默认放宽以免频繁 AbortError 走兜底。
     */
    readonly coachReasonTimeoutMs: 25000;
    /**
     * 教练 LLM 默认模型（可被环境变量 `COACH_OPENAI_MODEL` 覆盖）
     * Moonshot 官方 Kimi K2.5：`kimi-k2.5`（见 platform.moonshot.ai 文档）
     */
    readonly coachDefaultOpenAiModel: "kimi-k2.5";
};
