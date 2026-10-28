"use client";
// Dugme za admin — jedan izgled za iste radnje na svim stranicama.
//   primary       glavna radnja (Save, + New)
//   secondary     sporedna (Cancel, Preview, Copy)
//   danger        nepovratna radnja (Delete u dijalogu)
//   dangerOutline opasna radnja u listi (Delete, Turn off)

const VARIANTS = {
  primary: "bg-admin-primary text-white hover:bg-admin-primary-hover",
  secondary: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
  danger: "bg-admin-danger text-white hover:bg-admin-danger-hover",
  dangerOutline: "border border-red-300 bg-white text-admin-danger hover:bg-red-50",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export default function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
