import React from "react";
import HomepageHero from "@/polymet/components/homepage-hero";
import HomepageBenefits from "@/polymet/components/homepage-benefits";
import HomepageSocialProof from "@/polymet/components/homepage-social-proof";
import HomepageFeatures from "@/polymet/components/homepage-features";

import HomepageFooter from "@/polymet/components/homepage-footer";

export default function HomepageMain() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Above the Fold */}
      <HomepageHero />

      {/* Key Benefits & Value Proposition */}
      <HomepageBenefits />

      {/* Social Proof & Trust Builders */}
      <HomepageSocialProof />

      {/* Product Features Overview */}
      <HomepageFeatures />

      {/* Footer */}
      <HomepageFooter />
    </div>
  );
}
