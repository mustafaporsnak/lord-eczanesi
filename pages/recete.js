import { useState } from "react";
import { supabase } from "../lib/supabase";

const NOSYAPI_KEY = "iJRxO60NzpNHRGGNiU7M4Bw5r3NMVHiIzZYyVBFjZ8Q8EtHbP3ovPiuam6TU";

export default function Recete() {
  const [ilaclar, setIlaclar] = useState([]);
  const [arama, setArama] = useState("");
  const [sonuclar, setSonuclar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kontrol, setKontrol] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // İlaç ara — kendi veritabanımızdan
  const ilacAra = async (e) => {
    if (e.key !== "Enter") return;
    if (!arama.trim()) return;
    setLoading(true);

    const { data } = await supabase
      .from("products")
      .select("id, name, barcode, brand, category, is_prescription")
      .ilike("name", `%${arama}%`)
      .limit(8);

    setSonuclar(data || []);
    setLoading(false);
  };

  // Reçeteye ilaç ekle
  const ilacEkle = async (urun) => {
    if (ilaclar.find(x => x.id === urun.id)) {
      showToast("Bu ilaç zaten eklendi", "error");
      return;
    }

    setLoading(true);

    // NosyAPI'den ilaç bilgisi çek
    try {
      const r = await fetch(
        `https://www.nosyapi.com/apiv2/service/ilac-listesi?apiKey=${NOSYAPI_KEY}&ilacAdi=${encodeURIComponent(urun.name.split(" ")[0])}`
      );
      const d = await r.json();
      const ilacBilgi = d?.data?.[0] || null;

      setIlaclar([...ilaclar, {
        ...urun,
        nosyBilgi: ilacBilgi,
        sgkDurumu: ilacBilgi?.sgkKatkisi || null,
        etkinMadde: ilacBilgi?.etkinMadde || null,
      }]);
    } catch {
      // API hatası olsa bile ilacı ekle
      setIlaclar([...ilaclar, { ...urun, nosyBilgi: null }]);
    }

    setArama("");
    setSonuclar([]);
    setLoading(false);
  };

  const ilacCikar = (id) => setIlaclar(ilaclar.filter(x => x.id !== id));

  // Reçete kontrol
  const receteKontrol = async () => {
    if (ilaclar.length === 0) return showToast("Önce ilaç ekleyin", "error");
    setLoading(true);

    // İlaç etkileşim kontrolü — NosyAPI
    const etkileşimler = [];
    const sgkUyarilari = [];

    for (let i = 0; i < ilaclar.length; i++) {
      // SGK kontrolü
      const urun = ilaclar[i];
      if (urun.is_prescription) {
        // SKRS listesinden kontrol — sistemimizde Satış Şekli var
        if (urun.category !== "İlaç") {
          sgkUyarilari.push({
            urun: urun.name,
            mesaj: "SGK kapsamında değil — OTC veya kozmetik ürün"
          });
        }
      }

      // İlaç etkileşimi — NosyAPI
      if (ilaclar.length > 1 && urun.etkinMadde) {
        for (let j = i + 1; j < ilaclar.length; j++) {
          const diger = ilaclar[j];
          if (diger.etkinMadde) {
            try {
              const r = await fetch(
                `https://www.nosyapi.com/apiv2/service/ilac-etkilesim?apiKey=${NOSYAPI_KEY}&etkinMadde1=${encodeURIComponent(urun.etkinMadde)}&etkinMadde2=${encodeURIComponent(diger.etkinMadde)}`
              );
              const d = await r.json();
              if (d?.data?.etkilesimVar) {
                etkileşimler.push({
                  ilac1: urun.name,
                  ilac2: diger.name,
                  aciklama: d.data.aciklama || "Etkileşim tespit edildi",
                  seviye: d.data.seviye || "Orta"
                });
              }
            } catch { }
          }
        }
      }
    }

    setKontrol({ etkileşimler, sgkUyarilari, tarih: new Date() });
    setLoading(false);
  };

  const receteSifirla = () => { setIlaclar([]); setKontrol(null); setArama(""); setSonuclar([]); };

  const seviyeRenk = s => s === "Yüksek" ? { bg: "#fee2e2", cl: "#b91c1c" } : s === "Orta" ? { bg: "#fef9c3", cl: "#854d0e" } : { bg: "#fff7ed", cl: "#c2410c" };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "900px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#166534", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>Reçete Kontrol</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>SGK Karşılama ve İlaç Etkileşim Kontrolü</div>
      </div>

      {/* İlaç Arama */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", position: "relative" }}>
        <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "8px", fontWeight: 500 }}>İlaç Ekle</label>
        <input
          placeholder="İlaç adı yaz → Enter"
          value={arama}
          onChange={e => { setArama(e.target.value); if (!e.target.value) setSonuclar([]); }}
          onKeyDown={ilacAra}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        {sonuclar.length > 0 && (
          <div style={{ position: "absolute", left: "16px", right: "16px", top: "72px", background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 50, overflow: "hidden" }}>
            {sonuclar.map(u => (
              <div key={u.id} onClick={() => ilacEkle(u)}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: "14px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ fontWeight: 500, color: "#111827" }}>{u.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{u.brand} · {u.is_prescription ? "Reçeteli" : "OTC"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reçetedeki İlaçlar */}
      {ilaclar.length > 0 && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "12px" }}>Reçetedeki İlaçlar ({ilaclar.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ilaclar.map(u => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "14px", color: "#111827" }}>{u.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                    {[
                      u.brand,
                      u.is_prescription ? "🔴 Reçeteli" : "🟢 OTC",
                      u.etkinMadde ? "Etkin madde: " + u.etkinMadde : null,
                      u.nosyBilgi?.sgkKatkisi ? "SGK: " + u.nosyBilgi.sgkKatkisi : null,
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button onClick={() => ilacCikar(u.id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #fecaca", color: "#dc2626", background: "transparent", cursor: "pointer" }}>Çıkar</button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button onClick={receteSifirla} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#6b7280" }}>Sıfırla</button>
            <button onClick={receteKontrol} disabled={loading} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Kontrol ediliyor..." : "🔍 Reçeteyi Kontrol Et"}
            </button>
          </div>
        </div>
      )}

      {/* Kontrol Sonuçları */}
      {kontrol && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>Kontrol Sonuçları</p>

          {/* SGK Uyarıları */}
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase" }}>SGK Durumu</p>
          {kontrol.sgkUyarilari.length === 0 ? (
            <div style={{ padding: "10px 14px", background: "#dcfce7", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#166534", fontWeight: 500 }}>
              ✅ Tüm ilaçlar SGK kapsamında görünüyor
            </div>
          ) : (
            <div style={{ marginBottom: "16px" }}>
              {kontrol.sgkUyarilari.map((u, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#fee2e2", borderRadius: "8px", marginBottom: "6px", borderLeft: "4px solid #dc2626" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#b91c1c" }}>⚠️ {u.urun}</div>
                  <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "2px" }}>{u.mesaj}</div>
                </div>
              ))}
            </div>
          )}

          {/* Etkileşimler */}
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase" }}>İlaç Etkileşimleri</p>
          {kontrol.etkileşimler.length === 0 ? (
            <div style={{ padding: "10px 14px", background: "#dcfce7", borderRadius: "8px", fontSize: "13px", color: "#166534", fontWeight: 500 }}>
              ✅ Bilinen bir ilaç etkileşimi tespit edilmedi
            </div>
          ) : (
            kontrol.etkileşimler.map((e, i) => {
              const { bg, cl } = seviyeRenk(e.seviye);
              return (
                <div key={i} style={{ padding: "12px 14px", background: bg, borderRadius: "8px", marginBottom: "6px", borderLeft: `4px solid ${cl}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: cl }}>⚠️ {e.ilac1} + {e.ilac2}</div>
                  <div style={{ fontSize: "12px", color: cl, marginTop: "4px" }}>{e.aciklama}</div>
                  <div style={{ fontSize: "11px", color: cl, marginTop: "4px", opacity: 0.8 }}>Seviye: {e.seviye}</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {ilaclar.length === 0 && !kontrol && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>💊</div>
          <div>İlaç adı yazın ve Enter'a basın</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>SGK karşılama ve ilaç etkileşimi kontrol edilecek</div>
        </div>
      )}
    </div>
  );
}