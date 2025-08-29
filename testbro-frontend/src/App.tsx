import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/polymet/components/ProtectedRoute";
import TestBroLayout from "@/polymet/layouts/testbro-layout";
import HomepageLayout from "@/polymet/layouts/homepage-layout";
import Homepage from "@/polymet/pages/homepage";
import Dashboard from "@/polymet/pages/dashboard";
import Projects from "@/polymet/pages/projects";
import TestTargets from "@/polymet/pages/test-targets";
import TestCases from "@/polymet/pages/test-cases";
import TestSuites from "@/polymet/pages/test-suites";
import TestBuilder from "@/polymet/pages/test-builder";
import TestExecution from "@/polymet/pages/test-execution";
import TestResults from "@/polymet/pages/test-results";
import AISimulation from "@/polymet/pages/ai-simulation";
import UXResults from "@/polymet/pages/ux-results";
import Executions from "@/polymet/pages/executions";
import Analytics from "@/polymet/pages/analytics";
import Team from "@/polymet/pages/team";
import PublicFeatures from "@/polymet/pages/public-features";
import AppFeatures from "@/polymet/pages/app-features";
import Settings from "@/polymet/pages/settings";
import Pricing from "@/polymet/pages/pricing";
import Login from "@/polymet/pages/login";
import Signup from "@/polymet/pages/signup";
import BrowserAutomationDashboard from "@/polymet/pages/browser-automation-dashboard";

export default function TestBroApp() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Authentication routes - Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Homepage route */}
          <Route
            path="/"
            element={
              <HomepageLayout>
                <Homepage />
              </HomepageLayout>
            }
          />

          {/* Pricing page */}
          <Route
            path="/pricing"
            element={
              <HomepageLayout>
                <Pricing />
              </HomepageLayout>
            }
          />

          {/* Redirect /home to homepage */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* Main application routes - Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <Dashboard />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/browser-automation"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <BrowserAutomationDashboard />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <Projects />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-targets"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestTargets />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-execution/:targetId"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestExecution />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-results/:targetId"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestResults />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-cases"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestCases />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-cases/new"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestBuilder />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-suites"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <TestSuites />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-simulation"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <AISimulation />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ux-results"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <UXResults />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/executions"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <Executions />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <Analytics />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <Team />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

        {/* Public features page for marketing */}
        <Route
          path="/features"
          element={
            <HomepageLayout>
              <PublicFeatures />
            </HomepageLayout>
          }
        />

        {/* Internal app features page for logged-in users */}
        <Route
          path="/app-features"
          element={
            <ProtectedRoute>
              <TestBroLayout>
                <AppFeatures />
              </TestBroLayout>
            </ProtectedRoute>
          }
        />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <TestBroLayout>
                  <Settings />
                </TestBroLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
