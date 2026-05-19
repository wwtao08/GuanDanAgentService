/**
 * 全局游戏配置（聚合入口）
 *
 * - 服务端业务：`import { gameConfig } from './config/game.js'`
 * - 前端仅可引用 `./game.client-shim.ts`（Vite 别名 `@game-config`），避免密钥进入浏览器包
 *
 * 环境变量说明见同目录 `env.ts` 顶部注释。
 */
import { clientGameConfig } from './client.defaults.js'
import { serverRuntimeDefaults } from './server.defaults.js'
import { buildResolvedServerConfig } from './env.js'

const resolvedServer = buildResolvedServerConfig(serverRuntimeDefaults)

export const gameConfig = {
  client: clientGameConfig,
  server: resolvedServer,
} as const

export type GameConfig = typeof gameConfig
