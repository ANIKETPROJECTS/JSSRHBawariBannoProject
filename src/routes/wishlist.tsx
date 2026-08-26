import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { useWishlist } from "@/components/site/WishlistContext";
import { formatPrice, sarees } from "@/data/sarees";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist | Bawari Banno" }, { name: "description", content: "Your saved sarees at Bawari Banno." }] }),
  component: Wishlist,
});

function Wishlist() {
  const { ids, loaded, authenticated, toggle } = useWishlist();
  const saved = sarees.filter((saree) => ids.includes(saree.id));
  async function remove(id: string) {
    if (await toggle(id)) toast.success("Removed from your wishlist.");
  }
 return <SiteShell><section className="fabric-texture border-b border-border"><div className="mx-auto max-w-7xl px-5 py-14"><p className="text-eyebrow text-muted-foreground">Your saved edit</p><h1 className="mt-3 font-display text-5xl font-light text-primary">Wishlist</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">The sarees you loved, kept together for the right occasion.</p></div></section><main className="mx-auto max-w-7xl px-5 py-12 sm:py-16">{!loaded ? <p className="text-sm text-muted-foreground">Loading your wishlist…</p> : !authenticated ? <div className="border border-border bg-card p-10 text-center"><Heart className="mx-auto size-8 text-gold" strokeWidth={1.5} /><h2 className="mt-4 font-display text-3xl text-primary">Log in to view your wishlist</h2><p className="mt-2 text-sm text-muted-foreground">Create an account to save sarees and keep them ready for your next occasion.</p><Link to="/profile" className="mt-6 inline-flex bg-primary px-5 py-3 text-xs uppercase tracking-[0.14em] text-white">Log in or create account</Link></div> : saved.length === 0 ? <div className="border border-border bg-card p-10 text-center"><Heart className="mx-auto size-8 text-gold" strokeWidth={1.5} /><h2 className="mt-4 font-display text-3xl text-primary">Your wishlist is empty</h2><p className="mt-2 text-sm text-muted-foreground">Tap the heart on any saree to save it here.</p><Link to="/products" className="mt-6 inline-flex bg-primary px-5 py-3 text-xs uppercase tracking-[0.14em] text-white">Explore sarees</Link></div> : <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{saved.map((saree) => <article key={saree.id} className="group relative"><div className="relative overflow-hidden"><Link to="/products/$productId" params={{ productId: saree.id }}><img src={saree.image} alt={saree.name} className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" /></Link><button type="button" onClick={() => void remove(saree.id)} aria-label={`Remove ${saree.name} from wishlist`} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-red-600 shadow-sm transition-transform hover:scale-105 active:scale-90"><Heart className="size-5 fill-current" strokeWidth={1.5} /></button></div><Link to="/products/$productId" params={{ productId: saree.id }}><h2 className="mt-4 text-lg text-primary">{saree.name}</h2><p className="mt-1 text-sm">{formatPrice(saree.price)}</p></Link></article>)}</div>}</main></SiteShell>;
}