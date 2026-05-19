"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-ES">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "#14225b" }}>
            Error crítico
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            La aplicación no ha podido iniciarse. Estamos al tanto.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#14225b",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
