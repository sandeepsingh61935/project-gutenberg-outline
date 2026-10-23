import { OutlineNode } from './types';

const SUBSECTION_NUMBER_REGEX = /^(?:(\d{1,2}|[IVXLCDM]{1,6})\s*[.)]\s+)(.+)/;
const STANDALONE_NUMBER_REGEX = /^(?:\d{1,2}|[IVXLCDM]{1,6})\.?$/;

export function parseDocumentOutline(): OutlineNode[] {
  const flatNodes: OutlineNode[] = [];
  const docHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, p, hr.tb, hr.chap')
  );

  let wordsSinceLastNode = 0;
  let autoChunkCounter = 1;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tag = el.tagName.toLowerCase();
    const rawText = decodeEntities(el.innerText || '');
    const text = rawText.replace(/\s+/g, ' ').trim();

    if (tag === 'p' && text) {
      wordsSinceLastNode += text.split(' ').length;
    }

    let level: 1 | 2 | 3 | null = null;
    let title = '';
    let isSynthetic = false;

    // Tier 1: Explicit Headings
    if (tag === 'h1' || (tag === 'h2' && /^(part|book)\s+/i.test(text))) {
      if (isBoilerplate(text)) continue;
      level = 1;
      title = text;
    } else if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      if (isBoilerplate(text)) continue;
      if (STANDALONE_NUMBER_REGEX.test(text)) {
        level = 3;
        isSynthetic = true;
        const nextPreview = extractSectionContent(el, 1);
        title = `${text.replace(/\.$/, '')}. ${truncateWords(nextPreview, 7)}`;
      } else {
        level = tag === 'h2' ? 2 : 3;
        title = text;
      }
    }
    // Tier 2: Numbered paragraphs ("1. When Zarathustra...")
    else if (tag === 'p' && text) {
      const match = text.match(SUBSECTION_NUMBER_REGEX);
      if (match) {
        const [, num, rest] = match;
        level = 3;
        isSynthetic = true;
        title = `${num}. ${truncateWords(rest, 7)}`;
      } else if (STANDALONE_NUMBER_REGEX.test(text)) {
        level = 3;
        isSynthetic = true;
        const nextPreview = extractSectionContent(el, 1);
        title = `${text.replace(/\.$/, '')}. ${truncateWords(nextPreview, 7)}`;
      }
      // Tier 3: Auto-chunking for chapters without subheadings
      else if (wordsSinceLastNode >= 900 && text.length > 80) {
        level = 3;
        isSynthetic = true;
        title = `§${autoChunkCounter++} · "${truncateWords(text, 6)}"`;
      }
    }
    // Thought breaks (<hr class="tb">)
    else if (tag === 'hr' && el.classList.contains('tb')) {
      const nextPreview = extractSectionContent(el, 1);
      if (nextPreview) {
        level = 3;
        isSynthetic = true;
        title = `✦ ${truncateWords(nextPreview, 7)}`;
      }
    }

    if (level && title) {
      wordsSinceLastNode = 0;
      if (level <= 2) autoChunkCounter = 1;

      const id = ensureId(el, flatNodes.length);
      const absTop = el.getBoundingClientRect().top + window.scrollY;
      const ratio = Math.min(1, Math.max(0, absTop / docHeight));
      const fullSectionText = extractSectionContent(el, 8);

      flatNodes.push({
        id,
        title,
        snippet: truncateWords(fullSectionText || title, 32),
        fullText: fullSectionText || title,
        level,
        isSynthetic,
        element: el,
        scrollRatio: ratio,
        scrollPercent: `${Math.round(ratio * 100)}%`,
        children: [],
      });
    }
  }

  return buildHierarchy(flatNodes);
}

export function extractSectionContent(startEl: HTMLElement, maxParagraphs: number): string {
  const paragraphs: string[] = [];
  if (startEl.tagName.toLowerCase() === 'p') {
    const selfText = startEl.innerText?.replace(/\s+/g, ' ').trim();
    if (selfText && selfText.length > 10) paragraphs.push(selfText);
  }

  let curr = startEl.nextElementSibling as HTMLElement | null;
  while (curr && paragraphs.length < maxParagraphs) {
    const tag = curr.tagName.toLowerCase();
    if (/^h[1-4]$/.test(tag)) break;
    if (tag === 'p') {
      const txt = curr.innerText?.replace(/\s+/g, ' ').trim();
      if (txt && SUBSECTION_NUMBER_REGEX.test(txt) && paragraphs.length > 0) break;
      if (txt && txt.length > 15) paragraphs.push(txt);
    }
    curr = curr.nextElementSibling as HTMLElement | null;
  }

  return paragraphs.join('\n\n');
}

function buildHierarchy(flatNodes: OutlineNode[]): OutlineNode[] {
  const root: OutlineNode[] = [];
  let currentL1: OutlineNode | null = null;
  let currentL2: OutlineNode | null = null;

  for (const node of flatNodes) {
    if (node.level === 1) {
      root.push(node);
      currentL1 = node;
      currentL2 = null;
    } else if (node.level === 2) {
      if (currentL1) currentL1.children.push(node);
      else root.push(node);
      currentL2 = node;
    } else {
      if (currentL2) currentL2.children.push(node);
      else if (currentL1) currentL1.children.push(node);
      else root.push(node);
    }
  }
  return root;
}

function ensureId(el: HTMLElement, idx: number): string {
  if (el.id) return el.id;
  const anchor = el.querySelector('a[id], a[name]');
  const existing = anchor?.getAttribute('id') || anchor?.getAttribute('name');
  if (existing) {
    el.id = existing;
    return existing;
  }
  el.id = `pg-node-${idx}`;
  return el.id;
}

function decodeEntities(raw: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = raw;
  return txt.value;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return words.length <= maxWords ? words.join(' ') : words.slice(0, maxWords).join(' ') + '…';
}

function isBoilerplate(text: string): boolean {
  return /project gutenberg|contents|transcriber's note|full license/i.test(text);
}