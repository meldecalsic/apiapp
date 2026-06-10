import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: "sk-ant-api03-P3F6zWbEa_Y2P-L8fM6dK9qXvR2tH5yN1wU7jC4mS9bA3vZ5gQ2lEpluelIuIZgf_REAL_KEY_HERE",
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const { base64, mediaType } = req.body;

    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Falten les dades de la imatge' });
    }

    // PROMPT OPTIMITZAT PER A FOTOS DOLENTES O AMB OMBRES
    const FITXA_PROMPT = 
      "Ets un expert apicultor. Analitzes la foto d'una fitxa de plàstic blanc clavada a una arna de fusta. " +
      "La foto pot tenir mala qualitat, ombres o estar borrosa. Fes el teu millor esforç per guiar-te per la posició visual de les xinxetes.\n\n" +
      "NORMES STRICTES DE RETORN:\n" +
      "1. Retorna EXCLUSIVAMENT un objecte JSON. Sense text abans ni després.\n" +
      "2. Si el número d'arna no es veu bé o està borrós, posa null. No t'ho inventis.\n" +
      "3. Si un paràmetre (forcaColonia, quadresMel, etc.) no es distingeix per la mala qualitat, posa un valor per defecte lògic (com 0 o 2) o mantén l'estructura, però MAI deixis de retornar el JSON.\n\n" +
      "Format requerit:\n" +
      "{\n" +
      "  \"numero\": null,\n" +
      "  \"forcaColonia\": 2,\n" +
      "  \"quadresMel\": 0,\n" +
      "  \"pollen\": 0,\n" +
      "  \"quadresAbelles\": 0,\n" +
      "  \"quadresCria\": 0,\n" +
      "  \"criaEstat\": \"Compacta\",\n" +
      "  \"estatReina\": 3,\n" +
      "  \"cellesReials\": 0,\n" +
      "  \"anyReina\": 0,\n" +
      "  \"varroaPct\": 0,\n" +
      "  \"tipusTractament\": 0,\n" +
      "  \"quadresBuits\": 0,\n" +
      "  \"agressivitat\": 0\n" +
      "}";

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: FITXA_PROMPT }
        ]
      }]
    });

    const text = response.content.map(b => b.text || "").join("");
    
    // Neteja extrema per si Claude afegeix text explicatiu per culpa de la mala qualitat de la foto
    const iniciJSON = text.indexOf('{');
    const finalJSON = text.lastIndexOf('}');
    
    if (iniciJSON === -1 || finalJSON === -1) {
      return res.status(500).json({ error: "La IA no ha pogut estructurar les dades de la foto dolenta" });
    }
    
    const jsonNet = text.substring(iniciJSON, finalJSON + 1);
    return res.status(200).json(JSON.parse(jsonNet));

  } catch (error) {
    console.error("Error al servidor Vercel:", error);
    return res.status(500).json({ error: 'Error intern al servidor' });
  }
}
