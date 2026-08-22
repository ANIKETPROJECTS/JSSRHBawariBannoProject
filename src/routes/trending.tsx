import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { CollectionPage } from "@/components/site/CollectionPage";
import { sarees } from "@/data/sarees";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending Sarees | Bawari Banno" },
      { name: "description", content: "Explore the sarees our community is loving right now." },
    ],
  }),
  component: Trending,
});

function Trending() {
  const products = sarees.filter((saree) => saree.featured);
  return (
    <SiteShell>
      <CollectionPage
        eyebrow="In the Spotlight"
        title="Trending Now"
        description="The silhouettes, colours and weaves being saved, shared and styled most this season."
        products={products}
      />
    </SiteShell>
  );
}