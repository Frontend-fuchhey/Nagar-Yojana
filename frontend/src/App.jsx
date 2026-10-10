import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WardFilters from './components/WardFilters';
import ProjectList from './components/ProjectList';
import ReportIssueModal from './components/ReportIssueModal';
import StaffLoginModal from './components/StaffLoginModal';
import { translations, PROJECT_TRANSLATIONS } from './translations';

// Initial verified civic infrastructure projects for Biratnagar Metropolitan City
const DEFAULT_PROJECTS = [
  {
    id: 1,
    title: 'WARD 04 DRAINAGE UPGRADE',
    status: 'ACTIVE',
    location: 'Chundevi Marg, Ward 4',
    contractor: 'Pragati Upabhokta Samiti',
    budget: '1,25,00,000',
    progress: 65,
    sector: 'Roads & Drainage',
    ward: 'Ward 04',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVMH6dHGMIv-ZDQlBOplG_QdnaGymOA5idJdIrIlku8-TlEhAGIppPpj_&s=10',
  },
  {
    id: 2,
    title: 'WARD 04 DEEP TUBE-WELL & DISTRIBUTION NETWORK',
    status: 'COMPLETED',
    location: 'Maharajgunj, Ward 4',
    contractor: 'Himalayan Water Infra Ltd.',
    budget: '95,00,000',
    progress: 100,
    sector: 'Water & Sanitation',
    ward: 'Ward 04',
    imageUrl:
      'https://images.unsplash.com/photo-1584467735871-8e85353a8413?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'WARD 03 RANIBARI COMMUNITY URBAN PARK & SOLAR LIGHTING',
    status: 'COMPLETED',
    location: 'Ranibari Marg, Ward 3',
    contractor: 'Green Valley Infrastructure',
    budget: '85,50,000',
    progress: 100,
    sector: 'Public Facilities',
    ward: 'Ward 03',
    imageUrl:
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=800&auto=format&fit=crop',
  },
];

export default function App() {
  // Language state: 'en' (English) or 'ne' (नेपाली)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('nagar_lang') || 'en';
  });

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('nagar_lang', lang);
  };

  const t = translations[language] || translations.en;

  // Projects state initialized directly with the 3 specified projects
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter States
  const [activeWard, setActiveWard] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeSector, setActiveSector] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [selectedProjectForReport, setSelectedProjectForReport] = useState(null);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);

  // Fetch projects from backend API with fallback
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      try {
        response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error(`Proxy returned status ${response.status}`);
        }
      } catch (proxyErr) {
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
      // Keep DEFAULT_PROJECTS intact without blocking the user
    } finally {
      setLoading(false);
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
        const trans = PROJECT_TRANSLATIONS[project.id];
        const matchesTitle = project.title.toLowerCase().includes(q) || (trans?.title && trans.title.toLowerCase().includes(q));
        const matchesLocation = project.location.toLowerCase().includes(q) || (trans?.location && trans.location.toLowerCase().includes(q));
        const matchesContractor = project.contractor.toLowerCase().includes(q) || (trans?.contractor && trans.contractor.toLowerCase().includes(q));
        const matchesSector = project.sector ? project.sector.toLowerCase().includes(q) : false;
        const matchesWard = project.ward ? project.ward.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesLocation && !matchesContractor && !matchesSector && !matchesWard) {
          return false;
        }
      }

      return true;
    });
  }, [projects, activeWard, activeStatus, activeSector, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-red-100 selection:text-red-900">
      {/* Full-width Integrated Top Navigation Bar with Language Switcher */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        t={t}
        onStaffLoginClick={() => setIsStaffLoginOpen(true)}
      />

      {/* Main Full-Screen Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex-1">
        {/* Hero Section */}
        <Hero t={t} />

        {/* Ward Context & Multi-Level Filters */}
        <WardFilters
          language={language}
          t={t}
          activeWard={activeWard}
          onWardChange={setActiveWard}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          activeSector={activeSector}
          onSectorChange={setActiveSector}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Project List */}
        <section className="mt-2" aria-label="Civic Infrastructure Projects">
          <ProjectList
            projects={filteredProjects}
            loading={loading}
            error={error}
            language={language}
            t={t}
            onRetry={fetchProjects}
            onReportIssue={(proj) => setSelectedProjectForReport(proj)}
          />
        </section>
      </main>

      {/* Full-width Civic Footer with Portfolio Link and Copyright */}
      <footer className="w-full border-t border-gray-200 bg-gray-50/80 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-center md:text-left">
            <span className="font-semibold text-gray-800">{t.portalName}{t.portalSuffix}</span>
            <span>— {language === 'ne' ? 'नागरिक पूर्वाधार पोर्टल · विराटनगर महानगरपालिका (सम्पूर्ण वडाहरू)' : 'Civic Infrastructure Portal · Biratnagar Metropolitan City (All Wards)'}</span>
          </div>
          <div className="text-center md:text-right text-gray-600">
            <span>{t.copyrightPrefix} {new Date().getFullYear()} {t.copyrightSuffix} </span>
            <a
              href="https://shrawankarki.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:text-[#DC143C] underline underline-offset-2 transition-colors"
            >
              shrawankarki.com.np
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ReportIssueModal
        project={selectedProjectForReport}
        language={language}
        t={t}
        isOpen={Boolean(selectedProjectForReport)}
        onClose={() => setSelectedProjectForReport(null)}
      />

      <StaffLoginModal
        isOpen={isStaffLoginOpen}
        t={t}
        onClose={() => setIsStaffLoginOpen(false)}
      />
    </div>
  );
}
