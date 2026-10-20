// src/lib/adminUserSelect.js
// Polja admin naloga koja user-management API vraća klijentu (bez passwordHash).
export const MARKET_SUMMARY_SELECT = {
  select: { id: true, code: true, name: true },
  orderBy: { code: "asc" },
};

export const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  markets: MARKET_SUMMARY_SELECT,
  createdAt: true,
  updatedAt: true,
};
