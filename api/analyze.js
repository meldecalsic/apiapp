export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { base64, mediaType } = req.body || {};
  if (!base64 || !mediaType) return res.status(400).json({ ok: false, error: "Missing params" });

  const GEMINI_KEY = "AQ.Ab8RN6KR9-ve-P-tQurj0wX4a2VFbe5G7CIl5yQ2cVm9j1aTIA";
  const prompt =
    "Ets un expert apicultor. Analitza la foto d'aquesta fitxa d'arna amb xinxetes de colors. " +
    "Retorna NOMES un objecte JSON valid amb els camps: " +
    "numero (enter, numero de l'arna o null), " +
    "forcaColonia (0 molt feble a 4 molt forta), " +
    "quadresMel (0-20), pollen (0 gens a 5 moltissim), " +
    "quadresAbelles (0-14), quadresCria (0-10), " +
    "criaEstat (exactament Compacta o Pua o Dispersa), " +
    "estatReina (0 vista amb posta, 1 no vista posta, 2 vista sense posta, 3 ni vista ni posta), " +
    "cellesReials (0-30), anyReina (0-9), " +
    "varroaPct (0 per 0-1pct, 1 per 2pct, 2 per 3pct, 3 per mes de 3pct), " +
    "tipusTractament (0 cap, 1 varromed, 2 oxalic, 3 apivar, 4 apitraz, 5 altres, 6 nuclei), " +
    "quadresBuits (0-14), agressivitat (0 calma total a 5 marxo). " +
    "Nomes el JSON, sense markdown ni explicacions.";

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_KEY;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: base64 } },
            { text: prompt }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json({ ok: true, data: parsed });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
