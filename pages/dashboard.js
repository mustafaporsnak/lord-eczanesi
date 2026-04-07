import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [bugun, setBugun] = useState({ satis: 0, ciro: 0, urun: 0 });
  const [hafta, setHafta] = useState({ satis: 0, ciro: 0 });
  const [ay, setAy] = useState({ satis: 0, ciro: 0 });
  const [kritikStok, setKritikStok] = useState([]);
  const [sktYaklasan, setSktYaklasan] = useState([]);
  const [sonSatislar, setSonSatislar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const simdi = new Date();
    const bugunBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString();
    const haftaBaslangic = new Date(simdi.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ayBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1).toISOString();
    const otuzGun = new Date(simdi.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Bugünkü satışlar
    const { data: bugunData } = await supabase.from("sales").select("total_amount, sale_items(quantity)").gte("created_at", bugunBaslangic);
    if (bugunData) {
      const ciro = bugunData.reduce((s, x) => s + Number(x.total_amount), 0);
      const urun = bugunData.reduce((s, x) => s + (x.sale_items || []).reduce((a, b) => a + b.quantity, 0), 0);
      setBugun({ satis: bugunData.length, ciro, urun });
    }

    // Haftalık
    const { data: haftaData } = await supabase.from("sales").select("total_amount").gte("created_at", haftaBaslangic);
    if (haftaData) setHafta({ satis: haftaData.length, ciro: haftaData.reduce((s, x) => s + Number(x.total_amount), 0) });

    // Aylık
    const { data: ayData } = await supabase.from("sales").select("total_amount").gte("created_at", ayBaslangic);
    if (ayData) setAy({ satis: ayData.length, ciro: ayData.reduce((s, x) => s + Number(x.total_amount), 0) });

    // Kritik stok
    const { data: stokData } = await supabase.from("products").select("id, name, brand, min_stock_level, stock(quantity)");
    if (stokData) {
      const kritik = stokData.filter(p => {
        const qty = (p.stock || []).reduce((s, x) => s + x.quantity, 0);
        return qty > 0 && qty <= (p.min_stock_level || 5);
      }).slice(0, 10);
      const yok = stokData.filter(p => (p.stock || []).reduce((s, x) => s + x.quantity, 0) === 0).slice(0, 5);
      setKritikStok([...kritik, ...yok].slice(0, 10));
    }

    // SKT yaklaşan
    const { data: sktData } = await supabase.from("stock").select("id, lot_number, expiry_date, quantity, products(name)").lte("expiry_date", otuzGun).gt("expiry_date", new Date().toISOString().slice(0, 10)).order("expiry_date").limit(10);
    if (sktData) setSktYaklasan(sktData);

    // Son satışlar
    const { data: sonData } = await supabase.from("sales").select("id, total_amount, payment_method, created_at, sale_items(quantity)").order("created_at", { ascending: false }).limit(10);
    if (sonData) setSonSatislar(sonData);

    setLoading(false);
  };

  const para = v => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const tarih = v => new Date(v).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const sktTarih = v => new Date(v).toLocaleDateString("tr-TR");
  const gunFark = v => Math.ceil((new Date(v) - new Date()) / (1000 * 60 * 60 * 24));

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280", fontFamily: "system-ui" }}>Yükleniyor...</div>;

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "1000px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", margin: 0 }}>Dashboard</h2>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Bugün */}
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Bugün</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "20px" }}>
        {[
          { l: "Ciro", v: para(bugun.ciro), c: "#059669" },
          { l: "Satış", v: bugun.satis + " işlem", c: "#111827" },
          { l: "Ürün", v: bugun.urun + " adet", c: "#111827" },
        ].map(s => (
          <div key={s.l} style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>{s.l}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Hafta / Ay */}
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Periyot Karşılaştırma</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        {[
          { l: "Bu Hafta", satis: hafta.satis, ciro: hafta.ciro },
          { l: "Bu Ay", satis: ay.satis, ciro: ay.ciro },
        ].map(s => (
          <div key={s.l} style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", fontWeight: 600 }}>{s.l}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#059669" }}>{para(s.ciro)}</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{s.satis} satış işlemi</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>

        {/* Kritik Stok */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#b45309", margin: "0 0 12px" }}>⚠️ Kritik Stok</p>
          {kritikStok.length === 0 ? <p style={{ fontSize: "13px", color: "#6b7280" }}>Kritik stok yok 👍</p> :
            kritikStok.map(p => {
              const qty = (p.stock || []).reduce((s, x) => s + x.quantity, 0);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "13px", color: "#111827" }}>{p.name?.slice(0, 30)}</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: qty === 0 ? "#b91c1c" : "#b45309" }}>{qty === 0 ? "YOK" : qty + " adet"}</div>
                </div>
              );
            })}
        </div>

        {/* SKT Yaklaşan */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626", margin: "0 0 12px" }}>📅 SKT Yaklaşan (30 gün)</p>
          {sktYaklasan.length === 0 ? <p style={{ fontSize: "13px", color: "#6b7280" }}>SKT yaklaşan ürün yok 👍</p> :
            sktYaklasan.map(s => {
              const gun = gunFark(s.expiry_date);
              return (
                <div key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "13px", color: "#111827" }}>{s.products?.name?.slice(0, 28)}</div>
                  <div style={{ fontSize: "11px", color: gun <= 7 ? "#b91c1c" : "#b45309", marginTop: "2px" }}>
                    {sktTarih(s.expiry_date)} · {gun} gün · {s.quantity} adet
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Son Satışlar */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: "0 0 12px" }}>🧾 Son Satışlar</p>
        {sonSatislar.length === 0 ? <p style={{ fontSize: "13px", color: "#6b7280" }}>Henüz satış yok.</p> :
          sonSatislar.map(s => {
            const urunSayisi = (s.sale_items || []).reduce((a, b) => a + b.quantity, 0);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize: "13px", color: "#111827", fontWeight: 500 }}>{para(s.total_amount)}</div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{urunSayisi} ürün · {s.payment_method}</div>
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{tarih(s.created_at)}</div>
              </div>
            );
          })}
      </div>

    </div>
  );
}