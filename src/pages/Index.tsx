// Update this page (the content is just a fallback if you fail to update the page)

import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingHero from "@/components/marketing/MarketingHero";
import HowItWorks from "@/components/marketing/HowItWorks";
import Testimonials from "@/components/marketing/Testimonials";
import Pricing from "@/components/marketing/Pricing";
import FAQ from "@/components/marketing/FAQ";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <MarketingHero />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Index;

