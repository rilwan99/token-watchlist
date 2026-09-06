"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { searchTokens } from "@/app/lib/api";
import { arrange, type SearchState } from "@/app/search-results";
import type { Token } from "@/app/lib/types";

const DEBOUNCE_MS = 250;

// No row is highlighted until an arrow key asks for one, so Enter on a fresh search does
// nothing rather than adding whatever happens to be first.
const NO_HIGHLIGHT = -1;

/**
 * The search half of the page: the query, its debounced request, whether the panel is open,
 * and the keyboard highlight. Membership stays in `watchlist.tsx` - `onToggle` is the only
 * thing this needs from it, called when Enter lands on the highlighted row.
 */
export function useTokenSearch(onToggle: (token: Token) => void) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "loading" });
  const [highlighted, setHighlighted] = useState(NO_HIGHLIGHT);
  const [dismissed, setDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch((current) =>
        current.kind === "ready" ? { ...current, stale: true } : { kind: "loading" },
      );
      try {
        const results = await searchTokens(trimmed, controller.signal);
        setSearch({ kind: "ready", query: trimmed, results, stale: false });
      } catch (caught) {
        if (controller.signal.aborted) return;
        setSearch({
          kind: "error",
          message: caught instanceof Error ? caught.message : "Search failed.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  const open = query.trim() !== "" && !dismissed;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const root = searchRef.current;
      if (root !== null && !root.contains(event.target as Node)) setDismissed(true);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const rows = search.kind === "ready" ? arrange(search.results, search.query) : [];

  function changeQuery(next: string) {
    setQuery(next);
    setDismissed(false);
    setHighlighted(NO_HIGHLIGHT);
    if (next.trim() === "") setSearch({ kind: "loading" });
  }

  function retry() {
    setSearch({ kind: "loading" });
    setHighlighted(NO_HIGHLIGHT);
    setAttempt((current) => current + 1);
  }

  // Escape is handled here rather than on the input so it reaches the panel's tab stops too.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      changeQuery("");
      inputRef.current?.focus();
      return;
    }
    if (!open || rows.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => (current <= 0 ? rows.length - 1 : current - 1));
    } else if (event.key === "Enter") {
      const row = rows[highlighted];
      if (row === undefined) return;
      event.preventDefault();
      onToggle(row.token);
    }
  }

  return {
    query,
    search,
    rows,
    open,
    highlighted,
    searchRef,
    inputRef,
    setHighlighted,
    changeQuery,
    retry,
    handleKeyDown,
  };
}
