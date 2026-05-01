export const metadata = {
  title: "Solar Weather Station — Izki, Oman",
  description: "Live weather and air-quality readings from a solar-powered school weather station",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
