import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/user/HomePage';
import {
  DashboardPage,
  KnowledgePage,
  AIAgentsAdminPage,
  AISkillsAdminPage,
  HistoryAdminPage,
  UsersPage,
  SettingsAdminPage,
} from './pages/admin';

function AppContent() {
  const { activeView, adminPage } = useApp();

  const renderAdminPage = () => {
    switch (adminPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'knowledge':
        return <KnowledgePage />;
      case 'ai-agents':
        return <AIAgentsAdminPage />;
      case 'ai-skills':
        return <AISkillsAdminPage />;
      case 'history':
        return <HistoryAdminPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsAdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  if (activeView === 'admin') {
    return (
      <AdminLayout>
        {renderAdminPage()}
      </AdminLayout>
    );
  }

  return (
    <UserLayout>
      <HomePage />
    </UserLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
