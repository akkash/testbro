# Frontend Integration Testing Setup

## Quick Start

To resolve the current TypeScript errors and run the integration tests, follow these steps:

### 1. Install Testing Dependencies

```bash
cd testbro-frontend
npm install
```

This will install all the testing dependencies added to `package.json`:
- `@testing-library/react`
- `@testing-library/jest-dom` 
- `@testing-library/user-event`
- `vitest`
- `@vitest/ui`
- `jsdom`

### 2. Run Integration Tests

After installation, you can run the tests:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run specific test file
npm test src/__tests__/integration/frontend-integration.test.tsx
```

## Test Coverage

The integration tests cover:
- ✅ Authentication flow
- ✅ API client functionality
- ✅ Organization context
- ✅ WebSocket connections
- ✅ Error handling
- ✅ Network resilience

## Files Structure

```
testbro-frontend/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts                    # Test setup and mocks
│   │   └── integration/
│   │       └── frontend-integration.test.tsx  # Main integration tests
│   └── types/
│       └── testing.d.ts               # Comprehensive type definitions
├── vitest.config.ts                   # Vitest configuration with TypeScript support
├── tsconfig.test.json                 # TypeScript config for testing
├── tsconfig.app.json                  # Updated with vitest types
└── package.json                       # Updated with testing dependencies
```

## TypeScript Configuration

The testing setup includes multiple TypeScript configurations to ensure proper type checking:

- **tsconfig.app.json**: Updated to include vitest global types
- **tsconfig.test.json**: Dedicated configuration for test files
- **src/types/testing.d.ts**: Comprehensive type definitions for testing libraries

This ensures TypeScript compatibility both before and after package installation.

## Current Status

⚠️ **TypeScript errors are expected until `npm install` is run**

The errors you're seeing are because the testing libraries haven't been installed yet. Once you run `npm install`, all TypeScript errors will be resolved and the tests will be ready to run.

## Integration with Backend

The frontend integration tests work with the backend integration tests to provide comprehensive test coverage:

- **Backend**: `testbro-backend/tests/integration/service-integration.test.ts`
- **Frontend**: `testbro-frontend/src/__tests__/integration/frontend-integration.test.tsx`

Both test suites follow the **Integration Test Structure** specification and ensure proper authentication flow, API connectivity, and real-time communication testing.