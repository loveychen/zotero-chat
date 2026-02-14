import { config } from "../../package.json";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  // No need to bind preference events - config is read dynamically on each request
}

async function updatePrefsUI() {
  // Zotero Chat preferences are handled via XUL preference bindings
  // No custom UI initialization needed
}
