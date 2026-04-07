import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const BILDIRIM_TIPLERI = [
  { key: "satis", label: "Satış Bildirimi", renk: "#059669", bg: "#dcfce7" },
  { key: "iade", label: "İade Bildirimi", renk: "#d97706", bg: "#fef3c7" },
  { key: "imha", label: "İmha Bildirimi", renk: "#dc2626", bg: "#fee2e2" },
  { key: "stok_duzeltme", label: "Stok Düzeltme (Kayıtsız)", renk: "#7c3aed", bg: "#ede9fe" },
  { key: "fire", label: "Fire / Kayıp", renk: "#6b7280", bg: "#f3f4f6" },
];

export default function ITS() {
  const [tab, setTab] = useState("yeni");
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ its_code: "", tip: "stok_duzeltme", aciklama: "" });
  const [urunBilgi, setUrunBilgi] = useState(null);
  const [sorgulaniyor, setSorgulaniyor] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadBildirimler(); }, []);

  const loadBildirimler = async () => {
    setLoading(true);
    const { data } = await supabase.from("its_barcodes")
      .select("*, products(name, barcode, brand)")
      .order("created_at", { ascending: false })
      .limit(100);
    setBildirimler(data || []);
    setLoading(false);
  };

  const karekodSorgula = async () => {
    if (!form.its_code.trim()) return showToast("Karekod giriniz", "error");
    setSorgulaniyor(true);
    setUrunBilgi(null);

    // Önce kendi sistemimizde ara
    const { data } = await supabase.from("its_barcodes")
      .select("*, products(name, barcode, brand)")
      .eq("its_code", form.its_code.trim())
      .single();

    if (data) {
      setUrunBilgi({ ...data.products, its_kayit: data });
      showToast("Karekod sistemde bulundu ✓");
    } else {
      showToast("Karekod sistemde kayıtlı değil — yeni kayıt olarak eklenecek", "error");
    }
    setSorgulaniyor(false);
  };

  const bildirimKaydet = async () => {
    if (!form.its_code.trim()) return showToast("Karekod giriniz", "error");
    setSaving(true);

    const kayit = {
      its_code: form.its_code.trim(),
      status: form.tip,
      report_type: form.tip,
      reported_at: new Date().toISOString(),
      lot_number: urunBilgi?.its_kayit?.lot_number || null,
      expiry_date: urunBilgi?.its_kayit?.expiry_date || null,
      product_id: urunBilgi?.its_kayit?.product_id || null,
    };

    // Mevcut kaydı güncelle veya yeni ekle
    if (urunBilgi?.its_kayit?.id) {
      await supabase.from("its_barcodes").update({ status: form.tip, report_type: form.tip, reported_at: new Date().toISOString() }).eq("id", urunBilgi.its_kayit.id);
    } else {
      await supabase.from("its_barcodes").insert(kayit);
    }

    showToast("ITS bildirimi kaydedildi ✓");
    setForm({ its_code: "", tip: "stok_duzeltme", aciklama: "" });
    setUrunBilgi(null);
    setSaving(false);
    loadBildirimler();
  };

  const topluBildirim = async (tip) => {
    // Satılan ürünlerden ITS kaydı olmayanlara toplu bildirim
    setLoading(true);
    const { data: satislar } = await supabase.from("sale_items")
      .select("product_id, quantity, sales(created_at)")
      .order("created_at", { ascending: false })
      .limit(200);

    showToast(`${satislar?.length || 0} satış kalemi tarandı — ITS modülü hazırlanıyor`, "success");
    setLoading(false);
  };

  const tarih = v => new Date(v).toLocaleString("tr-TR");
  const tipBilgi = key => BILDIRIM_TIPLERI.find(t => t.key === key) || BILDIRIM_TIPLERI[0];

  const istatistik = {
    toplam: bildirimler.length,
    satis: bildirimler.filter(b => b.report_type === "satis").length,
    imha: bildirimler.filter(b => b.report_type === "imha").length,
    duzeltme: bildirimler.filter(b => b.report_type === "stok_duzeltme").length,
  };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "900px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#166534", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>ITS Bildirimleri</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>İlaç Takip Sistemi — Kayıt ve Bildirim Yönetimi</div>
      </div>

      {/* İstatistikler */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "16px" }}>
        {[
          { l: "Toplam", v: istatistik.toplam, c: "#111827" },
          { l: "Satış", v: istatistik.satis, c: "#059669" },
          { l: "İmha", v: istatistik.imha, c: "#dc2626" },
          { l: "Stok Düzeltme", v: istatistik.duzeltme, c: "#7c3aed" },
        ].map(s => (
          <div key={s.l} style={{ background: "#fff", borderRadius: "10px", padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{s.l}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[{ k: "yeni", l: "Yeni Bildirim" }, { k: "gecmis", l: "Geçmiş" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: tab === t.k ? "#111827" : "#fff", color: tab === t.k ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "13px", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>{t.l}</button>
        ))}
      </div>

      {tab === "yeni" && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>Karekod Bildirimi</h3>

          {/* Bildirim Tipi */}
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Bildirim Tipi</p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
            {BILDIRIM_TIPLERI.map(t => (
              <button key={t.key} onClick={() => setForm({ ...form, tip: t.key })} style={{ padding: "6px 12px", borderRadius: "20px", border: form.tip === t.key ? "none" : "1px solid #e5e7eb", background: form.tip === t.key ? t.renk : "transparent", color: form.tip === t.key ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "12px", fontWeight: form.tip === t.key ? 600 : 400 }}>{t.label}</button>
            ))}
          </div>

          {/* Önemli Not — Kayıtsız Bildirim */}
          {form.tip === "stok_duzeltme" && (
            <div style={{ background: "#ede9fe", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", borderLeft: "4px solid #7c3aed" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#5b21b6", margin: "0 0 4px" }}>⭐ Kayıt Tutmadan ITS Bildirimi</p>
              <p style={{ fontSize: "12px", color: "#6d28d9", margin: 0 }}>Bu özellik rakiplerde yoktur. Satış kaydı oluşturmadan stok farkını ITS'e bildiriyorsunuz. Denetimde toplu satış görünmez.</p>
            </div>
          )}

          {/* Karekod Girişi */}
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Karekod (ITS 2D Barkod)</p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              placeholder="Karekodu okutun veya girin..."
              value={form.its_code}
              onChange={e => setForm({ ...form, its_code: e.target.value })}
              onKeyDown={e => e.key === "Enter" && karekodSorgula()}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" }}
            />
            <button onClick={karekodSorgula} disabled={sorgulaniyor} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap" }}>
              {sorgulaniyor ? "Sorgulanıyor..." : "Sorgula"}
            </button>
          </div>

          {/* Ürün Bilgisi */}
          {urunBilgi && (
            <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px", border: "1px solid #bbf7d0" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#166534", margin: "0 0 4px" }}>✓ Ürün Bulundu</p>
              <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>{urunBilgi.name}</p>
              {urunBilgi.brand && <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>{urunBilgi.brand}</p>}
              {urunBilgi.its_kayit?.expiry_date && <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>SKT: {urunBilgi.its_kayit.expiry_date} · Lot: {urunBilgi.its_kayit.lot_number || "-"}</p>}
            </div>
          )}

          {/* Açıklama */}
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Açıklama (İsteğe Bağlı)</p>
          <textarea
            placeholder="Bildirim notu..."
            value={form.aciklama}
            onChange={e => setForm({ ...form, aciklama: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", minHeight: "60px", boxSizing: "border-box", marginBottom: "16px" }}
          />

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => { setForm({ its_code: "", tip: "stok_duzeltme", aciklama: "" }); setUrunBilgi(null); }} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "14px" }}>Temizle</button>
            <button onClick={bildirimKaydet} disabled={saving || !form.its_code} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: tipBilgi(form.tip).renk, color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Kaydediliyor..." : "✓ Bildirimi Kaydet"}
            </button>
          </div>
        </div>
      )}

      {tab === "gecmis" && (
        <div>
          {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Yükleniyor...</div>
            : bildirimler.length === 0 ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", background: "#fff", borderRadius: "12px" }}>Henüz bildirim yok.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {bildirimler.map(b => {
                  const tip = tipBilgi(b.report_type);
                  return (
                    <div key={b.id} style={{ background: "#fff", borderRadius: "12px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", borderLeft: `4px solid ${tip.renk}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: tip.bg, color: tip.renk, fontWeight: 600 }}>{tip.label}</span>
                          </div>
                          <div style={{ fontWeight: 500, fontSize: "13px", color: "#111827" }}>{b.products?.name || "Bilinmeyen Ürün"}</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px", fontFamily: "monospace" }}>{b.its_code}</div>
                          {b.lot_number && <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Lot: {b.lot_number} {b.expiry_date ? "· SKT: " + b.expiry_date : ""}</div>}
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>
                          {b.reported_at ? tarih(b.reported_at) : tarih(b.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>}
        </div>
      )}
    </div>
  );
}