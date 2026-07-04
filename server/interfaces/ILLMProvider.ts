// ──────────────────────────────────────────
// ILLMProvider — Abstraction over any LLM
// ──────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  text: string | null;
  toolCalls: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'error';
}

export interface ILLMProvider {
  complete(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    temperature?: number
  ): Promise<LLMResponse>;
}
