import { OutlineNode } from './types';
import type { ReadingTheme } from './reading-theme';

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

  private renderTreeRows(nodes: OutlineNode[]): string {
    return nodes
      .map((n) => {
        const hasChildren = n.children.length > 0;
        const isCollapsed = this.collapsedIds.has(n.id);
        const chevron = hasChildren
          ? `<span class="chevron" data-toggle-id="${n.id}">${isCollapsed ? '▸' : '▾'}</span>`
          : `<span class="chevron-spacer"></span>`;

        const childrenHtml =
          hasChildren && !isCollapsed
            ? `<div class="tree-children">${this.renderTreeRows(n.children)}</div>`
            : '';

        return `
          <div class="tree-node-wrapper">
            <div class="tree-row ${n.id === this.activeNodeId ? 'active' : ''}"
                 data-node-id="${n.id}"
                 data-level="${n.level}"
                 title="Click to jump · Shift+Click to peek in place">
              <div class="tree-left">
                ${chevron}
                <span class="tree-label">${this.escapeHtml(n.title)}</span>
              </div>
              <span class="scroll-pct">${n.scrollPercent}</span>
            </div>
            ${childrenHtml}
          </div>
        `;
      })
      .join('');
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #e4e4e7;
        }
        .morph-toggle {
          position: fixed;
          top: 8px;
          right: 0;
          z-index: 100001;
          background: #27272a;
          color: #e4e4e7;
          border: 1px solid #3f3f46;
          border-right: none;
          border-radius: 6px 0 0 6px;
          width: 30px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          padding: 0;
          transition: right 0.22s ease, background 0.15s;
        }
        .morph-toggle:hover { background: #3f3f46; }
        .morph-toggle.expanded {
          right: 324px;
          border-right: 1px solid #3f3f46;
        }

        /* Right-edge Timeline Scrubber with isolated wheel/mouse control */
        .tick-scrubber {
          position: fixed;
          top: 40px;
          right: 0;
          bottom: 24px;
          width: 30px;
          z-index: 99998;
          background: rgba(24, 24, 27, 0.42);
          border-left: 1px solid rgba(63, 63, 70, 0.35);
          cursor: ns-resize;
          user-select: none;
          overscroll-behavior: contain;
          transition: width 0.15s ease, background 0.15s ease, opacity 0.2s ease;
        }
        .tick-scrubber:hover {
          width: 36px;
          background: rgba(24, 24, 27, 0.72);
        }
        .tick-scrubber.hidden {
          opacity: 0;
          pointer-events: none;
          transform: translateX(100%);
        }
        .tick-hit {
          position: absolute;
          right: 5px;
          width: 24px;
          height: 6px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          pointer-events: none; /* Handled smoothly by rail coordinates */
        }
        .tick-line {
          height: 1.5px;
          background: rgba(161, 161, 170, 0.45);
          transition: width 0.1s ease, height 0.1s ease, background 0.1s ease;
        }
        .tick-hit[data-level="1"] .tick-line { width: 16px; height: 2px; background: #e4e4e7; }
        .tick-hit[data-level="2"] .tick-line { width: 11px; background: rgba(212, 212, 216, 0.75); }
        .tick-hit[data-level="3"] .tick-line { width: 6px; }

        /* Fisheye magnification & active states */
        .tick-hit.near-2 .tick-line { width: 11px; background: rgba(228, 228, 231, 0.7); }
        .tick-hit.near-1 .tick-line { width: 15px; height: 2px; background: rgba(244, 244, 245, 0.9); }
        .tick-hit.active .tick-line { width: 18px; height: 2px; background: #60a5fa; }
        .tick-hit.focused .tick-line {
          width: 22px !important;
          height: 3px !important;
          background: #ffffff !important;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
        }

        /* Shared Floating Black Preview Card */
        .shared-tick-popover {
          display: none;
          position: fixed;
          right: 42px;
          width: 310px;
          background: #141416;
          border: 1px solid #52525b;
          border-radius: 7px;
          padding: 10px 12px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.7);
          pointer-events: none;
          z-index: 100002;
          transition: top 0.06s linear;
        }
        .shared-tick-popover.visible { display: block; }
        .pop-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #f4f4f5;
          margin-bottom: 6px;
        }
        .pop-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pop-badges {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
          font-family: ui-monospace, monospace;
          font-size: 11px;
        }
        .pop-step {
          color: #93c5fd;
          background: rgba(37, 99, 235, 0.2);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .pop-pct { color: #a1a1aa; }
        .pop-snippet {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11.5px;
          line-height: 1.45;
          color: #d4d4d8;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pop-hint {
          margin-top: 7px;
          font-size: 10px;
          color: #71717a;
          border-top: 1px solid #27272a;
          padding-top: 5px;
        }

        .viewer-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 324px;
          background: #202022;
          border-left: 1px solid #323236;
          z-index: 100000;
          transform: translateX(100%);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          box-shadow: -8px 0 24px rgba(0,0,0,0.45);
        }
        .viewer-drawer.open { transform: translateX(0); }

        .drawer-top {
          padding: 12px 14px 10px;
          border-bottom: 1px solid #2e2e32;
        }
        .drawer-title-bar {
          display: grid;
          grid-template-columns: 28px 1fr 28px;
          align-items: center;
          margin-bottom: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #f4f4f5;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }
        .drawer-title {
          grid-column: 2;
          text-align: center;
        }
        .theme-toggle {
          grid-column: 3;
          justify-self: end;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #27272a;
          color: #e4e4e7;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
        }
        .theme-toggle:hover { background: #3f3f46; }
        .theme-toggle[aria-pressed="true"] {
          background: #3f3f46;
          border-color: #71717a;
          color: #fafafa;
        }
        .filter-input {
          width: 100%;
          box-sizing: border-box;
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 5px;
          padding: 6px 9px;
          color: #f4f4f5;
          font-size: 12px;
          outline: none;
        }
        .filter-input:focus { border-color: #71717a; }

        .tree-scroll {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 8px 6px 24px;
        }
        .tree-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1.35;
          color: #e4e4e7;
          gap: 8px;
          user-select: none;
        }
        .tree-row:hover { background: rgba(255,255,255,0.06); }
        .tree-row.active {
          background: #3f3f46;
          color: #ffffff;
          font-weight: 500;
        }
        .tree-left {
          display: flex;
          align-items: baseline;
          gap: 5px;
          min-width: 0;
        }
        .chevron {
          font-size: 11px;
          color: #a1a1aa;
          width: 12px;
          display: inline-block;
          cursor: pointer;
        }
        .chevron-spacer { width: 12px; display: inline-block; }
        .tree-row[data-level="1"] { font-weight: 600; margin-top: 4px; }
        .tree-row[data-level="2"] { padding-left: 20px; }
        .tree-row[data-level="3"] { padding-left: 38px; font-size: 12.5px; color: #d4d4d8; }
        .scroll-pct {
          color: #8e8e93;
          font-size: 12px;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        .split-peek-card {
          display: none;
          position: fixed;
          bottom: 20px;
          right: 44px;
          width: 420px;
          max-height: 55vh;
          background: #18181b;
          border: 1px solid #52525b;
          border-radius: 8px;
          z-index: 100003;
          flex-direction: column;
          box-shadow: 0 16px 40px rgba(0,0,0,0.65);
        }
        .split-peek-card.visible { display: flex; }
        .peek-header {
          padding: 10px 14px;
          border-bottom: 1px solid #2e2e32;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .peek-title { font-size: 13px; font-weight: 600; color: #fff; }
        .peek-meta { font-size: 11px; color: #a1a1aa; }
        .peek-actions { display: flex; gap: 6px; }
        .peek-btn {
          background: #27272a;
          border: 1px solid #3f3f46;
          color: #e4e4e7;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
        }
        .peek-btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
        .peek-body {
          padding: 12px 14px;
          overflow-y: auto;
          overscroll-behavior: contain;
          font-size: 13px;
          line-height: 1.6;
          color: #d4d4d8;
          white-space: pre-wrap;
        }

        .return-pill {
          display: none;
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100002;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,0.45);
          align-items: center;
          gap: 6px;
        }
        .return-pill:hover { background: #1d4ed8; }
      </style>

      <button class="morph-toggle ${this.isExpanded ? 'expanded' : ''}" title="Toggle Project Gutenberg Outline (Cmd/Ctrl + \\)">
        ◫
      </button>

      <button class="return-pill" title="Shortcut: Alt + Left Arrow"></button>

      <!-- Shared Floating Preview Card -->
      <div class="shared-tick-popover">
        <div class="pop-header">
          <span class="pop-title"></span>
          <div class="pop-badges">
            <span class="pop-step"></span>
            <span class="pop-pct"></span>
          </div>
        </div>
        <div class="pop-snippet"></div>
        <div class="pop-hint">Wheel: Fine Step · Click: Jump · Shift+Click: Split Peek</div>
      </div>

      <!-- Right-edge Timeline Scrubber -->
      <div class="tick-scrubber ${this.isExpanded ? 'hidden' : ''}">
        ${this.flatNodes
          .map(
            (n, idx) => `
          <div class="tick-hit ${n.id === this.activeNodeId ? 'active' : ''}"
               data-node-id="${n.id}"
               data-tick-index="${idx}"
               data-level="${n.level}"
               style="top: ${(n.scrollRatio * 100).toFixed(2)}%">
            <div class="tick-line"></div>
          </div>`
          )
          .join('')}
      </div>

      <aside class="viewer-drawer ${this.isExpanded ? 'open' : ''}">
        <div class="drawer-top">
          <div class="drawer-title-bar">
            <span class="drawer-title">Project Gutenberg Outline</span>
            <button
              class="theme-toggle"
              type="button"
              title="Toggle book dark mode (D)"
              aria-label="Toggle book dark mode"
              aria-pressed="${this.readingTheme.isDark}"
            >${this.readingTheme.isDark ? '☾' : '☀'}</button>
          </div>
          <input class="filter-input" type="text" placeholder="Search chapters or quotes..." />
        </div>
        <div class="tree-scroll">
          ${this.renderTreeRows(this.treeNodes)}
        </div>
      </aside>

      <div class="split-peek-card">
        <div class="peek-header">
          <div>
            <div class="peek-title"></div>
            <div class="peek-meta"></div>
          </div>
          <div class="peek-actions">
            <button class="peek-btn primary peek-jump-btn">Jump Here</button>
            <button class="peek-btn peek-close-btn">✕</button>
          </div>
        </div>
        <div class="peek-body"></div>
      </div>
    `;
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

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]!));
  }
}
