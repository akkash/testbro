import React from "react";
import PublicFeatureShowcase from "@/polymet/components/public-feature-showcase";
import HomepageFooter from "@/polymet/components/homepage-footer";

export default function PublicFeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicFeatureShowcase />
      <HomepageFooter />
    </div>
  );
}
