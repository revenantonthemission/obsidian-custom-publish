const SVG_ATTRS = 'width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const COPY_ICON = `<svg ${SVG_ATTRS}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON = `<svg ${SVG_ATTRS}><polyline points="20 6 9 17 4 12"/></svg>`;

const COPIED_RESET_MS = 1500;

document.querySelectorAll("pre.shiki").forEach((pre) => {
  if (pre.parentElement?.querySelector(".copy-btn")) return;
  if (!pre.parentNode) return;

  let container: Element;
  if (pre.parentElement?.classList.contains("code-block")) {
    container = pre.parentElement;
  } else {
    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    container = wrapper;
  }

  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.ariaLabel = "Copy code";
  // COPY_ICON and CHECK_ICON are hardcoded SVG string constants, not user input
  btn.innerHTML = COPY_ICON;
  btn.addEventListener("click", async () => {
    const code = pre.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      btn.innerHTML = CHECK_ICON;
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = COPY_ICON;
        btn.classList.remove("copied");
      }, COPIED_RESET_MS);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS)
    }
  });

  container.appendChild(btn);
});
