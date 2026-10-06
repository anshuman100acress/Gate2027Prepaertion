/* Rich topic/module notes preserve earlier text and use private account progress. */
(function () {
  'use strict';
  const formatKey = (field, key) => field + ':' + key;
  function markup(field, key) {
    const text = typeof state[field][key] === 'string' ? state[field][key] : '';
    const formatted = state.noteFormats[formatKey(field, key)];
    // An older text editor can still update or clear a note without stale HTML returning.
    return formatted && formatted.text === text ? GatewiseStickyNotes.sanitize(formatted.html) : esc(text).replace(/\r?\n/g, '<br>');
  }
  function plainText(html) {
    const root = document.createElement('div'); root.innerHTML = GatewiseStickyNotes.sanitize(html);
    function text(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (node.tagName === 'BR') return '\n';
      const value = [...node.childNodes].map(text).join('');
      return ['P', 'DIV', 'H2', 'H3', 'LI', 'BLOCKQUOTE'].includes(node.tagName) ? value + '\n' : value;
    }
    return [...root.childNodes].map(text).join('').replace(/\n$/, '');
  }
  function editor(field, key, { id, label, description, placeholder }) {
    return `<section class="panel lessonnotes noteseditor" id="${field === 'notes' ? 'lesson-notes' : 'module-notes'}" data-note-field="${field}" data-note-key="${esc(key)}"><h2 id="${id}label">${esc(label)}</h2><p class="muted">${esc(description)}</p>${GatewiseStickyNotes.controls()}<div id="${id}" class="sticky-content topic-note-content" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="${id}label" aria-describedby="${id}status" data-placeholder="${esc(placeholder)}" spellcheck="true">${markup(field, key)}</div><div class="notesactions"><small class="muted" id="${id}status" data-note-status role="status"></small><div><button class="textlink" type="button" data-note-sync></button><button class="textlink" id="${field === 'notes' ? 'downloadnotes' : 'downloadmodulenotes'}" type="button" data-note-export>Export all my notes</button><a class="textlink" href="#revision/notes">View all notes →</a></div></div></section>`;
  }
  function refresh() {
    document.querySelectorAll('.noteseditor').forEach(panel => {
      const input = panel.querySelector('.topic-note-content'), value = markup(panel.dataset.noteField, panel.dataset.noteKey);
      if (GatewiseStickyNotes.sanitize(input.innerHTML) !== value) {
        if (panel.contains(document.activeElement)) panel.dataset.remoteUpdate = 'true';
        else { input.innerHTML = value; delete panel.dataset.remoteUpdate; }
      }
      const label = panel.querySelector('[data-note-status]');
      const text = panel.dataset.unsaved ? 'Unable to save on this device. Export your notes to keep a copy.'
        : panel.dataset.remoteUpdate ? 'Updated on another device. Leave this note to load the saved version.'
        : GatewiseCloud.user ? GatewiseCloud.status : 'Saved on this device · Sign in to sync across devices';
      if (label.textContent !== text) label.textContent = text;
      label.title = panel.dataset.unsaved ? text : GatewiseCloud.problem || text;
      const sync = panel.querySelector('[data-note-sync]');
      sync.textContent = GatewiseCloud.user ? 'Sync now' : 'Sign in to sync'; sync.disabled = GatewiseProgress.locked;
    });
  }
  function bind() {
    document.querySelectorAll('.noteseditor').forEach(panel => {
      const input = panel.querySelector('.topic-note-content');
      GatewiseStickyNotes.bindEditor(panel, input, () => {
        const field = panel.dataset.noteField, key = panel.dataset.noteKey, html = GatewiseStickyNotes.sanitize(input.innerHTML), text = plainText(html);
        if (text) { state[field][key] = text; state.noteFormats[formatKey(field, key)] = { text, html }; }
        else { delete state[field][key]; delete state.noteFormats[formatKey(field, key)]; }
        delete panel.dataset.remoteUpdate;
        if (save()) delete panel.dataset.unsaved; else panel.dataset.unsaved = 'true';
        refresh();
      });
      panel.addEventListener('focusout', () => setTimeout(refresh, 0));
      panel.querySelector('[data-note-export]').onclick = exportNotes;
      panel.querySelector('[data-note-sync]').onclick = async event => {
        if (!GatewiseCloud.user) { GatewiseCloud.showAccount(); return; }
        const button = event.currentTarget; button.disabled = true;
        try { await GatewiseCloud.syncNow(); } finally { if (button.isConnected) { button.disabled = false; refresh(); } }
      };
    });
    refresh();
  }
  function preview(field, key) { return `<div class="usernote sticky-preview rich-note-preview">${markup(field, key)}</div>`; }
  function exportValue(field, key) { return GatewiseStickyNotes.markdown(markup(field, key)); }
  window.GatewiseNotes = { editor, bind, refresh, preview, exportValue };
  window.addEventListener('gatewise-sync-status', refresh);
  window.addEventListener('gatewise-cloud-update', refresh);
})();
