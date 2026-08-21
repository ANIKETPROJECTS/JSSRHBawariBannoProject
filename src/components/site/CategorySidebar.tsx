import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { categories } from "@/data/sarees";
import { cn } from "@/lib/utils";

export type Selection = { category: string | null; subcategory: string | null };

type Props = {
  selection: Selection;
  onSelect: (selection: Selection) => void;
};

export function CategorySidebar({ selection, onSelect }: Props) {
  const [open, setOpen] = useState<string[]>(["silk"]);

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

          {categories.map((cat) => {
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

      <div className="mt-5 hidden border border-border fabric-texture p-5 lg:block">
        <p className="text-eyebrow text-muted-foreground">Atelier note</p>
        <p className="mt-3 font-display text-xl leading-snug text-primary">
          Every drape is loom-traced to its weaver family.
        </p>
      </div>
    </aside>
  );
}
