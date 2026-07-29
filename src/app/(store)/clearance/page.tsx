import MarketingHubPage, { buildMarketingHubMetadata } from "../_marketing/MarketingHubPage";
export const generateMetadata = () => buildMarketingHubMetadata("clearance");
export default function Page() { return <MarketingHubPage type="clearance" />; }
