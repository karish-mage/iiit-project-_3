import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RightPanel from '../components/RightPanel';

export default function MainLayout({ children }) {
  return (
    <div className="h-screen overflow-hidden bg-obsidian-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      <Navbar />
      <div className="flex flex-1 min-h-0 pt-14">
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
        <RightPanel />
      </div>
      <Footer />
    </div>
  );
}
