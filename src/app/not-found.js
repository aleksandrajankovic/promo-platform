export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-[#D11101] font-bold text-sm uppercase tracking-wide mb-2">
          404
        </p>
        <h1 className="text-white text-2xl font-bold mb-3">
          Page not found
        </h1>
        <p className="text-neutral-400 text-sm mb-6">
          The page you're looking for doesn't exist or has moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-[#D11101] text-white text-sm font-semibold hover:brightness-110 transition"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
