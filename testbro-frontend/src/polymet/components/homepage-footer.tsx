import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Heart,
  Shield,
  Award,
  Users,
} from "lucide-react";

export default function HomepageFooter() {
  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "API Documentation", href: "/docs" },
        { name: "Integrations", href: "/integrations" },
        { name: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { name: "E-commerce Testing", href: "/solutions/ecommerce" },
        { name: "SaaS Applications", href: "/solutions/saas" },
        { name: "Mobile Apps", href: "/solutions/mobile" },
        { name: "Enterprise", href: "/solutions/enterprise" },
        { name: "Agencies", href: "/solutions/agencies" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Blog", href: "/blog" },
        { name: "Case Studies", href: "/case-studies" },
        { name: "Help Center", href: "/help" },
        { name: "Community", href: "/community" },
        { name: "Webinars", href: "/webinars" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about" },
        { name: "Careers", href: "/careers" },
        { name: "Contact", href: "/contact" },
        { name: "Press Kit", href: "/press" },
        { name: "Partners", href: "/partners" },
      ],
    },
  ];

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "https://twitter.com/testbro_ai" },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: "https://linkedin.com/company/testbro-ai",
    },
    { name: "GitHub", icon: Github, href: "https://github.com/testbro-ai" },
    { name: "YouTube", icon: Youtube, href: "https://youtube.com/@testbro-ai" },
  ];

  const trustBadges = [
    { icon: Shield, text: "SOC 2 Compliant" },
    { icon: Award, text: "ISO 27001 Certified" },
    { icon: Users, text: "GDPR Compliant" },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Stay Updated with TestBro.ai
              </h3>
              <p className="text-gray-400 text-lg">
                Get the latest testing insights, product updates, and exclusive
                tips delivered to your inbox every week.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  Subscribe
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Weekly newsletter
                </div>
                <div>•</div>
                <div>No spam, unsubscribe anytime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold">TestBro.ai</span>
            </div>

            <p className="text-gray-400 mb-6 leading-relaxed">
              AI-powered software testing that actually works. Join thousands of
              developers who've transformed their testing workflow with
              intelligent automation.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4 mb-6">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Trust Badges */}
            <div className="space-y-2">
              {trustBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center space-x-2 text-sm text-gray-400"
                  >
                    <Icon className="w-4 h-4" />

                    <span>{badge.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <span>© 2024 TestBro.ai. Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-current" />

                <span>for developers.</span>
              </div>

              <div className="flex items-center space-x-6">
                <Link
                  to="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/cookies"
                  className="hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge
                variant="secondary"
                className="bg-green-900 text-green-300 border-green-800"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                All systems operational
              </Badge>

              <Link
                to="/status"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Status Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
