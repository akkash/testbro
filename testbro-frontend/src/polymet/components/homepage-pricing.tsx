import React, { useState, useEffect } from "react";
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
  Code,
  ShieldCheck,
  Cpu,
  Rocket,
  Phone,
  BarChart3,
  Settings,
  Cloud,
  Lock,
  Target,
  User,
} from "lucide-react";

export default function HomepagePricing() {
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Handle sticky CTA visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const pricingSection = document.querySelector('.pricing-cards');
      const pricingSectionTop = pricingSection?.offsetTop || 600;

      setShowStickyCTA(scrollPosition > pricingSectionTop - 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: "Developer Sandbox",
      price: "Free",
      period: "forever",
      description: "Perfect for learning and small experiments",
      icon: Code,
      color: "blue",
      popular: false,
      badge: "No credit card required",
      features: [
        { text: "Up to 100 test executions/month", icon: Zap },
        { text: "Basic AI test generation", icon: Cpu },
        { text: "5 test targets maximum", icon: Target },
        { text: "Community support", icon: Users },
        { text: "Basic analytics dashboard", icon: BarChart3 },
        { text: "1 user account", icon: User },
      ],
      limitations: [
        "Limited test executions",
        "No team collaboration",
        "Basic AI capabilities",
        "Community support only"
      ],
      cta: "Start Free",
      ctaVariant: "outline" as const,
    },
    {
      name: "Professional",
      price: "$49",
      period: "per month",
      description: "Perfect for growing teams and production applications",
      icon: Users,
      color: "purple",
      popular: true,
      badge: "Most Popular",
      features: [
        { text: "Unlimited test executions", icon: Zap },
        { text: "Advanced AI test generation with GPT-4", icon: Cpu },
        { text: "Unlimited test targets", icon: Target },
        { text: "Live browser automation", icon: Rocket },
        { text: "UX quality analysis & scoring", icon: Sparkles },
        { text: "Priority email support (24h response)", icon: Phone },
        { text: "Advanced analytics & reporting", icon: BarChart3 },
        { text: "Team collaboration (up to 10 members)", icon: Users },
        { text: "1-click CI/CD integrations", icon: Settings },
        { text: "API access & webhooks", icon: Cloud },
        { text: "Enterprise security (SOC 2)", icon: ShieldCheck },
      ],
      highlights: [
        "14-day free trial included",
        "30-day money-back guarantee",
        "Cancel anytime, no contracts"
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
      badge: "Custom Solution",
      features: [
        { text: "Everything in Professional", icon: Check },
        { text: "Dedicated success manager", icon: Users },
        { text: "Custom AI model training", icon: Cpu },
        { text: "Dedicated infrastructure & SLAs", icon: Rocket },
        { text: "SSO, SAML & advanced security", icon: Lock },
        { text: "Unlimited team members", icon: Users },
        { text: "24/7 phone & priority support", icon: Phone },
        { text: "On-premise deployment option", icon: Cloud },
        { text: "Custom integrations & APIs", icon: Settings },
        { text: "Advanced compliance (ISO 27001, GDPR)", icon: ShieldCheck },
        { text: "Custom reporting & dashboards", icon: BarChart3 },
        { text: "Volume discounts & custom terms", icon: Sparkles },
      ],
      enterpriseBenefits: [
        "Dedicated infrastructure",
        "Custom SLA guarantees",
        "Priority feature requests",
        "Onboarding & training included"
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
    <div className="py-24 bg-gray-50 relative">
      {/* Sticky CTA Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showStickyCTA ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">14-day free trial</span>
                </div>
                <div className="hidden sm:flex items-center space-x-4 text-sm opacity-90">
                  <span>✓ No credit card required</span>
                  <span>✓ Cancel anytime</span>
                  <span>✓ Full Professional features</span>
                </div>
              </div>
              <Button
                className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-6"
                size="sm"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 pricing-cards">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const colors = getColorClasses(plan.color, plan.popular);

            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-8 ${colors.border} hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'transform scale-105 shadow-2xl ring-4 ring-purple-100' : ''
                }`}
              >
                {/* Badge */}
                {(plan.popular || plan.badge) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={`${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 shadow-lg'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {plan.popular && <Sparkles className="w-3 h-3 mr-1" />}
                      {plan.badge || 'Most Popular'}
                    </Badge>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.icon} flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 text-lg ml-1">/{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <h4 className="font-semibold text-gray-900 text-sm mb-4">What's included:</h4>
                  {plan.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-start space-x-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {typeof feature === 'object' && feature.icon ? (
                          <feature.icon className="w-4 h-4 text-green-500" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        {typeof feature === 'object' ? feature.text : feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Limitations for free tier */}
                {plan.limitations && plan.limitations.length > 0 && (
                  <div className="space-y-2 mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-900 text-sm mb-2">Limitations:</h4>
                    {plan.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        <span className="text-red-700 text-xs">{limitation}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Highlights for Professional */}
                {plan.highlights && plan.highlights.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {plan.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-purple-700 text-sm font-medium">{highlight}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enterprise Benefits */}
                {plan.enterpriseBenefits && plan.enterpriseBenefits.length > 0 && (
                  <div className="space-y-2 mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="font-medium text-indigo-900 text-sm mb-3 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enterprise Benefits
                    </h4>
                    {plan.enterpriseBenefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-indigo-700 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Button */}
                <Button
                  className={`w-full font-semibold ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200'
                      : `${colors.button} text-gray-700 hover:bg-gray-50`
                  }`}
                  variant={plan.ctaVariant}
                  size="lg"
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {/* Trust indicators for Professional */}
                {plan.popular && (
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        SOC 2 Compliant
                      </span>
                      <span className="flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        Enterprise Security
                      </span>
                    </div>
                  </div>
                )}
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
