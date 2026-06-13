const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FITXA_COORDENADES = {
  page_size: { width: 842, height: 595 },
  label_zone_x_max: 0.107,
  rows: [
    { id:"ultima_revisio_dia", label:"Última revisió dia", y_center:0.0853, y_range:[0.0739,0.0958], type:"numeric",
      values:{"1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,"6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,"11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,"16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,"21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,"25":0.7397,"26":0.7656,"27":0.7916,"28":0.8175,"29":0.8435,"30":0.8694,"31":0.8954}
    },
    { id:"mes", label:"Mes", y_center:0.1377, y_range:[0.1143,0.1613], type:"categorical",
      values:{"Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,"Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,"Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008}
    },
    { id:"forca_colonia", label:"Força colònia", y_center:0.1902, y_range:[0.1681,0.2151], type:"scale",
      values:{"Molt feble":0.1818,"Feble":0.3375,"Normal":0.4932,"Forta":0.6489,"Molt forta":0.8046}
    },
    { id:"quadres_mel", label:"Quadres amb mel", y_center:0.2426, y_range:[0.2202,0.2672], type:"numeric",
      values:{"1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,"6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,"Més de 10":0.6489}
    },
    { id:"pollen", label:"Pol·len", y_center:0.2950, y_range:[0.2739,0.3193], type:"scale",
      values:{"Gens":0.1688,"Poc":0.2985,"Una mica":0.4283,"Pse":0.5581,"Bastant":0.6878,"Moltíssim":0.8176}
    },
    { id:"quadres_abelles", label:"Quadres amb abelles", y_center:0.3475, y_range:[0.3261,0.3832], type:"numeric",
      values:{"1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,"6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,"11":0.6489,"12":0.7008,"13":0.7527,"14":0.8046}
    },
    { id:"quadres_cria", label:"Quadres amb cria", y_center:0.3997, y_range:[0.3782,0.4252], type:"numeric_plus",
      values:{"1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,"6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,"Compacta":0.6619,"Pse":0.7398,"Dispersa":0.8435}
    },
    { id:"estat_reina", label:"Estat reina", y_center:0.4522, y_range:[0.4303,0.4773], type:"categorical",
      values:{"Vista amb posta recent":0.1687,"No vista / Posta recent":0.2985,"Vista sense posta":0.4283,"Ni vista ni posta":0.5581}
    },
    { id:"cel_les_reals", label:"Cel·les reals?", y_center:0.5046, y_range:[0.4824,0.5311], type:"numeric_plus",
      values:{"1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,"6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,"11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,"16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,"21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,"Més de 24":0.7398,"Als extrems dels quadres":0.7787,"A un sol quadre":0.8825}
    },
    { id:"any_reina", label:"Any reina", y_center:0.5571, y_range:[0.5345,0.5815], type:"categorical",
      values:{"0 Blau":0.1429,"1 Blanc":0.2207,"2 Groc":0.2985,"3 Vermell":0.3764,"4 Verd":0.4542,"5 Blau":0.5321,"6 Blanc":0.6100,"7 Groc":0.6878,"8 Vermell":0.7657,"9 Verd":0.8435}
    },
    { id:"varroa_mes_prova", label:"Varroa mes prova", y_center:0.6095, y_range:[0.5882,0.6336], type:"categorical",
      values:{"Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,"Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,"Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008}
    },
    { id:"varroa_dia_prova", label:"Varroa dia prova", y_center:0.6619, y_range:[0.6403,0.6857], type:"numeric",
      values:{"1":0.1169,"2":0.1428,"3":0.1688,"4":0.1947,"5":0.2207,"6":0.2466,"7":0.2726,"8":0.2985,"9":0.3245,"10":0.3504,"11":0.3764,"12":0.4023,"13":0.4283,"14":0.4542,"15":0.4802,"16":0.5061,"17":0.5321,"18":0.5580,"19":0.5840,"20":0.6099,"21":0.6359,"22":0.6618,"23":0.6878,"24":0.7137,"25":0.7397,"26":0.7656,"27":0.7916,"28":0.8175,"29":0.8435,"30":0.8694,"31":0.8954}
    },
    { id:"varroa_percentatge", label:"Varroa %", y_center:0.7144, y_range:[0.6924,0.7378], type:"scale",
      values:{"0 a 1%":0.1289,"2%":0.1948,"3%":0.2596,"Més de 3%":0.3115}
    },
    { id:"tractament_mes", label:"Tractament fet el mes", y_center:0.7668, y_range:[0.7445,0.8000], type:"categorical",
      values:{"Gener":0.1299,"Febrer":0.1817,"Març":0.2336,"Abril":0.2856,"Maig":0.3374,"Juny":0.3894,"Juliol":0.4413,"Agost":0.4932,"Setembre":0.5451,"Octubre":0.5970,"Novembre":0.6489,"Desembre":0.7008}
    },
    { id:"tipus_tractament", label:"Tipus de tractament", y_center:0.8192, y_range:[0.7966,0.8521], type:"categorical",
      values:{"Varromed":0.1558,"Oxàlic sublimat":0.2596,"Apivar":0.3635,"Apitraz":0.4673,"Altres":0.5711,"Més nucli sanitari":0.6748}
    },
    { id:"quadres_buits", label:"Quadres buits", y_center:0.8717, y_range:[0.8504,0.8975], type:"numeric",
      values:{"1":0.1298,"2":0.1818,"3":0.2337,"4":0.2856,"5":0.3375,"6":0.3894,"7":0.4413,"8":0.4932,"9":0.5451,"10":0.5970,"11":0.6489,"12":0.7008,"13":0.7527,"14":0.8046}
    },
    { id:"agressivitat", label:"Agressivitat", y_center:0.9241, y_range:[0.9025,0.9496], type:"scale",
      values:{"Calma total":0.1558,"La típica pesada i prou":0.2596,"Les guardianes":0.3635,"M'agobien":0.4672,"M'agobien molt":0.5710,"Uff marxo d'aquí":0.6749}
    }
  ]
};

const SYSTEM_PROMPT = `Ets un expert en apicultura analitzant fotos de fitxes d'arna amb xinxetes de colors.

DESCRIPCIÓ DE LA FITXA:
- Full de paper blanc A4 HORITZONTAL fixat a una arna de fusta.
- Té files horitzontals amb etiquetes a l'esquerra i opcions/números cap a la dreta.
- Les XINXETES (boletes de colors: vermell, groc, blau, verd, blanc, rosa, lila, taronja) marquen el valor seleccionat a cada fila.
- A dalt a l'esquerra: número d'arna (escrit gran a mà).
- A dalt a la dreta: codi REGA (format ES + números llargs).

ESTRATÈGIA DE LECTURA (usa la que funcioni millor per cada fila):

MÈTODE 1 — LECTURA DIRECTA DE TEXT:
Si pots llegir el text imprès a la fila, busca quina opció té una xinxeta al costat o a sobre.
Exemple: si a la fila "Mes" veus "Gener Febrer Març Abril Maig" i hi ha una xinxeta sobre "Març", el valor és "Març".

MÈTODE 2 — POSICIÓ RELATIVA:
Si el text és il·legible o borrós, localitza la xinxeta i estima la seva posició X relativa dins la fila (0.0=esquerra, 1.0=dreta del paper) i compara amb el mapa de coordenades.

MÈTODE 3 — INTUÏCIÓ APÍCOLA:
Si la foto és molt borrosa però pots veure aproximadament on és la xinxeta, fes una estimació raonable basada en la posició visual. És millor una estimació que null, però marca-ho a "incertesa".

REGLES:
- Si una fila no té cap xinxeta visible, posa null.
- Les xinxetes sobresurten del paper (relleu 3D) — busca les ombres circulars o els punts de color.
- El COLOR de la xinxeta NO importa, només la POSICIÓ.
- La foto pot estar en angle — normalitza mentalment respecte al rectangle blanc del paper.
- Per la fila "Quadres amb cria" pot haver-hi UNA xinxeta numèrica (1-10) I fins a dues xinxetes més a la part dreta (Compacta/Pse/Dispersa).

MAPA DE COORDENADES DE REFERÈNCIA:
${JSON.stringify(FITXA_COORDENADES, null, 2)}

Retorna ÚNICAMENT aquest JSON (sense markdown):
{
  "arna_numero": <enter o null>,
  "rega": <text o null>,
  "ultima_revisio_dia": <1-31 o null>,
  "mes": <"Gener"/"Febrer"/"Març"/"Abril"/"Maig"/"Juny"/"Juliol"/"Agost"/"Setembre"/"Octubre"/"Novembre"/"Desembre" o null>,
  "forca_colonia": <"Molt feble"/"Feble"/"Normal"/"Forta"/"Molt forta" o null>,
  "quadres_mel": <1-10, "Més de 10", o null>,
  "pollen": <"Gens"/"Poc"/"Una mica"/"Pse"/"Bastant"/"Moltíssim" o null>,
  "quadres_abelles": <1-14 o null>,
  "quadres_cria": <1-10 o null>,
  "cria_estat": <"Compacta"/"Pse"/"Dispersa" o null>,
  "estat_reina": <"Vista amb posta recent"/"No vista / Posta recent"/"Vista sense posta"/"Ni vista ni posta" o null>,
  "cel_les_reals": <1-24, "Més de 24", "Als extrems dels quadres", "A un sol quadre", o null>,
  "any_reina": <"0 Blau"/"1 Blanc"/"2 Groc"/"3 Vermell"/"4 Verd"/"5 Blau"/"6 Blanc"/"7 Groc"/"8 Vermell"/"9 Verd" o null>,
  "varroa_mes_prova": <mes o null>,
  "varroa_dia_prova": <1-31 o null>,
  "varroa_percentatge": <"0 a 1%"/"2%"/"3%"/"Més de 3%" o null>,
  "tractament_mes": <mes o null>,
  "tipus_tractament": <"Varromed"/"Oxàlic sublimat"/"Apivar"/"Apitraz"/"Altres" o null>,
  "nucli_sanitari": <true o false>,
  "quadres_buits": <1-14 o null>,
  "agressivitat": <"Calma total"/"La típica pesada i prou"/"Les guardianes"/"M'agobien"/"M'agobien molt"/"Uff marxo d'aquí" o null>,
  "incertesa": [<llista de camps on has fet estimació>]
}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Mètode no permès' });

  try {
    const { base64, mediaType, prompt_only, prompt } = req.body;

    if (prompt_only && prompt) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      });
      return res.status(200).json({ text: response.content.map(b=>b.text||"").join("") });
    }

    if (!base64 || !mediaType) return res.status(400).json({ error: 'Falten dades' });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Analitza aquesta fitxa d'arna. Usa tots els mètodes disponibles per llegir cada fila. Retorna el JSON." }
        ]
      }]
    });

    const text = response.content.map(b=>b.text||"").join("");
    const i = text.indexOf('{'), j = text.lastIndexOf('}');
    if (i===-1||j===-1) return res.status(500).json({ error: "JSON invàlid" });
    return res.status(200).json(JSON.parse(text.substring(i,j+1)));

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: 'Error intern', detall: error.message });
  }
};
