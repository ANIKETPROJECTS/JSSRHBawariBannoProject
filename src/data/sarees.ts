import s1 from "@/assets/saree-1.jpg";
import s2 from "@/assets/saree-2.jpg";
import s3 from "@/assets/saree-3.jpg";
import s4 from "@/assets/saree-4.jpg";
import s5 from "@/assets/saree-5.jpg";
import s6 from "@/assets/saree-6.jpg";
import s7 from "@/assets/saree-7.jpg";
import s8 from "@/assets/saree-8.jpg";
import s9 from "@/assets/saree-9.jpg";

export type Saree = {
  id: string;
  name: string;
  fabric: string;
  price: number;
  category: string; // top-level category id
  subcategory?: string; // subcategory id
  image: string;
  images?: string[];
  blouse: string;
  length: string;
  care: string;
  description: string;
  productDetails?: string;
  productDescription?: string;
  productSpecification?: string;
  addedOn: string;
  featured?: boolean;
};

export type CategoryNode = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

export const categories: CategoryNode[] = [
  {
    id: "silk",
    label: "Silk Sarees",
    children: [
      { id: "kanjivaram", label: "Kanjivaram" },
      { id: "banarasi", label: "Banarasi" },
      { id: "mysore-silk", label: "Mysore Silk" },
    ],
  },
  {
    id: "cotton",
    label: "Cotton Sarees",
    children: [
      { id: "handloom", label: "Handloom" },
      { id: "printed", label: "Printed" },
    ],
  },
  { id: "designer", label: "Designer Sarees" },
  { id: "wedding", label: "Wedding Collection" },
];

export const sarees: Saree[] = [
  {
    id: "kanjivaram-maroon-zari",
    name: "Rukmini Maroon Kanjivaram",
    fabric: "Pure Mulberry Silk",
    price: 24900,
    category: "silk",
    subcategory: "kanjivaram",
    image: s1,
    blouse: "0.8m unstitched contrast blouse piece",
    length: "6.3 metres including blouse",
    care: "Dry clean only. Store wrapped in muslin.",
    description:
      "A temple-border Kanjivaram woven in Kanchipuram with pure zari. The deep maroon body carries scattered gold butis, finished with a broad korvai border.",
    addedOn: "2026-07-28",
    featured: true,
  },
  {
    id: "banarasi-royal-blue",
    name: "Neelambari Banarasi Brocade",
    fabric: "Katan Silk",
    price: 18750,
    category: "silk",
    subcategory: "banarasi",
    image: s2,
    blouse: "0.8m matching brocade blouse piece",
    length: "6.3 metres including blouse",
    care: "Dry clean only. Avoid direct sunlight.",
    description:
      "Handwoven in Varanasi over twenty-one days, this royal blue katan silk carries antique gold brocade butis and a jangla pallu.",
    addedOn: "2026-08-04",
    featured: true,
  },
  {
    id: "mysore-emerald",
    name: "Vanamala Mysore Silk",
    fabric: "Crepe Mysore Silk",
    price: 12400,
    category: "silk",
    subcategory: "mysore-silk",
    image: s3,
    blouse: "0.8m plain blouse piece",
    length: "6.2 metres including blouse",
    care: "Dry clean only.",
    description:
      "Feather-light Mysore crepe in emerald, with a restrained gold twill border — the quintessential everyday heirloom.",
    addedOn: "2026-06-11",
    featured: true,
  },
  {
    id: "handloom-ivory-rust",
    name: "Saanjh Ivory Handloom",
    fabric: "Kora Cotton",
    price: 4650,
    category: "cotton",
    subcategory: "handloom",
    image: s4,
    blouse: "0.8m rust cotton blouse piece",
    length: "6.0 metres including blouse",
    care: "Gentle hand wash separately in cold water.",
    description:
      "Woven on a pit loom in Bengal, this breathable kora cotton drapes with a crisp fall and rust selvedge stripes.",
    addedOn: "2026-08-09",
    featured: true,
  },
  {
    id: "printed-indigo-bloom",
    name: "Indigo Bloom Block Print",
    fabric: "Mul Cotton",
    price: 3290,
    category: "cotton",
    subcategory: "printed",
    image: s5,
    blouse: "0.8m printed blouse piece",
    length: "6.0 metres including blouse",
    care: "Hand wash in cold water. Dry in shade.",
    description:
      "Hand block printed in Bagru with natural indigo, this mul cotton wears beautifully through long summer days.",
    addedOn: "2026-07-02",
  },
  {
    id: "designer-blush-georgette",
    name: "Gulab Blush Georgette",
    fabric: "Georgette with Sequin Work",
    price: 15600,
    category: "designer",
    image: s6,
    blouse: "0.8m embroidered blouse piece",
    length: "5.8 metres including blouse",
    care: "Dry clean only.",
    description:
      "A modern occasion drape — powder blush georgette edged with a scalloped, hand-embroidered sequin border.",
    addedOn: "2026-08-12",
    featured: true,
  },
  {
    id: "wedding-crimson-zari",
    name: "Lakshmi Crimson Bridal",
    fabric: "Bridal Silk with Zari",
    price: 42500,
    category: "wedding",
    image: s7,
    blouse: "0.9m heavy zari blouse piece",
    length: "6.5 metres including blouse",
    care: "Dry clean only. Store flat with acid-free tissue.",
    description:
      "Our bridal signature: crimson silk laden with gold zari, a broad meenakari pallu and a weight that holds its pleats all evening.",
    addedOn: "2026-08-15",
    featured: true,
  },
  {
    id: "designer-plum-organza",
    name: "Meher Plum Organza",
    fabric: "Organza with Gold Foil",
    price: 11250,
    category: "designer",
    image: s8,
    blouse: "0.8m satin blouse piece",
    length: "5.8 metres including blouse",
    care: "Dry clean only.",
    description:
      "Sheer plum organza printed with gold foil paisleys — light as air, dramatic under evening light.",
    addedOn: "2026-07-19",
  },
  {
    id: "wedding-mustard-tissue",
    name: "Haldi Mustard Tissue Silk",
    fabric: "Tissue Silk",
    price: 16900,
    category: "wedding",
    image: s9,
    blouse: "0.8m maroon contrast blouse piece",
    length: "6.3 metres including blouse",
    care: "Dry clean only.",
    description:
      "Made for the haldi morning — molten mustard tissue silk with a deep maroon contrast border and tasselled pallu.",
    addedOn: "2026-08-01",
    featured: true,
  },
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const fabricEdits = [
  { id: "silk", title: "Pure Silk", note: "Kanjivaram, Banarasi & Mysore", image: s1 },
  { id: "cotton", title: "Handloom Cotton", note: "Breathable everyday drapes", image: s4 },
  { id: "designer", title: "Georgette & Organza", note: "Modern occasion wear", image: s6 },
  { id: "wedding", title: "Bridal Zari", note: "Heirlooms for the big day", image: s7 },
  { id: "silk", title: "Tissue & Sheen", note: "Festive lightweight silks", image: s9 },
];

export const categoryEdits = [
  { id: "kanjivaram", title: "Kanjivaram", image: s1 },
  { id: "banarasi", title: "Banarasi", image: s2 },
  { id: "mysore-silk", title: "Mysore Silk", image: s3 },
  { id: "handloom", title: "Handloom", image: s4 },
  { id: "printed", title: "Printed Cotton", image: s5 },
  { id: "designer", title: "Designer", image: s6 },
  { id: "wedding", title: "Bridal Edit", image: s7 },
  { id: "festive", title: "Festive Silks", image: s8 },
];
