"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function DiscoverPage() {
  const { data: articles, loading, refetch } = useFetch(
    () => api.content.articles({ limit: 30 }),
    []
  );
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const handleFetch = async () => {
    setFetching(true);
    try {
      await api.content.fetch();
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const filtered = filter
    ? articles?.filter((a: any) => a.difficulty === filter)
    : articles;

  return (
    <div>
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="swiss-label">Discover</p>
          <h1>Articles</h1>
        </div>
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="swiss-btn flex items-center gap-2"
        >
          <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
          {fetching ? "Fetching..." : "Fetch New"}
        </button>
      </div>

      {/* Difficulty Filter */}
      <div className="flex gap-2 mb-8">
        {[null, "easy", "medium", "hard"].map((d) => (
          <button
            key={d ?? "all"}
            onClick={() => setFilter(d)}
            className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${
              filter === d
                ? "bg-swiss-black text-swiss-white border-swiss-black"
                : "border-swiss-light text-swiss-gray hover:border-swiss-black hover:text-swiss-black"
            }`}
          >
            {d ?? "All"}
          </button>
        ))}
      </div>

      {/* Articles List */}
      {loading ? (
        <p className="text-swiss-gray">Loading articles...</p>
      ) : !filtered?.length ? (
        <div className="swiss-card text-center py-16">
          <p className="text-swiss-gray mb-4">No articles found.</p>
          <button onClick={handleFetch} className="swiss-btn">
            Fetch Articles
          </button>
        </div>
      ) : (
        <div className="space-y-px bg-swiss-light">
          {filtered.map((article: any) => (
            <Link
              key={article.id}
              href={`/reader/?id=${article.id}`}
              className="block bg-swiss-white p-5 hover:bg-swiss-bg transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium leading-snug">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-xs text-swiss-gray mt-1 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {article.source_name && (
                      <span className="text-[10px] uppercase tracking-wider text-swiss-gray">
                        {article.source_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`swiss-tag ${
                      article.difficulty === "hard"
                        ? "border-swiss-black text-swiss-black"
                        : ""
                    }`}
                  >
                    {article.difficulty}
                  </span>
                  <span className="text-xs text-swiss-gray">
                    {article.word_count} words
                  </span>
                  {article.is_read && (
                    <span className="text-[10px] text-swiss-gray">Read</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
