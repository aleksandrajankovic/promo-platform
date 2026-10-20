"use client";

export default function Error({ error, reset }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-[#D11101] font-bold text-sm uppercase tracking-wide mb-2">
          Error
        </p>
        <h1 className="text-white text-2xl font-bold mb-3">
          Something went wrong
        </h1>
        <p className="text-neutral-400 text-sm mb-6">
          Please try again. If this keeps happening, let us know.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-[#D11101] text-white text-sm font-semibold hover:brightness-110 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded border border-neutral-700 text-neutral-300 text-sm font-semibold hover:bg-neutral-800 transition"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
