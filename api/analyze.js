const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // ⚠️ MAI posar la key aquí directament
});

// ─────────────────────────────────────────────────────────────────────────────
// MAPA DE COORDENADES DE LA FITXA
// Extret del PDF original: plantilla_arna_xinxetes_full_calcul.pdf
// Coordenades normalitzades (0.0–1.0) respecte la pàgina A4 apaïsat (842×595)
// Cada valor té la seva posició X exacta. La IA NO ha de llegir text de la fitxa.
// ─────────────────────────────────────────────────────────────────────────────
const FITXA_COORDENADES = {
  page_size: { width: 842, height: 595 },
  label_zone_x_max: 0.107,
  rows: [
    {
      id: "ultima_revisio_dia",
      label: "Última revisió dia",
      y_center: 0.0853, y_range: [0.0739, 0.0958],
      type: "numeric",
      values: {
        "1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,
        "6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,
        "11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,
        "16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,
        "21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,"25":0.7397,
        "26":0.7656,"27":0.7916,"28":0.8175,"29":0.8435,"30":0.8694,"31":0.8954
      }
    },
    {
      id: "mes",
      label: "Mes",
      y_center: 0.1377, y_range: [0.1143, 0.1613],
      type: "categorical",
      values: {
        "Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,
        "Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,
        "Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008
      }
    },
    {
      id: "forca_colonia",
      label: "Força colònia",
      y_center: 0.1902, y_range: [0.1681, 0.2151],
      type: "scale",
      values: {
        "Molt feble":0.1818,"Feble":0.3375,"Normal":0.4932,
        "Forta":0.6489,"Molt forta":0.8046
      }
    },
    {
      id: "quadres_mel",
      label: "Quadres amb mel",
      y_center: 0.2426, y_range: [0.2202, 0.2672],
      type: "numeric",
      values: {
        "1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,
        "6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,
        "Més de 10":0.6489
      }
    },
    {
      id: "pollen",
      label: "Pol·len",
      y_center: 0.2950, y_range: [0.2739, 0.3193],
      type: "scale",
      values: {
        "Gens":0.1688,"Poc":0.2985,"Una mica":0.4283,
        "Pse":0.5581,"Bastant":0.6878,"Moltíssim":0.8176
      }
    },
    {
      id: "quadres_abelles",
      label: "Quadres amb abelles",
      y_center: 0.3475, y_range: [0.3261, 0.3832],
      type: "numeric",
      values: {
        "1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,
        "6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,
        "11":0.6489,"12":0.7008,"13":0.7527,"14":0.8046
      }
    },
    {
      id: "quadres_cria",
      label: "Quadres amb cria",
      y_center: 0.3997, y_range: [0.3782, 0.4252],
      type: "numeric_plus",
      values: {
        "1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,
        "6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,
        "Compacta":0.6619,"Pse":0.7398,"Dispersa":0.8435
      }
    },
    {
      id: "estat_reina",
      label: "Estat reina",
      y_center: 0.4522, y_range: [0.4303, 0.4773],
      type: "categorical",
      values: {
        "Vista amb posta recent":0.1687,
        "No vista / Posta recent":0.2985,
        "Vista sense posta":0.4283,
        "Ni vista ni posta":0.5581
      }
    },
    {
      id: "cel_les_reals",
      label: "Cel·les reals?",
      y_center: 0.5046, y_range: [0.4824, 0.5311],
      type: "numeric_plus",
      values: {
        "1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,
        "6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,
        "11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,
        "16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,
        "21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,
        "Més al mig dels quadres":0.7398,
        "Als extrems dels quadres":0.7787,
        "A un sol quadre":0.8825
      }
    },
    {
      id: "any_reina",
      label: "Any reina",
      y_center: 0.5571, y_range: [0.5345, 0.5815],
      type: "categorical",
      values: {
        "0 Blau":0.1429,"1 Blanc":0.2207,"2 Groc":0.2985,
        "3 Vermell":0.3764,"4 Verd":0.4542,"5 Blau":0.5321,
        "6 Blanc":0.6100,"7 Groc":0.6878,"8 Vermell":0.7657,"9 Verd":0.8435
      }
    },
    {
      id: "varroa_mes_prova",
      label: "Varroa mes prova",
      y_center: 0.6095, y_range: [0.5882, 0.6336],
      type: "categorical",
      values: {
        "Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,
        "Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,
        "Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008
      }
    },
    {
      id: "varroa_dia_prova",
      label: "Varroa dia prova",
      y_center: 0.6619, y_range: [0.6403, 0.6857],
      type: "numeric",
      values: {
        "1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,
        "6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,
        "11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,
        "16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,
        "21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,"25":0.7397,
        "26":0.7656,"27":0.7916,"28":0.8175,"29":0.8435,"30":0.8694,"31":0.8954
      }
    },
    {
      id: "varroa_percentatge",
      label: "Varroa %",
      y_center: 0.7144, y_range: [0.6924, 0.7378],
      type: "scale",
      values: {
        "0 a 1%":0.1289,"2%":0.1948,"3%":0.2596,"Més de 3%":0.3115
      }
    },
    {
      id: "tractament_mes",
      label: "Tractament fet el mes",
      y_center: 0.7668, y_range: [0.7445, 0.8000],
      type: "categorical",
      values: {
        "Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,
        "Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,
        "Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008
      }
    },
    {
      id: "tipus_tractament",
      label: "Tipus de tractament",
      y_center: 0.8192, y_range: [0.7966, 0.8521],
      type: "categorical",
      values: {
        "Varromed":0.1558,"Oxàlic sublimat":0.2596,"Apivar":0.3635,
        "Apitraz":0.4673,"Altres":0.5711,"Més nucli sanitari":0.6748
      }
    },
    {
      id: "quadres_buits",
      label: "Quadres buits",
      y_center: 0.8717, y_range: [0.8504, 0.8975],
      type: "numeric",
      values: {
        "1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,
        "6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,
        "11":0.6489,"12":0.7008,"13":0.7527,"14":0.8046
      }
    },
    {
      id: "agressivitat",
      label: "Agressivitat",
      y_center: 0.9241, y_range: [0.9025, 0.9496],
      type: "scale",
      values: {
        "Calma total":0.1558,"La típica pesada i prou":0.2596,
        "Les guardianes":0.3635,"M'agobien":0.4672,
        "M'agobien molt":0.5710,"Uff marxo d'aquí":0.6749
      }
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ets un sistema d'anàlisi visual especialitzat en fitxes d'apicultura.

La fitxa té coordenades normalitzades (0.0–1.0) per cada fila i valor. Te les proporciono a continuació.

TASCA:
1. Llegeix el NÚMERO D'ARNA — és l'únic text que has de reconèixer. Es troba a dalt a l'esquerra al costat de "Arna numero". Pot ser un número escrit a mà o imprès.
2. Per a la resta de camps: localitza cada xinxeta per la seva posició visual (y = quina fila, x = quin valor dins la fila). NO llegeixis el text de la fitxa — usa les coordenades del JSON.
3. Tolerància: ±0.03 en x per files numèriques denses (dies 1–31), ±0.06 per files categòriques.
4. Si no veus cap xinxeta en una fila, posa null.
5. Si la foto és borrosa en alguna zona, posa null per aquells camps i inclou-los a "incertesa".

MAPA DE COORDENADES:
${JSON.stringify(FITXA_COORDENADES, null, 2)}

Retorna ÚNICAMENT aquest JSON (sense text addicional):
{
  "arna_numero": <enter o null>,
  "ultima_revisio_dia": <1-31 o null>,
  "mes": <"Gener"/"Febrer"/"Març"/"Abril"/"Maig"/"Juny"/"Juliol"/"Agost"/"Setembre"/"Octubre"/"Novembre"/"Desembre" o null>,
  "forca_colonia": <"Molt feble"/"Feble"/"Normal"/"Forta"/"Molt forta" o null>,
  "quadres_mel": <1-10, "Més de 10", o null>,
  "pollen": <"Gens"/"Poc"/"Una mica"/"Pse"/"Bastant"/"Moltíssim" o null>,
  "quadres_abelles": <1-14 o null>,
  "quadres_cria": <1-10, "Compacta", "Pse", "Dispersa", o null>,
  "estat_reina": <"Vista amb posta recent"/"No vista / Posta recent"/"Vista sense posta"/"Ni vista ni posta" o null>,
  "cel_les_reals": <1-24, "Més al mig dels quadres", "Als extrems dels quadres", "A un sol quadre", o null>,
  "any_reina": <"0 Blau"/"1 Blanc"/"2 Groc"/"3 Vermell"/"4 Verd"/"5 Blau"/"6 Blanc"/"7 Groc"/"8 Vermell"/"9 Verd" o null>,
  "varroa_mes_prova": <mes o null>,
  "varroa_dia_prova": <1-31 o null>,
  "varroa_percentatge": <"0 a 1%"/"2%"/"3%"/"Més de 3%" o null>,
  "tractament_mes": <mes o null>,
  "tipus_tractament": <"Varromed"/"Oxàlic sublimat"/"Apivar"/"Apitraz"/"Altres"/"Més nucli sanitari" o null>,
  "quadres_buits": <1-14 o null>,
  "agressivitat": <"Calma total"/"La típica pesada i prou"/"Les guardianes"/"M'agobien"/"M'agobien molt"/"Uff marxo d'aquí" o null>,
  "incertesa": []
}`;

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  try {
    const { base64, mediaType } = req.body;
    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Falten les dades de la imatge' });
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 }
          },
          {
            type: "text",
            text: "Analitza aquesta fitxa d'arna i retorna el JSON amb totes les dades."
          }
        ]
      }]
    });

    const text = response.content.map(b => b.text || "").join("");

    const iniciJSON = text.indexOf('{');
    const finalJSON = text.lastIndexOf('}');

    if (iniciJSON === -1 || finalJSON === -1) {
      return res.status(500).json({ error: "La IA no ha retornat un JSON vàlid" });
    }

    const jsonNet = text.substring(iniciJSON, finalJSON + 1);
    return res.status(200).json(JSON.parse(jsonNet));

  } catch (error) {
    console.error("Error al servidor Vercel:", error);
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    return res.status(500).json({ 
      error: 'Error intern al servidor',
      detall: error.message
    });
  }
}
