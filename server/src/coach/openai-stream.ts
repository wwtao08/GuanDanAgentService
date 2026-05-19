/**
 * OpenAI 兼容 Chat Completions 的 SSE 流解析（data: {...}\\n\\n）
 * 兼容 `data: {...}` 与 `data:{...}`（冒号后有无空格）
 */
function parseSseDeltaContent(line: string): string {
  if (!line.startsWith('data:')) return ''
  const data = line.slice('data:'.length).trimStart()
  if (data === '[DONE]') return ''
  try {
    const json = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: unknown } }>
    }
    const delta = json.choices?.[0]?.delta
    if (!delta) return ''
    const c = delta.content
    if (typeof c === 'string') return c
    if (Array.isArray(c)) {
      return c
        .filter((x: { type?: string; text?: string }) => x?.type === 'text' && x.text)
        .map((x: { text?: string }) => x.text ?? '')
        .join('')
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * 从流式响应中读出正文增量并回调；返回完整拼接文本
 */
export async function consumeOpenAIChatSse(
  response: Response,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    const t = await response.text()
    if (t) onDelta(t)
    return t
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '')
      if (!line.startsWith('data:')) continue
      const piece = parseSseDeltaContent(line)
      if (piece) {
        full += piece
        onDelta(piece)
      }
    }
  }

  if (buffer.trim()) {
    for (const rawLine of buffer.split('\n')) {
      const line = rawLine.replace(/\r$/, '')
      if (!line.startsWith('data:')) continue
      const piece = parseSseDeltaContent(line)
      if (piece) {
        full += piece
        onDelta(piece)
      }
    }
  }

  return full
}
