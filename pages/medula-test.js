import { useState } from "react";

export default function MedulaTest() {
  const [sonuc, setSonuc] = useState(null);
  const [loading, setLoading] = useState(false);

  const test = async () => {
    setLoading(true);
    const r = await fetch("/api/medula", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ islem: "test" })
    });
    const d = await r.json();
    setSonuc(d);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h2>Medula Bağlantı Testi</h2>
      <button onClick={test} disabled={loading} style={{ padding: "10px 20px", marginTop: "16px", cursor: "pointer" }}>
        {loading ? "Test ediliyor..." : "Bağlantıyı Test Et"}
      </button>
      {sonuc && (
        <pre style={{ marginTop: "16px", background: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
          {JSON.stringify(sonuc, null, 2)}
        </pre>
      )}
    </div>
  );
}