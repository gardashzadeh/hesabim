let cart = JSON.parse(localStorage.getItem("gs_cart") || "[]");
let currentCategory = "Hamısı";
let currentSort = "newest";
window.approvedFirestoreAds = [];

const LOGO_URLS = {
  pubg:       "https://cdn.simpleicons.org/pubg/F2A900",
  valorant:   "https://cdn.simpleicons.org/valorant/FF4655",
  lol:        "https://cdn.simpleicons.org/leagueoflegends/C89B3C",
  freefire:  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDQ4IDQ4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjRkY2QjAwIi8+CjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICBkPSJNMTkuOTI5OSwyOS44NTQxbC0yLjI2MTEsLjc1OTJNMTkuOTg3OSwyNy40MDIxbC0yLjI2MTEsLjc1OTJNMTkuODA2OSwyNC45ODQxbC0yLjI2MTEsLjc1OTJNMTkuNzc4OSwyMi41NjcybC0yLjI2MTEsLjc1OTJNMjAuMTE1OSw0My4zMjU5di05LjA1MzVjLTEuMzk1My0uMjg3Ny0yLjU2MDQtLjg2MjYtMy4zMzY1LTEuOTIyOWgzLjMzNjV2LTEyLjUyNzhjLS43NzE4LC41MDE5LTEuMTEyNywuNzE2Mi0yLjU3MzEsLjk0MzEtLjI2OTgtNi4zNjQ3LS4yNzQzLTEyLjE3MTgsNS44Mjg5LTE2LjI2NDgsLjYwNzcsMi44MzQzLDIuMTQ2Nyw2LjM1Niw0LjM2MDQsOS4xNjk2djE4Ljc0NThoMy40ODg0Yy0uNDkzMSwuODE1OC0xLjUyMjgsMi4wNTMxLTMuNTA0MiwyLjAxOTV2OS4wNjUyIi8+Cjwvc3ZnPg==",
  csgo:       "https://cdn.simpleicons.org/counterstrike/DE9B35",
  googleplay: "https://cdn.simpleicons.org/googleplay/34A853",
  apple:      "https://cdn.simpleicons.org/appstore/007AFF",
  steam:      "https://cdn.simpleicons.org/steam/66C0F4",
  riot:       "https://cdn.simpleicons.org/riotgames/D32936",
  fortnite:  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjAiIGZpbGw9IiMwMDBEMUEiLz4KPHBhdGggZD0iTTEyMS42MiA1Ni4xNUg5OC44NXYxNy4wOGw1LjY5IDUuNjloMTcuMDh2MjguNDZIOTguODV2NTEuMjRsLTI4LjQ3IDUuNjlWMjcuNjloNTYuOTNaIgogIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwRDRGRiIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxMiIvPgo8cGF0aCBkPSJtMjIgMzMuMzggOC41NCAyOC40N0wyMiAxNTIuOTJsNDguMzktOC4wOFYzMy4zOEgyMnptMTQyLjMxIDI4LjQ3TDE3MCAzMy4zOGgtNDMuODNsLTQuNTYgMjIuNzdIOTguODV2MTcuMDhsNS42OSA1LjY5aDE3LjA3djI4LjQ3SDk4Ljg1djM0Ljc3bDcxLjE1IDUuMDctNS42OS04NS4zOHoiCiAgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBENEZGIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEyIi8+Cjwvc3ZnPg==",
  epicgames:  "https://cdn.simpleicons.org/epicgames/2ECC71",
  roblox:     "https://cdn.simpleicons.org/roblox/E8392A",
  minecraft:  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTUlIiBmaWxsPSIjMWExYTFhIi8+CjxnIGlkPSJhIiB0cmFuc2Zvcm09Im1hdHJpeCgxOSAxMSAwIDIyIDc2IDE0MikiPgo8cGF0aCBmaWxsPSIjNDMyIiBkPSJNLjUuNWg5djloLTkiLz4KPHBhdGggc3Ryb2tlPSIjODY0IiBkPSJNMiA4djFoMlY4aDVWNyBIN1Y1Ii8+CjxwYXRoIHN0cm9rZT0iI2M4YTA2MCIgZD0iTTEgNXpNMiA5ek0xIDhWN2gyVjZoMU01IDloMlY4SDZWNE03IDZoMXYxTTkgOXpNOSA0djEiLz4KPHBhdGggc3Ryb2tlPSIjZDRhODcwIiBkPSJNMSA3aDFNNCA3aDFNOSA2eiIvPgo8cGF0aCBzdHJva2U9IiM4ODgiIGQ9Ik01IDV6Ii8+CjxwYXRoIHN0cm9rZT0iIzZkYjMzZiIgZD0iTTQgNFYxaDR2Mkg3VjJINHYxSDJ2MSIvPgo8cGF0aCBzdHJva2U9IiM4MGMwNTAiIGQ9Ik0yIDFoMU02IDF6TTcgMnpNOSAxdjEiLz4KPHBhdGggc3Ryb2tlPSIjOTBkMDYwIiBkPSJNNSAzek0zIDJoMSIvPgo8cGF0aCBzdHJva2U9IiNhMGUwNzAiIGQ9Ik0xIDF2MWgxTTggMXoiLz4KPC9nPgo8dXNlIHhsaW5rOmhyZWY9IiNhIiB0cmFuc2Zvcm09Im1hdHJpeCgtMSAwIDAgMSA1MTMgMCkiIG9wYWNpdHk9Ii42Ii8+CjxnIHRyYW5zZm9ybT0ibWF0cml4KC0xOSAxMS0xOS0xMSA0NDcgMTU5KSI+CjxwYXRoIGZpbGw9IiM3YjQiIGQ9Ik0uNS41aDl2OWgtOSIvPgo8cGF0aCBzdHJva2U9IiM4YzUiIGQ9Ik0xIDF6TTMgMXpNNCA3ek0zIDR2MkgxdjJoM3YxaDJWN00yIDNoNFYxSDV2MWgzTTcgNHYxSDRNOSA0djJIOHYzIi8+CjxwYXRoIHN0cm9rZT0iI2FhZDc3MCIgZD0iTTEgM3YyTTEgN3pNMSA5ek0zIDN6TTQgNHpNNSAxek01IDN6TTUgNXYxTTUgOHYxTTcgMnYxTTggN2gxIi8+CjwvZz4KPC9zdmc+"
};
const logoImg = (key, alt) => `<img class="brand-logo" src="${LOGO_URLS[key]}" alt="${alt || key} loqosu" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=&quot;logo-fallback&quot;>${(alt || key).slice(0,3).toUpperCase()}</span>'">`;
// Kateqoriyaya görə default ikon
function getCategoryDefaultIcon(category, game){
  const cat = (category||"").toLowerCase();
  const gm  = (game||"").toLowerCase();
  // Oyun adına görə
  if(gm.includes("pubg"))     return '<img src="'+LOGO_URLS.pubg+'" style="width:72px;height:72px;object-fit:contain;" alt="PUBG">';
  if(gm.includes("valorant")) return '<img src="'+LOGO_URLS.valorant+'" style="width:72px;height:72px;object-fit:contain;" alt="Valorant">';
  if(gm.includes("league")||gm.includes("lol")) return '<img src="'+LOGO_URLS.lol+'" style="width:72px;height:72px;object-fit:contain;" alt="LoL">';
  if(gm.includes("counter")||gm.includes("cs2")||gm.includes("csgo")) return '<img src="'+LOGO_URLS.csgo+'" style="width:72px;height:72px;object-fit:contain;" alt="CS2">';
  if(gm.includes("fortnite")) return '<img src="'+LOGO_URLS.fortnite+'" style="width:72px;height:72px;object-fit:contain;" alt="Fortnite">';
  if(gm.includes("free fire")) return '<img src="'+LOGO_URLS.freefire+'" style="width:72px;height:72px;object-fit:contain;" alt="Free Fire">';
  if(gm.includes("roblox"))   return '<img src="'+LOGO_URLS.roblox+'" style="width:72px;height:72px;object-fit:contain;" alt="Roblox">';
  if(gm.includes("minecraft")) return '<img src="'+LOGO_URLS.minecraft+'" style="width:72px;height:72px;object-fit:contain;" alt="Minecraft">';
  if(gm.includes("steam"))    return '<img src="'+LOGO_URLS.steam+'" style="width:72px;height:72px;object-fit:contain;" alt="Steam">';
  if(gm.includes("epic"))     return '<img src="'+LOGO_URLS.epicgames+'" style="width:72px;height:72px;object-fit:contain;" alt="Epic Games">';
  if(gm.includes("google play")) return '<img src="'+LOGO_URLS.googleplay+'" style="width:72px;height:72px;object-fit:contain;" alt="Google Play">';
  if(gm.includes("app store")||gm.includes("itunes")||gm.includes("apple")) return '<img src="'+LOGO_URLS.apple+'" style="width:72px;height:72px;object-fit:contain;" alt="App Store">';
  if(gm.includes("riot"))     return '<img src="'+LOGO_URLS.riot+'" style="width:72px;height:72px;object-fit:contain;" alt="Riot">';
  // Kateqoriyaya görə fallback SVG ikonlar
  const icons = {
    "hesab":       '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><circle cx="12" cy="8" r="3.5" stroke="#fb923c" stroke-width="1.6"/><path d="M5 19.5C5 16.46 8.13 14 12 14s7 2.46 7 5.5" stroke="#fb923c" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="8" r="6" stroke="#fb923c" stroke-width=".4" stroke-dasharray="2 2" opacity=".4"/></svg>',
    "skin":        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="#a78bfa" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 7l1.2 3.7H17l-3.1 2.3 1.2 3.7L12 14.5l-3.1 2.2 1.2-3.7L7 10.7h3.8L12 7z" fill="#a78bfa" opacity=".25"/></svg>',
    "oyun pulu":   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><circle cx="12" cy="12" r="9" stroke="#34d399" stroke-width="1.5"/><path d="M12 6v1.5M12 16.5V18M9 9.75C9 8.51 10.34 7.5 12 7.5s3 1.01 3 2.25c0 1.24-1.34 1.88-3 2.25S9 13.26 9 14.25C9 15.49 10.34 16.5 12 16.5s3-1.01 3-2.25" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/></svg>',
    "gift card":   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><rect x="2" y="8" width="20" height="13" rx="2" stroke="#f472b6" stroke-width="1.5"/><path d="M2 12h20" stroke="#f472b6" stroke-width="1.5"/><path d="M12 8V21M9 5c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.1-.6 2.05-1.5 2.6" stroke="#f472b6" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="5" r="1" fill="#f472b6" opacity=".5"/></svg>',
    "oyun boost":  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#60a5fa" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#60a5fa" opacity=".12"/></svg>',
    "hesab kirayəsi": '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#fb923c" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#fb923c" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="16" r="1.5" fill="#fb923c"/><path d="M12 17.5v1.5" stroke="#fb923c" stroke-width="1.3" stroke-linecap="round"/></svg>',
    "sosial media":'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><circle cx="18" cy="5" r="2.5" stroke="#38bdf8" stroke-width="1.5"/><circle cx="6" cy="12" r="2.5" stroke="#38bdf8" stroke-width="1.5"/><circle cx="18" cy="19" r="2.5" stroke="#38bdf8" stroke-width="1.5"/><path d="M8.5 10.5l7-4M8.5 13.5l7 4" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round"/></svg>',
    "oyun konsolu":'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:56px;height:56px;"><rect x="2" y="7" width="20" height="12" rx="3" stroke="#c084fc" stroke-width="1.5"/><path d="M6 13h4M8 11v4" stroke="#c084fc" stroke-width="1.6" stroke-linecap="round"/><circle cx="15" cy="12" r="1" fill="#c084fc"/><circle cx="17.5" cy="14" r="1" fill="#c084fc"/></svg>'
  };
  for(const key of Object.keys(icons)){
    if(cat.includes(key)) return icons[key];
  }
  return '<svg viewBox="0 0 24 24" fill="#fb923c" style="width:56px;height:56px;"><circle cx="12" cy="12" r="9"/></svg>';
}

const SVGS = {
  pubg: logoImg('pubg','PUBG Mobile'),
  valorant: logoImg('valorant','Valorant'),
  lol: logoImg('lol','League of Legends'),
  freefire: logoImg('freefire','Free Fire'),
  csgo: logoImg('csgo','Counter Strike 2'),
  googleplay: logoImg('googleplay','Google Play'),
  apple: logoImg('apple','App Store'),
  steam: logoImg('steam','Steam'),
  riot: logoImg('riot','Riot Games'),
  fortnite: logoImg('fortnite','Fortnite'),
  epicgames: logoImg('epicgames','Epic Games'),
  roblox: logoImg('roblox','Roblox'),
  minecraft: logoImg('minecraft','Minecraft')
};

// Elan detalları pəncərəsindəki şəkilin üzərinə qoyulan kiçik platforma loqosu üçün aşkarlama
const PLATFORM_LOGO_KEYWORDS = [
  ["league of legends","lol"],["pubg","pubg"],["valorant","valorant"],["lol","lol"],
  ["free fire","freefire"],["freefire","freefire"],
  ["counter-strike","csgo"],["counter strike","csgo"],["cs:go","csgo"],["cs2","csgo"],["csgo","csgo"],
  ["google play","googleplay"],["googleplay","googleplay"],
  ["app store","apple"],["appstore","apple"],["itunes","apple"],["apple","apple"],
  ["steam","steam"],["riot","riot"],["fortnite","fortnite"],
  ["epic games","epicgames"],["epicgames","epicgames"],
  ["roblox","roblox"],["minecraft","minecraft"]
];

function detectPlatformLogoKey(text){
  if(!text) return null;
  const t = String(text).toLowerCase();
  for(const [keyword, key] of PLATFORM_LOGO_KEYWORDS){
    if(t.includes(keyword)) return key;
  }
  return null;
}

function renderPdPlatformBadge(product){
  const wrap = document.getElementById("pdImage");
  if(!wrap) return;
  wrap.querySelector(".pd-platform-badge")?.remove();
  const platformText = (product.desc || "").split("•")[0];
  const key = detectPlatformLogoKey(platformText) || detectPlatformLogoKey(product.category);
  if(!key || !LOGO_URLS[key]) return;
  const badge = document.createElement("div");
  badge.className = "pd-platform-badge";
  badge.innerHTML = logoImg(key);
  wrap.appendChild(badge);
}

const games=[
  [SVGS.pubg,"PUBG Mobile","0 elan","Oyun","pubg"],
  [SVGS.valorant,"Valorant","0 elan","Oyun","valorant"],
  [SVGS.lol,"League of Legends","0 elan","Oyun","lol"],
  [SVGS.freefire,"Free Fire","0 elan","Oyun","freefire"],
  [SVGS.csgo,"Counter-Strike 2","0 elan","Oyun","csgo"],
  [SVGS.fortnite,"Fortnite","0 elan","Oyun","fortnite"],
  [SVGS.roblox,"Roblox","0 elan","Oyun","roblox"],
  [SVGS.minecraft,"Minecraft","0 elan","Oyun","minecraft"]
];

const epins=[
  [SVGS.googleplay,"Google Play AZ","5.00 ₼","5.50 ₼"],
  [SVGS.apple,"App Store / iTunes","10.00 ₼","11.00 ₼"],
  [SVGS.steam,"Steam Wallet","20.00 ₼","22.00 ₼"],
  [SVGS.riot,"Riot Points","15.00 ₼","17.00 ₼"],
  [SVGS.epicgames,"Epic Games","12.00 ₼","14.00 ₼"],
  [SVGS.roblox,"Roblox Gift Card","10.00 ₼","12.00 ₼"]
];

const baseAds=[
  [SVGS.pubg,"PUBG Mobile Hesab","Səviyyə 65 | 120 Destanlı","250.00 ₼","qwerty00","Hesab"],
  [SVGS.valorant,"Valorant Hesab","Vandal | Yağmaçı","175.00 ₼","LikeUn3","Hesab"],
  [SVGS.lol,"LoL Hesab","120 Kostyum | Elmas","325.00 ₼","TheHunter","Hesab"],
  [SVGS.csgo,"Counter-Strike 2 Skin","Karambit | Fade","575.00 ₼","SkinLord","Skin"]
];

const sellers=[
  [`<svg viewBox="0 0 24 24" style="width:24px" fill="#ffa04c"><circle cx="12" cy="12" r="10"/></svg>`,"GameSatış","100%","0 satış"],
  [`<svg viewBox="0 0 24 24" style="width:24px" fill="#20c45a"><circle cx="12" cy="12" r="10"/></svg>`,"Yeni satıcılar","100%","0 satış"]
];

function moneyToNumber(v){
  if(!v) return 0;
  let s = String(v).replace(/₼|AZN|TL/g, "").trim();
  // "2.500,00" -> 2500.00, "20.00" -> 20.00, "20,00" -> 20.00
  if(s.includes(",")){
    s = s.replace(/\./g, "").replace(",", ".");
  }else{
    s = s.replace(/[^0-9.]/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function safeText(v){
  return String(v || "").replace(/[<>&"]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[s]));
}

function rawAdMetaParts(a){
  const parts=[];
  if(a.platform) parts.push("Platforma: "+a.platform);
  if(a.region) parts.push("Region: "+a.region);
  if(a.server) parts.push("Server: "+a.server);
  if(a.rank) parts.push("Rank: "+a.rank);
  if(a.level) parts.push("Level: "+a.level);
  return parts;
}
function adMetaText(a){
  return rawAdMetaParts(a).filter(Boolean).join(" • ");
}
function adFullDesc(a){
  return [a.game || "", adMetaText(a), a.desc || ""].filter(Boolean).join(" • ");
}
function setSelectOrCustom(selectId, customId, value){
  const sel=document.getElementById(selectId);
  const custom=document.getElementById(customId);
  if(!sel) return;
  const val=String(value || "").trim();
  const exists=[...sel.options].some(o=>o.value===val || o.textContent===val);
  if(val && exists){ sel.value=val; if(custom){ custom.style.display="none"; custom.value=""; } }
  else if(val){ sel.value="Digər"; if(custom){ custom.style.display=""; custom.value=val; } }
  else{ sel.value=""; if(custom){ custom.style.display="none"; custom.value=""; } }
}
function getSelectedGameValue(){
  const cat = document.getElementById("adCategory")?.value || "Hesab";
  if(cat==="Hesab"){
    const sel=document.getElementById("adGame");
    const custom=document.getElementById("adGameCustom");
    if(!sel) return "";
    return sel.value==="Digər" ? (custom?.value.trim()||"") : sel.value.trim();
  }
  if(cat==="Skin")          return document.getElementById("adGameSkin")?.value.trim()||"";
  if(cat==="Oyun Pulu")     return document.getElementById("adGameCurrency")?.value.trim()||"";
  if(cat==="Oyun Boost")    return document.getElementById("adGameBoost")?.value.trim()||"";
  if(cat==="Hesab Kirayəsi") return document.getElementById("adGameRent")?.value.trim()||"";
  return "";
}
function updateAdGameCustomVisibility(){
  const sel=document.getElementById("adGame");
  const custom=document.getElementById("adGameCustom");
  if(!sel||!custom) return;
  custom.style.display = sel.value==="Digər" ? "" : "none";
  if(sel.value!=="Digər") custom.value="";
}

// Kateqoriya konfiqurasiyası
const AD_CAT_CFG = {
  "Hesab":           {sections:["hesab"]},
  "Skin":            {sections:["skin"]},
  "Oyun Pulu":       {sections:["oyunpulu"]},
  "Gift Card & E-Pin":{sections:["giftcard"]},
  "Oyun Boost":      {sections:["boost"]},
  "Hesab Kirayəsi":  {sections:["kiraye"]},
  "Sosial Media":    {sections:["sosial"]},
  "Oyun Konsolu":    {sections:["konsol"]}
};
const ALL_SECTIONS = ["hesab","skin","oyunpulu","giftcard","boost","kiraye","sosial","konsol"];

function syncAdFormToCategory(){
  const cat = document.getElementById("adCategory")?.value || "Hesab";
  const cfg = AD_CAT_CFG[cat] || {sections:["hesab"]};
  ALL_SECTIONS.forEach(sec=>{
    const el = document.getElementById("adSec_"+sec);
    if(el) el.style.display = cfg.sections.includes(sec) ? "" : "none";
  });
}

function readAdProfessionalFields(){
  const cat = document.getElementById("adCategory")?.value || "Hesab";
  const v = id => document.getElementById(id)?.value.trim()||"";
  if(cat==="Hesab")           return {platform:"",region:"",server:"",rank:v("adRank"),level:v("adLevel")};
  if(cat==="Skin")            return {platform:v("adGameSkin"),region:"",server:"",rank:"",level:""};
  if(cat==="Oyun Pulu")       return {platform:v("adGameCurrency"),region:"",server:"",rank:"",level:v("adCurrencyAmount")};
  if(cat==="Gift Card & E-Pin") return {platform:v("adGiftStore"),region:"",server:"",rank:"",level:v("adGiftNominal")};
  if(cat==="Oyun Boost")      return {platform:v("adGameBoost"),region:"",server:v("adBoostFrom"),rank:v("adBoostTo"),level:""};
  if(cat==="Hesab Kirayəsi")  return {platform:v("adGameRent"),region:"",server:"",rank:v("adRentRank"),level:v("adRentDuration")};
  if(cat==="Sosial Media")    return {platform:v("adSocialPlatform"),region:"",server:"",rank:"",level:v("adSocialFollowers")};
  if(cat==="Oyun Konsolu")    return {platform:v("adConsoleBrand"),region:"",server:"",rank:v("adConsoleCondition"),level:""};
  return {platform:"",region:"",server:"",rank:"",level:""};
}

function clearAdProfessionalFields(){
  setSelectOrCustom("adGame","adGameCustom","");
  ["adRank","adGameSkin","adGameCurrency","adGiftStore",
   "adGameBoost","adGameRent","adRentRank","adRentDuration",
   "adSocialPlatform","adConsoleBrand","adConsoleCondition"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value="";
  });
  ["adLevel","adCurrencyAmount","adGiftNominal","adBoostFrom",
   "adBoostTo","adSocialFollowers"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value="";
  });
}

function showToast(msg){
  const t=document.getElementById("toast");
  if(!t){ alert(msg); return; }
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1800);
}

function openModal(id){document.getElementById(id)?.classList.add("show")}
function closeModal(id){document.getElementById(id)?.classList.remove("show")}

function formatViewsCount(v){
  const n = Number(v || 0);
  if(!Number.isFinite(n)) return "0";
  return n.toLocaleString("az-AZ");
}

function setProductViewText(views){
  const el = document.getElementById("pdViewsText");
  if(el) el.textContent = formatViewsCount(views) + " baxış";
}

function syncSearchCategory() {
  const selectCat = document.getElementById("searchCategory").value;
  if(selectCat) filterCategory(selectCat);
}

function render(){
  const gamesEl=document.getElementById("games");
  const epinsEl=document.getElementById("epins");
  const sellersEl=document.getElementById("sellers");

  if(gamesEl) {
    gamesEl.innerHTML=games.map(x=>`
      <button class="game searchable" data-game="${x[4]||''}" data-category="Oyun" onclick="openProductDetail({title:'${x[1]}',price:'Elanlara bax',category:'${x[3]}',desc:'${x[2]}',seller:'GameSatış',icon:x[0]})">
        <div class="game-img" data-game="${x[4]||''}">${x[0]}</div><b>${safeText(x[1])}</b>
      </button>`).join("");
  }

  if(epinsEl) {
    epinsEl.innerHTML=epins.map(x=>`
      <button class="epin searchable" data-category="Gift Card & E-Pin" onclick="openProductDetail({title:'${x[1]}',price:x[2],category:'Gift Card & E-Pin',desc:'Rəqəmsal kod. Ödənişdən sonra çatdırılır.',seller:'GameSatış',icon:x[0]})">
        <div class="epin-img">${x[0]}</div>
        <div class="epin-body"><b>${safeText(x[1])}</b><div class="price">${safeText(x[2])}</div><div class="old">${safeText(x[3])}</div></div>
      </button>`).join("");
  }

  if(sellersEl) {
    sellersEl.innerHTML=sellers.map(x=>`
      <button class="seller searchable" onclick="showToast('${safeText(x[1])} mağazası açılır...')">
        <div class="sicon">${x[0]}</div><div><b>${safeText(x[1])}</b><br><span class="star">★</span> <small>${safeText(x[2])}</small></div><strong>${safeText(x[3])}</strong>
      </button>`).join("");
  }

  renderMarketAds();
  updateCart();
}

window.renderMarketAds = function renderMarketAds(){
  const adsEl=document.getElementById("ads");
  if(!adsEl) return;

  const approved = (window.approvedFirestoreAds || []).map(a => ({
    icon: (()=>{ try{ const imgSrc=(a.imageUrls&&a.imageUrls.length)?a.imageUrls[0]:a.imageUrl; if(imgSrc) return '<img src="'+String(imgSrc).replace(/"/g,'%22')+'" alt="'+safeText(a.title)+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px">'; } catch(e){} return getCategoryDefaultIcon(a.category||"",a.platform||""); })(),
    title:safeText(a.title),
    desc:safeText(adFullDesc(a)),
    price: Number(a.price || 0).toFixed(2) + " ₼",
    priceValue: Number(a.price || 0),
    originalPrice: Number(a.originalPrice || 0),
    createdAtMs: a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : (a.createdAt && a.createdAt.seconds ? a.createdAt.seconds*1000 : 0),
    seller:safeText(a.sellerUserId || (a.sellerEmail ? a.sellerEmail.split('@')[0] : "Satıcı")),
    category:safeText(a.category || "Hesab"),
    platform:safeText(a.platform || ""),
    region:safeText(a.region || ""),
    server:safeText(a.server || ""),
    rank:safeText(a.rank || ""),
    level:safeText(a.level || ""),
    tags:(a.tags||[]).map(function(t){return safeText(t);}),
    contact:safeText(a.contact || ""),
    views:Number(a.views || 0),
    approved:true,
    adId: a.id || "",
    sellerUid: a.sellerUid || "",
    sellerEmail: a.sellerEmail || "",
    sellerVerified: !!a.sellerVerified,
    imageUrls: a.imageUrls || [],
    stock: Number(a.stock || 1),
    video: a.video || ""
  }));

  const base = baseAds.map(x => ({
    icon:x[0], title:safeText(x[1]), desc:safeText(x[2]), price:safeText(x[3]), priceValue:moneyToNumber(x[3]), createdAtMs:0, seller:safeText(x[4]), category:safeText(x[5]), platform:"", region:"", server:"", rank:"", level:"", views:0, approved:false
  }));

  // Eyni satıcının contact field-ini sinxronlaşdır
  // Əgər bir elanda contact boşdursa, həmin satıcının digər elanından götür
  const contactByUid = {};
  approved.forEach(a => {
    if(a.contact && a.sellerUid) contactByUid[a.sellerUid] = a.contact;
  });
  approved.forEach(a => {
    if(!a.contact && a.sellerUid && contactByUid[a.sellerUid]) {
      a.contact = contactByUid[a.sellerUid];
    }
  });

  const combined = [...approved, ...base];

  if(currentSort === "price_asc"){
    combined.sort((a,b)=>a.priceValue - b.priceValue);
  } else if(currentSort === "price_desc"){
    combined.sort((a,b)=>b.priceValue - a.priceValue);
  } else {
    combined.sort((a,b)=>b.createdAtMs - a.createdAtMs);
  }

  // _openAdDetail: data attributes-dan məlumatı oxuyub openProductDetail-ə ötür
  window._openAdDetail = function(btn){
    var tags = [];
    var imageUrls = [];
    try{ tags = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.tags||"W10=")))); }catch(e){}
    try{ imageUrls = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.imgs||"W10=")))); }catch(e){}
    openProductDetail({
      title: btn.dataset.title,
      price: btn.dataset.price,
      category: btn.dataset.category,
      desc: btn.dataset.desc,
      seller: btn.dataset.seller,
      adId: btn.dataset.adid,
      sellerUid: btn.dataset.selleruid,
      sellerEmail: btn.dataset.selleremail,
      sellerVerified: btn.dataset.sellerverified === "1",
      approved: btn.dataset.approved === "1",
      platform: btn.dataset.platform,
      region: btn.dataset.region,
      server: btn.dataset.server,
      rank: btn.dataset.rank,
      level: btn.dataset.level,
      views: Number(btn.dataset.views||0),
      originalPrice: Number(btn.dataset.originalprice||0),
      contact: btn.dataset.contact,
      tags: tags,
      imageUrls: imageUrls,
      icon: btn.querySelector(".ad-img").innerHTML
    });
  };
  // Təhlükəsiz base64 encode - crash etməsin
  function safeB64(obj){
    try{ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
    catch(e){ try{ return btoa(JSON.stringify(obj).replace(/[^\x00-\x7F]/g,'')); } catch(e2){ return 'W10='; } }
  }
  adsEl.innerHTML=combined.map(function(a){
    try {
      var tagsHtml = "";
      var oldHtml = a.originalPrice > 0
        ? '<div class="old" style="font-size:11px;text-decoration:line-through;color:#6b7280;">'+Number(a.originalPrice).toFixed(2)+' ₼</div>'
        : "";
      var waHtml = "";
      var aprvHtml = "";
      var tagsB64 = safeB64(a.tags||[]);
      var imgsB64 = safeB64(a.imageUrls||[]);
      // Atribut daxilindəki dırnaqları təhlükəsizləşdir
      function attr(v){ return String(v||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
      return '<button class="ad searchable" '
        + 'data-category="'+attr(a.category)+'" '
        + 'data-title="'+attr(a.title)+'" '
        + 'data-price="'+attr(a.price)+'" '
        + 'data-desc="'+attr(a.desc)+'" '
        + 'data-seller="'+attr(a.seller)+'" '
        + 'data-adid="'+attr(a.adId)+'" '
        + 'data-selleruid="'+attr(a.sellerUid)+'" '
        + 'data-selleremail="'+attr(a.sellerEmail)+'" '
        + 'data-sellerverified="'+(a.sellerVerified?1:0)+'" '
        + 'data-approved="'+(a.approved?1:0)+'" '
        + 'data-platform="'+attr(a.platform)+'" '
        + 'data-region="'+attr(a.region)+'" '
        + 'data-server="'+attr(a.server)+'" '
        + 'data-rank="'+attr(a.rank)+'" '
        + 'data-level="'+attr(a.level)+'" '
        + 'data-views="'+Number(a.views||0)+'" '
        + 'data-originalprice="'+Number(a.originalPrice||0)+'" '
        + 'data-contact="'+attr(a.contact)+'" '
        + 'data-tags="'+tagsB64+'" '
        + 'data-imgs="'+imgsB64+'" '
        + 'onclick="window._openAdDetail(this)">'
        + '<div class="ad-img" data-cat="'+attr(a.category)+'">'+safeIcon(a.icon)+'</div>'
        + '<div style="text-align:left;width:100%">'
          + '<b>'+a.title+'</b>'
          + '<p>'+a.desc+'</p>'
          + '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">'
            + '<div class="aprice">'+a.price+'</div>'
            + oldHtml
          + '</div>'
          + tagsHtml
          + '<div class="ad-views">&#128065; '+formatViewsCount(a.views)+' baxış</div>'
          + '<div class="user" data-wa-html="'+attr(waHtml)+'" data-aprv-html="'+attr(aprvHtml)+'"><span class="seller-name-link" onclick="event.stopPropagation();openSellerProfile(\''+attr(a.sellerUid||'')+'\',\''+attr(a.sellerEmail||'')+'\')">'+a.seller+'</span>'+(window.getAdOnlineHomeHtml?window.getAdOnlineHomeHtml(a):'')+waHtml+aprvHtml+'</div>'
        + '</div>'
        + '</button>';
    } catch(e) {
      console.warn('Ad render xətası:', a.adId, e);
      return ''; // xətalı elanı atla, digərləri görünsün
    }
  }).join("");

  paginateVisible();
}

function setSort(value){
  currentSort = value;
  renderMarketAds();
}


let currentDetailProduct = null;
function openProductDetail(p){
  currentDetailProduct = p || {};
  window.currentDetailProduct = currentDetailProduct;

  // Dinamik SEO — məhsul açılanda meta tagları yenilə
  try{
    const _t = currentDetailProduct.title || "GameSatış Azərbaycan";
    const _d = (currentDetailProduct.desc||"").slice(0,155) || "Azərbaycanda etibarlı oyun marketplace-i.";
    const _img = currentDetailProduct.imageUrl || "https://hesabim.pages.dev/og-image.png";
    document.title = _t + " | GameSatış Azərbaycan";
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if(el) el.setAttribute("content", val); };
    setMeta('meta[name="description"]', _d);
    setMeta('meta[property="og:title"]', _t);
    setMeta('meta[property="og:description"]', _d);
    setMeta('meta[property="og:image"]', _img);
    setMeta('meta[name="twitter:title"]', _t);
    setMeta('meta[name="twitter:description"]', _d);
  }catch(e){}

  const modal=document.getElementById("productModal");
  if(!modal) return;
  document.getElementById("pdTitle").textContent = currentDetailProduct.title || "Məhsul";
  document.getElementById("pdPrice").textContent = currentDetailProduct.price || "0.00 ₼";
  const _opEl = document.getElementById("pdOldPrice");
  if(_opEl){
    const _op = Number(currentDetailProduct.originalPrice||0);
    if(_op>0){ _opEl.textContent=_op.toFixed(2)+" ₼"; _opEl.style.display=""; }
    else { _opEl.style.display="none"; }
  }
  document.getElementById("pdCategoryText").textContent = currentDetailProduct.category || "Kateqoriya";
  setProductViewText(currentDetailProduct.views || 0);
  if(currentDetailProduct.adId && typeof window.incrementAdView === "function"){
    window.incrementAdView(currentDetailProduct.adId, currentDetailProduct.views || 0).then(newViews=>{
      if(typeof newViews === "number"){
        currentDetailProduct.views = newViews;
        setProductViewText(newViews);
      }
    });
  }
  document.getElementById("pdDesc").textContent = currentDetailProduct.desc || "Məhsul haqqında məlumat.";
  updateProductDetailSellerBadge();
  const sellerIconEl = document.getElementById("pdSellerIcon");
  if(sellerIconEl){
    const sellerName = currentDetailProduct.seller || "GameSatış";
    sellerIconEl.textContent = sellerName.trim().slice(0,1).toUpperCase() || "G";
  }
  const sellerSalesEl = document.getElementById("pdSellerSales");
  if(sellerSalesEl){
    const sellerKey = currentDetailProduct.sellerEmail || currentDetailProduct.seller || "GameSatış";
    const counts = JSON.parse(localStorage.getItem("gs_seller_sales_counts") || "{}");
    sellerSalesEl.textContent = (counts[sellerKey] || 0) + " satış";
  }
  // Şəkil varsa göstər, yoxsa kateqoriyaya uyğun HD ikon
  const _icon = currentDetailProduct.icon || "";
  const _hasImg = _icon.includes("<img") || _icon.includes("http");
  const _catLabel = currentDetailProduct.category || "";
  const _iconHtml = _hasImg
    ? safeIcon(_icon, getCategoryDefaultIcon(currentDetailProduct.category||"", currentDetailProduct.game||currentDetailProduct.platform||""))
    : getCategoryDefaultIcon(currentDetailProduct.category||"", currentDetailProduct.game||currentDetailProduct.platform||"");
  document.getElementById("pdImage").innerHTML = _iconHtml
    + (_catLabel ? '<div class="pd-img-cat-label">'+esc(_catLabel)+'</div>' : '');
  renderPdPlatformBadge(currentDetailProduct);

  // Stok badge
  const stockBadge = document.getElementById("pdStockBadge");
  const stockText  = document.getElementById("pdStockText");
  if(stockBadge && stockText){
    const st = Number(currentDetailProduct.stock || 1);
    if(st > 1){ stockText.textContent = "Stok: " + st + " ədəd"; }
    else { stockText.textContent = "Stokda var"; }
    stockBadge.style.opacity = st > 0 ? "1" : "0.45";
  }

  // Video badge
  const videoBadge = document.getElementById("pdVideoBadge");
  if(videoBadge){
    const vurl = currentDetailProduct.video || "";
    if(vurl){ videoBadge.href = vurl; videoBadge.style.display = "inline-flex"; }
    else { videoBadge.style.display = "none"; }
  }

  // Satıcı online statusu yoxla
  if(window.updateProductDetailSellerOnline) window.updateProductDetailSellerOnline();

  // Ödəniş sistemi: yalnız admin öz məhsulları üçün (approved:false)
  // Bütün elanlarda həm "Səbətə əlavə et", həm "Mesaj" görünür
  const addCartBtn = document.getElementById("pdAddCart");
  const chatBtn = document.getElementById("pdChat");
  if(addCartBtn) addCartBtn.style.display = "";
  if(chatBtn) chatBtn.style.display = "";

  document.getElementById("pdAddCart").onclick = function(){
    addToCart(currentDetailProduct.title || "Məhsul", currentDetailProduct.price || "0.00 ₼", currentDetailProduct.adId || "", currentDetailProduct.sellerUid || "", currentDetailProduct.sellerEmail || "");
    closeModal("productModal");
  };
  // Yadda saxla düyməsinin vəziyyətini yoxla
  (function(){
    const favBtn = document.getElementById("pdFav");
    if(!favBtn) return;
    const adId = currentDetailProduct.adId || currentDetailProduct.title || "";
    const local = JSON.parse(localStorage.getItem("gs_saved_fallback") || "[]");
    const alreadySaved = local.some(function(x){ return (x.id||x.adId||x.title) === adId; });
    const favSvg = favBtn.querySelector("svg");
    if(alreadySaved){
      if(favSvg){ favSvg.setAttribute("fill","#ef4444"); favSvg.setAttribute("stroke","#ef4444"); }
      favBtn.style.color = "#ef4444";
      favBtn.style.borderColor = "#7f1d1d";
      favBtn.style.background = "#1a0a0a";
    } else {
      if(favSvg){ favSvg.setAttribute("fill","none"); favSvg.setAttribute("stroke","currentColor"); }
      favBtn.style.color = "";
      favBtn.style.borderColor = "";
      favBtn.style.background = "";
    }
    favBtn.onclick = async function(){
      if(typeof window.saveCurrentProductToAccount === "function"){
        await window.saveCurrentProductToAccount();
      }else{
        await saveCurrentProduct();
      }
      // Saxladıqdan sonra ikonu yenilə
      const loc2 = JSON.parse(localStorage.getItem("gs_saved_fallback") || "[]");
      const saved2 = loc2.some(function(x){ return (x.id||x.adId||x.title) === adId; });
      const svg2 = favBtn.querySelector("svg");
      if(saved2){
        if(svg2){ svg2.setAttribute("fill","#ef4444"); svg2.setAttribute("stroke","#ef4444"); }
        favBtn.style.color="#ef4444"; favBtn.style.borderColor="#7f1d1d"; favBtn.style.background="#1a0a0a";
      } else {
        if(svg2){ svg2.setAttribute("fill","none"); svg2.setAttribute("stroke","currentColor"); }
        favBtn.style.color=""; favBtn.style.borderColor=""; favBtn.style.background="";
      }
    };
  })();
  const _chatBtnEl = document.getElementById("pdChat");
  if(_chatBtnEl){
    _chatBtnEl.onclick = async function(){
      if(!currentUser){
        closeModal("productModal");
        openModal("loginModal");
        toast("Mesaj göndərmək üçün giriş et.");
        return;
      }
      if(typeof window.openChatFromProduct === "function"){
        await window.openChatFromProduct(currentDetailProduct);
      }else{
        showToast("Mesaj sistemi hələ yüklənməyib.");
      }
    };
  }
  // WhatsApp əlaqə düyməsi
  const waBtn = document.getElementById("pdWhatsapp");
  if(waBtn){
    const contact = currentDetailProduct.contact || "";
    if(contact){
      const phone = contact.replace(/[^0-9+]/g,"");
      const wmsg = encodeURIComponent("Salam, \"" + (currentDetailProduct.title||"məhsul") + "\" elanınızla maraqlandım.");
      waBtn.href = "https://wa.me/" + phone + "?text=" + wmsg;
      waBtn.style.display = "inline-flex";
    } else {
      waBtn.style.display = "none";
    }
  }
  openModal("productModal");
  if(typeof window.loadProductReviews === "function"){
    window.loadProductReviews(currentDetailProduct);
  }
}


window.openProductDetail = openProductDetail;
window.addToCart = addToCart;
window.safeText = safeText;
window.moneyToNumber = moneyToNumber;

async function saveCurrentProduct(){
  if(typeof window.saveCurrentProductToAccount === "function"){
    return window.saveCurrentProductToAccount();
  }

  const p = window.currentDetailProduct || currentDetailProduct || {};
  if(!p.title){
    showToast("Məhsul tapılmadı.");
    return;
  }

  const local = JSON.parse(localStorage.getItem("gs_saved_fallback") || "[]");
  const key = p.adId || p.title;
  if(!local.some(x => (x.adId || x.title) === key)){
    local.push({
      title:p.title || "Məhsul",
      price:p.price || "0.00 ₼",
      category:p.category || "",
      desc:p.desc || "",
      seller:p.seller || "GameSatış",
      icon:p.icon || "",
      adId:p.adId || "",
      sellerUid:p.sellerUid || "",
      sellerEmail:p.sellerEmail || "",
      savedAt:Date.now()
    });
    localStorage.setItem("gs_saved_fallback", JSON.stringify(local));
  }
  showToast("Yadda saxlanıldı");
}

function filterCards(){
  const q=document.getElementById("q").value.toLowerCase().trim();
  const selectCat = document.getElementById("searchCategory").value;
  
  document.querySelectorAll(".searchable").forEach(el=>{
    const textMatch = el.innerText.toLowerCase().includes(q);
    const catMatch = (selectCat === "Hamısı" || el.dataset.category === selectCat || el.getAttribute('data-category') === selectCat);
    el.classList.toggle("is-hidden", !(textMatch && catMatch));
  });
}

function filterByText(text){
  const qEl = document.getElementById("q");
  if(qEl) qEl.value=text;
  filterCategory("Hamısı");
}

function filterCategory(cat){
  currentCategory=cat;
  currentPage=1;
  
  const selectSearch = document.getElementById("searchCategory");
  if(selectSearch && selectSearch.value !== cat) {
    if([...selectSearch.options].some(o => o.value === cat)) {
      selectSearch.value = cat;
    } else {
      selectSearch.value = "Hamısı";
    }
  }

  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.innerText.trim()===cat || (cat==="Hamısı" && t.innerText.trim()==="Hamısı")));
  
  // Orijinal kateqoriya filtri — is-hidden ilə
  document.querySelectorAll(".searchable").forEach(el=>{
    if(cat === "Hamısı" || el.dataset.category === cat || el.getAttribute('data-category') === cat){
      el.classList.remove("is-hidden");
    } else {
      el.classList.add("is-hidden");
    }
  });

  // Kateqoriya dəyişdikdən sonra pagination tətbiq et
  paginateVisible();
}

// ===== PAGİNATİON (ayrı mexanizm — pagination-hidden class) =====
const ADS_PER_PAGE = 12;
let currentPage = 1;

function paginateVisible(){
  // Yalnız #ads içindəki, is-hidden olmayan elanları al
  const allAds = Array.from(document.querySelectorAll("#ads button.ad"));
  const visible = allAds.filter(el => !el.classList.contains("is-hidden"));

  const totalPages = Math.ceil(visible.length / ADS_PER_PAGE);
  if(currentPage > totalPages) currentPage = Math.max(1, totalPages);
  const start = (currentPage-1) * ADS_PER_PAGE;
  const end = start + ADS_PER_PAGE;

  // pagination-hidden ilə yalnız page dışındakıları gizlə
  allAds.forEach(el=>{
    el.classList.remove("pagination-hidden");
  });
  visible.forEach((el, idx)=>{
    if(idx < start || idx >= end){
      el.classList.add("pagination-hidden");
    }
  });

  renderPagination(totalPages);
}

function applyPaginationAndFilter(){
  // Kateqoriya filtrini tətbiq et
  document.querySelectorAll("#ads button.ad").forEach(el=>{
    const match = currentCategory==="Hamısı" || el.dataset.category===currentCategory || el.getAttribute("data-category")===currentCategory;
    if(match){ el.classList.remove("is-hidden"); }
    else { el.classList.add("is-hidden"); }
  });
  paginateVisible();
}

function renderPagination(totalPages){
  const el = document.getElementById("pagination");
  if(!el) return;
  if(totalPages <= 1){ el.innerHTML=""; return; }

  let html = "";
  const btnStyle = "padding:8px 14px;border-radius:8px;border:1px solid #1e2d45;background:#0d1117;color:#e2e8f0;cursor:pointer;font-size:13px;transition:.2s";
  const activeStyle = "padding:8px 14px;border-radius:8px;border:1px solid #fb923c;background:#fb923c;color:#fff;cursor:pointer;font-size:13px;font-weight:700";

  html += `<button style="${currentPage===1?'opacity:.4;'+btnStyle:btnStyle}" onclick="goToPage(${currentPage-1})" ${currentPage===1?"disabled":""}>‹</button>`;

  for(let i=1; i<=totalPages; i++){
    if(i===1 || i===totalPages || (i>=currentPage-2 && i<=currentPage+2)){
      html += `<button style="${i===currentPage?activeStyle:btnStyle}" onclick="goToPage(${i})">${i}</button>`;
    } else if(i===currentPage-3 || i===currentPage+3){
      html += `<span style="color:#475569">...</span>`;
    }
  }

  html += `<button style="${currentPage===totalPages?'opacity:.4;'+btnStyle:btnStyle}" onclick="goToPage(${currentPage+1})" ${currentPage===totalPages?"disabled":""}>›</button>`;
  html += `<span style="font-size:12px;color:#475569">${currentPage}/${totalPages} səhifə</span>`;
  el.innerHTML = html;
}

window.goToPage = function(page){
  const allAds = Array.from(document.querySelectorAll("#ads button.ad"));
  const visible = allAds.filter(el => !el.classList.contains("is-hidden"));
  const totalPages = Math.ceil(visible.length / ADS_PER_PAGE);
  if(page < 1 || page > totalPages) return;
  currentPage = page;
  paginateVisible();
  document.getElementById("ads")?.scrollIntoView({behavior:"smooth", block:"start"});
};

function addToCart(name, price, adId="", sellerUid="", sellerEmail=""){
  cart.push({name, price, adId, sellerUid, sellerEmail});
  localStorage.setItem("gs_cart", JSON.stringify(cart));
  updateCart();
  showToast(name + " səbətə əlavə edildi");
}

function updateCart(){
  const count=document.getElementById("cartBadge");
  if(count) count.textContent=cart.length;
  
  const list=document.getElementById("cartItems");
  const total=document.getElementById("cartTotal");
  if(!list || !total) return;
  
  if(cart.length===0) {
    list.innerHTML='<p style="color:#bbb;font-size:13px">Səbət boşdur.</p>';
  } else {
    list.innerHTML=cart.map((x,i)=>`
      <div class="cart-item">
        <span>${safeText(x.name)}</span>
        <b>${safeText(x.price)}</b>
        <button class="hbtn" style="height:28px;padding:0 8px" onclick="removeCart(${i})">Sil</button>
      </div>`).join("");
  }
  const sum=cart.reduce((a,b)=>a+moneyToNumber(b.price),0);
  const discount = window.getCouponDiscount ? window.getCouponDiscount(sum) : 0;
  const finalSum = Math.max(0, sum - discount);
  if(discount > 0){
    total.innerHTML = `<span style="text-decoration:line-through;color:#64748b;font-size:13px">${sum.toFixed(2)} ₼</span> ${finalSum.toFixed(2)} ₼ <span style="color:#22c55e;font-size:12px">(-${discount.toFixed(2)} ₼)</span>`;
  } else {
    total.textContent = sum.toFixed(2) + " ₼";
  }
}

function removeCart(i){
  cart.splice(i,1); 
  localStorage.setItem("gs_cart", JSON.stringify(cart)); 
  updateCart();
}

async function checkoutCart(){
  if(cart.length===0){showToast("Səbət boşdur");return}
  const itemList = cart.map(x=>`• ${x.name} — ${x.price}`).join("\n");
  const confirmed = await (window.showConfirm||window.confirm)(`Sifarişi tamamlamaq istədiyinizdən əminsiniz?\n\n${itemList}\n\nTamamla düyməsini basdıqdan sonra pul balansınızdan çıxılacaq.`, "🛒");
  if(!confirmed) return;
  if(typeof window.createOrdersFromCart === "function"){
    window.createOrdersFromCart(cart);
    return;
  }
  toast("Sifariş sistemi yüklənməyib, yenidən cəhd edin.");
}

function goHome(e){
  if(e) e.preventDefault();
  const q = document.getElementById("q");
  if(q) q.value="";
  filterCategory("Hamısı");
  document.querySelectorAll(".modal").forEach(m=>m.classList.remove("show"));
  document.getElementById("cartPanel")?.classList.remove("show");
  window.scrollTo({top:0,behavior:"smooth"});
}

document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){
    document.querySelectorAll(".modal").forEach(m=>m.classList.remove("show"));
    document.getElementById("cartPanel")?.classList.remove("show");
    document.getElementById("cabinetModal")?.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded",()=>{
  render();
  document.getElementById("cartToggleBtn")?.addEventListener("click", () => {
    document.getElementById("cartPanel")?.classList.toggle("show");
  });
});
