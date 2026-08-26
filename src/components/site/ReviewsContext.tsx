import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ReviewDistribution = { 1: number; 2: number; 3: number; 4: number; 5: number };
export type ReviewSummary = { average: number; count: number; distribution: ReviewDistribution };

export const emptyReviewSummary: ReviewSummary = {
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

type ReviewsContextValue = {
  loaded: boolean;
  summaries: Record<string, ReviewSummary>;
  refresh: () => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<Record<string, ReviewSummary>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/reviews/summaries", { credentials: "same-origin" });
      if (!response.ok) return;
      const result = await response.json();
      setSummaries(result.summaries ?? {});
    } catch {
      setSummaries({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onReviewsUpdated = () => void refresh();
    window.addEventListener("reviews-updated", onReviewsUpdated);
    return () => window.removeEventListener("reviews-updated", onReviewsUpdated);
  }, [refresh]);

  const value = useMemo(() => ({ loaded, summaries, refresh }), [loaded, refresh, summaries]);
  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const context = useContext(ReviewsContext);
  if (!context) throw new Error("useReviews must be used inside ReviewsProvider");
  return context;
}

export function useReviewSummary(productId: string) {
  const { summaries } = useReviews();
  return summaries[productId] ?? emptyReviewSummary;
}