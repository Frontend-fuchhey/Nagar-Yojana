import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Real-time subscription to all civic projects.
 * @param {function} callback - Callback receiving the list of projects
 * @param {function} [onError] - Optional error callback
 * @returns {function} Unsubscribe function
 */
export const subscribeToProjects = (callback, onError) => {
  const projectsRef = collection(db, 'projects');
  return onSnapshot(
    projectsRef,
    (snapshot) => {
      const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(projects);
    },
    (error) => {
      console.error('Error subscribing to projects:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Real-time subscription to projects filtered by ward.
 * @param {string|number} wardNumber - The ward identifier (e.g. 'Ward 04', 4, etc.)
 * @param {function} callback - Callback receiving the list of ward projects
 * @param {function} [onError] - Optional error callback
 * @returns {function} Unsubscribe function
 */
export const subscribeToWardProjects = (wardNumber, callback, onError) => {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('ward', '==', wardNumber));
  return onSnapshot(
    q,
    (snapshot) => {
      const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(projects);
    },
    (error) => {
      console.error(`Error subscribing to projects for ward ${wardNumber}:`, error);
      if (onError) onError(error);
    }
  );
};

/**
 * Real-time subscription to citizen grievances / issues, optionally filtered by ward.
 * Supports both signatures:
 *   subscribeToGrievances(wardNumber, callback, onError)
 *   subscribeToGrievances(callback, onError)
 * @param {string|number|function} wardNumberOrCallback - Ward identifier or callback function
 * @param {function} [callback] - Callback receiving list of grievances
 * @param {function} [onError] - Optional error callback
 * @returns {function} Unsubscribe function
 */
export const subscribeToGrievances = (wardNumberOrCallback, callback, onError) => {
  let targetWard = null;
  let cb = callback;
  let errCb = onError;

  if (typeof wardNumberOrCallback === 'function') {
    cb = wardNumberOrCallback;
    errCb = callback;
  } else {
    targetWard = wardNumberOrCallback;
  }

  const grievancesRef = collection(db, 'grievances');
  const q = targetWard && targetWard !== 'All'
    ? query(grievancesRef, where('ward', '==', targetWard))
    : grievancesRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const grievances = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (cb) cb(grievances);
    },
    (error) => {
      console.error('Error subscribing to grievances:', error);
      if (errCb) errCb(error);
    }
  );
};

/**
 * Helper to submit a citizen grievance into Firestore
 * @param {object} grievanceData
 * @returns {Promise<DocumentReference>}
 */
export const submitGrievance = async (grievanceData) => {
  const grievancesRef = collection(db, 'grievances');
  return await addDoc(grievancesRef, {
    ...grievanceData,
    status: grievanceData.status || 'PENDING',
    createdAt: serverTimestamp(),
  });
};
