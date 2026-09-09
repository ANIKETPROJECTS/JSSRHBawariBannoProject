import { useEffect, useMemo, useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { categories, type CategoryNode, type Saree } from "@/data/sarees";
import { productColors } from "@/data/colors";
import { cn } from "@/lib/utils";

export type Selection = { category: string | null; subcategory: string | null };
export type Filters = {
  price: string;
  colors: string[];
  fabrics: string[];
  inStock: boolean;
};

type Props = {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categoryData?: CategoryNode[];
  productsForCategories?: ReadonlyArray<Pick<Saree, "category" | "subcategory">>;
  availableColors?: ReadonlyArray<{ key: string; label: string; hex: string }>;
};

export function CategorySidebar({
  selection,
  onSelect,
  filters,
  onFiltersChange,
  categoryData,
  productsForCategories,
  availableColors,
}: Props) {
  const [open, setOpen] = useState<string[]>(["silk"]);
  const categoryItems = categoryData ?? categories;
  const colorOptions = availableColors ?? productColors;
  const visibleCategoryItems = useMemo(() => {
    if (!productsForCategories) return categoryItems;

    return categoryItems
      .map((category) => {
        const visibleChildren = category.children?.filter((subcategory) =>
          productsForCategories.some(
            (product) =>
              product.category === category.id && product.subcategory === subcategory.id,
          ),
        );
        return visibleChildren?.length
          ? { ...category, children: visibleChildren }
          : { ...category, children: undefined };
      })
      .filter((category) =>
        productsForCategories.some((product) => product.category === category.id),
      );
  }, [categoryItems, productsForCategories]);

  useEffect(() => {
    if (!selection.category) return;
    const selected = visibleCategoryItems.find((category) => category.id === selection.category);
    if (selected?.children?.length) {
      setOpen((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    }
  }, [selection.category, visibleCategoryItems]);

  const toggle = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <aside className="lg:w-60 lg:shrink-0">
      <div className="border border-border bg-sidebar/60 p-5">
        <p className="text-eyebrow text-muted-foreground">Browse</p>
        <h2 className="mt-2 font-display text-2xl text-primary">Categories</h2>
        <div className="mt-4 h-px bg-gold/40" />

        <ul className="mt-4 space-y-1 text-sm">
          <li>
            <button
              type="button"
              onClick={() => onSelect({ category: null, subcategory: null })}
              className={cn(
                "w-full py-1.5 text-left transition-colors hover:text-primary",
                !selection.category ? "text-primary" : "text-foreground/75",
              )}
            >
              All Sarees
            </button>
          </li>

           {visibleCategoryItems.map((cat) => {
            const isOpen = open.includes(cat.id);
            const active = selection.category === cat.id;
            return (
              <li key={cat.id}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelect({ category: cat.id, subcategory: null })}
                    className={cn(
                      "flex-1 py-1.5 text-left transition-colors hover:text-primary",
                      active && !selection.subcategory
                        ? "text-primary"
                        : "text-foreground/75",
                    )}
                  >
                    {cat.label}
                  </button>
                  {cat.children && (
                    <button
                      type="button"
                      aria-label={`Toggle ${cat.label}`}
                      aria-expanded={isOpen}
                      onClick={() => toggle(cat.id)}
                      className="p-1 text-muted-foreground hover:text-primary"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform",
                          isOpen && "rotate-90",
                        )}
                        strokeWidth={1.5}
                      />
                    </button>
                  )}
                </div>

                {cat.children && isOpen && (
                  <ul className="ml-1 space-y-1 border-l border-border pl-4 pb-1">
                    {cat.children.map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect({ category: cat.id, subcategory: sub.id })
                          }
                          className={cn(
                            "w-full py-1 text-left text-[0.82rem] transition-colors hover:text-primary",
                            selection.subcategory === sub.id
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 border border-border bg-sidebar/60 p-5">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-muted-foreground">Refine</p>
          <button
            type="button"
            onClick={() => onFiltersChange({ price: "all", colors: [], fabrics: [], inStock: false })}
            className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="size-3" strokeWidth={1.5} /> Clear
          </button>
        </div>

        <div className="mt-4 h-px bg-gold/40" />
        <fieldset className="mt-5">
          <legend className="text-sm text-primary">Price range</legend>
          <div className="mt-3 space-y-1.5">
            {[
              ["all", "All prices"],
              ["under-5000", "Under ₹5,000"],
              ["5000-15000", "₹5,000 – ₹15,000"],
              ["15000-30000", "₹15,000 – ₹30,000"],
              ["over-30000", "Above ₹30,000"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-xs text-foreground/75 hover:text-primary">
                <input
                  type="radio"
                  name="price-range"
                  checked={filters.price === value}
                  onChange={() => onFiltersChange({ ...filters, price: value })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm text-primary">Colour</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorOptions.map(({ key: color, hex, label }) => {
              const checked = filters.colors.includes(color);
              return (
                <label key={color} title={label} className={cn("flex size-7 cursor-pointer items-center justify-center rounded-full border", checked ? "border-primary p-0.5" : "border-transparent")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onFiltersChange({ ...filters, colors: checked ? filters.colors.filter((item) => item !== color) : [...filters.colors, color] })}
                    className="sr-only"
                  />
                  <span className="size-full rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[0.65rem] capitalize text-muted-foreground">
            {filters.colors.length ? filters.colors.join(", ") : "All colours"}
          </p>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm text-primary">Fabric</legend>
          <div className="mt-3 space-y-1.5">
            {["Silk", "Cotton", "Georgette", "Organza"].map((fabric) => {
              const checked = filters.fabrics.includes(fabric);
              return (
                <label key={fabric} className="flex cursor-pointer items-center gap-2 text-xs text-foreground/75 hover:text-primary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onFiltersChange({ ...filters, fabrics: checked ? filters.fabrics.filter((item) => item !== fabric) : [...filters.fabrics, fabric] })}
                    className="accent-primary"
                  />
                  {fabric}
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-6 flex cursor-pointer items-center gap-2 border-t border-border pt-4 text-xs text-foreground/75 hover:text-primary">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(event) => onFiltersChange({ ...filters, inStock: event.target.checked })}
            className="accent-primary"
          />
          Show available pieces only
        </label>
      </div>

      <div className="mt-5 hidden border border-border fabric-texture p-5 lg:block">
        <p className="text-eyebrow text-muted-foreground">Atelier note</p>
        <p className="mt-3 font-display text-xl leading-snug text-primary">
          Every drape is loom-traced to its weaver family.
        </p>
      </div>
    </aside>
  );
}
