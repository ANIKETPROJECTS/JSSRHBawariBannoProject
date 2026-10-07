export type StorefrontCatalog = {
  products: Record<string, unknown>[];
  categories: Record<string, unknown>[];
};

const catalogCacheMs = 30_000;
let cachedCatalog: StorefrontCatalog | null = null;
let cachedAt = 0;
let catalogRequest: Promise<StorefrontCatalog> | null = null;
let cacheGeneration = 0;

function recordsFrom(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function getCachedStorefrontCatalog() {
  return cachedCatalog;
}

export function invalidateStorefrontCatalogCache() {
  cachedCatalog = null;
  cachedAt = 0;
  cacheGeneration += 1;
  catalogRequest = null;
}

export function loadStorefrontCatalog(): Promise<StorefrontCatalog> {
  if (cachedCatalog && Date.now() - cachedAt < catalogCacheMs) {
    return Promise.resolve(cachedCatalog);
  }
  if (catalogRequest) return catalogRequest;

  const requestGeneration = cacheGeneration;
  const request = fetch("/api/catalog", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("Catalog unavailable");
      return response.json() as Promise<unknown>;
    })
    .then((payload) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Catalog response is invalid");
      }
      const record = payload as Record<string, unknown>;
      const catalog = {
        products: recordsFrom(record.products),
        categories: recordsFrom(record.categories),
      };
      if (requestGeneration === cacheGeneration) {
        cachedCatalog = catalog;
        cachedAt = Date.now();
      }
      return catalog;
    })
    .finally(() => {
      if (catalogRequest === request) catalogRequest = null;
    });

  catalogRequest = request;
  return catalogRequest;
}
