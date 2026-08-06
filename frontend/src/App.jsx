import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import TutorialPage from './pages/TutorialPage';
import UploadPage from './pages/UploadPage';
import QueryPage from './pages/QueryPage';
import ComparisonPage from './pages/ComparisonPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
