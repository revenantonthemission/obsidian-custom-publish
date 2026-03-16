import { useState, useEffect, useRef } from "preact/hooks";

interface SearchDocument {
  slug: string;
  title: string;
  snippet: string;
}

interface SearchHit {
  doc_idx: number;
  count: number;
}

interface SearchIndex {
  documents: SearchDocument[];
  inverted_index: Record<string, SearchHit[]>;
}

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
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // Lazy-load index on first open
      if (!index) {
        fetch("/search-index.json")
          .then((r) => r.json())
          .then((data: SearchIndex) => setIndex(data))
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

  const runSearch = (query: string, index: SearchIndex) => {
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

    // Inverted index matching
    for (const token of tokens) {
      for (const [term, hits] of Object.entries(index.inverted_index)) {
        if (term.includes(token)) {
          for (const hit of hits) {
            scores.set(
              hit.doc_idx,
              (scores.get(hit.doc_idx) || 0) + hit.count
            );
          }
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
