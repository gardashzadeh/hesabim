export const PROJECT_ID = "hesablar-1f9fc";
export const API_KEY = "AIzaSyAhGuZ-L8iZ5pRVD-446PI1_iJbPREvdLQ";
export const SITE = "https://hesablar.net";

export const BOT_RE = /googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|skypeuripreview|pinterest|applebot|petalbot|viber/i;

export function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

export function slugify(s){
  return String(s||"").toLowerCase()
    .replace(/ə/g,"e").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ü/g,"u")
    .replace(/ç/g,"c").replace(/ş/g,"s").replace(/ğ/g,"g")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
}

export async function fsQuery(structuredQuery){
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`,
    { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ structuredQuery }) }
  );
  if(!res.ok) throw new Error("Firestore " + res.status);
  const rows = await res.json();
  return rows.filter(r=>r.document).map(r=>fsDocToObj(r.document));
}

function fsDocToObj(d){
  const out = { _id: d.name.split("/").pop() };
  const f = d.fields || {};
  for(const k in f) out[k] = fsVal(f[k]);
  return out;
}

function fsVal(v){
  if("stringValue" in v) return v.stringValue;
  if("integerValue" in v) return Number(v.integerValue);
  if("doubleValue" in v) return v.doubleValue;
  if("booleanValue" in v) return v.booleanValue;
  if("timestampValue" in v) return v.timestampValue;
  if("nullValue" in v) return null;
  if("arrayValue" in v) return (v.arrayValue.values||[]).map(fsVal);
  if("mapValue" in v){ const o={}; const f=v.mapValue.fields||{}; for(const k in f) o[k]=fsVal(f[k]); return o; }
  return null;
}

export async function findAdByNumber(adNo){
  const base = { from:[{collectionId:"ads"}], limit:1 };
  let rows = await fsQuery({ ...base, where:{ fieldFilter:{ field:{fieldPath:"adNumber"}, op:"EQUAL", value:{ stringValue:String(adNo) } } } });
  if(!rows.length){
    rows = await fsQuery({ ...base, where:{ fieldFilter:{ field:{fieldPath:"adNumber"}, op:"EQUAL", value:{ integerValue:String(Number(adNo)) } } } });
  }
  return rows[0] || null;
}
