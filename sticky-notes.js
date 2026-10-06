/* Private rich-text sticky notes; one cloud-map entry per note. */
(function () {
  'use strict';
  const colors = ['yellow', 'green', 'blue', 'pink'];
  const allowed = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'MARK']);
  const discarded = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'LINK', 'META', 'BASE', 'TEMPLATE']);
  function safeUrl(value) {
    if (!String(value).trim()) return null;
    try { const url = new URL(String(value).trim(), location.origin); return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function persist() {
    const saved = save();
    if (saved) document.querySelectorAll('.sticky-board[data-unsaved],.sticky-card[data-unsaved]').forEach(element => { delete element.dataset.unsaved; });
    return saved;
  }
  function sanitize(html) {
    const source = document.createElement('template'), result = document.createElement('div');
    source.innerHTML = typeof html === 'string' ? html : '';
    function copy(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toUpperCase();
      if (discarded.has(tag)) return;
      const element = allowed.has(tag) ? document.createElement(tag.toLowerCase()) : document.createDocumentFragment();
      if (tag === 'A') {
        const url = safeUrl(node.getAttribute('href') || '');
        if (url) { element.href = url; element.target = '_blank'; element.rel = 'noopener noreferrer'; }
      }
      let destination = element;
      const style = node.style;
      const wrappers = [
        [['bold', 'bolder'].includes(style.fontWeight) || Number(style.fontWeight) >= 600, 'strong', ['B', 'STRONG']],
        [style.fontStyle === 'italic', 'em', ['I', 'EM']],
        [style.textDecorationLine.includes('underline'), 'u', ['U']],
        [['rgb(255, 240, 154)', '#fff09a'].includes(style.backgroundColor), 'mark', ['MARK']]
      ];
      if (tag !== 'BR') for (const [enabled, wrapper, equivalent] of wrappers) {
        if (!enabled || equivalent.includes(tag)) continue;
        const next = document.createElement(wrapper); destination.append(next); destination = next;
      }
      for (const child of node.childNodes) copy(child, destination);
      parent.append(element);
    }
    for (const child of source.content.childNodes) copy(child, result);
    return result.innerHTML;
  }
  function records(scope, key) {
    return Object.entries(state.stickyNotes).filter(([id, note]) => !['__proto__', 'constructor', 'prototype'].includes(id) && note && typeof note === 'object' && note.scope === scope && String(scope === 'module' ? note.moduleId : note.lessonId) === String(key))
      .sort(([a, x], [b, y]) => String(x.createdAt || '').localeCompare(String(y.createdAt || '')) || a.localeCompare(b));
  }
  function board(scope, key, moduleId) {
    return `<section class="panel sticky-board" id="${scope === 'lesson' ? 'lesson-sticky-notes' : 'module-sticky-notes'}" data-sticky-scope="${scope}" data-sticky-key="${esc(key)}" data-sticky-module="${esc(moduleId)}"><div class="sectionhead"><div><h2>Sticky notes for this ${scope}</h2><p class="muted">Capture a formula, an explanation, or a question. Changes save as you type.</p></div><button class="btn" type="button" data-add-sticky>+ Add sticky note</button></div><div class="sticky-grid"></div><div class="sticky-board-footer"><small data-sticky-status role="status"></small><div><button class="textlink" type="button" data-sticky-sync></button><button class="textlink" type="button" data-sticky-export>Export all my notes</button><a class="textlink" href="#revision/notes">View all notes →</a></div></div></section>`;
  }
  function controls() { return `<div class="sticky-toolbar" role="toolbar" aria-label="Note formatting">${[
      ['bold', 'Bold', '<b>B</b>'], ['italic', 'Italic', '<i>I</i>'], ['underline', 'Underline', '<u>U</u>'], ['formatBlock', 'Heading', 'H2'], ['insertUnorderedList', 'Bulleted list', '• List'], ['insertOrderedList', 'Numbered list', '1. List'], ['backColor', 'Highlight', 'Highlight'], ['link', 'Insert link', 'Link'], ['removeFormat', 'Clear formatting', 'Clear']
    ].map(([command, label, text]) => `<button type="button" data-format="${command}" aria-label="${label}" title="${label}">${text}</button>`).join('')}</div><form class="sticky-link-form" hidden><label>Link address<input type="url" placeholder="https://example.com" required aria-label="Link address"></label><div><button class="btn secondary" type="submit">Add link</button><button class="textlink" type="button" data-cancel-link>Cancel</button></div><small role="status" data-link-error></small></form>`; }
  function bindEditor(element, editor, onChange) {
    let savedRange = null, composing = false;
    function remember() {
      const selection = getSelection();
      if (selection.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) savedRange = selection.getRangeAt(0).cloneRange();
    }
    function restore() {
      editor.focus({ preventScroll: true });
      const selection = getSelection(), range = savedRange && editor.contains(savedRange.commonAncestorContainer) ? savedRange : document.createRange();
      if (range !== savedRange) { range.selectNodeContents(editor); range.collapse(false); }
      selection.removeAllRanges(); selection.addRange(range);
    }
    function saveContent() { if (!composing) onChange(); }
    editor.oninput = saveContent;
    editor.oncompositionstart = () => { composing = true; };
    editor.oncompositionend = () => { composing = false; saveContent(); };
    editor.onkeyup = remember; editor.onmouseup = remember;
    function insertClipboard(event, transfer) {
      event.preventDefault(); restore();
      const html = transfer?.getData('text/html'), text = transfer?.getData('text/plain') || '';
      document.execCommand('insertHTML', false, html ? sanitize(html) : esc(text).replace(/\r?\n/g, '<br>'));
      saveContent(); remember();
    }
    editor.onpaste = event => { remember(); insertClipboard(event, event.clipboardData); };
    // Drop at the current caret, using the same allowlist as paste and cloud reads.
    editor.ondrop = event => { remember(); insertClipboard(event, event.dataTransfer); };
    element.querySelectorAll('[data-format]').forEach(button => {
      button.onmousedown = event => { event.preventDefault(); remember(); };
      button.onclick = () => {
        remember(); restore();
        const command = button.dataset.format;
        if (command === 'link') { element.querySelector('.sticky-link-form').hidden = false; element.querySelector('[aria-label="Link address"]').focus(); return; }
        let value = null;
        if (command === 'formatBlock') value = document.queryCommandValue('formatBlock').toLowerCase() === 'h2' ? 'p' : 'h2';
        if (command === 'backColor') value = '#fff09a';
        document.execCommand(command, false, value); saveContent(); remember();
      };
    });
    const linkForm = element.querySelector('.sticky-link-form');
    linkForm.onsubmit = event => {
      event.preventDefault();
      const url = safeUrl(linkForm.querySelector('input').value);
      if (!url) { element.querySelector('[data-link-error]').textContent = 'Use an http, https or email link.'; return; }
      restore();
      if (getSelection().isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>`);
      else document.execCommand('createLink', false, url);
      linkForm.hidden = true; linkForm.reset(); element.querySelector('[data-link-error]').textContent = ''; saveContent(); remember();
    };
    element.querySelector('[data-cancel-link]').onclick = () => { linkForm.hidden = true; restore(); };
  }
  function card(id, note) {
    const element = document.createElement('article');
    element.className = 'sticky-card'; element.dataset.stickyId = id;
    element.innerHTML = `<div class="sticky-top"><input class="sticky-title" aria-label="Note title" maxlength="120" placeholder="Untitled note"><button class="sticky-delete-button" type="button" data-delete-sticky aria-label="Delete sticky note" title="Delete note">×</button></div>${controls()}<div class="sticky-content" contenteditable="true" role="textbox" aria-label="Note text" aria-multiline="true" data-placeholder="Write your note…" spellcheck="true"></div><div class="sticky-bottom"><div class="sticky-colors" role="group" aria-label="Note color">${colors.map(color => `<button type="button" data-note-color="${color}" aria-label="${color[0].toUpperCase() + color.slice(1)} note" title="${color} note"></button>`).join('')}</div><small data-sticky-card-status role="status"></small></div><div class="sticky-delete-confirm" hidden><span>Delete this note?</span><button class="btn secondary" type="button" data-confirm-delete>Delete</button><button class="textlink" type="button" data-cancel-delete>Cancel</button></div>`;
    const title = element.querySelector('.sticky-title'), editor = element.querySelector('.sticky-content');
    function write(changes) {
      if (!Object.hasOwn(state.stickyNotes, id)) { refresh(); return; }
      state.stickyNotes[id] = { ...state.stickyNotes[id], ...changes, updatedAt: new Date().toISOString() };
      if (!persist()) element.dataset.unsaved = 'true';
      delete element.dataset.remoteUpdate;
      refresh();
    }
    title.oninput = () => write({ title: title.value });
    bindEditor(element, editor, () => write({ content: sanitize(editor.innerHTML) }));
    element.querySelectorAll('[data-note-color]').forEach(button => button.onclick = () => write({ color: button.dataset.noteColor }));
    const confirming = element.querySelector('.sticky-delete-confirm');
    element.querySelector('[data-delete-sticky]').onclick = () => { confirming.hidden = false; element.querySelector('[data-cancel-delete]').focus(); };
    element.querySelector('[data-cancel-delete]').onclick = () => { confirming.hidden = true; };
    element.querySelector('[data-confirm-delete]').onclick = () => {
      const owner = element.closest('.sticky-board');
      delete state.stickyNotes[id];
      if (!persist()) owner.dataset.unsaved = 'true';
      element.remove(); refresh(); owner.querySelector('[data-add-sticky]').focus();
    };
    element.addEventListener('focusout', () => setTimeout(refresh, 0));
    updateCard(element, note, true);
    return element;
  }
  function updateCard(element, note, force = false) {
    const title = element.querySelector('.sticky-title'), editor = element.querySelector('.sticky-content');
    const content = sanitize(note.content), name = typeof note.title === 'string' ? note.title : '';
    const focused = element.contains(document.activeElement);
    if (!force && focused && (title.value !== name || sanitize(editor.innerHTML) !== content)) element.dataset.remoteUpdate = 'true';
    else {
      if (title.value !== name) title.value = name;
      if (sanitize(editor.innerHTML) !== content) editor.innerHTML = content;
      delete element.dataset.remoteUpdate;
    }
    element.dataset.color = colors.includes(note.color) ? note.color : 'yellow';
    element.querySelectorAll('[data-note-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.noteColor === element.dataset.color)));
    element.querySelector('[data-sticky-card-status]').textContent = element.dataset.unsaved ? 'Not saved on this device · Export to keep a copy' : element.dataset.remoteUpdate ? 'Updated on another device · Leave this note to load changes' : '';
  }
  function refresh() {
    document.querySelectorAll('.sticky-board').forEach(owner => {
      const grid = owner.querySelector('.sticky-grid'), notes = records(owner.dataset.stickyScope, owner.dataset.stickyKey), ids = new Set(notes.map(([id]) => id));
      grid.querySelectorAll('.sticky-card').forEach(element => {
        if (ids.has(element.dataset.stickyId)) return;
        if (element.contains(document.activeElement)) element.querySelector('[data-sticky-card-status]').textContent = 'Deleted on another device · Copy any text you want to keep';
        else element.remove();
      });
      for (const [id, note] of notes) {
        const existing = [...grid.querySelectorAll('.sticky-card')].find(element => element.dataset.stickyId === id);
        if (existing) updateCard(existing, note); else grid.append(card(id, note));
      }
      let empty = grid.querySelector('.sticky-empty');
      if (grid.querySelector('.sticky-card')) empty?.remove();
      else if (!empty) { empty = document.createElement('p'); empty.className = 'sticky-empty muted'; empty.textContent = 'No sticky notes yet. Add one to keep an idea close by.'; grid.append(empty); }
      const status = owner.querySelector('[data-sticky-status]');
      status.textContent = owner.dataset.unsaved ? 'Unable to save on this device. Export your notes to keep a copy.' : GatewiseCloud.user ? GatewiseCloud.status : 'Saved on this device · Sign in to sync across devices';
      status.title = GatewiseCloud.problem || status.textContent;
      owner.querySelector('[data-sticky-sync]').textContent = GatewiseCloud.user ? 'Sync now' : 'Sign in to sync';
    });
  }
  function bind() {
    document.querySelectorAll('.sticky-board').forEach(owner => {
      owner.querySelector('[data-add-sticky]').onclick = () => {
        const id = crypto.randomUUID(), now = new Date().toISOString();
        state.stickyNotes[id] = { scope: owner.dataset.stickyScope, moduleId: Number(owner.dataset.stickyModule), lessonId: owner.dataset.stickyScope === 'lesson' ? owner.dataset.stickyKey : null, title: '', content: '', color: 'yellow', createdAt: now, updatedAt: now };
        if (!persist()) owner.dataset.unsaved = 'true';
        refresh();
        [...owner.querySelectorAll('.sticky-card')].find(element => element.dataset.stickyId === id).querySelector('.sticky-title').focus();
      };
      owner.querySelector('[data-sticky-export]').onclick = exportNotes;
      owner.querySelector('[data-sticky-sync]').onclick = async () => { if (!GatewiseCloud.user) GatewiseCloud.showAccount(); else await GatewiseCloud.syncNow(); };
    });
    refresh();
  }
  function context(note) {
    const subject = subjects.find(s => s.id === note.moduleId);
    if (!subject) return null;
    const lesson = note.scope === 'lesson' ? subject.lessons.find(l => l.id === note.lessonId) : null;
    if (note.scope !== 'module' && !lesson) return null;
    return { label: lesson ? `${subject.name}: ${lesson.title}` : subject.name, href: lesson ? `${lessonLink(subject, lesson)}/lesson-sticky-notes` : `#learn/${subject.id}`, subject, lesson };
  }
  function revisionCards() {
    return Object.entries(state.stickyNotes).map(([id, note]) => {
      if (!note || typeof note !== 'object') return '';
      const entry = context(note); if (!entry) return '';
      return `<section class="panel revisioncard sticky-revision" data-color="${colors.includes(note.color) ? note.color : 'yellow'}"><div class="sectionhead"><div><span class="eyebrow">${esc(entry.label)} · STICKY NOTE</span><h2>${esc(note.title || 'Untitled note')}</h2></div><a class="btn secondary" href="${entry.href}">Edit sticky note →</a></div><div class="sticky-preview">${sanitize(note.content)}</div></section>`;
    }).join('');
  }
  function markdown(html) {
    const container = document.createElement('div'); container.innerHTML = sanitize(html);
    function text(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      const children = [...node.childNodes].map(text).join('');
      switch (node.tagName) {
        case 'B': case 'STRONG': return `**${children}**`;
        case 'I': case 'EM': return `*${children}*`;
        case 'U': return `<u>${children}</u>`;
        case 'S': case 'STRIKE': return `~~${children}~~`;
        case 'MARK': return `<mark>${children}</mark>`;
        case 'BR': return '\n';
        case 'H2': return `\n## ${children}\n\n`;
        case 'H3': return `\n### ${children}\n\n`;
        case 'UL': case 'OL': return '\n' + [...node.children].map((child, i) => `${node.tagName === 'OL' ? i + 1 + '.' : '-'} ${[...child.childNodes].map(text).join('').trim().replace(/\n/g, '\n  ')}\n`).join('') + '\n';
        case 'A': return node.hasAttribute('href') ? `[${children}](${node.getAttribute('href').replace(/\(/g, '%28').replace(/\)/g, '%29')})` : children;
        case 'P': case 'DIV': return children + '\n\n';
        case 'BLOCKQUOTE': return children.trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
        default: return children;
      }
    }
    return [...container.childNodes].map(text).join('').trim();
  }
  function exportMarkdown() {
    return Object.values(state.stickyNotes).map(note => {
      if (!note || typeof note !== 'object') return '';
      const entry = context(note); if (!entry) return '';
      return `## ${entry.label}: ${note.title || 'Untitled sticky note'}\n\n${markdown(note.content)}\n\n`;
    }).join('');
  }
  window.GatewiseStickyNotes = { board, bind, refresh, sanitize, controls, bindEditor, markdown, revisionCards, exportMarkdown };
  window.addEventListener('gatewise-cloud-update', refresh);
  window.addEventListener('gatewise-sync-status', refresh);
})();
