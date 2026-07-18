import { SITE, BOT_RE, esc, slugify, findAdByNumber } from "../_lib.js";

export async function onRequest(context){
  const { request, env, params } = context;
  const seg = Array.isArray(params.path) ? (params.path[0]||"") : String(params.path||"");
  const m = seg.match(/^(\d+)/);
  const adNo = m ? m[1] : "";
  const ua = request.headers.get("user-agent") || "";

  // Adi istifadəçi → SPA (index.html)
  if(!BOT_RE.test(ua) || !adNo){
    return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  }

  let ad = null;
  try{ ad = await findAdByNumber(adNo); }catch(e){}

  if(!ad || (ad.status && ad.status !== "Təsdiqləndi")){
    return new Response(
      `<!doctype html><html lang="az"><head><meta charset="utf-8">` +
      `<title>Elan tapılmadı | Hesablar.net</title><meta name="robots" content="noindex">` +
      `</head><body><h1>Elan tapılmadı</h1><a href="${SITE}/">Ana səhifə</a></body></html>`,
      { status:404, headers:{ "Content-Type":"text/html; charset=utf-8", "Cache-Control":"public, max-age=300" } }
    );
  }

  const title = ad.title || "Elan";
  const desc = String(ad.desc||"").replace(/\s+/g," ").slice(0,155) ||
    "Hesablar.net — Azərbaycanda etibarlı oyun marketplace-i.";
  const price = Number(ad.price||0);
  const img = (Array.isArray(ad.imageUrls) && ad.imageUrls[0]) || ad.imageUrl || SITE + "/og-image.png";
  const canonical = `${SITE}/elan/${adNo}-${slugify(title)}`;
  const inStock = Number(ad.stock||1) > 0 && !ad.sold;

  const jsonLd = {
    "@context":"https://schema.org",
    "@type":"Product",
    "name": title,
    "description": desc,
    "image": img,
    "sku": String(adNo),
    "category": ad.category || "Oyun məhsulu",
    "offers":{
      "@type":"Offer",
      "url": canonical,
      "priceCurrency":"AZN",
      "price": price.toFixed(2),
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller":{ "@type":"Organization", "name": ad.sellerUserId || "Hesablar.net satıcısı" }
    }
  };

  const html =
    `<!doctype html><html lang="az"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)} — ${esc(ad.category||"Elan")} | Hesablar.net</title>` +
    `<meta name="description" content="${esc(desc)}">` +
    `<link rel="canonical" href="${esc(canonical)}">` +
    `<meta property="og:type" content="product">` +
    `<meta property="og:title" content="${esc(title)}">` +
    `<meta property="og:description" content="${esc(desc)}">` +
    `<meta property="og:image" content="${esc(img)}">` +
    `<meta property="og:url" content="${esc(canonical)}">` +
    `<meta property="og:site_name" content="Hesablar.net">` +
    `<meta property="og:locale" content="az_AZ">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${esc(title)}">` +
    `<meta name="twitter:description" content="${esc(desc)}">` +
    `<meta name="twitter:image" content="${esc(img)}">` +
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` +
    `</head><body><main>` +
    `<h1>${esc(title)}</h1>` +
    `<p><strong>${price.toFixed(2)} ₼</strong> — ${esc(ad.category||"")}${ad.game ? " / " + esc(ad.game) : ""}</p>` +
    `<img src="${esc(img)}" alt="${esc(title)}" width="600">` +
    `<p>${esc(String(ad.desc||"").slice(0,1000))}</p>` +
    `<p><a href="${esc(canonical)}">Elana bax</a> · <a href="${SITE}/">Hesablar.net ana səhifə</a></p>` +
    `</main></body></html>`;

  return new Response(html, {
    headers:{ "Content-Type":"text/html; charset=utf-8", "Cache-Control":"public, max-age=600" }
  });
}
