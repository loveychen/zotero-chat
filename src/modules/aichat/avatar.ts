/**
 * Avatar SVG utilities for AI Chat
 */

/**
 * Create user avatar SVG
 */
export function createUserAvatarSVG(): string {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <!-- Background circle -->
    <circle cx="16" cy="16" r="16" fill="#0084ff"/>
    
    <!-- Head -->
    <circle cx="16" cy="11" r="5" fill="white"/>
    
    <!-- Body -->
    <path d="M 11 17 Q 11 15 16 15 Q 21 15 21 17 L 21 23 Q 21 25 19 25 L 13 25 Q 11 25 11 23 Z" fill="white"/>
  </svg>`;
}

/**
 * Create AI avatar SVG
 */
export function createAIAvatarSVG(): string {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <!-- Background circle -->
    <circle cx="16" cy="16" r="16" fill="#32b43c"/>
    
    <!-- Robot head -->
    <rect x="8" y="8" width="16" height="14" rx="2" fill="white"/>
    
    <!-- Left eye -->
    <rect x="10" y="10" width="3" height="4" rx="1" fill="#32b43c"/>
    
    <!-- Right eye -->
    <rect x="19" y="10" width="3" height="4" rx="1" fill="#32b43c"/>
    
    <!-- Antenna left -->
    <line x1="12" y1="8" x2="12" y2="4" stroke="#32b43c" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="3" r="1" fill="#32b43c"/>
    
    <!-- Antenna right -->
    <line x1="20" y1="8" x2="20" y2="4" stroke="#32b43c" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="20" cy="3" r="1" fill="#32b43c"/>
    
    <!-- Mouth -->
    <path d="M 12 16 Q 16 18 20 16" stroke="#32b43c" stroke-width="1" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/**
 * Create avatar element with inline SVG
 */
export function createAvatarElement(doc: Document, role: "user" | "assistant"): HTMLElement {
  const avatar = doc.createElement("div");
  avatar.style.width = "32px";
  avatar.style.height = "32px";
  avatar.style.borderRadius = "50%";
  avatar.style.display = "flex";
  avatar.style.alignItems = "center";
  avatar.style.justifyContent = "center";
  avatar.style.flexShrink = "0";
  avatar.style.marginTop = "4px";
  avatar.style.overflow = "hidden";

  const svg = doc.createElement("div");
  svg.style.width = "100%";
  svg.style.height = "100%";

  if (role === "user") {
    svg.innerHTML = createUserAvatarSVG();
  } else {
    svg.innerHTML = createAIAvatarSVG();
  }

  avatar.appendChild(svg);
  return avatar;
}

/**
 * Create clear icon SVG for button
 */
export function createClearIconSVG(): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor">
    <!-- Trash can icon -->
    <path d="M 6 2 L 6 4 L 3 4 L 3 6 L 4 6 L 4 21 Q 4 22 5 22 L 19 22 Q 20 22 20 21 L 20 6 L 21 6 L 21 4 L 18 4 L 18 2 L 6 2 Z M 6 6 L 18 6 L 18 20 L 6 20 L 6 6 Z M 8 8 L 8 18 L 10 18 L 10 8 L 8 8 Z M 12 8 L 12 18 L 14 18 L 14 8 L 12 8 Z M 16 8 L 16 18 L 18 18 L 18 8 L 16 8 Z"/>
  </svg>`;
}
