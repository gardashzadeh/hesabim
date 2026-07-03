// ============================================================================
// HESABLAR.NET — ESCROW WORKER (Cloudflare Worker)
// Alıcı sifarişi təsdiqləyəndə pul köçürməsini SERVER tərəfdə atomik icra edir:
//   order → "Tamamlandı", buyer.escrowOut azalır, seller.balance/totalEarned artır.
// Firestore Security Rules-dan service account ilə keçir (admin səlahiyyəti),
// amma yalnız ciddi yoxlamalardan sonra: çağıranın Firebase ID token-i real
// alıcıya məxsus olmalıdır, sifariş "Aktiv" statusda olmalıdır.
//
// QURAŞDIRMA (bir dəfəlik):
// 1. Firebase Console → Project Settings → Service accounts → Generate new private key
//    (JSON faylı yüklənəcək)
// 2. Cloudflare Dashboard → Workers → Create → bu faylı yapışdır → ad: escrow
// 3. Worker → Settings → Variables and Secrets → bu 3 SECRET-i əlavə et:
//      FB_PROJECT_ID    = JSON-dakı "project_id"
//      SA_CLIENT_EMAIL  = JSON-dakı "client_email"
//      SA_PRIVATE_KEY   = JSON-dakı "private_key" (BÜTÖV, -----BEGIN...END----- daxil)
// 4. Deploy → URL-i index.html-dəki window.ESCROW_WORKER_URL-ə yaz
//    (məs. https://escrow.gardashzadeh.workers.dev)
// ============================================================================

const ALLOWED_ORIGINS = [
  "https://hesablar.net",
  "https://www.hesablar.net",
  "https://hesabim.pages.dev"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, cors);
    }

    try {
      // ---- 1. Çağıranın Firebase ID token-ini yoxla ----
      const authHeader = request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) return json({ ok: false, error: "NO_TOKEN" }, 401, cors);

      const caller = await verifyFirebaseIdToken(idToken, env.FB_PROJECT_ID);
      if (!caller) return json({ ok: false, error: "BAD_TOKEN" }, 401, cors);

      const body = await request.json().catch(() => ({}));
      const orderId = String(body.orderId || "").trim();
      if (!orderId || !/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
        return json({ ok: false, error: "BAD_ORDER_ID" }, 400, cors);
      }

      // ---- 2. Service account access token ----
      const accessToken = await getServiceAccessToken(env);

      const pid = env.FB_PROJECT_ID;
      const base = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)`;
      const docsBase = `projects/${pid}/databases/(default)/documents`;

      // ---- 3. Transaction başlat ----
      const txResp = await gfetch(`${base}/documents:beginTransaction`, accessToken, {});
      const transaction = txResp.transaction;

      // ---- 4. Sifarişi oxu ----
      const orderName = `${docsBase}/orders/${orderId}`;
      const got1 = await gfetch(`${base}/documents:batchGet`, accessToken, {
        documents: [orderName], transaction
      });
      const orderDoc = (got1 || []).find(r => r.found)?.found;
      if (!orderDoc) { await rollback(base, accessToken, transaction); return json({ ok:false, error:"ORDER_NOT_FOUND" }, 404, cors); }

      const o = fieldsToObj(orderDoc.fields || {});
      const status    = str(o.status);
      const buyerUid  = str(o.buyerUid);
      const sellerUid = str(o.sellerUid);
      const sellerEmail = str(o.sellerEmail);
      const price     = num(o.price);

      // ---- 5. Yoxlamalar ----
      if (buyerUid !== caller.uid) { await rollback(base, accessToken, transaction); return json({ ok:false, error:"NOT_BUYER" }, 403, cors); }
      if (status === "Tamamlandı")  { await rollback(base, accessToken, transaction); return json({ ok:false, error:"ALREADY_DONE" }, 409, cors); }
      if (status === "Mübahisə")    { await rollback(base, accessToken, transaction); return json({ ok:false, error:"DISPUTED" }, 409, cors); }
      if (status !== "Aktiv")       { await rollback(base, accessToken, transaction); return json({ ok:false, error:"BAD_STATUS" }, 409, cors); }
      if (!(price >= 0))            { await rollback(base, accessToken, transaction); return json({ ok:false, error:"BAD_PRICE" }, 409, cors); }

      // ---- 6. Cüzdanları oxu ----
      const buyerWalletName  = `${docsBase}/wallets/${buyerUid}`;
      const walletsToGet = [buyerWalletName];
      const sellerWalletName = sellerUid ? `${docsBase}/wallets/${sellerUid}` : null;
      if (sellerWalletName) walletsToGet.push(sellerWalletName);

      const got2 = await gfetch(`${base}/documents:batchGet`, accessToken, {
        documents: walletsToGet, transaction
      });
      const findDoc = (name) => (got2 || []).find(r => r.found && r.found.name === name)?.found;
      const bw = fieldsToObj((findDoc(buyerWalletName)  || {}).fields || {});
      const sw = fieldsToObj((findDoc(sellerWalletName) || {}).fields || {});

      const newEscrowOut   = Math.max(0, num(bw.escrowOut) - price);
      const newSellerBal   = num(sw.balance) + price;
      const newTotalEarned = num(sw.totalEarned) + price;

      // ---- 7. Atomik commit ----
      const writes = [
        {
          update: {
            name: orderName,
            fields: {
              status:           { stringValue: "Tamamlandı" },
              escrowStatus:     { stringValue: "Satıcıya köçürüldü" },
              completedBy:      { stringValue: caller.uid },
              completedByEmail: { stringValue: caller.email || "" }
            }
          },
          updateMask: { fieldPaths: ["status","escrowStatus","completedBy","completedByEmail"] },
          updateTransforms: [
            { fieldPath: "completedAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt",   setToServerValue: "REQUEST_TIME" }
          ]
        },
        {
          update: {
            name: buyerWalletName,
            fields: { escrowOut: { doubleValue: newEscrowOut } }
          },
          updateMask: { fieldPaths: ["escrowOut"] },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]
        }
      ];
      if (sellerWalletName) {
        writes.push({
          update: {
            name: sellerWalletName,
            fields: {
              uid:         { stringValue: sellerUid },
              email:       { stringValue: sellerEmail || "" },
              balance:     { doubleValue: newSellerBal },
              totalEarned: { doubleValue: newTotalEarned }
            }
          },
          updateMask: { fieldPaths: ["uid","email","balance","totalEarned"] },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]
        });
      }

      await gfetch(`${base}/documents:commit`, accessToken, { transaction, writes });

      return json({ ok: true, orderId, price }, 200, cors);
    } catch (e) {
      return json({ ok: false, error: "INTERNAL", detail: String(e && e.message || e).slice(0, 300) }, 500, cors);
    }
  }
};

// ============================ Köməkçilər ============================

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(cors || {}) }
  });
}

async function gfetch(url, accessToken, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${JSON.stringify(j).slice(0,300)}`);
  return j;
}

async function rollback(base, accessToken, transaction) {
  try { await gfetch(`${base}/documents:rollback`, accessToken, { transaction }); } catch (e) {}
}

// Firestore REST value → JS
function fieldsToObj(fields) {
  const out = {};
  for (const k in fields) out[k] = fields[k];
  return out;
}
function num(v) {
  if (!v) return 0;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  return 0;
}
function str(v) {
  if (!v) return "";
  if ("stringValue" in v) return v.stringValue;
  return "";
}

// ---------------- Firebase ID token yoxlanışı (JWKS) ----------------
let _jwksCache = { keys: null, exp: 0 };

async function verifyFirebaseIdToken(idToken, projectId) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const header  = JSON.parse(b64uToStr(parts[0]));
    const payload = JSON.parse(b64uToStr(parts[1]));
    if (header.alg !== "RS256" || !header.kid) return null;

    const now = Math.floor(Date.now() / 1000);
    if (!(payload.exp > now)) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub) return null;

    if (!_jwksCache.keys || _jwksCache.exp < Date.now()) {
      const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
      const j = await r.json();
      _jwksCache = { keys: j.keys || [], exp: Date.now() + 6 * 3600 * 1000 };
    }
    const jwk = _jwksCache.keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk", jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
    const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sig  = b64uToBytes(parts[2]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
    if (!valid) return null;

    return { uid: payload.sub, email: payload.email || "" };
  } catch (e) {
    return null;
  }
}

// ---------------- Service account access token ----------------
let _saTokenCache = { token: null, exp: 0 };

async function getServiceAccessToken(env) {
  if (_saTokenCache.token && _saTokenCache.exp > Date.now() + 60000) return _saTokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64u(JSON.stringify({
    iss: env.SA_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;

  const pem = String(env.SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const der = pemToDer(pem);
  const key = await crypto.subtle.importKey(
    "pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${bytesToB64u(new Uint8Array(sig))}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(jwt)}`
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("SA token alınmadı: " + JSON.stringify(j).slice(0, 200));

  _saTokenCache = { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) * 1000) };
  return j.access_token;
}

// ---------------- Base64 köməkçiləri ----------------
function b64u(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesToB64u(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uToStr(b64u_) {
  const b64 = b64u_.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u_.length + 3) % 4);
  return decodeURIComponent(escape(atob(b64)));
}
function b64uToBytes(b64u_) {
  const b64 = b64u_.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u_.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function pemToDer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
                 .replace(/-----END PRIVATE KEY-----/, "")
                 .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
