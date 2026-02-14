import { ReActAgent } from "./agent";
import { allTools } from "./tools";
import { getPref, getPrefWithEnvFallback } from "../utils/prefs";
import { getLocaleID } from "../utils/locale";
import { createAIChatUI } from "./aichat";

/**
 * Register the AI Chat section in the reader item pane
 */
export function registerReaderTab() {
  ztoolkit.log("Registering AI Chat reader section");

  // Setup reader event listener for text selection
  setupReaderSelectionListener();

  // Check if ItemPaneManager exists
  if (!Zotero.ItemPaneManager || typeof Zotero.ItemPaneManager.registerSection !== "function") {
    ztoolkit.log("⚠️ Zotero.ItemPaneManager.registerSection not available in this Zotero version");
    ztoolkit.log("Available Zotero.ItemPaneManager keys:", Object.keys(Zotero.ItemPaneManager || {}));
    return;
  }

  try {
    Zotero.ItemPaneManager.registerSection({
    paneID: "zotero-chat-ai-assistant",
    pluginID: addon.data.config.addonID,
    header: {
      l10nID: "zotero-chat-section-header",
      l10nArgs: "{}",
      icon: `chrome://${addon.data.config.addonRef}/content/icons/icon-16.svg`,
    },
    sidenav: {
      l10nID: "zotero-chat-section-sidenav",
      icon: `chrome://${addon.data.config.addonRef}/content/icons/icon-16.svg`,
    },
    onRender: ({
      body,
      item,
      editable,
      tabType,
    }: {
      body: HTMLDivElement;
      item: Zotero.Item;
      editable: boolean;
      tabType: string;
    }) => {
      ztoolkit.log("Rendering AI Chat section", { tabType, hasItem: !!item });

      // Only show in reader tab (including PDF reader)
      // Accept "reader" and other reader-related types
      if (tabType && !tabType.includes("reader")) {
        ztoolkit.log(`Skipping render - tabType is: ${tabType}`);
        body.textContent = "";
        body.innerHTML = "";
        return;
      }

      // Don't show if no item selected
      if (!item) {
        body.textContent = "";
        return;
      }

      // Clear previous content
      body.innerHTML = "";

      // Setup global API functions only when rendering
      // (window object is now available)
      setupGlobalAPI();

      // Validate item before storing
      ztoolkit.log("[ReaderTab] Item details:", {
        id: item?.id,
        itemTypeID: item?.itemTypeID,
        isRegularItem: !item?.isAttachment(),
        hasBestAttachment: !!item?.getBestAttachment?.(),
      });

      // Store current item in addon.data for tools to access
      addon.data.currentItem = item;

      // Create and render AI Chat UI directly in the body
      // (no iframe needed - pure TypeScript/DOM approach)
      try {
        ztoolkit.log("[ReaderTab] Creating AIChatUI instance...");
        createAIChatUI(body);
        ztoolkit.log("[ReaderTab] ✓ AI Chat UI rendered successfully");
      } catch (error: any) {
        ztoolkit.log("[ReaderTab] ❌ Failed to render AI Chat UI:", error);
        ztoolkit.log("[ReaderTab] Error message:", error?.message || "no message");
        ztoolkit.log("[ReaderTab] Error name:", error?.name || "no name");
        ztoolkit.log("[ReaderTab] Error stack:", error?.stack || "no stack");
        ztoolkit.log("[ReaderTab] Error type:", typeof error);
        ztoolkit.log("[ReaderTab] Error keys:", error ? Object.keys(error) : "null");
        body.innerHTML =
          "<p style='color: red; padding: 20px;'>❌ 无法加载 AI 聊天界面，请检查插件日志。</p>";
      }
    },
    onItemChange: ({ item, setEnabled }) => {
      // Enable section when item exists
      setEnabled(!!item);
    },
  });

    ztoolkit.log("✓ AI Chat reader section registered successfully");
  } catch (error) {
    ztoolkit.log("❌ Failed to register AI Chat reader section:", error);
    ztoolkit.log("Error details:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Setup reader selection listener to capture selected text from PDF reader
 * This stores the selected text so it can be used when user focuses the AI chat input
 */
function setupReaderSelectionListener() {
  try {
    // Only setup once
    if ((window as any).__readerSelectionListenerSetup) {
      return;
    }

    ztoolkit.log("[setupReaderSelectionListener] Setting up reader text selection listener");

    // Initialize storage for selected text
    if (!addon.data.readerSelection) {
      addon.data.readerSelection = {
        text: "",
        timestamp: 0,
      };
    }

    // Register listener for text selection popup event
    if (Zotero.Reader && typeof Zotero.Reader.registerEventListener === "function") {
      Zotero.Reader.registerEventListener(
        "renderTextSelectionPopup",
        (event: any) => {
          ztoolkit.log("[renderTextSelectionPopup] Event received");
          ztoolkit.log("[renderTextSelectionPopup] Event keys:", Object.keys(event));

          try {
            // The annotation object contains the selected text
            if (event.params && event.params.annotation) {
              const selectedText = event.params.annotation.text;
              ztoolkit.log("[renderTextSelectionPopup] Selected text:", selectedText?.substring(0, 100));

              // Store selected text
              if (selectedText && selectedText.trim()) {
                addon.data.readerSelection = {
                  text: selectedText.trim(),
                  timestamp: Date.now(),
                };
                ztoolkit.log("[renderTextSelectionPopup] ✓ Selected text stored:", selectedText.length, "chars");
              } else {
                // Clear stored text if selection is empty
                addon.data.readerSelection = {
                  text: "",
                  timestamp: 0,
                };
                ztoolkit.log("[renderTextSelectionPopup] Selection cleared");
              }
            }
          } catch (err) {
            ztoolkit.log("[renderTextSelectionPopup] Error processing event:", err);
          }
        },
        addon.data.config.addonID,
      );

      ztoolkit.log("[setupReaderSelectionListener] ✓ Reader selection listener registered");
    } else {
      ztoolkit.log("[setupReaderSelectionListener] ⚠️ Zotero.Reader.registerEventListener not available");
    }

    (window as any).__readerSelectionListenerSetup = true;
  } catch (error) {
    ztoolkit.log("[setupReaderSelectionListener] ❌ Error:", error);
  }
}

/**
 * Setup global API functions for the AI Chat UI
 * Exposes runAgent and other functions to the window object
 * This function is idempotent and can be called multiple times
 */
function setupGlobalAPI() {
  // Only setup once
  if ((window as any).__aiChatApiSetup) {
    return;
  }

  ztoolkit.log("[setupGlobalAPI] Setting up global API functions");

  // Expose runAgent function to window
  (window as any).runAgent = async (message: string) => {
    ztoolkit.log("[runAgent] 📩 Called with message:", message);
    ztoolkit.log("[runAgent] Message length:", message.length);

    try {
      ztoolkit.log("[runAgent] Getting or creating agent instance...");
      const agent = getOrCreateAgent();

      if (!agent) {
        ztoolkit.log("[runAgent] ❌ Failed to get agent instance");
        throw new Error(
          "无法初始化 Agent。请检查 API 设置（工具 → 插件设置 → Zotero Chat）",
        );
      }

      // Dynamically update agent configuration from preferences before each request
      const apiKey = getPrefWithEnvFallback("apikey", "OPENAI_API_KEY");
      const model =
        getPrefWithEnvFallback("model", "OPENAI_MODEL") || "gpt-3.5-turbo";
      const baseURL =
        getPrefWithEnvFallback("baseurl", "OPENAI_BASE_URL") ||
        "https://api.openai.com/v1";
      const temperature = Number(getPref("temperature")) || 0;
      const maxIterations = Number(getPref("maxiterations")) || 5;

      ztoolkit.log("[runAgent] Updating agent configuration:", {
        model,
        baseURL,
        temperature,
        maxIterations,
      });

      agent.updateOptions({
        apiKey,
        model,
        baseURL,
        temperature,
        maxIterations,
      });

      ztoolkit.log("[runAgent] ✓ Agent instance ready, running agent...");
      const response = await agent.run(message);
      ztoolkit.log("[runAgent] ✓ Agent response received");
      ztoolkit.log("[runAgent] Response structure:", {
        answerLength: response.answer?.length,
        hasThinking: !!response.thinking,
        hasToolCalls: !!response.toolCalls,
        duration: response.duration,
      });
      return response;
    } catch (error: any) {
      ztoolkit.log("[runAgent] ❌ Agent error:", error);
      ztoolkit.log("[runAgent] Error stack:", error.stack);
      throw error;
    }
  };

  // Expose clearAgentHistory function
  (window as any).clearAgentHistory = () => {
    ztoolkit.log("[clearAgentHistory] 🗑️ Called");
    const agent = addon.data.agent;
    if (agent) {
      agent.clearHistory();
      ztoolkit.log("[clearAgentHistory] ✓ History cleared");
    } else {
      ztoolkit.log("[clearAgentHistory] ⚠️ No agent instance found");
    }
  };

  // Expose setAgentHistory function
  (window as any).setAgentHistory = (messages: any[]) => {
    ztoolkit.log("[setAgentHistory] 📝 Called with", messages.length, "messages");
    const agent = addon.data.agent;
    if (agent) {
      agent.setMessages(messages);
      ztoolkit.log("[setAgentHistory] ✓ History set");
    } else {
      ztoolkit.log("[setAgentHistory] ⚠️ No agent instance found");
    }
  };

  // Expose reloadAgent function to recreate agent with new config
  (window as any).reloadAgent = () => {
    ztoolkit.log("[reloadAgent] 🔄 Called");
    const agent = addon.data.agent;
    if (agent) {
      // Get current messages before destroying
      const currentMessages = agent.getMessages();

      // Remove old agent
      addon.data.agent = undefined;
      ztoolkit.log("[reloadAgent] ✓ Old agent removed");

      // Create new agent with current config
      const newAgent = getOrCreateAgent();
      if (newAgent) {
        // Restore messages (excluding last user/assistant pair since it will be resent)
        // Keep system prompt and previous messages
        newAgent.setMessages(currentMessages);
        ztoolkit.log("[reloadAgent] ✓ New agent created with", currentMessages.length, "messages");
      } else {
        ztoolkit.log("[reloadAgent] ⚠️ Failed to create new agent");
      }
    } else {
      ztoolkit.log("[reloadAgent] ⚠️ No agent instance found");
    }
  };

  // Add a test function for debugging
  (window as any).testAPI = () => {
    ztoolkit.log("[testAPI] 🧪 API test called");
    return "API is available!";
  };

  // Mark as setup
  (window as any).__aiChatApiSetup = true;

  ztoolkit.log("[setupGlobalAPI] ✅ Global API functions set up successfully");
  ztoolkit.log("[setupGlobalAPI] Available functions: runAgent, clearAgentHistory, setAgentHistory, reloadAgent, testAPI");
}



/**
 * Get or create agent instance
 */
function getOrCreateAgent(): ReActAgent | null {
  ztoolkit.log("[getOrCreateAgent] Starting...");
  
  // Check if agent already exists
  if (addon.data.agent) {
    ztoolkit.log("[getOrCreateAgent] ✓ Using existing agent instance");
    return addon.data.agent;
  }

  // Create new agent
  try {
    ztoolkit.log("[getOrCreateAgent] Creating new agent instance...");
    
    // Read configuration with environment variable fallback
    const apiKey = getPrefWithEnvFallback("apikey", "OPENAI_API_KEY");
    const model =
      getPrefWithEnvFallback("model", "OPENAI_MODEL") || "gpt-3.5-turbo";
    const baseURL =
      getPrefWithEnvFallback("baseurl", "OPENAI_BASE_URL") ||
      "https://api.openai.com/v1";
    const temperature = Number(getPref("temperature")) || 0;
    const maxIterations = Number(getPref("maxiterations")) || 5;

    ztoolkit.log("[getOrCreateAgent] Configuration:", {
      apiKeyConfigured: !!apiKey && apiKey.trim() !== "",
      apiKeyLength: apiKey ? apiKey.length : 0,
      model,
      baseURL,
      temperature,
      maxIterations,
    });

    if (!apiKey || apiKey.trim() === "") {
      ztoolkit.log("[getOrCreateAgent] ❌ API key not configured");
      ztoolkit.log("[getOrCreateAgent] Please configure in: Tools → Add-ons → Zotero Chat");
      return null;
    }

    ztoolkit.log("[getOrCreateAgent] Creating ReActAgent instance...");

    const agent = new ReActAgent(allTools, {
      apiKey,
      model,
      baseURL,
      temperature,
      maxIterations,
    });

    // Store agent instance
    addon.data.agent = agent;
    ztoolkit.log("[getOrCreateAgent] ✅ Agent created and stored successfully");

    return agent;
  } catch (error) {
    ztoolkit.log("[getOrCreateAgent] ❌ Failed to create agent:", error);
    ztoolkit.log("[getOrCreateAgent] Error stack:", (error as Error).stack);
    return null;
  }
}

/**
 * Unregister reader tab on shutdown
 */
export function unregisterReaderTab() {
  ztoolkit.log("Unregistering AI Chat reader tab");
  // Tab will be automatically unregistered on plugin shutdown
}
