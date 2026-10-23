# AMO listing copy — Project Gutenberg Outline

Gecko id: `project-gutenberg-outline@sandeepsingh61935.github.io`

Paste these into https://addons.mozilla.org/developers/ **after** the first successful `web-ext sign` / release workflow.
Screenshots: `store/screenshots/` (1280×800 PNG).

---

## Name
Project Gutenberg Outline

## Summary (250 characters max)
Hierarchical outline and timeline scrubber for Project Gutenberg books — jump chapters fast, scrub the whole text, and read in built-in dark mode.

## Description (AMO supports limited HTML)

```html
<p><strong>Project Gutenberg Outline</strong> turns long Gutenberg HTML books into something you can actually navigate.</p>

<p>When you open a book on <em>gutenberg.org</em>, the extension builds a structured outline and a right-edge timeline so you can move by chapter, subsection, or scroll position — without endless page scrolling.</p>

<h3>Features</h3>
<ul>
  <li><strong>Hierarchical outline</strong> — parts, chapters, and numbered subsections, auto-detected from the book markup and text patterns.</li>
  <li><strong>Timeline scrubber</strong> — a slim rail of ticks on the right edge; hover for a preview, wheel to step one-by-one, click to jump.</li>
  <li><strong>Split peek</strong> — Shift+click an outline row or tick to read a passage in place without losing your spot.</li>
  <li><strong>Return to reading spot</strong> — jumping via the outline stacks your previous scroll position (Alt+←).</li>
  <li><strong>Built-in book dark mode</strong> — darkens the Gutenberg page for night reading; toggle with ☾ in the drawer or press <code>D</code>. Preference is saved. The outline UI stays consistent either way.</li>
  <li><strong>Search</strong> — filter the outline by chapter title or quote text.</li>
</ul>

<h3>Shortcuts</h3>
<ul>
  <li><code>Ctrl</code>/<code>Cmd</code> + <code>\</code> — open or close the outline drawer</li>
  <li><code>D</code> — toggle book dark mode</li>
  <li><code>Alt</code> + <code>←</code> — return to previous reading spot</li>
</ul>

<h3>Privacy</h3>
<ul>
  <li>Runs only on Project Gutenberg book HTML pages.</li>
  <li>Permission: <code>storage</code> (dark-mode preference only).</li>
  <li>No accounts, no analytics, no remote code, no network calls.</li>
</ul>

<h3>Notes</h3>
<p>Designed for <code>*.gutenberg.org</code> cached EPUB HTML and <code>/files/</code> book pages. Outline quality depends on each book’s heading structure; the extension also synthesizes subsections from numbered paragraphs and long unheaded stretches.</p>
```

## Categories
- Appearance
- Other (or Books if available in your locale)

## Tags
gutenberg, reading, outline, ebook, dark mode, navigation, timeline, books

## Support / Homepage (optional)
- Homepage: your GitHub repo URL
- Support: GitHub Issues on the same repo

## Screenshots (upload order)

| File | Caption |
| --- | --- |
| `01-timeline-scrubber.png` | Timeline scrubber — hover ticks for previews, click to jump |
| `02-outline-drawer.png` | Full hierarchical outline drawer with search |
| `03-reading-dark-mode.png` | Built-in book dark mode vs default light page |
| `04-feature-overview.png` | Feature overview |

## Version notes (en-US)
Initial AMO release: hierarchical outline, timeline scrubber, split peek, return-to-spot, and built-in book dark mode for Project Gutenberg HTML texts.
