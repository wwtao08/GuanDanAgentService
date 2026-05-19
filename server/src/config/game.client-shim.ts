/**
 * 仅给前端打包使用：与 `game.ts` 的 `client` 段一致，不含服务端密钥与端口。
 * @see ./game.ts
 */
import { clientGameConfig } from './client.defaults.js'

export const gameConfig = {
  client: clientGameConfig,
} as const
