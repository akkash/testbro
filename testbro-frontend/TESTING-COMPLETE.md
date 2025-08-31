# TestBro Frontend Testing Configuration - Complete Setup

## Overview

This document provides a comprehensive guide to the testing configuration for the TestBro frontend, following the project's **TypeScript Strict Mode** requirements and **Frontend Technology Stack** (React 19, TypeScript, Vite 6.2).

## Configuration Files

### 1. `vitest.config.ts` - Main Testing Configuration

```typescript
// @ts-ignore - Vitest types will be available after npm install
/// <reference types="vitest" />
// @ts-ignore - Vitest imports will be available after npm install
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020',
  },
})
```

### 2. `tsconfig.test.json` - Testing TypeScript Configuration

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "noEmit": true,
    "types": [
      "vitest/globals",
      "@testing-library/jest-dom",
      "jsdom"
    ]
  },
  "include": [
    "src/**/*",
    "src/__tests__/**/*",
    "vitest.config.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### 3. `src/types/testing.d.ts` - Comprehensive Type Definitions

This file provides complete type definitions for all testing libraries, ensuring TypeScript compatibility before and after package installation.

### 4. `src/__tests__/setup.ts` - Test Environment Setup

Configures global mocks and testing utilities:
- ResizeObserver mock
- IntersectionObserver mock  
- window.matchMedia mock
- Console method mocking
- Test cleanup functions

## TypeScript Integration

### Before Package Installation
- `@ts-ignore` comments prevent TypeScript errors
- Custom type definitions in `src/types/testing.d.ts` provide IntelliSense
- Conditional mocking prevents runtime errors

### After Package Installation
- Real type definitions replace custom ones
- Full TypeScript support with strict type checking
- Complete integration with IDE features

## Dependencies

### Required Testing Packages (added to package.json)
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^14.1.0", 
    "@testing-library/user-event": "^14.5.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0",
    "vitest": "^1.0.0"
  }
}
```

### New NPM Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## Test Structure

### Integration Tests Location
- `src/__tests__/integration/frontend-integration.test.tsx`

### Test Coverage Areas
1. **Authentication Integration**
   - Auth context state management
   - Session handling and persistence
   - User authentication flow

2. **API Integration**  
   - HTTP client with authentication headers
   - Error handling and retry logic
   - Response format validation

3. **Organization Context**
   - Multi-tenant organization switching
   - Organization data loading
   - Context provider hierarchy

4. **WebSocket Communication**
   - Real-time connection status
   - Event handling and emission
   - Connection recovery

5. **Error Handling**
   - Network error resilience
   - Authentication error recovery
   - Graceful degradation

## Usage Instructions

### 1. Install Dependencies
```bash
cd testbro-frontend
npm install
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run with UI interface
npm run test:ui

# Run specific test file
npm test src/__tests__/integration/frontend-integration.test.tsx
```

### 3. Development Workflow
1. Write tests using the provided type definitions
2. Run tests to validate functionality
3. Use test UI for interactive debugging
4. Integrate with CI/CD pipeline

## Compatibility

- ✅ **React 19**: Full compatibility with latest React features
- ✅ **TypeScript Strict Mode**: Meets all strict type checking requirements
- ✅ **Vite 6.2**: Optimized for Vite build system
- ✅ **ESM**: Modern module system support
- ✅ **Node.js**: Compatible with current Node.js versions

## Best Practices

1. **Test Organization**: Separate integration and unit tests
2. **Mocking Strategy**: Mock external dependencies, test real integrations
3. **Type Safety**: Maintain strict TypeScript compliance
4. **Performance**: Use efficient test patterns and cleanup
5. **Maintainability**: Keep tests focused and well-documented

This setup ensures robust testing capabilities while maintaining compatibility with the TestBro project's technology stack and development standards.