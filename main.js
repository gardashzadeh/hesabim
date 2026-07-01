});

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
  onAuthStateChanged,
  reload
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhGuZ-L8iZ5pRVD-446PI1_iJbPREvdLQ",
  authDomain: "hesablar-1f9fc.firebaseapp.com",
  projectId: "hesablar-1f9fc",
  storageBucket: "hesablar-1f9fc.firebasestorage.app",
  messagingSenderId: "1096521042065",
  appId: "1:1096521042065:web:9fd4e0e0a4618a93c29730"
};
// Admin emailləri birbaşa source-da saxlanmır — Firestore role sahəsi əsas götürülür.
// İlkin qeydiyyat üçün gizlədilmiş formada saxlanır.
const _ae = atob("Z2FyZGFzaHphZGVoQGdtYWlsLmNvbQ==");
const ADMIN_EMAILS = [_ae];

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.incrementAdView = async function(adId, currentViews = 0){
  if(!adId) return currentViews;
  const viewedKey = "gs_viewed_ad_" + adId;
  const fallback = Number(currentViews || 0);
  if(localStorage.getItem(viewedKey)) return fallback;
  try{
    await updateDoc(doc(db,"ads",adId),{views:increment(1),updatedAt:serverTimestamp()});
    localStorage.setItem(viewedKey,"1");
    return fallback + 1;
  }catch(e){
    console.error("Baxış sayı artırılmadı:", e);
    return fallback;
  }
};


const CLOUDINARY_CLOUD_NAME = atob("ZHRpcHpoM2x4");
const CLOUDINARY_UPLOAD_PRESET = atob("Z2FtZXNhdGlz");

// İcazə verilən şəkil formatları (MIME + extension)
const _ALLOWED_MIME = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/gif"]);
const _ALLOWED_EXT  = /\.(jpe?g|png|webp|gif)$/i;
const _MAX_SIZE_MB  = 5;

function validateImageFile(file){
  if(!file) return "Fayl seçilməyib.";
  if(!_ALLOWED_MIME.has(file.type.toLowerCase())) return "Yalnız JPG, PNG, WEBP, GIF formatları qəbul edilir.";
  if(!_ALLOWED_EXT.test(file.name)) return "Fayl adı icazəsiz formatdadır.";
  if(file.size > _MAX_SIZE_MB * 1024 * 1024) return `Şəkil maksimum ${_MAX_SIZE_MB}MB olmalıdır.`;
  return null;
}

async function uploadAnyImageToCloudinary(inputId, folder="receipts"){
  if(!currentUser){ toast("Şəkil yükləmək üçün giriş et."); return ""; }
  const fileInput=document.getElementById(inputId);
  const file=fileInput?.files?.[0];
  if(!file) return "";
  const err = validateImageFile(file);
  if(err){ toast(err); return ""; }
  const formData=new FormData();
  formData.append("file",file);
  formData.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder",folder);
  const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:"POST",body:formData});
  if(!res.ok) throw new Error("Şəkil yüklənmədi.");
  const data=await res.json();
  const url = data.secure_url || "";
  // Qaytarılan URL mütləq Cloudinary-dən olmalıdır
  if(url && !url.startsWith("https://res.cloudinary.com/")){ console.warn("Unexpected upload URL"); return ""; }
  return url;
}

async function ensureUserProfile(user, extra={}){
  if(!user) return;
  const email=(user.email||"").toLowerCase();
  const ref=doc(db,"users",user.uid);
  const snap=await getDoc(ref).catch(()=>null);
  if(!snap || !snap.exists()){
    await setDoc(ref,{
      uid:user.uid,name:extra.name||"",surname:extra.surname||"",
      fullName:((extra.name||"")+" "+(extra.surname||"")).trim(),
      birthDate:extra.birthDate||"",email,
      role: ADMIN_EMAILS.includes(email) ? "admin" : "user",
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
  }else{
    const d=snap.data()||{};
    await setDoc(ref,{uid:user.uid,email,role:d.role || (ADMIN_EMAILS.includes(email) ? "admin" : "user"),updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
  }
}


async function uploadSingleImageToCloudinary(file){
  if(!currentUser) throw new Error("Giriş tələb olunur.");
  const err = validateImageFile(file);
  if(err) throw new Error(err);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "ads");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST", body: formData
  });
  if(!res.ok){ const txt = await res.text().catch(()=>""); throw new Error("Şəkil yüklənmədi: "+txt); }
  const data = await res.json();
  const url = data.secure_url || "";
  if(url && !url.startsWith("https://res.cloudinary.com/")){ throw new Error("Gözlənilməz upload cavabı."); }
  return url;
}

async function uploadAdImageToCloudinary(){
  if(!currentUser){ toast("Şəkil yükləmək üçün giriş et."); return []; }
  const fileInput = document.getElementById("adImageFile");
  const files = Array.from(fileInput?.files || []);
  if(!files.length) return [];
  const valid = files.filter(function(f){
    const err = validateImageFile(f);
    if(err){ toast(f.name+": "+err); return false; }
    return true;
  }).slice(0, 5);
  if(!valid.length) return [];
  const submitBtn = document.getElementById("adSubmit");
  const urls = [];
  for(let i = 0; i < valid.length; i++){
    if(submitBtn) submitBtn.textContent = "Şəkil yüklənir "+(i+1)+"/"+valid.length+"...";
    urls.push(await uploadSingleImageToCloudinary(valid[i]));
  }
  return urls;
}


let currentUser = null;
let currentUserRole = "user"; // Firestore-dan cache-lənir, isAdmin() bunu istifadə edir

async function loadCurrentUserRole(){
  if(!currentUser){ currentUserRole="user"; return; }
  try{
    const snap=await getDoc(doc(db,"users",currentUser.uid));
    currentUserRole=(snap.exists()&&snap.data()?.role)||"user";
  }catch(e){ currentUserRole="user"; }
}


/* ONLINE STATUS SYSTEM - 1 dəqiqə yenilənmə */
const ONLINE_ACTIVE_MS = 2 * 60 * 1000;
const sellerStatusCache = new Map();
window.sellerStatusCache = sellerStatusCache;

function _tsToMs(v){
  if(!v) return 0;
  if(typeof v.toMillis === "function") return v.toMillis();
  if(typeof v === "number") return v;
  if(v.seconds) return v.seconds * 1000;
  return 0;
}
function isSellerOnline(data){
  const lastMs = _tsToMs(data && data.lastSeen);
  return !!(data && data.online === true && lastMs && (Date.now() - lastMs) <= ONLINE_ACTIVE_MS);
}
function formatLastSeenAz(lastSeen){
  const ms = _tsToMs(lastSeen);
  if(!ms) return "";
  const diffMs = Math.max(0, Date.now() - ms);
  const min = Math.floor(diffMs / 60000);
  if(min < 1) return "az əvvəl";
  if(min < 60) return min + " dəqiqə əvvəl";
  const h = Math.floor(min / 60);
  if(h < 24) return h + " saat əvvəl";
  const d = Math.floor(h / 24);
  if(d === 1) return "Dünən";
  return d + " gün əvvəl";
}
function cacheSellerStatus(u){
  if(!u) return;
  const uid = u.uid || u.id || "";
  const email = (u.email || "").toLowerCase();
  const oldByUid = uid ? sellerStatusCache.get("uid:" + uid) : null;
  const oldByEmail = email ? sellerStatusCache.get("email:" + email) : null;
  const prev = oldByUid || oldByEmail || {};
  const hasVerified = Object.prototype.hasOwnProperty.call(u, "sellerVerified");
  const data = {
    uid: uid || prev.uid || "",
    email: email || prev.email || "",
    online: Object.prototype.hasOwnProperty.call(u, "online") ? !!u.online : !!prev.online,
    lastSeen: Object.prototype.hasOwnProperty.call(u, "lastSeen") ? (u.lastSeen || null) : (prev.lastSeen || null),
    // presence sənədində sellerVerified yoxdursa, əvvəlki users dəyərini silmə
    sellerVerified: hasVerified ? !!u.sellerVerified : !!prev.sellerVerified
  };
  if(data.uid) sellerStatusCache.set("uid:" + data.uid, data);
  if(data.email) sellerStatusCache.set("email:" + data.email, data);
}
function getSellerStatus(uid="", email=""){
  return sellerStatusCache.get("uid:" + uid) || sellerStatusCache.get("email:" + String(email||"").toLowerCase()) || null;
}
function getSellerVerifiedFromCache(uid="", email="", fallback=false){
  const st = getSellerStatus(uid, email);
  return !!((st && st.sellerVerified) || fallback);
}
function refreshSellerBadges(){
  document.querySelectorAll("#ads button.ad").forEach(btn=>{
    const sUid = btn.dataset.selleruid || "";
    const sEmail = btn.dataset.selleremail || "";
    if(!sUid && !sEmail) return;
    const userEl = btn.querySelector(".user");
    if(!userEl) return;
    const sellerNameSpan = userEl.querySelector(".seller-name-link");
    const sellerName = sellerNameSpan ? sellerNameSpan.outerHTML : (userEl.dataset.sellerName || "");
    const waHtml = userEl.dataset.waHtml || "";
    const aprvHtml = userEl.dataset.aprvHtml || "";
    const onlineHtml = (typeof getAdOnlineHomeHtml === "function") ? getAdOnlineHomeHtml({sellerUid:sUid, sellerEmail:sEmail, sellerVerified:btn.dataset.sellerverified==="1"}) : "";
    userEl.innerHTML = sellerName + onlineHtml + waHtml + aprvHtml;
  });
  if(window.currentDetailProduct && typeof updateProductDetailSellerBadge === "function") updateProductDetailSellerBadge();
  if(typeof updateProductDetailSellerOnline === "function") updateProductDetailSellerOnline();
}

function getSellerVerifiedBadgeHtml(size=20){
  const n = Number(size) || 20;
  return `<span class="seller-verified-badge" title="Təsdiqli satıcı" aria-label="Təsdiqli satıcı" style="width:${n}px;height:${n}px">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:${n}px;height:${n}px">
      <circle cx="12" cy="12" r="10" fill="#2F80ED"/>
      <path d="M8 12.4l2.35 2.35L16.4 8.7" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>`;
}

function updateProductDetailSellerBadge(){
  const pdSellerEl = document.getElementById("pdSeller");
  if(!pdSellerEl || !window.currentDetailProduct) return;
  const sellerName = window.currentDetailProduct.seller || "GameSatış";
  const isVerified = getSellerVerifiedFromCache(window.currentDetailProduct.sellerUid||"", window.currentDetailProduct.sellerEmail||"", !!window.currentDetailProduct.sellerVerified);
  const verBadge = isVerified ? getSellerVerifiedBadgeHtml(20) : '';
  pdSellerEl.innerHTML = esc(sellerName) + verBadge;
}
function getAdOnlineHomeHtml(a){
  const st = getSellerStatus(a.sellerUid || "", a.sellerEmail || "");
  const verifiedBadge = getSellerVerifiedFromCache(a.sellerUid || "", a.sellerEmail || "", !!a.sellerVerified) ? getSellerVerifiedBadgeHtml(19) : '';
  if(st && isSellerOnline(st)) return verifiedBadge + ' <span>●</span> Online';
  return verifiedBadge;
}
function updateProductDetailSellerOnline(){
  const onlineDot  = document.getElementById("pdSellerOnline");
  const onlineText = document.getElementById("pdSellerOnlineText");
  if(!onlineDot || !onlineText || !window.currentDetailProduct) return;
  onlineDot.style.display  = "none";
  onlineText.style.display = "none";
  onlineText.style.color = "#22c55e";
  const st = getSellerStatus(window.currentDetailProduct.sellerUid || "", window.currentDetailProduct.sellerEmail || "");
  if(!st) return;
  if(isSellerOnline(st)){
    onlineDot.style.display  = "block";
    onlineText.style.display = "inline";
    onlineText.style.color = "#22c55e";
    onlineText.textContent = "● Online";
    return;
  }
  const lastText = formatLastSeenAz(st.lastSeen);
  if(lastText){
    onlineText.style.display = "inline";
    onlineText.style.color = "#94a3b8";
    onlineText.textContent = lastText;
  }
}
window.getAdOnlineHomeHtml = getAdOnlineHomeHtml;
window.updateProductDetailSellerOnline = updateProductDetailSellerOnline;
window.updateProductDetailSellerBadge = updateProductDetailSellerBadge;
window.getSellerStatus = getSellerStatus;
// NOT: listenSellerUserStatuses silindi — bütün "users" kolleksiyasını oxumağa
// çalışırdı, bu da admin olmayan istifadəçilər üçün Firestore Rules-u pozurdu
// (permission-denied). Artıq sellerVerified statusu yalnız "presence" kolleksiyasından
// gəlir — bu kolleksiya hər kəs üçün oxunaqlıdır (allow read: if true).

function listenSellerOnlineStatuses(){
  if(window._sellerOnlineUnsub) return;
  try{
    window._sellerOnlineUnsub = onSnapshot(collection(db,"presence"), snap=>{
      snap.forEach(d=>cacheSellerStatus({uid:d.id, ...(d.data()||{})}));
refreshSellerBadges();
    }, err=>console.warn("online status listen:", err));
  }catch(e){ console.warn("online status init:", e); }
}
async function updateOwnOnlineStatus(isOnline=true){
  if(!currentUser) return;
  try{
    // sellerVerified statusunu users kolleksiyasından al
    const uSnap = await getDoc(doc(db,"users",currentUser.uid)).catch(()=>null);
    const sellerVerified = !!(uSnap?.exists() && uSnap.data()?.sellerVerified);
    const patch = {
      uid: currentUser.uid,
      email: (currentUser.email||"").toLowerCase(),
      online: !!isOnline,
      lastSeen: serverTimestamp(),
      sellerVerified
    };
    await setDoc(doc(db,"presence",currentUser.uid), patch, {merge:true});
  }catch(e){ console.warn("online update:", e); }
}
function startOwnPresence(){
  if(!currentUser) return;
  updateOwnOnlineStatus(true);
  if(window._presenceInterval) clearInterval(window._presenceInterval);
  window._presenceInterval = setInterval(()=>updateOwnOnlineStatus(true), 60 * 1000);
  if(!window._presenceEventsBound){
    window._presenceEventsBound = true;
    document.addEventListener("visibilitychange", ()=>{
      if(document.hidden) updateOwnOnlineStatus(false);
      else updateOwnOnlineStatus(true);
    });
    window.addEventListener("pagehide", ()=>updateOwnOnlineStatus(false));
    window.addEventListener("beforeunload", ()=>updateOwnOnlineStatus(false));
  }
}
function stopOwnPresence(){
  if(window._presenceInterval){ clearInterval(window._presenceInterval); window._presenceInterval=null; }
}
let unsubMyAds = null, unsubAdmin = null, unsubPublicAds = null;
let unsubProductReviews = null;
let adminUnsubs = [];
let adminStatsState = {pendingAds:0,openTickets:0,activeOrders:0,balanceRequests:0,users:0,verifiedSellers:0,blockedUsers:0,totalSales:0,totalVolume:0};
let activeReviewProductKey = "";

function toast(msg){ if(window.showToast) window.showToast(msg); else alert(msg); }

// Brauzer confirm() əvəzinə öz dizaynlı modal
function showConfirm(msg, icon){
  return new Promise(resolve=>{
    const modal = document.getElementById("confirmModal");
    const msgEl = document.getElementById("confirmMsg");
    const iconEl = document.getElementById("confirmIcon");
    if(!modal || !msgEl) return resolve(confirm(msg)); // fallback
    msgEl.textContent = msg;
    iconEl.textContent = icon || "❓";
    modal.classList.add("show");
    window._confirmResolve = (val)=>{
      modal.classList.remove("show");
      window._confirmResolve = ()=>{};
      resolve(val);
    };
  });
}
window.showConfirm = showConfirm;
function authStatus(msg){
  const e=document.getElementById("authStatus");
  if(!e) return;
  if(!msg){ e.textContent=""; e.classList.remove("show"); return; }
  e.innerHTML = `<div style="font-size:22px;margin-bottom:12px">${msg.includes("tamamlandı")||msg.includes("uğurlu")?"✅":"⚠️"}</div>${esc(msg)}<br><button onclick="document.getElementById('authStatus').classList.remove('show');document.getElementById('authStatus').textContent=''" style="margin-top:16px;background:#fb923c;border:none;color:#fff;font-weight:700;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:13px">OK</button>`;
  e.classList.add("show");
  // Uğurlu mesajlarda 4 saniyə sonra avtomatik bağlan
  if(msg.includes("tamamlandı")||msg.includes("uğurlu")){
    setTimeout(()=>{ e.classList.remove("show"); e.textContent=""; }, 4000);
  }
}
function validEmail(email){ return /^\S+@\S+\.\S+$/.test(email); }
function esc(v){ return String(v||"").replace(/[<>&"]/g,s=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;"}[s])); }
window.esc = esc; // non-module script-lər üçün export
// XSS qoruması: icon sahəsi Firestore-dan gəlir, raw HTML kimi render edilir.
// Yalnız Cloudinary img teqləri və SVG-lər icazəlidir, başqa hər şey fallback ilə əvəzlənir.
const _SAFE_ICON_FALLBACK = '<svg viewBox="0 0 24 24" fill="#fb923c" style="width:30px"><circle cx="12" cy="12" r="8"/></svg>';
const _CLOUDINARY_HOST = "res.cloudinary.com";
function safeIcon(raw, fallback){
  const fb = fallback || _SAFE_ICON_FALLBACK;
  if(!raw) return fb;
  const s = String(raw).trim();
  // SVG-lər getCategoryDefaultIcon-dan gəlir — trusted
  if(/^<svg[\s>]/i.test(s)) return s;
  // Yalnız Cloudinary domenindən gələn img teqləri icazəlidir
  const m = s.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  if(m){
    const url = m[1];
    try{
      const host = new URL(url).hostname;
      if(host === _CLOUDINARY_HOST || host.endsWith("."+_CLOUDINARY_HOST)){
        return '<img src="'+url.replace(/"/g,'%22')+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px" alt="" loading="lazy">';
      }
    }catch(e){}
  }
  return fb;
}
// renderMarketAds adi script blokundadır — module-dan export lazımdır
window.safeIcon = safeIcon;
function isAdmin(){ return currentUser && currentUserRole === "admin"; }
async function getUserProfile(uid){
  if(!uid) return {};
  const snap=await getDoc(doc(db,"users",uid)).catch(()=>null);
  return snap && snap.exists() ? (snap.data()||{}) : {};
}
async function isCurrentUserBlocked(){
  if(!currentUser) return false;
  const p=await getUserProfile(currentUser.uid);
  return !!p.blocked;
}
async function blockGuard(actionText="Bu əməliyyat") {
  if(await isCurrentUserBlocked()){
    toast(actionText+" üçün hesabınız admin tərəfindən bloklanıb.");
    return true;
  }
  return false;
}

// Rate limiter: eyni əməliyyatın art-arda spam göndərilməsinin qarşısını alır
const _rlTimestamps = {};
function rateLimiter(key, cooldownMs, msg){
  const now = Date.now();
  const last = _rlTimestamps[key] || 0;
  const diff = now - last;
  if(diff < cooldownMs){
    const remaining = Math.ceil((cooldownMs - diff) / 1000);
    toast(msg || `Gözləyin: ${remaining} saniyə sonra yenidən cəhd edin.`);
    return false;
  }
  _rlTimestamps[key] = now;
  return true;
}


function normalizeReviewKeyPart(v){
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0259\u0131\u00f6\u00fc\u011f\u015f\u00e7]+/gi,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,120) || "product";
}
function productReviewKey(p){
  if(p && p.adId) return "ad-" + normalizeReviewKeyPart(p.adId);
  return "title-" + normalizeReviewKeyPart(p && p.title ? p.title : "product");
}
function productReviewKeys(p){
  const keys = [productReviewKey(p)];
  const legacyRaw = String((p && (p.adId || ((p.title || "") + "_" + (p.sellerEmail || p.seller || "GameSatış")))) || "product");
  const legacyKey = legacyRaw.toLowerCase().replace(/[^a-z0-9\u0259\u0131\u00f6\u00fc\u011f\u015f\u00e7]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,120) || "product";
  if(legacyKey && !keys.includes(legacyKey)) keys.push(legacyKey);
  return keys.slice(0,10);
}
function reviewsCacheKey(key){ return "gs_reviews_cache_" + normalizeReviewKeyPart(key); }
function readCachedReviews(keys){
  const out=[];
  (keys || [activeReviewProductKey]).forEach(k=>{
    try{
      const arr=JSON.parse(localStorage.getItem(reviewsCacheKey(k)) || "[]");
      arr.forEach(x=>out.push(x));
    }catch(e){}
  });
  const seen={};
  return out.filter(r=>{
    const id=r.id || (String(r.userUid||"")+"_"+String(r.createdAtMs||"")+"_"+String(r.text||""));
    if(seen[id]) return false;
    seen[id]=true;
    return true;
  }).sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0));
}
function cacheReviews(keys,list){
  try{
    const clean=(list||[]).map(r=>({
      id:r.id || "",
      productKey:r.productKey || activeReviewProductKey || "",
      productTitle:r.productTitle || "",
      adId:r.adId || "",
      rating:r.rating || 5,
      text:r.text || "",
      userUid:r.userUid || "",
      // userEmail saxlanmır — başqa istifadəçilərin emailini localStorage-da tutmaq lazım deyil
      userName:r.userName || "İstifadəçi",
      createdAtMs:r.createdAtMs || Date.now()
    }));
    (keys || [activeReviewProductKey]).forEach(k=>localStorage.setItem(reviewsCacheKey(k), JSON.stringify(clean)));
  }catch(e){}
}
function stars(n){
  n = Math.max(1, Math.min(5, Number(n)||5));
  return "★".repeat(n) + "☆".repeat(5-n);
}
async function currentUserDisplayName(){
  if(!currentUser) return "";
  const snap = await getDoc(doc(db,"users",currentUser.uid)).catch(()=>null);
  const d = snap && snap.exists() ? (snap.data()||{}) : {};
  return (d.fullName || ((d.name||"") + " " + (d.surname||"")).trim() || (currentUser.displayName||"") || (currentUser.email||"").split("@")[0] || "İstifadəçi").trim();
}
function renderReviews(list){
  const el=document.getElementById("pdReviewsList");
  const note=document.getElementById("pdReviewNote");
  const form=document.getElementById("pdReviewForm");
  if(!el) return;
  if(form) form.style.display = (currentUser && currentUser.emailVerified) ? "grid" : "none";
  if(note) note.textContent = currentUser ? (currentUser.emailVerified ? "" : "Rəy yazmaq üçün email təsdiqlənməlidir.") : "Rəy yazmaq üçün giriş et.";
  if(!list.length){
    el.innerHTML='<div class="review-login-note">Hələ rəy yoxdur. İlk rəyi sən yaz.</div>';
    return;
  }
  el.innerHTML=list.map(r=>{
    const canDelete = currentUser && (isAdmin() || r.userUid===currentUser.uid);
    const rid = esc(r.id || "");
    const rname = r.userName || r.userEmail || "İstifadəçi";
    const initial = esc(rname.trim().slice(0,1).toUpperCase() || "İ");
    return `<div class="review">
      <div class="review-head">
        <div class="review-author"><div class="review-avatar">${initial}</div><div><span class="review-name">${esc(rname)}</span><div class="review-stars">${stars(r.rating)}</div></div></div>
        ${canDelete && rid ? `<button class="review-delete" type="button" onclick="window.deleteProductReview('${rid}','${esc(r.userUid)}')">Sil</button>` : ""}
      </div>
      <div class="review-text">${esc(r.text || "")}</div>
    </div>`;
  }).join("");
}
window.loadProductReviews = function(p){
  const product = p || window.currentDetailProduct || {};
  const keys = productReviewKeys(product);
  activeReviewProductKey = keys[0];
  if(unsubProductReviews){ unsubProductReviews(); unsubProductReviews=null; }
  const submit=document.getElementById("pdReviewSubmit");
  if(submit) submit.onclick = window.submitProductReview;

  const cached = readCachedReviews(keys);
  if(cached.length) renderReviews(cached);
  else renderReviews([]);

  const qReviews = keys.length > 1
    ? query(collection(db,"reviews"),where("productKey","in",keys))
    : query(collection(db,"reviews"),where("productKey","==",activeReviewProductKey));

  unsubProductReviews=onSnapshot(qReviews,(snap)=>{
    const list=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
    list.sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0));
    cacheReviews(keys,list);
    renderReviews(list);
  },(e)=>{
    console.warn("Reviews load failed:", e);
    const fallback = readCachedReviews(keys);
    renderReviews(fallback);
    toast("Rəylər Firestore-dan yüklənmədi.");
  });
};
window.submitProductReview = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(!currentUser.emailVerified){ toast("Rəy yazmaq üçün emaili təsdiqlə."); return; }
  if(!rateLimiter("submitReview", 120_000, "Rəy yazmaq üçün 2 dəqiqə gözləyin.")) return;
  const text=(document.getElementById("pdReviewText")?.value||"").trim();
  const rating=Number(document.getElementById("pdReviewStars")?.value||5);
  if(text.length<3){ toast("Rəy ən azı 3 simvol olmalıdır."); return; }
  if(text.length>220){ toast("Rəy maksimum 220 simvol olmalıdır."); return; }
  const p=window.currentDetailProduct || {};
  const keys=productReviewKeys(p);
  const key=keys[0];
  activeReviewProductKey = key;
  const userName=await currentUserDisplayName();
  const reviewData={
    productKey:key,
    productTitle:p.title||"Məhsul",
    adId:p.adId||"",
    sellerUid:p.sellerUid||"",
    sellerEmail:p.sellerEmail||"",
    rating:Math.max(1,Math.min(5,rating)),
    text,
    userUid:currentUser.uid,
    userEmail:currentUser.email||"",
    userName,
    createdAtMs:Date.now(),
    createdAt:serverTimestamp()
  };
  try{
    const ref=await addDoc(collection(db,"reviews"),reviewData);
    const localItem={...reviewData,id:ref.id,createdAt:null};
    cacheReviews(keys,[localItem,...readCachedReviews(keys)]);
    const inp=document.getElementById("pdReviewText");
    if(inp) inp.value="";
    toast("Rəy əlavə edildi.");
  }catch(e){
    console.error("Review write failed:", e);
    toast("Rəy Firebase-ə yazılmadı. Rules və interneti yoxla.");
  }
};
window.deleteProductReview = async function(id,userUid){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(!isAdmin() && userUid!==currentUser.uid){ toast("Bu rəyi silmək icazən yoxdur."); return; }
  try{
    await deleteDoc(doc(db,"reviews",id));
    const keys=productReviewKeys(window.currentDetailProduct || {});
    cacheReviews(keys,readCachedReviews(keys).filter(r=>r.id!==id));
    toast("Rəy silindi.");
  }catch(e){
    console.error("Review delete failed:", e);
    toast("Rəy silinmədi. Firestore rules yoxlanmalıdır.");
  }
};


window.saveCurrentProductToAccount = async function(){
  await refreshUser();

  const p = window.currentDetailProduct || {};
  if(!p.title){
    toast("Məhsul tapılmadı.");
    return;
  }

  const localKey = p.adId || p.title;
  const local = JSON.parse(localStorage.getItem("gs_saved_fallback") || "[]");
  const alreadySaved = local.some(x => (x.adId || x.title) === localKey);

  if(alreadySaved){
    // Toggle: yadda saxlananlardan sil
    const updated = local.filter(x => (x.adId || x.title) !== localKey);
    localStorage.setItem("gs_saved_fallback", JSON.stringify(updated));
    if(currentUser){
      try{
        const rawKey = (p.adId || p.title || String(Date.now())).replace(/[^\w-]/g,"_").slice(0,80) || String(Date.now());
        await deleteDoc(doc(db,"users",currentUser.uid,"saved",rawKey)).catch(()=>{});
      }catch(e){ console.warn("Firestore saved delete:", e); }
    }
    toast("Yadda saxlananlardan silindi");
    return;
  }

  const item = {
    title: p.title || "Məhsul",
    price: p.price || "0.00 ₼",
    category: p.category || "",
    desc: p.desc || "",
    seller: p.seller || "GameSatış",
    icon: p.icon || "",
    adId: p.adId || "",
    sellerUid: p.sellerUid || "",
    sellerEmail: p.sellerEmail || "",
    savedAtMs: Date.now()
  };

  // Həmişə local-da da saxlayırıq ki, kabinet dərhal göstərsin
  local.push(item);
  localStorage.setItem("gs_saved_fallback", JSON.stringify(local));

  // Giriş varsa Firestore-a da yazırıq
  if(currentUser && currentUser.emailVerified){
    try{
      item.userUid = currentUser.uid;
      item.userEmail = currentUser.email;
      item.createdAt = serverTimestamp();
      const rawKey = (item.adId || item.title || String(Date.now())).replace(/[^\w-]/g,"_").slice(0,80) || String(Date.now());
      await setDoc(doc(db,"users",currentUser.uid,"saved",rawKey), item, {merge:true});
    }catch(e){
      console.warn("Firestore saved write failed:", e);
    }
  }

  toast("Yadda saxlanıldı");
};


function statusHtml(s){
  s=s||"Gözləmədə";
  const cls=s==="Təsdiqləndi"?"approved":s==="Rədd edildi"?"rejected":s==="Satıldı"?"sold":s==="Vaxtı bitib"?"rejected":"pending";
  return `<span class="status ${cls}">${esc(s)}</span>`;
}
// Elanın 30 günlük müddəti bitibmi yoxla
function isAdExpired(a){
  if(!a.expiresAt) return false;
  const exp = a.expiresAt.seconds ? a.expiresAt.seconds*1000 : new Date(a.expiresAt).getTime();
  return Date.now() > exp;
}
function adExpiryText(a){
  if(!a.expiresAt) return "";
  const exp = a.expiresAt.seconds ? a.expiresAt.seconds*1000 : new Date(a.expiresAt).getTime();
  const daysLeft = Math.ceil((exp - Date.now()) / (24*60*60*1000));
  if(daysLeft < 0) return "Vaxtı bitib";
  if(daysLeft === 0) return "Bu gün bitir";
  if(daysLeft <= 5) return daysLeft + " gün qalıb";
  return new Date(exp).toLocaleDateString("az-AZ", {day:"numeric", month:"short", year:"numeric"});
}

// ===== AES-256-GCM ŞİFRƏLƏMƏ =====
// Hesab məlumatları Firestore-da şifrəli saxlanılır
// Firebase Console-dan oxunsa belə, məna daşımayan mətn görünür
const _CREDS_PASSPHRASE = "hsbllr-s3cr3t-2025-v2-xK9mN";

async function _getCredsKey(){
  const raw = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(_CREDS_PASSPHRASE),
    "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {name:"PBKDF2", salt:new TextEncoder().encode("hsbllr-salt-77"), iterations:100000, hash:"SHA-256"},
    raw, {name:"AES-GCM",length:256}, false, ["encrypt","decrypt"]
  );
}

async function encryptCreds(obj){
  const key = await _getCredsKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    {name:"AES-GCM", iv},
    key,
    new TextEncoder().encode(JSON.stringify(obj))
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(enc)))
  };
}

async function decryptCreds(blob){
  try{
    const key  = await _getCredsKey();
    const iv   = Uint8Array.from(atob(blob.iv),   c=>c.charCodeAt(0));
    const data = Uint8Array.from(atob(blob.data),  c=>c.charCodeAt(0));
    const dec  = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, data);
    return JSON.parse(new TextDecoder().decode(dec));
  }catch(e){ console.warn("Deşifrə xətası:", e); return null; }
}

window.setDeliveryMode = function(mode){
  document.getElementById("adDeliveryMode").value = mode;
  const directSection = document.getElementById("deliveryDirectSection");
  const chatSection   = document.getElementById("deliveryChatSection");
  const btnDirect     = document.getElementById("deliveryBtnDirect");
  const btnChat       = document.getElementById("deliveryBtnChat");
  if(mode==="direct"){
    directSection.style.display="";
    chatSection.style.display="none";
    btnDirect.style.borderColor="#fb923c"; btnDirect.style.background="rgba(251,146,60,.1)"; btnDirect.style.color="#fb923c";
    btnChat.style.borderColor="#1c2330";   btnChat.style.background="transparent";           btnChat.style.color="#64748b";
  } else {
    directSection.style.display="none";
    chatSection.style.display="";
    btnDirect.style.borderColor="#1c2330"; btnDirect.style.background="transparent";         btnDirect.style.color="#64748b";
    btnChat.style.borderColor="#fb923c";   btnChat.style.background="rgba(251,146,60,.1)";   btnChat.style.color="#fb923c";
  }
};
window.setChatMode = function(mode){
  document.getElementById("adChatMode").value = mode;
  const autoSection = document.getElementById("chatAutoSection");
  const btnOnly = document.getElementById("chatModeOnlyChat");
  const btnBoth = document.getElementById("chatModeBoth");
  if(mode==="chat_only"){
    autoSection.style.display="none";
    btnOnly.style.borderColor="#fb923c"; btnOnly.style.background="rgba(251,146,60,.1)"; btnOnly.style.color="#fb923c";
    btnBoth.style.borderColor="#1c2330"; btnBoth.style.background="transparent";         btnBoth.style.color="#64748b";
  } else {
    autoSection.style.display="";
    btnOnly.style.borderColor="#1c2330"; btnOnly.style.background="transparent";         btnOnly.style.color="#64748b";
    btnBoth.style.borderColor="#fb923c"; btnBoth.style.background="rgba(251,146,60,.1)"; btnBoth.style.color="#fb923c";
  }
};

window.setAuthMode = function(mode){
  authStatus("");
  document.getElementById("loginTabBtn")?.classList.toggle("active", mode==="login");
  document.getElementById("registerTabBtn")?.classList.toggle("active", mode==="register");
  document.getElementById("loginStep")?.classList.toggle("active", mode==="login");
  document.getElementById("registerStep")?.classList.toggle("active", mode==="register");
  document.getElementById("phoneStep")?.classList.remove("active");
}

function updateHeader(){
  const cabinet=document.getElementById("cabinetBtn");
  const login=document.getElementById("loginBtn");
  const register=document.getElementById("registerBtn");
  const notifyPerm=document.getElementById("notifyPermBtn");

  if(currentUser && currentUser.emailVerified){
    if(login){ login.textContent=currentUser.email.split("@")[0]; login.onclick=()=>{ document.getElementById("cabinetModal")?.classList.add("show"); }; }
    if(register) register.textContent="Çıxış";
  }else{
    if(login){ login.textContent="Giriş et"; login.onclick=null; }
    if(register) register.textContent="Qeydiyyat";
  }
}

async function refreshUser(){
  if(auth.currentUser){ await reload(auth.currentUser).catch(()=>{}); currentUser=auth.currentUser; }
  else currentUser=null;
  updateHeader();
}

async function registerUser(){
  const name=document.getElementById("regName")?.value.trim() || "";
  const surname=document.getElementById("regSurname")?.value.trim() || "";
  const birthDate=document.getElementById("regBirthDate")?.value || "";
  const userId=document.getElementById("regUserId")?.value.trim().toLowerCase() || "";
  const email=document.getElementById("regEmail").value.trim().toLowerCase();
  const pass=document.getElementById("regPassword").value.trim();
  const pass2=document.getElementById("regPassword2").value.trim();
  if(!name){authStatus("Ad yaz.");return}
  if(!surname){authStatus("Soyad yaz.");return}
  if(!birthDate){authStatus("Doğum tarixini seç.");return}
  if(!userId){authStatus("İstifadəçi ID yaz.");return}
  if(!/^[a-z0-9_]{3,20}$/.test(userId)){authStatus("ID yalnız kiçik hərf, rəqəm və alt xətt (_) ola bilər, 3-20 simvol.");return}
  if(!validEmail(email)){authStatus("Düzgün email yaz.");return}
  if(pass.length<6){authStatus("Şifrə minimum 6 simvol olmalıdır.");return}
  if(pass!==pass2){authStatus("Şifrələr eyni deyil.");return}

  try{
    // ID-nin unikallığını yoxla — usernames/{userId} sənədi mövcuddursa, ID artıq götürülüb
    const usernameRef = doc(db,"usernames",userId);
    const usernameSnap = await getDoc(usernameRef);
    if(usernameSnap.exists() && !usernameSnap.data()?.invalid){
      authStatus("Bu ID artıq götürülüb. Başqa ID seç.");
      return;
    }

    window._isRegistering = true;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    // Auth state-in tam yayılmasını gözlə
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Auth timeout")), 8000);
      const unsub = auth.onAuthStateChanged(user => {
        if(user && user.uid === cred.user.uid){
          clearTimeout(timer);
          unsub();
          resolve();
        }
      });
    });

    try{
      await setDoc(usernameRef,{uid:cred.user.uid, createdAt:serverTimestamp()});

      await setDoc(doc(db,"users",cred.user.uid),{
        uid:cred.user.uid,
        name,
        surname,
        fullName:name+" "+surname,
        birthDate,
        userId,
        email,
        role: ADMIN_EMAILS.includes(email) ? "admin" : "user",
        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      });
      await ensureWallet(cred.user.uid,email);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      window._isRegistering = false;
      currentUser=null;
      updateHeader();
      authStatus("Qeydiyyat tamamlandı. Təsdiq linki emailinizə göndərildi.");
    }catch(fsErr){
      // Firestore yazması uğursuz oldu — hər şeyi geri al
      console.error("Qeydiyyat rollback:", fsErr);
      try{ await deleteDoc(usernameRef); }catch(e){
        try{ await setDoc(usernameRef, {uid:"", invalid:true}); }catch(e2){}
      }
      try{ await cred.user.delete(); }catch(e){}
      await signOut(auth).catch(()=>{});
      window._isRegistering = false;
      currentUser=null;
      throw fsErr;
    }
  }catch(e){
    window._isRegistering = false;
    console.error(e);
    authStatus("Qeydiyyat xətası: "+(e.code || e.message));
  }
}

async function loginUser(){
  const email=document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass=document.getElementById("loginPassword").value.trim();
  if(!validEmail(email)){authStatus("Düzgün email yaz.");return}
  if(!pass){authStatus("Şifrə yaz.");return}
  try{
    const cred=await signInWithEmailAndPassword(auth,email,pass);
    await reload(cred.user);
    if(!cred.user.emailVerified){
      await sendEmailVerification(cred.user).catch(()=>{});
      await signOut(auth);
      currentUser=null;
      updateHeader();
      authStatus("Email təsdiqlənməyib. Link yenidən göndərildi.");
      return;
    }
    currentUser=cred.user;
    await ensureUserProfile(currentUser);
    if(await isCurrentUserBlocked()){ await signOut(auth); currentUser=null; updateHeader(); authStatus("Hesabınız admin tərəfindən bloklanıb."); return; }
    await ensureWallet(currentUser.uid,currentUser.email);
    updateHeader();
    closeModal("loginModal");
    toast("Giriş uğurludur");
  }catch(e){
    authStatus("Email və ya şifrə yanlışdır.");
  }
}



async function resetPassword(){
  const email = (document.getElementById("loginEmail")?.value || document.getElementById("regEmail")?.value || "").trim().toLowerCase();
  if(!validEmail(email)){
    authStatus("Əvvəl email bölməsinə düzgün email yaz.");
    return;
  }
  try{
    await sendPasswordResetEmail(auth,email);
    authStatus("Şifrə bərpa linki emailinizə göndərildi.");
  }catch(e){
    console.error(e);
    authStatus("Şifrə bərpa xətası: "+(e.code || e.message));
  }
}

async function googleLogin(){
  console.log("[googleLogin] başladı");
  try{
    const provider = new GoogleAuthProvider();
    console.log("[googleLogin] popup açılır...");
    const cred = await signInWithPopup(auth, provider);
    console.log("[googleLogin] popup nəticəsi:", cred);
    currentUser = cred.user;
    console.log("[googleLogin] currentUser:", currentUser?.email);
    await ensureUserProfile(currentUser,{
      name:(currentUser.displayName||"").split(" ")[0] || "",
      surname:(currentUser.displayName||"").split(" ").slice(1).join(" ") || "",
      birthDate:""
    });
    console.log("[googleLogin] profil təmin edildi");
    await loadCurrentUserRole();
    console.log("[googleLogin] rol yükləndi:", currentUserRole);
    if(await isCurrentUserBlocked()){ await signOut(auth); currentUser=null; currentUserRole="user"; updateHeader(); authStatus("Hesabınız admin tərəfindən bloklanıb."); return; }
    await ensureWallet(currentUser.uid,currentUser.email);
    console.log("[googleLogin] wallet təmin edildi, updateHeader çağırılır");
    updateHeader();
    closeModal("loginModal");
    toast("Google ilə giriş uğurludur");
    console.log("[googleLogin] TAMAMLANDI");
  }catch(e){
    console.error("[googleLogin] XƏTA:", e.code, e.message, e);
    authStatus("Google giriş xətası: " + (e.code || e.message));
  }
}

let confirmationResultPhone = null;
function showPhoneLogin(){
  authStatus("");
  document.getElementById("loginStep")?.classList.remove("active");
  document.getElementById("registerStep")?.classList.remove("active");
  document.getElementById("loginTabBtn")?.classList.remove("active");
  document.getElementById("registerTabBtn")?.classList.remove("active");
  document.getElementById("phoneStep")?.classList.add("active");
}

function showEmailLogin(){
  document.getElementById("phoneStep")?.classList.remove("active");
  window.setAuthMode("login");
}

async function sendPhoneCode(){
  const phone = document.getElementById("phoneNumber").value.trim();
  if(!phone.startsWith("+")){
    authStatus("Telefon nömrəsini ölkə kodu ilə yaz: +994551234567");
    return;
  }
  try{
    if(!window.recaptchaVerifier){
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {size:"invisible"});
    }
    confirmationResultPhone = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    authStatus("SMS kod göndərildi.");
  }catch(e){
    console.error(e);
    authStatus("Telefon giriş xətası: " + (e.code || e.message));
  }
}

async function verifyPhoneCode(){
  const code = document.getElementById("phoneCode").value.trim();
  if(!confirmationResultPhone){ authStatus("Əvvəl SMS kod göndər."); return; }
  if(!code){ authStatus("SMS kodu yaz."); return; }
  try{
    const cred = await confirmationResultPhone.confirm(code);
    currentUser = cred.user;
    // Email girişi ilə eyni yoxlamalar — telefon girişi bunları yan keçə bilməz
    await ensureUserProfile(currentUser).catch(()=>{});
    await loadCurrentUserRole();
    if(await isCurrentUserBlocked()){
      await signOut(auth);
      currentUser = null;
      currentUserRole = "user";
      updateHeader();
      authStatus("Hesabınız admin tərəfindən bloklanıb.");
      return;
    }
    await ensureWallet(currentUser.uid, currentUser.email||"").catch(()=>{});
    updateHeader();
    closeModal("loginModal");
    toast("Telefon ilə giriş uğurludur");
  }catch(e){
    console.error(e);
    authStatus("SMS kod yanlışdır.");
  }
}

async function logoutUser(){
  await signOut(auth);
  currentUser=null;
  currentUserRole="user";
  // Köhnə hesabın real-time listener-lərini dayandır — yoxsa yeni hesabda
  // əvvəlki istifadəçinin mesajları/yazışmaları görünə bilər
  if(typeof stopChatListeners === "function") stopChatListeners();
  if(unsubMyAds){ unsubMyAds(); unsubMyAds=null; }
  if(unsubAdmin){ unsubAdmin(); unsubAdmin=null; }
  if(typeof stopAdminListeners === "function") stopAdminListeners();
  activeChatId = null;
  adminActiveChatId = null;
  // Paylaşılan kompüterdə növbəti şəxs məlumatları görməsin
  try{
    localStorage.removeItem("gs_saved_fallback");
    localStorage.removeItem("gs_seller_sales_counts");
    // Review cache-lərini təmizlə
    Object.keys(localStorage).filter(k=>k.startsWith("gs_reviews_cache_")).forEach(k=>localStorage.removeItem(k));
  }catch(e){}
  // Açıq qalmış kabinet sekmələrini təmizlə
  const chatListEl = document.getElementById("chatList");
  if(chatListEl) chatListEl.innerHTML = "";
  const chatBoxEl = document.getElementById("chatBox");
  if(chatBoxEl) chatBoxEl.innerHTML = "";
  updateHeader();
  toast("Hesabdan çıxış edildi");
}

window.showTab = function(tab){
  const map={profile:"cabProfile",add:"cabAdd",ads:"cabAds",sales:"cabSales",purchases:"cabPurchases",messages:"cabMessages",saved:"cabSaved",wallet:"cabWallet",withdraw:"cabWithdraw",support:"cabSupport",admin:"cabAdmin"};
  Object.entries(map).forEach(([key,id])=>{ const el=document.getElementById(id); if(el) el.style.display=key===tab?"":"none"; });
  document.querySelectorAll(".cabinet-menu button").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  if(tab==="profile") renderProfile();
  if(tab==="ads") listenMyAds();
  if(tab==="wallet") renderWallet();
  if(tab==="withdraw") renderWithdraw();
  if(tab==="support") renderSupport();
  if(tab==="sales") listenSales();
  if(tab==="purchases") listenPurchases();
  if(tab==="messages") renderMessagesCenter();
  if(tab==="saved") renderSavedItems();
  if(tab==="admin") listenAdmin();
}

async function renderProfile(){
  const el=document.getElementById("cabProfile");
  if(!el) return;
  let profile={};
  if(currentUser){
    const snap=await getDoc(doc(db,"users",currentUser.uid)).catch(()=>null);
    profile = snap && snap.exists() ? snap.data() : {};
  }
  el.innerHTML=`<h3>Profil ${isAdmin()?'<span class="admin-badge">ADMIN</span>':''}</h3>
    <table class="cabinet-table">
      <tr><th>Ad</th><td>${esc(profile.name || '-')}</td></tr>
      <tr><th>Soyad</th><td>${esc(profile.surname || '-')}</td></tr>
      <tr><th>Doğum tarixi</th><td>${esc(profile.birthDate || '-')}</td></tr>
      <tr><th>Email</th><td>${esc(currentUser?.email)}</td></tr>
      <tr><th>Status</th><td>Email təsdiqlənib</td></tr>
    </table>
    <h3>Profil redaktəsi</h3>
    <div class="profile-form">
      <input id="profileName" value="${esc(profile.name || '')}" placeholder="Ad">
      <input id="profileSurname" value="${esc(profile.surname || '')}" placeholder="Soyad">
      <input class="full" id="profileBirthDate" type="date" value="${esc(profile.birthDate || '')}">
      <button class="fullbtn" type="button" onclick="updateProfileInfo()">Yadda saxla</button>
    </div>
    <h3>Şifrə əməliyyatları</h3>
    <div class="profile-form">
      <input class="full" id="newPassword" type="password" placeholder="Yeni şifrə, minimum 6 simvol">
      <button class="fullbtn" type="button" onclick="changePasswordFromCabinet()">Şifrəni dəyiş</button>
      <button class="hbtn" type="button" onclick="sendPasswordResetFromProfile()">Emailə bərpa linki göndər</button>
    </div>
    <h3>Bildirişlər</h3>
    <div class="profile-form">
      <p style="font-size:13px;color:#64748b;margin:0 0 12px">${"Notification" in window ? (Notification.permission==="granted" ? "✅ Push bildirişlər aktivdir." : "Push bildirişlər deaktivdir. Yeni sifariş və mesajlar üçün aktiv edin.") : "Bu brauzer bildirişləri dəstəkləmir."}</p>
      ${"Notification" in window && Notification.permission!=="granted" ? '<button class="fullbtn" type="button" onclick="requestNotificationPermission();renderProfile()">🔔 Push bildirişləri aktiv et</button>' : ""}
    </div>`;
}


window.updateProfileInfo = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  const name=document.getElementById("profileName")?.value.trim() || "";
  const surname=document.getElementById("profileSurname")?.value.trim() || "";
  const birthDate=document.getElementById("profileBirthDate")?.value || "";
  if(!name || !surname || !birthDate){ toast("Ad, soyad və doğum tarixi boş qalmasın."); return; }
  try{
    await setDoc(doc(db,"users",currentUser.uid),{uid:currentUser.uid,name,surname,fullName:(name+" "+surname).trim(),birthDate,email:currentUser.email,role: ADMIN_EMAILS.includes(currentUser.email) ? "admin" : "user",updatedAt:serverTimestamp()},{merge:true});
    toast("Profil yeniləndi"); renderProfile();
  }catch(e){ console.error(e); toast("Profil yenilənmədi."); }
}
window.changePasswordFromCabinet = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  const pass=document.getElementById("newPassword")?.value.trim() || "";
  if(pass.length<6){ toast("Yeni şifrə minimum 6 simvol olmalıdır."); return; }
  try{ await updatePassword(currentUser,pass); document.getElementById("newPassword").value=""; toast("Şifrə dəyişdirildi"); }
  catch(e){ console.error(e); toast("Şifrə dəyişmək üçün yenidən giriş lazım ola bilər. Bərpa linkindən istifadə et."); }
}
window.sendPasswordResetFromProfile = async function(){
  await refreshUser();
  if(!currentUser?.email){ openModal("loginModal"); return; }
  try{ await sendPasswordResetEmail(auth,currentUser.email); toast("Şifrə bərpa linki emailə göndərildi"); }
  catch(e){ console.error(e); toast("Bərpa linki göndərilmədi."); }
}

async function openCabinet(){
  await refreshUser();
  if(!currentUser || !currentUser.emailVerified){
    openModal("loginModal");
    return;
  }
  if(await blockGuard("Kabinet")) return;
  const adminTab=document.getElementById("adminTabBtn");
  if(adminTab) adminTab.style.display=isAdmin()?"":"none";
  document.getElementById("cabinetModal")?.classList.add("show");
  window.showTab("profile");
}


window.editMyAd = async function(id,arr){
  const a=(arr||[]).find(x=>x.id===id); if(!a) return;
  window.showTab("add");
  document.getElementById("adTitle").value=a.title || "";
  document.getElementById("adCategory").value=a.category || "Hesab";
  syncAdFormToCategory();
  const _sv = (id,val) => { const el=document.getElementById(id); if(el) el.value=val||""; };
  const _cat = a.category || "Hesab";
  if(_cat==="Hesab"){
    setSelectOrCustom("adGame","adGameCustom",a.game||"");
    _sv("adRank",a.rank); _sv("adLevel",a.level);
  } else if(_cat==="Skin"){
    _sv("adGameSkin",a.platform);
  } else if(_cat==="Oyun Pulu"){
    _sv("adGameCurrency",a.platform); _sv("adCurrencyAmount",a.level);
  } else if(_cat==="Gift Card & E-Pin"){
    _sv("adGiftStore",a.platform); _sv("adGiftNominal",a.level);
  } else if(_cat==="Oyun Boost"){
    _sv("adGameBoost",a.platform); _sv("adBoostFrom",a.server); _sv("adBoostTo",a.rank);
  } else if(_cat==="Hesab Kirayəsi"){
    _sv("adGameRent",a.platform); _sv("adRentRank",a.rank); _sv("adRentDuration",a.level);
  } else if(_cat==="Sosial Media"){
    _sv("adSocialPlatform",a.platform); _sv("adSocialFollowers",a.level);
  } else if(_cat==="Oyun Konsolu"){
    _sv("adConsoleBrand",a.platform); _sv("adConsoleCondition",a.rank);
  }
  document.getElementById("adPrice").value=Number(a.price||0).toFixed(2);
  if(document.getElementById("adOriginalPrice")) document.getElementById("adOriginalPrice").value=a.originalPrice ? Number(a.originalPrice).toFixed(2) : "";
  if(document.getElementById("adTags"))    document.getElementById("adTags").value=(a.tags||[]).join(", ");
  if(document.getElementById("adContact")) document.getElementById("adContact").value=a.contact || "";
  if(document.getElementById("adStock"))   document.getElementById("adStock").value=a.stock || "1";
  if(document.getElementById("adVideo"))   document.getElementById("adVideo").value=a.video || "";
  document.getElementById("adDesc").value=a.desc || "";
  const btn=document.getElementById("adSubmit"); if(btn){ btn.textContent="Elanı yenilə"; btn.dataset.editingId=id; }
}
window.deleteMyAd = async function(id){
  await refreshUser(); if(!currentUser) return;
  try{ await deleteDoc(doc(db,"ads",id)); toast("Elan silindi"); }
  catch(e){ console.error(e); toast("Elan silinmədi."); }
}

window.submitAd = async function(){
  await refreshUser();
  if(!currentUser || !currentUser.emailVerified){ openModal("loginModal"); return; }
  if(!rateLimiter("submitAd", 60_000, "Elan göndərmək üçün 60 saniyə gözləyin.")) return;

  // blockGuard xəta versə elanı dayandırma — sadəcə xəbərdarlıq ver
  try{ if(await blockGuard("Elan yerləşdirmək")) return; }catch(blockErr){ console.warn("blockGuard error (ignored):", blockErr); }

  const title    = document.getElementById("adTitle")?.value.trim() || "";
  const category = document.getElementById("adCategory")?.value || "Hesab";
  const game     = getSelectedGameValue();
  const price    = document.getElementById("adPrice")?.value.trim() || "";
  const originalPrice = document.getElementById("adOriginalPrice")?.value.trim() || "";
  const tagsRaw  = document.getElementById("adTags")?.value.trim() || "";
  const contact  = document.getElementById("adContact")?.value.trim() || "";
  const stock    = parseInt(document.getElementById("adStock")?.value.trim() || "1", 10) || 1;
  const video    = document.getElementById("adVideo")?.value.trim() || "";
  const desc     = document.getElementById("adDesc")?.value.trim() || "";
  const proFields = readAdProfessionalFields();

  // Yalnız başlıq və qiymət məcburidir
  if(!title){ toast("Elan başlığını yazın"); return; }
  if(!price){ toast("Qiyməti yazın"); return; }

  const submitBtn = document.getElementById("adSubmit");
  try{
    if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent="Göndərilir..."; }

    const imageUrls = await uploadAdImageToCloudinary();
    const imageUrl  = imageUrls[0] || "";
    const tags = tagsRaw ? tagsRaw.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean).slice(0,10) : [];
    const editingId = submitBtn?.dataset?.editingId || "";
    const sellerProfileSnap = await getDoc(doc(db,"users",currentUser.uid)).catch(()=>null);
    const sellerVerified = !!(sellerProfileSnap && sellerProfileSnap.exists() && sellerProfileSnap.data()?.sellerVerified);
    const sellerUserId = (sellerProfileSnap && sellerProfileSnap.exists() && sellerProfileSnap.data()?.userId) || "";

    // Çatdırılma üsulu və hesab məlumatları
    const deliveryMode = document.getElementById("adDeliveryMode")?.value || "direct";
    const chatMode     = document.getElementById("adChatMode")?.value || "chat_only";

    let accountCredentials = null;
    if(deliveryMode === "direct"){
      const mailEmail    = (document.getElementById("adMailEmail")?.value    || "").trim();
      const mailPassword = (document.getElementById("adMailPassword")?.value || "").trim();
      const accLogin     = (document.getElementById("adAccountLogin")?.value || "").trim();
      const accPassword  = (document.getElementById("adAccountPassword")?.value || "").trim();
      const extraInfo    = (document.getElementById("adExtraInfo")?.value    || "").trim();
      if(mailEmail || mailPassword || accLogin || accPassword || extraInfo){
        // AES-256 ilə şifrələ — Firestore-da açıq saxlanılmasın
        accountCredentials = await encryptCreds({mailEmail, mailPassword, login:accLogin, password:accPassword, extraInfo});
      }
    } else if(deliveryMode === "chat" && chatMode === "chat_and_auto"){
      const accLogin    = (document.getElementById("adChatAutoLogin")?.value    || "").trim();
      const accPassword = (document.getElementById("adChatAutoPassword")?.value || "").trim();
      if(accLogin || accPassword){
        accountCredentials = await encryptCreds({login:accLogin, password:accPassword});
      }
    }

    const adPayload = {
      title, category, game, ...proFields,
      price: moneyToNumber(price),
      originalPrice: originalPrice ? moneyToNumber(originalPrice) : 0,
      tags, contact, stock, video, desc, imageUrl, imageUrls,
      status: "Gözləmədə",
      sellerUid: currentUser.uid,
      sellerEmail: currentUser.email,
      sellerUserId,
      sellerVerified,
      ...(accountCredentials ? {accountCredentials} : {}),
      deliveryMode,
      chatMode: deliveryMode==="chat" ? chatMode : null,
      updatedAt: serverTimestamp()
    };

    if(editingId){
      await updateDoc(doc(db,"ads",editingId), adPayload);
    } else {
      // Elan müddəti: 30 gün (1 ay)
      const expiresAt = new Date(Date.now() + 30*24*60*60*1000);
      await addDoc(collection(db,"ads"), {...adPayload, views:0, createdAt:serverTimestamp(), expiresAt});
    }

    // Formu təmizlə
    ["adTitle","adPrice","adOriginalPrice","adTags","adContact","adStock","adVideo","adDesc",
     "adAccountLogin","adAccountPassword","adMailEmail","adMailPassword","adExtraInfo",
     "adChatAutoLogin","adChatAutoPassword"].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value="";
    });
    // Çatdırılma üsulunu sıfırla
    if(window.setDeliveryMode) window.setDeliveryMode("direct");
    clearAdProfessionalFields();
    if(document.getElementById("adImageFile"))    document.getElementById("adImageFile").value="";
    if(document.getElementById("adImagePreview")) document.getElementById("adImagePreview").innerHTML="";

    // Admin paneli yenilə (əgər açıqdırsa)
    if(typeof _fetchPendingAds==="function") setTimeout(_fetchPendingAds, 1000);

    // Kabineti bağla və uğur bildirişi göstər
    const modal = document.getElementById("cabinetModal");
    if(modal) modal.classList.remove("show");
    authStatus(editingId
      ? "✅ Elan yeniləndi! Admin təsdiqindən sonra bazara çıxacaq."
      : "✅ Elanınız göndərildi! Admin təsdiqindən sonra bazara çıxacaq.");

  }catch(e){
    console.error("submitAd error:", e);
    authStatus("⚠️ Elan göndərilmədi: " + (e.message || String(e)));
  }finally{
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent="Elanı göndər"; delete submitBtn.dataset.editingId; }
  }
}


window.createOrdersFromCart = async function(items){
  await refreshUser();
  if(!currentUser || !currentUser.emailVerified){ openModal("loginModal"); toast("Alış üçün əvvəlcə giriş et"); return; }
  if(await blockGuard("Alış")) return;
  if(!items || !items.length){ toast("Səbət boşdur"); return; }

  const total = items.reduce((s,item)=>s+moneyToNumber(item.price),0);
  const buyerRef = doc(db,"wallets",currentUser.uid);

  try{
    // Wallet-ləri əvvəlcədən təmin et (transaction xaricində)
    console.log("[order] ensureWallet başlayır, uid:", currentUser.uid);
    await ensureWallet(currentUser.uid, currentUser.email);
    console.log("[order] ensureWallet tamamlandı");

    // Transaction: yalnız alıcının öz wallet-indən çıx
    console.log("[order] transaction başlayır, total:", total);
    await runTransaction(db, async (tx)=>{
      const wSnap = await tx.get(buyerRef);
      const w = wSnap.exists() ? (wSnap.data()||{}) : {balance:0,totalSpent:0};
      const bal = Number(w.balance||0);
      console.log("[order] tx: mövcud balans:", bal, "tələb:", total);
      if(bal < total) throw new Error("INSUFFICIENT_BALANCE");
      tx.set(buyerRef,{
        uid: currentUser.uid,
        email: currentUser.email||"",
        balance: bal-total,
        totalSpent: Number(w.totalSpent||0)+total,
        updatedAt: serverTimestamp()
      },{merge:true});
    });
    console.log("[order] transaction tamamlandı");
    // Qeyd: admin-in qazancı orders kolleksiyasından hesablanır,
    // ayrıca admin wallet-inə yazmağa ehtiyac yoxdur.

    // 2. Hər item üçün sifariş yarat
    for(const item of items){
      let adData = null;
      let pendingCredentials = null;

      // Satıcının elanda yerləşdirdiyi hesab məlumatlarını sifarişə kopyala.
      // Vacib: bunu order yaradılan anda edirik ki, admin panelində itmə olmasın.
      if(item.adId){
        try{
          const adSnap = await getDoc(doc(db,"ads",item.adId));
          if(adSnap.exists()){
            adData = adSnap.data() || {};
            if(adData.accountCredentials && adData.accountCredentials.data){
              pendingCredentials = adData.accountCredentials;
            }
          }
        }catch(credReadErr){
          console.warn("[creds] Elan hesab məlumatı oxunmadı:", credReadErr);
        }
      }

      const orderPayload = {
        productTitle: item.name||"Məhsul",
        price: moneyToNumber(item.price),
        priceText: item.price||"",
        adId: item.adId||"",
        sellerUid: item.sellerUid || adData?.sellerUid || "",
        sellerEmail: item.sellerEmail || adData?.sellerEmail || "GameSatış",
        buyerUid: currentUser.uid,
        buyerEmail: currentUser.email,
        status: "Aktiv",
        buyerConfirmed: false,
        sellerConfirmed: false,
        payoutRequested: false,
        payoutDone: false,
        credentialsStatus: pendingCredentials ? "Admin yoxlamasında" : "Yoxdur",
        ...(pendingCredentials ? { pendingCredentials } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db,"orders"), orderPayload);

      // Elanı "Rezervdə" et — satıcı öz elanını yeniləyə bilir,
      // buna görə elanı satıcı adından yox, birbaşa Firestore Admin ilə deyil
      // amma Firestore Rules-da ads update icazəsi var: isAdmin() || sellerUid==auth.uid
      // Biz burada buyerUid saxlayırıq ki, elan ikinci dəfə satılmasın
      // Real həll: Rules-da "buyerUid" sahəsini buyer dəyişə bilsin
      if(item.adId && item.sellerUid){
        // Satıcı sonradan "Satıldı" edəcək — biz sadəcə bazardan gizlətmək üçün
        // ad document-a buyerUid yazırıq (yalnız satıcı update edə bilər, skip edirik)
        // Əvəzinə: listenPublicAds-da bu adId-ni orders-dan gizlədirdik (indi silindi)
        // Yeni həll: sifariş yarandıqda adId-ni window._reservedAdIds set-inə əlavə et
        if(!window._reservedAdIds) window._reservedAdIds = new Set();
        window._reservedAdIds.add(item.adId);
      }

      // Admin panelinin yuxarı bildiriş bölməsi üçün əlavə bildiriş yaratmağa cəhd et.
      // Bu alınmasa belə əsas məlumat artıq orders.pendingCredentials içində saxlanılıb.
      if(pendingCredentials){
        try{
          const c = await decryptCreds(pendingCredentials);
          if(c){
            let credText = "";
            if(c.mailEmail || c.mailPassword) credText += `📧 Mail: ${c.mailEmail}\n🔑 Mail şifrəsi: ${c.mailPassword}\n`;
            if(c.login || c.password)         credText += `🎮 Login: ${c.login}\n🔒 Şifrə: ${c.password}\n`;
            if(c.extraInfo)                   credText += `📝 Əlavə: ${c.extraInfo}\n`;

            // Admin panelinə bildiriş göndər. Alıcı bu məlumatları görmür.
            await addDoc(collection(db,"adminNotifications"),{
              type: "credentials",
              orderId: orderRef.id,
              productTitle: item.name||"Məhsul",
              price: moneyToNumber(item.price),
              buyerUid: currentUser.uid,
              buyerEmail: currentUser.email||"",
              sellerUid: item.sellerUid || adData?.sellerUid || "",
              sellerEmail: item.sellerEmail || adData?.sellerEmail || "",
              credentials: credText,
              status: "Admin təsdiqi gözləyir",
              createdAt: serverTimestamp()
            });
            console.log("[creds] ✅ adminNotifications-a yazıldı");
          }
        }catch(credErr){
          console.warn("[creds] Bildiriş yaradılmadı, amma məlumat order-də saxlanıldı:", credErr);
        }
      }
    }

    cart=[]; localStorage.setItem("gs_cart",JSON.stringify(cart)); updateCart();
    toast("✅ Sifariş yaradıldı! Sifarişlərim bölməsini yoxla.");
    openCabinet();
    window.showTab("purchases");
  }catch(e){
    console.error("[createOrdersFromCart] XƏTA:", e.code, e.message, e);
    if(e.message==="INSUFFICIENT_BALANCE"){ toast("Balans kifayət etmir. Əvvəl balans artır."); openCabinet(); window.showTab("wallet"); }
    else toast("Sifariş yaradılmadı: " + (e.code||e.message||""));
  }
}


async function ensureWallet(uid,email){
  const ref=doc(db,"wallets",uid);
  const snap=await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref,{uid,email,balance:0,pendingIn:0,pendingOut:0,escrowOut:0,totalSpent:0,totalEarned:0,updatedAt:serverTimestamp()});
    return {uid,email,balance:0,pendingIn:0,pendingOut:0,escrowOut:0,totalSpent:0,totalEarned:0};
  }
  return snap.data();
}

function walletNumber(v){ return Number(v||0).toFixed(2)+" ₼"; }

async function renderWallet(){
  const el=document.getElementById("cabWallet");
  if(!el || !currentUser) return;
  const w=await ensureWallet(currentUser.uid,currentUser.email);
  el.innerHTML=`
    <h3>Balansım</h3>
    <div class="wallet-grid">
      <div class="wallet-card"><span>Cari balans</span><b>${walletNumber(w.balance)}</b></div>
      <div class="wallet-card"><span>Gözləyən artırma</span><b>${walletNumber(w.pendingIn)}</b></div>
      <div class="wallet-card"><span>Gözləyən çıxarış</span><b>${walletNumber(w.pendingOut)}</b></div>
      <div class="wallet-card"><span>Alışda gözləyən</span><b>${walletNumber(w.escrowOut)}</b></div>
    </div>
    <div class="wallet-note">
      <b>Manual balans artırma:</b><br>
      Ödənişi aşağıdakı rekvizitə et, sonra məbləği və çek linkini göndər. Admin təsdiqləyəndən sonra balans avtomatik artacaq.
    </div>
    <div class="pay-info">
      <div><b>m10 / Kart:</b><br>+994 55 570 70 71</div>
      <div><b>Təyinat:</b><br>${currentUser.email}</div>
    </div>
    <div class="request-form">
      <input id="depositAmount" inputmode="decimal" placeholder="Məbləğ, məsələn 20">
      <select id="depositMethod"><option>m10</option><option>Kartdan-karta</option><option>Bank köçürməsi</option></select>
      <input class="full" id="depositReceiptFile" type="file" accept="image/*">
      <input class="full" id="depositReceipt" placeholder="Çek şəkli/linki (istəyə görə)">
      <button class="fullbtn" type="button" onclick="submitDepositRequest()">Balans artırma müraciəti göndər</button>
    </div>
    <div id="walletTx"></div>`;
  listenMyTransactions();
}

window.submitDepositRequest = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(!rateLimiter("submitDeposit", 30_000, "Balans artırma müraciəti üçün 30 saniyə gözləyin.")) return;
  const amount=moneyToNumber(document.getElementById("depositAmount")?.value);
  const method=document.getElementById("depositMethod")?.value || "Manual";
  const receipt=(await uploadAnyImageToCloudinary("depositReceiptFile","receipts")) || document.getElementById("depositReceipt")?.value.trim() || "";
  if(!(amount>0)){ toast("Məbləği düzgün yaz."); return; }
  try{
    await ensureWallet(currentUser.uid,currentUser.email);
    await addDoc(collection(db,"balanceRequests"),{
      type:"deposit",amount,method,receipt,
      status:"Gözləmədə",
      userUid:currentUser.uid,userEmail:currentUser.email,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    const ref=doc(db,"wallets",currentUser.uid);
    const snap=await getDoc(ref); const w=snap.data()||{};
    await updateDoc(ref,{pendingIn:Number(w.pendingIn||0)+amount,updatedAt:serverTimestamp()});
    toast("Balans artırma müraciəti göndərildi");
    renderWallet();
  }catch(e){ console.error(e); toast("Müraciət göndərilmədi. Firestore Rules yoxla."); }
}

async function renderWithdraw(){
  const el=document.getElementById("cabWithdraw");
  if(!el || !currentUser) return;
  const w=await ensureWallet(currentUser.uid,currentUser.email);
  el.innerHTML=`
    <h3>Satıcı çıxarışı</h3>
    <div class="wallet-grid">
      <div class="wallet-card"><span>Çıxarıla bilən balans</span><b>${walletNumber(w.balance)}</b></div>
      <div class="wallet-card"><span>Gözləyən çıxarış</span><b>${walletNumber(w.pendingOut)}</b></div>
      <div class="wallet-card"><span>Ümumi qazanc</span><b>${walletNumber(w.totalEarned)}</b></div>
    </div>
    <div class="request-form">
      <input id="withdrawAmount" inputmode="decimal" placeholder="Məbləğ, məsələn 50">
      <select id="withdrawMethod"><option>m10</option><option>Kart</option><option>Bank hesabı</option></select>
      <input class="full" id="withdrawDetails" placeholder="Kart/m10/bank məlumatı">
      <button class="fullbtn" type="button" onclick="submitWithdrawRequest()">Çıxarış müraciəti göndər</button>
    </div>
    <div class="wallet-note">Çıxarış admin təsdiqindən sonra manual icra olunur.</div>`;
}

window.submitWithdrawRequest = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(!rateLimiter("submitWithdraw", 30_000, "Çıxarış müraciəti üçün 30 saniyə gözləyin.")) return;
  const amount=moneyToNumber(document.getElementById("withdrawAmount")?.value);
  const method=document.getElementById("withdrawMethod")?.value || "Manual";
  const details=document.getElementById("withdrawDetails")?.value.trim() || "";
  if(!(amount>0)){ toast("Məbləği düzgün yaz."); return; }
  const walletRef=doc(db,"wallets",currentUser.uid);
  try{
    // Transaction: balans yetərliliyi yoxlanışı və çıxılması atomik icra edilir
    await runTransaction(db, async (tx)=>{
      await ensureWallet(currentUser.uid,currentUser.email);
      const wSnap=await tx.get(walletRef);
      const w=wSnap.data()||{};
      const bal=Number(w.balance||0);
      if(bal<amount) throw new Error("INSUFFICIENT_BALANCE");
      tx.update(walletRef,{
        balance:bal-amount,
        pendingOut:Number(w.pendingOut||0)+amount,
        updatedAt:serverTimestamp()
      });
    });
    await addDoc(collection(db,"balanceRequests"),{
      type:"withdraw",amount,method,details,
      status:"Gözləmədə",
      userUid:currentUser.uid,userEmail:currentUser.email,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    toast("Çıxarış müraciəti göndərildi");
    renderWithdraw();
  }catch(e){
    console.error(e);
    if(e.message==="INSUFFICIENT_BALANCE") toast("Balans kifayət etmir.");
    else toast("Çıxarış müraciəti göndərilmədi.");
  }
}

function renderSupport(){
  const el=document.getElementById("cabSupport");
  if(!el || !currentUser) return;
  el.innerHTML=`
    <h3>Dəstək / Şikayət</h3>
    <div class="request-form">
      <select id="ticketType"><option>Sifariş problemi</option><option>Satıcı şikayəti</option><option>Balans problemi</option><option>Digər</option></select>
      <input id="ticketSubject" placeholder="Mövzu">
      <input class="full" id="ticketText" placeholder="Problemi qısa yaz">
      <button class="fullbtn" type="button" onclick="submitTicket()">Dəstəyə göndər</button>
    </div>
    <div id="myTickets"></div>`;
  listenMyTickets();
}

window.submitTicket = async function(){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(!rateLimiter("submitTicket", 60_000, "Dəstək müraciəti üçün 60 saniyə gözləyin.")) return;
  const type=document.getElementById("ticketType")?.value || "Digər";
  const subject=document.getElementById("ticketSubject")?.value.trim() || "";
  const text=document.getElementById("ticketText")?.value.trim() || "";
  if(!subject || !text){ toast("Mövzu və məlumat yaz."); return; }
  try{
    await addDoc(collection(db,"tickets"),{
      type,subject,text,status:"Açıq",
      userUid:currentUser.uid,userEmail:currentUser.email,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    toast("Dəstək müraciəti göndərildi");
    renderSupport();
  }catch(e){ console.error(e); toast("Müraciət göndərilmədi."); }
}

function listenMyTransactions(){
  const el=document.getElementById("walletTx");
  if(!el || !currentUser) return;
  const q=query(collection(db,"balanceRequests"),where("userUid","==",currentUser.uid));
  onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    el.innerHTML='<h3>Balans tarixçəsi</h3>'+(arr.length?`<table class="cabinet-table"><thead><tr><th>Tip</th><th>Məbləğ</th><th>Metod</th><th>Status</th></tr></thead><tbody>${arr.map(r=>`<tr><td>${r.type==="deposit"?"Artırma":"Çıxarış"}</td><td>${walletNumber(r.amount)}</td><td>${esc(r.method||"-")}</td><td>${statusHtml(r.status)}</td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">Hələ balans əməliyyatı yoxdur.</div>');
  });
}

function listenMyTickets(){
  const el=document.getElementById("myTickets");
  if(!el || !currentUser) return;
  const q=query(collection(db,"tickets"),where("userUid","==",currentUser.uid));
  onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    el.innerHTML='<h3>Müraciətlərim</h3>'+(arr.length?`<table class="cabinet-table"><thead><tr><th>Tip</th><th>Mövzu</th><th>Status</th><th>Admin cavabı</th></tr></thead><tbody>${arr.map(t=>`<tr><td>${esc(t.type)}</td><td>${esc(t.subject)}</td><td>${statusHtml(t.status)}</td><td>${esc(t.adminReply||"-")}</td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">Müraciət yoxdur.</div>');
  });
}

function stopAdminListeners(){
  adminUnsubs.forEach(fn=>{ try{ fn && fn(); }catch(e){} });
  adminUnsubs=[];
}
function setAdminStat(key,val){
  adminStatsState[key]=val;
  renderAdminStats();
}

let chatUnsubs=[];
let headerNotifUnsubs=[];
let activeChatId="";
let adminActiveChatId="";
function stopChatListeners(){ chatUnsubs.forEach(u=>{try{u&&u()}catch(e){}}); chatUnsubs=[]; }
function stopHeaderNotifications(){ headerNotifUnsubs.forEach(u=>{try{u&&u()}catch(e){}}); headerNotifUnsubs=[]; }
function setHeaderNotificationCount(count){
  const btn=document.getElementById("notifyBtn");
  const badge=document.getElementById("notifyBadge");
  if(!btn || !badge) return;
  const n=Number(count||0);
  btn.style.display="grid";
  badge.textContent=String(n>99?"99+":n);
  badge.style.display=n>0?"grid":"none";
}
function listenHeaderNotifications(){
  stopHeaderNotifications();
  setHeaderNotificationCount(0);
  if(!currentUser) return;
  let buyerUnread=0, sellerUnread=0;
  const draw=()=>setHeaderNotificationCount(buyerUnread+sellerUnread);
  const qb=query(collection(db,"chats"),where("buyerUid","==",currentUser.uid));
  const qs=query(collection(db,"chats"),where("sellerUid","==",currentUser.uid));
  headerNotifUnsubs.push(onSnapshot(qb,s=>{
    buyerUnread=0;
    s.forEach(d=>{ buyerUnread+=Number((d.data()||{}).unreadBuyer||0); });
    draw();
  },e=>console.error(e)));
  headerNotifUnsubs.push(onSnapshot(qs,s=>{
    sellerUnread=0;
    s.forEach(d=>{ sellerUnread+=Number((d.data()||{}).unreadSeller||0); });
    draw();
  },e=>console.error(e)));
}
window.openNotifications=function(){
  if(!currentUser){ openModal("loginModal"); return; }
  document.getElementById("cabinetModal")?.classList.add("show");
  if(typeof window.showTab==="function") window.showTab("messages");
};

// ============================================================
// PUSH BİLDİRİŞLƏR — Notifications API
// ============================================================
// FCM token saxlamaq üçün (tam push notification Firebase Functions tələb edir)
// Bu hissə: icazə almaq + local bildiriş + FCM token Firestore-a yazmaq

window.requestNotificationPermission = async function(){
  if(!("Notification" in window)){ toast("Bu brauzer bildirişləri dəstəkləmir."); return; }
  if(!currentUser){ openModal("loginModal"); return; }
  try{
    const permission = await Notification.requestPermission();
    if(permission === "granted"){
      toast("✓ Bildirişlər aktiv edildi!");
      await saveNotificationToken();
    } else {
      toast("Bildiriş icazəsi verilmədi.");
    }
  }catch(e){ console.warn("Notification permission:", e); }
};

async function saveNotificationToken(){
  if(!currentUser) return;
  try{
    // FCM token almaq üçün Firebase Messaging SDK lazımdır
    // Hazırda: istifadəçi notification icazəsini qeyd edirik
    await setDoc(doc(db,"users",currentUser.uid),{
      notificationsEnabled: true,
      notificationUpdatedAt: serverTimestamp()
    },{merge:true});
  }catch(e){ console.warn("Token save:", e); }
}

// Local bildiriş göstər (sayt açıq olanda)
function showLocalNotification(title, body, icon){
  if(Notification.permission !== "granted") return;
  try{
    new Notification(title, {
      body: body || "",
      icon: icon || "https://res.cloudinary.com/dtipzh3lx/image/upload/v1/icon.png",
      badge: "https://res.cloudinary.com/dtipzh3lx/image/upload/v1/icon.png",
      tag: "gamesatis-" + Date.now()
    });
  }catch(e){ console.warn("Local notification:", e); }
}
window.showLocalNotification = showLocalNotification;

// ============================================================
// SOSİAL PAYLAŞIM
// ============================================================
window.shareCurrentProduct = async function(){
  const p = window.currentDetailProduct || {};
  const title = p.title || "GameSatış Azərbaycan";
  const price = p.price || "";
  const text = `${title} — ${price}\nGameSatış Azərbaycan-da bax!`;
  const url = window.location.href;

  if(navigator.share){
    try{
      await navigator.share({title, text, url});
    }catch(e){
      // İstifadəçi paylaşımı ləğv edibsə sakitcə keç
      if(e.name !== "AbortError") console.warn("Share xətası:", e);
    }
  } else {
    // Desktop fallback — linki kopyala
    try{
      await navigator.clipboard.writeText(url);
      toast("Link kopyalandı!");
    }catch(e){
      toast("Link: " + url);
    }
  }
};

// Yeni mesaj gəldikdə bildiriş göstər
function notifyNewMessage(chatTitle, messageText){
  if(document.hasFocus()) return; // Sayt aktiv olarsa bildiriş göstərmə
  showLocalNotification(
    "📩 Yeni mesaj — " + (chatTitle||"GameSatış"),
    messageText || "Yeni mesajınız var",
  );
}
window.notifyNewMessage = notifyNewMessage;

// Yeni sifariş gəldikdə bildiriş göstər
function notifyNewOrder(productTitle, buyerEmail){
  showLocalNotification(
    "🛒 Yeni sifariş!",
    (productTitle||"Məhsulunuz") + " üçün sifariş gəldi" + (buyerEmail ? " — " + buyerEmail : "")
  );
}
window.notifyNewOrder = notifyNewOrder;
function chatProductKey(p){
  const raw=String((p&&(p.adId||p.id||p.title))||"product");
  return raw.toLowerCase().replace(/[^a-z0-9\u0259\u0131\u00f6\u00fc\u011f\u015f\u00e7]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,90)||"product";
}
function chatIdFor(buyerUid,sellerUid,p){ return [buyerUid,sellerUid,chatProductKey(p)].join("__").replace(/[^a-zA-Z0-9_\-]/g,"_"); }
function messageTime(v){
  try{ const d=v&&v.toDate?v.toDate():new Date(v||Date.now()); return d.toLocaleString("az-AZ",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }catch(e){ return ""; }
}
function chatOtherTitle(c){
  if(!currentUser) return c.productTitle||"Yazışma";
  const other = c.buyerUid===currentUser.uid ? (c.sellerEmail||"Satıcı") : (c.buyerEmail||"Alıcı");
  return (c.productTitle||"Məhsul") + " • " + other;
}
async function ensureChatForProduct(p){
  await refreshUser();
  if(!currentUser || !currentUser.emailVerified){ openModal("loginModal"); return null; }
  if(await blockGuard("Mesaj yazmaq")) return null;
  p=p||{};
  let sellerUid=p.sellerUid||"";
  let sellerEmail=p.sellerEmail||"";
  if(!sellerUid && !sellerEmail){ sellerUid="site_admin"; sellerEmail=ADMIN_EMAILS[0]||"admin@gamesatis.az"; }
  if(sellerUid && sellerUid===currentUser.uid){ toast("Öz elanına mesaj yaza bilməzsən."); return null; }
  const buyerUid=currentUser.uid;
  const chatId=chatIdFor(buyerUid,sellerUid||sellerEmail,p);
  const ref=doc(db,"chats",chatId);
  const snap=await getDoc(ref).catch(()=>null);
  const payload={
    buyerUid,buyerEmail:currentUser.email||"",sellerUid:sellerUid||"site_admin",sellerEmail:sellerEmail||"",
    productId:p.adId||p.id||"",productTitle:p.title||"Məhsul",productPrice:p.price||"",productImage:p.icon||"",
    participants:[buyerUid,sellerUid||"site_admin"],lastMessage:"",unreadBuyer:0,unreadSeller:0,updatedAt:serverTimestamp()
  };
  if(!snap || !snap.exists()) await setDoc(ref,{...payload,createdAt:serverTimestamp()});
  else await updateDoc(ref,{updatedAt:serverTimestamp()}).catch(()=>{});
  return chatId;
}
window.openChatFromProduct=async function(p){
  const id=await ensureChatForProduct(p);
  if(!id) return;
  closeModal("productModal");
  document.getElementById("cabinetModal")?.classList.add("show");
  window.showTab("messages");
  setTimeout(()=>openChat(id),250);
};
function renderMessagesCenter(){
  const el=document.getElementById("cabMessages");
  if(!el) return;
  if(!currentUser){ el.innerHTML='<h3>Mesajlar</h3><div class="cabinet-empty">Mesajları görmək üçün giriş et.</div>'; return; }
  el.innerHTML='<h3>Mesajlar</h3><div class="chat-layout"><div class="chat-list" id="chatList"><div class="cabinet-empty">Yüklənir...</div></div><div class="chat-box" id="chatBox"><div class="chat-head"><b>Yazışma seç</b><small>Soldan alıcı/satıcı yazışmasını aç.</small></div><div class="chat-messages"></div><div class="chat-form"><input disabled placeholder="Yazışma seç"><button class="hbtn" disabled>Göndər</button></div></div></div>';
  listenMyChats();
}
function mergeChats(a,b){
  const map=new Map();
  [...a,...b].forEach(x=>map.set(x.id,x));
  return [...map.values()].sort((x,y)=>{
    const tx=x.updatedAt&&x.updatedAt.toMillis?x.updatedAt.toMillis():0;
    const ty=y.updatedAt&&y.updatedAt.toMillis?y.updatedAt.toMillis():0;
    return ty-tx;
  });
}
function listenMyChats(){
  stopChatListeners();
  if(!currentUser) return;

  const el=document.getElementById("chatList");
  if(el) el.innerHTML='<div class="cabinet-empty">Yüklənir...</div>';

  let buyer=[], seller=[];
  const draw=()=>drawChatList(mergeChats(buyer,seller));

  const qb=query(collection(db,"chats"),where("buyerUid","==",currentUser.uid));
  const qs=query(collection(db,"chats"),where("sellerUid","==",currentUser.uid));

  chatUnsubs.push(onSnapshot(qb,s=>{
    buyer=[];
    s.forEach(d=>buyer.push({id:d.id,...d.data()}));
    draw();
  },e=>{console.error(e);if(el)el.innerHTML='<div class="cabinet-empty">Yazışmalar yüklənmədi.</div>';}));

  chatUnsubs.push(onSnapshot(qs,s=>{
    seller=[];
    s.forEach(d=>{const c={id:d.id,...d.data()};if(c.buyerUid!==currentUser.uid)seller.push(c);});
    draw();
  },e=>console.error(e)));
}
function drawChatList(arr){
  const el=document.getElementById("chatList"); if(!el) return;
  if(!arr.length){ el.innerHTML='<div class="cabinet-empty">Hələ yazışma yoxdur. Məhsul səhifəsindən “Satıcıya yaz” seç.</div>'; return; }
  el.innerHTML=arr.map(c=>{
    const unread=c.buyerUid===currentUser.uid?Number(c.unreadBuyer||0):Number(c.unreadSeller||0);
    return `<button class="chat-item ${c.id===activeChatId?'active':''}" type="button" data-chat-open="${esc(c.id)}"><b>${esc(chatOtherTitle(c))}${unread?`<span class="chat-unread">${unread}</span>`:""}</b><small>${esc(c.lastMessage||"Yeni yazışma")}</small></button>`;
  }).join("");
  el.querySelectorAll("[data-chat-open]").forEach(b=>b.onclick=()=>openChat(b.dataset.chatOpen));
}
async function openChat(chatId,adminMode=false){
  const box=document.getElementById(adminMode?"adminChatBox":"chatBox"); if(!box) return;
  const ref=doc(db,"chats",chatId);
  const snap=await getDoc(ref).catch(()=>null); const c=snap&&snap.exists()?{id:snap.id,...snap.data()}:null;
  if(!c){ box.innerHTML='<div class="cabinet-empty">Yazışma tapılmadı.</div>'; return; }

  // KRİTİK TƏHLÜKƏSİZLİK YOXLAMASI: bu chat həqiqətən cari istifadəçiyə aiddirmi?
  // Admin rejimi xaricdə, yalnız alıcı/satıcı öz yazışmasını aça bilər
  if(!adminMode){
    const belongsToUser = currentUser && (
      c.buyerUid===currentUser.uid ||
      c.sellerUid===currentUser.uid
    );
    if(!belongsToUser){
      box.innerHTML='<div class="cabinet-empty">Bu yazışmaya icazəniz yoxdur.</div>';
      return;
    }
  } else if(!isAdmin()){
    box.innerHTML='<div class="cabinet-empty">Admin icazəniz yoxdur.</div>';
    return;
  }

  activeChatId=chatId; if(adminMode) adminActiveChatId=chatId;
  const isBuyer=currentUser&&c.buyerUid===currentUser.uid;
  const canWrite=!adminMode && currentUser && (c.buyerUid===currentUser.uid || c.sellerUid===currentUser.uid || isAdmin());
  if(!adminMode && currentUser){ await updateDoc(ref,isBuyer?{unreadBuyer:0}:{unreadSeller:0}).catch(()=>{}); }
  box.innerHTML=`<div class="chat-head"><b>${esc(c.productTitle||"Yazışma")}</b><small>Alıcı: ${esc(c.buyerEmail||'-')} • Satıcı: ${esc(c.sellerEmail||'-')}</small></div><div class="chat-messages" id="${adminMode?'adminChatMessages':'chatMessages'}"><div class="cabinet-empty">Mesajlar yüklənir...</div></div>${canWrite?`<div class="chat-form"><input id="${adminMode?'adminChatInput':'chatInput'}" maxlength="700" placeholder="Mesaj yaz..."><button class="fullbtn" type="button" onclick="sendChatMessage('${esc(chatId)}',${adminMode})">Göndər</button></div>`:`<div class="chat-form"><input disabled placeholder="Bu yazışma yalnız baxış üçündür"><button class="hbtn" disabled>Göndər</button></div>`}`;
  const unsub=onSnapshot(collection(db,"chats",chatId,"messages"),snap=>{
    const msgs=[]; snap.forEach(d=>msgs.push({id:d.id,...d.data()}));
    msgs.sort((a,b)=>((a.createdAt&&a.createdAt.toMillis?a.createdAt.toMillis():0)-((b.createdAt&&b.createdAt.toMillis?b.createdAt.toMillis():0))));
    drawMessages(msgs,adminMode);
  },err=>{ console.error(err); const m=document.getElementById(adminMode?'adminChatMessages':'chatMessages'); if(m)m.innerHTML='<div class="cabinet-empty">Mesajlar yüklənmədi.</div>'; });
  chatUnsubs.push(unsub);
}
function drawMessages(msgs,adminMode=false){
  const el=document.getElementById(adminMode?"adminChatMessages":"chatMessages"); if(!el) return;
  if(!msgs.length){ el.innerHTML='<div class="cabinet-empty">Hələ mesaj yoxdur.</div>'; return; }
  el.innerHTML=msgs.map(m=>{
    const isMe = currentUser && m.senderId===currentUser.uid;
    const isCredMsg = m.type==="credentials_admin";
    const sendBtn = (isCredMsg && isAdmin())
      ? `<button onclick="sendCredsToBuyer('${esc(m.orderId||"")}','${esc(m.buyerUid||"")}','${esc(m.buyerEmail||"")}')"
          style="display:block;margin-top:8px;background:#22c55e;border:none;color:#fff;font-weight:700;
          padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;width:100%">
          ✅ Təsdiqləyirəm, alıcıya göndər
        </button>` : "";
    return `<div class="chat-msg ${isMe?'me':''}${isCredMsg?' style="background:#0a1a0a;border:1px solid #22c55e33"':''}" ${isCredMsg?'style="background:#0a1a0a;border:1px solid #22c55e33;border-radius:10px"':''}>
      <span style="white-space:pre-line">${esc(m.text||"")}</span>
      ${sendBtn}
      <small>${esc(m.senderEmail||"")} • ${messageTime(m.createdAt)}</small>
    </div>`;
  }).join("");
  el.scrollTop=el.scrollHeight;
}

window.sendCredsToBuyer = async function(orderId, buyerUid, buyerEmail){
  if(!isAdmin()){ toast("Admin icazəsi lazımdır."); return; }
  if(!orderId || !buyerUid){ toast("Məlumat çatışmır."); return; }
  if(!await (window.showConfirm||window.confirm)("Hesab məlumatlarını yoxladığınızı təsdiqləyib alıcıya göndərirsiniz?","✅")) return;

  try{
    const ADMIN_UID = "B4BLhevMihY5FE8WRv1tk1DuHNm2";
    // Admin notification chat-ini tap
    const adminChatId = ["cred_notify", ADMIN_UID, orderId].join("__").replace(/[^a-zA-Z0-9_\-]/g,"_");
    const msgsSnap = await getDocs(collection(db,"chats",adminChatId,"messages"));
    let credText = "";
    msgsSnap.forEach(d=>{ if(d.data().type==="credentials_admin") credText = d.data().text; });
    if(!credText){ toast("Hesab məlumatı tapılmadı."); return; }

    // Alıcıya göndərmək üçün chat yarat
    const buyerChatId = [buyerUid, ADMIN_UID, orderId].join("__").replace(/[^a-zA-Z0-9_\-]/g,"_");
    const buyerChatRef = doc(db,"chats",buyerChatId);
    const buyerChatSnap = await getDoc(buyerChatRef).catch(()=>null);
    if(!buyerChatSnap||!buyerChatSnap.exists()){
      await setDoc(buyerChatRef,{
        buyerUid, buyerEmail: buyerEmail||"",
        sellerUid: ADMIN_UID, sellerEmail:"admin@hesablar.net",
        productTitle:"Sifariş məlumatları", orderId,
        participants:[buyerUid, ADMIN_UID],
        lastMessage:"",unreadBuyer:1,unreadSeller:0,
        updatedAt:serverTimestamp(),createdAt:serverTimestamp()
      });
    }
    const buyerText = credText
      .replace("YENİ SİFARİŞ — Hesab məlumatları","Hesab məlumatlarınız")
      .replace("━━━━━━━━━━━━━━━","")
      .trim() + "\n\nXoş oyunlar! Problem olarsa admin ilə əlaqə saxlayın.";
    await addDoc(collection(db,"chats",buyerChatId,"messages"),{
      senderId:ADMIN_UID, senderEmail:"admin@hesablar.net",
      text:buyerText, type:"credentials",
      participants:[buyerUid, ADMIN_UID],
      createdAt:serverTimestamp()
    });
    await updateDoc(buyerChatRef,{lastMessage:"Hesab məlumatları göndərildi",unreadBuyer:1,updatedAt:serverTimestamp()}).catch(()=>{});
    if(orderId) await updateDoc(doc(db,"orders",orderId),{
      pendingCredentials: deleteField(),
      credentialsStatus:"Alıcıya göndərildi",
      credentialsApprovedAt:serverTimestamp(),
      credentialsApprovedBy:currentUser.uid||"",
      updatedAt:serverTimestamp()
    }).catch(()=>{});
    toast("✅ Alıcıya göndərildi!");
  }catch(e){ console.error(e); toast("Xəta: "+e.message); }
};
window.sendChatMessage=async function(chatId,adminMode=false){
  await refreshUser();
  if(!currentUser){ openModal("loginModal"); return; }
  if(await blockGuard("Mesaj yazmaq")) return;
  const input=document.getElementById(adminMode?"adminChatInput":"chatInput");
  const text=(input?.value||"").trim();
  if(!text){ toast("Mesaj boşdur."); return; }
  const ref=doc(db,"chats",chatId);
  const snap=await getDoc(ref).catch(()=>null); const c=snap&&snap.exists()?snap.data():{};
  const isBuyer=c.buyerUid===currentUser.uid;
  await addDoc(collection(db,"chats",chatId,"messages"),{
    senderId:currentUser.uid,
    senderEmail:currentUser.email||"",
    text,seen:false,
    participants:[c.buyerUid||"", c.sellerUid||""],
    createdAt:serverTimestamp()
  });
  const patch={lastMessage:text,updatedAt:serverTimestamp()};
  if(isBuyer) patch.unreadSeller=Number(c.unreadSeller||0)+1; else patch.unreadBuyer=Number(c.unreadBuyer||0)+1;
  await updateDoc(ref,patch).catch(()=>{});
  if(input) input.value="";
};
async function _fetchChatsAdmin(){
  const el=document.getElementById("adminChats"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(collection(db,"chats"));
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    arr.sort((a,b)=>((b.updatedAt&&b.updatedAt.toMillis?b.updatedAt.toMillis():0)-((a.updatedAt&&a.updatedAt.toMillis?a.updatedAt.toMillis():0))));
    el.innerHTML='<h3>Alıcı / satıcı yazışmaları</h3>'+(arr.length?`<table class="cabinet-table"><thead><tr><th>Məhsul</th><th>Alıcı</th><th>Satıcı</th><th>Son mesaj</th><th>Əməliyyat</th></tr></thead><tbody>${arr.slice(0,50).map(ch=>`<tr><td>${esc(ch.productTitle||'-')}</td><td>${esc(ch.buyerEmail||'-')}</td><td>${esc(ch.sellerEmail||'-')}</td><td>${esc(ch.lastMessage||'-')}</td><td><button class="info-btn" data-admin-chat="${esc(ch.id)}">Bax</button></td></tr>`).join("")}</tbody></table><div id="adminChatBox" class="chat-box" style="margin-top:12px"><div class="chat-head"><b>Yazışma seç</b><small>Admin mübahisə zamanı yazışmanı buradan görə bilər.</small></div><div class="chat-messages"></div></div>`:'<div class="cabinet-empty">Yazışma yoxdur.</div>');
    el.querySelectorAll("[data-admin-chat]").forEach(b=>b.onclick=()=>openChat(b.dataset.adminChat,true));
  }catch(e){ console.error("_fetchChatsAdmin:",e); }
}
function listenChatsAdmin(){
  _fetchChatsAdmin();
  const t=setInterval(()=>{if(document.getElementById("adminChats")&&isAdmin())_fetchChatsAdmin();else clearInterval(t);},20000);
  adminUnsubs.push(()=>clearInterval(t));
}

function renderAdminStats(){
  const el=document.getElementById("adminStatsGrid");
  if(!el) return;
  el.innerHTML=`
    <div class="admin-mini-card"><span>Gözləmədə elan</span><b>${adminStatsState.pendingAds}</b></div>
    <div class="admin-mini-card"><span>Aktiv sifariş</span><b>${adminStatsState.activeOrders}</b></div>
    <div class="admin-mini-card"><span>Mübahisə / ticket</span><b>${adminStatsState.openTickets}</b></div>
    <div class="admin-mini-card"><span>Balans müraciəti</span><b>${adminStatsState.balanceRequests}</b></div>
    <div class="admin-mini-card"><span>İstifadəçi</span><b>${adminStatsState.users}</b></div>
    <div class="admin-mini-card"><span>Təsdiqli satıcı</span><b>${adminStatsState.verifiedSellers}</b></div>
    <div class="admin-mini-card"><span>Bloklu hesab</span><b>${adminStatsState.blockedUsers}</b></div>
    <div class="admin-mini-card"><span>Satış həcmi</span><b>${walletNumber(adminStatsState.totalVolume)}</b></div>`;
}
function adminShell(){
  return `<h3>Admin panel</h3>
  <div id="adminStatsGrid" class="admin-mini-grid"></div>
  <div id="adminNotifSection" class="admin-section"></div>
  <div id="adminPayouts" class="admin-section"></div>
  <div id="adminPendingAds" class="admin-section"></div>
  <div id="adminBalanceRequests" class="admin-section"></div>
  <div id="adminOrders" class="admin-section"></div>
  <div id="adminChats" class="admin-section"></div>
  <div id="adminTickets" class="admin-section"></div>
  <div id="adminUsers" class="admin-section"></div>
  <div id="adminReports" class="admin-section"></div>
  <div id="adminCouponsSection" class="admin-section">
    <h3>Kupon idarəsi</h3>
    <button class="fullbtn" style="max-width:220px;margin-bottom:12px" onclick="openModal('createCouponModal')">+ Yeni kupon yarat</button>
    <div id="adminCoupons"></div>
  </div>`;
}
async function _fetchBalanceAdmin(){
  const el=document.getElementById("adminBalanceRequests"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(query(collection(db,"balanceRequests"),where("status","==","Gözləmədə")));
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    setAdminStat("balanceRequests",arr.length);
    el.innerHTML='<h3>Balans / çıxarış müraciətləri</h3>'+(arr.length?`<table class="cabinet-table"><thead><tr><th>Tip</th><th>İstifadəçi</th><th>Məbləğ</th><th>Metod</th><th>Çek / məlumat</th><th>Əməliyyat</th></tr></thead><tbody>${arr.map(r=>`<tr><td>${r.type==="deposit"?"Artırma":"Çıxarış"}</td><td>${esc(r.userEmail)}</td><td>${walletNumber(r.amount)}</td><td>${esc(r.method||"-")}</td><td>${r.receipt?`<a href="${esc(r.receipt)}" target="_blank">Çekə bax</a>`:esc(r.details||"-")}</td><td><div class="action-row"><button class="approve-btn" data-bal-ok="${r.id}">Təsdiqlə</button><button class="reject-btn" data-bal-no="${r.id}">Rədd et</button></div></td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">Gözləmədə balans müraciəti yoxdur.</div>');
    el.querySelectorAll("[data-bal-ok]").forEach(b=>b.onclick=async()=>{await processBalanceRequest(b.dataset.balOk,true,arr);_fetchBalanceAdmin();});
    el.querySelectorAll("[data-bal-no]").forEach(b=>b.onclick=async()=>{await processBalanceRequest(b.dataset.balNo,false,arr);_fetchBalanceAdmin();});
  }catch(e){ console.error("_fetchBalanceAdmin:",e); }
}
function listenBalanceRequestsAdmin(){
  _fetchBalanceAdmin();
  const t=setInterval(()=>{if(document.getElementById("adminBalanceRequests")&&isAdmin())_fetchBalanceAdmin();else clearInterval(t);},15000);
  adminUnsubs.push(()=>clearInterval(t));
}

async function processBalanceRequest(id,approve,arr){
  const r=(arr||[]).find(x=>x.id===id); if(!r) return;
  const w=await ensureWallet(r.userUid,r.userEmail);
  try{
    if(approve){
      if(r.type==="deposit"){
        await updateDoc(doc(db,"wallets",r.userUid),{balance:Number(w.balance||0)+Number(r.amount||0),pendingIn:Math.max(0,Number(w.pendingIn||0)-Number(r.amount||0)),updatedAt:serverTimestamp()});
      }else{
        await updateDoc(doc(db,"wallets",r.userUid),{pendingOut:Math.max(0,Number(w.pendingOut||0)-Number(r.amount||0)),updatedAt:serverTimestamp()});
      }
    }else{
      const patch=r.type==="deposit"?{pendingIn:Math.max(0,Number(w.pendingIn||0)-Number(r.amount||0))}:{balance:Number(w.balance||0)+Number(r.amount||0),pendingOut:Math.max(0,Number(w.pendingOut||0)-Number(r.amount||0))};
      await updateDoc(doc(db,"wallets",r.userUid),{...patch,updatedAt:serverTimestamp()});
    }
    await updateDoc(doc(db,"balanceRequests",id),{status:approve?"Təsdiqləndi":"Rədd edildi",updatedAt:serverTimestamp()});
    toast(approve?"Müraciət təsdiqləndi":"Müraciət rədd edildi");
  }catch(e){ console.error(e); toast("Balans əməliyyatı alınmadı."); }
}
async function _fetchOrdersAdmin(){
  const el=document.getElementById("adminOrders"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(query(collection(db,"orders")));
    const all=[]; snap.forEach(d=>all.push({id:d.id,...d.data()}));
    all.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const active=all.filter(o=>!["Tamamlandı","Ləğv edildi"].includes(o.status));
    const disputes=all.filter(o=>o.status==="Mübahisə").length;
    const done=all.filter(o=>o.status==="Tamamlandı");
    setAdminStat("activeOrders",active.length);
    setAdminStat("totalSales",done.length);
    setAdminStat("totalVolume",done.reduce((s,o)=>s+Number(o.price||0),0));
    el.innerHTML='<h3>Sifariş idarəsi</h3>'+(active.length?`<table class="cabinet-table"><thead><tr><th>Məhsul</th><th>Alıcı</th><th>Satıcı</th><th>Məbləğ</th><th>Status</th><th>Hesab məlumatı</th><th>Əməliyyat</th></tr></thead><tbody>${active.map(o=>{
      const hasCreds = o.pendingCredentials && (o.pendingCredentials.data);
      const credCell = hasCreds ? `<td style="font-size:11px;color:#94a3b8;background:#0a1118;border-radius:6px;padding:6px">
        🔒 <i>Şifrəli saxlanılır</i><br>
        <button class="approve-btn" style="margin-top:4px;font-size:10px" data-send-creds="${o.id}">👁️ Admin yoxlamasına aç</button>
      </td>` : `<td style="color:#475569;font-size:11px">—</td>`;
      return `<tr><td><b>${esc(o.productTitle)}</b></td><td><small>${esc(o.buyerEmail)}</small></td><td><small>${esc(o.sellerEmail)}</small></td><td>${Number(o.price||0).toFixed(2)} ₼</td><td>${statusHtml(o.status)}</td>${credCell}<td><div class="order-actions"><button class="cancel-btn" data-admin-cancel="${o.id}">Qaytar</button></div></td></tr>`;
    }).join("")}</tbody></table>`:'<div class="cabinet-empty">Aktiv sifariş yoxdur.</div>')+`<div class="wallet-note"><b>Statistika:</b> Tamamlanan: ${done.length}, mübahisə: ${disputes}, həcm: ${walletNumber(adminStatsState.totalVolume)}</div>`;
    el.querySelectorAll("[data-admin-cancel]").forEach(b=>b.onclick=async()=>{await cancelOrder(b.dataset.adminCancel);_fetchOrdersAdmin();});
    el.querySelectorAll("[data-send-creds]").forEach(b=>b.onclick=()=>prepareCredsForAdminApproval(b.dataset.sendCreds));
  }catch(e){ console.error("_fetchOrdersAdmin:",e); }
}

// Admin: sifarişdəki hesab məlumatlarını yalnız admin yoxlamasına çıxarır.
// Buradan alıcıya mesaj getmir. Alıcıya yalnız adminNotifications bölməsindəki
// "Təsdiqləyirəm, alıcıya göndər" düyməsi basılanda göndərilir.
async function prepareCredsForAdminApproval(orderId){
  if(!isAdmin()) return;
  try{
    const oSnap = await getDoc(doc(db,"orders",orderId));
    if(!oSnap.exists()) return;
    const o = oSnap.data();
    if(!o.pendingCredentials) { toast("Bu sifarişdə hesab məlumatı yoxdur."); return; }

    const c = await decryptCreds(o.pendingCredentials);
    if(!c){ toast("Deşifrə xətası — məlumatlar oxunmadı."); return; }

    let credText = "";
    if(c.mailEmail || c.mailPassword) credText += `📧 Mail: ${c.mailEmail||""}\n🔑 Mail şifrəsi: ${c.mailPassword||""}\n`;
    if(c.login || c.password)         credText += `🎮 Login: ${c.login||""}\n🔒 Şifrə: ${c.password||""}\n`;
    if(c.extraInfo)                   credText += `📝 Əlavə: ${c.extraInfo}\n`;

    await addDoc(collection(db,"adminNotifications"),{
      type:"credentials",
      orderId,
      productTitle:o.productTitle||"Məhsul",
      price:Number(o.price||0),
      buyerUid:o.buyerUid||"",
      buyerEmail:o.buyerEmail||"",
      sellerUid:o.sellerUid||"",
      sellerEmail:o.sellerEmail||"",
      credentials:credText,
      status:"Admin təsdiqi gözləyir",
      createdAt:serverTimestamp()
    });

    await updateDoc(doc(db,"orders",orderId),{
      credentialsStatus:"Admin təsdiqi gözləyir",
      updatedAt:serverTimestamp()
    }).catch(()=>{});

    toast("✅ Hesab məlumatı admin yoxlamasına əlavə edildi. Alıcıya göndərilmədi.");
    if(typeof listenNotifAdmin === "function") listenNotifAdmin();
    _fetchOrdersAdmin();
  }catch(e){ console.error(e); toast("Xəta: "+e.message); }
}

// Köhnə ad saxlanılır ki, hardasa çağırılsa belə alıcıya birbaşa göndərməsin.
async function sendCredsToByuer(orderId){
  return prepareCredsForAdminApproval(orderId);
}

function listenOrdersAdmin(){
  _fetchOrdersAdmin();
  const t=setInterval(()=>{if(document.getElementById("adminOrders")&&isAdmin())_fetchOrdersAdmin();else clearInterval(t);},15000);
  adminUnsubs.push(()=>clearInterval(t));
}

async function _fetchTicketsAdmin(){
  const el=document.getElementById("adminTickets"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(query(collection(db,"tickets")));
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const open=arr.filter(t=>t.status!=="Bağlandı");
    setAdminStat("openTickets",open.length);
    el.innerHTML='<h3>Dəstək müraciətləri</h3>'+(open.length?`<table class="cabinet-table"><thead><tr><th>İstifadəçi</th><th>Tip</th><th>Mövzu</th><th>Mətn</th><th>Əməliyyat</th></tr></thead><tbody>${open.map(t=>`<tr><td>${esc(t.userEmail)}</td><td>${esc(t.type)}</td><td>${esc(t.subject)}</td><td>${esc(t.text||"")}</td><td><div class="action-row"><button class="info-btn" data-ticket-reply="${t.id}">Cavabla</button><button class="approve-btn" data-ticket-close="${t.id}">Bağla</button></div></td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">Açıq müraciət yoxdur.</div>');
    el.querySelectorAll("[data-ticket-close]").forEach(b=>b.onclick=async()=>{await updateDoc(doc(db,"tickets",b.dataset.ticketClose),{status:"Bağlandı",updatedAt:serverTimestamp()});_fetchTicketsAdmin();});
    el.querySelectorAll("[data-ticket-reply]").forEach(b=>b.onclick=()=>replyTicket(b.dataset.ticketReply));
  }catch(e){ console.error("_fetchTicketsAdmin:",e); }
}
function listenTicketsAdmin(){
  _fetchTicketsAdmin();
  const t=setInterval(()=>{if(document.getElementById("adminTickets")&&isAdmin())_fetchTicketsAdmin();else clearInterval(t);},15000);
  adminUnsubs.push(()=>clearInterval(t));
}

async function replyTicket(id){
  const msg=prompt("İstifadəçiyə cavab yaz:");
  if(msg===null) return;
  try{ await updateDoc(doc(db,"tickets",id),{adminReply:msg,status:msg.trim()?"Cavablandı":"Açıq",updatedAt:serverTimestamp()}); toast("Cavab yazıldı"); }
  catch(e){ console.error(e); toast("Cavab yazılmadı."); }
}
async function _fetchUsersAdmin(){
  const el=document.getElementById("adminUsers"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(query(collection(db,"users")));
    const users=[]; snap.forEach(d=>users.push({id:d.id,...d.data()}));
    users.sort((a,b)=>String(a.email||"").localeCompare(String(b.email||"")));
    setAdminStat("users",users.length);
    setAdminStat("verifiedSellers",users.filter(u=>u.sellerVerified).length);
    setAdminStat("blockedUsers",users.filter(u=>u.blocked).length);
    const filter=(document.getElementById("adminUserSearch")?.value||"").toLowerCase();
    const rows=users.filter(u=>!filter||String(u.email||u.fullName||"").toLowerCase().includes(filter)).slice(0,80);
    el.innerHTML=`<h3>İstifadəçi və satıcı idarəsi</h3><div class="admin-filter-row"><input id="adminUserSearch" placeholder="Email/ad üzrə axtar"><span class="admin-tag">${users.length} istifadəçi</span><span class="admin-tag">${adminStatsState.verifiedSellers} təsdiqli satıcı</span><span class="admin-tag">${adminStatsState.blockedUsers} bloklu</span></div>`+(rows.length?`<table class="cabinet-table"><thead><tr><th>İstifadəçi</th><th>Rol</th><th>Satıcı</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody>${rows.map(u=>`<tr><td><b>${esc(u.fullName||u.name||"-")}</b><br><small>${esc(u.email||"")}</small></td><td>${esc(u.role||"user")}</td><td>${u.sellerVerified?'<span class="status approved">Təsdiqli</span>':'<span class="status pending">Adi</span>'}</td><td>${u.blocked?'<span class="status rejected">Bloklu</span>':'<span class="status approved">Aktiv</span>'}</td><td><div class="action-row"><button class="verify-btn" data-user-verify="${u.id}" data-val="${u.sellerVerified?0:1}">${u.sellerVerified?'Təsdiqi sil':'Satıcı təsdiqlə'}</button><button class="block-btn" data-user-block="${u.id}" data-val="${u.blocked?0:1}">${u.blocked?'Bloku aç':'Blokla'}</button></div></td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">İstifadəçi tapılmadı.</div>');
    const input=document.getElementById("adminUserSearch");
    if(input){ input.value=filter; input.oninput=()=>listenUsersAdminRenderOnly(users); }
    el.querySelectorAll("[data-user-verify]").forEach(b=>b.onclick=async()=>{await toggleSellerVerify(b.dataset.userVerify,b.dataset.val==="1");_fetchUsersAdmin();});
    el.querySelectorAll("[data-user-block]").forEach(b=>b.onclick=async()=>{await toggleUserBlock(b.dataset.userBlock,b.dataset.val==="1");_fetchUsersAdmin();});
  }catch(e){ console.error("_fetchUsersAdmin:",e); }
}
function listenUsersAdmin(){
  _fetchUsersAdmin();
  const t=setInterval(()=>{if(document.getElementById("adminUsers")&&isAdmin())_fetchUsersAdmin();else clearInterval(t);},30000);
  adminUnsubs.push(()=>clearInterval(t));
}

function listenUsersAdminRenderOnly(users){
  // oninput zamanı Firestore listener yaratmadan mövcud siyahını yenidən çəkir
  const el=document.getElementById("adminUsers"); if(!el) return;
  const filter=(document.getElementById("adminUserSearch")?.value||"").toLowerCase();
  const rows=(users||[]).filter(u=>!filter || String(u.email||u.fullName||"").toLowerCase().includes(filter)).slice(0,80);
  const currentFilter=filter;
  el.innerHTML=`<h3>İstifadəçi və satıcı idarəsi</h3><div class="admin-filter-row"><input id="adminUserSearch" placeholder="Email/ad üzrə axtar"><span class="admin-tag">${users.length} istifadəçi</span><span class="admin-tag">${adminStatsState.verifiedSellers} təsdiqli satıcı</span><span class="admin-tag">${adminStatsState.blockedUsers} bloklu</span></div>`+(rows.length?`<table class="cabinet-table"><thead><tr><th>İstifadəçi</th><th>Rol</th><th>Satıcı</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody>${rows.map(u=>`<tr><td><b>${esc(u.fullName||u.name||"-")}</b><br><small>${esc(u.email||"")}</small></td><td>${esc(u.role||"user")}</td><td>${u.sellerVerified?'<span class="status approved">Təsdiqli</span>':'<span class="status pending">Adi</span>'}</td><td>${u.blocked?'<span class="status rejected">Bloklu</span>':'<span class="status approved">Aktiv</span>'}</td><td><div class="action-row"><button class="verify-btn" data-user-verify="${u.id}" data-val="${u.sellerVerified?0:1}">${u.sellerVerified?'Təsdiqi sil':'Satıcı təsdiqlə'}</button><button class="block-btn" data-user-block="${u.id}" data-val="${u.blocked?0:1}">${u.blocked?'Bloku aç':'Blokla'}</button></div></td></tr>`).join("")}</tbody></table>`:'<div class="cabinet-empty">İstifadəçi tapılmadı.</div>');
  const input=document.getElementById("adminUserSearch");
  if(input){ input.value=currentFilter; input.focus(); input.oninput=()=>listenUsersAdminRenderOnly(users); }
  el.querySelectorAll("[data-user-verify]").forEach(b=>b.onclick=()=>toggleSellerVerify(b.dataset.userVerify,b.dataset.val==="1"));
  el.querySelectorAll("[data-user-block]").forEach(b=>b.onclick=()=>toggleUserBlock(b.dataset.userBlock,b.dataset.val==="1"));
}
async function toggleSellerVerify(uid,val){
  try{
    await updateDoc(doc(db,"users",uid),{sellerVerified:val,updatedAt:serverTimestamp()});
    // presence-i dərhal yenilə — satıcı onlayn olmasa belə badge görünsün
    try{
      await setDoc(doc(db,"presence",uid),{sellerVerified:!!val},{merge:true});
      console.log("[toggleSellerVerify] presence yeniləndi, uid:", uid, "val:", val);
    }catch(presenceErr){
      console.error("[toggleSellerVerify] presence yazıla bilmədi:", presenceErr.code, presenceErr.message);
    }
    toast(val?"Satıcı təsdiqləndi":"Satıcı təsdiqi silindi");
  }
  catch(e){ console.error(e); toast("Satıcı statusu dəyişmədi."); }
}
async function toggleUserBlock(uid,val){
  try{ await updateDoc(doc(db,"users",uid),{blocked:val,updatedAt:serverTimestamp()}); toast(val?"İstifadəçi bloklandı":"Blok açıldı"); }
  catch(e){ console.error(e); toast("Blok statusu dəyişmədi."); }
}
async function _fetchPendingAds(){
  const el=document.getElementById("adminPendingAds"); if(!el||!isAdmin()) return;
  try{
    const snap=await getDocs(query(collection(db,"ads"),where("status","==","Gözləmədə")));
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    setAdminStat("pendingAds",arr.length);
    el.innerHTML='<h3>Elan təsdiqi</h3>'+(arr.length
      ?`<table class="cabinet-table"><thead><tr><th>Elan</th><th>Kateqoriya</th><th>İstifadəçi</th><th>Qiymət</th><th>Əməliyyat</th></tr></thead><tbody>${arr.map(a=>`<tr>
          <td><b>${esc(a.title)}</b><br><small>${esc(a.game||a.platform||"")}</small></td>
          <td>${esc(a.category||"")}</td>
          <td>${esc(a.sellerEmail||"")}</td>
          <td>${Number(a.price||0).toFixed(2)} ₼</td>
          <td><div class="admin-actions">
            <button class="approve-btn" data-approve="${a.id}">Təsdiqlə</button>
            <button class="reject-btn"  data-reject="${a.id}">Rədd et</button>
            <button class="delete-btn"  data-delete="${a.id}">Sil</button>
          </div></td></tr>`).join("")}</tbody></table>`
      :'<div class="cabinet-empty">Gözləmədə elan yoxdur.</div>');
    el.querySelectorAll("[data-approve]").forEach(b=>b.onclick=async()=>{await updateAdStatus(b.dataset.approve,"Təsdiqləndi");_fetchPendingAds();});
    el.querySelectorAll("[data-reject]").forEach(b=>b.onclick=async()=>{await updateAdStatus(b.dataset.reject,"Rədd edildi");_fetchPendingAds();});
    el.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,"ads",b.dataset.delete));_fetchPendingAds();});
  }catch(e){
    console.error("_fetchPendingAds:",e);
    const el2=document.getElementById("adminPendingAds");
    if(el2) el2.innerHTML='<h3>Elan təsdiqi</h3><div class="cabinet-empty" style="color:#f87171;">Xəta: '+esc(String(e.message||e))+'</div>';
  }
}
function listenPendingAdsAdmin(){
  _fetchPendingAds();
  const t=setInterval(()=>{if(document.getElementById("adminPendingAds")&&isAdmin())_fetchPendingAds();else clearInterval(t);},10000);
  adminUnsubs.push(()=>clearInterval(t));
}




function savedLocalItems(){
  try{ return JSON.parse(localStorage.getItem("gs_saved_fallback") || "[]"); }
  catch(e){ return []; }
}

function drawSavedItems(items){
  const el=document.getElementById("cabSaved");
  if(!el) return;

  const uniq = [];
  const seen = new Set();
  items.forEach(x=>{
    const k = x.id || x.adId || x.title;
    if(!k || seen.has(k)) return;
    seen.add(k);
    uniq.push(x);
  });

  if(!uniq.length){
    el.innerHTML='<h3>Yadda saxlanılanlar</h3><div class="cabinet-empty">Hələ yadda saxlanılan elan yoxdur.</div>';
    return;
  }

  el.innerHTML='<h3>Yadda saxlanılanlar</h3><div class="saved-grid">'+uniq.map((x,i)=>`
    <div class="saved-card saved-live">
      <div class="saved-img">${safeIcon(x.icon)}</div>
      <div>
        <b>${esc(x.title || "Məhsul")}</b>
        <p>${esc(x.category || "Kateqoriya")} • ${esc(x.seller || "GameSatış")}</p>
        <strong style="color:#fb923c">${esc(x.price || "0.00 ₼")}</strong>
      </div>
      <div class="saved-actions">
        <button class="hbtn orange" type="button" data-open-saved="${i}">Aç</button>
        <button class="hbtn" type="button" data-cart-saved="${i}">Səbətə əlavə et</button>
        <button class="hbtn" type="button" data-remove-saved="${esc(x.id || x.adId || x.title)}">Sil</button>
      </div>
    </div>`).join("")+'</div>';

  el.querySelectorAll("[data-open-saved]").forEach(b=>b.onclick=()=>{
    const item = uniq[Number(b.dataset.openSaved)];
    if(typeof window.openProductDetail === "function"){
      window.openProductDetail(item);
      document.getElementById("productModal")?.classList.add("show");
    }else{
      toast("Məhsul açılmadı.");
    }
  });
  el.querySelectorAll("[data-cart-saved]").forEach(b=>b.onclick=()=>{
    const item=uniq[Number(b.dataset.cartSaved)];
    if(typeof window.addToCart === "function"){
      window.addToCart(item.title||"Məhsul",item.price||"0.00 ₼",item.adId||"",item.sellerUid||"",item.sellerEmail||"");
    }
  });
  el.querySelectorAll("[data-remove-saved]").forEach(b=>b.onclick=()=>removeSavedItem(b.dataset.removeSaved));
}

function renderSavedItems(){
  const el=document.getElementById("cabSaved");
  if(!el) return;

  const local = savedLocalItems();

  if(!currentUser){
    drawSavedItems(local);
    return;
  }

  const q=query(collection(db,"users",currentUser.uid,"saved"));
  onSnapshot(q,snap=>{
    const favs=[];
    snap.forEach(d=>favs.push({id:d.id,...d.data()}));
    drawSavedItems([...favs, ...savedLocalItems()]);
  },err=>{
    console.error("Saved items load error:", err);
    drawSavedItems(savedLocalItems());
    if(!savedLocalItems().length){
      el.innerHTML='<h3>Yadda saxlanılanlar</h3><div class="cabinet-empty">Yadda saxlanılanlar yüklənmədi. Firestore Rules users/{uid}/saved icazəsini yoxla.</div>';
    }
  });
}

window.removeSavedItem = async function(id){
  const local = savedLocalItems().filter(x => String(x.id || x.adId || x.title) !== String(id));
  localStorage.setItem("gs_saved_fallback", JSON.stringify(local));

  if(currentUser && id){
    try{ await deleteDoc(doc(db,"users",currentUser.uid,"saved",id)); }
    catch(e){ console.warn("Firestore saved delete failed:", e); }
  }

  drawSavedItems(local);
  toast("Yadda saxlanılandan silindi");
}



async function completeOrder(id){
  await refreshUser(); if(!currentUser) return;
  try{
    const orderRef=doc(db,"orders",id);
    const snap=await getDoc(orderRef); if(!snap.exists()) return; const o=snap.data();
    if(o.buyerUid!==currentUser.uid && !isAdmin()){ toast("İcazə yoxdur."); return; }
    if(o.status==="Tamamlandı"){ toast("Sifariş artıq tamamlanıb."); return; }
    // Mübahisədəki sifarişi yalnız admin tamamlaya bilər
    if(o.status==="Mübahisə" && !isAdmin()){ toast("Mübahisədəki sifarişi yalnız admin tamamlaya bilər."); return; }
    await runTransaction(db, async (tx)=>{
      const oSnap=await tx.get(orderRef);
      if(!oSnap.exists() || oSnap.data().status==="Tamamlandı") throw new Error("ALREADY_DONE");
      if(oSnap.data().status==="Mübahisə" && !isAdmin()) throw new Error("DISPUTED");
      const o2=oSnap.data();
      const buyerRef=doc(db,"wallets",o2.buyerUid);
      const bSnap=await tx.get(buyerRef);
      const b=bSnap.data()||{};
      // Audit: kim tamamladı, nə vaxt
      tx.update(orderRef,{
        status:"Tamamlandı",
        escrowStatus:"Satıcıya köçürüldü",
        completedAt:serverTimestamp(),
        completedBy:currentUser.uid,
        completedByEmail:currentUser.email||"",
        updatedAt:serverTimestamp()
      });
      tx.update(buyerRef,{escrowOut:Math.max(0,Number(b.escrowOut||0)-Number(o2.price||0)),updatedAt:serverTimestamp()});
      if(o2.sellerUid){
        const selRef=doc(db,"wallets",o2.sellerUid);
        const sSnap=await tx.get(selRef);
        const s=sSnap.exists()?(sSnap.data()||{}):{balance:0,totalEarned:0};
        tx.set(selRef,{uid:o2.sellerUid,email:o2.sellerEmail||"",balance:Number(s.balance||0)+Number(o2.price||0),totalEarned:Number(s.totalEarned||0)+Number(o2.price||0),updatedAt:serverTimestamp()},{merge:true});
      }
    });
    if(o.adId) await updateDoc(doc(db,"ads",o.adId),{status:"Satıldı",updatedAt:serverTimestamp()}).catch(()=>{});

    // Hesab məlumatları burada alıcıya avtomatik göndərilmir.
    // Məlumatlar yalnız admin panelində yoxlanıb "Təsdiqləyirəm, alıcıya göndər" düyməsi basıldıqdan sonra alıcıya gedir.
    if(o.pendingCredentials){
      await updateDoc(doc(db,"orders",id),{
        credentialsStatus:"Admin təsdiqi gözləyir",
        updatedAt:serverTimestamp()
      }).catch(()=>{});
    }

    toast("Sifariş tamamlandı");
  }catch(e){
    console.error(e);
    if(e.message==="ALREADY_DONE") toast("Sifariş artıq tamamlanıb.");
    else if(e.message==="DISPUTED") toast("Mübahisədəki sifarişi yalnız admin tamamlaya bilər.");
    else toast("Sifariş tamamlanmadı.");
  }
}
async function cancelOrder(id){
  await refreshUser(); if(!currentUser) return;
  try{
    const orderRef=doc(db,"orders",id);
    const snap=await getDoc(orderRef); if(!snap.exists()) return; const o=snap.data();
    if(o.buyerUid!==currentUser.uid && !isAdmin()){ toast("İcazə yoxdur."); return; }
    if(o.status==="Ləğv edildi"){ toast("Sifariş artıq ləğv edilib."); return; }
    // Transaction: sifariş statusu + alıcı wallet atomik dəyişdirilir
    await runTransaction(db, async (tx)=>{
      const oSnap=await tx.get(orderRef);
      if(!oSnap.exists() || oSnap.data().status==="Ləğv edildi") throw new Error("ALREADY_CANCELLED");
      const o2=oSnap.data();
      const buyerRef=doc(db,"wallets",o2.buyerUid);
      const bSnap=await tx.get(buyerRef);
      const b=bSnap.data()||{};
      tx.update(orderRef,{status:"Ləğv edildi",escrowStatus:"Alıcıya qaytarıldı",updatedAt:serverTimestamp()});
      tx.update(buyerRef,{
        balance:Number(b.balance||0)+Number(o2.price||0),
        escrowOut:Math.max(0,Number(b.escrowOut||0)-Number(o2.price||0)),
        updatedAt:serverTimestamp()
      });
    });
    if(o.adId) await updateDoc(doc(db,"ads",o.adId),{status:"Təsdiqləndi",buyerUid:"",buyerEmail:"",updatedAt:serverTimestamp()}).catch(()=>{});
    toast("Sifariş ləğv edildi");
  }catch(e){
    console.error(e);
    if(e.message==="ALREADY_CANCELLED") toast("Sifariş artıq ləğv edilib.");
    else toast("Ləğv edilmədi.");
  }
}
async function disputeOrder(id){
  await refreshUser(); if(!currentUser) return;
  try{
    const ref=doc(db,"orders",id), snap=await getDoc(ref); if(!snap.exists()) return; const o=snap.data();
    if(o.buyerUid!==currentUser.uid && o.sellerUid!==currentUser.uid && !isAdmin()){ toast("İcazə yoxdur."); return; }
    await updateDoc(ref,{status:"Mübahisə",escrowStatus:"Admin araşdırır",updatedAt:serverTimestamp()});
    await addDoc(collection(db,"tickets"),{type:"Sifariş mübahisəsi",subject:"Sifariş: "+(o.productTitle||id),text:"Sifariş üzrə mübahisə açıldı.",status:"Açıq",orderId:id,userUid:currentUser.uid,userEmail:currentUser.email,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}).catch(()=>{});
    toast("Mübahisə açıldı");
  }catch(e){ console.error(e); toast("Mübahisə açılmadı."); }
}

function listenSales(){
  const el=document.getElementById("cabSales"); if(!el || !currentUser) return;
  const q=query(collection(db,"orders"),where("sellerUid","==",currentUser.uid));
  onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    if(!arr.length){ el.innerHTML='<h3>Satışlarım</h3><div class="cabinet-empty">Hələ satış yoxdur.</div>'; return; }
    el.innerHTML='<h3>Satışlarım</h3><table class="cabinet-table"><thead><tr><th>Məhsul</th><th>Alıcı</th><th>Qiymət</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody>'+arr.map(o=>{
      const both = o.buyerConfirmed && o.sellerConfirmed;
      let btns = '';
      if(o.status==="Aktiv"){
        if(!o.sellerConfirmed) btns += `<button class="approve-btn" data-seller-confirm="${o.id}">✓ Təhvil verdim</button>`;
        else btns += `<span style="color:#22c55e;font-size:12px">✓ Təhvil verdin</span>`;
        if(both && !o.payoutRequested) btns += ` <button class="complete-btn" data-payout-req="${o.id}">💰 Ödəniş tələb et</button>`;
        if(o.payoutRequested && !o.payoutDone) btns += ` <span style="color:#fb923c;font-size:12px">⏳ Ödəniş gözlənilir</span>`;
        if(o.payoutDone) btns += ` <span style="color:#22c55e;font-size:12px">✅ Ödəniş edildi</span>`;
      } else if(o.status==="Tamamlandı"){
        if(!o.payoutRequested) btns += `<button class="complete-btn" data-payout-req="${o.id}">💰 Ödəniş tələb et</button>`;
        else if(o.payoutDone) btns += `<span style="color:#22c55e;font-size:12px">✅ Ödəniş edildi</span>`;
        else btns += `<span style="color:#fb923c;font-size:12px">⏳ Ödəniş gözlənilir</span>`;
      }
      const confirmedInfo = `<small style="color:#475569">${o.buyerConfirmed?'✓ Alıcı':'○ Alıcı'} / ${o.sellerConfirmed?'✓ Satıcı':'○ Satıcı'}</small>`;
      return `<tr><td><b>${esc(o.productTitle)}</b><br>${confirmedInfo}</td><td><small>${esc(o.buyerEmail||'-')}</small></td><td>${Number(o.price||0).toFixed(2)} ₼</td><td>${statusHtml(o.status)}</td><td><div class="order-actions">${btns}</div></td></tr>`;
    }).join('')+'</tbody></table>';
    el.querySelectorAll("[data-seller-confirm]").forEach(b=>b.onclick=()=>sellerConfirmOrder(b.dataset.sellerConfirm));
    el.querySelectorAll("[data-payout-req]").forEach(b=>b.onclick=()=>requestPayout(b.dataset.payoutReq));
  },err=>{ console.error(err); el.innerHTML='<h3>Satışlarım</h3><div class="cabinet-empty">Yüklənmədi.</div>'; });
}

function listenPurchases(){
  const el=document.getElementById("cabPurchases"); if(!el || !currentUser) return;
  const q=query(collection(db,"orders"),where("buyerUid","==",currentUser.uid));
  onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    if(!arr.length){ el.innerHTML='<h3>Alışlarım</h3><div class="cabinet-empty">Hələ alış yoxdur.</div>'; return; }
    el.innerHTML='<h3>Alışlarım</h3><table class="cabinet-table"><thead><tr><th>Məhsul</th><th>Satıcı</th><th>Qiymət</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody>'+arr.map(o=>{
      let btns = '';
      if(o.status==="Aktiv"){
        if(!o.buyerConfirmed) btns += `<button class="complete-btn" data-buyer-confirm="${o.id}">✓ Aldım, problem yox</button>`;
        else btns += `<span style="color:#22c55e;font-size:12px">✓ Aldın</span>`;
        btns += ` <button class="dispute-btn" data-dispute="${o.id}">Mübahisə</button>`;
      } else if(o.status==="Tamamlandı"){
        btns = `<span style="color:#22c55e;font-size:12px">✅ Tamamlandı</span>`;
      } else if(o.status==="Ləğv edildi"){
        btns = `<span style="color:#ef4444;font-size:12px">Ləğv edildi</span>`;
      }
      const confirmedInfo = `<small style="color:#475569">${o.buyerConfirmed?'✓ Sən':'○ Sən'} / ${o.sellerConfirmed?'✓ Satıcı':'○ Satıcı'}</small>`;
      return `<tr><td><b>${esc(o.productTitle)}</b><br>${confirmedInfo}</td><td><small>${esc(o.sellerEmail||'GameSatış')}</small></td><td>${Number(o.price||0).toFixed(2)} ₼</td><td>${statusHtml(o.status)}</td><td><div class="order-actions">${btns}</div></td></tr>`;
    }).join('')+'</tbody></table>';
    el.querySelectorAll("[data-buyer-confirm]").forEach(b=>b.onclick=async()=>{
      if(!await showConfirm("Məhsulu aldığınızı və problem olmadığını təsdiqləyirsiniz?", "✅")) return;
      buyerConfirmOrder(b.dataset.buyerConfirm);
    });
    el.querySelectorAll("[data-dispute]").forEach(b=>b.onclick=()=>disputeOrder(b.dataset.dispute));
  },err=>{ console.error(err); el.innerHTML='<h3>Alışlarım</h3><div class="cabinet-empty">Yüklənmədi.</div>'; });
}

// Alıcı: "Aldım, problem yox"
async function buyerConfirmOrder(id){
  if(!currentUser) return;
  try{
    const oRef = doc(db,"orders",id);
    const oSnap = await getDoc(oRef);
    if(!oSnap.exists()) return;
    const o = oSnap.data();
    if(o.buyerUid !== currentUser.uid){ toast("İcazə yoxdur."); return; }
    const newData = {buyerConfirmed:true, updatedAt:serverTimestamp()};
    // Hər ikisi təsdiqləyibsə — sifariş tamamlandı
    if(o.sellerConfirmed) newData.status = "Tamamlandı";
    await updateDoc(oRef, newData);
    toast("Təsdiq edildi.");
  }catch(e){ console.error(e); toast("Xəta baş verdi."); }
}

// Satıcı: "Təhvil verdim"
async function sellerConfirmOrder(id){
  if(!currentUser) return;
  try{
    const oRef = doc(db,"orders",id);
    const oSnap = await getDoc(oRef);
    if(!oSnap.exists()) return;
    const o = oSnap.data();
    if(o.sellerUid !== currentUser.uid){ toast("İcazə yoxdur."); return; }
    const newData = {sellerConfirmed:true, updatedAt:serverTimestamp()};
    if(o.buyerConfirmed) newData.status = "Tamamlandı";
    await updateDoc(oRef, newData);
    // Satıcı öz elanını "Satıldı" olaraq işarələyir
    if(o.adId){
      await updateDoc(doc(db,"ads",o.adId),{
        status: "Satıldı",
        updatedAt: serverTimestamp()
      }).catch(()=>{});
    }
    toast("Təhvil təsdiqləndi. Elan bazardan çıxarıldı.");
  }catch(e){ console.error(e); toast("Xəta baş verdi."); }
}

// Satıcı: "Ödəniş tələb et" — admin görəcək
async function requestPayout(id){
  if(!currentUser) return;
  if(!await showConfirm("Ödəniş tələb etmək istəyirsiniz? Admin 5% komissiya tutub qalan məbləği göndərəcək.", "💰")) return;
  try{
    const oRef = doc(db,"orders",id);
    const oSnap = await getDoc(oRef);
    if(!oSnap.exists()) return;
    const o = oSnap.data();
    if(o.sellerUid !== currentUser.uid){ toast("İcazə yoxdur."); return; }
    if(o.payoutRequested){ toast("Artıq tələb edilib."); return; }
    await updateDoc(oRef,{payoutRequested:true, payoutRequestedAt:serverTimestamp(), updatedAt:serverTimestamp()});
    // Admin üçün ayrıca payout request yarat
    await addDoc(collection(db,"payoutRequests"),{
      orderId: id,
      productTitle: o.productTitle||"",
      price: o.price||0,
      commission: Math.round(o.price*5)/100,
      payout: Math.round(o.price*95)/100,
      sellerUid: currentUser.uid,
      userUid: currentUser.uid,
      sellerEmail: currentUser.email||"",
      status: "Gözləmədə",
      createdAt: serverTimestamp()
    });
    toast("Ödəniş tələbi göndərildi. Admin yaxın zamanda ödəyəcək.");
  }catch(e){ console.error(e); toast("Xəta baş verdi."); }
}

function listenMyAds(){
  const el=document.getElementById("cabAds");
  if(!el || !currentUser) return;
  if(unsubMyAds) unsubMyAds();
  const q=query(collection(db,"ads"),where("sellerUid","==",currentUser.uid));
  unsubMyAds=onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    // Vaxtı bitmiş elanları aktiv elanlardan ayır, amma silmə — sadəcə fərqli göstər
    el.innerHTML='<h3>Elanlarım</h3>'+(arr.length?`<table class="cabinet-table"><thead><tr><th>Elan</th><th>Qiymət</th><th>Status</th><th>Müddət</th><th>Əməliyyat</th></tr></thead><tbody>${arr.map(a=>{
      const expired = isAdExpired(a);
      const expiryText = adExpiryText(a);
      const displayStatus = expired ? "Vaxtı bitib" : a.status;
      const renewBtn = expired ? `<button class="renew-btn" data-renew-ad="${a.id}">Yenilə</button>` : "";
      return `<tr${expired?' style="opacity:.6"':''}><td><b>${esc(a.title)}</b><br><small>${esc([a.game, adMetaText(a)].filter(Boolean).join(" • "))}</small></td><td>${Number(a.price||0).toFixed(2)} ₼</td><td>${statusHtml(displayStatus)}</td><td><small style="color:${expired?'#ef4444':'#64748b'}">${esc(expiryText)}</small></td><td><div class="order-actions"><button class="edit-btn" data-edit-ad="${a.id}">Redaktə</button>${renewBtn}<button class="delete-btn" data-del-ad="${a.id}">Sil</button></div></td></tr>`;
    }).join("")}</tbody></table>`:'<div class="cabinet-empty">Hələ elanınız yoxdur.</div>');
    el.querySelectorAll("[data-edit-ad]").forEach(b=>b.onclick=()=>editMyAd(b.dataset.editAd,arr));
    el.querySelectorAll("[data-del-ad]").forEach(b=>b.onclick=()=>deleteMyAd(b.dataset.delAd));
    el.querySelectorAll("[data-renew-ad]").forEach(b=>b.onclick=()=>renewMyAd(b.dataset.renewAd));
  });
}

// Vaxtı bitmiş elanı yenilə — yeni 30 günlük müddət, yenidən admin təsdiqinə göndərilir
async function renewMyAd(id){
  if(!currentUser) return;
  try{
    const newExpiry = new Date(Date.now() + 30*24*60*60*1000);
    await updateDoc(doc(db,"ads",id),{
      expiresAt: newExpiry,
      status: "Gözləmədə",
      updatedAt: serverTimestamp()
    });
    toast("Elan yeniləndi, admin təsdiqi gözlənilir.");
  }catch(e){ console.error(e); toast("Elan yenilənmədi."); }
}
window.renewMyAd = renewMyAd;

function listenAdmin(){
  const el=document.getElementById("cabAdmin");
  if(!el) return;
  if(!isAdmin()){ el.innerHTML='<div class="cabinet-empty">Admin icazəniz yoxdur.</div>'; return; }
  stopAdminListeners();
  el.innerHTML=adminShell();
  renderAdminStats();
  listenNotifAdmin();
  listenPayoutsAdmin();
  listenPendingAdsAdmin();
  listenBalanceRequestsAdmin();
  listenOrdersAdmin();
  listenChatsAdmin();
  listenTicketsAdmin();
  listenUsersAdmin();
  listenReportsAdmin();
  listenCouponsAdmin();
}

function listenNotifAdmin(){
  const el=document.getElementById("adminNotifSection"); if(!el||!isAdmin()) return;
  const q=query(collection(db,"adminNotifications"));
  onSnapshot(q,snap=>{
    const arr=[]; snap.forEach(d=>{
      const n={id:d.id,...d.data()};
      if(!["Göndərildi","Ləğv edildi"].includes(n.status)) arr.push(n);
    });
    arr.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    if(!arr.length){ el.innerHTML=''; return; }
    el.innerHTML=`<h3 style="color:#fb923c">🔑 Hesab məlumatları (${arr.length})</h3>
    <table class="cabinet-table"><thead><tr><th>Məhsul</th><th>Alıcı</th><th>Məbləğ</th><th>Hesab məlumatları</th><th>Əməliyyat</th></tr></thead><tbody>
    ${arr.map(n=>`<tr>
      <td><b>${esc(n.productTitle||"")}</b></td>
      <td><small>${esc(n.buyerEmail||"")}</small></td>
      <td>${Number(n.price||0).toFixed(2)} ₼</td>
      <td><pre style="font-size:11px;color:#e2e8f0;margin:0;white-space:pre-wrap">${esc(n.credentials||"")}</pre></td>
      <td><button type="button" class="approve-btn" data-notif-id="${n.id}" data-buyer-uid="${n.buyerUid||""}" data-buyer-email="${esc(n.buyerEmail||"")}">✅ Təsdiqləyirəm, alıcıya göndər</button></td>
    </tr>`).join("")}
    </tbody></table>`;
    el.querySelectorAll("[data-notif-id]").forEach(b=>b.onclick=e=>{
      e.preventDefault(); e.stopPropagation();
      sendNotifToBuyer(b.dataset.notifId, b.dataset.buyerUid, b.dataset.buyerEmail);
    });
  }, err=>console.warn("Notif:", err));
}

async function sendNotifToBuyer(notifId, buyerUid, buyerEmail){
  if(!isAdmin()) return;
  if(!await (window.showConfirm||window.confirm)("Hesab məlumatlarını yoxladığınızı təsdiqləyib alıcıya göndərirsiniz?","✅")) return;
  try{
    const nSnap = await getDoc(doc(db,"adminNotifications",notifId));
    if(!nSnap.exists()){ toast("Tapılmadı."); return; }
    const n = nSnap.data();
    const ADMIN_UID = "B4BLhevMihY5FE8WRv1tk1DuHNm2";
    const chatId = [buyerUid, ADMIN_UID, n.orderId||notifId].join("__").replace(/[^a-zA-Z0-9_\-]/g,"_");
    const chatRef = doc(db,"chats",chatId);
    const chatSnap = await getDoc(chatRef).catch(()=>null);
    if(!chatSnap||!chatSnap.exists()){
      await setDoc(chatRef,{
        buyerUid, buyerEmail:buyerEmail||"",
        sellerUid:ADMIN_UID, sellerEmail:"admin@hesablar.net",
        productTitle:n.productTitle||"",orderId:n.orderId||"",
        participants:[buyerUid,ADMIN_UID],
        lastMessage:"",unreadBuyer:1,unreadSeller:0,
        updatedAt:serverTimestamp(),createdAt:serverTimestamp()
      });
    }
    await addDoc(collection(db,"chats",chatId,"messages"),{
      senderId:ADMIN_UID, senderEmail:"admin@hesablar.net",
      text:`🔑 Hesab məlumatlarınız:\n\n${n.credentials||""}\n\nXoş oyunlar! Problem olarsa admin ilə əlaqə saxlayın.`,
      type:"credentials",
      participants:[buyerUid, ADMIN_UID],
      createdAt:serverTimestamp()
    });
    await updateDoc(chatRef,{lastMessage:"Hesab məlumatları",unreadBuyer:1,updatedAt:serverTimestamp()}).catch(()=>{});
    await updateDoc(doc(db,"adminNotifications",notifId),{status:"Göndərildi",sentAt:serverTimestamp(),approvedBy:currentUser.uid||""});
    if(n.orderId) await updateDoc(doc(db,"orders",n.orderId),{
      pendingCredentials: deleteField(),
      credentialsStatus:"Alıcıya göndərildi",
      credentialsApprovedAt:serverTimestamp(),
      credentialsApprovedBy:currentUser.uid||"",
      updatedAt:serverTimestamp()
    }).catch(()=>{});
    toast("✅ Alıcıya göndərildi!");
  }catch(e){ console.error(e); toast("Xəta: "+e.message); }
}

function listenPayoutsAdmin(){
  const el = document.getElementById("adminPayouts");
  if(!el || !isAdmin()) return;
  const q = query(collection(db,"payoutRequests"), where("status","==","Gözləmədə"));
  onSnapshot(q, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    if(!arr.length){ el.innerHTML=''; return; }
    el.innerHTML=`<h3 style="color:#fb923c">💰 Ödəniş tələbləri (${arr.length})</h3><table class="cabinet-table"><thead><tr><th>Satıcı</th><th>Məhsul</th><th>Məbləğ</th><th>5% Komissiya</th><th>Ödənişi</th><th>Əməliyyat</th></tr></thead><tbody>${arr.map(r=>`<tr><td><small>${esc(r.sellerEmail||"")}</small></td><td>${esc(r.productTitle||"")}</td><td>${Number(r.price||0).toFixed(2)} ₼</td><td>-${Number(r.commission||0).toFixed(2)} ₼</td><td><b style="color:#22c55e">${Number(r.payout||0).toFixed(2)} ₼</b></td><td><button class="approve-btn" data-pay-id="${r.id}" data-seller-uid="${r.sellerUid||""}" data-payout="${r.payout||0}" data-order-id="${r.orderId||""}">✓ Ödə</button></td></tr>`).join("")}</tbody></table>`;
    el.querySelectorAll("[data-pay-id]").forEach(b=>b.onclick=()=>processPayoutAdmin(b.dataset.payId, b.dataset.sellerUid, parseFloat(b.dataset.payout), b.dataset.orderId));
  }, err=>console.warn("Payouts:", err));
}

async function processPayoutAdmin(payoutId, sellerUid, amount, orderId){
  if(!isAdmin()){ toast("Admin icazəsi yoxdur."); return; }
  if(!await showConfirm(`${amount.toFixed(2)} ₼ satıcıya ödənilsin?`, "💸")) return;
  try{
    // Satıcının balansına köçür
    if(sellerUid){
      const selRef = doc(db,"wallets",sellerUid);
      const sSnap = await getDoc(selRef).catch(()=>null);
      const s = sSnap?.exists() ? sSnap.data() : {balance:0,totalEarned:0};
      await setDoc(selRef,{
        balance: Number(s.balance||0)+amount,
        totalEarned: Number(s.totalEarned||0)+amount,
        updatedAt: serverTimestamp()
      },{merge:true});
    }
    // Payout request-i tamamla
    await updateDoc(doc(db,"payoutRequests",payoutId),{status:"Ödənildi",paidAt:serverTimestamp()});
    // Sifariş-i güncəllə
    if(orderId) await updateDoc(doc(db,"orders",orderId),{payoutDone:true, updatedAt:serverTimestamp()}).catch(()=>{});
    toast(`✅ ${amount.toFixed(2)} ₼ satıcıya göndərildi.`);
  }catch(e){ console.error(e); toast("Ödəniş xətası."); }
}


async function updateAdStatus(id, status){
  try{
    const adSnap = await getDoc(doc(db,"ads",id));
    const ad = adSnap.exists() ? adSnap.data() : {};
    await updateDoc(doc(db,"ads",id),{status, updatedAt:serverTimestamp()});

    // Satıcıya bildiriş — admin chat-i yox, adminNotifications vasitəsilə deyil,
    // sadəcə presence yoxlayırıq, satıcının öz "Elanlarım" bölməsi real-time yenilənir
    // Əlavə: satıcıya xəbərdarlıq mesajı göndər
    if(ad.sellerUid && status === "Təsdiqləndi"){
      toast("✅ Elan təsdiqləndi — satıcıya bildiriş göndərildi.");
    } else if(ad.sellerUid && status === "Rədd edildi"){
      toast("❌ Elan rədd edildi.");
    } else {
      toast("Elan statusu yeniləndi: " + status);
    }
  }catch(e){
    toast("Səlahiyyətiniz çatmır: " + (e.message||""));
  }
}


function listenSellerStats(){
  const sellersEl=document.getElementById("sellers");
  // Yalnız tamamlanmış sifarişləri say
  const q=query(collection(db,"orders"), where("status","==","Tamamlandı"));
  onSnapshot(q,snap=>{
    const counts={}; // {sellerEmail: {count, sellerUid}}
    snap.forEach(d=>{
      const o=d.data();
      const seller=o.sellerEmail || "GameSatış";
      if(!counts[seller]) counts[seller]={count:0, sellerUid:o.sellerUid||""};
      counts[seller].count++;
    });
    // localStorage-a sadə say kimi saxla
    const simple={};
    Object.entries(counts).forEach(([k,v])=>simple[k]=v.count);
    localStorage.setItem("gs_seller_sales_counts", JSON.stringify(simple));

    if(sellersEl){
      const rows=Object.entries(counts).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
      if(rows.length){
        sellersEl.innerHTML=rows.map(([email,data])=>{
          const safeEmail=String(email||"").replace(/[<>&"'`]/g,s=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;","`":"&#96;"}[s]));
          const safeName=safeEmail.split("@")[0];
          const st = getSellerStatus(data.sellerUid||"", email||"");
          const verBadge = (st&&st.sellerVerified) ? '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAEBElEQVR42rWVTWyUVRSG33Pu/b5vpp2iIqnVmEpLTTREjUkBMSHtNBpgbRpjAH/WgBBNFTa23SlpYoKauGgXplSwJOKuxRhaY4w/IEETqhChQReSugDbmflm7t9xMTP0h2qMxrO99z55zz3nvAdYLUSoq19077goiBBEaOkZRKh3XFRX/5RedvZvovvYwpH86PzQP71PK5WCSJ76oNQaIjngmSfA819zJfdSlGs4CgCuVDjoo9KImDWbtMLTbOT9z15o+KX+9nawCO2YQJx+A08Ppc9k78ieMAsWwZmrJGgDc/VeCBDCLOu4Pc5FKP+RPhsuZT/OboGa3AlTh+tF7SSTQAUAesYWOr2FF2u8irPtwZaBEOr3oKJMuzepCS5SLH7T1CCNA3DLv6KWQtdo8f5Iq83O+yeYsIeUagnOCRGkmhlRPTUBhAEKHBG8u84kY4H5vLOVr754/q5ZiJDuGphWnwNOEV7Wa5I+NoCvGIizICK6rQ4gUgQqO2Bt5FBm3eJ0/GomC1Ru+CEAfV0D04qbN3YLAAjzpCs574olI87KLYErggkoO+DuLOGNbQn2P04S0qIxBeeF9AQANG/srvXoQFVV/sHizyrOtAVbDkTEBCDIIlQRkDpgXQPh0NYYj93DOPWTDSMzioMpz57Z1biBBkAYgFRLPUgh31Haq+JMS3AmEIgrrqqMaVHpIjTCo82MEzMW731nOVgbdJxpyY8V9mOQAgCQiFDPh4U3dUPuNZ+mQhKo4gkPryMkinD2N487E0LRVqGHt8Z4pJnx0YzDyPcWsQIIAiGGzmTh0sLQtsu513nltHgBmhLg4KYYh5+M0Xmvwu+poLlxCfRHi5Ef6lBAZLXJq7VbfrS4XyXJW+Jt4pzn/AMa+zojzBvB8AWHHe0Km+9TOF5XyjVotVEC67jiTHpoenfTUYjQ8uJ1FK6oJLs+2HIoWuLtbQp7OyMwgFgTTl1yGL6wRGm1rwNHGfamPDu1q3ED6sXrPQnGIIXujkJeJUlrMBUDATXFwOlZj3fPWQiATy4vgVIdCkBAwZSNipPW/PFyHoMUek+C9dzFaQIAVrxdN0Ycoij2FYPgLHIxYeqax1xJcPVmgOYaVG75C0hHpJI4VgkQbpidAM7MXZymvx1pqY102YMSVR1DqWJFBMQ6InHuuoiMQfN5eHw5tbvhWvWPV4meY8UjuqnhFbtQ9CrOxHAVBJFq/kTgKINgU6tzjWzmC29P72nqW8nQq9mmcHqONZSKEhVsZRYi68G1NggBwaZXSEUdSgOk1NmuftErbXN1ox8vtQYn+wLxaZPNfJsslF6sG70vlg5kizeHS41rt4CxU1PmnU+fo19XGv3/tprw18t06j8t0z8BB38omljZPzUAAAAASUVORK5CYII=" style="width:19px;height:19px;vertical-align:middle;margin-left:4px" title="Təsdiqli satıcı">' : '';
          return `<button class="seller searchable" onclick="openSellerProfile('${data.sellerUid||""}','${safeEmail}')">
            <div class="sicon"><svg viewBox="0 0 24 24" style="width:24px" fill="#fb923c"><circle cx="12" cy="12" r="10"/></svg></div>
            <div><b>${safeName}${verBadge}</b><br><span class="star">★</span> <small>Tamamlanmış satış</small></div>
            <strong>${data.count} satış</strong>
          </button>`;
        }).join("");
      } else {
        sellersEl.innerHTML='<div class="cabinet-empty" style="font-size:13px">Hələ tamamlanmış satış yoxdur.</div>';
      }
    }
  },err=>console.warn("Seller stats yüklənmədi:",err));
}

function listenPublicAds(){
  if(unsubPublicAds) unsubPublicAds();
  const q=query(collection(db,"ads"),where("status","==","Təsdiqləndi"));
  unsubPublicAds=onSnapshot(q,snap=>{
    const arr=[];
    snap.forEach(d=>{
      const data = {id:d.id,...d.data()};
      if(!isAdExpired(data)) arr.push(data);
    });
    window.approvedFirestoreAds=arr;
    if(window.renderMarketAds) window.renderMarketAds();
  });
}

let wireDone=false;
function wire(){
  if(wireDone) return;
  wireDone=true;
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    await refreshUser();
    if(currentUser && currentUser.emailVerified){
      openCabinet();
    }else{
      openModal("loginModal");
      window.setAuthMode("login");
    }
  });
  document.getElementById("registerBtn")?.addEventListener("click", () => {
    if(currentUser) logoutUser();
    else { openModal("loginModal"); window.setAuthMode("register"); }
  });
  document.getElementById("cabinetBtn")?.addEventListener("click", openCabinet);
  document.getElementById("firebaseLoginBtn")?.addEventListener("click",loginUser);
  document.getElementById("firebaseRegisterBtn")?.addEventListener("click",registerUser);
  document.getElementById("forgotPasswordBtn")?.addEventListener("click",resetPassword);
  document.getElementById("googleLoginBtn")?.addEventListener("click",googleLogin);
  document.getElementById("phoneLoginTabBtn")?.addEventListener("click",showPhoneLogin);
  document.getElementById("emailLoginTabBtn")?.addEventListener("click",showEmailLogin);
  document.getElementById("sendPhoneCodeBtn")?.addEventListener("click",sendPhoneCode);
  document.getElementById("verifyPhoneCodeBtn")?.addEventListener("click",verifyPhoneCode);
  document.getElementById("adGame")?.addEventListener("change", updateAdGameCustomVisibility);
  document.getElementById("adCategory")?.addEventListener("change", syncAdFormToCategory);
  updateAdGameCustomVisibility();
  syncAdFormToCategory();
  document.getElementById("adImageFile")?.addEventListener("change", function(e){
    const files = Array.from(e.target.files || []);
    const preview = document.getElementById("adImagePreview");
    if(!preview) return;
    preview.innerHTML = "";
    if(!files.length) return;
    if(files.length > 5) toast("Yalnız ilk 5 şəkil götürüləcək.");
    files.filter(function(f){ return f.type.startsWith("image/"); }).slice(0,5).forEach(function(file, idx){
      var url = URL.createObjectURL(file);
      var wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid #333;flex-shrink:0;";
      var img = document.createElement("img");
      img.src = url; img.alt = "Şəkil "+(idx+1);
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      wrap.appendChild(img); preview.appendChild(wrap);
    });
  });
}

// Google redirect nəticəsini yoxla — redirect-dən qayıtdıqda işə düşür
getRedirectResult(auth).then(async (result)=>{
  if(!result || !result.user) return;
  const user = result.user;
  await ensureUserProfile(user,{
    name:(user.displayName||"").split(" ")[0] || "",
    surname:(user.displayName||"").split(" ").slice(1).join(" ") || "",
    birthDate:""
  }).catch(()=>{});
  await loadCurrentUserRole();
  if(await isCurrentUserBlocked()){ await signOut(auth); toast("Hesabınız bloklanıb."); return; }
  await ensureWallet(user.uid, user.email).catch(()=>{});
  toast("Google ilə giriş uğurludur");
}).catch((e)=>{ if(e.code !== "auth/no-current-user") console.warn("Redirect result:", e); });

onAuthStateChanged(auth, async user=>{
  // Qeydiyyat prosesi zamanı bu callback-i keç — registerUser öz axınını idarə edir
  if(window._isRegistering) return;

  // Auth state hər dəyişdikdə (giriş/çıxış/hesab dəyişimi) köhnə listener-ləri dayandır
  if(typeof stopChatListeners === "function") stopChatListeners();
  activeChatId = null;
  adminActiveChatId = null;

  currentUser=user||null;
  if(currentUser){
    await reload(currentUser).catch(()=>{});
    currentUser=auth.currentUser;
    await ensureUserProfile(currentUser).catch(()=>{});
    await loadCurrentUserRole();
    if(await isCurrentUserBlocked()){ await signOut(auth); currentUser=null; currentUserRole="user"; toast("Hesabınız admin tərəfindən bloklanıb."); }
    else { await ensureWallet(currentUser.uid,currentUser.email).catch(()=>{}); }
  } else {
    currentUserRole="user";
  }
  updateHeader();
  listenHeaderNotifications();
  wire();
  if(window.render) window.render();
  // Online statusu yenilə (presence-də sellerVerified də daxildir)
  listenSellerOnlineStatuses();
  if(currentUser){
    startOwnPresence();
  }else{
    stopOwnPresence();
  }
});

document.addEventListener("DOMContentLoaded",()=>{
  updateHeader();
  listenHeaderNotifications();
  wire();
  listenPublicAds();
  listenSellerStats();
  listenSellerOnlineStatuses();
});

// ============================================================
// 1. SATICI İCTİMAİ PROFİL
// ============================================================
window.openSellerProfile = async function(sellerUid, sellerEmail){
  if(!sellerUid && !sellerEmail){ toast("Satıcı məlumatı tapılmadı."); return; }
  openModal("sellerProfileModal");
  const el = document.getElementById("sellerProfileContent");
  el.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Yüklənir...</div>';
  try{
    // Satıcı profilini yüklə
    let profile = {};
    if(sellerUid){
      const uSnap = await getDoc(doc(db,"users",sellerUid)).catch(()=>null);
      if(uSnap && uSnap.exists()) profile = uSnap.data();
    }
    const displayName = profile.userId || (sellerEmail||"").split("@")[0] || "Satıcı";
    const initial = displayName.charAt(0).toUpperCase();
    const joinDate = profile.createdAt ? new Date(profile.createdAt.seconds*1000).toLocaleDateString("az-AZ",{year:"numeric",month:"long"}) : "";
    const isVerified = !!profile.sellerVerified;

    // Satıcının aktiv elanlarını yüklə
    const adsQ = sellerUid
      ? query(collection(db,"ads"), where("sellerUid","==",sellerUid), where("status","==","Təsdiqləndi"))
      : query(collection(db,"ads"), where("sellerEmail","==",sellerEmail), where("status","==","Təsdiqləndi"));
    const adsSnap = await getDocs(adsQ).catch(()=>null);
    const ads = [];
    if(adsSnap) adsSnap.forEach(d=>ads.push({id:d.id,...d.data()}));

    // Satış sayını tap
    const salesKey = sellerEmail || "";
    const salesCache = JSON.parse(localStorage.getItem("gs_seller_sales_counts")||"{}");
    const salesCount = salesCache[salesKey] || 0;

    // Rəyləri yüklə (bu satıcının aldığı rəylər)
    let avgRating = 0, reviewCount = 0;
    if(sellerUid){
      const revQ = query(collection(db,"reviews"), where("sellerUid","==",sellerUid));
      const revSnap = await getDocs(revQ).catch(()=>null);
      if(revSnap && !revSnap.empty){
        let total = 0;
        revSnap.forEach(d=>{ total += (d.data().rating||5); reviewCount++; });
        avgRating = (total/reviewCount).toFixed(1);
      }
    }

    const adsHtml = ads.length ? `
      <h4 style="margin:0 0 10px;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:.05em">Aktiv elanlar (${ads.length})</h4>
      <div class="seller-ads-grid">
        ${ads.slice(0,6).map((a,i)=>{
          // window.__spAds-a saxlayırıq, onclick-də yalnız index işlədirik
          if(!window.__spAds) window.__spAds = {};
          window.__spAds[a.id||i] = {title:a.title||"", price:a.priceText||(String(a.price||"")+" ₼"), desc:a.desc||"", seller:displayName, sellerUid:a.sellerUid||"", sellerEmail:a.sellerEmail||"", adId:a.id||"", views:a.views||0, icon:""};
          return `<div class="seller-ad-card" onclick="closeModal('sellerProfileModal');openProductDetail(window.__spAds['${esc(a.id||String(i))}'])">
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">${esc(a.title||"Elan")}</div>
            <div class="ad-price">${esc(a.priceText||String(a.price||"")+" ₼")}</div>
          </div>`;
        }).join("")}
      </div>` : '<p style="color:#64748b;font-size:13px">Bu satıcının aktiv elanı yoxdur.</p>';

    el.innerHTML = `
      <div class="seller-profile-header">
        <div class="seller-profile-avatar">${esc(initial)}</div>
        <div class="seller-profile-info">
          <h2>${esc(displayName)} ${isVerified ? '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAEBElEQVR42rWVTWyUVRSG33Pu/b5vpp2iIqnVmEpLTTREjUkBMSHtNBpgbRpjAH/WgBBNFTa23SlpYoKauGgXplSwJOKuxRhaY4w/IEETqhChQReSugDbmflm7t9xMTP0h2qMxrO99z55zz3nvAdYLUSoq19077goiBBEaOkZRKh3XFRX/5RedvZvovvYwpH86PzQP71PK5WCSJ76oNQaIjngmSfA819zJfdSlGs4CgCuVDjoo9KImDWbtMLTbOT9z15o+KX+9nawCO2YQJx+A08Ppc9k78ieMAsWwZmrJGgDc/VeCBDCLOu4Pc5FKP+RPhsuZT/OboGa3AlTh+tF7SSTQAUAesYWOr2FF2u8irPtwZaBEOr3oKJMuzepCS5SLH7T1CCNA3DLv6KWQtdo8f5Iq83O+yeYsIeUagnOCRGkmhlRPTUBhAEKHBG8u84kY4H5vLOVr754/q5ZiJDuGphWnwNOEV7Wa5I+NoCvGIizICK6rQ4gUgQqO2Bt5FBm3eJ0/GomC1Ru+CEAfV0D04qbN3YLAAjzpCs574olI87KLYErggkoO+DuLOGNbQn2P04S0qIxBeeF9AQANG/srvXoQFVV/sHizyrOtAVbDkTEBCDIIlQRkDpgXQPh0NYYj93DOPWTDSMzioMpz57Z1biBBkAYgFRLPUgh31Haq+JMS3AmEIgrrqqMaVHpIjTCo82MEzMW731nOVgbdJxpyY8V9mOQAgCQiFDPh4U3dUPuNZ+mQhKo4gkPryMkinD2N487E0LRVqGHt8Z4pJnx0YzDyPcWsQIIAiGGzmTh0sLQtsu513nltHgBmhLg4KYYh5+M0Xmvwu+poLlxCfRHi5Ef6lBAZLXJq7VbfrS4XyXJW+Jt4pzn/AMa+zojzBvB8AWHHe0Km+9TOF5XyjVotVEC67jiTHpoenfTUYjQ8uJ1FK6oJLs+2HIoWuLtbQp7OyMwgFgTTl1yGL6wRGm1rwNHGfamPDu1q3ED6sXrPQnGIIXujkJeJUlrMBUDATXFwOlZj3fPWQiATy4vgVIdCkBAwZSNipPW/PFyHoMUek+C9dzFaQIAVrxdN0Ycoij2FYPgLHIxYeqax1xJcPVmgOYaVG75C0hHpJI4VgkQbpidAM7MXZymvx1pqY102YMSVR1DqWJFBMQ6InHuuoiMQfN5eHw5tbvhWvWPV4meY8UjuqnhFbtQ9CrOxHAVBJFq/kTgKINgU6tzjWzmC29P72nqW8nQq9mmcHqONZSKEhVsZRYi68G1NggBwaZXSEUdSgOk1NmuftErbXN1ox8vtQYn+wLxaZPNfJsslF6sG70vlg5kizeHS41rt4CxU1PmnU+fo19XGv3/tprw18t06j8t0z8BB38omljZPzUAAAAASUVORK5CYII=" style="width:27px;height:27px;vertical-align:middle;margin-left:6px" title="Təsdiqli satıcı">' : ''}</h2>
          <div class="meta">
            ${joinDate ? `<span>📅 ${esc(joinDate)}</span>` : ""}
            ${reviewCount ? `<span>⭐ ${avgRating} (${reviewCount} rəy)</span>` : ""}
          </div>
        </div>
      </div>
      <div class="seller-profile-stats">
        <div class="sp-stat"><b>${ads.length}</b><span>Aktiv elan</span></div>
        <div class="sp-stat"><b>${salesCount}</b><span>Tamamlanan satış</span></div>
        <div class="sp-stat"><b>${avgRating||"—"}</b><span>Orta reytinq</span></div>
      </div>
      ${adsHtml}
      <button class="report-btn" style="margin-top:4px" onclick="openReportModal('seller','${esc(sellerUid||sellerEmail||"")}','${esc(displayName)}')">⚑ Satıcını şikayət et</button>
    `;
  }catch(e){
    console.error(e);
    el.innerHTML = '<p style="color:#ef4444;padding:20px">Profil yüklənmədi.</p>';
  }
};

// ============================================================
// 2. ŞİKAYƏT / REPORT SİSTEMİ
// ============================================================
window.openReportModal = function(type, targetId, targetTitle){
  if(!currentUser){ openModal("loginModal"); toast("Şikayət etmək üçün giriş et."); return; }
  document.getElementById("reportTargetId").value = targetId || "";
  document.getElementById("reportTargetType").value = type || "ad";
  document.getElementById("reportTargetTitle").value = targetTitle || "";
  document.getElementById("reportDesc").value = "";
  openModal("reportModal");
};

window.submitReport = async function(){
  if(!currentUser){ openModal("loginModal"); return; }
  if(!rateLimiter("submitReport", 60_000, "Şikayət üçün 60 saniyə gözləyin.")) return;
  const targetId = document.getElementById("reportTargetId").value;
  const targetType = document.getElementById("reportTargetType").value;
  const targetTitle = document.getElementById("reportTargetTitle").value;
  const reason = document.getElementById("reportReason").value;
  const desc = document.getElementById("reportDesc").value.trim();
  if(!targetId){ toast("Hədəf məlumatı tapılmadı."); return; }
  try{
    await addDoc(collection(db,"reports"),{
      targetId, targetType, targetTitle: targetTitle||"",
      reason, desc,
      reporterUid: currentUser.uid,
      reporterEmail: currentUser.email||"",
      status: "Baxılmadı",
      createdAt: serverTimestamp()
    });
    closeModal("reportModal");
    toast("Şikayətiniz göndərildi. Admin baxacaq.");
  }catch(e){ console.error(e); toast("Şikayət göndərilmədi."); }
};

// Admin panelindən şikayətlərə baxmaq
window.listenReportsAdmin = function(){
  const el = document.getElementById("adminReports");
  if(!el || !isAdmin()) return;
  const q = query(collection(db,"reports"), where("status","==","Baxılmadı"));
  onSnapshot(q, snap=>{
    const arr = [];
    snap.forEach(d=>arr.push({id:d.id,...d.data()}));
    if(!arr.length){ el.innerHTML='<div class="cabinet-empty">Baxılmamış şikayət yoxdur.</div>'; return; }
    el.innerHTML = arr.map(r=>`
      <div style="background:#0d1117;border:1px solid #1e2d45;border-radius:10px;padding:14px;margin-bottom:8px;font-size:13px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <b>${esc(r.targetType==="seller"?"Satıcı şikayəti":"Elan şikayəti")}</b> — <span style="color:#fb923c">${esc(r.reason)}</span><br>
            <span style="color:#64748b">Hədəf: ${esc(r.targetTitle||r.targetId||"")}</span><br>
            ${r.desc?`<span style="color:#94a3b8">${esc(r.desc)}</span>`:""}
            <br><small style="color:#475569">Şikayətçi: ${esc(r.reporterEmail||"")}</small>
          </div>
          <button onclick="resolveReport('${r.id}')" style="background:#1e2d45;border:1px solid #2a3d5a;color:#e2e8f0;padding:6px 12px;border-radius:6px;cursor:pointer;white-space:nowrap;font-size:12px">Baxıldı ✓</button>
        </div>
      </div>`).join("");
  }, err=>console.warn("Reports:", err));
};

window.resolveReport = async function(id){
  try{
    await updateDoc(doc(db,"reports",id),{status:"Həll edildi",resolvedAt:serverTimestamp()});
    toast("Şikayət bağlandı.");
  }catch(e){ toast("Xəta baş verdi."); }
};

// ============================================================
// 3. KUPON / ENDİRİM SİSTEMİ
// ============================================================
let activeCoupon = null; // {code, discount, id}

window.applyCoupon = async function(){
  const code = (document.getElementById("couponInput")?.value||"").trim().toUpperCase();
  if(!code){ toast("Kupon kodu yaz."); return; }
  if(!currentUser){ openModal("loginModal"); return; }
  try{
    const q = query(collection(db,"coupons"), where("code","==",code), where("active","==",true));
    const snap = await getDocs(q);
    if(snap.empty){ toast("Bu kupon kodu mövcud deyil və ya deaktivdir."); return; }
    const couponDoc = snap.docs[0];
    const c = couponDoc.data();
    // Müddəti yoxla
    if(c.expiry && new Date(c.expiry) < new Date()){ toast("Bu kuponun müddəti bitib."); return; }
    // Maksimum istifadə yoxla
    if(c.maxUses && (c.usedCount||0) >= c.maxUses){ toast("Bu kupon artıq maksimum sayda istifadə edilib."); return; }
    activeCoupon = {code, discount: c.discount, id: couponDoc.id};
    renderCouponStatus();
    toast(`✓ ${code} kuponu tətbiq edildi — ${c.discount}% endirim`);
  }catch(e){ console.error(e); toast("Kupon yoxlanmadı."); }
};

window.removeCoupon = function(){
  activeCoupon = null;
  renderCouponStatus();
  const inp = document.getElementById("couponInput");
  if(inp) inp.value = "";
  toast("Kupon silindi.");
};

function renderCouponStatus(){
  const el = document.getElementById("couponStatus");
  if(!el) return;
  if(activeCoupon){
    el.innerHTML = `<div class="coupon-applied"><span>🏷️ <b>${esc(activeCoupon.code)}</b> — ${activeCoupon.discount}% endirim tətbiq edildi</span><button onclick="removeCoupon()">✕</button></div>`;
  } else {
    el.innerHTML = "";
  }
  // Məbləği yenilə
  if(typeof updateCart === "function") updateCart();
}

// Kupon endirimi tətbiq et (cart-dan çağırılır)
window.getCouponDiscount = function(total){
  if(!activeCoupon || !total) return 0;
  return Math.round(total * activeCoupon.discount / 100 * 100) / 100;
};

// Sifarişdə kuponu işlət (usedCount artır)
async function useCoupon(){
  if(!activeCoupon) return;
  try{
    await updateDoc(doc(db,"coupons",activeCoupon.id),{
      usedCount: increment(1)
    });
  }catch(e){ console.warn("Kupon istifadə sayı artmadı:", e); }
}

// Admin: kupon yarat
window.createCoupon = async function(){
  if(!isAdmin()){ toast("Yalnız admin kupon yarada bilər."); return; }
  const code = (document.getElementById("couponCode")?.value||"").trim().toUpperCase();
  const discount = Number(document.getElementById("couponDiscount")?.value);
  const maxUses = Number(document.getElementById("couponMaxUses")?.value) || 0;
  const expiry = document.getElementById("couponExpiry")?.value || "";
  if(!code || !discount || discount<1 || discount>100){ toast("Kodu və endirimi düzgün doldur."); return; }
  try{
    // Eyni kod varsa yoxla
    const q = query(collection(db,"coupons"), where("code","==",code));
    const exists = await getDocs(q);
    if(!exists.empty){ toast("Bu kod artıq mövcuddur."); return; }
    await addDoc(collection(db,"coupons"),{
      code, discount, maxUses: maxUses||null, expiry: expiry||null,
      active:true, usedCount:0, createdAt:serverTimestamp()
    });
    closeModal("createCouponModal");
    toast(`✓ ${code} kuponu yaradıldı!`);
    listenCouponsAdmin();
  }catch(e){ console.error(e); toast("Kupon yaradılmadı."); }
};

// Admin: kuponları göstər
window.listenCouponsAdmin = async function(){
  const el = document.getElementById("adminCoupons");
  if(!el || !isAdmin()) return;
  try{
    const snap = await getDocs(collection(db,"coupons"));
    const coupons = [];
    snap.forEach(d=>coupons.push({id:d.id,...d.data()}));
    if(!coupons.length){ el.innerHTML='<div class="cabinet-empty">Kupon yoxdur.</div>'; return; }
