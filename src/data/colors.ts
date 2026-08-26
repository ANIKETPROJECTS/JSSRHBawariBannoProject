export const productColors = [
  { key: "maroon", label: "Maroon", hex: "#78152a" },
  { key: "blue", label: "Blue", hex: "#254aa5" },
  { key: "green", label: "Green", hex: "#2c7a52" },
  { key: "ivory", label: "Ivory", hex: "#e8dfc9" },
  { key: "pink", label: "Pink", hex: "#e3a1ae" },
  { key: "indigo", label: "Indigo", hex: "#364273" },
  { key: "plum", label: "Plum", hex: "#693d68" },
  { key: "mustard", label: "Mustard", hex: "#c7952d" },
] as const;

export type ProductColorKey = (typeof productColors)[number]["key"];

export function getProductColor(key: string | undefined) {
  return productColors.find((color) => color.key === key);
}