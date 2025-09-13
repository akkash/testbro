/**
 * Status Badge Stories
 * Storybook stories for the Status Badge component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './status-badge';

const meta = {
  title: 'UI/Status Badge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile status badge component that displays status information with appropriate colors, icons, and animations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['success', 'warning', 'error', 'pending', 'running', 'passed', 'failed', 'cancelled', 'timeout'],
      description: 'The status to display',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge',
    },
    animated: {
      control: 'boolean',
      description: 'Whether to show animation for active states',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show the status icon',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic examples
export const Success: Story = {
  args: {
    status: 'success',
    children: 'Test Passed',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    children: 'Warnings Found',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    children: 'Test Failed',
  },
};

export const Pending: Story = {
  args: {
    status: 'pending',
    children: 'Queued',
    animated: true,
  },
};

export const Running: Story = {
  args: {
    status: 'running',
    children: 'Executing...',
    animated: true,
  },
};

export const Passed: Story = {
  args: {
    status: 'passed',
    children: 'All Tests Passed',
  },
};

export const Failed: Story = {
  args: {
    status: 'failed',
    children: '3 Tests Failed',
  },
};

export const Cancelled: Story = {
  args: {
    status: 'cancelled',
    children: 'Execution Cancelled',
  },
};

export const Timeout: Story = {
  args: {
    status: 'timeout',
    children: 'Execution Timeout',
  },
};

// Size variations
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="success" size="sm">Small</StatusBadge>
      <StatusBadge status="success" size="md">Medium</StatusBadge>
      <StatusBadge status="success" size="lg">Large</StatusBadge>
    </div>
  ),
};

// Animation examples
export const Animated: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="pending" animated>Pending</StatusBadge>
      <StatusBadge status="running" animated>Running</StatusBadge>
      <StatusBadge status="warning" animated>Warning</StatusBadge>
    </div>
  ),
};

// Without icons
export const WithoutIcons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="success" showIcon={false}>Success</StatusBadge>
      <StatusBadge status="error" showIcon={false}>Error</StatusBadge>
      <StatusBadge status="pending" showIcon={false}>Pending</StatusBadge>
    </div>
  ),
};

// All statuses showcase
export const AllStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatusBadge status="success">Success</StatusBadge>
      <StatusBadge status="warning">Warning</StatusBadge>
      <StatusBadge status="error">Error</StatusBadge>
      <StatusBadge status="pending" animated>Pending</StatusBadge>
      <StatusBadge status="running" animated>Running</StatusBadge>
      <StatusBadge status="passed">Passed</StatusBadge>
      <StatusBadge status="failed">Failed</StatusBadge>
      <StatusBadge status="cancelled">Cancelled</StatusBadge>
      <StatusBadge status="timeout">Timeout</StatusBadge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available status variations with their default styling.',
      },
    },
  },
};

// Real-world usage examples
export const TestResultsExample: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-card rounded-lg border max-w-md">
      <h3 className="text-lg font-semibold">Test Execution Results</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span>UI Tests</span>
          <StatusBadge status="passed">12 Passed</StatusBadge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>API Tests</span>
          <StatusBadge status="failed">2 Failed</StatusBadge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Integration Tests</span>
          <StatusBadge status="running" animated>Running</StatusBadge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>E2E Tests</span>
          <StatusBadge status="pending" animated>Queued</StatusBadge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example usage in a test results dashboard showing different test suite statuses.',
      },
    },
  },
};
