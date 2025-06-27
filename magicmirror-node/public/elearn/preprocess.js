document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.typingBox-vscode').forEach(box => {
    let hint = box.getAttribute('data-hint') || '';
    hint = hint.replace(/<div>/g, '')
               .replace(/<br\s*\/?>/g, '\n')
               .replace(/<\/div>/g, '\n');
    box.setAttribute('data-hint', hint);
  });
});
