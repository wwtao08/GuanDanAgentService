import './load-env.js'

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { gameConfig } from './config/game.js'
import { setupSocket } from './socket/index.js'

const app = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = gameConfig.server.httpPort

setupSocket(httpServer)

httpServer.listen(PORT, () => {
  const s = gameConfig.server
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log('[coach] 配置:', {
    coachHintEnabled: s.coachHintEnabled,
    coachUseLlm: s.coachUseLlm,
    coachUseStream: s.coachUseStream,
    hasOpenAiKey: s.openAiApiKey.length > 0,
    openAiApiBase: s.openAiApiBase,
    model: s.coachLlmModel,
    coachReasonTimeoutMs: s.coachReasonTimeoutMs,
  })
})
