import { OutlineNode } from './types';
import type { ReadingTheme } from './reading-theme';
import { SIDEBAR_CSS } from './sidebar-styles';

export class OutlineSidebar {
  private shadow: ShadowRoot;
  private treeNodes: OutlineNode[];
  private flatNodes: OutlineNode[] = [];
  private collapsedIds = new Set<string>();
  private readingSpotStack: number[] = [];
  private isExpanded = false;
  private activeNodeId: string | null = null;
  private readingTheme: ReadingTheme;

  // State for minute timeline scrubbing & wheel-stepping
  private hoveredTickIndex: number = -1;
  private wheelAccumulator: number = 0;

  constructor(nodes: OutlineNode[], readingTheme: ReadingTheme) {
    this.treeNodes = nodes;
    this.readingTheme = readingTheme;
    this.flatten(nodes);

    const host = document.createElement('div');
    host.id = 'pg-morph-outline-host';
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: 'open' });

    this.render();
    this.bindEvents();
  }

  private flatten(nodes: OutlineNode[]) {
    this.flatNodes = [];
    const walk = (list: OutlineNode[]) => {
      for (const n of list) {
        this.flatNodes.push(n);
        if (n.children.length) walk(n.children);
      }
    };
    walk(nodes);
  }

  public setActiveNode(id: string) {
    if (this.activeNodeId === id) return;
    this.activeNodeId = id;

    this.shadow.querySelectorAll('[data-node-id]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-node-id') === id);
    });
  }

  private handleNodeInteraction(node: OutlineNode, isShiftClick: boolean) {
    if (isShiftClick) {
      this.openSplitPeek(node);
    } else {
      this.readingSpotStack.push(window.scrollY);
      this.updateReturnPill();
      node.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.setActiveNode(node.id);
    }
  }

  private setHoveredTick(index: number) {
    if (index < 0 || index >= this.flatNodes.length) {
      this.hoveredTickIndex = -1;
      const popover = this.shadow.querySelector('.shared-tick-popover') as HTMLElement;
      if (popover) popover.classList.remove('visible');
      this.shadow.querySelectorAll('.tick-hit').forEach((el) => el.classList.remove('focused'));
      return;
    }

    this.hoveredTickIndex = index;
    const node = this.flatNodes[index];

    // Highlight the focused tick and apply subtle fisheye magnification to neighbors
    const ticks = this.shadow.querySelectorAll<HTMLElement>('.tick-hit');
    ticks.forEach((el, i) => {
      const dist = Math.abs(i - index);
      el.classList.toggle('focused', i === index);
      el.classList.toggle('near-1', dist === 1);
      el.classList.toggle('near-2', dist === 2);
    });

    // Update and position the shared black preview card
    const popover = this.shadow.querySelector('.shared-tick-popover') as HTMLElement;
    const scrubber = this.shadow.querySelector('.tick-scrubber') as HTMLElement;
    if (!popover || !scrubber) return;

    const titleEl = popover.querySelector('.pop-title') as HTMLElement;
    const pctEl = popover.querySelector('.pop-pct') as HTMLElement;
    const stepEl = popover.querySelector('.pop-step') as HTMLElement;
    const snippetEl = popover.querySelector('.pop-snippet') as HTMLElement;

    titleEl.textContent = node.title;
    pctEl.textContent = node.scrollPercent;
    stepEl.textContent = `${index + 1} / ${this.flatNodes.length}`;
    snippetEl.textContent = node.snippet;

    // Clamp vertical position so the card never clips off the top or bottom of the screen
    const railRect = scrubber.getBoundingClientRect();
    const rawY = railRect.top + node.scrollRatio * railRect.height;
    const cardHeight = 140;
    const clampedTop = Math.min(
      window.innerHeight - cardHeight - 16,
      Math.max(16, rawY - cardHeight / 2)
    );

    popover.style.top = `${clampedTop}px`;
    popover.classList.add('visible');
  }

  private openSplitPeek(node: OutlineNode) {
    const card = this.shadow.querySelector('.split-peek-card') as HTMLElement;
    const titleEl = this.shadow.querySelector('.peek-title') as HTMLElement;
    const metaEl = this.shadow.querySelector('.peek-meta') as HTMLElement;
    const bodyEl = this.shadow.querySelector('.peek-body') as HTMLElement;
    const jumpBtn = this.shadow.querySelector('.peek-jump-btn') as HTMLButtonElement;

    titleEl.textContent = node.title;
    metaEl.textContent = `Position: ${node.scrollPercent}`;
    bodyEl.textContent = node.fullText;

    jumpBtn.onclick = () => {
      card.classList.remove('visible');
      this.handleNodeInteraction(node, false);
    };

    card.classList.add('visible');
  }

  private returnToReadingSpot() {
    const prevY = this.readingSpotStack.pop();
    if (prevY !== undefined) {
      window.scrollTo({ top: prevY, behavior: 'smooth' });
    }
    this.updateReturnPill();
  }

  private updateReturnPill() {
    const pill = this.shadow.querySelector('.return-pill') as HTMLElement;
    if (!pill) return;
    const count = this.readingSpotStack.length;
    pill.style.display = count > 0 ? 'flex' : 'none';
    pill.textContent = `↩ Return to Reading Spot (${count})`;
  }

  private renderTreeRows(nodes: OutlineNode[]): HTMLElement[] {
    return nodes.map((n) => {
      const hasChildren = n.children.length > 0;
      const isCollapsed = this.collapsedIds.has(n.id);
      const chevron = hasChildren
        ? el('span', { class: 'chevron', 'data-toggle-id': n.id }, isCollapsed ? '▸' : '▾')
        : el('span', { class: 'chevron-spacer' });

      const wrapper = el(
        'div',
        { class: 'tree-node-wrapper' },
        el(
          'div',
          {
            class: n.id === this.activeNodeId ? 'tree-row active' : 'tree-row',
            'data-node-id': n.id,
            'data-level': String(n.level),
            title: 'Click to jump · Shift+Click to peek in place',
          },
          el('div', { class: 'tree-left' }, chevron, el('span', { class: 'tree-label' }, n.title)),
          el('span', { class: 'scroll-pct' }, n.scrollPercent)
        )
      );

      if (hasChildren && !isCollapsed) {
        wrapper.append(el('div', { class: 'tree-children' }, ...this.renderTreeRows(n.children)));
      }
      return wrapper;
    });
  }

  private render() {
    const style = document.createElement('style');
    style.textContent = SIDEBAR_CSS;

    const morphBtn = el(
      'button',
      {
        class: this.isExpanded ? 'morph-toggle expanded' : 'morph-toggle',
        title: 'Toggle Project Gutenberg Outline (Cmd/Ctrl + \\)',
      },
      '◫'
    );

    const returnPill = el('button', {
      class: 'return-pill',
      title: 'Shortcut: Alt + Left Arrow',
    });

    const popover = el(
      'div',
      { class: 'shared-tick-popover' },
      el(
        'div',
        { class: 'pop-header' },
        el('span', { class: 'pop-title' }),
        el(
          'div',
          { class: 'pop-badges' },
          el('span', { class: 'pop-step' }),
          el('span', { class: 'pop-pct' })
        )
      ),
      el('div', { class: 'pop-snippet' }),
      el('div', { class: 'pop-hint' }, 'Wheel: Fine Step · Click: Jump · Shift+Click: Split Peek')
    );

    const scrubber = el(
      'div',
      { class: this.isExpanded ? 'tick-scrubber hidden' : 'tick-scrubber' },
      ...this.flatNodes.map((n, idx) => {
        const tick = el(
          'div',
          {
            class: n.id === this.activeNodeId ? 'tick-hit active' : 'tick-hit',
            'data-node-id': n.id,
            'data-tick-index': String(idx),
            'data-level': String(n.level),
          },
          el('div', { class: 'tick-line' })
        );
        tick.style.top = `${(n.scrollRatio * 100).toFixed(2)}%`;
        return tick;
      })
    );

    const themeBtn = el(
      'button',
      {
        class: 'theme-toggle',
        type: 'button',
        title: 'Toggle book dark mode (D)',
        'aria-label': 'Toggle book dark mode',
        'aria-pressed': String(this.readingTheme.isDark),
      },
      this.readingTheme.isDark ? '☾' : '☀'
    );

    const filterInput = el('input', {
      class: 'filter-input',
      type: 'text',
      placeholder: 'Search chapters or quotes...',
    });

    const drawer = el(
      'aside',
      { class: this.isExpanded ? 'viewer-drawer open' : 'viewer-drawer' },
      el(
        'div',
        { class: 'drawer-top' },
        el(
          'div',
          { class: 'drawer-title-bar' },
          el('span', { class: 'drawer-title' }, 'Project Gutenberg Outline'),
          themeBtn
        ),
        filterInput
      ),
      el('div', { class: 'tree-scroll' }, ...this.renderTreeRows(this.treeNodes))
    );

    const peekCard = el(
      'div',
      { class: 'split-peek-card' },
      el(
        'div',
        { class: 'peek-header' },
        el('div', {}, el('div', { class: 'peek-title' }), el('div', { class: 'peek-meta' })),
        el(
          'div',
          { class: 'peek-actions' },
          el('button', { class: 'peek-btn primary peek-jump-btn' }, 'Jump Here'),
          el('button', { class: 'peek-btn peek-close-btn' }, '✕')
        )
      ),
      el('div', { class: 'peek-body' })
    );

    this.shadow.replaceChildren(style, morphBtn, returnPill, popover, scrubber, drawer, peekCard);
  }

  private bindEvents() {
    const morphBtn = this.shadow.querySelector('.morph-toggle')!;
    const drawer = this.shadow.querySelector('.viewer-drawer')!;
    const scrubber = this.shadow.querySelector('.tick-scrubber') as HTMLElement;
    const returnPill = this.shadow.querySelector('.return-pill')!;
    const filterInput = this.shadow.querySelector('.filter-input') as HTMLInputElement;
    const peekCard = this.shadow.querySelector('.split-peek-card')!;
    const peekClose = this.shadow.querySelector('.peek-close-btn')!;
    const themeBtn = this.shadow.querySelector('.theme-toggle') as HTMLButtonElement;

    const toggleDrawer = () => {
      this.isExpanded = !this.isExpanded;
      drawer.classList.toggle('open', this.isExpanded);
      scrubber.classList.toggle('hidden', this.isExpanded);
      morphBtn.classList.toggle('expanded', this.isExpanded);
      if (this.isExpanded) this.setHoveredTick(-1);
    };

    const syncThemeButton = () => {
      const dark = this.readingTheme.isDark;
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.textContent = dark ? '☾' : '☀';
    };

    morphBtn.addEventListener('click', toggleDrawer);
    returnPill.addEventListener('click', () => this.returnToReadingSpot());
    peekClose.addEventListener('click', () => peekCard.classList.remove('visible'));
    themeBtn.addEventListener('click', () => {
      this.readingTheme.toggle();
      syncThemeButton();
    });

    // 1. CONTINUOUS MOUSE SCRUBBING: Snap to the nearest tick at cursor Y
    scrubber.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.flatNodes.length === 0) return;
      const rect = scrubber.getBoundingClientRect();
      const cursorRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

      let bestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < this.flatNodes.length; i++) {
        const diff = Math.abs(this.flatNodes[i].scrollRatio - cursorRatio);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }
      this.setHoveredTick(bestIdx);
    });

    scrubber.addEventListener('mouseleave', () => {
      this.setHoveredTick(-1);
      this.wheelAccumulator = 0;
    });

    // 2. MINUTE WHEEL CONTROL: Prevent page scroll and step 1-by-1 through dense ticks
    scrubber.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.flatNodes.length === 0) return;

        // Thresholding so trackpads and notched mice both step cleanly
        this.wheelAccumulator += e.deltaY;
        const stepThreshold = 18;

        if (Math.abs(this.wheelAccumulator) >= stepThreshold) {
          const direction = this.wheelAccumulator > 0 ? 1 : -1;
          this.wheelAccumulator = 0;

          const startIdx = this.hoveredTickIndex >= 0 ? this.hoveredTickIndex : 0;
          const nextIdx = Math.min(
            this.flatNodes.length - 1,
            Math.max(0, startIdx + direction)
          );
          this.setHoveredTick(nextIdx);
        }
      },
      { passive: false }
    );

    // 3. CLICK / SHIFT+CLICK ON TIMELINE RAIL: Act on currently focused tick
    scrubber.addEventListener('click', (e: MouseEvent) => {
      if (this.hoveredTickIndex >= 0) {
        const node = this.flatNodes[this.hoveredTickIndex];
        this.handleNodeInteraction(node, e.shiftKey);
      }
    });

    // Expand/Collapse chevrons inside the tree
    this.shadow.querySelectorAll('.chevron[data-toggle-id]').forEach((chev) => {
      chev.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = chev.getAttribute('data-toggle-id')!;
        if (this.collapsedIds.has(id)) this.collapsedIds.delete(id);
        else this.collapsedIds.add(id);
        this.render();
        this.bindEvents();
      });
    });

    // Click vs. Shift+Click on Tree Rows
    this.shadow.querySelectorAll('.tree-row[data-node-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const mouseEvent = e as MouseEvent;
        const id = el.getAttribute('data-node-id');
        const node = this.flatNodes.find((n) => n.id === id);
        if (node) this.handleNodeInteraction(node, mouseEvent.shiftKey);
      });
    });

    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase().trim();
      this.shadow.querySelectorAll<HTMLElement>('.tree-row').forEach((row) => {
        const id = row.getAttribute('data-node-id');
        const node = this.flatNodes.find((n) => n.id === id);
        if (!node) return;
        const matched =
          !q ||
          node.title.toLowerCase().includes(q) ||
          node.fullText.toLowerCase().includes(q);
        row.style.display = matched ? 'flex' : 'none';
      });
    });

    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleDrawer();
      } else if (e.altKey && e.key === 'ArrowLeft' && this.readingSpotStack.length > 0) {
        e.preventDefault();
        this.returnToReadingSpot();
      } else if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.readingTheme.toggle();
        const btn = this.shadow.querySelector('.theme-toggle') as HTMLButtonElement | null;
        if (btn) {
          const dark = this.readingTheme.isDark;
          btn.setAttribute('aria-pressed', String(dark));
          btn.textContent = dark ? '☾' : '☀';
        }
      }
    });
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}
