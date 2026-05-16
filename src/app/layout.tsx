import "./globals.css";

export const metadata = {
  title: "MarketIntel",
  description: "Local Codex runner for MarketAnalyzer"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
