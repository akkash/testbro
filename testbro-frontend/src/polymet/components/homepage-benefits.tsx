import React from "react";
import {
  Clock,
  DollarSign,
  Users,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function HomepageBenefits() {
  const benefits = [
    {
      icon: Clock,
      title: "Save 90% of Testing Time",
      description:
        "What used to take weeks now takes hours. Our AI generates comprehensive test suites instantly, freeing your team to focus on building great products.",
      stats: "Average time saved: 40 hours/week",
      color: "blue",
    },
    {
      icon: DollarSign,
      title: "Reduce QA Costs by 70%",
      description:
        "Cut expensive manual testing overhead. One TestBro.ai license replaces multiple QA engineers while delivering superior coverage and accuracy.",
      stats: "Average savings: $180K/year",
      color: "green",
    },
    {
      icon: Shield,
      title: "Catch Bugs Before Users Do",
      description:
        "Our AI thinks like real users, finding edge cases and UX issues that traditional testing misses. Protect your reputation and revenue.",
      stats: "99.9% bug detection rate",
      color: "red",
    },
    {
      icon: Users,
      title: "Scale Testing Effortlessly",
      description:
        "From startup to enterprise, TestBro.ai grows with you. Test across multiple environments, browsers, and devices simultaneously.",
      stats: "Support for 100+ environments",
      color: "purple",
    },
    {
      icon: Zap,
      title: "Deploy with Confidence",
      description:
        "Get instant feedback on every code change. Automated testing in your CI/CD pipeline means faster, safer deployments every time.",
      stats: "3x faster deployment cycles",
      color: "yellow",
    },
    {
      icon: TrendingUp,
      title: "Improve User Experience",
      description:
        "AI-powered UX analysis identifies friction points and optimization opportunities that boost conversion rates and user satisfaction.",
      stats: "Average 25% UX score improvement",
      color: "indigo",
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-600 border-blue-200",
      green: "bg-green-100 text-green-600 border-green-200",
      red: "bg-red-100 text-red-600 border-red-200",
      purple: "bg-purple-100 text-purple-600 border-purple-200",
      yellow: "bg-yellow-100 text-yellow-600 border-yellow-200",
      indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why Teams Choose TestBro.ai
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop fighting with flaky tests and missed bugs. Join thousands of
            developers who've transformed their testing workflow with AI-powered
            automation.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center mb-6 ${getColorClasses(benefit.color)}`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {benefit.title}
                </h3>

                <p className="text-gray-600 mb-4 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Stats */}
                <div className="flex items-center text-sm font-medium text-gray-500">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />

                  {benefit.stats}
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Testing?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join the thousands of teams already using TestBro.ai to ship better
            software faster. Start your free trial today and see the difference
            AI-powered testing makes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                Setup in 5 minutes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
