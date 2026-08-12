export default function manifest() {
  return {
    name: "Kalendar Promocija | Meridianbet",
    short_name: "MB Kalendar",
    description:
      "Budite u toku sa dnevnim ponudama, otkrijte nove promocije i iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#A6080E",
    lang: "sr",
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
