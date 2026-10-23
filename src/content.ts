import { parseDocumentOutline } from './parser';
import { OutlineSidebar } from './sidebar';
import { initReadingTheme } from './reading-theme';

async function init() {
  // Book page theme first — independent of the outline chrome design.
  const readingTheme = await initReadingTheme();

  const tree = parseDocumentOutline();
  if (tree.length === 0) return;

  const sidebar = new OutlineSidebar(tree, readingTheme);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target.id) {
          sidebar.setActiveNode(entry.target.id);
          break;
        }
      }
    },
    { rootMargin: '-5% 0px -70% 0px', threshold: 0 }
  );

  const observeAll = (nodes: typeof tree) => {
    for (const n of nodes) {
      observer.observe(n.element);
      if (n.children.length) observeAll(n.children);
    }
  };
  observeAll(tree);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}
