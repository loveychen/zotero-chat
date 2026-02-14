import { Tool } from "./agent";

/**
 * Get current paper information from reader
 */
export const getCurrentPaperTool: Tool = {
  name: "get_current_paper",
  description:
    "获取用户当前正在阅读的论文的详细信息，包括标题、作者、摘要、出版年份、DOI等元数据。",
  execute: async () => {
    try {
      // Get the current item from addon.data (set when rendering the UI)
      const item = (addon as any).data?.currentItem;

      if (!item) {
        return "当前没有选中的阅读对象。请在阅读界面打开一篇论文。";
      }

      // Extract metadata
      const title = item.getField("title") || "无标题";
      const authors = item
        .getCreators()
        .map((c: any) => `${c.firstName || ""} ${c.lastName || ""}`.trim())
        .join(", ");
      const year = item.getField("date") || "未知年份";
      const doi = item.getField("DOI") || "无DOI";
      const abstractNote = item.getField("abstractNote") || "无摘要";
      const publicationTitle = item.getField("publicationTitle") || "未知期刊";

      const result = `【当前论文信息】
标题: ${title}
作者: ${authors || "无作者信息"}
出版年份: ${year}
期刊/会议: ${publicationTitle}
DOI: ${doi}

摘要:
${abstractNote}`;

      return result;
    } catch (error: any) {
      ztoolkit.log("get_current_paper 出错:", error);
      return `获取论文信息失败：${error.message}`;
    }
  },
};

/**
 * Search library for papers
 */
export const searchLibraryTool: Tool = {
  name: "search_library",
  description:
    "在用户的Zotero文献库中搜索论文。可以按标题、作者、关键词等进行全文搜索，帮助用户找到相关的参考文献。",
  parameters: {
    query: "搜索关键词（必填）",
    limit: "返回结果数量上限（可选，默认5）",
  },
  execute: async (args: { query?: string; limit?: number }) => {
    try {
      const { query, limit = 5 } = args;

      if (!query || query.trim() === "") {
        return "请提供搜索关键词。格式：{'query': '关键词'}";
      }

      const s = new Zotero.Search();
      s.addCondition("libraryID", "is", String(Zotero.Libraries.userLibraryID));
      s.addCondition("quicksearch-titleCreatorYearNote", "contains", query);

      const ids = (await s.search()) as number[];

      if (!ids || ids.length === 0) {
        return `未找到包含关键词 "${query}" 的文献。`;
      }

      const itemsData = await Promise.all(
        ids.slice(0, limit).map(async (id) => {
          const item = await Zotero.Items.getAsync(id);
          return item;
        }),
      );

      const results = itemsData
        .map((item, index) => {
          const title = item.getField("title") || "未知标题";
          const creators = item
            .getCreators()
            .slice(0, 2)
            .map((c: any) => `${c.lastName || ""}`)
            .join(", ");
          const year = item.getField("date") || "未知";
          const itemType = Zotero.ItemTypes.getLocalizedString(item.itemTypeID);

          return `${index + 1}. [${itemType}] ${title}\n   作者: ${creators || "无"}\n   年份: ${year}\n   ID: ${item.id}`;
        })
        .join("\n\n");

      return `找到 ${ids.length} 条结果（显示前 ${Math.min(limit, ids.length)} 条）：\n\n${results}`;
    } catch (error: any) {
      ztoolkit.log("search_library 出错:", error);
      return `搜索失败：${error.message}`;
    }
  },
};

/**
 * Get PDF text content
 */
export const getPDFTextTool: Tool = {
  name: "get_pdf_text",
  description:
    "提取当前论文PDF的全文内容。这对于需要深入理解论文细节、查找特定段落或进行文本分析时非常有用。",
  parameters: {
    startPage: "起始页码（可选）",
    endPage: "结束页码（可选）",
    maxLength: "最大返回字符数（可选，默认5000）",
  },
  execute: async (args: {
    startPage?: number;
    endPage?: number;
    maxLength?: number;
  }) => {
    try {
      const { startPage = 1, endPage, maxLength = 5000 } = args;

      // Get the current item from addon.data
      const item = (addon as any).data?.currentItem;

      if (!item) {
        return "当前没有选中的阅读对象。请在阅读界面打开一篇论文。";
      }

      // Validate item before accessing properties
      if (!item.itemTypeID) {
        ztoolkit.log("get_pdf_text: Invalid item, missing itemTypeID");
        return "当前阅读对象无效，无法获取PDF。请尝试重新打开论文。";
      }

      let attachmentID: number | null;
      try {
        attachmentID = item.isAttachment()
          ? item.id
          : ((item.getBestAttachment() as unknown) as number);
      } catch (e) {
        ztoolkit.log("get_pdf_text: Error getting attachment ID:", e);
        return "获取PDF附件时出错。请尝试重新打开论文。";
      }

      if (!attachmentID) {
        return "未找到PDF附件。";
      }

      const attachment = await Zotero.Items.getAsync(attachmentID);
      const file = attachment.getFilePath();

      if (!file) {
        return "无法获取PDF文件路径。";
      }

      // Get indexed content using Fulltext API (cast to any to avoid type issues)
      const text = await (Zotero.Fulltext as any).getIndexedContent(
        attachmentID,
      );

      if (!text || !text.content) {
        return "无法提取PDF文本内容。可能是扫描版PDF或PDF损坏。";
      }

      const content = text.content.substring(0, maxLength);
      const truncated = text.content.length > maxLength;

      return `【PDF文本内容】（${truncated ? `已截取前${maxLength}字符` : "完整内容"}）\n\n${content}${truncated ? "\n\n... (内容已截断)" : ""}`;
    } catch (error: any) {
      ztoolkit.log("get_pdf_text 出错:", error);
      return `获取PDF文本失败：${error.message}`;
    }
  },
};

/**
 * Get notes from current paper
 */
export const getNotesTool: Tool = {
  name: "get_notes",
  description: "获取当前论文的所有笔记内容，包括用户在阅读过程中添加的注释和想法。",
  execute: async () => {
    try {
      // Get the current item from addon.data
      const item = (addon as any).data?.currentItem;

      if (!item) {
        return "当前没有选中的阅读对象。请在阅读界面打开一篇论文。";
      }

      const noteIDs = item.getNotes();

      if (!noteIDs || noteIDs.length === 0) {
        return "当前论文没有笔记。";
      }

      const notes = await Promise.all(
        noteIDs.map((noteID: number) => Zotero.Items.getAsync(noteID)),
      );

      const noteContents = notes
        .map((note, index) => {
          const content = note.getNote();
          // Strip HTML tags for cleaner output
          const text = content.replace(/<[^>]*>/g, "");
          return `【笔记 ${index + 1}】\n${text}`;
        })
        .join("\n\n---\n\n");

      return `共有 ${noteIDs.length} 条笔记：\n\n${noteContents}`;
    } catch (error: any) {
      ztoolkit.log("get_notes 出错:", error);
      return `获取笔记失败：${error.message}`;
    }
  },
};

/**
 * Get annotations from current paper
 */
export const getAnnotationsTool: Tool = {
  name: "get_annotations",
  description:
    "获取当前论文中的所有标注（高亮、下划线、注释等），按页码排序。这对于快速回顾论文的重点内容很有帮助。",
  execute: async () => {
    try {
      // Get the current item from addon.data
      const item = (addon as any).data?.currentItem;

      if (!item) {
        return "当前没有选中的阅读对象。请在阅读界面打开一篇论文。";
      }

      // Validate item before accessing properties
      if (!item.itemTypeID) {
        ztoolkit.log("get_annotations: Invalid item, missing itemTypeID");
        return "当前阅读对象无效，无法获取标注。请尝试重新打开论文。";
      }

      // Get attachment item if this is not an attachment
      let attachmentID: number | null;
      try {
        attachmentID = item.isAttachment()
          ? item.id
          : ((item.getBestAttachment() as unknown) as number);
      } catch (e) {
        ztoolkit.log("get_annotations: Error getting attachment ID:", e);
        return "获取PDF附件时出错。请尝试重新打开论文。";
      }

      if (!attachmentID) {
        return "未找到PDF附件。";
      }

      const attachment = await Zotero.Items.getAsync(attachmentID);

      // Get all annotations for this attachment
      const annotationIDs = (attachment.getAnnotations() as unknown) as number[];

      if (!annotationIDs || annotationIDs.length === 0) {
        return "当前论文没有标注。";
      }

      const annotations = await Promise.all(
        annotationIDs.map((id: number) => Zotero.Items.getAsync(id)),
      );

      const sortedAnnotations = annotations.sort((a: any, b: any) => {
        try {
          const posA = JSON.parse(a.annotationPosition || "{}");
          const posB = JSON.parse(b.annotationPosition || "{}");
          const pageA = posA.pageIndex || 0;
          const pageB = posB.pageIndex || 0;
          return pageA - pageB;
        } catch {
          return 0;
        }
      });

      const annotationContents = sortedAnnotations
        .map((annotation: any, index: number) => {
          const type = annotation.annotationType || "未知类型";
          const text = annotation.annotationText || "无文本";
          const comment = annotation.annotationComment || "";
          let position = "";

          try {
            const pos = JSON.parse(annotation.annotationPosition || "{}");
            position = `第 ${(pos.pageIndex || 0) + 1} 页`;
          } catch {
            position = "位置未知";
          }

          let output = `【标注 ${index + 1}】(${type}, ${position})
文本: ${text}`;

          if (comment) {
            output += `\n注释: ${comment}`;
          }

          return output;
        })
        .join("\n\n---\n\n");

      return `共有 ${annotations.length} 条标注：\n\n${annotationContents}`;
    } catch (error: any) {
      ztoolkit.log("get_annotations 出错:", error);
      return `获取标注失败：${error.message}`;
    }
  },
};

/**
 * Export all tools
 */
export const allTools: Tool[] = [
  getCurrentPaperTool,
  searchLibraryTool,
  getPDFTextTool,
  getNotesTool,
  getAnnotationsTool,
];
