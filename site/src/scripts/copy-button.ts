function createCopySvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("width", "14");
  rect.setAttribute("height", "14");
  rect.setAttribute("x", "8");
  rect.setAttribute("y", "8");
  rect.setAttribute("rx", "2");
  rect.setAttribute("ry", "2");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2");
  svg.appendChild(rect);
  svg.appendChild(path);
  return svg;
}

function createCheckSvg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const polyline = document.createElementNS(ns, "polyline");
  polyline.setAttribute("points", "20 6 9 17 4 12");
  svg.appendChild(polyline);
  return svg;
}

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
  btn.appendChild(createCopySvg());

  btn.addEventListener("click", async () => {
    const code = pre.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      btn.replaceChildren(createCheckSvg());
      btn.classList.add("copied");
      setTimeout(() => {
        btn.replaceChildren(createCopySvg());
        btn.classList.remove("copied");
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS)
    }
  });

  container.appendChild(btn);
});
