export type ProductColorOption = {
  key: string;
  label: string;
  hex: string;
};

export const productColors = [
  { key: "red", label: "Red", hex: "#c0392b" },
  { key: "orange", label: "Orange", hex: "#e67e22" },
  { key: "yellow", label: "Yellow", hex: "#f1c40f" },
  { key: "green", label: "Green", hex: "#2c7a52" },
  { key: "blue", label: "Blue", hex: "#254aa5" },
  { key: "purple", label: "Purple", hex: "#8e44ad" },
  { key: "pink", label: "Pink", hex: "#e3a1ae" },
  { key: "maroon", label: "Maroon", hex: "#78152a" },
  { key: "indigo", label: "Indigo", hex: "#364273" },
  { key: "plum", label: "Plum", hex: "#693d68" },
  { key: "navy", label: "Navy", hex: "#203864" },
  { key: "teal", label: "Teal", hex: "#148a88" },
  { key: "turquoise", label: "Turquoise", hex: "#2aada4" },
  { key: "coral", label: "Coral", hex: "#f08080" },
  { key: "peach", label: "Peach", hex: "#f4b183" },
  { key: "lavender", label: "Lavender", hex: "#b8a5d6" },
  { key: "brown", label: "Brown", hex: "#8b5e3c" },
  { key: "beige", label: "Beige", hex: "#d8c3a5" },
  { key: "ivory", label: "Ivory", hex: "#e8dfc9" },
  { key: "mustard", label: "Mustard", hex: "#c7952d" },
  { key: "gold", label: "Gold", hex: "#c7952d" },
  { key: "silver", label: "Silver", hex: "#a8adb5" },
  { key: "grey", label: "Grey", hex: "#8b8b8b" },
  { key: "black", label: "Black", hex: "#1f1f1f" },
  { key: "white", label: "White", hex: "#f7f5ef" },
] as const satisfies readonly ProductColorOption[];

export type ProductColorKey = (typeof productColors)[number]["key"];
export const otherColorKey = "__other__";

export function getProductColor(key: string | undefined) {
  const normalizedKey = String(key ?? "").trim().toLowerCase();
  return productColors.find((color) => color.key === normalizedKey);
}

export function normalizeProductColor(value: string) {
  const trimmed = value.trim();
  return getProductColor(trimmed)?.key ?? trimmed;
}

export function getColorFilterKey(value: string) {
  return getProductColor(value)?.key ?? value.trim().toLowerCase();
}