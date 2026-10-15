import React, { useState, useEffect, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Mail,
  Phone,
  Calendar,
  User,
  Sliders,
  Check,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
} from 'lucide-react';
import { auth, db } from '../firebase';

export default function StaffPortal({ onReturnToPublic, language = 'en' }) {
  // Authentication & User State
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'SUPER_ADMIN' | 'WARD_EXEC'
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Super Admin: Provisioning Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWard, setFormWard] = useState('4');
  const [formTenure, setFormTenure] = useState('2081 - 2086 B.S.');
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(null);
  const [provisionError, setProvisionError] = useState(null);

  // Super Admin: Executives Directory State
  const [executives, setExecutives] = useState([]);
  const [execSearch, setExecSearch] = useState('');
  const [execWardFilter, setExecWardFilter] = useState('All');
  const [directoryLoading, setDirectoryLoading] = useState(false);

  // Ward Executive: Projects & Grievances State
  const [wardProjects, setWardProjects] = useState([]);
  const [wardGrievances, setWardGrievances] = useState([]);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'grievances'
  const [updatingProjectId, setUpdatingProjectId] = useState(null);
  const [projectUpdateFeedback, setProjectUpdateFeedback] = useState({});

  // 1. Firebase Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          // Check claims first
          const tokenResult = await user.getIdTokenResult(true);
          const emailLower = (user.email || '').toLowerCase();
          let detectedRole = tokenResult.claims?.role;
          let profileData = {};

          // Check firestore user profile doc
          try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (userDocSnap.exists()) {
              profileData = userDocSnap.data();
              if (!detectedRole && profileData.role) {
                detectedRole = profileData.role;
              }
            }
          } catch (docErr) {
            console.warn('Could not read user doc from Firestore:', docErr.message);
          }

          // Resolve role strictly from token claims and Firestore database profile
          if (detectedRole === 'SUPER_ADMIN' || profileData.role === 'SUPER_ADMIN') {
            detectedRole = 'SUPER_ADMIN';
          } else if (profileData.wardNumber || tokenResult.claims?.wardNumber) {
            detectedRole = 'WARD_EXEC';
          }

          setUserRole(detectedRole || profileData.role || 'WARD_EXEC');
          setUserProfile({
            ...profileData,
            email: user.email,
            displayName: profileData.fullName || user.displayName || (detectedRole === 'SUPER_ADMIN' ? 'Chief Municipal Admin' : 'Ward Executive'),
            wardNumber: profileData.wardNumber || tokenResult.claims?.wardNumber || null,
            executiveId: profileData.executiveId || null,
          });
        } catch (err) {
          console.error('Error resolving user role:', err);
          setUserRole('SUPER_ADMIN');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Super Admin: Load Executives Directory (Firestore Listener + REST Fallback)
  const fetchExecutivesViaRest = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/ward-execs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.executives) {
          setExecutives(data.executives);
        }
      }
    } catch (err) {
      console.warn('API ward-execs fetch fallback:', err.message);
    }
  };

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN' || !currentUser) return;

    setDirectoryLoading(true);

    // Initial fetch via REST
    fetchExecutivesViaRest();

    // Setup real-time listener on Firestore users collection
    let unsubSnapshot = null;
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'WARD_EXEC'));
      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ uid: doc.id, ...doc.data() });
          });
          list.sort((a, b) => (Number(a.wardNumber) || 0) - (Number(b.wardNumber) || 0));
          if (list.length > 0) {
            setExecutives(list);
          }
          setDirectoryLoading(false);
        },
        (error) => {
          console.warn('Firestore snapshot error for users:', error.message);
          setDirectoryLoading(false);
        }
      );
    } catch (err) {
      console.warn('Could not establish Firestore snapshot:', err.message);
      setDirectoryLoading(false);
    }

    return () => {
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [userRole, currentUser]);

  // 3. Ward Executive: Load Projects and Grievances
  const loadWardWorkspaceData = async (wardNum) => {
    try {
      // Fetch Ward Projects
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const allProj = await projRes.json();
        const wardStr = `Ward ${wardNum < 10 ? '0' + wardNum : wardNum}`;
        const wardStrAlt = `Ward ${wardNum}`;
        const filtered = allProj.filter(
          (p) =>
            p.ward &&
            (p.ward.toLowerCase() === wardStr.toLowerCase() ||
              p.ward.toLowerCase() === wardStrAlt.toLowerCase() ||
              p.ward.toLowerCase().includes(`ward ${wardNum}`))
        );
        setWardProjects(filtered.length > 0 ? filtered : allProj.slice(0, 2));
      }

      // Fetch Grievances
      const grvRes = await fetch(`/api/grievances?wardNumber=${wardNum}`);
      if (grvRes.ok) {
        const grvData = await grvRes.json();
        setWardGrievances(grvData);
      }
    } catch (err) {
      console.warn('Error loading ward workspace data:', err);
    }
  };

  useEffect(() => {
    if (userRole === 'WARD_EXEC' && userProfile?.wardNumber) {
      loadWardWorkspaceData(userProfile.wardNumber);
    }
  }, [userRole, userProfile]);

  // Compute Live Dynamic Preview of Unique Executive ID
  const dynamicPreviewId = useMemo(() => {
    const ward = Number(formWard) || 4;
    const sameWardExecs = executives.filter((e) => Number(e.wardNumber) === ward);
    const seq = sameWardExecs.length + 1;
    return `WE-${ward}-${seq}`;
  }, [formWard, executives]);

  // Metrics for Super Admin Dashboard
  const metrics = useMemo(() => {
    const totalWards = 19;
    const assignedWardsSet = new Set(
      executives
        .filter((e) => e.isActive !== false && e.wardNumber)
        .map((e) => Number(e.wardNumber))
    );
    const assignedCount = assignedWardsSet.size;
    const totalRegistered = executives.length;
    return {
      totalWards,
      assignedCount,
      totalRegistered,
      coveragePercent: Math.round((assignedCount / totalWards) * 100),
    };
  }, [executives]);

  // Filtered Executives List for Directory Table
  const filteredExecutives = useMemo(() => {
    return executives.filter((exec) => {
      if (execWardFilter !== 'All') {
        if (Number(exec.wardNumber) !== Number(execWardFilter)) return false;
      }
      if (execSearch.trim()) {
        const q = execSearch.toLowerCase();
        const matchesName = exec.fullName && exec.fullName.toLowerCase().includes(q);
        const matchesEmail = exec.email && exec.email.toLowerCase().includes(q);
        const matchesPhone = exec.phone && String(exec.phone).includes(q);
        const matchesId = exec.executiveId && exec.executiveId.toLowerCase().includes(q);
        const matchesWard = `ward ${exec.wardNumber}`.includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId && !matchesWard) {
          return false;
        }
      }
      return true;
    });
  }, [executives, execWardFilter, execSearch]);

  // Handler: Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (err) {
      console.error('Sign In Error:', err);
      let msg = 'Failed to sign in. Please verify your municipal credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in Firebase Console. Please enable Email/Password under Authentication → Sign-in method in the Firebase Console.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please verify your municipal credentials.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No municipal staff account registered with this email.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Account temporarily locked for security.';
      }
      setLoginError(msg);
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Handler: Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  // Handler: Provision Ward Executive
  const handleProvisionWardExec = async (e) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setProvisionLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const payload = {
        fullName: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim().toLowerCase(),
        wardNumber: Number(formWard),
        servicePeriod: formTenure.trim() || '2081 - 2086 B.S.',
        executiveId: dynamicPreviewId,
      };

      const res = await fetch('/api/admin/provision-ward-exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision Ward Executive');
      }

      setProvisionSuccess({
        executiveId: data.executiveId || dynamicPreviewId,
        wardNumber: payload.wardNumber,
        email: payload.email,
        fullName: payload.fullName,
        emailSent: data.emailSent,
      });

      // Clear Form Fields
      setFormName('');
      setFormPhone('');
      setFormEmail('');

      // Refresh directory list
      fetchExecutivesViaRest();
    } catch (err) {
      setProvisionError(err.message || 'Error occurred while provisioning executive');
    } finally {
      setProvisionLoading(false);
    }
  };

  // Handler: Update Ward Project
  const handleUpdateProject = async (projectId, newProgress, newStatus) => {
    setUpdatingProjectId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress, status: newStatus }),
      });
      if (res.ok) {
        setProjectUpdateFeedback((prev) => ({
          ...prev,
          [projectId]: 'Updated successfully!',
        }));
        // Update local state
        setWardProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, progress: Number(newProgress), status: newStatus }
              : p
          )
        );
        setTimeout(() => {
          setProjectUpdateFeedback((prev) => {
            const next = { ...prev };
            delete next[projectId];
            return next;
          });
        }, 2500);
      }
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setUpdatingProjectId(null);
    }
  };

  // Handler: Update Grievance Status
  const handleUpdateGrievanceStatus = async (grievanceId, newStatus) => {
    try {
      const res = await fetch(`/api/grievances/${grievanceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setWardGrievances((prev) =>
          prev.map((g) => (g.id === grievanceId ? { ...g, status: newStatus } : g))
        );
      }
    } catch (err) {
      console.error('Failed to update grievance status:', err);
    }
  };

  // Loading Screen while resolving Auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Authenticating Municipal Staff Portal...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: UNAUTHENTICATED SIGN-IN SCREEN
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] text-slate-100 flex flex-col justify-between selection:bg-[#DC143C] selection:text-white">
        {/* Top Minimal Banner */}
        <div className="w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onReturnToPublic}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 text-[#DC143C]" />
            <span>Return to Public Website</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">Municipal Portal Gateway</span>
          </div>
        </div>

        {/* Central Sign-In Container */}
        <div className="w-full max-w-md mx-auto px-4 py-8">
          <div className="bg-white/95 text-slate-900 rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-200/80 backdrop-blur-xl relative overflow-hidden">
            {/* National Accent Ribbon (Biratnagar & Nepal Flag Colors: #003893 & #DC143C) */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003893] via-[#DC143C] to-[#156947]" />

            {/* Header Block with City Gate Logo */}
            <div className="text-center mb-6 pt-2">
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm mb-3">
                <img
                  src="/Biratnagar%20City%20Gate%20Logo.png"
                  alt="Biratnagar City Gate Logo"
                  className="h-16 w-auto object-contain drop-shadow"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                <span className="text-[#DC143C]">Nagar</span>
                <span className="text-[#156947]">योजना</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white ml-1">
                  Staff
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Biratnagar Metropolitan City · Municipal Command Gateway
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                विराटनगर महानगरपालिका · आन्तरिक प्रशासन
              </p>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#DC143C] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Official Municipal Email</span>
                  <span className="text-[11px] text-slate-400 font-normal">Gmail or .gov.np</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. executive.ward4@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003893] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Passphrase / Password</span>
                  <span className="text-[11px] text-slate-400 font-normal">Encrypted</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003893] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#003893] to-[#0A4BB5] hover:from-[#002D75] hover:to-[#003893] shadow-lg shadow-blue-900/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 cursor-pointer"
              >
                {loginSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Authorization...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Sign In to Staff Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Authorized municipal staff and designated ward executives only. Unauthorized access attempts are audited and logged.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
          Biratnagar Metropolitan City (विराटनगर महानगरपालिका) · Nagarयोजना Command System
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SUPER ADMIN MUNICIPAL COMMAND PORTAL
  // ==========================================
  if (userRole === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 selection:bg-[#DC143C] selection:text-white flex flex-col font-sans">
        {/* Command Top Header Bar */}
        <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left: Branding & Role Badge */}
            <div className="flex items-center gap-3">
              <img
                src="/Biratnagar%20City%20Gate%20Logo.png"
                alt="City Gate Logo"
                className="h-10 w-auto object-contain drop-shadow"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-white tracking-tight">
                    <span className="text-[#DC143C]">Nagar</span>
                    <span className="text-[#2E8B57]">योजना</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#DC143C]/20 text-[#FF6B81] border border-[#DC143C]/40">
                    Super Admin
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Municipal Command & Executive Governance Hub
                </div>
              </div>
            </div>

            {/* Right: User Information & Exit Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onReturnToPublic}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="View public transparency portal"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>Return to Public Site</span>
              </button>

              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">
                  Pratyush Karki
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser.email}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Command Dashboard */}
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
          {/* Executive Sub-Header & Return for Mobile */}
          <div className="flex sm:hidden justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#DC143C]" />
              <span>Public Site</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentUser.email}
            </span>
          </div>

          {/* Metrics Overview Bar */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Municipal Wards
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  19
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Biratnagar Metropolitan City
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Assigned Ward Executives
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                  {metrics.assignedCount}{' '}
                  <span className="text-sm font-normal text-slate-500">/ 19</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.coveragePercent}% Municipal Wards Covered
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Active Credentials
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {metrics.totalRegistered}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verified Executive Accounts
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  System Security Status
                </p>
                <p className="text-lg sm:text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  Active & Synced
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Firebase Role-Based Auth
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </section>

          {/* Dual Column: Provision Form (Left) & Real-time Executives Directory (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Column 1: Provision Ward Executive Form (5 Cols) */}
            <section className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Provision Ward Executive
                  </h2>
                  <p className="text-xs text-slate-400">
                    Issue credentials & onboard ward executive authority
                  </p>
                </div>
              </div>

              {/* Success Alert */}
              {provisionSuccess && (
                <div className="mb-5 p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-2xl text-xs text-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Executive Successfully Provisioned!</span>
                  </div>
                  <p className="text-slate-300">
                    Assigned Unique ID:{' '}
                    <strong className="text-white font-mono bg-emerald-900/60 px-2 py-0.5 rounded">
                      {provisionSuccess.executiveId}
                    </strong>
                  </p>
                  <p className="text-slate-300">
                    Designated Ward:{' '}
                    <span className="font-semibold text-white">
                      Ward {provisionSuccess.wardNumber}
                    </span>{' '}
                    ({provisionSuccess.fullName})
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    {provisionSuccess.emailSent
                      ? `Credentials and temporary password dispatched to ${provisionSuccess.email}`
                      : `Created user ${provisionSuccess.email} in Firebase Auth system.`}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {provisionError && (
                <div className="mb-5 p-4 bg-red-950/40 border border-red-800/50 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-red-300">Provisioning Failed</p>
                    <p className="text-slate-300">{provisionError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleProvisionWardExec} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Executive Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Santosh Adhikari"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official Executive Gmail *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. exec.ward4.biratnagar@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Ward Selection & Service Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Designated Ward *
                    </label>
                    <select
                      value={formWard}
                      onChange={(e) => setFormWard(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 19 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          Ward {w < 10 ? `0${w}` : w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tenure / Service Period
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formTenure}
                        onChange={(e) => setFormTenure(e.target.value)}
                        placeholder="2081 - 2086 B.S."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* LIVE DYNAMIC PREVIEW OF UNIQUE ID */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-950 border border-blue-900/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider block">
                      Live Dynamic ID Preview
                    </span>
                    <span className="text-xs text-slate-400">
                      Auto-computed municipal index
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 text-sm font-mono font-bold tracking-wider shadow-inner">
                      {dynamicPreviewId}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={provisionLoading}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {provisionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Provisioning Executive & Creating User...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Provision Executive & Dispatch Credentials</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Column 2: Real-time Ward Executives Directory (7 Cols) */}
            <section className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Ward Executives Directory</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {filteredExecutives.length} Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time registered authorities across Biratnagar wards
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchExecutivesViaRest}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Directory</span>
                </button>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={execSearch}
                    onChange={(e) => setExecSearch(e.target.value)}
                    placeholder="Search by name, ID, email, phone..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-5 relative">
                  <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={execWardFilter}
                    onChange={(e) => setExecWardFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Wards (1–19)</option>
                    {Array.from({ length: 19 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Ward {w < 10 ? `0${w}` : w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table / Cards Container */}
              <div className="pt-2">
                {directoryLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-xs">Loading directory...</span>
                  </div>
                ) : filteredExecutives.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-300">
                      No Ward Executives Found
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {execSearch || execWardFilter !== 'All'
                        ? 'No executives match your search or ward filter criteria.'
                        : 'No ward executives have been provisioned yet. Use the form on the left to onboard one.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                    {filteredExecutives.map((exec, idx) => (
                      <div
                        key={exec.uid || idx}
                        className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-mono font-bold text-xs flex-shrink-0 mt-0.5">
                            W{exec.wardNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-white">
                                {exec.fullName || 'Ward Executive'}
                              </h3>
                              <span className="font-mono text-[11px] font-bold text-blue-300 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md">
                                {exec.executiveId || `WE-${exec.wardNumber}-1`}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {exec.email}
                              </span>
                              {exec.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {exec.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Clock className="w-3 h-3" />
                                {exec.servicePeriod || '2081 - 2086 B.S.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right flex-shrink-0 self-end sm:self-center">
                          <span className="text-[11px] font-medium text-slate-400 block">
                            Ward Jurisdiction
                          </span>
                          <span className="text-xs font-bold text-white">
                            Biratnagar Ward {exec.wardNumber}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: WARD EXECUTIVE WORKSPACE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 flex flex-col font-sans">
      {/* Ward Executive Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Biratnagar%20City%20Gate%20Logo.png"
              alt="City Gate Logo"
              className="h-10 w-auto object-contain drop-shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight">
                  <span className="text-[#DC143C]">Nagar</span>
                  <span className="text-[#156947]">योजना</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Ward {userProfile?.wardNumber || '04'} Executive
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Biratnagar Metropolitan City · Executive Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Portal</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ward Executive Main Container */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Profile & Executive Badge Banner */}
        <section className="bg-gradient-to-r from-[#003893] to-[#0A4BB5] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                ID: {userProfile?.executiveId || `WE-${userProfile?.wardNumber || 4}-1`}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Authorized Executive
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ward {userProfile?.wardNumber || '04'} Executive Workspace
            </h1>
            <p className="text-sm text-blue-100">
              Executive: <strong>{userProfile?.displayName || userProfile?.fullName || 'Ward Executive'}</strong> · Official Contact: {currentUser.email}
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </button>
          </div>
        </section>

        {/* Tab Controls: Ward Projects vs Citizen Grievances */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Ward Projects ({wardProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grievances')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'grievances'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Citizen Grievances ({wardGrievances.length})</span>
          </button>
        </div>

        {/* TAB 1: Real-Time Projects in Ward */}
        {activeTab === 'projects' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Infrastructure Projects in Ward {userProfile?.wardNumber || '04'}
                </h2>
                <p className="text-xs text-slate-500">
                  Update project completion milestones, physical progress, and status.
                </p>
              </div>
            </div>

            {wardProjects.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  No projects currently listed for Ward {userProfile?.wardNumber || '04'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {wardProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {project.sector || 'Public Works'}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            project.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : project.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {project.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {project.location} · Contractor: {project.contractor}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    {/* Progress Slider & Status Editor */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Physical Progress</span>
                          <span className="font-mono text-emerald-600 font-bold">
                            {project.progress}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={project.progress || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWardProjects((prev) =>
                              prev.map((p) =>
                                p.id === project.id ? { ...p, progress: val } : p
                              )
                            );
                          }}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={project.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWardProjects((prev) =>
                              prev.map((p) =>
                                p.id === project.id ? { ...p, status: val } : p
                              )
                            );
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="ACTIVE">Status: ACTIVE</option>
                          <option value="DELAYED">Status: DELAYED</option>
                          <option value="COMPLETED">Status: COMPLETED</option>
                        </select>

                        <button
                          type="button"
                          disabled={updatingProjectId === project.id}
                          onClick={() =>
                            handleUpdateProject(project.id, project.progress, project.status)
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                        >
                          {updatingProjectId === project.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Save Progress</span>
                        </button>
                      </div>

                      {projectUpdateFeedback[project.id] && (
                        <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {projectUpdateFeedback[project.id]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Citizen Grievances in Ward */}
        {activeTab === 'grievances' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Citizen Grievance Queue · Ward {userProfile?.wardNumber || '04'}
              </h2>
              <p className="text-xs text-slate-500">
                Issues reported by local residents requiring executive review or field inspection.
              </p>
            </div>

            {wardGrievances.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  No Pending Grievances
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All citizen reports for Ward {userProfile?.wardNumber || '04'} are clear.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {wardGrievances.map((grv) => (
                  <div
                    key={grv.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {grv.id}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          {grv.issueType}
                        </span>
                        <span className="text-xs text-slate-400">
                          · On: {grv.projectTitle}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        "{grv.description}"
                      </p>
                      <p className="text-xs text-slate-500">
                        Reported by: <strong>{grv.name}</strong> · Contact: {grv.phone} · Date: {new Date(grv.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <span className="text-xs font-semibold text-slate-600">
                        Action:
                      </span>
                      <select
                        value={grv.status}
                        onChange={(e) => handleUpdateGrievanceStatus(grv.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                          grv.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : grv.status === 'INVESTIGATING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        <option value="OPEN">Mark OPEN</option>
                        <option value="INVESTIGATING">Mark INVESTIGATING</option>
                        <option value="RESOLVED">Mark RESOLVED</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
