import { useState } from "react";

const T = {
  cyan:    "#01acfb",
  cyanDark:"#0090d4",
  navy:    "#00205b",
  white:   "#ffffff",
  offWhite:"#f5f7fa",
  gray100: "#f0f2f5",
  gray200: "#dde2ea",
  gray400: "#9aa3b0",
  gray700: "#3d4754",
  text:    "#1a2332",
  green:   "#00b259",
  orange:  "#ff8200",
  red:     "#e02020",
};

function TelenorLogo({ size = 32, white = false }) {
  const fill = white ? "#ffffff" : T.cyan;
  return (
    <svg width={size} height={size * 0.92} viewBox="0 0 139.82 128.73">
      <path fill={fill} d="M70.67,39.37c2,.31,2.4-.1,2.67-2a45.17,45.17,0,0,1,3.89-12.75C79.85,19.24,84,13.33,89.85,9.36a62.78,62.78,0,0,1,19.2-8.26,46.83,46.83,0,0,1,14-.93c8.42.76,13.08,3.16,15.42,6.27A6.75,6.75,0,0,1,139.81,10c.07,1.55-.6,3.56-2.83,5.54s-6.77,4.33-13.06,6.44c-6.52,2.17-15.44,4.47-24.33,6.51a137.22,137.22,0,0,0-15.22,4.37c-5.88,2-7.65,7.85-4,9.64A54.92,54.92,0,0,1,91.82,50,101.32,101.32,0,0,1,107.08,65c5.53,6.76,14.59,19.66,17.84,32.18,3.61,13.75,1.36,26.78-6.42,30.42-7.63,3.58-17.79-1.58-24.93-9-6.78-7-11.52-15.29-16-28-3.86-11-5.42-26.87-5.42-35.19,0-2.77,0-3.36.07-5.86.26-2.18-5.62-4-11.94.08-7.19,4.63-14.23,13-18.39,17.88-1.81,2.13-4.27,5.25-6.86,8.52-3.43,4.3-7.21,8.78-10.66,11.28C19.2,91,10.87,92.6,5,88.44c-3.25-2.32-5-6.7-5-11.16a16.91,16.91,0,0,1,2.3-8.77c2-3.43,5.17-7.12,10.28-11.34A90.51,90.51,0,0,1,34.73,44.54c12.88-5.19,26.75-6.82,35.94-5.17Z"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "oversikt",      label: "Oversikt",         icon: "▦" },
  { id: "avtale",        label: "Avtale",            icon: "📋" },
  { id: "dekodere",      label: "Dekodere",          icon: "📺" },
  { id: "feilsok",       label: "Smart feilsøk",     icon: "🔧" },
  { id: "kommunikasjon", label: "Kommunikasjon",     icon: "💬" },
  { id: "arbeid",        label: "Planlagt arbeid",   icon: "🏗️" },
  { id: "refusjon",      label: "Bredbåndsrefusjon", icon: "💰" },
];

const DECODERS = [
  { id:"BX-001", leil:"Leil. 101", status:"ok",       mod:"Kaon 1200", sist:"i dag 09:14" },
  { id:"BX-002", leil:"Leil. 102", status:"ok",       mod:"Kaon 1200", sist:"i dag 08:52" },
  { id:"BX-003", leil:"Leil. 201", status:"feil",     mod:"Kaon 950",  sist:"3 dager siden" },
  { id:"BX-004", leil:"Leil. 202", status:"ok",       mod:"Kaon 1200", sist:"i dag 07:33" },
  { id:"BX-005", leil:"Leil. 301", status:"advarsel", mod:"Kaon 1200", sist:"2 timer siden" },
  { id:"BX-006", leil:"Leil. 302", status:"ok",       mod:"Kaon 950",  sist:"i dag 10:01" },
];

const MESSAGES = [
  { fra:"Telenor",            dato:"21. april 2026", emne:"Planlagt vedlikehold 28. april",   lest:false },
  { fra:"Telenor",            dato:"10. april 2026", emne:"Ny TV-pakke tilgjengelig fra mai", lest:true  },
  { fra:"Beboer – Leil. 201", dato:"19. april 2026", emne:"TV fungerer ikke",                lest:false },
];

const PLANNED = [
  { dato:"28. april 2026", type:"Vedlikehold", desc:"Oppgradering av sentralutstyr – ca. 2 timers nedetid", status:"varslet" },
  { dato:"15. mai 2026",   type:"Montering",   desc:"Installasjon av ekstra stikk i Leil. 103",             status:"planlagt" },
];

const TROUBLE = [
  { q:"Har du startet om dekoderen?",         hint:"Hold inne strømknappen i 10 sekunder." },
  { q:"Er alle kabler ordentlig tilkoblet?",  hint:"Sjekk HDMI og strømkabel bak dekoderen." },
  { q:"Vises feilkode på skjermen?",          hint:"Noter koden og kontakt Telenor Support." },
  { q:"Gjelder feilen kun én leilighet?",     hint:"Prøv å bytte dekoder midlertidig." },
];

function Badge({ status }) {
  const map = {
    ok:       { bg:"#e6f9f0", c:T.green,  label:"OK" },
    feil:     { bg:"#fdecea", c:T.red,    label:"Feil" },
    advarsel: { bg:"#fff3e0", c:T.orange, label:"Advarsel" },
    varslet:  { bg:"#e6f4ff", c:T.cyan,   label:"Varslet" },
    planlagt: { bg:T.gray100, c:T.gray400,label:"Planlagt" },
  };
  const s = map[status] || map.ok;
  return (
    <span style={{ background:s.bg, color:s.c, padding:"3px 11px", borderRadius:20,
      fontSize:12, fontWeight:700, letterSpacing:.4, whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

function Card({ title, children, topColor }) {
  return (
    <div style={{ background:T.white, borderRadius:10, overflow:"hidden",
      boxShadow:"0 1px 6px rgba(0,32,91,.08)", marginBottom:18 }}>
      {topColor && <div style={{ height:4, background:topColor }} />}
      <div style={{ padding:"22px 26px" }}>
        {title && <h3 style={{ margin:"0 0 16px", color:T.navy, fontSize:15, fontWeight:700,
          borderBottom:`1px solid ${T.gray200}`, paddingBottom:11 }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return (
    <div style={{ background:T.white, borderRadius:10, padding:"18px 20px", flex:1, minWidth:120,
      boxShadow:"0 1px 6px rgba(0,32,91,.08)", borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:T.gray400, marginTop:4 }}>{label}</div>
    </div>
  );
}

function Btn({ children, variant="primary", onClick, style:s={} }) {
  const base = { border:"none", borderRadius:6, padding:"10px 20px", fontSize:14,
    fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"opacity .15s", ...s };
  const v = {
    primary:   { background:T.cyan,    color:T.white },
    secondary: { background:T.navy,    color:T.white },
    ghost:     { background:T.gray100, color:T.gray700, border:`1px solid ${T.gray200}` },
    danger:    { background:T.red,     color:T.white },
  };
  return (
    <button style={{ ...base, ...v[variant] }} onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.opacity=".82"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      {children}
    </button>
  );
}

function PageOversikt({ setActive }) {
  const ok=DECODERS.filter(d=>d.status==="ok").length;
  const feil=DECODERS.filter(d=>d.status==="feil").length;
  const adv=DECODERS.filter(d=>d.status==="advarsel").length;
  const ulest=MESSAGES.filter(m=>!m.lest).length;
  return (
    <>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
        <Stat label="Aktive dekodere"  value={ok}    color={T.green}  icon="📺" />
        <Stat label="Feil registrert"  value={feil}  color={T.red}    icon="⚠️" />
        <Stat label="Advarsler"        value={adv}   color={T.orange} icon="🔔" />
        <Stat label="Uleste meldinger" value={ulest} color={T.cyan}   icon="💬" />
      </div>
      <Card title="Driftsstatus i ditt område" topColor={T.green}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:42, height:42, borderRadius:"50%", background:"#e6f9f0",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✅</div>
          <div>
            <div style={{ fontWeight:700, color:T.green }}>Ingen kjente feil i ditt område</div>
            <div style={{ fontSize:13, color:T.gray400, marginTop:2 }}>Sist sjekket: i dag kl. 10:15 via Sjekk mitt Telenor</div>
          </div>
        </div>
      </Card>
      <Card title="Kommende planlagt arbeid" topColor={T.orange}>
        {PLANNED.map((p,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"11px 0", borderBottom:i<PLANNED.length-1?`1px solid ${T.gray200}`:"none" }}>
            <div>
              <div style={{ fontWeight:600, color:T.text }}>{p.desc}</div>
              <div style={{ fontSize:13, color:T.gray400, marginTop:2 }}>{p.dato} · {p.type}</div>
            </div>
            <Badge status={p.status} />
          </div>
        ))}
      </Card>
      <Card title="Siste meldinger" topColor={T.cyan}>
        {MESSAGES.slice(0,2).map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"11px 0", borderBottom:i<1?`1px solid ${T.gray200}`:"none" }}>
            <div>
              <div style={{ fontWeight:m.lest?400:700, color:T.text }}>{m.emne}</div>
              <div style={{ fontSize:13, color:T.gray400 }}>{m.fra} · {m.dato}</div>
            </div>
            {!m.lest && <span style={{ background:T.cyan, color:"#fff", borderRadius:20,
              fontSize:11, padding:"2px 9px", fontWeight:700, flexShrink:0 }}>Ny</span>}
          </div>
        ))}
        <button onClick={()=>setActive("kommunikasjon")}
          style={{ marginTop:12, background:"none", border:"none", color:T.cyan,
            cursor:"pointer", fontSize:13, fontWeight:700, padding:0, fontFamily:"inherit" }}>
          Se alle meldinger →
        </button>
      </Card>
    </>
  );
}

function PageAvtale() {
  return (
    <>
      <Card title="Din Telenor MDU-avtale" topColor={T.cyan}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["Borettslag","Granly Borettslag"],["Avtalenummer","MDU-2024-00382"],
            ["Avtaletype","MDU TV + Bredbånd"],["Gyldig til","31. desember 2027"],
            ["Antall enheter","24 leiligheter"],["Fakturamottaker","Granly Borettslag v/ styret"],
          ].map(([k,v]) => (
            <div key={k} style={{ background:T.gray100, borderRadius:8, padding:"12px 15px" }}>
              <div style={{ fontSize:11, color:T.gray400, marginBottom:2, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{k}</div>
              <div style={{ fontWeight:700, color:T.text }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Din kontaktperson hos Telenor" topColor={T.navy}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:T.gray100,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>👤</div>
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:T.navy }}>Kari Nordmann</div>
            <div style={{ color:T.gray400, fontSize:13 }}>MDU Kundeansvarlig – Telenor Norge</div>
            <div style={{ marginTop:8, display:"flex", gap:14 }}>
              <a href="tel:+4722222222" style={{ color:T.cyan, fontSize:13, fontWeight:700, textDecoration:"none" }}>📞 22 22 22 22</a>
              <a href="mailto:kari.nordmann@telenor.com" style={{ color:T.cyan, fontSize:13, fontWeight:700, textDecoration:"none" }}>✉️ Send e-post</a>
            </div>
          </div>
        </div>
      </Card>
      <Card title="Pakkeinnhold">
        {[["TV-pakke","Telenor TV Start + Sport","📺"],["Kanaler inkludert","80+ kanaler","📡"],
          ["Bredbånd","200/200 Mbit symmetrisk","🌐"],["Montering","Inkludert – tekniker","🔧"],
          ["Support","Prioritert MDU-support","⭐"],
        ].map(([k,v,ico]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"10px 13px", background:T.gray100, borderRadius:7, marginBottom:7 }}>
            <span style={{ color:T.gray700, fontSize:14 }}>{ico} {k}</span>
            <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>✅ {v}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

function PageDekodere({ setActive }) {
  const ok=DECODERS.filter(d=>d.status==="ok").length;
  const feil=DECODERS.filter(d=>d.status==="feil").length;
  const adv=DECODERS.filter(d=>d.status==="advarsel").length;

  const [speedTest, setSpeedTest] = useState(null); // null | "running" | "done"
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  function startSpeedTest() {
    setSpeedTest("running");
    setProgress(0);
    setResults([]);
    const routers = DECODERS.map(d => ({ id:d.id, leil:d.leil }));
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      const pct = Math.round((idx / routers.length) * 100);
      setProgress(pct);
      setResults(prev => [...prev, {
        id: routers[idx-1].id,
        leil: routers[idx-1].leil,
        down: (180 + Math.random()*40).toFixed(1),
        up:   (180 + Math.random()*40).toFixed(1),
        ping: (4 + Math.random()*8).toFixed(0),
      }]);
      if (idx >= routers.length) {
        clearInterval(interval);
        setSpeedTest("done");
      }
    }, 600);
  }

  return (
    <>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
        <Stat label="Fungerer" value={ok}   color={T.green}  icon="✅" />
        <Stat label="Feil"     value={feil} color={T.red}    icon="❌" />
        <Stat label="Advarsel" value={adv}  color={T.orange} icon="⚠️" />
      </div>
      <Card title="Alle dekodere i borettslaget">
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:T.gray100 }}>
                {["ID","Leilighet","Modell","Sist aktiv","Status",""].map(h => (
                  <th key={h} style={{ padding:"9px 13px", textAlign:"left", fontSize:11,
                    color:T.gray400, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DECODERS.map((d,i) => (
                <tr key={d.id} style={{ borderBottom:`1px solid ${T.gray200}`,
                  background:i%2===0?T.white:T.offWhite }}>
                  <td style={{ padding:"11px 13px", fontSize:12, fontFamily:"monospace", color:T.gray400 }}>{d.id}</td>
                  <td style={{ padding:"11px 13px", fontWeight:600, color:T.text }}>{d.leil}</td>
                  <td style={{ padding:"11px 13px", fontSize:13, color:T.gray700 }}>{d.mod}</td>
                  <td style={{ padding:"11px 13px", fontSize:13, color:T.gray400 }}>{d.sist}</td>
                  <td style={{ padding:"11px 13px" }}><Badge status={d.status} /></td>
                  <td style={{ padding:"11px 13px" }}>
                    {d.status!=="ok" && (
                      <Btn variant="primary" onClick={()=>setActive("feilsok")}
                        style={{ padding:"5px 12px", fontSize:12 }}>Feilsøk</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Bredbåndshastighet" topColor={T.cyan}>
        <p style={{ fontSize:14, color:T.gray400, marginTop:0 }}>
          Kjør en automatisk hastighetstest på alle rutere i borettslaget og se resultatene samlet.
        </p>

        {speedTest === null && (
          <Btn onClick={startSpeedTest}>
            ⚡ Test bredbåndshastighet på alle rutere
          </Btn>
        )}

        {speedTest === "running" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.navy }}>Tester... {progress}%</span>
              <span style={{ fontSize:13, color:T.gray400 }}>{results.length} / {DECODERS.length} rutere</span>
            </div>
            <div style={{ background:T.gray200, borderRadius:99, height:8, overflow:"hidden", marginBottom:18 }}>
              <div style={{ height:"100%", width:`${progress}%`, background:T.cyan,
                borderRadius:99, transition:"width .5s ease" }} />
            </div>
            {results.length > 0 && (
              <SpeedTable results={results} running />
            )}
          </div>
        )}

        {speedTest === "done" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
              background:"#e6f9f0", borderRadius:8, padding:"10px 14px" }}>
              <span style={{ fontSize:18 }}>✅</span>
              <span style={{ fontWeight:700, color:T.green, fontSize:14 }}>
                Test fullført – alle {DECODERS.length} rutere testet
              </span>
            </div>
            <SpeedTable results={results} />
            <div style={{ marginTop:14 }}>
              <Btn variant="ghost" onClick={()=>{ setSpeedTest(null); setResults([]); setProgress(0); }}>
                Kjør ny test
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function SpeedTable({ results, running }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:T.gray100 }}>
            {["Leilighet","Ned ↓","Opp ↑","Ping",""].map(h => (
              <th key={h} style={{ padding:"8px 13px", textAlign:"left", fontSize:11,
                color:T.gray400, fontWeight:700, textTransform:"uppercase", letterSpacing:.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r,i) => {
            const downOk = parseFloat(r.down) >= 150;
            const upOk   = parseFloat(r.up)   >= 150;
            return (
              <tr key={r.id} style={{ borderBottom:`1px solid ${T.gray200}`,
                background:i%2===0?T.white:T.offWhite }}>
                <td style={{ padding:"10px 13px", fontWeight:600, color:T.text }}>{r.leil}</td>
                <td style={{ padding:"10px 13px", fontWeight:700,
                  color: downOk ? T.green : T.orange }}>{r.down} Mbit/s</td>
                <td style={{ padding:"10px 13px", fontWeight:700,
                  color: upOk ? T.green : T.orange }}>{r.up} Mbit/s</td>
                <td style={{ padding:"10px 13px", color:T.gray700 }}>{r.ping} ms</td>
                <td style={{ padding:"10px 13px" }}>
                  <Badge status={downOk && upOk ? "ok" : "advarsel"} />
                </td>
              </tr>
            );
          })}
          {running && (
            <tr>
              <td colSpan={5} style={{ padding:"10px 13px", color:T.gray400, fontSize:13,
                fontStyle:"italic" }}>Tester neste ruter…</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PageFeilsok({ setActive }) {
  const [step, setStep] = useState(0);
  const done = step >= TROUBLE.length - 1;
  return (
    <>
      <Card title="Smart feilsøk – steg for steg" topColor={T.cyan}>
        <p style={{ color:T.gray400, fontSize:14, marginTop:0 }}>
          Følg stegene for å isolere og løse problemet raskt.
        </p>
        {TROUBLE.map((s,i) => (
          <div key={i} style={{ padding:"15px 17px", borderRadius:9, marginBottom:9,
            background: i<step?"#e6f9f0": i===step?"#e6f4ff": T.gray100,
            border: i===step?`2px solid ${T.cyan}`:"2px solid transparent",
            opacity:i>step?.5:1, transition:"all .18s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                background: i<step?T.green: i===step?T.cyan: T.gray200,
                color:"#fff", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:12, fontWeight:800 }}>
                {i<step?"✓":i+1}
              </div>
              <div>
                <div style={{ fontWeight:700, color:T.text }}>{s.q}</div>
                {i===step && <div style={{ fontSize:13, color:T.gray400, marginTop:3 }}>{s.hint}</div>}
              </div>
            </div>
            {i===step && (
              <div style={{ display:"flex", gap:10, marginTop:13 }}>
                <Btn onClick={()=>setStep(Math.min(i+1,TROUBLE.length-1))}>Ja, gjort ✓</Btn>
                <Btn variant="ghost" onClick={()=>setStep(0)}>Start på nytt</Btn>
              </div>
            )}
          </div>
        ))}
        {done && (
          <div style={{ background:"#fff3e0", border:`1px solid ${T.orange}`,
            borderRadius:9, padding:16, marginTop:8 }}>
            <strong style={{ color:T.orange }}>Problem ikke løst?</strong>
            <div style={{ fontSize:13, color:T.gray700, margin:"6px 0 12px" }}>
              Kontakt Telenor MDU-support direkte for videre hjelp.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="secondary">📞 Ring MDU-support</Btn>
              <Btn variant="ghost" onClick={()=>setActive("kommunikasjon")}>💬 Send melding</Btn>
            </div>
          </div>
        )}
      </Card>
      <Card title="Driftsstatus i ditt område" topColor={T.green}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>✅</span>
          <div>
            <div style={{ fontWeight:700, color:T.green }}>Ingen aktive driftsfeil i ditt område</div>
            <div style={{ fontSize:13, color:T.gray400, marginTop:2 }}>Hentet fra Sjekk mitt Telenor · 22. april 2026 kl. 10:15</div>
          </div>
        </div>
        <a href="https://sjekkmitt.telenor.no" target="_blank" rel="noreferrer"
          style={{ display:"inline-block", marginTop:10, color:T.cyan, fontSize:13, fontWeight:700, textDecoration:"none" }}>
          Åpne Sjekk mitt Telenor →
        </a>
      </Card>
      <Card title="Eskalere feil til Telenor" topColor={T.red}>
        <p style={{ fontSize:14, color:T.gray400, marginTop:0 }}>
          Feilsøket løste ikke problemet? Meld saken direkte til din MDU-kontakt.
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Btn variant="danger">🚨 Eskalere til Telenor</Btn>
          <Btn variant="ghost" onClick={()=>setActive("kommunikasjon")}>💬 Varsle beboere</Btn>
        </div>
      </Card>
    </>
  );
}

function PageKommunikasjon() {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <>
      <Card title="Innboks" topColor={T.cyan}>
        {MESSAGES.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 15px", borderRadius:8, marginBottom:7,
            background:m.lest?T.gray100:"#e6f4ff",
            border:m.lest?`1px solid ${T.gray200}`:`1px solid ${T.cyan}` }}>
            <div>
              <div style={{ fontWeight:m.lest?500:700, fontSize:14, color:T.text }}>{m.emne}</div>
              <div style={{ fontSize:12, color:T.gray400, marginTop:2 }}>{m.fra} · {m.dato}</div>
            </div>
            {!m.lest && <span style={{ background:T.cyan, color:"#fff", borderRadius:20,
              fontSize:11, padding:"2px 9px", fontWeight:700, flexShrink:0 }}>Ny</span>}
          </div>
        ))}
      </Card>
      <Card title="Send melding til alle beboere" topColor={T.green}>
        {sent ? (
          <div style={{ textAlign:"center", padding:"26px 0" }}>
            <div style={{ fontSize:44 }}>✅</div>
            <div style={{ fontWeight:800, color:T.green, marginTop:10, fontSize:15 }}>
              Melding sendt til alle beboere!
            </div>
            <Btn variant="ghost" onClick={()=>{setSent(false);setMsg("");}} style={{ marginTop:14 }}>
              Send ny melding
            </Btn>
          </div>
        ) : (
          <>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)}
              placeholder="Skriv en melding til beboerne – f.eks. om planlagt arbeid, driftsstatus eller annen informasjon…"
              style={{ width:"100%", minHeight:100, border:`1.5px solid ${T.gray200}`, borderRadius:7,
                padding:"11px 13px", fontSize:14, fontFamily:"inherit", resize:"vertical",
                boxSizing:"border-box", outline:"none", color:T.text }} />
            <div style={{ marginTop:11 }}>
              <Btn onClick={()=>msg.trim()&&setSent(true)} style={{ opacity:msg.trim()?1:.45 }}>
                📨 Send til alle beboere
              </Btn>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function PageArbeid() {
  return (
    <>
      <Card title="Oversikt over planlagt arbeid" topColor={T.orange}>
        {PLANNED.map((p,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            padding:"12px 0", borderBottom:i<PLANNED.length-1?`1px solid ${T.gray200}`:"none" }}>
            <div>
              <div style={{ fontWeight:700, color:T.text }}>{p.desc}</div>
              <div style={{ fontSize:13, color:T.gray400, marginTop:2 }}>{p.dato} · {p.type}</div>
            </div>
            <Badge status={p.status} />
          </div>
        ))}
      </Card>
      <Card title="Meld nytt planlagt arbeid" topColor={T.cyan}>
        <p style={{ fontSize:14, color:T.gray400, marginTop:0 }}>
          Registrer planlagt arbeid og varsle Telenor og beboerne i ett steg.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {[["Tittel / type arbeid","text","F.eks. Montering av nytt stikk"],
            ["Dato","date",""],["Estimert varighet (timer)","number","2"],
          ].map(([label,type,ph]) => (
            <div key={label}>
              <label style={{ fontSize:13, fontWeight:700, color:T.text, display:"block", marginBottom:4 }}>{label}</label>
              <input type={type} placeholder={ph} style={{ width:"100%", border:`1.5px solid ${T.gray200}`,
                borderRadius:7, padding:"9px 12px", fontSize:14, fontFamily:"inherit",
                boxSizing:"border-box", outline:"none" }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:T.text, display:"block", marginBottom:4 }}>
              Melding til beboere
            </label>
            <textarea placeholder="Vi gjennomfører planlagt vedlikehold på TV/Internett-anlegget…"
              style={{ width:"100%", border:`1.5px solid ${T.gray200}`, borderRadius:7,
                padding:"9px 12px", fontSize:14, fontFamily:"inherit", minHeight:85,
                resize:"vertical", boxSizing:"border-box", outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Btn>📅 Meld planlagt arbeid</Btn>
            <Btn variant="ghost">💬 Varsle beboere</Btn>
          </div>
        </div>
      </Card>
    </>
  );
}

function PageRefusjon() {
  const [data, setData] = useState({ borettslag:"Granly Borettslag", antall:"24", andel:"35", pris:"540" });
  const andel = parseFloat(data.andel)||0;
  const pris  = parseFloat(data.pris)||0;
  const ant   = parseInt(data.antall)||0;
  const perLeil = (pris*andel/100).toFixed(2);
  const total   = (perLeil*ant).toFixed(2);
  return (
    <>
      <Card title="Kalkulator – bredbåndsandel" topColor={T.cyan}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          {[["Borettslagets navn","borettslag","text"],["Antall leiligheter","antall","number"],
            ["Bredbåndsandel av pakke (%)","andel","number"],["Månedspris per leilighet (kr)","pris","number"],
          ].map(([label,key,type]) => (
            <div key={key}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text, display:"block", marginBottom:4,
                textTransform:"uppercase", letterSpacing:.4 }}>{label}</label>
              <input type={type} value={data[key]}
                onChange={e=>setData(p=>({...p,[key]:e.target.value}))}
                style={{ width:"100%", border:`1.5px solid ${T.gray200}`, borderRadius:7,
                  padding:"9px 12px", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
            </div>
          ))}
        </div>
        <div style={{ background:T.navy, borderRadius:9, padding:"18px 22px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.5)",
            letterSpacing:.8, textTransform:"uppercase", marginBottom:14 }}>Beregnet refusjon</div>
          <div style={{ display:"flex", gap:40, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginBottom:4 }}>Per leilighet / mnd</div>
              <div style={{ fontWeight:800, fontSize:26, color:T.cyan }}>{perLeil} kr</div>
            </div>
            <div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginBottom:4 }}>Total ({ant} leil.)</div>
              <div style={{ fontWeight:800, fontSize:26, color:T.white }}>{total} kr</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="Mal – brev til beboere om bredbåndsrefusjon" topColor={T.green}>
        <div style={{ background:T.offWhite, borderRadius:8, padding:"20px 24px",
          fontFamily:"Georgia,serif", fontSize:14, lineHeight:1.8, color:T.text,
          border:`1px solid ${T.gray200}`, whiteSpace:"pre-wrap" }}>
{`${data.borettslag}
Dato: ${new Date().toLocaleDateString("nb-NO")}

Til alle beboere

Vedrørende bredbåndsrefusjon – Telenor MDU-avtale

Borettslaget har en fellesavtale med Telenor som inkluderer TV og bredbånd. Den månedlige husleien inkluderer en bredbåndsandel på ${andel}% av totalpakken, tilsvarende kr ${perLeil},- per leilighet per måned.

Som beboer har du rett til refusjon for denne andelen dersom du velger eget bredbåndsabonnement. Kontakt styret med dokumentasjon på eget abonnement for å søke om refusjon.

Med vennlig hilsen
Styret i ${data.borettslag}`}
        </div>
        <div style={{ marginTop:14 }}>
          <Btn>📄 Last ned som Word-mal</Btn>
        </div>
      </Card>
    </>
  );
}

export default function App() {
  const [active, setActive] = useState("oversikt");
  const ulest = MESSAGES.filter(m=>!m.lest).length;
  const current = NAV_ITEMS.find(n=>n.id===active);

  const PAGES = {
    oversikt:      <PageOversikt setActive={setActive} />,
    avtale:        <PageAvtale />,
    dekodere:      <PageDekodere setActive={setActive} />,
    feilsok:       <PageFeilsok setActive={setActive} />,
    kommunikasjon: <PageKommunikasjon />,
    arbeid:        <PageArbeid />,
    refusjon:      <PageRefusjon />,
  };

  return (
    <div style={{ fontFamily:"'Helvetica Neue',Arial,sans-serif", background:T.offWhite,
      minHeight:"100vh", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <header style={{ background:T.navy, height:54, display:"flex", alignItems:"center",
        padding:"0 26px", gap:14, flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}>
        <TelenorLogo size={28} white />
        <span style={{ color:"rgba(255,255,255,.3)", fontSize:18, fontWeight:200 }}>|</span>
        <span style={{ color:T.white, fontWeight:700, fontSize:14, letterSpacing:.2 }}>MDU Styreportal</span>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:T.cyan,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:T.white, fontWeight:800, fontSize:13 }}>P</div>
          <span style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>Per Hansen</span>
        </div>
      </header>

      <div style={{ display:"flex", flex:1 }}>
        {/* Sidebar */}
        <aside style={{ width:212, background:T.white, flexShrink:0,
          borderRight:`1px solid ${T.gray200}`, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"18px 18px 13px", borderBottom:`1px solid ${T.gray200}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.gray400, letterSpacing:1,
              textTransform:"uppercase", marginBottom:2 }}>Borettslag</div>
            <div style={{ fontWeight:800, color:T.navy, fontSize:14 }}>Granly Borettslag</div>
            <div style={{ fontSize:11, color:T.gray400, marginTop:1 }}>MDU-2024-00382</div>
          </div>

          <nav style={{ flex:1, padding:"8px 0" }}>
            {NAV_ITEMS.map(item => {
              const sel = active===item.id;
              return (
                <button key={item.id} onClick={()=>setActive(item.id)} style={{
                  display:"flex", alignItems:"center", gap:10, width:"100%",
                  padding:"10px 18px", border:"none", cursor:"pointer", textAlign:"left",
                  background: sel?"#e6f4ff":"transparent",
                  color: sel?T.navy:T.gray700,
                  fontSize:13, fontWeight:sel?700:400,
                  borderLeft: sel?`3px solid ${T.cyan}`:"3px solid transparent",
                  fontFamily:"inherit", transition:"all .12s",
                }}>
                  <span style={{ fontSize:14, width:18, textAlign:"center" }}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {item.id==="kommunikasjon" && ulest>0 && (
                    <span style={{ background:T.cyan, color:"#fff", borderRadius:20,
                      fontSize:10, padding:"1px 7px", fontWeight:800 }}>{ulest}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ padding:"13px 18px", borderTop:`1px solid ${T.gray200}`, background:T.gray100 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:T.cyan,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontWeight:800, fontSize:11, flexShrink:0 }}>PH</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:T.navy }}>Per Hansen</div>
                <div style={{ fontSize:10, color:T.gray400 }}>Styreleder</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1, padding:"28px 32px", maxWidth:880, overflowY:"auto" }}>
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:3 }}>
              <span style={{ fontSize:20 }}>{current?.icon}</span>
              <h1 style={{ margin:0, color:T.navy, fontSize:21, fontWeight:800 }}>{current?.label}</h1>
            </div>
            <div style={{ color:T.gray400, fontSize:12 }}>
              Granly Borettslag · {new Date().toLocaleDateString("nb-NO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          {PAGES[active]}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ background:T.navy, padding:"12px 26px",
        display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <TelenorLogo size={20} white />
        <span style={{ color:"rgba(255,255,255,.35)", fontSize:12 }}>
          © {new Date().getFullYear()} Telenor Norge AS · MDU Styreportal
        </span>
        <div style={{ flex:1 }} />
        <a href="https://www.telenor.no/kundeservice/" target="_blank" rel="noreferrer"
          style={{ color:T.cyan, fontSize:12, fontWeight:600, textDecoration:"none" }}>Kundeservice</a>
        <a href="https://www.telenor.no/vilkar/" target="_blank" rel="noreferrer"
          style={{ color:"rgba(255,255,255,.35)", fontSize:12, textDecoration:"none" }}>Vilkår</a>
      </footer>
    </div>
  );
}
