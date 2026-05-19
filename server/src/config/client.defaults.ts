/**
 * 前端（浏览器）使用的默认参数：无密钥，可经 `@game-config` 安全打包进客户端。
 */
export const clientGameConfig = {
  /**
   * 手牌长按多少毫秒后，进入「刷选」模式（按住拖过多张牌一并选中）
   */
  handLongPressMs: 420,

  /**
   * 手牌按下后，若指针移动超过该像素（直线距离），则取消本次长按判定，避免与页面滚动误触冲突
   */
  handMoveCancelPx: 14,

  /**
   * Socket.IO 默认连接的服务端地址（本地开发一般为 localhost）
   * 构建时可使用环境变量 `VITE_SOCKET_URL` 覆盖（见客户端 `useSocket`）
   */
  socketUrl: 'http://localhost:3001',
} as const
