# Zotero Chat

[![GitHub release](https://img.shields.io/github/v/release/loveychen/zotero-chat)](https://github.com/loveychen/zotero-chat/releases)
[![License](https://img.shields.io/github/license/loveychen/zotero-chat)](LICENSE)
[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

**AI Reading Assistant for Zotero with ReAct Agent**

一个基于 ReAct Agent 模式的 Zotero AI 阅读助手插件，通过智能对话交互帮助你更好地阅读和理解学术论文。

---

## ✨ 功能特性

### 🤖 智能 ReAct Agent

- **推理-行动循环**：基于 ReAct (Reasoning + Acting) 模式，让 AI 能够思考、使用工具并持续改进回答
- **多工具支持**：集成多种分析工具，自动选择最合适的工具处理你的问题
- **上下文感知**：理解对话历史和当前文档上下文，提供连贯的对话体验

### 📄 文档理解

- **全文分析**：深度理解论文内容，包括摘要、方法、结论等关键部分
- **智能问答**：针对论文内容提出问题，获得准确、有依据的回答
- **引用定位**：回答时自动标注来源位置，方便验证和深度阅读

### 🎯 使用场景

- **快速理解**：快速把握论文核心观点和研究贡献
- **深度阅读**：针对特定章节或概念进行深入探讨
- **文献综述**：对比分析多篇论文的观点和方法
- **学术写作**：获取论文结构、方法论等方面的参考

### ⚙️ 灵活配置

- **环境变量支持**：支持从环境变量读取 API 配置，便于统一管理
- **优先级机制**：插件设置 > 环境变量 > 默认值
- **多 API 兼容**：支持 OpenAI API 及兼容接口（Anthropic Claude、Azure OpenAI 等）

---

## 📦 安装

### 从 Release 安装（推荐）

1. 前往 [Releases 页面](https://github.com/loveychen/zotero-chat/releases)
2. 下载最新版本的 `.xpi` 文件
3. 在 Zotero 中：`工具` → `插件` → 点击齿轮图标 → `Install Add-on From File...`
4. 选择下载的 `.xpi` 文件

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/loveychen/zotero-chat.git
cd zotero-chat

# 安装依赖
npm install

# 构建插件
npm run build

# 插件文件位于 build/ 目录
```

---

## 🚀 快速开始

### 1. 配置 API

有两种方式配置 OpenAI API：

#### 方式一：通过插件设置（推荐新手）

1. 打开 Zotero 设置：`编辑` → `设置` → `Zotero Chat`
2. 填写以下信息：
   - **API Key**：你的 OpenAI API 密钥
   - **Base URL**：API 端点（可选，默认：`https://api.openai.com/v1`）
   - **Model**：模型名称（可选，默认：`gpt-3.5-turbo`）

#### 方式二：通过环境变量（推荐进阶用户）

对于需要在多个应用中共享 API 配置的用户，推荐使用环境变量：

**macOS / Linux:**

```bash
# 临时设置（仅当前终端会话）
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.openai.com/v1"  # 可选
export OPENAI_MODEL="gpt-4"  # 可选

# 永久设置（添加到 ~/.zshrc 或 ~/.bashrc）
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
```

**Windows:**

```powershell
# PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_MODEL="gpt-4"

# CMD
set OPENAI_API_KEY=sk-...
```

> **配置优先级**：插件设置 > 环境变量 > 默认值

详细的环境变量配置方法请查看 [环境变量配置指南](doc/ENVIRONMENT_VARIABLES.md)。

### 2. 开始使用

1. 在 Zotero 中打开一篇论文的 PDF
2. 点击工具栏的 **Chat** 图标（或使用快捷键）
3. 在对话框中输入你的问题
4. AI 会分析论文内容并给出回答

#### 示例问题

- "这篇论文的主要贡献是什么？"
- "作者使用了什么研究方法？"
- "论文中提到的 X 算法是如何工作的？"
- "这项研究有哪些局限性？"

---

## 📚 文档

完整的使用说明和配置指南：

- [📖 用户指南](doc/USER_GUIDE.md) - 详细的使用说明和最佳实践
- [⚙️ 环境变量配置](doc/ENVIRONMENT_VARIABLES.md) - 环境变量配置完整指南
- [🔧 Prompt 模板系统](doc/PROMPT_TEMPLATE_SYSTEM.md) - Agent Prompt 模板说明
- [📝 功能更新日志](doc/CHANGELOG_ENV_FALLBACK.md) - 环境变量功能实现说明

---

## 🛠️ 技术栈

- **框架**: [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template)
- **语言**: TypeScript
- **工具链**:
  - [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
  - [Zotero Types](https://github.com/windingwind/zotero-types)
- **AI Agent**: ReAct (Reasoning + Acting) 模式
- **API 支持**: OpenAI API 及兼容接口

---

## 💡 主要亮点

### 1. ReAct Agent 架构

与传统的单次问答不同，本插件采用 ReAct 模式：

```
用户问题 → 思考 → 选择工具 → 执行 → 观察结果 → 思考 → ... → 最终回答
```

这种迭代式的推理-行动循环让 AI 能够：

- 分析问题并制定解决计划
- 选择合适的工具和方法
- 根据中间结果调整策略
- 提供更准确和深入的回答

### 2. 环境变量支持

新增的环境变量功能让你可以：

- **统一管理 API 配置**：在系统级别配置一次，所有应用共享
- **安全存储密钥**：避免在插件配置中明文保存 API 密钥
- **灵活切换环境**：轻松在不同的 API 端点和模型之间切换
- **Docker 友好**：便于在容器化环境中部署和使用

支持的环境变量：

- `OPENAI_API_KEY` - API 密钥（必需）
- `OPENAI_BASE_URL` - API 端点（可选）
- `OPENAI_MODEL` - 模型名称（可选）

### 3. 多 API 兼容

通过自定义 Base URL，支持多种 OpenAI 兼容的 API：

- **OpenAI**: `https://api.openai.com/v1`
- **Anthropic Claude**: `https://api.anthropic.com/v1`
- **Azure OpenAI**: `https://your-resource.openai.azure.com/`
- **本地部署**: `http://localhost:8080/v1`
- **其他代理服务**：支持各种 OpenAI API 代理和反向代理

---

## 🎯 使用场景

### 📚 学术研究

- 快速了解新论文的核心内容
- 深入理解复杂的研究方法
- 查找论文中的特定信息
- 对比不同论文的观点

### ✍️ 论文写作

- 学习优秀论文的结构和表达
- 了解相关研究的方法论
- 寻找写作灵感和参考

### 🎓 学习辅助

- 理解课程相关的学术文献
- 准备论文阅读报告
- 深入学习特定领域知识

---

## 🔧 开发

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/loveychen/zotero-chat.git
cd zotero-chat

# 安装依赖
npm install

# 配置开发环境
cp .env.example .env
# 编辑 .env 配置你的 Zotero 路径和 Profile

# 启动开发服务器（支持热重载）
npm start
```

### 主要命令

```bash
npm start          # 开发模式（构建 + 启动 Zotero + 监听文件变化）
npm run build      # 生产构建
npm run lint       # 代码检查
npm run release    # 版本发布（自动构建 + 打包 + 发布到 GitHub）
```

### 项目结构

```
src/
├── index.ts              # 插件入口
├── addon.ts              # 插件基类
├── hooks.ts              # 生命周期钩子
├── modules/              # 功能模块
│   ├── examples.ts       # 示例代码
│   └── preferenceScript.ts  # 偏好设置
└── utils/                # 工具函数
    ├── prefs.ts          # 偏好设置工具（包含环境变量支持）
    ├── locale.ts         # 国际化
    ├── window.ts         # 窗口管理
    └── ztoolkit.ts       # Zotero 工具包

addon/
├── manifest.json         # 插件清单
├── bootstrap.js          # 启动脚本
├── content/              # UI 资源
│   ├── preferences.xhtml # 偏好设置界面
│   └── icons/            # 图标资源
└── locale/               # 多语言文件
    ├── en-US/
    └── zh-CN/
```

### 环境变量兜底功能实现

环境变量支持功能的核心实现在 [src/utils/prefs.ts](src/utils/prefs.ts)：

```typescript
/**
 * 从插件偏好设置或环境变量中获取配置值
 * @param prefKey 偏好设置键名
 * @param envKey 环境变量键名
 * @param defaultValue 默认值
 * @returns 配置值（优先级：插件设置 > 环境变量 > 默认值）
 */
export function getPrefWithEnvFallback(
  prefKey: string,
  envKey: string,
  defaultValue?: string,
): string | undefined;
```

详细实现说明请查看 [环境变量功能说明](doc/CHANGELOG_ENV_FALLBACK.md)。

---

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 AGPL-3.0 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) - 优秀的插件开发模板
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit) - 实用的插件开发工具包
- [OpenAI](https://openai.com/) - 提供强大的 AI 能力

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/loveychen/zotero-chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/loveychen/zotero-chat/discussions)

---

**让 AI 成为你的学术阅读助手！** 🎓✨
