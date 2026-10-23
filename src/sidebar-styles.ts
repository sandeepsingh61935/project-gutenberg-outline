export const SIDEBAR_CSS = `
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
`;
