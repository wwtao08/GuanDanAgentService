/**
 * 必须在其它业务模块（尤其 `config/game.ts`）之前加载。
 * 固定读取 `guandan/server/.env`，避免从仓库根目录启动时 cwd 不对导致读不到密钥。
 */
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(dir, '..', '.env')

if (!existsSync(envPath)) {
  console.warn(`[env] 未找到 ${envPath}，可复制 .env.example；教练需 OPENAI_API_KEY 等变量。`)
} else {
  const r = config({ path: envPath })
  if (r.error) {
    console.warn(`[env] 读取 ${envPath} 失败:`, r.error.message)
  } else if (r.parsed && Object.keys(r.parsed).length > 0) {
    console.log(`[env] 已加载 ${path.basename(envPath)}（${Object.keys(r.parsed).length} 项）`)
  }
}
