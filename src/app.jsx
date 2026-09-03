import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const C = { bg:"#17110E", surface:"#221A15", surface2:"#2C221B", line:"#3A2E25",
  cream:"#F3EBDF", muted:"#A08F7D", green:"#57D08A", amber:"#E0925A", red:"#E06A5A" };
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const DEFAULT_CATS = ["Smokes","Cool drinks","Snacks","Water","Others"];

const cfg = {
  get(){ try{ return { url: localStorage.getItem("bc_url")||"", key: localStorage.getItem("bc_key")||"" }; }catch{ return {url:"",key:""}; } },
  set(url,key){ try{ localStorage.setItem("bc_url",url); localStorage.setItem("bc_key",key); }catch{} },
};

const todayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const dateKeyOf = iso => { const d=new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const rupee = n => "₹"+Math.round(n).toLocaleString("en-IN");
const signed = n => (n>=0?"":"−")+rupee(Math.abs(n));
const prettyDate = k => { const [y,m,d]=k.split("-").map(Number); if(k===todayKey())return "Today";
  return new Date(y,m-1,d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}); };
const fullDate = k => { const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}); };
const shortDate = iso => { try{ return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); }catch{ return ""; } };
const fullDateTime = iso => { try{ return new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}); }catch{ return ""; } };
const shortDateTime = iso => { try{ const d=new Date(iso); const time=d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}).toLowerCase(); return `${shortDate(iso)}, ${time}`; }catch{ return ""; } };
const shiftDate = (k,delta) => { const [y,m,d]=k.split("-").map(Number); const dt=new Date(y,m-1,d+delta);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };

function computeClose({products, openingMap, boughtMap, soldMap, dueSoldMap={}, cashLoaded, expensesTotal=0, duesTotal=0, duesPaidToday=0, duesGivenToday=0}){
  let stockCost=0, saleAmount=0, cashSaleAmount=0, gross=0, shelfValue=0, soldCost=0, itemsSold=0;
  const lines=[];
  for(const p of products){
    const opening=openingMap[p.id]||0, bought=boughtMap[p.id]||0;
    const sold=Math.min(Math.max(0,soldMap[p.id]||0), opening+bought);
    const dueSold=Math.min(Math.max(0,dueSoldMap[p.id]||0), sold);
    const closing=Math.max(0, opening+bought-sold);
    stockCost+=p.buy*bought; saleAmount+=p.sell*sold; cashSaleAmount+=p.sell*(sold-dueSold); gross+=(p.sell-p.buy)*sold;
    shelfValue+=p.buy*closing; soldCost+=p.buy*sold; itemsSold+=sold;
    if(opening+bought>0 || sold>0) lines.push({id:p.id,name:p.name,sold,left:closing,made:(p.sell-p.buy)*sold,soldCost:p.buy*sold,leftCost:p.buy*closing});
  }
  const drawerClose = cashLoaded + cashSaleAmount + duesPaidToday - expensesTotal;
  const profit = gross - expensesTotal;
  return {stockCost,saleAmount,cashSaleAmount,gross,profit,expensesTotal,soldCost,shelfValue,itemsSold,drawerClose,duesTotal,duesPaidToday,duesGivenToday,cashLoaded,lines};
}

let sb=null;
function makeClient(){ const {url,key}=cfg.get();
  console.log("[BC-DEBUG] url:", JSON.stringify(url), "len:", url.length);
  console.log("[BC-DEBUG] key:", JSON.stringify(key), "len:", key.length);
  console.log("[BC-DEBUG] key first10:", key.slice(0,10), "last6:", key.slice(-6));
  if(url&&key){ try{ sb=createClient(url,key); return true; }catch{ return false; } } return false; }

/* ============================================================ */
function App(){
  const [ready,setReady]=useState(false),[hasCfg,setHasCfg]=useState(false),[session,setSession]=useState(null);
  useEffect(()=>{
    const ok=makeClient(); setHasCfg(ok);
    if(!ok){ setReady(true); return; }
    sb.auth.getSession().then(({data})=>{ setSession(data.session); setReady(true); }).catch(()=>setReady(true));
    const {data:sub}=sb.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>sub?.subscription?.unsubscribe();
  },[]);
  if(!ready) return <Boot/>;
  if(!hasCfg) return <Setup onSaved={()=>{ if(makeClient()){ setHasCfg(true); sb.auth.getSession().then(({data})=>setSession(data.session)); } }}/>;
  if(!session) return <Auth/>;
  return <Main session={session}/>;
}
function Boot(){ return <div style={{...wrap,alignItems:"center",justifyContent:"center",minHeight:400}}><p style={{color:C.muted}}>Warming up the counter…</p></div>; }

function Setup({onSaved}){
  const [url,setUrl]=useState(""),[key,setKey]=useState("");
  const ok=url.trim().startsWith("http")&&key.trim().length>20;
  return (<div style={wrap}><Header/><div style={card}>
    <div style={cardLabel}>Connect your database</div>
    <p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginTop:0}}>One-time step on each phone. In Supabase, open <b style={{color:C.cream}}>Project Settings → API</b> and copy these two values.</p>
    <label style={fieldLbl}>Project URL</label>
    <input style={input} placeholder="https://xxxx.supabase.co" value={url} onChange={e=>setUrl(e.target.value)}/>
    <label style={{...fieldLbl,marginTop:12,display:"block"}}>anon / publishable key</label>
    <input style={input} placeholder="sb_publishable_… or eyJhbGciOi…" value={key} onChange={e=>setKey(e.target.value)}/>
    <button disabled={!ok} style={primaryBtn(ok)} onClick={()=>{ cfg.set(url.trim(),key.trim()); onSaved(); }}>Connect</button>
  </div></div>);
}

function Auth(){
  const [mode,setMode]=useState("in"),[email,setEmail]=useState(""),[pw,setPw]=useState(""),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  const go=async()=>{ setErr(""); setBusy(true);
    try{ const fn=mode==="in"?await sb.auth.signInWithPassword({email,password:pw}):await sb.auth.signUp({email,password:pw});
      if(fn.error) setErr(fn.error.message); else if(mode==="up") setErr("Account created. If it asks to confirm email, do that once, then sign in.");
    }catch(e){ setErr(String(e.message||e)); } setBusy(false); };
  return (<div style={wrap}><Header/><div style={card}>
    <div style={cardLabel}>{mode==="in"?"Sign in to Bean Cafe":"Create the shared login"}</div>
    <p style={{color:C.muted,fontSize:13,lineHeight:1.6,marginTop:0}}>{mode==="in"?"Use the same email & password on both phones so you share one shelf.":"Make this once. Then sign in with it on both phones."}</p>
    <input style={input} placeholder="Email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input style={{...input,marginTop:10}} placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)}/>
    {err && <p style={{color:C.amber,fontSize:12.5,marginTop:10}}>{err}</p>}
    <button disabled={busy||!email||!pw} style={primaryBtn(!busy&&!!email&&!!pw)} onClick={go}>{busy?"…":(mode==="in"?"Sign in":"Create account")}</button>
    <button style={{...ghostBtn,width:"100%",marginTop:8}} onClick={()=>{setMode(mode==="in"?"up":"in");setErr("");}}>{mode==="in"?"First time? Create the login":"Have a login? Sign in"}</button>
  </div></div>);
}

/* ============================================================ */
function Main({session}){
  const userId=session.user.id;
  const [tab,setTab]=useState("daily");
  const [products,setProducts]=useState([]);
  const [cats,setCats]=useState(DEFAULT_CATS);
  const [date,setDate]=useState(todayKey());
  const [inv,setInv]=useState({});       // opening on-hand per product
  const [bought,setBought]=useState({});  // bought today
  const [sold,setSold]=useState({});      // sold today
  const [dueSold,setDueSold]=useState({}); // of today's sold, how many were sold on credit
  const [restock,setRestock]=useState({}); // restock sessions today, per product
  const [header,setHeader]=useState({cash_loaded:0,personal_cash:0,closed:false});
  const [dues,setDues]=useState([]);
  const [payables,setPayables]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const dateRef=useRef(date); dateRef.current=date;
  const headerRef=useRef(header); headerRef.current=header;
  const boughtRef=useRef(bought); boughtRef.current=bought;
  const soldRef=useRef(sold); soldRef.current=sold;
  const dueSoldRef=useRef(dueSold); dueSoldRef.current=dueSold;
  const restockRef=useRef(restock); restockRef.current=restock;
  const lastBoughtEditRef=useRef({}); // in-memory per-product timestamp, for restock-session debounce
  const muteRef=useRef(0);
  const touch=()=>{ muteRef.current=Date.now()+2500; };

  const loadStatic=async()=>{
    const [p,c,pay]=await Promise.all([ sb.from("products").select("*").order("created_at"), sb.from("categories").select("*").order("sort"), sb.from("payables").select("*").order("created_at") ]);
    if(p.data) setProducts(p.data);
    if(c.data){ const names=c.data.map(r=>r.name); setCats(names.length?names:DEFAULT_CATS);
      if(!names.length) await sb.from("categories").insert(DEFAULT_CATS.map((name,i)=>({user_id:userId,name,sort:i}))); }
    if(pay.data) setPayables(pay.data);
  };
  const loadDay=async(d=dateRef.current)=>{
    const [invR,logR,dayR,dueR,expR]=await Promise.all([
      sb.from("inventory").select("*"),
      sb.from("day_log").select("*").eq("day",d),
      sb.from("days").select("*").eq("day",d).maybeSingle(),
      sb.from("dues").select("*").order("created_at"),
      sb.from("expenses").select("*").eq("day",d),
    ]);
    const im={}; (invR.data||[]).forEach(r=>im[r.product_id]=r.on_hand); setInv(im);
    const bm={},sm={},dm={},rm={}; (logR.data||[]).forEach(r=>{ bm[r.product_id]=r.qty||0; if(r.sold!=null)sm[r.product_id]=r.sold; if(r.due_sold!=null)dm[r.product_id]=r.due_sold; rm[r.product_id]=r.restock_sessions||0; });
    setBought(bm); setSold(sm); setDueSold(dm); setRestock(rm);
    setHeader(dayR.data||{cash_loaded:0,personal_cash:0,closed:false});
    setDues(dueR.data||[]);
    setExpenses(expR.data||[]);
  };
  useEffect(()=>{ loadStatic(); loadDay(); },[]);
  useEffect(()=>{ loadDay(date); },[date]);
  useEffect(()=>{
    let t=null;
    const maybeReload=()=>{ clearTimeout(t); t=setTimeout(()=>{ if(Date.now()<muteRef.current) return; loadStatic(); loadDay(); }, 600); };
    const ch=sb.channel("bc-sync").on("postgres_changes",{event:"*",schema:"public"},maybeReload).subscribe();
    const onVis=()=>{ if(document.visibilityState==="visible" && Date.now()>=muteRef.current){ loadStatic(); loadDay(); } };
    document.addEventListener("visibilitychange",onVis);
    return ()=>{ sb.removeChannel(ch); clearTimeout(t); document.removeEventListener("visibilitychange",onVis); };
  },[]);

  const addProduct=async(rec,stockNow=0)=>{ touch();
    const {data}=await sb.from("products").insert({user_id:userId,...rec}).select().single();
    if(data && stockNow>0){
      await sb.from("day_log").upsert({user_id:userId,day:todayKey(),product_id:data.id,qty:stockNow,sold:0},{onConflict:"user_id,day,product_id"});
    }
    loadStatic(); loadDay();
  };
  const updateProduct=async(id,rec)=>{ touch(); await sb.from("products").update(rec).eq("id",id); loadStatic(); };
  const deleteProduct=async(id)=>{ touch(); await sb.from("products").delete().eq("id",id); loadStatic(); loadDay(); };
  const addCategory=async(name)=>{ touch(); if(cats.includes(name))return; setCats([...cats,name]); await sb.from("categories").insert({user_id:userId,name,sort:cats.length}); };

  // day header — write cash_loaded + personal_cash together so neither wipes the other
  const writeHeader=async(patch)=>{ touch(); const h={...headerRef.current,...patch}; setHeader(h);
    await sb.from("days").upsert({user_id:userId,day:date,cash_loaded:h.cash_loaded||0,personal_cash:h.personal_cash||0,closed:false},{onConflict:"user_id,day"}); };
  const setCashLoaded=v=>writeHeader({cash_loaded:v});
  const setPersonalCash=v=>writeHeader({personal_cash:v});

  const setBoughtQty=(id,qty)=>{ touch();
    const newQty=Math.max(0,qty);
    let sessions=restockRef.current[id]||0;
    if(newQty>(boughtRef.current[id]||0)){
      const now=Date.now(), last=lastBoughtEditRef.current[id];
      if(!last || now-last>20000) sessions+=1;
      lastBoughtEditRef.current[id]=now;
    }
    setBought(prev=>{ const n={...prev}; if(newQty>0)n[id]=newQty; else delete n[id]; return n; });
    if(sessions!==(restockRef.current[id]||0)) setRestock(prev=>({...prev,[id]:sessions}));
    (async()=>{ await sb.from("day_log").upsert({user_id:userId,day:date,product_id:id,qty:newQty,sold:soldRef.current[id]||0,due_sold:dueSoldRef.current[id]||0,restock_sessions:sessions},{onConflict:"user_id,day,product_id"}); })(); };
  const setSoldQty=(id,qty)=>{ touch(); const newSold=Math.max(0,qty);
    // due_sold for a product can never exceed its sold count — clamp down if sold is reduced below it
    const clampedDue=Math.min(dueSoldRef.current[id]||0, newSold);
    setSold(prev=>{ const n={...prev}; if(newSold>0)n[id]=newSold; else delete n[id]; return n; });
    if(clampedDue!==(dueSoldRef.current[id]||0)) setDueSold(prev=>{ const n={...prev}; if(clampedDue>0)n[id]=clampedDue; else delete n[id]; return n; });
    (async()=>{ await sb.from("day_log").upsert({user_id:userId,day:date,product_id:id,sold:newSold,qty:boughtRef.current[id]||0,due_sold:clampedDue},{onConflict:"user_id,day,product_id"}); })(); };
  const setDueSoldQty=(id,qty)=>{ touch(); const newDue=Math.max(0,qty); setDueSold(prev=>{ const n={...prev}; if(newDue>0)n[id]=newDue; else delete n[id]; return n; });
    (async()=>{ await sb.from("day_log").upsert({user_id:userId,day:date,product_id:id,due_sold:newDue,qty:boughtRef.current[id]||0,sold:soldRef.current[id]||0},{onConflict:"user_id,day,product_id"}); })(); };
  // sell-as-due: bumps sold and due_sold together in one write, so there's no race between two separate upserts
  const sellAsDue=async(id,qty)=>{ touch(); const newSold=(soldRef.current[id]||0)+qty, newDue=(dueSoldRef.current[id]||0)+qty;
    setSold(prev=>({...prev,[id]:newSold})); setDueSold(prev=>({...prev,[id]:newDue}));
    await sb.from("day_log").upsert({user_id:userId,day:date,product_id:id,qty:boughtRef.current[id]||0,sold:newSold,due_sold:newDue},{onConflict:"user_id,day,product_id"}); };

  const addDue=async(d,meta)=>{ touch();
    const topups=meta?[{amount:d.amount,at:new Date().toISOString(),product:meta.product,rate:meta.rate,qty:meta.qty}]:[];
    await sb.from("dues").insert({user_id:userId,day:date,name:d.name,amount:d.amount,phone:d.phone||null,paid:false,payments:[],topups}); loadDay(); };
  const addToDue=async(d,amount,meta)=>{ const amt=Number(amount)||0; if(amt<=0)return; touch();
    const entry={amount:amt,at:new Date().toISOString(),...(meta?{product:meta.product,rate:meta.rate,qty:meta.qty}:{})};
    const topups=[...(Array.isArray(d.topups)?d.topups:[]),entry];
    await sb.from("dues").update({amount:Number(d.amount||0)+amt,topups}).eq("id",d.id); loadDay(); };
  const payDue=async(d,pay)=>{ touch(); const remaining=Number(d.amount||0); const p=Math.min(Math.max(0,pay),remaining); if(p<=0)return;
    const log=[...(Array.isArray(d.payments)?d.payments:[]),{amount:p,at:new Date().toISOString()}];
    if(p>=remaining) await sb.from("dues").update({paid:true,amount:remaining,payments:log}).eq("id",d.id);
    else await sb.from("dues").update({amount:remaining-p,payments:log}).eq("id",d.id); loadDay(); };
  const toggleDuePaid=async(id,paid)=>{ touch(); await sb.from("dues").update({paid}).eq("id",id); loadDay(); };
  const deleteDue=async(id)=>{ touch(); await sb.from("dues").delete().eq("id",id); loadDay(); };

  const addExpense=async(amount,note)=>{ touch(); await sb.from("expenses").insert({user_id:userId,day:date,amount,note}); loadDay(); };
  const delExpense=async(id)=>{ touch(); await sb.from("expenses").delete().eq("id",id); loadDay(); };

  const addPayable=async(d)=>{ touch(); await sb.from("payables").insert({user_id:userId,name:d.name,amount:d.amount,phone:d.phone||null,paid:false,payments:[],topups:[]}); loadStatic(); };
  const addToPayable=async(d,amount)=>{ const amt=Number(amount)||0; if(amt<=0)return; touch();
    const topups=[...(Array.isArray(d.topups)?d.topups:[]),{amount:amt,at:new Date().toISOString()}];
    await sb.from("payables").update({amount:Number(d.amount||0)+amt,topups}).eq("id",d.id); loadStatic(); };
  const payPayable=async(d,pay)=>{ touch(); const remaining=Number(d.amount||0); const p=Math.min(Math.max(0,pay),remaining); if(p<=0)return;
    const log=[...(Array.isArray(d.payments)?d.payments:[]),{amount:p,at:new Date().toISOString()}];
    if(p>=remaining) await sb.from("payables").update({paid:true,amount:remaining,payments:log}).eq("id",d.id);
    else await sb.from("payables").update({amount:remaining-p,payments:log}).eq("id",d.id); loadStatic(); };
  const togglePayablePaid=async(id,paid)=>{ touch(); await sb.from("payables").update({paid}).eq("id",id); loadStatic(); };
  const deletePayable=async(id)=>{ touch(); await sb.from("payables").delete().eq("id",id); loadStatic(); };

  const closeDay=async(summary)=>{
    touch();
    for(const p of products){
      const opening=inv[p.id]||0, b=bought[p.id]||0, sd=Math.min(sold[p.id]||0, opening+b);
      const dsd=Math.min(dueSold[p.id]||0, sd);
      const closing=Math.max(0, opening+b-sd);
      await sb.from("day_log").upsert({user_id:userId,day:date,product_id:p.id,qty:b,sold:sd,due_sold:dsd,closing},{onConflict:"user_id,day,product_id"});
      await sb.from("inventory").upsert({user_id:userId,product_id:p.id,on_hand:closing},{onConflict:"user_id,product_id"});
    }
    await sb.from("days").upsert({user_id:userId,day:date,cash_loaded:header.cash_loaded||0,personal_cash:header.personal_cash||0,closed:true,closed_at:new Date().toISOString(),
      stock_cost:summary.stockCost,sale_amount:summary.saleAmount,cash_sale_amount:summary.cashSaleAmount,profit:summary.profit,shelf_value:summary.shelfValue,
      dues_total:summary.duesTotal,dues_paid_today:summary.duesPaidToday,dues_given_today:summary.duesGivenToday,drawer_close:summary.drawerClose,items_sold:summary.itemsSold},{onConflict:"user_id,day"});
    loadDay(); loadStatic();
  };
  const reopenDay=async()=>{ touch(); await sb.from("days").update({closed:false}).eq("day",date); loadDay(); };
  const deleteDay=async()=>{ touch(); await sb.from("day_log").delete().eq("day",date); await sb.from("days").delete().eq("day",date); loadDay(); loadStatic(); };

  const todaysDues=useMemo(()=>dues.filter(d=>d.day===date),[dues,date]);
  const duesPaidToday=useMemo(()=>dues.reduce((sum,d)=>{
    const payments=Array.isArray(d.payments)?d.payments:[];
    return sum+payments.reduce((s,p)=>s+(p.at && dateKeyOf(p.at)===date ? Number(p.amount||0) : 0),0);
  },0),[dues,date]);
  // dues created today already carry today's topups inside their `amount` (counted via todaysDues below),
  // so only count topups on dues from *other* days to avoid double-counting.
  const duesTopupsToday=useMemo(()=>dues.reduce((sum,d)=>{
    if(d.day===date) return sum;
    const topups=Array.isArray(d.topups)?d.topups:[];
    return sum+topups.reduce((s,t)=>s+(t.at && dateKeyOf(t.at)===date ? Number(t.amount||0) : 0),0);
  },0),[dues,date]);
  const duesTotalToday=useMemo(()=>todaysDues.reduce((s,d)=>s+Number(d.amount||0),0)+duesTopupsToday,[todaysDues,duesTopupsToday]);
  const outstanding=useMemo(()=>dues.filter(d=>!d.paid),[dues]);
  const outstandingTotal=useMemo(()=>outstanding.reduce((s,d)=>s+Number(d.amount||0),0),[outstanding]);
  const expensesTotal=useMemo(()=>expenses.reduce((s,e)=>s+Number(e.amount||0),0),[expenses]);
  const payablesOutstanding=useMemo(()=>payables.filter(d=>!d.paid),[payables]);
  const payablesOutstandingTotal=useMemo(()=>payablesOutstanding.reduce((s,d)=>s+Number(d.amount||0),0),[payablesOutstanding]);

  return (
    <div style={wrap}>
      <Header onSignOut={()=>sb.auth.signOut()}/>
      <div style={tabRow}>
        <button onClick={()=>setTab("daily")} style={tabBtn(tab==="daily")}>Daily</button>
        <button onClick={()=>setTab("products")} style={tabBtn(tab==="products")}>Products</button>
        <button onClick={()=>setTab("dues")} style={tabBtn(tab==="dues")}>Dues{outstanding.length?` · ${outstanding.length}`:""}</button>
        <button onClick={()=>setTab("payables")} style={tabBtn(tab==="payables")}>Payables{payablesOutstanding.length?` · ${payablesOutstanding.length}`:""}</button>
      </div>
      {tab==="products" && <Products {...{products,cats,addProduct,updateProduct,deleteProduct,addCategory,inv,bought,sold,setBoughtQty}}/>}
      {tab==="daily" && <Daily {...{products,date,setDate,inv,bought,sold,dueSold,restock,setSoldQty,sellAsDue,header,setCashLoaded,setPersonalCash,closeDay,reopenDay,deleteDay,duesTotalToday,duesPaidToday,todaysDues,dues,outstanding,addDue,addToDue,expenses,expensesTotal,addExpense,delExpense}}/>}
      {tab==="dues" && <DuesTab {...{outstanding,outstandingTotal,dues,toggleDuePaid,deleteDue,payDue,addToDue}}/>}
      {tab==="payables" && <PayablesTab {...{outstanding:payablesOutstanding,outstandingTotal:payablesOutstandingTotal,payables,addPayable,toggleDuePaid:togglePayablePaid,deleteDue:deletePayable,payDue:payPayable,addToDue:addToPayable}}/>}
      <footer style={foot}>Synced live · signed in as {session.user.email}</footer>
    </div>
  );
}

/* ---------- Products (catalog) ---------- */
function Products({products,cats,addProduct,updateProduct,deleteProduct,addCategory,inv,bought,sold,setBoughtQty}){
  const blank={name:"",category:cats[0]||"Others",buy:"",sell:"",buyMode:"piece",ppb:"",boxPrice:"",stockNow:""};
  const [form,setForm]=useState(blank),[editId,setEditId]=useState(null),[newCat,setNewCat]=useState(""),[addingCat,setAddingCat]=useState(false);
  const [restockMsg,setRestockMsg]=useState("");
  useEffect(()=>{ if(!restockMsg)return; const t=setTimeout(()=>setRestockMsg(""),3000); return ()=>clearTimeout(t); },[restockMsg]);
  useEffect(()=>{ if(!editId) setForm(f=>({...f,category:cats.includes(f.category)?f.category:(cats[0]||"Others")})); },[cats]);
  const boxMode=form.buyMode==="box";
  const ppb=parseInt(form.ppb)||0, boxPrice=parseFloat(form.boxPrice)||0;
  const sell=parseFloat(form.sell)||0;
  const buy = boxMode ? (ppb>0? boxPrice/ppb : 0) : (parseFloat(form.buy)||0);
  const unit=sell-buy, pct=buy>0?(unit/buy)*100:null;
  const canSave=form.name.trim() && form.sell!=="" && (boxMode ? (ppb>0 && form.boxPrice!=="") : form.buy!=="");
  const save=()=>{ if(!canSave)return;
    const rec={name:form.name.trim(),category:form.category,sell,buy,pieces_per_box:boxMode?ppb:null,box_price:boxMode?boxPrice:null};
    if(editId){ updateProduct(editId,rec); }
    else{
      const nameKey=form.name.trim().toLowerCase();
      const existing=products.find(p=>p.name.trim().toLowerCase()===nameKey);
      if(existing){
        const stockNowQty=parseInt(form.stockNow)||0;
        const per=existing.pieces_per_box||0;
        const addPieces=per>0?stockNowQty*per:stockNowQty;
        setBoughtQty(existing.id,(bought[existing.id]||0)+addPieces);
        setRestockMsg(`Added to existing stock: ${existing.name}`);
      } else {
        const stockNowQty=parseInt(form.stockNow)||0; const stockPieces=boxMode?stockNowQty*ppb:stockNowQty; addProduct(rec,stockPieces);
      }
    }
    setForm({...blank,category:form.category}); setEditId(null); };
  const edit=p=>{ setForm({name:p.name,category:p.category,sell:String(p.sell),buy:String(p.buy),
    buyMode:p.pieces_per_box?"box":"piece",ppb:p.pieces_per_box?String(p.pieces_per_box):"",boxPrice:p.box_price!=null?String(p.box_price):""}); setEditId(p.id); };
  const doAddCat=()=>{ const c=newCat.trim(); if(c){ addCategory(c); setForm(f=>({...f,category:c})); } setNewCat(""); setAddingCat(false); };
  const grouped=useMemo(()=>{ const g={}; products.forEach(p=>{ if(!g[p.category])g[p.category]=[]; g[p.category].push(p); }); return g; },[products]);
  const shelfOf=p=>(inv[p.id]||0)+(bought[p.id]||0)-(sold[p.id]||0);

  return (<div>
    <div style={card}>
      <div style={cardLabel}>{editId?"Edit product":"Add a product"}</div>
      <input style={input} placeholder="Name  e.g. Connect" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,margin:"12px 0 4px"}}>
        {cats.map(c=>(<button key={c} onClick={()=>setForm({...form,category:c})} style={chip(form.category===c)}>{c}</button>))}
        {addingCat?(<span style={{display:"inline-flex",gap:4}}><input autoFocus value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAddCat()} placeholder="new" style={{...input,width:90,padding:"6px 9px"}}/><button onClick={doAddCat} style={miniBtn}>✓</button></span>):(<button onClick={()=>setAddingCat(true)} style={{...chip(false),borderStyle:"dashed"}}>+ New</button>)}
      </div>
      {/* buy first, then sell (per request) */}
      <div style={{marginTop:12}}>
        <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
          <span style={{...fieldLbl,marginRight:2}}>You buy it</span>
          <button onClick={()=>setForm({...form,buyMode:"piece"})} style={chip(!boxMode)}>by piece</button>
          <button onClick={()=>setForm({...form,buyMode:"box"})} style={chip(boxMode)}>by box</button>
        </div>
        {boxMode?(<>
          <div style={{display:"flex",gap:10}}>
            <label style={fieldWrap}><span style={fieldLbl}>Pieces per box</span>
              <input style={input} inputMode="numeric" placeholder="e.g. 10" value={form.ppb} onChange={e=>setForm({...form,ppb:e.target.value.replace(/\D/g,"")})}/></label>
            <label style={fieldWrap}><span style={fieldLbl}>Box price</span>
              <div style={moneyField}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="0" value={form.boxPrice} onChange={e=>setForm({...form,boxPrice:e.target.value})}/></div></label>
          </div>
          {ppb>0 && form.boxPrice!=="" && <div style={{fontSize:12,color:C.green,marginTop:6}}>= {rupee(buy)} per piece</div>}
        </>):(
          <label style={fieldWrap}><span style={fieldLbl}>You pay (per piece)</span>
            <div style={moneyField}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="0" value={form.buy} onChange={e=>setForm({...form,buy:e.target.value})}/></div></label>
        )}
      </div>
      <label style={{...fieldWrap,marginTop:12}}><span style={fieldLbl}>You sell at (per piece)</span>
        <div style={moneyField}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="0" value={form.sell} onChange={e=>setForm({...form,sell:e.target.value})}/></div></label>
      <div style={previewBox(unit)}><span style={{color:C.muted,fontSize:13}}>You make</span><span style={{display:"flex",alignItems:"baseline",gap:8}}><b style={{fontFamily:MONO,fontSize:24,color:unit>=0?C.green:C.amber}}>{signed(unit)}</b><span style={{fontSize:12,color:C.muted}}>per piece{pct!==null?` · ${pct>=0?"":"−"}${Math.abs(pct).toFixed(0)}%`:""}</span></span></div>
      {boxMode && ppb>0 && form.boxPrice!=="" && <div style={{fontSize:11.5,color:C.muted,marginTop:6}}>A full box of {ppb} makes <b style={{color:C.green,fontFamily:MONO}}>{signed(unit*ppb)}</b></div>}
      {!editId && <label style={{...fieldWrap,marginTop:12}}><span style={fieldLbl}>In stock now{boxMode?" (boxes)":""}</span>
        <input style={input} inputMode="numeric" placeholder="0" value={form.stockNow} onChange={e=>setForm({...form,stockNow:e.target.value.replace(/\D/g,"")})}/></label>}
      {restockMsg && <div style={{fontSize:12.5,color:C.green,marginTop:10}}>{restockMsg}</div>}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={save} disabled={!canSave} style={primaryBtn(canSave)}>{editId?"Save changes":"Save product"}</button>
        {editId&&<button onClick={()=>{setForm(blank);setEditId(null);}} style={ghostBtn}>Cancel</button>}
      </div>
    </div>

    {products.length===0?<Empty text="No products yet. Add your price list here — name, buy price, sell price — once."/>:
      Object.entries(grouped).map(([cat,list])=>(<div key={cat} style={{marginTop:22}}>
        <div style={catHead}>{cat}<span style={catCount}>{list.length}</span></div>
        {list.map(p=>{ const u=p.sell-p.buy, b=bought[p.id]||0, per=p.pieces_per_box||0, isBox=per>0, boxes=isBox?Math.round(b/per):0;
          const setBoxes=nb=>setBoughtQty(p.id,Math.max(0,nb)*per);
          return (<div key={p.id} style={{...row,flexWrap:"wrap",rowGap:8}}>
          <div style={{minWidth:0}}><div style={rowName}>{p.name} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>· {shelfOf(p)} in stock</span></div>
            <div style={rowSub}>{p.pieces_per_box?`${rupee(p.box_price)}/box of ${p.pieces_per_box} → ${rupee(p.buy)} ea → ${rupee(p.sell)}`:`${rupee(p.buy)} → ${rupee(p.sell)}`}{b>0?` · +${rupee(p.buy*b)} today`:""}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {isBox?(
              <div style={stepper}><button onClick={()=>setBoxes(boxes-1)} style={stepBtn} disabled={boxes<=0}>−</button>
                <input value={boxes||""} placeholder="0" inputMode="numeric" style={qtyInput} onChange={e=>setBoxes(parseInt(e.target.value.replace(/\D/g,""))||0)}/>
                <button onClick={()=>setBoxes(boxes+1)} style={stepBtn}>+</button></div>
            ):(
              <div style={stepper}><button onClick={()=>setBoughtQty(p.id,b-1)} style={stepBtn} disabled={b<=0}>−</button>
                <input value={b||""} placeholder="0" inputMode="numeric" style={qtyInput} onChange={e=>setBoughtQty(p.id,parseInt(e.target.value.replace(/\D/g,""))||0)}/>
                <button onClick={()=>setBoughtQty(p.id,b+1)} style={stepBtn}>+</button></div>
            )}
            <div style={{textAlign:"right"}}><div style={{fontFamily:MONO,fontSize:15,color:u>=0?C.green:C.amber,fontWeight:700}}>{signed(u)}</div></div>
            <button onClick={()=>edit(p)} style={iconBtn}>✎</button><button onClick={()=>deleteProduct(p.id)} style={iconBtn}>🗑</button>
          </div>
        </div>); })}
      </div>))}
  </div>);
}

/* ---------- Daily (cash, stock sold, dues, checkout) ---------- */
function Daily(props){
  const {products,date,setDate,inv,bought,sold,dueSold,restock,setSoldQty,sellAsDue,header,setCashLoaded,setPersonalCash,closeDay,reopenDay,deleteDay,duesTotalToday,duesPaidToday,todaysDues,dues,outstanding,addDue,addToDue,expenses,expensesTotal,addExpense,delExpense}=props;
  const [cashEdit,setCashEdit]=useState(false),[cashVal,setCashVal]=useState("");
  const [pocketEdit,setPocketEdit]=useState(false),[pocketVal,setPocketVal]=useState("");
  const [checkout,setCheckout]=useState(false);
  const [confirmDel,setConfirmDel]=useState(false);
  const [dueForm,setDueForm]=useState(false),[dn,setDn]=useState(""),[da,setDa]=useState(""),[dp,setDp]=useState("");
  const [duesListOpen,setDuesListOpen]=useState(false);
  const [expForm,setExpForm]=useState(false),[ea,setEa]=useState(""),[en,setEn]=useState("");
  const [unitMode,setUnitMode]=useState({}); // per-product piece|box for selling
  const [actionRow,setActionRow]=useState(null); // product id whose Counter/Due sheet is open
  const [dueFlow,setDueFlow]=useState(null);     // product being sold on due
  const [expandedDue,setExpandedDue]=useState({}); // product id -> whether "on due" breakdown is expanded
  const dueBreakdownByProduct=useMemo(()=>{
    const map={};
    dues.forEach(d=>{
      const topups=Array.isArray(d.topups)?d.topups:[];
      topups.forEach(t=>{
        if(t.product && t.at && dateKeyOf(t.at)===date){
          const m=map[t.product]||(map[t.product]={});
          m[d.name]=(m[d.name]||0)+Number(t.qty||0);
        }
      });
    });
    return map;
  },[dues,date]);
  const closed=!!header.closed;
  const isFuture=date>todayKey();
  const avail=p=>(inv[p.id]||0)+(bought[p.id]||0);
  const shelfOf=p=>avail(p)-(sold[p.id]||0);
  const submitDue=()=>{ const amt=parseFloat(da)||0; if(!dn.trim()||amt<=0)return; addDue({name:dn.trim(),amount:amt,phone:dp.trim()}); setDn("");setDa("");setDp("");setDueForm(false); };
  const submitExpense=()=>{ const amt=parseFloat(ea)||0; if(amt<=0)return; addExpense(amt,en.trim()); setEa("");setEn("");setExpForm(false); };

  if(closed){
    const lines=products.map(p=>{ const sd=sold[p.id]||0, left=shelfOf(p);
      return {id:p.id,name:p.name,sold:sd,left,made:(p.sell-p.buy)*sd,soldCost:p.buy*sd,leftCost:p.buy*left}; }).filter(l=>l.sold>0||l.left>0);
    const soldCost=lines.reduce((a,l)=>a+l.soldCost,0);
    const s={stockCost:header.stock_cost,saleAmount:header.sale_amount,cashSaleAmount:header.cash_sale_amount,profit:header.profit,shelfValue:header.shelf_value,
      duesTotal:header.dues_total,drawerClose:header.drawer_close,itemsSold:header.items_sold,cashLoaded:header.cash_loaded,
      expensesTotal,soldCost,duesPaidToday:header.dues_paid_today,duesGivenToday:header.dues_given_today};
    return (<div>
      <DateNav date={date} setDate={setDate}/>
      <div style={{...hero,paddingBottom:16}}>
        <span style={{color:C.muted,fontSize:13}}>Day closed · you made</span>
        <div style={heroNum(s.profit)}>{signed(s.profit)}</div>
        <div style={heroSub}><span>{s.itemsSold} pcs sold</span><span style={dot}/><span>Sales <b style={{color:C.cream,fontFamily:MONO}}>{rupee(s.saleAmount)}</b></span></div>
      </div>
      <div style={{marginTop:16}}><Summary s={s} lines={lines}/></div>
      <button onClick={reopenDay} style={{...ghostBtn,width:"100%",marginTop:14}}>Re-open this day</button>
      <button onClick={()=>{ if(confirmDel){ deleteDay(); setConfirmDel(false); } else setConfirmDel(true); }}
        style={{...ghostBtn,width:"100%",marginTop:8,color:confirmDel?C.bg:C.red,borderColor:C.red,background:confirmDel?C.red:"transparent"}}>
        {confirmDel?"Tap again to delete this day":"Delete this day"}</button>
    </div>);
  }

  return (<div>
    <DateNav date={date} setDate={setDate}/>

    <div style={{display:"flex",gap:10,marginBottom:12}}>
      <div style={{...card,flex:1,padding:14}}>
        <div style={{fontSize:12,color:C.muted}}>Counter cash</div>
        {cashEdit?(<div style={{display:"flex",gap:5,marginTop:6}}>
          <div style={{...moneyField,padding:"0 8px",flex:1}}><span style={cur}>₹</span><input autoFocus style={{...moneyInput,fontSize:15,padding:"7px 2px"}} inputMode="decimal" value={cashVal} onChange={e=>setCashVal(e.target.value)} placeholder="0"/></div>
          <button style={miniBtn} onClick={()=>{ setCashLoaded(parseFloat(cashVal)||0); setCashEdit(false); }}>✓</button>
        </div>):(<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:2}}>
          <span style={{fontFamily:MONO,fontSize:19,fontWeight:700}}>{rupee(header.cash_loaded||0)}</span>
          <button style={{...ghostBtn,padding:"5px 10px",fontSize:12}} onClick={()=>{ setCashVal(String(header.cash_loaded||"")); setCashEdit(true); }}>{header.cash_loaded?"Edit":"Set"}</button>
        </div>)}
      </div>
      <div style={{...card,flex:1,padding:14}}>
        <div style={{fontSize:12,color:C.muted}}>Personal cash</div>
        {pocketEdit?(<div style={{display:"flex",gap:5,marginTop:6}}>
          <div style={{...moneyField,padding:"0 8px",flex:1}}><span style={cur}>₹</span><input autoFocus style={{...moneyInput,fontSize:15,padding:"7px 2px"}} inputMode="decimal" value={pocketVal} onChange={e=>setPocketVal(e.target.value)} placeholder="0"/></div>
          <button style={miniBtn} onClick={()=>{ setPersonalCash(parseFloat(pocketVal)||0); setPocketEdit(false); }}>✓</button>
        </div>):(<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:2}}>
          <span style={{fontFamily:MONO,fontSize:19,fontWeight:700,color:header.personal_cash?C.amber:C.cream}}>{rupee(header.personal_cash||0)}</span>
          <button style={{...ghostBtn,padding:"5px 10px",fontSize:12}} onClick={()=>{ setPocketVal(String(header.personal_cash||"")); setPocketEdit(true); }}>{header.personal_cash?"Edit":"Set"}</button>
        </div>)}
      </div>
    </div>
    <p style={{fontSize:10.5,color:C.muted,margin:"-6px 2px 14px"}}>Personal cash = money from your pocket for stock · yours to take back</p>

    <div style={cardLabel}>Stock sold today</div>
    {products.length===0?<Empty text="Add products and load stock in the Products tab first."/>:
      products.map(p=>{ const sd=sold[p.id]||0, dsd=dueSold[p.id]||0, per=p.pieces_per_box||0, isBox=per>0;
        const mode=unitMode[p.id]||"piece", byBox=isBox&&mode==="box";
        const step=byBox?per:1;
        const setS=n=>setSoldQty(p.id, Math.min(Math.max(0,n), avail(p)));
        const shelf=shelfOf(p);
        const b=bought[p.id]||0;
        const boxesReloaded=isBox&&per>0&&b%per===0?b/per:0;
        return (<div key={p.id} style={{...row,opacity:sd>0?1:0.8}}>
          <div style={{minWidth:0}}>
            <div style={rowName}>{p.name}</div>
            <div style={rowSub}>{shelf} left{(inv[p.id]||0)>0?` · ${inv[p.id]} from yesterday`:""}{sd>0?` · sold ${sd} · ${rupee(p.sell*sd)}`:""}</div>
            {b>0&&(restock[p.id]||0)>=2&&(<div style={{...rowSub,color:C.green}}>
              {boxesReloaded>0?`reloaded stock: +${boxesReloaded} box${boxesReloaded===1?"":"es"} today`:`reloaded stock: +${b} pc today`}
            </div>)}
            {dsd>0&&(<div style={{...rowSub,color:C.amber}}>
              <span style={{cursor:"pointer"}} onClick={()=>setExpandedDue(m=>({...m,[p.id]:!m[p.id]}))}>{dsd} on due {expandedDue[p.id]?"▴":"▾"}</span>
              {expandedDue[p.id] && Object.entries(dueBreakdownByProduct[p.name]||{}).map(([name,qty])=>(
                <div key={name}>{name} — {qty}</div>
              ))}
            </div>)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {isBox&&<button onClick={()=>setUnitMode(m=>({...m,[p.id]:byBox?"piece":"box"}))} style={{...chip(byBox),fontSize:11,padding:"4px 8px"}}>{byBox?"box":"pc"}</button>}
            <div style={stepper}><button onClick={()=>setS(sd-step)} style={stepBtn} disabled={sd<=0}>−</button>
              <input value={sd||""} placeholder="0" inputMode="numeric" style={qtyInput} onChange={e=>setS(parseInt(e.target.value.replace(/\D/g,""))||0)}/>
              <button onClick={()=>setActionRow(p.id)} style={stepBtn} disabled={shelf<=0}>+</button></div>
          </div>
        </div>); })}
    {actionRow && (()=>{ const p=products.find(x=>x.id===actionRow); if(!p) return null;
      const sd=sold[p.id]||0, per=p.pieces_per_box||0, isBox=per>0, mode=unitMode[p.id]||"piece", byBox=isBox&&mode==="box", step=byBox?per:1;
      const setS=n=>setSoldQty(p.id, Math.min(Math.max(0,n), avail(p)));
      return (<div style={overlay} onClick={()=>setActionRow(null)}>
        <div style={sheet} onClick={e=>e.stopPropagation()}>
          <div style={sheetHead}><b style={{fontSize:16}}>{p.name}</b><button onClick={()=>setActionRow(null)} style={iconBtn}>✕</button></div>
          <button style={{...ghostBtn,width:"100%",marginBottom:8}} onClick={()=>{ setS(sd+step); setActionRow(null); }}>Counter</button>
          <button style={{...primaryBtn(true),width:"100%"}} onClick={()=>{ setDueFlow(p); setActionRow(null); }}>Due</button>
        </div>
      </div>); })()}
    {dueFlow && <DueSellSheet product={dueFlow} avail={shelfOf(dueFlow)} outstanding={outstanding} addDue={addDue} addToDue={addToDue} sellAsDue={sellAsDue} onClose={()=>setDueFlow(null)}/>}

    <div style={{...cardLabel,marginTop:20,display:"flex",justifyContent:"space-between"}}>
      <span>Dues given today · <span style={{color:C.amber}}>{rupee(duesTotalToday)}</span></span>
      <span onClick={()=>setDueForm(v=>!v)} style={{color:C.green,cursor:"pointer",textTransform:"none",letterSpacing:0}}>{dueForm?"Close":"+ Add due"}</span>
    </div>
    {dueForm&&<div style={{...card,marginBottom:10}}>
      <input style={input} placeholder="Customer name" value={dn} onChange={e=>setDn(e.target.value)}/>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <div style={{...moneyField,flex:1}}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="amount" value={da} onChange={e=>setDa(e.target.value)}/></div>
        <input style={{...input,flex:1}} inputMode="tel" placeholder="phone (optional)" value={dp} onChange={e=>setDp(e.target.value)}/>
      </div>
      <button style={{...primaryBtn(!!dn.trim()&&(parseFloat(da)||0)>0),marginTop:10}} onClick={submitDue}>Add due</button>
    </div>}
    {todaysDues.length>0 && (<>
      <div onClick={()=>setDuesListOpen(v=>!v)} style={{...row,padding:"10px 14px",cursor:"pointer"}}>
        <span>{todaysDues.length} dues given today · <span style={{color:C.amber,fontFamily:MONO}}>{rupee(duesTotalToday)}</span></span>
        <span style={{color:C.muted}}>{duesListOpen?"▴":"▾"}</span>
      </div>
      {duesListOpen && todaysDues.map(d=>(<div key={d.id} style={{...row,padding:"10px 14px"}}>
        <div><div style={rowName}>{d.name}</div>{d.phone&&<div style={rowSub}>{d.phone}</div>}</div>
        <div style={{fontFamily:MONO,color:C.amber,fontWeight:700}}>{rupee(d.amount)}</div>
      </div>))}
    </>)}

    <div style={{...cardLabel,marginTop:20,display:"flex",justifyContent:"space-between"}}>
      <span>Expenses today · <span style={{color:C.amber}}>{rupee(expensesTotal)}</span></span>
      <span onClick={()=>setExpForm(v=>!v)} style={{color:C.green,cursor:"pointer",textTransform:"none",letterSpacing:0}}>{expForm?"Close":"+ Add expense"}</span>
    </div>
    {expForm&&<div style={{...card,marginBottom:10}}>
      <div style={{display:"flex",gap:8}}>
        <div style={{...moneyField,flex:1}}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="amount" value={ea} onChange={e=>setEa(e.target.value)}/></div>
        <input style={{...input,flex:1}} placeholder="note (optional)" value={en} onChange={e=>setEn(e.target.value)}/>
      </div>
      <button style={{...primaryBtn((parseFloat(ea)||0)>0),marginTop:10}} onClick={submitExpense}>Add expense</button>
    </div>}
    {expenses.map(x=>(<div key={x.id} style={{...row,padding:"10px 14px"}}>
      <div><div style={rowName}>{x.note||"Expense"}</div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontFamily:MONO,color:C.amber,fontWeight:700}}>{rupee(x.amount)}</span>
        <button onClick={()=>delExpense(x.id)} style={iconBtn}>🗑</button>
      </div>
    </div>))}

    <button onClick={()=>setCheckout(true)} disabled={isFuture||products.length===0} style={{...primaryBtn(!isFuture&&products.length>0),marginTop:22,padding:"15px 0",fontSize:16}}>
      Check out — close the day
    </button>
    <p style={{color:C.muted,fontSize:11.5,textAlign:"center",marginTop:8,lineHeight:1.5}}>See the day's full summary, then confirm to close.</p>

    {checkout&&<Checkout products={products} inv={inv} bought={bought} sold={sold} dueSold={dueSold} header={header} duesTotalToday={duesTotalToday} duesPaidToday={duesPaidToday} expensesTotal={expensesTotal}
      onCancel={()=>setCheckout(false)} onConfirm={(summary)=>{ closeDay(summary); setCheckout(false); }}/>}
  </div>);
}

/* ---------- Checkout (summary + confirm) ---------- */
function Checkout({products,inv,bought,sold,dueSold,header,duesTotalToday,duesPaidToday,expensesTotal,onCancel,onConfirm}){
  const summary=useMemo(()=>computeClose({products,openingMap:inv,boughtMap:bought,soldMap:sold,dueSoldMap:dueSold,cashLoaded:Number(header.cash_loaded||0),duesTotal:duesTotalToday,duesPaidToday:Number(duesPaidToday||0),duesGivenToday:duesTotalToday,expensesTotal:Number(expensesTotal||0)}),[products,inv,bought,sold,dueSold,header,duesTotalToday,duesPaidToday,expensesTotal]);
  return (<div style={overlay}>
    <div style={sheet}>
      <div style={sheetHead}><b style={{fontSize:16}}>Day summary</b><button onClick={onCancel} style={iconBtn}>✕</button></div>
      <div style={{overflowY:"auto",flex:1}}>
        <div style={{textAlign:"center",padding:"6px 0 12px"}}>
          <div style={{color:C.muted,fontSize:12}}>You made today</div>
          <div style={heroNum(summary.profit)}>{signed(summary.profit)}</div>
          <div style={{color:C.muted,fontSize:12}}>{summary.itemsSold} pcs sold · {rupee(summary.saleAmount)} in sales</div>
        </div>
        <Summary s={summary} lines={summary.lines}/>
      </div>
      <button style={{...primaryBtn(true),marginTop:12}} onClick={()=>onConfirm(summary)}>Confirm & close day</button>
    </div>
  </div>);
}

function Summary({s, lines}){
  const setAside=(s.duesTotal||0)+(s.shelfValue||0);
  const totSold=lines?lines.reduce((a,l)=>a+l.sold,0):(s.itemsSold||0);
  const totLeft=lines?lines.reduce((a,l)=>a+l.left,0):0;
  const totMade=lines?lines.reduce((a,l)=>a+l.made,0):(s.profit||0);
  const totSoldCost=lines?lines.reduce((a,l)=>a+(l.soldCost||0),0):(s.soldCost||0);
  const totLeftCost=lines?lines.reduce((a,l)=>a+(l.leftCost||0),0):(s.shelfValue||0);
  const R=(label,val,sign)=>{
    let pre, col;
    if(sign==="-"){ pre="− "; col=C.amber; }
    else if(sign==="="){ pre="= "+(val<0?"−":""); col=val<0?C.amber:C.green; }
    else if(sign==="+"){ pre=val<0?"− ":"+ "; col=val<0?C.amber:C.cream; }
    else { pre=""; col=C.cream; }
    return (<div style={sumRow}><span style={{color:C.muted}}>{label}</span>
      <span style={{fontFamily:MONO,color:col,fontWeight:sign==="="?700:400}}>{pre}{rupee(Math.abs(val))}</span></div>);
  };
  const rule=<div style={{height:1,background:C.line,margin:"4px 0"}}/>;
  const block=(title,children)=>(<div style={{marginBottom:12}}>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:.6,color:C.muted,margin:"0 0 2px 2px"}}>{title}</div>
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:"4px 14px"}}>{children}</div></div>);
  return (<div>
    {block("CASH · what's in the drawer now", <>
      {R("Cash loaded (counter)", s.cashLoaded, "+")}
      {R("Sales collected", s.cashSaleAmount, "+")}
      {s.duesPaidToday>0 && R("Dues paid today", s.duesPaidToday, "+")}
      {s.expensesTotal>0 && R("Expenses", s.expensesTotal, "-")}
      {rule}
      {R("Amount in drawer", s.drawerClose, "=")}
    </>)}
    {block("TODAY", <>
      {R("Stock added today", s.stockCost, null)}
      {R("Dues given today", s.duesGivenToday, null)}
    </>)}
    {block("PROFIT · what you earned", <>
      {R("Total sales", s.saleAmount, "+")}
      {R("Cost of items sold", s.soldCost, "-")}
      {s.expensesTotal>0 && R("Expenses", s.expensesTotal, "-")}
      {rule}
      {R("Profit earned", s.profit, "=")}
    </>)}
    {block("SET ASIDE · not cash yet", <>
      {R("Dues (owed to you)", s.duesTotal, null)}
      {R("Stock on shelf → tomorrow", s.shelfValue, null)}
      {rule}
      {R("Total set aside", setAside, "=")}
    </>)}
    {lines && lines.length>0 && <div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:.6,color:C.muted,margin:"0 0 2px 2px"}}>BY PRODUCT</div>
      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:"6px 14px"}}>
        <div style={{display:"flex",fontSize:10.5,color:C.muted,textTransform:"uppercase",letterSpacing:.4,padding:"4px 0"}}>
          <span style={{flex:1}}>Item</span><span style={tCol}>sold</span><span style={tCol}>left</span><span style={{...tCol,width:64}}>made</span></div>
        {lines.map(l=>(<div key={l.id} style={{display:"flex",fontSize:13,padding:"6px 0",alignItems:"center"}}>
          <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name}</span>
          <span style={{...tCol,display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <span style={{fontFamily:MONO}}>{l.sold}</span>
            <span style={{fontFamily:MONO,fontSize:9.5,color:C.muted}}>{rupee(l.soldCost)}</span></span>
          <span style={{...tCol,display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
            <span style={{fontFamily:MONO,color:C.muted}}>{l.left}</span>
            <span style={{fontFamily:MONO,fontSize:9.5,color:C.muted}}>{rupee(l.leftCost)}</span></span>
          <span style={{...tCol,width:64,fontFamily:MONO,color:l.made>=0?C.green:C.amber}}>{signed(l.made)}</span></div>))}
        {rule}
        <div style={{display:"flex",fontSize:13,padding:"6px 0",fontWeight:700}}>
          <span style={{flex:1,color:C.muted}}>Totals</span>
          <span style={{...tCol,fontFamily:MONO}}>{totSold}</span><span style={{...tCol,fontFamily:MONO,color:C.muted}}>{totLeft}</span>
          <span style={{...tCol,width:64,fontFamily:MONO,color:C.green}}>{signed(totMade)}</span></div>
      </div>
      <div style={{fontSize:11.5,color:C.muted,textAlign:"center",marginTop:8}}>
        Stock worth: sold {rupee(totSoldCost)} + on shelf {rupee(totLeftCost)} = {rupee(totSoldCost+totLeftCost)}
      </div>
    </div>}
  </div>);
}

/* ---------- Sell a product on due (from Daily's product row) ---------- */
function DueSellSheet({product, avail, outstanding, addDue, addToDue, sellAsDue, onClose}){
  const maxQty=Math.max(0,avail);
  const [qty,setQty]=useState(1);
  const [picked,setPicked]=useState(null); // an existing due, or null
  const [addingNew,setAddingNew]=useState(false);
  const [nn,setNn]=useState(""),[np,setNp]=useState("");
  const [confirming,setConfirming]=useState(false);
  const q=maxQty<=0?0:Math.min(Math.max(1,qty||1),maxQty);
  const amount=product.sell*q;
  const duerName=picked?picked.name:(addingNew?nn.trim():"");
  const canContinue=q>0 && !!duerName;
  const doConfirm=async()=>{
    const meta={product:product.name,rate:product.sell,qty:q};
    if(picked) await addToDue(picked,amount,meta);
    else await addDue({name:nn.trim(),amount,phone:np.trim()},meta);
    await sellAsDue(product.id,q);
    onClose();
  };
  return (<div style={overlay} onClick={onClose}>
    <div style={sheet} onClick={e=>e.stopPropagation()}>
      <div style={sheetHead}><b style={{fontSize:16}}>Sell {product.name} on due</b><button onClick={onClose} style={iconBtn}>✕</button></div>
      <div style={{overflowY:"auto",flex:1}}>
        {!confirming ? (<>
          <div style={cardLabel}>Quantity</div>
          <div style={{...stepper,marginBottom:6}}>
            <button onClick={()=>setQty(v=>Math.max(1,(v||1)-1))} style={stepBtn} disabled={q<=1}>−</button>
            <input value={q||""} placeholder="0" inputMode="numeric" style={qtyInput} onChange={e=>setQty(parseInt(e.target.value.replace(/\D/g,""))||0)}/>
            <button onClick={()=>setQty(v=>Math.min(maxQty,(v||0)+1))} style={stepBtn} disabled={q>=maxQty}>+</button>
          </div>
          <p style={{fontSize:11.5,color:C.muted,margin:"0 0 16px 2px"}}>{maxQty} available</p>

          <div style={cardLabel}>Who owes for this?</div>
          {outstanding.map(d=>{ const on=picked?.id===d.id; return (
            <div key={d.id} onClick={()=>{setPicked(d);setAddingNew(false);}} style={{...row,cursor:"pointer",borderColor:on?C.green:C.line}}>
              <div><div style={rowName}>{d.name}</div><div style={rowSub}>owes {rupee(Number(d.amount))}</div></div>
              {on&&<span style={{color:C.green}}>✓</span>}
            </div>); })}
          <div onClick={()=>{setAddingNew(true);setPicked(null);}} style={{...row,cursor:"pointer",justifyContent:"flex-start",borderColor:addingNew?C.green:C.line}}>
            <span style={{color:C.green}}>+ Add new</span>
          </div>
          {addingNew && <div style={{...card,marginTop:8}}>
            <input style={input} placeholder="Customer name" autoFocus value={nn} onChange={e=>setNn(e.target.value)}/>
            <input style={{...input,marginTop:8}} inputMode="tel" placeholder="phone (optional)" value={np} onChange={e=>setNp(e.target.value)}/>
          </div>}
        </>) : (
          <div style={{textAlign:"center",padding:"24px 10px"}}>
            <p style={{fontSize:15,lineHeight:1.6}}>Add {rupee(amount)} to <b>{duerName}</b>'s due for {q} × {product.name}?</p>
          </div>
        )}
      </div>
      {!confirming
        ? <button style={{...primaryBtn(canContinue),marginTop:12}} disabled={!canContinue} onClick={()=>setConfirming(true)}>Continue</button>
        : (<div style={{display:"flex",gap:8,marginTop:12}}>
            <button style={{...ghostBtn,flex:1}} onClick={()=>setConfirming(false)}>No</button>
            <button style={primaryBtn(true)} onClick={doConfirm}>Yes</button>
          </div>)}
    </div>
  </div>);
}

/* ---------- shared history line (payments + topups combined, single collapse) ---------- */
function historyLine(e){
  if(e.kind==="payment") return {text:`paid ${rupee(e.amount)} · ${shortDate(e.at)}`, color:C.green};
  if(e.product) return {text:`${e.product} · ${rupee(e.rate)}/pc · qty ${e.qty} · ${shortDateTime(e.at)}`, color:C.amber};
  return {text:`+${rupee(e.amount)} · ${shortDate(e.at)}`, color:C.amber};
}
function HistoryList({payments,topups}){
  const [open,setOpen]=useState(false);
  const entries=useMemo(()=>{
    const ps=(Array.isArray(payments)?payments:[]).map(p=>({...p,kind:"payment"}));
    const ts=(Array.isArray(topups)?topups:[]).map(t=>({...t,kind:"topup"}));
    return [...ps,...ts].sort((a,b)=>new Date(a.at)-new Date(b.at));
  },[payments,topups]);
  if(!entries.length) return null;
  return (<div style={{marginTop:3}}>
    <div onClick={e=>{ e.stopPropagation(); setOpen(o=>!o); }} style={{fontSize:11,color:C.muted,cursor:"pointer"}}>
      {entries.length} {entries.length===1?"entry":"entries"} <span style={{marginLeft:2}}>{open?"▴":"▾"}</span>
    </div>
    {open && entries.map((e,i)=>{ const {text,color}=historyLine(e); return <div key={i} style={{fontSize:11,color,marginTop:3}}>{text}</div>; })}
  </div>);
}

/* ---------- Dues tab ---------- */
function DuesTab({outstanding,outstandingTotal,dues,toggleDuePaid,deleteDue,payDue,addToDue}){
  const paid=useMemo(()=>dues.filter(d=>d.paid),[dues]);
  const [pay,setPay]=useState({});
  const [armedDel,setArmedDel]=useState(null);
  const [topupOpen,setTopupOpen]=useState(null);
  const [topupAmt,setTopupAmt]=useState({});
  const getPay=d=> pay[d.id]!==undefined ? pay[d.id] : String(Number(d.amount));
  const doPay=d=>{ payDue(d, parseFloat(getPay(d))||0); setPay(p=>{ const n={...p}; delete n[d.id]; return n; }); };
  const doTopup=d=>{ const amt=parseFloat(topupAmt[d.id])||0; if(amt<=0)return; addToDue(d,amt);
    setTopupAmt(p=>{ const n={...p}; delete n[d.id]; return n; }); setTopupOpen(null); };
  const payLine=d=>{ const ps=Array.isArray(d.payments)?d.payments:[]; if(!ps.length)return null;
    return ps.map(x=>`paid ${rupee(x.amount)} · ${shortDate(x.at)}`).join("  ·  "); };
  return (<div onClick={()=>setArmedDel(null)}>
    <div style={{...hero,marginBottom:16}}>
      <span style={{color:C.muted,fontSize:13}}>Total owed to you</span>
      <div style={{fontFamily:MONO,fontSize:40,fontWeight:700,color:C.amber,margin:"6px 0"}}>{rupee(outstandingTotal)}</div>
      <div style={{color:C.muted,fontSize:12}}>{outstanding.length} {outstanding.length===1?"person owes":"people owe"} you</div>
    </div>
    <div style={cardLabel}>Outstanding</div>
    {outstanding.length===0?<Empty text="No dues outstanding. Everyone's paid up."/>:
      [...outstanding].sort((a,b)=>a.name.localeCompare(b.name)).map(d=>{ const armed=armedDel===d.id; const addingTopup=topupOpen===d.id;
        return (<div key={d.id} style={{...row,flexDirection:"column",alignItems:"stretch",gap:0}}>
        <div style={{minWidth:0}}><div style={{...rowName,whiteSpace:"normal",overflow:"visible",textOverflow:"clip",wordBreak:"break-word",display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:6}}>
            <span>{d.name}</span>
            <span style={{...rowSub,marginTop:0,fontWeight:400}}>{d.phone?d.phone+" · ":""}owes {rupee(Number(d.amount))}</span>
          </div>
          <HistoryList payments={d.payments} topups={d.topups}/></div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",rowGap:8,marginTop:10}}>
          {addingTopup ? (<>
            <span style={{fontSize:11,color:C.amber}}>add</span>
            <div style={{...moneyField,padding:"0 8px",borderColor:C.amber}}><span style={cur}>₹</span>
              <input value={topupAmt[d.id]||""} inputMode="decimal" autoFocus style={{...moneyInput,width:54,fontSize:15,padding:"9px 2px"}}
                onChange={e=>setTopupAmt(p=>({...p,[d.id]:e.target.value.replace(/[^\d.]/g,"")}))}
                onKeyDown={e=>{ if(e.key==="Enter") doTopup(d); }}/></div>
            <button onClick={()=>doTopup(d)} style={{...chip(false),borderColor:C.amber,color:C.amber,whiteSpace:"nowrap"}}>Add</button>
            <button onClick={e=>{ e.stopPropagation(); setTopupOpen(null); setTopupAmt(p=>{ const n={...p}; delete n[d.id]; return n; }); }}
              style={iconBtn}>✕</button>
          </>) : (<>
            <button onClick={e=>{ e.stopPropagation(); setTopupOpen(d.id); }}
              title="Add more to this due" style={{...iconBtn,color:C.amber,borderColor:C.amber}}>+</button>
            <span style={{fontSize:11,color:C.muted}}>pay</span>
            <div style={{...moneyField,padding:"0 8px"}}><span style={cur}>₹</span>
              <input value={getPay(d)} inputMode="decimal" style={{...moneyInput,width:54,fontSize:15,padding:"9px 2px"}}
                onChange={e=>setPay(p=>({...p,[d.id]:e.target.value.replace(/[^\d.]/g,"")}))}/></div>
            <button onClick={()=>doPay(d)} style={{...chip(false),borderColor:C.green,color:C.green,whiteSpace:"nowrap"}}>Mark paid</button>
            <button onClick={e=>{ e.stopPropagation(); if(armed){ deleteDue(d.id); setArmedDel(null); } else setArmedDel(d.id); }}
              style={{...iconBtn,color:armed?C.bg:C.red,background:armed?C.red:"transparent",borderColor:C.red}}>{armed?"✓":"🗑"}</button>
          </>)}
        </div>
      </div>); })}
    {paid.length>0&&<><div style={{...cardLabel,marginTop:22}}>Cleared</div>
      {[...paid].sort((a,b)=>a.name.localeCompare(b.name)).map(d=>(<div key={d.id} style={{...row,opacity:0.7,flexDirection:"column",alignItems:"stretch",gap:0}}>
        <div style={{minWidth:0}}><div style={{...rowName,whiteSpace:"normal",overflow:"visible",textOverflow:"clip",wordBreak:"break-word"}}>{d.name}</div>{payLine(d)&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{payLine(d)}</div>}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10}}><span style={{fontFamily:MONO,color:C.muted}}>cleared</span>
          <button onClick={()=>toggleDuePaid(d.id,false)} style={iconBtn}>↺</button>
          <button onClick={()=>deleteDue(d.id)} style={iconBtn}>🗑</button></div>
      </div>))}</>}
  </div>);
}

/* ---------- Payables tab (money you owe suppliers) ---------- */
function PayablesTab({outstanding,outstandingTotal,payables,addPayable,toggleDuePaid,deleteDue,payDue,addToDue}){
  const paid=useMemo(()=>payables.filter(d=>d.paid),[payables]);
  const [addForm,setAddForm]=useState(false),[pn,setPn]=useState(""),[pa,setPa]=useState(""),[pp,setPp]=useState("");
  const [pay,setPay]=useState({});
  const [armedDel,setArmedDel]=useState(null);
  const [topupOpen,setTopupOpen]=useState(null);
  const [topupAmt,setTopupAmt]=useState({});
  const getPay=d=> pay[d.id]!==undefined ? pay[d.id] : String(Number(d.amount));
  const doPay=d=>{ payDue(d, parseFloat(getPay(d))||0); setPay(p=>{ const n={...p}; delete n[d.id]; return n; }); };
  const doTopup=d=>{ const amt=parseFloat(topupAmt[d.id])||0; if(amt<=0)return; addToDue(d,amt);
    setTopupAmt(p=>{ const n={...p}; delete n[d.id]; return n; }); setTopupOpen(null); };
  const payLine=d=>{ const ps=Array.isArray(d.payments)?d.payments:[]; if(!ps.length)return null;
    return ps.map(x=>`paid ${rupee(x.amount)} · ${shortDate(x.at)}`).join("  ·  "); };
  const submitAdd=()=>{ const amt=parseFloat(pa)||0; if(!pn.trim()||amt<=0)return; addPayable({name:pn.trim(),amount:amt,phone:pp.trim()}); setPn("");setPa("");setPp("");setAddForm(false); };
  return (<div onClick={()=>setArmedDel(null)}>
    <div style={{...hero,marginBottom:16}}>
      <span style={{color:C.muted,fontSize:13}}>Total you owe</span>
      <div style={{fontFamily:MONO,fontSize:40,fontWeight:700,color:C.amber,margin:"6px 0"}}>{rupee(outstandingTotal)}</div>
      <div style={{color:C.muted,fontSize:12}}>{outstanding.length} {outstanding.length===1?"supplier":"suppliers"} you owe</div>
    </div>
    <div style={{...cardLabel,display:"flex",justifyContent:"space-between"}}>
      <span>Payables</span>
      <span onClick={e=>{ e.stopPropagation(); setAddForm(v=>!v); }} style={{color:C.green,cursor:"pointer",textTransform:"none",letterSpacing:0}}>{addForm?"Close":"+ Add payable"}</span>
    </div>
    {addForm&&<div style={{...card,marginBottom:10}} onClick={e=>e.stopPropagation()}>
      <input style={input} placeholder="Supplier name" value={pn} onChange={e=>setPn(e.target.value)}/>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <div style={{...moneyField,flex:1}}><span style={cur}>₹</span><input style={moneyInput} inputMode="decimal" placeholder="amount" value={pa} onChange={e=>setPa(e.target.value)}/></div>
        <input style={{...input,flex:1}} inputMode="tel" placeholder="phone (optional)" value={pp} onChange={e=>setPp(e.target.value)}/>
      </div>
      <button style={{...primaryBtn(!!pn.trim()&&(parseFloat(pa)||0)>0),marginTop:10}} onClick={submitAdd}>Add payable</button>
    </div>}
    <div style={cardLabel}>Outstanding</div>
    {outstanding.length===0?<Empty text="No payables outstanding. You're all settled up."/>:
      [...outstanding].sort((a,b)=>a.name.localeCompare(b.name)).map(d=>{ const armed=armedDel===d.id; const addingTopup=topupOpen===d.id;
        return (<div key={d.id} style={{...row,flexDirection:"column",alignItems:"stretch",gap:0}}>
        <div style={{minWidth:0}}><div style={{...rowName,whiteSpace:"normal",overflow:"visible",textOverflow:"clip",wordBreak:"break-word",display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:6}}>
            <span>{d.name}</span>
            <span style={{...rowSub,marginTop:0,fontWeight:400}}>{d.phone?d.phone+" · ":""}you owe {rupee(Number(d.amount))}</span>
          </div>
          <HistoryList payments={d.payments} topups={d.topups}/></div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",rowGap:8,marginTop:10}}>
          {addingTopup ? (<>
            <span style={{fontSize:11,color:C.amber}}>add</span>
            <div style={{...moneyField,padding:"0 8px",borderColor:C.amber}}><span style={cur}>₹</span>
              <input value={topupAmt[d.id]||""} inputMode="decimal" autoFocus style={{...moneyInput,width:54,fontSize:15,padding:"9px 2px"}}
                onChange={e=>setTopupAmt(p=>({...p,[d.id]:e.target.value.replace(/[^\d.]/g,"")}))}
                onKeyDown={e=>{ if(e.key==="Enter") doTopup(d); }}/></div>
            <button onClick={()=>doTopup(d)} style={{...chip(false),borderColor:C.amber,color:C.amber,whiteSpace:"nowrap"}}>Add</button>
            <button onClick={e=>{ e.stopPropagation(); setTopupOpen(null); setTopupAmt(p=>{ const n={...p}; delete n[d.id]; return n; }); }}
              style={iconBtn}>✕</button>
          </>) : (<>
            <button onClick={e=>{ e.stopPropagation(); setTopupOpen(d.id); }}
              title="Add more to this payable" style={{...iconBtn,color:C.amber,borderColor:C.amber}}>+</button>
            <span style={{fontSize:11,color:C.muted}}>pay</span>
            <div style={{...moneyField,padding:"0 8px"}}><span style={cur}>₹</span>
              <input value={getPay(d)} inputMode="decimal" style={{...moneyInput,width:54,fontSize:15,padding:"9px 2px"}}
                onChange={e=>setPay(p=>({...p,[d.id]:e.target.value.replace(/[^\d.]/g,"")}))}/></div>
            <button onClick={()=>doPay(d)} style={{...chip(false),borderColor:C.green,color:C.green,whiteSpace:"nowrap"}}>Mark paid</button>
            <button onClick={e=>{ e.stopPropagation(); if(armed){ deleteDue(d.id); setArmedDel(null); } else setArmedDel(d.id); }}
              style={{...iconBtn,color:armed?C.bg:C.red,background:armed?C.red:"transparent",borderColor:C.red}}>{armed?"✓":"🗑"}</button>
          </>)}
        </div>
      </div>); })}
    {paid.length>0&&<><div style={{...cardLabel,marginTop:22}}>Cleared</div>
      {[...paid].sort((a,b)=>a.name.localeCompare(b.name)).map(d=>(<div key={d.id} style={{...row,opacity:0.7,flexDirection:"column",alignItems:"stretch",gap:0}}>
        <div style={{minWidth:0}}><div style={{...rowName,whiteSpace:"normal",overflow:"visible",textOverflow:"clip",wordBreak:"break-word"}}>{d.name}</div>{payLine(d)&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{payLine(d)}</div>}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10}}><span style={{fontFamily:MONO,color:C.muted}}>cleared</span>
          <button onClick={()=>toggleDuePaid(d.id,false)} style={iconBtn}>↺</button>
          <button onClick={()=>deleteDue(d.id)} style={iconBtn}>🗑</button></div>
      </div>))}</>}
  </div>);
}

/* ---------- shared ---------- */
function DateNav({date,setDate}){ return (<div style={dateNav}>
  <button onClick={()=>setDate(shiftDate(date,-1))} style={iconBtn}>‹</button>
  <span style={{fontWeight:600,fontSize:15}}>{date===todayKey()?`Today · ${fullDate(date)}`:fullDate(date)}</span>
  <button onClick={()=>setDate(shiftDate(date,1))} disabled={date>=todayKey()} style={{...iconBtn,opacity:date>=todayKey()?0.3:1}}>›</button>
</div>); }
function Header({onSignOut}){ return (<header style={headerS}>
  <div style={{display:"flex",alignItems:"center",gap:11}}><img src="./icon.svg" width="34" height="34" style={{borderRadius:11}} alt=""/>
    <div><h1 style={wordmark}>Bean Cafe</h1><p style={tagline}>what your stock makes you</p></div></div>
  {onSignOut&&<button onClick={onSignOut} style={{...ghostBtn,padding:"7px 12px",fontSize:12}}>Sign out</button>}
</header>); }
function Empty({text}){ return <div style={{textAlign:"center",padding:"36px 24px",color:C.muted}}><p style={{fontSize:14,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>{text}</p></div>; }

/* ---------- styles ---------- */
const wrap={fontFamily:SANS,background:C.bg,color:C.cream,maxWidth:480,margin:"0 auto",minHeight:"100vh",padding:"22px 18px calc(60px + env(safe-area-inset-bottom))",display:"flex",flexDirection:"column"};
const headerS={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18};
const wordmark={fontSize:19,fontWeight:700,letterSpacing:-.3,margin:0};
const tagline={fontSize:11.5,color:C.muted,margin:"1px 0 0"};
const tabRow={display:"flex",gap:6,background:C.surface,padding:4,borderRadius:13,marginBottom:18};
const tabBtn=on=>({flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:SANS,background:on?C.green:"transparent",color:on?C.bg:C.muted,transition:"all .15s"});
const card={background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:16};
const cardLabel={fontSize:12,fontWeight:700,letterSpacing:.6,textTransform:"uppercase",color:C.muted,marginBottom:12};
const input={width:"100%",background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:"11px 13px",color:C.cream,fontSize:15,fontFamily:SANS,outline:"none"};
const chip=on=>({padding:"6px 12px",borderRadius:999,fontSize:12.5,cursor:"pointer",fontFamily:SANS,fontWeight:500,border:`1px solid ${on?C.green:C.line}`,background:on?C.green:"transparent",color:on?C.bg:C.muted});
const miniBtn={background:C.green,border:"none",borderRadius:8,minWidth:34,color:C.bg,cursor:"pointer",fontSize:14};
const fieldWrap={flex:1,display:"flex",flexDirection:"column",gap:6};
const fieldLbl={fontSize:12,color:C.muted};
const moneyField={display:"flex",alignItems:"center",background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:"0 12px"};
const cur={color:C.muted,fontSize:15,fontFamily:MONO};
const moneyInput={flex:1,width:"100%",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:17,fontFamily:MONO,padding:"11px 6px"};
const previewBox=u=>({display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,padding:"11px 14px",borderRadius:11,background:u>=0?"rgba(87,208,138,0.10)":"rgba(224,146,90,0.10)",border:`1px solid ${u>=0?"rgba(87,208,138,0.25)":"rgba(224,146,90,0.25)"}`});
const primaryBtn=on=>({flex:1,padding:"12px 0",borderRadius:11,border:"none",cursor:on?"pointer":"not-allowed",background:on?C.green:C.surface2,color:on?C.bg:C.muted,fontSize:14.5,fontWeight:700,fontFamily:SANS,opacity:on?1:.7,width:"100%"});
const ghostBtn={padding:"12px 16px",borderRadius:11,border:`1px solid ${C.line}`,background:"transparent",color:C.muted,fontSize:14,fontFamily:SANS,cursor:"pointer"};
const catHead={display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:700,color:C.cream,marginBottom:8,paddingLeft:2};
const catCount={fontSize:11,color:C.muted,background:C.surface,borderRadius:999,padding:"1px 8px"};
const row={display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,padding:"12px 14px",marginBottom:8};
const rowName={fontSize:15,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"};
const rowSub={fontSize:12,color:C.muted,marginTop:2};
const iconBtn={minWidth:32,height:32,padding:"0 8px",display:"grid",placeItems:"center",borderRadius:9,border:`1px solid ${C.line}`,background:"transparent",color:C.muted,cursor:"pointer",fontSize:15};
const dateNav={display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,padding:"8px 12px",marginBottom:14};
const hero={textAlign:"center",padding:"22px 18px",borderRadius:18,background:`radial-gradient(120% 140% at 50% 0%, ${C.surface2} 0%, ${C.surface} 70%)`,border:`1px solid ${C.line}`};
const heroNum=p=>({fontFamily:MONO,fontSize:44,fontWeight:700,lineHeight:1.1,margin:"6px 0 8px",color:p>=0?C.green:C.amber,textShadow:p>=0?`0 0 30px ${C.green}44`:"none"});
const heroSub={display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:12.5,color:C.muted};
const dot={width:3,height:3,borderRadius:999,background:C.muted};
const sumRow={display:"flex",justifyContent:"space-between",fontSize:13.5,padding:"9px 0"};
const tCol={width:44,textAlign:"right"};
const stepper={display:"flex",alignItems:"center",gap:4,background:C.bg,border:`1px solid ${C.line}`,borderRadius:10,padding:3};
const stepBtn={width:30,height:30,display:"grid",placeItems:"center",borderRadius:7,border:"none",background:C.surface2,color:C.cream,cursor:"pointer",fontSize:16};
const qtyInput={width:40,textAlign:"center",background:"transparent",border:"none",outline:"none",color:C.cream,fontSize:16,fontFamily:MONO};
const foot={marginTop:"auto",paddingTop:26,fontSize:11.5,color:C.muted,lineHeight:1.6,textAlign:"center"};
const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:50};
const sheet={background:C.bg,border:`1px solid ${C.line}`,borderRadius:"20px 20px 0 0",padding:18,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"};
const sheetHead={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10};

try{ createRoot(document.getElementById("root")).render(<App/>); }
catch(e){ document.getElementById("root").innerHTML='<pre style="color:#E0925A;font-family:monospace;padding:20px;white-space:pre-wrap">Startup error:\n'+String(e&&e.stack||e)+'</pre>'; }
window.addEventListener("error",ev=>{ const r=document.getElementById("root"); if(r&&r.textContent.indexOf("Warming up")>=0){ r.innerHTML='<pre style="color:#E0925A;font-family:monospace;padding:20px;white-space:pre-wrap">Error:\n'+String(ev.message)+'</pre>'; } });
