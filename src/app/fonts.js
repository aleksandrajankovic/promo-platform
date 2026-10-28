// src/app/fonts.js
// Fontovi tema kalendara. preload: false — browser ih preuzima tek kad ih
// stranica stvarno koristi, pa kalendar u default temi ne skida fontove
// football teme (i obrnuto). latin-ext pokriva č, ć, ž, š, đ i portugalska slova.
import { Bebas_Neue, Exo_2, Rowdies, Russo_One } from "next/font/google";

export const rowdies = Rowdies({
  subsets: ["latin", "latin-ext"],
  weight: "700",
  preload: false,
});

export const russoOne = Russo_One({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  preload: false,
});

export const bebasNeue = Bebas_Neue({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  preload: false,
});

// Ranije lokalni Exo2-Black.ttf (128 KB); Google Fonts daje isti font kao
// woff2 sa samo potrebnim slovima.
export const exo2Black = Exo_2({
  subsets: ["latin", "latin-ext"],
  weight: "900",
  preload: false,
});
