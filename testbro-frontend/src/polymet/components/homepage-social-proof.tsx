import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Quote,
  Shield,
  Award,
  Users,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export default function HomepageSocialProof() {
  const customerLogos = [
    { name: "TechCorp", logo: "TC" },
    { name: "InnovateLabs", logo: "IL" },
    { name: "DataFlow", logo: "DF" },
    { name: "CloudSync", logo: "CS" },
    { name: "DevTools", logo: "DT" },
    { name: "WebScale", logo: "WS" },
    { name: "AppForge", logo: "AF" },
    { name: "CodeBase", logo: "CB" },
  ];

  const testimonials = [
    {
      quote:
        "TestBro.ai reduced our testing time from 3 weeks to 2 days. The AI catches edge cases our manual testers missed. It's like having a senior QA engineer that never sleeps.",
      author: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechFlow Solutions",
      avatar: "https://github.com/yusufhilmi.png",
      metrics: "90% time saved",
    },
    {
      quote:
        "We went from 60% test coverage to 95% overnight. The ROI was immediate - we caught 3 critical bugs before our last release that would have cost us thousands in downtime.",
      author: "Marcus Rodriguez",
      role: "CTO",
      company: "E-commerce Plus",
      avatar: "https://github.com/kdrnp.png",
      metrics: "35% coverage increase",
    },
    {
      quote:
        "The UX insights are game-changing. TestBro.ai identified conversion bottlenecks we didn't even know existed. Our checkout completion rate improved by 23%.",
      author: "Emily Watson",
      role: "Product Manager",
      company: "RetailTech",
      avatar: "https://github.com/yahyabedirhan.png",
      metrics: "23% conversion boost",
    },
  ];

  const trustBadges = [
    {
      icon: Shield,
      title: "SOC 2 Compliant",
      description: "Enterprise-grade security",
    },
    {
      icon: Award,
      title: "ISO 27001 Certified",
      description: "International security standards",
    },
    {
      icon: Users,
      title: "GDPR Compliant",
      description: "Privacy protection guaranteed",
    },
    {
      icon: CheckCircle,
      title: "99.9% Uptime SLA",
      description: "Reliable testing infrastructure",
    },
  ];

  const stats = [
    { number: "500+", label: "Companies Trust Us", icon: Users },
    { number: "10M+", label: "Tests Executed", icon: TrendingUp },
    { number: "99.9%", label: "Bug Detection Rate", icon: Shield },
    { number: "4.9/5", label: "Customer Rating", icon: Star },
  ];

  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Join thousands of teams who've transformed their testing workflow
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-blue-600 mr-2" />

                    <div className="text-3xl font-bold text-gray-900">
                      {stat.number}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Logos */}
        <div className="mb-16">
          <p className="text-center text-gray-500 mb-8 font-medium">
            Trusted by companies of all sizes
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
            {customerLogos.map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {customer.logo}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h3>
            <div className="flex items-center justify-center space-x-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-yellow-400 text-yellow-400"
                />
              ))}
              <span className="ml-2 text-gray-600">
                4.9/5 from 200+ reviews
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow relative"
              >
                <Quote className="w-8 h-8 text-blue-200 mb-4" />

                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>

                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full"
                  />

                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.company}
                    </div>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="absolute top-6 right-6 bg-green-100 text-green-800 border-green-200"
                >
                  {testimonial.metrics}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Enterprise-Grade Security & Compliance
            </h3>
            <p className="text-gray-600">
              Your data and testing infrastructure are protected by
              industry-leading security standards
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {badge.title}
                  </h4>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
