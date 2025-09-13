# TestBro UI Components Library

A comprehensive collection of reusable UI components built specifically for the TestBro testing platform. This library extends Shadcn/ui components with TestBro-specific functionality and styling.

## 🧩 Component Categories

### Base Components (Shadcn/ui)
Standard UI components from Shadcn/ui library including buttons, inputs, modals, tables, and more.

### Enhanced Components (TestBro-specific)
Custom components tailored for testing workflows and data visualization.

## 📋 Available Components

### Status & Feedback Components

#### StatusBadge
Displays status information with appropriate colors and icons.
```tsx
import { StatusBadge } from '@/components/ui';

<StatusBadge status="success" animated>Test Passed</StatusBadge>
<StatusBadge status="running" animated>Executing...</StatusBadge>
<StatusBadge status="failed">3 Tests Failed</StatusBadge>
```

**Available Statuses:**
- `success`, `passed` - Green with check icon
- `warning` - Yellow with warning icon  
- `error`, `failed` - Red with X icon
- `pending` - Gray with clock icon
- `running` - Blue with animated spinner
- `cancelled` - Gray with X icon
- `timeout` - Orange with clock icon

#### LoadingSpinner
Various loading indicators for different contexts.
```tsx
import { LoadingSpinner, PageLoader, InlineLoader, ButtonLoader } from '@/components/ui';

<LoadingSpinner type="circular" size="md" />
<PageLoader message="Loading tests..." />
<InlineLoader />
<ButtonLoader />
```

**Spinner Types:** `circular`, `dots`, `bars`, `pulse`, `ring`

#### ErrorState
Comprehensive error display with retry functionality.
```tsx
import { ErrorState, InlineError, FieldError } from '@/components/ui';

<ErrorState 
  type="network" 
  onRetry={() => refetch()}
  showDetails={isDev}
/>
<InlineError message="Invalid input" />
<FieldError error="Required field" />
```

### Form Components

#### FormField
Enhanced form field with validation and multiple input types.
```tsx
import { FormField, EmailField, PasswordField, SearchField } from '@/components/ui';

<FormField
  type="text"
  name="testName"
  label="Test Name"
  required
  error={errors.testName}
  tooltip="Enter a descriptive name for your test"
/>

<EmailField 
  name="email"
  label="Email"
  value={email}
  onChange={setEmail}
/>

<PasswordField 
  name="password"
  label="Password"
  required
/>
```

**Field Types:** `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `textarea`, `select`, `checkbox`, `radio`, `switch`

### Layout Components

#### Modal
Accessible modal dialogs with animations.
```tsx
import { Modal, ConfirmationModal, useModal } from '@/components/ui';

const { open, openModal, closeModal } = useModal();

<Modal open={open} onOpenChange={closeModal} size="lg">
  <ModalHeader>
    <ModalTitle>Edit Test</ModalTitle>
  </ModalHeader>
  <ModalBody>
    {/* Modal content */}
  </ModalBody>
  <ModalFooter>
    <Button onClick={closeModal}>Cancel</Button>
    <Button onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>

<ConfirmationModal
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete Test"
  message="Are you sure you want to delete this test? This action cannot be undone."
  confirmText="Delete"
  confirmVariant="destructive"
  onConfirm={handleDelete}
/>
```

### Data Components

#### DataTable
Advanced data table with sorting, filtering, and pagination.
```tsx
import { DataTable, DataTableActions } from '@/components/ui';

const columns: DataTableColumn<Test>[] = [
  {
    key: 'name',
    title: 'Test Name',
    dataKey: 'name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'status',
    title: 'Status',
    dataKey: 'status',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Passed', value: 'passed' },
      { label: 'Failed', value: 'failed' },
      { label: 'Pending', value: 'pending' },
    ],
    render: (status) => <StatusBadge status={status}>{status}</StatusBadge>,
  },
];

<DataTable
  data={tests}
  columns={columns}
  loading={loading}
  rowSelection
  selectedRowKeys={selectedTests}
  onSelectionChange={setSelectedTests}
  pagination
  currentPage={page}
  pageSize={pageSize}
  totalItems={totalTests}
  onPageChange={setPage}
  searchable
  searchValue={search}
  onSearchChange={setSearch}
  rowActions={(test) => (
    <DataTableActions
      actions={[
        {
          key: 'edit',
          label: 'Edit',
          onClick: () => editTest(test.id),
        },
        {
          key: 'delete',
          label: 'Delete',
          onClick: () => deleteTest(test.id),
          destructive: true,
        },
      ]}
    />
  )}
/>
```

## 🎨 Design System

### Colors
The component library uses a semantic color system:
- **Primary**: Brand colors for main actions
- **Secondary**: Supporting colors for secondary actions  
- **Success**: Green for positive states
- **Warning**: Yellow/orange for caution states
- **Error/Destructive**: Red for error states
- **Muted**: Gray for disabled/secondary text

### Typography
- **Headings**: `text-lg font-semibold` to `text-3xl font-bold`
- **Body**: `text-sm` to `text-base`
- **Caption**: `text-xs text-muted-foreground`

### Spacing
- **Component padding**: `p-2` to `p-6`
- **Element gaps**: `gap-2` to `gap-6`
- **Margins**: `m-2` to `m-8`

### Animations
- **Duration**: 200ms for micro-interactions, 300ms for larger transitions
- **Easing**: `ease-in-out` for smooth transitions
- **Loading states**: Subtle pulse or spin animations

## 🔧 Utility Functions

The library includes utility functions in `@/lib/component-utils`:

```tsx
import { 
  cn, 
  getStateClasses, 
  getValidationClasses, 
  getFocusClasses,
  getAnimationClasses,
  getSizeClasses,
  getResponsiveClasses 
} from '@/lib/component-utils';

// Merge class names
const className = cn('base-class', condition && 'conditional-class');

// Get state-based classes
const stateClasses = getStateClasses('success', false, false); // isSuccess, isLoading, isDisabled

// Get validation classes
const validationClasses = getValidationClasses(true, false, false); // isValid, hasError, isRequired

// Get focus classes
const focusClasses = getFocusClasses('ring'); // type: 'ring' | 'outline' | 'underline'
```

## 📖 Storybook

All components are documented in Storybook with interactive examples:

```bash
npm run storybook
```

Stories include:
- Basic usage examples
- All prop variations
- Interactive controls
- Real-world usage examples
- Accessibility features

## 🧪 Testing

Components are tested using Vitest and React Testing Library:

```bash
npm run test:ui
```

Test coverage includes:
- Component rendering
- Props handling
- User interactions
- Accessibility compliance
- Edge cases

## 📱 Accessibility

All components follow WCAG 2.1 AA guidelines:
- **Keyboard navigation**: Full keyboard support
- **Screen readers**: Proper ARIA labels and descriptions
- **Focus management**: Logical focus order and visible indicators
- **Color contrast**: Minimum 4.5:1 ratio for normal text
- **Semantic HTML**: Proper heading hierarchy and landmarks

## 🎯 Best Practices

### Component Usage
1. **Import from index**: Always import from `@/components/ui` for consistency
2. **Use semantic props**: Choose descriptive prop names over generic ones  
3. **Handle loading states**: Always provide loading feedback for async operations
4. **Provide error handling**: Include error states and recovery options
5. **Consider mobile**: Ensure components work well on all screen sizes

### Styling
1. **Use design tokens**: Leverage the predefined color and spacing system
2. **Maintain consistency**: Follow established patterns for similar components
3. **Test dark mode**: Ensure components work in both light and dark themes
4. **Responsive design**: Use responsive utilities for different screen sizes

### Performance
1. **Lazy load**: Use React.lazy for heavy components
2. **Memoization**: Use React.memo for expensive renders  
3. **Virtualization**: Use virtual scrolling for large datasets
4. **Image optimization**: Use proper image formats and lazy loading

## 🔄 Contributing

When adding new components:

1. **Follow naming conventions**: Use PascalCase for components, kebab-case for files
2. **Include TypeScript types**: Provide comprehensive prop interfaces
3. **Add Storybook stories**: Document all variations and use cases
4. **Write tests**: Include unit tests for functionality
5. **Update documentation**: Add component to this README and index file
6. **Consider accessibility**: Ensure WCAG compliance from the start

## 📦 Export Structure

```tsx
// Individual imports
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Bulk import (recommended)
import { StatusBadge, LoadingSpinner, DataTable } from '@/components/ui';
```

## 🚀 Future Enhancements

Planned additions:
- **Test Builder Components**: Visual test creation tools
- **Chart Components**: Test metrics and analytics visualizations  
- **File Upload**: Drag-and-drop file handling
- **Code Editor**: Syntax-highlighted code display
- **Notification System**: Toast and banner notifications
- **Tour/Onboarding**: Interactive user guidance
- **Advanced Filters**: Complex filtering UI for test data
- **Real-time Indicators**: Live status updates and streaming data
