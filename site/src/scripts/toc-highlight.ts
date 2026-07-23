const headings = document.querySelectorAll('.post-content h1[id], .post-content h2[id], .post-content h3[id], .post-content h4[id], .post-content h5[id], .post-content h6[id]');

if (headings.length) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.toc-item a, .mobile-sidebar-body .toc-item a').forEach((a) => {
          a.classList.toggle('toc-active', a.getAttribute('href') === `#${id}`);
        });
      }
    }
  }, {
    rootMargin: '-64px 0px -80% 0px',
  });

  headings.forEach((h) => observer.observe(h));
}
