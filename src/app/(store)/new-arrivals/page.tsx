import MarketingHubPage, { buildMarketingHubMetadata } from "../_marketing/MarketingHubPage";
export const generateMetadata = () => buildMarketingHubMetadata("new_arrival");
export default function Page() { return <MarketingHubPage type="new_arrival" />; }
