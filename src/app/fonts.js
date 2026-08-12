// src/app/fonts.js
import localFont from "next/font/local";
import { Anton, Bebas_Neue, Bungee, Rowdies, Russo_One } from "next/font/google";

export const rowdies = Rowdies({
  subsets: ["latin"],
  weight: "700",
});

export const russoOne = Russo_One({
  subsets: ["latin"],
  weight: "400",
});

export const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
});

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

export const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

export const fwc2026UltraCondensed = localFont({
  src: "./fonts/FWC2026-UltraCondensedMedium.ttf",
  weight: "500",
  style: "normal",
});

export const exo2Black = localFont({
  src: "./fonts/exo2/Exo2-Black.ttf",
  weight: "900",
  style: "normal",
});
