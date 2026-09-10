import { useState } from 'react';
import type { FC } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import { useBackendStatus } from '../../hooks/useBackendStatus';

const ROUTE_INFO: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'COMMAND CENTER',
    subtitle: 'AI Disaster Search Intelligence & Survivor Triage',
  },
  '/camera': {
    title: 'LIVE CAMERA & VIDEO FEED',
    subtitle: 'Recorded UAV video replay with resolution metadata and processing status',
  },
  '/analysis': {
    title: 'ANALYSIS & INGESTION',
    subtitle: 'Upload and process drone aerial video with synchronized telemetry',
  },
  '/survivors': {
    title: 'SURVIVOR INTELLIGENCE',
    subtitle: 'AI-detected human candidates requiring rescue-team verification',
  },
  '/evidence': {
    title: 'EVIDENCE CHAIN INVESTIGATION',
    subtitle: 'Multi-frame verification trace & multi-sensor evidence breakdown',
  },
  '/map': {
    title: 'INCIDENT GEOSPATIAL MAP',
    subtitle: 'Tactical GIS map with UAV path, search corridors, and survivor markers',
  },
  '/coverage': {
    title: 'SEARCH COVERAGE MAP',
    subtitle: 'Flight corridor coverage inspection, gap analysis, and priority sectors',
  },
  '/evaluation': {
    title: 'SYSTEM EVALUATION',
    subtitle: 'Verified performance benchmarks — only measured values reported',
  },
  '/system': {
    title: 'SYSTEM HEALTH & DIAGNOSTICS',
    subtitle: 'Real-time telemetry, model readiness, and pipeline service status',
  },
};

const MainLayout: FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { isOnline, isLoading } = useBackendStatus();

  const currentRoute = ROUTE_INFO[location.pathname] || {
    title: 'LIFELINE-X PLATFORM',
    subtitle: 'AI Disaster Search Intelligence',
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900 flex">
      {/* Sidebar (fixed desktop, drawer mobile) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-64">
        <Header
          title={currentRoute.title}
          subtitle={currentRoute.subtitle}
          systemOnline={isOnline}
          statusLoading={isLoading}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav onToggleMenu={() => setIsSidebarOpen((prev) => !prev)} />
      </div>
    </div>
  );
};

export default MainLayout;