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

// ─── API ──────────────────────────────────────────────────────────────────────
const FITXA_PROMPT =
  "Ets un expert apicultor. Analitza la foto d'aquesta fitxa d'arna amb xinxetes de colors. " +
  "Retorna NOMES un objecte JSON valid amb els camps: " +
  "numero (enter, numero de l'arna o null), " +
  "forcaColonia (0=molt feble a 4=molt forta), " +
  "quadresMel (0-20), pollen (0=gens a 5=moltissim), " +
  "quadresAbelles (0-14), quadresCria (0-10), " +
  "criaEstat (exactament Compacta o Pua o Dispersa), " +
  "estatReina (0=vista amb posta, 1=no vista posta, 2=vista sense posta, 3=ni vista ni posta), " +
  "cellesReials (0-30), anyReina (0-9), " +
  "varroaPct (0=0-1%, 1=2%, 2=3%, 3=mes de 3%), " +
  "tipusTractament (0=cap, 1=varromed, 2=oxalic, 3=apivar, 4=apitraz, 5=altres, 6=nuclei), " +
  "quadresBuits (0-14), agressivitat (0=calma total a 5=marxo). " +
  "Nomes el JSON, sense markdown ni explicacions.";

async function readFitxaAI(base64, mediaType) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text",  text: FITXA_PROMPT }
          ]
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch(_) { return null; }
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 450,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "Error.";
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
        <Num lbl="Quadres mel"    field="quadresMel"    min={0} max={20} />
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
            arnaId:  matched?.id || null,
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
                {it.status==="pendent" ? "Pendent" : it.status==="analitzant" ? "Analitzant..." : it.status==="fet" ? "Llegida correctament" : "No s'ha pogut llegir"}
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

  // review
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
          Guardar {readyCount} {readyCount === 1 ? "entrada" : "entrades"}
        </button>
      </div>
    </div>
  );
}

// ─── DETALL ARNA ──────────────────────────────────────────────────────────────
function ArnaDetail({ arna, revisions, onAddRevision, onBack }) {
  const [tab,       setTab]       = useState("resum");
  const [showForm,  setShowForm]  = useState(false);
  const [aiPrefill, setAiPrefill] = useState(null);
  const [aiLoad,    setAiLoad]    = useState(false);
  const [saveLoad,  setSaveLoad]  = useState(false);
  const [recs,      setRecs]      = useState("");
  const [recLoad,   setRecLoad]   = useState(false);

  const sorted = [...revisions].sort((a, b) => a.date.localeCompare(b.date));
  const last   = sorted[sorted.length - 1];
  const chartData = sorted.map(r => ({
    d:      r.date.slice(5),
    forca:  r.forcaColonia,
    mel:    r.quadresMel,
    abelles:r.quadresAbelles,
    cria:   r.quadresCria,
    varroa: r.varroaPct,
  }));

  const handlePhoto = async file => {
    if (!file) return;
    setAiLoad(true);
    const b64    = await toBase64(file);
    const result = await readFitxaAI(b64, file.type);
    if (result) {
      const { numero, ...rest } = result;
      setAiPrefill({ ...emptyReview(), ...rest });
    } else {
      setAiPrefill(null);
    }
    setShowForm(true);
    setAiLoad(false);
  };

  const handleSave = async data => {
    setSaveLoad(true);
    await onAddRevision({ ...data, arnaId: arna.id, id: "r_" + Date.now() });
    setShowForm(false);
    setAiPrefill(null);
    setSaveLoad(false);
  };

  const T = t => ({
    padding:"8px 14px", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:12,
    background: tab===t ? "rgba(245,200,66,0.15)" : "transparent",
    color:      tab===t ? "#f5c842" : "#6b5a3a",
    borderBottom: "2px solid " + (tab===t ? "#f5c842" : "transparent"),
  });

  return (
    <div style={S.page}>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"0 14px 40px" }}>
        {/* Header */}
        <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, color:"#f5c842", fontSize:20 }}>Arna #{arna.numero}</h2>
            <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>Creada {arna.dataCreacio} · {revisions.length} revisions</p>
          </div>
        </div>

        {/* Botons foto/manual - LABEL pattern per maxima compatibilitat mobil */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", margin:"14px 0 12px" }}>
          {aiLoad ? (
            <span style={{ color:"#f5c842", fontSize:13, alignSelf:"center" }}>Llegint fitxa amb IA...</span>
          ) : (
            <>
              <div style={{ position:"relative", ...S.btnBlue, display:"inline-flex", alignItems:"center", gap:6, overflow:"hidden" }}>
                📷 Fer foto
                <input type="file" accept="image/*" capture="environment"
                  onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); e.target.value = ""; }}
                  style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
              </div>
              <div style={{ position:"relative", ...S.btnGold, display:"inline-flex", alignItems:"center", gap:6, overflow:"hidden" }}>
                🖼️ Pujar foto
                <input type="file" accept="image/*"
                  onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); e.target.value = ""; }}
                  style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
              </div>
              <button onClick={() => { setAiPrefill(null); setShowForm(s => !s); }} style={S.btnGold}>
                ✏️ Manual
              </button>
            </>
          )}
        </div>

        {showForm && (
          <div style={{ ...S.card, marginBottom:14 }}>
            {aiPrefill && (
              <div style={{ background:"rgba(80,200,80,0.08)", border:"1px solid rgba(80,200,80,0.2)", borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#80c880" }}>
                Dades extretes de la foto — revisa i corregeix si cal
              </div>
            )}
            <ReviewForm
              arnaNumero={arna.numero}
              initial={aiPrefill}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setAiPrefill(null); }}
              loading={saveLoad}
            />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,200,50,0.08)", marginBottom:16 }}>
          {["resum","grafics","historial"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={T(t)}>
              {t === "resum" ? "Resum" : t === "grafics" ? "Grafics" : "Historial"}
            </button>
          ))}
        </div>

        {tab === "resum" && !last && (
          <p style={{ color:"#6b5a3a", textAlign:"center", marginTop:40 }}>Sense revisions. Usa els botons de dalt per afegir-ne una.</p>
        )}

        {tab === "resum" && last && (
          <div>
            {last.cellesReials > 0 && (
              <div style={{ background:"rgba(255,120,40,0.1)", border:"1px solid rgba(255,120,40,0.3)", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#ffaa66" }}>
                {last.cellesReials} cel.les reials — possible eixam imminent!
              </div>
            )}
            {last.varroaPct >= 2 && (
              <div style={{ background:"rgba(255,60,60,0.08)", border:"1px solid rgba(255,60,60,0.25)", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#ff9090" }}>
                Varroa elevada — considera tractament urgent
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                ["Forca",    FORCE[last.forcaColonia]],
                ["Mel",      last.quadresMel + " quadres"],
                ["Abelles",  last.quadresAbelles + " quadres"],
                ["Cria",     last.quadresCria + "q · " + last.criaEstat],
                ["Reina",    REINA[last.estatReina].split(" ").slice(0,3).join(" ")],
                ["Varroa",   ["0-1%","2%","3%","Mes 3%"][last.varroaPct]],
                ["Pol.len",  POLLEN[last.pollen]],
                ["Agress.",  AGRESS[last.agressivitat]],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ ...S.card, padding:12 }}>
                  <div style={{ color:"#7a6040", fontSize:11 }}>{lbl}</div>
                  <div style={{ color:"#f5e8a0", fontSize:13, fontWeight:600, marginTop:3 }}>{val}</div>
                </div>
              ))}
            </div>
            {last.notes && (
              <div style={{ ...S.card, marginBottom:14, fontSize:13, color:"#a09060", fontStyle:"italic" }}>
                {last.notes}
              </div>
            )}
            <div style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ color:"#f5c842", fontWeight:600, fontSize:13 }}>Recomanacions IA</span>
                <button
                  onClick={async () => { setRecLoad(true); setRecs(await getRecomanacions(sorted)); setRecLoad(false); }}
                  disabled={recLoad}
                  style={S.btnGold}>
                  {recLoad ? "Analitzant..." : "Analitzar"}
                </button>
              </div>
              {recs
                ? <p style={{ color:"#b8d8a0", fontSize:13, lineHeight:1.7, margin:0, whiteSpace:"pre-line" }}>{recs}</p>
                : <p style={{ color:"#5a4a2a", fontSize:12, margin:0 }}>Prem "Analitzar" per obtenir recomanacions.</p>
              }
            </div>
          </div>
        )}

        {tab === "grafics" && (
          chartData.length < 2
            ? <p style={{ color:"#6b5a3a", textAlign:"center", marginTop:40 }}>Calen almenys 2 revisions.</p>
            : [["forca","Forca colonia","#f5c842"],["mel","Quadres mel","#f5a020"],["abelles","Quadres abelles","#a0c840"],["cria","Quadres cria","#40c8a0"],["varroa","Varroa (0-3)","#ff6666"]].map(([k,lbl,col]) => (
              <div key={k} style={{ marginBottom:22 }}>
                <p style={{ color:"#7a6040", fontSize:11, margin:"0 0 6px" }}>{lbl}</p>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData} margin={{ top:4, right:8, left:-24, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="d" tick={{ fill:"#5a4a2a", fontSize:9 }} />
                    <YAxis tick={{ fill:"#5a4a2a", fontSize:9 }} />
                    <Tooltip contentStyle={{ background:"#1a1000", border:"1px solid "+col, borderRadius:6, color:"#fff", fontSize:12 }} />
                    <Line type="monotone" dataKey={k} stroke={col} strokeWidth={2} dot={{ fill:col, r:3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))
        )}

        {tab === "historial" && (
          <div>
            {sorted.length === 0 && <p style={{ color:"#6b5a3a", textAlign:"center", marginTop:40 }}>Sense revisions.</p>}
            {[...sorted].reverse().map(r => (
              <div key={r.id} style={{ ...S.card, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ color:"#f5c842", fontWeight:600 }}>{r.date}</span>
                  <span style={{ color:"#a0845c", fontSize:12 }}>{FORCE[r.forcaColonia]}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, fontSize:11, color:"#b8a070" }}>
                  <span>Mel: {r.quadresMel}q</span>
                  <span>Abelles: {r.quadresAbelles}q</span>
                  <span>Cria: {r.quadresCria}q</span>
                  <span>Reina: {REINA[r.estatReina].split(" ")[0]}</span>
                  <span>Varroa: {["0-1%","2%","3%","3%+"][r.varroaPct]}</span>
                  <span>Agress: {r.agressivitat}/5</span>
                </div>
                {r.notes && <p style={{ color:"#7a6a4a", fontSize:11, margin:"6px 0 0", fontStyle:"italic" }}>{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,    setMode]    = useState("login");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(); const passRef  = useRef();
  const nameRef  = useRef(); const pass2Ref = useRef();

  const doLogin = async () => {
    setError(""); setLoading(true);
    const email = emailRef.current?.value || "";
    const pass  = passRef.current?.value  || "";
    const users = await load("users", true) || [];
    const u = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (u) { try { localStorage.setItem("session_uid", u.id); } catch(_) {} onLogin(u); }
    else setError("Correu o contrasenya incorrectes");
    setLoading(false);
  };

  const doRegister = async () => {
    setError("");
    const name  = nameRef.current?.value  || "";
    const email = emailRef.current?.value || "";
    const pass  = passRef.current?.value  || "";
    const pass2 = pass2Ref.current?.value || "";
    if (!name.trim())         return setError("Cal el nom");
    if (!email.includes("@")) return setError("Correu no valid");
    if (pass.length < 6)      return setError("Minim 6 caracters");
    if (pass !== pass2)       return setError("Les contrasenyes no coincideixen");
    setLoading(true);
    const users = await load("users", true) || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Correu ja registrat"); setLoading(false); return;
    }
    const nu = { id:"u_"+Date.now(), email:email.toLowerCase(), password:pass, name:name.trim(), explotacioIds:[] };
    await save("users", [...users, nu], true);
    try { localStorage.setItem("session_uid", nu.id); } catch(_) {}
    onLogin(nu);
    setLoading(false);
  };

  const F = ({ lbl, r, type, ph, onEnter }) => (
    <div style={{ marginBottom:14 }}>
      <label style={S.label}>{lbl}</label>
      <input ref={r} type={type || "text"} defaultValue=""
        onKeyDown={e => e.key === "Enter" && onEnter?.()}
        style={S.input} placeholder={ph} autoCapitalize="none" />
    </div>
  );

  return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:380, background:"rgba(255,245,180,0.04)", border:"1px solid rgba(255,200,50,0.2)", borderRadius:18, padding:"40px 32px" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:50 }}>🐝</div>
          <h1 style={{ color:"#f5c842", fontSize:24, margin:"8px 0 2px" }}>ApiariApp</h1>
          <p style={{ color:"#7a6040", fontSize:12, margin:0 }}>Gestio d'apiaris intel.ligent</p>
        </div>
        <div style={{ display:"flex", background:"rgba(0,0,0,0.25)", borderRadius:8, padding:3, marginBottom:24 }}>
          {[["login","Entrar"],["register","Crear compte"]].map(([m, lbl]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex:1, padding:"8px 0", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:12,
                background: mode===m ? "rgba(245,200,66,0.2)" : "transparent",
                color:      mode===m ? "#f5c842" : "#6b5a3a" }}>
              {lbl}
            </button>
          ))}
        </div>
        {mode === "login" ? (
          <>
            <F lbl="Correu"      r={emailRef} ph="tu@correu.cat" />
            <F lbl="Contrasenya" r={passRef}  type="password" ph="••••••••" onEnter={doLogin} />
            {error && <p style={{ color:"#ff6b6b", fontSize:13, textAlign:"center", marginBottom:12 }}>{error}</p>}
            <button onClick={doLogin} disabled={loading} style={{ ...S.btnPri, width:"100%" }}>
              {loading ? "Entrant..." : "Entrar"}
            </button>
          </>
        ) : (
          <>
            <F lbl="Nom complet"         r={nameRef}  ph="Joan Garcia" />
            <F lbl="Correu"              r={emailRef} ph="tu@correu.cat" />
            <F lbl="Contrasenya (min 6)" r={passRef}  type="password" ph="••••••••" />
            <F lbl="Repeteix contrasenya"r={pass2Ref} type="password" ph="••••••••" onEnter={doRegister} />
            {error && <p style={{ color:"#ff6b6b", fontSize:13, textAlign:"center", marginBottom:12 }}>{error}</p>}
            <button onClick={doRegister} disabled={loading} style={{ ...S.btnPri, width:"100%" }}>
              {loading ? "Creant compte..." : "Crear compte"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [user,         setUser]         = useState(null);
  const [explotacions, setExplotacions] = useState([]);
  const [apiaris,      setApiaris]      = useState([]);
  const [arnes,        setArnes]        = useState([]);
  const [revisions,    setRevisions]    = useState([]);
  const [selExp,       setSelExp]       = useState(null);
  const [selApiari,    setSelApiari]    = useState(null);
  const [selArna,      setSelArna]      = useState(null);
  const [showBulk,     setShowBulk]     = useState(false);

  // forms state
  const [showNewExp,    setShowNewExp]    = useState(false);
  const [showJoinExp,   setShowJoinExp]   = useState(false);
  const [showNewApiari, setShowNewApiari] = useState(false);
  const [showNewArna,   setShowNewArna]   = useState(false);
  const [newExp,        setNewExp]        = useState({ nom:"", rega:"", password:"", password2:"" });
  const [joinForm,      setJoinForm]      = useState({ rega:"", password:"" });
  const [newApiari,     setNewApiari]     = useState({ nom:"", lat:"", lng:"", altitud:"", descripcio:"" });
  const [newArnaNum,    setNewArnaNum]    = useState("");
  const [confirmDel,    setConfirmDel]    = useState(null); // { type:'apiari'|'arna', id, name }
  const [formError,     setFormError]     = useState("");
  const [formMsg,       setFormMsg]       = useState("");

  // Restore session
  useEffect(() => {
    (async () => {
      try {
        const uid = localStorage.getItem("session_uid");
        if (!uid) return;
        const users = await load("users", true) || [];
        const u = users.find(u => u.id === uid);
        if (u) setUser(u);
      } catch(_) {}
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [e, a, ar, r] = await Promise.all([
        load("explotacions", true), load("apiaris", true),
        load("arnes",        true), load("revisions", true)
      ]);
      setExplotacions(e||[]); setApiaris(a||[]);
      setArnes(ar||[]);       setRevisions(r||[]);
    })();
  }, [user]);

  const doLogout = () => {
    try { localStorage.removeItem("session_uid"); } catch(_) {}
    setUser(null); setSelExp(null); setSelApiari(null); setSelArna(null);
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const createExplotacio = async () => {
    setFormError("");
    if (!newExp.nom.trim())               return setFormError("Cal el nom");
    if (!newExp.rega.trim())              return setFormError("Cal el REGA");
    if (newExp.password.length < 4)       return setFormError("Contrasenya minima 4 caracters");
    if (newExp.password !== newExp.password2) return setFormError("Les contrasenyes no coincideixen");
    if (explotacions.find(e => e.rega.toLowerCase() === newExp.rega.toLowerCase()))
      return setFormError("Aquest REGA ja existeix");
    const nova = { id:"e_"+Date.now(), nom:newExp.nom.trim(), rega:newExp.rega.trim().toUpperCase(),
      password:newExp.password, propietariId:user.id, membres:[user.id] };
    const upd = [...explotacions, nova];
    setExplotacions(upd); await save("explotacions", upd);
    const users = await load("users", true) || [];
    await save("users", users.map(u => u.id===user.id ? {...u, explotacioIds:[...(u.explotacioIds||[]),nova.id]} : u), true);
    setUser(u => ({ ...u, explotacioIds:[...(u.explotacioIds||[]), nova.id] }));
    setNewExp({ nom:"", rega:"", password:"", password2:"" });
    setShowNewExp(false);
    setFormMsg("Explotacio \""+nova.nom+"\" creada! Comparteix REGA "+nova.rega+" i la contrasenya.");
  };

  const joinExplotacio = async () => {
    setFormError("");
    const exp = explotacions.find(e => e.rega.toUpperCase() === joinForm.rega.trim().toUpperCase());
    if (!exp)                        return setFormError("No s'ha trobat cap explotacio amb aquest REGA");
    if (exp.password !== joinForm.password) return setFormError("Contrasenya incorrecta");
    if (exp.membres?.includes(user.id))    return setFormError("Ja ets membre d'aquesta explotacio");
    const upd = explotacions.map(e => e.id===exp.id ? {...e, membres:[...(e.membres||[]),user.id]} : e);
    setExplotacions(upd); await save("explotacions", upd);
    const users = await load("users", true) || [];
    await save("users", users.map(u => u.id===user.id ? {...u, explotacioIds:[...(u.explotacioIds||[]),exp.id]} : u), true);
    setUser(u => ({ ...u, explotacioIds:[...(u.explotacioIds||[]), exp.id] }));
    setJoinForm({ rega:"", password:"" }); setShowJoinExp(false);
    setFormMsg("T'has unit a \""+exp.nom+"\" correctament!");
  };

  const createApiari = async () => {
    setFormError("");
    if (!newApiari.nom.trim()) return setFormError("Cal el nom");
    const nou = { id:"a_"+Date.now(), nom:newApiari.nom.trim(), explotacioId:selExp.id,
      lat:parseFloat(newApiari.lat)||null, lng:parseFloat(newApiari.lng)||null,
      altitud:parseInt(newApiari.altitud)||null, descripcio:newApiari.descripcio.trim() };
    const upd = [...apiaris, nou];
    setApiaris(upd); await save("apiaris", upd);
    setNewApiari({ nom:"", lat:"", lng:"", altitud:"", descripcio:"" });
    setShowNewApiari(false);
  };

  const deleteApiari = async id => {
    const arnesIds = arnes.filter(a => a.apiariId === id).map(a => a.id);
    const newArnes = arnes.filter(a => a.apiariId !== id);
    const newRevs  = revisions.filter(r => !arnesIds.includes(r.arnaId));
    const newApi   = apiaris.filter(a => a.id !== id);
    setApiaris(newApi);   await save("apiaris", newApi);
    setArnes(newArnes);   await save("arnes", newArnes);
    setRevisions(newRevs);await save("revisions", newRevs);
    setConfirmDel(null);
  };

  const createArna = async num => {
    if (!num) return null;
    const nova = { id:"ar_"+Date.now(), numero:+num, apiariId:selApiari.id, activa:true, dataCreacio:new Date().toISOString().split("T")[0] };
    const upd = [...arnes, nova];
    setArnes(upd); await save("arnes", upd);
    return nova;
  };

  const deleteArna = async id => {
    const newArnes = arnes.filter(a => a.id !== id);
    const newRevs  = revisions.filter(r => r.arnaId !== id);
    setArnes(newArnes);    await save("arnes", newArnes);
    setRevisions(newRevs); await save("revisions", newRevs);
    setConfirmDel(null);
  };

  const addRevision = useCallback(async rev => {
    const upd = [...revisions, rev];
    setRevisions(upd); await save("revisions", upd);
  }, [revisions]);

  const handleBulkComplete = async items => {
    let newArnesList = [...arnes];
    let newRevsList  = [...revisions];
    for (const it of items) {
      let arnaId = it.arnaId;
      if (it.mode === "nova" && it.arnaNum) {
        const nova = { id:"ar_"+Date.now()+"_"+it.arnaNum, numero:it.arnaNum, apiariId:selApiari.id, activa:true, dataCreacio:new Date().toISOString().split("T")[0] };
        newArnesList = [...newArnesList, nova];
        arnaId = nova.id;
      }
      if (arnaId) {
        newRevsList = [...newRevsList, { ...it.formData, arnaId, id:"r_"+Date.now()+"_"+Math.random().toString(36).slice(2) }];
      }
    }
    setArnes(newArnesList);    await save("arnes", newArnesList);
    setRevisions(newRevsList); await save("revisions", newRevsList);
    setShowBulk(false);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (!user) return (<LoginScreen onLogin={setUser} />);
  if (showBulk && selApiari) return (
    <BulkProcessor
      apiariArnes={arnes.filter(a => a.apiariId === selApiari.id)}
      onComplete={handleBulkComplete}
      onClose={() => setShowBulk(false)}
    />
  );
  if (selArna) return (
    <ArnaDetail
      arna={selArna}
      revisions={revisions.filter(r => r.arnaId === selArna.id)}
      onAddRevision={addRevision}
      onBack={() => setSelArna(null)}
    />
  );

  const userExps    = explotacions.filter(e => e.membres?.includes(user?.id));
  const expApiaris  = selExp    ? apiaris.filter(a => a.explotacioId === selExp.id) : [];
  const apiariArnes = selApiari ? arnes.filter(a => a.apiariId === selApiari.id)    : [];

  const goBack = () => { if (selApiari) setSelApiari(null); else if (selExp) setSelExp(null); };

  const Header = ({ title, sub }) => (
    <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
      {(selExp || selApiari) && (
        <button onClick={goBack} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
      )}
      <div style={{ flex:1 }}>
        <h1 style={{ margin:0, color:"#f5c842", fontSize:19 }}>🐝 {title}</h1>
        {sub && <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>{sub}</p>}
      </div>
      <button onClick={doLogout} style={{ padding:"5px 10px", background:"rgba(255,80,40,0.1)", border:"1px solid rgba(255,80,40,0.2)", borderRadius:6, color:"#ff9966", cursor:"pointer", fontSize:11 }}>
        Sortir
      </button>
    </div>
  );

  // Confirm delete modal
  const ConfirmDel = () => confirmDel ? (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...S.card, maxWidth:320, width:"100%" }}>
        <h3 style={{ color:"#ff8888", margin:"0 0 8px" }}>Eliminar {confirmDel.type === "apiari" ? "apiari" : "arna"}?</h3>
        <p style={{ color:"#a09060", fontSize:13, margin:"0 0 16px" }}>
          "{confirmDel.name}" {confirmDel.type === "apiari" ? "i totes les seves arnes i revisions" : "i totes les seves revisions"} s'eliminaran permanentment.
        </p>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => confirmDel.type === "apiari" ? deleteApiari(confirmDel.id) : deleteArna(confirmDel.id)}
            style={{ ...S.btnRed, flex:1, fontWeight:700 }}>Eliminar</button>
          <button onClick={() => setConfirmDel(null)} style={S.btnGhost}>Cancel.lar</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div style={S.page}>
      <ConfirmDel />
      <div style={{ maxWidth:700, margin:"0 auto", padding:"0 14px 40px" }}>

        {/* ── EXPLOTACIONS ──────────────────────────────────────────── */}
        {!selExp && (
          <div>
            <Header title="ApiariApp" sub={"Hola, " + user.name} />

            {formMsg && (
              <div style={{ background:"rgba(80,200,80,0.08)", border:"1px solid rgba(80,200,80,0.2)", borderRadius:8, padding:"10px 14px", margin:"14px 0", fontSize:13, color:"#80c880", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>{formMsg}</span>
                <button onClick={() => setFormMsg("")} style={{ background:"none", border:"none", color:"#80c880", cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
            )}

            <div style={{ display:"flex", gap:8, margin:"16px 0 14px", flexWrap:"wrap" }}>
              <button onClick={() => { setShowNewExp(!showNewExp); setShowJoinExp(false); setFormError(""); }} style={S.btnGold}>Nova explotacio</button>
              <button onClick={() => { setShowJoinExp(!showJoinExp); setShowNewExp(false); setFormError(""); }} style={S.btnGold}>Unir-me a una explotacio</button>
            </div>

            {showNewExp && (
              <div style={{ ...S.card, marginBottom:16 }}>
                <h3 style={{ color:"#f5c842", margin:"0 0 10px", fontSize:14 }}>Nova explotacio</h3>
                <p style={{ color:"#7a6040", fontSize:11, margin:"0 0 14px" }}>Comparteix el REGA i la contrasenya als col.laboradors.</p>
                {[["Nom","nom","text","Can Puig - Osona"],["Numero REGA","rega","text","ES251111000007"],["Contrasenya d'acces","password","password","Minim 4 caracters"],["Repeteix la contrasenya","password2","password","••••••••"]].map(([lbl,k,t,ph]) => (
                  <div key={k} style={{ marginBottom:12 }}>
                    <label style={S.label}>{lbl}</label>
                    <input type={t} value={newExp[k]} onChange={e => setNewExp(p => ({...p,[k]:e.target.value}))} style={S.input} placeholder={ph} />
                  </div>
                ))}
                {formError && <p style={{ color:"#ff6b6b", fontSize:12, margin:"0 0 10px" }}>{formError}</p>}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={createExplotacio} style={S.btnPri}>Crear</button>
                  <button onClick={() => { setShowNewExp(false); setFormError(""); }} style={S.btnGhost}>Cancel.lar</button>
                </div>
              </div>
            )}

            {showJoinExp && (
              <div style={{ ...S.card, marginBottom:16 }}>
                <h3 style={{ color:"#f5c842", margin:"0 0 10px", fontSize:14 }}>Unir-me a una explotacio</h3>
                {[["Numero REGA","rega","text","ES251111000007"],["Contrasenya","password","password","••••••••"]].map(([lbl,k,t,ph]) => (
                  <div key={k} style={{ marginBottom:12 }}>
                    <label style={S.label}>{lbl}</label>
                    <input type={t} value={joinForm[k]} onChange={e => setJoinForm(p => ({...p,[k]:e.target.value}))} style={S.input} placeholder={ph} />
                  </div>
                ))}
                {formError && <p style={{ color:"#ff6b6b", fontSize:12, margin:"0 0 10px" }}>{formError}</p>}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={joinExplotacio} style={S.btnPri}>Unir-me</button>
                  <button onClick={() => { setShowJoinExp(false); setFormError(""); }} style={S.btnGhost}>Cancel.lar</button>
                </div>
              </div>
            )}

            {userExps.length === 0 && !showNewExp && !showJoinExp && (
              <div style={{ textAlign:"center", padding:"50px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🏡</div>
                <p style={{ fontSize:14, color:"#7a6040" }}>Encara no tens cap explotacio.</p>
              </div>
            )}

            {userExps.map(exp => {
              const nA  = apiaris.filter(a => a.explotacioId === exp.id).length;
              const nAr = arnes.filter(ar => apiaris.filter(a => a.explotacioId===exp.id).map(a=>a.id).includes(ar.apiariId)).length;
              return (
                <div key={exp.id} onClick={() => setSelExp(exp)}
                  style={{ ...S.card, marginBottom:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ color:"#f5e8a0", fontWeight:600, fontSize:15 }}>🏡 {exp.nom}</div>
                    <div style={{ color:"#7a6040", fontSize:11, marginTop:2 }}>REGA: {exp.rega}</div>
                    {exp.propietariId === user.id && (
                      <div style={{ color:"#f5c842", fontSize:10, marginTop:2 }}>Propietari · {exp.membres?.length||1} membre(s)</div>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color:"#f5c842", fontSize:14, fontWeight:600 }}>{nA} apiaris</div>
                    <div style={{ color:"#7a6040", fontSize:11 }}>{nAr} arnes</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── APIARIS ───────────────────────────────────────────────── */}
        {selExp && !selApiari && (
          <div>
            <Header title={selExp.nom} sub={"REGA: " + selExp.rega + " · " + expApiaris.length + " apiaris"} />

            <div style={{ display:"flex", justifyContent:"flex-end", margin:"14px 0" }}>
              <button onClick={() => { setShowNewApiari(!showNewApiari); setFormError(""); }} style={S.btnGold}>+ Nou apiari</button>
            </div>

            {showNewApiari && (
              <div style={{ ...S.card, marginBottom:16 }}>
                <h3 style={{ color:"#f5c842", margin:"0 0 14px", fontSize:14 }}>Nou apiari</h3>
                {[["Nom *","nom","text","Apiari Nord"],["Altitud (m)","altitud","number","620"],["Descripcio","descripcio","text","Vora el bosc"]].map(([lbl,k,t,ph]) => (
                  <div key={k} style={{ marginBottom:12 }}>
                    <label style={S.label}>{lbl}</label>
                    <input type={t} value={newApiari[k]} onChange={e => setNewApiari(p => ({...p,[k]:e.target.value}))} style={S.input} placeholder={ph} />
                  </div>
                ))}
                <div style={{ marginBottom:12 }}>
                  <label style={{ ...S.label, marginBottom:8 }}>Ubicacio (opcional)</label>
                  <LocationPicker lat={newApiari.lat} lng={newApiari.lng} onChange={(la,lo) => setNewApiari(p => ({...p,lat:la,lng:lo}))} />
                </div>
                {formError && <p style={{ color:"#ff6b6b", fontSize:12, margin:"10px 0 0" }}>{formError}</p>}
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <button onClick={createApiari} style={S.btnPri}>Crear apiari</button>
                  <button onClick={() => { setShowNewApiari(false); setFormError(""); }} style={S.btnGhost}>Cancel.lar</button>
                </div>
              </div>
            )}

            {expApiaris.length === 0 && !showNewApiari && (
              <div style={{ textAlign:"center", padding:"50px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🌿</div>
                <p style={{ fontSize:14, color:"#7a6040" }}>Cap apiari. Afegeix el primer!</p>
              </div>
            )}

            {expApiaris.map(ap => {
              const nAr = arnes.filter(a => a.apiariId === ap.id).length;
              const lastRev = revisions
                .filter(r => arnes.filter(a => a.apiariId===ap.id).map(a=>a.id).includes(r.arnaId))
                .sort((a,b) => b.date.localeCompare(a.date))[0];
              return (
                <div key={ap.id} style={{ ...S.card, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }}
                    onClick={() => setSelApiari(ap)}>
                    <div>
                      <div style={{ color:"#f5e8a0", fontWeight:600, fontSize:15 }}>🌿 {ap.nom}</div>
                      {ap.descripcio && <div style={{ color:"#7a6040", fontSize:12, marginTop:2 }}>{ap.descripcio}</div>}
                      {ap.lat && <div style={{ color:"#557755", fontSize:11, marginTop:2 }}>📍 {ap.lat}, {ap.lng}{ap.altitud ? " · "+ap.altitud+"m" : ""}</div>}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:"#f5c842", fontSize:14, fontWeight:600 }}>{nAr} arnes</div>
                      {lastRev && <div style={{ color:"#7a6040", fontSize:10 }}>Ultima: {lastRev.date}</div>}
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                    <button onClick={() => setConfirmDel({ type:"apiari", id:ap.id, name:ap.nom })} style={S.btnRed}>
                      Eliminar apiari
                    </button>
                  </div>
                  {ap.lat && ap.lng && (
                    <div onClick={e => e.stopPropagation()}>
                      <LeafletMap lat={ap.lat} lng={ap.lng} height={180} />
                      <MeteoWidget lat={ap.lat} lng={ap.lng} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ARNES ─────────────────────────────────────────────────── */}
        {selApiari && (
          <div>
            <Header title={selApiari.nom} sub={apiariArnes.length + " arnes · " + selExp.nom} />

            <div style={{ display:"flex", gap:8, margin:"14px 0", flexWrap:"wrap", alignItems:"center" }}>
              {showNewArna ? (
                <>
                  <input type="number" value={newArnaNum}
                    onChange={e => setNewArnaNum(e.target.value)}
                    placeholder="Numero d'arna (ex: 15)"
                    style={{ ...S.input, flex:1, minWidth:0 }}
                    onKeyDown={e => { if (e.key==="Enter") { createArna(newArnaNum); setNewArnaNum(""); setShowNewArna(false); } }}
                    autoFocus />
                  <button onClick={() => { createArna(newArnaNum); setNewArnaNum(""); setShowNewArna(false); }} style={S.btnPri}>Crear</button>
                  <button onClick={() => setShowNewArna(false)} style={S.btnGhost}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowNewArna(true)} style={S.btnGold}>+ Nova arna</button>
                  <button onClick={() => setShowBulk(true)}    style={S.btnBlue}>📷 Analitzar fitxes</button>
                </>
              )}
            </div>

            {apiariArnes.length === 0 && !showNewArna && (
              <div style={{ textAlign:"center", padding:"50px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🐝</div>
                <p style={{ fontSize:14, color:"#7a6040" }}>Cap arna. Afegeix la primera!</p>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10 }}>
              {apiariArnes.sort((a,b) => a.numero - b.numero).map(ar => {
                const revs = revisions.filter(r => r.arnaId === ar.id).sort((a,b) => b.date.localeCompare(a.date));
                const last = revs[0];
                const alerta = last && (last.cellesReials > 0 || last.varroaPct >= 2);
                return (
                  <div key={ar.id} style={{ ...S.card, textAlign:"center", position:"relative",
                    border: alerta ? "1px solid rgba(255,140,40,0.5)" : S.card.border }}>
                    {alerta && <div style={{ position:"absolute", top:6, right:8, fontSize:13 }}>⚠️</div>}
                    <div onClick={() => setSelArna(ar)} style={{ cursor:"pointer", paddingBottom:6 }}>
                      <div style={{ fontSize:26, marginBottom:4 }}>🐝</div>
                      <div style={{ color:"#f5c842", fontWeight:700, fontSize:17 }}>#{ar.numero}</div>
                      {last ? (
                        <>
                          <div style={{ color:"#a0845c", fontSize:10, marginTop:3 }}>{FORCE[last.forcaColonia]}</div>
                          <div style={{ color:"#5a4a2a", fontSize:9 }}>{last.date}</div>
                        </>
                      ) : (
                        <div style={{ color:"#5a4a2a", fontSize:10, marginTop:4 }}>Sense revisio</div>
                      )}
                    </div>
                    <button onClick={() => setConfirmDel({ type:"arna", id:ar.id, name:"Arna #"+ar.numero })}
                      style={{ background:"none", border:"none", color:"#6b3a3a", cursor:"pointer", fontSize:11, padding:"2px 0" }}>
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
