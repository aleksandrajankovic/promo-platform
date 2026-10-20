// src/app/fonts.js
import localFont from "next/font/local";
import { Bebas_Neue, Rowdies, Russo_One } from "next/font/google";

export const rowdies = Rowdies({
  subsets: ["latin"],
  weight: "700",
});

export const russoOne = Russo_One({
  subsets: ["latin"],
  weight: "400",
});

export const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

export const exo2Black = localFont({
  src: "./fonts/exo2/Exo2-Black.ttf",
  weight: "900",
  style: "normal",
});
