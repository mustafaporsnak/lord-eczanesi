import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Asistan() {
  const [mesajlar, setMesajlar] = useState([
    { rol: "asistan", icerik: "Merhaba! Ben Lord Eczanesi'nin AI asistanıyım. Stok, satış, hasta ve raporlar hakkında her şeyi sorabilirsiniz. 💊" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const altRef = useRef(null);

  useEffect(() => { altRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mesajlar]);

  const veriCek = async (soru) => {
    const soruKucuk = soru.toLowerCase();
    let veri = {};

    // Stok verileri
    if (soruKucuk.includes("stok") || soruKucuk.includes("ürün") || soruKucuk.includes("ilaç")) {
      const { data } = await supabase.from("products").select("id, name, brand, category, sale_price, stock(quantity)").limit(200);
      if (data) {
        const kritik = data.filter(p => (p.stock || []).reduce((s, x) => s + x.quantity, 0) <= 5 && (p.stock || []).reduce((s, x) => s + x.quantity, 0) > 0);
        const stokYok = data.filter(p => (p.stock || []).reduce((s, x) => s + x.quantity, 0) === 0);
        veri.stokOzet = { toplamUrun: data.length, kritikStok: kritik.length, stokYok: stokYok.length };
        veri.kritikUrunler = kritik.slice(0, 10).map(p => ({ isim: p.name, adet: (p.stock || []).reduce((s, x) => s + x.quantity, 0) }));
      }
    }

    // Satış verileri
    if (soruKucuk.includes("satış") || soruKucuk.includes("ciro") || soruKucuk.includes("gelir") || soruKucuk.includes("para")) {
      const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
      const ayBaslangic = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
      const { data: bugunData } = await supabase.from("sales").select("total_amount, payment_method").gte("created_at", bugun.toISOString());
      const { data: ayData } = await supabase.from("sales").select("total_amount").gte("created_at", ayBaslangic.toISOString());
      if (bugunData) veri.bugunCiro = { toplam: bugunData.reduce((s, x) => s + Number(x.total_amount), 0), islem: bugunData.length };
      if (ayData) veri.ayCiro = { toplam: ayData.reduce((s, x) => s + Number(x.total_amount), 0), islem: ayData.length };
    }

    // En çok satanlar
    if (soruKucuk.includes("en çok") || soruKucuk.includes("popüler") || soruKucuk.includes("çok satan")) {
      const { data } = await supabase.from("sale_items").select("quantity, products(name, brand)").limit(500);
      if (data) {
        const sayac = {};
        data.forEach(item => {
          const ad = item.products?.name || "Bilinmeyen";
          sayac[ad] = (sayac[ad] || 0) + item.quantity;
        });
        veri.enCokSatan = Object.entries(sayac).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ad, adet]) => ({ ad, adet }));
      }
    }

    // Hasta verileri
    if (soruKucuk.includes("hasta")) {
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
      veri.hastaOzet = { toplam: count };
    }

    // SKT verileri
    if (soruKucuk.includes("skt") || soruKucuk.includes("son kullanma") || soruKucuk.includes("tarih")) {
      const bugun = new Date().toISOString().slice(0, 10);
      const otuzGun = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase.from("stock").select("expiry_date, quantity, products(name)").lte("expiry_date", otuzGun).gt("expiry_date", bugun).order("expiry_date").limit(10);
      const { data: gecmis } = await supabase.from("stock").select("expiry_date, quantity, products(name)").lt("expiry_date", bugun).limit(5);
      if (data) veri.sktYaklasan = data.map(s => ({ urun: s.products?.name, tarih: s.expiry_date, adet: s.quantity }));
      if (gecmis) veri.sktGecmis = gecmis.map(s => ({ urun: s.products?.name, tarih: s.expiry_date }));
    }

    return veri;
  };

  const sor = async () => {
    if (!input.trim() || loading) return;
    const soru = input.trim();
    setInput("");
    setMesajlar(prev => [...prev, { rol: "kullanici", icerik: soru }]);
    setLoading(true);

    try {
      // Veritabanından ilgili veriyi çek
      const veri = await veriCek(soru);

      // Claude API'ye gönder
      const sistem = `Sen Lord Eczanesi'nin AI asistanısın. Türkçe konuş. Eczane yönetimi, stok, satış, hasta ve ilaçlar konusunda yardımcı oluyorsun.

Eczanenin güncel verileri:
${JSON.stringify(veri, null, 2)}

Kısa, net ve faydalı cevaplar ver. Sayıları Türkçe formatında göster. Emoji kullanabilirsin.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: sistem,
          messages: [
            ...mesajlar.filter(m => m.rol !== "asistan" || mesajlar.indexOf(m) > 0).map(m => ({
              role: m.rol === "kullanici" ? "user" : "assistant",
              content: m.icerik
            })),
            { role: "user", content: soru }
          ]
        })
      });

      const data = await response.json();
      const cevap = data.content?.[0]?.text || "Üzgünüm, bir hata oluştu.";
      setMesajlar(prev => [...prev, { rol: "asistan", icerik: cevap }]);
    } catch {
      setMesajlar(prev => [...prev, { rol: "asistan", icerik: "Bağlantı hatası oluştu. Lütfen tekrar deneyin." }]);
    }

    setLoading(false);
  };

  const ornekSorular = [
    "Bugün kaç satış yaptık?",
    "Kritik stokta hangi ilaçlar var?",
    "Bu ay en çok satan ürünler neler?",
    "SKT yaklaşan ilaçlar hangileri?",
    "Stok yok olan kaç ürün var?",
  ];

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: "800px", margin: "0 auto", background: "#f9fafb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      <div style={{ background: "#fff", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: "0", zIndex: 10 }}>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#111827" }}>AI Asistan</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>Lord Eczanesi · Veriye dayalı anlık cevaplar</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {mesajlar.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.rol === "kullanici" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: m.rol === "kullanici" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.rol === "kullanici" ? "#111827" : "#fff",
              color: m.rol === "kullanici" ? "#fff" : "#111827",
              fontSize: "14px", lineHeight: "1.6",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              whiteSpace: "pre-wrap"
            }}>
              {m.icerik}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 16px", borderRadius: "18px 18px 18px 4px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#9ca3af", animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={altRef} />
      </div>

      {/* Örnek Sorular */}
      {mesajlar.length <= 1 && (
        <div style={{ padding: "0 16px 12px" }}>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>Örnek sorular:</p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {ornekSorular.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "12px", color: "#6b7280", cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 16px", background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px" }}>
        <input
          placeholder="Eczane hakkında bir şey sorun..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sor()}
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "24px", fontSize: "14px", fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={sor} disabled={loading || !input.trim()} style={{ width: "42px", height: "42px", borderRadius: "50%", border: "none", background: input.trim() ? "#111827" : "#e5e7eb", color: "#fff", cursor: input.trim() ? "pointer" : "not-allowed", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          →
        </button>
      </div>

      <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}