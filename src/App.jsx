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
  "tipusTractament (0=cap, 1=varromed, 2=oxalic, 3
