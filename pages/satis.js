import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function Satis() {
  const [barkod, setBarkod] = useState("");
  const [sepet, setSepet] = useState([]);
  const [odeme, setOdeme] = useState("nakit");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [tamamlandi, setTamamlandi] = useState(false);
  const [hastaArama, setHastaArama] = useState("");
  const [hastalar, setHastalar] = useState([]);
  const [secilenHasta, setSecilenHasta] = useState(null);
  const [hastaDropdown, setHastaDropdown] = useState(false);
  const barkodRef = useRef(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { barkodRef.current?.focus(); }, []);

  useEffect(() => {
    if (hastaArama.length < 2) { setHastalar([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("patients").select("id,name,tc_no,phone").or(`name.ilike.%${hastaArama}%,tc_no.ilike.%${hastaArama}%,phone.ilike.%${hastaArama}%`).limit(5);
      setHastalar(data || []);
      setHastaDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [hastaArama]);

  const toplam = sepet.reduce((s, x) => s + (x.sale_price * x.adet), 0);
  const kdvToplam = sepet.reduce((s, x) => s + (x.sale_price * x.adet * (x.vat_rate / 100)), 0);

  const barkodOkut = async (e) => {
    if (e.key !== "Enter") return;
    const kod = barkod.trim();
    if (!kod) return;
    setLoading(true);

    const { data, error } = await supabase.from("products").select("*, stock(id,quantity,lot_number,expiry_date)").eq("barcode", kod).single();

    if (error || !data) { showToast("Ürün bulunamadı: " + kod, "error"); setBarkod(""); setLoading(false); return; }

    const toplamStok = (data.stock || []).reduce((s, x) => s + (x.quantity || 0), 0);
    if (toplamStok === 0) { showToast("Stok yok: " + data.name, "error"); setBarkod(""); setLoading(false); return; }

    const mevcut = sepet.find(x => x.id === data.id);
    if (mevcut) {
      if (mevcut.adet >= toplamStok) { showToast("Yeterli stok yok", "error"); setBarkod(""); setLoading(false); return; }
      setSepet(sepet.map(x => x.id === data.id ? { ...x, adet: x.adet + 1 } : x));
    } else {
      setSepet([...sepet, { ...data, adet: 1, toplamStok, sale_price: data.sale_price || 0 }]);
    }
    setBarkod(""); setLoading(false);
    showToast(data.name + " eklendi ✓");
  };

  const adetGuncelle = (id, yeniAdet) => {
    if (yeniAdet < 1) return;
    const urun = sepet.find(x => x.id === id);
    if (yeniAdet > urun.toplamStok) return showToast("Yeterli stok yok", "error");
    setSepet(sepet.map(x => x.id === id ? { ...x, adet: yeniAdet } : x));
  };

  const sepettenCikar = id => setSepet(sepet.filter(x => x.id !== id));

  const satisYap = async () => {
    if (sepet.length === 0) return showToast("Sepet boş", "error");
    setLoading(true);

    const { data: satis, error: satisErr } = await supabase.from("sales").insert({
      patient_id: secilenHasta?.id || null,
      sale_type: "normal",
      total_amount: toplam,
      payment_method: odeme,
    }).select().single();

    if (satisErr) { showToast("Satış hatası", "error"); setLoading(false); return; }

    for (const urun of sepet) {
      await supabase.from("sale_items").insert({ sale_id: satis.id, product_id: urun.id, quantity: urun.adet, unit_price: urun.sale_price, vat_amount: urun.sale_price * urun.adet * (urun.vat_rate / 100) });

      let kalanDusulecek = urun.adet;
      const stoklar = (urun.stock || []).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
      for (const stok of stoklar) {
        if (kalanDusulecek <= 0) break;
        if (stok.quantity <= kalanDusulecek) { await supabase.from("stock").delete().eq("id", stok.id); kalanDusulecek -= stok.quantity; }
        else { await supabase.from("stock").update({ quantity: stok.quantity - kalanDusulecek }).eq("id", stok.id); kalanDusulecek = 0; }
      }

      await supabase.from("cash_register").insert({ type: "giriş", amount: urun.sale_price * urun.adet, payment_method: odeme, sale_id: satis.id });
    }

    setLoading(false);
    setTamamlandi(true);
    setTimeout(() => { setTamamlandi(false); setSepet([]); setSecilenHasta(null); setHastaArama(""); barkodRef.current?.focus(); }, 2500);
  };

  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "15px", boxSizing: "border-box", fontFamily: "inherit" };
  const para = v => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "900px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#166534", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      {tamamlandi && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#166534", marginBottom: "8px" }}>Satış Tamamlandı!</div>
          <div style={{ fontSize: "20px", fontWeight: 600, color: "#111827" }}>{para(toplam)}</div>
          {secilenHasta && <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>{secilenHasta.name}</div>}
        </div>
      </div>}

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div><div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>Satış Ekranı</div><div style={{ fontSize: "12px", color: "#6b7280" }}>Lord Eczanesi</div></div>
      </div>

      {/* Hasta Seçimi */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", position: "relative" }}>
        <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "8px", fontWeight: 500 }}>Hasta (İsteğe Bağlı)</label>
        {secilenHasta ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#1d4ed8" }}>{secilenHasta.name}</span>
              {secilenHasta.tc_no && <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>TC: {secilenHasta.tc_no}</span>}
            </div>
            <button onClick={() => { setSecilenHasta(null); setHastaArama(""); }} style={{ padding: "3px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #bfdbfe", color: "#1d4ed8", background: "transparent", cursor: "pointer" }}>Değiştir</button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input placeholder="Hasta adı veya TC ile ara..." value={hastaArama} onChange={e => setHastaArama(e.target.value)} onFocus={() => hastalar.length > 0 && setHastaDropdown(true)} style={{ ...inp, fontSize: "14px" }} />
            {hastaDropdown && hastalar.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 50, overflow: "hidden" }}>
                {hastalar.map(h => (
                  <div key={h.id} onClick={() => { setSecilenHasta(h); setHastaArama(""); setHastaDropdown(false); }} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: "14px", color: "#111827" }}
                    onMouseEnter={e => e.target.style.background = "#f9fafb"} onMouseLeave={e => e.target.style.background = "#fff"}>
                    <span style={{ fontWeight: 500 }}>{h.name}</span>
                    {h.tc_no && <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>TC: {h.tc_no}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barkod */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "8px", fontWeight: 500 }}>Barkod Okut veya Yaz</label>
        <input ref={barkodRef} placeholder="Barkodu okutun veya yazın → Enter" value={barkod} onChange={e => setBarkod(e.target.value)} onKeyDown={barkodOkut} style={{ ...inp, fontSize: "16px", background: loading ? "#f3f4f6" : "#fff" }} disabled={loading} />
      </div>

      {/* Sepet */}
      {sepet.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🛒</div>
          <div>Barkod okutun veya yazın</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {sepet.map(u => (
              <div key={u.id} style={{ background: "#fff", borderRadius: "12px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{u.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{u.brand} · {para(u.sale_price)}/adet</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => adetGuncelle(u.id, u.adet - 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "16px" }}>−</button>
                    <span style={{ fontWeight: 600, fontSize: "15px", minWidth: "24px", textAlign: "center" }}>{u.adet}</span>
                    <button onClick={() => adetGuncelle(u.id, u.adet + 1)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "16px" }}>+</button>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", minWidth: "80px", textAlign: "right" }}>{para(u.sale_price * u.adet)}</div>
                    <button onClick={() => sepettenCikar(u.id)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #fecaca", color: "#dc2626", background: "transparent", cursor: "pointer", fontSize: "12px" }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#6b7280", fontSize: "14px" }}>Ara Toplam</span>
              <span style={{ fontSize: "14px" }}>{para(toplam - kdvToplam)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ color: "#6b7280", fontSize: "14px" }}>KDV</span>
              <span style={{ fontSize: "14px" }}>{para(kdvToplam)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
              <span style={{ fontWeight: 700, fontSize: "18px", color: "#111827" }}>Toplam</span>
              <span style={{ fontWeight: 700, fontSize: "22px", color: "#111827" }}>{para(toplam)}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {["nakit", "kart", "karma"].map(o => (
                <button key={o} onClick={() => setOdeme(o)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: odeme === o ? "none" : "1px solid #e5e7eb", background: odeme === o ? "#111827" : "transparent", color: odeme === o ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                  {o === "nakit" ? "💵 Nakit" : o === "kart" ? "💳 Kart" : "🔀 Karma"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setSepet([])} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #fecaca", color: "#dc2626", background: "transparent", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>🗑️ Temizle</button>
              <button onClick={satisYap} disabled={loading || sepet.length === 0} style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontSize: "15px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
                {loading ? "İşleniyor..." : "✓ Satışı Tamamla"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}