/**
 * 从流式响应中读出正文增量并回调；返回完整拼接文本
 */
export declare function consumeOpenAIChatSse(response: Response, onDelta: (chunk: string) => void): Promise<string>;
