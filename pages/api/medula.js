export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { islem, receteNo, tcNo } = req.body;

  const kullanici = process.env.MEDULA_KULLANICI;
  const sifre = process.env.MEDULA_SIFRE;
  const auth = Buffer.from(`${kullanici}:${sifre}`).toString("base64");

  try {
    if (islem === "test") {
      const r = await fetch("http://medeczane.sgk.gov.tr/medula/eczane/eczaneStokIslemleriWS", {
        headers: { "Authorization": `Basic ${auth}` }
      });
      return res.status(200).json({
        basarili: r.ok,
        status: r.status,
        mesaj: r.ok ? "Medula bağlantısı başarılı!" : "Bağlantı hatası"
      });
    }

    if (islem === "provizyon") {
      const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${kullanici}</wsse:Username>
        <wsse:Password>${sifre}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ereceteProvizyon xmlns="http://tescil.medula.sgk.gov.tr/eczaneWS/types">
      <tip>N</tip>
      <tcKimlikNo>${tcNo}</tcKimlikNo>
      <receteNo>${receteNo}</receteNo>
    </ereceteProvizyon>
  </soapenv:Body>
</soapenv:Envelope>`;

      const r = await fetch("https://medeczane.sgk.gov.tr/eczane/EReceteService/EReceteServicePort", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": "",
          "Authorization": `Basic ${auth}`
        },
        body: soap
      });

      const text = await r.text();
      const basarili = text.includes("sonucKodu>0000") || text.includes("<sonuc>0") || r.ok;

      return res.status(200).json({
        basarili,
        status: r.status,
        cevap: text
      });
    }

    if (islem === "receteSorgula") {
      const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${kullanici}</wsse:Username>
        <wsse:Password>${sifre}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ereceteSorgula xmlns="http://tescil.medula.sgk.gov.tr/eczaneWS/types">
      <receteNo>${receteNo}</receteNo>
    </ereceteSorgula>
  </soapenv:Body>
</soapenv:Envelope>`;

      const r = await fetch("https://medeczane.sgk.gov.tr/eczane/EReceteService/EReceteServicePort", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": "",
          "Authorization": `Basic ${auth}`
        },
        body: soap
      });

      const text = await r.text();
      return res.status(200).json({ basarili: r.ok, status: r.status, cevap: text });
    }

    res.status(400).json({ hata: "Geçersiz işlem" });

  } catch (e) {
    res.status(500).json({ hata: e.message });
  }
}