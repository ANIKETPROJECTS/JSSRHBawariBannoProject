import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { CollectionPage } from "@/components/site/CollectionPage";

export const Route = createFileRoute("/bestseller")({
  head: () => ({
    meta: [
      { title: "Bestselling Sarees | Bawari Banno" },
      { name: "description", content: "Shop the most-loved sarees from the Bawari Banno collection." },
    ],
  }),
  component: Bestseller,
});

function Bestseller() {
  return (
    <SiteShell>
      <CollectionPage
        eyebrow="Most Loved"
        title="Bestsellers"
        description="The heirloom drapes our customers return to — signature colours, enduring weaves and pieces made for repeat occasions."
        productFilter={(saree) => saree.bestseller === true || ["kanjivaram-maroon-zari", "banarasi-royal-blue", "wedding-crimson-zari", "designer-blush-georgette"].includes(saree.id)}
      />
    </SiteShell>
  );
}