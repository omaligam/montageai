import "./globals.css";

export const metadata = {
  title: "MontageAI – AI Video Editor",
  description: "Editor de video con IA. Genera Shorts virales automáticamente.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
