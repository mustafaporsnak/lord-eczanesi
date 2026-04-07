import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function SKT() {
  const [kritik, setKritik] = useState([]);
  const [yaklasan, setYaklasan] = useState([]);
  const [gecmis, setGecmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("yaklasan");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const bugun = new Date().toISOString().slice(0, 10);
    const yediGun = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const otuzGun = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    // Süresi geçmiş
    const { data: gecmisData } = await supabase.from("stock")
      .select("id, lot_number, expiry_date, quantity, products(id, name, barcode, brand)")
      .lt("expiry_date", bugun)
      .order("expiry_date")
      .limit(50);
    setGecmis(gecmisData || []);

    // 7 gün içinde
    const { data: kritikData } = await supabase.from("stock")
      .select("id, lot_number, expiry_date, quantity, products(id, name, barcode, brand)")
      .gte("expiry_date", bugun)
      .lte("expiry_date", yediGun)
      .order("expiry_date")
      .limit(50);
    setKritik(kritikData || []);

    // 8-30 gün arası
    const { data: yakData } = await supabase.from("stock")
      .select("id, lot_number, expiry_date, quantity, products(id, name, barcode, brand)")
      .gt("expiry_date", yediGun)
      .lte("expiry_date", otuzGun)
      .order("expiry_date")
      .limit(100);
    setYaklasan(yakData || []);

    setLoading(false);
  };

  const gunFark = v => Math.ceil((new Date(v) - new Date()) / 86400000);
  const tarih = v => new Date(v).toLocaleDateString("tr-TR");

  const aktifListe = filtre === "gecmis" ? gecmis : filtre === "kritik" ? kritik : yaklasan;

  const renk = s => {
    if (filtre === "gecmis") return { bg: "#fee2e2", cl: "#b91c1c", badge: "#fca5a5" };
    const g = gunFark(s.expiry_date);
    if (g <= 7) return { bg: "#fee2e2", cl: "#b91c1c", badge: "#fca5a5" };
    if (g <= 15) return { bg: "#fef9c3", cl: "#854d0e", badge: "#fcd34d" };
    return { bg: "#fff7ed", cl: "#c2410c", badge: "#fdba74" };
  };

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280", fontFamily: "system-ui" }}>Yükleniyor...</div>;

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "900px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>SKT Takip</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>Son Kullanma Tarihi Yönetimi</div>
      </div>

      {/* Özet Kartlar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { key: "gecmis", l: "Süresi Geçmiş", v: gecmis.length, c: "#b91c1c", bg: "#fee2e2" },
          { key: "kritik", l: "7 Gün İçinde", v: kritik.length, c: "#b45309", bg: "#fef9c3" },
          { key: "yaklasan", l: "30 Gün İçinde", v: yaklasan.length, c: "#c2410c", bg: "#fff7ed" },
        ].map(s => (
          <div key={s.key} onClick={() => setFiltre(s.key)} style={{ background: filtre === s.key ? s.bg : "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", cursor: "pointer", border: filtre === s.key ? `2px solid ${s.c}` : "2px solid transparent", transition: "all 0.15s" }}>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>{s.l}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Liste */}
      {aktifListe.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", background: "#fff", borderRadius: "12px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
          <div>Bu kategoride ürün yok</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {aktifListe.map(s => {
            const { bg, cl } = renk(s);
            const gun = filtre === "gecmis" ? null : gunFark(s.expiry_date);
            return (
              <div key={s.id} style={{ background: "#fff", borderRadius: "12px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", borderLeft: `4px solid ${cl}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{s.products?.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                      {[s.products?.brand, s.lot_number ? "Lot: " + s.lot_number : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: cl, padding: "3px 8px", background: bg, borderRadius: "6px", marginBottom: "4px" }}>
                      {filtre === "gecmis" ? "⛔ " + tarih(s.expiry_date) : gun + " gün · " + tarih(s.expiry_date)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{s.quantity} adet</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}