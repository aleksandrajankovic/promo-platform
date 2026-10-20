"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ margin: 0, background: "#0a0a0a" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
            <p
              style={{
                color: "#D11101",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "0.5rem",
              }}
            >
              Error
            </p>
            <h1
              style={{
                color: "#fff",
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: "#a3a3a3", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Please try again. If this keeps happening, let us know.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.65rem 1.25rem",
                borderRadius: 6,
                background: "#D11101",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
