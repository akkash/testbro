import React, { useState, useEffect } from 'react';
import { 
  Template,
  Smartphone,
  ShoppingCart,
  UserCheck,
  FileText,
  Mail,
  Settings,
  Search,
  Star,
  Clock,
  Users,
  Zap,
  Download,
  Play,
  Eye,
  Edit3,
  Copy,
  ArrowRight
} from 'lucide-react';
import { TestCase, NoCodeTestStep } from '../../types';

interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'ecommerce' | 'forms' | 'navigation' | 'mobile' | 'api' | 'performance';
  icon: React.ComponentType<{ className?: string }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  popularity: number;
  tags: string[];
  preview: {
    steps: string[];
    expectedOutcome: string;
  };
  template: Partial<TestCase>;
  isPopular?: boolean;
  isNew?: boolean;
}

const testTemplates: TestTemplate[] = [
  {
    id: 'login-flow',
    name: 'User Login Flow',
    description: 'Complete user authentication test including login, dashboard access, and logout',
    category: 'authentication',
    icon: UserCheck,
    difficulty: 'beginner',
    estimatedTime: '5 min',
    popularity: 95,
    tags: ['authentication', 'login', 'security', 'user-flow'],
    isPopular: true,
    preview: {
      steps: [
        'Navigate to login page',
        'Enter valid credentials',
        'Click login button',
        'Verify dashboard loads',
        'Test logout functionality'
      ],
      expectedOutcome: 'User successfully logs in and accesses protected content'
    },
    template: {
      name: 'User Login Flow Test',
      description: 'Automated test for user authentication process',
      priority: 'high',
      tags: ['authentication', 'smoke-test'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Navigate to the login page',
          action_type: 'navigate',
          element_description: 'Login page URL',
          value: '/login',
          confidence_score: 1.0
        },
        {
          id: '2', 
          order: 2,
          natural_language: 'Enter username in the username field',
          action_type: 'type',
          element_description: 'Username input field',
          element_selector: '[data-testid="username"], #username, [name="username"]',
          value: 'testuser@example.com',
          confidence_score: 0.9
        },
        {
          id: '3',
          order: 3, 
          natural_language: 'Enter password in the password field',
          action_type: 'type',
          element_description: 'Password input field',
          element_selector: '[data-testid="password"], #password, [name="password"]',
          value: 'password123',
          confidence_score: 0.9
        },
        {
          id: '4',
          order: 4,
          natural_language: 'Click the login button',
          action_type: 'click',
          element_description: 'Login submit button',
          element_selector: '[data-testid="login-button"], button[type="submit"]',
          confidence_score: 0.9
        },
        {
          id: '5',
          order: 5,
          natural_language: 'Verify successful login by checking dashboard',
          action_type: 'verify',
          element_description: 'Dashboard or user profile indicator',
          element_selector: '[data-testid="dashboard"], .user-profile, .welcome-message',
          confidence_score: 0.8
        }
      ]
    }
  },
  {
    id: 'ecommerce-checkout',
    name: 'E-commerce Checkout',
    description: 'End-to-end checkout process including product selection, cart, and payment',
    category: 'ecommerce',
    icon: ShoppingCart,
    difficulty: 'intermediate',
    estimatedTime: '10 min',
    popularity: 88,
    tags: ['ecommerce', 'checkout', 'payment', 'cart'],
    isPopular: true,
    preview: {
      steps: [
        'Browse products',
        'Add item to cart',
        'Proceed to checkout',
        'Fill shipping information',
        'Complete payment'
      ],
      expectedOutcome: 'Order successfully placed with confirmation'
    },
    template: {
      name: 'E-commerce Checkout Test',
      description: 'Complete checkout flow validation',
      priority: 'high',
      tags: ['ecommerce', 'checkout', 'critical-path'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Navigate to product catalog',
          action_type: 'navigate',
          element_description: 'Products page',
          value: '/products',
          confidence_score: 1.0
        },
        {
          id: '2',
          order: 2,
          natural_language: 'Click on a product to view details',
          action_type: 'click',
          element_description: 'First product in the list',
          element_selector: '.product-card:first-child, [data-testid="product-item"]:first-child',
          confidence_score: 0.8
        },
        {
          id: '3',
          order: 3,
          natural_language: 'Add product to cart',
          action_type: 'click',
          element_description: 'Add to cart button',
          element_selector: '[data-testid="add-to-cart"], .add-to-cart-btn',
          confidence_score: 0.9
        },
        {
          id: '4',
          order: 4,
          natural_language: 'Go to shopping cart',
          action_type: 'click',
          element_description: 'Shopping cart icon or link',
          element_selector: '[data-testid="cart"], .cart-icon, .shopping-cart',
          confidence_score: 0.8
        },
        {
          id: '5',
          order: 5,
          natural_language: 'Proceed to checkout',
          action_type: 'click',
          element_description: 'Checkout button',
          element_selector: '[data-testid="checkout"], .checkout-btn',
          confidence_score: 0.9
        }
      ]
    }
  },
  {
    id: 'contact-form',
    name: 'Contact Form Submission',
    description: 'Test contact form validation, submission, and confirmation',
    category: 'forms',
    icon: Mail,
    difficulty: 'beginner',
    estimatedTime: '3 min',
    popularity: 76,
    tags: ['forms', 'validation', 'contact', 'submission'],
    preview: {
      steps: [
        'Navigate to contact page',
        'Fill required fields',
        'Test form validation',
        'Submit form',
        'Verify confirmation'
      ],
      expectedOutcome: 'Form submitted successfully with confirmation message'
    },
    template: {
      name: 'Contact Form Test',
      description: 'Validate contact form functionality and validation',
      priority: 'medium',
      tags: ['forms', 'validation'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Navigate to contact page',
          action_type: 'navigate',
          element_description: 'Contact page URL',
          value: '/contact',
          confidence_score: 1.0
        },
        {
          id: '2',
          order: 2,
          natural_language: 'Enter name in name field',
          action_type: 'type',
          element_description: 'Name input field',
          element_selector: '[name="name"], #name, [data-testid="name"]',
          value: 'John Doe',
          confidence_score: 0.9
        },
        {
          id: '3',
          order: 3,
          natural_language: 'Enter email address',
          action_type: 'type',
          element_description: 'Email input field',
          element_selector: '[name="email"], #email, [data-testid="email"]',
          value: 'john.doe@example.com',
          confidence_score: 0.9
        },
        {
          id: '4',
          order: 4,
          natural_language: 'Enter message text',
          action_type: 'type',
          element_description: 'Message textarea',
          element_selector: '[name="message"], #message, [data-testid="message"]',
          value: 'This is a test message for form validation.',
          confidence_score: 0.9
        },
        {
          id: '5',
          order: 5,
          natural_language: 'Submit the form',
          action_type: 'click',
          element_description: 'Submit button',
          element_selector: '[type="submit"], .submit-btn, [data-testid="submit"]',
          confidence_score: 0.9
        }
      ]
    }
  },
  {
    id: 'search-functionality',
    name: 'Search Feature Test',
    description: 'Comprehensive search testing including filters, sorting, and pagination',
    category: 'navigation',
    icon: Search,
    difficulty: 'intermediate',
    estimatedTime: '8 min',
    popularity: 82,
    tags: ['search', 'filters', 'pagination', 'navigation'],
    preview: {
      steps: [
        'Enter search query',
        'Apply filters',
        'Sort results',
        'Navigate pages',
        'Verify search accuracy'
      ],
      expectedOutcome: 'Search returns relevant results with proper filtering'
    },
    template: {
      name: 'Search Functionality Test',
      description: 'Test search, filters, and result navigation',
      priority: 'medium',
      tags: ['search', 'navigation'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Click on search input field',
          action_type: 'click',
          element_description: 'Search input field',
          element_selector: '[data-testid="search"], .search-input, #search',
          confidence_score: 0.9
        },
        {
          id: '2',
          order: 2,
          natural_language: 'Enter search query',
          action_type: 'type',
          element_description: 'Search input field',
          element_selector: '[data-testid="search"], .search-input, #search',
          value: 'test product',
          confidence_score: 0.9
        },
        {
          id: '3',
          order: 3,
          natural_language: 'Press Enter or click search button',
          action_type: 'click',
          element_description: 'Search submit button',
          element_selector: '[data-testid="search-btn"], .search-button',
          confidence_score: 0.8
        },
        {
          id: '4',
          order: 4,
          natural_language: 'Verify search results are displayed',
          action_type: 'verify',
          element_description: 'Search results container',
          element_selector: '[data-testid="search-results"], .search-results',
          confidence_score: 0.8
        }
      ]
    }
  },
  {
    id: 'mobile-responsive',
    name: 'Mobile Responsive Test',
    description: 'Test mobile layouts, touch interactions, and responsive design',
    category: 'mobile',
    icon: Smartphone,
    difficulty: 'advanced',
    estimatedTime: '12 min',
    popularity: 71,
    tags: ['mobile', 'responsive', 'touch', 'viewport'],
    isNew: true,
    preview: {
      steps: [
        'Switch to mobile viewport',
        'Test navigation menu',
        'Verify touch interactions',
        'Check responsive layouts',
        'Test form inputs on mobile'
      ],
      expectedOutcome: 'All features work correctly on mobile devices'
    },
    template: {
      name: 'Mobile Responsive Test',
      description: 'Validate mobile user experience and responsive design',
      priority: 'medium',
      tags: ['mobile', 'responsive'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Set mobile viewport size',
          action_type: 'navigate',
          element_description: 'Set browser to mobile size',
          value: 'viewport:375x667',
          confidence_score: 1.0
        },
        {
          id: '2',
          order: 2,
          natural_language: 'Open mobile navigation menu',
          action_type: 'click',
          element_description: 'Mobile menu hamburger icon',
          element_selector: '[data-testid="mobile-menu"], .hamburger-menu, .mobile-nav-toggle',
          confidence_score: 0.8
        },
        {
          id: '3',
          order: 3,
          natural_language: 'Verify menu items are visible',
          action_type: 'verify',
          element_description: 'Mobile navigation menu',
          element_selector: '[data-testid="mobile-nav"], .mobile-navigation',
          confidence_score: 0.8
        }
      ]
    }
  },
  {
    id: 'performance-test',
    name: 'Performance & Load Time',
    description: 'Test page load times, resource loading, and performance metrics',
    category: 'performance',
    icon: Zap,
    difficulty: 'advanced',
    estimatedTime: '15 min',
    popularity: 64,
    tags: ['performance', 'speed', 'metrics', 'optimization'],
    isNew: true,
    preview: {
      steps: [
        'Measure page load time',
        'Check resource loading',
        'Verify Core Web Vitals',
        'Test under slow connection',
        'Analyze performance metrics'
      ],
      expectedOutcome: 'Page meets performance benchmarks and loads efficiently'
    },
    template: {
      name: 'Performance Test',
      description: 'Validate page performance and loading times',
      priority: 'medium',
      tags: ['performance', 'optimization'],
      steps: [
        {
          id: '1',
          order: 1,
          natural_language: 'Navigate to homepage and measure load time',
          action_type: 'navigate',
          element_description: 'Homepage with performance monitoring',
          value: '/',
          confidence_score: 1.0
        },
        {
          id: '2',
          order: 2,
          natural_language: 'Wait for page to fully load',
          action_type: 'wait',
          element_description: 'Wait for all resources',
          value: '3000',
          confidence_score: 1.0
        },
        {
          id: '3',
          order: 3,
          natural_language: 'Verify page is interactive',
          action_type: 'verify',
          element_description: 'Main content area',
          element_selector: 'main, [data-testid="main-content"], .main-content',
          confidence_score: 0.8
        }
      ]
    }
  }
];

interface TestTemplatesProps {
  onSelectTemplate: (template: TestTemplate) => void;
  onCreateFromTemplate: (template: TestTemplate) => void;
  selectedCategory?: string;
}

export const TestTemplates: React.FC<TestTemplatesProps> = ({
  onSelectTemplate,
  onCreateFromTemplate,
  selectedCategory = 'all'
}) => {
  const [filteredTemplates, setFilteredTemplates] = useState<TestTemplate[]>(testTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'difficulty' | 'time'>('popularity');

  const categories = [
    { id: 'all', name: 'All Templates', icon: Template },
    { id: 'authentication', name: 'Authentication', icon: UserCheck },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
    { id: 'forms', name: 'Forms', icon: FileText },
    { id: 'navigation', name: 'Navigation', icon: Search },
    { id: 'mobile', name: 'Mobile', icon: Smartphone },
    { id: 'performance', name: 'Performance', icon: Zap }
  ];

  // Filter and search templates
  useEffect(() => {
    let filtered = testTemplates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.popularity - a.popularity;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'time':
          return parseInt(a.estimatedTime) - parseInt(b.estimatedTime);
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  }, [selectedCategory, selectedDifficulty, searchQuery, sortBy]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-700 bg-green-100';
      case 'intermediate': return 'text-yellow-700 bg-yellow-100';
      case 'advanced': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const TemplateCard: React.FC<{ template: TestTemplate }> = ({ template }) => {
    const Icon = template.icon;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                {template.isPopular && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    <Star className="w-3 h-3 mr-1" />
                    Popular
                  </span>
                )}
                {template.isNew && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    New
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              
              {/* Meta info */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className={`px-2 py-1 rounded-full ${getDifficultyColor(template.difficulty)}`}>
                  {template.difficulty}
                </span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{template.estimatedTime}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{template.popularity}% used</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Test Steps Preview:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {template.preview.steps.slice(0, 3).map((step, index) => (
              <li key={index} className="flex items-center space-x-2">
                <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
            {template.preview.steps.length > 3 && (
              <li className="text-gray-400 ml-7">... and {template.preview.steps.length - 3} more steps</li>
            )}
          </ul>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 4 && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-400 rounded-full">
                +{template.tags.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onSelectTemplate(template)}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => onCreateFromTemplate(template)}
            className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Use Template</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Templates</h1>
        <p className="text-gray-600">
          Get started quickly with pre-built test templates for common scenarios
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="popularity">Most Popular</option>
            <option value="name">Name</option>
            <option value="difficulty">Difficulty</option>
            <option value="time">Duration</option>
          </select>
        </div>

        {/* Category tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => window.dispatchEvent(new CustomEvent('categoryChange', { detail: category.id }))}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {/* No results */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Template className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};