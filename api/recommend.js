export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { lastRevision } = req.body || {};
  if (!lastRevision) return res.status(400).json({ ok: false, error: "Missing lastRevision" });

  const GEMINI_KEY = "AQ.Ab8RN6KR9-ve-P-tQurj0wX4a2VFbe5G7CIl5yQ2cVm9j1aTIA";
  const FORCE  = ["Molt feble","Feble","Normal","Forta","Molt forta"];
  const REINA  = ["Vista amb posta recent","No vista posta recent","Vista sense posta","Ni vista ni posta"];
  const TRACTA = ["Cap","Varromed","Oxalic sublimacio","Apivar","Apitraz","Altres","Mes nuclei sanitat"];
  const VARROA = ["0-1%","2%","3%","mes de 3%"];
  const r = lastRevision;

  const prompt =
    "Expert apicultor. Dona 3-4 recomanacions breus en catala per aquesta arna. " +
    "Revisio " + r.date + ". " +
    "Forca=" + FORCE[r.forcaColonia] + ", mel=" + r.quadresMel + "q, " +
    "abelles=" + r.quadresAbelles + "q, cria=" + r.quadresCria + "q " + r.criaEstat + ", " +
    "reina=" + REINA[r.estatReina] + ", celles reials=" + r.cellesReials + ", " +
    "varroa=" + VARROA[r.varroaPct] + ", tractament=" + TRACTA[r.tipusTractament] + ". " +
    "Format llista amb emojis.";

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_KEY;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ ok: true, text });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
