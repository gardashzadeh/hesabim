import { SITE, esc, slugify, fsQuery } from "./_lib.js";

export async function onRequest(context){
  const staticUrls = [
    { loc: SITE + "/", cf:"daily", pr:"1.0" },
    { loc: SITE + "/?category=Hesab", cf:"daily", pr:"0.8" },
    { loc: SITE + "/?category=Skin", cf:"daily", pr:"0.8" },
    { loc: SITE + "/?category=Oyun%20Pulu", cf:"daily", pr:"0.8" },
    { loc: SITE + "/?category=Gift%20Card%20%26%20E-Pin", cf:"daily", pr:"0.8" },
    { loc: SITE + "/?category=Oyun%20Boost", cf:"weekly", pr:"0.7" },
    { loc: SITE + "/?category=Hesab%20Kiray%C9%99si", cf:"weekly", pr:"0.7" },
    { loc: SITE + "/?category=Sosial%20Media", cf:"weekly", pr:"0.7" },
    { loc: SITE + "/?category=Oyun%20Konsolu", cf:"weekly", pr:"0.7" },
    { loc: SITE + "/?category=Digital%20Hesablar", cf:"weekly", pr:"0.7" }
  ];

  let urls = staticUrls.map(u =>
    `<url><loc>${u.loc}</loc><changefreq>${u.cf}</changefreq><priority>${u.pr}</priority></url>`
  ).join("");

  try{
    const ads = await fsQuery({
      from:[{collectionId:"ads"}],
      where:{ fieldFilter:{ field:{fieldPath:"status"}, op:"EQUAL", value:{ stringValue:"Təsdiqləndi" } } },
      limit:5000
    });
    for(const a of ads){
      const adNo = String(a.adNumber||"").replace(/[^0-9]/g,"");
      if(!adNo) continue;
      if(a.sold && Number(a.stock||0) <= 0) continue;
      const loc = `${SITE}/elan/${adNo}-${slugify(a.title||"")}`;
      urls += `<url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }
  }catch(e){ /* Firestore xətasında statik hissə qalır */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers:{
      "Content-Type":"application/xml; charset=utf-8",
      "Cache-Control":"public, max-age=3600"
    }
  });
}
