// src/lib/editConflict.js
// Zaštita od istovremene izmene: editor pri snimanju šalje expectedUpdatedAt
// (updatedAt reda koji je učitao). Ako se red u međuvremenu promenio, upis se
// ne radi i vraća se 409 sa podatkom ko je i kada menjao.

export class EditConflictError extends Error {
  constructor() {
    super("edit conflict");
  }
}

// undefined = klijent ne traži proveru (npr. "ipak sačuvaj moje izmene");
// null = klijent je video da red ne postoji; Date = updatedAt koji je video.
export function parseExpectedUpdatedAt(body) {
  if (!body || !("expectedUpdatedAt" in body)) return undefined;
  if (body.expectedUpdatedAt === null) return null;
  const d = new Date(body.expectedUpdatedAt);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function conflictResponse(current) {
  return Response.json(
    {
      error: "conflict",
      deleted: !current,
      updatedAt: current?.updatedAt ?? null,
      updatedBy: current?.updatedBy?.name ?? null,
    },
    { status: 409 }
  );
}
