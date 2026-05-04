import React, { useState, useEffect } from "react";

/* ===================== CONSTANTS ===================== */

const STORAGE_KEY = "br_defect_runs";
const FLOW_URL =
  "https://default8915bd1ac6c542fcb5ad6a9e64aebb.cb.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8aec64a0b880468490aab9e698819623/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=okkz5n9vknozE2ykXTkTKCCR6VoTXcBPGjYfHPd-s4s";

/* ===================== OPTIONS ===================== */

const CATEGORIES = [
  "WW","ORG","NE","VIN","BB","SF","WAGYU","GF","COW","BULL","OTHER"
];

const PRIMALS = [
  "C Shin","Bolar","Oyster","Short Rib","Chuck Rib","Chuck PE","Brisket",
  "Cube Roll","NE Brisket","Thin Skirt","Tenderloin","Flap Meat",
  "Flank Steak","Striploin","Rump","Rump Cap","Rostbiff","D Rump",
  "Tri Tip","Knuckle","Eye Round","Outside Flat","Topside C/On",
  "Topside C/Off","B/Less Shin","Chuck Tender","Other"
];

const DEFECTS = [
  "Over trim","Fat Depth","Cutting Lines","Tenderstretch","B/R Damage",
  "K/F Damage","Bone Chips","Bruising","Blood Clots",
  "Foreign Objects","Paddywhack","Foreign Muscle","Other"
];

/* ===================== STYLES ===================== */

const bigField = {
  width: "100%",
  height: 64,
  fontSize: 20,
  borderRadius: 14,
  padding: "0 14px",
  boxSizing: "border-box",
};

const bigQtyInput = {
  height: 64,
  fontSize: 28,
  textAlign: "center" as const,
  borderRadius: 14,
  width: 120,
};

const bigButton = {
  height: 64,
  fontSize: 18,
  fontWeight: "bold",
  borderRadius: 14,
  border: "none",
  padding: "0 18px",
};

/* ===================== CSV + EXPORT ===================== */

function buildCSV(meta: any, rows: any[]) {
  const header = [
    "date","operator","shift","chain","run",
    "timestamp","category","primal","defect","qty"
  ];

  const escape = (v: any) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines = [
    header.map(escape).join(","),
    ...rows.map(r =>
      [
        meta.date, meta.operator, meta.shift,
        meta.chain, meta.run,
        r.timestamp, r.category, r.primal, r.defect, r.qty
      ].map(escape).join(",")
    )
  ];

  return lines.join("\n");
}

async function sendRunToPowerAutomate(meta: any, rows: any[]) {
  const csv = buildCSV(meta, rows);

  const fileName =
    `BR_Defects_${meta.date.replaceAll("-", "")}` +
    `_${meta.shift}_C${meta.chain}_R${meta.run}.csv`;

  const res = await fetch(FLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, csv }),
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

/* ===================== APP ===================== */

export default function App() {
  const [runs, setRuns] = useState<any[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setRuns(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }, [runs]);

  const activeRun = runs.find(r => r.id === activeRunId);

  if (!activeRun) {
    return (
      <RunSetup
        runs={runs}
        onCreate={(run: any) => {
          setRuns(prev => [...prev, run]);
          setActiveRunId(run.id);
        }}
        onOpen={setActiveRunId}
        onDelete={(id: any) =>
          setRuns(prev => prev.filter(r => r.id !== id))
        }
      />
    );
  }

  return (
    <DefectPage
      run={activeRun}
      onUpdate={(updated: any) =>
        setRuns(prev =>
          prev.map(r => (r.id === updated.id ? updated : r))
        )
      }
      onFinish={async (run: any) => {
        if (!window.confirm("Do you want to submit this run?")) return;
        await sendRunToPowerAutomate(run.meta, run.rows);
        setRuns(prev => prev.filter(r => r.id !== run.id));
        setActiveRunId(null);
      }}
      onBack={() => setActiveRunId(null)}
    />
  );
}

/* ===================== RUN SETUP ===================== */

function RunSetup({ runs, onCreate, onOpen, onDelete }: any) {
  const [meta, setMeta] = useState({
    date: new Date().toISOString().substring(0, 10),
    operator: "",
    shift: "",
    chain: "",
    run: "",
  });

  const startRun = () => {
    if (!meta.operator || !meta.shift || !meta.chain || !meta.run) {
      alert("Please complete all run details.");
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      meta,
      rows: [],
    });
  };

  return (
    <div style={{ background:"#0f172a", minHeight:"100vh", padding:20, color:"#e5e7eb", maxWidth:900, margin:"0 auto" }}>
      <h1>AUSMEAT BR Defects</h1>

      <h2>Start New Run</h2>
      <div style={{ display:"grid", gap:12 }}>
        <input type="date" style={bigField}
          value={meta.date}
          onChange={e=>setMeta({...meta,date:e.target.value})} />

        <input style={bigField} placeholder="Operator"
          value={meta.operator}
          onChange={e=>setMeta({...meta,operator:e.target.value})} />

        <select style={bigField} value={meta.shift}
          onChange={e=>setMeta({...meta,shift:e.target.value})}>
          <option value="">Shift</option>
          <option>AM</option>
          <option>PM</option>
        </select>

        <select style={bigField} value={meta.chain}
          onChange={e=>setMeta({...meta,chain:e.target.value})}>
          <option value="">Chain</option>
          <option>1</option>
          <option>2</option>
          <option>1&2</option>
        </select>

        <select style={bigField} value={meta.run}
          onChange={e=>setMeta({...meta,run:e.target.value})}>
          <option value="">Run</option>
          <option>1</option>
          <option>2</option>
          <option>3</option>
        </select>

        <button
          style={{ ...bigButton, background:"#16a34a", color:"white" }}
          onClick={startRun}
        >
          START RUN
        </button>
      </div>

      <h2 style={{ marginTop:32 }}>Saved Runs</h2>

      {runs.map((r:any)=>(
        <div
          key={r.id}
          style={{
            background:"#020617",
            padding:12,
            borderRadius:12,
            marginBottom:8,
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            gap:12
          }}
        >
          <div>
            <strong>{r.meta.date} · {r.meta.shift} · C{r.meta.chain} · R{r.meta.run}</strong>
            <div>{r.meta.operator}</div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button
              style={{ ...bigButton, height:44, background:"#2563eb", color:"white" }}
              onClick={() => onOpen(r.id)}
            >
              Open
            </button>

            <button
              style={{ ...bigButton, height:44, background:"#dc2626", color:"white" }}
              onClick={() => onDelete(r.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===================== DEFECT PAGE ===================== */

function DefectPage({ run, onUpdate, onFinish, onBack }: any) {
  const { meta, rows } = run;

  const [current, setCurrent] = useState({
    category:"", primal:"", defect:"", qty:""
  });

  const addDefect = () => {
    if (!current.category || !current.primal || !current.defect || !current.qty) return;

    onUpdate({
      ...run,
      rows: [
        ...rows,
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ...current,
          qty: Number(current.qty),
        }
      ]
    });

    setCurrent({ category:"", primal:"", defect:"", qty:"" });
  };

  const deleteRow = (id: string) => {
    onUpdate({ ...run, rows: rows.filter((r: any) => r.id !== id) });
  };

  const total = rows.reduce((s:any,r:any)=>s+r.qty,0);

  return (
    <div style={{ background:"#0f172a", minHeight:"100vh", padding:20, color:"#e5e7eb", maxWidth:900, margin:"0 auto" }}>

      {/* BACK BUTTON */}
      <button
        style={{
          ...bigButton,
          height:44,
          background:"#020617",
          color:"#e5e7eb",
          marginBottom:12
        }}
        onClick={onBack}
      >
        ← Back
      </button>

      <h2>{meta.date} · {meta.shift} · C{meta.chain} · R{meta.run}</h2>

      <select style={bigField} value={current.category}
        onChange={e=>setCurrent({...current,category:e.target.value})}>
        <option value="">CATEGORY</option>
        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
      </select>

      <select style={bigField} value={current.primal}
        onChange={e=>setCurrent({...current,primal:e.target.value})}>
        <option value="">PRIMAL</option>
        {PRIMALS.map(p=><option key={p}>{p}</option>)}
      </select>

      <select style={bigField} value={current.defect}
        onChange={e=>setCurrent({...current,defect:e.target.value})}>
        <option value="">DEFECT</option>
        {DEFECTS.map(d=><option key={d}>{d}</option>)}
      </select>

      <div style={{ display:"flex", gap:12 }}>
        <input
          style={bigQtyInput}
          type="number"
          min="1"
          placeholder="QTY"
          value={current.qty}
          onChange={e=>setCurrent({...current,qty:e.target.value})}
        />
        <button
          style={{ ...bigButton, flex:1, background:"#16a34a", color:"white" }}
          onClick={addDefect}
        >
          ADD DEFECT
        </button>
      </div>

      <h3 style={{ marginTop:32 }}>Total Defects: {total}</h3>

      {rows.map((r:any)=>(
        <div key={r.id} style={{
          background:"#020617",
          padding:12,
          borderRadius:12,
          marginTop:8,
          display:"grid",
          gridTemplateColumns:"1fr 2fr 2fr 1fr 40px",
          alignItems:"center"
        }}>
          <div>{r.category}</div>
          <div>{r.primal}</div>
          <div>{r.defect}</div>
          <div>{r.qty}</div>
          <button
            style={{
              height:36,
              background:"#dc2626",
              color:"white",
              border:"none",
              borderRadius:8,
              fontWeight:"bold"
            }}
            onClick={() => deleteRow(r.id)}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        disabled={rows.length === 0}
        style={{
          ...bigButton,
          width:"100%",
          marginTop:32,
          background: rows.length === 0 ? "#374151" : "#2563eb",
          color:"white"
        }}
        onClick={() => onFinish(run)}
      >
        FINISH RUN
      </button>
    </div>
  );
}