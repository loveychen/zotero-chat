/**
 * AI Chat Module
 * Main export for the AI chat UI component
 */

export { AIChatUI, createAIChatUI } from "./ui";
export { AIChatHandlers } from "./handlers";
export { generateStylesheet } from "./styles";
export type {
  MessageRole,
  AIChatMessage,
  Agent,
  AIChatConfig,
  IAIChatUI,
  UIDOMRefs,
} from "./types";
