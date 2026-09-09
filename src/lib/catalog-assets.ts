import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";
import saree4 from "@/assets/saree-4.jpg";
import saree5 from "@/assets/saree-5.jpg";
import saree6 from "@/assets/saree-6.jpg";
import saree7 from "@/assets/saree-7.jpg";
import saree8 from "@/assets/saree-8.jpg";
import saree9 from "@/assets/saree-9.jpg";
import craft from "@/assets/craft.jpg";
import story from "@/assets/story.jpg";
import maroonHero from "@/assets/hero-editorial-maroon-wide.jpg";
import tealHero from "@/assets/hero-editorial-teal-wide.jpg";
import emeraldHero from "@/assets/hero-editorial-emerald-wide.jpg";

const bundledAssets = [
  ["saree-1.jpg", saree1],
  ["saree-2.jpg", saree2],
  ["saree-3.jpg", saree3],
  ["saree-4.jpg", saree4],
  ["saree-5.jpg", saree5],
  ["saree-6.jpg", saree6],
  ["saree-7.jpg", saree7],
  ["saree-8.jpg", saree8],
  ["saree-9.jpg", saree9],
  ["craft.jpg", craft],
  ["story.jpg", story],
  ["hero.jpg", maroonHero],
  ["hero-editorial-maroon-wide.jpg", maroonHero],
  ["hero-editorial-teal-wide.jpg", tealHero],
  ["hero-editorial-emerald-wide.jpg", emeraldHero],
] as const;

function localAssetFilename(value: string) {
  if (!value.startsWith("/src/assets/") && !value.startsWith("/assets/") && !value.startsWith("src/assets/")) {
    return null;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  return decodeURIComponent(pathname).split("/").pop()?.toLowerCase() ?? null;
}

export function normalizeCatalogAsset(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const filename = localAssetFilename(raw);
  if (!filename) return raw;

  const exact = bundledAssets.find(([source]) => source === filename);
  if (exact) return exact[1];

  const hashed = bundledAssets.find(([source]) => {
    const stem = source.slice(0, -".jpg".length);
    return filename.startsWith(`${stem}-`) && filename.endsWith(".jpg");
  });
  return hashed?.[1] ?? raw;
}

function normalizeAssetList(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeCatalogAsset).filter(Boolean) : value;
}

export function normalizeCatalogRecord<T extends Record<string, unknown>>(record: T): T {
  const output = { ...record };
  if ("image" in output) output.image = normalizeCatalogAsset(output.image);
  if ("images" in output) output.images = normalizeAssetList(output.images);
  if (Array.isArray(output.variants)) {
    output.variants = output.variants.map((variant) => {
      if (!variant || typeof variant !== "object") return variant;
      const normalized = { ...(variant as Record<string, unknown>) };
      if ("image" in normalized) normalized.image = normalizeCatalogAsset(normalized.image);
      if ("images" in normalized) normalized.images = normalizeAssetList(normalized.images);
      return normalized;
    });
  }
  return output;
}