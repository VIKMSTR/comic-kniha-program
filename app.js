(function(){
"use strict";
const HALLS = window.HALLS, DAYS = window.DAYS, PROGRAM = window.PROGRAM;
const HALL_ORDER = Object.keys(HALLS);
const DAY_KEYS = Object.keys(DAYS);

/* ---------- stabilní ID pořadu (FNV-1a → base36) ---------- */
function hash(str){
  let h = 0x811c9dc5;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h>>>0).toString(36);
}
const EVENTS = {};          // id -> {day, e}
DAY_KEYS.forEach(d => PROGRAM[d].forEach(e => {
  const id = hash(d+"|"+e[1]+"|"+e[0]+"|"+e[2]);
  e.id = id; EVENTS[id] = {day:d, e};
}));

/* ---------- úložiště: cookie, záložně localStorage ---------- */
const COOKIE_DAYS = 365;
function setCookie(name, value){
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = name+"="+encodeURIComponent(value)+"; Max-Age="+(COOKIE_DAYS*86400)+"; Path=/; SameSite=Lax"+secure;
}
function getCookie(name){
  const m = document.cookie.match(new RegExp("(?:^|; )"+name+"=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function store(name, arr){
  const v = arr.join(".");
  setCookie(name, v);
  if (getCookie(name) !== v){ try{ localStorage.setItem(name, v); }catch(e){} }
}
function restore(name){
  let v = getCookie(name);
  if (v === null){ try{ v = localStorage.getItem(name); }catch(e){} }
  return v ? v.split(".").filter(Boolean) : [];
}

let favs   = new Set(restore("kbcc_favs").filter(id => EVENTS[id]));
let hidden = new Set(restore("kbcc_hidden").filter(h => HALLS[h]));
let shared = null;          // Set id ze sdíleného odkazu
let planOnly = false;
let day = "sobota";
const saveFavs = () => store("kbcc_favs", [...favs]);
const saveHidden = () => store("kbcc_hidden", [...hidden]);

/* ---------- sdílený plán z URL ---------- */
const params = new URLSearchParams(location.search);
if (params.get("plan")){
  shared = new Set(params.get("plan").split(".").filter(id => EVENTS[id]));
  if (!shared.size) shared = null;
}
function clearSharedFromUrl(){
  const u = new URL(location.href); u.searchParams.delete("plan");
  history.replaceState(null, "", u.pathname + u.search + u.hash);
}
function showShared(){
  const box = document.getElementById("shared");
  if (!shared){ box.hidden = true; return; }
  const per = DAY_KEYS.map(d => [d, [...shared].filter(id => EVENTS[id].day===d).length]).filter(x=>x[1]);
  document.getElementById("sharedText").textContent =
    "Prohlížíte sdílený plán: " + shared.size + " pořadů (" + per.map(([d,n]) => DAYS[d].label.split(" ")[0].toLowerCase()+" "+n).join(", ") + "). Jsou označené modře.";
  box.hidden = false;
}
document.getElementById("sharedMerge").onclick = () => { shared.forEach(id => favs.add(id)); saveFavs(); shared=null; clearSharedFromUrl(); refresh(); toast("Sdílené pořady jsou přidané do vašeho plánu."); };
document.getElementById("sharedReplace").onclick = () => { favs = new Set(shared); saveFavs(); shared=null; clearSharedFromUrl(); refresh(); toast("Váš plán je nahrazený sdíleným."); };
document.getElementById("sharedClose").onclick = () => { shared=null; clearSharedFromUrl(); refresh(); };

/* ---------- pomocné ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let toastT;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(()=>t.textContent="",3500); }
function startOf(e){ const at=e[4]; if(at){ const [h,m]=at.split(":").map(Number); return [h,m]; } return [e[0],0]; }

/* ---------- vykreslení ---------- */
function renderDays(){
  const box = document.getElementById("days"); box.innerHTML="";
  DAY_KEYS.forEach(d => {
    const b=document.createElement("button"); b.type="button"; b.dataset.day=d;
    const n=[...favs].filter(id=>EVENTS[id].day===d).length;
    b.textContent = DAYS[d].label + (n ? "  ★"+n : "");
    b.setAttribute("aria-pressed", d===day);
    b.onclick = () => { location.hash = d; };
    box.appendChild(b);
  });
  document.getElementById("count").textContent = favs.size ? "("+favs.size+")" : "";
}
function renderChips(){
  const used = new Set(PROGRAM[day].map(e=>e[1]));
  const box = document.getElementById("chips"); box.innerHTML="";
  ["kb","cc"].forEach(f => {
    const lab=document.createElement("div"); lab.className="chiplabel"; lab.textContent = f==="kb" ? "Kniha Brno" : "Comic-Con Brno"; box.appendChild(lab);
    HALL_ORDER.filter(h => HALLS[h][0]===f && used.has(h)).forEach(h => {
      const b=document.createElement("button"); b.type="button"; b.className="chip"; b.dataset.f=f;
      b.textContent=HALLS[h][1]; b.setAttribute("aria-pressed", hidden.has(h) ? "false" : "true");
      b.onclick=()=>{ hidden.has(h) ? hidden.delete(h) : hidden.add(h); saveHidden(); renderChips(); renderGrid(); };
      box.appendChild(b);
    });
  });
}
function evHTML(e){
  const [, hall, title, who, at, approx] = e; const f = HALLS[hall][0]; const on = favs.has(e.id);
  const time = at ? `<span class="at">${approx?"≈ ":""}${esc(at)}</span> ` : "";
  const sh = shared && shared.has(e.id) ? `<div class="sh">Ve sdíleném plánu</div>` : "";
  return `<div class="ev ${f}${hall==="cc_e1"?" e1":""}${on?" on":""}" data-id="${e.id}">
    <div class="hall">${time}${esc(HALLS[hall][1])}</div>
    <div class="ttl">${esc(title)}</div>
    ${who ? `<div class="who">${esc(who)}</div>` : ""}${sh}
    <button type="button" class="fav" data-id="${e.id}" aria-pressed="${on}" aria-label="${on?"Odebrat z plánu":"Přidat do plánu"}: ${esc(title)}">${on?"★":"☆"}</button>
  </div>`;
}
function renderGrid(){
  const note = document.getElementById("daynote");
  note.hidden = !DAYS[day].note; note.textContent = DAYS[day].note || "";
  const visible = e => !hidden.has(e[1]) && (!planOnly || favs.has(e.id) || (shared && shared.has(e.id)));
  const evs = PROGRAM[day].filter(visible);
  const sortFn = (a,b) => HALL_ORDER.indexOf(a[1]) - HALL_ORDER.indexOf(b[1]) || (a[4]||"").localeCompare(b[4]||"");
  let html = "";
  DAYS[day].hours.forEach(hr => {
    const inHr = evs.filter(e => e[0]===hr);
    const kb = inHr.filter(e => HALLS[e[1]][0]==="kb").sort(sortFn);
    const cc = inHr.filter(e => HALLS[e[1]][0]==="cc").sort(sortFn);
    if (planOnly && !kb.length && !cc.length) return;
    const starred = PROGRAM[day].filter(e => e[0]===hr && favs.has(e.id)).length;
    const clash = starred>1 ? `<div class="clash">Kolize: v této hodině máte vybrané ${starred} pořady</div>` : "";
    const lane = (arr, cls, label) => `<div class="lane ${cls}"><div class="lh">${label}</div>${arr.length ? arr.map(evHTML).join("") : '<div class="empty">Nic</div>'}</div>`;
    html += `<section class="slot" id="h${hr}"><div class="time">${hr}:00</div>${lane(kb,"kbl","Kniha Brno")}${lane(cc,"ccl","<span>Comic-Con Brno</span>")}${clash}</section>`;
  });
  if (!html) html = '<p class="empty" style="padding:24px 0">Na tento den zatím nemáte nic vybráno. Vypněte „Jen můj plán“ a přidejte pořady hvězdičkou.</p>';
  document.getElementById("grid").innerHTML = html;
}
function refresh(){ showShared(); renderDays(); renderChips(); renderGrid(); barH(); }

/* ---------- interakce ---------- */
document.getElementById("grid").addEventListener("click", ev => {
  const card = ev.target.closest(".ev"); if (!card) return;
  const id = card.dataset.id;
  favs.has(id) ? favs.delete(id) : favs.add(id);
  saveFavs(); renderDays(); renderGrid();
});
document.getElementById("planTog").onclick = function(){ planOnly=!planOnly; this.setAttribute("aria-pressed", planOnly); renderGrid(); };
document.getElementById("clearBtn").onclick = () => {
  if (!favs.size) return toast("Výběr je prázdný.");
  if (confirm("Opravdu vymazat všech "+favs.size+" vybraných pořadů?")){ favs.clear(); saveFavs(); refresh(); toast("Výběr je vymazaný."); }
};
document.getElementById("shareBtn").onclick = async () => {
  if (!favs.size) return toast("Nejdřív si hvězdičkou vyberte pořady.");
  const u = new URL(location.href); u.search = ""; u.hash = "";
  u.searchParams.set("plan", [...favs].join("."));
  const url = u.toString();
  if (navigator.share){
    try{ await navigator.share({title:"Můj plán: Kniha Brno × Comic-Con Brno", url}); return; }catch(e){ if (e.name==="AbortError") return; }
  }
  try{ await navigator.clipboard.writeText(url); toast("Odkaz na plán je zkopírovaný."); }
  catch(e){ prompt("Zkopírujte odkaz na plán:", url); }
};
document.getElementById("icsBtn").onclick = () => {
  if (!favs.size) return toast("Nejdřív si hvězdičkou vyberte pořady.");
  const pad = n => String(n).padStart(2,"0");
  const utc = (date, h, m) => { // listopad = CET (UTC+1)
    const d = new Date(Date.UTC(+date.slice(0,4), +date.slice(5,7)-1, +date.slice(8,10), h-1, m));
    return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+"T"+pad(d.getUTCHours())+pad(d.getUTCMinutes())+"00Z";
  };
  const icsEsc = s => String(s).replace(/\\/g,"\\\\").replace(/[,;]/g, c=>"\\"+c).replace(/\n/g,"\\n");
  const stamp = utc("2026-11-13", 13, 0);
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//kbcc-plan//CS","CALSCALE:GREGORIAN"];
  [...favs].map(id=>EVENTS[id]).sort((a,b)=>(a.day+startOf(a.e)).localeCompare(b.day+startOf(b.e))).forEach(({day:d, e}) => {
    const [h,m] = startOf(e); const date = DAYS[d].date;
    const endM = h*60+m+50;
    lines.push("BEGIN:VEVENT","UID:"+e.id+"@kbcc-plan","DTSTAMP:"+stamp,
      "DTSTART:"+utc(date,h,m),"DTEND:"+utc(date,Math.floor(endM/60),endM%60),
      "SUMMARY:"+icsEsc(e[2]),
      "LOCATION:"+icsEsc(HALLS[e[1]][1]+", pavilon E, Výstaviště Brno"),
      "DESCRIPTION:"+icsEsc((HALLS[e[1]][0]==="kb"?"Kniha Brno":"Comic-Con Brno")+(e[3]?" – "+e[3]:"")+(e[5]?" (čas přibližný)":"")),
      "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], {type:"text/calendar;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "kniha-comiccon-brno-2026.ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  toast("Kalendář je stažený.");
};

/* ---------- dny přes #hash ---------- */
function setDay(d){ day = DAYS[d] ? d : "sobota"; refresh(); }
window.addEventListener("hashchange", () => setDay(location.hash.slice(1)));
function barH(){ document.documentElement.style.setProperty("--barh", document.getElementById("bar").offsetHeight+"px"); }
window.addEventListener("resize", barH);
document.querySelector("details.filters").addEventListener("toggle", barH);

// výchozí den: podle URL, jinak podle dnešního data, jinak sobota
let initial = location.hash.slice(1);
if (!DAYS[initial]){
  const today = new Date().toISOString().slice(0,10);
  initial = DAY_KEYS.find(d => DAYS[d].date === today) || "sobota";
}
setDay(initial);
})();
