import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { CollectionPage, categoryPageDetails } from "@/components/site/CollectionPage";

const categorySlugs = {
  "silk-sarees": "silk",
  "cotton-sarees": "cotton",
  "designer-sarees": "designer",
  "wedding-collection": "wedding",
} as const;
const subcategoryParents = {
  kanjivaram: "silk",
  banarasi: "silk",
  "mysore-silk": "silk",
  handloom: "cotton",
  printed: "cotton",
} as const;

export const Route = createFileRoute("/categories/$category")({
  loader: ({ params }) => {
    const categoryFallback = categorySlugs[params.category as keyof typeof categorySlugs]
      ?? subcategoryParents[params.category as keyof typeof subcategoryParents];
    return { category: params.category, categoryFallback, subcategory: null };
  },
  head: ({ loaderData }) => {
    const category = loaderData ? categoryPageDetails[loaderData.categoryFallback ?? loaderData.category] : undefined;
    const fallbackTitle = loaderData?.category.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    return {
      meta: [
        { title: `${category?.title ?? fallbackTitle ?? "Category"} | Bawari Banno` },
        { name: "description", content: category?.description ?? "Explore the Bawari Banno collection." },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category, categoryFallback, subcategory } = Route.useLoaderData();
  const details = categoryPageDetails[categoryFallback ?? category];
  const title = details?.title ?? category.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return (
    <SiteShell>
      <CollectionPage
        title={title}
        description={details?.description ?? "Explore the latest collection from Bawari Banno."}
        initialSelection={{ category, subcategory }}
        categoryFallback={categoryFallback}
      />
    </SiteShell>
  );
}