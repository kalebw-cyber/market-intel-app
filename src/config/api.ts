if(!process.env.NEXT_PUBLIC_FINNHUB_KEY){
  console.warn("[MarketIntel] NEXT_PUBLIC_FINNHUB_KEY is not set — Finnhub API calls will fail.");
}
export const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "";
