import { useState, useMemo, useEffect, useRef } from "react";

const ASSETS = [
  { id:"1001", name:"清水寺 本堂", kana:"きよみずでら ほんどう", pref:"京都府", city:"京都市東山区", cat:"建造物", era:"江戸", rank:"国宝", lat:34.9948, lon:135.7850, desc:"1633年再建。懸造りの舞台で知られる京都を代表する名刹。" },
  { id:"1002", name:"金閣寺（鹿苑寺）", kana:"きんかくじ ろくおんじ", pref:"京都府", city:"京都市北区", cat:"建造物", era:"室町", rank:"重要文化財", lat:35.0394, lon:135.7292, desc:"北山文化を代表する金箔貼りの三層楼閣。足利義満が建立。" },
  { id:"1003", name:"法隆寺 西院伽藍", kana:"ほうりゅうじ さいいんがらん", pref:"奈良県", city:"生駒郡斑鳩町", cat:"建造物", era:"飛鳥", rank:"国宝", lat:34.6147, lon:135.7344, desc:"現存する世界最古の木造建築群。聖徳太子ゆかりの寺院。" },
  { id:"1004", name:"姫路城 大天守", kana:"ひめじじょう だいてんしゅ", pref:"兵庫県", city:"姫路市", cat:"建造物", era:"江戸", rank:"国宝", lat:34.8394, lon:134.6939, desc:"白鷺城とも呼ばれる白漆喰の外観が美しい連立式天守。" },
  { id:"1005", name:"東大寺 南大門", kana:"とうだいじ なんだいもん", pref:"奈良県", city:"奈良市", cat:"建造物", era:"鎌倉", rank:"国宝", lat:34.6888, lon:135.8399, desc:"東大寺の正門。運慶・快慶作の金剛力士像が守護する。" },
  { id:"2001", name:"日光東照宮 陽明門", kana:"にっこうとうしょうぐう ようめいもん", pref:"栃木県", city:"日光市", cat:"建造物", era:"江戸", rank:"国宝", lat:36.7584, lon:139.5987, desc:"日暮の門とも呼ばれ、江戸時代の装飾技術の最高峰。" },
  { id:"3001", name:"厳島神社 本社本殿", kana:"いつくしまじんじゃ ほんしゃほんでん", pref:"広島県", city:"廿日市市", cat:"建造物", era:"平安", rank:"国宝", lat:34.2957, lon:132.3197, desc:"海上に建つ朱色の社殿。平清盛が現在の形に整備。" },
  { id:"4001", name:"首里城 正殿", kana:"しゅりじょう せいでん", pref:"沖縄県", city:"那覇市", cat:"建造物", era:"琉球", rank:"重要文化財", lat:26.2172, lon:127.7192, desc:"琉球王国の政治・文化の中心。中国と日本の様式が融合。" },
  { id:"5001", name:"松本城 天守", kana:"まつもとじょう てんしゅ", pref:"長野県", city:"松本市", cat:"建造物", era:"戦国", rank:"国宝", lat:36.2381, lon:137.9719, desc:"現存12天守の一つ。黒と白のコントラストが美しい五重六階。" },
  { id:"6001", name:"彦根城 天守", kana:"ひこねじょう てんしゅ", pref:"滋賀県", city:"彦根市", cat:"建造物", era:"江戸", rank:"国宝", lat:35.2762, lon:136.2517, desc:"現存12天守の一つ。琵琶湖を望む井伊氏の城。" },
  { id:"7001", name:"浅草寺 雷門", kana:"せんそうじ かみなりもん", pref:"東京都", city:"台東区", cat:"建造物", era:"江戸", rank:"重要文化財", lat:35.7115, lon:139.7964, desc:"東京最古の寺。大提灯で有名な雷門は浅草の象徴。" },
  { id:"8001", name:"二条城 二の丸御殿", kana:"にじょうじょう にのまるごてん", pref:"京都府", city:"京都市中京区", cat:"建造物", era:"江戸", rank:"国宝", lat:35.0142, lon:135.7480, desc:"徳川家康が築城。大政奉還の舞台となった歴史的空間。" },
];

const PREFS = ["全て", ...new Set(ASSETS.map(a => a.pref))].sort((a,b) => a==="全て"?-1:b==="全て"?1:a.localeCompare(b,"ja"));
const LS_KEY = "bunka_visited_v1";

function loadVisited() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveVisited(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)); }

export default function App() {
  const [tab, setTab] = useState("list");
  const [visited, setVisited] = useState(loadVisited);
  const [filterPref, setFilterPref] = useState("全て");
  const [filterVisit, setFilterVisit] = useState("all");
  const [sortKey, setSortKey] = useState("pref");
  const [selected, setSelected] = useState(null);
  const [memo, setMemo] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [showMedal, setShowMedal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);

  const visitedCount = Object.keys(visited).length;
  const total = ASSETS.length;
  const pct = Math.round((visitedCount / total) * 100);

  useEffect(() => {
    if (tab !== "map") return;
    if (leafletMap.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      if (!mapRef.current || leafletMap.current) return;
      const L = window.L;
      const map = L.map(mapRef.current).setView([36.5, 136.0], 5);
      L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        attribution: "国土地理院", maxZoom: 18,
      }).addTo(map);
      leafletMap.current = map;
      setMapReady(true);
    };
    document.head.appendChild(script);
  }, [tab]);

  useEffect(() => {
    if (!leafletMap.current || !mapReady) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    ASSETS.forEach(asset => {
      const isDone = !!visited[asset.id];
      const color = isDone ? "#16a34a" : asset.rank === "国宝" ? "#dc2626" : "#2563eb";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:11px;color:#fff;">${isDone?"✓":asset.rank==="国宝"?"宝":"重"}</span></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28],
      });
      const marker = L.marker([asset.lat, asset.lon], { icon })
        .addTo(leafletMap.current)
        .on("click", () => { setSelected(asset); setMemo(visited[asset.id]?.memo||""); setPhotoUrl(visited[asset.id]?.photo||null); });
      markersRef.current.push(marker);
    });
  }, [mapReady, visited, tab]);

  const filtered = useMemo(() => {
    let list = ASSETS;
    if (filterPref !== "全て") list = list.filter(a => a.pref === filterPref);
    if (filterVisit === "visited") list = list.filter(a => visited[a.id]);
    if (filterVisit === "unvisited") list = list.filter(a => !visited[a.id]);
    return [...list].sort((a,b) => {
      if (sortKey === "name") return a.kana.localeCompare(b.kana,"ja");
      if (sortKey === "rank") return a.rank.localeCompare(b.rank);
      return a.pref.localeCompare(b.pref,"ja");
    });
  }, [filterPref, filterVisit, sortKey, visited]);

  function handleCheckin() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"}) + " " + now.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
    const next = { ...visited, [selected.id]: { date: dateStr, memo, photo: photoUrl } };
    setVisited(next); saveVisited(next);
    if (Object.keys(next).length === total) setShowMedal(true);
    setSelected(null);
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target.result);
    reader.readAsDataURL(file);
  }

  const prefStats = useMemo(() => {
    const s = {};
    ASSETS.forEach(a => {
      if (!s[a.pref]) s[a.pref] = { total:0, done:0 };
      s[a.pref].total++;
      if (visited[a.id]) s[a.pref].done++;
    });
    return Object.entries(s).sort((a,b)=>a[0].localeCompare(b[0],"ja"));
  }, [visited]);

  const C = { bg:"#f7f4ef", surface:"#ffffff", ink:"#1c1a17", muted:"#7a7067", accent:"#c8a96e", accentDark:"#9a7a42", kokuho:"#b91c1c", juyo:"#1d4ed8", green:"#16a34a", border:"#e8e0d4" };

  const S = {
    root:{ fontFamily:"'Noto Sans JP',sans-serif", background:C.bg, minHeight:"100vh", maxWidth:480, margin:"0 auto" },
    header:{ background:"linear-gradient(135deg,#1c1a17,#2d2820)", padding:"16px 16px 12px", position:"sticky", top:0, zIndex:50 },
    headerTop:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
    logo:{ fontSize:20, fontWeight:700, color:C.accent, letterSpacing:2 },
    logoSub:{ fontSize:10, color:"#9a8f7f", marginTop:3 },
    statsBox:{ textAlign:"right" },
    statsNum:{ fontSize:26, fontWeight:700, color:C.accent, lineHeight:1 },
    statsSlash:{ fontSize:14, color:"#6a5f50" },
    statsLabel:{ fontSize:10, color:"#9a8f7f", marginTop:2 },
    progressWrap:{ display:"flex", alignItems:"center", gap:8 },
    progressBg:{ flex:1, height:4, background:"#3a3228", borderRadius:2, overflow:"hidden" },
    progressFill:{ height:"100%", background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, borderRadius:2, transition:"width 0.8s ease" },
    progressPct:{ fontSize:10, color:C.accent, width:30, textAlign:"right" },
    nav:{ display:"flex", background:C.surface, borderBottom:`1px solid ${C.border}`, position:"sticky", top:72, zIndex:40 },
    tabOff:{ flex:1, border:"none", background:"none", padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", color:C.muted, cursor:"pointer" },
    tabOn:{ flex:1, border:"none", background:"none", padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", color:C.ink, cursor:"pointer", borderBottom:`3px solid ${C.accentDark}`, fontWeight:700, marginBottom:-1 },
    main:{ paddingBottom:40 },
    filterBar:{ display:"flex", gap:6, padding:"12px 12px 4px", flexWrap:"wrap" },
    sel:{ flex:"1 1 100px", padding:"7px 8px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, background:C.surface, color:C.ink },
    resultCount:{ padding:"4px 12px 8px", fontSize:11, color:C.muted },
    card:{ display:"flex", alignItems:"center", gap:12, background:C.surface, margin:"0 12px 8px", borderRadius:14, padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.07)", cursor:"pointer" },
    cardBody:{ flex:1, minWidth:0 },
    cardName:{ fontSize:14, fontWeight:700, color:C.ink, lineHeight:1.3 },
    cardMeta:{ fontSize:11, color:C.muted, marginTop:3 },
    cardDate:{ fontSize:10, color:C.green, marginTop:3 },
    doneCircle:{ width:40, height:40, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, flexShrink:0 },
    noneCircle:{ width:40, height:40, borderRadius:"50%", background:C.border, color:C.muted, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 },
    rankK:{ fontSize:9, color:"#fff", background:C.kokuho, borderRadius:4, padding:"2px 6px", whiteSpace:"nowrap", flexShrink:0 },
    rankJ:{ fontSize:9, color:"#fff", background:C.juyo, borderRadius:4, padding:"2px 6px", whiteSpace:"nowrap", flexShrink:0 },
    sectionHead:{ padding:"16px 16px 8px", fontSize:13, fontWeight:700, color:C.muted, borderBottom:`1px solid ${C.border}`, marginBottom:8 },
    empty:{ textAlign:"center", padding:"60px 20px", color:C.muted, fontSize:13, lineHeight:2 },
    logCard:{ background:C.surface, margin:"0 12px 10px", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,0.07)" },
    logDate:{ fontSize:10, color:C.muted, padding:"10px 14px 4px" },
    logPhoto:{ width:"100%", height:140, objectFit:"cover", display:"block" },
    logNoPhoto:{ height:50, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:12, background:C.bg },
    logName:{ fontSize:15, fontWeight:700, color:C.ink, padding:"8px 14px 2px" },
    logPref:{ fontSize:11, color:C.muted, padding:"0 14px 6px" },
    logMemo:{ fontSize:12, color:"#444", padding:"6px 14px 12px", borderTop:`1px solid ${C.border}`, marginTop:4 },
    achieveWrap:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"28px 0 16px" },
    achieveRing:{ position:"relative", width:160, height:160 },
    achieveInner:{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
    achievePct:{ fontSize:36, fontWeight:700, color:C.accentDark, lineHeight:1 },
    achieveCount:{ fontSize:12, color:C.muted, marginTop:4 },
    medalBig:{ marginTop:12, fontSize:20, fontWeight:700, color:C.accentDark, background:"linear-gradient(135deg,#fef3c7,#fde68a)", padding:"10px 24px", borderRadius:40 },
    prefRow:{ display:"flex", alignItems:"center", gap:8, padding:"6px 16px" },
    prefName:{ fontSize:12, color:C.ink, width:92, flexShrink:0 },
    prefBarWrap:{ flex:1, background:C.border, borderRadius:3, height:7, overflow:"hidden" },
    prefBarFill:{ height:"100%", background:`linear-gradient(90deg,${C.accentDark},${C.accent})`, borderRadius:3, transition:"width 0.8s ease" },
    prefCount:{ fontSize:11, color:C.muted, width:36, textAlign:"right" },
    overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100, display:"flex", alignItems:"flex-end" },
    sheet:{ background:C.surface, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, margin:"0 auto", maxHeight:"88vh", overflowY:"auto" },
    sheetHandle:{ width:40, height:4, background:C.border, borderRadius:2, margin:"12px auto 0" },
    sheetHeader:{ padding:"16px 20px 12px", borderBottom:`1px solid ${C.border}`, position:"relative" },
    sheetName:{ fontSize:20, fontWeight:700, color:C.ink, lineHeight:1.3 },
    sheetMeta:{ fontSize:11, color:C.muted, marginTop:6 },
    closeX:{ position:"absolute", top:16, right:16, background:C.border, border:"none", borderRadius:"50%", width:30, height:30, fontSize:14, cursor:"pointer" },
    sheetBody:{ padding:"16px 20px 40px" },
    sheetDesc:{ fontSize:13, color:"#444", lineHeight:1.8, marginBottom:14 },
    coordPill:{ display:"inline-block", fontSize:11, color:C.muted, background:C.bg, borderRadius:20, padding:"4px 12px", marginBottom:14 },
    photoLabel:{ display:"block", cursor:"pointer", marginBottom:12 },
    photoPlaceholder:{ background:C.bg, border:`2px dashed ${C.border}`, borderRadius:10, height:72, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:C.muted },
    fieldLabel:{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6 },
    textarea:{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", fontSize:13, resize:"none", background:C.bg, color:C.ink, fontFamily:"inherit", marginBottom:14 },
    checkinBtn:{ display:"block", width:"100%", padding:"15px", background:"linear-gradient(135deg,#1c1a17,#3a3228)", color:C.accent, border:"none", borderRadius:14, fontSize:16, fontWeight:700, cursor:"pointer", letterSpacing:2 },
    visitedBadge:{ background:"#f0fdf4", color:C.green, border:`1px solid #bbf7d0`, borderRadius:12, padding:"12px 16px", textAlign:"center", fontSize:13, fontWeight:600 },
    medalOverlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" },
    medalBox:{ background:C.surface, borderRadius:24, padding:"40px 32px", textAlign:"center", maxWidth:280 },
    medalEmoji:{ fontSize:80, display:"block", marginBottom:12 },
    medalTitle:{ fontSize:26, fontWeight:700, color:C.accentDark, marginBottom:8 },
    medalSub:{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:24 },
    medalBtn:{ background:"linear-gradient(135deg,#1c1a17,#3a3228)", color:C.accent, border:"none", borderRadius:12, padding:"12px 32px", fontSize:14, cursor:"pointer", fontWeight:700 },
    legend:{ position:"absolute", bottom:12, left:12, background:"rgba(255,255,255,0.9)", borderRadius:8, padding:"6px 10px", fontSize:11, boxShadow:"0 2px 8px rgba(0,0,0,0.15)" },
  };

  return (
    <div style={S.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input[type=file]{display:none;}`}</style>
      <header style={S.header}>
        <div style={S.headerTop}>
          <div><div style={S.logo}>🏯 文化財めぐり</div><div style={S.logoSub}>全国重要文化財 巡礼手帳</div></div>
          <div style={S.statsBox}><div style={S.statsNum}>{visitedCount}<span style={S.statsSlash}>/{total}</span></div><div style={S.statsLabel}>訪問済</div></div>
        </div>
        <div style={S.progressWrap}><div style={S.progressBg}><div style={{...S.progressFill,width:`${pct}%`}}/></div><span style={S.progressPct}>{pct}%</span></div>
      </header>
      <nav style={S.nav}>
        {[{k:"list",icon:"📋",label:"一覧"},{k:"map",icon:"🗺",label:"地図"},{k:"log",icon:"📷",label:"記録"},{k:"complete",icon:"🏅",label:"達成"}].map(t=>(
          <button key={t.k} style={tab===t.k?S.tabOn:S.tabOff} onClick={()=>setTab(t.k)}>
            <span style={{fontSize:18}}>{t.icon}</span><span style={{fontSize:10,marginTop:2}}>{t.label}</span>
          </button>
        ))}
      </nav>
      <main style={S.main}>
        {tab==="list"&&<div>
          <div style={S.filterBar}>
            <select style={S.sel} value={filterPref} onChange={e=>setFilterPref(e.target.value)}>{PREFS.map(p=><option key={p}>{p}</option>)}</select>
            <select style={S.sel} value={filterVisit} onChange={e=>setFilterVisit(e.target.value)}><option value="all">全て</option><option value="unvisited">未訪問</option><option value="visited">訪問済み</option></select>
            <select style={S.sel} value={sortKey} onChange={e=>setSortKey(e.target.value)}><option value="pref">都道府県順</option><option value="name">名前順</option><option value="rank">指定区分</option></select>
          </div>
          <div style={S.resultCount}>{filtered.length}件</div>
          {filtered.map(a=>(
            <div key={a.id} style={S.card} onClick={()=>{setSelected(a);setMemo(visited[a.id]?.memo||"");setPhotoUrl(visited[a.id]?.photo||null);}}>
              {visited[a.id]?<div style={S.doneCircle}>✓</div>:<div style={S.noneCircle}>{a.rank==="国宝"?"宝":"重"}</div>}
              <div style={S.cardBody}>
                <div style={S.cardName}>{a.name}</div>
                <div style={S.cardMeta}>{a.pref} · {a.era}時代</div>
                {visited[a.id]&&<div style={S.cardDate}>📅 {visited[a.id].date}</div>}
              </div>
              <div style={a.rank==="国宝"?S.rankK:S.rankJ}>{a.rank}</div>
            </div>
          ))}
        </div>}
        {tab==="map"&&<div style={{height:"calc(100vh - 160px)",position:"relative"}}>
          <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
          <div style={S.legend}><span style={{color:"#16a34a"}}>● 訪問済</span><span style={{color:"#dc2626",marginLeft:10}}>● 国宝</span><span style={{color:"#2563eb",marginLeft:10}}>● 重要文化財</span></div>
        </div>}
        {tab==="log"&&<div>
          <div style={S.sectionHead}>訪問記録ログ</div>
          {ASSETS.filter(a=>visited[a.id]).length===0?<div style={S.empty}><div style={{fontSize:48,marginBottom:12}}>🗺</div>まだ訪問記録がありません。</div>:
          ASSETS.filter(a=>visited[a.id]).map(a=>(
            <div key={a.id} style={S.logCard}>
              <div style={S.logDate}>{visited[a.id].date}</div>
              {visited[a.id].photo?<img src={visited[a.id].photo} alt="" style={S.logPhoto}/>:<div style={S.logNoPhoto}>📷 写真なし</div>}
              <div style={S.logName}>{a.name}</div>
              <div style={S.logPref}>{a.pref} · {a.rank}</div>
              {visited[a.id].memo&&<div style={S.logMemo}>💬 {visited[a.id].memo}</div>}
            </div>
          ))}
        </div>}
        {tab==="complete"&&<div>
          <div style={S.achieveWrap}>
            <div style={S.achieveRing}>
              <svg viewBox="0 0 100 100" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e8e0d4" strokeWidth="8"/>
                <circle cx="50" cy="50" r="44" fill="none" stroke="#c8a96e" strokeWidth="8" strokeDasharray={`${pct*2.764} 276.4`} strokeLinecap="round" transform="rotate(-90 50 50)"/>
              </svg>
              <div style={S.achieveInner}><div style={S.achievePct}>{pct}<span style={{fontSize:18}}>%</span></div><div style={S.achieveCount}>{visitedCount}/{total}件</div></div>
            </div>
            {pct===100&&<div style={S.medalBig}>🥇 全国制覇！</div>}
          </div>
          <div style={S.sectionHead}>都道府県別達成状況</div>
          {prefStats.map(([pref,{total:t,done:d}])=>(
            <div key={pref} style={S.prefRow}>
              <div style={S.prefName}>{d===t&&<span style={{marginRight:4}}>🏅</span>}{pref}</div>
              <div style={S.prefBarWrap}><div style={{...S.prefBarFill,width:`${Math.round(d/t*100)}%`}}/></div>
              <div style={S.prefCount}>{d}/{t}</div>
            </div>
          ))}
        </div>}
      </main>
      {selected&&<div style={S.overlay} onClick={()=>setSelected(null)}>
        <div style={S.sheet} onClick={e=>e.stopPropagation()}>
          <div style={S.sheetHandle}/>
          <div style={S.sheetHeader}>
            <div style={selected.rank==="国宝"?{...S.rankK,display:"inline-block",marginBottom:6}:{...S.rankJ,display:"inline-block",marginBottom:6}}>{selected.rank}</div>
            <div style={S.sheetName}>{selected.name}</div>
            <div style={S.sheetMeta}>{selected.pref} {selected.city} · {selected.era}時代</div>
            <button style={S.closeX} onClick={()=>setSelected(null)}>✕</button>
          </div>
          <div style={S.sheetBody}>
            <p style={S.sheetDesc}>{selected.desc}</p>
            <div style={S.coordPill}>📍 {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</div>
            <label style={S.photoLabel} htmlFor="photo-input">
              {photoUrl?<img src={photoUrl} alt="" style={{width:"100%",height:160,objectFit:"cover",borderRadius:10}}/>:<div style={S.photoPlaceholder}>📷　写真を追加</div>}
            </label>
            <input id="photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhoto}/>
            <div style={S.fieldLabel}>メモ</div>
            <textarea style={S.textarea} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="感想・思い出を記録..." rows={3}/>
            {visited[selected.id]?<div style={S.visitedBadge}>✅ 訪問済み — {visited[selected.id].date}</div>:<button style={S.checkinBtn} onClick={handleCheckin}>📍　チェックイン</button>}
          </div>
        </div>
      </div>}
      {showMedal&&<div style={S.medalOverlay} onClick={()=>setShowMedal(false)}>
        <div style={S.medalBox}>
          <span style={S.medalEmoji}>🥇</span>
          <div style={S.medalTitle}>全国制覇！</div>
          <div style={S.medalSub}>全{total}ヶ所をコンプリートしました！</div>
          <button style={S.medalBtn} onClick={()=>setShowMedal(false)}>とじる</button>
        </div>
      </div>}
    </div>
  );
}
