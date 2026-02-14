/**
 * AI Chat Event Handlers
 * Handles user interactions and messaging
 */

import { UIDOMRefs, AIChatMessage } from "./types";
import { applyStyles } from "./styles";
import { createAvatarElement, createClearIconSVG } from "./avatar";
import type { Agent } from "./types";

/**
 * Simple unique ID generator
 */
let messageIdCounter = 0;
function generateMessageId(): string {
  return `msg-${++messageIdCounter}`;
}

/**
 * Helper function to log messages
 * Tries to use ztoolkit if available, otherwise uses console
 */
function logMessage(...args: any[]){
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

/**
 * Format timestamp to readable time string
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export class AIChatHandlers {
  private isProcessing = false;
  private doc: Document;
  private onUserEdit?: (newMessage: string) => Promise<void>;

  constructor(
    private domRefs: UIDOMRefs,
    private agent: Agent | null,
  ) {
    // Get the document from the DOM references
    this.doc = this.domRefs.chatContainer.ownerDocument || (globalThis as any).document;
    if (!this.doc) {
      throw new Error("Cannot access document object");
    }
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    const { sendBtn, clearBtn, userInput } = this.domRefs;

    // Send button deprecated - using Enter key instead
    if (sendBtn) {
      sendBtn.addEventListener("click", () => this.handleSend());
    }

    clearBtn.addEventListener("click", () => this.handleClear());

    userInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    userInput.addEventListener("input", () => this.adjustTextareaHeight());

    // Show quote when input gets focus
    userInput.addEventListener("focus", () => {
      logMessage("[AI Chat] Focus event triggered on userInput");
      this.showQuote();
    });

    // Debug: Expose showQuote to window for manual testing
    (window as any).testShowQuote = () => {
      logMessage("[AI Chat] Manual testShowQuote() called");
      this.showQuote();
    };
  }

  /**
   * Handle send message
   */
  async handleSend(): Promise<void> {
    const { userInput, chatContainer, quoteContainer } = this.domRefs;
    const message = userInput.value.trim();

    if (!message || this.isProcessing) return;

    // Remove welcome message if present
    const welcomeMsg = chatContainer.querySelector(".welcome-message");
    if (welcomeMsg) {
      welcomeMsg.remove();
    }

    // Get selected text (if any)
    const selectedText = this.getSelectedText();
    let finalMessage = message;

    // If there's selected text, prepend it to the message with separator
    if (selectedText) {
      // Use special separator to separate quote from user message
      finalMessage = `<QUOTE>${selectedText}</QUOTE> ${message}`;
    }

    // Add user message
    this.addMessage("user", finalMessage);
    userInput.value = "";
    this.adjustTextareaHeight();

    // Clear and hide quote if visible
    if (quoteContainer) {
      quoteContainer.innerHTML = "";
      quoteContainer.style.display = "none";
    }

    // Clear stored reader selection to prevent showing the same quote again
    this.clearReaderSelection();

    // Send the message with quote if present
    await this.sendMessage(finalMessage);
  }

  /**
   * Show quote in the quote container (above input)
   */
  private showQuote(): void {
    logMessage("[AI Chat] ========== showQuote called ==========");
    const { quoteContainer } = this.domRefs;
    logMessage("[AI Chat] quoteContainer exists:", !!quoteContainer);
    if (!quoteContainer) {
      logMessage("[AI Chat] ❌ quoteContainer is null, cannot show quote");
      return;
    }

    // Get selected text from page (reader)
    const selectedText = this.getSelectedText();
    logMessage("[AI Chat] Selected text length:", selectedText.length);

    // If there's selected text, display it in quote container
    if (selectedText) {
      logMessage("[AI Chat] Displaying quote in container");
      quoteContainer.innerHTML = "";
      const quoteEl = this.createQuoteElement(selectedText, true); // showInInput: true
      quoteContainer.appendChild(quoteEl);
      quoteContainer.style.display = "block";
      logMessage("[AI Chat] Quote container display set to block");
    } else {
      logMessage("[AI Chat] No text to quote, hiding container");
      quoteContainer.style.display = "none";
    }
    logMessage("[AI Chat] ========== showQuote finished ==========");
  }

  /**
   * Create a quote element (like WeChat quote style)
   * @param text - The quoted text content
   * @param showInInput - Whether this quote is shown in the input area (vs in chat history)
   */
  private createQuoteElement(text: string, showInInput: boolean = false): HTMLElement {
    const quoteEl = this.doc.createElement("div");
    quoteEl.className = "quote-message";
    quoteEl.style.marginBottom = "8px";
    quoteEl.style.maxHeight = "30px"; // Collapsed: ~1 line
    quoteEl.style.maxWidth = "85%"; // Match user message bubble width
    quoteEl.style.width = "fit-content"; // Let content determine width
    quoteEl.style.overflow = "hidden";
    quoteEl.style.backgroundColor = "#fafafa"; // Very light gray background
    quoteEl.style.border = "1px solid #e0e0e0"; // Light gray border
    quoteEl.style.borderLeft = "3px solid #d0d0d0"; // Darker left border to indicate quote
    quoteEl.style.borderRadius = "4px";
    quoteEl.style.padding = "4px 8px";
    quoteEl.style.cursor = "pointer";

    // Create text container (collapsed by default - show only visual 1 line)
    const contentEl = this.doc.createElement("div");
    contentEl.className = "quote-content";
    contentEl.style.display = "flex";
    contentEl.style.flexDirection = "row";
    contentEl.style.alignItems = "center";
    contentEl.style.gap = "4px";
    contentEl.style.lineHeight = "1.4"; // Line height for calculations

    // Quote icon prefix
    const quoteIcon = this.doc.createElement("span");
    quoteIcon.textContent = "\"";
    quoteIcon.style.fontSize = "11px";
    quoteIcon.style.color = "#a0a0a0";
    quoteIcon.style.marginRight = "2px";
    quoteIcon.style.opacity = "0.6";

    // Quote text wrapper
    const textWrapper = this.doc.createElement("div");
    textWrapper.style.display = "flex";
    textWrapper.style.alignItems = "center";
    textWrapper.style.flex = "1";
    textWrapper.style.minWidth = "0"; // Allow text to shrink and show ellipsis

    // Quote text
    const quoteText = this.doc.createElement("div");
    quoteText.className = "quote-text";
    quoteText.textContent = text;
    quoteText.style.wordBreak = "break-word";
    quoteText.style.overflow = "hidden";
    quoteText.style.textOverflow = "ellipsis";
    quoteText.style.whiteSpace = "normal"; // Allow wrapping to show first few lines
    quoteText.style.fontSize = "11px"; // Smaller font
    quoteText.style.color = "#666666"; // More gray color
    quoteText.style.fontStyle = "italic"; // Italic to indicate quote

    textWrapper.appendChild(quoteIcon);
    textWrapper.appendChild(quoteText);
    contentEl.appendChild(textWrapper);

    // Delete button (only show in input area)
    if (showInInput) {
      const deleteBtn = this.doc.createElement("span");
      deleteBtn.textContent = "✕";
      deleteBtn.style.fontSize = "14px";
      deleteBtn.style.color = "#999999";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.userSelect = "none";
      deleteBtn.style.padding = "2px";
      deleteBtn.title = "删除选中文本";
      deleteBtn.style.borderRadius = "3px";
      deleteBtn.style.transition = "background-color 0.2s";
      deleteBtn.style.marginLeft = "4px";

      // Hover effect for delete button
      deleteBtn.addEventListener("mouseenter", () => {
        deleteBtn.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
      });
      deleteBtn.addEventListener("mouseleave", () => {
        deleteBtn.style.backgroundColor = "transparent";
      });

      // Delete button click handler - clear quote selection
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent expand/collapse toggle
        const { quoteContainer } = this.domRefs;
        if (quoteContainer) {
          quoteContainer.innerHTML = "";
          quoteContainer.style.display = "none";
        }
      });

      contentEl.appendChild(deleteBtn);
    }

    // Add content to quote element
    quoteEl.appendChild(contentEl);

    // Toggle expand/collapse on double-click
    quoteEl.addEventListener("dblclick", () => {
      const isExpanded = quoteEl.classList.contains("expanded");
      if (isExpanded) {
        // Collapse back to initial height
        quoteEl.classList.remove("expanded");
        quoteEl.style.maxHeight = "30px"; // Show ~1 line when collapsed
        quoteEl.style.overflow = "hidden";
      } else {
        // Expand to show more content
        quoteEl.classList.add("expanded");
        quoteEl.style.maxHeight = "150px"; // Show more content when expanded
        quoteEl.style.overflow = "auto"; // Enable scrolling
      }
    });

    return quoteEl;
  }

  /**
   * Clear stored reader selection
   */
  private clearReaderSelection(): void {
    try {
      if (typeof (addon as any) !== "undefined" && (addon as any).data) {
        (addon as any).data.readerSelection = undefined;
        logMessage("[AI Chat] ✓ Cleared stored reader selection");
      }
    } catch (error) {
      logMessage("[AI Chat] Failed to clear reader selection:", error);
    }
  }

  /**
   * Get selected text from the reader
   */
  private getSelectedText(): string {
    try {
      // First try to get selected text from stored reader selection
      // This is the most reliable method as it's saved when user selects text in PDF reader
      if (typeof (addon as any) !== "undefined" && (addon as any).data?.readerSelection?.text) {
        const storedSelection = (addon as any).data.readerSelection as { text: string; timestamp: number };
        // Only use selection if it's recent (within 5 minutes)
        const timeDiff = Date.now() - storedSelection.timestamp;
        if (timeDiff < 5 * 60 * 1000 && storedSelection.text.trim()) {
          logMessage("[AI Chat] ✓ Selected text from stored reader selection:", storedSelection.text.substring(0, 50) + "...");
          return storedSelection.text.trim();
        }
      }

      // Fallback: Try to get selection from main window
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        logMessage("[AI Chat] Selection from window.getSelection():", selection.toString().trim());
        return selection.toString().trim();
      }

      // Fallback: If no selection from window, try from content document
      if (this.doc) {
        const docSelection = this.doc.defaultView?.getSelection();
        if (docSelection && docSelection.toString().trim()) {
          logMessage("[AI Chat] Selection from doc.defaultView.getSelection():", docSelection.toString().trim());
          return docSelection.toString().trim();
        }
      }

      logMessage("[AI Chat] No selection found in any source");
    } catch (error) {
      logMessage("[AI Chat] Failed to get selection:", error);
    }
    return "";
  }

  /**
   * Handle clear messages
   */
  handleClear(): void {
    const { chatContainer } = this.domRefs;

    if (confirm("确定要清空所有对话记录吗？")) {
      this.clearMessages();

      // Clear agent history through global API
      if (typeof (window as any).clearAgentHistory === "function") {
        (window as any).clearAgentHistory();
      }
    }
  }

  /**
   * Handle user message edit - update message content, delete all messages after it, then resend
   */
  private async handleUserEdit(messageId: string, newMessage: string, bubble: HTMLElement): Promise<void> {
    const { chatContainer } = this.domRefs;

    // Find the message by id
    const messageEl = this.doc.getElementById(messageId);
    if (!messageEl) {
      logMessage("[AI Chat] ❌ Message not found for edit:", messageId);
      return;
    }

    // Update the bubble content with new message
    // Clear existing content and add new text
    bubble.textContent = "";
    bubble.appendChild(this.doc.createTextNode(newMessage));

    // Find and remove all messages after the edited one
    const msgArray = Array.from(chatContainer!.children);
    const messageIndex = msgArray.indexOf(messageEl);

    if (messageIndex >= 0) {
      // Remove all messages after the edited one
      for (let i = msgArray.length - 1; i > messageIndex; i--) {
        const el = msgArray[i] as Element;
        el.remove();
      }
    }

    // Build agent history from messages before the edited one
    // Collect user and assistant messages before the edited one (not including it)
    const messagesToKeep: { role: "user" | "assistant" | "system"; content: string }[] = [];
    for (let i = 0; i < messageIndex; i++) {
      const el = msgArray[i] as Element;
      if (el.classList.contains("message")) {
        const role = el.classList.contains("user") ? "user" :
                    el.classList.contains("assistant") ? "assistant" :
                    el.classList.contains("system") ? "system" : null;
        if (role) {
          // Extract content from message bubble
          const bubble = el.querySelector(".message-bubble");
          if (bubble) {
            messagesToKeep.push({ role, content: bubble.textContent || "" });
          }
        }
      }
    }

    // Set agent history to messages before the edited one
    if (typeof (window as any).setAgentHistory === "function") {
      (window as any).setAgentHistory(messagesToKeep);
      logMessage("[AI Chat] ✓ Agent history set to", messagesToKeep.length, "messages");
    }

    // Resend the new message
    await this.sendMessage(newMessage);
  }

  /**
   * Send a message (extracted from handleSend for reuse)
   */
  private async sendMessage(message: string): Promise<void> {
    const { sendBtn, chatContainer } = this.domRefs;
    
    if (!message || this.isProcessing) return;

    // Show loading
    this.isProcessing = true;
    if (sendBtn) sendBtn.disabled = true;
    const loadingEl = this.showLoading();

    try {
      // Check if API is available
      if (typeof (window as any).runAgent !== "function") {
        logMessage("[AI Chat] ❌ window.runAgent is not available!");
        this.hideLoading(loadingEl);
        this.addMessage(
          "assistant",
          "❌ 错误：Agent API 未初始化\n\n请尝试重新加载页面或检查插件设置。",
        );
        return;
      }

      logMessage("[AI Chat] 📤 Sending message:", message);
      logMessage("[AI Chat] 🔄 Calling runAgent...");

      // Call plugin's agent through global API
      const agentResponse = await (window as any).runAgent(message);

      logMessage("[AI Chat] ✓ Got response from agent");
      logMessage("[AI Chat] Response type:", typeof agentResponse);
      logMessage("[AI Chat] Response structure:", agentResponse);

      this.hideLoading(loadingEl);

      // Handle both string and structured responses
      if (typeof agentResponse === "string") {
        // Legacy string response
        this.addMessage("assistant", agentResponse);
      } else {
        // New structured response with metadata
        this.addMessage("assistant", agentResponse.answer, {
          thinking: agentResponse.thinking,
          toolCalls: agentResponse.toolCalls,
          stats: {
            duration: agentResponse.duration,
            iterations: agentResponse.iterations,
            totalUsage: agentResponse.totalUsage,
          },
        });
      }
    } catch (error) {
      logMessage("[AI Chat] ❌ Error:", error);
      logMessage("[AI Chat] Error stack:", (error as Error).stack);
      this.hideLoading(loadingEl);
      this.addMessage(
        "assistant",
        `❌ 错误：${(error as Error).message}\n\n请检查您的 API 设置是否正确。`,
      );
    } finally {
      this.isProcessing = false;
      if (sendBtn) sendBtn.disabled = false;
      this.domRefs.userInput.focus();
    }
  }

  /**
   * Add message to chat with full metadata support
   */
  addMessage(
    role: "user" | "assistant" | "system",
    content: string,
    messageData?: Partial<AIChatMessage>,
  ): void {
    const { chatContainer } = this.domRefs;
    const timestamp = messageData?.timestamp || Date.now();
    const thinking = messageData?.thinking || [];
    const toolCalls = messageData?.toolCalls || [];
    const stats = messageData?.stats;

    const messageDiv = this.doc.createElement("div");
    const messageId = generateMessageId();
    messageDiv.id = messageId;
    messageDiv.className = `message ${role}`;
    messageDiv.style.display = "flex";
    messageDiv.style.animation = "slideIn 0.3s ease-out";
    messageDiv.style.marginBottom = "12px";
    messageDiv.style.gap = "8px";
    messageDiv.style.width = "100%";

    // For user messages, reverse flex direction to put avatar on the right
    if (role === "user") {
      messageDiv.style.flexDirection = "row-reverse";
      messageDiv.style.justifyContent = "flex-end";
      messageDiv.style.alignItems = "flex-start";
    } else {
      messageDiv.style.justifyContent = "flex-start";
      messageDiv.style.alignItems = "flex-start";
    }

    // Avatar section
    const avatarEl = this.createAvatar(role);
    if (role !== "system") {
      messageDiv.appendChild(avatarEl);
    }

    // Main content container
    const contentWrapper = this.doc.createElement("div");

    // User messages: position on right but align content to left for better readability
    if (role === "user") {
      contentWrapper.style.flex = "1";
      contentWrapper.style.display = "flex";
      contentWrapper.style.flexDirection = "column";
      contentWrapper.style.alignItems = "flex-end";  // Bubble on the right
    } else {
      contentWrapper.style.flex = "1";
      contentWrapper.style.display = "flex";
      contentWrapper.style.flexDirection = "column";
    }
    contentWrapper.style.userSelect = "text";  // Ensure text can be selected

    // Header with time (for non-system messages)
    if (role !== "system") {
      const headerEl = this.doc.createElement("div");
      headerEl.style.fontSize = "12px";
      headerEl.style.color = "#999";
      headerEl.style.marginBottom = "4px";
      headerEl.textContent = formatTime(timestamp);
      contentWrapper.appendChild(headerEl);
    }

    // For user messages, extract and display quote text outside the bubble
    let quoteEl: HTMLElement | null = null;
    if (role === "user") {
      const { quoteText, cleanContent } = this.extractQuote(content);
      if (quoteText) {
        quoteEl = this.createQuoteElement(quoteText, false); // showInInput: false
        contentWrapper.appendChild(quoteEl);
      }
      // Use clean content for the bubble
      content = cleanContent;
    }

    // Message bubble
    const bubble = this.doc.createElement("div");
    bubble.className = "message-bubble";
    bubble.style.display = "inline-block";
    bubble.style.maxWidth = "85%";
    bubble.style.width = "fit-content";  // Let content determine width
    bubble.style.padding = "10px 14px";
    bubble.style.borderRadius = "12px";
    bubble.style.wordWrap = "break-word";
    bubble.style.fontSize = "14px";
    bubble.style.lineHeight = "1.5";
    bubble.style.textAlign = "left";  // Always left-align content for better readability
    bubble.style.userSelect = "text";  // Ensure text can be selected

    if (role === "user") {
      bubble.style.background = "#0084ff";
      bubble.style.color = "white";
      bubble.style.boxShadow = "0 1px 2px rgba(0, 132, 255, 0.2)";
    } else if (role === "assistant") {
      bubble.style.background = "#f0f0f0";
      bubble.style.color = "#333";
      bubble.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
    } else if (role === "system") {
      bubble.style.background = "#fff3cd";
      bubble.style.color = "#856404";
      bubble.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
      bubble.style.maxWidth = "85%";
      bubble.style.margin = "0 auto";
    }

    // Build message content
    this.buildMessageContent(bubble, content, role);

    // Create a wrapper for bubble and actions
    const bubbleWrapperEl = this.doc.createElement("div");
    bubbleWrapperEl.style.display = "flex";
    bubbleWrapperEl.style.gap = "6px";
    bubbleWrapperEl.style.alignItems = "flex-start";
    bubbleWrapperEl.style.userSelect = "text";  // Ensure text can be selected

    bubbleWrapperEl.appendChild(bubble);

    // Add copy button for assistant messages
    if (role === "assistant") {
      const copyBtn = this.doc.createElement("button");
      copyBtn.style.background = "none";
      copyBtn.style.border = "none";
      copyBtn.style.cursor = "pointer";
      copyBtn.style.padding = "4px 8px";
      copyBtn.style.color = "#999";
      copyBtn.style.fontSize = "12px";
      copyBtn.style.display = "none";  // Initially hidden
      copyBtn.style.pointerEvents = "auto";
      copyBtn.title = "Copy message (Ctrl+C)";
      copyBtn.textContent = "📋";
      copyBtn.style.userSelect = "none";
      copyBtn.style.zIndex = "1000";
      copyBtn.style.transition = "transform 0.15s";

      bubbleWrapperEl.appendChild(copyBtn);

      // Copy functionality
      const handleCopy = async () => {
        const showSuccess = () => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "✓";
          copyBtn.style.color = "#32b43c";
          copyBtn.style.transform = "scale(1.2)";
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.color = "#999";
            copyBtn.style.transform = "scale(1)";
          }, 1500);
        };

        const showError = () => {
          copyBtn.textContent = "✗";
          copyBtn.style.color = "#ff4444";
          setTimeout(() => {
            copyBtn.textContent = "📋";
            copyBtn.style.color = "#999";
          }, 1500);
        };

        try {
          const textToCopy = bubble.textContent || "";

          // Method 1: Try modern Clipboard API (works in Firefox 63+)
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
              await navigator.clipboard.writeText(textToCopy);
              showSuccess();
              logMessage("[AI Chat] ✓ Message copied via Clipboard API");
              return;
            } catch (e) {
              logMessage("[AI Chat] Clipboard API failed, trying fallback:", e);
            }
          }

          // Method 2: Try Firefox/XPCOM clipboard helper (most reliable in Zotero)
          try {
            // Access Components from global scope in Zotero environment
            const g = globalThis as any;
            if (g.Components && g.Components.classes) {
              const Cc = g.Components.classes;
              const Ci = g.Components.interfaces;

              // Get clipboard helper service
              const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"]?.getService(Ci.nsIClipboardHelper);
              if (clipboardHelper && typeof clipboardHelper.copyString === "function") {
                clipboardHelper.copyString(textToCopy);
                showSuccess();
                logMessage("[AI Chat] ✓ Message copied via XPCOM clipboard helper");
                return;
              }
            }
          } catch (e) {
            logMessage("[AI Chat] XPCOM clipboard helper failed, trying fallback:", e);
          }

          // Method 3: Fallback to execCommand
          const range = this.doc.createRange();
          range.selectNodeContents(bubble);
          const selection = this.doc.defaultView?.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            try {
              this.doc.execCommand("copy");
              selection.removeAllRanges();
              showSuccess();
              logMessage("[AI Chat] ✓ Message copied via execCommand fallback");
              return;
            } catch (e) {
              selection.removeAllRanges();
              logMessage("[AI Chat] ❌ All copy methods failed:", e);
              showError();
            }
          } else {
            logMessage("[AI Chat] ❌ Cannot get selection for copy");
            showError();
          }
        } catch (error) {
          logMessage("[AI Chat] ❌ Copy error:", error);
          showError();
        }
      };

      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleCopy();
      });

      // Show/hide copy button on hover
      bubbleWrapperEl.addEventListener("mouseenter", () => {
        copyBtn.style.display = "inline-block";
      });

      bubbleWrapperEl.addEventListener("mouseleave", () => {
        copyBtn.style.display = "none";
      });
    }

    contentWrapper.appendChild(bubbleWrapperEl);

    // Add double-click edit functionality for user messages
    if (role === "user") {
      bubble.style.cursor = "pointer";

      bubble.addEventListener("dblclick", () => {
        // Create edit mode
        const originalText = content;
        
        // Create edit mode (bubble will be replaced with textarea)
        const textarea = this.doc.createElement("textarea");
        textarea.value = originalText;
        textarea.style.flex = "1";
        textarea.style.padding = "10px 14px";
        textarea.style.borderRadius = "12px";
        textarea.style.border = "2px solid #0084ff";
        textarea.style.fontSize = "14px";
        textarea.style.fontFamily = "inherit";
        textarea.style.lineHeight = "1.5";
        textarea.style.maxWidth = "70%";
        textarea.style.minHeight = "40px";
        textarea.style.resize = "vertical";
        textarea.style.boxSizing = "border-box";
        
        const btnContainer = this.doc.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "4px";
        btnContainer.style.marginTop = "8px";
        
        const confirmBtn = this.doc.createElement("button");
        confirmBtn.textContent = "✓";
        confirmBtn.style.background = "#0084ff";
        confirmBtn.style.color = "white";
        confirmBtn.style.border = "none";
        confirmBtn.style.borderRadius = "6px";
        confirmBtn.style.padding = "6px 12px";
        confirmBtn.style.cursor = "pointer";
        confirmBtn.style.fontSize = "12px";
        
        const cancelBtn = this.doc.createElement("button");
        cancelBtn.textContent = "✕";
        cancelBtn.style.background = "#ddd";
        cancelBtn.style.color = "#333";
        cancelBtn.style.border = "none";
        cancelBtn.style.borderRadius = "6px";
        cancelBtn.style.padding = "6px 12px";
        cancelBtn.style.cursor = "pointer";
        cancelBtn.style.fontSize = "12px";
        
        btnContainer.appendChild(confirmBtn);
        btnContainer.appendChild(cancelBtn);
        
        const editContainer = this.doc.createElement("div");
        editContainer.style.flex = "1";
        editContainer.style.display = "flex";
        editContainer.style.flexDirection = "column";
        
        editContainer.appendChild(textarea);
        editContainer.appendChild(btnContainer);
        
        contentWrapper.replaceChild(editContainer, bubbleWrapperEl);
        textarea.focus();
        textarea.select();
        
        const finishEdit = (newContent?: string) => {
          contentWrapper.replaceChild(bubbleWrapperEl, editContainer);

          if (newContent && newContent !== originalText) {
            // Handle the edit - update message content, delete all after it, then resend
            this.handleUserEdit(messageId, newContent, bubble);
          }
        };
        
        confirmBtn.addEventListener("click", () => {
          const newContent = textarea.value.trim();
          finishEdit(newContent);
        });
        
        cancelBtn.addEventListener("click", () => {
          finishEdit();
        });
        
        textarea.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            finishEdit();
          }
        });
      });
    }

    // Add thinking process (collapsed by default for assistant messages)
    if (thinking && thinking.length > 0 && role === "assistant") {
      const thinkingEl = this.createThinkingSection(thinking, stats?.duration);
      contentWrapper.appendChild(thinkingEl);
    }

    // Add tool calls (collapsed by default for assistant messages)
    if (toolCalls && toolCalls.length > 0 && role === "assistant") {
      const toolsEl = this.createToolsSection(toolCalls);
      contentWrapper.appendChild(toolsEl);
    }

    // Add stats for system/assistant messages
    if (stats && (role === "assistant" || role === "system")) {
      const statsEl = this.createStatsSection(stats);
      contentWrapper.appendChild(statsEl);
    }

    messageDiv.appendChild(contentWrapper);
    chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Create avatar element for message
   */
  /**
   * Create avatar element for message
   */
  private createAvatar(role: "user" | "assistant" | "system"): HTMLElement {
    if (role === "system") {
      // System messages don't need custom avatars
      const avatar = this.doc.createElement("div");
      avatar.style.width = "32px";
      avatar.style.height = "32px";
      avatar.style.display = "flex";
      avatar.style.alignItems = "center";
      avatar.style.justifyContent = "center";
      avatar.style.fontSize = "16px";
      avatar.style.flexShrink = "0";
      avatar.textContent = "ℹ️";
      return avatar;
    }

    // Use SVG avatars for user and assistant
    return createAvatarElement(this.doc, role as "user" | "assistant");
  }

  /**
   * Create collapsible thinking section
   */
  private createThinkingSection(thinking: any[], duration?: number): HTMLElement {
    const section = this.doc.createElement("div");
    section.style.marginTop = "8px";
    section.style.fontSize = "13px";

    const header = this.doc.createElement("div");
    header.style.padding = "6px 10px";
    header.style.background = "rgba(0, 132, 255, 0.1)";
    header.style.borderRadius = "8px";
    header.style.cursor = "pointer";
    header.style.userSelect = "none";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "6px";

    const toggle = this.doc.createElement("span");
    toggle.style.fontSize = "12px";
    toggle.textContent = "▶";

    const label = this.doc.createElement("span");
    const durationText = duration ? ` for ${formatDuration(duration)}` : "";
    label.textContent = `💭 Thought${durationText} >`;
    label.style.fontWeight = "600";
    label.style.color = "#0084ff";

    header.appendChild(toggle);
    header.appendChild(label);

    const content = this.doc.createElement("div");
    content.style.display = "none";
    content.style.marginTop = "6px";
    content.style.padding = "8px 10px";
    content.style.background = "rgba(0, 0, 0, 0.02)";
    content.style.borderRadius = "8px";
    content.style.borderLeft = "3px solid #0084ff";

    // Add thinking items
    thinking.forEach((item, idx) => {
      const itemEl = this.doc.createElement("div");
      itemEl.style.marginBottom = "6px";
      itemEl.style.fontSize = "12px";
      itemEl.style.lineHeight = "1.4";
      itemEl.style.color = "#666";

      if (idx === thinking.length - 1) {
        itemEl.style.marginBottom = "0";
      }

      itemEl.textContent = item.content || String(item);
      content.appendChild(itemEl);
    });

    section.appendChild(header);
    section.appendChild(content);

    // Toggle functionality
    header.addEventListener("click", () => {
      const isHidden = content.style.display === "none";
      content.style.display = isHidden ? "block" : "none";
      toggle.textContent = isHidden ? "▼" : "▶";
    });

    return section;
  }

  /**
   * Create collapsible tools section
   */
  private createToolsSection(toolCalls: any[]): HTMLElement {
    const section = this.doc.createElement("div");
    section.style.marginTop = "8px";
    section.style.fontSize = "13px";

    const header = this.doc.createElement("div");
    header.style.padding = "6px 10px";
    header.style.background = "rgba(50, 180, 60, 0.1)";
    header.style.borderRadius = "8px";
    header.style.cursor = "pointer";
    header.style.userSelect = "none";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "6px";

    const toggle = this.doc.createElement("span");
    toggle.style.fontSize = "12px";
    toggle.textContent = "▶";

    const label = this.doc.createElement("span");
    label.textContent = `🔧 Tool Calls >`;
    label.style.fontWeight = "600";
    label.style.color = "#32b43c";

    header.appendChild(toggle);
    header.appendChild(label);

    const content = this.doc.createElement("div");
    content.style.display = "none";
    content.style.marginTop = "6px";
    content.style.borderLeft = "3px solid #32b43c";

    // Add tool call items
    toolCalls.forEach((tool, idx) => {
      const itemEl = this.doc.createElement("div");
      itemEl.style.marginBottom = "8px";
      itemEl.style.padding = "8px 10px";
      itemEl.style.background = "rgba(0, 0, 0, 0.02)";
      itemEl.style.borderRadius = "6px";

      if (idx === toolCalls.length - 1) {
        itemEl.style.marginBottom = "0";
      }

      const toolName = this.doc.createElement("div");
      toolName.style.fontWeight = "600";
      toolName.style.color = "#32b43c";
      toolName.style.marginBottom = "4px";
      toolName.textContent = `📍 ${tool.name}`;
      itemEl.appendChild(toolName);

      if (tool.parameters) {
        const paramsEl = this.doc.createElement("div");
        paramsEl.style.fontSize = "12px";
        paramsEl.style.color = "#666";
        paramsEl.style.whiteSpace = "pre-wrap";
        paramsEl.style.wordBreak = "break-word";
        paramsEl.textContent = `参数：${JSON.stringify(tool.parameters, null, 2)}`;
        itemEl.appendChild(paramsEl);
      }

      if (tool.result) {
        const resultEl = this.doc.createElement("div");
        resultEl.style.fontSize = "12px";
        resultEl.style.color = "#666";
        resultEl.style.marginTop = "4px";
        resultEl.style.whiteSpace = "pre-wrap";
        resultEl.style.wordBreak = "break-word";
        resultEl.textContent = `结果：${JSON.stringify(tool.result, null, 2)}`;
        itemEl.appendChild(resultEl);
      }

      content.appendChild(itemEl);
    });

    section.appendChild(header);
    section.appendChild(content);

    // Toggle functionality
    header.addEventListener("click", () => {
      const isHidden = content.style.display === "none";
      content.style.display = isHidden ? "block" : "none";
      toggle.textContent = isHidden ? "▼" : "▶";
    });

    return section;
  }

  /**
   * Create stats section  
   */
  private createStatsSection(stats: any): HTMLElement {
    const section = this.doc.createElement("div");
    section.style.marginTop = "8px";
    section.style.padding = "4px 10px";
    section.style.background = "rgba(0, 0, 0, 0.02)";
    section.style.borderRadius = "6px";
    section.style.fontSize = "11px";
    section.style.color = "#aaa";
    section.style.display = "flex";
    section.style.gap = "12px";
    section.style.lineHeight = "1.4";
    section.style.flexWrap = "wrap";

    if (stats.duration) {
      const durationEl = this.doc.createElement("span");
      durationEl.textContent = `${formatDuration(stats.duration)}`;
      section.appendChild(durationEl);
    }

    // Display detailed token usage
    if (stats.totalUsage) {
      const usage = stats.totalUsage;
      if (usage.totalTokens !== undefined) {
        const tokensEl = this.doc.createElement("span");
        tokensEl.textContent = `${usage.totalTokens} tokens`;
        section.appendChild(tokensEl);
      }
      
      if (usage.promptTokens !== undefined) {
        const promptEl = this.doc.createElement("span");
        promptEl.textContent = `📥 ${usage.promptTokens}`;
        promptEl.title = "Prompt tokens";
        section.appendChild(promptEl);
      }
      
      if (usage.completionTokens !== undefined) {
        const completionEl = this.doc.createElement("span");
        completionEl.textContent = `📤 ${usage.completionTokens}`;
        completionEl.title = "Completion tokens";
        section.appendChild(completionEl);
      }
      
      if (usage.cachedTokens !== undefined && usage.cachedTokens > 0) {
        const cachedEl = this.doc.createElement("span");
        cachedEl.textContent = `💾 ${usage.cachedTokens}`;
        cachedEl.title = "Cached tokens";
        section.appendChild(cachedEl);
      }
    }

    if (stats.iterations !== undefined) {
      const iterEl = this.doc.createElement("span");
      iterEl.textContent = `${stats.iterations} iterations`;
      section.appendChild(iterEl);
    }

    return section;
  }

  /**
   * Extract quote text from user message content
   * @returns Object containing quote text and clean content
   */
  private extractQuote(content: string): { quoteText: string | null, cleanContent: string } {
    const quoteMatch = content.match(/<QUOTE>(.*?)<\/QUOTE>/s);
    if (quoteMatch) {
      const quotedText = quoteMatch[1];
      const cleanContent = content.replace(/<QUOTE>.*?<\/QUOTE>/, "").trim();
      return { quoteText: quotedText, cleanContent };
    }
    return { quoteText: null, cleanContent: content };
  }

  /**
   * Build message content using safe DOM methods
   * Supports markdown formatting without HTML parsing issues
   */
  private buildMessageContent(container: HTMLElement, content: string, role: "user" | "assistant" | "system"): void {
    // For user messages, extract any remaining quote tags and use clean content
    if (role === "user") {
      const { cleanContent } = this.extractQuote(content);
      content = cleanContent;
    }

    // Split content by lines but preserve blank lines for spacing
    const lines = content.split("\n");
    let currentParagraphLines: string[] = [];

    lines.forEach((line, lineIdx) => {
      if (line.trim() === "") {
        // Empty line - finish current paragraph and add spacing
        if (currentParagraphLines.length > 0) {
          const paragraphEl = this.doc.createElement("p");
          paragraphEl.style.marginBottom = "8px";
          paragraphEl.style.lineHeight = "1.6";
          paragraphEl.style.margin = "0 0 8px 0";
          
          currentParagraphLines.forEach((paraLine, lineIndex) => {
            const span = this.processLineFormatting(paraLine, role);
            paragraphEl.appendChild(span);

            // Add line break between lines within a paragraph
            if (lineIndex < currentParagraphLines.length - 1) {
              paragraphEl.appendChild(this.doc.createElement("br"));
            }
          });

          container.appendChild(paragraphEl);
          currentParagraphLines = [];
        }
        
        // Add visual spacing for empty lines
        const spacer = this.doc.createElement("div");
        spacer.style.height = "4px";
        container.appendChild(spacer);
      } else {
        // Non-empty line - accumulate
        currentParagraphLines.push(line);
      }
    });

    // Don't forget the last paragraph
    if (currentParagraphLines.length > 0) {
      const paragraphEl = this.doc.createElement("p");
      paragraphEl.style.marginBottom = "0";
      paragraphEl.style.lineHeight = "1.6";
      paragraphEl.style.margin = "0";
      
      currentParagraphLines.forEach((paraLine, lineIndex) => {
        const span = this.processLineFormatting(paraLine, role);
        paragraphEl.appendChild(span);

        // Add line break between lines within a paragraph
        if (lineIndex < currentParagraphLines.length - 1) {
          paragraphEl.appendChild(this.doc.createElement("br"));
        }
      });

      container.appendChild(paragraphEl);
    }
  }

  /**
   * Process a single line for markdown formatting
   * Handles **bold**, `code`, and plain text
   */
  private processLineFormatting(line: string, role: "user" | "assistant" | "system"): HTMLElement {
    const container = this.doc.createElement("span");

    // Split by markdown patterns while preserving the patterns
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    parts.forEach((part) => {
      if (!part) return;

      if (part.startsWith("**") && part.endsWith("**")) {
        // Bold text
        const strong = this.doc.createElement("strong");
        strong.textContent = part.slice(2, -2);
        container.appendChild(strong);
      } else if (part.startsWith("`") && part.endsWith("`")) {
        // Code text
        const code = this.doc.createElement("code");
        code.textContent = part.slice(1, -1);
        code.style.fontFamily = '"Courier New", monospace';
        code.style.fontSize = "0.9em";
        code.style.padding = "2px 6px";
        code.style.borderRadius = "3px";
        
        if (role === "user") {
          code.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
        } else {
          code.style.backgroundColor = "rgba(0, 0, 0, 0.08)";
        }
        container.appendChild(code);
      } else {
        // Plain text
        container.appendChild(this.doc.createTextNode(part));
      }
    });

    return container;
  }

  /**
   * Show loading indicator
   */
  showLoading(): HTMLElement {
    const { chatContainer } = this.domRefs;

    const loadingDiv = this.doc.createElement("div");
    loadingDiv.className = "loading show";
    loadingDiv.style.display = "flex";
    loadingDiv.style.alignItems = "center";
    loadingDiv.style.gap = "8px";
    loadingDiv.style.padding = "10px 14px";
    loadingDiv.style.backgroundColor = "#f0f0f0";
    loadingDiv.style.borderRadius = "12px";
    loadingDiv.style.color = "#666";
    loadingDiv.style.fontSize = "14px";
    loadingDiv.style.maxWidth = "75%";

    const label = this.doc.createElement("span");
    label.textContent = "AI 正在思考";
    loadingDiv.appendChild(label);

    const dotsContainer = this.doc.createElement("div");
    dotsContainer.className = "loading-dots";
    dotsContainer.style.display = "flex";
    dotsContainer.style.gap = "3px";

    for (let i = 0; i < 3; i++) {
      const dot = this.doc.createElement("div");
      dot.className = "loading-dot";
      dot.style.width = "6px";
      dot.style.height = "6px";
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = "#0084ff";
      dot.style.animation = `pulse 1.4s infinite ease-in-out`;
      dot.style.animationDelay = `${-0.32 + i * 0.16}s`;
      dotsContainer.appendChild(dot);
    }

    loadingDiv.appendChild(dotsContainer);
    chatContainer.appendChild(loadingDiv);
    this.scrollToBottom();
    return loadingDiv;
  }

  /**
   * Hide loading indicator
   */
  hideLoading(loadingEl: HTMLElement): void {
    if (loadingEl && loadingEl.parentNode) {
      loadingEl.parentNode.removeChild(loadingEl);
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    const { chatContainer } = this.domRefs;

    // Clear all children
    chatContainer.innerHTML = "";

    // Create and add welcome message using DOM methods
    const welcome = this.doc.createElement("div");
    welcome.className = "welcome-message";
    welcome.style.textAlign = "center";
    welcome.style.padding = "40px 20px";
    welcome.style.color = "#666";

    const h2 = this.doc.createElement("h2");
    h2.textContent = "🤖 AI 阅读助手";
    h2.style.color = "#0084ff";
    h2.style.marginBottom = "10px";
    h2.style.fontSize = "24px";
    h2.style.fontWeight = "600";
    welcome.appendChild(h2);

    const p1 = this.doc.createElement("p");
    p1.textContent = "我可以帮助您理解和分析当前论文";
    p1.style.fontSize = "14px";
    p1.style.lineHeight = "1.6";
    p1.style.margin = "5px 0";
    welcome.appendChild(p1);

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
      item.appendChild(h3);

      const p = this.doc.createElement("p");
      p.textContent = feature.desc;
      p.style.fontSize = "12px";
      p.style.color = "#666";
      item.appendChild(p);

      features.appendChild(item);
    }

    welcome.appendChild(features);

    const p2 = this.doc.createElement("p");
    p2.textContent = "提示：请先在设置中配置 API 密钥";
    p2.style.marginTop = "30px";
    p2.style.color = "#999";
    p2.style.fontSize = "12px";
    welcome.appendChild(p2);

    chatContainer.appendChild(welcome);
  }

  /**
   * Adjust textarea height based on content
   */
  private adjustTextareaHeight(): void {
    const { userInput } = this.domRefs;
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
  }

  /**
   * Scroll to bottom of chat with smooth animation
   */
  private scrollToBottom(): void {
    const { chatContainer } = this.domRefs;
    // Use smooth scrolling for better user experience
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  }

  /**
   * Set processing state
   */
  setProcessing(state: boolean): void {
    this.isProcessing = state;
    if (this.domRefs.sendBtn) this.domRefs.sendBtn.disabled = state;
  }
}
