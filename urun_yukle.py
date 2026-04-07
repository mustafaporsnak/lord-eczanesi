import pandas as pd
import requests
import json
import time

SUPABASE_URL = "https://aigvipbxaakmmraykedv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3ZpcGJ4YWFrbW1yYXlrZWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTY0MDEsImV4cCI6MjA5MDgzMjQwMX0.VIM1IQCd07AelwURIZhZ9rGL2OqS0C6a4RyAy_jbjcI"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates"
}

print("📦 Dosyalar okunuyor...")

# E-bilgi
ebilgi = pd.read_excel("EBİLGİ ÜRÜN KARTLARI.xlsx")
ebilgi["barkod"] = ebilgi["Ürün Barkod"].astype(str).str.strip()

# TİTCK
titck = pd.read_excel(
    "RuhsatlBeeriTbbirnlerListesi03.04.2026_98f3810e-33d0-4715-9dbb-aa28ed57a1aa.xlsx",
    sheet_name="RUHSATLI ÜRÜNLER LİSTESİ",
    skiprows=1
)
titck.columns = ["sira","barkod","urun_adi","etkin_madde","atc_kodu","firma_adi",
                 "ruhsat_tarihi","ruhsat_no","deg","deg_notu","deg_tarihi","askida","askiya","x1","x2"]
titck["barkod"] = titck["barkod"].astype(str).str.strip()
titck = titck[["barkod","firma_adi","etkin_madde"]].dropna(subset=["barkod"])

# Birleştir
df = ebilgi.merge(titck, on="barkod", how="left")

print(f"✅ Toplam ürün: {len(df)}")
print(f"✅ Firma adı olan: {df['firma_adi'].notna().sum()}")
print(f"ℹ️  Firma adı olmayan (OTC/Kozmetik vb): {df['firma_adi'].isna().sum()}")

# Kategorize et
def kategori_belirle(row):
    satis = str(row.get("Satış Şekli", "")).lower()
    if "kırmızı" in satis or "mor" in satis or "turuncu" in satis:
        return "İlaç"
    if "normal" in satis and pd.notna(row.get("etkin_madde")):
        return "İlaç"
    if "normal" in satis:
        return "OTC"
    return "OTC"

def receteli_mi(row):
    satis = str(row.get("Satış Şekli", "")).lower()
    return "kırmızı" in satis or "mor" in satis or "turuncu" in satis or "beyaz" in satis

# Supabase formatına çevir
urunler = []
for _, row in df.iterrows():
    urun = {
        "barcode": str(row["barkod"]) if pd.notna(row["barkod"]) else None,
        "name": str(row["Ürün Adı"]).strip() if pd.notna(row["Ürün Adı"]) else None,
        "brand": str(row["firma_adi"]).strip() if pd.notna(row["firma_adi"]) else None,
        "category": kategori_belirle(row),
        "is_prescription": receteli_mi(row),
        "unit": "Kutu",
        "vat_rate": int(row["KDV Oranı"]) if pd.notna(row.get("KDV Oranı")) else 10,
        "purchase_price": float(row["DSF"]) if pd.notna(row.get("DSF")) and row["DSF"] > 0 else None,
        "sale_price": float(row["PSF"]) if pd.notna(row.get("PSF")) and row["PSF"] > 0 else None,
        "min_stock_level": 5
    }
    if urun["name"]:
        urunler.append(urun)

print(f"\n🚀 {len(urunler)} ürün yükleniyor...")

# Önce mevcut test ürününü sil (Parol)
requests.delete(
    f"{SUPABASE_URL}/rest/v1/products?name=eq.Parol 500mg",
    headers=HEADERS
)

# Batch olarak yükle (500'er 500'er)
BATCH = 500
basarili = 0
hatali = 0

for i in range(0, len(urunler), BATCH):
    batch = urunler[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=HEADERS,
        data=json.dumps(batch)
    )
    if r.status_code in [200, 201]:
        basarili += len(batch)
    else:
        hatali += len(batch)
        print(f"  ⚠️  Hata batch {i//BATCH + 1}: {r.text[:100]}")
    
    # İlerleme göster
    yuzde = min(100, int((i + BATCH) / len(urunler) * 100))
    print(f"  ⏳ {yuzde}% tamamlandı ({basarili} yüklendi)...", end="\r")
    time.sleep(0.1)

print(f"\n\n✅ TAMAMLANDI!")
print(f"   Başarılı: {basarili} ürün")
print(f"   Hatalı: {hatali} ürün")
print(f"\n🌐 Sistemi aç: http://localhost:3000")
