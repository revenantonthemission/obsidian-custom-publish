import { useState, useEffect, useRef } from "preact/hooks";
import type { SearchIndex, SearchDocument, SearchHit } from "../lib/types";

/** Extended SearchIndex with mutable cache for sorted keys (binary search optimization). */
type IndexWithCache = SearchIndex & { _sortedKeys?: string[] };

interface Result {
  slug: string;
  title: string;
  snippet: string;
  score: number;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const [index, setIndex] = useState<IndexWithCache | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut and custom event to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-search", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-search", openHandler);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // Lazy-load index on first open
      if (!index) {
        fetch("/search-index.json")
          .then((r) => r.json())
          .then((data: IndexWithCache) => setIndex(data))
          .catch(() => {});
      }
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!index || !query.trim()) {
      setResults([]);
      setSelected(0);
      return;
    }

    const timer = setTimeout(() => runSearch(query, index), 200);
    return () => clearTimeout(timer);
  }, [query, index]);

  const runSearch = (query: string, index: IndexWithCache) => {
    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/);
    const scores = new Map<number, number>();

    // Title matching (boosted)
    for (let i = 0; i < index.documents.length; i++) {
      const doc = index.documents[i];
      if (doc.title.toLowerCase().includes(q)) {
        scores.set(i, (scores.get(i) || 0) + 100);
      }
    }

    // Build sorted keys on first search for efficient prefix matching
    if (!index._sortedKeys) {
      index._sortedKeys = Object.keys(index.inverted_index).sort();
    }
    const keys = index._sortedKeys;

    // Inverted index matching — prefix scan via binary search
    for (const token of tokens) {
      // Binary search for first key >= token
      let lo = 0, hi = keys.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (keys[mid] < token) lo = mid + 1;
        else hi = mid;
      }
      // Scan forward while keys start with the token prefix
      for (let i = lo; i < keys.length && keys[i].startsWith(token); i++) {
        const hits = index.inverted_index[keys[i]];
        for (const hit of hits) {
          scores.set(
            hit.doc_idx,
            (scores.get(hit.doc_idx) || 0) + hit.count
          );
        }
      }
    }

    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([idx, score]) => ({
        ...index.documents[idx],
        score,
      }));

    setResults(sorted);
    setSelected(0);
  };

  const navigate = (slug: string) => {
    setOpen(false);
    setQuery("");
    window.location.href = `/posts/${slug}`;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      navigate(results[selected].slug);
    }
  };

  if (!open) return null;

  return (
    <div class="search-overlay" onClick={() => setOpen(false)}>
      <div class="search-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          class="search-input"
          placeholder="검색..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        {results.length > 0 && (
          <ul class="search-results">
            {results.map((r, i) => (
              <li
                key={r.slug}
                class={`search-result ${i === selected ? "selected" : ""}`}
                onClick={() => navigate(r.slug)}
                onMouseEnter={() => setSelected(i)}
              >
                <div class="search-result-title">{r.title}</div>
                <div class="search-result-snippet">{r.snippet}</div>
              </li>
            ))}
          </ul>
        )}
        {query && results.length === 0 && index && (
          <div class="search-empty">결과 없음</div>
        )}
      </div>
    </div>
  );
}
