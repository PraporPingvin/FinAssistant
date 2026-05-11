import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthContainer from "./components/Auth/AuthContainer";
import Dashboard from "./pages/Dashboard/Dashboard";
import GoalsPage from "./pages/GoalsPage/GoalsPage";
import ScenariosPage from "./pages/ScenariosPage/ScenariosPage";
import ForecastPage from "./pages/ForecastPages/ForecastPages";
import CreateGoalPage from "./pages/GoalsPage/CreateGoalPage/CreateGoalPage";
import './App.css';
import GoalDetailPage from './pages/GoalsPage/GoalDetailPage/GoalDetailPage';
import PaymentsPage from './pages/PaymentsPage/PaymentsPage';
import CreateScenarioPage from './pages/ScenariosPage/CreateScenario/CreateScenarioPage';
import ScenarioDetailPage from './pages/ScenariosPage/ScenarioDetail/ScenarioDetailPage';
import EditScenarioPage from './pages/ScenariosPage/EditScenario/EditScenarioPage';
import ScenariosMainPage from './pages/ScenariosPage/MainScenario/ScenariosMainPage';
import ScenarioComparisonPage from './pages/ScenariosPage/ComparisonScenario/ScenarioComparisonPage';
import CheckpointsPage from './pages/ChekpointsPage/ChekpointsPage';
import EditGoalPage from './pages/GoalsPage/EditGoalPage/EditGoalPage';
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Загрузка...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <AuthContainer />}
      />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <PrivateRoute>
            <GoalsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals/new"
        element={
          <PrivateRoute>
            <CreateGoalPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals/:goalId"
        element={
          <PrivateRoute>
            <GoalDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals/:goalId/edit"
        element={
          <PrivateRoute>
            <EditGoalPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/goals/:goalId/payments"
        element={
          <PrivateRoute>
            <PaymentsPage />
          </PrivateRoute>
        }
      />

      <Route path="/payments/:goalId" element={
        <PrivateRoute>
          <PaymentsPage />
        </PrivateRoute>
      } />

      <Route path="/forecast" element={
        <PrivateRoute>
          <ForecastPage />
        </PrivateRoute>
      } />

      <Route
        path="/scenarios"
        element={
          <PrivateRoute>
            <ScenariosMainPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/all"
        element={
          <PrivateRoute>
            <ScenariosMainPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/:goalId"
        element={
          <PrivateRoute>
            <ScenariosPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/new/:goalId"
        element={
          <PrivateRoute>
            <CreateScenarioPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/detail/:scenarioId"
        element={
          <PrivateRoute>
            <ScenarioDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/edit/:scenarioId"
        element={
          <PrivateRoute>
            <EditScenarioPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/scenarios/compare/:goalId"
        element={
          <PrivateRoute>
            <ScenarioComparisonPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/checkpoints"
        element={
          <PrivateRoute>
            <CheckpointsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/forecast/:goalId"
        element={
          <PrivateRoute>
            <ForecastPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;