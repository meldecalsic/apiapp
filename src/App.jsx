import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const _supa = createClient("https://xhuksvsvltqqprnjzoqj.supabase.co", "sb_publishable_YS2ygpjAVM6jMkOvrJrfqA_fXuvusxJ");
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FORCE   = ["Molt feble","Feble","Normal","Forta","Molt forta"];
const POLLEN  = ["Gens","Poc","Una mica","Pou","Bastant","Moltissim"];
const REINA   = ["Vista amb posta recent","No vista posta recent","Vista sense posta","Ni vista ni posta"];
const AGRESS  = ["Calma total","La tipica pesada i prou","Pitjorflanes","M'agobian","M'agobian molt","Uff marxo d'aqui"];
const TRACTA  = ["Cap","Varromed","Oxalic sublimacio","Apivar","Apitraz","Altres","Mes nuclei sanitat"];
const REICOLOR= ["0 Blau","1 Blanc","2 Groc","3 Vermell","4 Verd","5 Blau","6 Blanc","7 Groc","8 Vermell","9 Verd"];
const MONTHS  = ["Gener","Febrer","Marc","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"];
const FLORACIO= {0:"Avellaner, Ametller",1:"Ametller, Cirerer silvestre",2:"Cirerer, Prunera, Romani",3:"Taronger, Poma, Pera",4:"Romani, Salvia, Castanyer",5:"Castanyer, Tilia, Farigola",6:"Farigola, Esporgall, Girasol",7:"Girasol, Buguenvillea, Heura",8:"Heura, Arbustos tardor",9:"Heura, Boix",10:"Eucaliptus (costaneres)",11:"Repos hivernal"};

const emptyReview = () => ({
  date: new Date().toISOString().split("T")[0],
  forcaColonia:2, quadresMel:0, pollen:2, quadresAbelles:5, quadresCria:3,
  criaEstat:"Compacta", estatReina:0, cellesReials:0, anyReina:0,
  varroaMes:new Date().getMonth(), varroaDia:new Date().getDate(), varroaPct:0,
  tractamentMes:new Date().getMonth(), tipusTractament:0, quadresBuits:0, agressivitat:0, notes:""
});

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const save = async (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(_) {}
  try { await _supa.from("app_data").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" }); } catch(_) {}
};
const load = async (key) => {
  try {
    const { data } = await _supa.from("app_data").select("value").eq("key", key).single();
    if (data?.value) return JSON.parse(data.value);
  } catch(_) {}
  try { const v = localStorage.getItem(key); if (v) return JSON.parse(v); } catch(_) {}
  return null;
};
const toBase64 = (file) => new Promise(res => {
  const r = new FileReader();
  r.onload = e => res(e.target.result.split(",")[1]);
  r.readAsDataURL(file);
});

// ─── API CORREGIDA PER A VERCEL ───────────────────────────────────────────────
async function readFitxaAI(base64, mediaType) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: base64,
        mediaType: mediaType
      })
    });
    
    if (!res.ok) {
      console.error("Error del servidor:", res.status);
      return null;
    }

    const resData = await res.json();
    // Vercel et retornarà { ok: true, data: { ... } }
    if (resData.ok && resData.data) {
      return resData.data;
    }
    return null;
  } catch(err) { 
    console.error("Error de connexió a la API:", err);
    return null; 
  }
}

async function fetchMeteo(lat, lng) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
      "&longitude=" + lng +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode" +
      "&timezone=Europe%2FMadrid&forecast_days=5";
    const r = await fetch(url);
    return await r.json();
  } catch(_) { return null; }
}

async function getRecomanacions(revisions) {
  if (!revisions.length) return "Sense dades suficients.";
  const last = revisions[revisions.length - 1];
  const varroaLabels = ["0-1%", "2%", "3%", "mes de 3%"];
  const prompt =
    "Expert apicultor. Dona 3-4 recomanacions breus en catala per aquesta arna. " +
    "Revisio " + last.date + ". " +
    "Forca=" + FORCE[last.forcaColonia] + ", " +
    "mel=" + last.quadresMel + "q, " +
    "abelles=" + last.quadresAbelles + "q, " +
    "cria=" + last.quadresCria + "q " + last.criaEstat + ", " +
    "reina=" + REINA[last.estatReina] + ", " +
    "celles reials=" + last.cellesReials + ", " +
    "varroa=" + varroaLabels[last.varroaPct] + ", " +
    "tractament=" + TRACTA[last.tipusTractament] + ". " +
    "Format llista amb emojis.";
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return data.text || "Sense recomanacions actualment.";
  } catch(_) { return "Error de connexio."; }
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight:"100vh", background:"linear-gradient(135deg,#0c0800,#1a1200 60%,#080f00)", color:"#fff", fontFamily:"Georgia,serif", fontSize:16 },
  card:    { background:"rgba(255,245,180,0.04)", border:"1px solid rgba(255,200,50,0.12)", borderRadius:12, padding:16 },
  input:   { width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,200,50,0.2)", borderRadius:8, color:"#fff", fontSize:16, boxSizing:"border-box", outline:"none", fontFamily:"inherit" },
  label:   { color:"#d4a855", fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:4 },
  btnPri:  { padding:"12px 20px", background:"linear-gradient(135deg,#f5c842,#d4a020)", border:"none", borderRadius:8, color:"#1a0a00", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" },
  btnGhost:{ padding:"10px 16px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#aaa", cursor:"pointer", fontFamily:"inherit", fontSize:13 },
  btnGold: { padding:"11px 16px", background:"rgba(245,200,66,0.12)", border:"1px solid rgba(245,200,66,0.3)", borderRadius:8, color:"#f5c842", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:600 },
  btnBlue: { padding:"11px 16px", background:"rgba(100,180,255,0.12)", border:"1px solid rgba(100,180,255,0.3)", borderRadius:8, color:"#88bbff", cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:600 },
  btnRed:  { padding:"10px 14px", background:"rgba(255,60,60,0.1)", border:"1px solid rgba(255,60,60,0.25)", borderRadius:8, color:"#ff8888", cursor:"pointer", fontFamily:"inherit", fontSize:14 },
};

// ─── MAPA LEAFLET ─────────────────────────────────────────────────────────────
function LeafletMap({ lat, lng, height, onClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const h = height || 180;

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;

    const buildMap = () => {
      if (!window.L) return;
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
        return;
      }
      const map = window.L.map(containerRef.current, { scrollWheelZoom: false })
        .setView([lat, lng], 13);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
        .addTo(map);
      const marker = window.L.marker([lat, lng], { draggable: !!onClick }).addTo(map);
      if (onClick) {
        map.on("click", e => onClick(e.latlng.lat, e.latlng.lng));
        marker.on("dragend", e => {
          const ll = e.target.getLatLng();
          onClick(ll.lat, ll.lng);
        });
      }
      mapRef.current = map;
    };

    if (window.L) {
      buildMap();
    } else {
      if (!document.getElementById("lf-css")) {
        const lnk = document.createElement("link");
        lnk.id = "lf-css"; lnk.rel = "stylesheet";
        lnk.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(lnk);
      }
      if (!document.getElementById("lf-js")) {
        const sc = document.createElement("script");
        sc.id = "lf-js";
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        sc.onload = buildMap;
        document.head.appendChild(sc);
      }
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng, onClick]);

  if (!lat || !lng) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div ref={containerRef} style={{ height:h, borderRadius:8, overflow:"hidden", background:"#1a1800" }} />
      <a href={"https://maps.google.com/?q=" + lat + "," + lng}
        target="_blank" rel="noreferrer"
        style={{ color:"#88bbff", fontSize:11, display:"block", marginTop:4, textDecoration:"none" }}>
        Obrir a Google Maps
      </a>
    </div>
  );
}

// ─── LOCATION PICKER ──────────────────────────────────────────────────────────
function LocationPicker({ lat, lng, onChange }) {
  const [gpsLoad, setGpsLoad] = useState(false);
  const [gpsErr,  setGpsErr]  = useState("");

  const getGPS = () => {
    setGpsLoad(true); setGpsErr("");
    if (!navigator.geolocation) { setGpsErr("GPS no disponible"); setGpsLoad(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6)); setGpsLoad(false); },
      ()  => { setGpsErr("No s'ha pogut obtenir la ubicacio"); setGpsLoad(false); }
    );
  };

  const mapClick = useCallback((la, lo) => onChange(la.toFixed(6), lo.toFixed(6)), [onChange]);

  return (
    <div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:8 }}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Latitud</label>
          <input type="number" step="0.000001" value={lat} onChange={e => onChange(e.target.value, lng)} style={S.input} placeholder="41.9834" />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Longitud</label>
          <input type="number" step="0.000001" value={lng} onChange={e => onChange(lat, e.target.value)} style={S.input} placeholder="2.1234" />
        </div>
        <button onClick={getGPS} disabled={gpsLoad} style={S.btnGold}>
          {gpsLoad ? "..." : "GPS"}
        </button>
      </div>
      {gpsErr && <p style={{ color:"#ff8888", fontSize:11, margin:"0 0 6px" }}>{gpsErr}</p>}
      {lat && lng && (
        <LeafletMap lat={parseFloat(lat)} lng={parseFloat(lng)} height={180} onClick={mapClick} />
      )}
      {(!lat || !lng) && (
        <p style={{ color:"#5a4a2a", fontSize:11 }}>Usa el GPS o escriu les coordenades. Tambe pots fer clic al mapa un cop aparegui.</p>
      )}
    </div>
  );
}

// ─── METEO WIDGET ─────────────────────────────────────────────────────────────
function MeteoWidget({ lat, lng }) {
  const [meteo, setMeteo] = useState(null);
  useEffect(() => {
    if (!lat || !lng) return;
    fetchMeteo(lat, lng).then(setMeteo);
  }, [lat, lng]);

  const icon = c => c === 0 ? "sol" : c <= 3 ? "nuvolat" : c <= 48 ? "boires" : c <= 67 ? "pluja" : c <= 77 ? "neu" : "tempesta";
  const wicons = { "sol":"☀️", "nuvolat":"⛅", "boires":"🌫️", "pluja":"🌧️", "neu":"❄️", "tempesta":"⛈️" };

  if (!lat || !lng) return null;
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ color:"#88bbee", fontSize:12, fontWeight:600, marginBottom:8 }}>Previsio meteorologica</div>
      {meteo?.daily && (
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {meteo.daily.time?.slice(0, 5).map((d, i) => (
            <div key={i} style={{ minWidth:54, textAlign:"center", background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"6px 4px" }}>
              <div style={{ color:"#7a6040", fontSize:9 }}>{new Date(d).toLocaleDateString("ca", { weekday:"short" })}</div>
              <div style={{ fontSize:18, margin:"3px 0" }}>{wicons[icon(meteo.daily.weathercode?.[i])]}</div>
              <div style={{ color:"#f5c842", fontSize:11, fontWeight:600 }}>{Math.round(meteo.daily.temperature_2m_max?.[i])}°</div>
              <div style={{ color:"#557755", fontSize:10 }}>{Math.round(meteo.daily.temperature_2m_min?.[i])}°</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:8, padding:"6px 10px", background:"rgba(80,140,60,0.1)", borderRadius:6, border:"1px solid rgba(80,140,60,0.2)", fontSize:12 }}>
        <span style={{ color:"#7ac87a" }}>Floracio: </span>
        <span style={{ color:"#a8d8a8" }}>{FLORACIO[new Date().getMonth()]}</span>
      </div>
    </div>
  );
}

// ─── FORMULARI REVISIO ────────────────────────────────────────────────────────
function ReviewForm({ arnaNumero, initial, onSave, onCancel, loading, compact }) {
  const [f, setF] = useState(initial || emptyReview());
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => { if (initial) setF({ ...emptyReview(), ...initial }); }, [JSON.stringify(initial)]);

  const Slider = ({ lbl, field, min, max, opts }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:"#d4a855", fontSize:11, fontWeight:700 }}>{lbl}</span>
        <span style={{ color:"#f5c842", fontSize:12, fontWeight:600 }}>{opts ? opts[f[field]] : f[field]}</span>
      </div>
      <input type="range" min={min} max={max} value={f[field]}
        onChange={e => set(field, +e.target.value)}
        style={{ width:"100%", accentColor:"#f5c842" }} />
      {opts && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
          <span style={{ color:"#5a4a2a", fontSize:9 }}>{opts[0]}</span>
          <span style={{ color:"#5a4a2a", fontSize:9 }}>{opts[opts.length-1]}</span>
        </div>
      )}
    </div>
  );

  const Sel = ({ lbl, field, opts }) => (
    <div style={{ marginBottom:12 }}>
      <label style={S.label}>{lbl}</label>
      <select value={f[field]}
        onChange={e => set(field, isNaN(+e.target.value) ? e.target.value : +e.target.value)}
        style={{ ...S.input, background:"#100c00" }}>
        {opts.map((o, i) => (
          <option key={i} value={typeof f[field] === "string" ? o : i}>{o}</option>
        ))}
      </select>
    </div>
  );

  const Num = ({ lbl, field, min, max }) => (
    <div style={{ marginBottom:12 }}>
      <label style={S.label}>{lbl}</label>
      <input type="number" min={min} max={max} value={f[field]}
        onChange={e => set(field, +e.target.value)} style={S.input} />
    </div>
  );

  return (
    <div style={{ maxHeight: compact ? "none" : "72vh", overflowY: compact ? "visible" : "auto", paddingRight: compact ? 0 : 4 }}>
      {!compact && <h3 style={{ color:"#f5c842", margin:"0 0 14px", fontSize:15 }}>Revisio Arna #{arnaNumero}</h3>}
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Data revisio</label>
        <input type="date" value={f.date} onChange={e => set("date", e.target.value)} style={S.input} />
      </div>
      <Slider lbl="Forca colonia" field="forcaColonia" min={0} max={4} opts={FORCE} />
      <Slider lbl="Pol.len"       field="pollen"       min={0} max={5} opts={POLLEN} />
      <Slider lbl="Agressivitat"  field="agressivitat" min={0} max={5} opts={AGRESS} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0 8px" }}>
        <Num lbl="Quadres mel"     field="quadresMel"     min={0} max={20} />
        <Num lbl="Quadres abelles"field="quadresAbelles"min={0} max={14} />
        <Num lbl="Quadres cria"   field="quadresCria"   min={0} max={14} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
        <Num lbl="Quadres buits"  field="quadresBuits"  min={0} max={14} />
        <Num lbl="Cel.les reials" field="cellesReials"  min={0} max={30} />
      </div>
      <Sel lbl="Estat cria"   field="criaEstat"   opts={["Compacta","Pua","Dispersa"]} />
      <Sel lbl="Estat reina"  field="estatReina"  opts={REINA} />
      <Sel lbl="Any reina"    field="anyReina"    opts={REICOLOR} />
      <div style={{ background:"rgba(255,50,50,0.05)", border:"1px solid rgba(255,80,80,0.15)", borderRadius:10, padding:12, marginBottom:12 }}>
        <p style={{ color:"#ff8888", fontSize:11, fontWeight:700, margin:"0 0 10px" }}>VARROA</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Mes prova</label>
            <select value={f.varroaMes} onChange={e => set("varroaMes", +e.target.value)}
              style={{ ...S.input, background:"#100000" }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <Num lbl="Dia prova" field="varroaDia" min={1} max={31} />
        </div>
        <Slider lbl="% Varroa" field="varroaPct" min={0} max={3} opts={["0-1%","2%","3%","Mes de 3%"]} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Mes tractament</label>
            <select value={f.tractamentMes} onChange={e => set("tractamentMes", +e.target.value)}
              style={{ ...S.input, background:"#100000" }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <Sel lbl="Tipus tractament" field="tipusTractament" opts={TRACTA} />
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={S.label}>Notes</label>
        <textarea value={f.notes} onChange={e => set("notes", e.target.value)}
          rows={2} style={{ ...S.input, resize:"vertical" }} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onSave(f)} disabled={loading}
          style={{ ...S.btnPri, flex:1 }}>
          {loading ? "Guardant..." : (compact ? "Aplicar canvis" : "Guardar revisio")}
        </button>
        {onCancel && <button onClick={onCancel} style={S.btnGhost}>Cancel.lar</button>}
      </div>
    </div>
  );
}

// ─── BULK PROCESSOR ───────────────────────────────────────────────────────────
function BulkProcessor({ apiariArnes, onComplete, onClose }) {
  const [items,      setItems]      = useState([]);
  const [phase,      setPhase]      = useState("select");
  const [currentIdx, setCurrentIdx] = useState(0);

  const addFiles = files => {
    const news = Array.from(files).map(f => ({
      id:       "img_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      file:     f,
      preview:  URL.createObjectURL(f),
      status:   "pendent",
      result:   null,
      formData: emptyReview(),
      mode:     "auto",
      arnaId:   null,
      arnaNum:  null,
    }));
    setItems(p => [...p, ...news]);
  };

  const removeItem = id => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id, ch) => setItems(p => p.map(it => it.id === id ? { ...it, ...ch } : it));

  const processAll = async () => {
    setPhase("processing");
    for (let i = 0; i < items.length; i++) {
      setCurrentIdx(i);
      setItems(p => p.map((it, idx) => idx === i ? { ...it, status:"analitzant" } : it));
      try {
        const b64    = await toBase64(items[i].file);
        const result = await readFitxaAI(b64, items[i].file.type);
        if (result) {
          const matched = result.numero ? apiariArnes.find(a => a.numero === result.numero) : null;
          const { numero, ...rest } = result;
          setItems(p => p.map((it, idx) => idx === i ? {
            ...it, status:"fet", result,
            formData: { ...emptyReview(), ...rest },
            arnaId:   matched?.id || null,
            arnaNum: numero || null,
            mode:    matched ? "revision" : "nova",
          } : it));
        } else {
          setItems(p => p.map((it, idx) => idx === i ? { ...it, status:"error" } : it));
        }
      } catch(_) {
        setItems(p => p.map((it, idx) => idx === i ? { ...it, status:"error" } : it));
      }
    }
    setPhase("review");
  };

  const readyCount = items.filter(it =>
    it.status === "fet" && it.mode !== "skip" &&
    (it.arnaId || (it.mode === "nova" && it.arnaNum))
  ).length;

  const saveAll = () => onComplete(items.filter(it =>
    it.status === "fet" && it.mode !== "skip" &&
    (it.arnaId || (it.mode === "nova" && it.arnaNum))
  ));

  const pct = items.length
    ? Math.round(items.filter(i => i.status === "fet" || i.status === "error").length / items.length * 100)
    : 0;

  if (phase === "select") return (
    <div style={{ ...S.page, position:"fixed", inset:0, zIndex:1000, overflowY:"auto", padding:"0 14px 40px" }}>
      <div style={{ maxWidth:700, margin:"0 auto" }}>
        <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
          <div>
            <h2 style={{ margin:0, color:"#f5c842", fontSize:19 }}>Analitzar fitxes</h2>
            <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>La IA llegira cada fitxa automaticament</p>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, margin:"20px 0 16px" }}>
          <div style={{ position:"relative", ...S.btnBlue, padding:"18px 12px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, borderRadius:8, overflow:"hidden" }}>
            <span style={{ fontSize:36 }}>📷</span>
            <span style={{ fontWeight:700, fontSize:15 }}>Fer foto</span>
            <span style={{ fontSize:12, opacity:0.7 }}>Camera directa</span>
            <input type="file" accept="image/*" capture="environment"
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
              style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
          </div>
          <div style={{ position:"relative", ...S.btnGold, padding:"18px 12px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, borderRadius:8, overflow:"hidden" }}>
            <span style={{ fontSize:36 }}>🖼️</span>
            <span style={{ fontWeight:700, fontSize:15 }}>Galeria</span>
            <span style={{ fontSize:12, opacity:0.7 }}>Selecciona multiples</span>
            <input type="file" accept="image/*" multiple
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
              style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
          </div>
        </div>

        {items.length > 0 && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:8, marginBottom:16 }}>
              {items.map((it, i) => (
                <div key={it.id} style={{ position:"relative", borderRadius:8, overflow:"hidden", aspectRatio:"1", background:"#1a1200" }}>
                  <img src={it.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.65)", padding:"2px 4px", fontSize:10, color:"#f5c842", textAlign:"center" }}>Foto {i+1}</div>
                  <button onClick={() => removeItem(it.id)}
                    style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:"50%", color:"#fff", width:22, height:22, cursor:"pointer", fontSize:12, padding:0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={processAll} style={{ ...S.btnPri, width:"100%", fontSize:15, padding:"14px" }}>
              Analitzar {items.length} {items.length === 1 ? "foto" : "fotos"} amb IA
            </button>
          </div>
        )}
        {items.length === 0 && (
          <div style={{ textAlign:"center", padding:"50px 20px", color:"#5a4a2a" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>📷</div>
            <p style={{ fontSize:14, color:"#7a6040" }}>Afegeix fotos de les fitxes per analitzar-les</p>
          </div>
        )}
      </div>
    </div>
  );

  if (phase === "processing") return (
    <div style={{ ...S.page, position:"fixed", inset:0, zIndex:1000, overflowY:"auto", padding:"0 14px 40px" }}>
      <div style={{ maxWidth:700, margin:"0 auto" }}>
        <div style={{ padding:"18px 0 14px", borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <h2 style={{ margin:0, color:"#f5c842", fontSize:19 }}>Analitzant fitxes...</h2>
          <p style={{ margin:"4px 0 0", color:"#7a6040", fontSize:11 }}>Foto {Math.min(currentIdx+1,items.length)} de {items.length}</p>
        </div>
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, height:8, margin:"16px 0", overflow:"hidden" }}>
          <div style={{ height:"100%", background:"linear-gradient(90deg,#f5c842,#d4a020)", borderRadius:8, width: pct + "%", transition:"width 0.5s" }} />
        </div>
        {items.map((it, i) => (
          <div key={it.id} style={{ ...S.card, marginBottom:8, display:"flex", alignItems:"center", gap:12, padding:12 }}>
            <img src={it.preview} alt="" style={{ width:52, height:52, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ color:"#f5e8a0", fontSize:13, fontWeight:600 }}>Foto {i+1}</div>
              <div style={{ fontSize:12, marginTop:2, color: it.status==="fet" ? "#80c880" : it.status==="error" ? "#ff8888" : it.status==="analitzant" ? "#f5c842" : "#5a4a2a" }}>
                {it.status==="pendent" ? "Pendent" : it.status==="analitzant" ? "Analitzant..." : it.status==="fet" ? "Llegida correctament" : "No s'ha pogut leer"}
              </div>
              {it.status==="fet" && it.result?.numero && (
                <div style={{ color:"#f5c842", fontSize:11 }}>Arna #{it.result.numero} detectada</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ ...S.page, position:"fixed", inset:0, zIndex:1000, overflowY:"auto", padding:"0 14px 40px" }}>
      <div style={{ maxWidth:700, margin:"0 auto" }}>
        <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <button onClick={() => setPhase("select")} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, color:"#f5c842", fontSize:19 }}>Repassa els resultats</h2>
            <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>{readyCount} entrades a guardar</p>
          </div>
          <button onClick={saveAll} disabled={readyCount === 0}
            style={{ ...S.btnPri, opacity: readyCount === 0 ? 0.4 : 1 }}>
            Guardar
          </button>
        </div>

        {items.map((it, i) => (
          <div key={it.id} style={{ ...S.card, marginTop:14 }}>
            <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
              <img src={it.preview} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ color:"#f5e8a0", fontWeight:700, fontSize:14 }}>Foto {i+1}</div>
                {it.status==="error"
                  ? <div style={{ color:"#ff8888", fontSize:12 }}>No s'ha pogut llegir</div>
                  : <div style={{ color:"#80c880", fontSize:12 }}>Llegida correctament{it.result?.numero ? " — Arna #"+it.result.numero : ""}</div>
                }
              </div>
              <select value={it.mode}
                onChange={e => updateItem(it.id, { mode:e.target.value, arnaId: e.target.value==="nova" ? null : it.arnaId })}
                style={{ ...S.input, width:"auto", fontSize:11, padding:"6px 8px", background:"#1a1400", flexShrink:0 }}>
                <option value="revision">Revisio</option>
                <option value="nova">Nova arna</option>
                <option value="skip">Saltar</option>
              </select>
            </div>

            {it.status==="fet" && it.mode !== "skip" && (
              <div>
                {it.mode === "revision" ? (
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Assignar a l'arna</label>
                    <select value={it.arnaId || ""}
                      onChange={e => updateItem(it.id, { arnaId: e.target.value || null })}
                      style={{ ...S.input, background:"#1a1400" }}>
                      <option value="">-- Selecciona arna --</option>
                      {apiariArnes.sort((a,b) => a.numero - b.numero).map(a => (
                        <option key={a.id} value={a.id}>Arna #{a.numero}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Numero nova arna</label>
                    <input type="number" value={it.arnaNum || ""}
                      onChange={e => updateItem(it.id, { arnaNum: +e.target.value })}
                      style={S.input} placeholder="Ex: 15" />
                  </div>
                )}
                <details>
                  <summary style={{ color:"#d4a855", fontSize:12, cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
                    Revisar i editar les dades
                  </summary>
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,200,50,0.08)" }}>
                    <ReviewForm
                      arnaNumero={it.arnaNum}
                      initial={it.formData}
                      onSave={fd => updateItem(it.id, { formData: fd })}
                      onCancel={null}
                      loading={false}
                      compact={true}
                    />
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
        <button onClick={saveAll} disabled={readyCount === 0}
          style={{ ...S.btnPri, width:"100%", marginTop:16, fontSize:15, padding:"14px", opacity: readyCount === 0 ? 0.4 : 1 }}>
          Guardar {readyCount} entrades
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP CONTENT ─────────────────────────────────────────────────────────
export default function App() {
  const [apiaris,     setApiaris]     = useState([]);
  const [selApiari,   setSelApiari]   = useState(null);
  const [arnes,       setArnes]       = useState([]);
  const [selArna,     setSelArna]     = useState(null);
  const [revisions,   setRevisions]   = useState([]);
  const [recomanacio, setRecomanacio] = useState("");
  const [loadingRec,  setLoadingRec]  = useState(false);
  
  const [view,        setView]        = useState("apiaris"); // apiaris, arnes, arna
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulk,    setShowBulk]    = useState(false);
  const [editingRev,  setEditingRev]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(null);

  // Apiari Form State
  const [apNom, setApNom] = useState("");
  const [apLat, setApLat] = useState("");
  const [apLng, setApLng] = useState("");

  // Arna Form State
  const [arNum, setArNum] = useState("");
  const [arTip, setArTip] = useState("Layens");

  useEffect(() => {
    load("apiaris").then(d => { if(d) setApiaris(d); });
    load("arnes").then(d => { if(d) setArnes(d); });
    load("revisions").then(d => { if(d) setRevisions(d); });
  }, []);

  const selectApiari = (ap) => {
    setSelApiari(ap);
    setView("arnes");
  };

  const selectArna = (ar) => {
    setSelArna(ar);
    setView("arna");
    setRecomanacio("");
    const revs = revisions.filter(r => r.arnaId === ar.id);
    if (revs.length > 0) {
      setLoadingRec(true);
      getRecomanacions(revs).then(txt => { setRecomanacio(txt); setLoadingRec(false); });
    }
  };

  const currentArnes = arnes.filter(a => a.apiariId === selApiari?.id);
  const currentRevs  = revisions.filter(r => r.arnaId === selArna?.id).sort((a,b) => new Date(a.date) - new Date(b.date));

  const handleAddApiari = async () => {
    if (!apNom) return;
    const newAp = { id: "ap_" + Date.now(), nom: apNom, lat: apLat, lng: apLng };
    const n = [...apiaris, newAp];
    setApiaris(n); await save("apiaris", n);
    setApNom(""); setApLat(""); setApLng(""); setShowAddForm(false);
  };

  const handleAddArna = async () => {
    if (!arNum) return;
    const newAr = { id: "ar_" + Date.now(), apiariId: selApiari.id, numero: parseInt(arNum), tipus: arTip };
    const n = [...arnes, newAr];
    setArnes(n); await save("arnes", n);
    setArNum(""); setShowAddForm(false);
  };

  const handleSaveReview = async (formData) => {
    setLoading(true);
    let n;
    if (editingRev?.id) {
      n = revisions.map(r => r.id === editingRev.id ? { ...r, ...formData } : r);
    } else {
      const newRev = { id: "rev_" + Date.now(), arnaId: selArna.id, ...formData };
      n = [...revisions, newRev];
    }
    setRevisions(n); await save("revisions", n);
    setEditingRev(null); setLoading(false);
    
    const subRevs = n.filter(r => r.arnaId === selArna.id);
    setLoadingRec(true);
    const txt = await getRecomanacions(subRevs);
    setRecomanacio(txt);
    setLoadingRec(false);
  };

  const handleBulkComplete = async (completedItems) => {
    setLoading(true);
    let updatedArnes = [...arnes];
    let updatedRevs = [...revisions];

    for (const item of completedItems) {
      let aId = item.arnaId;
      if (item.mode === "nova" && item.arnaNum) {
        const exist = updatedArnes.find(a => a.apiariId === selApiari.id && a.numero === item.arnaNum);
        if (exist) {
          aId = exist.id;
        } else {
          const newAr = { id: "ar_" + Date.now() + "_" + Math.random().toString(36).slice(2), apiariId: selApiari.id, numero: item.arnaNum, tipus: "Layens" };
          updatedArnes.push(newAr);
          aId = newAr.id;
        }
      }
      if (aId) {
        const newRev = { id: "rev_" + Date.now() + "_" + Math.random().toString(36).slice(2), arnaId: aId, ...item.formData };
        updatedRevs.push(newRev);
      }
    }

    setArnes(updatedArnes); await save("arnes", updatedArnes);
    setRevisions(updatedRevs); await save("revisions", updatedRevs);
    setLoading(false); setShowBulk(false);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    if (type === "apiari") {
      const nAp = apiaris.filter(a => a.id !== id);
      const nAr = arnes.filter(a => a.apiariId !== id);
   const arIds = arnes.filter(a => a.apiariId === id).map(a => a.id);
  const nRv = revisions.filter(r => !arIds.includes(r.arna));

  return (
    <div>
      {/* Aquí va el contingut del teu component. 
          Si tenies un bloc de codi HTML/JSX que s'ha esborrat sense voler, 
          necessitaràs reescriure el que anava dins del return. */}
    </div>
  );
};

export default App;
