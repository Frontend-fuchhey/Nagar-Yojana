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
    title: 'Ward 04 Drainage Upgrade',
    titleEn: 'Ward 04 Drainage Upgrade',
    titleNe: 'वडा ०४ ढल निकास स्तरोन्नति',
    status: 'ACTIVE',
    location: 'Chundevi Marg, Ward 4',
    locationNe: 'चुण्डेवी मार्ग, वडा ४',
    contractor: 'Pragati Upabhokta Samiti',
    contractorNe: 'प्रगति उपभोक्ता समिति',
    description:
      'Upgradation of existing drainage system to improve water flow and reduce flooding in the area.',
    descriptionNe:
      'पानीको बहाव सुधार गर्न तथा बाढी नियन्त्रण गर्न विद्यमान ढल निकास प्रणालीको स्तरोन्नति।',
    budget: '1,25,00,000',
    progress: 65,
    sector: 'Roads & Drainage',
    ward: 'Ward 04',
    featured: true,
    date: '2081-11-15 (B.S.)',
    dateLabel: 'Started',
    dateLabelNe: 'सुरु भएको',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPVMH6dHGMIv-ZDQlBOplG_QdnaGymOA5idJdIrIlku8-TlEhAGIppPpj_&s=10',
  },
  {
    id: 2,
    title: 'Ward 04 Deep Tube-Well & Distribution Network',
    titleEn: 'Ward 04 Deep Tube-Well & Distribution Network',
    titleNe: 'वडा ०४ डिप ट्युबवेल तथा वितरण सञ्जाल',
    status: 'COMPLETED',
    location: 'Maharajgunj, Ward 4',
    locationNe: 'महाराजगञ्ज, वडा ४',
    contractor: 'Himalayan Water Infra Ltd.',
    contractorNe: 'हिमालयन वाटर इन्फ्रा प्रा. लि.',
    description:
      'Construction of deep tube-well and distribution network for clean and safe drinking water.',
    descriptionNe:
      'स्वच्छ तथा सुरक्षित खानेपानीका लागि डिप ट्युबवेल तथा पाइपलाइन वितरण सञ्जाल निर्माण।',
    budget: '95,00,000',
    progress: 100,
    sector: 'Water & Sanitation',
    ward: 'Ward 04',
    featured: false,
    date: '2081-10-30 (B.S.)',
    dateLabel: 'Completed On',
    dateLabelNe: 'सम्पन्न मिति',
    imageUrl:
      'https://images.unsplash.com/photo-1584467735871-8e85353a8413?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Ward 03 Ranibari Community Urban Park & Solar Lighting',
    titleEn: 'Ward 03 Ranibari Community Urban Park & Solar Lighting',
    titleNe: 'वडा ०३ रानीबारी सामुदायिक सहरी पार्क तथा सौर्य बत्ती',
    status: 'COMPLETED',
    location: 'Ranibari Marg, Ward 3',
    locationNe: 'रानीबारी मार्ग, वडा ३',
    contractor: 'Green Valley Infrastructure',
    contractorNe: 'ग्रीन भ्याली इन्फ्रास्ट्रक्चर',
    description:
      'Development of green recreational urban park with solar street lighting and public amenities.',
    descriptionNe:
      'सौर्य सडक बत्ती र सार्वजनिक सुविधासहित हरियाली मनोरञ्जनात्मक सहरी पार्कको विकास।',
    budget: '85,50,000',
    progress: 100,
    sector: 'Public Facilities',
    ward: 'Ward 03',
    featured: false,
    date: '2081-08-20 (B.S.)',
    dateLabel: 'Completed On',
    dateLabelNe: 'सम्पन्न मिति',
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

  // Projects state initialized directly with the specified projects
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
        const matchesTitle =
          project.title.toLowerCase().includes(q) ||
          (trans?.title && trans.title.toLowerCase().includes(q));
        const matchesLocation =
          project.location.toLowerCase().includes(q) ||
          (trans?.location && trans.location.toLowerCase().includes(q));
        const matchesContractor =
          project.contractor.toLowerCase().includes(q) ||
          (trans?.contractor && trans.contractor.toLowerCase().includes(q));
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      {/* Top Sticky Header */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        t={t}
        onStaffLoginClick={() => setIsStaffLoginOpen(true)}
      />

      {/* Hero Section with Panorama Landscape Background & Calligraphy */}
      <Hero language={language} t={t} />

      {/* Elevated Central Card Container matching reference mockup */}
      <main className="-mt-12 sm:-mt-16 lg:-mt-20 relative z-20 w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-5 mb-14 flex-1">
        <div className="bg-white rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.05)] border border-[#E8EEF5] p-4 sm:p-6 lg:p-7">
          {/* Card Header & Filter Row */}
          <WardFilters
            language={language}
            t={t}
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
              language={language}
              t={t}
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
            <span className="font-semibold text-slate-800">
              {t.portalName}{t.portalSuffix}
            </span>
            <span>— {t.footerCivic}</span>
          </div>
          <div className="text-center md:text-right text-slate-600 flex flex-col gap-1">
            <span>
              {t.copyrightPrefix} {new Date().getFullYear()} {t.copyrightText || `${t.portalName}${t.portalSuffix}. All rights reserved.`}
            </span>
            <span className="text-slate-500">
              {t.developedBy || 'Developed by'}{' '}
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

