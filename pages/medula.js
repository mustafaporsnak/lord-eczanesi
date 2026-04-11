import { useState } from "react";

export default function Medula() {
  const [tcNo, setTcNo] = useState("");
  const [receteNo, setReceteNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const provizyon = async () => {
    if (!tcNo || !receteNo) return showToast("TC ve reçete no zorunlu", "error");
    setLoading(true);
    setSonuc(null);
    try {
      const r = await fetch("/api/medula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem: "provizyon", tcNo, receteNo })
      });
      const d = await r.json();
      setSonuc(d);
      if (d.basarili) showToast("Provizyon alındı ✓");
      else showToast("Provizyon hatası", "error");
    } catch {
      showToast("Bağlantı hatası", "error");
    }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "15px", boxSizing: "border-box", fontFamily: "inherit", marginBottom: "12px" };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", maxWidth: "600px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: toast.type === "error" ? "#fee2e2" : "#dcfce7", color: toast.type === "error" ? "#b91c1c" : "#166534", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>Medula Provizyon</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>SGK E-Reçete Sorgulama</div>
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "12px" }}>
        <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "6px", fontWeight: 500 }}>TC Kimlik No</label>
        <input style={inp} placeholder="12345678901" maxLength={11} value={tcNo} onChange={e => setTcNo(e.target.value)} />

        <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "6px", fontWeight: 500 }}>Reçete No</label>
        <input style={inp} placeholder="Reçete numarasını girin" value={receteNo} onChange={e => setReceteNo(e.target.value)} />

        <button onClick={provizyon} disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "#111827", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Sorgulanıyor..." : "🔍 Provizyon Al"}
        </button>
      </div>

      {sonuc && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Medula Cevabı</p>
          <div style={{ background: sonuc.basarili ? "#f0fdf4" : "#fee2e2", borderRadius: "8px", padding: "12px", border: `1px solid ${sonuc.basarili ? "#bbf7d0" : "#fecaca"}` }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: sonuc.basarili ? "#166534" : "#b91c1c", marginBottom: "8px" }}>
              {sonuc.basarili ? "✅ Başarılı" : "❌ Hata"}
            </p>
            <pre style={{ fontSize: "11px", color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
              {sonuc.cevap || JSON.stringify(sonuc, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}