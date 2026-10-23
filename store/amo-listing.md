# AMO listing copy — Project Gutenberg Outline

**Status:** Listed version 1.0.2 — Awaiting Review  
**Gecko id:** `project-gutenberg-outline@sandeepsingh61935.github.io`  
**Product page:** https://addons.mozilla.org/firefox/addon/project-gutenberg-outline/  
**Edit listing:** https://addons.mozilla.org/en-US/developers/addon/project-gutenberg-outline/edit

Paste **plain text only** into the Description field (no HTML tags — AMO will show tags literally if you paste markup).

Screenshots: upload `store/screenshots/*.png` (1280×800) in order below.

---

## Name
Project Gutenberg Outline

## Summary (≤250 characters)
Hierarchical outline and timeline scrubber for Project Gutenberg books — jump chapters fast, scrub the whole text, and read in built-in dark mode.

## Description (plain text — copy everything below this line)

Project Gutenberg Outline turns long Gutenberg books into something you can actually navigate.

Open a book on gutenberg.org and the extension builds a structured outline plus a right-edge timeline so you can move by chapter, subsection, or scroll position.

Features

• Hierarchical outline — parts, chapters, and subsections, detected from headings and numbered paragraphs
• Timeline scrubber — slim tick rail on the right; hover for a preview, mouse wheel to step one-by-one, click to jump
• Split peek — Shift+click an outline row or tick to read a passage without losing your place
• Return to reading spot — outline jumps stack your previous scroll position (Alt+Left Arrow)
• Built-in book dark mode — darkens the Gutenberg page for night reading; toggle with the moon button or press D (preference is saved)
• Search — filter the outline by chapter title or quote text

Shortcuts

• Ctrl/Cmd + \ — open or close the outline drawer
• D — toggle book dark mode
• Alt + Left Arrow — return to previous reading spot

Privacy

• Runs only on Project Gutenberg book HTML pages
• Permission: storage (dark-mode preference only)
• No accounts, analytics, remote code, or network calls

Notes

Designed for *.gutenberg.org cached EPUB HTML and /files/ book pages. Outline quality depends on each book’s heading structure; long unheaded stretches are auto-chunked.

## Categories
Appearance

## Website
https://github.com/sandeepsingh61935/project-gutenberg-outline

## Screenshots (upload order)

Real captures from [Thus Spake Zarathustra](https://www.gutenberg.org/cache/epub/1998/pg1998-images.html) (`npm run screenshots`).

| File | Caption |
| --- | --- |
| `01-timeline-scrubber.png` | Timeline scrubber on a live Gutenberg book — hover ticks for section previews |
| `02-outline-drawer.png` | Outline drawer with hierarchical chapters and subsections |
| `03-reading-dark-mode.png` | Built-in book dark mode while reading |
| `04-feature-overview.png` | Search/filter the outline (e.g. “zarathustra”) |

## How to fix the live listing right now

1. Open https://addons.mozilla.org/en-US/developers/addon/project-gutenberg-outline/edit  
2. Click **Edit** next to Describe Add-on  
3. Replace **Description** with the plain text block above (no `<p>`, `<strong>`, etc.)  
4. Set **Website** to the GitHub URL  
5. Screenshots → remove old ones → upload the four new PNGs with captions  
6. Save
