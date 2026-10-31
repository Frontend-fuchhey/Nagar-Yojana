import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Building2,
  Users,
  UserPlus,
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
  UserCheck,
  KeyRound,
  Check,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Briefcase,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { API_BASE_URL } from '../apiConfig';

const API_BASE = API_BASE_URL;

export default function StaffPortal({ portalType = 'staff', onPortalChange, onReturnToPublic, language = 'en' }) {
  // Authentication & User State
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'SUPER_ADMIN' | 'WARD_EXEC' | 'CONTRACTOR'
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('email');
      return p ? p.trim() : '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [lockInfo, setLockInfo] = useState(null); // { email, until } when an email is locked
  const [inactivityNotice, setInactivityNotice] = useState('');

  // Ward Executive: Create Project Form State
  const [createProjTitle, setCreateProjTitle] = useState('');
  const [createProjSector, setCreateProjSector] = useState('Roads & Drainage');
  const [createProjLocation, setCreateProjLocation] = useState('');
  const [createProjBudget, setCreateProjBudget] = useState('');
  const [createProjTargetDate, setCreateProjTargetDate] = useState('');
  const [createProjDescription, setCreateProjDescription] = useState('');
  const [createProjLoading, setCreateProjLoading] = useState(false);
  const [createProjFeedback, setCreateProjFeedback] = useState(null);

  // Ward Executive: Appoint Contractor Form State
  const [contractorName, setContractorName] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [contractorProjectId, setContractorProjectId] = useState('');
  const [contractorLoading, setContractorLoading] = useState(false);
  const [contractorSuccessData, setContractorSuccessData] = useState(null);
  const [contractorError, setContractorError] = useState(null);
  const [wardContractors, setWardContractors] = useState([]);
  const [resendingContractorUid, setResendingContractorUid] = useState(null);
  const [revokingContractorUid, setRevokingContractorUid] = useState(null);

  // Contractor Portal State
  const [contractorProjects, setContractorProjects] = useState([]);
  const [contractorUpdatingId, setContractorUpdatingId] = useState(null);
  const [contractorFeedbackMsg, setContractorFeedbackMsg] = useState({});
  const [contractorFormState, setContractorFormState] = useState({}); // { [projectId]: { progress, status, remarks } }

  // Municipal Maintenance State (when false, Ward Executive & staff logins are frozen; only Super Admin can log in)
  const [systemActive, setSystemActive] = useState(true);
  const [systemToggling, setSystemToggling] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const isSigningInRef = useRef(false);
  const systemActiveRef = useRef(systemActive);
  systemActiveRef.current = systemActive;

  // Security Policy: 15 minutes of user inactivity triggers auto-logout
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
  const lastActiveTimeRef = useRef(Date.now());

  // Super Admin: Provisioning Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWard, setFormWard] = useState('4');
  const [formTenure, setFormTenure] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const calendarRef = useRef(null);
  const nativeDateRef = useRef(null);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(null);
  const [provisionError, setProvisionError] = useState(null);

  // Super Admin: Executives Directory State
  const [executives, setExecutives] = useState([]);
  const [execSearch, setExecSearch] = useState('');
  const [execWardFilter, setExecWardFilter] = useState('All');
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [adminTaskTab, setAdminTaskTab] = useState('all'); // 'all' | 'executives' | 'users' | 'lockouts'
  const [systemUsers, setSystemUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [resettingUserEmail, setResettingUserEmail] = useState(null);
  const [userResetFeedback, setUserResetFeedback] = useState({}); // { [email]: { type, text } }
  const [showProvisionForm, setShowProvisionForm] = useState(true);
  const [revokingUid, setRevokingUid] = useState(null);
  const [resendingUid, setResendingUid] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Ward Executive: Projects & Grievances State
  const [wardProjects, setWardProjects] = useState([]);
  const [wardGrievances, setWardGrievances] = useState([]);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'grievances'
  const [updatingProjectId, setUpdatingProjectId] = useState(null);
  const [projectUpdateFeedback, setProjectUpdateFeedback] = useState({});

  // Helper: auto-logout on session expiration / inactivity
  const handleAutoLogout = async (reason = 'inactivity') => {
    try {
      sessionStorage.removeItem('staff_session_active');
      localStorage.removeItem('staff_last_active');
      await signOut(auth);
    } catch (err) {
      console.error('Auto logout error:', err);
    } finally {
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      setLoginPassword('');
      setShowPassword(false);
      if (reason === 'inactivity') {
        setInactivityNotice(
          'For municipal security, your session ended due to 15 minutes of inactivity. Please sign in again.'
        );
      }
    }
  };

  // Security Policy: Whenever user enters or leaves a session, immediately clear password state from memory
  useEffect(() => {
    if (currentUser) {
      setLoginPassword('');
      setShowPassword(false);
    }
  }, [currentUser]);

  // 1. Firebase Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Skip observer race when handleSignIn is actively completing sign-in
      if (isSigningInRef.current) return;

      setAuthLoading(true);
      if (user) {
        // Enforce session boundary (Option A) and inactivity check (Option C)
        const isSessionActive = sessionStorage.getItem('staff_session_active');
        const lastActiveStr = localStorage.getItem('staff_last_active');
        const lastActive = lastActiveStr ? Number(lastActiveStr) : null;
        const isIdleExpired = Boolean(lastActive && Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS);

        if (!isSessionActive || isIdleExpired) {
          try {
            sessionStorage.removeItem('staff_session_active');
            localStorage.removeItem('staff_last_active');
            await signOut(auth);
          } catch (e) {}
          setCurrentUser(null);
          setUserRole(null);
          setUserProfile(null);
          setLoginPassword('');
          setShowPassword(false);
          if (isIdleExpired) {
            setInactivityNotice(
              'For municipal security, your session ended due to 15 minutes of inactivity. Please sign in again.'
            );
          }
          setAuthLoading(false);
          return;
        }

        try {
          // Check claims first
          const tokenResult = await user.getIdTokenResult(true);
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
          } else if (
            detectedRole === 'CONTRACTOR' ||
            profileData.role === 'CONTRACTOR' ||
            profileData.contractorId
          ) {
            detectedRole = 'CONTRACTOR';
          } else if (profileData.wardNumber || tokenResult.claims?.wardNumber) {
            detectedRole = 'WARD_EXEC';
          }

          const resolvedRole = detectedRole || profileData.role || 'WARD_EXEC';

          // If Municipal Maintenance Break is active, freeze login for all roles except SUPER_ADMIN
          if (resolvedRole !== 'SUPER_ADMIN') {
            let isMaintActive = false;
            try {
              const maintSnap = await getDoc(doc(db, 'systemSettings', 'maintenance'));
              if (maintSnap.exists()) {
                const mData = maintSnap.data();
                if (mData.systemActive === false || mData.maintenanceMode === true) {
                  isMaintActive = true;
                }
              }
            } catch (mErr) {
              if (!systemActiveRef.current) isMaintActive = true;
            }

            if (isMaintActive) {
              sessionStorage.removeItem('staff_session_active');
              localStorage.removeItem('staff_last_active');
              await signOut(auth);
              setCurrentUser(null);
              setUserRole(null);
              setUserProfile(null);
              setLoginError(
                'Municipal System Maintenance: Staff and Ward Executive logins are temporarily frozen. Only the Chief Municipal Administrator (Super Admin) may access the system.'
              );
              setAuthLoading(false);
              return;
            }
          }

          // Route Separation & Safe Redirection
          if (resolvedRole === 'WARD_EXEC' && portalType !== 'executive') {
            onPortalChange?.('executive');
          } else if (resolvedRole === 'CONTRACTOR' && portalType !== 'contractor') {
            onPortalChange?.('contractor');
          } else if (resolvedRole === 'SUPER_ADMIN' && portalType !== 'staff') {
            onPortalChange?.('staff');
          }

          setUserRole(resolvedRole);
          setUserProfile({
            ...profileData,
            email: user.email,
            displayName:
              profileData.companyName ||
              profileData.fullName ||
              user.displayName ||
              (resolvedRole === 'SUPER_ADMIN'
                ? 'Chief Municipal Admin'
                : resolvedRole === 'CONTRACTOR'
                ? 'Civic Contractor'
                : 'Ward Executive'),
            wardNumber: profileData.wardNumber || tokenResult.claims?.wardNumber || null,
            executiveId: profileData.executiveId || null,
            contractorId: profileData.contractorId || null,
            projectId: profileData.projectId || null,
            projectTitle: profileData.projectTitle || null,
          });
          setCurrentUser(user);
        } catch (err) {
          console.error('Error resolving user role:', err);
          setUserRole('WARD_EXEC');
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: Force immediate eviction of non-Super Admin users when maintenance is active
  const evictNonSuperAdmin = async (msg) => {
    try {
      sessionStorage.removeItem('staff_session_active');
      localStorage.removeItem('staff_last_active');
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out during eviction notice:', e);
    } finally {
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      setLoginPassword('');
      setShowPassword(false);
      setLoginError(
        msg ||
        'Municipal System Maintenance: Your session was closed because the system is currently in a maintenance break. Ward Executive logins are frozen.'
      );
    }
  };

  // 1c. Instant Cross-Tab Storage Sync (0ms eviction if toggled in another tab/window of same browser)
  useEffect(() => {
    const handleStorageSync = (e) => {
      if (e.key === 'municipal_system_active' || e.key === 'municipal_system_last_toggle') {
        const stored = localStorage.getItem('municipal_system_active');
        if (stored !== null) {
          const isActive = stored === 'true';
          setSystemActive(isActive);
          if (!isActive && currentUser && userRole && userRole !== 'SUPER_ADMIN') {
            evictNonSuperAdmin();
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [currentUser, userRole]);

  // 1d. Real-Time Municipal System Maintenance State Observer (Heartbeat Polling + Firestore Push)
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/system-status?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const isActive = Boolean(data.systemActive);
          setSystemActive(isActive);
          localStorage.setItem('municipal_system_active', String(isActive));
          if (!isActive && currentUser && userRole && userRole !== 'SUPER_ADMIN') {
            evictNonSuperAdmin();
          }
        }
      } catch (err) {
        // network catch
      }
    };

    // Check immediately on mount
    checkSystemStatus();

    // Fast active heartbeat: checks every 3 seconds if logged in, 6 seconds on login page
    const intervalId = setInterval(checkSystemStatus, currentUser ? 3000 : 6000);

    // Immediate check on tab focus or visibility change (instant when switching back to executive tab)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSystemStatus();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Also attach Firestore onSnapshot for real-time push
    const unsub = onSnapshot(
      doc(db, 'systemSettings', 'maintenance'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isActive = data.systemActive !== undefined ? Boolean(data.systemActive) : !data.maintenanceMode;
          setSystemActive(isActive);
          localStorage.setItem('municipal_system_active', String(isActive));
          if (!isActive && currentUser && userRole && userRole !== 'SUPER_ADMIN') {
            evictNonSuperAdmin();
          }
        }
      },
      () => {
        // fallback to polling
      }
    );

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      unsub();
    };
  }, [currentUser, userRole]);

  // 1e. Auto-evict non-Super Admin users immediately whenever systemActive becomes false
  useEffect(() => {
    if (!systemActive && currentUser && userRole && userRole !== 'SUPER_ADMIN') {
      evictNonSuperAdmin();
    }
  }, [systemActive, currentUser, userRole]);

  // 1b. Inactivity / Idle Auto-Logout Tracker (Option C)
  useEffect(() => {
    if (!currentUser) return;

    // Reset last active timestamp for current user session
    const initialTime = Date.now();
    lastActiveTimeRef.current = initialTime;
    try {
      localStorage.setItem('staff_last_active', String(initialTime));
    } catch (e) {}

    // Throttle user activity tracking (at most once every 3 seconds)
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActiveTimeRef.current >= 3000) {
        lastActiveTimeRef.current = now;
        try {
          localStorage.setItem('staff_last_active', String(now));
        } catch (e) {}
      }
    };

    const checkInactivity = () => {
      const now = Date.now();
      let lastActive = lastActiveTimeRef.current;
      try {
        const stored = localStorage.getItem('staff_last_active');
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > 0) {
            lastActive = parsed;
          }
        }
      } catch (e) {}

      if (now - lastActive >= INACTIVITY_TIMEOUT_MS) {
        handleAutoLogout('inactivity');
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Periodic check every 15 seconds
    const intervalId = setInterval(checkInactivity, 15000);

    // Immediate check on visibility/focus change (e.g. waking from sleep or tab refocus)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [currentUser]);

  // Super Admin: Send Password Reset Email to User
  const handleResetPassword = async (userObj) => {
    const targetEmail = userObj?.email;
    if (!targetEmail) return;

    setResettingUserEmail(targetEmail);
    setUserResetFeedback((prev) => ({ ...prev, [targetEmail]: null }));

    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      let sent = false;

      // 1. Attempt backend reset-password endpoint with Resend and Admin SDK
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ email: targetEmail, name: userObj.fullName }),
        });
        if (res.ok) {
          const data = await res.json();
          sent = true;
        }
      } catch (apiErr) {
        console.warn('Backend reset password error, falling back to Firebase Auth client:', apiErr);
      }

      // 2. Client-side Firebase Auth fallback
      if (!sent) {
        await sendPasswordResetEmail(auth, targetEmail);
      }

      setUserResetFeedback((prev) => ({
        ...prev,
        [targetEmail]: { type: 'success', text: `Password reset email sent to ${targetEmail}!` },
      }));
    } catch (err) {
      console.error('Password reset error:', err);
      try {
        await sendPasswordResetEmail(auth, targetEmail);
        setUserResetFeedback((prev) => ({
          ...prev,
          [targetEmail]: { type: 'success', text: `Password reset email sent to ${targetEmail}!` },
        }));
      } catch (clientErr) {
        setUserResetFeedback((prev) => ({
          ...prev,
          [targetEmail]: { type: 'error', text: clientErr.message || 'Failed to send reset email.' },
        }));
      }
    } finally {
      setResettingUserEmail(null);
      setTimeout(() => {
        setUserResetFeedback((prev) => {
          const next = { ...prev };
          delete next[targetEmail];
          return next;
        });
      }, 5000);
    }
  };

  // Super Admin: Load All System Users Directory
  const fetchSystemUsers = async () => {
    try {
      if (!currentUser) return;
      setUsersLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.users) {
          setSystemUsers(data.users);
        }
      }
    } catch (err) {
      console.warn('API users fetch fallback:', err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  // 2. Super Admin: Load Executives Directory (Firestore Listener + REST Fallback)
  const fetchExecutivesViaRest = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/ward-execs`, {
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
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN' || !currentUser) return;

    setDirectoryLoading(true);

    // Initial fetch via REST
    fetchExecutivesViaRest();
    fetchSystemUsers();

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
          setExecutives(list);
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
      const projRes = await fetch(`${API_BASE}/api/projects`);
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

      // Fetch Grievances (Authenticated Staff)
      const token = currentUser ? await currentUser.getIdToken() : null;
      const grvRes = await fetch(`${API_BASE}/api/grievances?wardNumber=${wardNum}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (grvRes.ok) {
        const grvData = await grvRes.json();
        setWardGrievances(grvData);
      }
    } catch (err) {
      console.warn('Error loading ward workspace data:', err);
    }
  };

  // Load appointed contractors for this Ward Executive's ward
  const loadWardContractors = async () => {
    try {
      const token = currentUser ? await currentUser.getIdToken() : null;
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/executive/contractors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWardContractors(data.contractors || []);
      }
    } catch (err) {
      console.warn('Could not fetch contractors:', err.message);
    }
  };

  // Load projects assigned to this logged-in Contractor
  const loadContractorProjects = async () => {
    try {
      const projRes = await fetch(`${API_BASE}/api/projects`);
      if (projRes.ok) {
        const allProj = await projRes.json();
        const myUid = currentUser?.uid;
        const myEmail = (currentUser?.email || '').toLowerCase();
        const assigned = allProj.filter(
          (p) =>
            (p.contractorId && p.contractorId === myUid) ||
            (p.contractorEmail && p.contractorEmail.toLowerCase() === myEmail) ||
            (userProfile?.projectId && String(p.id) === String(userProfile?.projectId))
        );
        setContractorProjects(assigned);

        // Pre-fill form state for each assigned project
        const initialState = {};
        assigned.forEach((p) => {
          initialState[p.id] = {
            progress: p.progress || 0,
            status: p.status || 'ACTIVE',
            remarks: p.contractorRemarks || '',
          };
        });
        setContractorFormState(initialState);
      }
    } catch (err) {
      console.warn('Error loading contractor projects:', err);
    }
  };

  useEffect(() => {
    if (userRole === 'WARD_EXEC' && userProfile?.wardNumber) {
      loadWardWorkspaceData(userProfile.wardNumber);
      loadWardContractors();
    }
  }, [userRole, userProfile]);

  useEffect(() => {
    if (userRole === 'CONTRACTOR' && currentUser) {
      loadContractorProjects();
    }
  }, [userRole, currentUser, userProfile]);

  // 4. Super Admin: Locked Accounts
  const [lockouts, setLockouts] = useState([]);
  const [lockoutFeedback, setLockoutFeedback] = useState(null); // { type, message }
  const [unlockingEmail, setUnlockingEmail] = useState(null);

  const fetchLockouts = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/lockouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.lockouts || [];
        setLockouts(list);
      }
    } catch (err) {
      console.warn('Could not fetch lockouts:', err.message);
    }
  };

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN' || !currentUser) return;
    fetchLockouts();
    const interval = setInterval(fetchLockouts, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, currentUser]);

  const handleUnlock = async (email) => {
    setUnlockingEmail(email);
    setLockoutFeedback(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/admin/lockouts/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Unlock failed (${res.status})`);
      setLockoutFeedback({ type: 'success', message: `${email} has been unlocked.` });
      await fetchLockouts();
    } catch (err) {
      setLockoutFeedback({ type: 'error', message: err.message || 'Failed to unlock account.' });
    } finally {
      setUnlockingEmail(null);
      setTimeout(() => setLockoutFeedback(null), 4000);
    }
  };

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

  // Filtered System Users for Users Tab
  const filteredUsers = useMemo(() => {
    return systemUsers.filter((u) => {
      // Role / Post filter
      if (userRoleFilter !== 'All') {
        if (userRoleFilter === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN') return false;
        if (userRoleFilter === 'WARD_EXEC' && u.role !== 'WARD_EXEC') return false;
        if (userRoleFilter === 'CONTRACTOR' && u.role !== 'CONTRACTOR') return false;
      }
      // Search by name, mail, post, ward
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const matchesName = u.fullName && u.fullName.toLowerCase().includes(q);
        const matchesEmail = u.email && u.email.toLowerCase().includes(q);
        const matchesPost = u.post && u.post.toLowerCase().includes(q);
        const matchesWard = u.wardNumber && `ward ${u.wardNumber}`.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPost && !matchesWard) {
          return false;
        }
      }
      return true;
    });
  }, [systemUsers, userRoleFilter, userSearch]);

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

  // Lockout helpers (server-side, per email: 3 failed attempts => 24h lock)
  const normalizedLoginEmail = loginEmail.trim().toLowerCase();
  const isLoginLocked =
    !!lockInfo && lockInfo.email === normalizedLoginEmail && lockInfo.until > Date.now();

  const lockMessage = (until) =>
    `Too many failed attempts. This account is locked until ${new Date(until).toLocaleString()}. Please contact the Super Admin to unlock it.`;

  const callAuthApi = async (path, body, token) => {
    const res = await fetch(`${API_BASE}/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`auth api ${path} failed (${res.status})`);
    return res.json();
  };

  // Check lockout status when the user leaves the email field
  const handleEmailBlur = async () => {
    if (!normalizedLoginEmail) return;
    try {
      const status = await callAuthApi('lockout-status', { email: normalizedLoginEmail });
      if (status.locked) {
        setLockInfo({ email: normalizedLoginEmail, until: status.lockedUntil });
        setLoginError(lockMessage(status.lockedUntil));
      }
    } catch (err) {
      console.warn('Lockout status check unavailable:', err.message);
    }
  };

  // Handler: Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loginSubmitting || isSigningInRef.current) return;
    setLoginError('');
    setInactivityNotice('');
    setLoginSubmitting(true);
    const email = loginEmail.trim();
    const emailKey = email.toLowerCase();
    try {
      // 1. Refuse to attempt sign-in if this email is locked
      try {
        const status = await callAuthApi('lockout-status', { email: emailKey });
        if (status.locked) {
          setLockInfo({ email: emailKey, until: status.lockedUntil });
          setLoginError(lockMessage(status.lockedUntil));
          return;
        }
      } catch (statusErr) {
        console.warn('Lockout status check unavailable:', statusErr.message);
      }

      // 2. Mark session active BEFORE Firebase sign-in so onAuthStateChanged never signs out the fresh session
      isSigningInRef.current = true;
      sessionStorage.setItem('staff_session_active', '1');
      localStorage.setItem('staff_last_active', String(Date.now()));

      // Enforce session persistence (Option A) and attempt sign-in with clean sanitized password
      await setPersistence(auth, browserSessionPersistence);
      const cleanPassword = (loginPassword || '')
        .trim()
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
      const cred = await signInWithEmailAndPassword(auth, email, cleanPassword);

      // Resolve role immediately from token claims & Firestore profile
      const tokenResult = await cred.user.getIdTokenResult(true);
      let detectedRole = tokenResult.claims?.role;
      let profileData = {};
      try {
        const userDocSnap = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDocSnap.exists()) {
          profileData = userDocSnap.data();
          if (!detectedRole && profileData.role) {
            detectedRole = profileData.role;
          }
        }
      } catch (docErr) {
        console.warn('Could not read user doc on sign in:', docErr.message);
      }

      if (detectedRole === 'SUPER_ADMIN' || profileData.role === 'SUPER_ADMIN') {
        detectedRole = 'SUPER_ADMIN';
      } else if (
        detectedRole === 'CONTRACTOR' ||
        profileData.role === 'CONTRACTOR' ||
        profileData.contractorId
      ) {
        detectedRole = 'CONTRACTOR';
      } else if (profileData.wardNumber || tokenResult.claims?.wardNumber) {
        detectedRole = 'WARD_EXEC';
      }

      const resolvedRole = detectedRole || profileData.role || 'WARD_EXEC';

      // 2b. Check if system maintenance break is active (freezes all except SUPER_ADMIN)
      let isSystemPaused = !systemActiveRef.current;
      try {
        const maintSnap = await getDoc(doc(db, 'systemSettings', 'maintenance'));
        if (maintSnap.exists()) {
          const mData = maintSnap.data();
          isSystemPaused = mData.systemActive === false || mData.maintenanceMode === true;
        }
      } catch (e) {}

      if (isSystemPaused && resolvedRole !== 'SUPER_ADMIN') {
        sessionStorage.removeItem('staff_session_active');
        localStorage.removeItem('staff_last_active');
        isSigningInRef.current = false;
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
        setLoginError(
          'Municipal System Maintenance: Staff, Ward Executive, and Contractor logins are temporarily frozen for maintenance. Only the Chief Municipal Administrator (Super Admin) can access the system at this time.'
        );
        return;
      }

      // Refresh session markers and commit authenticated user state immediately
      sessionStorage.setItem('staff_session_active', '1');
      localStorage.setItem('staff_last_active', String(Date.now()));
      setLockInfo(null);
      setLoginPassword('');
      setShowPassword(false);

      setUserRole(resolvedRole);
      setUserProfile({
        ...profileData,
        email: cred.user.email,
        displayName:
          profileData.companyName ||
          profileData.fullName ||
          cred.user.displayName ||
          (resolvedRole === 'SUPER_ADMIN'
            ? 'Chief Municipal Admin'
            : resolvedRole === 'CONTRACTOR'
            ? 'Civic Contractor'
            : 'Ward Executive'),
        wardNumber: profileData.wardNumber || tokenResult.claims?.wardNumber || null,
        executiveId: profileData.executiveId || null,
        contractorId: profileData.contractorId || null,
        projectId: profileData.projectId || null,
        projectTitle: profileData.projectTitle || null,
      });
      setCurrentUser(cred.user);
      setAuthLoading(false);

      // Automatically route to designated portal based on credentials
      if (resolvedRole === 'SUPER_ADMIN') {
        onPortalChange?.('staff');
      } else if (resolvedRole === 'CONTRACTOR') {
        onPortalChange?.('contractor');
      } else {
        onPortalChange?.('executive');
      }

      // 3. Success: reset the failure counter in background without delaying portal load
      cred.user
        .getIdToken()
        .then((token) => callAuthApi('clear-failures', {}, token))
        .catch((clearErr) => {
          console.warn('Could not clear failed attempts:', clearErr.message);
        });
    } catch (err) {
      sessionStorage.removeItem('staff_session_active');
      localStorage.removeItem('staff_last_active');
      console.error('Sign In Error:', err);
      let msg = 'Failed to sign in. Please verify your municipal credentials.';
      const wrongCredentials =
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found';

      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in Firebase Console. Please enable Email/Password under Authentication → Sign-in method in the Firebase Console.';
      } else if (wrongCredentials) {
        msg = 'Incorrect email or password.';
        try {
          const status = await callAuthApi('record-failure', { email: emailKey });
          if (status.locked) {
            setLockInfo({ email: emailKey, until: status.lockedUntil });
            msg = lockMessage(status.lockedUntil);
          } else {
            const n = status.remainingAttempts;
            msg = `Incorrect email or password. ${n} attempt${n === 1 ? '' : 's'} remaining.`;
          }
        } catch (recordErr) {
          console.warn('Could not record failed attempt:', recordErr.message);
        }
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Account temporarily locked for security.';
      }
      setLoginError(msg);
    } finally {
      isSigningInRef.current = false;
      setLoginSubmitting(false);
    }
  };

  // Handler: Sign Out
  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('staff_session_active');
      localStorage.removeItem('staff_last_active');
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      setLoginPassword('');
      setShowPassword(false);
      setInactivityNotice('');
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  // Handler: Toggle Municipal System Active / Maintenance Break
  const handleToggleSystemStatus = async (targetActiveState) => {
    const nextState = targetActiveState !== undefined ? targetActiveState : !systemActive;

    setSystemToggling(true);
    setActionFeedback(null);
    try {
      // 1. Primary Authority: Backend REST API using Firebase Admin SDK (avoids client-side permission issues)
      const token = currentUser ? await currentUser.getIdToken() : '';
      const res = await fetch(`${API_BASE}/api/admin/toggle-system-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ systemActive: nextState }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update system status on backend.');
      }

      // 2. Secondary: Best-effort local client Firestore sync
      try {
        await setDoc(
          doc(db, 'systemSettings', 'maintenance'),
          {
            systemActive: nextState,
            maintenanceMode: !nextState,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.email || 'SUPER_ADMIN',
          },
          { merge: true }
        );
      } catch (clientErr) {
        // Backend Admin SDK already wrote to Firestore and triggers onSnapshot across all clients
        console.warn('Client Firestore direct write skipped (backend Admin SDK updated Firestore successfully):', clientErr.message);
      }

      setSystemActive(nextState);
      localStorage.setItem('municipal_system_active', String(nextState));
      localStorage.setItem('municipal_system_last_toggle', String(Date.now()));
      setMaintenanceModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: nextState
          ? 'Municipal System Active: Ward Executive logins have been restored.'
          : 'Maintenance Break Activated: Ward Executive logins are now frozen.',
      });
    } catch (err) {
      console.error('Failed to toggle system status:', err);
      setActionFeedback({
        type: 'error',
        message: 'Could not toggle system status: ' + (err.message || 'Error'),
      });
    } finally {
      setSystemToggling(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Handler: Revoke Ward Executive Access and Delete User
  const handleRevokeExecutive = async (exec) => {
    if (!exec || !exec.uid) return;
    const confirmed = window.confirm(
      `Are you sure you want to revoke access and remove ${exec.fullName || 'this executive'} from Ward ${exec.wardNumber}? Their login credentials will be permanently deleted.`
    );
    if (!confirmed) return;

    setRevokingUid(exec.uid);
    setActionFeedback(null);
    try {
      const token = currentUser ? await currentUser.getIdToken() : '';
      const emailQuery = exec.email ? `?email=${encodeURIComponent(exec.email)}` : '';
      const res = await fetch(`${API_BASE}/api/admin/ward-exec/${exec.uid}${emailQuery}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke executive access.');
      }
      setActionFeedback({
        type: 'success',
        message: `Access revoked for ${exec.fullName || 'executive'} (Ward ${exec.wardNumber}).`,
      });
      setExecutives((prev) => prev.filter((e) => e.uid !== exec.uid));
      fetchExecutivesViaRest();
    } catch (err) {
      console.error('Revoke error:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error revoking executive access.',
      });
    } finally {
      setRevokingUid(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Handler: Resend Ward Executive Credentials
  const handleResendCredentials = async (exec) => {
    if (!exec || !exec.uid) return;
    setResendingUid(exec.uid);
    setActionFeedback(null);
    try {
      const token = currentUser ? await currentUser.getIdToken() : '';
      const res = await fetch(`${API_BASE}/api/admin/ward-exec/${exec.uid}/resend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend credentials.');
      }
      setActionFeedback({
        type: 'success',
        message: data.emailSent
          ? `Fresh credentials dispatched to ${data.email}!`
          : `Credentials refreshed for ${data.email} (SMTP in development mode; see terminal console).`,
      });
    } catch (err) {
      console.error('Resend error:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error resending credentials.',
      });
    } finally {
      setResendingUid(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Handler: Quick appoint from vacant ward card
  const handleAppointWard = (wardNum) => {
    setFormWard(String(wardNum));
    setShowProvisionForm(true);
    setAdminTaskTab('executives');
    window.scrollTo({ top: 120, behavior: 'smooth' });
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

      const res = await fetch(`${API_BASE}/api/admin/provision-ward-exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || `Server returned status ${res.status} (${res.statusText || 'No response body'})`);
      }

      if (!res.ok) {
        const errorMsg = data.details ? `${data.error} (${data.details})` : (data.error || `Failed to provision Ward Executive (Status: ${res.status})`);
        throw new Error(errorMsg);
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
      const token = currentUser ? await currentUser.getIdToken() : null;
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      const token = currentUser ? await currentUser.getIdToken() : null;
      const res = await fetch(`${API_BASE}/api/grievances/${grievanceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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

  // Live Dynamic Preview for Next Contractor Sequential ID: CON-{wardNumber}-{seq}
  const dynamicContractorPreviewId = useMemo(() => {
    const ward = Number(userProfile?.wardNumber) || 4;
    const sameWard = wardContractors.filter((c) => Number(c.wardNumber) === ward);
    return `CON-${ward}-${sameWard.length + 1}`;
  }, [userProfile?.wardNumber, wardContractors]);

  // Handler: Executive Creates a New Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateProjLoading(true);
    setCreateProjFeedback(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        title: createProjTitle.trim(),
        sector: createProjSector,
        location: createProjLocation.trim(),
        budget: createProjBudget.trim(),
        targetDate: createProjTargetDate.trim(),
        description: createProjDescription.trim(),
        wardNumber: userProfile?.wardNumber || 4,
      };

      const res = await fetch(`${API_BASE}/api/executive/create-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project.');
      }

      setCreateProjFeedback({
        type: 'success',
        message: `Project "${payload.title}" created successfully for Ward ${payload.wardNumber}!`,
      });

      setCreateProjTitle('');
      setCreateProjLocation('');
      setCreateProjBudget('');
      setCreateProjTargetDate('');
      setCreateProjDescription('');

      if (userProfile?.wardNumber) {
        await loadWardWorkspaceData(userProfile.wardNumber);
      }

      setTimeout(() => {
        setActiveTab('projects');
        setCreateProjFeedback(null);
      }, 1800);
    } catch (err) {
      setCreateProjFeedback({ type: 'error', message: err.message || 'Error creating project.' });
    } finally {
      setCreateProjLoading(false);
    }
  };

  // Handler: Executive Appoints and Provisions a Contractor
  const handleAppointContractor = async (e) => {
    e.preventDefault();
    setContractorLoading(true);
    setContractorError(null);
    setContractorSuccessData(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        companyName: contractorName.trim(),
        email: contractorEmail.trim().toLowerCase(),
        phone: contractorPhone.trim(),
        projectId: contractorProjectId,
        wardNumber: userProfile?.wardNumber || 4,
      };

      const res = await fetch(`${API_BASE}/api/executive/provision-contractor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to appoint contractor.');
      }

      setContractorSuccessData({
        contractorId: data.contractorId,
        companyName: payload.companyName,
        email: payload.email,
        emailSent: data.emailSent,
      });

      setContractorName('');
      setContractorEmail('');
      setContractorPhone('');
      setContractorProjectId('');

      if (userProfile?.wardNumber) {
        await loadWardWorkspaceData(userProfile.wardNumber);
        await loadWardContractors();
      }
    } catch (err) {
      setContractorError(err.message || 'Failed to appoint contractor.');
    } finally {
      setContractorLoading(false);
    }
  };

  // Handler: Resend Contractor Credentials
  const handleResendContractor = async (contractor) => {
    if (!contractor || !contractor.uid) return;
    setResendingContractorUid(contractor.uid);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/executive/contractor/${contractor.uid}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend credentials.');
      alert(data.emailSent ? `Credentials resent to ${contractor.email}!` : 'Credentials updated.');
    } catch (err) {
      alert('Error resending credentials: ' + (err.message || 'Error'));
    } finally {
      setResendingContractorUid(null);
    }
  };

  // Handler: Revoke Contractor
  const handleRevokeContractor = async (contractor) => {
    if (!contractor || !contractor.uid) return;
    const confirmed = window.confirm(
      `Revoke contractor appointment for ${contractor.companyName || contractor.email}? Their portal access will be permanently revoked.`
    );
    if (!confirmed) return;

    setRevokingContractorUid(contractor.uid);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/executive/contractor/${contractor.uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke contractor.');
      await loadWardContractors();
      if (userProfile?.wardNumber) await loadWardWorkspaceData(userProfile.wardNumber);
    } catch (err) {
      alert('Error revoking contractor: ' + (err.message || 'Error'));
    } finally {
      setRevokingContractorUid(null);
    }
  };

  // Handler: Contractor Saves Project Milestone Progress
  const handleContractorSaveProgress = async (projectId) => {
    const fState = contractorFormState[projectId] || {};
    setContractorUpdatingId(projectId);
    setContractorFeedbackMsg((prev) => ({ ...prev, [projectId]: null }));
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: fState.progress,
          status: fState.status,
          remarks: fState.remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update milestone progress.');

      setContractorFeedbackMsg((prev) => ({
        ...prev,
        [projectId]: { type: 'success', text: 'Milestone progress saved successfully!' },
      }));

      // Update local projects
      setContractorProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, progress: Number(fState.progress), status: fState.status, contractorRemarks: fState.remarks }
            : p
        )
      );

      setTimeout(() => {
        setContractorFeedbackMsg((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }, 4000);
    } catch (err) {
      setContractorFeedbackMsg((prev) => ({
        ...prev,
        [projectId]: { type: 'error', text: err.message || 'Failed to update progress.' },
      }));
    } finally {
      setContractorUpdatingId(null);
    }
  };

  // Loading Screen while resolving Auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#7a7a7a] text-sm tracking-tight">
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
      <div className="min-h-screen bg-white text-[#1d1d1f] flex flex-col justify-between selection:bg-[#0066cc] selection:text-white">
        <div className="h-6" />

        {/* Central Sign-In Container */}
        <div className="w-full max-w-md mx-auto px-4 py-8">
          <div className="bg-white text-[#1d1d1f] rounded-[18px] p-8 sm:p-10 border border-[#e0e0e0] shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
            {/* Header Block with City Gate Logo */}
            <div className="text-center mb-8">
              <img
                src="/Biratnagar%20City%20Gate%20Logo.png"
                alt="Biratnagar City Gate Logo"
                className="h-16 w-auto object-contain mx-auto mb-4"
              />
              <div className="flex justify-center mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#f5f5f7] text-[#333333] border border-[#e0e0e0]">
                  Municipal Gateway · विराटनगर महानगरपालिका
                </span>
              </div>
              <h1 className="text-[26px] font-semibold tracking-tight flex items-center justify-center gap-1.5">
                <span className="text-[#DC143C]">Nagar</span>
                <span className="text-[#156947]">योजना</span>
              </h1>
              <p className="text-sm font-medium text-[#1d1d1f] mt-1.5">
                Municipal Administration & Partner Portal
              </p>
              <p className="text-xs text-[#7a7a7a] mt-0.5">
                Biratnagar Metropolitan City · विराटनगर महानगरपालिका
              </p>
            </div>

            {/* Municipal System Maintenance Alert Banner */}
            {!systemActive && (
              <div
                role="status"
                className="mb-5 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-[11px] text-xs text-[#92400e] flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#b45309]" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong className="font-semibold block text-[#78350f]">Municipal Maintenance Break Active</strong>
                  <span>Ward Executive & contractor logins are temporarily frozen. Only Chief Municipal Administrator (Super Admin) credentials can access the command center.</span>
                </div>
              </div>
            )}

            {/* Inactivity Notice Banner */}
            {inactivityNotice && (
              <div
                role="status"
                className="mb-5 p-3.5 bg-[#f0f9ff] border border-[#bae6fd] rounded-[11px] text-xs text-[#0369a1] flex items-start gap-2.5"
              >
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#0284c7]" />
                <span className="leading-relaxed font-medium">{inactivityNotice}</span>
              </div>
            )}

            {/* Error Banner */}
            {loginError && (
              <div
                role="alert"
                className="mb-5 p-3.5 bg-[#fff5f5] border border-[#ffd6d6] rounded-[11px] text-xs text-[#c4232d] flex items-start gap-2.5"
              >
                {isLoginLocked ? (
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
              <div>
                <label htmlFor="staff-email" className="block text-xs font-semibold text-[#333333] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    disabled={loginSubmitting || isLoginLocked}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-3.5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="staff-password" className="block text-xs font-semibold text-[#333333] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginSubmitting || isLoginLocked}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-10 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#1d1d1f] focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginSubmitting || isLoginLocked}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-[15px] font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loginSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Authorization...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Municipal Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Public Return */}
            <div className="mt-6 pt-5 border-t border-[#f0f0f0] space-y-3 text-center">

              <div>
                <button
                  type="button"
                  onClick={onReturnToPublic}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7a7a7a] hover:text-[#1d1d1f] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Public Nagarयोजना Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs text-[#7a7a7a]">
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
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc] selection:text-white flex flex-col font-sans">
        {/* Command Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e0e0e0]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <img
                src="/Biratnagar%20City%20Gate%20Logo.png"
                alt="City Gate Logo"
                className="h-10 w-auto object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg tracking-tight">
                    <span className="text-[#DC143C]">Nagar</span>
                    <span className="text-[#156947]">योजना</span>
                  </span>
                </div>
                <div className="text-[11px] text-[#7a7a7a]">
                  Municipal Command & Executive Governance Hub
                </div>
              </div>
            </div>

            {/* Right: User Information (Name only) & Exit Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                  PK
                </div>
                <span className="text-xs font-semibold text-[#1d1d1f]">
                  Pratyush Karki
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign Out"
                title="Sign Out"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#c4232d] bg-[#fff5f5] hover:bg-[#ffe9e9] border border-[#ffd6d6] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c4232d]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Task Navigation Sub-Bar */}
        <nav className="bg-white/90 backdrop-blur-md border-b border-[#e0e0e0] sticky top-16 z-30" aria-label="Command Hub Tasks">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="inline-flex items-center gap-1.5 p-1 bg-[#f5f5f7] border border-[#e0e0e0] rounded-full text-xs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={adminTaskTab === 'all'}
                onClick={() => setAdminTaskTab('all')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  adminTaskTab === 'all'
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>All Operations</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={adminTaskTab === 'executives'}
                onClick={() => setAdminTaskTab('executives')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  adminTaskTab === 'executives'
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ward Executives</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                  adminTaskTab === 'executives' ? 'bg-white/20 text-white' : 'bg-white text-[#7a7a7a] border border-[#e0e0e0]'
                }`}>
                  {executives.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={adminTaskTab === 'users'}
                onClick={() => setAdminTaskTab('users')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  adminTaskTab === 'users'
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Users</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                  adminTaskTab === 'users' ? 'bg-white/20 text-white' : 'bg-white text-[#7a7a7a] border border-[#e0e0e0]'
                }`}>
                  {systemUsers.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={adminTaskTab === 'lockouts'}
                onClick={() => setAdminTaskTab('lockouts')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  adminTaskTab === 'lockouts'
                    ? 'bg-[#1d1d1f] text-white shadow-sm'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Locked Accounts</span>
                {lockouts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none bg-[#c4232d] text-white">
                    {lockouts.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMaintenanceModalOpen(true)}
                disabled={systemToggling}
                title={
                  !systemActive
                    ? 'Maintenance Break is ACTIVE (Ward logins frozen). Click to resume normal system operations.'
                    : 'Maintenance Break is OFF (Normal operations). Click to activate maintenance break.'
                }
                className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  !systemActive
                    ? 'bg-[#eefaf3] hover:bg-[#e4f6ec] border-[#bbf7d0] shadow-xs'
                    : 'bg-white hover:bg-[#f5f5f7] border-[#e0e0e0] shadow-xs'
                } ${systemToggling ? 'opacity-60 cursor-wait' : ''}`}
                aria-pressed={!systemActive}
              >
                <span
                  className={`select-none font-semibold transition-colors duration-200 ${
                    !systemActive ? 'text-[#156947]' : 'text-[#666666]'
                  }`}
                >
                  Maintenance Break
                </span>

                {/* Sliding toggle switch: Grey when Maintenance Break is OFF, Green when Maintenance Break is ON */}
                <span
                  className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                    !systemActive ? 'bg-[#156947]' : 'bg-[#d1d5db]'
                  }`}
                  aria-hidden="true"
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      !systemActive ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Command Dashboard */}
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
          {/* Action Feedback Toast / Banner */}
          {actionFeedback && (
            <div
              role="status"
              className={`p-3.5 rounded-[12px] text-xs font-medium flex items-center gap-2 border shadow-xs animate-in fade-in duration-150 ${
                actionFeedback.type === 'error'
                  ? 'bg-[#fff5f5] border-[#ffd6d6] text-[#c4232d]'
                  : 'bg-[#eefaf3] border-[#cfeedd] text-[#156947]'
              }`}
            >
              {actionFeedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
          )}

          {/* Metrics Overview Bar */}
          {(adminTaskTab === 'all' || adminTaskTab === 'executives') && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#7a7a7a] uppercase tracking-wider">
                    Total Municipal Wards
                  </p>
                  <p className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1">
                    19
                  </p>
                  <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                    Biratnagar Metropolitan City
                  </p>
                </div>
                <div className="w-12 h-12 rounded-[14px] bg-[#eef5ff] border border-[#d6e6fb] flex items-center justify-center text-[#0066cc]">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#7a7a7a] uppercase tracking-wider">
                    Assigned Ward Executives
                  </p>
                  <p className="text-2xl sm:text-3xl font-semibold text-[#156947] mt-1">
                    {metrics.assignedCount}{' '}
                    <span className="text-sm font-normal text-[#7a7a7a]">/ 19</span>
                  </p>
                  <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                    {metrics.coveragePercent}% Municipal Wards Covered
                  </p>
                </div>
                <div className="w-12 h-12 rounded-[14px] bg-[#eefaf3] border border-[#cfeedd] flex items-center justify-center text-[#156947]">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#7a7a7a] uppercase tracking-wider">
                    Total Active Credentials
                  </p>
                  <p className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1">
                    {metrics.totalRegistered}
                  </p>
                  <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                    Verified Executive Accounts
                  </p>
                </div>
                <div className="w-12 h-12 rounded-[14px] bg-[#f5f0ff] border border-[#e4d9fa] flex items-center justify-center text-[#6b3fc4]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </section>
          )}

          {/* Locked Accounts Panel */}
          {(adminTaskTab === 'all' || adminTaskTab === 'lockouts') && (
            <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#fff5f5] border border-[#ffd6d6] flex items-center justify-center text-[#c4232d]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                    <span>Locked Accounts</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#f5f5f7] text-[#1d1d1f] border border-[#e0e0e0]">
                      {lockouts.length}
                    </span>
                  </h2>
                  <p className="text-xs text-[#7a7a7a]">
                    Accounts locked after 3 failed sign-in attempts. Unlock to restore access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLockouts}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {lockoutFeedback && (
              <div
                role="status"
                className={`p-3 rounded-[11px] text-xs flex items-center gap-2 border ${
                  lockoutFeedback.type === 'error'
                    ? 'bg-[#fff5f5] border-[#ffd6d6] text-[#c4232d]'
                    : 'bg-[#eefaf3] border-[#cfeedd] text-[#156947]'
                }`}
              >
                {lockoutFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{lockoutFeedback.message}</span>
              </div>
            )}

            {lockouts.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-[14px] bg-[#fafafc] border border-dashed border-[#e0e0e0]">
                <CheckCircle2 className="w-7 h-7 text-[#2e9d6a] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1d1d1f]">No locked accounts</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[14px] border border-[#e0e0e0]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fafafc] text-[#7a7a7a] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Email</th>
                      <th className="px-4 py-2.5 font-semibold">Locked Until</th>
                      <th className="px-4 py-2.5 font-semibold">Failed Attempts</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {lockouts.map((l) => (
                      <tr key={l.email} className="bg-white">
                        <td className="px-4 py-3 font-mono text-[#1d1d1f]">{l.email}</td>
                        <td className="px-4 py-3 text-[#333333]">
                          {l.lockedUntil ? new Date(l.lockedUntil).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fff5f5] text-[#c4232d] border border-[#ffd6d6]">
                            {l.failedAttempts ?? l.attempts ?? l.failures ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnlock(l.email)}
                            disabled={unlockingEmail === l.email}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {unlockingEmail === l.email ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            <span>Unlock</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {/* ALL OPERATIONS VIEW: 19 Municipal Wards Jurisdiction Grid */}
          {adminTaskTab === 'all' && (
            <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                    <span>Municipal Wards Jurisdiction</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#f5f5f7] text-[#1d1d1f] border border-[#e0e0e0]">
                      19 Wards
                    </span>
                  </h2>
                  <p className="text-xs text-[#7a7a7a]">
                    Overview of executive assignments, active authorities, and vacant ward jurisdictions
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#156947] font-semibold">
                    {metrics.assignedCount} Active
                  </span>
                  <span className="text-[#c4232d] font-semibold">
                    {19 - metrics.assignedCount} Vacant
                  </span>
                </div>
              </div>

              {/* 19 Ward Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 19 }, (_, i) => i + 1).map((w) => {
                  const exec = executives.find((e) => Number(e.wardNumber) === w);
                  const wardLabel = `Ward ${w < 10 ? `0${w}` : w}`;

                  if (exec) {
                    return (
                      <div
                        key={w}
                        className="bg-white border border-[#e0e0e0] hover:border-[#cbd5e1] rounded-[14px] p-4 flex flex-col justify-between transition-all shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-[#1d1d1f]">{wardLabel}</span>
                            <span className="text-xs font-semibold text-[#156947]">
                              Active
                            </span>
                          </div>

                          <p className="font-semibold text-xs text-[#1d1d1f] truncate">
                            {exec.fullName}
                          </p>
                          <p className="text-[11px] text-[#555555] font-mono truncate mt-0.5">
                            {exec.email}
                          </p>
                          <p className="text-[11px] text-[#7a7a7a] mt-0.5">
                            {exec.phone ? (exec.phone.startsWith('+977') ? exec.phone : `+977 ${exec.phone}`) : '+977 —'}
                          </p>
                        </div>

                        <div className="pt-3 mt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleRevokeExecutive(exec)}
                            disabled={revokingUid === exec.uid}
                            className="px-2.5 py-1 rounded text-xs font-medium text-[#c4232d] hover:bg-[#fff5f5] border border-[#ffd6dc] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {revokingUid === exec.uid ? 'Revoking...' : 'Revoke Access'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResendCredentials(exec)}
                            disabled={resendingUid === exec.uid}
                            className="text-xs font-medium text-[#0066cc] hover:underline transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {resendingUid === exec.uid ? 'Resending...' : 'Resend Credentials'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={w}
                      className="bg-white border border-[#e0e0e0] hover:border-[#cbd5e1] rounded-[14px] p-4 flex flex-col justify-between transition-all min-h-[140px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1d1d1f]">{wardLabel}</span>
                        <span className="text-xs font-semibold text-[#c4232d]">
                          Vacant
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleAppointWard(w)}
                          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium text-[#c4232d] bg-white hover:bg-[#fff5f5] border border-[#c4232d] transition-all cursor-pointer shadow-xs"
                        >
                          <span>+ Appoint Executive</span>
                        </button>
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] text-[#7a7a7a]">No executive appointed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* WARD EXECUTIVES VIEW: Provision Form & Directory */}
          {adminTaskTab === 'executives' && (
            <div className={showProvisionForm ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "w-full"}>
              {/* Column 1: Provision Ward Executive Form */}
              {showProvisionForm && (
                <section className="lg:col-span-5 bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[12px] bg-[#eef5ff] border border-[#d6e6fb] flex items-center justify-center text-[#0066cc]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">
                    Provision Ward Executive
                  </h2>
                  <p className="text-xs text-[#7a7a7a]">
                    Issue credentials & onboard ward executive authority
                  </p>
                </div>
              </div>

              {/* Success Alert */}
              {provisionSuccess && (
                <div className="mb-5 p-4 bg-[#eefaf3] border border-[#cfeedd] rounded-[14px] text-xs text-[#156947] space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Executive Successfully Provisioned!</span>
                  </div>
                  <p className="text-[#333333]">
                    Assigned Unique ID:{' '}
                    <strong className="text-[#1d1d1f] font-mono bg-white border border-[#cfeedd] px-2 py-0.5 rounded">
                      {provisionSuccess.executiveId}
                    </strong>
                  </p>
                  <p className="text-[#333333]">
                    Designated Ward:{' '}
                    <span className="font-semibold text-[#1d1d1f]">
                      Ward {provisionSuccess.wardNumber}
                    </span>{' '}
                    ({provisionSuccess.fullName})
                  </p>
                  <p className="text-[11px] text-[#156947]">
                    {provisionSuccess.emailSent
                      ? `Credentials and temporary password dispatched to ${provisionSuccess.email}`
                      : `Created user ${provisionSuccess.email} in Firebase Auth system.`}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {provisionError && (
                <div className="mb-5 p-4 bg-[#fff5f5] border border-[#ffd6d6] rounded-[14px] text-xs text-[#c4232d] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Provisioning Failed</p>
                    <p className="text-[#333333]">{provisionError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleProvisionWardExec} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                    Executive Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-3 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                    Executive Gmail *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-3 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                    Contact Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-3 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Ward Selection & Service Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                      Designated Ward *
                    </label>
                    <select
                      value={formWard}
                      onChange={(e) => setFormWard(e.target.value)}
                      className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                    >
                      {Array.from({ length: 19 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w}>
                          Ward {w < 10 ? `0${w}` : w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative" ref={calendarRef}>
                    <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                      Tenure / Service Period
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCalendarOpen((prev) => !prev)}
                        className="w-7 h-7 absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#7a7a7a] hover:text-[#0066cc] hover:bg-[#eef5ff] rounded-lg transition-colors cursor-pointer"
                        title="Open calendar"
                        aria-label="Open calendar"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        value={formTenure}
                        onChange={(e) => setFormTenure(e.target.value)}
                        className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-9 pr-2.5 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                      />
                      <input
                        type="date"
                        ref={nativeDateRef}
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormTenure(e.target.value);
                            setCalendarOpen(false);
                          }
                        }}
                      />
                    </div>

                    {/* Interactive Apple-Style Calendar Popover */}
                    {calendarOpen && (
                      <div className="absolute z-50 mt-1.5 right-0 sm:left-0 bg-white border border-[#e0e0e0] rounded-[16px] shadow-xl p-3.5 w-64 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
                        {/* Calendar Month & Nav */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f0f0f0]">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                              )
                            }
                            className="p-1 rounded-md text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer"
                            aria-label="Previous month"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-[#1d1d1f] text-xs">
                            {calendarMonth.toLocaleString('default', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                              )
                            }
                            className="p-1 rounded-md text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors cursor-pointer"
                            aria-label="Next month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#7a7a7a] mb-1">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="py-0.5">
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Day Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {Array.from({
                            length: new Date(
                              calendarMonth.getFullYear(),
                              calendarMonth.getMonth(),
                              1
                            ).getDay(),
                          }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          {Array.from({
                            length: new Date(
                              calendarMonth.getFullYear(),
                              calendarMonth.getMonth() + 1,
                              0
                            ).getDate(),
                          }).map((_, i) => {
                            const dayNum = i + 1;
                            const isToday =
                              new Date().toDateString() ===
                              new Date(
                                calendarMonth.getFullYear(),
                                calendarMonth.getMonth(),
                                dayNum
                              ).toDateString();
                            return (
                              <button
                                key={dayNum}
                                type="button"
                                onClick={() => {
                                  const y = calendarMonth.getFullYear();
                                  const m = String(calendarMonth.getMonth() + 1).padStart(2, '0');
                                  const d = String(dayNum).padStart(2, '0');
                                  setFormTenure(`${y}-${m}-${d}`);
                                  setCalendarOpen(false);
                                }}
                                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer ${
                                  isToday
                                    ? 'bg-[#0066cc] text-white font-semibold shadow-sm'
                                    : 'text-[#1d1d1f] hover:bg-[#f5f5f7] hover:text-[#0066cc]'
                                }`}
                              >
                                {dayNum}
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick Presets */}
                        <div className="pt-2.5 mt-2 border-t border-[#f0f0f0] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-[#7a7a7a] uppercase tracking-wider">
                              Quick Presets
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  nativeDateRef.current?.showPicker();
                                } catch (e) {
                                  // Fallback click
                                  nativeDateRef.current?.click();
                                }
                              }}
                              className="text-[10px] text-[#0066cc] hover:underline font-medium cursor-pointer"
                            >
                              System Picker
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFormTenure('2081 - 2086 B.S.');
                                setCalendarOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-full bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              2081–2086 B.S.
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormTenure('2082 - 2087 B.S.');
                                setCalendarOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-full bg-[#f5f5f7] hover:bg-[#ebebee] text-[#1d1d1f] text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              2082–2087 B.S.
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const yr = calendarMonth.getFullYear();
                                setFormTenure(`${yr} - ${yr + 5}`);
                                setCalendarOpen(false);
                              }}
                              className="px-2 py-0.5 rounded-full bg-[#eef5ff] hover:bg-[#d6e6fb] text-[#0066cc] text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              5-Year A.D.
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LIVE DYNAMIC PREVIEW OF UNIQUE ID */}
                <div className="p-4 rounded-[14px] bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-wider block">
                      Live Dynamic ID Preview
                    </span>
                    <span className="text-xs text-[#7a7a7a]">
                      Auto-computed municipal index
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-[11px] bg-white text-[#0066cc] border border-[#d6e6fb] text-sm font-mono font-bold tracking-wider">
                      {dynamicPreviewId}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={provisionLoading}
                  className="w-full py-3 px-4 rounded-full text-[15px] font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
              )}

              {/* Column 2: Real-time Ward Executives Directory */}
              <section className={`${showProvisionForm ? 'lg:col-span-7' : 'w-full'} bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                    <span>Ward Executives Directory</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#f5f5f7] text-[#1d1d1f] border border-[#e0e0e0]">
                      {filteredExecutives.length} Active
                    </span>
                  </h2>
                  <p className="text-xs text-[#7a7a7a]">
                    Real-time registered authorities across Biratnagar wards
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowProvisionForm((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      showProvisionForm
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebee] border border-[#e0e0e0]'
                        : 'bg-[#0066cc] text-white hover:bg-[#0071e3] shadow-sm'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showProvisionForm ? 'Hide Form' : '+ Provision Executive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchExecutivesViaRest}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={execSearch}
                    onChange={(e) => setExecSearch(e.target.value)}
                    placeholder="Search by name, ID, email, phone..."
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-9 pr-3 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  />
                </div>

                <div className="sm:col-span-5 relative">
                  <Filter className="w-3.5 h-3.5 text-[#7a7a7a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={execWardFilter}
                    onChange={(e) => setExecWardFilter(e.target.value)}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-8 pr-3 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
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
                  <div className="py-12 flex flex-col items-center justify-center text-[#7a7a7a] gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0066cc]" />
                    <span className="text-xs">Loading directory...</span>
                  </div>
                ) : filteredExecutives.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-[14px] bg-[#fafafc] border border-dashed border-[#e0e0e0]">
                    <Users className="w-8 h-8 text-[#7a7a7a] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#1d1d1f]">
                      No Ward Executives Found
                    </p>
                    <p className="text-xs text-[#7a7a7a] mt-1 max-w-sm mx-auto">
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
                        className="p-4 rounded-[14px] bg-white hover:bg-[#fafafc] border border-[#e0e0e0] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-[12px] bg-[#eef5ff] border border-[#d6e6fb] flex items-center justify-center text-[#0066cc] font-mono font-bold text-xs flex-shrink-0 mt-0.5">
                            W{exec.wardNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                                {exec.fullName || 'Ward Executive'}
                              </h3>
                              <span className="font-mono text-[11px] font-bold text-[#0066cc] bg-[#eef5ff] border border-[#d6e6fb] px-2 py-0.5 rounded-md">
                                {exec.executiveId || `WE-${exec.wardNumber}-1`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                                Active
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#333333] mt-1.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3 h-3 text-[#7a7a7a]" />
                                {exec.email}
                              </span>
                              {exec.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#7a7a7a]" />
                                  {exec.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px] text-[#7a7a7a]">
                                <Clock className="w-3 h-3" />
                                {exec.servicePeriod || '2081 - 2086 B.S.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end gap-2 flex-shrink-0 self-end sm:self-center">
                          <div className="sm:text-right hidden sm:block">
                            <span className="text-[11px] font-medium text-[#7a7a7a] block">
                              Ward Jurisdiction
                            </span>
                            <span className="text-xs font-semibold text-[#1d1d1f]">
                              Biratnagar Ward {exec.wardNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRevokeExecutive(exec)}
                              disabled={revokingUid === exec.uid}
                              className="px-2.5 py-1 rounded text-xs font-medium text-[#c4232d] hover:bg-[#fff5f5] border border-[#ffd6dc] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {revokingUid === exec.uid ? 'Revoking...' : 'Revoke Access'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResendCredentials(exec)}
                              disabled={resendingUid === exec.uid}
                              className="text-xs font-medium text-[#0066cc] hover:underline transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {resendingUid === exec.uid ? 'Resending...' : 'Resend Credentials'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            </div>
          )}

          {/* USERS VIEW: Registered & Logged-in System Users */}
          {adminTaskTab === 'users' && (
            <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight flex items-center gap-2">
                    <span>System Users & Authorities</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#f5f5f7] text-[#1d1d1f] border border-[#e0e0e0]">
                      {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
                    </span>
                  </h2>
                  <p className="text-xs text-[#7a7a7a]">
                    List of all registered and logged-in system users with verified name, email address, and assigned post.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={fetchSystemUsers}
                    disabled={usersLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin text-[#0066cc]' : ''}`} />
                    <span>Sync Users</span>
                  </button>
                </div>
              </div>

              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 bg-[#fafafc] border border-[#e0e0e0] rounded-[14px]">
                  <p className="text-[11px] font-medium text-[#7a7a7a] uppercase tracking-wider">Total Registered</p>
                  <p className="text-2xl font-semibold text-[#1d1d1f] mt-1">{systemUsers.length}</p>
                </div>
                <div className="p-3.5 bg-[#fafafc] border border-[#e0e0e0] rounded-[14px]">
                  <p className="text-[11px] font-medium text-[#7a7a7a] uppercase tracking-wider">Super Admins</p>
                  <p className="text-2xl font-semibold text-[#6d28d9] mt-1">
                    {systemUsers.filter((u) => u.role === 'SUPER_ADMIN').length}
                  </p>
                </div>
                <div className="p-3.5 bg-[#fafafc] border border-[#e0e0e0] rounded-[14px]">
                  <p className="text-[11px] font-medium text-[#7a7a7a] uppercase tracking-wider">Ward Executives</p>
                  <p className="text-2xl font-semibold text-[#0066cc] mt-1">
                    {systemUsers.filter((u) => u.role === 'WARD_EXEC').length}
                  </p>
                </div>
                <div className="p-3.5 bg-[#fafafc] border border-[#e0e0e0] rounded-[14px]">
                  <p className="text-[11px] font-medium text-[#7a7a7a] uppercase tracking-wider">Civic Contractors</p>
                  <p className="text-2xl font-semibold text-[#156947] mt-1">
                    {systemUsers.filter((u) => u.role === 'CONTRACTOR').length}
                  </p>
                </div>
              </div>

              {/* Search & Post Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user by name, email, post, or ward..."
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-9 pr-3 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  />
                </div>

                <div className="sm:col-span-4 relative">
                  <Filter className="w-3.5 h-3.5 text-[#7a7a7a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-8 pr-3 py-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  >
                    <option value="All">All Posts / Designations</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                    <option value="WARD_EXEC">Ward Executive</option>
                    <option value="CONTRACTOR">Civic Contractor</option>
                  </select>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="pt-2">
                {usersLoading && systemUsers.length === 0 ? (
                  <div className="py-14 flex flex-col items-center justify-center text-[#7a7a7a] gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0066cc]" />
                    <span className="text-xs">Loading registered users directory...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-[14px] bg-[#fafafc] border border-dashed border-[#e0e0e0]">
                    <Users className="w-8 h-8 text-[#7a7a7a] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#1d1d1f]">No Users Match Criteria</p>
                    <p className="text-xs text-[#7a7a7a] mt-1 max-w-sm mx-auto">
                      {userSearch || userRoleFilter !== 'All'
                        ? 'No users match your search query or post filter. Try clearing the filters.'
                        : 'No registered users found in the municipal database.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[14px] border border-[#e0e0e0] shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f5f5f7] border-b border-[#e0e0e0] text-[#7a7a7a] font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Mail</th>
                          <th className="py-3 px-4">Post</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f0f2] bg-white">
                        {filteredUsers.map((u) => {
                          const initials = (u.fullName || u.companyName || u.email || 'U')
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          const postName =
                            u.post ||
                            (u.role === 'SUPER_ADMIN'
                              ? 'Super Administrator'
                              : u.role === 'WARD_EXEC'
                              ? `Ward Executive (Ward ${u.wardNumber || ''})`
                              : 'Civic Contractor');

                          return (
                            <tr key={u.uid || u.email} className="hover:bg-[#fafafc] transition-colors">
                              {/* 1. NAME (No session pill) */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 shadow-xs">
                                    {initials}
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-[#1d1d1f] text-sm block">
                                      {u.fullName || u.companyName || 'Registered User'}
                                    </span>
                                    {u.phone && (
                                      <div className="flex items-center gap-1 text-[11px] text-[#7a7a7a]">
                                        <Phone className="w-3 h-3 text-[#999999]" />
                                        <span>{u.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. MAIL */}
                              <td className="py-3.5 px-4 font-mono text-xs">
                                <a
                                  href={`mailto:${u.email}`}
                                  className="inline-flex items-center gap-1.5 text-[#0066cc] hover:underline"
                                  title={`Open email client for ${u.email}`}
                                >
                                  <Mail className="w-3.5 h-3.5 text-[#7a7a7a] flex-shrink-0" />
                                  <span>{u.email}</span>
                                </a>
                              </td>

                              {/* 3. POST (Plain words, no pill) */}
                              <td className="py-3.5 px-4 text-xs font-medium text-[#1d1d1f]">
                                {postName}
                              </td>

                              {/* 4. ACTIONS (Reset Password & Email Buttons) */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Reset Password Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(u)}
                                    disabled={resettingUserEmail === u.email}
                                    title={`Send password reset email to ${u.email}`}
                                    aria-label={`Send password reset email to ${u.email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#b45309] bg-[#fffbeb] hover:bg-[#fef3c7] border border-[#fde68a] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                  >
                                    {resettingUserEmail === u.email ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <KeyRound className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {resettingUserEmail === u.email ? 'Sending...' : 'Reset Password'}
                                    </span>
                                  </button>

                                  {/* Email Button */}
                                  <a
                                    href={`mailto:${u.email}`}
                                    title={`Open email client for ${u.fullName || u.email}`}
                                    aria-label={`Send email to ${u.fullName || u.email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#0066cc] bg-[#eef5ff] hover:bg-[#d6e6fb] border border-[#d6e6fb] transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Email</span>
                                  </a>
                                </div>

                                {userResetFeedback[u.email] && (
                                  <div
                                    className={`text-[11px] font-medium mt-1.5 ${
                                      userResetFeedback[u.email].type === 'success'
                                        ? 'text-[#156947]'
                                        : 'text-[#c4232d]'
                                    }`}
                                  >
                                    {userResetFeedback[u.email].text}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        {/* Interactive In-System Maintenance Confirmation Modal */}
        {maintenanceModalOpen && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!systemToggling) setMaintenanceModalOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-modal-title"
          >
            <div
              className="bg-white rounded-[22px] max-w-md w-full p-6 sm:p-7 border border-[#e0e0e0] shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setMaintenanceModalOpen(false)}
                disabled={systemToggling}
                aria-label="Close dialog"
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon & Heading */}
              <div className="flex items-center gap-3.5 mb-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    systemActive
                      ? 'bg-[#fff5f5] text-[#c4232d] border border-[#ffd6d6]'
                      : 'bg-[#eefaf3] text-[#156947] border border-[#cfeedd]'
                  }`}
                >
                  {systemActive ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3
                    id="maintenance-modal-title"
                    className="text-lg font-semibold tracking-tight text-[#1d1d1f]"
                  >
                    {systemActive ? 'Activate Maintenance Break?' : 'Resume Municipal System?'}
                  </h3>
                  <p className="text-xs text-[#7a7a7a]">
                    Biratnagar Metropolitan City · Administrative Gateway
                  </p>
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-3.5 my-5 text-sm text-[#555555] leading-relaxed">
                <p>
                  {systemActive
                    ? 'Activating a maintenance break will temporarily freeze login access for all Ward Executives and staff members across all 19 wards.'
                    : 'Resuming the municipal system will restore full login access for all authorized Ward Executives and municipal staff members.'}
                </p>

                <div
                  className={`p-3.5 rounded-[12px] text-xs leading-relaxed border ${
                    systemActive
                      ? 'bg-[#fff8f8] border-[#ffe0e0] text-[#a81c24]'
                      : 'bg-[#f0fbf5] border-[#d1f2e0] text-[#156947]'
                  }`}
                >
                  {systemActive ? (
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#c4232d]" />
                      <span>
                        <strong>Super Admin only:</strong> Only Chief Municipal Administrator credentials will be able to log in or access internal tools until maintenance is turned off.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#156947]" />
                      <span>
                        <strong>Normal operations:</strong> Ward Executives will be able to update infrastructure progress and respond to grievances across all wards immediately.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f0f0f2]">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  disabled={systemToggling}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#555555] hover:text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#ebebee] border border-[#e0e0e0] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSystemStatus(!systemActive)}
                  disabled={systemToggling}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white transition-all shadow-sm cursor-pointer disabled:opacity-60 ${
                    systemActive
                      ? 'bg-[#c4232d] hover:bg-[#a81c24]'
                      : 'bg-[#156947] hover:bg-[#0f4f35]'
                  }`}
                >
                  {systemToggling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating System...</span>
                    </>
                  ) : systemActive ? (
                    <span>Activate Maintenance</span>
                  ) : (
                    <span>Resume Operations</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If system is in maintenance break, non-Super Admins are completely blocked from viewing workspace
  if (!systemActive && userRole !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center selection:bg-[#0066cc] selection:text-white">
        <div className="max-w-md w-full bg-white rounded-[22px] p-8 border border-[#e0e0e0] shadow-[0_4px_30px_rgba(0,0,0,0.06)] flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fff5f5] text-[#c4232d] border border-[#ffd6d6] flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
            Municipal Maintenance Break Active
          </h2>
          <p className="text-xs text-[#7a7a7a] mt-2 mb-6 leading-relaxed">
            The municipal command system has been put into a maintenance break by the Super Admin. Ward Executive workspace operations are currently frozen.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Return to Staff Login Gateway</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2.5: CONTRACTOR WORKSPACE
  // ==========================================
  if (userRole === 'CONTRACTOR') {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc] selection:text-white flex flex-col font-sans">
        {/* Contractor Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e0e0e0]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/Biratnagar%20City%20Gate%20Logo.png"
                alt="City Gate Logo"
                className="h-10 w-auto object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg tracking-tight">
                    <span className="text-[#DC143C]">Nagar</span>
                    <span className="text-[#156947]">योजना</span>
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                    Civic Contractor Workspace
                  </span>
                </div>
                <p className="text-[11px] text-[#7a7a7a]">
                  Biratnagar Metropolitan City · Field Progress & Execution
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onReturnToPublic}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#7a7a7a]" />
                <span>Public Site</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#c4232d] bg-[#fff5f5] hover:bg-[#ffe9e9] border border-[#ffd6d6] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Contractor Main Body */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
          {/* Welcome Profile Card */}
          <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 text-[#1d1d1f] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                  Contractor ID: {userProfile?.contractorId || 'CON-4-1'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#eef5ff] text-[#0066cc] border border-[#d6e6fb]">
                  Jurisdiction: Ward {userProfile?.wardNumber || '04'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {userProfile?.companyName || userProfile?.displayName || 'Civic Infrastructure Contractor'}
              </h1>
              <p className="text-sm text-[#7a7a7a]">
                Logged In: <strong className="text-[#1d1d1f]">{currentUser.email}</strong> · Biratnagar Metropolitan City Appointed Vendor
              </p>
            </div>

            <div className="p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-[14px] text-xs text-[#4b5563] max-w-sm space-y-1">
              <strong className="block text-[#111827] font-semibold">Reporting Authorization</strong>
              <p className="leading-relaxed">
                You are authorized to report completion milestones, update physical progress percentage, and notify the metropolitan administration upon work completion.
              </p>
            </div>
          </section>

          {/* Assigned Projects Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">
                Assigned Civic Projects ({contractorProjects.length})
              </h2>
              <p className="text-xs text-[#7a7a7a]">
                Projects assigned to your company by the Ward Executive.
              </p>
            </div>

            <button
              type="button"
              onClick={loadContractorProjects}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#555555] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Projects List */}
          {contractorProjects.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[18px] border border-[#e0e0e0] shadow-sm">
              <Building2 className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#1d1d1f]">
                No Projects Currently Assigned
              </h3>
              <p className="text-xs text-[#7a7a7a] mt-1 max-w-md mx-auto leading-relaxed">
                Your contractor account is registered, but no active projects are currently linked. Your Ward Executive will assign projects to your account upon contract finalization.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contractorProjects.map((project) => {
                const fState = contractorFormState[project.id] || {
                  progress: project.progress || 0,
                  status: project.status || 'ACTIVE',
                  remarks: project.contractorRemarks || '',
                };

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-[18px] p-6 border border-[#e0e0e0] shadow-sm flex flex-col justify-between space-y-5"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#333333] border border-[#e0e0e0]">
                          {project.sector || 'Roads & Drainage'}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase border ${
                            fState.status === 'COMPLETED'
                              ? 'bg-[#eefaf3] text-[#156947] border-[#cfeedd]'
                              : fState.status === 'ACTIVE'
                              ? 'bg-[#eef5ff] text-[#0066cc] border-[#d6e6fb]'
                              : 'bg-[#fff8e6] text-[#8a5a00] border-[#fbe8b5]'
                          }`}
                        >
                          {fState.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-[#1d1d1f]">
                        {project.title}
                      </h3>
                      <p className="text-xs text-[#7a7a7a] mt-1">
                        Location: {project.location} · Jurisdiction: {project.ward || `Ward ${project.wardNumber}`}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-[#fafafc] rounded-[12px] border border-[#eef0f3] text-xs">
                        <div>
                          <span className="text-[#7a7a7a] block text-[11px]">Budget Allocation:</span>
                          <strong className="text-[#1d1d1f] font-mono">NPR {project.budget}</strong>
                        </div>
                        <div>
                          <span className="text-[#7a7a7a] block text-[11px]">Target Date:</span>
                          <strong className="text-[#1d1d1f]">{project.date || '2082-01-01 (B.S.)'}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-[#4b5563] mt-3 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    {/* Progress Reporting Controls */}
                    <div className="pt-4 border-t border-[#f0f0f2] space-y-4">
                      {/* Physical Progress Slider */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#1d1d1f] mb-1.5">
                          <span>Milestone Physical Progress</span>
                          <span className="font-mono text-[#156947] font-bold text-base">
                            {fState.progress}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fState.progress}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setContractorFormState((prev) => ({
                              ...prev,
                              [project.id]: { ...fState, progress: val },
                            }));
                          }}
                          className="w-full accent-[#156947] cursor-pointer h-2 bg-[#e5e7eb] rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-[#9ca3af] mt-1 font-mono">
                          <span>0% (Commenced)</span>
                          <span>50% (Mid-Term)</span>
                          <span>100% (Completed)</span>
                        </div>
                      </div>

                      {/* Milestone Status Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-[#333333] mb-1">
                          Execution Status
                        </label>
                        <select
                          value={fState.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContractorFormState((prev) => ({
                              ...prev,
                              [project.id]: { ...fState, status: val },
                            }));
                          }}
                          className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3 py-2 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE · Construction Underway</option>
                          <option value="DELAYED">DELAYED · Impeded by Weather / Materials</option>
                          <option value="COMPLETED">COMPLETED · Final Handover Ready</option>
                        </select>
                      </div>

                      {/* Progress Remarks / Field Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-[#333333] mb-1">
                          Contractor Field Progress Remarks
                        </label>
                        <input
                          type="text"
                          value={fState.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContractorFormState((prev) => ({
                              ...prev,
                              [project.id]: { ...fState, remarks: val },
                            }));
                          }}
                          placeholder="e.g. Sub-grade excavation completed; gravel compaction scheduled."
                          className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent"
                        />
                      </div>

                      {/* Save Button & Feedback */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {contractorFeedbackMsg[project.id] && (
                            <span
                              className={`text-xs font-semibold inline-flex items-center gap-1 ${
                                contractorFeedbackMsg[project.id].type === 'success'
                                  ? 'text-[#156947]'
                                  : 'text-[#c4232d]'
                              }`}
                            >
                              {contractorFeedbackMsg[project.id].type === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              <span>{contractorFeedbackMsg[project.id].text}</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={contractorUpdatingId === project.id}
                          onClick={() => handleContractorSaveProgress(project.id)}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#156947] hover:bg-[#0f4f35] transition-all shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          {contractorUpdatingId === project.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving Milestones...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Milestone Progress</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: WARD EXECUTIVE WORKSPACE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0066cc] selection:text-white flex flex-col font-sans">
      {/* Ward Executive Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e0e0e0]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Biratnagar%20City%20Gate%20Logo.png"
              alt="City Gate Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight">
                  <span className="text-[#DC143C]">Nagar</span>
                  <span className="text-[#156947]">योजना</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                  Ward {userProfile?.wardNumber || '04'} Executive
                </span>
              </div>
              <p className="text-[11px] text-[#7a7a7a]">
                Biratnagar Metropolitan City · Executive Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#1d1d1f] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#7a7a7a]" />
              <span>Public Site</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#c4232d] bg-[#fff5f5] hover:bg-[#ffe9e9] border border-[#ffd6d6] transition-colors cursor-pointer"
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
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 text-[#1d1d1f] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#eef5ff] text-[#0066cc] border border-[#d6e6fb]">
                ID: {userProfile?.executiveId || `WE-${userProfile?.wardNumber || 4}-1`}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                <span className="w-2 h-2 rounded-full bg-[#2e9d6a]" />
                Authorized Ward Executive
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Ward {userProfile?.wardNumber || '04'} Executive Workspace
            </h1>
            <p className="text-sm text-[#7a7a7a]">
              Executive: <strong className="text-[#1d1d1f]">{userProfile?.displayName || userProfile?.fullName || 'Ward Executive'}</strong> · Contact: {currentUser.email}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('create-project')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('appoint-contractor')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#156947] bg-[#eefaf3] hover:bg-[#d1f2e0] border border-[#cfeedd] transition-colors cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Appoint Contractor</span>
            </button>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e0e0e0] pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Ward Projects ({wardProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create-project')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'create-project'
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Project</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appoint-contractor')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'appoint-contractor'
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Appoint Contractor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contractors')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'contractors'
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contractors Directory ({wardContractors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grievances')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'grievances'
                ? 'bg-[#0066cc] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Citizen Grievances ({wardGrievances.length})</span>
          </button>
        </div>

        {/* TAB 1: Ward Projects (Read-Only Display Bars) */}
        {activeTab === 'projects' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#1d1d1f]">
                  Infrastructure Projects in Ward {userProfile?.wardNumber || '04'}
                </h2>
                <p className="text-xs text-[#7a7a7a]">
                  Executive overview with verified physical progress reported by appointed contractors.
                </p>
              </div>
            </div>

            {wardProjects.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-[18px] border border-[#e0e0e0] shadow-sm">
                <Building2 className="w-10 h-10 text-[#7a7a7a] mx-auto mb-2" />
                <p className="text-base font-semibold text-[#1d1d1f]">
                  No projects currently listed for Ward {userProfile?.wardNumber || '04'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create-project')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Ward Project</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {wardProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-[18px] p-5 border border-[#e0e0e0] shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#333333] border border-[#e0e0e0]">
                          {project.sector || 'Public Works'}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase border ${
                            project.status === 'COMPLETED'
                              ? 'bg-[#eefaf3] text-[#156947] border-[#cfeedd]'
                              : project.status === 'ACTIVE'
                              ? 'bg-[#eef5ff] text-[#0066cc] border-[#d6e6fb]'
                              : 'bg-[#fff8e6] text-[#8a5a00] border-[#fbe8b5]'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[#1d1d1f]">
                        {project.title}
                      </h3>
                      <p className="text-xs text-[#7a7a7a] mt-1">
                        Location: {project.location} · Budget: <span className="font-mono font-semibold text-[#1d1d1f]">NPR {project.budget}</span>
                      </p>
                      <p className="text-xs text-[#333333] mt-2 line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    {/* Read-Only Physical Progress Bar & Contractor Info */}
                    <div className="pt-3 border-t border-[#f0f0f0] space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#333333]">
                        <span className="text-[#555555]">Physical Progress (Contractor Verified)</span>
                        <span className="font-mono text-[#156947] font-bold text-sm">
                          {project.progress || 0}%
                        </span>
                      </div>

                      {/* Display Bar */}
                      <div className="w-full bg-[#f0f0f2] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#156947] h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
                        />
                      </div>

                      {/* Appointed Contractor Status */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[#7a7a7a]">Appointed Contractor:</span>
                        {project.contractor && project.contractor !== 'Pending Appointment' ? (
                          <span className="font-semibold text-[#1d1d1f] flex items-center gap-1.5 bg-[#f8fafc] px-2.5 py-0.5 rounded-full border border-[#e2e8f0]">
                            <Briefcase className="w-3.5 h-3.5 text-[#156947]" />
                            <span>{project.contractor}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setContractorProjectId(String(project.id));
                              setActiveTab('appoint-contractor');
                            }}
                            className="font-semibold text-[#0066cc] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Appoint Contractor</span>
                          </button>
                        )}
                      </div>

                      {project.contractorRemarks && (
                        <div className="p-2 bg-[#f8fafc] rounded-lg border border-[#eef0f3] text-[11px] text-[#4b5563]">
                          <strong className="text-[#1d1d1f]">Contractor Remark:</strong> {project.contractorRemarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Create Project Module */}
        {activeTab === 'create-project' && (
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-[#e0e0e0] shadow-sm max-w-2xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef5ff] text-[#0066cc] border border-[#d6e6fb]">
                  Ward {userProfile?.wardNumber || '04'} Development
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
                Create Civic Infrastructure Project
              </h2>
              <p className="text-xs text-[#7a7a7a] mt-1">
                Propose and register a new infrastructure project under the Biratnagar Metropolitan City civic budget.
              </p>
            </div>

            {createProjFeedback && (
              <div
                className={`p-3.5 rounded-[12px] text-xs font-semibold flex items-center gap-2 ${
                  createProjFeedback.type === 'success'
                    ? 'bg-[#eefaf3] text-[#156947] border border-[#cfeedd]'
                    : 'bg-[#fff5f5] text-[#c4232d] border border-[#ffd6d6]'
                }`}
              >
                {createProjFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{createProjFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Project Title <span className="text-[#c4232d]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createProjTitle}
                  onChange={(e) => setCreateProjTitle(e.target.value)}
                  placeholder="e.g. Ward 04 Solar Streetlight Installation"
                  className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Sector Classification <span className="text-[#c4232d]">*</span>
                  </label>
                  <select
                    value={createProjSector}
                    onChange={(e) => setCreateProjSector(e.target.value)}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent cursor-pointer"
                  >
                    <option value="Roads & Drainage">Roads & Drainage</option>
                    <option value="Water & Sanitation">Water & Sanitation</option>
                    <option value="Public Facilities">Public Facilities</option>
                    <option value="Electricity & Energy">Electricity & Energy</option>
                    <option value="Urban Beautification">Urban Beautification</option>
                    <option value="Waste Management">Waste Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Project Location / Marg <span className="text-[#c4232d]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createProjLocation}
                    onChange={(e) => setCreateProjLocation(e.target.value)}
                    placeholder="e.g. Main Chowk, Ward 04"
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Budget Allocation (NPR) <span className="text-[#c4232d]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createProjBudget}
                    onChange={(e) => setCreateProjBudget(e.target.value)}
                    placeholder="e.g. 50,00,000"
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm font-mono text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Target Completion Date <span className="text-[#c4232d]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createProjTargetDate}
                    onChange={(e) => setCreateProjTargetDate(e.target.value)}
                    placeholder="e.g. 2082-04-15 (B.S.)"
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Project Description & Specifications <span className="text-[#c4232d]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={createProjDescription}
                  onChange={(e) => setCreateProjDescription(e.target.value)}
                  placeholder="Outline the scope of work, technical specifications, and expected civic impact..."
                  className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] p-3 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f0f2]">
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-[#555555] bg-[#f5f5f7] hover:bg-[#ebebee] border border-[#e0e0e0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjLoading}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {createProjLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Project...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 3: Appoint Contractor Module */}
        {activeTab === 'appoint-contractor' && (
          <section className="bg-white rounded-[18px] p-6 sm:p-8 border border-[#e0e0e0] shadow-sm max-w-2xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                  Contractor Assignment
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#f5f5f7] text-[#333333] border border-[#e0e0e0]">
                  Preview ID: {dynamicContractorPreviewId}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
                Appoint & Provision Civic Contractor
              </h2>
              <p className="text-xs text-[#7a7a7a] mt-1">
                Assign a certified contractor to an infrastructure project. The system will create their account and dispatch credentials via Resend.
              </p>
            </div>

            {contractorSuccessData && (
              <div className="p-4 bg-[#f0fbf5] border border-[#d1f2e0] rounded-[14px] text-xs text-[#156947] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#156947]" />
                  <span>Contractor Successfully Appointed & Provisioned!</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p><strong>Company:</strong> {contractorSuccessData.companyName}</p>
                  <p><strong>Contractor ID:</strong> <span className="font-mono font-bold">{contractorSuccessData.contractorId}</span></p>
                  <p><strong>Login Email:</strong> {contractorSuccessData.email}</p>
                  <p className="text-[11px] text-[#15803d]">
                    {contractorSuccessData.emailSent
                      ? '✓ Onboarding email dispatched via Resend (strictly from "Nagar Yojana").'
                      : 'Credentials updated. Note: verify SMTP or check backend logs if testing locally.'}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#156947] text-white hover:bg-[#0f4f35] transition-colors cursor-pointer"
                  >
                    View Assigned Project
                  </button>
                </div>
              </div>
            )}

            {contractorError && (
              <div className="p-3.5 bg-[#fff5f5] border border-[#ffd6d6] rounded-[11px] text-xs text-[#c4232d] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{contractorError}</span>
              </div>
            )}

            <form onSubmit={handleAppointContractor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Contractor / Company Name <span className="text-[#c4232d]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="e.g. Shiva Construction Pvt. Ltd."
                  className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Contractor Login Email <span className="text-[#c4232d]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={contractorEmail}
                    onChange={(e) => setContractorEmail(e.target.value)}
                    placeholder="contractor@example.com"
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#333333] mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contractorPhone}
                    onChange={(e) => setContractorPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1">
                  Assign to Project <span className="text-[#c4232d]">*</span>
                </label>
                <select
                  required
                  value={contractorProjectId}
                  onChange={(e) => setContractorProjectId(e.target.value)}
                  className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#156947] focus:border-transparent cursor-pointer"
                >
                  <option value="">-- Select Project in Ward {userProfile?.wardNumber || '04'} --</option>
                  {wardProjects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.title} (Budget: NPR {p.budget} · Current: {p.contractor || 'Unassigned'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#fffbeb] border border-[#fde68a] rounded-[11px] text-xs text-[#92400e] leading-relaxed">
                <strong>Dynamic Email Dispatch:</strong> Upon appointment, a credential email will be dispatched to the contractor with sender strictly set to <em>"Nagar Yojana"</em> and subject <em>"Ward {userProfile?.wardNumber || '04'} | {'{Project Title}'} - Contractor Assignment"</em>.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f0f2]">
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-[#555555] bg-[#f5f5f7] hover:bg-[#ebebee] border border-[#e0e0e0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contractorLoading}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-semibold text-white bg-[#156947] hover:bg-[#0f4f35] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {contractorLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning Contractor...</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Appoint Contractor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 4: Appointed Contractors Directory */}
        {activeTab === 'contractors' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#1d1d1f]">
                  Appointed Contractors Directory · Ward {userProfile?.wardNumber || '04'}
                </h2>
                <p className="text-xs text-[#7a7a7a]">
                  Manage active contractor credentials and project assignments.
                </p>
              </div>

              <button
                type="button"
                onClick={loadWardContractors}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#555555] bg-white hover:bg-[#f5f5f7] border border-[#e0e0e0] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {wardContractors.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-[18px] border border-[#e0e0e0] shadow-sm">
                <Users className="w-10 h-10 text-[#7a7a7a] mx-auto mb-2" />
                <p className="text-base font-semibold text-[#1d1d1f]">
                  No contractors currently registered for Ward {userProfile?.wardNumber || '04'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('appoint-contractor')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#156947] hover:bg-[#0f4f35] transition-colors cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Appoint New Contractor</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wardContractors.map((c) => (
                  <div
                    key={c.uid}
                    className="bg-white rounded-[18px] p-5 border border-[#e0e0e0] shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                        {c.contractorId || 'CON-4'}
                      </span>
                      <span className="text-[11px] font-semibold text-[#156947] bg-[#f0fdf4] px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#1d1d1f]">
                        {c.companyName || c.fullName || 'Contractor Company'}
                      </h4>
                      <p className="text-xs text-[#7a7a7a] mt-0.5">{c.email}</p>
                      {c.phone && <p className="text-xs text-[#7a7a7a]">Phone: {c.phone}</p>}
                    </div>

                    <div className="p-2.5 bg-[#fafafc] rounded-[10px] border border-[#eef0f3] text-xs">
                      <span className="text-[#7a7a7a] block text-[11px]">Assigned Project:</span>
                      <strong className="text-[#1d1d1f] line-clamp-1">{c.projectTitle || `Project ID: ${c.projectId}`}</strong>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f2]">
                      <button
                        type="button"
                        disabled={resendingContractorUid === c.uid}
                        onClick={() => handleResendContractor(c)}
                        className="text-xs font-semibold text-[#0066cc] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {resendingContractorUid === c.uid ? 'Resending...' : 'Resend Credentials'}
                      </button>

                      <button
                        type="button"
                        disabled={revokingContractorUid === c.uid}
                        onClick={() => handleRevokeContractor(c)}
                        className="text-xs font-semibold text-[#c4232d] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {revokingContractorUid === c.uid ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 5: Citizen Grievances in Ward */}
        {activeTab === 'grievances' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f]">
                Citizen Grievance Queue · Ward {userProfile?.wardNumber || '04'}
              </h2>
              <p className="text-xs text-[#7a7a7a]">
                Issues reported by local residents requiring executive review or field inspection.
              </p>
            </div>

            {wardGrievances.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-[18px] border border-[#e0e0e0]">
                <CheckCircle2 className="w-8 h-8 text-[#2e9d6a] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1d1d1f]">
                  No Pending Grievances
                </p>
                <p className="text-xs text-[#7a7a7a] mt-1">
                  All citizen reports for Ward {userProfile?.wardNumber || '04'} are clear.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {wardGrievances.map((grv) => (
                  <div
                    key={grv.id}
                    className="bg-white rounded-[18px] p-5 border border-[#e0e0e0] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#7a7a7a]">
                          {grv.id}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fff5f5] text-[#c4232d] border border-[#ffd6d6]">
                          {grv.issueType}
                        </span>
                        <span className="text-xs text-[#7a7a7a]">
                          · On: {grv.projectTitle}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#1d1d1f]">
                        "{grv.description}"
                      </p>
                      <p className="text-xs text-[#7a7a7a]">
                        Reported by: <strong className="text-[#333333]">{grv.name}</strong> · Contact: {grv.phone} · Date: {new Date(grv.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <span className="text-xs font-semibold text-[#333333]">
                        Action:
                      </span>
                      <select
                        value={grv.status}
                        onChange={(e) => handleUpdateGrievanceStatus(grv.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                          grv.status === 'RESOLVED'
                            ? 'bg-[#eefaf3] text-[#156947] border-[#cfeedd]'
                            : grv.status === 'INVESTIGATING'
                            ? 'bg-[#fff8e6] text-[#8a5a00] border-[#fbe8b5]'
                            : 'bg-[#fff5f5] text-[#c4232d] border-[#ffd6d6]'
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
