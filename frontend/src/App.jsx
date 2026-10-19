import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WardFilters from './components/WardFilters';
import ProjectList from './components/ProjectList';
import ReportIssueModal from './components/ReportIssueModal';
import StaffPortal from './components/StaffPortal';
import { getInitialLanguage } from './utils/translator';
import { API_BASE_URL } from './apiConfig';

// Initial verified civic infrastructure projects for Biratnagar Metropolitan City
const DEFAULT_PROJECTS = [
  {
    id: 1,
    title: 'Ward 04 Drainage Upgrade',
    status: 'ACTIVE',
    location: 'Chundevi Marg, Ward 4',
    contractor: 'Pragati Upabhokta Samiti',
    description:
      'Upgradation of existing drainage system to improve water flow and reduce flooding in the area.',
    budget: '1,25,00,000',
    progress: 65,
    sector: 'Roads & Drainage',
    ward: 'Ward 04',
    featured: true,
    date: '2081-11-15 (B.S.)',
    dateLabel: 'Started',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVMH6dHGMIv-ZDQlBOplG_QdnaGymOA5idJdIrIlku8-TlEhAGIppPpj_&s=10',
  },
  {
    id: 2,
    title: 'Ward 04 Deep Tube-Well & Distribution Network',
    status: 'COMPLETED',
    location: 'Maharajgunj, Ward 4',
    contractor: 'Himalayan Water Infra Ltd.',
    description:
      'Construction of deep tube-well and distribution network for clean and safe drinking water.',
    budget: '95,00,000',
    progress: 100,
    sector: 'Water & Sanitation',
    ward: 'Ward 04',
    featured: false,
    date: '2081-10-30 (B.S.)',
    dateLabel: 'Completed On',
    imageUrl:
      'https://images.unsplash.com/photo-1584467735871-8e85353a8413?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Ward 03 Ranibari Community Urban Park & Solar Lighting',
    status: 'COMPLETED',
    location: 'Ranibari Marg, Ward 3',
    contractor: 'Green Valley Infrastructure',
    description:
      'Development of green recreational urban park with solar street lighting and public amenities.',
    budget: '85,50,000',
    progress: 100,
    sector: 'Public Facilities',
    ward: 'Ward 03',
    featured: false,
    date: '2081-08-20 (B.S.)',
    dateLabel: 'Completed On',
    imageUrl:
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=800&auto=format&fit=crop',
  },
];

export default function App() {
  // Language state: 'en' (English) or 'ne' (नेपाली)
  const [language, setLanguage] = useState(() => getInitialLanguage());

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  // Projects state initialized with default projects as initial or fallback data
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [activeWard, setActiveWard] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeSector, setActiveSector] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to parse current portal from URL (?portal=staff | executive | contractor)
  const getPortalFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('portal');
    if (p === 'staff' || p === 'executive' || p === 'contractor') {
      return p;
    }
    if (p === 'admin') return 'staff';
    if (p === 'exec' || p === 'ward') return 'executive';
    return null;
  };

  // Portal View & Modal States
  const [activePortal, setActivePortal] = useState(() => getPortalFromUrl());
  const [selectedProjectForReport, setSelectedProjectForReport] = useState(null);

  // Sync activePortal with browser history / URL changes
  useEffect(() => {
    const handlePopState = () => {
      setActivePortal(getPortalFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleReturnToPublic = () => {
    setActivePortal(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    const newPath = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.pushState({}, '', newPath);
  };

  const handlePortalChange = (newPortal) => {
    setActivePortal(newPortal);
    const url = new URL(window.location.href);
    if (newPortal) {
      url.searchParams.set('portal', newPortal);
    } else {
      url.searchParams.delete('portal');
    }
    const newPath = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.replaceState({}, '', newPath);
  };

  // Fetch projects from backend API with fallback
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();
    try {
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/projects`);
        if (!response.ok) {
          throw new Error(`Primary endpoint returned status ${response.status}`);
        }
      } catch (primaryErr) {
        // Fallback for local testing if running on default 5000
        response = await fetch('http://localhost:5000/api/projects');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data);
      }
    } catch (err) {
      console.warn('Backend fetch unreached, maintaining initial dataset:', err);
    } finally {
      // Ensure users see a graceful, polished loading transition (at least 600ms)
      const elapsed = Date.now() - startTime;
      const minLoadingDuration = 600;
      if (elapsed < minLoadingDuration) {
        setTimeout(() => {
          setLoading(false);
        }, minLoadingDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Responsive client-side filter logic
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Ward filter
      if (activeWard !== 'All') {
        if (project.ward && project.ward.toLowerCase() !== activeWard.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (activeStatus !== 'All') {
        if (project.status.toUpperCase() !== activeStatus.toUpperCase()) {
          return false;
        }
      }

      // Sector filter
      if (activeSector !== 'All') {
        if (
          project.sector &&
          project.sector.toLowerCase() !== activeSector.toLowerCase()
        ) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = project.title.toLowerCase().includes(q);
        const matchesLocation = project.location.toLowerCase().includes(q);
        const matchesContractor = project.contractor.toLowerCase().includes(q);
        const matchesSector = project.sector
          ? project.sector.toLowerCase().includes(q)
          : false;
        const matchesWard = project.ward
          ? project.ward.toLowerCase().includes(q)
          : false;
        if (
          !matchesTitle &&
          !matchesLocation &&
          !matchesContractor &&
          !matchesSector &&
          !matchesWard
        ) {
          return false;
        }
      }

      return true;
    });
  }, [projects, activeWard, activeStatus, activeSector, searchQuery]);

  // If accessed with ?portal=staff | executive | contractor, render dedicated Portal
  if (activePortal) {
    return (
      <StaffPortal
        portalType={activePortal}
        onPortalChange={handlePortalChange}
        onReturnToPublic={handleReturnToPublic}
        language={language}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      {/* Top Sticky Header */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {/* Hero Section with Panorama Landscape Background & Calligraphy */}
      <Hero />

      {/* Elevated Central Card Container matching reference mockup */}
      <main className="-mt-12 sm:-mt-16 lg:-mt-20 relative z-20 w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-5 mb-14 flex-1">
        <div className="bg-white rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-[#E8EEF5] p-4 sm:p-6 lg:p-7">
          {/* Card Header & Filter Row */}
          <WardFilters
            projectsCount={filteredProjects.length}
            activeWard={activeWard}
            onWardChange={setActiveWard}
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            activeSector={activeSector}
            onSectorChange={setActiveSector}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Project Cards List */}
          <section className="mt-4" aria-label="Infrastructure Projects">
            <ProjectList
              projects={filteredProjects}
              loading={loading}
              error={error}
              onRetry={fetchProjects}
              onReportIssue={(proj) => setSelectedProjectForReport(proj)}
            />
          </section>
        </div>
      </main>

      {/* Clean Civic Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-8 px-3 sm:px-4 lg:px-5 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-center md:text-left">
            <span className="font-semibold text-slate-800 notranslate">
              <span className="text-[#DC143C]">Nagar</span>
              <span className="text-[#156947]">योजना</span>
            </span>
            <span>— Civic Infrastructure Portal · Biratnagar Metropolitan City (All Wards)</span>
          </div>
          <div className="text-center md:text-right text-slate-600 flex flex-col gap-1">
            <span>
              © {new Date().getFullYear()} Nagarयोजना. All rights reserved.
            </span>
            <span className="text-slate-500">
              Developed by{' '}
              <a
                href="https://shrawankarki.com.np"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-800 hover:text-[#156947] underline underline-offset-2 transition-colors"
              >
                shrawankarki.com.np
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Grievance Modal */}
      <ReportIssueModal
        project={selectedProjectForReport}
        isOpen={Boolean(selectedProjectForReport)}
        onClose={() => setSelectedProjectForReport(null)}
      />
    </div>
  );
}

