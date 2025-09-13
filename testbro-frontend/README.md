# TestBro Frontend

## 🚀 Overview

TestBro Frontend is a comprehensive React-based web application for AI-powered automated testing. Built with modern technologies and best practices, it provides an intuitive interface for creating, managing, and monitoring automated test suites.

## 🛠️ Technology Stack

### Core Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Router** for navigation
- **Heroicons** for icons

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Sonner** for toast notifications

## 📁 Project Structure

```
testbro-frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Core UI component library
│   │   ├── layout/          # Layout components
│   │   └── common/          # Shared common components
│   ├── pages/               # Application pages
│   │   ├── auth/            # Authentication pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── projects/        # Project management
│   │   ├── test-builder/    # Visual test builder
│   │   ├── execution/       # Test execution monitoring
│   │   ├── settings/        # Settings pages
│   │   ├── profile/         # User profile
│   │   ├── landing/         # Landing page
│   │   └── 404/            # Error pages
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript definitions
│   └── styles/              # Global styles
├── public/                  # Static assets
├── docs/                    # Documentation
└── config/                  # Configuration files
```

## 🎨 Core Features

### 1. Authentication System
- **Login/Register** - Secure user authentication
- **Password Reset** - Email-based password recovery
- **Email Verification** - Account verification system
- **Profile Management** - User profile and settings
- **Role-based Access** - Different user roles and permissions

**Location**: `src/pages/auth/`

### 2. Project Management Dashboard
- **Project Overview** - Comprehensive project metrics
- **Project Creation** - Guided project setup wizard
- **Team Management** - User roles and permissions
- **Test Target Configuration** - Environment and target setup
- **Activity Monitoring** - Real-time project activity

**Location**: `src/pages/projects/`, `src/pages/dashboard/`

### 3. Visual Test Builder
- **Drag-and-Drop Canvas** - Visual test flow creation
- **Component Palette** - 50+ pre-built test actions
- **Step Configuration** - Detailed step property panels
- **Flow Validation** - Real-time flow validation
- **Import/Export** - Test flow portability

**Key Components**:
- `TestFlowCanvas.tsx` - Main visual canvas
- `ComponentPalette.tsx` - Action component library
- `StepConfigPanel.tsx` - Step configuration interface
- `TestFlowPreview.tsx` - Flow preview and validation

**Location**: `src/pages/test-builder/`

### 4. Test Execution & Monitoring
- **Real-time Dashboard** - Live execution monitoring
- **Execution Controls** - Start, pause, stop test runs
- **Screenshot Gallery** - Visual test result comparison
- **Performance Metrics** - Detailed execution analytics
- **Error Analysis** - Comprehensive debugging tools

**Key Components**:
- `ExecutionDashboard.tsx` - Main monitoring interface
- `ScreenshotGallery.tsx` - Visual comparison tools

**Location**: `src/pages/execution/`

### 5. UI Component Library
Comprehensive set of reusable components built with consistency and accessibility in mind:

- **Basic Components**: Button, Input, Card, Modal, Badge
- **Form Components**: FormField, Select, Checkbox, Radio
- **Navigation**: Breadcrumbs, Pagination, Tabs
- **Data Display**: Table, List, Badge, Avatar
- **Feedback**: LoadingSpinner, Toast, ErrorState
- **Layout**: Container, Grid, Stack, Divider

**Location**: `src/components/ui/`

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.0 or later
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Development

### Available Scripts

- **`npm run dev`** - Start development server
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build
- **`npm run lint`** - Run ESLint
- **`npm run lint:fix`** - Fix ESLint issues
- **`npm run type-check`** - Run TypeScript checks

### Code Style Guidelines

#### TypeScript
- Use TypeScript for all new components
- Define proper interfaces for all props
- Avoid `any` type - use specific types
- Export types alongside components

#### React Components
- Use functional components with hooks
- Keep components small and focused
- Use proper prop validation
- Handle loading and error states

#### Styling
- Use TailwindCSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use the design system tokens

## 🎨 Design System

### Colors
```css
Primary: Blue (blue-500, blue-600, blue-700)
Secondary: Purple (purple-500, purple-600)
Success: Green (green-500, green-600)
Warning: Yellow (yellow-500, yellow-600)
Error: Red (red-500, red-600)
Neutral: Gray (gray-50 to gray-900)
```

### Typography
- **Headings**: text-xl to text-4xl with font-bold
- **Body**: text-sm, text-base with text-gray-700
- **Labels**: text-sm with font-medium
- **Captions**: text-xs with text-gray-500

### Spacing
- **Container**: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- **Sections**: py-8, py-12, py-20
- **Elements**: p-4, p-6, p-8
- **Gaps**: gap-2, gap-4, gap-6, gap-8

## 🔧 Component Usage

### Button Component
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg" onClick={handleClick}>
  Click me
</Button>
```

### FormField Component
```tsx
import { FormField } from '@/components/ui';

<FormField
  type="text"
  name="email"
  label="Email Address"
  value={email}
  onChange={setEmail}
  required
/>
```

### Modal Component
```tsx
import { Modal } from '@/components/ui';

<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
</Modal>
```

## 🛣️ Routing

The application uses React Router with the following main routes:

```
/ - Landing page
/auth/login - Login page
/auth/register - Registration page
/dashboard - Main dashboard
/projects - Project list
/projects/:id - Project details
/test-builder - Visual test builder
/executions - Test executions
/settings - Settings
/profile - User profile
```

## 📱 Responsive Design

The application is fully responsive and follows mobile-first design principles:

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

## ♿ Accessibility

- **Keyboard Navigation** - Full keyboard support
- **Screen Readers** - Proper ARIA labels and roles
- **Color Contrast** - WCAG AA compliant colors
- **Focus Management** - Visible focus indicators
- **Alt Text** - Images with descriptive alt text

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
```env
VITE_API_URL=https://api.testbro.ai
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### Deployment Platforms
- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker** containers

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Type Errors
```bash
# Run type checking
npm run type-check
```

## 🆘 Support

- **Documentation**: [docs.testbro.ai](https://docs.testbro.ai)
- **Issues**: [GitHub Issues](https://github.com/testbro/frontend/issues)
- **Email**: [support@testbro.ai](mailto:support@testbro.ai)

## 🔮 Roadmap

### Phase 1 (Completed)
- ✅ Core UI component library
- ✅ Authentication system
- ✅ Project management dashboard
- ✅ Visual test builder
- ✅ Test execution monitoring
- ✅ Screenshot gallery

### Phase 2 (Upcoming)
- 🔄 Advanced analytics dashboard
- 🔄 Team collaboration features
- 🔄 API testing interface
- 🔄 Mobile app companion

---

Built with ❤️ by the TestBro team
