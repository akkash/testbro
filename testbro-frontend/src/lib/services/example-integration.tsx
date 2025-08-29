// Example: How to update React components to use real API services instead of mock data
// This shows the pattern for updating dashboard-overview.tsx

import React, { useState, useEffect } from 'react';
import { DashboardService, DashboardMetrics } from '@/lib/services/dashboardService';
import { ProjectService } from '@/lib/services/projectService';
import { TestCaseService } from '@/lib/services/testCaseService';

// Example component showing how to replace mock data with real API calls
export function ExampleDashboardComponent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load dashboard metrics from real API
        const { data: metricsData, error: metricsError } = await DashboardService.getMetrics();
        if (metricsError) {
          throw new Error(metricsError);
        }

        setMetrics(metricsData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {metrics && (
        <div>
          <p>Total Tests: {metrics.totalTests}</p>
          <p>Pass Rate: {metrics.passRate}%</p>
          <p>Fail Rate: {metrics.failRate}%</p>
          <p>Avg Execution Time: {metrics.avgExecutionTime}ms</p>
          <p>Reliability Score: {metrics.reliabilityScore}</p>
        </div>
      )}
    </div>
  );
}

// Example of using ProjectService
export function ExampleProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await ProjectService.listProjects({
          page: 1,
          limit: 20,
          sort_by: 'updated_at',
          sort_order: 'desc'
        });

        if (error) {
          throw new Error(error);
        }

        setProjects(data || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Render projects...
  return <div>Projects list component</div>;
}

// Example of using TestCaseService with API key (for programmatic access)
export function ExampleApiKeyUsage() {
  const createTestCaseWithApiKey = async (apiKey: string) => {
    try {
      // This would be used for programmatic access
      const result = await fetch('http://localhost:3000/api/test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          name: 'Automated Test Case',
          description: 'Created via API',
          type: 'e2e',
          project_id: 'project-123',
          target_id: 'target-456'
        })
      });

      const data = await result.json();
      console.log('Test case created via API key:', data);
    } catch (error) {
      console.error('Failed to create test case with API key:', error);
    }
  };

  return <div>API Key usage example</div>;
}

/*
To update existing components:

1. Replace mock data imports with service imports:
   - import { mockDashboardMetrics } from '@/polymet/data/test-data'
   + import { DashboardService } from '@/lib/services/dashboardService'

2. Add state management for loading and error states:
   + const [loading, setLoading] = useState(true)
   + const [error, setError] = useState<string | null>(null)

3. Replace mock data usage with API calls in useEffect:
   - const metrics = mockDashboardMetrics
   + useEffect(() => {
   +   const loadData = async () => {
   +     const { data, error } = await DashboardService.getMetrics()
   +     if (error) setError(error)
   +     else setMetrics(data)
   +     setLoading(false)
   +   }
   +   loadData()
   + }, [])

4. Add loading and error UI states:
   + if (loading) return <LoadingSpinner />
   + if (error) return <ErrorMessage error={error} />

5. Use the useAuth hook for authentication state:
   + const { isAuthenticated, token, user } = useAuth()
*/