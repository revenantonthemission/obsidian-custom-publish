const content = document.querySelector('.post-content');

if (content) {
  content.querySelectorAll('h2, h3').forEach((heading) => {
    const btn = document.createElement('button');
    btn.className = 'heading-fold-toggle';
    btn.ariaLabel = '섹션 접기/펼치기';
    btn.textContent = '▶';
    heading.prepend(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const headingLevel = parseInt(heading.tagName[1]);
      const collapsed = heading.classList.toggle('collapsed');

      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (/^H[1-6]$/.test(sibling.tagName) && parseInt(sibling.tagName[1]) <= headingLevel) break;
        (sibling as HTMLElement).style.display = collapsed ? 'none' : '';
        sibling = sibling.nextElementSibling;
      }
    });
  });

  // Auto-expand collapsed section when TOC link is clicked
  document.querySelectorAll('.toc-item a').forEach((a) => {
    a.addEventListener('click', () => {
      const targetId = a.getAttribute('href')?.slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;

      // Expand any collapsed ancestor heading
      let el: Element | null = target;
      while (el && el.closest('.post-content')) {
        if (el.classList.contains('collapsed')) {
          el.querySelector('.heading-fold-toggle')?.dispatchEvent(new MouseEvent('click'));
        }
        el = el.previousElementSibling;
      }
      // Ensure target itself is visible
      if ((target as HTMLElement).style.display === 'none') {
        let prev = target.previousElementSibling;
        while (prev) {
          if (prev.classList.contains('collapsed')) {
            prev.querySelector('.heading-fold-toggle')?.dispatchEvent(new MouseEvent('click'));
            break;
          }
          prev = prev.previousElementSibling;
        }
      }
    });
  });
}
