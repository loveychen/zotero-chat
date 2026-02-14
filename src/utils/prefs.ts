import { config } from "../../package.json";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

const PREFS_PREFIX = config.prefsPrefix;

/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref<K extends keyof PluginPrefsMap>(key: K) {
  return Zotero.Prefs.get(`${PREFS_PREFIX}.${key}`, true) as PluginPrefsMap[K];
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref<K extends keyof PluginPrefsMap>(
  key: K,
  value: PluginPrefsMap[K],
) {
  return Zotero.Prefs.set(`${PREFS_PREFIX}.${key}`, value, true);
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

/**
 * Get preference value with environment variable fallback
 * If preference is not set or empty, try to read from environment variable
 * @param key Preference key
 * @param envKey Environment variable name
 * @param defaultValue Default value if neither pref nor env is set
 */
export function getPrefWithEnvFallback(
  key: keyof PluginPrefsMap,
  envKey: string,
  defaultValue?: string,
): string {
  // Try to get from preferences first
  let value = getPref(key) as string;

  // If not set or empty, try environment variable
  if (!value || value.trim() === "") {
    try {
      const env = (Components.classes as any)[
        "@mozilla.org/process/environment;1"
      ].getService(Components.interfaces.nsIEnvironment);
      value = env.get(envKey) || "";
    } catch (error) {
      ztoolkit.log(`Failed to read environment variable ${envKey}:`, error);
      value = "";
    }
  }

  // Return value or default
  return value || defaultValue || "";
}
