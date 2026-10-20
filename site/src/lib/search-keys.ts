/**
 * Search dialog key handling (FR5.2; interaction-spec.md, "Search Dialog";
 * mockups review finding R-08).
 *
 * While an IME is composing (Korean input), Enter confirms the syllable and the
 * arrow keys move inside the composition, so no key may act on the results.
 * Safari reports composition keys as keyCode 229 with isComposing false.
 */

export interface SearchKey {
  readonly key: string;
  readonly isComposing: boolean;
  readonly keyCode: number;
}

export type SearchKeyAction =
  | { readonly type: 'none' }
  | { readonly type: 'move'; readonly index: number }
  | { readonly type: 'open'; readonly index: number }
  | { readonly type: 'close' };

const IME_PROCESS_KEY_CODE = 229;
const NONE: SearchKeyAction = Object.freeze({ type: 'none' });
const CLOSE: SearchKeyAction = Object.freeze({ type: 'close' });

export function isComposing(event: SearchKey): boolean {
  return event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE;
}

export function searchKeyAction(
  event: SearchKey,
  selected: number,
  resultCount: number,
): SearchKeyAction {
  if (isComposing(event)) return NONE;
  if (event.key === 'Escape') return CLOSE;
  if (resultCount <= 0) return NONE;
  const current = Math.min(Math.max(selected, 0), resultCount - 1);
  switch (event.key) {
    case 'ArrowDown':
      return { type: 'move', index: Math.min(current + 1, resultCount - 1) };
    case 'ArrowUp':
      return { type: 'move', index: Math.max(current - 1, 0) };
    case 'Enter':
      return { type: 'open', index: current };
    default:
      return NONE;
  }
}
