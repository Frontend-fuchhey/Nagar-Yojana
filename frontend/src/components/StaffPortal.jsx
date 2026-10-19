import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
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
  Check,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { API_BASE_URL } from '../apiConfig';

const API_BASE = API_BASE_URL;

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
  const [lockInfo, setLockInfo] = useState(null); // { email, until } when an email is locked
  const [inactivityNotice, setInactivityNotice] = useState('');

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
  const [adminTaskTab, setAdminTaskTab] = useState('all'); // 'all' | 'executives' | 'lockouts'
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
      if (reason === 'inactivity') {
        setInactivityNotice(
          'For municipal security, your session ended due to 15 minutes of inactivity. Please sign in again.'
        );
      }
    }
  };

  // 1. Firebase Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          if (isIdleExpired) {
            setInactivityNotice(
              'For municipal security, your session ended due to 15 minutes of inactivity. Please sign in again.'
            );
          }
          setAuthLoading(false);
          return;
        }

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

  useEffect(() => {
    if (userRole === 'WARD_EXEC' && userProfile?.wardNumber) {
      loadWardWorkspaceData(userProfile.wardNumber);
    }
  }, [userRole, userProfile]);

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

      // 2. Enforce session persistence (Option A) and attempt sign-in
      await setPersistence(auth, browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, loginPassword);

      // Mark session as actively authorized in this browser session
      sessionStorage.setItem('staff_session_active', '1');
      localStorage.setItem('staff_last_active', String(Date.now()));

      // 3. Success: reset the failure counter
      try {
        const token = await cred.user.getIdToken();
        await callAuthApi('clear-failures', {}, token);
      } catch (clearErr) {
        console.warn('Could not clear failed attempts:', clearErr.message);
      }
      setLockInfo(null);
    } catch (err) {
      console.error('Sign In Error:', err);
      let msg = 'Failed to sign in. Please verify your municipal credentials.';
      const wrongCredentials =
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found';

      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in Firebase Console. Please enable Email/Password under Authentication â†’ Sign-in method in the Firebase Console.';
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
      setInactivityNotice('');
    } catch (err) {
      console.error('Sign Out Error:', err);
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
              <h1 className="text-[28px] font-semibold tracking-tight flex items-center justify-center gap-1.5">
                <span className="text-[#DC143C]">Nagar</span>
                <span className="text-[#156947]">योजना</span>
              </h1>
              <p className="text-sm text-[#7a7a7a] mt-2">
                Biratnagar Metropolitan City · Municipal Command Gateway
              </p>
              <p className="text-xs text-[#7a7a7a] mt-0.5">
                विराटनगर महानगरपालिका · आन्तरिक प्रशासन
              </p>
            </div>

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
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="staff-email" className="block text-xs font-semibold text-[#333333] mb-1.5">
                  Official Municipal Email
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
                  Passphrase / Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="staff-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginSubmitting || isLoginLocked}
                    className="w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] pl-10 pr-3.5 py-3 text-sm text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
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
                    <span>Sign In to Staff Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-[#f0f0f0] text-center">
              <p className="text-[11px] text-[#7a7a7a] leading-relaxed">
                Authorized municipal staff and designated ward executives only. Unauthorized access attempts are audited and logged.
              </p>
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#c4232d] bg-[#fff5f5] hover:bg-[#ffe9e9] border border-[#ffd6d6] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
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

            <div className="hidden md:flex items-center gap-2 text-xs text-[#7a7a7a]">
              <span className="w-2 h-2 rounded-full bg-[#156947] animate-pulse" />
              <span>Municipal System Active</span>
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
                    Official Executive Gmail *
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
              <span>Public Portal</span>
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
        <section className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 sm:p-7 text-[#1d1d1f] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#eef5ff] text-[#0066cc] border border-[#d6e6fb]">
                ID: {userProfile?.executiveId || `WE-${userProfile?.wardNumber || 4}-1`}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#eefaf3] text-[#156947] border border-[#cfeedd]">
                <span className="w-2 h-2 rounded-full bg-[#2e9d6a]" />
                Authorized Executive
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Ward {userProfile?.wardNumber || '04'} Executive Workspace
            </h1>
            <p className="text-sm text-[#7a7a7a]">
              Executive: <strong className="text-[#1d1d1f]">{userProfile?.displayName || userProfile?.fullName || 'Ward Executive'}</strong> · Official Contact: {currentUser.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="sm:hidden inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-[#1d1d1f] border border-[#e0e0e0]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </button>
          </div>
        </section>

        {/* Tab Controls: Ward Projects vs Citizen Grievances */}
        <div className="flex items-center gap-2 border-b border-[#e0e0e0] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[#0066cc] text-white'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Ward Projects ({wardProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grievances')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'grievances'
                ? 'bg-[#0066cc] text-white'
                : 'bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#e0e0e0]'
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
                <h2 className="text-base font-semibold text-[#1d1d1f]">
                  Infrastructure Projects in Ward {userProfile?.wardNumber || '04'}
                </h2>
                <p className="text-xs text-[#7a7a7a]">
                  Update project completion milestones, physical progress, and status.
                </p>
              </div>
            </div>

            {wardProjects.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-[18px] border border-[#e0e0e0]">
                <Building2 className="w-8 h-8 text-[#7a7a7a] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#1d1d1f]">
                  No projects currently listed for Ward {userProfile?.wardNumber || '04'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {wardProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-[18px] p-5 border border-[#e0e0e0] flex flex-col justify-between space-y-4"
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
                        {project.location} · Contractor: {project.contractor}
                      </p>
                      <p className="text-xs text-[#333333] mt-2 line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    {/* Progress Slider & Status Editor */}
                    <div className="pt-3 border-t border-[#f0f0f0] space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#333333] mb-1">
                          <span>Physical Progress</span>
                          <span className="font-mono text-[#156947] font-bold">
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
                          className="w-full accent-[#0066cc] cursor-pointer"
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
                          className="flex-1 bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-2.5 py-2 text-xs font-semibold text-[#1d1d1f] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
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
                          className="px-4 py-2 rounded-full text-xs font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-colors flex items-center gap-1 disabled:opacity-60 cursor-pointer"
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
                        <p className="text-[11px] font-semibold text-[#156947] flex items-center gap-1">
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
