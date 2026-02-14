declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

// Global DOM APIs for XUL environment
declare const document: Document;
declare const window: Window;
declare function confirm(message?: string): boolean;

// Global window extensions for agent API
declare global {
  interface Window {
    runAgent?: (message: string) => Promise<string>;
    clearAgentHistory?: () => void;
    testAPI?: () => string;
    addMessage?: (role: "user" | "assistant", content: string) => void;
  }
}
