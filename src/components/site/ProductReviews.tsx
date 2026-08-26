import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { emptyReviewSummary, useReviewSummary, useReviews, type ReviewSummary } from "./ReviewsContext";
import { useCustomerAuth } from "./CustomerAuthContext";

type ReviewMedia = { id: string; name: string; type: "image" | "video"; contentType: string; size: number; url: string };
type ProductReview = {
  _id?: string;
  reviewerName?: string;
  rating: number;
  title: string;
  body: string;
  media?: ReviewMedia[];
  createdAt?: string;
};

function ReviewStars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <span className={`inline-flex tracking-[0.12em] text-gold ${size}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => <span key={star}>{star <= Math.round(value) ? "★" : "☆"}</span>)}
    </span>
  );
}

function formatReviewDate(value?: string) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function ProductRating({ summary, compact = false }: { summary: ReviewSummary; compact?: boolean }) {
  if (!summary.count) return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  return (
    <span className={`inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <ReviewStars value={summary.average} size={compact ? "text-xs" : "text-sm"} />
      <span className="text-muted-foreground">{summary.average.toFixed(1)} ({summary.count} review{summary.count === 1 ? "" : "s"})</span>
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const contextSummary = useReviewSummary(productId);
  const { refresh: refreshSummaries } = useReviews();
  const { openAuth } = useCustomerAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(contextSummary);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => setSummary(contextSummary), [contextSummary]);
  async function loadReviews() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load reviews.");
      setReviews(result.reviews ?? []);
      setSummary(result.summary ?? emptyReviewSummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, [productId]);

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (valid.length !== selected.length) toast.error("Only image and video files can be attached.");
    if (valid.some((file) => file.size > (file.type.startsWith("video/") ? 20 : 8) * 1024 * 1024)) {
      toast.error("Images must be under 8 MB and videos must be under 20 MB.");
      return;
    }
    setFiles((current) => [...current, ...valid].slice(0, 5));
    event.target.value = "";
  }

  function resetForm() {
    setShowForm(false);
    setRating(0);
    setTitle("");
    setBody("");
    setFiles([]);
  }

  function startReview() {
    openAuth(() => setShowForm(true));
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      toast.error("Choose a star rating first.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("productId", productId);
      form.set("rating", String(rating));
      form.set("title", title);
      form.set("body", body);
      files.forEach((file) => form.append("media", file, file.name));
      const response = await fetch("/api/reviews", { method: "POST", body: form, credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          toast.info("Please log in before writing a review.");
          openAuth(() => setShowForm(true));
          return;
        }
        throw new Error(result.error ?? "Could not submit your review.");
      }
      toast.success("Review submitted for approval.");
      resetForm();
      await loadReviews();
      await refreshSummaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reviews" className="mx-auto mt-24 max-w-7xl scroll-mt-8 px-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">From our customers</p>
          <h2 className="mt-2 font-display text-3xl text-primary">Customer reviews</h2>
        </div>
        <button
          type="button"
          onClick={() => showForm ? setShowForm(false) : startReview()}
          className="bg-primary px-5 py-3 text-eyebrow text-primary-foreground transition-colors hover:bg-ink"
        >
          {showForm ? "Close review form" : "Write a review"}
        </button>
      </div>

      <div className="mt-7 grid gap-6 border border-border bg-card p-6 md:grid-cols-[190px_1fr] md:p-8">
        <div className="border-b border-border pb-6 text-center md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <p className="font-display text-5xl text-primary">{summary.count ? summary.average.toFixed(1) : "—"}</p>
          <ReviewStars value={summary.average} size="mt-2 text-lg" />
          <p className="mt-2 text-xs text-muted-foreground">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
        </div>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((value) => {
            const count = summary.distribution[value as keyof typeof summary.distribution] ?? 0;
            const width = summary.count ? `${(count / summary.count) * 100}%` : "0%";
            return (
              <div key={value} className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="w-10 shrink-0">{value} star</span>
                <div className="h-2 flex-1 bg-[#eee8df]"><div className="h-full bg-gold transition-all" style={{ width }} /></div>
                <span className="w-5 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <form onSubmit={submitReview} className="mt-6 border border-gold/50 bg-[#fbf8f3] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-eyebrow text-gold">Share your experience</p>
              <h3 className="mt-2 font-display text-2xl text-primary">How did this saree feel?</h3>
              <p className="mt-2 text-sm text-muted-foreground">Your review will appear after a quick approval check.</p>
            </div>
            <span className="text-xs text-muted-foreground">Signed-in customers only</span>
          </div>
          <div className="mt-6">
            <span className="text-eyebrow text-muted-foreground">Your rating</span>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`} aria-pressed={rating === value} className="p-1 text-2xl text-gold transition-transform hover:scale-110">
                  {value <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-eyebrow text-muted-foreground">Review title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What stood out to you?" className="mt-2 w-full border-b border-border bg-transparent px-0 py-3 text-sm outline-none focus:border-gold" /></label>
            <label className="text-eyebrow text-muted-foreground md:row-span-2">Review details<textarea required maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="Tell other customers about the weave, colour, fit, or occasion…" className="mt-2 w-full resize-y border border-border bg-white px-3 py-3 text-sm leading-relaxed outline-none focus:border-gold" /></label>
            <label className="text-eyebrow text-muted-foreground">Photos or video <span className="normal-case tracking-normal">(optional)</span><input type="file" accept="image/*,video/*" multiple onChange={chooseFiles} className="mt-2 block w-full text-xs file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:text-white" /><span className="mt-2 block text-[11px] normal-case tracking-normal">Up to 5 files · images under 8 MB · videos under 20 MB</span></label>
          </div>
          {previews.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {previews.map(({ file, url }, index) => (
                <div key={`${file.name}-${index}`} className="relative size-20 overflow-hidden border border-border bg-white">
                  {file.type.startsWith("video/") ? <video src={url} className="h-full w-full object-cover" /> : <img src={url} alt="" className="h-full w-full object-cover" />}
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-white/90 text-primary" aria-label={`Remove ${file.name}`}><Trash2 className="size-3" /></button>
                </div>
              ))}
            </div>
          )}
          <button disabled={submitting} className="mt-6 bg-primary px-6 py-3 text-eyebrow text-white disabled:opacity-50">{submitting ? "Submitting review…" : "Submit review"}</button>
        </form>
      )}

      <div className="mt-8 divide-y divide-border border-y border-border">
        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading reviews…</p> : reviews.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p> : reviews.map((review) => (
          <article key={review._id} className="py-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-medium text-primary">{review.reviewerName || "Bawari customer"}</p><div className="mt-1 flex items-center gap-3"><ReviewStars value={review.rating} /><span className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</span></div></div>
            </div>
            <h3 className="mt-4 font-medium text-primary">{review.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{review.body}</p>
            {!!review.media?.length && <div className="mt-5 flex flex-wrap gap-3">{review.media.map((media) => <a key={media.id} href={media.url} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden border border-border bg-card">{media.type === "video" ? <video src={media.url} muted className="h-full w-full object-cover" /> : <img src={media.url} alt={media.name} className="h-full w-full object-cover" />}<span className="sr-only">Open {media.type}</span></a>)}</div>}
          </article>
        ))}
      </div>
    </section>
  );
}