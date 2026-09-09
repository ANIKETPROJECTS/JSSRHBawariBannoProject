import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { CollectionPage } from "@/components/site/CollectionPage";
import { sarees } from "@/data/sarees";

const newArrivalFallback = sarees.filter((saree) => saree.addedOn >= "2026-08-01").slice(0, 2);

export const Route = createFileRoute("/new-arrival")({
  head: () => ({
    meta: [
      { title: "New Arrivals | Bawari Banno" },
      { name: "description", content: "Discover the newest sarees added to the Bawari Banno collection." },
    ],
  }),
  component: NewArrival,
});

function NewArrival() {
  return (
    <SiteShell>
      <CollectionPage
        eyebrow="Just Added"
        title="New Arrivals"
        description="Fresh from the loom and newly added to our edit — the latest sarees to find a place in your wardrobe."
        productFilter={(saree) => saree.newArrival === true || saree.addedOn >= "2026-08-01"}
        minimumProducts={newArrivalFallback}
      />
    </SiteShell>
  );
}