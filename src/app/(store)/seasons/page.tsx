import MarketingHubPage, { buildMarketingHubMetadata } from "../_marketing/MarketingHubPage";
export const generateMetadata = () => buildMarketingHubMetadata("seasonal");
export default function Page() { return <MarketingHubPage type="seasonal" />; }
