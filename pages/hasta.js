import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const DEF = { name: "", tc_no: "", phone: "", birth_date: "", notes: "" };

export default function Hastalar() {
  const [hastalar, setHastalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [detay, setDetay] = useState(false);
  const [editH, setEditH] = useState(null);
  const [secilenHasta, setSecilenHasta] = useState(null);
  const [satislar, setSatislar] = useState([]);
  const [form, setForm] = useState(DEF);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async (aramaMetni = "") => {
    setLoading(true);
    let query = supabase.from("patients").select("*").order("name").limit(100);
    if (aramaMetni.length >= 2) query = query.or(`name.ilike.%${aramaMetni}%,tc_no.ilike.%${aramaMetni}%,phone.ilike.%${aramaMetni}%`);
    const { data, error } = await query;
    if (error) showToast("Yükleme hatası", "error");
    else setHastalar(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const openAdd = () => { setEditH(null); setForm(DEF); setModal(true); };
  const openEdit = h => { setEditH(h); setForm({ name: h.name || "", tc_no: h.tc_no || "", phone: h.phone || "", birth_date: h.birth_date || "", notes: h.notes || "" }); setModal(true); };

  const openDetay = async h => {
    setSecilenHasta(h);
    const { data } = await supabase.from("sales").select("id, total_amount, payment_method, created_at, sale_items(quantity, unit_price, products(name))").eq("patient_id", h.id).order("created_at", { ascending: false }).limit(20);
    setSatislar(data || []);
    setDetay(true);
  };

  const save = async () => {
    if (!form.name) return showToast("Ad zorunlu", "error");
    setSaving(true);
    if (editH) {
      const { error } = await supabase.from("patients").update(form).eq("id", editH.id);
      if (error) showToast("Güncelleme hatası", "error"); else showToast("Hasta güncellendi ✓");
    } else {
      const { error } = await supabase.from("patients").insert(form);
      if (error) showToast("Kayıt hatası", "error"); else showToast("Hasta eklendi ✓");
    }
    setModal(false); setSaving(false); load(search);
  };

  const del = async id => {
    await supabase.from("patients").delete().eq("id", id);
    showToast("Hasta silindi"); setDelConfirm(null); load(search);
  };

  const inp = { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box", fontFamily: "inherit" };
  const lbl = { fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "3px", marginTop: "8px" };
  const para = v => Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const tarih = v => new Date(v).toLocaleDateString("tr-TR");

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "900px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#166534", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>Hasta Kartları</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Lord Eczanesi · {hastalar.length} kayıt</div>
        </div>
        <button onClick={openAdd} style={{ background: "#111827", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>+ Hasta Ekle</button>
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "12px 14px", marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <input placeholder="🔍  Ad, TC veya telefon ara..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, marginBottom: 0, background: "#f3f4f6", border: "none" }} />
      </div>

      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Yükleniyor...</div>
        : hastalar.length === 0 ? <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", background: "#fff", borderRadius: "12px" }}>{search.length < 2 ? "Aramak için en az 2 harf yazın" : "Sonuç bulunamadı."}</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {hastalar.map(h => (
              <div key={h.id} style={{ background: "#fff", borderRadius: "12px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{h.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                    {[h.tc_no ? "TC: " + h.tc_no : null, h.phone, h.birth_date ? tarih(h.birth_date) : null].filter(Boolean).join(" · ")}
                  </div>
                  {h.notes && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontStyle: "italic" }}>{h.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => openDetay(h)} style={{ padding: "5px 10px", fontSize: "12px", borderRadius: "7px", border: "1px solid #bfdbfe", color: "#1d4ed8", background: "#eff6ff", cursor: "pointer" }}>Geçmiş</button>
                  <button onClick={() => openEdit(h)} style={{ padding: "5px 10px", fontSize: "12px", borderRadius: "7px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer" }}>Düzenle</button>
                  <button onClick={() => setDelConfirm(h)} style={{ padding: "5px 10px", fontSize: "12px", borderRadius: "7px", border: "1px solid #fecaca", color: "#dc2626", background: "transparent", cursor: "pointer" }}>Sil</button>
                </div>
              </div>
            ))}
          </div>}

      {/* Hasta Ekle/Düzenle Modal */}
      {modal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", zIndex: 100, overflowY: "auto" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#111827" }}>{editH ? "Hastayı Düzenle" : "Yeni Hasta"}</h3>
          <label style={lbl}>Ad Soyad *</label>
          <input style={inp} placeholder="Ahmet Yılmaz" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label style={lbl}>TC Kimlik No</label>
          <input style={inp} placeholder="12345678901" maxLength={11} value={form.tc_no} onChange={e => setForm({ ...form, tc_no: e.target.value })} />
          <label style={lbl}>Telefon</label>
          <input style={inp} placeholder="0532 000 00 00" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <label style={lbl}>Doğum Tarihi</label>
          <input type="date" style={inp} value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
          <label style={lbl}>Notlar</label>
          <textarea style={{ ...inp, resize: "vertical", minHeight: "60px" }} placeholder="Alerji, kronik hastalık vb." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setModal(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "14px" }}>İptal</button>
            <button onClick={save} disabled={saving} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </div>
      </div>}

      {/* Satış Geçmişi Modal */}
      {detay && secilenHasta && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", zIndex: 100, overflowY: "auto" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px", color: "#111827" }}>Satış Geçmişi</h3>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>{secilenHasta.name}</p>
          {satislar.length === 0 ? <p style={{ color: "#6b7280", fontSize: "13px" }}>Henüz satış kaydı yok.</p> :
            satislar.map(s => (
              <div key={s.id} style={{ padding: "10px", background: "#f9fafb", borderRadius: "8px", marginBottom: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#059669" }}>{para(s.total_amount)}</span>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{new Date(s.created_at).toLocaleString("tr-TR")}</span>
                </div>
                {(s.sale_items || []).map((item, i) => (
                  <div key={i} style={{ fontSize: "12px", color: "#6b7280" }}>· {item.products?.name} × {item.quantity} — {para(item.unit_price * item.quantity)}</div>
                ))}
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>{s.payment_method}</div>
              </div>
            ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button onClick={() => setDetay(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "14px" }}>Kapat</button>
          </div>
        </div>
      </div>}

      {delConfirm && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 100 }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", maxWidth: "320px", width: "100%", textAlign: "center" }}>
          <p style={{ fontWeight: 600, fontSize: "15px", marginBottom: "6px", color: "#111827" }}>Silmek istiyor musunuz?</p>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}><strong>{delConfirm.name}</strong> silinecek.</p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer" }}>Vazgeç</button>
            <button onClick={() => del(delConfirm.id)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 500 }}>Sil</button>
          </div>
        </div>
      </div>}

    </div>
  );
}