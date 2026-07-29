import MarketingHubPage, { buildMarketingHubMetadata } from "../_marketing/MarketingHubPage";
export const generateMetadata = () => buildMarketingHubMetadata("best_seller");
export default function Page() { return <MarketingHubPage type="best_seller" />; }
