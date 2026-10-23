const STORAGE_KEY = 'pgGfoReadingDark';
const ROOT_CLASS = 'pg-gfo-dark';
const STYLE_ID = 'pg-gfo-reading-theme';

const DARK_CSS = `
html.${ROOT_CLASS} {
  color-scheme: dark !important;
  background: #18181b !important;
}
html.${ROOT_CLASS} body {
  background: #18181b !important;
  color: #e4e4e7 !important;
}
/* Book text: force readable ink without touching extension chrome (shadow DOM). */
html.${ROOT_CLASS} body :where(
  p, div, span, li, td, th, tr, table, section, article, main, header, footer,
  h1, h2, h3, h4, h5, h6, blockquote, pre, code, figcaption, label, dt, dd
) {
  color: #e4e4e7 !important;
  background-color: transparent !important;
  border-color: #3f3f46 !important;
}
html.${ROOT_CLASS} body :where(a) {
  color: #93c5fd !important;
  background-color: transparent !important;
}
html.${ROOT_CLASS} body :where(a:visited) {
  color: #c4b5fd !important;
}
html.${ROOT_CLASS} body :where(hr) {
  border-color: #52525b !important;
  background: #52525b !important;
}
html.${ROOT_CLASS} body :where(img) {
  opacity: 0.92;
  background: transparent !important;
}
html.${ROOT_CLASS} body :where(table) {
  background: transparent !important;
}
/* Common Gutenberg inline light fills */
html.${ROOT_CLASS} body [bgcolor],
html.${ROOT_CLASS} body [style*="background"] {
  background-color: transparent !important;
  background-image: none !important;
}
`;

export type ReadingTheme = {
  isDark: boolean;
  setDark: (dark: boolean) => void;
  toggle: () => void;
};

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DARK_CSS;
  document.documentElement.appendChild(style);
}

function applyDom(dark: boolean) {
  ensureStyle();
  document.documentElement.classList.toggle(ROOT_CLASS, dark);
}

function readStored(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime?.lastError) {
          resolve(true);
          return;
        }
        // Default ON: the product problem is bright book pages.
        resolve(result[STORAGE_KEY] !== false);
      });
    } catch {
      resolve(true);
    }
  });
}

function writeStored(dark: boolean) {
  try {
    chrome.storage.local.set({ [STORAGE_KEY]: dark });
  } catch {
    /* ignore */
  }
}

/** Apply persisted reading theme ASAP; returns a controller for the outline toggle. */
export async function initReadingTheme(): Promise<ReadingTheme> {
  let isDark = await readStored();
  applyDom(isDark);

  const setDark = (dark: boolean) => {
    isDark = dark;
    applyDom(dark);
    writeStored(dark);
  };

  return {
    get isDark() {
      return isDark;
    },
    setDark,
    toggle: () => setDark(!isDark),
  };
}
