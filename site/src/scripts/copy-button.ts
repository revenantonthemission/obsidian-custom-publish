/**
 * Code panels (interaction-spec.md "Code Panel and Copy Button"; mockups W3).
 * Each highlighted block gets a bar with its language and a 44 × 44 button
 * named "코드 복사" that is always visible, because touch has no hover. A
 * successful copy shows a green check for 2 s. Both outcomes are announced
 * in one polite status region, so a rejected clipboard write is reported to
 * the reader instead of being swallowed.
 */
import { ICON_CHECK, ICON_COPY, svgIcon } from './svg-icon';

const RESET_MS = 2000;
const ICON_SIZE = 20;
const COPIED = '코드를 복사했습니다';
const FAILED = '복사하지 못했습니다';
/** Languages that need no badge. */
const UNLABELED = new Set(['', 'text', 'txt', 'plaintext']);

const copiedTimers = new WeakMap<HTMLButtonElement, number>();
let statusTimer: number | undefined;

function createStatusRegion(): HTMLElement {
  const region = document.createElement('p');
  region.className = 'visually-hidden';
  region.setAttribute('role', 'status');
  region.dataset.testid = 'copy-status';
  document.body.append(region);
  return region;
}

function announce(status: HTMLElement, message: string): void {
  // Clearing first makes a repeated message announce again.
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = message;
  });
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    status.textContent = '';
  }, RESET_MS);
}

function showCopied(button: HTMLButtonElement): void {
  window.clearTimeout(copiedTimers.get(button));
  button.classList.add('copied');
  button.replaceChildren(svgIcon(ICON_CHECK, ICON_SIZE));
  copiedTimers.set(
    button,
    window.setTimeout(() => {
      button.classList.remove('copied');
      button.replaceChildren(svgIcon(ICON_COPY, ICON_SIZE));
    }, RESET_MS)
  );
}

async function copy(
  pre: HTMLElement,
  button: HTMLButtonElement,
  status: HTMLElement
): Promise<void> {
  const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
  try {
    // Without a secure context there is no clipboard API at all.
    if (!navigator.clipboard) throw new Error('The clipboard API is unavailable.');
    await navigator.clipboard.writeText(code);
  } catch {
    announce(status, FAILED);
    return;
  }
  showCopied(button);
  announce(status, COPIED);
}

function copyButton(pre: HTMLElement, status: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-btn';
  button.setAttribute('aria-label', '코드 복사');
  button.append(svgIcon(ICON_COPY, ICON_SIZE));
  button.addEventListener('click', () => {
    void copy(pre, button, status);
  });
  return button;
}

function languageBadge(pre: HTMLElement): HTMLElement | null {
  const language = (pre.dataset.language ?? '').trim();
  if (UNLABELED.has(language.toLowerCase())) return null;
  const badge = document.createElement('span');
  badge.className = 'code-language';
  badge.textContent = language;
  return badge;
}

/** The panel around the block: the filename wrapper from render.ts, or a new one. */
function panelFor(pre: HTMLElement): HTMLElement | null {
  const existing = pre.parentElement;
  if (existing?.classList.contains('code-block')) return existing;
  if (!existing) return null;
  const panel = document.createElement('div');
  panel.className = 'code-block';
  existing.insertBefore(panel, pre);
  panel.append(pre);
  return panel;
}

function decorate(pre: HTMLElement, status: HTMLElement): void {
  const panel = panelFor(pre);
  if (!panel || panel.querySelector(':scope > .code-block-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'code-block-bar';
  const label = panel.querySelector<HTMLElement>(':scope > .code-filename') ?? languageBadge(pre);
  if (label) bar.append(label);
  bar.append(copyButton(pre, status));
  panel.prepend(bar);
}

const blocks = document.querySelectorAll<HTMLElement>('.post-content pre.shiki');

if (blocks.length > 0) {
  const status = createStatusRegion();
  for (const pre of blocks) decorate(pre, status);
}
