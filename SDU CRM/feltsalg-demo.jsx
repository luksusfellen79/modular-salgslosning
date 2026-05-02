import { useState } from "react";

// Telenor design tokens from telenor.no
const T = {
  blue:        "#01ACFB",
  blueDark:    "#0085C3",
  blueDeep:    "#005A8E",
  blueLight:   "#E6F7FF",
  bluePale:    "#F0FAFF",
  white:       "#FFFFFF",
  gray50:      "#F7F8FA",
  gray100:     "#EEF0F3",
  gray200:     "#DDE1E7",
  gray400:     "#9DA5B1",
  gray600:     "#6B7280",
  gray800:     "#2D3748",
  gray900:     "#1A202C",
  green:       "#00A650",
  greenLight:  "#E6F6ED",
  amber:       "#F5A623",
  amberLight:  "#FFF8E6",
  red:         "#E5202E",
  redLight:    "#FDECEA",
  purple:      "#7B2D8B",
  purpleLight: "#F5EAF7",
  teal:        "#00897B",
  tealLight:   "#E0F2F1",
  font: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

const mockAddresses = [
  { id:1, address:"Maridalsveien 87",    area:"Nydalen",  zip:"0461", status:"unvisited", residents:3,
    activeProducts:["Fiber 500/500","TV Start"], previousProducts:["ADSL 20"], cancelReason:"Prisnivå",
    interest:{ sikre:88, mobil:72, internett:45, produktX:91 },
    campaigns:[
      { name:"Vårpakke 2025",    discount:"30%", tag:"Kampanje", color:T.blue,
        product:"Fiber 1G/1G",         price:"549 kr/md",       pitch:"Gratis installasjon + 3 mnd. halvpris ved signering i dag." },
      { name:"TV-pakke tilbud",  discount:"20%", tag:"TV",       color:T.blueDark,
        product:"TV Total",            price:"299 kr/md",        pitch:"20% rabatt på TV Total i 12 måneder. Inkluderer strømming." },
      { name:"Mobilkampanje",    discount:"25%", tag:"Mobil",    color:T.purple,
        product:"Mobil Fri+",          price:"449 kr/md",        pitch:"Ubegrenset data og fri tale. Bytt nå og spar 150 kr/md." },
    ],
    upsellProducts:["Fiber 1G/1G","TV Total","Mobil 15GB"] },

  { id:2, address:"Kjelsåsveien 22",     area:"Kjelsås",  zip:"0488", status:"unvisited", residents:2,
    activeProducts:[], previousProducts:["Fiber 200/200"], cancelReason:"Byttet til Altibox",
    interest:{ sikre:55, mobil:90, internett:94, produktX:40 },
    campaigns:[
      { name:"Tilbakevinn",      discount:"40%", tag:"Win-back", color:T.purple,
        product:"Fiber 500/500",       price:"399 kr/md i 6 mnd", pitch:"40% rabatt i 6 måneder + gratis router for tidligere kunder." },
      { name:"Sikre-pakke",      discount:"15%", tag:"Sikre",    color:T.green,
        product:"Sikre med bredbånd",  price:"549 kr/md",         pitch:"ID-vakt, svindelforsikring og Nettvern+ inkludert." },
      { name:"Dobbelpakke",      discount:"35%", tag:"Bundle",   color:T.amber,
        product:"Fiber 500 + Mobil",   price:"699 kr/md",         pitch:"Internett og mobil i én pakke. Spar 35% de første 6 mnd." },
    ],
    upsellProducts:["TV Start","Mobil 5GB"] },

  { id:3, address:"Sandakerveien 114",   area:"Sandaker", zip:"0484", status:"no_answer", residents:4,
    activeProducts:["Fiber 200/200"], previousProducts:[], cancelReason:null,
    interest:{ sikre:79, mobil:61, internett:83, produktX:55 },
    campaigns:[
      { name:"Upsell Fiber 1G",  discount:"15%", tag:"Upsell",   color:T.blueDark,
        product:"Fiber 1G/1G",         price:"599 kr/md",         pitch:"15% rabatt på oppgradering de neste 30 dagene." },
      { name:"Familiedeal",      discount:"20%", tag:"Familie",  color:T.teal,
        product:"Mobil Familie 4-pak", price:"1 199 kr/md",       pitch:"Fire mobilabonnement til familien. Delt data-pool." },
      { name:"Sikre Pluss",      discount:"10%", tag:"Sikre",    color:T.green,
        product:"Sikre Total",         price:"649 kr/md",         pitch:"Vår beste sikkerhetspakke inkl. kredittvakt og Min Sky." },
    ],
    upsellProducts:["Fiber 1G/1G","TV Total","Mobil Fri"] },

  { id:4, address:"Trondheimsveien 203", area:"Sinsen",   zip:"0570", status:"sold",      residents:2,
    activeProducts:["Fiber 500/500"], previousProducts:[], cancelReason:null,
    interest:{ sikre:65, mobil:88, internett:50, produktX:77 },
    campaigns:[
      { name:"Vårpakke 2025",    discount:"30%", tag:"Kampanje", color:T.blue,
        product:"TV Start + Fiber 500",price:"649 kr/md",         pitch:"Gratis installasjon og 3 mnd. halvpris." },
      { name:"Mobilkampanje",    discount:"25%", tag:"Mobil",    color:T.purple,
        product:"Mobil 15GB",          price:"299 kr/md",         pitch:"25% rabatt første 6 mnd. Ingen bindingstid." },
      { name:"Produkt X Pilot",  discount:"—",   tag:"Pilot",    color:T.amber,
        product:"Produkt X",           price:"199 kr/md",         pitch:"Eksklusivt pilot-tilbud. Kun tilgjengelig i ditt område." },
    ],
    upsellProducts:["TV Total","Mobil 15GB","Mobil Fri"] },

  { id:5, address:"Storo Allé 9",        area:"Storo",    zip:"0485", status:"unvisited", residents:1,
    activeProducts:[], previousProducts:[], cancelReason:null,
    interest:{ sikre:92, mobil:78, internett:97, produktX:83 },
    campaigns:[
      { name:"Nykundetilbud",    discount:"50%", tag:"Nykunde",  color:T.green,
        product:"Fiber 500/500",       price:"299 kr/md i 6 mnd", pitch:"Halvpris i 6 måneder. Ingen bindingstid." },
      { name:"Sikre-pakke",      discount:"15%", tag:"Sikre",    color:T.green,
        product:"Sikre med bredbånd",  price:"449 kr/md",         pitch:"Alt-i-ett sikkerhetspakke med bredbånd." },
      { name:"Produkt X Pilot",  discount:"—",   tag:"Pilot",    color:T.amber,
        product:"Produkt X",           price:"199 kr/md",         pitch:"Eksklusivt pilot-tilbud kun tilgjengelig nå." },
    ],
    upsellProducts:["Fiber 1G/1G","TV Start","TV Total","Mobil 5GB"] },
];

const sellers = [
  { id:1, name:"Lars Eriksen", initials:"LE", addresses:[1,2,5] },
  { id:2, name:"Maria Olsen",  initials:"MO", addresses:[3,4]   },
];

const statusConfig = {
  unvisited: { label:"Ikke besøkt",         color:T.gray600, bg:T.gray100     },
  no_answer: { label:"Ikke hjemme",         color:T.amber,   bg:T.amberLight  },
  sold:      { label:"Solgt",               color:T.green,   bg:T.greenLight  },
  rejected:  { label:"Ikke interessert",    color:T.red,     bg:T.redLight    },
  followup:  { label:"Oppfølging avtalt",   color:T.blueDark,bg:T.blueLight   },
  marketing: { label:"Sendt til marketing", color:T.purple,  bg:T.purpleLight },
};

/* ── Telenor logo mark ── */
function Logo({ white, size=26 }) {
  return (
    <svg width={size} height={size*(128.73/139.82)} viewBox="0 0 139.82 128.73">
      <path fill={white?"#fff":T.blue} d="M70.67,39.37c2,.31,2.4-.1,2.67-2a45.17,45.17,0,0,1,3.89-12.75C79.85,19.24,84,13.33,89.85,9.36a62.78,62.78,0,0,1,19.2-8.26,46.83,46.83,0,0,1,14-.93c8.42.76,13.08,3.16,15.42,6.27A6.75,6.75,0,0,1,139.81,10c.07,1.55-.6,3.56-2.83,5.54s-6.77,4.33-13.06,6.44c-6.52,2.17-15.44,4.47-24.33,6.51a137.22,137.22,0,0,0-15.22,4.37c-5.88,2-7.65,7.85-4,9.64A54.92,54.92,0,0,1,91.82,50,101.32,101.32,0,0,1,107.08,65c5.53,6.76,14.59,19.66,17.84,32.18,3.61,13.75,1.36,26.78-6.42,30.42-7.63,3.58-17.79-1.58-24.93-9-6.78-7-11.52-15.29-16-28-3.86-11-5.42-26.87-5.42-35.19,0-2.77,0-3.36.07-5.86.26-2.18-5.62-4-11.94.08-7.19,4.63-14.23,13-18.39,17.88-1.81,2.13-4.27,5.25-6.86,8.52-3.43,4.3-7.21,8.78-10.66,11.28C19.2,91,10.87,92.6,5,88.44c-3.25-2.32-5-6.7-5-11.16a16.91,16.91,0,0,1,2.3-8.77c2-3.43,5.17-7.12,10.28-11.34A90.51,90.51,0,0,1,34.73,44.54c12.88-5.19,26.75-6.82,35.94-5.17Z"/>
    </svg>
  );
}

function Badge({ label, color, bg, small }) {
  return (
    <span style={{ display:"inline-block", padding: small?"2px 7px":"3px 10px", borderRadius:4,
      fontSize: small?10:11, fontWeight:600, color, background:bg, letterSpacing:"0.02em" }}>
      {label}
    </span>
  );
}

function ScoreRing({ score }) {
  const r=17, cx=21, cy=21, sw=3, circ=2*Math.PI*r, dash=(score/100)*circ;
  const c = score>=85?T.green:score>=70?T.amber:T.red;
  return (
    <svg width={42} height={42}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.gray200} strokeWidth={sw}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={10} fontWeight="700" fill={c}>{score}</text>
    </svg>
  );
}

function Btn({ children, onClick, variant="primary", full, small, style:ext }) {
  const map = {
    primary:   { background:T.blue,    color:"#fff", border:"none" },
    secondary: { background:T.white,   color:T.blue, border:`1.5px solid ${T.blue}` },
    green:     { background:T.green,   color:"#fff", border:"none" },
    red:       { background:T.red,     color:"#fff", border:"none" },
    amber:     { background:T.amber,   color:"#fff", border:"none" },
    purple:    { background:T.purple,  color:"#fff", border:"none" },
    ghost:     { background:"transparent", color:T.blue, border:`1px solid ${T.gray200}` },
  };
  return (
    <button onClick={onClick} style={{ display:"inline-flex", alignItems:"center", justifyContent:"flex-start",
      gap:6, borderRadius:6, fontWeight:600, fontSize: small?12:14, cursor:"pointer",
      padding: small?"7px 12px":"10px 16px", width: full?"100%":undefined,
      fontFamily:T.font, transition:"opacity 0.15s", ...map[variant], ...(ext||{}) }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

/* ── Role select ── */
function RoleSelect({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:T.blueDeep, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:T.font, padding:24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ textAlign:"center", marginBottom:44 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:18 }}>
          <Logo white size={38}/>
          <span style={{ fontSize:26, fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>Telenor</span>
        </div>
        <div style={{ fontSize:30, fontWeight:700, color:"#fff", lineHeight:1.2, marginBottom:8 }}>Feltsalg</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.55)" }}>Velg din rolle for å komme i gang</div>
      </div>

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
        {[
          { role:"manager",
            icon:<svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
            title:"Salgssjef", sub:"Planlegg og fordel ruter" },
          { role:"seller",
            icon:<svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}><circle cx={12} cy={8} r={4}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
            title:"Selger", sub:"Dør-til-dør salgsverktøy" },
        ].map(({ role, icon, title, sub }) => (
          <button key={role} onClick={()=>onSelect(role)} style={{
            background:"rgba(255,255,255,0.07)", border:"1.5px solid rgba(255,255,255,0.18)",
            borderRadius:14, padding:"28px 36px", cursor:"pointer", color:"#fff",
            textAlign:"center", width:200, fontFamily:T.font, transition:"all 0.18s",
          }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(1,172,251,0.2)"; e.currentTarget.style.borderColor=T.blue; e.currentTarget.style.transform="translateY(-3px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.18)"; e.currentTarget.style.transform="none"; }}>
            <div style={{ marginBottom:14, color:T.blue }}>{icon}</div>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:5 }}>{title}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{sub}</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop:52, fontSize:11, color:"rgba(255,255,255,0.2)" }}>Demo · Mock data</div>
    </div>
  );
}

/* ── Shared top bar ── */
function TopBar({ title, sub, onBack }) {
  return (
    <div style={{ background:T.blueDeep, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Logo white size={22}/>
        <div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{sub}</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{title}</div>
        </div>
      </div>
      <button onClick={onBack} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, color:"rgba(255,255,255,0.8)", padding:"5px 12px", cursor:"pointer", fontSize:12, fontFamily:T.font }}>
        Bytt rolle
      </button>
    </div>
  );
}

/* ── Manager app ── */
function ManagerApp({ onBack }) {
  const [expanded, setExpanded] = useState(null);
  const stats = {
    total:     mockAddresses.length,
    unvisited: mockAddresses.filter(a=>a.status==="unvisited").length,
    noAnswer:  mockAddresses.filter(a=>a.status==="no_answer").length,
    sold:      mockAddresses.filter(a=>a.status==="sold").length,
  };
  return (
    <div style={{ minHeight:"100vh", background:T.gray50, fontFamily:T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <TopBar title="Salgsplanlegger" sub="Telenor Feltsalg" onBack={onBack}/>
      <div style={{ padding:"20px 24px" }}>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Adresser totalt", value:stats.total,     accent:T.blueDeep },
            { label:"Ikke besøkt",     value:stats.unvisited, accent:T.gray600  },
            { label:"Ikke hjemme",     value:stats.noAnswer,  accent:T.amber    },
            { label:"Solgt i dag",     value:stats.sold,      accent:T.green    },
          ].map(s=>(
            <div key={s.label} style={{ background:T.white, borderRadius:10, padding:"14px 16px", border:`1px solid ${T.gray200}`, borderTop:`3px solid ${s.accent}` }}>
              <div style={{ fontSize:11, color:T.gray600, marginBottom:6, fontWeight:500 }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:700, color:s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {sellers.map(seller=>(
          <div key={seller.id} style={{ background:T.white, borderRadius:12, border:`1px solid ${T.gray200}`, marginBottom:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", background:T.bluePale, borderBottom:`1px solid ${T.gray200}`, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:T.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {seller.initials}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color:T.gray900 }}>{seller.name}</div>
                <div style={{ fontSize:12, color:T.gray600 }}>{seller.addresses.length} adresser · est. 4 timer</div>
              </div>
              <Badge label="Aktiv rute" color={T.blue} bg={T.blueLight}/>
            </div>

            {seller.addresses.map((addrId,idx)=>{
              const addr=mockAddresses.find(a=>a.id===addrId);
              const st=statusConfig[addr.status];
              const isOpen=expanded===addr.id;
              const last=idx===seller.addresses.length-1;
              return (
                <div key={addr.id}>
                  <div onClick={()=>setExpanded(isOpen?null:addr.id)}
                    style={{ padding:"12px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                      borderBottom:(!last||isOpen)?`1px solid ${T.gray100}`:"none",
                      background:isOpen?T.bluePale:T.white, transition:"background 0.12s" }}
                    onMouseEnter={e=>!isOpen&&(e.currentTarget.style.background=T.gray50)}
                    onMouseLeave={e=>!isOpen&&(e.currentTarget.style.background=T.white)}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:T.blueLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.blue, flexShrink:0 }}>
                      {idx+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:T.gray900 }}>{addr.address}</div>
                      <div style={{ fontSize:12, color:T.gray600 }}>{addr.area} · {addr.residents} beboer{addr.residents !== 1 ? "e" : ""}</div>
                    </div>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontSize:18, fontWeight:700, color: Math.max(...Object.values(addr.interest))>=80?T.green:T.amber }}>{Math.max(...Object.values(addr.interest))}</div>
                      <div style={{ fontSize:9, color:T.gray600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Score</div>
                    </div>
                    <Badge label={st.label} color={st.color} bg={st.bg} small/>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth={2}
                      style={{ transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  {isOpen&&(
                    <div style={{ padding:"0 18px 16px", borderBottom:!last?`1px solid ${T.gray100}`:"none" }}>
                      <AddressDetail addr={addr} managerView/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Interest panel ── */
function InterestPanel({ interest }) {
  const items = [
    { key:"sikre",     label:"Sikre",     icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { key:"mobil",     label:"Mobil",     icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={5} y={2} width={14} height={20} rx={2}/><path d="M12 18h.01"/></svg> },
    { key:"internett", label:"Internett", icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
    { key:"produktX",  label:"Produkt X", icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  ];

  const scoreColor = s => s >= 80 ? T.green : s >= 60 ? T.amber : T.red;
  const scoreBg    = s => s >= 80 ? T.greenLight : s >= 60 ? T.amberLight : T.redLight;
  const scoreLabel = s => s >= 80 ? "Høy" : s >= 60 ? "Middels" : "Lav";

  return (
    <div style={{ background:T.gray50, border:`1px solid ${T.gray200}`, borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
      <div style={{ fontSize:10, color:T.gray600, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
        Interessescore
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {items.map(({ key, label, icon }) => {
          const score = interest[key];
          const c = scoreColor(score);
          const pct = score + "%";
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, width:88, flexShrink:0 }}>
                <span style={{ color:T.gray600 }}>{icon}</span>
                <span style={{ fontSize:12, fontWeight:500, color:T.gray800 }}>{label}</span>
              </div>
              <div style={{ flex:1, background:T.gray200, borderRadius:4, height:6, overflow:"hidden" }}>
                <div style={{ width:pct, height:"100%", background:c, borderRadius:4, transition:"width 0.4s" }}/>
              </div>
              <div style={{ width:52, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:5, flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:700, color:c }}>{score}</span>
                <span style={{ fontSize:10, fontWeight:600, color:c, background:scoreBg(score), padding:"1px 6px", borderRadius:20 }}>{scoreLabel(score)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Tabbed campaign cards ── */
function CampaignTabs({ addr, onOutcome, managerView }) {
  const [active, setActive] = useState(0);
  const camp = addr.campaigns[active];

  return (
    <div style={{ marginBottom: managerView ? 0 : 16 }}>
      <div style={{ fontSize:10, color:T.gray600, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
        Kampanjer ({addr.campaigns.length})
      </div>

      {/* Tab strip */}
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {addr.campaigns.map((c, i) => (
          <button key={i} onClick={()=>setActive(i)} style={{
            flex:1, padding:"6px 4px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:T.font,
            fontSize:11, fontWeight:600,
            background: active===i ? camp.color : T.gray100,
            color: active===i ? "#fff" : T.gray600,
            transition:"all 0.15s",
          }}>
            {c.tag}
          </button>
        ))}
      </div>

      {/* Active campaign card */}
      <div style={{ background:T.blueLight, border:`1.5px solid ${camp.color}50`, borderRadius:10, padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.blueDeep }}>{camp.name}</div>
          <Badge label={camp.tag} color={camp.color} bg={T.white} small/>
        </div>

        {/* Product highlight */}
        <div style={{ background:T.white, borderRadius:8, padding:"10px 12px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${camp.color}25` }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.gray900 }}>{camp.product}</div>
            <div style={{ fontSize:13, color:camp.color, fontWeight:600, marginTop:2 }}>{camp.price}</div>
          </div>
          {camp.discount !== "—" && (
            <div style={{ background:camp.color, color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, fontWeight:700, flexShrink:0 }}>
              -{camp.discount}
            </div>
          )}
        </div>

        <div style={{ fontSize:12, color:T.gray700, lineHeight:1.6, marginBottom: (!managerView)?12:0 }}>{camp.pitch}</div>

        {!managerView && (
          <CampaignActions addr={addr} camp={camp} onOutcome={onOutcome} />
        )}
      </div>

      {/* Other outcome buttons — seller only */}
      {!managerView && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
          <Btn onClick={()=>onOutcome("no_answer")} variant="amber" style={{ justifyContent:"flex-start", fontSize:13, width:"100%" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 6v6l4 2"/></svg>
            Ikke hjemme
          </Btn>
          <Btn onClick={()=>onOutcome("followup")} variant="secondary" style={{ justifyContent:"flex-start", fontSize:13, width:"100%" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={3} y={4} width={18} height={18} rx={2}/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Avtal oppfølging
          </Btn>
          <Btn onClick={()=>onOutcome("marketing")} variant="ghost" style={{ justifyContent:"flex-start", fontSize:12, width:"100%", gridColumn:"1 / -1", color:T.purple, borderColor:`${T.purple}50` }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Legg i oppfølgingskampanje
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ── Campaign actions: outcome + extra products ── */
function CampaignActions({ addr, camp, onOutcome }) {
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraSel, setExtraSel]   = useState([]);
  const toggleExtra = p => setExtraSel(s => s.includes(p) ? s.filter(x=>x!==p) : [...s,p]);

  const handleSold = () => {
    onOutcome("sold");
  };

  return (
    <div style={{ borderTop:`1px solid ${T.blue}25`, paddingTop:12 }}>

      {/* Registrer utfall på kampanje */}
      <div style={{ fontSize:10, color:T.blueDeep, marginBottom:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
        Registrer utfall på kampanje
      </div>

      <div style={{ display:"flex", gap:8, marginBottom: extraOpen?12:0 }}>
        {/* Solgt kampanje */}
        <button onClick={handleSold} style={{
          flex:1, background:T.green, border:"none", borderRadius:7, padding:"10px 8px",
          cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:T.font,
          display:"flex", alignItems:"center", justifyContent:"center", gap:5,
        }}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
          Solgt kampanje
        </button>

        {/* Ikke interessert */}
        <button onClick={()=>onOutcome("rejected")} style={{
          flex:1, background:T.redLight, border:`1px solid ${T.red}40`, borderRadius:7, padding:"10px 8px",
          cursor:"pointer", color:T.red, fontSize:13, fontWeight:600, fontFamily:T.font,
          display:"flex", alignItems:"center", justifyContent:"center", gap:5,
        }}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          Ikke interessert
        </button>
      </div>

      {/* Velg flere produkter toggle */}
      <button onClick={()=>setExtraOpen(o=>!o)} style={{
        width:"100%", marginTop:8, background:"transparent",
        border:`1.5px dashed ${T.blue}60`, borderRadius:7, padding:"8px 12px",
        cursor:"pointer", color:T.blue, fontSize:12, fontWeight:600, fontFamily:T.font,
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        transition:"background 0.15s",
      }}
        onMouseEnter={e=>e.currentTarget.style.background=T.blueLight}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          {extraOpen
            ? <path d="M5 12h14"/>
            : <><path d="M12 5v14"/><path d="M5 12h14"/></>}
        </svg>
        {extraOpen ? "Skjul tilleggsprodukter" : "Velg flere produkter"}
      </button>

      {/* Extra products panel */}
      {extraOpen && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:10, color:T.gray600, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Legg til i salget
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
            {addr.upsellProducts.map(p=>(
              <button key={p} onClick={()=>toggleExtra(p)} style={{
                background: extraSel.includes(p) ? T.blueLight : T.white,
                border:`1.5px solid ${extraSel.includes(p) ? T.blue : T.gray200}`,
                borderRadius:7, padding:"9px 12px", cursor:"pointer", fontSize:13, fontWeight:500,
                color: extraSel.includes(p) ? T.blueDeep : T.gray800,
                display:"flex", alignItems:"center", justifyContent:"space-between", fontFamily:T.font,
              }}>
                {p}
                {extraSel.includes(p)
                  ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                  : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>}
              </button>
            ))}
          </div>
          {extraSel.length > 0 && (
            <button onClick={handleSold} style={{
              width:"100%", background:T.green, border:"none", borderRadius:7, padding:"11px 0",
              cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:T.font,
            }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Selg kampanje + {extraSel.length} tilleggsprodukt{extraSel.length>1?"er":""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Address detail ── */
function AddressDetail({ addr, onBack, onStatusChange, managerView }) {
  const [flow, setFlow] = useState(null);

  const handleOutcome = outcome => {
    if (outcome==="sold")     setFlow("upsell");
    else if (outcome==="rejected") setFlow("marketing");
    else if (outcome==="followup") setFlow("followup");
    else { onStatusChange&&onStatusChange(addr.id,outcome); }
  };

  if (flow==="upsell")    return <UpsellFlow    addr={addr} onDone={()=>{ onStatusChange&&onStatusChange(addr.id,"sold");      onBack&&onBack(); }}/>;
  if (flow==="marketing") return <MarketingFlow addr={addr} onDone={()=>{ onStatusChange&&onStatusChange(addr.id,"marketing"); onBack&&onBack(); }}/>;
  if (flow==="followup")  return <FollowupFlow  addr={addr} onDone={()=>{ onStatusChange&&onStatusChange(addr.id,"followup");  onBack&&onBack(); }}/>;

  return (
    <div style={{ padding: managerView?"16px 0 0":"20px", fontFamily:T.font }}>
      {!managerView&&(
        <button onClick={onBack} style={{ background:"none", border:"none", color:T.blue, fontSize:13, cursor:"pointer", padding:0, marginBottom:14, display:"flex", alignItems:"center", gap:5, fontWeight:600, fontFamily:T.font }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Tilbake til liste
        </button>
      )}

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:700, color:T.gray900 }}>{addr.address}</div>
          <div style={{ fontSize:12, color:T.gray600, marginTop:2 }}>{addr.area} · {addr.zip} · {addr.residents} beboer{addr.residents!==1?"e":""}</div>
        </div>
      </div>

      {/* Interest panel */}
      <InterestPanel interest={addr.interest} />

      {addr.activeProducts.length>0&&(
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.gray600, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>Aktive produkter</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {addr.activeProducts.map(p=><Badge key={p} label={p} color={T.blue} bg={T.blueLight} small/>)}
          </div>
        </div>
      )}

      {addr.previousProducts.length>0&&(
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.gray600, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>Tidligere produkter</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {addr.previousProducts.map(p=><Badge key={p} label={p} color={T.gray600} bg={T.gray100} small/>)}
          </div>
          {addr.cancelReason&&(
            <div style={{ fontSize:11, color:T.red, marginTop:5, display:"flex", alignItems:"center", gap:4 }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 8v4M12 16h.01"/></svg>
              Avslutningsgrunn: {addr.cancelReason}
            </div>
          )}
        </div>
      )}

      {/* Tabbed campaigns */}
      <CampaignTabs addr={addr} onOutcome={handleOutcome} managerView={managerView} />
    </div>
  );
}

/* ── Upsell flow ── */
function UpsellFlow({ addr, onDone }) {
  const [sel, setSel] = useState([]);
  const toggle = p => setSel(s=>s.includes(p)?s.filter(x=>x!==p):[...s,p]);
  return (
    <div style={{ padding:20, fontFamily:T.font }}>
      <div style={{ background:T.greenLight, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:12, border:`1px solid ${T.green}30` }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:T.green, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:T.green }}>Salg registrert!</div>
          <div style={{ fontSize:12, color:T.gray700 }}>{addr.address}</div>
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:T.gray900, marginBottom:4 }}>Legg til mer?</div>
      <div style={{ fontSize:12, color:T.gray600, marginBottom:16 }}>Kunden kan oppgradere eller legge til produkter nå.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {addr.upsellProducts.map(p=>(
          <button key={p} onClick={()=>toggle(p)} style={{
            background:sel.includes(p)?T.blueLight:T.white,
            border:`1.5px solid ${sel.includes(p)?T.blue:T.gray200}`,
            borderRadius:8, padding:"11px 14px", cursor:"pointer", fontSize:13, fontWeight:500,
            color:sel.includes(p)?T.blueDeep:T.gray800, textAlign:"left",
            display:"flex", alignItems:"center", justifyContent:"space-between", fontFamily:T.font,
          }}>
            {p}
            {sel.includes(p)&&<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
          </button>
        ))}
      </div>
      <Btn onClick={onDone} variant="primary" full>
        {sel.length>0?`Fullfør med ${sel.length} tilleggsprodukter`:"Fullfør uten upsell"}
      </Btn>
    </div>
  );
}

/* ── Marketing flow ── */
function MarketingFlow({ addr, onDone }) {
  const [ch, setCh] = useState("email");
  return (
    <div style={{ padding:20, fontFamily:T.font }}>
      <div style={{ background:T.purpleLight, borderRadius:10, padding:"12px 16px", marginBottom:20, border:`1px solid ${T.purple}30` }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.purple, marginBottom:4 }}>Ikke interessert — legg i marketing-flyt</div>
        <div style={{ fontSize:12, color:T.gray700 }}>{addr.address} enrolles i en nurture-kampanje.</div>
      </div>
      <div style={{ fontSize:10, color:T.gray600, marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>Velg kanal</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["email","E-post"],["sms","SMS"],["post","Post"]].map(([c,label])=>(
          <button key={c} onClick={()=>setCh(c)} style={{
            flex:1, background:ch===c?T.purpleLight:T.white,
            border:`1.5px solid ${ch===c?T.purple:T.gray200}`,
            borderRadius:8, padding:"10px 0", cursor:"pointer", fontSize:13, fontWeight:600,
            color:ch===c?T.purple:T.gray700, fontFamily:T.font,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ background:T.gray50, borderRadius:8, padding:"12px 14px", marginBottom:20, fontSize:12, color:T.gray700, lineHeight:1.7, border:`1px solid ${T.gray200}` }}>
        Kunden vil motta <strong>{addr.campaign.name}</strong>-materiale via {ch==="email"?"e-post":ch==="sms"?"SMS":"post"} innen 3 virkedager.
      </div>
      <Btn onClick={onDone} variant="purple" full>Enroll i marketing-flyt</Btn>
    </div>
  );
}

/* ── Followup flow ── */
function FollowupFlow({ addr, onDone }) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const inp = { width:"100%", border:`1px solid ${T.gray200}`, borderRadius:8, padding:"10px 12px", fontSize:13, color:T.gray900, background:T.white, outline:"none", fontFamily:T.font, boxSizing:"border-box" };
  return (
    <div style={{ padding:20, fontFamily:T.font }}>
      <div style={{ background:T.blueLight, borderRadius:10, padding:"12px 16px", marginBottom:20, border:`1px solid ${T.blue}30` }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.blueDeep, marginBottom:4 }}>Avtal oppfølging</div>
        <div style={{ fontSize:12, color:T.gray700 }}>{addr.address}</div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:10, color:T.gray600, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Dato og tid</label>
        <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ fontSize:10, color:T.gray600, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Notat</label>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="F.eks. kunden ønsker å snakke med samboer først..." style={{ ...inp, resize:"none" }}/>
      </div>
      <Btn onClick={onDone} variant="primary" full>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        Lagre og synk til Salesforce
      </Btn>
    </div>
  );
}

/* ── Seller app ── */
function SellerApp({ onBack }) {
  const [addrs, setAddrs] = useState(mockAddresses);
  const [view, setView]   = useState("list");
  const [sel, setSel]     = useState(null);

  const stats = {
    visited: addrs.filter(a=>a.status!=="unvisited").length,
    sold:    addrs.filter(a=>a.status==="sold").length,
    total:   addrs.length,
  };

  const handleStatusChange = (id, status) => {
    setAddrs(prev=>prev.map(a=>a.id===id?{...a,status}:a));
    setView("list"); setSel(null);
  };

  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-start", minHeight:"100vh", background:`linear-gradient(160deg, ${T.blueDeep} 0%, #003D6B 100%)`, padding:"28px 16px", fontFamily:T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Phone shell */}
      <div style={{ width:390, background:T.white, borderRadius:32, overflow:"hidden", border:`2px solid rgba(255,255,255,0.15)`, boxShadow:"0 24px 64px rgba(0,0,0,0.35)", minHeight:700 }}>

        {/* Header */}
        <div style={{ background:T.blueDeep, padding:"18px 20px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Logo white size={20}/>
              <span style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Feltsalg</span>
            </div>
            <button onClick={onBack} style={{ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.22)", borderRadius:20, color:"rgba(255,255,255,0.85)", padding:"4px 12px", cursor:"pointer", fontSize:11, fontFamily:T.font }}>
              Bytt rolle
            </button>
          </div>
          {/* Progress */}
          <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:4, height:5, marginBottom:12, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(stats.visited/stats.total)*100}%`, background:T.blue, borderRadius:4, transition:"width 0.4s" }}/>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:"Besøkt", value:`${stats.visited}/${stats.total}` },
              { label:"Solgt",  value:stats.sold },
              { label:"Konv.",  value:stats.visited>0?`${Math.round((stats.sold/stats.visited)*100)}%`:"–" },
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:8, padding:"7px 0", flex:1, textAlign:"center" }}>
                <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{s.value}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content scroll area */}
        <div style={{ maxHeight:600, overflowY:"auto" }}>
          {view==="list" ? (
            addrs.map((addr,idx)=>{
              const st=statusConfig[addr.status];
              return (
                <div key={addr.id}
                  onClick={()=>{ setSel(addr.id); setView("detail"); }}
                  style={{ padding:"13px 18px", borderBottom:`1px solid ${T.gray100}`, cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bluePale}
                  onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:T.blueLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.blue, flexShrink:0 }}>
                    {idx+1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.gray900, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{addr.address}</div>
                    <div style={{ fontSize:11, color:T.gray600, marginTop:1 }}>{addr.area} · {addr.residents} beboer{addr.residents !== 1 ? "e" : ""}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                    <Badge label={st.label} color={st.color} bg={st.bg} small/>
                    <Badge label={`${addr.campaigns.length} kampanjer`} color={T.blue} bg={T.blueLight} small/>
                  </div>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.gray400} strokeWidth={2} style={{ flexShrink:0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              );
            })
          ) : (
            <AddressDetail
              addr={addrs.find(a=>a.id===sel)}
              onBack={()=>setView("list")}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Root ── */
export default function App() {
  const [role, setRole] = useState(null);
  if (!role)              return <RoleSelect onSelect={setRole}/>;
  if (role==="manager")   return <ManagerApp onBack={()=>setRole(null)}/>;
  return <SellerApp onBack={()=>setRole(null)}/>;
}
