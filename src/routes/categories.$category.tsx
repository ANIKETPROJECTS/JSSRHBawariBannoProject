import { createFileRoute, notFound } from "@tanstack/react-router";
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
  designer: "designer",
  wedding: "wedding",
} as const;

export const Route = createFileRoute("/categories/$category")({
  loader: ({ params }) => {
    const subcategory = subcategoryParents[params.category as keyof typeof subcategoryParents];
    if (subcategory) return { category: subcategory, subcategory: params.category };
    const category = categorySlugs[params.category as keyof typeof categorySlugs];
    if (!category) throw notFound();
    return { category, subcategory: null };
  },
  head: ({ loaderData }) => {
    const category = loaderData ? categoryPageDetails[loaderData.category] : undefined;
    return {
      meta: [
        { title: `${category?.title ?? "Category"} | Bawari Banno` },
        { name: "description", content: category?.description ?? "Explore the Bawari Banno collection." },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const details = categoryPageDetails[category];
  return (
    <SiteShell>
      <CollectionPage
        title={details.title}
        description={details.description}
        initialSelection={{ category, subcategory: Route.useLoaderData().subcategory }}
      />
    </SiteShell>
  );
}