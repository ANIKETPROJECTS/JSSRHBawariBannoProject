import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { CollectionPage } from "@/components/site/CollectionPage";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "All Sarees — Silk, Cotton & Bridal | Bawari Banno" },
      {
        name: "description",
        content:
          "Browse the full Bawari Banno catalogue: Kanjivaram, Banarasi, Mysore silk, handloom cotton, designer and bridal sarees.",
      },
      { property: "og:title", content: "All Sarees — Silk, Cotton & Bridal | Bawari Banno" },
      {
        property: "og:description",
        content: "Filter by fabric and weave across the full Bawari Banno saree catalogue.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  return (
    <SiteShell>
      <CollectionPage
        title="All Sarees"
        description="Nine heirloom weaves currently on the shelf, from everyday handloom cottons to occasion-ready silks, each traced to its loom."
      />
    </SiteShell>
  );
}