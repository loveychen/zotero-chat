/**
 * AI Chat Types and Interfaces
 */

/**
 * Message role type
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Message type - determines how it's displayed
 */
export type MessageType = "text" | "system" | "thinking" | "tool";

/**
 * Tool call information
 */
export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
  timestamp?: number;
}

/**
 * Thinking process information
 */
export interface ThinkingInfo {
  content: string;
  timestamp?: number;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

/**
 * Chat statistics
 */
export interface ChatStats {
  duration?: number;
  iterations?: number;
  usage?: TokenUsage;
  totalUsage?: TokenUsage; // Aggregated usage from multiple calls
}

/**
 * Chat message interface
 */
export interface AIChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: number;
  type?: MessageType;
  avatar?: string;
  thinking?: ThinkingInfo[];
  toolCalls?: ToolCall[];
  stats?: ChatStats;
  editable?: boolean;
}

/**
 * Agent interface
 */
export interface Agent {
  run(prompt: string): Promise<string>;
  clear(): void;
}

/**
 * AI Chat configuration
 */
export interface AIChatConfig {
  container: HTMLElement;
  agent: Agent | null;
}

/**
 * AI Chat UI interface
 */
export interface IAIChatUI {
  render(container: HTMLElement): void;
  addMessage(role: MessageRole, content: string, messageData?: Partial<AIChatMessage>): void;
  showLoading(): HTMLElement;
  hideLoading(element: HTMLElement): void;
  clearMessages(): void;
  setProcessing(isProcessing: boolean): void;
}

/**
 * UI Element references
 */
export interface UIDOMRefs {
  chatContainer: HTMLElement;
  userInput: HTMLTextAreaElement;
  sendBtn?: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  inputContainer: HTMLElement;
  quoteContainer?: HTMLElement | null;
}
