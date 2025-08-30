import { useState, useEffect } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: string
  action?: () => void
  completed?: boolean
}

export interface OnboardingTemplate {
  id: string
  name: string
  description: string
  icon: string
  estimatedTime: string
  businessValue: string
  sampleData: any
  steps: OnboardingStep[]
}

export interface OnboardingConfig {
  showGuidedTour: boolean
  completedSteps: string[]
  selectedTemplate?: string
  userRole: 'agency' | 'smb' | 'enterprise' | 'individual'
}

// Sample data templates for different user scenarios
export const ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  {
    id: 'agency-starter',
    name: 'Agency Starter Kit',
    description: 'Perfect for digital agencies managing multiple client websites',
    icon: '🏢',
    estimatedTime: '10 minutes',
    businessValue: 'Demonstrate value to clients quickly with professional reports',
    sampleData: {
      projects: [
        { name: 'Client A - E-commerce Site', url: 'https://demo-ecommerce.example.com' },
        { name: 'Client B - SaaS Landing Page', url: 'https://demo-saas.example.com' }
      ],
      testCases: ['Login Flow', 'Checkout Process', 'Contact Form'],
      reports: ['Weekly Client Report', 'Performance Summary']
    },
    steps: [
      { id: 'create-project', title: 'Create Client Project', description: 'Organize tests by client', icon: '📁' },
      { id: 'add-targets', title: 'Add Test Targets', description: 'Define client websites to test', icon: '🎯' },
      { id: 'record-test', title: 'Record Test Flow', description: 'Capture critical user journeys', icon: '🎬' },
      { id: 'run-suite', title: 'Run Test Suite', description: 'Execute automated tests', icon: '▶️' },
      { id: 'generate-report', title: 'Generate Client Report', description: 'Create professional PDF report', icon: '📊' }
    ]
  },
  {
    id: 'smb-essential',
    name: 'SMB Essential Setup',
    description: 'Quick setup for small business owners who need reliable testing',
    icon: '🏪',
    estimatedTime: '5 minutes',
    businessValue: 'Prevent costly website issues and improve user experience',
    sampleData: {
      projects: [
        { name: 'My Business Website', url: 'https://your-business.com' }
      ],
      testCases: ['Contact Form', 'Online Ordering', 'User Registration'],
      reports: ['Weekly Health Check', 'Issue Summary']
    },
    steps: [
      { id: 'setup-website', title: 'Add Your Website', description: 'Start monitoring your main website', icon: '🌐' },
      { id: 'critical-flows', title: 'Test Critical Flows', description: 'Ensure key features work correctly', icon: '✅' },
      { id: 'schedule-monitoring', title: 'Schedule Monitoring', description: 'Automatic daily checks', icon: '⏰' },
      { id: 'setup-alerts', title: 'Setup Alerts', description: 'Get notified when issues arise', icon: '🔔' }
    ]
  },
  {
    id: 'ecommerce-focused',
    name: 'E-commerce Focus',
    description: 'Comprehensive testing for online stores and marketplaces',
    icon: '🛒',
    estimatedTime: '15 minutes',
    businessValue: 'Prevent revenue loss from broken checkout flows',
    sampleData: {
      projects: [
        { name: 'Main Store', url: 'https://shop.example.com' },
        { name: 'Mobile App Store', url: 'https://m.shop.example.com' }
      ],
      testCases: ['Product Search', 'Add to Cart', 'Checkout Flow', 'Payment Processing', 'Order Confirmation'],
      reports: ['Conversion Funnel Analysis', 'Revenue Protection Report']
    },
    steps: [
      { id: 'setup-store', title: 'Add Store URL', description: 'Monitor your e-commerce site', icon: '🏬' },
      { id: 'checkout-testing', title: 'Test Checkout Flow', description: 'Ensure payments work correctly', icon: '💳' },
      { id: 'inventory-checks', title: 'Product Page Tests', description: 'Verify product displays', icon: '📦' },
      { id: 'mobile-testing', title: 'Mobile Experience', description: 'Test mobile shopping experience', icon: '📱' },
      { id: 'performance-monitoring', title: 'Performance Tracking', description: 'Monitor page load speeds', icon: '⚡' }
    ]
  }
]

export class OnboardingService {
  private static STORAGE_KEY = 'testbro_onboarding'

  static getConfig(): OnboardingConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load onboarding config:', error)
    }
    
    return {
      showGuidedTour: true,
      completedSteps: [],
      userRole: 'individual'
    }
  }

  static updateConfig(updates: Partial<OnboardingConfig>): void {
    try {
      const current = this.getConfig()
      const updated = { ...current, ...updates }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.warn('Failed to save onboarding config:', error)
    }
  }

  static markStepCompleted(stepId: string): void {
    const config = this.getConfig()
    if (!config.completedSteps.includes(stepId)) {
      config.completedSteps.push(stepId)
      this.updateConfig(config)
    }
  }

  static isStepCompleted(stepId: string): boolean {
    const config = this.getConfig()
    return config.completedSteps.includes(stepId)
  }

  static getTemplateForRole(role: string): OnboardingTemplate | null {
    switch (role) {
      case 'agency':
        return ONBOARDING_TEMPLATES.find(t => t.id === 'agency-starter') || null
      case 'smb':
        return ONBOARDING_TEMPLATES.find(t => t.id === 'smb-essential') || null
      case 'ecommerce':
        return ONBOARDING_TEMPLATES.find(t => t.id === 'ecommerce-focused') || null
      default:
        return ONBOARDING_TEMPLATES[1] // Default to SMB essential
    }
  }

  static generateSampleData(templateId: string): any {
    const template = ONBOARDING_TEMPLATES.find(t => t.id === templateId)
    return template?.sampleData || null
  }

  static shouldShowOnboarding(): boolean {
    const config = this.getConfig()
    return config.showGuidedTour && config.completedSteps.length < 3
  }

  static completeOnboarding(): void {
    this.updateConfig({ showGuidedTour: false })
  }
}

export function useOnboarding() {
  const [config, setConfig] = useState<OnboardingConfig>(() => OnboardingService.getConfig())

  useEffect(() => {
    const handleStorageChange = () => {
      setConfig(OnboardingService.getConfig())
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const updateConfig = (updates: Partial<OnboardingConfig>) => {
    OnboardingService.updateConfig(updates)
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const markStepCompleted = (stepId: string) => {
    OnboardingService.markStepCompleted(stepId)
    setConfig(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId]
    }))
  }

  return {
    config,
    updateConfig,
    markStepCompleted,
    shouldShowOnboarding: OnboardingService.shouldShowOnboarding(),
    templates: ONBOARDING_TEMPLATES
  }
}