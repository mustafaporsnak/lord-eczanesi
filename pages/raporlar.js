import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Raporlar() {
  const [donem, setDonem] = useState("bugun");
  const [rapor, setRapor] = useState(null);
  const [enCokSatan, setEnCokSatan] = useState([]);
  const [kasaHareketleri, setKasaHareketleri] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("ozet");

  useEffect(() => { loadRapor(); }, [donem]);

  const tarihAralik = () => {
    const simdi = new Date();
    switch (donem) {
      case "bugun": return { bas: new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString(), bitis: simdi.toISOString() };
      case "dun": {
        const dun = new Date(simdi); dun.setDate(dun.getDate() - 1);
        return { bas: new Date(dun.getFullYear(), dun.getMonth(), dun.getDate()).toISOString(), bitis: new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString() };
      }
      case "bu_hafta": return { bas: new Date(simdi.getTime() - 7 * 86400000).toISOString(), bitis: simdi.toISOString() };
      case "bu_ay": return { bas: new Date(simdi.getFullYear(), simdi.getMonth(), 1).toISOString(), bitis: simdi.toISOString() };
      case "gecen_ay": {
        const bas = new Date(simdi.getFullYear(), simdi.getMonth() - 1, 1);
        const bitis = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
        return { bas: bas.toISOString(), bitis: bitis.toISOString() };
      }
      default: return { bas: new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString(), bitis: simdi.toISOString() };
    }
  };

  const loadRapor = async () => {
    setLoading(true);
    const { bas, bitis } = tarihAralik();

    // Satışlar
    const { data: satislar } = await supabase.from("sales")
      .select("id, total_amount, payment_method, created_at, sale_items(quantity, unit_price, products(name, brand, category))")
      .gte("created_at", bas).lte("created_at", bitis)
      .order("created_at", { ascending: false });

    if (satislar) {
      const ciro = satislar.reduce((s, x) => s + Number(x.total_amount), 0);
      const toplamUrun = satislar.reduce((s, x) => s + (x.sale_items || []).reduce((a, b) => a + b.quantity, 0), 0);
      const nakit = satislar.filter(s => s.payment_method === "nakit").reduce((s, x) => s + Number(x.total_amount), 0);
      const kart = satislar.filter(s => s.payment_method === "kart").reduce((s, x) => s + Number(x.total_amount), 0);
      const karma = satislar.filter(s => s.payment_method === "karma").reduce((s, x) => s + Number(x.total_amount), 0);

      // En çok satanlar
      const urunSayac = {};
      satislar.forEach(s => (s.sale_items || []).forEach(item => {
        const ad = item.products?.name || "Bilinmeyen";
        if (!urunSayac[ad]) urunSayac[ad] = { ad, marka: item.products?.brand, kategori: item.products?.category, adet: 0, ciro: 0 };
        urunSayac[ad].adet += item.quantity;
        urunSayac[ad].ciro += item.unit_price * item.quantity;
      }));
      const siralı = Object.values(urunSayac).sort((a, b) => b.adet - a.adet).slice(0, 20);
      setEnCokSatan(siralı);

      setRapor({ satislar, ciro, toplamUrun, nakit, kart, karma, islemSayisi: satislar.length });
    }

    // Kasa hareketleri
    const { data: kasa } = await supabase.from("cash_register")
      .select("*").gte("created_at", bas).lte("created_at", bitis)
      .order("created_at", { ascending: false }).limit(50);
    setKasaHareketleri(kasa || []);

    setLoading(false);
  };

  const para = v => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const tarih = v => new Date(v).toLocaleString("tr-TR");

  const DONEMLER = [
    { k: "bugun", l: "Bugün" },
    { k: "dun", l: "Dün" },
    { k: "bu_hafta", l: "Bu Hafta" },
    { k: "bu_ay", l: "Bu Ay" },
    { k: "gecen_ay", l: "Geçen Ay" },
  ];

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "1000px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>Raporlar</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>Satış ve Kasa Analizi</div>
      </div>

      {/* Dönem Seçici */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {DONEMLER.map(d => (
          <button key={d.k} onClick={() => setDonem(d.k)} style={{ padding: "7px 14px", borderRadius: "20px", border: "none", background: donem === d.k ? "#111827" : "#fff", color: donem === d.k ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "13px", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>{d.l}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Yükleniyor...</div> : rapor && (
        <>
          {/* Özet Kartlar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", gridColumn: "1/-1" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Toplam Ciro</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#059669" }}>{para(rapor.ciro)}</div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{rapor.islemSayisi} satış işlemi · {rapor.toplamUrun} ürün</div>
            </div>
            {[
              { l: "💵 Nakit", v: rapor.nakit, c: "#059669" },
              { l: "💳 Kart", v: rapor.kart, c: "#1d4ed8" },
            ].map(s => (
              <div key={s.l} style={{ background: "#fff", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{s.l}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: s.c, marginTop: "4px" }}>{para(s.v)}</div>
              </div>
            ))}
          </div>

          {/* Tab */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {[{ k: "ozet", l: "Satışlar" }, { k: "urunler", l: "En Çok Satanlar" }, { k: "kasa", l: "Kasa" }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "7px 14px", borderRadius: "8px", border: "none", background: tab === t.k ? "#111827" : "#fff", color: tab === t.k ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "13px", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>{t.l}</button>
            ))}
          </div>

          {/* Satışlar */}
          {tab === "ozet" && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {rapor.satislar.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>Bu dönemde satış yok.</p> :
                rapor.satislar.map(s => {
                  const urunSayisi = (s.sale_items || []).reduce((a, b) => a + b.quantity, 0);
                  return (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#059669" }}>{para(s.total_amount)}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                          {urunSayisi} ürün · {s.payment_method}
                          {(s.sale_items || []).slice(0, 2).map((item, i) => <span key={i}> · {item.products?.name?.slice(0, 20)}</span>)}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>{tarih(s.created_at)}</div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* En Çok Satanlar */}
          {tab === "urunler" && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {enCokSatan.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>Veri yok.</p> :
                enCokSatan.map((u, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: i < 3 ? "#fef9c3" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: i < 3 ? "#854d0e" : "#6b7280", flexShrink: 0 }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{u.ad}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>{u.marka} · {u.kategori}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{u.adet} adet</div>
                      <div style={{ fontSize: "12px", color: "#059669" }}>{para(u.ciro)}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Kasa */}
          {tab === "kasa" && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f0fdf4", borderRadius: "8px", marginBottom: "12px" }}>
                <span style={{ fontWeight: 600, color: "#166534" }}>Toplam Kasa</span>
                <span style={{ fontWeight: 700, fontSize: "18px", color: "#059669" }}>
                  {para(kasaHareketleri.filter(k => k.type === "giriş").reduce((s, x) => s + Number(x.amount), 0))}
                </span>
              </div>
              {kasaHareketleri.length === 0 ? <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>Kasa hareketi yok.</p> :
                kasaHareketleri.map(k => (
                  <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div>
                      <span style={{ fontSize: "12px", padding: "2px 6px", borderRadius: "4px", background: k.type === "giriş" ? "#dcfce7" : "#fee2e2", color: k.type === "giriş" ? "#166534" : "#b91c1c", fontWeight: 500 }}>{k.type}</span>
                      <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>{k.payment_method}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: k.type === "giriş" ? "#059669" : "#dc2626" }}>{para(k.amount)}</div>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>{tarih(k.created_at)}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}