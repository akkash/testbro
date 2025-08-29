import React from "react";
import HomepagePricing from "@/polymet/components/homepage-pricing";
import HomepageFooter from "@/polymet/components/homepage-footer";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      <HomepagePricing />
      <HomepageFooter />
    </div>
  );
}
