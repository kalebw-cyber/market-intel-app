export let ASSETS = [
  // ── Stocks ──
  {symbol:"AAPL",name:"Apple Inc.",price:213.67,change:-0.31,category:"Stock"},
  {symbol:"TSLA",name:"Tesla Inc.",price:247.89,change:2.14,category:"Stock"},
  {symbol:"NVDA",name:"Nvidia Corp.",price:883.50,change:3.21,category:"Stock"},
  {symbol:"MSFT",name:"Microsoft Corp.",price:415.20,change:0.62,category:"Stock"},
  {symbol:"GOOGL",name:"Alphabet Inc.",price:176.80,change:1.05,category:"Stock"},
  {symbol:"AMZN",name:"Amazon.com Inc.",price:186.40,change:0.88,category:"Stock"},
  {symbol:"META",name:"Meta Platforms",price:502.30,change:1.42,category:"Stock"},
  {symbol:"AMD",name:"Advanced Micro Devices",price:162.70,change:2.68,category:"Stock"},
  {symbol:"NFLX",name:"Netflix Inc.",price:628.50,change:0.73,category:"Stock"},
  {symbol:"PLTR",name:"Palantir Technologies",price:24.80,change:3.45,category:"Stock"},
  // ── Canadian Stocks ──
  {symbol:"SHOP.TO",name:"Shopify Inc.",price:135.20,change:1.45,category:"Stock"},
  {symbol:"RY.TO",name:"Royal Bank of Canada",price:174.80,change:0.32,category:"Stock"},
  {symbol:"TD.TO",name:"Toronto-Dominion Bank",price:82.40,change:-0.18,category:"Stock"},
  {symbol:"ENB.TO",name:"Enbridge Inc.",price:58.90,change:0.55,category:"Stock"},
  // ── ETFs ──
  {symbol:"SPY",name:"SPDR S&P 500 ETF",price:578.42,change:0.84,category:"ETF"},
  {symbol:"QQQ",name:"Invesco Nasdaq-100 ETF",price:487.15,change:1.23,category:"ETF"},
  {symbol:"DIA",name:"SPDR Dow Jones ETF",price:394.20,change:0.41,category:"ETF"},
  {symbol:"IWM",name:"iShares Russell 2000 ETF",price:201.30,change:0.92,category:"ETF"},
  {symbol:"ARKK",name:"ARK Innovation ETF",price:48.60,change:2.15,category:"ETF"},
  {symbol:"SOXL",name:"Direxion Semiconductor Bull 3X",price:32.40,change:5.82,category:"ETF"},
  {symbol:"XLF",name:"Financial Select Sector SPDR",price:42.10,change:0.38,category:"ETF"},
  {symbol:"XLE",name:"Energy Select Sector SPDR",price:87.90,change:-0.55,category:"ETF"},
  // ── Crypto ──
  {symbol:"BINANCE:BTCUSDT",name:"Bitcoin",price:97500,change:1.85,category:"Crypto"},
  {symbol:"BINANCE:ETHUSDT",name:"Ethereum",price:3420,change:2.43,category:"Crypto"},
  {symbol:"BINANCE:SOLUSDT",name:"Solana",price:178,change:3.12,category:"Crypto"},
  {symbol:"BINANCE:XRPUSDT",name:"XRP",price:2.18,change:-0.95,category:"Crypto"},
  {symbol:"BINANCE:DOGEUSDT",name:"Dogecoin",price:0.18,change:1.67,category:"Crypto"},
  {symbol:"BINANCE:ADAUSDT",name:"Cardano",price:0.72,change:0.88,category:"Crypto"},
  {symbol:"BINANCE:AVAXUSDT",name:"Avalanche",price:36.40,change:1.93,category:"Crypto"},
  {symbol:"BINANCE:LINKUSDT",name:"Chainlink",price:18.25,change:2.11,category:"Crypto"},
  // ── Forex ──
  {symbol:"OANDA:EUR_USD",name:"EUR/USD",price:1.08,change:0.12,category:"Forex"},
  {symbol:"OANDA:GBP_USD",name:"GBP/USD",price:1.27,change:0.08,category:"Forex"},
  {symbol:"OANDA:USD_JPY",name:"USD/JPY",price:154.30,change:-0.24,category:"Forex"},
  {symbol:"OANDA:USD_CAD",name:"USD/CAD",price:1.36,change:-0.15,category:"Forex"},
  {symbol:"OANDA:AUD_USD",name:"AUD/USD",price:0.66,change:0.31,category:"Forex"},
  // ── Commodities ──
  {symbol:"OANDA:XAU_USD",name:"Gold (XAU/USD)",price:2345,change:0.67,category:"Commodity"},
  {symbol:"OANDA:XAG_USD",name:"Silver (XAG/USD)",price:29.40,change:1.23,category:"Commodity"},
  {symbol:"OANDA:WTICO_USD",name:"Crude Oil WTI",price:78.65,change:-1.12,category:"Commodity"},
  {symbol:"OANDA:NATGAS_USD",name:"Natural Gas",price:2.84,change:2.45,category:"Commodity"},
  {symbol:"OANDA:COPPER",name:"Copper",price:4.52,change:0.88,category:"Commodity"},
  // ── Bonds ──
  {symbol:"TLT",name:"iShares 20Y Treasury",price:91.34,change:-0.45,category:"Bond"},
  {symbol:"IEF",name:"iShares 7-10Y Treasury",price:96.78,change:-0.22,category:"Bond"},
  {symbol:"HYG",name:"iShares High Yield Bond",price:77.40,change:0.15,category:"Bond"},
  {symbol:"LQD",name:"iShares Investment Grade",price:108.20,change:-0.08,category:"Bond"},
  // ── Indexes ──
  {symbol:"^GSPC",name:"S&P 500 Index",price:5782,change:0.84,category:"Index"},
  {symbol:"^DJI",name:"Dow Jones Industrial",price:39420,change:0.41,category:"Index"},
  {symbol:"^IXIC",name:"NASDAQ Composite",price:18240,change:1.23,category:"Index"},
  {symbol:"^VIX",name:"CBOE Volatility Index",price:14.82,change:-3.45,category:"Index"},
  {symbol:"^RUT",name:"Russell 2000",price:2013,change:0.92,category:"Index"},
  {symbol:"^GSPTSE",name:"S&P/TSX Composite",price:22450,change:0.28,category:"Index"},
  // ── Real Estate ──
  {symbol:"VNQ",name:"Vanguard Real Estate ETF",price:84.60,change:0.42,category:"Real Estate"},
  {symbol:"O",name:"Realty Income Corp",price:54.30,change:0.18,category:"Real Estate"},
  {symbol:"AMT",name:"American Tower Corp",price:198.70,change:-0.32,category:"Real Estate"},
  // ── Energy ──
  {symbol:"XOM",name:"Exxon Mobil Corp",price:112.40,change:-0.68,category:"Energy"},
  {symbol:"CVX",name:"Chevron Corp",price:158.90,change:-0.42,category:"Energy"},
  {symbol:"OXY",name:"Occidental Petroleum",price:62.30,change:-1.15,category:"Energy"},
  {symbol:"FSLR",name:"First Solar Inc",price:178.40,change:2.32,category:"Energy"},
  // ── AI Stocks ──
  {symbol:"AI",name:"C3.ai Inc",price:28.40,change:3.82,category:"AI"},
  {symbol:"SMCI",name:"Super Micro Computer",price:842.30,change:4.15,category:"AI"},
  {symbol:"SNOW",name:"Snowflake Inc",price:162.50,change:1.88,category:"AI"},
  {symbol:"PATH",name:"UiPath Inc",price:22.10,change:1.45,category:"AI"},
  {symbol:"BBAI",name:"BigBear.ai Holdings",price:3.42,change:5.26,category:"AI"},
  // ── Healthcare/Pharma ──
  {symbol:"JNJ",name:"Johnson & Johnson",price:158.40,change:0.32,category:"Healthcare"},
  {symbol:"UNH",name:"UnitedHealth Group",price:512.80,change:-0.45,category:"Healthcare"},
  {symbol:"PFE",name:"Pfizer Inc",price:28.60,change:1.12,category:"Healthcare"},
  {symbol:"LLY",name:"Eli Lilly & Co",price:782.30,change:1.85,category:"Healthcare"},
  {symbol:"ABBV",name:"AbbVie Inc",price:172.40,change:0.62,category:"Healthcare"},
  {symbol:"MRK",name:"Merck & Co",price:128.90,change:-0.28,category:"Healthcare"},
  {symbol:"XLV",name:"Health Care Select SPDR",price:141.20,change:0.15,category:"Healthcare"},
  // ── Biotech ──
  {symbol:"MRNA",name:"Moderna Inc",price:108.50,change:3.45,category:"Biotech"},
  {symbol:"GILD",name:"Gilead Sciences",price:82.30,change:0.88,category:"Biotech"},
  {symbol:"AMGN",name:"Amgen Inc",price:278.60,change:-0.52,category:"Biotech"},
  {symbol:"REGN",name:"Regeneron Pharma",price:892.40,change:1.15,category:"Biotech"},
  // ── Financials/Banking ──
  {symbol:"JPM",name:"JPMorgan Chase",price:198.70,change:0.82,category:"Financial"},
  {symbol:"BAC",name:"Bank of America",price:38.40,change:0.55,category:"Financial"},
  {symbol:"GS",name:"Goldman Sachs",price:462.80,change:1.12,category:"Financial"},
  {symbol:"V",name:"Visa Inc",price:282.30,change:0.38,category:"Financial"},
  {symbol:"MA",name:"Mastercard Inc",price:468.50,change:0.45,category:"Financial"},
  // ── Industrials ──
  {symbol:"CAT",name:"Caterpillar Inc",price:342.60,change:-0.72,category:"Industrial"},
  {symbol:"DE",name:"Deere & Company",price:388.40,change:-0.48,category:"Industrial"},
  {symbol:"HON",name:"Honeywell Intl",price:198.20,change:0.32,category:"Industrial"},
  {symbol:"GE",name:"GE Aerospace",price:162.80,change:1.25,category:"Industrial"},
  // ── Consumer/Retail ──
  {symbol:"WMT",name:"Walmart Inc",price:168.40,change:0.28,category:"Consumer"},
  {symbol:"COST",name:"Costco Wholesale",price:572.30,change:0.62,category:"Consumer"},
  {symbol:"NKE",name:"Nike Inc",price:98.40,change:-1.32,category:"Consumer"},
  {symbol:"SBUX",name:"Starbucks Corp",price:92.60,change:0.45,category:"Consumer"},
  {symbol:"MCD",name:"McDonald's Corp",price:268.40,change:0.18,category:"Consumer"},
  // ── Defense/Aerospace ──
  {symbol:"LMT",name:"Lockheed Martin",price:452.80,change:0.55,category:"Defense"},
  {symbol:"RTX",name:"RTX Corporation",price:108.40,change:0.72,category:"Defense"},
  {symbol:"BA",name:"Boeing Co",price:178.60,change:-1.85,category:"Defense"},
  {symbol:"NOC",name:"Northrop Grumman",price:468.20,change:0.42,category:"Defense"},
  // ── Telecom/Communication ──
  {symbol:"T",name:"AT&T Inc",price:18.40,change:0.32,category:"Telecom"},
  {symbol:"VZ",name:"Verizon Communications",price:38.60,change:0.18,category:"Telecom"},
  {symbol:"TMUS",name:"T-Mobile US",price:168.40,change:0.85,category:"Telecom"},
  // ── Utilities ──
  {symbol:"NEE",name:"NextEra Energy",price:72.40,change:0.42,category:"Utility"},
  {symbol:"DUK",name:"Duke Energy",price:98.60,change:0.15,category:"Utility"},
  {symbol:"SO",name:"Southern Company",price:78.20,change:0.28,category:"Utility"},
  // ── Transportation ──
  {symbol:"UPS",name:"United Parcel Service",price:142.80,change:-0.62,category:"Transport"},
  {symbol:"FDX",name:"FedEx Corp",price:268.40,change:-0.88,category:"Transport"},
  {symbol:"DAL",name:"Delta Air Lines",price:48.60,change:1.45,category:"Transport"},
  {symbol:"UAL",name:"United Airlines",price:52.80,change:1.62,category:"Transport"},
  // ── Materials/Mining ──
  {symbol:"FCX",name:"Freeport-McMoRan",price:42.60,change:1.88,category:"Materials"},
  {symbol:"NEM",name:"Newmont Corp",price:42.80,change:0.92,category:"Materials"},
  {symbol:"APD",name:"Air Products & Chem",price:288.40,change:0.32,category:"Materials"},
  // ── Agriculture ──
  {symbol:"ADM",name:"Archer-Daniels-Midland",price:58.40,change:-0.45,category:"Agriculture"},
  {symbol:"AGCO",name:"AGCO Corporation",price:118.40,change:-0.62,category:"Agriculture"},
  {symbol:"MOS",name:"Mosaic Company",price:28.60,change:1.12,category:"Agriculture"},
];
export const ASSET_KEYWORDS = {
  // Stocks
  AAPL:["apple","aapl","iphone","tim cook","app store","macbook","vision pro","ios"],
  TSLA:["tesla","tsla","elon musk","electric vehicle"," ev ","byd","cybertruck","gigafactory"],
  NVDA:["nvidia","nvda","gpu","ai chip","data center","jensen huang","h100","blackwell","cuda","geforce"],
  MSFT:["microsoft","msft","azure","copilot","satya nadella","windows","openai"],
  GOOGL:["google","alphabet","googl","gemini","waymo","android","youtube","search"],
  AMZN:["amazon","amzn","aws","bezos","prime","alexa","cloud computing"],
  META:["meta","facebook","instagram","whatsapp","zuckerberg","metaverse","threads","llama"],
  AMD:["amd","advanced micro","lisa su","ryzen","radeon","xilinx","mi300"],
  NFLX:["netflix","nflx","streaming","subscriber","content","original series"],
  PLTR:["palantir","pltr","gotham","foundry","data analytics","government contract"],
  // Canadian
  "SHOP.TO":["shopify","shop","tobi lutke","e-commerce","ecommerce"],
  "RY.TO":["royal bank","rbc","ry","royal bank of canada"],
  "TD.TO":["td bank","toronto-dominion","td"],
  "ENB.TO":["enbridge","pipeline","enb","energy infrastructure"],
  // ETFs
  SPY:["s&p 500","s&p500","spdr","broad market","wall street","stock market","market rally"],
  QQQ:["nasdaq","qqq","tech stocks","nasdaq 100","big tech"],
  DIA:["dow jones","djia","dia","blue chip","dow 30"],
  IWM:["russell 2000","iwm","small cap","small-cap"],
  ARKK:["ark invest","arkk","cathie wood","innovation","disruptive"],
  SOXL:["soxl","semiconductor etf","chip etf","3x semiconductor"],
  XLF:["financial sector","xlf","banks","banking sector"],
  XLE:["energy sector","xle","oil stocks","energy stocks"],
  // Crypto
  "BINANCE:BTCUSDT":["bitcoin","btc","crypto","cryptocurrency","satoshi","digital gold","halving"],
  "BINANCE:ETHUSDT":["ethereum","eth","ether","smart contract","defi","layer 2","vitalik","staking"],
  "BINANCE:SOLUSDT":["solana","sol","solana network","solana ecosystem"],
  "BINANCE:XRPUSDT":["xrp","ripple","ripple labs","cross-border"],
  "BINANCE:DOGEUSDT":["dogecoin","doge","meme coin"],
  "BINANCE:ADAUSDT":["cardano","ada","cardano network"],
  "BINANCE:AVAXUSDT":["avalanche","avax","avalanche network"],
  "BINANCE:LINKUSDT":["chainlink","link","oracle","chainlink network"],
  // Forex
  "OANDA:EUR_USD":["eur/usd","euro","european central bank","ecb","eurozone"],
  "OANDA:GBP_USD":["gbp/usd","british pound","sterling","bank of england","boe"],
  "OANDA:USD_JPY":["usd/jpy","japanese yen","bank of japan","boj","yen"],
  "OANDA:USD_CAD":["usd/cad","canadian dollar","loonie","bank of canada"],
  "OANDA:AUD_USD":["aud/usd","australian dollar","aussie","rba"],
  // Commodities
  "OANDA:XAU_USD":["gold","xau","gold price","precious metal","bullion","safe haven"],
  "OANDA:XAG_USD":["silver","xag","silver price","precious metal"],
  "OANDA:WTICO_USD":["crude oil","wti","oil price","opec","petroleum","barrel","oil production"],
  "OANDA:NATGAS_USD":["natural gas","natgas","lng","gas price","energy crisis"],
  "OANDA:COPPER":["copper","copper price","industrial metal","dr copper"],
  // Bonds
  TLT:["20-year treasury","long-term bond","tlt","treasury bond","long bond"],
  IEF:["10-year treasury","10-year yield","treasury note","ief"],
  HYG:["high yield bond","hyg","junk bond","credit spread"],
  LQD:["investment grade","lqd","corporate bond"],
  // Indexes
  "^GSPC":["s&p 500 index","^gspc","s&p index"],
  "^DJI":["dow jones index","^dji","dow industrial"],
  "^IXIC":["nasdaq composite","^ixic","nasdaq index"],
  "^VIX":["vix","volatility index","fear index","cboe vix","market fear"],
  "^RUT":["russell 2000 index","^rut","small cap index"],
  "^GSPTSE":["tsx","toronto stock exchange","canadian market","^gsptse"],
  // Real Estate
  VNQ:["real estate","reit","vnq","real estate etf","property"],
  O:["realty income","monthly dividend","reit","triple net lease"],
  AMT:["american tower","cell tower","tower reit","amt"],
  // Energy
  XOM:["exxon","exxonmobil","xom","oil major"],
  CVX:["chevron","cvx","oil major","petroleum"],
  OXY:["occidental","oxy","permian basin","carbon capture"],
  FSLR:["first solar","fslr","solar panel","solar energy","renewable"],
  // AI
  AI:["c3.ai","c3 ai","enterprise ai","ai stock"],
  SMCI:["super micro","supermicro","smci","ai server","ai infrastructure"],
  SNOW:["snowflake","snow","data cloud","data warehouse"],
  PATH:["uipath","path","rpa","robotic process automation"],
  BBAI:["bigbear","bbai","ai analytics","defense ai"],
  // Healthcare
  JNJ:["johnson","jnj","pharma","pharmaceutical","drug","medical device"],
  UNH:["unitedhealth","unh","health insurance","managed care","optum"],
  PFE:["pfizer","pfe","vaccine","drug","pharmaceutical","covid"],
  LLY:["eli lilly","lly","ozempic","mounjaro","weight loss drug","diabetes"],
  ABBV:["abbvie","abbv","humira","immunology","pharmaceutical"],
  MRK:["merck","mrk","keytruda","pharma","vaccine","pharmaceutical"],
  XLV:["healthcare etf","xlv","health care sector","medical"],
  // Biotech
  MRNA:["moderna","mrna","mrna vaccine","biotech","covid vaccine"],
  GILD:["gilead","gild","hiv","antiviral","biotech"],
  AMGN:["amgen","amgn","biotech","biosimilar"],
  REGN:["regeneron","regn","eylea","dupixent","biotech"],
  // Financial
  JPM:["jpmorgan","jpm","chase","jamie dimon","banking","investment bank"],
  BAC:["bank of america","bac","banking","consumer banking"],
  GS:["goldman sachs","gs","investment bank","wall street"],
  V:["visa","payment","credit card","fintech","digital payments"],
  MA:["mastercard","payment","credit card","digital payments"],
  // Industrial
  CAT:["caterpillar","cat","construction","heavy equipment","mining equipment"],
  HON:["honeywell","hon","aerospace","industrial automation"],
  GE:["ge aerospace","general electric","ge","jet engine","aviation"],
  // Consumer
  WMT:["walmart","wmt","retail","grocery","e-commerce"],
  COST:["costco","cost","wholesale","retail","membership"],
  NKE:["nike","nke","sneaker","athletic","sportswear"],
  SBUX:["starbucks","sbux","coffee","restaurant","cafe"],
  MCD:["mcdonald","mcd","fast food","restaurant","franchise"],
  // Defense
  LMT:["lockheed","lmt","defense","military","f-35","missile"],
  RTX:["rtx","raytheon","defense","missile","military"],
  BA:["boeing","ba","airplane","aircraft","defense","737","787"],
  NOC:["northrop","noc","defense","military","b-21","stealth"],
  // Telecom
  T:["at&t","att","telecom","5g","wireless","broadband"],
  VZ:["verizon","vz","telecom","5g","wireless","broadband"],
  TMUS:["t-mobile","tmus","wireless","5g","telecom","sprint"],
  // Utility
  NEE:["nextera","nee","utility","renewable","wind","solar","power"],
  DUK:["duke energy","duk","utility","power","electric"],
  SO:["southern company","utility","power","electric","gas"],
  // Transport
  UPS:["ups","united parcel","shipping","logistics","delivery"],
  FDX:["fedex","fdx","shipping","logistics","delivery","express"],
  DAL:["delta","dal","airline","aviation","travel","flights"],
  UAL:["united airlines","ual","airline","aviation","travel"],
  // Materials
  FCX:["freeport","fcx","copper","mining","gold","materials"],
  NEM:["newmont","nem","gold","mining","precious metals"],
  APD:["air products","apd","industrial gas","hydrogen","chemicals"],
  // Agriculture
  ADM:["archer daniels","adm","agriculture","grain","commodity","food"],
  MOS:["mosaic","mos","fertilizer","agriculture","potash","phosphate"],
  AGCO:["agco","agriculture","farm equipment","tractor","harvester"],
  DE:["deere","john deere","de","tractor","farm equipment","agriculture","construction"],
};
// All categories for filter UI
export const ALL_CATEGORIES=["All","Stock","ETF","Crypto","Forex","Commodity","Bond","Index","Real Estate","Energy","AI","Healthcare","Biotech","Financial","Industrial","Consumer","Defense","Telecom","Utility","Transport","Materials","Agriculture"];
export const SIGNAL_ALLOWED_CATS=["Stock","ETF","AI"];

export const SECTOR_BENCHMARKS={
  AI:"QQQ",
  Stock:"SPY",
  ETF:"SPY",
  Energy:"XLE",
  Financial:"XLF",
  Healthcare:"XLV",
  Biotech:"XLV",
  "Real Estate":"VNQ",
  Bond:"TLT",
  Consumer:"SPY",
  Industrial:"SPY",
  Defense:"SPY",
  Telecom:"SPY",
  Utility:"SPY",
  Transport:"SPY",
  Materials:"SPY",
  Agriculture:"SPY"
};

export const SYMBOL_BENCHMARKS={
  AAPL:"QQQ",MSFT:"QQQ",NVDA:"QQQ",AMD:"QQQ",GOOGL:"QQQ",AMZN:"QQQ",META:"QQQ",NFLX:"QQQ",TSLA:"QQQ",PLTR:"QQQ",
  AI:"QQQ",SMCI:"QQQ",SNOW:"QQQ",PATH:"QQQ",BBAI:"QQQ",SOXL:"QQQ",ARKK:"QQQ",
  XOM:"XLE",CVX:"XLE",OXY:"XLE",FSLR:"XLE",
  JPM:"XLF",BAC:"XLF",GS:"XLF",V:"XLF",MA:"XLF",RY:"XLF",TD:"XLF",
  JNJ:"XLV",UNH:"XLV",PFE:"XLV",LLY:"XLV",ABBV:"XLV",MRK:"XLV",MRNA:"XLV",GILD:"XLV",AMGN:"XLV",REGN:"XLV",
  O:"VNQ",AMT:"VNQ",
  TLT:"TLT",IEF:"IEF",HYG:"TLT",LQD:"TLT",
  QQQ:"QQQ",SPY:"SPY",DIA:"SPY",IWM:"SPY",XLF:"XLF",XLE:"XLE",XLV:"XLV",VNQ:"VNQ"
};
export const MOCK_PUB_DATE = "2026-05-07T12:00:00.000Z";
export const MOCK_NEWS = [
  {title:"Federal Reserve signals potential rate cuts amid cooling inflation data",link:"https://finance.yahoo.com",snippet:"Fed officials indicated they may begin reducing interest rates as inflation shows signs of moderating toward the 2% target, boosting investor confidence across equity markets.",pubDate:MOCK_PUB_DATE,source:"Yahoo Finance"},
  {title:"Apple reports record quarterly earnings, beats Wall Street expectations",link:"https://finance.yahoo.com",snippet:"Apple Inc. posted strong Q2 results driven by iPhone 16 sales and services revenue. EPS came in at $2.18, beating the $2.05 estimate with record quarterly profit.",pubDate:MOCK_PUB_DATE,source:"Yahoo Finance"},
  {title:"Tesla faces headwinds as EV competition intensifies globally",link:"https://finance.yahoo.com",snippet:"Tesla's market share comes under pressure as Chinese automakers like BYD and European manufacturers ramp up EV production with aggressive pricing strategies.",pubDate:MOCK_PUB_DATE,source:"Reuters"},
  {title:"GDP growth beats expectations, unemployment remains near historic lows",link:"https://finance.yahoo.com",snippet:"U.S. economic data surprised to the upside with GDP expanding at 3.1% annually while the labor market continues to show remarkable resilience.",pubDate:MOCK_PUB_DATE,source:"Bloomberg"},
  {title:"Trump administration announces new tariffs on semiconductor imports",link:"https://finance.yahoo.com",snippet:"The White House unveiled sweeping trade measures targeting chip imports from Asia, raising concerns about tech sector supply chains and escalating global trade tensions.",pubDate:MOCK_PUB_DATE,source:"Reuters"},
  {title:"Nvidia reports record data center revenue driven by AI chip demand",link:"https://finance.yahoo.com",snippet:"Nvidia posted another quarter of record sales as hyperscale cloud providers continue scaling AI infrastructure. H100 and Blackwell GPU demand remains robust.",pubDate:MOCK_PUB_DATE,source:"CNBC"},
];

export const SECTOR_DATA=[{name:"Technology",change:1.82,icon:"💻"},{name:"AI",change:3.45,icon:"🤖"},{name:"Crypto",change:2.15,icon:"🪙"},{name:"Healthcare",change:0.62,icon:"🏥"},{name:"Biotech",change:1.45,icon:"🧬"},{name:"Financials",change:0.82,icon:"🏦"},{name:"Consumer",change:1.24,icon:"🛒"},{name:"Industrials",change:-0.48,icon:"🏭"},{name:"Defense",change:0.55,icon:"🛡️"},{name:"Energy",change:-0.18,icon:"⚡"},{name:"Real Estate",change:0.42,icon:"🏠"},{name:"Telecom",change:0.32,icon:"📡"},{name:"Utilities",change:0.15,icon:"💡"},{name:"Transport",change:0.88,icon:"✈️"},{name:"Materials",change:0.92,icon:"⛏️"},{name:"Agriculture",change:-0.45,icon:"🌾"},{name:"Forex",change:0.05,icon:"💱"},{name:"Commodities",change:0.67,icon:"🥇"},{name:"Fixed Income",change:-0.28,icon:"🏛️"}];
export const TOPIC_TAGS=[{id:"fed",label:"FED",kw:["federal reserve","fed","fomc","powell","rate cut","rate hike"],color:"#EF4444"},{id:"trump",label:"TRUMP",kw:["trump","white house","tariff","administration"],color:"#F59E0B"},{id:"rates",label:"RATES",kw:["interest rate","yield","treasury","bond yield"],color:"#F97316"},{id:"macro",label:"MACRO",kw:["gdp","inflation","cpi","unemployment","jobs"],color:"#60A5FA"},{id:"tech",label:"TECH",kw:["ai","semiconductor","chip","nvidia","apple","cloud"],color:"#A78BFA"},{id:"trade",label:"TRADE",kw:["tariff","trade war","import","export","sanctions"],color:"#34D399"},{id:"crypto",label:"CRYPTO",kw:["bitcoin","ethereum","crypto","blockchain","defi","nft","token","web3","altcoin"],color:"#F59E0B"},{id:"energy",label:"ENERGY",kw:["oil","gas","opec","renewable","solar","energy","petroleum"],color:"#FB923C"},{id:"realestate",label:"REAL ESTATE",kw:["housing","real estate","mortgage","reit","property","home sales"],color:"#8B5CF6"},{id:"forex",label:"FOREX",kw:["dollar","euro","yen","currency","forex","exchange rate","central bank"],color:"#14B8A6"},{id:"ai",label:"AI",kw:["artificial intelligence","machine learning","llm","chatgpt","generative ai","ai model","neural"],color:"#EC4899"}];
