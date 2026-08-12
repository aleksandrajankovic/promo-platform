// src/lib/promoCategoryStyles.js

export const CATEGORY_GRADIENT_CLASSES = {
  SPORT: "bg-[linear-gradient(110.5deg,_#234919_2.58%,_#000000_92.56%)]",
  CASINO: "bg-[linear-gradient(110.5deg,_#59029D_2.58%,_#000000_92.56%)]",
  MISSIONS: "bg-[linear-gradient(110.5deg,_#4F2A17_2.58%,_#000000_92.56%)]",
  ALL: "bg-[linear-gradient(110.5deg,_#284755_2.58%,_#000000_92.56%)]",
  GOLD: "bg-[linear-gradient(110.5deg,_#5c3d00_2.58%,_#1a1000_92.56%)]",
  QUARTER_FINAL: "bg-[linear-gradient(110.5deg,_#284755_2.58%,_#000000_92.56%)]",
  SEMI_FINAL: "bg-[linear-gradient(110.5deg,_#284755_2.58%,_#000000_92.56%)]",
  FINAL: "bg-[linear-gradient(110.5deg,_#284755_2.58%,_#000000_92.56%)]",
};

// fallback ako stigne nešto čudno iz baze
export function getCategoryGradient(category) {
  const key = category || "ALL";
  return CATEGORY_GRADIENT_CLASSES[key] || CATEGORY_GRADIENT_CLASSES.ALL;
}

export function getCategoryLabel(category) {
  switch (category) {
    case "SPORT":
      return "Sport";
    case "CASINO":
      return "Casino";
    case "MISSIONS":
      return "Missions";
    case "GOLD":
      return "Zlatna lopta";
    case "QUARTER_FINAL":
      return "Četvrtfinale";
    case "SEMI_FINAL":
      return "Polufinale";
    case "FINAL":
      return "Finale";
    case "ALL":
    default:
      return "All";
  }
}

// Naslov "Ekskluzivna promocija" badge-a u modalu, samo za GOLD kategoriju
export function getExclusiveBadgeLabel(category, lang = "sr") {
  return category === "GOLD"
    ? (lang === "sr" ? "Ekskluzivna promocija" : "Exclusive promotion")
    : "";
}

export const KNOCKOUT_CATEGORIES = new Set(["QUARTER_FINAL", "SEMI_FINAL", "FINAL"]);

export function getKnockoutRingClass(category) {
  switch (category) {
    case "QUARTER_FINAL": return "knockout-ring-bronze";
    case "SEMI_FINAL":    return "knockout-ring-silver";
    case "FINAL":         return "knockout-ring-gold";
    default:              return "";
  }
}

export function getKnockoutBadgeLabel(category) {
  switch (category) {
    case "QUARTER_FINAL": return "1/4";
    case "SEMI_FINAL":    return "1/2";
    case "FINAL":         return "FINALE";
    default:              return "";
  }
}

export function getKnockoutBadgeClass(category) {
  switch (category) {
    case "QUARTER_FINAL": return "knockout-badge-bronze";
    case "SEMI_FINAL":    return "knockout-badge-silver";
    case "FINAL":         return "knockout-badge-gold";
    default:              return "";
  }
}
