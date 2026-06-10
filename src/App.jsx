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
const FLORACIO= {0:"Avellaner, Ametller",1:"Frutals, Romaní",2:"Farigola, Cirest",3:"Flors bosc, Alfalfa",4:"Castanyer, Sàlvia",5:"Girasol, Lavanda",6:"Girasol tardà",7:"Estepa, Bruc",8:"Aladern, Heura",9:"Floracions residuals",10:"Gens, Hivernada",11:"Gens, Parada"};

const FITXA_PROMPT = 
  "Ets un expert apicultor i analitzador d'imatges d'alta precisió. " +
  "Estàs analitzant la foto d'una fitxa de plàstic blanc clavada a una arna de fusta. " +
  "Aquesta fitxa funciona com una quadrícula on es claven xinxetes de colors per marcar l'estat de la colònia.\n\n" +
  "INSTRUCCIONS DE RECONEIXEMENT:\n" +
  "1. Identifica el número de l'arna: Sol estar escrit a FEINA O RETOLADOR directament sobre el plàstic blanc o a la fusta del costat.\n" +
  "2. Identifica les xinxetes: Mira la posició de les xinxetes de colors (vermell, groc, blau, verd, blanc) dins els requadres o columnes escrites a la fitxa.\n" +
  "3. Interpreta els valors segons la posició de la xinxeta en cada línia o paràmetre (Força, Cria, Abelles, Mel, Varroa).\n\n" +
  "RETORNA EXCLUSIVAMENT un objecte JSON vàlid (sense markdown, sense blocs ```json, sense cap text extra). " +
  "Si no estàs segur d'un valor numèric, fes una estimació lògica segons la posició visual. Camps requerits:\n" +
  "{\n" +
  "  \"numero\": (enter, número de l'arna detectat a la imatge, o null si és il·legible),\n" +
  "  \"forcaColonia\": (enter de 0 a 4: 0=Molt feble, 1=Feble, 2=Normal, 3=Forta, 4=Molt forta),\n" +
  "  \"quadresMel\": (enter de 0 a 20),\n" +
  "  \"pollen\": (enter de 0 a 5: 0=Gens, 5=Moltíssim),\n" +
  "  \"quadresAbelles\": (enter de 0 a 14),\n" +
  "  \"quadresCria\": (enter de 0 to 10),\n" +
  "  \"criaEstat\": (text, exactament un d'aquests tres: \"Compacta\", \"Pua\" o \"Dispersa\"),\n" +
  "  \"estatReina\": (enter de 0 a 3: 0=Vista amb posta, 1=No vista posta, 2=Vista sense posta, 3=Ni vista ni posta),\n" +
  "  \"cellesReials\": (enter de 0 a 30),\n" +
  "  \"anyReina\": (enter de 0 a 9, color/número de l'any),\n" +
  "  \"varroaPct\": (enter de 0 a 3: 0=0-1%, 1=2%, 2=3%, 3=Més de 3%),\n" +
  "  \"tipusTractament\": (enter de 0 a 6: 0=Cap, 1=Varromed, 2=Oxàlic, 3=Apivar, 4=Apitraz, 5=Altres, 6=Nucli),\n" +
  "  \"quadresBuits\": (enter de 0 a 14),\n" +
  "  \"agressivitat\": (enter de 0 a 5)\n" +
  "}";

// ─── API WORKERS ──────────────────────────────────────────────────────────────
async function readFitxaAI(base64, mediaType) {
  try {
    console.log("Iniciant petició d'anàlisi de fitxa a través de Vercel...");
    
    // Truquem a la nostra pròpia API de Vercel de forma interna i segura
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64, mediaType })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error a la ruta de Vercel:", res.status, errText);
      return { numero: null, error: "El servidor ha fallat" };
    }

    const data = await res.json();
    console.log("Dades rebudes des de Vercel:", data);
    return data;

  } catch(err) { 
    console.error("Error crític en connectar amb el servidor:", err);
    return { numero: null, error: "Error de connexió de xarxa" }; 
  }
async function readFitxaAI(base64, mediaType) {
  try {
    console.log("Iniciant petició d'anàlisi de fitxa a través de Vercel...");
    
    // Truquem a la nostra pròpia API de Vercel de forma interna i segura
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64, mediaType })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error a la ruta de Vercel:", res.status, errText);
      return { numero: null, error: "El servidor ha fallat" };
    }

    const data = await res.json();
    console.log("Dades rebudes des de Vercel:", data);
    return data;

  } catch(err) { 
    console.error("Error crític en connectar amb el servidor:", err);
    return { numero: null, error: "Error de connexió de xarxa" }; 
  }
}
async function fetchMeteo() {
  try {
    const r = await fetch("[https://api.open-meteo.com/v1/forecast?latitude=42.0&longitude=2.5&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto](https://api.open-meteo.com/v1/forecast?latitude=42.0&longitude=2.5&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto)");
    return r.ok ? await r.json() : null;
  } catch(_) { return null; }
}

// ─── COMPONENT PRINCIPAL ──────────────────────────────────────────────────────
export default function App() {
  const [apiaris, setApiaris] = useState([]);
  const [arnes, setArnes] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [meteo, setMeteo] = useState(null);

  const [selApiari, setSelApiari] = useState(null);
  const [selArna, setSelArna] = useState(null);

  const [loading, setLoading] = useState(true);
  const [scanLog, setScanLog] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const fileInputRef = useRef(null);

  // Formularis modals o vistes de creació
  const [newApiName, setNewApiName] = useState("");
  const [newApiLoc, setNewApiLoc] = useState("");
  const [showAddApi, setShowAddApi] = useState(false);

  const [newArnaNum, setNewArnaNum] = useState("");
  const [showAddArna, setShowAddArna] = useState(false);

  const [editRev, setEditRev] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [a, b, c] = await Promise.all([
          _supa.from("apiaris").select("*"),
          _supa.from("arnes").select("*"),
          _supa.from("revisions").select("*").order("date", { ascending: false })
        ]);
        setApiaris(a.data || []);
        setArnes(b.data || []);
        setRevisions(c.data || []);
        const m = await fetchMeteo();
        if (m) setMeteo(m);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  const handleAddApiari = async () => {
    if (!newApiName.trim()) return;
    const { data } = await _supa.from("apiaris").insert([{ nom: newApiName, localitzacio: newApiLoc }]).select();
    if (data) { setApiaris([...apiaris, data[0]]); setNewApiName(""); setNewApiLoc(""); setShowAddApi(false); }
  };

  const handleAddArna = async () => {
    if (!newArnaNum || !selApiari) return;
    const num = parseInt(newArnaNum);
    const { data } = await _supa.from("arnes").insert([{ apiari_id: selApiari.id, numero: num }]).select();
    if (data) { setArnes([...arnes, data[0]]); setNewArnaNum(""); setShowAddArna(false); }
  };

  const handleSaveRevision = async (formData) => {
    if (!selArna) return;
    if (editRev?.id) {
      const { data } = await _supa.from("revisions").update(formData).eq("id", editRev.id).select();
      if (data) {
        setRevisions(revisions.map(r => r.id === editRev.id ? data[0] : r));
        setEditRev(null);
      }
    } else {
      const { data } = await _supa.from("revisions").insert([{ ...formData, arna_id: selArna.id }]).select();
      if (data) {
        setRevisions([data[0], ...revisions]);
        setEditRev(null);
      }
    }
  };

  const executeDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    if (type === "apiari") {
      await _supa.from("apiaris").delete().eq("id", id);
      setApiaris(apiaris.filter(x => x.id !== id));
      if (selApiari?.id === id) setSelApiari(null);
    } else if (type === "arna") {
      await _supa.from("arnes").delete().eq("id", id);
      setArnes(arnes.filter(x => x.id !== id));
      if (selArna?.id === id) setSelArna(null);
    } else if (type === "revisio") {
      await _supa.from("revisions").delete().eq("id", id);
      setRevisions(revisions.filter(x => x.id !== id));
    }
    setConfirmDel(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selApiari) return;
    setScanLog("Processant imatge de la fitxa...");
    
    const r = new FileReader();
    r.onloadend = async () => {
      const b64 = r.result.split(",")[1];
      setScanLog("Analitzant marques i xinxetes amb Claude AI...");
      const parsed = await readFitxaAI(b64, file.type);
      
      if (!parsed) {
        setScanLog("Error: No s'ha pogut desxifrar la fitxa. Comprova la llum o el prompt.");
        return;
      }

      let targetArna = arnes.find(a => a.apiari_id === selApiari.id && a.numero === parsed.numero);
      if (!targetArna && parsed.numero) {
        setScanLog(`Arna #${parsed.numero} no trobada. Creant-la automàticament...`);
        const { data } = await _supa.from("arnes").insert([{ apiari_id: selApiari.id, numero: parsed.numero }]).select();
        if (data) {
          targetArna = data[0];
          setArnes(prev => [...prev, data[0]]);
        }
      }

      if (!targetArna) {
        setScanLog("Error crític: No s'ha detectat cap número d'arna ni existia prèviament.");
        return;
      }

      setScanLog("Guardant revisió intel·ligent a la base de dades...");
      const revObj = {
        arna_id: targetArna.id,
        date: new Date().toISOString().split("T")[0],
        forcaColonia: parsed.forcaColonia ?? 2,
        quadresMel: parsed.quadresMel ?? 0,
        pollen: parsed.pollen ?? 0,
        quadresAbelles: parsed.quadresAbelles ?? 0,
        quadresCria: parsed.quadresCria ?? 0,
        criaEstat: parsed.criaEstat || "Compacta",
        estatReina: parsed.estatReina ?? 3,
        cellesReials: parsed.cellesReials ?? 0,
        anyReina: parsed.anyReina ?? 0,
        varroaPct: parsed.varroaPct ?? 0,
        tipusTractament: parsed.tipusTractament ?? 0,
        quadresBuits: parsed.quadresBuits ?? 0,
        agressivitat: parsed.agressivitat ?? 0,
        observacions: "Escanejat automàtic amb intel·ligència artificial."
      };

      const { data: nRev } = await _supa.from("revisions").insert([revObj).select();
      if (nRev) {
        setRevisions(prev => [nRev[0], ...prev]);
        setSelArna(targetArna);
        setScanLog(`✓ Fitxa de l'Arna #${targetArna.numero} carregada amb èxit!`);
      } else {
        setScanLog("Error en desar la revisió a Supabase.");
      }
    };
    r.readAsDataURL(file);
  };

  if (loading) return <div style={S.loading}>Carregant quadre d'apicultura... 🐝</div>;

  const currentMonth = new Date().getMonth();
  const arnesFiltrades = arnes.filter(a => a.apiari_id === selApiari?.id);
  const revsDeLArna = revisions.filter(r => r.arna_id === selArna?.id);

  return (
    <div style={S.app}>
      {/* HEADER */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ fontSize:32 }}>🐝</span>
          <div>
            <h1 style={S.title}>Apitrack Pro</h1>
            <p style={S.subtitle}>Gestió Apícola i Revisions Intel·ligents</p>
          </div>
        </div>
        {meteo && (
          <div style={S.meteoWidget}>
            <div style={{ fontSize:22 }}>☀️</div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{meteo.current.temperature_2m}°C</div>
              <div style={{ fontSize:10, color:"#a69b85" }}>Humitat: {meteo.current.relative_humidity_2m}%</div>
            </div>
          </div>
        )}
      </header>

      {/* BANNER FLORACIÓ */}
      <div style={S.floraBanner}>
        <span style={{ marginRight:8 }}>🌸</span>
        <strong>Floració estimada ({MONTHS[currentMonth]}):</strong> {FLORACIO[currentMonth] || "Sense dades"}
      </div>

      <div style={S.mainLayout}>
        {/* COLUMNA ESQUERRA: APIARIS */}
        <div style={S.sidebar}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Els teus Apiaris</h2>
            <button onClick={() => setShowAddApi(!showAddApi)} style={S.addBtn}>{showAddApi ? "Tancar" : "+ Nou"}</button>
          </div>

          {showAddApi && (
            <div style={S.miniForm}>
              <input value={newApiName} onChange={e => setNewApiName(e.target.value)} placeholder="Nom de l'apiari..." style={S.input}/>
              <input value={newApiLoc} onChange={e => setNewApiLoc(e.target.value)} placeholder="Ubicació / Coordenades..." style={S.input}/>
              <button onClick={handleAddApiari} style={S.submitBtn}>Guardar Apiari</button>
            </div>
          )}

          <div style={S.apiariList}>
            {apiaris.map(ap => (
              <div key={ap.id} style={{ ...S.apiariItem, ...(selApiari?.id === ap.id ? S.apiariItemActive : {}) }}>
                <div onClick={() => { setSelApiari(ap); setSelArna(null); }} style={{ flex:1, cursor:\"pointer\" }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>🏡 {ap.nom}</div>
                  <div style={{ fontSize:11, color: selApiari?.id === ap.id ? \"#fff\" : \"#8c826e\", marginTop:2 }}>{ap.localitzacio || "Sense ubicació"}</div>
                </div>
                <button onClick={() => setConfirmDel({ type:\"apiari\", id:ap.id, name:ap.nom })} style={S.delIcon}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA CENTRAL: ARNES D'AQUEST APIARI */}
        {selApiari && !selArna && (
          <div style={S.contentArea}>
            <div style={S.sectionHeader}>
              <div>
                <h2 style={S.sectionTitle}>Arnes de: <span style={{ color:\"#f5c842\" }}>{selApiari.nom}</span></h2>
                <p style={S.areaSubtitle}>{arnesFiltrades.length} caixes registrades en aquest assentament</p>
              </div>
              <div style={{ display:\"flex\", gap:8 }}>
                <button onClick={() => fileInputRef.current?.click()} style={S.scanBtn}>📷 Escanejar Fitxa</button>
                <button onClick={() => setShowAddArna(!showAddArna)} style={S.addBtn}>{showAddArna ? "Tancar" : "+ Nova Arna"}</button>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display:\"none\" }}/>
              </div>
            </div>

            {scanLog && <div style={S.logBanner}>{scanLog}</div>}

            {showAddArna && (
              <div style={{ ...S.miniForm, maxWidth:300, marginBottom:16 }}>
                <input type="number" value={newArnaNum} onChange={e => setNewArnaNum(e.target.value)} placeholder="Número de la caixa..." style={S.input}/>
                <button onClick={handleAddArna} style={S.submitBtn}>Afegeix Caixa</button>
              </div>
            )}

            <div style={S.arnesGrid}>
              {arnesFiltrades.map(ar => {
                const revs = revisions.filter(r => r.arna_id === ar.id);
                const last = revs[0];
                const alerta = last && (last.varroaPct > 1 || last.cellesReials > 3 || last.forcaColonia < 1);
                return (
                  <div key={ar.id} style={{ ...S.card, textAlign:\"center\", position:\"relative\", border: alerta ? \"1px solid rgba(255,140,40,0.5)\" : S.card.border }}>
                    {alerta && <div style={{ position:\"absolute\", top:6, right:8, fontSize:13 }}>⚠️</div>}
                    <div onClick={() => setSelArna(ar)} style={{ cursor:\"pointer\", paddingBottom:6 }}>
                      <div style={{ fontSize:26, marginBottom:4 }}>🐝</div>
                      <div style={{ color:\"#f5c842\", fontWeight:700, fontSize:17 }}>#{ar.numero}</div>
                      {last ? (
                        <>
                          <div style={{ color:\"#a0845c\", fontSize:10, marginTop:3 }}>{FORCE[last.forcaColonia]}</div>
                          <div style={{ color:\"#5a4a2a\", fontSize:9 }}>{last.date}</div>
                        </>
                      ) : (
                        <div style={{ color:\"#5a4a2a\", fontSize:10, marginTop:4 }}>Sense revisió</div>
                      )}
                    </div>
                    <button onClick={() => setConfirmDel({ type:\"arna\", id:ar.id, name:\"Arna #\"+ar.numero })} style={{ background:\"none\", border:\"none\", color:\"#6b3a3a\", cursor:\"pointer\", fontSize:11, padding:\"2px 0\" }}>
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETALL DE L'ARNA SELECCIONADA */}
        {selArna && (
          <div style={S.contentArea}>
            <div style={S.backNav} onClick={() => setSelArna(null)}>← Tornar a l'assentament {selApiari?.nom}</div>
            
            <div style={S.sectionHeader}>
              <div>
                <h2 style={{ ...S.sectionTitle, fontSize:26 }}>Arna <span style={{ color:\"#f5c842\" }}>#{selArna.numero}</span></h2>
                <p style={S.areaSubtitle}>Historial de tractaments, producció de mel i evolució</p>
              </div>
              <button onClick={() => setEditRev({})} style={S.scanBtn}>+ Nova Inspecció Manual</button>
            </div>

            {/* GRÀFIC D'EVOLUCIÓ */}
            {revsDeLArna.length > 0 && (
              <div style={S.chartContainer}>
                <h4 style={{ margin:\"0 0 10px 0\", color:\"#f5c842\", fontSize:13 }}>Evolució de Quadres de Cria i Abelles</h4>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={[...revsDeLArna].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2419" />
                    <XAxis dataKey="date" stroke="#8c826e" style={{ fontSize:10 }} />
                    <YAxis stroke="#8c826e" style={{ fontSize:10 }} />
                    <Tooltip contentStyle={{ background:\"#1e1911\", border:\"1px solid #3c3222\" }} />
                    <Line type="monotone" dataKey="quadresCria" name="Cria" stroke="#f5c842" strokeWidth={2} />
                    <Line type="monotone" dataKey="quadresAbelles" name="Abelles" stroke="#a69b85" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* LLISTAT DE REVISIONS */}
            <div style={{ display:\"flex\", flexDirection:\"column\", gap:12, marginTop:16 }}>
              {revsDeLArna.map(rv => (
                <div key={rv.id} style={S.revRow}>
                  <div style={S.revRowHeader}>
                    <div style={{ fontWeight:700, color:\"#f5c842\" }}>📅 {rv.date}</div>
                    <div style={{ display:\"flex\", gap:8 }}>
                      <button onClick={() => setEditRev(rv)} style={S.rowEditBtn}>Editar</button>
                      <button onClick={() => setConfirmDel({ type:\"revisio\", id:rv.id, name:\"Inspecció de \"+rv.date })} style={S.rowDelBtn}>✕</button>
                    </div>
                  </div>
                  <div style={S.revGridData}>
                    <div><strong>Força:</strong> {FORCE[rv.forcaColonia]}</div>
                    <div><strong>Mel:</strong> {rv.quadresMel} quadres</div>
                    <div><strong>Cria:</strong> {rv.quadresCria} ({rv.criaEstat})</div>
                    <div><strong>Abelles:</strong> {rv.quadresAbelles} quadres</div>
                    <div><strong>Reina:</strong> {REINA[rv.estatReina]} (Any {REICOLOR[rv.anyReina] || rv.anyReina})</div>
                    <div><strong>Varroa:</strong> Pct {rv.varroaPct}%</div>
                    <div><strong>Tractament:</strong> {TRACTA[rv.tipusTractament]}</div>
                    <div><strong>Agressivitat:</strong> {AGRESS[rv.agressivitat]}</div>
                  </div>
                  {rv.observacions && <div style={S.obsText}>📝 {rv.observacions}</div>}
                </div>
              ))}
              {revsDeLArna.length === 0 && <div style={{ color:\"#a69b85\", fontStyle:\"italic\" }}>No s'ha fet cap inspecció encara en aquesta caixa.</div>}
            </div>
          </div>
        )}
      </div>

      {/* DIÀLOG DE CONFIRMACIÓ DE BORRAT */}
      {confirmDel && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h3>Estàs segur d'eliminar?</h3>
            <p style={{ color:\"#a69b85\", margin:\"8px 0 20px 0\" }}>S'eliminarà permanentment: <strong>{confirmDel.name}</strong></p>
            <div style={{ display:\"flex\", justifyContent:\"flex-end\", gap:10 }}>
              <button onClick={() => setConfirmDel(null)} style={S.cancelBtn}>Cancel·lar</button>
              <button onClick={executeDelete} style={S.confirmDelBtn}>Eliminar del tot</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARI REVISIÓ (MANUAL O EDICIÓ) */}
      {editRev && (
        <RevisionModal rev={editRev} onClose={() => setEditRev(null)} onSave={handleSaveRevision} />
      )}
    </div>
  );
}

// ─── SUBCOMPONENT: MODAL DE REVISIÓ ──────────────────────────────────────────
function RevisionModal({ rev, onClose, onSave }) {
  const [f, setF] = useState({
    date: rev.date || new Date().toISOString().split("T")[0],
    forcaColonia: rev.forcaColonia ?? 2,
    quadresMel: rev.quadresMel ?? 0,
    pollen: rev.pollen ?? 0,
    quadresAbelles: rev.quadresAbelles ?? 0,
    quadresCria: rev.quadresCria ?? 0,
    criaEstat: rev.criaEstat || "Compacta",
    estatReina: rev.estatReina ?? 3,
    cellesReials: rev.cellesReials ?? 0,
    anyReina: rev.anyReina ?? 0,
    varroaPct: rev.varroaPct ?? 0,
    tipusTractament: rev.tipusTractament ?? 0,
    quadresBuits: rev.quadresBuits ?? 0,
    agressivitat: rev.agressivitat ?? 0,
    observacions: rev.observacions || ""
  });

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth:500, width:\"90%\", maxHeight:\"90vh\", overflowY:\"auto\" }}>
        <h3 style={{ marginBottom:16, color:\"#f5c842\" }}>{rev.id ? "Modificar Inspecció" : "Nova Inspecció Manual"}</h3>
        
        <div style={{ display:\"flex\", flexDirection:\"column\", gap:12 }}>
          <label style={S.label}>Data de la visita:
            <input type="date" value={f.date} onChange={e=>setF({...f, date:e.target.value})} style={S.input}/>
          </label>

          <div style={{ display:\"flex\", gap:10 }}>
            <label style={{ ...S.label, flex:1 }}>Força:
              <select value={f.forcaColonia} onChange={e=>setF({...f, forcaColonia:parseInt(e.target.value)})} style={S.input}>
                {FORCE.map((x,i)=><option key={i} value={i}>{x}</option>)}
              </select>
            </label>
            <label style={{ ...S.label, flex:1 }}>Agressivitat:
              <select value={f.agressivitat} onChange={e=>setF({...f, agressivitat:parseInt(e.target.value)})} style={S.input}>
                {AGRESS.map((x,i)=><option key={i} value={i}>{x}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display:\"flex\", gap:10 }}>
            <label style={{ ...S.label, flex:1 }}>Quadres Mel:
              <input type="number" value={f.quadresMel} onChange={e=>setF({...f, quadresMel:parseInt(e.target.value)||0})} style={S.input}/>
            </label>
            <label style={{ ...S.label, flex:1 }}>Quadres Abelles:
              <input type="number" value={f.quadresAbelles} onChange={e=>setF({...f, quadresAbelles:parseInt(e.target.value)||0})} style={S.input}/>
            </label>
          </div>

          <div style={{ display:\"flex\", gap:10 }}>
            <label style={{ ...S.label, flex:1 }}>Quadres Cria:
              <input type="number" value={f.quadresCria} onChange={e=>setF({...f, quadresCria:parseInt(e.target.value)||0})} style={S.input}/>
            </label>
            <label style={{ ...S.label, flex:1 }}>Estat de la Cria:
              <select value={f.criaEstat} onChange={e=>setF({...f, criaEstat:e.target.value})} style={S.input}>
                <option value="Compacta">Compacta</option>
                <option value="Pua">En Pua</option>
                <option value="Dispersa">Dispersa</option>
              </select>
            </label>
          </div>

          <div style={{ display:\"flex\", gap:10 }}>
            <label style={{ ...S.label, flex:1 }}>Reina:
              <select value={f.estatReina} onChange={e=>setF({...f, estatReina:parseInt(e.target.value)})} style={S.input}>
                {REINA.map((x,i)=><option key={i} value={i}>{x}</option>)}
              </select>
            </label>
            <label style={{ ...S.label, flex:1 }}>Any / Color Reina:
              <select value={f.anyReina} onChange={e=>setF({...f, anyReina:parseInt(e.target.value)})} style={S.input}>
                {REICOLOR.map((x,i)=><option key={i} value={i}>{x}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display:\"flex\", gap:10 }}>
            <label style={{ ...S.label, flex:1 }}>Varroa:
              <select value={f.varroaPct} onChange={e=>setF({...f, varroaPct:parseInt(e.target.value)})} style={S.input}>
                <option value={0}>0-1% (Sana)</option>
                <option value={1}>2% (Control)</option>
                <option value={2}>3% (Alerta)</option>
                <option value={3}}>&gt;3% (Perillós)</option>
              </select>
            </label>
            <label style={{ ...S.label, flex:1 }}>Tractament:
              <select value={f.tipusTractament} onChange={e=>setF({...f, tipusTractament:parseInt(e.target.value)})} style={S.input}>
                {TRACTA.map((x,i)=><option key={i} value={i}>{x}</option>)}
              </select>
            </label>
          </div>

          <label style={S.label}>Observacions generals:
            <textarea value={f.observacions} onChange={e=>setF({...f, observacions:e.target.value})} placeholder="Notes de salut, alimentació..." style={{ ...S.input, height:60, resize:\"none\" }}/>
          </label>
        </div>

        <div style={{ display:\"flex\", justifyContent:\"flex-end\", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={S.cancelBtn}>Tancar</button>
          <button onClick={() => onSave(f)} style={S.submitBtn}>Guardar Inspecció</button>
        </div>
      </div>
    </div>
  );
}

// ─── ESTILS EN JAVASCRIPT (THEME OBSIDIAN/APICULTURA) ───────────────────────
const S = {
  app: { backgroundColor: "#120f0a", color: "#e6decb", minHeight: "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#120f0a", color: "#f5c842", fontSize: 20, fontWeight: 600 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #2a2419", backgroundColor: "#1a150e" },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  title: { fontSize: 22, fontWeight: 800, color: "#f5c842", margin: 0 },
  subtitle: { fontSize: 12, color: "#a69b85", margin: "2px 0 0 0" },
  meteoWidget: { display: "flex", alignItems: "center", gap: 10, backgroundColor: "#231c12", padding: "6px 12px", borderRadius: 8, border: "1px solid #3c3222" },
  floraBanner: { backgroundColor: "#2d2415", padding: "10px 24px", fontSize: 13, borderBottom: "1px solid #3d311d", color: "#e6decb" },
  mainLayout: { display: "flex", minHeight: "calc(100vh - 130px)" },
  sidebar: { width: 280, borderRight: "1px solid #2a2419", backgroundColor: "#16120c", padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#e6decb", margin: 0 },
  areaSubtitle: { fontSize: 12, color: "#8c826e", margin: "2px 0 0 0" },
  addBtn: { background: "#f5c842", border: "none", color: "#120f0a", padding: "4px 10px", borderRadius: 4, fontWeight: 600, fontSize: 12, cursor: "pointer" },
  scanBtn: { background: "#4a8557", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 4, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  miniForm: { backgroundColor: "#231c12", padding: 12, borderRadius: 6, border: "1px solid #3c3222", display: "flex", flexDirection: "column", gap: 8 },
  input: { backgroundColor: "#120f0a", border: "1px solid #3c3222", color: "#e6decb", padding: "6px 8px", borderRadius: 4, fontSize: 13, width: "100%", boxSizing: "border-box" },
  submitBtn: { background: "#f5c842", border: "none", color: "#120f0a", padding: "6px", borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 4 },
  apiariList: { display: "flex", flexDirection: "column", gap: 8 },
  apiariItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 6, border: "1px solid #2a2419", backgroundColor: "#1d1710" },
  apiariItemActive: { backgroundColor: "#f5c842", borderColor: "#f5c842", color: "#120f0a" },
  delIcon: { background: "none", border: "none", color: "#6b3a3a", cursor: "pointer", fontSize: 12 },
  contentArea: { flex: 1, padding: 24, backgroundColor: "#120f0a" },
  logBanner: { backgroundColor: "#1e291e", border: "1px solid #2e4d32", color: "#8cd999", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 16 },
  arnesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 16, marginTop: 16 },
  card: { backgroundColor: "#1a150e", border: "1px solid #2a2419", borderRadius: 8, padding: 12, transition: "transform 0.15s" },
  backNav: { color: "#f5c842", fontSize: 13, cursor: "pointer", marginBottom: 16, fontWeight: 600 },
  chartContainer: { backgroundColor: "#1a150e", padding: 14, borderRadius: 8, border: "1px solid #2a2419", marginBottom: 20 },
  revRow: { backgroundColor: "#1a150e", border: "1px solid #2a2419", borderRadius: 8, padding: 14 },
  revRowHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2a2419", paddingBottom: 6, marginBottom: 10 },
  rowEditBtn: { background: "none", border: "none", color: "#a69b85", cursor: "pointer", fontSize: 12 },
  rowDelBtn: { background: "none", border: "none", color: "#6b3a3a", cursor: "pointer", fontSize: 13 },
  revGridData: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, fontSize: 13, color: "#cbd3c1" },
  obsText: { marginTop: 10, padding: "6px 10px", backgroundColor: "#231c12", borderRadius: 4, fontSize: 12, color: "#a69b85", fontStyle: "italic" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 },
  modal: { backgroundColor: "#1a150e", border: "1px solid #3c3222", borderRadius: 8, padding: 20, maxWidth: 400, width: "100%" },
  cancelBtn: { background: "none", border: "1px solid #3c3222", color: "#a69b85", padding: "6px 12px", borderRadius: 4, fontSize: 13, cursor: "pointer" },
  confirmDelBtn: { background: "#6b3a3a", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: 600 },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#a69b85", width: "100%" }
};
