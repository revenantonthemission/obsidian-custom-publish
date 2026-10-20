import { useEffect, useRef, useState } from "preact/hooks";
import { Search as SearchIcon, X } from "lucide-preact";
import { isBackdropClick, trapTab } from "../lib/modal";
import { prepareSearchIndex, searchIndex, type PreparedSearchIndex, type SearchResult } from "../lib/search";
import { searchKeyAction } from "../lib/search-keys";

const DEBOUNCE_MS = 200;
const LISTBOX_ID = "search-results";

type LoadState = "idle" | "loading" | "error";

/** The results of the last query that ran, so no message describes a stale query. */
interface Outcome {
  readonly query: string;
  readonly results: readonly SearchResult[];
}

const NO_OUTCOME: Outcome = { query: "", results: [] };

function optionId(index: number): string {
  return `search-option-${index}`;
}

/**
 * The search dialog (FR5.2, FR4.5; interaction-spec.md "Search Dialog";
 * mockups W9). A native modal <dialog> named "검색" by aria-label, so the
 * page behind it is inert. The design's visually hidden heading would add an
 * h2 to every page's outline, since the closed dialog is part of each page. The input is a combobox driving a listbox of up to ten options by
 * aria-activedescendant; Up and Down move, Enter opens, Escape closes, and no
 * key acts while an IME is composing (R-08). Tab cycles between the input,
 * 다시 시도 when present, and the close button. Focus returns to the control
 * that opened it. The index loads on first open, and a failed load says so
 * with a retry instead of being swallowed.
 */
export default function Search() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(NO_OUTCOME);
  const [selected, setSelected] = useState(0);
  const [index, setIndex] = useState<PreparedSearchIndex | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [attempt, setAttempt] = useState(0);

  const show = (trigger: HTMLElement | null): void => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    triggerRef.current = trigger;
    dialog.showModal();
    setOpen(true);
    inputRef.current?.focus();
  };

  const hide = (): void => {
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  // ⌘K or Ctrl K toggles it; the header and the 404 page ask through "open-search".
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (dialogRef.current?.open) hide();
      else show(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    };
    const onRequest = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: unknown } | null>).detail?.trigger;
      show(trigger instanceof HTMLElement ? trigger : null);
    };
    window.addEventListener("keydown", onShortcut);
    window.addEventListener("open-search", onRequest);
    return () => {
      window.removeEventListener("keydown", onShortcut);
      window.removeEventListener("open-search", onRequest);
    };
  }, []);

  // The index loads on first open; a retry asks again.
  useEffect(() => {
    if (!open || index !== null) return;
    let cancelled = false;
    setLoadState("loading");
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error(`search-index.json answered ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((raw) => {
        if (cancelled) return;
        setIndex(prepareSearchIndex(raw));
        setLoadState("idle");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  useEffect(() => {
    if (index === null || query.trim() === "") {
      setOutcome(NO_OUTCOME);
      setSelected(0);
      return;
    }
    const timer = window.setTimeout(() => {
      setOutcome({ query, results: searchIndex(index, query) });
      setSelected(0);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, index]);

  // Keep the selected option in view as the arrows move it.
  useEffect(() => {
    listboxRef.current?.querySelector(`#${optionId(selected)}`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const onClose = (): void => {
    setOpen(false);
    setQuery("");
    setOutcome(NO_OUTCOME);
    setSelected(0);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  };

  const go = (result: SearchResult): void => {
    window.location.href = result.href;
  };

  const results = outcome.query === query ? outcome.results : [];
  const hasResults = results.length > 0;
  const searched = index !== null && query.trim() !== "" && outcome.query === query;

  const onInputKeyDown = (event: KeyboardEvent): void => {
    const action = searchKeyAction(event, selected, results.length);
    if (action.type === "none") return;
    event.preventDefault();
    if (action.type === "move") setSelected(action.index);
    else if (action.type === "close") hide();
    else {
      const result = results[action.index];
      if (result) go(result);
    }
  };

  const retry = (): void => {
    setAttempt((count) => count + 1);
    inputRef.current?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      class="search-dialog"
      aria-label="검색"
      aria-modal="true"
      data-material="thick"
      onClose={onClose}
      onKeyDown={(event) => {
        if (dialogRef.current) trapTab(dialogRef.current, event);
      }}
      onClick={(event) => {
        if (dialogRef.current && isBackdropClick(dialogRef.current, event)) hide();
      }}
    >
      <div class="search-bar">
        <SearchIcon class="search-bar-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          class="search-input"
          role="combobox"
          aria-label="검색어"
          aria-autocomplete="list"
          aria-expanded={hasResults ? "true" : "false"}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={hasResults ? optionId(selected) : undefined}
          placeholder="노트 검색"
          autocomplete="off"
          spellcheck={false}
          value={query}
          onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
          onKeyDown={onInputKeyDown}
        />
        <button type="button" class="search-close" aria-label="검색 닫기" onClick={hide}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div class="search-body">
        {loadState === "loading" && (
          <p class="search-state">
            <span class="search-spinner" aria-hidden="true" />
            검색 색인을 불러오는 중
          </p>
        )}
        {loadState === "error" && (
          <div class="search-state" role="alert">
            <p>검색을 사용할 수 없습니다</p>
            <button type="button" class="retry-button" onClick={retry}>
              다시 시도
            </button>
          </div>
        )}
        {index !== null && query.trim() === "" && <p class="search-state">제목이나 본문의 단어로 찾아보세요</p>}
        {searched && !hasResults && <p class="search-state">‘{query}’에 대한 결과가 없습니다</p>}
        <ul ref={listboxRef} id={LISTBOX_ID} class="search-results" role="listbox" aria-label="검색 결과" hidden={!hasResults}>
          {results.map((result, position) => (
            <li
              key={result.slug}
              id={optionId(position)}
              class="search-option"
              role="option"
              aria-selected={position === selected ? "true" : "false"}
              data-href={result.href}
              onClick={() => go(result)}
              onPointerMove={() => setSelected(position)}
            >
              <span class="search-option-title">{result.title}</span>
              {result.snippet !== "" && <span class="search-option-snippet">{result.snippet}</span>}
            </li>
          ))}
        </ul>
      </div>

      <p class="visually-hidden" role="status">
        {searched ? `결과 ${results.length}개` : ""}
      </p>
    </dialog>
  );
}
