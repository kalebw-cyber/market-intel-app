"use client";
import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import ApiLoggerWidget from "./components/ApiLoggerWidget";
import { ASSETS, ASSET_KEYWORDS, ALL_CATEGORIES, SIGNAL_ALLOWED_CATS, MOCK_NEWS, SECTOR_DATA, TOPIC_TAGS } from "./src/data/marketData";
import { HI_KW, ERN_KW, MOVE_T, SC, AC, RC, VC, EVC, CONF_C } from "./src/styles/marketConstants";
import { safePrompt, extractSource, displaySymbol, getAssetNews, detectEarnings, detectMarketMovement, detectTopics, generateEarningsInsight, explainMarketMovement, normalizeNewsItem, newsTokenSet, newsSimilarity, dedupeNewsArticles, getMarketSentiment, getFearGreed, detectMarketRegime, categoryAverage, textScore, clamp, classifyNewsQuality, webIntelligence, technicalStructure, portfolioRiskLayer, assetMarketProfile, institutionalDecision, generateNarrative, enhanceOpportunity, computeAssetRisk, generateAssetWhyMatters, generateAssetShortTerm, generateAssetLongTerm, generateOppWhyExists, isHighImpact, timeAgo, fmtCD, getBenchmarkSymbols } from "./src/lib/marketLogic";
import { requestBatcher } from "./src/lib/requestBatcher";

/* ====================== DATA =========================================== */

let EARNINGS_CAL=[];
const MKT_EVENTS_DEFAULT=[{date:"-",type:"macro",title:"Loading economic calendar...",impact:"Medium"}];
let MKT_EVENTS=MKT_EVENTS_DEFAULT;


/* ====================== STYLE CONSTANTS =============================== */


/* == API KEYS ========================================================== */

// Finnhub endpoints (CORS-enabled, browser-safe)
// General news  -> GET /api/v1/news?category=general&token=KEY
// Company news  -> GET /api/v1/company-news?symbol=X&from=YYYY-MM-DD&to=YYYY-MM-DD&token=KEY
// NewsAPI (server-only, use via your Next.js route.ts proxy)

/* ====================== LIVE NEWS HELPERS ============================== */
// Global theme accessor - set by MarketAnalyzer, read by all components
let _theme="dark";
function th(dark,light){return _theme==="dark"?dark:light;}
function finnhubUrl(endpoint,params={}){
  const qs=new URLSearchParams({endpoint});
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)qs.set(k,String(v));});
  return `/api/finnhub?${qs.toString()}`;
}

function Spinner(){return <span style={{display:"inline-block",width:14,height:14,border:"2px solid #F59E0B33",borderTopColor:"#F59E0B",borderRadius:"50%",animation:"spin 0.7s linear infinite",verticalAlign:"middle"}}/>;}
function PulsingDot({color="#10B981"}){return(<span style={{position:"relative",display:"inline-block",width:8,height:8,flexShrink:0}}><span style={{position:"absolute",inset:0,borderRadius:"50%",background:color,animation:"ping 1.4s ease-in-out infinite",opacity:0.5}}/><span style={{position:"absolute",inset:0,borderRadius:"50%",background:color}}/></span>);}
function Pill({label,color,bg,border}){return <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color,background:bg||`${color}18`,border:`1px solid ${border||color+"40"}`,borderRadius:4,padding:"2px 6px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;}
function getAssetPriceStatus(asset,{queued=false,limited=false}={}){
  if(limited)return{label:"API Limit",color:"#EF4444",detail:"Price updates are paused until the API window resets."};
  if(queued)return{label:"Loading",color:"#F59E0B",detail:"Waiting for the quote queue."};
  if(asset?._live){const age=asset._fetchedAt?Math.max(0,Math.floor((Date.now()-asset._fetchedAt)/60000)):0;return{label:age>0?`Live ${age}m`:"Live",color:"#10B981",detail:"Updated from Finnhub."};}
  if(asset?._fetchedAt)return{label:"Cached",color:"#60A5FA",detail:"Using a saved quote until refresh completes."};
  return{label:"Demo/Fallback",color:th("#6B7280","#4B5563"),detail:"Fallback price; analyze with caution."};
}
function PriceStatusBadge({status,size="sm"}){if(!status)return null;const small=size==="xs";return(<span title={status.detail||status.label} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:small?7:8,color:status.color,background:`${status.color}14`,border:`1px solid ${status.color}35`,borderRadius:4,padding:small?"2px 5px":"2px 7px",letterSpacing:1,textTransform:"uppercase",fontWeight:800,whiteSpace:"nowrap"}}><span style={{width:5,height:5,borderRadius:3,background:status.color,display:"inline-block",flexShrink:0}}/>{status.label}</span>);}
function FactorStatusBadge({status}){const map={Pass:{color:"#10B981",title:"Data loaded and logic check can run normally"},Warning:{color:"#F59E0B",title:"Data exists but is estimated, incomplete, stale, or low-confidence"},Fail:{color:"#EF4444",title:"Required data is missing, failed, or using fallback"},Info:{color:"#60A5FA",title:"Reference information"}};const m=map[status]||map.Info;return <span title={m.title} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:7,fontWeight:900,letterSpacing:1.1,textTransform:"uppercase",borderRadius:4,padding:"2px 6px",color:m.color,background:`${m.color}14`,border:`1px solid ${m.color}35`,whiteSpace:"nowrap"}}><span style={{width:4,height:4,borderRadius:3,background:m.color,display:"inline-block",flexShrink:0}}/>{status||"Info"}</span>;}
function Icon({name,size=16,color="currentColor",stroke=2}){const common={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:color,strokeWidth:stroke,strokeLinecap:"round",strokeLinejoin:"round",style:{display:"block"}};if(name==="bell")return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;if(name==="sun")return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;if(name==="moon")return <svg {...common}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z"/></svg>;if(name==="refresh")return <svg {...common}><path d="M21 12a9 9 0 0 1-15.1 6.6"/><path d="M3 12A9 9 0 0 1 18.1 5.4"/><path d="M3 18h4v-4"/><path d="M21 6h-4v4"/></svg>;if(name==="chat")return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>;if(name==="close")return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>;if(name==="send")return <svg {...common}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>;if(name==="reset")return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></svg>;if(name==="star")return <svg {...common} fill={color==="currentColor"?"none":color}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>;if(name==="logo")return <svg {...common} viewBox="0 0 28 28"><path d="M4 20V8l6 8 4-8 4 8 6-8v12"/><path d="M5 23h18"/><path d="M8 5h12"/></svg>;return null;}
function SectionLabel({children}){return <div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>{children}</div>;}
function OutlookBox({icon,label,text}){return(<div style={{background:"#080810",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,padding:"11px 14px"}}><SectionLabel>{icon} {label}</SectionLabel><div style={{color:th("#9CA3AF","#4B5563"),fontSize:11,lineHeight:1.7}}>{text}</div></div>);}
function SourceBadge({source,link}){if(!source)return null;return(<a href={link||"#"} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:th("#4B5563","#6B7280"),background:th("#0D1117","#F3F4F6"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:3,padding:"2px 7px",textDecoration:"none",letterSpacing:0.5,whiteSpace:"nowrap",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#F59E0B";e.currentTarget.style.borderColor="rgba(245,158,11,0.3)";}} onMouseLeave={e=>{e.currentTarget.style.color="#4B5563";e.currentTarget.style.borderColor="#111827";}}>{source} Open</a>);}
function NewsCardSkeleton(){return(<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:8,padding:18,height:200,display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:8}}>{[80,60,50].map(w=>(<div key={w} style={{height:18,width:w,background:th("#111827","#E5E7EB"),borderRadius:4,animation:"shimmer 1.5s ease-in-out infinite"}}/>))}</div><div style={{height:16,background:th("#111827","#E5E7EB"),borderRadius:4,animation:"shimmer 1.5s 0.1s ease-in-out infinite"}}/><div style={{height:16,background:th("#111827","#E5E7EB"),borderRadius:4,width:"88%",animation:"shimmer 1.5s 0.15s ease-in-out infinite"}}/><div style={{height:11,background:th("#0D1117","#F3F4F6"),borderRadius:4,animation:"shimmer 1.5s 0.2s ease-in-out infinite"}}/><div style={{height:11,background:th("#0D1117","#F3F4F6"),borderRadius:4,width:"70%",animation:"shimmer 1.5s 0.25s ease-in-out infinite"}}/></div>);}
function NotificationBell({notifications,onRemove,onClear}){
  const [open,setOpen]=useState(false);
  const unread=notifications.length;
  return(<div style={{position:"relative"}}>
    <button aria-label="Notifications" title="Notifications" onClick={()=>setOpen(p=>!p)} style={{position:"relative",width:32,height:30,background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,padding:0,cursor:"pointer",color:th("#6B7280","#4B5563"),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>
      <Icon name="bell" size={15}/>{unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#EF4444",color:"#fff",fontSize:8,fontWeight:700,borderRadius:10,padding:"1px 4px",minWidth:14,textAlign:"center",lineHeight:"14px"}}>{unread>99?"99+":unread}</span>}
    </button>
    {open&&(<>
      <div style={{position:"fixed",inset:0,zIndex:998}} onClick={()=>setOpen(false)}/>
      <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:320,maxHeight:400,background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",zIndex:999,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}>
          <span style={{fontSize:11,fontWeight:700,color:th("#F1F5F9","#111827"),letterSpacing:1}}>NOTIFICATIONS</span>
          <div style={{display:"flex",gap:8}}>
            {unread>0&&<button onClick={onClear} style={{fontSize:9,color:th("#4B5563","#6B7280"),background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Clear all</button>}
            <button aria-label="Close notifications" onClick={()=>setOpen(false)} style={{width:24,height:24,color:th("#4B5563","#6B7280"),background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={13}/></button>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1,maxHeight:340}}>
          {notifications.length===0?(<div style={{padding:"32px 14px",textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",marginBottom:8,color:th("#374151","#9CA3AF")}}><Icon name="bell" size={22}/></div><div style={{fontSize:11,color:th("#4B5563","#6B7280")}}>No notifications yet</div></div>):(
            [...notifications].reverse().map(n=>{
              const colors={alert:{bg:"rgba(245,158,11,0.06)",dot:"#F59E0B"},success:{bg:"rgba(16,185,129,0.06)",dot:"#10B981"},earnings:{bg:"rgba(245,158,11,0.06)",dot:"#F59E0B"},info:{bg:"rgba(107,114,128,0.04)",dot:"#6B7280"}};
              const s=colors[n.type]||colors.info;
              return(<div key={n.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderBottom:`1px solid ${th("#0D1117","#E5E7EB")}`,background:s.bg,cursor:"pointer",transition:"background 0.1s"}} onClick={()=>onRemove(n.id)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background=s.bg}>
                <div style={{width:6,height:6,borderRadius:3,background:s.dot,marginTop:5,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:th("#D1D5DB","#1F2937"),lineHeight:1.5}}>{n.message}</div>
                  <div style={{fontSize:9,color:th("#374151","#9CA3AF"),marginTop:3}}>{new Date(n.id).toLocaleTimeString()}</div>
                </div>
                <button aria-label="Dismiss notification" onClick={e=>{e.stopPropagation();onRemove(n.id);}} style={{width:22,height:22,color:th("#374151","#9CA3AF"),background:"transparent",border:"none",cursor:"pointer",padding:2,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={12}/></button>
              </div>);
            })
          )}
        </div>
      </div>
    </>)}
  </div>);
}
function HighImpactModal({article,onClose}){if(!article)return null;return(<div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",background:th("rgba(0,0,0,0.88)","rgba(0,0,0,0.45)"),backdropFilter:"blur(8px)"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"#0D0D0D",border:"1px solid #EF4444",borderRadius:10,maxWidth:540,width:"92%",padding:28,boxShadow:"0 0 60px rgba(239,68,68,0.25)",animation:"fadeIn 0.2s ease"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><PulsingDot color="#EF4444"/><span style={{color:"#EF4444",fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>High-Impact Alert</span>{article.source&&<SourceBadge source={article.source} link={article.link}/>}</div><div style={{color:th("#F1F5F9","#111827"),fontSize:15,fontWeight:700,lineHeight:1.5,marginBottom:12}}>{article.title}</div><div style={{color:th("#9CA3AF","#4B5563"),fontSize:12,lineHeight:1.7,marginBottom:20}}>{article.snippet}</div><div style={{display:"flex",gap:10}}><a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{flex:1,textAlign:"center",padding:"8px 0",background:"rgba(239,68,68,0.15)",border:"1px solid #EF4444",borderRadius:6,color:"#EF4444",fontSize:12,textDecoration:"none"}}>Read Full Article</a><button onClick={onClose} style={{flex:1,padding:"8px 0",background:"transparent",border:"1px solid #374151",borderRadius:6,color:th("#9CA3AF","#4B5563"),fontSize:12,cursor:"pointer"}}>Dismiss</button></div></div></div>);}

/* ====================== ASSET DETAIL MODAL (UNIFIED) ===================
   Reusable across Market, Watchlist, Search, and Opportunities
========================================================================== */
function AssetDetailModal({symbol, news, analyses, watchlist, onToggleWatch, onAnalyze, analyzing, onClose, onQuickAnalyze, quickAnalyzing}) {
  useEffect(()=>{
    if(!symbol)return;
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h);
    document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",h);document.body.style.overflow="";};
  },[symbol,onClose]);

  // Auto-fetch & analyze when modal opens and no related articles exist
  const autoTriggeredRef=useRef(new Set());
  useEffect(()=>{
    if(!symbol)return;
    const asset=ASSETS.find(a=>a.symbol===symbol);
    if(!asset)return;
    const related=getAssetNews(symbol,news);
    if(related.length===0&&!quickAnalyzing&&!autoTriggeredRef.current.has(symbol)){
      autoTriggeredRef.current.add(symbol);
      onQuickAnalyze(symbol);
    }
  },[symbol,news,quickAnalyzing,onQuickAnalyze]);

  if(!symbol)return null;
  const asset=ASSETS.find(a=>a.symbol===symbol);
  if(!asset)return null;

  const inWL=watchlist.includes(symbol);
  const isMover=detectMarketMovement(asset);
  const allRelated=getAssetNews(symbol,news);
  const hiAlerts=allRelated.filter(isHighImpact);
  const earningsArticle=allRelated.find(n=>detectEarnings(n));
  const earningsInsight=earningsArticle?generateEarningsInsight(earningsArticle):null;
  const movement=isMover?explainMarketMovement(asset,news):null;

  // Build analysis state for each related article
  const relatedWithStatus=allRelated.map(article=>{
    const idx=news.indexOf(article);
    const analysis=idx>=0?analyses[idx]:null;
    return{article,index:idx,analysis,isAnalyzed:!!(analysis?.affectedAssets?.includes(symbol))};
  });

  const analyzedRelated=relatedWithStatus.filter(r=>r.isAnalyzed);
  const sCounts=analyzedRelated.reduce((acc,{analysis})=>{if(analysis?.sentiment)acc[analysis.sentiment]=(acc[analysis.sentiment]||0)+1;return acc;},{});
  const dominant=Object.entries(sCounts).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];
  const action=dominant==="Bullish"?"BUY":dominant==="Bearish"?"SELL":dominant?"HOLD":null;
  const sc2=dominant?SC[dominant]:null;const ac2=action?AC[action]:null;
  const riskLevel=computeAssetRisk(asset,dominant,isMover);const rc2=RC[riskLevel];const priceStatus=getAssetPriceStatus(asset);

  return(
    <div style={{position:"fixed",inset:0,zIndex:9994,display:"flex",alignItems:"center",justifyContent:"center",background:th("rgba(0,0,0,0.88)","rgba(0,0,0,0.45)"),backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:th("#070B14","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:12,maxWidth:700,width:"94%",maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeIn 0.2s ease",boxShadow:"0 0 80px rgba(0,0,0,0.7)"}}>

        {/* -- STICKY HEADER ----------------------------------- */}
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${th("#111827","#E5E7EB")}`,background:"linear-gradient(90deg,rgba(245,158,11,0.06),transparent 60%)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"8px 16px",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:700,color:"#F59E0B",letterSpacing:1}}>{symbol}</div>
              </div>
              <div>
                <div style={{color:th("#F1F5F9","#111827"),fontWeight:700,fontSize:14,marginBottom:6}}>{asset.name}</div>
                <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:16,fontWeight:700,color:th("#F1F5F9","#111827")}}>${asset.price.toFixed(2)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:asset.change>=0?"#10B981":"#EF4444"}}>{asset.change>=0?"+":"-"} {Math.abs(asset.change).toFixed(2)}%</span>
                  <PriceStatusBadge status={priceStatus}/>
                  <Pill label={asset.category} color="#4B5563"/>
                  {isMover&&<Pill label=" MOVER" color="#EF4444"/>}
                  {earningsInsight&&<Pill label=" EARNINGS" color="#F59E0B"/>}
                  {hiAlerts.length>0&&<span style={{fontSize:9,color:"#EF4444",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:4,padding:"2px 7px",fontWeight:700,letterSpacing:1}}> {hiAlerts.length} HIGH IMPACT</span>}
                  {allRelated.length>0&&<span style={{fontSize:9,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:4,padding:"2px 7px"}}>{allRelated.length} live article{allRelated.length!==1?"s":""}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <button onClick={()=>onToggleWatch(symbol)} style={{padding:"6px 14px",background:inWL?"rgba(245,158,11,0.15)":"rgba(245,158,11,0.07)",border:`1px solid ${inWL?"rgba(245,158,11,0.4)":"rgba(245,158,11,0.2)"}`,borderRadius:6,color:"#F59E0B",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.22)"} onMouseLeave={e=>e.currentTarget.style.background=inWL?"rgba(245,158,11,0.15)":"rgba(245,158,11,0.07)"}>
                {inWL?"In Watchlist":"Add to Watchlist"}
              </button>
              {action&&<span style={{fontSize:13,fontWeight:700,letterSpacing:2,color:ac2.text,background:ac2.bg,border:`1px solid ${ac2.border}50`,borderRadius:6,padding:"5px 12px"}}>{action}</span>}
              <button onClick={onClose} style={{background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,color:th("#6B7280","#4B5563"),fontSize:16,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#6B7280"}>x</button>
            </div>
          </div>
        </div>

        {/* -- SCROLLABLE CONTENT ------------------------------ */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Key Metrics */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[{label:"Risk Level",val:riskLevel,color:rc2.text,bg:rc2.bg},{label:"AI Sentiment",val:dominant||"Unanalyzed",color:sc2?.text||"#4B5563",bg:sc2?.bg||"transparent"},{label:"Today's Move",val:`${asset.change>0?"+":""}${asset.change}%`,color:asset.change>=0?"#10B981":"#EF4444",bg:asset.change>=0?"rgba(16,185,129,0.08)":"rgba(239,68,68,0.08)"}].map(m=>(
              <div key={m.label} style={{background:m.bg||"#0A0A0F",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,padding:"10px 14px"}}>
                <div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{m.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:m.color}}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Why This Matters */}
          <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:14}}>
            <SectionLabel> Why This Matters</SectionLabel>
            <div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.8}}>{generateAssetWhyMatters(asset,dominant,isMover,news)}</div>
          </div>

          {/* Outlook */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <OutlookBox icon="" label="Short-Term Outlook" text={generateAssetShortTerm(asset,dominant,isMover)}/>
            <OutlookBox icon="" label="Long-Term Outlook" text={generateAssetLongTerm(asset,dominant)}/>
          </div>

          {/* High-Impact Alerts */}
          {hiAlerts.length>0&&(
            <div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:14}}>
              <SectionLabel> Recent High-Impact Alerts  -  {hiAlerts.length} article{hiAlerts.length>1?"s":""}</SectionLabel>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {hiAlerts.map((article,i)=>(
                  <div key={i} style={{background:th("#0A0A0F","#FFFFFF"),border:"1px solid rgba(239,68,68,0.15)",borderRadius:6,padding:12}}>
                    <div style={{display:"flex",gap:6,marginBottom:7,alignItems:"center",flexWrap:"wrap"}}>
                      {detectTopics(article).slice(0,2).map(t=><Pill key={t.id} label={t.label} color={t.color}/>)}
                      <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
                        {article.source&&<SourceBadge source={article.source} link={article.link}/>}
                        <span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{timeAgo(article.pubDate)}</span>
                      </div>
                    </div>
                    <a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#F1F5F9","#111827"),fontSize:12,fontWeight:700,textDecoration:"none",lineHeight:1.45,display:"block",marginBottom:5}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#F1F5F9"}>{article.title}</a>
                    <div style={{color:"#5A6578",fontSize:11,lineHeight:1.6}}>{article.snippet.slice(0,140)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Movement */}
          {movement&&(
            <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${asset.change>=0?"rgba(16,185,129,0.18)":"rgba(239,68,68,0.18)"}`,borderLeft:`3px solid ${asset.change>=0?"#10B981":"#EF4444"}`,borderRadius:8,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <SectionLabel> Market Movement  -  Confidence: <span style={{color:CONF_C[movement.confidence]?.text||"#9CA3AF"}}>{movement.confidence}</span></SectionLabel>
                {movement.source&&<SourceBadge source={movement.source} link={movement.link}/>}
              </div>
              <div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.7,marginBottom:10}}>{movement.reason}</div>
              {movement.sectors?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:movement.headline?10:0}}>{movement.sectors.map(s=><span key={s} style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.18)",borderRadius:4,padding:"2px 7px"}}>{s}</span>)}</div>}
              {movement.headline&&<div style={{fontSize:10,color:th("#6B7280","#4B5563"),background:"#080810",borderRadius:5,padding:"6px 10px",borderLeft:`2px solid ${th("#1F2937","#D1D5DB")}`}}><span style={{color:th("#4B5563","#6B7280")}}>News driver: </span>{movement.headline.slice(0,90)}...</div>}
            </div>
          )}

          {/* Earnings Insight */}
          {earningsInsight&&(
            <div style={{background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.16)",borderRadius:8,padding:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <SectionLabel> Earnings Intelligence  -  {earningsInsight.riskLevel} Risk</SectionLabel>
                {earningsArticle?.source&&<SourceBadge source={earningsArticle.source} link={earningsArticle.link}/>}
              </div>
              <div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,fontWeight:600,marginBottom:10,padding:"8px 12px",background:th("#0A0A0F","#FFFFFF"),borderRadius:6,border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderLeft:`2px solid ${RC[earningsInsight.riskLevel].border}`}}>{earningsInsight.earningsResult}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{icon:"",l:"Market Reaction",v:earningsInsight.marketReaction},{icon:"",l:"Long-Term",v:earningsInsight.longTermImpact}].map(r=>(
                  <div key={r.l} style={{background:th("#0A0A0F","#FFFFFF"),borderRadius:6,padding:"8px 12px",border:`1px solid ${th("#1F2937","#D1D5DB")}`}}>
                    <div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>{r.icon} {r.l}</div>
                    <div style={{color:th("#9CA3AF","#4B5563"),fontSize:11,lineHeight:1.6}}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Catalysts */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <SectionLabel>Related Catalysts & News</SectionLabel>
              {allRelated.length>0&&<span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{allRelated.length} article{allRelated.length!==1?"s":""}  -  {analyzedRelated.length} analyzed</span>}
            </div>
            {allRelated.length===0?(
              <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px dashed ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"24px 0",textAlign:"center"}}>
                {quickAnalyzing?(
                  <><div style={{marginBottom:10}}><Spinner/></div>
                  <div style={{fontSize:13,color:"#60A5FA",marginBottom:3}}>Fetching & analyzing news for {symbol}...</div>
                  <div style={{fontSize:11,color:th("#374151","#9CA3AF")}}>Pulling recent articles from Finnhub and running AI analysis</div></>
                ):(
                  <><div style={{fontSize:22,marginBottom:8}}>Search</div>
                  <div style={{fontSize:13,color:th("#4B5563","#6B7280"),marginBottom:3}}>No recent news found for {symbol}</div>
                  <div style={{fontSize:11,color:th("#374151","#9CA3AF"),marginBottom:14}}>Finnhub returned no articles for this ticker</div>
                  <button onClick={()=>onQuickAnalyze(symbol)} style={{padding:"8px 20px",background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:6,color:"#60A5FA",fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:8,transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(96,165,250,0.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(96,165,250,0.1)"}>Refresh Retry</button></>
                )}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {relatedWithStatus.map(({article,index,analysis,isAnalyzed},i)=>{
                  const s=isAnalyzed?analysis.sentiment:null;const c=s?SC[s]:null;
                  const isEarns=detectEarnings(article);const isHiImp=isHighImpact(article);
                  return(
                    <div key={i} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${isHiImp?"rgba(239,68,68,0.2)":isAnalyzed&&c?`${c.border}18`:"#1F2937"}`,borderRadius:8,padding:14,borderLeft:isHiImp?"3px solid #EF4444":isAnalyzed&&c?`3px solid ${c.border}`:"3px solid #1F2937"}}>
                      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                        {isHiImp&&<Pill label=" HIGH IMPACT" color="#EF4444"/>}
                        {isEarns&&<Pill label=" EARNINGS" color="#F59E0B"/>}
                        {s&&<Pill label={s} color={c.text} bg={c.bg} border={`${c.border}30`}/>}
                        {detectTopics(article).slice(0,1).map(t=><Pill key={t.id} label={t.label} color={t.color}/>)}
                        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
                          {article.source&&<SourceBadge source={article.source} link={article.link}/>}
                          <span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{timeAgo(article.pubDate)}</span>
                        </div>
                      </div>
                      <a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#E5E7EB","#111827"),fontSize:13,fontWeight:700,textDecoration:"none",lineHeight:1.4,display:"block",marginBottom:7}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#E5E7EB"}>{article.title}</a>
                      {isAnalyzed&&analysis?(
                        <div>
                          <div style={{color:th("#9CA3AF","#4B5563"),fontSize:12,lineHeight:1.7,marginBottom:7}}>{analysis.summary}</div>
                          <div style={{fontSize:11,color:"#5A6578",background:"#080810",borderRadius:5,padding:"6px 10px",borderLeft:`2px solid ${th("#1F2937","#D1D5DB")}`,marginBottom:8}}><span style={{color:th("#374151","#9CA3AF")}}>AI Reasoning: </span>{analysis.reasoning}</div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #1F2937"}}>
                            <span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{article.source}</span>
                            <a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:4,padding:"3px 9px",textDecoration:"none"}}>Read Full Article</a>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                          <div style={{color:"#5A6578",fontSize:11,lineHeight:1.6}}>{article.snippet.slice(0,120)}...</div>
                          <button onClick={()=>onAnalyze(index)} disabled={!!analyzing[index]} style={{padding:"5px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:5,color:"#F59E0B",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",flexShrink:0}}>{analyzing[index]?<><Spinner/>Analyzing</>:" Analyze"}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Trading Signal */}
          {action&&(
            <div style={{background:ac2.bg,border:`1px solid ${ac2.border}40`,borderRadius:8,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>AI Trading Signal  -  {symbol}</div>
                <div style={{color:th("#9CA3AF","#4B5563"),fontSize:11}}>{analyzedRelated.length} article{analyzedRelated.length!==1?"s":""}  -  <span style={{color:sc2.text}}>{dominant}</span> sentiment dominates</div>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:ac2.text,letterSpacing:3}}>{action}</div>
            </div>
          )}

          <div style={{fontSize:9,color:"#1F2937",textAlign:"center",paddingTop:4}}>Warning: Informational purposes only - not financial advice  -  Press Esc to close</div>
        </div>
      </div>
    </div>
  );
}

/* ====================== AI CHAT ======================================== */
function AIChatWidget({news,assets,watchlist}){
  const [open,setOpen]=useState(false);const [msgs,setMsgs]=useState([{role:"assistant",content:"Hi! I'm your MARKETINTEL AI - ask me about current conditions, specific stocks, live news analysis, or your watchlist."}]);const [input,setInput]=useState("");const [typing,setTyping]=useState(false);const bottomRef=useRef(null);const inputRef=useRef(null);const sent=getMarketSentiment(assets);const movers=assets.filter(detectMarketMovement).map(a=>a.symbol);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,typing]);
  useEffect(()=>{if(open)setTimeout(()=>inputRef.current?.focus(),200);},[open]);
  const sysPrompt=`You are MARKETINTEL, a sharp financial AI with live market data.\nAssets: ${assets.map(a=>`${a.symbol} $${a.price} (${a.change>0?"+":""}${a.change}%)`).join(", ")}\nSentiment: ${sent.label} | Movers: ${movers.join(",")||"None"} | Watchlist: ${watchlist.join(",")||"Empty"}\nLive Headlines: ${news.slice(0,5).map(n=>n.title).join(" | ")}\nBe concise (2-4 sentences). Reference real prices. Note informational purpose.`;
  const send=async()=>{if(!input.trim()||typing)return;const content=input.trim();setInput("");const updated=[...msgs,{role:"user",content}];setMsgs(updated);setTyping(true);try{const res=await fetch("/api/news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:400,system:sysPrompt,messages:updated.slice(1).map(m=>({role:m.role,content:m.content}))})});const data=await res.json();setMsgs(p=>[...p,{role:"assistant",content:data.content?.find(b=>b.type==="text")?.text||"Connection issue."}]);}catch{setMsgs(p=>[...p,{role:"assistant",content:"Connection issue - please try again."}]);}finally{setTyping(false);};};
  const QUICK=["Today's market summary","Top movers explained","My watchlist outlook","Biggest risks right now"];
  return(<div style={{position:"fixed",bottom:24,right:24,zIndex:9990,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:12}}>
    {open&&(<div style={{width:360,height:520,background:th("#070B14","#FFFFFF"),border:"1px solid rgba(245,158,11,0.28)",borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 0 60px rgba(245,158,11,0.1)",animation:"slideUp 0.2s ease"}}>
      <div style={{padding:"13px 16px",borderBottom:`1px solid ${th("#111827","#E5E7EB")}`,display:"flex",alignItems:"center",gap:10,background:"linear-gradient(90deg,rgba(245,158,11,0.07),transparent)"}}>
        <div style={{width:30,height:30,borderRadius:7,background:"linear-gradient(135deg,#F59E0B,#EF4444)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff"}}><Icon name="logo" size={18} color="#fff" stroke={2.2}/></div>
        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:th("#F1F5F9","#111827")}}>MARKETINTEL AI</div><div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:th("#4B5563","#6B7280")}}><PulsingDot color="#10B981"/>Live data  -  {sent.label} market</div></div>
        <button aria-label="Reset chat" onClick={()=>setMsgs([{role:"assistant",content:"Chat cleared! Ask me anything."}])} style={{width:28,height:28,background:"transparent",border:"none",color:th("#374151","#9CA3AF"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Clear chat"><Icon name="reset" size={14}/></button>
        <button aria-label="Close chat" onClick={()=>setOpen(false)} style={{width:28,height:28,background:"transparent",border:"none",color:th("#374151","#9CA3AF"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#374151"}><Icon name="close" size={15}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"86%",fontSize:12,lineHeight:1.7,padding:"9px 13px",borderRadius:10,background:m.role==="user"?"rgba(245,158,11,0.15)":"#111827",border:m.role==="user"?"1px solid rgba(245,158,11,0.3)":"1px solid #1F2937",color:m.role==="user"?"#F9C74F":"#D1D5DB",borderBottomRightRadius:m.role==="user"?2:10,borderBottomLeftRadius:m.role==="assistant"?2:10}}>{m.content}</div></div>))}
        {typing&&<div style={{display:"flex"}}><div style={{background:th("#111827","#E5E7EB"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:10,borderBottomLeftRadius:2,padding:"10px 14px",display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:"#374151",display:"inline-block",animation:`bounce 1s ease ${i*0.18}s infinite`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {msgs.length<=2&&<div style={{padding:"0 12px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>{QUICK.map(q=>(<button key={q} onClick={()=>{setInput(q);setTimeout(()=>send(),50);}} style={{fontSize:10,padding:"4px 9px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.18)",borderRadius:20,color:"#F59E0B70",cursor:"pointer",fontFamily:"inherit"}} onMouseEnter={e=>{e.currentTarget.style.color="#F59E0B";e.currentTarget.style.borderColor="rgba(245,158,11,0.35)";}} onMouseLeave={e=>{e.currentTarget.style.color="#F59E0B70";e.currentTarget.style.borderColor="rgba(245,158,11,0.18)"}}>{q}</button>))}</div>}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${th("#111827","#E5E7EB")}`,display:"flex",gap:8}}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask about markets, stocks, live news..." style={{flex:1,background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"9px 12px",color:th("#E5E7EB","#111827"),fontSize:12,outline:"none",fontFamily:"'Space Mono',monospace"}} onFocus={e=>e.target.style.borderColor="rgba(245,158,11,0.4)"} onBlur={e=>e.target.style.borderColor="#1F2937"}/>
        <button aria-label="Send message" onClick={send} disabled={!input.trim()||typing} style={{width:36,height:36,background:input.trim()&&!typing?"rgba(245,158,11,0.18)":"transparent",border:`1px solid ${input.trim()&&!typing?"rgba(245,158,11,0.35)":"#1F2937"}`,borderRadius:8,color:input.trim()&&!typing?"#F59E0B":"#374151",cursor:input.trim()&&!typing?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",flexShrink:0}}>{typing?<Spinner/>:<Icon name="send" size={15}/>}</button>
      </div>
    </div>)}
    <button aria-label={open?"Close chat":"Open chat"} title={open?"Close chat":"Open AI chat"} onClick={()=>setOpen(p=>!p)} style={{width:50,height:50,borderRadius:"50%",background:open?"#0A0A0F":"linear-gradient(135deg,#F59E0B,#D97706)",border:open?"1px solid rgba(245,158,11,0.35)":"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:open?"none":"0 0 28px rgba(245,158,11,0.35)",transition:"all 0.2s",color:"white"}}>{open?<Icon name="close" size={21} color="#fff"/>:<Icon name="chat" size={22} color="#fff"/>}</button>
  </div>);
}

/* ====================== WATCHLIST ---- click card -> Asset Detail ======= */
function WatchlistSection({watchlist,onRemove,analyses,news,onOpenDetail}){
  const getS=sym=>{const r=Object.values(analyses).filter(a=>a?.affectedAssets?.includes(sym));if(!r.length)return null;const c=r.reduce((acc,a)=>{if(a.sentiment)acc[a.sentiment]=(acc[a.sentiment]||0)+1;return acc;},{});return Object.entries(c).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0];};
  if(!watchlist.length)return(<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px dashed ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"20px 0",textAlign:"center",marginBottom:18}}><div style={{display:"flex",justifyContent:"center",marginBottom:6,color:"#F59E0B"}}><Icon name="star" size={20}/></div><div style={{fontSize:12,color:th("#4B5563","#6B7280")}}>Watchlist empty - search above or click the star in the table</div></div>);
  const items=watchlist.map(sym=>ASSETS.find(a=>a.symbol===sym)).filter(Boolean);
  return(<div style={{marginBottom:20}}>
    <div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span style={{color:"#F59E0B"}}>Watching</span>Watchlist  -  {items.length} asset{items.length!==1?"s":""} <span style={{color:"#2D3748"}}> -  click any card to open details</span></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
      {items.map(a=>{
        const isMover=detectMarketMovement(a);const ds=getS(a.symbol);const sc2=ds?SC[ds]:null;
        const latestArticle=getAssetNews(a.symbol,news)[0]||null;
        return(<div key={a.symbol} onClick={()=>onOpenDetail(a.symbol)} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${isMover?"rgba(245,158,11,0.22)":"#1F2937"}`,borderRadius:8,padding:"12px 13px",position:"relative",cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=isMover?"rgba(245,158,11,0.5)":"#374151";e.currentTarget.style.background="#0D1117";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=isMover?"rgba(245,158,11,0.22)":"#1F2937";e.currentTarget.style.background="#0A0A0F";}}>
          <button onClick={e=>{e.stopPropagation();onRemove(a.symbol);}} style={{position:"absolute",top:7,right:8,background:"transparent",border:"none",color:"#2D3748",cursor:"pointer",fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#2D3748"} title="Remove">x</button>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:"#F59E0B",letterSpacing:1}}>{a.symbol}</span>
            {isMover&&<span style={{fontSize:8,color:"#EF4444",fontWeight:700}}></span>}
            <span style={{marginLeft:"auto",fontSize:8,color:th("#374151","#9CA3AF"),paddingRight:16}}>{a.category}</span>
          </div>
          <div style={{fontSize:10,color:th("#4B5563","#6B7280"),marginBottom:8}}>{a.name.split(" ").slice(0,3).join(" ")}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:ds?7:0}}>
            <span style={{fontSize:13,fontWeight:700,color:th("#F1F5F9","#111827")}}>${a.price.toFixed(2)}</span>
            <span style={{fontSize:11,fontWeight:700,color:a.change>=0?"#10B981":"#EF4444"}}>{a.change>=0?"+":"-"}{Math.abs(a.change).toFixed(2)}%</span>
          </div>
          {ds&&<div style={{fontSize:10,color:sc2.text,background:sc2.bg,border:`1px solid ${sc2.border}28`,borderRadius:4,padding:"2px 8px",marginBottom:latestArticle?7:0}}>AI: {ds}</div>}
          {latestArticle&&(<div style={{borderTop:`1px solid ${th("#111827","#E5E7EB")}`,paddingTop:7,marginTop:7}}><a href={latestArticle.link||"#"} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:th("#4B5563","#6B7280"),textDecoration:"none",lineHeight:1.45,display:"block"}} onMouseEnter={e=>e.currentTarget.style.color="#F59E0B"} onMouseLeave={e=>e.currentTarget.style.color="#4B5563"}>News {latestArticle.title.slice(0,58)}{latestArticle.title.length>58?"...":""}</a>{latestArticle.source&&<div style={{fontSize:9,color:th("#374151","#9CA3AF"),marginTop:3}}>{latestArticle.source}  -  {timeAgo(latestArticle.pubDate)}</div>}</div>)}
          <div style={{position:"absolute",bottom:8,right:10,fontSize:9,color:"#2D3748"}}>tap for details</div>
        </div>);
      })}
    </div>
  </div>);
}

/* ====================== SUMMARY TAB ==================================== */
function SummaryTab({assets,news,mktEvents}){
  const sent=getMarketSentiment(assets);const fg=getFearGreed(assets);const narrative=generateNarrative(assets,news);const topM=[...assets].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,4);
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${sent.color}22`,borderRadius:8,padding:18}}><SectionLabel>Market Sentiment</SectionLabel><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:30}}>{sent.icon}</span><div><div style={{fontSize:20,fontWeight:700,color:sent.color,fontFamily:"'Syne',sans-serif"}}>{sent.label}</div><div style={{fontSize:10,color:th("#4B5563","#6B7280")}}>{sent.sub}</div></div></div><div style={{display:"flex",gap:3}}>{assets.map(a=>(<div key={a.symbol} title={`${a.symbol} ${a.change>0?"+":""}${a.change}%`} style={{flex:1,height:4,borderRadius:2,background:a.change>0?"#10B981":a.change<0?"#EF4444":"#374151"}}/>))}</div></div>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:18}}><SectionLabel>Fear & Greed Index</SectionLabel><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}><div style={{fontSize:26,fontWeight:700,color:fg.color,fontFamily:"'Syne',sans-serif",minWidth:44}}>{fg.score}</div><div><div style={{fontSize:13,fontWeight:700,color:fg.color}}>{fg.label}</div><div style={{fontSize:10,color:th("#4B5563","#6B7280")}}>0 = Fear  -  100 = Greed</div></div></div><div style={{background:"#080810",borderRadius:20,height:6,overflow:"hidden",border:`1px solid ${th("#1F2937","#D1D5DB")}`,marginBottom:5}}><div style={{width:`${fg.score}%`,height:"100%",background:"linear-gradient(90deg,#EF4444 0%,#F59E0B 50%,#10B981 100%)"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:th("#374151","#9CA3AF")}}><span>Fear</span><span>Neutral</span><span>Greed</span></div></div>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:18}}><SectionLabel>Top Movers</SectionLabel><div style={{display:"flex",flexDirection:"column",gap:9}}>{topM.map(a=>(<div key={a.symbol} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,fontWeight:700,color:"#F59E0B",minWidth:40}}>{a.symbol}</span><div style={{flex:1,background:"#080810",borderRadius:3,height:3}}><div style={{width:`${Math.min(100,Math.abs(a.change)*20)}%`,height:"100%",background:a.change>=0?"#10B981":"#EF4444",borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:700,color:a.change>=0?"#10B981":"#EF4444",minWidth:52,textAlign:"right"}}>{a.change>=0?"+":"-"}{Math.abs(a.change).toFixed(2)}%</span></div>))}</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:18}}><SectionLabel>Sector Performance</SectionLabel><div style={{display:"flex",flexDirection:"column",gap:9}}>{SECTOR_DATA.map(s=>(<div key={s.name} style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13}}>{s.icon}</span><span style={{fontSize:11,color:th("#6B7280","#4B5563"),minWidth:100}}>{s.name}</span><div style={{flex:1,background:"#080810",borderRadius:3,height:5,overflow:"hidden"}}><div style={{width:`${Math.min(100,Math.abs(s.change)*26)}%`,height:"100%",background:s.change>=0?"#10B981":"#EF4444",borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:700,color:s.change>=0?"#10B981":"#EF4444",minWidth:50,textAlign:"right"}}>{s.change>=0?"+":""}{s.change}%</span></div>))}</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:18,flex:1}}><SectionLabel>Edit AI Daily Narrative</SectionLabel><div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.85}}>{narrative}</div></div><div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:16}}><SectionLabel>Date Key Events</SectionLabel>{mktEvents.slice(0,5).map((ev,i)=>{const ec=EVC[ev.type]||{c:"#9CA3AF",bg:"rgba(107,114,128,0.1)"};return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:`1px solid ${th("#0D1117","#E5E7EB")}`}}><span style={{fontSize:10,fontWeight:700,color:ec.c,background:ec.bg,borderRadius:4,padding:"1px 7px",whiteSpace:"nowrap"}}>{ev.date}</span><span style={{fontSize:11,color:th("#9CA3AF","#4B5563"),flex:1}}>{ev.title}</span><span style={{fontSize:9,fontWeight:700,color:ev.impact==="High"?"#EF4444":"#F59E0B"}}>{ev.impact}</span></div>);})}</div></div>
    </div>
  </div>);
}

/* ====================== INTELLIGENCE TAB =============================== */
function IntelligenceTab({assets,news,telegramConfig,setTelegramConfig,addNotif,earningsCal}){
  const movers=assets.filter(detectMarketMovement).map(a=>explainMarketMovement(a,news));
  const earningsNews=news.map((article,i)=>({article,index:i})).filter(({article})=>detectEarnings(article));

  // Insider trading state
  const [insiderData,setInsiderData]=useState([]);
  const [insiderLoading,setInsiderLoading]=useState(false);
  const [insiderLoaded,setInsiderLoaded]=useState(false);

  const fetchInsiderTrades=useCallback(async()=>{
    setInsiderLoading(true);
    try{
      const symbols=["AAPL","TSLA","NVDA","MSFT","GOOGL","AMZN","META","AMD"];
      const results=await Promise.allSettled(symbols.map(sym=>
        fetch(finnhubUrl("/stock/insider-transactions",{symbol:sym})).then(r=>r.json())
      ));
      const allTrades=[];
      results.forEach((r,idx)=>{
        if(r.status==="fulfilled"&&r.value?.data){
          r.value.data.slice(0,3).forEach(t=>{
            allTrades.push({
              symbol:symbols[idx],
              name:t.name||"Unknown",
              shares:t.share||0,
              value:t.transactionPrice?(t.share*t.transactionPrice):0,
              type:t.transactionCode==="P"?"BUY":t.transactionCode==="S"?"SELL":t.transactionCode==="A"?"AWARD":t.transactionCode||"OTHER",
              date:t.transactionDate||"",
              filingDate:t.filingDate||"",
            });
          });
        }
      });
      allTrades.sort((a,b)=>new Date(b.date)-new Date(a.date));
      setInsiderData(allTrades.slice(0,20));
      setInsiderLoaded(true);
    }catch(e){console.error("Insider fetch error:",e);}
    finally{setInsiderLoading(false);}
  },[]);

  // Telegram test
  const testTelegram=async()=>{
    if(!telegramConfig.botToken||!telegramConfig.chatId){addNotif("Set bot token and chat ID first","alert");return;}
    try{
      const msg=`Alerts MarketIntel Test Alert\n\nYour Telegram notifications are working!\n\nTime: ${new Date().toLocaleTimeString()}`;
      const url=`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
      const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:telegramConfig.chatId,text:msg,parse_mode:"HTML"})});
      const data=await res.json();
      if(data.ok)addNotif("OK Telegram test sent!","success");
      else addNotif(`Telegram error: ${data.description}`,"alert");
    }catch(e){addNotif("Telegram connection failed","alert");}
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:28}}>
    {/* -- INSIDER TRADING SECTION -- */}
    <section>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{fontSize:10,color:"#A78BFA",fontWeight:800,letterSpacing:1}}>SEC</span><span style={{fontSize:14,fontWeight:700,color:th("#F1F5F9","#111827")}}>Insider Trading Feed</span>
          {insiderData.length>0&&<Pill label={`${insiderData.length} TRADES`} color="#A78BFA"/>}
          <button onClick={fetchInsiderTrades} disabled={insiderLoading} style={{marginLeft:"auto",padding:"4px 12px",fontSize:10,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:5,color:"#A78BFA",cursor:insiderLoading?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            {insiderLoading?<><Spinner/> Loading...</>:"Refresh Insider Trades"}
          </button>
        </div>
        <div style={{fontSize:11,color:th("#4B5563","#6B7280")}}>CEO, CFO & executive buy/sell transactions from SEC filings</div>
      </div>
      {!insiderLoaded?(<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"32px 0",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#A78BFA",marginBottom:10}}>SEC</div><div style={{fontSize:13,color:th("#4B5563","#6B7280"),marginBottom:6}}>Click "Refresh Insider Trades" to load recent SEC filings</div><div style={{fontSize:11,color:th("#374151","#9CA3AF")}}>Tracks insider buys and sells for top stocks</div></div>):(
        <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid #1F2937",background:th("#0D1117","#F3F4F6")}}>
              {["SYMBOL","INSIDER","TYPE","SHARES","VALUE","DATE"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",color:th("#4B5563","#6B7280"),letterSpacing:2,fontWeight:700,fontSize:8}}>{h}</th>))}
            </tr></thead>
            <tbody>{insiderData.map((t,i)=>{
              const isBuy=t.type==="BUY";const isSell=t.type==="SELL";
              return(<tr key={i} style={{borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}>
                <td style={{padding:"8px 12px",color:"#F59E0B",fontWeight:700}}>{t.symbol}</td>
                <td style={{padding:"8px 12px",color:th("#D1D5DB","#1F2937")}}>{t.name.slice(0,25)}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,color:isBuy?"#10B981":isSell?"#EF4444":"#6B7280",background:isBuy?"rgba(16,185,129,0.12)":isSell?"rgba(239,68,68,0.12)":"rgba(107,114,128,0.12)",border:`1px solid ${isBuy?"rgba(16,185,129,0.25)":isSell?"rgba(239,68,68,0.25)":"rgba(107,114,128,0.25)"}`}}>{t.type}</span></td>
                <td style={{padding:"8px 12px",color:th("#9CA3AF","#4B5563")}}>{Math.abs(t.shares).toLocaleString()}</td>
                <td style={{padding:"8px 12px",color:isBuy?"#10B981":isSell?"#EF4444":"#9CA3AF",fontWeight:600}}>{t.value>0?`$${(t.value/1000).toFixed(0)}K`:"-"}</td>
                <td style={{padding:"8px 12px",color:th("#4B5563","#6B7280")}}>{t.date}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </section>
    <div style={{height:1,background:th("#111827","#E5E7EB")}}/>

    {/* -- TELEGRAM PUSH NOTIFICATIONS -- */}
    <section>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span>Mobile</span><span style={{fontSize:14,fontWeight:700,color:th("#F1F5F9","#111827")}}>Telegram Push Notifications</span>
          {telegramConfig.enabled&&<Pill label="ACTIVE" color="#10B981"/>}
        </div>
        <div style={{fontSize:11,color:th("#4B5563","#6B7280")}}>Receive alerts for high-impact news, price movements, and analysis results</div>
      </div>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:18}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,display:"block",marginBottom:4}}>BOT TOKEN</label>
            <input value={telegramConfig.botToken} onChange={e=>{const v=e.target.value;setTelegramConfig(p=>({...p,botToken:v}));try{localStorage.setItem("mi-tg-token",v);}catch{}}} placeholder="123456:ABC-DEF..." style={{width:"100%",padding:"8px 10px",background:"#080810",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#D1D5DB","#1F2937"),fontSize:11,fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div>
            <label style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,display:"block",marginBottom:4}}>CHAT ID</label>
            <input value={telegramConfig.chatId} onChange={e=>{const v=e.target.value;setTelegramConfig(p=>({...p,chatId:v}));try{localStorage.setItem("mi-tg-chat",v);}catch{}}} placeholder="-1001234567890" style={{width:"100%",padding:"8px 10px",background:"#080810",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#D1D5DB","#1F2937"),fontSize:11,fontFamily:"inherit",outline:"none"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>{const v=!telegramConfig.enabled;setTelegramConfig(p=>({...p,enabled:v}));try{localStorage.setItem("mi-tg-enabled",v?"1":"0");}catch{}}} style={{padding:"6px 14px",fontSize:10,background:telegramConfig.enabled?"rgba(16,185,129,0.1)":"transparent",border:`1px solid ${telegramConfig.enabled?"#10B981":"#1F2937"}`,borderRadius:5,color:telegramConfig.enabled?"#10B981":"#4B5563",cursor:"pointer",fontFamily:"inherit"}}>{telegramConfig.enabled?"OK Enabled":"Enable"}</button>
          <button onClick={testTelegram} style={{padding:"6px 14px",fontSize:10,background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:5,color:"#60A5FA",cursor:"pointer",fontFamily:"inherit"}}>Send Test</button>
          <span style={{fontSize:10,color:th("#374151","#9CA3AF"),marginLeft:8}}>Get token from @BotFather  -  Get chat ID from @userinfobot</span>
        </div>
      </div>
    </section>
    <div style={{height:1,background:th("#111827","#E5E7EB")}}/>
    <section><div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span></span><span style={{fontSize:14,fontWeight:700,color:th("#F1F5F9","#111827")}}>Why Markets Moved Today</span>{movers.length>0&&<Pill label={`${movers.length} ALERT${movers.length>1?"S":""}`} color="#EF4444"/>}<span style={{marginLeft:"auto",fontSize:10,color:th("#374151","#9CA3AF")}}>Sourced from live news</span></div><div style={{fontSize:11,color:th("#4B5563","#6B7280")}}>AI matches significant price movements to live news causing them</div></div>
    {movers.length===0?<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"32px 0",textAlign:"center"}}><div style={{fontSize:24,marginBottom:10}}></div><div style={{fontSize:13,color:th("#4B5563","#6B7280")}}>No significant moves detected today</div></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>{movers.map(exp=>{const up=exp.movement>=0;const mc=up?"#10B981":"#EF4444";const cc=CONF_C[exp.confidence]||{text:"#9CA3AF"};return(<div key={exp.asset} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${mc}18`,borderLeft:`3px solid ${mc}`,borderRadius:8,padding:16,transition:"box-shadow 0.2s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 20px ${mc}12`} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div><div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{up?"+ Rise":"- Drop"}</div><div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:20,fontWeight:700,color:"#F59E0B"}}>{exp.asset}</span><span style={{fontSize:16,fontWeight:700,color:mc}}>{up?"+":"-"}{Math.abs(exp.movement).toFixed(2)}%</span></div></div><div style={{textAlign:"right"}}><div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Confidence</div><div style={{fontSize:11,fontWeight:700,color:cc.text}}>{exp.confidence}</div></div></div><div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.7,marginBottom:10}}>{exp.reason}</div>{exp.sectors?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:exp.headline?10:0}}>{exp.sectors.map(s=><span key={s} style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.18)",borderRadius:4,padding:"2px 6px"}}>{s}</span>)}</div>}{exp.headline&&<div style={{fontSize:10,color:th("#6B7280","#4B5563"),background:"#080810",borderRadius:5,padding:"7px 10px",borderLeft:`2px solid ${th("#1F2937","#D1D5DB")}`,marginBottom:exp.source?6:0}}><span style={{color:th("#4B5563","#6B7280")}}>News driver: </span>{exp.headline.slice(0,85)}...</div>}{exp.source&&<div style={{marginTop:4}}><SourceBadge source={exp.source} link={exp.link}/></div>}</div>);})}  </div>}
    </section>
    <div style={{height:1,background:th("#111827","#E5E7EB")}}/>
    <section><div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span></span><span style={{fontSize:14,fontWeight:700,color:th("#F1F5F9","#111827")}}>Earnings Intelligence</span>{earningsNews.length>0&&<Pill label={`${earningsNews.length} DETECTED`} color="#F59E0B"/>}<span style={{marginLeft:"auto",fontSize:10,color:th("#374151","#9CA3AF")}}>Live earnings news</span></div><div style={{fontSize:11,color:th("#4B5563","#6B7280")}}>Auto-detected earnings articles from live feed with AI market impact analysis</div></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:18,alignItems:"flex-start"}}>
      <div style={{flex:"1 1 300px",minWidth:0,display:"flex",flexDirection:"column",gap:14}}>
        {earningsNews.length===0?<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"28px 0",textAlign:"center"}}><div style={{fontSize:24,marginBottom:8}}>List</div><div style={{fontSize:13,color:th("#4B5563","#6B7280")}}>No earnings articles in live feed</div></div>:earningsNews.map(({article,index})=>{const insight=generateEarningsInsight(article);const rc2=RC[insight.riskLevel]||RC.Medium;return(<div key={index} style={{background:th("#0A0A0F","#FFFFFF"),border:"1px solid rgba(245,158,11,0.14)",borderRadius:8,padding:16}}><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:9,flexWrap:"wrap"}}><Pill label=" EARNINGS" color="#F59E0B"/>{insight.symbol&&<Pill label={insight.symbol} color="#6B7280"/>}<span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{timeAgo(article.pubDate)}</span>{article.source&&<SourceBadge source={article.source} link={article.link}/>}</div><a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#F1F5F9","#111827"),fontSize:13,fontWeight:700,lineHeight:1.5,marginBottom:7,display:"block",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#F1F5F9"}>{article.title}</a><div style={{color:"#5A6578",fontSize:12,lineHeight:1.7,borderLeft:`2px solid ${th("#1F2937","#D1D5DB")}`,paddingLeft:10,marginBottom:12}}>{article.snippet}</div><div style={{background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.14)",borderRadius:7,padding:12}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><span style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase"}}>AI Earnings Analysis</span><div style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:rc2.text,background:rc2.bg,border:`1px solid ${rc2.border}40`,borderRadius:4,padding:"1px 7px"}}>{insight.riskLevel} Risk</div></div><div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,fontWeight:600,marginBottom:10,padding:"7px 10px",background:th("#0A0A0F","#FFFFFF"),borderRadius:5,border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderLeft:`2px solid ${rc2.border}`}}>{insight.earningsResult}</div><div style={{display:"flex",flexDirection:"column",gap:7}}>{[{icon:"",l:"Market Reaction",v:insight.marketReaction},{icon:"",l:"Short-Term",v:insight.shortTermImpact},{icon:"",l:"Long-Term",v:insight.longTermImpact}].map(r=>(<div key={r.l} style={{background:th("#0A0A0F","#FFFFFF"),borderRadius:5,padding:"7px 10px",border:`1px solid ${th("#1F2937","#D1D5DB")}`,display:"flex",gap:9}}><span style={{fontSize:13,flexShrink:0}}>{r.icon}</span><div><div style={{fontSize:9,color:th("#4B5563","#6B7280"),letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{r.l}</div><div style={{color:th("#9CA3AF","#4B5563"),fontSize:11,lineHeight:1.6}}>{r.v}</div></div></div>))}</div></div></div>);})}
      </div>
      <div style={{width:285,flexShrink:0,position:"sticky",top:72}}><div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:16}}><SectionLabel>Date Upcoming Earnings</SectionLabel><div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>{earningsCal.map(item=>{const vc2=VC[item.vol]||VC.Medium;const near=item.daysUntil<=5;return(<div key={item.asset} style={{background:near?"rgba(239,68,68,0.04)":"#0D1117",border:`1px solid ${near?"rgba(239,68,68,0.2)":"#111827"}`,borderRadius:7,padding:"9px 11px",display:"flex",alignItems:"center",gap:9}}>{near?<PulsingDot color="#EF4444"/>:<span style={{width:8,display:"inline-block"}}/>}<span style={{fontSize:12,fontWeight:700,color:"#F59E0B",minWidth:40}}>{item.asset}</span><span style={{flex:1,fontSize:10,color:th("#6B7280","#4B5563")}}>{item.name.split(" ")[0]}</span><div style={{textAlign:"right",marginRight:5}}><div style={{fontSize:11,fontWeight:700,color:th("#D1D5DB","#1F2937")}}>{item.date}</div><div style={{fontSize:9,color:th("#4B5563","#6B7280")}}>{item.daysUntil}d</div></div><span style={{fontSize:9,fontWeight:700,color:vc2.text,background:vc2.bg,border:`1px solid ${vc2.border}`,borderRadius:4,padding:"2px 5px"}}>{item.vol.toUpperCase()}</span></div>);})} </div>{earningsCal.filter(e=>e.daysUntil<=5).length>0&&(<div style={{borderTop:`1px solid ${th("#111827","#E5E7EB")}`,paddingTop:10}}><div style={{fontSize:9,color:"#EF4444",letterSpacing:2,textTransform:"uppercase",marginBottom:7}}>Warning: Pre-Earnings Alerts</div>{earningsCal.filter(e=>e.daysUntil<=5).map(e=>(<div key={e.asset} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 0",fontSize:11,borderBottom:`1px solid ${th("#0D1117","#E5E7EB")}`}}><PulsingDot color="#EF4444"/><span style={{color:"#EF4444",fontWeight:700}}>{e.asset}</span><span style={{color:th("#6B7280","#4B5563")}}>in {e.daysUntil} days</span><span style={{marginLeft:"auto",fontSize:9,color:VC[e.vol].text}}>{e.vol}</span></div>))}</div>)}</div></div>
    </div>
    </section>
  </div>);
}

/* ====================== ASSET SEARCH --- results open Asset Detail ====== */
function AssetSearchBar({watchlist,onToggleWatch,onOpenDetail}){
  const [q,setQ]=useState("");const [show,setShow]=useState(false);const ref=useRef(null);
  const [extResults,setExtResults]=useState([]);const [searching,setSearching]=useState(false);const debounceRef=useRef(null);
  const localResults=q.trim().length>0?ASSETS.filter(a=>a.symbol.toLowerCase().includes(q.toLowerCase())||a.name.toLowerCase().includes(q.toLowerCase())||a.category.toLowerCase().includes(q.toLowerCase())):[];

  // Finnhub symbol lookup for unlisted tickers
  useEffect(()=>{
    if(debounceRef.current)clearTimeout(debounceRef.current);
    const trimmed=q.trim().toUpperCase();
    if(trimmed.length<1||localResults.length>0){setExtResults([]);return;}
    debounceRef.current=setTimeout(async()=>{
      setSearching(true);
      try{
        // Try direct quote first - fastest path for exact symbols
        const quoteRes=await fetch(finnhubUrl("/quote",{symbol:trimmed}));
        const quoteData=await quoteRes.json();
        if(quoteData&&quoteData.c>0){
          // Fetch profile for company name
          let name=trimmed;
          try{
            const profRes=await fetch(finnhubUrl("/stock/profile2",{symbol:trimmed}));
            const prof=await profRes.json();
            if(prof?.name)name=prof.name;
          }catch{}
          setExtResults([{symbol:trimmed,name,price:quoteData.c,change:quoteData.pc>0?+((quoteData.c-quoteData.pc)/quoteData.pc*100).toFixed(2):0,category:"Stock",isExternal:true}]);
        }else{
          // Fallback: symbol search
          const searchRes=await fetch(finnhubUrl("/search",{q:trimmed}));
          const searchData=await searchRes.json();
          const hits=(searchData.result||[]).filter(r=>r.type==="Common Stock"||r.type==="ETP"||r.type==="ETF").slice(0,5);
          if(hits.length>0){
            const withQuotes=await Promise.allSettled(hits.map(async h=>{
              const qr=await fetch(finnhubUrl("/quote",{symbol:h.symbol}));
              const qd=await qr.json();
              return{symbol:h.symbol,name:h.description||h.symbol,price:qd?.c||0,change:qd?.pc>0?+((qd.c-qd.pc)/qd.pc*100).toFixed(2):0,category:h.type==="ETF"||h.type==="ETP"?"ETF":"Stock",isExternal:true};
            }));
            setExtResults(withQuotes.filter(r=>r.status==="fulfilled"&&r.value.price>0).map(r=>r.value));
          }else setExtResults([]);
        }
      }catch(e){console.error("Search error:",e);setExtResults([]);}
      finally{setSearching(false);}
    },500);
    return()=>{if(debounceRef.current)clearTimeout(debounceRef.current);};
  },[q]);

  const allResults=[...localResults,...extResults.filter(e=>!ASSETS.find(a=>a.symbol===e.symbol))];

  const handleSelect=(a)=>{
    // If external asset, inject into ASSETS so detail modal can find it
    if(a.isExternal&&!ASSETS.find(x=>x.symbol===a.symbol)){
      ASSETS.push({symbol:a.symbol,name:a.name,price:a.price,change:a.change,category:a.category});
      // Also add keywords for news matching
      ASSET_KEYWORDS[a.symbol]=[a.symbol.toLowerCase(),a.name.toLowerCase().split(" ")[0]];
    }
    onOpenDetail(a.symbol);setQ("");setShow(false);
  };

  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return(<div ref={ref} style={{position:"relative",marginBottom:16}}>
    <div style={{position:"relative"}}>
      <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:10,color:th("#374151","#9CA3AF"),pointerEvents:"none",fontWeight:800,letterSpacing:1}}>SEARCH</span>
      <input value={q} onChange={e=>{setQ(e.target.value);setShow(true);}} onFocus={e=>{if(q.trim())setShow(true);e.target.style.borderColor="rgba(245,158,11,0.4)";}} placeholder="Search any ticker - NVDA, AMZN, GOOG, BTC. Finnhub lookup for unlisted" style={{width:"100%",background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"10px 64px",color:th("#E5E7EB","#111827"),fontSize:12,outline:"none",fontFamily:"'Space Mono',monospace",transition:"border-color 0.15s"}} onBlur={e=>e.target.style.borderColor="#1F2937"}/>
      {q&&<button onClick={()=>{setQ("");setShow(false);setExtResults([]);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:th("#374151","#9CA3AF"),cursor:"pointer",fontSize:14}} onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#374151"}>x</button>}
    </div>
    {show&&(allResults.length>0||searching)&&(<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:th("#0D1117","#F3F4F6"),border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,zIndex:200,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.6)",maxHeight:360,overflowY:"auto"}}>
      {localResults.length>0&&<div style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,padding:"8px 14px 6px",textTransform:"uppercase"}}>Tracked Assets</div>}
      {localResults.map((a)=>{const inWL=watchlist.includes(a.symbol);const isMover=detectMarketMovement(a);return(<div key={a.symbol} onClick={()=>handleSelect(a)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",cursor:"pointer",borderTop:`1px solid ${th("#111827","#E5E7EB")}`,transition:"background 0.12s"}} onMouseEnter={e=>e.currentTarget.style.background="#111827"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{minWidth:50}}><div style={{fontSize:13,fontWeight:700,color:"#F59E0B",letterSpacing:1}}>{a.symbol}</div>{isMover&&<div style={{fontSize:8,color:"#EF4444",fontWeight:700}}> MOVER</div>}</div><div style={{flex:1}}><div style={{fontSize:12,color:th("#D1D5DB","#1F2937")}}>{a.name}</div><div style={{fontSize:10,color:th("#4B5563","#6B7280")}}>{a.category}  -  ${a.price.toFixed(2)}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,fontWeight:700,color:a.change>=0?"#10B981":"#EF4444"}}>{a.change>=0?"+":"-"}{Math.abs(a.change).toFixed(2)}%</span><button onClick={e=>{e.stopPropagation();onToggleWatch(a.symbol);}} style={{background:inWL?"rgba(245,158,11,0.1)":"transparent",border:`1px solid ${inWL?"rgba(245,158,11,0.3)":"#2D3748"}`,borderRadius:5,width:28,height:26,color:inWL?"#F59E0B":"#4B5563",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",padding:0}} title={inWL?"Remove from watchlist":"Add to watchlist"} aria-label={inWL?"Remove from watchlist":"Add to watchlist"}><Icon name="star" size={13} color={inWL?"#F59E0B":"currentColor"} stroke={1.9}/></button></div></div>);})}
      {extResults.length>0&&<div style={{fontSize:9,color:"#60A5FA",letterSpacing:2,padding:"10px 14px 6px",textTransform:"uppercase",borderTop:localResults.length>0?"1px solid #1F2937":"none",display:"flex",alignItems:"center",gap:6}}>Global Finnhub Lookup<span style={{color:th("#374151","#9CA3AF"),fontWeight:400,letterSpacing:0.5,textTransform:"none"}}>- live data</span></div>}
      {extResults.filter(e=>!ASSETS.find(a=>a.symbol===e.symbol)||e.isExternal).map((a)=>{const inWL=watchlist.includes(a.symbol);return(<div key={a.symbol} onClick={()=>handleSelect(a)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",cursor:"pointer",borderTop:`1px solid ${th("#111827","#E5E7EB")}`,transition:"background 0.12s",background:"rgba(96,165,250,0.03)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(96,165,250,0.07)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(96,165,250,0.03)"}><div style={{minWidth:50}}><div style={{fontSize:13,fontWeight:700,color:"#60A5FA",letterSpacing:1}}>{a.symbol}</div><div style={{fontSize:8,color:"#60A5FA70",fontWeight:700}}>FINNHUB</div></div><div style={{flex:1}}><div style={{fontSize:12,color:th("#D1D5DB","#1F2937")}}>{a.name}</div><div style={{fontSize:10,color:th("#4B5563","#6B7280")}}>{a.category}  -  ${a.price.toFixed(2)}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,fontWeight:700,color:a.change>=0?"#10B981":"#EF4444"}}>{a.change>=0?"+":"-"}{Math.abs(a.change).toFixed(2)}%</span><button onClick={e=>{e.stopPropagation();if(!ASSETS.find(x=>x.symbol===a.symbol)){ASSETS.push({symbol:a.symbol,name:a.name,price:a.price,change:a.change,category:a.category});ASSET_KEYWORDS[a.symbol]=[a.symbol.toLowerCase(),a.name.toLowerCase().split(" ")[0]];}onToggleWatch(a.symbol);}} style={{background:inWL?"rgba(245,158,11,0.1)":"transparent",border:`1px solid ${inWL?"rgba(245,158,11,0.3)":"#2D3748"}`,borderRadius:5,width:28,height:26,color:inWL?"#F59E0B":"#4B5563",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",padding:0}} title={inWL?"Remove from watchlist":"Add to watchlist"} aria-label={inWL?"Remove from watchlist":"Add to watchlist"}><Icon name="star" size={13} color={inWL?"#F59E0B":"currentColor"} stroke={1.9}/></button></div></div>);})}
      {searching&&<div style={{padding:"14px",display:"flex",alignItems:"center",gap:8,borderTop:`1px solid ${th("#111827","#E5E7EB")}`}}><Spinner/><span style={{fontSize:11,color:th("#4B5563","#6B7280")}}>Searching Finnhub for "{q.trim().toUpperCase()}"...</span></div>}
    </div>)}
    {show&&q.trim().length>0&&allResults.length===0&&!searching&&(<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:th("#0D1117","#F3F4F6"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:"14px",color:th("#4B5563","#6B7280"),fontSize:12}}>No assets found for "{q}" - try an exact ticker like GOOG, AMZN, META</div>)}
  </div>);
}

/* ====================== MARKET TABLE --- rows open Asset Detail ======== */
function MarketTable({assets,filter,setFilter,sortBy,onSort,detailSym,onOpenDetail,news,analyses,watchlist,onToggle,onFetchCategory,onBuy,getPriceStatus}){
  const cats=ALL_CATEGORIES;
  const [showAll,setShowAll]=useState(false);
  const displayed=showAll?assets:assets.slice(0,10);
  return(<div>
    <AssetSearchBar watchlist={watchlist} onToggleWatch={onToggle} onOpenDetail={onOpenDetail}/>
    <WatchlistSection watchlist={watchlist} onRemove={onToggle} analyses={analyses} news={news} onOpenDetail={onOpenDetail}/>
    <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none",paddingBottom:4}}>
      {cats.map(cat=>(<button key={cat} onClick={()=>{setFilter(cat);setShowAll(false);if(cat!=="All"&&onFetchCategory)onFetchCategory(cat);}} style={{padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:700,letterSpacing:1,cursor:"pointer",textTransform:"uppercase",fontFamily:"inherit",background:filter===cat?"rgba(245,158,11,0.15)":"transparent",border:`1px solid ${filter===cat?"#F59E0B":"#1F2937"}`,color:filter===cat?"#F59E0B":"#4B5563",whiteSpace:"nowrap",flexShrink:0}}>{cat}</button>))}
      <div style={{marginLeft:"auto",fontSize:10,color:th("#4B5563","#6B7280"),display:"flex",alignItems:"center",gap:5,flexShrink:0}}><PulsingDot color="#10B981"/>LIVE  -  {displayed.length}/{assets.length}</div>
    </div>
    <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,overflow:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
        <thead><tr style={{borderBottom:"1px solid #1F2937",background:th("#0D1117","#F3F4F6")}}>{[{c:"symbol",l:"SYMBOL"},{c:"name",l:"NAME"},{c:"cat",l:"TYPE"},{c:"price",l:"PRICE"},{c:"change",l:"CHANGE %"},{c:"",l:""},{c:"",l:""}].map(({c,l},i)=>(<th key={i} onClick={()=>c&&onSort(c)} style={{padding:"10px 12px",textAlign:"left",color:th("#4B5563","#6B7280"),letterSpacing:2,fontWeight:700,cursor:c?"pointer":"default",userSelect:"none",whiteSpace:"nowrap",fontSize:8}}>{l}{sortBy.col===c?(sortBy.dir==="asc"?" Send":" Down"):""}</th>))}</tr></thead>
        <tbody>{displayed.map((a,i)=>{const isSel=detailSym===a.symbol;const isMover=detectMarketMovement(a);const inWL=watchlist.includes(a.symbol);const isLive=!!a._live;const ps=getPriceStatus?getPriceStatus(a):getAssetPriceStatus(a);return(<tr key={a.symbol} onClick={()=>onOpenDetail(a.symbol)} style={{borderBottom:i<displayed.length-1?`1px solid ${th("#111827","#E5E7EB")}`:"none",cursor:"pointer",transition:"background 0.12s",background:isSel?"rgba(245,158,11,0.07)":"transparent"}} onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=th("#0D1117","#F3F4F6");}} onMouseLeave={e=>e.currentTarget.style.background=isSel?"rgba(245,158,11,0.07)":"transparent"}>
          <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{color:"#F59E0B",fontWeight:700,letterSpacing:1,fontSize:11}}>{displaySymbol(a.symbol)}</span>{isMover&&<span style={{fontSize:8,color:"#EF4444",fontWeight:700}}></span>}{isLive&&<span style={{width:4,height:4,borderRadius:2,background:"#10B981",display:"inline-block"}}/>}</div></td>
          <td style={{padding:"10px 12px",color:th("#D1D5DB","#1F2937"),fontSize:11}}>{a.name?.slice(0,22)}</td>
          <td style={{padding:"10px 12px"}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderRadius:4,padding:"2px 6px",color:({Stock:"#A78BFA",ETF:"#60A5FA",Bond:"#34D399",Crypto:"#F59E0B",Forex:"#14B8A6",Commodity:"#FB923C",Index:"#F472B6","Real Estate":"#8B5CF6",Energy:"#EF4444",AI:"#EC4899",Healthcare:"#06B6D4",Biotech:"#22D3EE",Financial:"#818CF8",Industrial:"#A3A3A3",Consumer:"#FB7185",Defense:"#64748B",Telecom:"#2DD4BF",Utility:"#84CC16",Transport:"#F97316",Materials:"#D97706",Agriculture:"#65A30D"})[a.category]||"#6B7280",background:`${({Stock:"#A78BFA",ETF:"#60A5FA",Crypto:"#F59E0B",Healthcare:"#06B6D4",AI:"#EC4899"})[a.category]||"#6B7280"}15`}}>{a.category}</span></td>
          <td style={{padding:"10px 12px",fontWeight:700,color:isLive?th("#F1F5F9","#111827"):th("#374151","#9CA3AF")}}><div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-start"}}><span>{a.price>0?`$${a.price.toFixed(2)}`:"-"}</span><PriceStatusBadge status={ps} size="xs"/></div></td>
          <td style={{padding:"10px 12px",fontWeight:700,color:a.change>=0?"#10B981":"#EF4444",fontSize:11}}>{a.change>=0?"+":"-"} {Math.abs(a.change).toFixed(2)}%</td>
          <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:6,alignItems:"center"}}><button aria-label={inWL?"Remove from watchlist":"Add to watchlist"} onClick={e=>{e.stopPropagation();onToggle(a.symbol);}} style={{width:26,height:24,background:inWL?"rgba(245,158,11,0.12)":"transparent",border:`1px solid ${inWL?"rgba(245,158,11,0.35)":th("#1F2937","#D1D5DB")}`,borderRadius:5,cursor:"pointer",color:inWL?"#F59E0B":th("#374151","#9CA3AF"),display:"flex",alignItems:"center",justifyContent:"center",padding:0}} title={inWL?"Remove from watchlist":"Add to watchlist"}><Icon name="star" size={13} color={inWL?"#F59E0B":"currentColor"} stroke={1.9}/></button><button onClick={e=>{e.stopPropagation();if(a.price>0)onBuy(a);}} style={{padding:"3px 8px",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:4,color:"#10B981",fontSize:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>BUY</button></div></td>
          <td style={{padding:"10px 12px"}}><span style={{fontSize:9,color:isSel?"#F59E0B":"#2D3748"}}>Open</span></td>
        </tr>);})}</tbody>
      </table>
    </div>
    {!showAll&&assets.length>10&&<div style={{textAlign:"center",padding:"12px 0"}}><button onClick={()=>setShowAll(true)} style={{padding:"6px 20px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:5,color:"#F59E0B",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Show All {assets.length} Assets</button></div>}
    {showAll&&assets.length>10&&<div style={{textAlign:"center",padding:"12px 0"}}><button onClick={()=>setShowAll(false)} style={{padding:"6px 20px",background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#4B5563","#6B7280"),fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Show Less</button></div>}
  </div>);
}

/* ====================== NEWS CARD ====================================== */
function NewsCard({article,index,analysis,isAnalyzing,onAnalyze}){
  const hi=isHighImpact(article);const isErn=detectEarnings(article);const topics=detectTopics(article);const s=analysis?.sentiment;const sc2=s?SC[s]:null;
  const isMerged=(article.duplicateCount||1)>1;const impact=article.eventImpact||classifyNewsQuality(article);const driver=article.eventDriver||"Market flow";const sourceCount=article.sourceCount||article.duplicateSources?.length||1;
  return(<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${hi?"#EF444435":isErn?"rgba(245,158,11,0.18)":"#1F2937"}`,borderRadius:8,padding:18,display:"flex",flexDirection:"column",gap:11,transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=hi?"#EF4444":isErn?"rgba(245,158,11,0.35)":"#374151"} onMouseLeave={e=>e.currentTarget.style.borderColor=hi?"#EF444435":isErn?"rgba(245,158,11,0.18)":"#1F2937"}>
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>{hi&&<Pill label=" HIGH IMPACT" color="#EF4444"/>}{isErn&&<Pill label=" EARNINGS" color="#F59E0B"/>}{article.duplicateCount>1&&<Pill label={`${article.duplicateCount} MERGED`} color="#60A5FA"/>}{topics.slice(0,2).map(t=><Pill key={t.id} label={t.label} color={t.color}/>)}{s&&<Pill label={s} color={sc2.text} bg={sc2.bg} border={`${sc2.border}35`}/>}<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7}}>{article.source&&<SourceBadge source={article.source} link={article.link}/>}<span style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{timeAgo(article.pubDate)}</span></div></div>
    {isMerged&&<div style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.22)",borderRadius:5,padding:"7px 9px",lineHeight:1.5}}><span style={{fontWeight:800,color:"#93C5FD"}}>{article.eventLabel||"Grouped news event"}</span><span style={{color:th("#6B7280","#4B5563")}}>  -  {article.duplicateCount} articles  -  {sourceCount} source{sourceCount===1?"":"s"}  -  {driver}  -  {impact} impact</span></div>}
    <a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#F1F5F9","#111827"),fontSize:14,fontWeight:700,lineHeight:1.5,textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#F1F5F9"}>{article.title}</a>
    <div style={{color:"#5A6578",fontSize:12,lineHeight:1.7,borderLeft:"2px solid #1A2030",paddingLeft:12}}>{article.snippet}</div>
    {analysis?(<div style={{background:sc2?.bg,border:`1px solid ${sc2?.border}28`,borderRadius:6,padding:12}}><SectionLabel>AI Summary  -  Linked to live article</SectionLabel><div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.7,marginBottom:10}}>{analysis.summary}</div><div style={{color:"#5A6578",fontSize:11,lineHeight:1.6,borderTop:"1px solid #1F2937",paddingTop:8,marginBottom:10}}><span style={{color:th("#4B5563","#6B7280")}}>Reasoning: </span>{analysis.reasoning}</div>{analysis.affectedAssets?.length>0&&<div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>{analysis.affectedAssets.map(sym=>(<span key={sym} style={{fontSize:10,color:"#F59E0B",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.22)",borderRadius:4,padding:"2px 7px"}}>{sym}</span>))}</div>}<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #1F2937"}}><div style={{fontSize:10,color:th("#374151","#9CA3AF")}}>{article.source||"Yahoo Finance"}</div><a href={article.link||"#"} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:4,padding:"3px 9px",textDecoration:"none"}}>Read Full Article</a></div></div>):(<button onClick={()=>onAnalyze(index)} disabled={isAnalyzing} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"9px 16px",background:isAnalyzing?"rgba(245,158,11,0.04)":"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.22)",borderRadius:6,color:"#F59E0B",fontSize:12,cursor:isAnalyzing?"not-allowed":"pointer",width:"100%",fontFamily:"inherit"}} onMouseEnter={e=>{if(!isAnalyzing)e.currentTarget.style.background="rgba(245,158,11,0.14)";}} onMouseLeave={e=>e.currentTarget.style.background=isAnalyzing?"rgba(245,158,11,0.04)":"rgba(245,158,11,0.07)"}>{isAnalyzing?<><Spinner/> Analyzing...</>:" Analyze with AI"}</button>)}
  </div>);
}

/* ====================== OPPORTUNITIES --- "View Asset" opens Detail ==== */
function OppFilters({catF,setCatF,actF,setActF,riskF,setRiskF,shown,total}){const FG=({opts,sel,onSel,colors})=>(<div style={{display:"flex",gap:5,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>{opts.map(o=>{const c=colors?.[o]||"#6B7280";const active=sel===o;return(<button key={o} onClick={()=>onSel(active?"All":o)} style={{padding:"4px 9px",borderRadius:4,fontSize:9,fontWeight:700,letterSpacing:1,cursor:"pointer",textTransform:"uppercase",fontFamily:"inherit",background:active?`${c}18`:"transparent",border:`1px solid ${active?c:"#1F2937"}`,color:active?c:"#4B5563",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>{o}</button>);})}</div>);return(<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}><div style={{display:"flex",alignItems:"center",gap:7,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}><span style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",flexShrink:0}}>TYPE</span><FG opts={ALL_CATEGORIES} sel={catF} onSel={setCatF}/></div><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase"}}>ACTION</span><FG opts={["All","BUY","SELL","HOLD"]} sel={actF} onSel={setActF} colors={{BUY:"#10B981",SELL:"#EF4444",HOLD:"#F59E0B"}}/></div><div style={{width:1,height:16,background:"#1F2937",flexShrink:0}}/><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase"}}>RISK</span><FG opts={["All","Low","Medium","High"]} sel={riskF} onSel={setRiskF} colors={{Low:"#10B981",Medium:"#F59E0B",High:"#EF4444"}}/></div><div style={{marginLeft:"auto",fontSize:11,color:th("#4B5563","#6B7280")}}>{shown}<span style={{color:th("#374151","#9CA3AF")}}> / {total} signals</span></div></div></div>);}

function OppDetailModal({opp,news,onClose,onOpenDetail}){
  if(!opp)return null;const eOpp=enhanceOpportunity(opp);const ac2=AC[eOpp.action];const rc2=RC[eOpp.riskLevel]||RC.Medium;
  const whyExists=generateOppWhyExists(opp,news);const relNews=getAssetNews(opp.symbol,news);const catalystArticle=relNews[0]||null;
  const riskExplain=eOpp.riskLevel==="High"?"Elevated volatility - conservative position sizing with defined stop-loss is strongly recommended.":eOpp.riskLevel==="Medium"?"Moderate risk - standard position sizing with defined parameters is advised.":"Risk relatively contained - all investments still carry inherent risk.";
  return(<div style={{position:"fixed",inset:0,zIndex:9995,display:"flex",alignItems:"center",justifyContent:"center",background:th("rgba(0,0,0,0.88)","rgba(0,0,0,0.45)"),backdropFilter:"blur(8px)"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:th("#070B14","#FFFFFF"),border:`1px solid ${ac2.border}30`,borderRadius:10,maxWidth:620,width:"92%",maxHeight:"88vh",overflowY:"auto",animation:"fadeIn 0.2s ease",boxShadow:`0 0 60px ${ac2.border}15`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:`1px solid ${th("#111827","#E5E7EB")}`,background:`linear-gradient(90deg,${ac2.bg},transparent 60%)`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div><div style={{fontSize:24,fontWeight:700,color:"#F59E0B",letterSpacing:1,marginBottom:4}}>{eOpp.symbol}</div><div style={{fontSize:12,color:th("#6B7280","#4B5563")}}>{eOpp.name}</div></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span style={{fontSize:15,fontWeight:700,color:ac2.text,background:ac2.bg,border:`1px solid ${ac2.border}50`,borderRadius:6,padding:"5px 14px",letterSpacing:2}}>{eOpp.action}</span><Pill label={`${eOpp.riskLevel} Risk`} color={rc2.text} bg={rc2.bg} border={`${rc2.border}40`}/><Pill label={eOpp.category} color={eOpp.category==="Stock"?"#A78BFA":eOpp.category==="ETF"?"#60A5FA":"#34D399"}/>{eOpp.isMover&&<Pill label=" MOVER" color="#EF4444"/>}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>{onClose();onOpenDetail(eOpp.symbol);}} style={{padding:"6px 12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:6,color:"#F59E0B80",cursor:"pointer",fontSize:10,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.color="#F59E0B";e.currentTarget.style.borderColor="rgba(245,158,11,0.4)";}} onMouseLeave={e=>{e.currentTarget.style.color="#F59E0B80";e.currentTarget.style.borderColor="rgba(245,158,11,0.2)";}}>View Asset Open</button>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,color:th("#6B7280","#4B5563"),fontSize:16,cursor:"pointer",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.color="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.color="#6B7280"}>x</button>
      </div>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:14}}><SectionLabel> Why This Opportunity Exists</SectionLabel><div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.8}}>{whyExists}</div></div>
      {false&&(<div style={{background:th("#0A0A0F","#FFFFFF"),border:"1px solid rgba(96,165,250,0.24)",borderRadius:8,padding:14}}>
        <SectionLabel>AI Decision Logic</SectionLabel>
        <div style={{color:th("#D1D5DB","#1F2937"),fontSize:12,lineHeight:1.75,marginBottom:10}}>The engine combines market regime, price momentum, sector-relative strength, news context, company-specific catalysts, and volatility. Negative news alone does not create SELL; broad panic drops are treated separately from real company weakness.</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:8}}>
          {[{l:"Action",v:decision.action,c:ac2.text},{l:"Score",v:decision.score,c:"#60A5FA"},{l:"Regime",v:decision.regime.label,c:"#F59E0B"},{l:"Confidence",v:decision.confidence,c:CONF_C[decision.confidence]?.text||"#9CA3AF"},{l:"Rel Strength",v:`${decision.relativeStrength>0?"+":""}${decision.relativeStrength}`,c:decision.relativeStrength>=0?"#10B981":"#EF4444"},{l:"Risk",v:decision.risk,c:(RC[decision.risk]||RC.Medium).text}].map(x=>(<div key={x.l} style={{background:th("#080810","#F9FAFB"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:1.4,textTransform:"uppercase",marginBottom:3}}>{x.l}</div><div style={{fontSize:12,fontWeight:800,color:x.c}}>{x.v}</div></div>))}
        </div>
        <div style={{fontSize:11,color:th("#6B7280","#4B5563"),lineHeight:1.65,marginTop:10,borderLeft:"2px solid rgba(96,165,250,0.35)",paddingLeft:10}}>Support ${decision.support}  -  Resistance ${decision.resistance}  -  Company weakness flags {decision.companyWeak}  -  Company strength flags {decision.companyStrong}  -  Macro fear flags {decision.macroFear}</div>
      </div>)}
      <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:14}}><SectionLabel>AI AI Analysis</SectionLabel><div style={{color:th("#9CA3AF","#4B5563"),fontSize:12,lineHeight:1.8}}>{eOpp.reason}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><OutlookBox icon="" label="Short-Term Outlook" text={eOpp.shortTermOutlook}/><OutlookBox icon="" label="Long-Term Outlook" text={eOpp.longTermOutlook}/></div>
      {catalystArticle&&(<div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:8,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><SectionLabel> Live Market Catalyst</SectionLabel>{catalystArticle.source&&<SourceBadge source={catalystArticle.source} link={catalystArticle.link}/>}</div><a href={catalystArticle.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#F1F5F9","#111827"),fontSize:13,fontWeight:700,textDecoration:"none",lineHeight:1.5,display:"block",marginBottom:8}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#F1F5F9"}>{catalystArticle.title}</a><div style={{color:"#5A6578",fontSize:11,lineHeight:1.7,borderLeft:`2px solid ${th("#1F2937","#D1D5DB")}`,paddingLeft:10}}>{catalystArticle.snippet}</div></div>)}
      {relNews.length>0&&(<div><SectionLabel>News Live Related News  -  {relNews.length} article{relNews.length>1?"s":""}</SectionLabel><div style={{display:"flex",flexDirection:"column",gap:8}}>{relNews.slice(0,4).map((n,i)=>(<div key={i} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:7,padding:"11px 14px",display:"flex",gap:12,alignItems:"flex-start"}}><div style={{flex:1}}><a href={n.link||"#"} target="_blank" rel="noopener noreferrer" style={{color:th("#D1D5DB","#1F2937"),fontSize:12,fontWeight:700,textDecoration:"none",display:"block",marginBottom:3,lineHeight:1.4}} onMouseEnter={e=>e.target.style.color="#F59E0B"} onMouseLeave={e=>e.target.style.color="#D1D5DB"}>{n.title}</a><div style={{fontSize:9,color:th("#374151","#9CA3AF")}}>{n.source&&`${n.source}  -  `}{timeAgo(n.pubDate)}</div></div><a href={n.link||"#"} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:th("#4B5563","#6B7280"),background:th("#111827","#E5E7EB"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:4,padding:"3px 8px",textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>Open Source</a></div>))}</div></div>)}
      <div style={{background:rc2.bg,border:`1px solid ${rc2.border}35`,borderRadius:8,padding:14}}><SectionLabel>Risk Risk Assessment - <span style={{color:rc2.text}}>{eOpp.riskLevel} Risk</span></SectionLabel><div style={{color:th("#9CA3AF","#4B5563"),fontSize:12,lineHeight:1.7}}>{riskExplain}</div></div>
      <div style={{fontSize:10,color:"#1F2937",textAlign:"center"}}>Warning: Informational only - not financial advice</div>
    </div>
  </div></div>);
}

function OpportunityCard({opp,onOpen}){
  const eOpp=enhanceOpportunity(opp);const ac2=AC[eOpp.action];const rc2=RC[eOpp.riskLevel]||RC.Medium;
  const ps=eOpp.priceStatus;
  return(<div onClick={()=>onOpen(opp)} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${ac2.border}28`,borderRadius:8,padding:16,display:"flex",flexDirection:"column",gap:11,transition:"all 0.15s",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ac2.border}60`;e.currentTarget.style.boxShadow=`0 0 18px ${ac2.border}10`;e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${ac2.border}28`;e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div><div style={{color:"#F59E0B",fontWeight:700,fontSize:16,letterSpacing:1,marginBottom:2}}>{eOpp.symbol}</div><div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{color:th("#4B5563","#6B7280"),fontSize:11}}>{eOpp.name}</span><Pill label={eOpp.category} color={eOpp.category==="Stock"?"#A78BFA":eOpp.category==="ETF"?"#60A5FA":"#34D399"}/></div></div>
      <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}><Pill label={`${eOpp.riskLevel} Risk`} color={rc2.text} bg={rc2.bg} border={`${rc2.border}40`}/><span style={{fontSize:12,fontWeight:700,letterSpacing:2,color:ac2.text,background:ac2.bg,border:`1px solid ${ac2.border}50`,borderRadius:6,padding:"4px 11px"}}>{eOpp.action}</span></div>
    </div>
    {eOpp.isMover&&<div style={{fontSize:10,color:"#EF4444",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:4,padding:"3px 9px"}}> High volatility detected today</div>}
    {ps&&<div style={{display:"inline-flex",alignItems:"center",gap:5,alignSelf:"flex-start",fontSize:8,color:ps.color,background:`${ps.color}14`,border:`1px solid ${ps.color}35`,borderRadius:4,padding:"2px 7px",letterSpacing:1,textTransform:"uppercase"}}><span style={{width:5,height:5,borderRadius:3,background:ps.color,display:"inline-block"}}/>{ps.label}</div>}
    <div style={{color:th("#9CA3AF","#4B5563"),fontSize:12,lineHeight:1.65}}>{eOpp.reason}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <div style={{background:"#080810",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,padding:"8px 10px"}}><div style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginBottom:3}}> Short-Term</div><div style={{color:th("#6B7280","#4B5563"),fontSize:11,lineHeight:1.6}}>{eOpp.shortTermOutlook.slice(0,72)}...</div></div>
      <div style={{background:"#080810",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,padding:"8px 10px"}}><div style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginBottom:3}}> Long-Term</div><div style={{color:th("#6B7280","#4B5563"),fontSize:11,lineHeight:1.6}}>{eOpp.longTermOutlook.slice(0,72)}...</div></div>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:10,color:"#2D3748"}}><span style={{color:th("#374151","#9CA3AF")}}>Catalyst: </span>{eOpp.catalyst}</div>
      <span style={{fontSize:10,color:ac2.text,background:ac2.bg,border:`1px solid ${ac2.border}35`,borderRadius:4,padding:"2px 8px"}}>View Details</span>
    </div>
  </div>);
}

/* ====================== MAIN APP ======================================= */
export default function MarketAnalyzer(){
  const [news,setNews]           = useState(()=>dedupeNewsArticles(MOCK_NEWS,50));
  const [analyses,setAnalyses]   = useState({});
  const [analyzing,setAnalyzing] = useState({});
  const [tab,setTab]             = useState("news");
  const [catF,setCatF]           = useState("All");
  const [sortBy,setSortBy]       = useState({col:"symbol",dir:"asc"});
  const [notifs,setNotifs]       = useState([]);
  const [hiModal,setHiModal]     = useState(null);
  const [fetching,setFetching]   = useState(false);
  const [analyzingAll,setAnAll]  = useState(false);
  const [lastUpd,setLastUpd]     = useState(null);
  const [watchlist,setWatchlist] = useState(["NVDA","TSLA"]);
  const [autoRef,setAutoRef]     = useState(false);
  const [refMins,setRefMins]     = useState(15);
  const [countdown,setCountdown] = useState(0);
  const [oppCatF,setOppCatF]     = useState("All");
  const [oppActF,setOppActF]     = useState("All");
  const [oppRiskF,setOppRiskF]   = useState("All");
  const [mounted,setMounted]     = useState(false);
  const [newsFilter,setNewsFilter] = useState(["All"]); // array for multi-select
  const toggleFilter=(f)=>{
    setNewsFilter(prev=>{
      if(f==="All")return["All"];
      const without=prev.filter(x=>x!=="All");
      if(without.includes(f)){
        const next=without.filter(x=>x!==f);
        return next.length===0?["All"]:next;
      }
      return[...without,f];
    });
  };
  const isFilterActive=(f)=>newsFilter.includes(f);
  const [savedPresets,setSavedPresets] = useState([]);
  const [showPresetMenu,setShowPresetMenu] = useState(false);
  const [theme,setTheme]         = useState("dark"); // dark | light
  const [portfolio,setPortfolio] = useState([]);
  const [tradeHistory,setTradeHistory] = useState([]);
  const [initialCapital,setInitialCapital] = useState(10000);
  const [showCapitalEdit,setShowCapitalEdit] = useState(false);
  const [capitalInput,setCapitalInput] = useState("");
  const [portfolioTab,setPortfolioTab] = useState("open"); // open | closed | analytics
  const [sellModal,setSellModal] = useState(null); // {holdingId, symbol, maxShares}
  const [sellQty,setSellQty] = useState("");
  const [sellReason,setSellReason] = useState("Manual Exit");
  const [expandedPortfolioLogic,setExpandedPortfolioLogic] = useState({});
  const [signalBuyModal,setSignalBuyModal] = useState(null);
  const [signalBuyQty,setSignalBuyQty] = useState("1");
  const [showAddHolding,setShowAddHolding] = useState(false);
  const [holdingForm,setHoldingForm] = useState({symbol:"",shares:"",avgCost:""});
  const [pricesVersion,setPricesVersion] = useState(0);
  const [selOpp,setSelOpp]       = useState(null);
  const [telegramConfig,setTelegramConfig] = useState({botToken:"",chatId:"",enabled:false});
  const [liveStatus,setLiveStatus] = useState("demo");
  const [earningsCal,setEarningsCal] = useState(EARNINGS_CAL);
  const [mktEvents,setMktEvents] = useState(MKT_EVENTS);
  const [detailSym,setDetailSym] = useState(null);
  const [quickAnalyzing,setQuickAnalyzing] = useState(false);

  // -- Core callbacks (must be early) --
  const addNotif=useCallback((msg,type="info")=>{const id=Date.now()+Math.random();setNotifs(p=>[...p.slice(-49),{id,message:msg,type}]);},[]);
  const removeNotif=useCallback(id=>setNotifs(p=>p.filter(n=>n.id!==id)),[]);
  const clearNotifs=useCallback(()=>setNotifs([]),[]);
  const toggleWatch=useCallback(sym=>setWatchlist(p=>p.includes(sym)?p.filter(s=>s!==sym):[...p,sym]),[]);

  // Default filter presets
  const DEFAULT_PRESETS = [
    {id:"high-impact",name:" High Impact Only",filter:"High Impact"},
    {id:"crypto",name:"Capital Crypto Focus",filter:"Crypto"},
    {id:"tech",name:"Tech Tech",filter:"Tech"},
    {id:"macro",name:" Macro Mode",filter:"Macro"},
    {id:"earnings",name:" Earnings",filter:"Earnings"},
    {id:"ai",name:"AI AI",filter:"AI"},
    {id:"energy",name:" Energy",filter:"Energy"},
    {id:"forex",name:"Finance Forex",filter:"Forex"},
    {id:"realestate",name:"Real Estate Real Estate",filter:"Real Estate"},
    {id:"commodities",name:"Bio Commodities",filter:"Commodities"},
    {id:"healthcare",name:"Healthcare Healthcare",filter:"Healthcare"},
    {id:"defense",name:"Risk Defense",filter:"Defense"},
    {id:"finance",name:"Bank Finance",filter:"Finance"},
  ];

  // Load saved state from localStorage
  useEffect(()=>{
    try{
      const saved=localStorage.getItem("mi-presets");
      if(saved)setSavedPresets(JSON.parse(saved));
      const savedFilter=localStorage.getItem("mi-newsFilter");
      if(savedFilter){try{setNewsFilter(JSON.parse(savedFilter));}catch{setNewsFilter([savedFilter]);}}
      const savedWatch=localStorage.getItem("mi-watchlist");
      if(savedWatch)setWatchlist(JSON.parse(savedWatch));
      const savedTheme=localStorage.getItem("mi-theme");
      if(savedTheme)setTheme(savedTheme);
      const savedPortfolio=localStorage.getItem("mi-portfolio");
      if(savedPortfolio)setPortfolio(JSON.parse(savedPortfolio));
      const savedTrades=localStorage.getItem("mi-trades");
      if(savedTrades)setTradeHistory(JSON.parse(savedTrades));
      const savedCapital=localStorage.getItem("mi-capital");
      if(savedCapital)setInitialCapital(parseFloat(savedCapital));
      const tgToken=localStorage.getItem("mi-tg-token");
      const tgChat=localStorage.getItem("mi-tg-chat");
      const tgEnabled=localStorage.getItem("mi-tg-enabled");
      if(tgToken||tgChat)setTelegramConfig({botToken:tgToken||"",chatId:tgChat||"",enabled:tgEnabled==="1"});
    }catch{}
  },[]);

  // Persist to localStorage
  useEffect(()=>{if(mounted)try{localStorage.setItem("mi-watchlist",JSON.stringify(watchlist));}catch{}},[watchlist,mounted]);
  useEffect(()=>{if(mounted)try{localStorage.setItem("mi-portfolio",JSON.stringify(portfolio));}catch{}},[portfolio,mounted]);
  useEffect(()=>{if(mounted)try{localStorage.setItem("mi-trades",JSON.stringify(tradeHistory));}catch{}},[tradeHistory,mounted]);
  useEffect(()=>{if(mounted)try{localStorage.setItem("mi-capital",String(initialCapital));}catch{}},[initialCapital,mounted]);
  useEffect(()=>{if(mounted)try{localStorage.setItem("mi-theme",theme);}catch{}},[theme,mounted]);

  // Portfolio helpers
  const getBuyingPower=()=>Math.max(initialCapital+totalRealized-portfolio.reduce((s,h)=>s+(Number(h.avgCost)||0)*(Number(h.shares)||0),0),0);
  const validateBuyingPower=(shares,price,sym)=>{
    const cost=shares*price;
    const buyingPower=getBuyingPower();
    if(cost>buyingPower+0.01){
      addNotif(`Not enough buying power for ${displaySymbol(sym)}. Need $${cost.toFixed(2)}, available $${buyingPower.toFixed(2)}.`,"alert");
      return false;
    }
    return true;
  };
  const addPortfolioHolding=(holding,msg)=>{
    if(!validateBuyingPower(holding.shares,holding.avgCost,holding.symbol))return false;
    setPortfolio(p=>[...p,{id:Date.now(),addedAt:new Date().toISOString(),...holding}]);
    addNotif(msg||`Added ${holding.shares} shares of ${displaySymbol(holding.symbol)}`,"success");
    return true;
  };
  const addHolding=()=>{
    const sym=holdingForm._fullSymbol||holdingForm.symbol.toUpperCase().trim();
    const shares=parseFloat(holdingForm.shares);
    const avgCost=parseFloat(holdingForm.avgCost);
    if(!sym||isNaN(shares)||isNaN(avgCost)||shares<=0||avgCost<=0){addNotif("Fill all fields correctly","alert");return;}
    if(!addPortfolioHolding({symbol:sym,shares,avgCost},`Added ${shares} shares of ${displaySymbol(sym)}`))return;
    setHoldingForm({symbol:"",shares:"",avgCost:""});
    setShowAddHolding(false);
  };
  const removeHolding=(id)=>setPortfolio(p=>p.filter(h=>h.id!==id));
  const executeSell=(holdingId,qty,reason)=>{
    const holding=portfolio.find(h=>h.id===holdingId);if(!holding)return;
    const asset=ASSETS.find(a=>a.symbol===holding.symbol||displaySymbol(a.symbol)===holding.symbol||a.symbol===holding._fullSymbol);
    const sellPrice=asset?.price||holding.avgCost;const sellQtyNum=parseFloat(qty);
    if(isNaN(sellQtyNum)||sellQtyNum<=0||sellQtyNum>holding.shares)return;
    const costBasis=holding.avgCost*sellQtyNum;const revenue=sellPrice*sellQtyNum;const realizedPL=revenue-costBasis;
    const holdDays=Math.floor((Date.now()-new Date(holding.addedAt).getTime())/(1000*60*60*24));
    const trade={id:Date.now(),symbol:holding.symbol,name:asset?.name||holding.symbol,buyPrice:holding.avgCost,sellPrice,quantity:sellQtyNum,realizedPL,realizedPct:costBasis>0?((realizedPL/costBasis)*100):0,buyDate:holding.addedAt,sellDate:new Date().toISOString(),holdDays,reason,type:"sell"};
    setTradeHistory(p=>[trade,...p]);
    if(sellQtyNum>=holding.shares)setPortfolio(p=>p.filter(h=>h.id!==holdingId));
    else setPortfolio(p=>p.map(h=>h.id===holdingId?{...h,shares:h.shares-sellQtyNum}:h));
    setSellModal(null);setSellQty("");setSellReason("Manual Exit");
    addNotif(`OK Closed ${sellQtyNum} ${displaySymbol(holding.symbol)} at $${sellPrice.toFixed(2)} (${realizedPL>=0?"+":""}$${realizedPL.toFixed(2)})`,"success");
  };
  const executeSignalBuy=()=>{
    if(!signalBuyModal)return;
    const qty=parseFloat(signalBuyQty);
    if(isNaN(qty)||qty<=0){addNotif("Enter a valid share quantity","alert");return;}
    if(!addPortfolioHolding({symbol:signalBuyModal.symbol,shares:qty,avgCost:signalBuyModal.price,source:"AI Signal",signalReason:signalBuyModal.reason},`Added ${qty} ${signalBuyModal.displaySym} from ${signalBuyModal.confidence} confidence ${signalBuyModal.action} signal`))return;
    setSignalBuyModal(null);setSignalBuyQty("1");
  };
  const getAISignal=(h)=>{
    const asset=ASSETS.find(a=>a.symbol===h.symbol||displaySymbol(a.symbol)===h.symbol||a.symbol===h._fullSymbol);
    const price=asset?.price||h.avgCost;const change=asset?.change||0;
    const gainPct=h.avgCost>0?((price-h.avgCost)/h.avgCost*100):0;
    const holdDays=Math.floor((Date.now()-new Date(h.addedAt).getTime())/(1000*60*60*24));
    const inst=institutionalDecision(asset||{symbol:h.symbol,price,change,category:h.category||"Stock"},news,"Neutral",h.avgCost,portfolio);
    const dataNote=inst.history?.available?" Uses historical trend, support/resistance, and volume.":" Historical candles not loaded yet; levels are estimated.";
    const benchNote=inst.relativeHistory?.available?` Benchmark view: ${inst.relativeHistory.leadership}, ${inst.relativeHistory.marketRel20>=0?"+":""}${inst.relativeHistory.marketRel20}% vs ${inst.benchmarks?.market||"market"} over 20 sessions.`:"";
    if(gainPct>=18&&inst.action!=="BUY")return{signal:"TAKE PROFIT",color:"#F59E0B",reason:`Up ${gainPct.toFixed(1)}%; trim only into strength, not from fear. ${inst.regime.label} regime.${dataNote}${benchNote}`,confidence:"Medium",risk:inst.risk,inst};
    if(inst.action==="SELL")return{signal:"EXIT",color:"#EF4444",reason:`${inst.confidence} confidence EXIT. This is reserved for real damage: ${inst.newsMode} with ${inst.structure}. Support $${inst.support}; resistance $${inst.resistance}.${dataNote}`,confidence:inst.confidence,risk:inst.risk,inst};
    if(inst.action==="BUY")return{signal:"ADD",color:"#10B981",reason:`${inst.confidence} confidence ADD. ${inst.context} Add only with sizing discipline; do not chase if price is extended above resistance $${inst.resistance}.${dataNote}${benchNote}`,confidence:inst.confidence,risk:inst.risk,inst};
    const extra=gainPct<0&&inst.broadFear?" Drop appears market-wide; avoid panic selling.":gainPct>0?" Protect gains while trend stays intact.":" Wait for confirmation.";
    return{signal:"HOLD",color:"#60A5FA",reason:`${inst.confidence} confidence HOLD. ${inst.context}${extra}${dataNote}${benchNote}`,confidence:inst.confidence,risk:inst.risk,inst};
  };
  const getPortfolioDecisionChecklist=(h,sig)=>{
    const inst=sig.inst||{};const rh=inst.relativeHistory||{};const hist=inst.history||{};const b=inst.benchmarks||{};
    const pos=(v)=>Number(v||0)>=0?"+":"";
    const asset=ASSETS.find(a=>a.symbol===h.symbol||displaySymbol(a.symbol)===h.symbol||a.symbol===h._fullSymbol);
    const fullSym=asset?.symbol||h._fullSymbol||h.symbol;
    const liveQuotes=ASSETS.filter(a=>a._live).length;
    const cachedQuotes=ASSETS.filter(a=>a._fetchedAt).length;
    const regimeStatus=liveQuotes>=3?"Pass":cachedQuotes>=3?"Warning":"Fail";
    const hasHistory=!!hist.available;
    const technicalStatus=hasHistory?"Pass":"Fail";
    const supportStatus=hasHistory?"Pass":"Fail";
    const benchmarkStatus=rh.available?((rh.market?.available&&rh.sector?.available)?"Pass":"Warning"):"Fail";
    const relatedNews=getAssetNews(fullSym,news);
    const analyzedNews=Object.values(analyses).filter(a=>a?.affectedAssets?.some(sym=>displaySymbol(sym)===displaySymbol(fullSym))).length;
    const newsCount=(inst.newsQuality?.high||0)+(inst.newsQuality?.medium||0)+(inst.newsQuality?.noise||0);
    const lowQualityNews=(inst.newsQuality?.noise||0)>((inst.newsQuality?.high||0)+(inst.newsQuality?.medium||0));
    const hasAnyNews=Array.isArray(news)&&news.length>0;
    const newsStatus=!hasAnyNews?"Fail":relatedNews.length===0||analyzedNews===0||lowQualityNews?"Warning":"Pass";
    const fearStatus=!hasAnyNews?"Fail":hasHistory&&relatedNews.length>0?"Pass":"Warning";
    const portfolioStatus=portfolio.length>0?"Pass":"Warning";
    const confidenceStatus=[technicalStatus,supportStatus,benchmarkStatus,newsStatus,fearStatus].includes("Fail")?"Warning":"Pass";
    const priceStatus=asset?._live?"Pass":asset?._fetchedAt?"Warning":"Fail";
    return[
      {l:"Final Action",v:sig.signal,d:`Price data health: ${asset?._live?"live quote loaded":asset?._fetchedAt?"cached quote is being used":"fallback/demo price is being used"}. Trade engine action: ${inst.action||"HOLD"}.`,c:sig.color,status:priceStatus},
      {l:"Market Regime",v:inst.regime?.label||"Unknown",d:regimeStatus==="Pass"?`Live market quotes loaded for regime detection. Risk mode ${inst.regime?.riskMode||"neutral"}.`:regimeStatus==="Warning"?`Regime is using cached quote data. Risk mode ${inst.regime?.riskMode||"neutral"}.`:`Regime lacks enough live/cached market quotes and is using fallback data.`,c:"#F59E0B",status:regimeStatus},
      {l:"Trend / Structure",v:inst.structure||"Unknown",d:hist.available?`Historical candles loaded: 20-session ${pos(hist.return20)}${hist.return20}% and 60-session ${pos(hist.return60)}${hist.return60}%.`:"Historical candles are missing, so this section is using fallback structure and the data-health check fails.",c:hist.available?(inst.technicalScore>=0?"#10B981":"#F59E0B"):"#EF4444",status:technicalStatus},
      {l:"Support / Resistance",v:`$${inst.support||h.currentPrice} / $${inst.resistance||h.currentPrice}`,d:hist.available?`Support/resistance came from historical candle data. Source: ${inst.supportSource||"history"}.`:`Support/resistance are estimated because candle data is missing.`,c:hist.available?"#60A5FA":"#EF4444",status:supportStatus},
      {l:"Benchmark Test",v:rh.available?rh.leadership:"Missing Data",d:rh.available?`${displaySymbol(h.symbol)} is ${pos(rh.marketRel20)}${rh.marketRel20}% vs ${b.market||"market"} and ${pos(rh.sectorRel20)}${rh.sectorRel20}% vs ${b.sector||"sector"} over 20 sessions.`:"Benchmark candles are missing, so this test cannot fully validate relative strength.",c:benchmarkStatus==="Pass"?"#10B981":benchmarkStatus==="Warning"?"#F59E0B":"#EF4444",status:benchmarkStatus},
      {l:"News Quality",v:inst.newsMode||"Limited",d:!hasAnyNews?"No news feed is loaded.":relatedNews.length===0?"Market news is loaded, but no company-specific article is linked to this asset yet.":analyzedNews===0?`${relatedNews.length} related article(s) loaded, but not analyzed yet.`:`${relatedNews.length} related article(s), ${analyzedNews} analyzed. High ${inst.newsQuality?.high||0}; medium ${inst.newsQuality?.medium||0}; noise ${inst.newsQuality?.noise||0}.`,c:newsStatus==="Fail"?"#EF4444":newsStatus==="Warning"?"#F59E0B":"#10B981",status:newsStatus},
      {l:"Fear vs Damage",v:inst.realDamage?"Real Damage":inst.broadFear?"Broad Fear":"No Damage Flag",d:fearStatus==="Fail"?"Cannot separate fear from damage because no news feed is loaded.":fearStatus==="Warning"?relatedNews.length===0?"Macro/market news exists, but company-specific confirmation is missing.":"Fear/damage read uses news plus estimated structure because candles are missing.":inst.realDamage?"Data loaded and real damage is detected.":inst.broadFear?"Data loaded and broad market fear is detected.":"Data loaded; no confirmed company damage is driving the action.",c:inst.realDamage?"#EF4444":inst.broadFear?"#F59E0B":"#10B981",status:fearStatus},
      {l:"Portfolio Exposure",v:inst.portfolioExposure||"None",d:`Portfolio lots are loaded. Current P/L ${h.gainPct>=0?"+":""}${h.gainPct.toFixed(1)}%.`,c:inst.risk==="High"?"#EF4444":inst.risk==="Medium"?"#F59E0B":"#10B981",status:portfolioStatus},
      {l:"Confidence",v:`${inst.confidence||sig.confidence} / ${inst.risk||sig.risk} Risk`,d:confidenceStatus==="Pass"?"Core data checks are loaded, so confidence can be read normally.":"One or more required data checks failed, so confidence should be downgraded.",c:confidenceStatus==="Pass"?"#10B981":"#F59E0B",status:confidenceStatus}
    ];
  };
  const getDecisionReliability=(logic=[])=>{
    const core=logic.filter(i=>!["Final Action","Portfolio Exposure","Confidence"].includes(i.l));
    const pass=core.filter(i=>i.status==="Pass").length;
    const warn=core.filter(i=>i.status==="Warning").length;
    const fail=core.filter(i=>i.status==="Fail").length;
    const total=core.length||1;
    const level=fail>=2?"Low":fail===1||warn>=2?"Medium":"High";
    const color=level==="High"?"#10B981":level==="Medium"?"#F59E0B":"#EF4444";
    const missing=core.filter(i=>i.status==="Fail").map(i=>i.l);
    const weak=core.filter(i=>i.status==="Warning").map(i=>i.l);
    return{level,color,pass,warn,fail,total,missing,weak,label:`${pass}/${total} checks passed`};
  };
  const getPortfolioDecisionSentence=(h,sig)=>{
    const inst=sig.inst||{};const rh=inst.relativeHistory||{};const b=inst.benchmarks||{};
    const sym=displaySymbol(h.symbol);const support=Number(inst.support||h.currentPrice);const resistance=Number(inst.resistance||h.currentPrice);
    const supportText=Number.isFinite(support)?`support $${support.toFixed(2)}`:"estimated support";
    const resistanceText=Number.isFinite(resistance)?`resistance $${resistance.toFixed(2)}`:"estimated resistance";
    const benchmarkText=rh.available?`${rh.leadership==="leader"?"outperforming":rh.leadership==="laggard"?"lagging":"moving close to"} ${b.market||"the market"}`:"waiting on benchmark data";
    const damageText=inst.realDamage?"company or technical damage is detected":inst.broadFear?"the weakness looks more like broad market fear than company damage":"no company damage is detected";
    if(sig.signal==="TAKE PROFIT")return`Decision: TAKE PROFIT because ${sym} is up ${h.gainPct>=0?"+":""}${h.gainPct.toFixed(1)}%, price is near ${resistanceText}, and trimming strength is safer than reacting to fear.`;
    if(sig.signal==="EXIT")return`Decision: EXIT because ${sym} has ${inst.structure||"weak structure"}, ${damageText}, and the decision engine does not see enough support confirmation.`;
    if(sig.signal==="ADD")return`Decision: ADD because ${sym} has constructive structure, is ${benchmarkText}, and ${damageText}; size the position around ${supportText}.`;
    return`Decision: HOLD because ${sym} is being checked against ${supportText}, is ${benchmarkText}, and ${damageText}.`;
  };
  const winTrades=tradeHistory.filter(t=>t.realizedPL>0);
  const totalRealized=tradeHistory.reduce((s,t)=>s+t.realizedPL,0);
  const winRate=tradeHistory.length>0?(winTrades.length/tradeHistory.length*100):0;
  const bestTrade=tradeHistory.length>0?tradeHistory.reduce((b,t)=>t.realizedPL>b.realizedPL?t:b,tradeHistory[0]):null;
  const worstTrade=tradeHistory.length>0?tradeHistory.reduce((w,t)=>t.realizedPL<w.realizedPL?t:w,tradeHistory[0]):null;
  const avgHoldTime=tradeHistory.length>0?Math.round(tradeHistory.reduce((s,t)=>s+t.holdDays,0)/tradeHistory.length):0;
  const _pv=pricesVersion; // reference to trigger re-render when prices update
  const portfolioStats=useMemo(()=>portfolio.map(h=>{
    const asset=ASSETS.find(a=>a.symbol===h.symbol||displaySymbol(a.symbol)===h.symbol||a.symbol===h._fullSymbol);
    const livePrice=asset?.price||0;
    const currentPrice=livePrice>0?livePrice:h.avgCost;
    const priceLoaded=!!asset?._live;
    const marketValue=currentPrice*h.shares;
    const costBasis=h.avgCost*h.shares;
    const gainLoss=priceLoaded?(marketValue-costBasis):0;
    const gainPct=priceLoaded&&costBasis>0?((gainLoss/costBasis)*100):0;
    const todayDollar=priceLoaded?((currentPrice-h.avgCost)*h.shares):0;
    const todayPct=priceLoaded&&h.avgCost>0?((currentPrice-h.avgCost)/h.avgCost*100):0;
    return{...h,currentPrice,marketValue,costBasis,gainLoss,gainPct,todayDollar,todayPct,priceLoaded,name:asset?.name||h.symbol,category:asset?.category||"Stock",change:asset?.change||0};
  }),[portfolio,pricesVersion]);
  const totalValue=portfolioStats.reduce((s,h)=>s+h.marketValue,0);
  const totalCost=portfolioStats.reduce((s,h)=>s+h.costBasis,0);
  const totalGain=totalValue-totalCost;
  const totalGainPct=totalCost>0?((totalGain/totalCost)*100):0;
  const todayPL=portfolioStats.reduce((s,h)=>s+h.todayDollar,0);
  const pricesReady=portfolioStats.length===0||portfolioStats.some(h=>h.priceLoaded);
  // Capital tracking
  const totalInvested=totalCost;
  const remainingCash=initialCapital-totalInvested+totalRealized;
  const portfolioEquity=initialCapital+totalRealized+totalGain;
  const portfolioGrowth=initialCapital>0?((portfolioEquity-initialCapital)/initialCapital*100):0;
  const totalAccountValue=portfolioEquity;
  const allocationPct=initialCapital>0?(totalInvested/initialCapital)*100:0;
  const cashAvailable=Math.max(remainingCash,0);
  const cashAllocationPct=Math.min(allocationPct,100);
  const overBudget=Math.max(totalInvested-(initialCapital+totalRealized),0);

  // News filter logic
  const FILTER_FNS={
    "High Impact":(a)=>isHighImpact(a),
    "Medium Impact":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["market","stock","update","report","analysis","quarter","growth","decline","investor","revenue","outlook","sector","industry","earnings","profit","forecast"].some(kw=>t.includes(kw))&&!isHighImpact(a);},
    "Crypto":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["bitcoin","btc","crypto","ethereum","eth","solana","sol","xrp","ripple","dogecoin","doge","cardano","ada","defi","nft","blockchain","web3","binance","coinbase","altcoin","stablecoin","token","halving"].some(kw=>t.includes(kw));},
    "Tech":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["tech","ai","semiconductor","chip","nvidia","apple","microsoft","google","amazon","meta","cloud","software","saas","cyber","quantum","data center"].some(kw=>t.includes(kw));},
    "Macro":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["fed","federal reserve","inflation","cpi","gdp","unemployment","rate cut","rate hike","tariff","trade war","treasury","bond","yield","recession","jobs","fomc","powell","fiscal","monetary"].some(kw=>t.includes(kw));},
    "Earnings":(a)=>detectEarnings(a),
    "AI":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["artificial intelligence","machine learning","llm","chatgpt","generative ai","ai model","neural","deep learning","openai","anthropic","ai chip","ai server","ai infrastructure"].some(kw=>t.includes(kw));},
    "Energy":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["oil","crude","opec","natural gas","renewable","solar","wind","energy","petroleum","barrel","pipeline","drilling","exxon","chevron","bp"].some(kw=>t.includes(kw));},
    "Forex":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["forex","currency","dollar","euro","yen","sterling","pound","exchange rate","central bank","ecb","boj","boe","fx","foreign exchange"].some(kw=>t.includes(kw));},
    "Real Estate":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["real estate","housing","mortgage","reit","property","home sales","home prices","rent","landlord","commercial property","housing market"].some(kw=>t.includes(kw));},
    "Commodities":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["gold","silver","copper","platinum","commodity","commodities","mining","precious metal","industrial metal","agricultural","wheat","corn","lumber"].some(kw=>t.includes(kw));},
    "Healthcare":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["health","pharma","pharmaceutical","drug","fda","clinical trial","vaccine","biotech","medical","hospital","patient","therapy","treatment","medicare","medicaid","healthcare"].some(kw=>t.includes(kw));},
    "Defense":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["defense","military","pentagon","missile","fighter jet","lockheed","boeing","raytheon","northrop","army","navy","air force","weapons","drone","warfare","nato"].some(kw=>t.includes(kw));},
    "Finance":(a)=>{const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return["bank","banking","jpmorgan","goldman","morgan stanley","credit","loan","mortgage","interest rate","deposit","fintech","insurance","hedge fund","private equity","ipo","wall street"].some(kw=>t.includes(kw));},
  };
  const filterNews=(articles)=>{
    if(newsFilter.includes("All"))return articles;
    const sentFilters=newsFilter.filter(f=>["Bullish","Bearish","Neutral"].includes(f));
    const catFilters=newsFilter.filter(f=>!["Bullish","Bearish","Neutral"].includes(f));
    return articles.filter((a,i)=>{
      const matchesCat=catFilters.length===0||catFilters.some(f=>{
        if(FILTER_FNS[f])return FILTER_FNS[f](a);
        const custom=savedPresets.find(p=>p.name===f);
        if(custom?.keywords){const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return custom.keywords.some(kw=>t.includes(kw.toLowerCase()));}
        return false;
      });
      const matchesSent=sentFilters.length===0||sentFilters.some(s=>analyses[i]?.sentiment===s);
      return matchesCat&&matchesSent;
    });
  };
  const filteredNews=filterNews(news);

  const saveCurrentFilter=()=>{
    const name=safePrompt("Name this filter preset:");
    if(!name)return;
    const keywords=safePrompt("Enter keywords (comma-separated):");
    if(!keywords)return;
    const preset={id:Date.now().toString(),name,keywords:keywords.split(",").map(k=>k.trim()),filter:name};
    const updated=[...savedPresets,preset];
    setSavedPresets(updated);
    try{localStorage.setItem("mi-presets",JSON.stringify(updated));}catch{}
    toggleFilter(name);
    addNotif(`OK Preset "${name}" saved!`,"success");
  };

  const deletePreset=(id)=>{
    const updated=savedPresets.filter(p=>p.id!==id);
    setSavedPresets(updated);
    try{localStorage.setItem("mi-presets",JSON.stringify(updated));}catch{}
    if(newsFilter.includes(savedPresets.find(p=>p.id===id)?.name))setNewsFilter(["All"]);
    addNotif("Preset deleted","info");
  };
  useEffect(()=>{
    setMounted(true);
    // Restore cached prices - these are REAL prices from previous Finnhub calls
    try{
      const cached=localStorage.getItem("mi-prices");
      if(cached){
        const priceCache=JSON.parse(cached);
        let restored=0;
        ASSETS.forEach(a=>{
          if(priceCache[a.symbol]&&(priceCache[a.symbol].p>0||Array.isArray(priceCache[a.symbol].h))){
            if(priceCache[a.symbol].p>0){
              a.price=priceCache[a.symbol].p;
              a.change=priceCache[a.symbol].c;
              a._live=true; // mark as real data
              a._fetchedAt=priceCache[a.symbol].t||Date.now();
            }
            if(Array.isArray(priceCache[a.symbol].h)){
              a._history=priceCache[a.symbol].h;
              a._historyFetchedAt=priceCache[a.symbol].ht||priceCache[a.symbol].t||Date.now();
            }
            restored++;
          }
        });
        if(restored>0)setPricesVersion(v=>v+1);
      }
    }catch{}
  },[]);

  // -- Dynamic Earnings & Economic Calendar --------------------------

  useEffect(()=>{
    const fetchCalendars=async()=>{
      const today=new Date();
      const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const from=fmt(today);
      const to30=new Date(today);to30.setDate(to30.getDate()+30);
      const toStr=fmt(to30);
      const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      // Fetch earnings calendar
      try{
        const tracked=ASSETS.filter(a=>a.category==="Stock"||a.category==="AI").map(a=>a.symbol);
        const res=await fetch(finnhubUrl("/calendar/earnings",{from,to:toStr}));
        const data=await res.json();
        if(data?.earningsCalendar){
          const relevant=data.earningsCalendar.filter(e=>tracked.includes(e.symbol)).slice(0,8);
          if(relevant.length>0){
            const cal=relevant.map(e=>{
              const eDate=new Date(e.date);
              const diff=Math.max(0,Math.ceil((eDate.getTime()-today.getTime())/(1000*60*60*24)));
              const asset=ASSETS.find(a=>a.symbol===e.symbol);
              return{asset:e.symbol,name:asset?.name||e.symbol,date:`${monthNames[eDate.getMonth()]} ${eDate.getDate()}`,daysUntil:diff,vol:diff<=7?"High":diff<=14?"Medium":"Low"};
            });
            EARNINGS_CAL=cal;
            setEarningsCal(cal);
          }
        }
      }catch(e){console.warn("Earnings calendar fetch failed",e);}

      // Fetch economic calendar
      try{
        const res=await fetch(finnhubUrl("/calendar/economic",{from,to:toStr}));
        const data=await res.json();
        if(data?.economicCalendar){
          const important=data.economicCalendar.filter(e=>e.impact==="high"||e.impact==="medium").slice(0,8);
          if(important.length>0){
            const events=important.map(e=>{
              const eDate=new Date(e.time||e.date||from);
              const dateStr=`${monthNames[eDate.getMonth()]} ${eDate.getDate()}`;
              const isFed=(e.event||"").toLowerCase().includes("fed")||(e.event||"").toLowerCase().includes("fomc")||(e.event||"").toLowerCase().includes("interest rate");
              const isEarnings=(e.event||"").toLowerCase().includes("earnings");
              const type=isFed?"fed":isEarnings?"earnings":"macro";
              return{date:dateStr,type,title:e.event||"Economic Event",impact:e.impact==="high"?"High":"Medium"};
            });
            MKT_EVENTS=events;
            setMktEvents(events);
          }
        }
      }catch(e){console.warn("Economic calendar fetch failed",e);}
    };
    const calTimer=setTimeout(fetchCalendars,30000);
    return()=>clearTimeout(calTimer);
  },[]);

  // ========== SMART PRICE ENGINE ======================================
  // Priority: 1.Search 2.Portfolio 3.Watchlist 4.Market 5.Signals
  // Queue system: max 55 calls/min, 1 per second, cache everything
  
  const priceQueueRef=useRef([]);
  const lastFetchTimeRef=useRef(0);
  const callCountRef=useRef(0);
  const callResetRef=useRef(Date.now());
  const processingRef=useRef(false);

  // Save price to cache
  const savePriceCache=useCallback(()=>{
    try{
      const cache={};
      ASSETS.forEach(a=>{if(a._live||a._history?.length)cache[a.symbol]={p:a.price,c:a.change,t:Date.now(),h:a._history||null,ht:a._historyFetchedAt||null};});
      localStorage.setItem("mi-prices",JSON.stringify(cache));
    }catch{}
  },[]);

  // /stock/candle is blocked on Finnhub's free tier — stub out to avoid wasted requests
  const fetchCandleHistory=useCallback(async(_sym:string)=>false,[]);

  const attachBenchmarkHistories=useCallback(async(sym)=>{
    const asset=ASSETS.find(a=>a.symbol===sym);
    if(!asset)return;
    const {market,sector}=getBenchmarkSymbols(asset);
    const symbols=[market,sector].filter(Boolean).filter((s,i,arr)=>arr.indexOf(s)===i&&s!==sym);
    for(const benchSym of symbols){
      await fetchCandleHistory(benchSym);
    }
    const marketAsset=ASSETS.find(a=>a.symbol===market);
    const sectorAsset=ASSETS.find(a=>a.symbol===sector);
    asset._marketBenchmark=market;
    asset._sectorBenchmark=sector;
    asset._marketHistory=marketAsset?._history||[];
    asset._sectorHistory=sectorAsset?._history||[];
  },[fetchCandleHistory]);

  // Fetch single symbol with rate limiting
  const fetchSingleQuote=useCallback(async(sym)=>{
    if(sym.includes(":")||sym.startsWith("^"))return false;
    // Rate limit: max 55/min
    const now=Date.now();
    if(now-callResetRef.current>60000){callCountRef.current=0;callResetRef.current=now;}
    if(callCountRef.current>=55)return false; // rate limited, skip
    
    // Min 1s between calls
    const elapsed=now-lastFetchTimeRef.current;
    if(elapsed<1000)await new Promise(r=>setTimeout(r,1000-elapsed));
    
    try{
      callCountRef.current++;
      lastFetchTimeRef.current=Date.now();
      // Use request coalescing to avoid duplicate simultaneous requests
      const res=await requestBatcher.fetchWithCoalescing(finnhubUrl("/quote",{symbol:sym}), undefined, 3, 100);
      const data=await res.json();
      if(data&&data.c>0){
        const asset=ASSETS.find(a=>a.symbol===sym);
        if(asset){
          asset.price=data.c;
          asset.change=data.pc>0?+((data.c-data.pc)/data.pc*100).toFixed(2):0;
          asset._live=true;
          // Fetch candle and benchmark histories in parallel
          await Promise.all([
            fetchCandleHistory(sym),
            attachBenchmarkHistories(sym)
          ]);
          return true;
        }
      }
    }catch(e){console.warn("Quote error:",sym,e);}
    return false;
  },[fetchCandleHistory,attachBenchmarkHistories]);

  // Process queue one by one
  const processQueue=useCallback(async()=>{
    if(processingRef.current)return;
    processingRef.current=true;
    let updated=0;
    while(priceQueueRef.current.length>0){
      const sym=priceQueueRef.current.shift();
      // Skip if already live and fetched recently
      const asset=ASSETS.find(a=>a.symbol===sym);
      if(asset?._live&&asset?._fetchedAt&&Date.now()-asset._fetchedAt<60000){
        if(asset._history?.length&&!asset._marketHistory?.length)await attachBenchmarkHistories(sym);
        continue;
      }
      const ok=await fetchSingleQuote(sym);
      if(ok){
        const a=ASSETS.find(x=>x.symbol===sym);
        if(a)a._fetchedAt=Date.now();
        updated++;
        if(updated%5===0){setPricesVersion(v=>v+1);savePriceCache();}
      }else if(callCountRef.current>=55){
        // Rate limited - wait for reset
        const waitMs=Math.max(0,60000-(Date.now()-callResetRef.current))+1000;
        await new Promise(r=>setTimeout(r,waitMs));
        callCountRef.current=0;callResetRef.current=Date.now();
      }
    }
    if(updated>0){setPricesVersion(v=>v+1);savePriceCache();}
    processingRef.current=false;
  },[fetchSingleQuote,savePriceCache,attachBenchmarkHistories]);

  // Enqueue symbols with priority (lower = higher priority)
  const enqueueSymbols=useCallback((symbols,priority=5)=>{
    const fetchable=symbols.filter(s=>s&&!s.includes(":")&&!s.startsWith("^"));
    if(priority<=2){
      // High priority - put at front
      priceQueueRef.current=[...fetchable,...priceQueueRef.current.filter(s=>!fetchable.includes(s))];
    }else{
      // Normal priority - append if not already queued
      const existing=new Set(priceQueueRef.current);
      fetchable.forEach(s=>{if(!existing.has(s))priceQueueRef.current.push(s);});
    }
    processQueue();
  },[processQueue]);

  // Search request - highest priority (1)
  const fetchSearchPrice=useCallback(async(sym)=>{
    if(sym.includes(":")||sym.startsWith("^"))return;
    enqueueSymbols([sym],1);
  },[enqueueSymbols]);

  // Category on-demand fetch (4)
  const fetchCategoryPrices=useCallback((category)=>{
    const symbols=ASSETS.filter(a=>a.category===category).map(a=>a.symbol);
    enqueueSymbols(symbols,4);
  },[enqueueSymbols]);

  // Initial load: cache first, then queue by priority
  const fetchQuotes=useCallback(()=>{
    const portfolioSyms=portfolio.map(h=>h._fullSymbol||h.symbol);
    const watchSyms=watchlist||[];
    const benchmarkSyms=portfolioSyms.flatMap(sym=>{const asset=ASSETS.find(a=>a.symbol===sym||displaySymbol(a.symbol)===displaySymbol(sym));if(!asset)return[];const b=getBenchmarkSymbols(asset);return[b.market,b.sector].filter(Boolean);});
    // Priority 2: Portfolio only
    enqueueSymbols([...portfolioSyms,...benchmarkSyms],2);
    // Priority 3: Watchlist only
    enqueueSymbols(watchSyms,3);
    // Market assets loaded on-demand when user clicks category or searches
  },[portfolio,watchlist,enqueueSymbols]);

  const signalQuoteFetchRef=useRef(0);
  const fetchSignalPrices=useCallback(()=>{
    const now=Date.now();
    if(now-signalQuoteFetchRef.current<120000)return;
    signalQuoteFetchRef.current=now;
    const candidates=ASSETS.filter(a=>a.price>0&&a.change!==0&&SIGNAL_ALLOWED_CATS.includes(a.category)&&!a.symbol.includes(":")&&!a.symbol.startsWith("^"))
      .sort((a,b)=>(a._live?1:0)-(b._live?1:0)||Math.abs(b.change)-Math.abs(a.change))
      .slice(0,28)
      .map(a=>a.symbol);
    enqueueSymbols(candidates,2);
  },[enqueueSymbols]);

  // -- Unified Asset Detail state --------------------------------------
  const openDetail  = useCallback(sym=>setDetailSym(sym),[]);
  const closeDetail = useCallback(()=>setDetailSym(null),[]);

  useEffect(()=>{
    const el=document.createElement("style");
    const isDark=theme==="dark";
    el.setAttribute("id","mi-theme");
    el.textContent=`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}html,body{overflow:auto!important;height:auto!important}
    body{background:${isDark?"#030712":"#F3F4F6"}!important;color:${isDark?"#E5E7EB":"#111827"}!important;transition:background 0.25s,color 0.25s}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${isDark?"#0A0A0F":"#E5E7EB"}}::-webkit-scrollbar-thumb{background:${isDark?"#1F2937":"#9CA3AF"};border-radius:3px}
    @keyframes spin{to{transform:rotate(360deg)}}@keyframes ping{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.8);opacity:0}}
    @keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.9}}
    @media(max-width:768px){
      nav{padding:0 8px!important;gap:4px!important;height:44px!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}
      nav>*{flex-shrink:0!important}
      nav button{padding:3px 6px!important;font-size:8px!important}
      nav span{font-size:8px!important}
      div[style*="gridTemplateColumns"]{grid-template-columns:1fr!important}
      div[style*="repeat(4"]{grid-template-columns:repeat(2,1fr)!important}
      div[style*="repeat(5"]{grid-template-columns:repeat(2,1fr)!important}
      div[style*="padding: 0px 32px"],div[style*="padding:0 32px"]{padding:0 10px!important}
      div[style*="padding: 0px 24px"],div[style*="padding:0 24px"]{padding:0 10px!important}
      table{font-size:9px!important;display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%!important;min-width:760px!important}
      td,th{padding:7px 8px!important;white-space:nowrap}
      div[style*="width: 285px"],div[style*="width:285px"]{display:none!important}
      div[style*="gap: 14px"]{gap:6px!important}
      div[style*="gap: 10px"]{gap:6px!important}
      div[style*="minWidth: 310px"],div[style*="minmax(310px"]{min-width:100%!important}
      div[style*="minmax(350px"]{min-width:100%!important}
      div[style*="minmax(170px"]{grid-template-columns:1fr!important}
      div[style*="fontSize: 28px"],div[style*="fontSize:28"]{font-size:20px!important}
      div[style*="fontSize: 20px"],div[style*="fontSize:20"]{font-size:16px!important}
      div[style*="maxWidth: 540px"],div[style*="maxWidth:540"]{max-width:95%!important;padding:16px!important}
      div[style*="maxWidth: 680px"],div[style*="maxWidth:680"]{max-width:95%!important;padding:16px!important}
      div[style*="position: fixed"][style*="inset: 0"]{padding:8px!important;align-items:flex-start!important;justify-content:center!important;overflow-y:auto!important}
      div[style*="position: fixed"][style*="inset: 0"] > div{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;max-height:calc(100dvh - 16px)!important;margin:8px 0!important;overflow-y:auto!important}
      div[style*="maxWidth: 400px"],div[style*="maxWidth:400"],div[style*="maxWidth: 460px"],div[style*="maxWidth:460"],div[style*="maxWidth: 620px"],div[style*="maxWidth:620"],div[style*="maxWidth: 700px"],div[style*="maxWidth:700"]{width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important}
      div[style*="gridTemplateColumns: \"repeat(3"],div[style*="gridTemplateColumns:\"repeat(3"],div[style*="gridTemplateColumns: \"1fr 1fr"],div[style*="gridTemplateColumns:\"1fr 1fr"]{grid-template-columns:1fr!important}
      div[style*="position: fixed"][style*="right: 20px"]{right:8px!important;bottom:8px!important}
      div[style*="width: 320px"]{width:280px!important}
      button{max-width:100%;overflow:hidden;text-overflow:ellipsis}
    }
    @media(max-width:480px){
      nav{height:40px!important}
      div[style*="repeat(2"]{grid-template-columns:1fr!important}
      div[style*="fontSize: 16px"]{font-size:13px!important}
      div[style*="flexWrap: wrap"]{gap:3px!important}
      div[style*="flexWrap:wrap"]{gap:3px!important}
    }
    ${!isDark?`
    [data-theme="light"]{color:#111827!important}
    [data-theme="light"] *{border-color:#D1D5DB}
    [data-theme="light"] nav{background:rgba(255,255,255,0.96)!important;border-bottom-color:#E5E7EB!important}
    [data-theme="light"] input,[data-theme="light"] textarea{background:#fff!important;border-color:#D1D5DB!important;color:#111827!important}
    [data-theme="light"] button{border-color:#D1D5DB!important}
    [data-theme="light"] table{background:#fff!important}
    [data-theme="light"] table thead tr{background:#F3F4F6!important}
    [data-theme="light"] table tbody tr{border-color:#E5E7EB!important}
    [data-theme="light"] table td{border-color:#F3F4F6!important}
    [data-theme="light"] div[style*="rgba(0, 0, 0, 0.88)"]{background:rgba(0,0,0,0.45)!important}
    [data-theme="light"] div{border-color:#E5E7EB}
    [data-theme="light"] span{border-color:#E5E7EB}
    [data-theme="light"] [style*="background: rgb(10, 10, 15)"],[data-theme="light"] [style*="background:#0A0A0F"]{background:#FFFFFF!important}
    [data-theme="light"] [style*="background: rgb(13, 17, 23)"],[data-theme="light"] [style*="background:#0D1117"]{background:#F9FAFB!important}
    [data-theme="light"] [style*="background: rgb(3, 7, 18)"],[data-theme="light"] [style*="background:#030712"]{background:#F3F4F6!important}
    [data-theme="light"] [style*="background: rgb(8, 8, 16)"]{background:#F3F4F6!important}
    [data-theme="light"] [style*="background: rgb(17, 24, 39)"]{background:#E5E7EB!important}
    [data-theme="light"] [style*="color: rgb(241, 245, 249)"]{color:#111827!important}
    [data-theme="light"] [style*="color: rgb(229, 231, 235)"]{color:#111827!important}
    [data-theme="light"] [style*="color: rgb(209, 213, 219)"]{color:#1F2937!important}
    [data-theme="light"] [style*="color: rgb(156, 163, 175)"]{color:#4B5563!important}
    [data-theme="light"] [style*="color: rgb(107, 114, 128)"]{color:#4B5563!important}
    [data-theme="light"] [style*="color: rgb(75, 85, 99)"]{color:#6B7280!important}
    [data-theme="light"] [style*="color: rgb(55, 65, 81)"]{color:#9CA3AF!important}
    [data-theme="light"] [style*="box-shadow"]{box-shadow:0 2px 8px rgba(0,0,0,0.08)!important}
    [data-theme="light"] ::-webkit-scrollbar-track{background:#F3F4F6!important}
    [data-theme="light"] ::-webkit-scrollbar-thumb{background:#D1D5DB!important}
    `:""}`;
    document.head.appendChild(el);return()=>document.head.removeChild(el);
  },[theme]);

  const sendTelegram=useCallback(async(msg)=>{
    if(!telegramConfig.enabled||!telegramConfig.botToken||!telegramConfig.chatId)return;
    try{
      await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:telegramConfig.chatId,text:msg,parse_mode:"HTML"})});
    }catch(e){console.warn("Telegram send failed:",e);}
  },[telegramConfig]);

  const fetchNews=useCallback(async()=>{
    setFetching(true);setLiveStatus("loading");
    try{
      // Dynamic date window - last 7 days
      const today=new Date();
      const weekAgo=new Date(today);weekAgo.setDate(weekAgo.getDate()-7);
      const toStr=today.toISOString().split("T")[0];
      const fromStr=weekAgo.toISOString().split("T")[0];

      // Finnhub: general market news + per-asset company news + categories
      const ENDPOINTS=[
        finnhubUrl("/news",{category:"general"}),
        finnhubUrl("/news",{category:"crypto"}),
        finnhubUrl("/company-news",{symbol:"NVDA",from:fromStr,to:toStr}),
        finnhubUrl("/company-news",{symbol:"TSLA",from:fromStr,to:toStr}),
        finnhubUrl("/company-news",{symbol:"AAPL",from:fromStr,to:toStr}),
      ];
      const results=await Promise.allSettled(ENDPOINTS.map(url=>fetch(url).then(r=>r.json())));
      const allItems=results.flatMap(r=>r.status==="fulfilled"&&Array.isArray(r.value)?r.value:[]);

      if(allItems.length>0){
        // Cluster near-duplicate stories so repeated syndications do not overweight analysis.
        const deduped=dedupeNewsArticles(allItems,50);
        // Put high impact and earnings at top, then rest by recency
        const hi=deduped.filter(isHighImpact);
        const ern=deduped.filter(a=>!isHighImpact(a)&&detectEarnings(a));
        const rest=deduped.filter(a=>!isHighImpact(a)&&!detectEarnings(a));
        const formatted=[...hi,...ern,...rest];

        const removed=Math.max(0,allItems.length-formatted.length);
        setNews(formatted);setLiveStatus("live");
        addNotif(`OK ${formatted.length} live stories via Finnhub${removed?` (${removed} duplicates merged)`:""}`,"success");
        const hiCount=formatted.filter(isHighImpact).length;
        const ernCount=formatted.filter(detectEarnings).length;
        if(hiCount>0)setTimeout(()=>addNotif(` ${hiCount} high-impact article${hiCount>1?"s":""} detected`,"alert"),900);
        if(ernCount>0)setTimeout(()=>addNotif(` ${ernCount} earnings article${ernCount>1?"s":""} detected`,"earnings"),1800);
      }else throw new Error("No articles returned");
    }catch(e){
      console.error("Finnhub fetch error:",e);
      setNews(dedupeNewsArticles(MOCK_NEWS,50));setLiveStatus("demo");
      addNotif("Finnhub unavailable - showing demo data","info");
    }
    finally{setFetching(false);setLastUpd(new Date());}
  },[addNotif]);

  useEffect(()=>{fetchNews();fetchQuotes();},[fetchNews,fetchQuotes]);
  useEffect(()=>{if(!autoRef){setCountdown(0);return()=>{};}let s=refMins*60;setCountdown(s);const t=setInterval(()=>{s--;setCountdown(s);if(s<=0){fetchNews();s=refMins*60;}},1000);return()=>clearInterval(t);},[autoRef,refMins,fetchNews]);
  useEffect(()=>{const t=setTimeout(()=>{const toasts=[];earningsCal.filter(e=>e.daysUntil<=5).forEach(e=>toasts.push({id:Date.now()+Math.random(),type:"earnings",message:` ${e.asset} earnings in ${e.daysUntil} days - ${e.vol} volatility expected`}));ASSETS.filter(detectMarketMovement).forEach(a=>toasts.push({id:Date.now()+Math.random(),type:"alert",message:` ${a.symbol} ${a.change>0?"+":"-"}${Math.abs(a.change).toFixed(2)}% - click asset for details`}));if(toasts.length){setNotifs(p=>[...p,...toasts]);toasts.forEach(t2=>setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==t2.id)),7000));}},3500);return()=>clearTimeout(t);},[]);

  const resolveUnknownAssets=useCallback(async(symbols)=>{
    for(const sym of symbols){
      if(ASSETS.find(a=>a.symbol===sym))continue;
      try{
        const qr=await fetch(finnhubUrl("/quote",{symbol:sym}));
        const qd=await qr.json();
        if(qd&&qd.c>0){
          let name=sym;
          try{const pr=await fetch(finnhubUrl("/stock/profile2",{symbol:sym}));const pd=await pr.json();if(pd?.name)name=pd.name;}catch{}
          const change=qd.pc>0?+((qd.c-qd.pc)/qd.pc*100).toFixed(2):0;
          ASSETS.push({symbol:sym,name,price:qd.c,change,category:"Stock"});
          ASSET_KEYWORDS[sym]=[sym.toLowerCase(),name.toLowerCase().split(" ")[0]];
        }
      }catch(e){console.warn("Could not resolve",sym,e);}
    }
  },[]);

  const analyzeArticle=useCallback(async(index)=>{
    const article=news[index];setAnalyzing(p=>({...p,[index]:true}));
    try{const res=await fetch("/api/news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:1200,system:"You are an institutional market analyst. Do not react emotionally to headlines. Separate temporary market fear from actual company weakness. Consider market regime, macro events, sector rotation, price action, momentum, volatility, support/resistance, volume implications, and long-term asset strength. Negative news alone must not create a SELL unless it points to asset-specific fundamental deterioration. Strong assets falling with the market may be HOLD or BUY. You MUST respond with ONLY valid JSON, no markdown. Schema: {\"summary\":\"2-3 sentence institutional analysis\",\"sentiment\":\"Bullish or Bearish or Neutral\",\"reasoning\":\"Explain whether the move is company weakness, macro fear, sector rotation, broad crash, or temporary volatility\",\"affectedAssets\":[\"SYMBOL1\",\"SYMBOL2\"],\"marketContext\":\"Bull Market/Bear Market/Sideways Market/Panic Selloff/Recovery Rally\",\"confidence\":\"High/Medium/Low\",\"risk\":\"Low/Medium/High\"}.",messages:[{role:"user",content:`Analyze this financial news story like a professional investor, not a headline sentiment bot. This story may represent a merged cluster of similar headlines; treat repeated coverage as one event, not multiple independent signals.\n\nTitle: ${article.title}\n\nSnippet: ${article.snippet||"No snippet available."}\n\nMerged similar article count: ${article.duplicateCount||1}\nSources: ${(article.duplicateSources||[article.source]).filter(Boolean).join(", ")||"Unknown"}\n\nRespond with ONLY the JSON object.`}]})});
    if(!res.ok){const errText=await res.text();console.error("API error:",res.status,errText);throw new Error("API "+res.status);}
    const data=await res.json();console.log("API response:",JSON.stringify(data));const raw=data.content?.find(b=>b.type==="text")?.text||"{}";const cleaned=raw.replace(/```json\s?|```/g,"").trim();console.log("Cleaned JSON:",cleaned);const analysis=JSON.parse(cleaned);
    // Auto-resolve any symbols not yet in ASSETS
    if(analysis.affectedAssets?.length>0)await resolveUnknownAssets(analysis.affectedAssets);
    setAnalyses(p=>({...p,[index]:analysis}));
    if(isHighImpact(article)){addNotif(` HIGH IMPACT: ${article.title.slice(0,52)}...`,"alert");sendTelegram(` <b>HIGH IMPACT ALERT</b>\n\n${article.title}\n\n${analysis.summary||""}\n\nSentiment: ${analysis.sentiment||"N/A"}`);}else if(detectEarnings(article))addNotif(` Earnings analyzed - see Intelligence tab`,"earnings");else addNotif(`OK Analyzed: ${article.title.slice(0,52)}...`,"success");}
    catch(err){
      console.error("Analysis error:",err);
      const msg=err.message||"Unknown error";
      if(msg.includes("API 401"))addNotif("x API key invalid - check ANTHROPIC_API_KEY","alert");
      else if(msg.includes("API 429"))addNotif("Loading Rate limited - wait a moment and retry","alert");
      else if(msg.includes("API 5"))addNotif("Hot Anthropic API is down - try again later","alert");
      else if(msg.includes("Failed to fetch"))addNotif("Signal Network error - check your connection","alert");
      else addNotif(`x Analysis failed: ${msg.slice(0,40)}`,"alert");
      setAnalyses(p=>({...p,[index]:{error:true,summary:"Analysis failed - click Analyze to retry",sentiment:"Error",reasoning:msg.slice(0,60),affectedAssets:[]}}));
    }
    finally{setAnalyzing(p=>({...p,[index]:false}));}
  },[news,addNotif]);

  const [analyzeProgress,setAnalyzeProgress] = useState({done:0,total:0});
  const analyzeAll=async()=>{
    setAnAll(true);
    const toAnalyze=filteredNews.map(a=>news.indexOf(a)).filter(i=>i>=0&&!analyses[i]&&!analyzing[i]);
    setAnalyzeProgress({done:0,total:toAnalyze.length});
    let done=0;
    for(const i of toAnalyze){
      await analyzeArticle(i);
      done++;
      setAnalyzeProgress({done,total:toAnalyze.length});
      await new Promise(r=>setTimeout(r,1500));
    }
    setAnAll(false);
    setAnalyzeProgress({done:0,total:0});
    addNotif(`OK Analyzed ${done} article${done!==1?"s":""}!`,"success");
  };

  const quickAnalyze=useCallback(async(sym)=>{
    setQuickAnalyzing(true);
    try{
      const asset=ASSETS.find(a=>a.symbol===sym);
      const assetName=asset?.name||sym;
      const cleanSym=sym.replace("BINANCE:","").replace("OANDA:","").replace("USDT","").replace("_","/");
      const today=new Date();const from=new Date(today);from.setDate(from.getDate()-7);
      const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

      let articles=[];

      // Strategy 1: Finnhub company news (works for US stocks)
      try{
        const url=finnhubUrl("/company-news",{symbol:sym,from:fmt(from),to:fmt(today)});
        const res=await fetch(url);const data=await res.json();
        if(Array.isArray(data)&&data.length>0)articles=data.slice(0,5).map(n=>({title:n.headline||n.summary||"Untitled",link:n.url||"#",snippet:n.summary||"",pubDate:n.datetime?new Date(n.datetime*1000).toISOString():new Date().toISOString(),source:n.source||"Finnhub"}));
      }catch(e){console.warn("Company news failed for",sym,e);}

      // Strategy 2: Try without suffix (.TO, etc)
      if(articles.length===0&&sym.includes(".")){
        try{
          const baseSym=sym.split(".")[0];
          const url=finnhubUrl("/company-news",{symbol:baseSym,from:fmt(from),to:fmt(today)});
          const res=await fetch(url);const data=await res.json();
          if(Array.isArray(data)&&data.length>0)articles=data.slice(0,5).map(n=>({title:n.headline||n.summary||"Untitled",link:n.url||"#",snippet:n.summary||"",pubDate:n.datetime?new Date(n.datetime*1000).toISOString():new Date().toISOString(),source:n.source||"Finnhub"}));
        }catch(e){console.warn("Base symbol news failed",e);}
      }

      // Strategy 3: Search general news for keyword matches
      if(articles.length===0){
        try{
          const url=finnhubUrl("/news",{category:"general"});
          const res=await fetch(url);const data=await res.json();
          if(Array.isArray(data)){
            const kws=[cleanSym.toLowerCase(),assetName.toLowerCase().split(" ")[0],assetName.toLowerCase().split(" ").slice(0,2).join(" ")];
            const matched=data.filter(n=>{const t=((n.headline||"")+" "+(n.summary||"")).toLowerCase();return kws.some(kw=>kw.length>2&&t.includes(kw));});
            if(matched.length>0)articles=matched.slice(0,5).map(n=>({title:n.headline||n.summary||"Untitled",link:n.url||"#",snippet:n.summary||"",pubDate:n.datetime?new Date(n.datetime*1000).toISOString():new Date().toISOString(),source:n.source||"Finnhub"}));
          }
        }catch(e){console.warn("General news search failed",e);}
      }

      // Strategy 4: If still nothing, create a synthetic article and let AI analyze from market data
      if(articles.length===0){
        const dir=asset?.change>=0?"up":"down";
        articles=[{
          title:`${assetName} (${cleanSym}) Market Update - ${dir} ${Math.abs(asset?.change||0).toFixed(2)}% today`,
          link:"#",
          snippet:`${assetName} is trading at $${asset?.price?.toFixed(2)||"N/A"}, ${dir} ${Math.abs(asset?.change||0).toFixed(2)}% in today's session. Category: ${asset?.category||"Unknown"}. The ${asset?.category==="Crypto"?"crypto market":"broader market"} shows mixed signals as investors weigh macro conditions.`,
          pubDate:new Date().toISOString(),
          source:"MarketIntel"
        }];
        addNotif(` No news found - running AI analysis on market data for ${cleanSym}`,"info");
      }else{
        addNotif(`News Fetched ${articles.length} articles for ${cleanSym} - analyzing...`,"success");
      }
      articles=dedupeNewsArticles(articles,5);

      // Add keywords for this symbol
      if(!ASSET_KEYWORDS[sym]){
        ASSET_KEYWORDS[sym]=[cleanSym.toLowerCase(),assetName.toLowerCase().split(" ")[0]];
      }

      // Inject and analyze
      setNews(prev=>dedupeNewsArticles([...articles,...prev],80));
      await new Promise(r=>setTimeout(r,300));
      for(let i=0;i<articles.length;i++){
        await analyzeArticle(i);
        await new Promise(r=>setTimeout(r,500));
        setAnalyses(prev=>{
          const a=prev[i];
          if(a&&(!a.affectedAssets||!a.affectedAssets.includes(sym))){
            return{...prev,[i]:{...a,affectedAssets:[...(a.affectedAssets||[]),sym]}};
          }
          return prev;
        });
      }
      addNotif(`OK ${cleanSym} analysis complete!`,"success");
    }catch(err){console.error("Quick analyze error:",err);addNotif(`Quick analyze failed for ${sym}`,"alert");}
    finally{setQuickAnalyzing(false);}
  },[news,analyzeArticle,addNotif]);

  const getPriceStatus=useCallback((asset)=>{
    return getAssetPriceStatus(asset,{limited:callCountRef.current>=55,queued:!!asset?.symbol&&priceQueueRef.current.includes(asset.symbol)});
  },[]);

  const allOpps=useMemo(()=>{
    const newsOpps=news.flatMap((article,i)=>{
      const a=analyses[i];if(!a||a.error)return[];
      return(a.affectedAssets||[]).map(sym=>{
        const asset=ASSETS.find(x=>x.symbol===sym);if(!asset)return null;
        const inst=institutionalDecision(asset,news,a.sentiment,0,portfolio);
        const action=inst.marketAction||inst.action;
        return enhanceOpportunity({symbol:sym,name:asset.name,action,portfolioAction:inst.action,portfolioAdjusted:action!==inst.action,reason:a.reasoning||inst.thesis,sentiment:a.sentiment,newsTitle:article.title,confidence:inst.confidence,decision:inst,newsItems:news,priceStatus:getPriceStatus(asset)});
      }).filter(Boolean);
    });
    return newsOpps.filter((opp,i,arr)=>arr.findIndex(o=>o.symbol===opp.symbol)===i);
  },[news,analyses,pricesVersion,portfolio,getPriceStatus]);
  const filteredOpps=allOpps.map(enhanceOpportunity).filter(o=>{const isPenny=o.price!=null&&o.price<10;if(oppCatF==="Penny Stock")return isPenny;if(oppCatF!=="All"&&o.category!==oppCatF)return false;if(oppActF!=="All"&&o.action!==oppActF)return false;if(oppRiskF!=="All"&&o.riskLevel!==oppRiskF)return false;return true;});
  const filteredAssets=ASSETS.filter(a=>catF==="All"||a.category===catF).sort((a,b)=>{const d=sortBy.dir==="asc"?1:-1;if(sortBy.col==="symbol")return d*a.symbol.localeCompare(b.symbol);if(sortBy.col==="name")return d*a.name.localeCompare(b.name);if(sortBy.col==="price")return d*(a.price-b.price);if(sortBy.col==="change")return d*(a.change-b.change);return 0;});

  const analyzedCount=Object.keys(analyses).length;const moversCount=ASSETS.filter(detectMarketMovement).length;
  const liveInd=liveStatus==="live"?{dot:"#10B981",label:"FINNHUB LIVE"}:liveStatus==="loading"?{dot:"#F59E0B",label:"FETCHING..."}:{dot:"#4B5563",label:"DEMO DATA"};
  // -- Trading Signals (max 6 short-term trade ideas) --
  const [signalTimestamp,setSignalTimestamp]=useState(null);
  const [cachedSignals,setCachedSignals]=useState([]);
  const [signalActionFilter,setSignalActionFilter]=useState("All");
  const [signalTimeFilter,setSignalTimeFilter]=useState("All");
  
  // Generate signals - only Stock, ETF, AI categories
  const generateSignals=useCallback(()=>{
    const scored=ASSETS.filter(a=>a.price>0&&a.change!==0&&SIGNAL_ALLOWED_CATS.includes(a.category)).map(a=>{
      const absChg=Math.abs(a.change);
      const inst=institutionalDecision(a,news,"Neutral",0,portfolio);
      const dir=inst.marketAction||inst.action;
      const portfolioAdjusted=dir!==inst.action;
      const sym=displaySymbol(a.symbol);
      const cat=a.category||"Stock";
      const score=Math.abs(inst.marketScore??inst.score)+absChg/2+(dir==="BUY"?0.65:0);
      let timeframe="1 Week";let holdDays=7;
      if(absChg>5){timeframe="3 Days";holdDays=3;}
      else if(absChg>3){timeframe="1 Week";holdDays=7;}
      else if(absChg>1.5){timeframe="2 Weeks";holdDays=14;}
      const entry=a.price;
      const target=dir==="SELL"?+(entry*(1-absChg*0.8/100)).toFixed(2):dir==="HOLD"?inst.resistance:+(entry*(1+Math.max(absChg,2)*0.8/100)).toFixed(2);
      const stop=dir==="SELL"?+(entry*(1+absChg*0.5/100)).toFixed(2):dir==="HOLD"?inst.support:+(entry*(1-Math.max(absChg,2)*0.5/100)).toFixed(2);
      const riskReward=Math.abs(target-entry)/Math.max(Math.abs(entry-stop),0.01);
      const confidence=inst.confidence;
      const dataMode=inst.history?.available?"historical candles":"estimated levels";
      const reason=`${confidence} Confidence ${dir}. ${sym} is in ${inst.volatility} with ${inst.structure}; news driver: ${inst.newsMode}. Price action ${a.change>0?"+":""}${a.change.toFixed(1)}%, relative strength ${inst.relativeStrength>0?"+":""}${inst.relativeStrength}, data: ${dataMode}. ${dir==="BUY"?`Market setup qualifies as BUY above $${inst.resistance}${portfolioAdjusted?"; portfolio exposure may require smaller size.":"."}`:dir==="SELL"?`Risk stays elevated below $${inst.support} and requires real damage confirmation.`:`Hold range is $${inst.support} to $${inst.resistance}.`}`;
      const scoreParts=[
        {label:"Tech",value:inst.technicalScore},
        {label:"Trend",value:inst.trendScore},
        {label:"Volume",value:inst.volumeScore},
        {label:"Relative",value:inst.relativeScore},
        {label:"Bench",value:inst.relativeHistory?.score||0},
        {label:"News",value:inst.newsScore},
        {label:"Macro",value:inst.macroScore},
        {label:"Risk",value:inst.riskScore},
        {label:"Total",value:inst.marketScore??inst.score,total:true}
      ];
      const now=new Date();
      return{id:Date.now()+Math.random(),symbol:a.symbol,displaySym:sym,name:a.name,action:dir,portfolioAction:inst.action,portfolioAdjusted,price:entry,target,stop,timeframe,holdDays,confidence,risk:inst.risk,regime:inst.regime.label,riskReward:+riskReward.toFixed(1),change:a.change,absChg,score,scoreParts,category:cat,priceStatus:getPriceStatus(a),priceSource:a._live?"Live":a._fetchedAt?"Cached":"Demo/Fallback",reason,generatedAt:now.toISOString(),generatedDay:now.toLocaleDateString("en-US",{weekday:"short"}),generatedDate:now.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),generatedTime:now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})};
    }).sort((a,b)=>b.score-a.score);
    const buys=scored.filter(s=>s.action==="BUY");
    const selected=[...buys.slice(0,4),...scored.filter(s=>s.action!=="BUY")].filter((s,i,arr)=>arr.findIndex(x=>x.symbol===s.symbol)===i).slice(0,12);
    return selected;
  },[pricesVersion,news,portfolio,getPriceStatus]);

  useEffect(()=>{
    if(tab==="signals")fetchSignalPrices();
  },[tab,fetchSignalPrices]);

  // Regenerate when quote data changes so signal cards do not keep stale prices.
  useEffect(()=>{
    if(pricesVersion>0){
      const sigs=generateSignals();
      setCachedSignals(sigs);
      setSignalTimestamp(new Date().toISOString());
    }
  },[pricesVersion]);

  // Refresh signals every 30 min
  useEffect(()=>{
    if(!signalTimestamp)return;
    const interval=setInterval(()=>{
      const sigs=generateSignals();
      setCachedSignals(sigs);
      setSignalTimestamp(new Date().toISOString());
    },30*60*1000);
    return()=>clearInterval(interval);
  },[signalTimestamp,generateSignals]);

  const tradingSignals=cachedSignals.filter(sig=>(signalActionFilter==="All"||sig.action===signalActionFilter)&&(signalTimeFilter==="All"||sig.timeframe===signalTimeFilter));
  const decisionSnapshot=useMemo(()=>detectMarketRegime(ASSETS),[pricesVersion]);

  const TABS=[{id:"news",label:"News Feed",badge:news.length},{id:"market",label:"Market",badge:ASSETS.length},{id:"portfolio",label:"Portfolio",badge:null},{id:"signals",label:"Signals",badge:tradingSignals.length,amber:true},{id:"summary",label:"Summary",badge:null},{id:"intel",label:"Intelligence",badge:moversCount+news.filter(detectEarnings).length,amber:true},{id:"opps",label:"Opportunities",badge:allOpps.length,amber:allOpps.length>0}];

  useEffect(()=>{_theme=theme;},[theme]);
  const T=theme==="dark"?{bg:"#030712",bgCard:"#0A0A0F",bgNav:"rgba(3,7,18,0.94)",text:"#E5E7EB",textMuted:"#9CA3AF",textDim:"#4B5563",textFaint:"#374151",border:"#111827",borderLight:"#1F2937",borderDim:"#0D1117"}:{bg:"#F9FAFB",bgCard:"#FFFFFF",bgNav:"rgba(255,255,255,0.94)",text:"#111827",textMuted:"#4B5563",textDim:"#6B7280",textFaint:"#9CA3AF",border:"#E5E7EB",borderLight:"#D1D5DB",borderDim:"#F3F4F6"};
  return(<div data-theme={theme} style={{fontFamily:"'Space Mono',monospace",background:T.bg,minHeight:"100vh",color:T.text,transition:"background 0.25s, color 0.25s"}}>
    <nav style={{position:"sticky",top:0,zIndex:100,background:T.bgNav,backdropFilter:"blur(18px)",borderBottom:`1px solid ${T.borderDim}`,padding:"0 24px",display:"flex",alignItems:"center",gap:14,height:54}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:30,height:30,background:"linear-gradient(135deg,#F59E0B,#EF4444)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:"0 0 18px rgba(245,158,11,0.22)"}}><Icon name="logo" size={19} color="#fff" stroke={2.2}/></div><span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:th("#F1F5F9","#111827"),letterSpacing:1}}>MARKET<span style={{color:"#F59E0B"}}>INTEL</span></span></div>
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:liveInd.dot==="#4B5563"?"#374151":"#4B5563",letterSpacing:1}}><PulsingDot color={liveInd.dot}/>{liveInd.label}</div>
      <div style={{flex:1}}/>
      <div style={{display:"flex",gap:14,fontSize:10}}>{news.filter(isHighImpact).length>0&&<span style={{color:"#EF4444",display:"flex",alignItems:"center",gap:3}}><span style={{animation:"blink 1s infinite"}}></span>{news.filter(isHighImpact).length} IMPACT</span>}{moversCount>0&&<span style={{color:"#F59E0B"}}> {moversCount} MOVERS</span>}<span style={{color:th("#374151","#9CA3AF")}}>{mounted&&lastUpd?lastUpd.toLocaleTimeString("en-US",{hour12:false}):"--:--:--"}</span></div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>{autoRef&&<select value={refMins} onChange={e=>setRefMins(+e.target.value)} style={{background:th("#0D1117","#F3F4F6"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:4,color:th("#6B7280","#4B5563"),fontSize:10,padding:"3px 6px",cursor:"pointer",fontFamily:"inherit"}}>{[5,15,30].map(m=><option key={m} value={m}>{m}m</option>)}</select>}<button onClick={()=>setAutoRef(p=>!p)} style={{padding:"5px 10px",background:autoRef?"rgba(16,185,129,0.1)":"transparent",border:`1px solid ${autoRef?"#10B981":"#1F2937"}`,borderRadius:5,color:autoRef?"#10B981":"#4B5563",fontSize:10,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>{autoRef?<><PulsingDot color="#10B981"/>{countdown>0?fmtCD(countdown):"AUTO"}</>:"AUTO OFF"}</button></div>
      <button aria-label="Refresh market data" title="Refresh market data" onClick={()=>{fetchNews();fetchQuotes();}} disabled={fetching} style={{width:32,height:30,background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#6B7280","#4B5563"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>{fetching?<Spinner/>:<Icon name="refresh" size={15}/>}</button>
      <button onClick={analyzeAll} disabled={analyzingAll||analyzedCount===filteredNews.length} style={{padding:"5px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:5,color:"#F59E0B",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>{analyzingAll?<><Spinner/>{analyzeProgress.total>0?`${analyzeProgress.done}/${analyzeProgress.total}`:"ANALYZING..."}</>:` ANALYZE${!newsFilter.includes("All")?" FILTERED":""} (${analyzedCount}/${filteredNews.length})`}</button>
      <NotificationBell notifications={notifs} onRemove={removeNotif} onClear={clearNotifs}/>
      <button aria-label={theme==="dark"?"Switch to light mode":"Switch to dark mode"} onClick={()=>{const t=theme==="dark"?"light":"dark";setTheme(t);}} style={{width:32,height:30,background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#6B7280","#4B5563"),cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}} title={theme==="dark"?"Switch to light mode":"Switch to dark mode"}>{theme==="dark"?<Icon name="sun" size={15}/>:<Icon name="moon" size={15}/>}</button>
    </nav>

    <div style={{maxWidth:1100,margin:"0 auto",padding:"22px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:22}}>
        {[{l:"LIVE ARTICLES",v:news.length,c:"#F59E0B"},{l:"ANALYZED",v:analyzedCount,c:"#60A5FA"},{l:"HIGH IMPACT",v:news.filter(isHighImpact).length,c:"#EF4444"},{l:"MOVERS",v:moversCount,c:"#10B981"},{l:"WATCHLIST",v:watchlist.length,c:"#A78BFA"}].map(s=>(<div key={s.l} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:2,marginBottom:4,textTransform:"uppercase"}}>{s.l}</div><div style={{fontSize:24,fontWeight:700,color:s.c,fontFamily:"'Syne',sans-serif"}}>{s.v}</div></div>))}
      </div>
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${th("#0D1117","#E5E7EB")}`,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",background:"transparent",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:tab===t.id?"#F59E0B":th("#374151","#9CA3AF"),borderBottom:`2px solid ${tab===t.id?"#F59E0B":"transparent"}`,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
          {t.label}{t.badge!=null&&t.badge>0&&<span style={{fontSize:9,background:tab===t.id?"rgba(245,158,11,0.18)":t.amber?"rgba(245,158,11,0.07)":"#0D1117",color:tab===t.id?"#F59E0B":t.amber?"#F59E0B70":"#374151",borderRadius:10,padding:"1px 6px",border:`1px solid ${tab===t.id?"rgba(245,158,11,0.3)":t.amber?"rgba(245,158,11,0.15)":"#1F2937"}`}}>{t.badge}</span>}
        </button>))}
      </div>

      {tab==="news"&&(<div>
        {/* Filter Bar */}
        <div style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:8,padding:"12px 16px",marginBottom:16,overflow:"hidden"}}>
          {/* Row 1: Category Presets */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            <span style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginRight:4,minWidth:55,flexShrink:0}}>CATEGORY</span>
            {["All",...DEFAULT_PRESETS.map(p=>p.filter)].map(f=>(
              <button key={f} onClick={()=>toggleFilter(f)} style={{padding:"3px 9px",fontSize:9,background:isFilterActive(f)?"rgba(245,158,11,0.15)":"transparent",border:`1px solid ${isFilterActive(f)?"rgba(245,158,11,0.4)":"#1F2937"}`,borderRadius:4,color:isFilterActive(f)?"#F59E0B":"#4B5563",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",flexShrink:0,whiteSpace:"nowrap"}}>{f==="All"?"All":DEFAULT_PRESETS.find(p=>p.filter===f)?.name||f}</button>
            ))}
          </div>
          {/* Row 2: Sentiment + Impact Filters */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            <span style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginRight:4,minWidth:55,flexShrink:0}}>SENTIMENT</span>
            {["Bullish","Bearish","Neutral"].map(s=>{
              const sc2={Bullish:"#10B981",Bearish:"#EF4444",Neutral:"#6B7280"}[s];
              return(<button key={s} onClick={()=>toggleFilter(s)} style={{padding:"3px 9px",fontSize:9,background:isFilterActive(s)?`${sc2}20`:"transparent",border:`1px solid ${isFilterActive(s)?`${sc2}60`:"#1F2937"}`,borderRadius:4,color:isFilterActive(s)?sc2:"#4B5563",cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>{s==="Bullish"?"":"Bearish"===s?"Review":"Balance"} {s}</button>);
            })}
            <span style={{fontSize:9,color:"#1F2937",margin:"0 4px"}}>|</span>
            <span style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginRight:4}}>IMPACT</span>
            <button onClick={()=>toggleFilter("High Impact")} style={{padding:"3px 9px",fontSize:9,background:isFilterActive("High Impact")?"rgba(239,68,68,0.15)":"transparent",border:`1px solid ${isFilterActive("High Impact")?"rgba(239,68,68,0.4)":"#1F2937"}`,borderRadius:4,color:isFilterActive("High Impact")?"#EF4444":"#4B5563",cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}> High</button>
            <button onClick={()=>toggleFilter("Medium Impact")} style={{padding:"3px 9px",fontSize:9,background:isFilterActive("Medium Impact")?"rgba(245,158,11,0.15)":"transparent",border:`1px solid ${isFilterActive("Medium Impact")?"rgba(245,158,11,0.4)":"#1F2937"}`,borderRadius:4,color:isFilterActive("Medium Impact")?"#F59E0B":"#4B5563",cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}> Medium</button>
          </div>
          {/* Row 3: Custom Presets + Save */}
          <div style={{display:"flex",alignItems:"center",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            <span style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase",marginRight:4,minWidth:55,flexShrink:0}}>CUSTOM</span>
            {savedPresets.map(p=>(
              <div key={p.id} style={{display:"inline-flex",alignItems:"center",gap:0}}>
                <button onClick={()=>toggleFilter(p.name)} style={{padding:"3px 9px",fontSize:9,background:isFilterActive(p.name)?"rgba(96,165,250,0.15)":"transparent",border:`1px solid ${isFilterActive(p.name)?"rgba(96,165,250,0.4)":"#1F2937"}`,borderRadius:"4px 0 0 4px",color:isFilterActive(p.name)?"#60A5FA":"#4B5563",cursor:"pointer",fontFamily:"inherit"}}>Save {p.name}</button>
                <button onClick={()=>deletePreset(p.id)} style={{padding:"3px 5px",fontSize:9,background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderLeft:"none",borderRadius:"0 4px 4px 0",color:th("#374151","#9CA3AF"),cursor:"pointer",fontFamily:"inherit"}} title="Delete">x</button>
              </div>
            ))}
            <button onClick={saveCurrentFilter} style={{padding:"3px 9px",fontSize:9,background:"transparent",border:`1px dashed ${th("#1F2937","#D1D5DB")}`,borderRadius:4,color:th("#374151","#9CA3AF"),cursor:"pointer",fontFamily:"inherit"}}>+ Save Filter</button>
            <button onClick={analyzeAll} disabled={analyzingAll||analyzedCount===filteredNews.length} style={{padding:"3px 10px",fontSize:9,fontWeight:800,background:analyzingAll?"rgba(96,165,250,0.12)":"rgba(245,158,11,0.13)",border:`1px solid ${analyzingAll?"rgba(96,165,250,0.35)":"rgba(245,158,11,0.38)"}`,borderRadius:4,color:analyzingAll?"#60A5FA":"#F59E0B",cursor:analyzingAll||analyzedCount===filteredNews.length?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",flexShrink:0}}>{analyzingAll?<><Spinner/>{analyzeProgress.total>0?`${analyzeProgress.done}/${analyzeProgress.total}`:"Analyzing"}</>:` Analyze ${!newsFilter.includes("All")?"Filtered":"News"}`}</button>
            {!newsFilter.includes("All")&&<><span style={{fontSize:9,color:"#1F2937",margin:"0 4px"}}>|</span><span style={{fontSize:9,color:th("#4B5563","#6B7280")}}>{filteredNews.length}/{news.length}</span><span style={{fontSize:9,color:"#60A5FA",marginLeft:4}}>{newsFilter.join(" + ")}</span><button onClick={()=>setNewsFilter(["All"])} style={{padding:"2px 7px",fontSize:9,background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:4,color:th("#374151","#9CA3AF"),cursor:"pointer",fontFamily:"inherit",marginLeft:4}}>x Clear</button></>}
          </div>
        </div>
        {fetching&&news===MOCK_NEWS?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>{[...Array(6)].map((_,i)=><NewsCardSkeleton key={i}/>)}</div>:filteredNews.length===0?<div style={{textAlign:"center",padding:"52px 0"}}><div style={{fontSize:28,marginBottom:12}}>Search</div><div style={{fontSize:13,color:th("#4B5563","#6B7280"),marginBottom:6}}>No articles match "{newsFilter}"</div><div style={{fontSize:11,color:th("#374151","#9CA3AF")}}>Try a different filter or refresh the news feed</div></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>{filteredNews.map((article,i)=>{const origIdx=news.indexOf(article);return(<NewsCard key={origIdx} index={origIdx} article={article} analysis={analyses[origIdx]} isAnalyzing={!!analyzing[origIdx]} onAnalyze={analyzeArticle}/>);})}</div>}
      </div>)}
      {tab==="market"&&<MarketTable assets={filteredAssets} filter={catF} setFilter={setCatF} sortBy={sortBy} onSort={col=>setSortBy(p=>({col,dir:p.col===col&&p.dir==="asc"?"desc":"asc"}))} detailSym={detailSym} onOpenDetail={openDetail} news={news} analyses={analyses} watchlist={watchlist} onToggle={toggleWatch} onFetchCategory={fetchCategoryPrices} getPriceStatus={getPriceStatus} onBuy={(a)=>{const sym=displaySymbol(a.symbol);const shares=safePrompt("Buy "+sym+" at $"+a.price.toFixed(2)+"\nEnter number of shares:","1")||"1";const qty=parseFloat(shares);if(isNaN(qty)||qty<=0)return;addPortfolioHolding({symbol:a.symbol,shares:qty,avgCost:a.price},"Bought "+qty+" shares of "+sym);}}/>}

      {tab==="portfolio"&&(<div>
        {/* Capital & Portfolio Summary */}
        <div style={{background:th("#070A12","#FFFFFF"),border:`1px solid ${T.border}`,borderRadius:8,padding:"16px 18px",marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                <span style={{fontSize:9,fontWeight:800,color:"#F59E0B",letterSpacing:2}}>CAPITAL BASE</span>
                {showCapitalEdit?(<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><span style={{color:T.textMuted,fontSize:10}}>$</span><input value={capitalInput} onChange={e=>setCapitalInput(e.target.value)} placeholder={String(initialCapital)} type="number" style={{width:110,padding:"5px 8px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:4,color:T.text,fontSize:11,fontFamily:"inherit",outline:"none"}}/><button onClick={()=>{const v=parseFloat(capitalInput);if(v>0){setInitialCapital(v);addNotif(`OK Capital set to $${v.toLocaleString()}`,"success");}setShowCapitalEdit(false);setCapitalInput("");}} style={{padding:"5px 9px",background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.28)",borderRadius:4,color:"#10B981",fontSize:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Save</button><button onClick={()=>{setShowCapitalEdit(false);setCapitalInput("");}} style={{padding:"5px 9px",background:"transparent",border:`1px solid ${T.borderLight}`,borderRadius:4,color:T.textMuted,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button></div>):(<div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:24,fontWeight:800,color:T.text,fontFamily:"'Syne',sans-serif"}}>${initialCapital.toLocaleString()}</span><button onClick={()=>{setShowCapitalEdit(true);setCapitalInput(String(initialCapital));}} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${T.borderLight}`,borderRadius:4,color:T.textMuted,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Edit</button></div>)}
              </div>
              <div style={{fontSize:11,color:T.textMuted,lineHeight:1.5}}>Cost basis ${totalInvested.toLocaleString(undefined,{maximumFractionDigits:0})} across {portfolio.length} position{portfolio.length===1?"":"s"}  -  buying power $${cashAvailable.toLocaleString(undefined,{maximumFractionDigits:0})}{overBudget>0?`  -  over budget by $${overBudget.toLocaleString(undefined,{maximumFractionDigits:0})}`:""}</div>
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <span style={{fontSize:9,color:T.textDim,letterSpacing:2}}>ALLOCATION</span>
                <span style={{fontSize:12,color:portfolioGrowth>=0?"#10B981":"#EF4444",fontWeight:800}}>{portfolioGrowth>=0?"+":""}{portfolioGrowth.toFixed(2)}% Growth</span>
              </div>
              <div style={{height:8,borderRadius:8,background:th("#111827","#E5E7EB"),overflow:"hidden",marginBottom:7}}>
                <div style={{height:"100%",borderRadius:8,background:overBudget>0?"linear-gradient(90deg,#F59E0B,#EF4444)":"linear-gradient(90deg,#60A5FA,#10B981)",width:`${cashAllocationPct}%`,transition:"width 0.3s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.textFaint}}>
                <span>{cashAllocationPct.toFixed(0)}% of cash allocated</span>
                <span>{overBudget>0?`Over budget $${overBudget.toLocaleString(undefined,{maximumFractionDigits:0})}`:`Buying power $${cashAvailable.toLocaleString(undefined,{maximumFractionDigits:0})}`}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:10,marginBottom:18}}>
          {[
            {l:"EQUITY VALUE",v:`$${totalAccountValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,c:"#F59E0B",sub:"Capital + P&L"},
            {l:"HOLDINGS VALUE",v:`$${totalValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,c:"#60A5FA"},
            {l:overBudget>0?"OVER BUDGET":"BUYING POWER",v:`$${(overBudget>0?overBudget:cashAvailable).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`,c:overBudget>0?"#EF4444":"#10B981"},
            {l:"UNREALIZED P&L",v:`${totalGain>=0?"+":""}$${totalGain.toFixed(2)}`,c:totalGain>=0?"#10B981":"#EF4444",sub:`${totalGainPct>=0?"+":""}${totalGainPct.toFixed(2)}%`},
            {l:"REALIZED P&L",v:`${totalRealized>=0?"+":""}$${totalRealized.toFixed(2)}`,c:totalRealized>=0?"#10B981":"#EF4444"},
            {l:"POSITIONS",v:portfolio.length,c:"#A78BFA"},
          ].map(s=>(<div key={s.l} style={{background:th("#080B13","#FFFFFF"),border:`1px solid ${T.border}`,borderRadius:8,padding:"13px 14px",minHeight:72,display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:8,color:T.textDim,letterSpacing:1.6,marginBottom:5,textTransform:"uppercase"}}>{s.l}</div><div style={{fontSize:17,fontWeight:800,color:s.c,fontFamily:"'Syne',sans-serif",lineHeight:1.15}}>{s.v}</div>{s.sub&&<div style={{fontSize:10,color:s.c,marginTop:3}}>{s.sub}</div>}</div>))}
        </div>
        {overBudget>0&&(<div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.28)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#EF4444",fontSize:11,lineHeight:1.55}}>This portfolio has more open position cost than the cash account allows. New buys are now blocked until buying power is available. Remove/edit older positions or raise capital to clear the over-budget amount.</div>)}

        {/* Add Holding Button */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginTop:4,flexWrap:"wrap",gap:10}}>
          <div><span style={{fontSize:14,fontWeight:800,color:T.text,letterSpacing:1}}>Holdings</span><div style={{fontSize:10,color:T.textDim,marginTop:2}}>Open positions, live P/L, and AI risk readout</div></div>
          <div style={{display:"flex",gap:8}}>
            {portfolio.length>0&&<button onClick={()=>{
              // Generate portfolio snapshot as image
              const canvas=document.createElement("canvas");
              const w=800,rowH=36,headerH=140,footerH=40;
              const h=headerH+40+(portfolioStats.length*rowH)+footerH+60;
              canvas.width=w;canvas.height=h;
              const ctx=canvas.getContext("2d");
              // Background
              ctx.fillStyle="#030712";ctx.fillRect(0,0,w,h);
              // Header
              ctx.fillStyle="#F59E0B";ctx.font="bold 20px monospace";ctx.fillText("MARKETINTEL Portfolio",24,36);
              ctx.fillStyle="#374151";ctx.font="11px monospace";ctx.fillText(new Date().toLocaleString(),24,56);
              // Summary cards
              const cards=[
                {l:"TOTAL VALUE",v:`$${totalValue.toLocaleString(undefined,{minimumFractionDigits:2})}`,c:"#F59E0B"},
                {l:"GAIN/LOSS",v:`${totalGain>=0?"+":""}$${totalGain.toFixed(2)} (${totalGainPct>=0?"+":""}${totalGainPct.toFixed(2)}%)`,c:totalGain>=0?"#10B981":"#EF4444"},
                {l:"TODAY P&L",v:`${todayPL>=0?"+":""}$${todayPL.toFixed(2)}`,c:todayPL>=0?"#10B981":"#EF4444"},
                {l:"POSITIONS",v:`${portfolio.length}`,c:"#A78BFA"},
              ];
              cards.forEach((card,i)=>{
                const cx=24+(i*190);
                ctx.fillStyle="#0A0A0F";ctx.fillRect(cx,70,178,56);
                ctx.strokeStyle="#1F2937";ctx.strokeRect(cx,70,178,56);
                ctx.fillStyle="#374151";ctx.font="8px monospace";ctx.fillText(card.l,cx+10,86);
                ctx.fillStyle=card.c;ctx.font="bold 16px monospace";ctx.fillText(card.v,cx+10,110);
              });
              // Table header
              const ty=headerH+10;
              ctx.fillStyle="#0D1117";ctx.fillRect(24,ty,w-48,28);
              ctx.fillStyle="#374151";ctx.font="bold 9px monospace";
              const cols=["SYMBOL","NAME","SHARES","AVG COST","PRICE","MKT VALUE","GAIN/LOSS","TODAY"];
              const colX=[34,110,250,320,410,500,600,720];
              cols.forEach((c,i)=>ctx.fillText(c,colX[i],ty+18));
              // Table rows
              portfolioStats.forEach((s,i)=>{
                const ry=ty+28+(i*rowH);
                ctx.fillStyle=i%2===0?"#080810":"#0A0A0F";ctx.fillRect(24,ry,w-48,rowH);
                ctx.fillStyle="#F59E0B";ctx.font="bold 11px monospace";ctx.fillText(displaySymbol(s.symbol),colX[0],ry+22);
                ctx.fillStyle="#9CA3AF";ctx.font="11px monospace";ctx.fillText((s.name||"").slice(0,16),colX[1],ry+22);
                ctx.fillStyle="#E5E7EB";ctx.fillText(s.shares.toString(),colX[2],ry+22);
                ctx.fillStyle="#9CA3AF";ctx.fillText(`$${s.avgCost.toFixed(2)}`,colX[3],ry+22);
                ctx.fillStyle="#E5E7EB";ctx.font="bold 11px monospace";ctx.fillText(`$${s.currentPrice.toFixed(2)}`,colX[4],ry+22);
                ctx.fillStyle="#E5E7EB";ctx.font="11px monospace";ctx.fillText(`$${s.marketValue.toFixed(2)}`,colX[5],ry+22);
                ctx.fillStyle=s.gainLoss>=0?"#10B981":"#EF4444";ctx.fillText(`${s.gainLoss>=0?"+":""}$${s.gainLoss.toFixed(2)}`,colX[6],ry+22);
                ctx.fillStyle=s.todayPct>=0?"#10B981":"#EF4444";ctx.fillText(`${s.todayPct>=0?"+":""}${s.todayPct.toFixed(2)}%`,colX[7],ry+22);
              });
              // Allocation bar
              const barY=ty+28+(portfolioStats.length*rowH)+16;
              ctx.fillStyle="#374151";ctx.font="8px monospace";ctx.fillText("ALLOCATION",34,barY);
              let barX=34;
              const barColors=["#F59E0B","#10B981","#60A5FA","#A78BFA","#EF4444","#EC4899","#14B8A6","#FB923C"];
              portfolioStats.forEach((s,i)=>{
                const pct=totalValue>0?(s.marketValue/totalValue):0;
                const bw=Math.max(2,(w-68)*pct);
                ctx.fillStyle=barColors[i%barColors.length];
                ctx.fillRect(barX,barY+8,bw,10);
                barX+=bw+1;
              });
              // Legend
              let legX=34;
              portfolioStats.forEach((s,i)=>{
                const pct=totalValue>0?(s.marketValue/totalValue*100):0;
                ctx.fillStyle=barColors[i%barColors.length];ctx.fillRect(legX,barY+26,8,8);
                ctx.fillStyle="#9CA3AF";ctx.font="9px monospace";
                const label=`${displaySymbol(s.symbol)} ${pct.toFixed(1)}%`;
                ctx.fillText(label,legX+12,barY+34);
                legX+=ctx.measureText(label).width+24;
              });
              // Footer
              ctx.fillStyle="#1F2937";ctx.font="9px monospace";ctx.fillText("Warning: FOR EDUCATIONAL PURPOSES ONLY - NOT FINANCIAL ADVICE",24,h-16);
              ctx.fillStyle="#374151";ctx.fillText("market-intel-tau.vercel.app",w-220,h-16);
              // Download
              const link=document.createElement("a");
              link.download=`MarketIntel-Portfolio-${new Date().toISOString().slice(0,10)}.png`;
              link.href=canvas.toDataURL("image/png");
              link.click();
              addNotif("Snapshot Portfolio snapshot downloaded!","success");
            }} style={{padding:"8px 16px",background:"rgba(96,165,250,0.11)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:5,color:"#60A5FA",fontSize:10,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>Snapshot Share Snapshot</button>}
            <button onClick={()=>setShowAddHolding(p=>!p)} style={{padding:"8px 16px",background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:5,color:"#F59E0B",fontSize:10,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>{showAddHolding?"x Cancel":"+ Add Holding"}</button>
          </div>
        </div>

        {/* Add Holding Form */}
        {showAddHolding&&(<div style={{background:T.bgCard,border:`1px solid ${T.borderLight}`,borderRadius:8,padding:18,marginBottom:18,boxShadow:"0 10px 26px rgba(0,0,0,0.14)"}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:"1 1 180px",position:"relative"}}>
              <div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:4}}>SYMBOL</div>
              <input value={holdingForm.symbol} onChange={e=>{setHoldingForm(p=>({...p,symbol:e.target.value.toUpperCase(),_matched:false}));}} placeholder="Search AAPL, BTC, Gold..." style={{width:"100%",padding:"7px 10px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:5,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
              {holdingForm.symbol.length>=1&&!holdingForm._matched&&(()=>{
                const q=holdingForm.symbol.toLowerCase();
                const matches=ASSETS.filter(a=>a.symbol.toLowerCase().includes(q)||a.name.toLowerCase().includes(q)||(displaySymbol(a.symbol)).toLowerCase().includes(q)).slice(0,10);
                // Group by category
                const grouped={};matches.forEach(a=>{const cat=a.category||"Other";if(!grouped[cat])grouped[cat]=[];grouped[cat].push(a);});
                return Object.keys(grouped).length>0?(<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:theme==="dark"?"#0D1117":"#fff",border:`1px solid ${T.borderLight}`,borderRadius:"0 0 6px 6px",maxHeight:280,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                  {Object.entries(grouped).map(([cat,items])=>(<div key={cat}>
                    <div style={{padding:"4px 12px",fontSize:8,color:T.textFaint,letterSpacing:2,textTransform:"uppercase",background:theme==="dark"?"#080810":"#F9FAFB"}}>{cat}</div>
                    {items.map(a=>(<div key={a.symbol} onClick={async()=>{
                      let livePrice=a.price;
                      if(!a._live&&!a.symbol.includes(":")&&!a.symbol.startsWith("^")){
                        await fetchSearchPrice(a.symbol);
                        await new Promise(r=>setTimeout(r,1200));
                        livePrice=a.price;
                      }
                      setHoldingForm({symbol:displaySymbol(a.symbol),shares:holdingForm.shares||"",avgCost:livePrice>0?livePrice.toFixed(2):"",_matched:true,_fullSymbol:a.symbol});
                    }} style={{padding:"8px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.border}`,transition:"background 0.1s"}} onMouseEnter={e=>e.currentTarget.style.background=theme==="dark"?"#111827":"#F3F4F6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div><span style={{color:"#F59E0B",fontWeight:700,fontSize:11}}>{displaySymbol(a.symbol)}</span><span style={{color:T.textMuted,fontSize:10,marginLeft:8}}>{a.name?.slice(0,20)}</span></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>{a.price>0?<span style={{color:T.text,fontSize:10,fontWeight:600}}>${a.price.toFixed(2)}</span>:<span style={{color:T.textFaint,fontSize:9}}>fetching...</span>}{a.change!==0&&<span style={{fontSize:8,color:a.change>=0?"#10B981":"#EF4444",background:a.change>=0?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",padding:"1px 5px",borderRadius:3}}>{a.change>=0?"+":""}{a.change.toFixed(2)}%</span>}</div>
                    </div>))}
                  </div>))}
                </div>):null;
              })()}
            </div>
            <div style={{flex:"1 1 100px"}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:4}}>SHARES</div><input value={holdingForm.shares} onChange={e=>setHoldingForm(p=>({...p,shares:e.target.value}))} placeholder="100" type="number" style={{width:"100%",padding:"7px 10px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:5,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/></div>
            <div style={{flex:"1 1 100px"}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:4}}>AVG COST</div><input value={holdingForm.avgCost} onChange={e=>setHoldingForm(p=>({...p,avgCost:e.target.value}))} placeholder="150.00" type="number" step="0.01" style={{width:"100%",padding:"7px 10px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:5,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/></div>
            <button onClick={()=>{const sym=holdingForm._fullSymbol||holdingForm.symbol.toUpperCase().trim();const shares=parseFloat(holdingForm.shares);const avgCost=parseFloat(holdingForm.avgCost);if(!sym||isNaN(shares)||isNaN(avgCost)||shares<=0||avgCost<=0){addNotif("Fill all fields correctly","alert");return;}if(!addPortfolioHolding({symbol:sym,shares,avgCost},`Added ${shares} shares of ${displaySymbol(sym)}`))return;setHoldingForm({symbol:"",shares:"",avgCost:""});setShowAddHolding(false);}} style={{padding:"7px 18px",background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:5,color:"#10B981",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Add</button>
          </div>
        </div>)}

        {/* Portfolio Sub-tabs */}
        <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:`1px solid ${th("#111827","#E5E7EB")}`,overflowX:"auto"}}>
          {[{id:"open",label:"Open Positions",badge:portfolio.length},{id:"closed",label:"Closed Trades",badge:tradeHistory.length},{id:"analytics",label:"Analytics",badge:null}].map(t=>(<button key={t.id} onClick={()=>setPortfolioTab(t.id)} style={{padding:"9px 16px",background:portfolioTab===t.id?"rgba(245,158,11,0.08)":"transparent",border:"none",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:portfolioTab===t.id?"#F59E0B":th("#374151","#9CA3AF"),borderBottom:`2px solid ${portfolioTab===t.id?"#F59E0B":"transparent"}`,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:5}}>{t.label}{t.badge!==null&&t.badge>0&&<span style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B",fontSize:8,padding:"1px 5px",borderRadius:8}}>{t.badge}</span>}</button>))}
        </div>
        {portfolioTab==="open"&&(<>{portfolio.length===0?(<div style={{textAlign:"center",padding:"52px 0"}}><div style={{fontSize:28,marginBottom:12}}>Portfolio</div><div style={{fontSize:13,color:T.textDim}}>No holdings yet</div></div>):(<div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,overflow:"auto",boxShadow:"0 12px 30px rgba(0,0,0,0.18)"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1120,tableLayout:"fixed"}}><thead><tr style={{borderBottom:`1px solid ${T.border}`,background:th("#0D1117","#F3F4F6")}}>{["SYMBOL","SHARES","AVG COST","PRICE","GAIN/LOSS","DAYS","AI SIGNAL","RISK","CLOSE"].map((h,i)=>(<th key={h} style={{padding:"12px 14px",textAlign:"left",color:T.textDim,letterSpacing:1.5,fontWeight:800,fontSize:8,whiteSpace:"nowrap",width:i===6?"38%":i===0?"12%":i>=7?"7%":"8%"}}>{h}</th>))}</tr></thead><tbody>{portfolioStats.map(h=>{const sig=getAISignal(h);const holdDays=Math.floor((Date.now()-new Date(h.addedAt).getTime())/(1000*60*60*24));const isOpen=!!expandedPortfolioLogic[h.id];const logic=getPortfolioDecisionChecklist(h,sig);const reliability=getDecisionReliability(logic);const decisionSentence=getPortfolioDecisionSentence(h,sig);const asset=ASSETS.find(a=>a.symbol===h.symbol||displaySymbol(a.symbol)===h.symbol||a.symbol===h._fullSymbol);const ps=getPriceStatus(asset||h);return(<Fragment key={h.id}><tr style={{borderBottom:isOpen?"none":`1px solid ${th("#111827","#E5E7EB")}`,background:th("#070A12","#FFFFFF")}}><td style={{padding:"14px 14px"}}><span style={{color:"#F59E0B",fontWeight:800,fontSize:13}}>{displaySymbol(h.symbol)}</span><div style={{fontSize:9,color:T.textMuted,marginTop:3,lineHeight:1.25}}>{h.name?.slice(0,22)}</div></td><td style={{padding:"14px 14px",color:T.text,fontWeight:700}}>{h.shares}</td><td style={{padding:"14px 14px",color:T.textMuted}}>${h.avgCost.toFixed(2)}</td><td style={{padding:"14px 14px",color:T.text,fontWeight:800}}><div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-start"}}><span>${h.currentPrice.toFixed(2)}</span><PriceStatusBadge status={ps} size="xs"/></div></td><td style={{padding:"14px 14px"}}><span style={{color:h.gainLoss>=0?"#10B981":"#EF4444",fontWeight:800}}>{h.gainLoss>=0?"+":""}${h.gainLoss.toFixed(2)}</span><div style={{fontSize:10,color:h.gainPct>=0?"#10B981":"#EF4444",marginTop:3}}>{h.gainPct>=0?"+":""}{h.gainPct.toFixed(1)}%</div></td><td style={{padding:"14px 14px",color:T.textMuted,fontSize:11}}>{holdDays}d</td><td style={{padding:"14px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:4,background:`${sig.color}18`,color:sig.color,border:`1px solid ${sig.color}40`,whiteSpace:"nowrap"}}>{sig.signal}</span><button onClick={()=>setExpandedPortfolioLogic(p=>({...p,[h.id]:!p[h.id]}))} style={{fontSize:9,padding:"3px 8px",borderRadius:4,background:isOpen?"rgba(96,165,250,0.14)":"transparent",border:`1px solid ${isOpen?"rgba(96,165,250,0.45)":T.borderLight}`,color:isOpen?"#60A5FA":T.textMuted,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>{isOpen?"Hide Logic":"Decision Logic"}</button></div><div style={{fontSize:10,color:T.textMuted,marginTop:7,lineHeight:1.45,maxWidth:260}}>Open Decision Logic for the full explanation.</div></td><td style={{padding:"14px 14px"}}><span style={{fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:4,background:sig.risk==="High"?"rgba(239,68,68,0.12)":sig.risk==="Medium"?"rgba(245,158,11,0.12)":"rgba(16,185,129,0.12)",color:sig.risk==="High"?"#EF4444":sig.risk==="Medium"?"#F59E0B":"#10B981"}}>{sig.risk}</span></td><td style={{padding:"14px 14px"}}><button onClick={()=>setSellModal({holdingId:h.id,symbol:displaySymbol(h.symbol),maxShares:h.shares,price:h.currentPrice})} title="Close Position" style={{padding:"7px 12px",background:"rgba(239,68,68,0.11)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:5,color:"#EF4444",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:800,whiteSpace:"nowrap"}}>Close</button></td></tr>{isOpen&&(<tr style={{borderBottom:`1px solid ${th("#111827","#E5E7EB")}`,background:th("#050812","#F9FAFB")}}><td colSpan={9} style={{padding:"0 14px 16px 14px"}}><div style={{border:`1px solid ${T.borderLight}`,borderRadius:8,padding:14,background:th("#080810","#FFFFFF")}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10,flexWrap:"wrap"}}><div style={{fontSize:11,fontWeight:800,color:"#F59E0B",letterSpacing:1}}>Decision Data Checks</div><div style={{fontSize:9,color:T.textMuted}}>Test list for {displaySymbol(h.symbol)}  -  {sig.signal}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,marginBottom:10}}><div style={{background:`${reliability.color}12`,border:`1px solid ${reliability.color}35`,borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:7,color:T.textDim,letterSpacing:1.4,textTransform:"uppercase",marginBottom:4}}>Decision Reliability</div><div style={{fontSize:13,fontWeight:900,color:reliability.color}}>{reliability.level}</div><div style={{fontSize:10,color:T.textMuted,marginTop:3}}>{reliability.label}</div></div><div style={{background:th("#070A12","#F9FAFB"),border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:7,color:T.textDim,letterSpacing:1.4,textTransform:"uppercase",marginBottom:4}}>Missing / Weak Inputs</div><div style={{fontSize:10,color:reliability.missing.length?"#EF4444":reliability.weak.length?"#F59E0B":"#10B981",lineHeight:1.45}}>{reliability.missing.length?`Missing: ${reliability.missing.join(", ")}`:reliability.weak.length?`Weak: ${reliability.weak.join(", ")}`:"Core data loaded"}</div></div></div><div style={{fontSize:11,color:T.text,lineHeight:1.6,background:`${sig.color}10`,border:`1px solid ${sig.color}35`,borderRadius:6,padding:"9px 10px",marginBottom:10}}>{decisionSentence}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>{logic.map(item=>(<div key={item.l} style={{border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 10px",background:th("#070A12","#F3F4F6")}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:5}}><div style={{fontSize:7,color:T.textDim,letterSpacing:1.4,textTransform:"uppercase"}}>{item.l}</div><FactorStatusBadge status={item.status||"Info"}/></div><div style={{fontSize:11,fontWeight:800,color:item.c,marginBottom:5,lineHeight:1.3}}>{item.v}</div><div style={{fontSize:10,color:T.textMuted,lineHeight:1.5}}>{item.d}</div></div>))}</div></div></td></tr>)}</Fragment>);})}</tbody></table></div>)}</>)}
        {portfolioTab==="closed"&&(<>{tradeHistory.length===0?(<div style={{textAlign:"center",padding:"52px 0"}}><div style={{fontSize:28,marginBottom:12}}>List</div><div style={{fontSize:13,color:T.textDim}}>No closed trades yet</div></div>):(<div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}><thead><tr style={{borderBottom:`1px solid ${T.border}`,background:th("#0D1117","#F3F4F6")}}>{["SYMBOL","QTY","BUY","CLOSE","P/L","HELD","REASON","DATE"].map(h=>(<th key={h} style={{padding:"8px 10px",textAlign:"left",color:T.textDim,letterSpacing:2,fontWeight:700,fontSize:7}}>{h}</th>))}</tr></thead><tbody>{tradeHistory.map(t=>(<tr key={t.id} style={{borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}><td style={{padding:"8px 10px",color:"#F59E0B",fontWeight:700}}>{displaySymbol(t.symbol)}</td><td style={{padding:"8px 10px",color:T.text}}>{t.quantity}</td><td style={{padding:"8px 10px",color:T.textMuted}}>${t.buyPrice.toFixed(2)}</td><td style={{padding:"8px 10px",color:T.text,fontWeight:600}}>${t.sellPrice.toFixed(2)}</td><td style={{padding:"8px 10px",color:t.realizedPL>=0?"#10B981":"#EF4444",fontWeight:700}}>{t.realizedPL>=0?"+":""}${t.realizedPL.toFixed(2)} ({t.realizedPct>=0?"+":""}{t.realizedPct.toFixed(1)}%)</td><td style={{padding:"8px 10px",color:T.textMuted}}>{t.holdDays}d</td><td style={{padding:"8px 10px"}}><span style={{fontSize:8,padding:"2px 6px",borderRadius:3,background:"rgba(107,114,128,0.1)",color:T.textMuted}}>{t.reason}</span></td><td style={{padding:"8px 10px",color:T.textFaint,fontSize:9}}>{new Date(t.sellDate).toLocaleDateString()}</td></tr>))}</tbody></table></div>)}</>)}
        {portfolioTab==="analytics"&&(<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>{[{l:"WIN RATE",v:tradeHistory.length>0?`${winRate.toFixed(0)}%`:"-",c:winRate>=50?"#10B981":"#EF4444"},{l:"REALIZED P/L",v:tradeHistory.length>0?`${totalRealized>=0?"+":""}$${totalRealized.toFixed(2)}`:"-",c:totalRealized>=0?"#10B981":"#EF4444"},{l:"UNREALIZED P/L",v:`${totalGain>=0?"+":""}$${totalGain.toFixed(2)}`,c:totalGain>=0?"#10B981":"#EF4444"},{l:"TOTAL TRADES",v:tradeHistory.length||"0",c:"#A78BFA"},{l:"AVG HOLD",v:tradeHistory.length>0?`${avgHoldTime}d`:"-",c:"#60A5FA"},{l:"BEST TRADE",v:bestTrade?`${displaySymbol(bestTrade.symbol)} +$${bestTrade.realizedPL.toFixed(2)}`:"-",c:"#10B981"},{l:"WORST TRADE",v:worstTrade?`${displaySymbol(worstTrade.symbol)} $${worstTrade.realizedPL.toFixed(2)}`:"-",c:"#EF4444"},{l:"WINS/LOSSES",v:`${winTrades.length}/${tradeHistory.length-winTrades.length}`,c:"#F59E0B"}].map(s=>(<div key={s.l} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:7,color:T.textDim,letterSpacing:2,marginBottom:4}}>{s.l}</div><div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'Syne',sans-serif"}}>{s.v}</div></div>))}</div>{tradeHistory.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:T.textFaint,fontSize:11}}>Complete trades to see analytics</div>}</div>)}
        {sellModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSellModal(null)}><div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:24,maxWidth:400,width:"90%"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:14,fontWeight:700,color:"#EF4444"}}>CLOSE POSITION: {sellModal.symbol}</span><button onClick={()=>setSellModal(null)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:16}}>x</button></div><div style={{fontSize:11,color:T.textMuted,marginBottom:12}}>Price: <span style={{color:T.text,fontWeight:700}}>${sellModal.price.toFixed(2)}</span>  -  Max: {sellModal.maxShares} shares</div><div style={{marginBottom:12}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:4}}>QUANTITY</div><div style={{display:"flex",gap:8}}><input value={sellQty} onChange={e=>setSellQty(e.target.value)} placeholder="Shares" type="number" style={{flex:1,padding:"8px 10px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:5,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}/><button onClick={()=>setSellQty(String(sellModal.maxShares))} style={{padding:"8px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:5,color:"#EF4444",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Close All</button></div></div><div style={{marginBottom:16}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:4}}>REASON</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Manual Exit","AI Signal","Stop Loss","Take Profit","Rebalance"].map(r=>(<button key={r} onClick={()=>setSellReason(r)} style={{padding:"4px 10px",fontSize:9,background:sellReason===r?"rgba(239,68,68,0.15)":"transparent",border:`1px solid ${sellReason===r?"rgba(239,68,68,0.3)":"#1F2937"}`,borderRadius:4,color:sellReason===r?"#EF4444":T.textMuted,cursor:"pointer",fontFamily:"inherit"}}>{r}</button>))}</div></div><button onClick={()=>executeSell(sellModal.holdingId,sellQty,sellReason)} disabled={!sellQty||parseFloat(sellQty)<=0} style={{width:"100%",padding:"10px",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:6,color:"#EF4444",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Confirm Close</button></div></div>)}
        {signalBuyModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:220,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSignalBuyModal(null)}><div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:24,maxWidth:460,width:"92%"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:14}}><div><div style={{fontSize:14,fontWeight:800,color:"#10B981",letterSpacing:1}}>ADD {signalBuyModal.displaySym} TO PORTFOLIO</div><div style={{fontSize:10,color:T.textDim,marginTop:3}}>{signalBuyModal.confidence} Confidence {signalBuyModal.action}  -  {signalBuyModal.regime||"Market Context"}  -  Risk {signalBuyModal.risk||"Medium"}</div></div><button onClick={()=>setSignalBuyModal(null)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:16}}>x</button></div><div style={{background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:8,padding:12,marginBottom:14}}><div style={{fontSize:11,color:T.text,lineHeight:1.65,marginBottom:8}}>{signalBuyModal.reason}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:10}}><div><span style={{color:T.textDim}}>Entry</span><div style={{color:T.text,fontWeight:700}}>${signalBuyModal.price.toFixed(2)}</div></div><div><span style={{color:T.textDim}}>Target</span><div style={{color:"#10B981",fontWeight:700}}>${signalBuyModal.target}</div></div><div><span style={{color:T.textDim}}>Stop</span><div style={{color:"#EF4444",fontWeight:700}}>${signalBuyModal.stop}</div></div></div></div><div style={{marginBottom:14}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:5}}>HOW MANY SHARES DID YOU BUY?</div><input value={signalBuyQty} onChange={e=>setSignalBuyQty(e.target.value)} type="number" min="0" step="0.0001" autoFocus style={{width:"100%",padding:"10px 12px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:6,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/></div><button onClick={executeSignalBuy} style={{width:"100%",padding:"11px",background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:6,color:"#10B981",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Add To Portfolio</button></div></div>)}
      </div>)}

      {/* -- TRADING SIGNALS TAB -- */}
      {tab==="signals"&&(<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div><span style={{fontSize:14,fontWeight:700,color:"#F59E0B",letterSpacing:1}}> TRADING SIGNALS</span><div style={{fontSize:10,color:th("#374151","#9CA3AF"),marginTop:2}}>Showing {tradingSignals.length}/{cachedSignals.length} signals  -  Stocks, ETFs & AI only{signalTimestamp&&`  -  Updated ${new Date(signalTimestamp).toLocaleTimeString()}`}</div></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>{const sigs=generateSignals();setCachedSignals(sigs);setSignalTimestamp(new Date().toISOString());addNotif(" Signals refreshed!","success");}} style={{padding:"4px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:5,color:"#F59E0B",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase"}}>Action</span>
            {["All","BUY","HOLD","SELL"].map(a=>{const active=signalActionFilter===a;const c=a==="BUY"?"#10B981":a==="SELL"?"#EF4444":a==="HOLD"?"#F59E0B":"#60A5FA";const count=a==="All"?cachedSignals.length:cachedSignals.filter(s=>s.action===a).length;return(<button key={a} onClick={()=>setSignalActionFilter(active?"All":a)} style={{padding:"5px 10px",borderRadius:5,fontSize:9,fontWeight:800,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",background:active?`${c}18`:"transparent",border:`1px solid ${active?c:th("#1F2937","#D1D5DB")}`,color:active?c:th("#6B7280","#4B5563")}}>{a} {count>0&&<span style={{opacity:.75}}>({count})</span>}</button>);})}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:th("#374151","#9CA3AF"),letterSpacing:2,textTransform:"uppercase"}}>Timeframe</span>
            {["All","3 Days","1 Week","2 Weeks"].map(tf=>{const active=signalTimeFilter===tf;const count=tf==="All"?cachedSignals.length:cachedSignals.filter(s=>s.timeframe===tf).length;return(<button key={tf} onClick={()=>setSignalTimeFilter(active?"All":tf)} style={{fontSize:9,padding:"5px 10px",borderRadius:5,background:active?"rgba(96,165,250,0.14)":"transparent",border:`1px solid ${active?"rgba(96,165,250,0.55)":th("#1F2937","#D1D5DB")}`,color:active?"#60A5FA":th("#6B7280","#4B5563"),cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>{tf} {count>0&&<span style={{opacity:.75}}>({count})</span>}</button>);})}
          </div>
          {(signalActionFilter!=="All"||signalTimeFilter!=="All")&&<button onClick={()=>{setSignalActionFilter("All");setSignalTimeFilter("All");}} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:5,color:th("#6B7280","#4B5563"),fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
        </div>
        <div style={{background:th("#070A12","#FFFFFF"),border:"1px solid rgba(245,158,11,0.22)",borderRadius:8,padding:"16px",marginBottom:16,boxShadow:"0 10px 28px rgba(0,0,0,0.14)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#F59E0B",letterSpacing:1}}>Signal Decision Engine</div>
            <div style={{fontSize:10,color:"#60A5FA",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.22)",borderRadius:4,padding:"3px 8px"}}>{decisionSnapshot.label}  -  {decisionSnapshot.riskMode||"regime"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:12}}>
            {[["Regime","Bull/bear/panic sets aggression"],["Technicals","Trend, momentum, support/resistance"],["Relative Strength","Asset vs sector and index"],["News Filter","Macro fear separated from company damage"],["Portfolio Risk","Exposure can downgrade BUY"],["Final Signal","Weighted score becomes BUY/HOLD/SELL"]].map(([l,v])=>(<div key={l} style={{background:th("#080810","#F9FAFB"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:1.4,textTransform:"uppercase",marginBottom:3}}>{l}</div><div style={{fontSize:11,color:th("#D1D5DB","#1F2937"),lineHeight:1.4}}>{v}</div></div>))}
          </div>
          <div style={{fontSize:11,color:th("#9CA3AF","#4B5563"),lineHeight:1.65}}>BUY needs strong weighted evidence and confirmation. HOLD means the setup is mixed or needs a trigger. SELL is reserved for real company damage, failed support, or weak relative strength, not negative headlines alone.</div>
        </div>
        {tradingSignals.length===0&&<div style={{textAlign:"center",padding:"34px 0",marginBottom:14,background:th("#070A12","#FFFFFF"),border:`1px solid ${th("#111827","#E5E7EB")}`,borderRadius:8}}><div style={{fontSize:22,marginBottom:8}}>No</div><div style={{fontSize:12,color:th("#6B7280","#4B5563")}}>No signals match these filters</div><div style={{fontSize:10,color:th("#374151","#9CA3AF"),marginTop:4}}>Try All, another action, or another timeframe.</div></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(350px,1fr))",gap:16,alignItems:"stretch"}}>
          {tradingSignals.map((sig,i)=>{
            const isBuy=sig.action==="BUY";
            const isSell=sig.action==="SELL";
            const isHold=sig.action==="HOLD";
            const accentColor=sig.action==="BUY"?"#10B981":sig.action==="SELL"?"#EF4444":"#F59E0B";
            return(<div key={sig.symbol} style={{background:th("#0A0A0F","#FFFFFF"),border:`1px solid ${accentColor}22`,borderRadius:8,overflow:"hidden",boxShadow:"0 10px 26px rgba(0,0,0,0.16)",display:"flex",flexDirection:"column"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${th("#111827","#E5E7EB")}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:4,background:`${accentColor}18`,color:accentColor,border:`1px solid ${accentColor}40`}}>{sig.action}</span>
                  <div><div style={{fontSize:14,fontWeight:700,color:"#F59E0B"}}>{sig.displaySym}</div><div style={{fontSize:9,color:th("#4B5563","#6B7280")}}>{sig.name?.slice(0,22)}</div></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:700,color:th("#F1F5F9","#111827")}}>${sig.price.toFixed(2)}</div>
                  <div style={{fontSize:10,color:sig.change>=0?"#10B981":"#EF4444"}}>{sig.change>=0?"+":""}{sig.change.toFixed(2)}%</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:7,color:sig.priceStatus?.color||th("#374151","#9CA3AF"),background:`${sig.priceStatus?.color||"#6B7280"}14`,border:`1px solid ${sig.priceStatus?.color||"#6B7280"}35`,borderRadius:4,padding:"2px 6px",letterSpacing:1,marginTop:4,textTransform:"uppercase"}}><span style={{width:5,height:5,borderRadius:3,background:sig.priceStatus?.color||"#6B7280",display:"inline-block"}}/>{sig.priceStatus?.label||sig.priceSource||"Demo/Fallback"}</div>
                </div>
              </div>
              {/* Signal Details */}
              <div style={{padding:"14px 16px 16px",display:"flex",flexDirection:"column",flex:1}}>
                <div style={{fontSize:12,color:th("#D1D5DB","#1F2937"),lineHeight:1.65,marginBottom:14}}>{sig.reason}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                  {(sig.scoreParts||[]).map(p=>{const pos=p.value>0;const neg=p.value<0;const c=p.total?accentColor:pos?"#10B981":neg?"#EF4444":th("#6B7280","#4B5563");return(<div key={p.label} style={{background:p.total?`${accentColor}10`:th("#080810","#F9FAFB"),border:`1px solid ${p.total?accentColor+"35":th("#1F2937","#D1D5DB")}`,borderRadius:5,padding:"6px 7px"}}><div style={{fontSize:7,color:th("#374151","#9CA3AF"),letterSpacing:1.2,textTransform:"uppercase",marginBottom:2}}>{p.label}</div><div style={{fontSize:11,fontWeight:800,color:c}}>{p.value>0?"+":""}{Number(p.value||0).toFixed(2)}</div></div>);})}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                  <div style={{background:th("#0D1117","#F9FAFB"),borderRadius:6,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:7,color:th("#374151","#9CA3AF"),letterSpacing:2,marginBottom:3}}>ENTRY</div><div style={{fontSize:12,fontWeight:700,color:th("#F1F5F9","#111827")}}>${sig.price.toFixed(2)}</div></div>
                  <div style={{background:th("#0D1117","#F9FAFB"),borderRadius:6,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:7,color:th("#374151","#9CA3AF"),letterSpacing:2,marginBottom:3}}>{isHold?"RESISTANCE":"TARGET"}</div><div style={{fontSize:12,fontWeight:700,color:"#10B981"}}>${sig.target}</div></div>
                  <div style={{background:th("#0D1117","#F9FAFB"),borderRadius:6,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:7,color:th("#374151","#9CA3AF"),letterSpacing:2,marginBottom:3}}>{isHold?"SUPPORT":"STOP"}</div><div style={{fontSize:12,fontWeight:700,color:"#EF4444"}}>${sig.stop}</div></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:8,padding:"2px 7px",borderRadius:3,background:th("#0D1117","#F3F4F6"),color:th("#6B7280","#4B5563"),border:`1px solid ${th("#1F2937","#D1D5DB")}`}}>Time {sig.timeframe}</span>
                    <span style={{fontSize:8,padding:"2px 7px",borderRadius:3,background:sig.confidence==="High"?"rgba(16,185,129,0.1)":sig.confidence==="Medium"?"rgba(245,158,11,0.1)":"rgba(107,114,128,0.1)",color:sig.confidence==="High"?"#10B981":sig.confidence==="Medium"?"#F59E0B":"#6B7280"}}>{sig.confidence}</span>
                    <span style={{fontSize:8,padding:"2px 7px",borderRadius:3,background:"rgba(96,165,250,0.1)",color:"#60A5FA"}}>{isHold?"Range":"R:R"} {sig.riskReward}</span>
                    <span style={{fontSize:8,padding:"2px 7px",borderRadius:3,background:`${accentColor}10`,color:accentColor,border:`1px solid ${accentColor}30`}}>{sig.category}</span>
                  </div>
                  <button onClick={()=>{if(isBuy){setSignalBuyModal(sig);setSignalBuyQty("1");}else setDetailSym(sig.symbol);}} style={{padding:"6px 12px",background:isBuy?"rgba(16,185,129,0.15)":isSell?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.12)",border:`1px solid ${isBuy?"rgba(16,185,129,0.3)":isSell?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:5,color:accentColor,fontSize:9,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>{isBuy?" Buy Now":isSell?"Review":"Watch"}</button>
                </div>
                <div style={{marginTop:10,padding:"8px 10px",background:th("#080810","#F9FAFB"),borderRadius:5,fontSize:9,color:th("#6B7280","#4B5563"),lineHeight:1.55}}>
                   {isBuy?`Enter at $${sig.price.toFixed(2)} only if support near $${sig.stop} holds. Target $${sig.target} within ${sig.timeframe.toLowerCase()}. Risk ${((Math.abs(sig.price-sig.stop)/sig.price)*100).toFixed(1)}% to gain ${((Math.abs(sig.target-sig.price)/sig.price)*100).toFixed(1)}%.`:isSell?`Watch for breakdown below $${sig.price.toFixed(2)}. Downside target is $${sig.target} if selling pressure continues. Stop/review above $${sig.stop}.`:`No trade trigger yet. HOLD means monitor support at $${sig.stop} and resistance at $${sig.target}; upgrade only on confirmation or downgrade if support fails with real damage.`}
                </div>
                {sig.generatedDay&&<div style={{textAlign:"right",marginTop:4}}><span style={{fontSize:7,color:th("#374151","#9CA3AF")}}>{sig.generatedDay} {sig.generatedDate} {sig.generatedTime}</span></div>}
                </div>
            </div>);
          })}
        </div>
        <div style={{textAlign:"center",padding:"16px 0",fontSize:10,color:th("#374151","#9CA3AF")}}>Warning: Signals are algorithmic and based on momentum - not financial advice. Always do your own research.</div>
      </div>)}

      {tab==="summary"&&<SummaryTab assets={ASSETS} news={news} mktEvents={mktEvents}/>}
      {tab==="intel"&&<IntelligenceTab assets={ASSETS} news={news} telegramConfig={telegramConfig} setTelegramConfig={setTelegramConfig} addNotif={addNotif} earningsCal={earningsCal}/>}
      {tab==="opps"&&<div>
        <div style={{background:th("#070A12","#FFFFFF"),border:"1px solid rgba(96,165,250,0.22)",borderRadius:8,padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#60A5FA",letterSpacing:1}}>Decision Engine Logic</div>
            <div style={{fontSize:10,color:"#F59E0B",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.22)",borderRadius:4,padding:"3px 8px"}}>{decisionSnapshot.label}  -  {decisionSnapshot.riskMode||"regime"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:8,marginBottom:10}}>
            {[["Market Regime","Bull, bear, panic, sideways, risk-on/off"],["Technical Structure","Support/resistance, trend, momentum, reversal"],["Relative Strength","Asset vs sector/index and rotation"],["Web Intelligence","Macro vs company-specific news"],["News Quality","High impact, medium impact, noise filter"],["Fear vs Damage","Fear can be BUY/HOLD; real damage can SELL"],["Portfolio Risk","Exposure and volatility can downgrade BUY"],["Final Score","Technical + news + macro + relative strength + risk"]].map(([l,v])=>(<div key={l} style={{background:th("#080810","#F9FAFB"),border:`1px solid ${th("#1F2937","#D1D5DB")}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:8,color:th("#374151","#9CA3AF"),letterSpacing:1.4,textTransform:"uppercase",marginBottom:3}}>{l}</div><div style={{fontSize:11,color:th("#D1D5DB","#1F2937"),lineHeight:1.4}}>{v}</div></div>))}
          </div>
          <div style={{fontSize:11,color:th("#9CA3AF","#4B5563"),lineHeight:1.65}}>Analyzed news can affect the decision, but it does not control it alone. Macro fear adjusts risk appetite; company-specific damage changes conviction. Negative headlines by themselves should not create automatic SELL.</div>
        </div>
        <OppFilters catF={oppCatF} setCatF={setOppCatF} actF={oppActF} setActF={setOppActF} riskF={oppRiskF} setRiskF={setOppRiskF} shown={filteredOpps.length} total={allOpps.length}/>
        {filteredOpps.length===0?<div style={{textAlign:"center",padding:"52px 0"}}><div style={{fontSize:28,marginBottom:12}}></div><div style={{fontSize:13,marginBottom:6,color:th("#4B5563","#6B7280")}}>{allOpps.length===0?"No opportunities yet":"No results for current filters"}</div><div style={{fontSize:11,color:th("#374151","#9CA3AF")}}>{allOpps.length===0?"Analyze news articles to generate signals":"Try adjusting the filters above"}</div></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>{filteredOpps.map((opp,i)=><OpportunityCard key={i} opp={opp} onOpen={setSelOpp}/>)}</div>}
      </div>}

      <div style={{marginTop:36,paddingTop:16,borderTop:"1px solid #0A0A0A",fontSize:9,color:"#1A1A2E",textAlign:"center",letterSpacing:1}}>Warning: FOR EDUCATIONAL PURPOSES ONLY - NOT FINANCIAL ADVICE</div>
    </div>

    {signalBuyModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:220,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSignalBuyModal(null)}><div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:24,maxWidth:460,width:"92%"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:14}}><div><div style={{fontSize:14,fontWeight:800,color:"#10B981",letterSpacing:1}}>ADD {signalBuyModal.displaySym} TO PORTFOLIO</div><div style={{fontSize:10,color:T.textDim,marginTop:3}}>{signalBuyModal.confidence} Confidence {signalBuyModal.action}  -  {signalBuyModal.regime||"Market Context"}  -  Risk {signalBuyModal.risk||"Medium"}</div></div><button onClick={()=>setSignalBuyModal(null)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:16}}>x</button></div><div style={{background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:8,padding:12,marginBottom:14}}><div style={{fontSize:11,color:T.text,lineHeight:1.65,marginBottom:8}}>{signalBuyModal.reason}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:10}}><div><span style={{color:T.textDim}}>Entry</span><div style={{color:T.text,fontWeight:700}}>${signalBuyModal.price.toFixed(2)}</div></div><div><span style={{color:T.textDim}}>Target</span><div style={{color:"#10B981",fontWeight:700}}>${signalBuyModal.target}</div></div><div><span style={{color:T.textDim}}>Stop</span><div style={{color:"#EF4444",fontWeight:700}}>${signalBuyModal.stop}</div></div></div></div><div style={{marginBottom:14}}><div style={{fontSize:9,color:T.textDim,letterSpacing:1,marginBottom:5}}>HOW MANY SHARES DID YOU BUY?</div><input value={signalBuyQty} onChange={e=>setSignalBuyQty(e.target.value)} type="number" min="0" step="0.0001" autoFocus style={{width:"100%",padding:"10px 12px",background:T.bg,border:`1px solid ${T.borderLight}`,borderRadius:6,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}}/></div><button onClick={executeSignalBuy} style={{width:"100%",padding:"11px",background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:6,color:"#10B981",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Add To Portfolio</button></div></div>)}

    <HighImpactModal article={hiModal} onClose={()=>setHiModal(null)}/>

    {/* -- UNIFIED ASSET DETAIL MODAL -- renders from any entry point */}
    <AssetDetailModal symbol={detailSym} news={news} analyses={analyses} watchlist={watchlist} onToggleWatch={toggleWatch} onAnalyze={analyzeArticle} analyzing={analyzing} onClose={closeDetail} onQuickAnalyze={quickAnalyze} quickAnalyzing={quickAnalyzing}/>

    {/* Opportunity detail */}
    <OppDetailModal opp={selOpp} news={news} onClose={()=>setSelOpp(null)} onOpenDetail={sym=>{setSelOpp(null);openDetail(sym);}}/>

    <AIChatWidget news={news} assets={ASSETS} watchlist={watchlist}/>
    <ApiLoggerWidget/>
  </div>);
}
