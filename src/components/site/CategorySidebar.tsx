import { RotateCcw } from "lucide-react";
import { categories, type CategoryNode, type Saree } from "@/data/sarees";
import { productColors } from "@/data/colors";
import { cn } from "@/lib/utils";
import {
  defaultFilters,
  getProductFilterValue,
  type Filters,
  type ProductFilterKey,
} from "./productFilters";

export type Selection = { category: string | null; subcategory: string | null };

type Props = {
  selection: Selection;
  onSelect: (selection: Selection) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categoryData?: CategoryNode[];
  productsForCategories?: ReadonlyArray<Saree>;
  availableColors?: ReadonlyArray<{ key: string; label: string; hex: string }>;
};

const filterOptions: Array<{ key: ProductFilterKey; label: string; options: string[] }> = [
  { key: "size", label: "Size", options: ["Free Size"] },
  { key: "occasion", label: "Occasion", options: ["Everyday", "Festive", "Wedding", "Party"] },
  { key: "technique", label: "Technique", options: ["Handloom", "Woven", "Block Print", "Embroidered"] },
  { key: "pattern", label: "Pattern", options: ["Floral", "Printed", "Buti & Paisley", "Woven Motif"] },
  { key: "borderType", label: "Border Type", options: ["Zari", "Contrast", "Scalloped", "Woven"] },
];

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 pt-3">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-foreground/75 hover:text-primary">
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={() => onChange(option)}
            className="size-4 accent-primary"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export function CategorySidebar({
  selection,
  onSelect,
  filters,
  onFiltersChange,
  categoryData,
  productsForCategories,
  availableColors,
}: Props) {
  const categoryItems = categoryData ?? categories;
  const colorOptions = availableColors ?? productColors;
  const fabrics = Array.from(new Set((productsForCategories ?? []).map((product) => product.fabric).filter(Boolean)));

  return (
    <aside className="lg:w-64 lg:shrink-0">
      <div className="border-y border-border py-4 lg:border-y-0 lg:border-r lg:pr-7">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-eyebrow text-muted-foreground">Refine</p>
            <h2 className="mt-1 whitespace-nowrap font-display text-3xl text-primary">Filter by</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onFiltersChange({ ...defaultFilters });
              onSelect({ category: null, subcategory: null });
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="size-3" strokeWidth={1.5} /> Clear
          </button>
        </div>

        <details open className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Availability</summary>
          <div className="space-y-2 pt-3 text-sm text-foreground/75">
            {[
              ["all", "All products"],
              ["in-stock", "In stock"],
              ["out-of-stock", "Out of stock"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === value}
                  onChange={() => onFiltersChange({ ...filters, availability: value as Filters["availability"] })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        <details open className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Price</summary>
          <div className="space-y-2 pt-3 text-sm text-foreground/75">
            {[
              ["all", "All prices"],
              ["under-5000", "Under ₹5,000"],
              ["5000-15000", "₹5,000 – ₹15,000"],
              ["15000-30000", "₹15,000 – ₹30,000"],
              ["over-30000", "Above ₹30,000"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="price"
                  checked={filters.price === value}
                  onChange={() => onFiltersChange({ ...filters, price: value as Filters["price"] })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        <details className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Discount</summary>
          <div className="space-y-2 pt-3 text-sm text-foreground/75">
            {[
              ["all", "All products"],
              ["on-sale", "On sale"],
              ["full-price", "Full price"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="discount"
                  checked={filters.discount === value}
                  onChange={() => onFiltersChange({ ...filters, discount: value as Filters["discount"] })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        <details open className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Category</summary>
          <div className="space-y-1 pt-3 text-sm">
            <button type="button" onClick={() => onSelect({ category: null, subcategory: null })} className={cn("block py-1 text-left hover:text-primary", !selection.category && "font-medium text-primary")}>
              All Sarees
            </button>
            {categoryItems.map((category) => (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ category: category.id, subcategory: null })}
                  className={cn("block py-1 text-left hover:text-primary", selection.category === category.id && !selection.subcategory && "font-medium text-primary")}
                >
                  {category.label}
                </button>
                {category.children?.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelect({ category: category.id, subcategory: child.id })}
                    className={cn("ml-3 block py-1 text-left text-muted-foreground hover:text-primary", selection.subcategory === child.id && "font-medium text-primary")}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </details>

        <details className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Blouse Piece</summary>
          <div className="space-y-2 pt-3 text-sm text-foreground/75">
            {[
              ["all", "All products"],
              ["with", "Included"],
              ["without", "Not included"],
            ].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="blouse-piece"
                  checked={filters.blousePiece === value}
                  onChange={() => onFiltersChange({ ...filters, blousePiece: value as Filters["blousePiece"] })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        {filterOptions.filter(({ key }) => key === "size").map(({ key, label, options }) => (
          <details key={key} className="border-b border-border py-4">
            <summary className="cursor-pointer list-none text-base font-medium text-primary">{label}</summary>
            <CheckboxGroup
              options={options}
              values={filters[key]}
              onChange={(value) => onFiltersChange({ ...filters, [key]: toggleValue(filters[key], value) })}
            />
          </details>
        ))}

        <details className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Colour</summary>
          <CheckboxGroup
            options={colorOptions.map((color) => color.key)}
            values={filters.colors}
            onChange={(value) => onFiltersChange({ ...filters, colors: toggleValue(filters.colors, value) })}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <span key={color.key} title={color.label} className="size-5 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
            ))}
          </div>
        </details>

        <details className="border-b border-border py-4">
          <summary className="cursor-pointer list-none text-base font-medium text-primary">Fabric</summary>
          <CheckboxGroup
            options={fabrics}
            values={filters.fabrics}
            onChange={(value) => onFiltersChange({ ...filters, fabrics: toggleValue(filters.fabrics, value) })}
          />
        </details>

        {filterOptions.filter(({ key }) => key !== "size").map(({ key, label, options }) => (
          <details key={key} className="border-b border-border py-4">
            <summary className="cursor-pointer list-none text-base font-medium text-primary">{label}</summary>
            <CheckboxGroup
              options={options}
              values={filters[key]}
              onChange={(value) => onFiltersChange({ ...filters, [key]: toggleValue(filters[key], value) })}
            />
          </details>
        ))}
      </div>
    </aside>
  );
}