/**
 * AI Chat UI Component
 * Builds and manages the AI chat interface using pure DOM API
 */

import { generateStylesheet } from "./styles";
import { AIChatHandlers } from "./handlers";
import type { UIDOMRefs, Agent, MessageRole, IAIChatUI, AIChatMessage } from "./types";

/**
 * Helper function to log messages
 * Tries to use ztoolkit if available, otherwise uses console
 */
function logMessage(...args: any[]): void {
  try {
    const zt = (globalThis as any).ztoolkit;
    if (zt && typeof zt.log === "function") {
      zt.log(...args);
      return;
    }
  } catch {
    // Fall through to console
  }
  // Fallback to console if ztoolkit not available
  if (typeof console !== "undefined" && console.log) {
    console.log(...args);
  }
}

export class AIChatUI implements IAIChatUI {
  private handlers: AIChatHandlers | null = null;
  private domRefs: UIDOMRefs | null = null;
  private agent: Agent | null = null;
  private doc: Document | null = null;

  constructor(agent?: Agent) {
    this.agent = agent || null;
  }

  /**
   * Render the entire UI
   */
  render(container: HTMLElement): void {
    try {
      // Get the document from the container
      this.doc = container.ownerDocument || (globalThis as any).document;
      if (!this.doc) {
        throw new Error("Cannot access document object from container or global context");
      }

      logMessage("[AI Chat] Starting render process...");

      // Setup parent container layout - flex column to fill available space
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.height = "100%";
      container.style.width = "100%";
      container.style.minHeight = "0";  // Important: allow shrinking
      container.style.backgroundColor = "white";
      container.style.overflow = "hidden";  // Prevent outer scrollbars

      // Inject styles
      logMessage("[AI Chat] Injecting styles...");
      this.injectStyles();
      logMessage("[AI Chat] ✓ Styles injected");

      // Create main structure
      logMessage("[AI Chat] Creating chat container...");
      this.createChatContainer(container);
      logMessage("[AI Chat] ✓ Chat container created");

      logMessage("[AI Chat] Creating input container...");
      this.createInputContainer(container);
      logMessage("[AI Chat] ✓ Input container created");

      // Cache DOM references
      logMessage("[AI Chat] Caching DOM references...");
      this.cacheDOMRefs();
      logMessage("[AI Chat] ✓ DOM references cached");

      // Setup handlers
      if (this.domRefs) {
        logMessage("[AI Chat] Setting up event handlers...");
        this.handlers = new AIChatHandlers(this.domRefs, this.agent);
        this.handlers.setupEventListeners();
        logMessage("[AI Chat] ✓ Event handlers set up");
      } else {
        logMessage("[AI Chat] ❌ Failed to cache DOM refs, skipping handlers");
      }

      // Set initial focus
      if (this.domRefs?.userInput) {
        logMessage("[AI Chat] Setting initial focus...");
        this.domRefs.userInput.focus();
      }

      logMessage("[AI Chat] ✓ UI rendered successfully");
    } catch (error: any) {
      logMessage("[AI Chat] ❌ Error during render:", error);
      logMessage("[AI Chat] Error message:", error?.message);
      logMessage("[AI Chat] Error stack:", error?.stack);
      throw error;
    }
  }

  /**
   * Add a message to the chat
   */
  addMessage(role: MessageRole, content: string, messageData?: Partial<AIChatMessage>): void {
    if (this.handlers) {
      this.handlers.addMessage(role, content, messageData);
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(): HTMLElement {
    if (this.handlers) {
      return this.handlers.showLoading();
    }
    return document.createElement("div");
  }

  /**
   * Hide loading indicator
   */
  hideLoading(element: HTMLElement): void {
    if (this.handlers) {
      this.handlers.hideLoading(element);
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    if (this.handlers) {
      this.handlers.clearMessages();
    }
  }

  /**
   * Set processing state
   */
  setProcessing(isProcessing: boolean): void {
    if (this.handlers) {
      this.handlers.setProcessing(isProcessing);
    }
  }

  /**
   * Create chat container (messages area)
   */
  private createChatContainer(parent: HTMLElement): void {
    try {
      if (!this.doc) throw new Error("Document not initialized");
      logMessage("[AI Chat] Creating chat container...");
      const container = this.doc.createElement("div");
      container.id = "chat-container";
      
      // Apply flex layout to fill available space
      // flex: 1 1 0% makes it grow, shrink, and start from 0% size
      container.style.flex = "1 1 0%";
      container.style.minHeight = "0";
      container.style.height = "auto";
      container.style.overflowY = "auto";
      container.style.overflowX = "hidden";
      container.style.padding = "20px";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "15px";
      container.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
      // Custom scrollbar styling for WebKit browsers
      container.style.scrollbarWidth = "thin";
      container.style.scrollbarColor = "#c0c0c0 transparent";

      // Create welcome message
      const welcome = this.createWelcomeMessage();
      container.appendChild(welcome);

      parent.appendChild(container);
      logMessage("[AI Chat] ✓ Chat container created");
    } catch (error: any) {
      logMessage("[AI Chat] ❌ Error creating chat container:", error);
      throw error;
    }
  }

  /**
   * Create input container
   */
  private createInputContainer(parent: HTMLElement): void {
    try {
      if (!this.doc) throw new Error("Document not initialized");
      logMessage("[AI Chat] Creating input container...");
      const container = this.doc.createElement("div");
      container.id = "input-container";
      
      // Apply inline styles - flex column layout to allow quote above input
      // flex: 0 0 auto prevents it from growing or shrinking
      container.style.padding = "0";
      container.style.paddingTop = "8px";
      container.style.paddingBottom = "12px";
      container.style.backgroundColor = "rgba(255, 255, 255, 0.98)";
      container.style.borderTop = "1px solid rgba(0, 0, 0, 0.12)";
      container.style.boxShadow = "0 -2px 10px rgba(0, 0, 0, 0.05)";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.flex = "0 0 auto";
      container.style.maxHeight = "200px";
      container.style.zIndex = "10";  // Keep above scrolling content

      // Textarea - expanded to full width minus clear button
      const textarea = this.doc.createElement("textarea");
      textarea.id = "user-input";
      textarea.placeholder = "输入问题（选中的文本会自动添加）...";
      textarea.rows = 1;
      textarea.style.width = "100%";
      textarea.style.padding = "10px 14px";
      textarea.style.border = "1px solid #d0d0d0";
      textarea.style.borderRadius = "18px";
      textarea.style.fontSize = "14px";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.minHeight = "38px";
      textarea.style.maxHeight = "100px";
      textarea.style.fontFamily = "inherit";
      textarea.style.backgroundColor = "white";
      textarea.style.transition = "all 0.2s ease";
      
      // Add focus event listener to textarea
      textarea.addEventListener("focus", () => {
        textarea.style.borderColor = "#0084ff";
        textarea.style.boxShadow = "0 0 0 2px rgba(0, 132, 255, 0.1)";
      });
      textarea.addEventListener("blur", () => {
        textarea.style.borderColor = "#d0d0d0";
        textarea.style.boxShadow = "none";
      });

      // Clear button - minimal icon style
      const clearBtn = this.doc.createElement("button");
      clearBtn.id = "clear-btn";
      clearBtn.title = "清空对话";
      clearBtn.style.padding = "6px";
      clearBtn.style.backgroundColor = "transparent";
      clearBtn.style.color = "#999";
      clearBtn.style.border = "none";
      clearBtn.style.borderRadius = "6px";
      clearBtn.style.fontSize = "14px";
      clearBtn.style.cursor = "pointer";
      clearBtn.style.whiteSpace = "nowrap";
      clearBtn.style.transition = "all 0.2s ease";
      clearBtn.style.minWidth = "28px";
      clearBtn.style.minHeight = "28px";

      // Set trash icon as SVG inline
      clearBtn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" style="display: block;">
        <path d="M 6 2 L 6 4 L 3 4 L 3 6 L 4 6 L 4 21 Q 4 22 5 22 L 19 22 Q 20 22 20 21 L 20 6 L 21 6 L 21 4 L 18 4 L 18 2 L 6 2 Z M 6 6 L 18 6 L 18 20 L 6 20 L 6 6 Z M 8 8 L 8 18 L 10 18 L 10 8 L 8 8 Z M 12 8 L 12 18 L 14 18 L 14 8 L 12 8 Z M 16 8 L 16 18 L 18 18 L 18 8 L 16 8 Z"/>
      </svg>`;
      
      // Clear button hover state
      clearBtn.addEventListener("mouseenter", () => {
        clearBtn.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
        clearBtn.style.color = "#666";
      });
      clearBtn.addEventListener("mouseleave", () => {
        clearBtn.style.backgroundColor = "transparent";
        clearBtn.style.color = "#999";
      });

      // Create quote container (for displaying selected text above input)
      const quoteContainer = this.doc.createElement("div");
      quoteContainer.id = "quote-container";
      quoteContainer.style.display = "none";  // Hidden by default
      quoteContainer.style.width = "fit-content"; // Let content determine width
      quoteContainer.style.maxWidth = "100%"; // But don't exceed container
      quoteContainer.style.overflow = "hidden"; // Prevent overflow

      // Create input wrapper for textarea and clear button in same row
      const inputWrapper = this.doc.createElement("div");
      inputWrapper.style.display = "flex";
      inputWrapper.style.gap = "8px";
      inputWrapper.style.alignItems = "center";

      inputWrapper.appendChild(textarea);
      inputWrapper.appendChild(clearBtn);
      container.appendChild(inputWrapper);

      // Insert quote container before inputWrapper
      container.insertBefore(quoteContainer, inputWrapper);

      parent.appendChild(container);
      logMessage("[AI Chat] ✓ Input container created");
    } catch (error: any) {
      logMessage("[AI Chat] ❌ Error creating input container:", error);
      throw error;
    }
  }

  /**
   * Create welcome message
   */
  private createWelcomeMessage(): HTMLElement {
    if (!this.doc) throw new Error("Document not initialized");
    const div = this.doc.createElement("div");
    div.className = "welcome-message";
    div.style.textAlign = "center";
    div.style.padding = "40px 20px";
    div.style.color = "#666";

    const h2 = this.doc.createElement("h2");
    h2.textContent = "🤖 AI 阅读助手";
    h2.style.color = "#0084ff";
    h2.style.marginBottom = "10px";
    h2.style.fontSize = "24px";
    h2.style.fontWeight = "600";

    const p1 = this.doc.createElement("p");
    p1.textContent = "我可以帮助您理解和分析当前论文";
    p1.style.fontSize = "14px";
    p1.style.lineHeight = "1.6";
    p1.style.margin = "5px 0";

    const features = this.doc.createElement("div");
    features.className = "welcome-features";
    features.style.display = "grid";
    features.style.gridTemplateColumns = "1fr 1fr";
    features.style.gap = "15px";
    features.style.marginTop = "30px";
    features.style.textAlign = "left";

    const featureData = [
      { title: "📄 论文分析", desc: "获取论文信息、总结内容" },
      { title: "🔍 文献搜索", desc: "在您的文献库中查找相关研究" },
      { title: "📝 笔记查看", desc: "回顾您的笔记和标注" },
      { title: "💬 智能问答", desc: "针对论文内容提问" },
    ];

    for (const feature of featureData) {
      const item = this.doc.createElement("div");
      item.className = "feature-item";
      item.style.backgroundColor = "white";
      item.style.padding = "15px";
      item.style.borderRadius = "12px";
      item.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";

      const h3 = this.doc.createElement("h3");
      h3.textContent = feature.title;
      h3.style.color = "#0084ff";
      h3.style.fontSize = "14px";
      h3.style.marginBottom = "5px";
      h3.style.fontWeight = "600";

      const p = this.doc.createElement("p");
      p.textContent = feature.desc;
      p.style.fontSize = "12px";
      p.style.color = "#666";

      item.appendChild(h3);
      item.appendChild(p);
      features.appendChild(item);
    }

    const p2 = this.doc.createElement("p");
    p2.style.marginTop = "30px";
    p2.style.color = "#999";
    p2.style.fontSize = "12px";
    p2.textContent = "提示：请先在设置中配置 API 密钥";

    div.appendChild(h2);
    div.appendChild(p1);
    div.appendChild(features);
    div.appendChild(p2);

    return div;
  }

  /**
   * Inject styles into the document
   */
  private injectStyles(): void {
    try {
      if (!this.doc) throw new Error("Document not initialized");
      logMessage("[AI Chat] Checking for existing styles...");
      
      // Skip style injection if document.head is not available
      // (common in Zotero plugin environments)
      if (!this.doc.head) {
        logMessage("[AI Chat] ⚠️ document.head not available, skipping CSS injection");
        logMessage("[AI Chat] Will use inline styles instead");
        return;
      }

      // Check if styles already injected
      if (this.doc.getElementById("ai-chat-styles")) {
        logMessage("[AI Chat] Styles already injected, skipping");
        return;
      }

      logMessage("[AI Chat] Generating stylesheet...");
      const styleEl = this.doc.createElement("style");
      styleEl.id = "ai-chat-styles";
      styleEl.textContent = generateStylesheet();

      logMessage("[AI Chat] Adding style element to document...");
      this.doc.head.appendChild(styleEl);
      logMessage("[AI Chat] ✓ Styles successfully injected");
    } catch (error: any) {
      logMessage("[AI Chat] ❌ Error injecting styles:", error);
      logMessage("[AI Chat] Error message:", error?.message);
      // Continue anyway - we can work without styles
      logMessage("[AI Chat] ⚠️ Will continue without CSS styles");
    }
  }

  /**
   * Cache DOM element references
   */
  private cacheDOMRefs(): void {
    if (!this.doc) throw new Error("Document not initialized");
    logMessage("[AI Chat] Looking for DOM elements...");
    
    const chatContainer = this.doc.getElementById(
      "chat-container",
    ) as HTMLElement | null;
    logMessage("[AI Chat] chatContainer:", chatContainer ? "found" : "NOT FOUND");
    
    const userInput = this.doc.getElementById(
      "user-input",
    ) as HTMLTextAreaElement | null;
    logMessage("[AI Chat] userInput:", userInput ? "found" : "NOT FOUND");
    
    const sendBtn = this.doc.getElementById(
      "send-btn",
    ) as HTMLButtonElement | null;
    logMessage("[AI Chat] sendBtn:", sendBtn ? "found" : "NOT FOUND");
    
    const clearBtn = this.doc.getElementById(
      "clear-btn",
    ) as HTMLButtonElement | null;
    logMessage("[AI Chat] clearBtn:", clearBtn ? "found" : "NOT FOUND");

    const inputContainer = this.doc.getElementById(
      "input-container",
    ) as HTMLElement | null;
    logMessage("[AI Chat] inputContainer:", inputContainer ? "found" : "NOT FOUND");

    const quoteContainer = this.doc.getElementById(
      "quote-container",
    ) as HTMLElement | null;
    logMessage("[AI Chat] quoteContainer:", quoteContainer ? "found" : "NOT FOUND");

    if (!chatContainer || !userInput || !clearBtn || !inputContainer) {
      logMessage("[AI Chat] ❌ Failed to cache DOM references - missing elements");
      logMessage("[AI Chat] chatContainer:", !!chatContainer);
      logMessage("[AI Chat] userInput:", !!userInput);
      logMessage("[AI Chat] clearBtn:", !!clearBtn);
      logMessage("[AI Chat] inputContainer:", !!inputContainer);
      throw new Error("Failed to cache DOM references - some elements are missing");
    }

    this.domRefs = {
      chatContainer,
      userInput,
      sendBtn: sendBtn || undefined,
      clearBtn,
      inputContainer,
      quoteContainer,
    };

    logMessage("[AI Chat] ✓ DOM references cached");
  }
}

/**
 * Create and render AI Chat UI
 */
export function createAIChatUI(
  container: HTMLElement,
  agent?: Agent,
): AIChatUI {
  const ui = new AIChatUI(agent);
  ui.render(container);
  return ui;
}
