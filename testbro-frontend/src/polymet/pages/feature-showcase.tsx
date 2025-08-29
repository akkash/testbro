import React from "react";
import FeatureShowcase from "@/polymet/components/feature-showcase";
import BrowserAutomationDocs from "@/polymet/components/browser-automation-docs";

export default function FeatureShowcasePage() {
  return (
    <div className="p-6">
      <FeatureShowcase />

      {/* Browser Automation Documentation */}
      <div className="mt-12">
        <BrowserAutomationDocs />
      </div>
    </div>
  );
}
