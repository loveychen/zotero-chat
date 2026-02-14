/**
 * AI Chat UI Styles
 * Modern, clean and beautiful CSS styles with inline style support
 */

/**
 * Parse CSS string into CSSStyleDeclaration object
 */
export function parseStyle(cssString: string): Record<string, string> {
  const style: Record<string, string> = {};
  if (!cssString) return style;
  
  const declarations = cssString.split(";");
  declarations.forEach((decl) => {
    const [prop, value] = decl.split(":");
    if (prop && value) {
      const camelProp = prop
        .trim()
        .split("-")
        .reduce((acc, part, idx) => 
          idx === 0 ? part : acc + part.charAt(0).toUpperCase() + part.slice(1)
        );
      style[camelProp] = value.trim();
    }
  });
  return style;
}

/**
 * Apply inline styles to an element
 */
export function applyStyles(element: HTMLElement, cssString: string): void {
  const rules = cssString.split(";").filter(r => r.trim());
  rules.forEach((rule) => {
    const [prop, value] = rule.split(":");
    if (prop && value) {
      const camelProp = prop
        .trim()
        .split("-")
        .reduce((acc, part, idx) => 
          idx === 0 ? part : acc + part.charAt(0).toUpperCase() + part.slice(1)
        );
      (element.style as any)[camelProp] = value.trim();
    }
  });
}

export const styles = {
  // Global reset
  universal: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  `,

  // Body and main container
  body: `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
    color: #333;
  `,

  // Chat container
  chatContainer: `
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: white;
  `,

  // Message
  message: `
    display: flex;
    animation: slideIn 0.3s ease-out;
  `,
  messageUser: `
    justify-content: flex-end;
  `,
  messageAssistant: `
    justify-content: flex-start;
  `,

  // Animations
  keyframes: `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,

  // Message bubble
  messageBubble: `
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 12px;
    word-wrap: break-word;
    font-size: 14px;
    line-height: 1.5;
  `,
  messageBubbleUser: `
    background: #0084ff;
    color: white;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 132, 255, 0.2);
  `,
  messageBubbleAssistant: `
    background: #f0f0f0;
    color: #333;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  `,

  // Message bubble content
  messageBubbleP: `
    margin: 0.4em 0;
    line-height: 1.5;
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  `,
  messageBubblePre: `
    background: rgba(0, 0, 0, 0.08);
    padding: 8px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0.4em 0;
    font-family: "Courier New", monospace;
    font-size: 0.85em;
  `,
  messageBubbleCode: `
    background: rgba(0, 0, 0, 0.08);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
    font-size: 0.9em;
  `,
  messageBubbleUserPre: `
    background: rgba(255, 255, 255, 0.2);
  `,
  messageBubbleUserCode: `
    background: rgba(255, 255, 255, 0.2);
  `,
  messageBubbleAssistantPre: `
    background: rgba(0, 0, 0, 0.08);
  `,

  // Loading indicator
  loading: `
    display: none;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #f0f0f0;
    border-radius: 12px;
    max-width: 75%;
    color: #666;
    font-size: 14px;
  `,
  loadingShow: `
    display: flex;
  `,
  loadingDots: `
    display: flex;
    gap: 3px;
  `,
  loadingDot: `
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #0084ff;
    animation: pulse 1.4s infinite ease-in-out;
  `,
  loadingDotNth1: `
    animation-delay: -0.32s;
  `,
  loadingDotNth2: `
    animation-delay: -0.16s;
  `,

  // Input container
  inputContainer: `
    padding: 12px;
    background: #f5f5f5;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  `,

  // Input textarea
  userInput: `
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d0d0d0;
    border-radius: 20px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    resize: none;
    min-height: 40px;
    max-height: 100px;
    font-family: inherit;
    background: white;
  `,
  userInputFocus: `
    border-color: #0084ff;
    box-shadow: 0 0 0 2px rgba(0, 132, 255, 0.1);
  `,

  // Send button
  sendBtn: `
    padding: 10px 20px;
    background: #0084ff;
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 132, 255, 0.3);
  `,
  sendBtnHover: `
    background: #0073e6;
    box-shadow: 0 4px 12px rgba(0, 132, 255, 0.4);
  `,
  sendBtnActive: `
    transform: translateY(0);
  `,
  sendBtnDisabled: `
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  `,

  // Clear button
  clearBtn: `
    padding: 10px 16px;
    background: white;
    color: #666;
    border: 1px solid #d0d0d0;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  `,
  clearBtnHover: `
    background: #f0f0f0;
    border-color: #b0b0b0;
  `,

  // Welcome message
  welcomeMessage: `
    text-align: center;
    padding: 30px 20px;
    color: #666;
  `,
  welcomeMessageH2: `
    color: #0084ff;
    margin-bottom: 8px;
    font-size: 22px;
    font-weight: 600;
  `,
  welcomeMessageP: `
    font-size: 14px;
    line-height: 1.5;
    margin: 6px 0;
    color: #666;
  `,

  // Welcome features grid
  welcomeFeatures: `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 20px;
    text-align: left;
  `,
  featureItem: `
    background: #f9f9f9;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
    cursor: default;
  `,
  featureItemH3: `
    color: #0084ff;
    font-size: 13px;
    margin-bottom: 4px;
    font-weight: 600;
  `,
  featureItemP: `
    font-size: 12px;
    color: #666;
    line-height: 1.4;
  `,

  // Error message
  errorMessage: `
    background: #fee;
    color: #c33;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #fcc;
    margin: 8px 0;
    font-size: 13px;
  `,

  // Quote message (WeChat-style)
  quoteMessage: `
    margin-bottom: 8px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-left: 2px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    color: #999;
    line-height: 1.5;
    cursor: pointer;
    position: relative;
  `,
  quoteContent: `
    display: -webkit-box;
    display: box;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  `,
  quoteText: `
    word-break: break-word;
  `,
  quoteIndicator: `
    margin-top: 4px;
    font-size: 11px;
    color: #0084ff;
    font-weight: 500;
  `,

  // Scrollbar styling - enhanced for better visibility
  scrollbar: `
    #chat-container::-webkit-scrollbar {
      width: 8px;
    }

    #chat-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }

    #chat-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    #chat-container::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.35);
    }

    #chat-container::-webkit-scrollbar-thumb:active {
      background: rgba(0, 0, 0, 0.45);
    }

    #chat-container::-webkit-scrollbar-corner {
      background: transparent;
    }
  `,
};

/**
 * Generate complete CSS stylesheet
 */
export function generateStylesheet(): string {
  return `
    ${styles.universal}
    
    body {
      ${styles.body}
    }
    
    #chat-container {
      ${styles.chatContainer}
    }
    
    .message {
      ${styles.message}
    }
    
    .message.user {
      ${styles.messageUser}
    }
    
    .message.assistant {
      ${styles.messageAssistant}
    }
    
    ${styles.keyframes}
    
    .message-bubble {
      ${styles.messageBubble}
    }
    
    .message.user .message-bubble {
      ${styles.messageBubbleUser}
    }
    
    .message.assistant .message-bubble {
      ${styles.messageBubbleAssistant}
    }
    
    .message-bubble p {
      ${styles.messageBubbleP}
    }
    
    .message-bubble pre {
      ${styles.messageBubblePre}
    }
    
    .message-bubble code {
      ${styles.messageBubbleCode}
    }
    
    .message.user .message-bubble pre {
      ${styles.messageBubbleUserPre}
    }
    
    .message.user .message-bubble code {
      ${styles.messageBubbleUserCode}
    }
    
    .loading {
      ${styles.loading}
    }
    
    .loading.show {
      ${styles.loadingShow}
    }
    
    .loading-dots {
      ${styles.loadingDots}
    }
    
    .loading-dot {
      ${styles.loadingDot}
    }
    
    .loading-dot:nth-child(1) {
      ${styles.loadingDotNth1}
    }
    
    .loading-dot:nth-child(2) {
      ${styles.loadingDotNth2}
    }
    
    #input-container {
      ${styles.inputContainer}
    }
    
    #user-input {
      ${styles.userInput}
    }
    
    #user-input:focus {
      ${styles.userInputFocus}
    }
    
    #send-btn {
      ${styles.sendBtn}
    }
    
    #send-btn:hover:not(:disabled) {
      ${styles.sendBtnHover}
    }
    
    #send-btn:active:not(:disabled) {
      ${styles.sendBtnActive}
    }
    
    #send-btn:disabled {
      ${styles.sendBtnDisabled}
    }
    
    #clear-btn {
      ${styles.clearBtn}
    }
    
    #clear-btn:hover {
      ${styles.clearBtnHover}
    }
    
    .welcome-message {
      ${styles.welcomeMessage}
    }
    
    .welcome-message h2 {
      ${styles.welcomeMessageH2}
    }
    
    .welcome-message p {
      ${styles.welcomeMessageP}
    }
    
    .welcome-features {
      ${styles.welcomeFeatures}
    }
    
    .feature-item {
      ${styles.featureItem}
    }
    
    .feature-item h3 {
      ${styles.featureItemH3}
    }
    
    .feature-item p {
      ${styles.featureItemP}
    }
    
    .error-message {
      ${styles.errorMessage}
    }

    .quote-message {
      ${styles.quoteMessage}
    }

    .quote-content {
      ${styles.quoteContent}
    }

    .quote-text {
      ${styles.quoteText}
    }

    .quote-indicator {
      ${styles.quoteIndicator}
    }

    ${styles.scrollbar}
  `;
}
