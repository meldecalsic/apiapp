import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const _supa = createClient("https://xhuksvsvltqqprnjzoqj.supabase.co", "sb_publishable_YS2ygpjAVM6jMkOvrJrfqA_fXuvusxJ");

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
  forcaColonia:null, quadresMel:null, pollen:null, quadresAbelles:null, quadresCria:null,
  criaEstat:null, estatReina:null, cellesReials:null, anyReina:null,
  varroaMes:null, varroaDia:null, varroaPct:null,
  tractamentMes:null, tipusTractament:null, quadresBuits:null, agressivitat:null, notes:""
});

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

const forcaMap     = { "Molt feble":0, "Feble":1, "Normal":2, "Forta":3, "Molt forta":4 };
const pollenMap    = { "Gens":0, "Poc":1, "Una mica":2, "Pse":3, "Bastant":4, "Moltíssim":5 };
const reinaMap     = { "Vista amb posta recent":0, "No vista / Posta recent":1, "Vista sense posta":2, "Ni vista ni posta":3 };
const varroaMap    = { "0 a 1%":0, "2%":1, "3%":2, "Més de 3%":3 };
const tractaMap    = { "Varromed":1, "Oxàlic sublimat":2, "Apivar":3, "Apitraz":4, "Altres":5, "Més nucli sanitari":6 };
const anyReinaMap  = { "0 Blau":0, "1 Blanc":1, "2 Groc":2, "3 Vermell":3, "4 Verd":4, "5 Blau":5, "6 Blanc":6, "7 Groc":7, "8 Vermell":8, "9 Verd":9 };
const mesMap       = { "Gener":0,"Febrer":1,"Març":2,"Abril":3,"Maig":4,"Juny":5,"Juliol":6,"Agost":7,"Setembre":8,"Octubre":9,"Novembre":10,"Desembre":11 };

function parseAnalyzeResponse(data) {
  const criaVal = data.quadres_cria;
  const criaNum = typeof criaVal === "number" ? criaVal : null;
  const criaEstatMap = { "Compacta":"Compacta", "Pse":"Pua", "Dispersa":"Dispersa" };
  const criaEstat = (typeof criaVal === "string" && criaEstatMap[criaVal]) ? criaEstatMap[criaVal] : null;

  return {
    numero:          data.arna_numero ?? null,
    forcaColonia:    data.forca_colonia != null ? (forcaMap[data.forca_colonia] ?? null) : null,
    quadresMel:      typeof data.quadres_mel === "number" ? data.quadres_mel : null,
    pollen:          data.pollen != null ? (pollenMap[data.pollen] ?? null) : null,
    quadresAbelles:  typeof data.quadres_abelles === "number" ? data.quadres_abelles : null,
    quadresCria:     criaNum,
    criaEstat:       criaEstat,
    estatReina:      data.estat_reina != null ? (reinaMap[data.estat_reina] ?? null) : null,
    cellesReials:    typeof data.cel_les_reals === "number" ? data.cel_les_reals : null,
    anyReina:        data.any_reina != null ? (anyReinaMap[data.any_reina] ?? null) : null,
    varroaMes:       data.varroa_mes_prova != null ? (mesMap[data.varroa_mes_prova] ?? null) : null,
    varroaDia:       typeof data.varroa_dia_prova === "number" ? data.varroa_dia_prova : null,
    varroaPct:       data.varroa_percentatge != null ? (varroaMap[data.varroa_percentatge] ?? null) : null,
    tractamentMes:   data.tractament_mes != null ? (mesMap[data.tractament_mes] ?? null) : null,
    tipusTractament: data.tipus_tractament != null ? (tractaMap[data.tipus_tractament] ?? null) : null,
    quadresBuits:    typeof data.quadres_buits === "number" ? data.quadres_buits : null,
    agressivitat:    null,
    notes:           "",
  };
}

async function readFitxaAI(base64, mediaType) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mediaType })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return parseAnalyzeResponse(data);
  } catch(_) { return null; }
}

async function fetchMeteo(lat, lng) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe%2FMadrid&forecast_days=5";
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
    "Forca=" + (last.forcaColonia != null ? FORCE[last.forcaColonia] : "desconeguda") + ", " +
    "mel=" + (last.quadresMel ?? "?") + "q, abelles=" + (last.quadresAbelles ?? "?") + "q, " +
    "cria=" + (last.quadresCria ?? "?") + "q " + (last.criaEstat || "") + ", " +
    "reina=" + (last.estatReina != null ? REINA[last.estatReina] : "desconeguda") + ", " +
    "celles reials=" + (last.cellesReials ?? "?") + ", " +
    "varroa=" + (last.varroaPct != null ? varroaLabels[last.varroaPct] : "desconeguda") + ", " +
    "tractament=" + (last.tipusTractament != null ? TRACTA[last.tipusTractament] : "cap") + ". " +
    "Format llista amb emojis.";
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) return "Error de connexio.";
    const data = await res.json();
    return data.text || "Error.";
  } catch(_) { return "Error de connexio."; }
}

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

function LeafletMap({ lat, lng, height, onClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const h = height || 180;
  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;
    const buildMap = () => {
      if (!window.L) return;
      if (mapRef.current) { mapRef.current.setView([lat, lng], 13); return; }
      const map = window.L.map(containerRef.current, { scrollWheelZoom: false }).setView([lat, lng], 13);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const marker = window.L.marker([lat, lng], { draggable: !!onClick }).addTo(map);
      if (onClick) {
        map.on("click", e => onClick(e.latlng.lat, e.latlng.lng));
        marker.on("dragend", e => { const ll = e.target.getLatLng(); onClick(ll.lat, ll.lng); });
      }
      mapRef.current = map;
    };
    if (window.L) { buildMap(); } else {
      if (!document.getElementById("lf-css")) {
        const lnk = document.createElement("link"); lnk.id="lf-css"; lnk.rel="stylesheet";
        lnk.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(lnk);
      }
      if (!document.getElementById("lf-js")) {
        const sc = document.createElement("script"); sc.id="lf-js";
        sc.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; sc.onload=buildMap; document.head.appendChild(sc);
      }
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, onClick]);
  if (!lat || !lng) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div ref={containerRef} style={{ height:h, borderRadius:8, overflow:"hidden", background:"#1a1800" }} />
      <a href={"https://www.google.com/maps?q="+lat+","+lng} target="_blank" rel="noreferrer"
        style={{ color:"#88bbff", fontSize:11, display:"block", marginTop:4, textDecoration:"none" }}>Obrir a Google Maps</a>
    </div>
  );
}

function LocationPicker({ lat, lng, onChange }) {
  const [gpsLoad, setGpsLoad] = useState(false);
  const [gpsErr, setGpsErr] = useState("");
  const getGPS = () => {
    setGpsLoad(true); setGpsErr("");
    if (!navigator.geolocation) { setGpsErr("GPS no disponible"); setGpsLoad(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6)); setGpsLoad(false); },
      () => { setGpsErr("No s'ha pogut obtenir la ubicacio"); setGpsLoad(false); }
    );
  };
  const mapClick = useCallback((la, lo) => onChange(la.toFixed(6), lo.toFixed(6)), [onChange]);
  return (
    <div>
      <div style={{ display:"flex", gap:8, alignItems:"flex-end", marginBottom:8 }}>
        <div style={{ flex:1 }}><label style={S.label}>Latitud</label>
          <input type="number" step="0.000001" value={lat} onChange={e => onChange(e.target.value, lng)} style={S.input} placeholder="41.9834" /></div>
        <div style={{ flex:1 }}><label style={S.label}>Longitud</label>
          <input type="number" step="0.000001" value={lng} onChange={e => onChange(lat, e.target.value)} style={S.input} placeholder="2.1234" /></div>
        <button onClick={getGPS} disabled={gpsLoad} style={S.btnGold}>{gpsLoad ? "..." : "GPS"}</button>
      </div>
      {gpsErr && <p style={{ color:"#ff8888", fontSize:11, margin:"0 0 6px" }}>{gpsErr}</p>}
      {lat && lng && <LeafletMap lat={parseFloat(lat)} lng={parseFloat(lng)} height={180} onClick={mapClick} />}
      {(!lat || !lng) && <p style={{ color:"#5a4a2a", fontSize:11 }}>Usa el GPS o escriu les coordenades.</p>}
    </div>
  );
}

function MeteoWidget({ lat, lng }) {
  const [meteo, setMeteo] = useState(null);
  useEffect(() => { if (!lat || !lng) return; fetchMeteo(lat, lng).then(setMeteo); }, [lat, lng]);
  const icon = c => c===0?"sol":c<=3?"nuvolat":c<=48?"boires":c<=67?"pluja":c<=77?"neu":"tempesta";
  const wicons = { "sol":"☀️","nuvolat":"⛅","boires":"🌫️","pluja":"🌧️","neu":"❄️","tempesta":"⛈️" };
  if (!lat || !lng) return null;
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ color:"#88bbee", fontSize:12, fontWeight:600, marginBottom:8 }}>Previsio meteorologica</div>
      {meteo?.daily && (
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {meteo.daily.time?.slice(0,5).map((d,i) => (
            <div key={i} style={{ minWidth:54, textAlign:"center", background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"6px 4px" }}>
              <div style={{ color:"#7a6040", fontSize:9 }}>{new Date(d).toLocaleDateString("ca",{weekday:"short"})}</div>
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
function FotoViewer({ url, onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x:0, y:0 });
  const lastDist = useRef(null);
  const lastPos = useRef(null);

  const getDist = (t) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const onTouchStart = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) lastDist.current = getDist(e.touches);
    else if (e.touches.length === 1) lastPos.current = { x:e.touches[0].clientX, y:e.touches[0].clientY };
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current) {
      const d = getDist(e.touches);
      setScale(s => Math.min(Math.max(s * (d / lastDist.current), 1), 8));
      lastDist.current = d;
    } else if (e.touches.length === 1 && lastPos.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      setOffset(o => ({ x:o.x+dx, y:o.y+dy }));
      lastPos.current = { x:e.touches[0].clientX, y:e.touches[0].clientY };
    }
  };

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) lastDist.current = null;
    if (e.touches.length === 0) lastPos.current = null;
  };

  const reset = () => { setScale(1); setOffset({ x:0, y:0 }); };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:9999, overflow:"hidden" }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ position:"absolute", top:12, right:12, display:"flex", gap:8, zIndex:10000 }}>
        {scale > 1.05 && (
          <button onClick={reset}
            style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:6, color:"#fff", padding:"6px 12px", fontSize:13, cursor:"pointer" }}>
            Reset
          </button>
        )}
        <button onClick={onClose}
          style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", color:"#fff", width:36, height:36, fontSize:18, cursor:"pointer" }}>\u2715</button>
      </div>
      <div style={{ position:"absolute", top:12, left:12, color:"rgba(255,255,255,0.5)", fontSize:11, zIndex:10000 }}>
        {scale > 1.05 ? Math.round(scale*100)+"%" : "Pessiga per ampliar"}
      </div>
      <img src={url} alt="Fitxa"
        style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%) translate("+offset.x+"px,"+offset.y+"px) scale("+scale+")",
          maxWidth:"100vw", maxHeight:"100vh", objectFit:"contain",
          userSelect:"none", pointerEvents:"none",
          transition: scale <= 1.05 ? "transform 0.2s" : "none"
        }} />
    </div>
  );
}

function ReviewForm({ arnaNumero, initial, onSave, onCancel, loading, compact, photoUrl }) {
  const [f, setF] = useState(initial || emptyReview());
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [fotoViewer, setFotoViewer] = useState(false);

  useEffect(() => { if (initial) setF({ ...emptyReview(), ...initial }); }, [JSON.stringify(initial)]);

  // Camp nullable amb opció "Sense xinxeta"
  const NullSel = ({ lbl, field, opts }) => (
    <div style={{ marginBottom:12 }}>
      <label style={S.label}>{lbl}</label>
      <select value={f[field] != null ? f[field] : ""}
        onChange={e => set(field, e.target.value === "" ? null : isNaN(+e.target.value) ? e.target.value : +e.target.value)}
        style={{ ...S.input, background:"#100c00", color: f[field] == null ? "#5a4a2a" : "#fff" }}>
        <option value="">— Sense xinxeta —</option>
        {opts.map((o, i) => (
          <option key={i} value={typeof f[field] === "string" ? o : i}>{o}</option>
        ))}
      </select>
    </div>
  );

  const NullNum = ({ lbl, field, min, max }) => (
    <div style={{ marginBottom:12 }}>
      <label style={S.label}>{lbl}</label>
      <input type="number" min={min} max={max}
        value={f[field] != null ? f[field] : ""}
        placeholder="—"
        onChange={e => set(field, e.target.value === "" ? null : +e.target.value)}
        style={{ ...S.input, color: f[field] == null ? "#5a4a2a" : "#fff" }} />
    </div>
  );

  const NullSlider = ({ lbl, field, min, max, opts }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:"#d4a855", fontSize:11, fontWeight:700 }}>{lbl}</span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ color: f[field] == null ? "#5a4a2a" : "#f5c842", fontSize:12, fontWeight:600 }}>
            {f[field] != null ? (opts ? opts[f[field]] : f[field]) : "— Sense xinxeta —"}
          </span>
          {f[field] != null && (
            <button onClick={() => set(field, null)}
              style={{ background:"none", border:"none", color:"#5a4a2a", cursor:"pointer", fontSize:11, padding:0 }}>✕</button>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} value={f[field] != null ? f[field] : min}
        onChange={e => set(field, +e.target.value)}
        style={{ width:"100%", accentColor:"#f5c842", opacity: f[field] == null ? 0.3 : 1 }} />
      {opts && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
          <span style={{ color:"#5a4a2a", fontSize:9 }}>{opts[0]}</span>
          <span style={{ color:"#5a4a2a", fontSize:9 }}>{opts[opts.length-1]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Foto de referència */}
      {photoUrl && (
        <>
          {fotoViewer && <FotoViewer url={photoUrl} onClose={() => setFotoViewer(false)} />}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ color:"#d4a855", fontSize:11, fontWeight:700 }}>FOTO DE LA FITXA</span>
              <span style={{ color:"#5a4a2a", fontSize:10 }}>Toca per ampliar a pantalla completa</span>
            </div>
            <img src={photoUrl} alt="Fitxa"
              style={{ width:"100%", maxHeight:180, objectFit:"contain", borderRadius:8, border:"1px solid rgba(255,200,50,0.15)", background:"#0a0800", cursor:"zoom-in" }}
              onClick={() => setFotoViewer(true)} />
          </div>
        </>
      )}

      <div style={{ maxHeight: compact ? "none" : "60vh", overflowY: compact ? "visible" : "auto", paddingRight: compact ? 0 : 4 }}>
        {!compact && <h3 style={{ color:"#f5c842", margin:"0 0 14px", fontSize:15 }}>Revisio Arna #{arnaNumero}</h3>}
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>Data revisio</label>
          <input type="date" value={f.date} onChange={e => set("date", e.target.value)} style={S.input} />
        </div>
        <NullSlider lbl="Forca colonia" field="forcaColonia" min={0} max={4} opts={FORCE} />
        <NullSlider lbl="Pol.len"       field="pollen"       min={0} max={5} opts={POLLEN} />
        <NullSlider lbl="Agressivitat"  field="agressivitat" min={0} max={5} opts={AGRESS} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0 8px" }}>
          <NullNum lbl="Quadres mel"     field="quadresMel"     min={0} max={20} />
          <NullNum lbl="Quadres abelles" field="quadresAbelles" min={0} max={14} />
          <NullNum lbl="Quadres cria"    field="quadresCria"    min={0} max={14} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
          <NullNum lbl="Quadres buits"  field="quadresBuits"  min={0} max={14} />
          <NullNum lbl="Cel.les reials" field="cellesReials"  min={0} max={30} />
        </div>
        <NullSel lbl="Estat cria"   field="criaEstat"   opts={["Compacta","Pua","Dispersa"]} />
        <NullSel lbl="Estat reina"  field="estatReina"  opts={REINA} />
        <NullSel lbl="Any reina"    field="anyReina"    opts={REICOLOR} />
        <div style={{ background:"rgba(255,50,50,0.05)", border:"1px solid rgba(255,80,80,0.15)", borderRadius:10, padding:12, marginBottom:12 }}>
          <p style={{ color:"#ff8888", fontSize:11, fontWeight:700, margin:"0 0 10px" }}>VARROA</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Mes prova</label>
              <select value={f.varroaMes != null ? f.varroaMes : ""}
                onChange={e => set("varroaMes", e.target.value === "" ? null : +e.target.value)}
                style={{ ...S.input, background:"#100000", color: f.varroaMes == null ? "#5a4a2a" : "#fff" }}>
                <option value="">— Sense xinxeta —</option>
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <NullNum lbl="Dia prova" field="varroaDia" min={1} max={31} />
          </div>
          <NullSlider lbl="% Varroa" field="varroaPct" min={0} max={3} opts={["0-1%","2%","3%","Mes de 3%"]} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 8px" }}>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Mes tractament</label>
              <select value={f.tractamentMes != null ? f.tractamentMes : ""}
                onChange={e => set("tractamentMes", e.target.value === "" ? null : +e.target.value)}
                style={{ ...S.input, background:"#100000", color: f.tractamentMes == null ? "#5a4a2a" : "#fff" }}>
                <option value="">— Sense xinxeta —</option>
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <NullSel lbl="Tipus tractament" field="tipusTractament" opts={TRACTA} />
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Notes</label>
          <textarea value={f.notes} onChange={e => set("notes", e.target.value)}
            rows={2} style={{ ...S.input, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => onSave(f)} disabled={loading} style={{ ...S.btnPri, flex:1 }}>
            {loading ? "Guardant..." : (compact ? "Aplicar canvis" : "Guardar revisio")}
          </button>
          {onCancel && <button onClick={onCancel} style={S.btnGhost}>Cancel.lar</button>}
        </div>
      </div>
    </div>
  );
}

// ─── BULK PROCESSOR ───────────────────────────────────────────────────────────
function BulkProcessor({ apiariArnes, onComplete, onClose }) {
  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState("select");
  const [currentIdx, setCurrentIdx] = useState(0);

  const addFiles = files => {
    const news = Array.from(files).map(f => ({
      id: "img_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      file: f, preview: URL.createObjectURL(f),
      status: "pendent", result: null, formData: emptyReview(),
      mode: "auto", arnaId: null, arnaNum: null,
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
        const b64 = await toBase64(items[i].file);
        const result = await readFitxaAI(b64, items[i].file.type);
        if (result) {
          const matched = result.numero ? apiariArnes.find(a => a.numero === result.numero) : null;
          const { numero, ...rest } = result;
          setItems(p => p.map((it, idx) => idx === i ? {
            ...it, status:"fet", result,
            formData: { ...emptyReview(), ...rest },
            arnaId: matched?.id || null,
            arnaNum: numero || null,
            mode: matched ? "revision" : "nova",
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
    it.status === "fet" && it.mode !== "skip" && (it.arnaId || (it.mode === "nova" && it.arnaNum))
  ).length;

  const saveAll = () => onComplete(items.filter(it =>
    it.status === "fet" && it.mode !== "skip" && (it.arnaId || (it.mode === "nova" && it.arnaNum))
  ));

  const pct = items.length
    ? Math.round(items.filter(i => i.status==="fet"||i.status==="error").length / items.length * 100) : 0;

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
            <span style={{ fontSize:36 }}>📷</span><span style={{ fontWeight:700, fontSize:15 }}>Fer foto</span>
            <span style={{ fontSize:12, opacity:0.7 }}>Camera directa</span>
            <input type="file" accept="image/*" capture="environment"
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value=""; }}
              style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
          </div>
          <div style={{ position:"relative", ...S.btnGold, padding:"18px 12px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:6, borderRadius:8, overflow:"hidden" }}>
            <span style={{ fontSize:36 }}>🖼️</span><span style={{ fontWeight:700, fontSize:15 }}>Galeria</span>
            <span style={{ fontSize:12, opacity:0.7 }}>Selecciona multiples</span>
            <input type="file" accept="image/*" multiple
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value=""; }}
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
                    style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.75)", border:"none", borderRadius:"50%", color:"#fff", width:22, height:22, cursor:"pointer", fontSize:12, padding:0 }}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={processAll} style={{ ...S.btnPri, width:"100%", fontSize:15, padding:"14px" }}>
              Analitzar {items.length} {items.length===1?"foto":"fotos"} amb IA
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
          <div style={{ height:"100%", background:"linear-gradient(90deg,#f5c842,#d4a020)", borderRadius:8, width:pct+"%", transition:"width 0.5s" }} />
        </div>
        {items.map((it, i) => (
          <div key={it.id} style={{ ...S.card, marginBottom:8, display:"flex", alignItems:"center", gap:12, padding:12 }}>
            <img src={it.preview} alt="" style={{ width:52, height:52, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ color:"#f5e8a0", fontSize:13, fontWeight:600 }}>Foto {i+1}</div>
              <div style={{ fontSize:12, marginTop:2, color: it.status==="fet"?"#80c880":it.status==="error"?"#ff8888":it.status==="analitzant"?"#f5c842":"#5a4a2a" }}>
                {it.status==="pendent"?"Pendent":it.status==="analitzant"?"Analitzant...":it.status==="fet"?"Llegida correctament":"No s'ha pogut llegir"}
              </div>
              {it.status==="fet" && it.result?.numero && <div style={{ color:"#f5c842", fontSize:11 }}>Arna #{it.result.numero} detectada</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // FASE REVIEW — amb foto visible al costat del formulari
  return (
    <div style={{ ...S.page, position:"fixed", inset:0, zIndex:1000, overflowY:"auto", padding:"0 14px 40px" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <button onClick={() => setPhase("select")} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, color:"#f5c842", fontSize:19 }}>Repassa els resultats</h2>
            <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>{readyCount} entrades a guardar</p>
          </div>
          <button onClick={saveAll} disabled={readyCount===0} style={{ ...S.btnPri, opacity:readyCount===0?0.4:1 }}>Guardar</button>
        </div>

        {items.map((it, i) => (
          <div key={it.id} style={{ ...S.card, marginTop:14 }}>
            {/* Capçalera amb estat i mode */}
            <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ color:"#f5e8a0", fontWeight:700, fontSize:14 }}>Foto {i+1}</div>
                {it.status==="error"
                  ? <div style={{ color:"#ff8888", fontSize:12 }}>No s'ha pogut llegir — omple manualment</div>
                  : <div style={{ color:"#80c880", fontSize:12 }}>Llegida{it.result?.numero?" — Arna #"+it.result.numero:""}</div>
                }
              </div>
              <select value={it.mode}
                onChange={e => updateItem(it.id, { mode:e.target.value, arnaId:e.target.value==="nova"?null:it.arnaId })}
                style={{ ...S.input, width:"auto", fontSize:11, padding:"6px 8px", background:"#1a1400", flexShrink:0 }}>
                <option value="revision">Revisio</option>
                <option value="nova">Nova arna</option>
                <option value="skip">Saltar</option>
              </select>
            </div>

            {(it.status==="fet" || it.status==="error") && it.mode !== "skip" && (
              <div>
                {it.mode==="revision" ? (
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Assignar a l'arna</label>
                    <select value={it.arnaId||""}
                      onChange={e => updateItem(it.id, { arnaId:e.target.value||null })}
                      style={{ ...S.input, background:"#1a1400" }}>
                      <option value="">-- Selecciona arna --</option>
                      {apiariArnes.sort((a,b)=>a.numero-b.numero).map(a => (
                        <option key={a.id} value={a.id}>Arna #{a.numero}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ marginBottom:12 }}>
                    <label style={S.label}>Numero nova arna</label>
                    <input type="number" value={it.arnaNum||""}
                      onChange={e => updateItem(it.id, { arnaNum:+e.target.value })}
                      style={S.input} placeholder="Ex: 15" />
                  </div>
                )}

                {/* Formulari amb foto visible */}
                <details open>
                  <summary style={{ color:"#d4a855", fontSize:12, cursor:"pointer", fontWeight:600, padding:"6px 0" }}>
                    Revisar i editar les dades
                  </summary>
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,200,50,0.08)" }}>
                    <ReviewForm
                      arnaNumero={it.arnaNum || (apiariArnes.find(a=>a.id===it.arnaId)?.numero)}
                      initial={it.formData}
                      photoUrl={it.preview}
                      onSave={fd => updateItem(it.id, { formData:fd })}
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
        <button onClick={saveAll} disabled={readyCount===0}
          style={{ ...S.btnPri, width:"100%", marginTop:16, fontSize:15, padding:"14px", opacity:readyCount===0?0.4:1 }}>
          Guardar {readyCount} {readyCount===1?"entrada":"entrades"}
        </button>
      </div>
    </div>
  );
}

// ─── DETALL ARNA ──────────────────────────────────────────────────────────────
function ArnaDetail({ arna, revisions, onAddRevision, onBack }) {
  const [tab, setTab] = useState("resum");
  const [showForm, setShowForm] = useState(false);
  const [aiPrefill, setAiPrefill] = useState(null);
  const [aiLoad, setAiLoad] = useState(false);
  const [saveLoad, setSaveLoad] = useState(false);
  const [recs, setRecs] = useState("");
  const [recLoad, setRecLoad] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  const sorted = [...revisions].sort((a,b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length-1];

  const chartData = sorted.map(r => ({
    d: r.date.slice(5), forca:r.forcaColonia, mel:r.quadresMel,
    abelles:r.quadresAbelles, cria:r.quadresCria, varroa:r.varroaPct,
  }));

  const handlePhoto = async file => {
    if (!file) return;
    setAiLoad(true);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    const b64 = await toBase64(file);
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
    await onAddRevision({ ...data, arnaId:arna.id, id:"r_"+Date.now() });
    setShowForm(false); setAiPrefill(null); setPhotoUrl(null); setSaveLoad(false);
  };

  const demanarRecs = async () => {
    setRecLoad(true);
    const text = await getRecomanacions(sorted);
    setRecs(text); setRecLoad(false);
  };

  const T = t => ({
    padding:"8px 14px", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, fontSize:12,
    background: tab===t?"rgba(245,200,66,0.15)":"transparent",
    color: tab===t?"#f5c842":"#6b5a3a",
    borderBottom:"2px solid "+(tab===t?"#f5c842":"transparent"),
  });

  const valOr = (v, arr) => v != null && arr ? arr[v] : (v != null ? v : "—");

  return (
    <div style={S.page}>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"0 14px 40px" }}>
        <div style={{ padding:"18px 0 14px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,200,50,0.08)" }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#f5c842", cursor:"pointer", fontSize:22, padding:0 }}>←</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, color:"#f5c842", fontSize:20 }}>Arna #{arna.numero}</h2>
            <p style={{ margin:0, color:"#7a6040", fontSize:11 }}>Creada {arna.dataCreacio} · {revisions.length} revisions</p>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", margin:"14px 0 12px" }}>
          {aiLoad ? (
            <span style={{ color:"#f5c842", fontSize:13, alignSelf:"center" }}>Llegint fitxa amb IA...</span>
          ) : (
            <>
              <div style={{ position:"relative", ...S.btnBlue, display:"inline-flex", alignItems:"center", gap:6, overflow:"hidden" }}>
                📷 Fer foto
                <input type="file" accept="image/*" capture="environment"
                  onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); e.target.value=""; }}
                  style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", fontSize:0 }} />
              </div>
              <button onClick={() => { setAiPrefill(null); setPhotoUrl(null); setShowForm(true); }} style={S.btnGold}>
                ✍️ Manual
              </button>
            </>
          )}
        </div>

        {showForm ? (
          <div style={{ ...S.card, margin:"10px 0" }}>
            <ReviewForm
              arnaNumero={arna.numero}
              initial={aiPrefill}
              photoUrl={photoUrl}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setPhotoUrl(null); }}
              loading={saveLoad}
            />
          </div>
        ) : (
          <>
            <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.05)", marginBottom:14 }}>
              <button onClick={() => setTab("resum")} style={T("resum")}>Estat Actual</button>
              <button onClick={() => setTab("grafics")} style={T("grafics")}>Evolució</button>
              <button onClick={() => setTab("historic")} style={T("historic")}>Historial ({sorted.length})</button>
            </div>

            {tab==="resum" && (
              <div>
                {last ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div style={S.card}>
                        <div style={{ fontSize:11, color:"#7a6040" }}>FORÇA</div>
                        <div style={{ fontSize:18, fontWeight:700, color:"#f5c842", marginTop:2 }}>{valOr(last.forcaColonia, FORCE)}</div>
                      </div>
                      <div style={S.card}>
                        <div style={{ fontSize:11, color:"#7a6040" }}>REINA</div>
                        <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>{valOr(last.estatReina, REINA)}</div>
                        <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>Any: {valOr(last.anyReina, REICOLOR)}</div>
                      </div>
                    </div>
                    <div style={S.card}>
                      <div style={{ fontSize:12, color:"#d4a855", fontWeight:700, marginBottom:8 }}>RECOMPTE DE QUADRES</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, textAlign:"center" }}>
                        {[["🍯",last.quadresMel,"Mel"],["🐝",last.quadresAbelles,"Abelles"],["🥚",last.quadresCria,"Cria"],["🔲",last.quadresBuits,"Buits"]].map(([e,v,l]) => (
                          <div key={l} style={{ background:"rgba(0,0,0,0.15)", padding:8, borderRadius:6 }}>
                            <div style={{ fontSize:18 }}>{e}</div>
                            <div style={{ fontSize:14, fontWeight:700, color: v!=null?"#fff":"#5a4a2a" }}>{v!=null?v:"—"}</div>
                            <div style={{ fontSize:9, color:"#7a6040" }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:8, fontSize:12, color:"#aaa" }}>
                        Cria: <span style={{ color:"#fff" }}>{last.criaEstat||"—"}</span> · Cel·les Reials: <span style={{ color:"#fff" }}>{last.cellesReials!=null?last.cellesReials:"—"}</span>
                      </div>
                    </div>
                    <div style={{ ...S.card, border:"1px solid rgba(255,100,100,0.15)", background:"rgba(255,50,50,0.02)" }}>
                      <div style={{ fontSize:12, color:"#ff8888", fontWeight:700, marginBottom:4 }}>CONTROL SANITARI</div>
                      <div style={{ fontSize:13 }}>Nivell Varroa: <span style={{ fontWeight:700, color:"#fff" }}>{last.varroaPct!=null?["0-1%","2%","3%","Més de 3%"][last.varroaPct]:"—"}</span>
                        {last.varroaMes!=null && <span style={{ fontSize:11, color:"#7a6040" }}> ({MONTHS[last.varroaMes]} {last.varroaDia||""})</span>}
                      </div>
                      <div style={{ fontSize:13, marginTop:2 }}>Tractament: <span style={{ fontWeight:600, color:"#fff" }}>{last.tipusTractament!=null?TRACTA[last.tipusTractament]:"—"}</span>
                        {last.tractamentMes!=null && <span style={{ fontSize:11, color:"#7a6040" }}> ({MONTHS[last.tractamentMes]})</span>}
                      </div>
                    </div>
                    {last.notes && <div style={{ ...S.card, fontStyle:"italic", color:"#ccc", fontSize:14 }}>📌 <strong>Notes:</strong> {last.notes}</div>}
                    <div style={{ ...S.card, border:"1px solid rgba(245,200,66,0.2)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#f5c842" }}>💡 RECOMANACIONS IA</span>
                        <button onClick={demanarRecs} disabled={recLoad} style={{ ...S.btnGhost, padding:"4px 10px", fontSize:11 }}>
                          {recLoad?"Generant...":recs?"Actualitzar":"Consultar"}
                        </button>
                      </div>
                      {recs
                        ? <div style={{ fontSize:13, lineHeight:"1.5", color:"#e2d5bd", whiteSpace:"pre-wrap" }}>{recs}</div>
                        : <div style={{ fontSize:12, color:"#6b5a3a" }}>Prem per analitzar l'estat actual i rebre consells apícoles intel·ligents.</div>
                      }
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:30, color:"#6b5a3a" }}>Encara no hi ha cap revisió d'aquesta arna.</div>
                )}
              </div>
            )}

            {tab==="grafics" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {chartData.length > 1 ? (
                  <>
                    <div style={{ ...S.card, height:200 }}>
                      <div style={{ fontSize:11, color:"#d4a855", fontWeight:700, marginBottom:6 }}>POBLACIÓ I CRIA (Quadres)</div>
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="d" stroke="#6b5a3a" style={{ fontSize:10 }} />
                          <YAxis stroke="#6b5a3a" style={{ fontSize:10 }} />
                          <Tooltip contentStyle={{ background:"#1a1200", border:"1px solid #f5c842", fontSize:11 }} />
                          <Line type="monotone" dataKey="abelles" stroke="#88bbff" name="Abelles" strokeWidth={2} />
                          <Line type="monotone" dataKey="cria" stroke="#ff8888" name="Cria" strokeWidth={2} />
                          <Line type="monotone" dataKey="mel" stroke="#f5c842" name="Mel" strokeWidth={1.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ ...S.card, height:150 }}>
                      <div style={{ fontSize:11, color:"#ff8888", fontWeight:700, marginBottom:6 }}>EVOLUCIÓ INFESTACIÓ VARROA</div>
                      <ResponsiveContainer width="100%" height="80%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="d" stroke="#6b5a3a" style={{ fontSize:10 }} />
                          <YAxis stroke="#6b5a3a" style={{ fontSize:10 }} domain={[0,3]} ticks={[0,1,2,3]} />
                          <Tooltip contentStyle={{ background:"#1a1200", border:"1px solid #ff8888", fontSize:11 }} />
                          <Line type="monotone" dataKey="varroa" stroke="#ff4444" name="Varroa Index" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:30, color:"#6b5a3a" }}>Es necessiten com a mínim dues revisions per mostrar gràfics.</div>
                )}
              </div>
            )}

            {tab==="historic" && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...sorted].reverse().map(r => (
                  <div key={r.id} style={{ ...S.card, padding:12, background:"rgba(255,255,255,0.02)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.04)", paddingBottom:4, marginBottom:6 }}>
                      <span style={{ color:"#f5c842", fontWeight:700, fontSize:13 }}>{r.date}</span>
                      <span style={{ fontSize:12, color:"#aaa" }}>Força: {r.forcaColonia!=null?FORCE[r.forcaColonia]:"—"}</span>
                    </div>
                    <div style={{ fontSize:12, color:"#ccc" }}>
                      🍯 {r.quadresMel!=null?r.quadresMel:"—"}q mel · 🥚 {r.quadresCria!=null?r.quadresCria:"—"}q cria ({r.criaEstat||"—"}) · 🐝 {r.quadresAbelles!=null?r.quadresAbelles:"—"}q abelles
                    </div>
                    {r.notes && <div style={{ fontSize:11, color:"#7a6040", marginTop:4, fontStyle:"italic" }}>"{r.notes}"</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [apiaris, setApiaris] = useState([]);
  const [arnes, setArnes] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [selApiari, setSelApiari] = useState(null);
  const [selArna, setSelArna] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [newApiariNom, setNewApiariNom] = useState("");
  const [newApiariLat, setNewApiariLat] = useState("");
  const [newApiariLng, setNewApiariLng] = useState("");
  const [newArnaNum, setNewArnaNum] = useState("");

  useEffect(() => {
    async function init() {
      const ap = await load("apiaris"); if (ap) setApiaris(ap);
      const ar = await load("arnes"); if (ar) setArnes(ar);
      const re = await load("revisions"); if (re) setRevisions(re);
      setLoading(false);
    }
    init();
  }, []);

  const handleAddApiari = async () => {
    if (!newApiariNom.trim()) return;
    const item = { id:"ap_"+Date.now(), nom:newApiariNom, lat:newApiariLat||null, lng:newApiariLng||null, dataCreacio:new Date().toISOString().split("T")[0] };
    const updated = [...apiaris, item];
    setApiaris(updated); await save("apiaris", updated);
    setNewApiariNom(""); setNewApiariLat(""); setNewApiariLng("");
  };

  const handleAddArna = async () => {
    if (!newArnaNum || !selApiari) return;
    const num = parseInt(newArnaNum);
    if (arnes.some(a => a.apiariId===selApiari.id && a.numero===num)) { alert("Aquest número d'arna ja existeix."); return; }
    const item = { id:"ar_"+Date.now(), apiariId:selApiari.id, numero:num, dataCreacio:new Date().toISOString().split("T")[0] };
    const updated = [...arnes, item];
    setArnes(updated); await save("arnes", updated); setNewArnaNum("");
  };

  const handleAddRevision = async (revData) => {
    const updated = [...revisions, revData];
    setRevisions(updated); await save("revisions", updated);
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    if (type==="apiari") {
      const updatedAp = apiaris.filter(a=>a.id!==id);
      const updatedAr = arnes.filter(a=>a.apiariId!==id);
      setApiaris(updatedAp); setArnes(updatedAr);
      await save("apiaris",updatedAp); await save("arnes",updatedAr); setSelApiari(null);
    } else if (type==="arna") {
      const updatedAr = arnes.filter(a=>a.id!==id);
      const updatedRe = revisions.filter(r=>r.arnaId!==id);
      setArnes(updatedAr); setRevisions(updatedRe);
      await save("arnes",updatedAr); await save("revisions",updatedRe); setSelArna(null);
    }
    setConfirmDel(null);
  };

  const handleBulkComplete = async (itemsFet) => {
    if (!selApiari) return;
    let currentArnes = [...arnes];
    let currentRevisions = [...revisions];
    for (const it of itemsFet) {
      let targetArnaId = it.arnaId;
      if (it.mode==="nova" && it.arnaNum) {
        let existing = currentArnes.find(a=>a.apiariId===selApiari.id && a.numero===it.arnaNum);
        if (!existing) {
          const novaAr = { id:"ar_"+Date.now()+"_"+Math.random().toString(36).slice(2), apiariId:selApiari.id, numero:it.arnaNum, dataCreacio:new Date().toISOString().split("T")[0] };
          currentArnes.push(novaAr); targetArnaId = novaAr.id;
        } else { targetArnaId = existing.id; }
      }
      if (targetArnaId) {
        currentRevisions.push({ ...it.formData, arnaId:targetArnaId, id:"r_"+Date.now()+"_"+Math.random().toString(36).slice(2) });
      }
    }
    setArnes(currentArnes); setRevisions(currentRevisions);
    await save("arnes",currentArnes); await save("revisions",currentRevisions);
    setBulkOpen(false);
  };

  if (loading) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#f5c842", fontSize:18, fontWeight:700 }}>Carregant dades de l'apiari...</div>
    </div>
  );

  if (selArna) return (
    <ArnaDetail arna={selArna} revisions={revisions.filter(r=>r.arnaId===selArna.id)}
      onAddRevision={handleAddRevision} onBack={() => setSelArna(null)} />
  );

  const apiariArnes = arnes.filter(a => a.apiariId===selApiari?.id);

  return (
    <div style={S.page}>
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:14 }}>
          <div style={{ ...S.card, background:"#140f02", maxWidth:400, width:"100%", textAlign:"center" }}>
            <h4 style={{ color:"#ff8888", margin:"0 0 10px" }}>Confirmar eliminació</h4>
            <p style={{ fontSize:14, color:"#ccc", margin:"0 0 20px" }}>Estàs segur que vols eliminar <strong>{confirmDel.name}</strong>?</p>
            <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
              <button onClick={executeDelete} style={S.btnRed}>Eliminar absolutament</button>
              <button onClick={() => setConfirmDel(null)} style={S.btnGhost}>Cancel·lar</button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && selApiari && (
        <BulkProcessor apiariArnes={apiariArnes} onClose={() => setBulkOpen(false)} onComplete={handleBulkComplete} />
      )}

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, borderBottom:"1px solid rgba(255,200,50,0.1)", paddingBottom:12 }}>
          <div>
            <h1 style={{ color:"#f5c842", fontSize:24, margin:0 }}>🍯 CuidadorAbelles AI</h1>
            <p style={{ margin:2, color:"#7a6040", fontSize:12 }}>Gestió Digital i Reconeixement Automàtic de Fitxes</p>
          </div>
          {selApiari && <button onClick={() => setSelApiari(null)} style={S.btnGhost}>🔙 Apiaris</button>}
        </div>

        {!selApiari ? (
          <div>
            <div style={{ ...S.card, marginBottom:20 }}>
              <h3 style={{ color:"#f5c842", marginTop:0, marginBottom:12, fontSize:15 }}>Nou Apiari / Assentament</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <input type="text" placeholder="Nom de l'apiari (Ex: El Roure)" value={newApiariNom} onChange={e => setNewApiariNom(e.target.value)} style={S.input} />
                <LocationPicker lat={newApiariLat} lng={newApiariLng} onChange={(la,lo) => { setNewApiariLat(la); setNewApiariLng(lo); }} />
                <button onClick={handleAddApiari} style={{ ...S.btnPri, marginTop:4 }}>+ Crear Apiari</button>
              </div>
            </div>
            <h3 style={{ color:"#d4a855", fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:10 }}>ELS MEUS ASSENTAMENTS ({apiaris.length})</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {apiaris.map(ap => {
                const count = arnes.filter(a=>a.apiariId===ap.id).length;
                return (
                  <div key={ap.id} style={{ ...S.card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div onClick={() => setSelApiari(ap)} style={{ cursor:"pointer", flex:1 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:"#f5c842" }}>⛰️ {ap.nom}</div>
                      <div style={{ fontSize:12, color:"#7a6040", marginTop:2 }}>{count} {count===1?"arna registrada":"arnes registrades"} · {ap.dataCreacio}</div>
                    </div>
                    <button onClick={() => setConfirmDel({ type:"apiari", id:ap.id, name:"Apiari "+ap.nom })} style={{ background:"none", border:"none", color:"#6b3a3a", cursor:"pointer", fontSize:12 }}>Eliminar</button>
                  </div>
                );
              })}
              {apiaris.length===0 && <div style={{ textAlign:"center", padding:30, color:"#5a4a2a" }}>No s'ha definit cap apiari. Comença creant-ne un dalt.</div>}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ background:"rgba(245,200,66,0.02)", border:"1px solid rgba(245,200,66,0.08)", borderRadius:12, padding:14, marginBottom:18 }}>
              <h2 style={{ color:"#f5c842", margin:0, fontSize:20 }}>Apiari: {selApiari.nom}</h2>
              {selApiari.lat && selApiari.lng && <MeteoWidget lat={parseFloat(selApiari.lat)} lng={parseFloat(selApiari.lng)} />}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
              <button onClick={() => setBulkOpen(true)} style={{ ...S.btnBlue, padding:"14px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:22 }}>📸 Scan IA</span>
                <span style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>Escanejar fitxes massiu</span>
              </button>
              <div style={{ ...S.card, padding:10, display:"flex", flexDirection:"column", justifyContent:"center" }}>
                <div style={{ display:"flex", gap:6 }}>
                  <input type="number" placeholder="Núm. Arna" value={newArnaNum} onChange={e => setNewArnaNum(e.target.value)} style={{ ...S.input, padding:6, fontSize:14 }} />
                  <button onClick={handleAddArna} style={{ ...S.btnPri, padding:"6px 12px", fontSize:13 }}>+ Arna</button>
                </div>
              </div>
            </div>
            <h3 style={{ color:"#d4a855", fontSize:13, fontWeight:700, letterSpacing:1, marginBottom:10 }}>ARNES EN AQUEST ASSENTAMENT ({apiariArnes.length})</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
              {apiariArnes.sort((a,b)=>a.numero-b.numero).map(ar => {
                const arRevs = revisions.filter(r=>r.arnaId===ar.id).sort((a,b)=>a.date.localeCompare(b.date));
                const last = arRevs[arRevs.length-1];
                const alerta = last && (last.varroaPct>=2 || last.cellesReials>1 || last.forcaColonia<=1);
                return (
                  <div key={ar.id} style={{ ...S.card, textAlign:"center", position:"relative", border:alerta?"1px solid rgba(255,140,40,0.5)":S.card.border }}>
                    {alerta && <div style={{ position:"absolute", top:6, right:8, fontSize:13 }}>⚠️</div>}
                    <div onClick={() => setSelArna(ar)} style={{ cursor:"pointer", paddingBottom:6 }}>
                      <div style={{ fontSize:26, marginBottom:4 }}>🐝</div>
                      <div style={{ color:"#f5c842", fontWeight:700, fontSize:17 }}>#{ar.numero}</div>
                      {last ? (
                        <>
                          <div style={{ color:"#a0845c", fontSize:10, marginTop:3 }}>{last.forcaColonia!=null?FORCE[last.forcaColonia]:"—"}</div>
                          <div style={{ color:"#5a4a2a", fontSize:9 }}>{last.date}</div>
                        </>
                      ) : (
                        <div style={{ color:"#5a4a2a", fontSize:10, marginTop:4 }}>Sense revisió</div>
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
            {apiariArnes.length===0 && <div style={{ textAlign:"center", padding:40, color:"#5a4a2a" }}>No hi ha cap arna registrada. Pots crear-ne una manualment o escanejar una fitxa.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
