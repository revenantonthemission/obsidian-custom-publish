// Search dialog keys (interaction-spec.md, "Search Dialog"; mockups review
// finding R-08). Pressing Enter to confirm a Korean syllable must never open a
// result, so every key is ignored while IME composition is active. Safari
// reports composition through keyCode 229 with isComposing false.
import { describe, expect, test } from 'vitest';
import { searchKeyAction, type SearchKey } from '../../src/lib/search-keys';

function key(name: string, overrides: Partial<SearchKey> = {}): SearchKey {
  return { key: name, isComposing: false, keyCode: 0, ...overrides };
}

describe('search key handling', () => {
  test('arrow keys move the selection and stop at either end', () => {
    expect(searchKeyAction(key('ArrowDown'), 0, 3)).toEqual({ type: 'move', index: 1 });
    expect(searchKeyAction(key('ArrowDown'), 2, 3)).toEqual({ type: 'move', index: 2 });
    expect(searchKeyAction(key('ArrowUp'), 2, 3)).toEqual({ type: 'move', index: 1 });
    expect(searchKeyAction(key('ArrowUp'), 0, 3)).toEqual({ type: 'move', index: 0 });
  });

  test('Enter opens the selected result and Escape closes the dialog', () => {
    expect(searchKeyAction(key('Enter'), 1, 3)).toEqual({ type: 'open', index: 1 });
    expect(searchKeyAction(key('Escape'), 1, 3)).toEqual({ type: 'close' });
  });

  test('ignores Enter, the arrows and Escape while composition is active', () => {
    for (const name of ['Enter', 'ArrowDown', 'ArrowUp', 'Escape']) {
      expect(searchKeyAction(key(name, { isComposing: true }), 0, 3), name).toEqual({ type: 'none' });
    }
  });

  test('treats keyCode 229 as composition even when isComposing is false', () => {
    for (const name of ['Enter', 'ArrowDown', 'Process']) {
      expect(searchKeyAction(key(name, { keyCode: 229 }), 0, 3), name).toEqual({ type: 'none' });
    }
  });

  test('does nothing for arrows and Enter without results, but still closes on Escape', () => {
    expect(searchKeyAction(key('ArrowDown'), 0, 0)).toEqual({ type: 'none' });
    expect(searchKeyAction(key('ArrowUp'), 0, 0)).toEqual({ type: 'none' });
    expect(searchKeyAction(key('Enter'), 0, 0)).toEqual({ type: 'none' });
    expect(searchKeyAction(key('Escape'), 0, 0)).toEqual({ type: 'close' });
    expect(searchKeyAction(key('a'), 0, 3)).toEqual({ type: 'none' });
  });
});
