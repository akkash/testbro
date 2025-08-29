import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowRight,
  Star,
  Zap,
  Users,
  Building,
  Sparkles,
} from "lucide-react";

export default function HomepagePricing() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for individual developers and small projects",
      icon: Zap,
      color: "blue",
      popular: false,
      features: [
        "Up to 100 test executions/month",
        "Basic AI test generation",
        "5 test targets",
        "Email support",
        "Basic analytics",
        "Community access",
      ],

      cta: "Start Free",
      ctaVariant: "outline" as const,
    },
    {
      name: "Professional",
      price: "$49",
      period: "per month",
      description: "Ideal for growing teams and production applications",
      icon: Users,
      color: "purple",
      popular: true,
      features: [
        "Unlimited test executions",
        "Advanced AI test generation",
        "Unlimited test targets",
        "Live browser automation",
        "UX quality analysis",
        "Priority support",
        "Advanced analytics",
        "Team collaboration",
        "CI/CD integrations",
      ],

      cta: "Start Free Trial",
      ctaVariant: "default" as const,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations with advanced requirements",
      icon: Building,
      color: "indigo",
      popular: false,
      features: [
        "Everything in Professional",
        "Custom AI model training",
        "Dedicated infrastructure",
        "SSO & advanced security",
        "Custom integrations",
        "24/7 phone support",
        "SLA guarantees",
        "On-premise deployment",
        "Custom reporting",
      ],

      cta: "Contact Sales",
      ctaVariant: "outline" as const,
    },
  ];

  const getColorClasses = (color: string, popular: boolean = false) => {
    if (popular) {
      return {
        border: "border-purple-200 ring-2 ring-purple-100",
        icon: "bg-purple-100 text-purple-600",
        button:
          "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white",
      };
    }

    const colorMap = {
      blue: {
        border: "border-gray-200",
        icon: "bg-blue-100 text-blue-600",
        button: "border-gray-300 hover:bg-gray-50",
      },
      indigo: {
        border: "border-gray-200",
        icon: "bg-indigo-100 text-indigo-600",
        button: "border-gray-300 hover:bg-gray-50",
      },
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 border-green-200 mb-4"
          >
            <Star className="w-3 h-3 mr-1" />
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start free, scale as you grow. No hidden fees, no surprises. Cancel
            anytime with our 30-day money-back guarantee.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-1" />
              14-day free trial
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-1" />
              No credit card required
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-1" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-1" />
              30-day money back
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const colors = getColorClasses(plan.color, plan.popular);

            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-8 ${colors.border} hover:shadow-lg transition-all duration-300`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div
                    className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 ml-1">/{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-start space-x-3"
                    >
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />

                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full ${plan.popular ? colors.button : `${colors.button} text-gray-700`}`}
                  variant={plan.ctaVariant}
                  size="lg"
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Can I change plans anytime?
                </h4>
                <p className="text-gray-600 text-sm">
                  Yes! Upgrade or downgrade your plan at any time. Changes take
                  effect immediately, and we'll prorate any billing differences.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  What's included in the free trial?
                </h4>
                <p className="text-gray-600 text-sm">
                  Full access to all Professional features for 14 days. No
                  credit card required, and you can continue with our free plan
                  afterward.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Do you offer volume discounts?
                </h4>
                <p className="text-gray-600 text-sm">
                  Yes! Enterprise customers get custom pricing based on usage
                  volume and specific requirements. Contact our sales team for
                  details.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Is my data secure?
                </h4>
                <p className="text-gray-600 text-sm">
                  Absolutely. We're SOC 2 compliant and use enterprise-grade
                  encryption. Your test data never leaves our secure
                  infrastructure.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Can I integrate with my existing tools?
                </h4>
                <p className="text-gray-600 text-sm">
                  Yes! We integrate with popular CI/CD tools, project management
                  platforms, and communication tools like Slack and Teams.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  What kind of support do you provide?
                </h4>
                <p className="text-gray-600 text-sm">
                  Free users get community support, Professional users get
                  priority email support, and Enterprise customers get 24/7
                  phone support with dedicated success managers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">
            Ready to transform your testing workflow? Start your free trial
            today.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
