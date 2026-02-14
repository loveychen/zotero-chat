import nunjucks from "nunjucks";

/**
 * Tool interface for ReAct Agent
 */
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (args: any) => Promise<string>;
}

/**
 * Agent configuration options
 */
export interface AgentOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
  temperature?: number;
  maxIterations?: number;
}

/**
 * Message interface for chat history
 */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Tool call record
 */
export interface ToolCallRecord {
  name: string;
  parameters: Record<string, any>;
  result?: any;
  timestamp?: number;
}

/**
 * Thinking process record
 */
export interface ThinkingRecord {
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
 * LLM response with usage info
 */
interface LLMResponse {
  text: string;
  usage?: TokenUsage;
}

/**
 * Agent response with metadata
 */
export interface AgentResponse {
  answer: string;
  thinking?: ThinkingRecord[];
  toolCalls?: ToolCallRecord[];
  duration?: number;
  iterations?: number;
  tokensUsed?: number;
  usage?: TokenUsage;
  totalUsage?: TokenUsage; // Aggregated usage from multiple calls
}

/**
 * Response parse result
 */
interface ParsedResponse {
  type: "final" | "action" | "unknown";
  content?: string;
  thought?: string;
  toolName?: string;
  args?: any;
}

/**
 * ReAct Agent implementation for Zotero-Chat
 * Implements the Reasoning and Acting loop pattern
 */
export class ReActAgent {
  private tools: Map<string, Tool>;
  private options: AgentOptions;
  private messages: Message[];

  constructor(tools: Tool[], options: AgentOptions) {
    this.tools = new Map(tools.map((t) => [t.name, t]));
    this.options = {
      ...options,
      temperature: options.temperature ?? 0,
      maxIterations: options.maxIterations ?? 5,
      baseURL: options.baseURL ?? "https://api.openai.com/v1",
    };
    this.messages = [];
    // System prompt will be initialized asynchronously on first run
  }

  /**
   * Initialize system prompt with tool descriptions
   * Loads template from file and renders with tool information
   */
  private async initSystemPrompt(): Promise<void> {
    try {
      // Load prompt template from chrome:// URL
      const templatePath = `chrome://${addon.data.config.addonRef}/content/templates/agent-system-prompt.md`;
      const templateContent = await this.loadTemplateFile(templatePath);

      // Configure nunjucks environment
      nunjucks.configure({ autoescape: false });

      // Prepare tools data for template
      const toolsData = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

      // Render template with tools
      const systemPrompt = nunjucks.renderString(templateContent, {
        tools: toolsData,
      });

      this.messages.push({ role: "system", content: systemPrompt });

      ztoolkit.log("System prompt initialized from template");
    } catch (error) {
      ztoolkit.log("Failed to load prompt template, using fallback:", error);
      // Fallback to hardcoded prompt if template loading fails
      this.initFallbackPrompt();
    }
  }

  /**
   * Load template file from chrome:// URL
   */
  private async loadTemplateFile(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    return await response.text();
  }

  /**
   * Fallback system prompt (in case template loading fails)
   */
  private initFallbackPrompt(): void {
    const toolDesc = Array.from(this.tools.values())
      .map(
        (t) =>
          `- ${t.name}: ${t.description}${t.parameters ? `\n  参数: ${JSON.stringify(t.parameters)}` : ""}`,
      )
      .join("\n");

    const systemPrompt = `你是一个学术研究助手，专门帮助用户阅读和分析学术论文。你可以调用以下工具：

${toolDesc}

请按照以下格式输出：
思考：[你的推理过程，分析当前情况和下一步行动]
行动：[工具名称]
行动输入：[JSON格式的参数，例如 {"参数名": "参数值"}]

当得到最终答案时，输出：
最终答案：[你的回答]

重要规则：
1. 工具名称必须严格匹配上述列表中的名称
2. 行动输入必须是有效的 JSON 对象
3. 如果不需要工具就能回答，直接给出最终答案
4. 每次只调用一个工具
5. 根据工具执行结果继续推理，直到得出最终答案`;

    this.messages.push({ role: "system", content: systemPrompt });
  }

  /**
   * Run the agent with user input
   * @param userInput User's question or command
   * @returns Structured agent response with metadata
   */
  async run(userInput: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    // Initialize system prompt on first run
    if (this.messages.length === 0) {
      await this.initSystemPrompt();
    }

    ztoolkit.log("\n" + "=".repeat(60));
    ztoolkit.log("[Agent] ========== 开始执行 ==========");
    ztoolkit.log("[Agent] 用户输入:");
    ztoolkit.log(userInput);
    ztoolkit.log("[Agent] 用户输入长度:", userInput.length, "字符");
    ztoolkit.log("=".repeat(60));

    this.messages.push({ role: "user", content: userInput });
    let iterations = 0;
    const maxIter = this.options.maxIterations!;
    const thinking: ThinkingRecord[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const totalUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0,
      promptCacheHitTokens: 0,
      promptCacheMissTokens: 0,
    };

    while (iterations < maxIter) {
      iterations++;
      ztoolkit.log("\n" + "-".repeat(40));
      ztoolkit.log(`[Agent] 第 ${iterations}/${maxIter} 次迭代开始`);
      ztoolkit.log(`[Agent] 当前对话消息数: ${this.messages.length}`);
      ztoolkit.log("-".repeat(40));
      
      try {
        const llmResponse = await this.callLLM();
        const response = llmResponse.text;
        
        // Accumulate token usage
        if (llmResponse.usage) {
          totalUsage.promptTokens = (totalUsage.promptTokens || 0) + (llmResponse.usage.promptTokens || 0);
          totalUsage.completionTokens = (totalUsage.completionTokens || 0) + (llmResponse.usage.completionTokens || 0);
          totalUsage.totalTokens = (totalUsage.totalTokens || 0) + (llmResponse.usage.totalTokens || 0);
          totalUsage.cachedTokens = (totalUsage.cachedTokens || 0) + (llmResponse.usage.cachedTokens || 0);
          totalUsage.promptCacheHitTokens = (totalUsage.promptCacheHitTokens || 0) + (llmResponse.usage.promptCacheHitTokens || 0);
          totalUsage.promptCacheMissTokens = (totalUsage.promptCacheMissTokens || 0) + (llmResponse.usage.promptCacheMissTokens || 0);
        }
        
        ztoolkit.log("\n[Agent] LLM 返回响应:");
        ztoolkit.log("  响应长度:", response.length, "字符");
        ztoolkit.log("  响应内容:");
        ztoolkit.log(response);
        
        this.messages.push({ role: "assistant", content: response });

        const parsed = this.parseResponse(response);
        
        // Record thinking process
        if (parsed.thought) {
          thinking.push({
            content: parsed.thought,
            timestamp: Date.now(),
          });
        }
        
        ztoolkit.log(`[Agent] 解析结果类型: ${parsed.type}`);
        if (parsed.type === "final") {
          ztoolkit.log(`[Agent] ✓ 得到最终答案，长度: ${parsed.content?.length || 0} 字符`);
          ztoolkit.log("=".repeat(60));
          
          const duration = Date.now() - startTime;
          return {
            answer: parsed.content!,
            thinking: thinking.length > 0 ? thinking : undefined,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            duration,
            iterations,
            totalUsage: Object.values(totalUsage).some(v => v && v > 0) ? totalUsage : undefined,
          };
        } else if (parsed.type === "action") {
          ztoolkit.log(`[Agent] 准备执行工具: ${parsed.toolName}`);
          ztoolkit.log(`[Agent] 工具参数:`, JSON.stringify(parsed.args, null, 2));
          
          const tool = this.tools.get(parsed.toolName!);
          if (!tool) {
            ztoolkit.log(`[Agent] ❌ 工具不存在: ${parsed.toolName}`);
            this.messages.push({
              role: "user",
              content: `错误：未知工具 "${parsed.toolName}"，请从可用工具列表中选择。`,
            });
            continue;
          }

          try {
            ztoolkit.log(`\n[Agent] 开始执行工具: ${parsed.toolName}`);
            ztoolkit.log(`[Agent] 工具参数:`, JSON.stringify(parsed.args, null, 2));
            const observation = await tool.execute(parsed.args);
            ztoolkit.log(`[Agent] ✓ 工具执行成功`);
            ztoolkit.log(`[Agent] 工具结果长度: ${observation.length} 字符`);
            ztoolkit.log(`[Agent] 工具完整结果:`);
            ztoolkit.log(observation);
            
            // Record tool call
            toolCalls.push({
              name: parsed.toolName!,
              parameters: parsed.args,
              result: observation,
              timestamp: Date.now(),
            });
            
            const messageContent = `观察结果：${observation}`;
            ztoolkit.log(`[Agent] 添加到对话: 观察结果（${messageContent.length} 字符）`);
            this.messages.push({
              role: "user",
              content: messageContent,
            });
          } catch (err: any) {
            const toolErrorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
            ztoolkit.log(`[Agent] ❌ 工具执行出错: ${parsed.toolName}`, "错误:", toolErrorMsg);
            
            // Record failed tool call
            toolCalls.push({
              name: parsed.toolName!,
              parameters: parsed.args,
              result: { error: toolErrorMsg },
              timestamp: Date.now(),
            });
            
            this.messages.push({
              role: "user",
              content: `工具执行出错：${toolErrorMsg}`,
            });
          }
        } else {
          // Unable to parse, treat as final answer (fallback)
          ztoolkit.log(`[Agent] ⚠️ 无法解析，作为最终答案返回`);
          ztoolkit.log("=".repeat(60));
          
          const duration = Date.now() - startTime;
          return {
            answer: response,
            thinking: thinking.length > 0 ? thinking : undefined,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            duration,
            iterations,
            totalUsage: Object.values(totalUsage).some(v => v && v > 0) ? totalUsage : undefined,
          };
        }
      } catch (err: any) {
        const errorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        const errorType = err?.name || typeof err;
        ztoolkit.log("[Agent] ❌ Agent 运行出错 - 类型:", errorType, "消息:", errorMsg);
        ztoolkit.log("[Agent] 完整错误对象:", err);
        ztoolkit.log("[Agent] 错误堆栈:", err?.stack || "无堆栈信息");
        ztoolkit.log("=".repeat(60));
        
        const duration = Date.now() - startTime;
        return {
          answer: `抱歉，发生了错误：${errorMsg}`,
          thinking: thinking.length > 0 ? thinking : undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          duration,
          iterations,
          totalUsage: Object.values(totalUsage).some(v => v && v > 0) ? totalUsage : undefined,
        };
      }
    }

    ztoolkit.log(`[Agent] ⚠️ 已达到最大迭代次数 (${maxIter})，无法得出最终答案`);
    ztoolkit.log("=".repeat(60));
    
    const duration = Date.now() - startTime;
    return {
      answer: "已达到最大迭代次数，无法得出最终答案。请尝试重新提问或简化问题。",
      thinking: thinking.length > 0 ? thinking : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      duration,
      iterations,
      totalUsage: Object.values(totalUsage).some(v => v && v > 0) ? totalUsage : undefined,
    };
  }

  /**
   * Call LLM API
   * @returns LLM response text and usage information
   */
  private async callLLM(): Promise<LLMResponse> {
    const { apiKey, model, baseURL, temperature } = this.options;
    const url = `${baseURL}/chat/completions`;

    const body = {
      model,
      messages: this.messages,
      temperature,
    };

    // Log detailed request information
    const divider = "=".repeat(60);
    ztoolkit.log(divider);
    ztoolkit.log("[LLM API 请求开始]");
    ztoolkit.log("[LLM API 请求] URL:", url);
    ztoolkit.log("[LLM API 请求] 模型:", model);
    ztoolkit.log("[LLM API 请求] 温度:", temperature);
    ztoolkit.log("[LLM API 请求] 消息总数:", this.messages.length);
    
    // Log each message in the request
    ztoolkit.log("[LLM API 请求] 消息详情:");
    this.messages.forEach((msg, index) => {
      ztoolkit.log(`  [消息 ${index + 1}] 角色: ${msg.role}`);
      ztoolkit.log(`  [消息 ${index + 1}] 内容长度: ${msg.content.length} 字符`);
      ztoolkit.log(`  [消息 ${index + 1}] 内容:\n${msg.content}\n`);
    });
    
    ztoolkit.log("[LLM API 请求] 完整请求体 JSON:");
    ztoolkit.log(JSON.stringify(body, null, 2));
    ztoolkit.log(divider);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      ztoolkit.log("[LLM API 错误] HTTP 状态码:", response.status);
      ztoolkit.log("[LLM API 错误] 响应状态文本:", response.statusText);
      ztoolkit.log("[LLM API 错误] 错误响应内容:");
      ztoolkit.log(error);
      throw new Error(`LLM API 错误: ${response.status} ${error}`);
    }

    const data = (await response.json()) as any;
    
    // Log detailed response information
    ztoolkit.log(divider);
    ztoolkit.log("[LLM API 响应开始]");
    ztoolkit.log("[LLM API 响应] 完整响应 JSON:");
    ztoolkit.log(JSON.stringify(data, null, 2));
    ztoolkit.log(divider);
    
    if (!data.choices?.[0]?.message?.content) {
      ztoolkit.log("[LLM API 错误] 响应结构异常，无法提取消息内容");
      ztoolkit.log("[LLM API 错误] 响应对象结构:");
      ztoolkit.log("  choices:", data.choices);
      ztoolkit.log("  choices[0]:", data.choices?.[0]);
      ztoolkit.log("  message:", data.choices?.[0]?.message);
      ztoolkit.log("[LLM API 错误] 原始完整数据:");
      ztoolkit.log(JSON.stringify(data, null, 2));
      throw new Error("LLM 响应格式异常：无法获取消息内容。请检查 API 是否正确配置。");
    }
    
    const responseText = data.choices[0].message.content;
    
    // Extract usage information if available
    const usage: TokenUsage | undefined = data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      cachedTokens: data.usage.prompt_tokens_details?.cached_tokens,
      promptCacheHitTokens: data.usage.prompt_cache_hit_tokens,
      promptCacheMissTokens: data.usage.prompt_cache_miss_tokens,
    } : undefined;
    
    ztoolkit.log("[LLM API 响应] ✓ 成功获取响应");
    ztoolkit.log("[LLM API 响应] 内容长度:", responseText.length, "字符");
    if (usage) {
      ztoolkit.log("[LLM API 响应] Token 使用情况:", usage);
    }
    ztoolkit.log("[LLM API 响应] 完整响应内容:");
    ztoolkit.log(responseText);
    ztoolkit.log("[LLM API 响应] 响应结束");
    ztoolkit.log(divider);
    return { text: responseText, usage };
  }

  /**
   * Parse LLM response to extract thought, action, or final answer
   * @param text Response text from LLM
   * @returns Parsed response object
   */
  private parseResponse(text: string): ParsedResponse {
    ztoolkit.log("\n[Agent] 开始解析 LLM 响应");
    ztoolkit.log("[Agent] 响应内容:");
    ztoolkit.log(text);
    
    // Try to match final answer
    const finalMatch = text.match(/最终答案[：:]\s*(.+)/s);
    if (finalMatch) {
      ztoolkit.log("[Agent] ✓ 匹配到最终答案");
      ztoolkit.log("[Agent] 最终答案内容:");
      ztoolkit.log(finalMatch[1].trim());
      return { type: "final", content: finalMatch[1].trim() };
    }

    // Try to match thought and action
    const thoughtMatch = text.match(/思考[：:]\s*(.+?)(?=行动[：:]|$)/s);
    const actionMatch = text.match(/行动[：:]\s*(\w+)/);
    const inputMatch = text.match(/行动输入[：:]\s*(\{.*?\})/s);

    if (actionMatch) {
      const toolName = actionMatch[1].trim();
      const thought = thoughtMatch ? thoughtMatch[1].trim() : "";
      let args = {};

      ztoolkit.log("[Agent] ✓ 匹配到行动");
      ztoolkit.log("[Agent] 工具名称:", toolName);
      if (thought) {
        ztoolkit.log("[Agent] 思考过程:");
        ztoolkit.log(thought);
      }

      if (inputMatch) {
        try {
          ztoolkit.log("[Agent] 行动输入 (原始):");
          ztoolkit.log(inputMatch[1]);
          args = JSON.parse(inputMatch[1]);
          ztoolkit.log("[Agent] 行动输入 (解析后):", JSON.stringify(args, null, 2));
        } catch (e) {
          ztoolkit.log("[Agent] ⚠️ JSON 解析失败，使用空参数");
          ztoolkit.log("[Agent] 失败的输入:", inputMatch[1]);
        }
      } else {
        ztoolkit.log("[Agent] 未找到行动输入，使用空参数");
      }

      return { type: "action", thought, toolName, args };
    }

    // Default: treat as final answer (fallback)
    ztoolkit.log("[Agent] ⚠️ 无法匹配模式，作为最终答案返回");
    return { type: "final", content: text };
  }

  /**
   * Get current conversation history
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Set conversation history
   * Always preserves the system message (first message) if not provided
   */
  setMessages(messages: Message[]): void {
    // Preserve the existing system message if the new messages don't have one
    const currentSystemMessage = this.messages[0];
    const newSystemMessage = messages[0];

    if (currentSystemMessage?.role === "system" &&
        newSystemMessage?.role !== "system") {
      // Keep the original system message
      this.messages = [currentSystemMessage, ...messages];
    } else {
      this.messages = [...messages];
    }
  }

  /**
   * Clear conversation history but keep system prompt
   */
  clearHistory(): void {
    const systemMessage = this.messages[0];
    this.messages = [systemMessage];
  }

  /**
   * Update agent options (API key, model, base URL, etc.)
   */
  updateOptions(newOptions: Partial<AgentOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
      temperature: newOptions.temperature ?? this.options.temperature,
      maxIterations: newOptions.maxIterations ?? this.options.maxIterations,
      baseURL: newOptions.baseURL ?? this.options.baseURL,
    };
  }

  /**
   * Add a new tool to the agent
   */
  addTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    // Reinitialize system prompt with new tools
    this.messages = [];
    this.initSystemPrompt();
  }

  /**
   * Remove a tool from the agent
   */
  removeTool(toolName: string): void {
    this.tools.delete(toolName);
    // Reinitialize system prompt
    this.messages = [];
    this.initSystemPrompt();
  }
}
