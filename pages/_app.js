import { useRouter } from "next/router";

const menuItems = [
  { href: "/", label: "📦 Stok", },
  { href: "/satis", label: "🛒 Satış", },
  { href: "/dashboard", label: "📊 Dashboard", },
  { href: "/hasta", label: "👤 Hastalar", },
  { href: "/skt", label: "📅 SKT", },
  { href: "/its", label: "🔗 ITS", },
  { href: "/raporlar", label: "📈 Raporlar", },
  { href: "/recete", label: "💊 Reçete", },
];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      
      {/* Üst Menü */}
      <div style={{ background: "#111827", padding: "0 16px", display: "flex", alignItems: "center", gap: "4px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px", padding: "12px 8px", marginRight: "8px", borderRight: "1px solid #374151", paddingRight: "16px" }}>
          Lord Eczanesi
        </div>
        {menuItems.map(item => (
          <a key={item.href} href={item.href} style={{
            padding: "12px 14px",
            fontSize: "13px",
            fontWeight: 500,
            color: router.pathname === item.href ? "#fff" : "#9ca3af",
            textDecoration: "none",
            borderBottom: router.pathname === item.href ? "2px solid #fff" : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            {item.label}
          </a>
        ))}
      </div>

      {/* Sayfa İçeriği */}
      <Component {...pageProps} />
    </div>
  );
}