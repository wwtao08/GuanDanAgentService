export declare const gameConfig: {
    readonly client: {
        readonly handLongPressMs: 420;
        readonly handMoveCancelPx: 14;
        readonly socketUrl: "http://localhost:3001";
    };
    readonly server: import("./env.js").ResolvedServerGameConfig;
};
export type GameConfig = typeof gameConfig;
