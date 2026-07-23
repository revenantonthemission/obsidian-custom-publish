document.querySelectorAll('.post-content .diagram, .post-content .diagram-d2, .post-content .diagram-typst').forEach((el) => {
  if (el.parentElement?.classList.contains('diagram-wrapper')) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'diagram-wrapper';
  el.parentNode?.insertBefore(wrapper, el);
  wrapper.appendChild(el);
});
