"use client";

import dynamic from "next/dynamic";

const MarketAnalyzer = dynamic(() => import("../../MarketAnalyzer_1_6"), {
  ssr: false
});

export default function Page() {
  return <MarketAnalyzer />;
}
