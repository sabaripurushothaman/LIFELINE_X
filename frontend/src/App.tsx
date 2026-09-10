import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Survivors from './pages/Survivors';
import EvidenceChain from './pages/EvidenceChain';
import MapView from './pages/MapView';
import Coverage from './pages/Coverage';
import Evaluation from './pages/Evaluation';
import SystemHealth from './pages/SystemHealth';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="survivors" element={<Survivors />} />
          <Route path="evidence" element={<EvidenceChain />} />
          <Route path="map" element={<MapView />} />
          <Route path="coverage" element={<Coverage />} />
          <Route path="evaluation" element={<Evaluation />} />
          <Route path="system" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;