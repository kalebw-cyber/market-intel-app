import { ASSETS, ASSET_KEYWORDS, TOPIC_TAGS, SECTOR_BENCHMARKS, SYMBOL_BENCHMARKS } from "../data/marketData";
import { HI_KW, ERN_KW, MOVE_T } from "../styles/marketConstants";

export function safePrompt(message,defaultValue=""){
  return defaultValue||null;
}

export function extractSource(url){try{const h=new URL(url).hostname.replace("www.","");if(h.includes("yahoo"))return"Yahoo Finance";if(h.includes("reuters"))return"Reuters";if(h.includes("bloomberg"))return"Bloomberg";if(h.includes("cnbc"))return"CNBC";if(h.includes("wsj"))return"WSJ";if(h.includes("marketwatch"))return"MarketWatch";if(h.includes("ft.com"))return"FT";const p=h.split(".");return p[p.length-2]||"News";}catch{return"Yahoo Finance";}}
export function displaySymbol(sym){if(sym.startsWith("BINANCE:"))return sym.replace("BINANCE:","").replace("USDT","");return sym;}
export function getAssetNews(symbol,newsItems){
  const kws=ASSET_KEYWORDS[symbol]||[symbol.toLowerCase()];
  const isBroad=["SPY","QQQ","TLT","IEF"].includes(symbol);
  const macroKws=["federal reserve","fed","interest rate","inflation","tariff","gdp","recession","rate cut","rate hike","bond","yield"];
  return newsItems.filter(n=>{const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();if(kws.some(kw=>t.includes(kw)))return true;if(isBroad&&macroKws.some(kw=>t.includes(kw)))return true;return false;});
}

/* ══════════════════════ AI SERVICE ════════════════════════════════════ */
export function detectEarnings(item){const t=((item.title||"")+" "+(item.snippet||"")).toLowerCase();return ERN_KW.some(kw=>t.includes(kw));}
export function detectMarketMovement(asset){return Math.abs(asset.change)>=(MOVE_T[asset.symbol]||2.0);}
export function detectTopics(item){const t=((item.title||"")+" "+(item.snippet||"")).toLowerCase();return TOPIC_TAGS.filter(tag=>tag.kw.some(kw=>t.includes(kw)));}
export function generateEarningsInsight(item){
  const t=((item.title||"")+" "+(item.snippet||"")).toLowerCase();
  let company="Unknown",symbol="";
  for(const a of ASSETS){if(t.includes(a.symbol.toLowerCase())||t.includes(a.name.split(" ")[0].toLowerCase())){company=a.name;symbol=a.symbol;break;}}
  const pos=["beat","exceeds","strong","record","surge","growth","above","topped","raised","profit"].filter(w=>t.includes(w)).length;
  const neg=["miss","weak","decline","below","disappoint","concern","headwind","pressure","cut","warned"].filter(w=>t.includes(w)).length;
  if(pos>neg)return{company,symbol,riskLevel:"Low",earningsResult:"Beat expectations — revenue and EPS exceeded estimates",marketReaction:"Bullish — short-term rally expected",shortTermImpact:"Momentum buyers likely; watch for gap-up at open",longTermImpact:"May trigger analyst upgrades and raised price targets"};
  if(neg>pos)return{company,symbol,riskLevel:"High",earningsResult:"Missed expectations — results fell short of consensus",marketReaction:"Bearish — potential selloff anticipated",shortTermImpact:"Investors re-pricing risk; downward pressure near-term",longTermImpact:"Could trigger analyst downgrades or guidance cuts"};
  return{company,symbol,riskLevel:"Medium",earningsResult:"Mixed — some metrics beat, others disappointed",marketReaction:"Neutral to volatile — market awaiting guidance",shortTermImpact:"Choppy price action as market digests mixed signals",longTermImpact:"Outcome depends on management's forward guidance"};
}
export function explainMarketMovement(asset,newsItems){
  const dir=asset.change>=0?"up":"down";const rel=getAssetNews(asset.symbol,newsItems);
  const macro=newsItems.find(n=>{const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();return["federal reserve","fed","interest rate","gdp","inflation","tariff"].some(kw=>t.includes(kw));});
  let reason,sectors=[],confidence,headline=null,source=null,link=null;
  if(rel.length>0){headline=rel[0].title;source=rel[0].source;link=rel[0].link;const rt=((rel[0].title||"")+" "+(rel[0].snippet||"")).toLowerCase();const p=["beat","strong","record","surge","growth","profit"].filter(w=>rt.includes(w)).length;const n2=["headwind","pressure","competition","concern","miss","decline"].filter(w=>rt.includes(w)).length;reason=p>n2?`${asset.name} surged on positive developments — favorable news flow attracted buyers.`:n2>p?`${asset.name} sold off as negative headlines weighed on sentiment.`:`${asset.name} moved ${dir} on mixed signals — market repricing expectations.`;confidence="High";sectors=asset.category==="ETF"?["Broad Market","Equities"]:asset.category==="Bond"?["Fixed Income","Treasuries"]:["Technology","Equities"];}
  else if(macro){headline=macro.title;source=macro.source;link=macro.link;const mt=((macro.title||"")+" "+(macro.snippet||"")).toLowerCase();reason=mt.includes("tariff")?`${asset.name} impacted by trade policy shifts.`:mt.includes("rate")?`${asset.name} moved ${dir} as Fed signals shifted rate expectations.`:`${asset.name} reacted to macro data that changed market risk appetite.`;confidence="Medium";sectors=["Macro","Rates","Equities"];}
  else{const cat=asset.category||"Stock";const catReasons={Stock:{up:`${asset.name} rallied on positive market sentiment and sector strength`,down:`${asset.name} declined amid broad selling pressure`},ETF:{up:`${asset.name} gained as the underlying sector rotated higher`,down:`${asset.name} fell as sector rotation shifted away`},Crypto:{up:`${asset.name} surged on crypto market strength and increased volume`,down:`${asset.name} dropped on risk-off sentiment in digital assets`},Bond:{up:`${asset.name} rose on safe-haven demand and rate expectations`,down:`${asset.name} fell as yields climbed on hawkish signals`},Commodity:{up:`${asset.name} rallied on supply concerns and demand outlook`,down:`${asset.name} declined on demand weakness and inventory builds`},Forex:{up:`${asset.name} strengthened on central bank policy divergence`,down:`${asset.name} weakened on shifting rate expectations`},Index:{up:`${asset.name} advanced on broad-based buying across sectors`,down:`${asset.name} retreated on macro uncertainty`},Healthcare:{up:`${asset.name} gained on drug pipeline optimism`,down:`${asset.name} fell on regulatory or pricing concerns`},Financial:{up:`${asset.name} rose on strong banking sector performance`,down:`${asset.name} dropped on credit and rate concerns`},Defense:{up:`${asset.name} advanced on defense spending outlook`,down:`${asset.name} fell on budget uncertainty`}};const cr=catReasons[cat]||catReasons.Stock;reason=dir==="up"?cr.up:cr.down;confidence="Low";sectors=[cat];}
  return{asset:asset.symbol,movement:asset.change,reason,sectors,confidence,headline,source,link};
}
export function normalizeNewsItem(item){
  const title=(item.headline||item.title||"").replace(/\s+/g," ").trim();
  const snippet=(item.summary||item.description||item.snippet||"").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
  const ts=item.datetime?item.datetime*1000:Number(new Date(item.pubDate||Date.now()));
  return{title,link:item.url||item.link||"#",snippet:snippet.slice(0,260),pubDate:new Date(ts||Date.now()).toISOString(),source:item.source||extractSource(item.url||item.link||""),_ts:ts||Date.now()};
}
export function newsTokenSet(article){
  const stop=new Set("about after again against amid among and are because been before being between but could from have into its more most over says that the their this through under while with will would your report reports update market markets stock stocks shares company companies investor investors wall street".split(" "));
  const text=((article.title||"")+" "+(article.snippet||"")).toLowerCase().replace(/https?:\/\/\S+/g," ").replace(/[^a-z0-9$% ]+/g," ");
  return new Set(text.split(/\s+/).map(w=>w.replace(/s$/,"")).filter(w=>w.length>3||["fed","ai","ev","cpi","gdp","oil"].includes(w)).filter(w=>!stop.has(w)));
}
export function newsSimilarity(a,b){
  let inter=0;for(const t of a)if(b.has(t))inter++;
  const union=a.size+b.size-inter;
  return union?inter/union:0;
}
export function classifyNewsDriver(item){
  const t=((item?.title||"")+" "+(item?.snippet||"")).toLowerCase();
  if(["fed","federal reserve","inflation","cpi","rates","rate cut","rate hike","yield","recession","gdp","jobs","tariff","war"].some(w=>t.includes(w)))return"Macro fear";
  if(["earnings","revenue","eps","guidance","profit","margin"].some(w=>t.includes(w)))return"Earnings";
  if(["fraud","lawsuit","sec","probe","recall","bankruptcy","layoffs","downgrade"].some(w=>t.includes(w)))return"Company damage";
  if(["upgrade","buyback","contract","partnership","product launch","acquisition","strong demand"].some(w=>t.includes(w)))return"Company catalyst";
  if(["ai","chip","semiconductor","gpu","data center"].some(w=>t.includes(w)))return"AI/semis";
  if(["oil","energy","opec","crude"].some(w=>t.includes(w)))return"Energy";
  if(["bitcoin","crypto","ethereum"].some(w=>t.includes(w)))return"Crypto";
  return"Market flow";
}
export function newsEventLabel(article,tokens){
  const t=((article?.title||"")+" "+(article?.snippet||"")).toLowerCase();
  if(["fed","federal reserve","rate","rates","inflation","cpi","yield"].some(w=>t.includes(w)))return"Fed rate concern";
  if(["tariff","trade war","trade policy"].some(w=>t.includes(w)))return"Tariff/trade concern";
  if(["earnings","revenue","eps","guidance"].some(w=>t.includes(w)))return"Earnings update";
  if(["ai","chip","semiconductor","gpu","data center"].some(w=>t.includes(w)))return"AI sector move";
  if(["oil","energy","opec","crude"].some(w=>t.includes(w)))return"Oil/energy move";
  if(["bitcoin","crypto","ethereum"].some(w=>t.includes(w)))return"Crypto market move";
  const words=[...(tokens||[])].filter(w=>w.length>3).slice(0,4);
  return words.length?words.map(w=>w[0].toUpperCase()+w.slice(1)).join(" "):"Market news event";
}
export function dedupeNewsArticles(items,limit=50){
  const clusters=[];
  (items||[]).map(normalizeNewsItem).filter(a=>a.title).sort((a,b)=>b._ts-a._ts).forEach(article=>{
    const tokens=newsTokenSet(article);const titleKey=article.title.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
    const driver=classifyNewsDriver(article);
    let match=clusters.find(c=>c.titleKey===titleKey||(c.driver===driver&&newsSimilarity(tokens,c.tokens)>=0.5));
    if(match){
      match.count++;
      match.sources.add(article.source);
      match.titles.push(article.title);
      if(article._ts>match.article._ts)match.article={...article};
      match.tokens=new Set([...match.tokens,...tokens]);
    }else clusters.push({article:{...article},tokens,titleKey,driver,count:1,sources:new Set([article.source]),titles:[article.title]});
  });
  return clusters.slice(0,limit).map(c=>{
    const sources=[...c.sources].filter(Boolean);
    const suffix=c.count>1?` + ${c.count-1} similar`:"";
    return{...c.article,source:`${sources[0]||"News"}${sources.length>1?` + ${sources.length-1}`:""}`,duplicateCount:c.count,duplicateSources:sources,duplicateTitles:c.titles,sourceCount:sources.length||1,eventLabel:newsEventLabel(c.article,c.tokens),eventDriver:c.driver,eventImpact:classifyNewsQuality(c.article),storyKey:[...c.tokens].sort().slice(0,14).join("-"),clusterLabel:suffix};
  });
}
export function getMarketSentiment(assets){const r=assets.filter(a=>a.change>0).length/assets.length;if(r>=0.65)return{label:"Bullish",color:"#10B981",icon:"📈",sub:"Risk-on"};if(r<=0.35)return{label:"Bearish",color:"#EF4444",icon:"📉",sub:"Risk-off"};return{label:"Mixed",color:"#F59E0B",icon:"⚖️",sub:"Uncertain"};}
export function getFearGreed(assets){const avg=assets.reduce((s,a)=>s+a.change,0)/assets.length;const score=Math.min(95,Math.max(5,Math.round(50+avg*8)));const label=score>=70?"Greed":score>=55?"Mild Greed":score>=45?"Neutral":score>=30?"Mild Fear":"Fear";const color=score>=70?"#10B981":score>=55?"#34D399":score>=45?"#F59E0B":score>=30?"#F97316":"#EF4444";return{score,label,color};}
export function detectMarketRegime(assets){
  const avg=assets.reduce((s,a)=>s+(a.change||0),0)/Math.max(assets.length,1);
  const adv=assets.filter(a=>(a.change||0)>0).length,dec=assets.filter(a=>(a.change||0)<0).length;
  const advRatio=adv/Math.max(assets.length,1),decRatio=dec/Math.max(assets.length,1);
  const bigDown=assets.filter(a=>(a.change||0)<-3).length/Math.max(assets.length,1);
  if(decRatio>=0.72&&avg<=-2)return{label:"Panic Selloff",riskMode:"risk-off",avg,advRatio,decRatio,score:-3,description:"broad forced selling and fear-driven de-risking"};
  if(advRatio>=0.65&&avg>=1.2)return{label:"Bull Market",riskMode:"risk-on",avg,advRatio,decRatio,score:2,description:"broad participation and constructive risk appetite"};
  if(decRatio>=0.62&&avg<=-0.9)return{label:"Bear Market",riskMode:"risk-off",avg,advRatio,decRatio,score:-2,description:"broad weakness and defensive positioning"};
  if(advRatio>=0.58&&avg>0&&bigDown<0.15)return{label:"Recovery Rally",riskMode:"risk-on",avg,advRatio,decRatio,score:1,description:"buyers returning after prior weakness"};
  return{label:"Sideways Market",riskMode:"neutral",avg,advRatio,decRatio,score:0,description:"mixed breadth and range-bound conditions"};
}
export function categoryAverage(cat,assets=ASSETS){const group=assets.filter(a=>a.category===cat);return group.length?group.reduce((s,a)=>s+(a.change||0),0)/group.length:0;}
export function textScore(text,words){const t=(text||"").toLowerCase();return words.filter(w=>t.includes(w)).length;}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
export function average(nums){const vals=(nums||[]).filter(n=>Number.isFinite(n));return vals.length?vals.reduce((s,n)=>s+n,0)/vals.length:0;}
export function getBenchmarkSymbols(asset){
  const sym=asset?.symbol||"";const cat=asset?.category||"Stock";
  const sector=SYMBOL_BENCHMARKS[sym]||SYMBOL_BENCHMARKS[displaySymbol(sym)]||SECTOR_BENCHMARKS[cat]||"SPY";
  const market=cat==="AI"||["QQQ","ARKK","SOXL"].includes(sym)||["AAPL","MSFT","NVDA","AMD","GOOGL","AMZN","META","NFLX","TSLA","PLTR","SMCI","SNOW","PATH","BBAI"].includes(sym)?"QQQ":"SPY";
  return{market,sector};
}
export function classifyNewsQuality(item){const t=((item?.title||"")+" "+(item?.snippet||"")).toLowerCase();const title=(item?.title||"").toLowerCase();const spam=["shocking","you won't believe","secret","crash incoming","moonshot","click here","sponsored","advertorial"];if(spam.some(w=>t.includes(w)))return"Noise";if(isHighImpact(item)||detectEarnings(item)||["guidance","lawsuit","sec","fraud","acquisition","merger","recall","bankruptcy","downgrade","upgrade","contract","product launch"].some(w=>t.includes(w)))return"High";if(title.length>20&&["market","stock","rates","sector","earnings","revenue","inflation","fed","oil","growth"].some(w=>t.includes(w)))return"Medium";return"Noise";}
export function webIntelligence(asset,newsItems=[]){
  const sym=asset?.symbol||"";const rel=getAssetNews(sym,newsItems);const macroWords=["fed","federal reserve","inflation","cpi","rates","rate hike","rate cut","war","oil","recession","gdp","jobs","yield","tariff","macro"];const weakWords=["earnings miss","miss","fraud","sec probe","lawsuit","guidance cut","layoffs","recall","debt","bankruptcy","revenue collapsing","margin pressure","weak demand","downgrade","support broken"];const strongWords=["earnings beat","beat","raises guidance","record","buyback","upgrade","contract","product launch","acquisition","strong demand","margin expansion","profit growth","partnership"];
  let macroFear=0,companyWeak=0,companyStrong=0,high=0,medium=0,noise=0;
  newsItems.forEach(n=>{const q=classifyNewsQuality(n);if(q==="High")high++;else if(q==="Medium")medium++;else noise++;const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();if(macroWords.some(w=>t.includes(w)))macroFear++;});
  rel.forEach(n=>{const q=classifyNewsQuality(n);if(q==="Noise")return;const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();companyWeak+=weakWords.filter(w=>t.includes(w)).length;companyStrong+=strongWords.filter(w=>t.includes(w)).length;});
  const companyScore=clamp(companyStrong*0.9-companyWeak*1.25,-2,2);
  const macroScore=clamp(macroFear>0?-Math.min(1.2,macroFear*0.25):0,-1.2,0);
  const qualityPenalty=noise>high+medium*2?-.3:0;
  return{rel,macroFear,companyWeak,companyStrong,highImpact:high,mediumImpact:medium,noise,companyScore,macroScore,qualityPenalty};
}
export function analyzePriceHistory(history=[],price=0){
  const candles=(history||[]).filter(c=>Number(c?.close)>0).slice(-120);
  if(candles.length<20)return{available:false,score:0,trendScore:0,volumeScore:0,support:null,resistance:null,above20:false,above50:false,brokeSupport:false,breakout:false,nearSupport:false,nearResistance:false,normalPullback:false,volumeRatio:0,volatility20:0,return20:0,return60:0,pullbackFromHigh:0,source:"estimated"};
  const closes=candles.map(c=>Number(c.close));const highs=candles.map(c=>Number(c.high||c.close));const lows=candles.map(c=>Number(c.low||c.close));const vols=candles.map(c=>Number(c.volume||0));
  const last=price||closes[closes.length-1];const prev=closes[closes.length-2]||last;
  const c20=closes.slice(-20),c50=closes.slice(-50),c60=closes.slice(-60),h20=highs.slice(-20),l20=lows.slice(-20),h60=highs.slice(-60),v20=vols.slice(-20);
  const sma20=average(c20),sma50=average(c50);const high20=Math.max(...h20),low20=Math.min(...l20),high60=Math.max(...h60);
  const below=l20.filter(v=>v<last);const above=h20.filter(v=>v>last);
  const support=+(below.length?Math.max(...below):low20).toFixed(2);const resistance=+(above.length?Math.min(...above):high20).toFixed(2);
  const return20=c20[0]?((last-c20[0])/c20[0]*100):0;const return60=c60[0]?((last-c60[0])/c60[0]*100):return20;const pullbackFromHigh=high60?((last-high60)/high60*100):0;
  const dailyReturns=c20.slice(1).map((c,i)=>c20[i]?Math.abs((c-c20[i])/c20[i]*100):0);const volatility20=average(dailyReturns);
  const avgVol=average(v20.slice(0,-1));const lastVol=v20[v20.length-1]||0;const volumeRatio=avgVol>0?lastVol/avgVol:0;
  const above20=last>=sma20,above50=last>=sma50;const brokeSupport=support>0&&last<support*.985;const breakout=resistance>0&&last>resistance*1.01;
  const nearSupport=support>0&&last<=support*1.025&&last>=support*.97;const nearResistance=resistance>0&&last>=resistance*.975&&last<=resistance*1.03;
  const normalPullback=above50&&pullbackFromHigh<=-3&&pullbackFromHigh>=-18&&!brokeSupport;
  const trendScore=clamp((above20?0.45:-0.45)+(above50?0.65:-0.65)+(return20>4?0.35:return20<-6?-0.45:0)+(return60>8?0.45:return60<-10?-0.55:0),-1.8,1.8);
  const volumeScore=volumeRatio>1.35?(last>=prev?0.35:-0.35):volumeRatio>0&&volumeRatio<0.65?-0.05:0;
  const score=clamp(trendScore+volumeScore+(breakout?0.45:0)+(brokeSupport?-0.85:0)+(nearSupport&&above50?0.3:0),-2.5,2.5);
  return{available:true,score,support,resistance,trendScore,volumeScore,above20,above50,brokeSupport,breakout,nearSupport,nearResistance,normalPullback,volumeRatio:+volumeRatio.toFixed(2),volatility20:+volatility20.toFixed(2),return20:+return20.toFixed(2),return60:+return60.toFixed(2),pullbackFromHigh:+pullbackFromHigh.toFixed(2),source:"historical"};
}
export function relativeHistoryProfile(assetHistory=[],marketHistory=[],sectorHistory=[]){
  const asset=analyzePriceHistory(assetHistory);
  const market=analyzePriceHistory(marketHistory);
  const sector=analyzePriceHistory(sectorHistory);
  if(!asset.available)return{available:false,score:0,marketRel20:0,sectorRel20:0,marketRel60:0,sectorRel60:0,leadership:"unknown"};
  const marketRel20=market.available?asset.return20-market.return20:0;
  const sectorRel20=sector.available?asset.return20-sector.return20:0;
  const marketRel60=market.available?asset.return60-market.return60:0;
  const sectorRel60=sector.available?asset.return60-sector.return60:0;
  const score=clamp((market.available?marketRel20*.08+marketRel60*.04:0)+(sector.available?sectorRel20*.1+sectorRel60*.05:0),-1.4,1.4);
  const leadership=sector.available&&sectorRel20>3&&marketRel20>2?"leader":sector.available&&sectorRel20<-3&&marketRel20<-2?"laggard":market.available||sector.available?"mixed":"unknown";
  return{available:market.available||sector.available,score:+score.toFixed(2),marketRel20:+marketRel20.toFixed(2),sectorRel20:+sectorRel20.toFixed(2),marketRel60:+marketRel60.toFixed(2),sectorRel60:+sectorRel60.toFixed(2),leadership,asset,market,sector};
}
export function technicalStructure(asset,sectorAvg,indexAvg,history=null){
  const price=asset?.price||0;const chg=asset?.change||0;const abs=Math.abs(chg);const hist=analyzePriceHistory(history||asset?._history||[],price);
  const relHist=relativeHistoryProfile(history||asset?._history||[],asset?._marketHistory||[],asset?._sectorHistory||[]);
  const momentum=chg>2?1.1:chg>0.6?0.55:chg<-3?-1.1:chg<-1?-0.55:0;const rel=chg-sectorAvg;const indexRel=chg-indexAvg;
  const trend=hist.available?hist.trendScore:(chg>0&&rel>=0?0.6:chg<0&&rel<0?-0.6:0);
  const breakdown=hist.available?hist.brokeSupport||(chg<-4&&rel<-1.5&&!hist.above50):(chg<-4&&rel<-1.5);
  const reversal=hist.available?hist.breakout||(chg>1&&rel>1&&hist.above20):(chg>1&&rel>1);
  const volumeConfirm=hist.available?hist.volumeRatio>=1.35:(abs>=2.5?true:null);
  const support=hist.available?hist.support:+(price*(1-Math.max(1.5,abs*0.7)/100)).toFixed(2);
  const resistance=hist.available?hist.resistance:+(price*(1+Math.max(2,abs*0.9)/100)).toFixed(2);
  const volumeScore=hist.available?hist.volumeScore:(volumeConfirm&&chg>0?0.25:volumeConfirm&&chg<0?-0.25:0);
  const score=clamp((hist.available?hist.score:0)+momentum*.55+(hist.available?0:(trend))+(reversal?0.4:0)+(breakdown?-1:0)+volumeScore+(relHist.available?relHist.score:0),-3,3);
  return{score,support,resistance,momentum,trend,breakdown,reversal,volumeConfirm,indexRel:+indexRel.toFixed(2),history:hist,relativeHistory:relHist,trendScore:+trend.toFixed(2),volumeScore:+volumeScore.toFixed(2),supportSource:hist.source};
}
export function portfolioRiskLayer(asset,portfolioState=[]){
  if(!portfolioState?.length)return{score:0,exposure:"None",overexposed:false,leveraged:false};
  const total=portfolioState.reduce((s,h)=>s+(Number(h.avgCost)||0)*(Number(h.shares)||0),0);const sym=asset?.symbol||"";const cat=asset?.category||"Stock";const sameCat=portfolioState.filter(h=>{const a=ASSETS.find(x=>x.symbol===h.symbol||displaySymbol(x.symbol)===h.symbol||x.symbol===h._fullSymbol);return(a?.category||"Stock")===cat;}).reduce((s,h)=>s+(Number(h.avgCost)||0)*(Number(h.shares)||0),0);const sameSym=portfolioState.filter(h=>h.symbol===sym||displaySymbol(h.symbol)===displaySymbol(sym)).reduce((s,h)=>s+(Number(h.avgCost)||0)*(Number(h.shares)||0),0);const leveraged=/SOXL|TQQQ|SQQQ|SPXL|SPXS|UPRO|LABU|FNGU|TECL|UVXY|3X|2X/i.test(sym);const catPct=total?sameCat/total:0;const symPct=total?sameSym/total:0;let score=0;if(catPct>.45)score-=.7;if(symPct>.25)score-=.55;if(leveraged)score-=.65;return{score,exposure:`${Math.round(catPct*100)}% ${cat}`,overexposed:catPct>.45||symPct>.25,leveraged};}
export function assetMarketProfile(asset,tech,relativeStrength,web,regime,realDamage,fearEvent,portfolioExposure){
  const sym=displaySymbol(asset?.symbol||"");const cat=asset?.category||"Stock";const chg=asset?.change||0;const abs=Math.abs(chg);
  const hist=tech.history||{};const volRef=hist.available?Math.max(abs,hist.volatility20||0):abs;
  const volatility=volRef>=6?"extreme volatility":volRef>=3?"elevated volatility":volRef>=1.2?"active trading":"controlled volatility";
  const structure=hist.available&&tech.breakdown?"failed support":!hist.available&&tech.breakdown?"estimated downside pressure":hist.breakout?"historical breakout":hist.normalPullback?"normal pullback inside longer trend":hist.nearSupport?"testing historical support":tech.reversal?"reversal attempt":tech.score>0.8?"constructive momentum":tech.score<-0.8?"weak technical structure":"range-bound structure";
  const rh=tech.relativeHistory||{};const histRel=rh.available?`historical relative strength is ${rh.leadership} (${rh.sectorRel20>=0?"+":""}${rh.sectorRel20}% vs sector, ${rh.marketRel20>=0?"+":""}${rh.marketRel20}% vs market over 20 sessions)`:null;
  const rel=histRel||(
    relativeStrength>=2?`leading its ${cat} group by ${relativeStrength.toFixed(1)} points`:relativeStrength<=-2?`lagging its ${cat} group by ${Math.abs(relativeStrength).toFixed(1)} points`:`trading close to its ${cat} group`
  );
  const newsMode=realDamage?"company-specific damage":web.companyWeak>0?"company-specific pressure":web.companyStrong>0?"company-specific support":fearEvent?"macro fear":web.macroFear>0?"macro-driven volatility":"limited news signal";
  const portfolioNote=portfolioExposure&&portfolioExposure!=="None"?` Portfolio exposure: ${portfolioExposure}.`:"";
  const dataNote=hist.available?` Historical trend ${hist.return20>=0?"+":""}${hist.return20}% over 20 sessions; volume ratio ${hist.volumeRatio}x.`:" Support/resistance are estimated because historical candles are not loaded.";
  return{volatility,structure,rel,newsMode,summary:`${sym} is ${chg>=0?"up":"down"} ${abs.toFixed(1)}% in ${volatility}; ${rel}, with ${structure}. News read-through is ${newsMode} under a ${regime.label} regime.${dataNote}${portfolioNote}`};
}
export function institutionalDecision(asset,newsItems=[],sentiment="Neutral",basis=0,portfolioState=[],history=null){
  const sym=displaySymbol(asset?.symbol||"");const cat=asset?.category||"Stock";const price=asset?.price||basis||0;const chg=asset?.change||0;const abs=Math.abs(chg);
  const regime=detectMarketRegime(ASSETS);const riskMode=regime.label==="Bull Market"||regime.label==="Recovery Rally"?"risk-on":regime.label==="Bear Market"||regime.label==="Panic Selloff"?"risk-off":"neutral";
  const sectorAvg=categoryAverage(cat);const indexAvg=categoryAverage("ETF");const relativeStrength=chg-sectorAvg;const strongAsset=["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AMD","JPM","V","MA","LLY","UNH","SPY","QQQ"].includes(asset?.symbol);
  const tech=technicalStructure(asset,sectorAvg,indexAvg,history);const hist=tech.history||{};const web=webIntelligence(asset,newsItems);const port=portfolioRiskLayer(asset,portfolioState);
  const relHist=tech.relativeHistory||{available:false,score:0};
  const newsSentiment=sentiment==="Bullish"?0.35:sentiment==="Bearish"?-0.35:0;
  const regimeScore=regime.score*0.42;const technicalScore=tech.score;const relativeScore=clamp(relativeStrength*0.24+tech.indexRel*0.08+(relHist.available?relHist.score:0),-1.7,1.7);const newsScore=clamp(web.companyScore+web.qualityPenalty+newsSentiment,-2.1,2.1);const macroScore=web.macroScore;const marketRiskScore=-(abs>5?0.35:0);const riskScore=port.score+marketRiskScore;
  const fearEvent=["Panic Selloff","Bear Market"].includes(regime.label)&&web.macroFear>0&&web.companyWeak===0;
  const realDamage=web.companyWeak>=2||(hist.available&&tech.breakdown&&(relativeStrength<-1||web.companyWeak>0||hist.brokeSupport));
  const dipOpportunity=strongAsset&&hist.available&&hist.normalPullback&&!realDamage&&relativeStrength>=-1.5&&(!relHist.available||relHist.marketRel20>-4);
  let marketScore=regimeScore+technicalScore+relativeScore+newsScore+macroScore+marketRiskScore+(strongAsset?0.35:0);
  if(dipOpportunity)marketScore+=0.75;
  if(fearEvent&&strongAsset&&chg<0)marketScore+=1.15;if(fearEvent&&!realDamage)marketScore=Math.max(marketScore,-.75);if(realDamage)marketScore-=1.35;
  let score=marketScore+port.score;if(port.overexposed&&score>1.6)score-=.8;
  const marketAction=marketScore>=1.85?"BUY":marketScore<=-2.65&&realDamage?"SELL":"HOLD";
  let action=score>=2.15?"BUY":score<=-2.65&&realDamage?"SELL":"HOLD";
  if(fearEvent&&!realDamage&&action==="SELL")action=strongAsset?"BUY":"HOLD";
  if(port.overexposed&&action==="BUY")action="HOLD";
  const confidence=Math.abs(score)>=3?"High":Math.abs(score)>=1.35?"Medium":"Low";
  const risk=realDamage||regime.label==="Panic Selloff"||abs>5||port.leveraged?"High":regime.label==="Bear Market"||abs>2.5||port.overexposed||hist.brokeSupport?"Medium":"Low";
  const profile=assetMarketProfile(asset,tech,relativeStrength,web,regime,realDamage,fearEvent,port.exposure);
  const context=profile.summary;
  const thesis=action==="BUY"?`${context} BUY requires confirmation above $${tech.resistance} or a controlled entry near $${tech.support}; the model is prioritizing trend, volume, and relative strength over headline emotion.`:action==="SELL"?`${context} SELL requires real damage: ${profile.newsMode} plus ${profile.structure}. A reclaim of $${tech.resistance} would reduce downside pressure.`:`${context} HOLD is preferred while price respects support $${tech.support} but has not cleared resistance $${tech.resistance}. The model is waiting for clearer confirmation before changing exposure.`;
  const confidenceReason=confidence==="High"?"major score factors agree":confidence==="Medium"?"score factors are constructive but mixed":"data is mixed, incomplete, or close to neutral";
  return{action,marketAction,score:+score.toFixed(2),marketScore:+marketScore.toFixed(2),confidence,confidenceReason,risk,regime:{...regime,riskMode},sectorAvg:+sectorAvg.toFixed(2),relativeStrength:+relativeStrength.toFixed(2),support:tech.support,resistance:tech.resistance,supportSource:tech.supportSource,thesis,context,volatility:profile.volatility,structure:profile.structure,newsMode:profile.newsMode,broadFear:fearEvent,companyWeak:web.companyWeak,companyStrong:web.companyStrong,macroFear:web.macroFear,strongAsset,dipOpportunity,technicalScore:+technicalScore.toFixed(2),trendScore:+(tech.trendScore||0).toFixed(2),volumeScore:+(tech.volumeScore||0).toFixed(2),newsScore:+newsScore.toFixed(2),macroScore:+macroScore.toFixed(2),relativeScore:+relativeScore.toFixed(2),riskScore:+riskScore.toFixed(2),portfolioExposure:port.exposure,newsQuality:{high:web.highImpact,medium:web.mediumImpact,noise:web.noise},realDamage,history:hist,relativeHistory:relHist,benchmarks:getBenchmarkSymbols(asset)};
}
export function generateNarrative(assets,news){const fg=getFearGreed(assets);const regime=detectMarketRegime(assets);const movers=assets.filter(detectMarketMovement).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));const gainers=assets.filter(a=>a.change>0).length;const decliners=assets.filter(a=>a.change<0).length;const macro=news.find(n=>{const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();return["fed","federal reserve","inflation","tariff","rate","gdp","cpi","jobs","unemployment"].some(kw=>t.includes(kw));});const crypto=assets.filter(a=>a.category==="Crypto");const cryptoAvg=crypto.length>0?(crypto.reduce((s,a)=>s+a.change,0)/crypto.length):0;let txt=`Market regime: ${regime.label}. Breadth shows ${gainers} advancing and ${decliners} declining across ${assets.length} tracked assets; Fear & Greed is ${fg.score}/100 (${fg.label}). `;if(movers.length>0){const top3=movers.slice(0,3).map(a=>`${displaySymbol(a.symbol)} ${a.change>0?"+":""}${a.change.toFixed(2)}%`).join(", ");txt+=`Top movers: ${top3}. `;}if(cryptoAvg!==0)txt+=`Crypto averages ${cryptoAvg>0?"+":""}${cryptoAvg.toFixed(1)}%, showing ${cryptoAvg>0?"risk appetite":"risk-off pressure"} in digital assets. `;if(macro)txt+=`Macro catalyst: "${macro.title.slice(0,65)}…" `;txt+=regime.label==="Panic Selloff"?`This looks like market-wide fear, so strong assets should not be auto-sold solely because they are red; prioritize quality, relative strength, support zones, and staged buy-the-dip entries.`:regime.label==="Bear Market"?`Separate real company weakness from broad de-risking. HOLD is often better than panic selling unless support fails with asset-specific bad news.`:regime.label==="Bull Market"?`Trend and breadth remain constructive; pullbacks in high-quality leaders can be accumulation zones while weak assets still need discipline.`:regime.label==="Recovery Rally"?`Buyers are returning, but confirmation matters. Favor assets reclaiming resistance with improving breadth.`:`Range conditions favor HOLD decisions, smaller position sizes, and waiting for momentum confirmation.`;return txt;}
export function enhanceOpportunity(opp){const asset=ASSETS.find(a=>a.symbol===opp.symbol);const inst=opp.decision||(asset?institutionalDecision(asset,opp.newsItems||[],opp.sentiment):null);const action=opp.action||inst?.marketAction||inst?.action;const isMover=asset?detectMarketMovement(asset):false;const isPos=action==="BUY",isNeg=action==="SELL";const sym=displaySymbol(opp.symbol);const price=asset?.price||0;const chg=asset?.change||0;const cat=asset?.category||"Stock";const newsSnip=(opp.newsTitle||"").slice(0,45);const tgt=isPos?(price*1.05).toFixed(2):(price*0.95).toFixed(2);const stp=isPos?(price*0.97).toFixed(2):(price*1.03).toFixed(2);
  var sto,lto;
  if(isPos&&isMover)sto=sym+" $"+price.toFixed(2)+" (+"+chg.toFixed(2)+"%) surging on '"+newsSnip+"' — breakout above $"+(price*1.02).toFixed(2)+" likely.";
  else if(isPos)sto=sym+" $"+price.toFixed(2)+" — buyers active. Entry near $"+price.toFixed(2)+", target $"+tgt+" within 5 sessions.";
  else if(isNeg&&isMover)sto=sym+" $"+price.toFixed(2)+" ("+chg.toFixed(2)+"%) sharp drop on '"+newsSnip+"' — risk of decline to $"+(price*0.95).toFixed(2)+".";
  else if(isNeg)sto=sym+" $"+price.toFixed(2)+" — selling pressure. Avoid longs below $"+(price*0.98).toFixed(2)+".";
  else sto=sym+" flat at $"+price.toFixed(2)+". Awaiting catalyst.";
  if(isPos&&cat==="Crypto")lto=sym+" adoption thesis intact. Accumulate dips below $"+(price*0.92).toFixed(2)+".";
  else if(isPos&&cat==="Bond")lto=sym+" yield favors income investors. Add on dips to $"+(price*0.97).toFixed(2)+".";
  else if(isPos&&cat==="ETF")lto=sym+" sector momentum supports DCA. Resistance at $"+(price*1.08).toFixed(2)+".";
  else if(isPos)lto=sym+" '"+newsSnip+"' supports bullish case. Target $"+tgt+". Watch earnings.";
  else if(isNeg&&cat==="Bond")lto=sym+" rate pressure may persist. Reduce below $"+(price*0.95).toFixed(2)+".";
  else if(isNeg&&cat==="Crypto")lto=sym+" macro headwinds. Support at $"+(price*0.85).toFixed(2)+".";
  else if(isNeg)lto=sym+" '"+newsSnip+"' weighs on outlook. Trim above $"+stp+".";
  else lto=sym+" needs catalyst. Wait for earnings or macro data.";
  let cardReason=opp.reason;
  if(inst){
    sto=`${sym} ${action} setup at $${price.toFixed(2)}. ${inst.context} Regime: ${inst.regime.label}; support $${inst.support}, resistance $${inst.resistance}.`;
    lto=inst.thesis;
    if(inst.realDamage)cardReason=`${sym}: ${action} because company-specific damage or failed support outweighs broader market noise. The engine is watching support at $${inst.support}; reclaiming $${inst.resistance} would weaken the bearish case.`;
    else if(inst.broadFear)cardReason=`${sym}: ${action} because the move looks more like macro fear than confirmed asset damage. In a ${inst.regime.label} regime, support $${inst.support} and resistance $${inst.resistance} matter more than headline emotion.`;
    else if(inst.relativeStrength>1)cardReason=`${sym}: ${action} because it is outperforming its sector by ${inst.relativeStrength} points with supportive structure. Confirmation improves above $${inst.resistance}; risk rises if price loses $${inst.support}.`;
    else if(inst.portfolioExposure&&inst.portfolioExposure!=="None")cardReason=`${sym}: ${action} after portfolio exposure and volatility were factored into the score. Exposure is ${inst.portfolioExposure}, so sizing discipline matters even when the setup looks strong.`;
    else cardReason=`${sym}: ${action} based on ${inst.regime.label}, technical structure, and sector-relative strength. The decision weighs price action, macro/company news quality, support $${inst.support}, and resistance $${inst.resistance}.`;
  }
  return{...opp,reason:cardReason,action,category:cat,price:asset?.price,shortTermOutlook:sto,longTermOutlook:lto,riskLevel:inst?.risk||(isMover?(isPos?"Medium":"High"):"Low"),confidence:inst?.confidence,regime:inst?.regime?.label,isMover,catalyst:(opp.newsTitle?.slice(0,65)||"Market analysis")+(opp.newsTitle?.length>65?"…":"")};
};
export function computeAssetRisk(asset,dominant,isMover){const inst=institutionalDecision(asset,[],dominant);return inst.risk||((isMover&&dominant==="Bearish")?"High":isMover?"Medium":dominant==="Bearish"?"Medium":"Low");}
export function generateAssetWhyMatters(asset,dominant,isMover,news){
  const inst=institutionalDecision(asset,news,dominant);
  if(inst)return`${displaySymbol(asset.symbol)} institutional view: ${inst.action} (${inst.confidence} confidence, ${inst.risk} risk). ${inst.context} Support sits near $${inst.support}; resistance is $${inst.resistance}. The key read is ${inst.newsMode}, so the engine separates short-term volatility from real long-term weakness.`;
  const sym=displaySymbol(asset.symbol);const dir=asset.change>=0?"gaining":"declining";const chg=Math.abs(asset.change).toFixed(2);const price=asset.price?.toFixed(2)||"N/A";const cat=asset.category||"Stock";
  const rel=getAssetNews(asset.symbol,news);
  const macro=news.find(n=>{const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();return["fed","inflation","tariff","rate","gdp"].some(kw=>t.includes(kw));});
  if(rel.length>0){
    const topNews=rel[0].title.slice(0,60);
    return`${sym} is ${dir} ${chg}% at $${price} with ${rel.length} related article${rel.length>1?"s":""}: "${topNews}…" ${dominant?`AI sentiment: ${dominant}.`:""} ${isMover?"This exceeds normal volatility — watch closely.":""}`;
  }
  if(macro)return`${sym} at $${price} (${dir} ${chg}%) is reacting to macro conditions: "${macro.title.slice(0,55)}…" ${cat==="Bond"?"Bond markets are particularly sensitive to these developments.":cat==="Crypto"?"Crypto correlates with macro risk appetite.":""} ${dominant?`AI outlook: ${dominant.toLowerCase()}.`:""}`;
  const catContext={Stock:`Equity markets are pricing in ${dir==="gaining"?"optimism":"caution"} for ${sym}'s sector.`,ETF:`${sym} reflects ${dir==="gaining"?"inflows into":"outflows from"} the underlying sector.`,Crypto:`${sym} moving with broader crypto market ${dir==="gaining"?"strength":"weakness"}. On-chain activity is a key indicator.`,Bond:`${sym} at $${price} reflects current interest rate expectations and ${dir==="gaining"?"flight to safety":"risk-on"} dynamics.`,Commodity:`${sym} driven by supply/demand dynamics. ${dir==="gaining"?"Tight supply or strong demand":"Weak demand or oversupply"} is the theme.`,Forex:`${sym} reflects central bank policy divergence and macro flows.`,Index:`${sym} captures broad market ${dir==="gaining"?"strength":"weakness"} across constituent stocks.`};
  return`${sym} is ${dir} ${chg}% at $${price}. ${catContext[cat]||`Price action is within normal ranges for ${cat} assets.`} ${isMover?"Elevated volatility warrants attention.":"Monitor for follow-through."}`;
}
export function generateAssetShortTerm(asset,dominant,isMover){
  const inst=institutionalDecision(asset,[],dominant);
  if(inst)return`${displaySymbol(asset.symbol)} short-term: ${inst.structure} inside a ${inst.regime.label} backdrop. Support $${inst.support} is the first level to defend; resistance $${inst.resistance} is the confirmation level. Current driver: ${inst.newsMode}.`;
  const sym=displaySymbol(asset.symbol);const chg=asset.change||0;const price=asset.price||0;const cat=asset.category||"Stock";
  if(dominant==="Bullish"&&isMover)return`${sym} showing strong momentum at $${price.toFixed(2)}, up ${chg.toFixed(2)}% today. Buyers in control — watch for continuation above $${(price*1.02).toFixed(2)} for confirmation.`;
  if(dominant==="Bullish")return`${sym} trending bullish at $${price.toFixed(2)}. ${cat==="Crypto"?"On-chain metrics and volume support further upside.":cat==="ETF"?"Sector rotation favors this space.":"Momentum buyers likely; watch for gap-up at open."}`;
  if(dominant==="Bearish"&&isMover)return`${sym} under heavy selling at $${price.toFixed(2)}, down ${Math.abs(chg).toFixed(2)}% today. Avoid new longs — support at $${(price*0.97).toFixed(2)} is key.`;
  if(dominant==="Bearish")return`${sym} facing near-term headwinds at $${price.toFixed(2)}. ${cat==="Bond"?"Rising yields pressuring prices.":"Seller control; wait for stabilization before entry."}`;
  return`${sym} consolidating near $${price.toFixed(2)} (${chg>=0?"+":""}${chg.toFixed(2)}%). No clear direction — wait for volume breakout or catalyst.`;
}
export function generateAssetLongTerm(asset,dominant){
  const inst=institutionalDecision(asset,[],dominant);
  if(inst)return`${displaySymbol(asset.symbol)} long-term: ${inst.regime.label} regime with ${inst.relativeStrength>0?"+":""}${inst.relativeStrength} points of sector-relative strength. ${inst.newsMode==="macro fear"?"Macro pressure can create temporary mispricing if support holds.":inst.newsMode.includes("company")?"Company-specific news matters more here than broad market noise.":"With limited news signal, price structure and sector trend carry more weight."} Bias stays ${inst.action} unless $${inst.support} fails or $${inst.resistance} is reclaimed.`;
  const sym=displaySymbol(asset.symbol);const cat=asset.category||"Stock";const price=asset.price||0;
  if(dominant==="Bullish")return cat==="Bond"?`${sym} at $${price.toFixed(2)} — rising bond prices signal risk-off rotation. Favorable for income-focused portfolios.`:cat==="Crypto"?`${sym} long-term thesis intact. Institutional adoption and network growth support upside above $${(price*1.2).toFixed(2)}.`:cat==="ETF"?`${sym} benefits from sector tailwinds. DCA approach recommended for long-term exposure.`:`${sym} fundamentals support medium-term appreciation. Next earnings report may trigger analyst upgrades.`;
  if(dominant==="Bearish")return cat==="Bond"?`${sym} at $${price.toFixed(2)} — rate pressure may continue weighing on prices. Monitor Fed signals closely.`:cat==="Crypto"?`${sym} facing headwinds. Macro uncertainty and regulatory risks limit upside near-term.`:`${sym} fundamental challenges may persist. Consider trimming on relief rallies above $${(price*1.05).toFixed(2)}.`;
  return`${sym} long-term thesis requires catalysts at $${price.toFixed(2)}. Next earnings and macro releases will be pivotal for direction.`;
}
export function generateOppWhyExists(opp,news){const asset=ASSETS.find(a=>a.symbol===opp.symbol);const inst=asset?institutionalDecision(asset,news,opp.sentiment):null;const action=opp.action||inst?.marketAction||inst?.action;const rel=getAssetNews(opp.symbol,news);const macro=news.find(n=>{const t=((n.title||"")+" "+(n.snippet||"")).toLowerCase();return["fed","inflation","tariff","rate","gdp","trade"].some(kw=>t.includes(kw));});if(inst)return`This ${action} opportunity comes from a weighted institutional model, not headline emotion. ${displaySymbol(opp.symbol)} is showing ${inst.volatility}, ${inst.structure}, and ${inst.relativeStrength>0?"+":""}${inst.relativeStrength} points of sector-relative strength. News mode is ${inst.newsMode}; support $${inst.support} and resistance $${inst.resistance} define the trade zone.${action!==inst.action?` Portfolio risk adjusts the account recommendation to ${inst.action}, so position size should be controlled.`:""}`;if(macro)return`This ${opp.action} signal for ${opp.symbol} is driven by macro conditions: "${macro.title.slice(0,72)}". This creates a ripple effect on ${asset?.category||"market"} assets.`;return`This ${opp.action} signal emerged from multi-factor analysis of current news flow and ${opp.symbol}'s price action. ${opp.reason}`;}

/* ══════════════════════ HELPERS ════════════════════════════════════════ */
export function isHighImpact(a){const t=((a.title||"")+" "+(a.snippet||"")).toLowerCase();return HI_KW.some(kw=>t.includes(kw));}
export function timeAgo(d){if(typeof window==="undefined")return"—";const m=Math.floor((Date.now()-Number(new Date(d)))/60000);return m<1?"just now":m<60?`${m}m ago`:`${Math.floor(m/60)}h ago`;}
export function fmtCD(s){return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}

/* ══════════════════════ UI ATOMS ═══════════════════════════════════════ */
