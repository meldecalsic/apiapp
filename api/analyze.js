import Anthropic from '@anthropic-ai/sdk';

// Vercel agafarà la clau directament d'aquí de forma segura i oculta
const anthropic = new Anthropic({
  apiKey: "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",
});

export default async function handler(req, res) {
  // Només acceptem peticions POST amb la imatge
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const { base64, mediaType } = req.body;

    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Falten les dades de la imatge' });
    }

    const FITXA_PROMPT = 
      "Ets un expert apicultor. Analitza la foto d'una fitxa de plàstic blanc clavada a una arna. " +
      "Retorna EXCLUSIVAMENT un objecte JSON vàlid amb els camps de la fitxa (numero, forcaColonia, quadresMel, pollen, quadresAbelles, quadresCria, criaEstat, estatReina, cellesReials, anyReina, varroaPct, tipusTractament, quadresBuits, agressivitat).";

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: FITXA_PROMPT }
        ]
      }]
    });

    const text = response.content.map(b => b.text || "").join("");
    const netejat = text.replace(/```json|```/g, "").trim();
    
    // Tornem les dades llegides per Claude a l'App.jsx
    return res.status(200).json(JSON.parse(netejat));

  } catch (error) {
    console.error("Error al servidor Vercel:", error);
    return res.status(500).json({ error: 'Error intern processant la fitxa' });
  }
}
