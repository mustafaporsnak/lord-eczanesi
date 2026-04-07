import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CATS = ["Tümü","İlaç","OTC","Kozmetik","Medikal","Takviye"];
const DEF = {barcode:"",name:"",brand:"",category:"İlaç",is_prescription:false,unit:"Kutu",vat_rate:10,purchase_price:"",sale_price:"",sgk_price:"",min_stock_level:5};
const STOK_DEF = {lot_number:"",expiry_date:"",quantity:1};

export default function StokYonetimi() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Tümü");
  const [modal, setModal] = useState(false);
  const [stokModal, setStokModal] = useState(false);
  const [stokDetay, setStokDetay] = useState(false);
  const [editP, setEditP] = useState(null);
  const [secilenUrun, setSecilenUrun] = useState(null);
  const [form, setForm] = useState(DEF);
  const [stokForm, setStokForm] = useState(STOK_DEF);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = async (aramaMetni="") => {
    setLoading(true);
    let query = supabase.from("products").select("*, stock(id,quantity,lot_number,expiry_date)").order("name").limit(100);
    if(aramaMetni.length >= 2) query = query.or(`name.ilike.%${aramaMetni}%,barcode.ilike.%${aramaMetni}%,brand.ilike.%${aramaMetni}%`);
    const {data,error} = await query;
    if(error) showToast("Yükleme hatası","error");
    else setProducts(data||[]);
    setLoading(false);
  };

  useEffect(()=>{load();},[]);
  useEffect(()=>{ const t=setTimeout(()=>load(search),300); return ()=>clearTimeout(t); },[search]);

  const totalQty = p => (p.stock||[]).reduce((s,x)=>s+(x.quantity||0),0);
  const stokStatus = p => { const q=totalQty(p); if(q===0) return "yok"; if(q<=(p.min_stock_level||5)) return "kritik"; return "normal"; };

  const filtered = products.filter(p => {
    const s=search.toLowerCase();
    const m=!s||p.name?.toLowerCase().includes(s)||p.barcode?.includes(s)||p.brand?.toLowerCase().includes(s);
    return m&&(cat==="Tümü"||p.category===cat);
  });

  const stats = { total:products.length, kritik:products.filter(p=>stokStatus(p)==="kritik").length, yok:products.filter(p=>stokStatus(p)==="yok").length };

  const openAdd = ()=>{setEditP(null);setForm(DEF);setModal(true);};
  const openEdit = p=>{setEditP(p);setForm({barcode:p.barcode||"",name:p.name||"",brand:p.brand||"",category:p.category||"İlaç",is_prescription:p.is_prescription||false,unit:p.unit||"Kutu",vat_rate:p.vat_rate||10,purchase_price:p.purchase_price||"",sale_price:p.sale_price||"",sgk_price:p.sgk_price||"",min_stock_level:p.min_stock_level||5});setModal(true);};

  const openStokEkle = p => { setSecilenUrun(p); setStokForm(STOK_DEF); setStokModal(true); };
  const openStokDetay = p => { setSecilenUrun(p); setStokDetay(true); };

  const save = async()=>{
    if(!form.name) return showToast("İlaç adı zorunlu","error");
    setSaving(true);
    const body={...form,vat_rate:Number(form.vat_rate),purchase_price:form.purchase_price?Number(form.purchase_price):null,sale_price:form.sale_price?Number(form.sale_price):null,sgk_price:form.sgk_price?Number(form.sgk_price):null,min_stock_level:Number(form.min_stock_level)};
    if(editP){ const {error}=await supabase.from("products").update(body).eq("id",editP.id); if(error) showToast("Güncelleme hatası","error"); else showToast("Ürün güncellendi ✓"); }
    else { const {error}=await supabase.from("products").insert(body); if(error) showToast("Kayıt hatası","error"); else showToast("Ürün eklendi ✓"); }
    setModal(false);setSaving(false);load(search);
  };

  const stokKaydet = async()=>{
    if(!stokForm.quantity||stokForm.quantity<1) return showToast("Adet giriniz","error");
    setSaving(true);
    const body={ product_id:secilenUrun.id, lot_number:stokForm.lot_number||null, expiry_date:stokForm.expiry_date||null, quantity:Number(stokForm.quantity) };
    const {error} = await supabase.from("stock").insert(body);
    if(error) showToast("Stok kayıt hatası","error");
    else showToast(`${secilenUrun.name} — ${stokForm.quantity} adet eklendi ✓`);
    setStokModal(false);setSaving(false);load(search);
  };

  const stokSil = async(stokId)=>{
    await supabase.from("stock").delete().eq("id",stokId);
    showToast("Stok satırı silindi");
    const {data} = await supabase.from("products").select("*, stock(id,quantity,lot_number,expiry_date)").eq("id",secilenUrun.id).single();
    setSecilenUrun(data);
    load(search);
  };

  const del = async id=>{ await supabase.from("products").delete().eq("id",id); showToast("Ürün silindi"); setDelConfirm(null); load(search); };

  const sc = s=>s==="yok"?{bg:"#fee2e2",cl:"#b91c1c"}:s==="kritik"?{bg:"#fef9c3",cl:"#854d0e"}:{bg:"#dcfce7",cl:"#166534"};
  const inp={width:"100%",padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:"8px",fontSize:"14px",marginBottom:"10px",boxSizing:"border-box",fontFamily:"inherit"};
  const lbl={fontSize:"12px",color:"#6b7280",display:"block",marginBottom:"3px",marginTop:"8px"};

  return (
    <div style={{fontFamily:"system-ui,sans-serif",padding:"16px",maxWidth:"900px",margin:"0 auto",background:"#f9fafb",minHeight:"100vh"}}>
      {toast&&<div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"10px 20px",borderRadius:"10px",fontSize:"14px",fontWeight:500,background:toast.type==="error"?"#fee2e2":"#dcfce7",color:toast.type==="error"?"#b91c1c":"#166534",boxShadow:"0 4px 12px rgba(0,0,0,0.15)",whiteSpace:"nowrap"}}>{toast.msg}</div>}

      <div style={{background:"#fff",borderRadius:"12px",padding:"14px 16px",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
        <div><div style={{fontWeight:600,fontSize:"16px",color:"#111827"}}>Stok Yönetimi</div><div style={{fontSize:"12px",color:"#6b7280"}}>Lord Eczanesi</div></div>
        <button onClick={openAdd} style={{background:"#111827",color:"#fff",border:"none",borderRadius:"8px",padding:"8px 14px",fontSize:"13px",cursor:"pointer",fontWeight:500}}>+ Ürün Ekle</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"12px"}}>
        {[{l:"Toplam Ürün",v:stats.total,c:"#111827"},{l:"Kritik Stok",v:stats.kritik,c:"#b45309"},{l:"Stok Yok",v:stats.yok,c:"#b91c1c"}].map(s=>(
          <div key={s.l} style={{background:"#fff",borderRadius:"10px",padding:"12px",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:"11px",color:"#6b7280"}}>{s.l}</div>
            <div style={{fontSize:"22px",fontWeight:600,color:s.c,marginTop:"2px"}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:"12px",padding:"12px 14px",marginBottom:"10px",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
        <input placeholder="🔍  İlaç adı, barkod veya marka ara..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,marginBottom:0,background:"#f3f4f6",border:"none"}}/>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"10px"}}>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"4px 10px",fontSize:"12px",borderRadius:"20px",border:cat===c?"none":"1px solid #e5e7eb",background:cat===c?"#111827":"transparent",color:cat===c?"#fff":"#6b7280",cursor:"pointer"}}>{c}</button>)}
        </div>
      </div>

      {loading?<div style={{textAlign:"center",padding:"3rem",color:"#6b7280"}}>Yükleniyor...</div>
      :filtered.length===0?<div style={{textAlign:"center",padding:"3rem",color:"#6b7280",background:"#fff",borderRadius:"12px"}}>{search.length<2?"Aramak için en az 2 harf yazın":"Sonuç bulunamadı."}</div>
      :<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {filtered.map(p=>{const st=stokStatus(p),qty=totalQty(p),{bg,cl}=sc(st); return(
          <div key={p.id} style={{background:"#fff",borderRadius:"12px",padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.07)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,fontSize:"14px",color:"#111827"}}>{p.name}</span>
                  {p.is_prescription&&<span style={{fontSize:"10px",padding:"1px 5px",background:"#eff6ff",color:"#1d4ed8",borderRadius:"4px",fontWeight:600}}>Rx</span>}
                  <span style={{fontSize:"10px",padding:"2px 7px",background:bg,color:cl,borderRadius:"20px",fontWeight:500}}>{st==="yok"?"Stok Yok":st==="kritik"?"Kritik":"Normal"} · {qty} adet</span>
                </div>
                <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"2px"}}>{[p.brand,p.category,p.barcode].filter(Boolean).join(" · ")}</div>
                {p.sale_price&&<div style={{fontSize:"13px",fontWeight:600,color:"#059669",marginTop:"4px"}}>{Number(p.sale_price).toLocaleString("tr-TR")} ₺</div>}
              </div>
              <div style={{display:"flex",gap:"6px",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button onClick={()=>openStokEkle(p)} style={{padding:"5px 10px",fontSize:"12px",borderRadius:"7px",border:"1px solid #bbf7d0",color:"#166534",background:"#f0fdf4",cursor:"pointer",fontWeight:500}}>+ Stok</button>
                {qty>0&&<button onClick={()=>openStokDetay(p)} style={{padding:"5px 10px",fontSize:"12px",borderRadius:"7px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer"}}>Detay</button>}
                <button onClick={()=>openEdit(p)} style={{padding:"5px 10px",fontSize:"12px",borderRadius:"7px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer"}}>Düzenle</button>
                <button onClick={()=>setDelConfirm(p)} style={{padding:"5px 10px",fontSize:"12px",borderRadius:"7px",border:"1px solid #fecaca",color:"#dc2626",background:"transparent",cursor:"pointer"}}>Sil</button>
              </div>
            </div>
          </div>
        );})}
      </div>}

      {/* Stok Ekle Modal */}
      {stokModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px",zIndex:100}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"20px",width:"100%",maxWidth:"400px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <h3 style={{fontSize:"16px",fontWeight:600,marginBottom:"4px",color:"#111827"}}>Stok Girişi</h3>
          <p style={{fontSize:"13px",color:"#6b7280",marginBottom:"16px"}}>{secilenUrun?.name}</p>
          <label style={lbl}>Adet *</label>
          <input type="number" style={inp} placeholder="Kaç kutu?" value={stokForm.quantity} onChange={e=>setStokForm({...stokForm,quantity:e.target.value})}/>
          <label style={lbl}>Lot Numarası</label>
          <input style={inp} placeholder="Örn: LOT2024001" value={stokForm.lot_number} onChange={e=>setStokForm({...stokForm,lot_number:e.target.value})}/>
          <label style={lbl}>Son Kullanma Tarihi</label>
          <input type="date" style={inp} value={stokForm.expiry_date} onChange={e=>setStokForm({...stokForm,expiry_date:e.target.value})}/>
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
            <button onClick={()=>setStokModal(false)} style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",fontSize:"14px"}}>İptal</button>
            <button onClick={stokKaydet} disabled={saving} style={{padding:"8px 16px",borderRadius:"8px",border:"none",background:"#111827",color:"#fff",cursor:"pointer",fontSize:"14px",fontWeight:500}}>{saving?"Kaydediliyor...":"Kaydet"}</button>
          </div>
        </div>
      </div>}

      {/* Stok Detay Modal */}
      {stokDetay&&secilenUrun&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px",zIndex:100}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"20px",width:"100%",maxWidth:"500px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <h3 style={{fontSize:"16px",fontWeight:600,marginBottom:"4px",color:"#111827"}}>Stok Detayı</h3>
          <p style={{fontSize:"13px",color:"#6b7280",marginBottom:"16px"}}>{secilenUrun.name}</p>
          <div style={{display:"flex",flexDirection:"column",gap:"8px",maxHeight:"300px",overflowY:"auto"}}>
            {(secilenUrun.stock||[]).length===0?<p style={{color:"#6b7280",fontSize:"13px"}}>Stok kaydı yok.</p>:
            (secilenUrun.stock||[]).map(s=>(
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#f9fafb",borderRadius:"8px",border:"1px solid #e5e7eb"}}>
                <div>
                  <div style={{fontWeight:500,fontSize:"14px",color:"#111827"}}>{s.quantity} adet</div>
                  <div style={{fontSize:"12px",color:"#6b7280"}}>{[s.lot_number,s.expiry_date?`SKT: ${s.expiry_date.slice(0,10)}`:null].filter(Boolean).join(" · ")}</div>
                </div>
                <button onClick={()=>stokSil(s.id)} style={{padding:"4px 10px",fontSize:"12px",borderRadius:"6px",border:"1px solid #fecaca",color:"#dc2626",background:"transparent",cursor:"pointer"}}>Sil</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"16px"}}>
            <button onClick={()=>{setStokDetay(false);openStokEkle(secilenUrun);}} style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #bbf7d0",color:"#166534",background:"#f0fdf4",cursor:"pointer",fontSize:"14px",fontWeight:500}}>+ Stok Ekle</button>
            <button onClick={()=>setStokDetay(false)} style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",fontSize:"14px"}}>Kapat</button>
          </div>
        </div>
      </div>}

      {/* Ürün Ekle/Düzenle Modal */}
      {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 16px",zIndex:100,overflowY:"auto"}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"20px",width:"100%",maxWidth:"460px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <h3 style={{fontSize:"16px",fontWeight:600,marginBottom:"16px",color:"#111827"}}>{editP?"Ürünü Düzenle":"Yeni Ürün Ekle"}</h3>
          <label style={lbl}>Barkod</label><input style={inp} value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/>
          <label style={lbl}>İlaç Adı *</label><input style={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <label style={lbl}>Marka</label><input style={inp} value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <div><label style={lbl}>Kategori</label><select style={inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["İlaç","OTC","Kozmetik","Medikal","Takviye"].map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Birim</label><select style={inp} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{["Kutu","Adet","Şişe","Tüp","Ampul"].map(u=><option key={u}>{u}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
            <div><label style={lbl}>Alış ₺</label><input type="number" style={inp} value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})}/></div>
            <div><label style={lbl}>Satış ₺</label><input type="number" style={inp} value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})}/></div>
            <div><label style={lbl}>SGK ₺</label><input type="number" style={inp} value={form.sgk_price} onChange={e=>setForm({...form,sgk_price:e.target.value})}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <div><label style={lbl}>KDV</label><select style={inp} value={form.vat_rate} onChange={e=>setForm({...form,vat_rate:e.target.value})}>{[1,10,20].map(v=><option key={v} value={v}>%{v}</option>)}</select></div>
            <div><label style={lbl}>Min. Stok</label><input type="number" style={inp} value={form.min_stock_level} onChange={e=>setForm({...form,min_stock_level:e.target.value})}/></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px"}}>
            <input type="checkbox" id="rx" style={{width:"16px",height:"16px"}} checked={form.is_prescription} onChange={e=>setForm({...form,is_prescription:e.target.checked})}/>
            <label htmlFor="rx" style={{fontSize:"13px",color:"#374151",cursor:"pointer"}}>Reçeteli ilaç (Rx)</label>
          </div>
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <button onClick={()=>setModal(false)} style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer",fontSize:"14px"}}>İptal</button>
            <button onClick={save} disabled={saving} style={{padding:"8px 16px",borderRadius:"8px",border:"none",background:"#111827",color:"#fff",cursor:"pointer",fontSize:"14px",fontWeight:500}}>{saving?"Kaydediliyor...":"Kaydet"}</button>
          </div>
        </div>
      </div>}

      {delConfirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",zIndex:100}}>
        <div style={{background:"#fff",borderRadius:"16px",padding:"20px",maxWidth:"320px",width:"100%",textAlign:"center"}}>
          <p style={{fontWeight:600,fontSize:"15px",marginBottom:"6px",color:"#111827"}}>Silmek istiyor musunuz?</p>
          <p style={{fontSize:"13px",color:"#6b7280",marginBottom:"16px"}}><strong>{delConfirm.name}</strong> silinecek.</p>
          <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
            <button onClick={()=>setDelConfirm(null)} style={{padding:"8px 16px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"transparent",cursor:"pointer"}}>Vazgeç</button>
            <button onClick={()=>del(delConfirm.id)} style={{padding:"8px 16px",borderRadius:"8px",border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontWeight:500}}>Sil</button>
          </div>
        </div>
      </div>}
    </div>
  );
}