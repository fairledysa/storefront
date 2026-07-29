import MarketingHubPage, { buildMarketingHubMetadata } from "../_marketing/MarketingHubPage";
export const generateMetadata = () => buildMarketingHubMetadata("flash_sale");
export default function Page() { return <MarketingHubPage type="flash_sale" />; }
