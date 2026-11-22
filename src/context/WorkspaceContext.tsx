import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { createInitialDemoWorkspace } from '../lib/demoData';
import {
  ActivityRecord,
  CalendarEventRecord,
  DocumentAnalysis,
  DocumentRecord,
  IntegrationProvider,
  IntegrationRecord,
  NavSection,
  NotificationRecord,
  PriorityLevel,
  SourceMethod,
  TaskRecord,
  TaskStatus,
  UserProfile,
  WorkflowHistoryEntry,
  WorkflowRecord,
  WorkflowStatus,
} from '../types/procify';

const DEMO_STORAGE_KEY = 'procify_demo_workspace_v1';
const THEME_STORAGE_KEY = 'procify_theme_v1';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function clampStr(val: string | undefined | null, maxLen: number): string {
  if (!val) return '';
  return String(val).trim().slice(0, maxLen);
}

function toIsoString(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof (ts as any)?.toDate === 'function') return (ts as any).toDate().toISOString();
  return new Date().toISOString();
}

export interface DuplicateMatch {
  document: DocumentRecord;
  matchType: 'exact_file' | 'exact_content' | 'similar_content';
  similarityPercent: number;
}

export interface WorkflowDraftPayload {
  id?: string;
  documentId?: string;
  documentTitle?: string;
  title: string;
  description: string;
  category: string;
  objective: string;
  sourceMethod: SourceMethod;
  status: WorkflowStatus;
  priority: PriorityLevel;
  responsibleRoles: string[];
  completionConditions: string[];
  requiredApprovals: string[];
  tasks: Array<{
    id?: string;
    title: string;
    description: string;
    assignedUser: string;
    priority: PriorityLevel;
    startDate: string;
    dueDate: string;
    status: TaskStatus;
    dependencies: string[];
    orderIndex: number;
    reminderDate: string;
    reminderTime: string;
  }>;
  historyNote?: string;
}

interface WorkspaceContextValue {
  // Auth & mode
  firebaseUser: User | null;
  authLoading: boolean;
  isDemoMode: boolean;
  isAuthenticated: boolean;
  emailVerified: boolean;
  profile: UserProfile | null;

  // Navigation & Theme
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Cross-module handoff state
  pendingDocumentForBuilder: DocumentRecord | null;
  setPendingDocumentForBuilder: (doc: DocumentRecord | null) => void;
  editingWorkflowId: string | null;
  setEditingWorkflowId: (id: string | null) => void;
  pendingAssistantPrompt: string | null;
  setPendingAssistantPrompt: (prompt: string | null) => void;

  // Workspace Data
  documents: DocumentRecord[];
  workflows: WorkflowRecord[];
  tasks: TaskRecord[];
  calendarEvents: CalendarEventRecord[];
  notifications: NotificationRecord[];
  activities: ActivityRecord[];
  integrations: IntegrationRecord[];

  // Auth Actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  resetDemoWorkspace: () => void;

  // Data Actions
  checkDuplicateDocument: (fileHash: string, normalizedHash: string, contentExcerpt: string) => DuplicateMatch[];
  saveDocument: (input: {
    title: string;
    category: string;
    sourceType: 'pdf' | 'image' | 'txt' | 'text';
    fileName: string;
    fileHash: string;
    normalizedHash: string;
    contentExcerpt: string;
    analysis: DocumentAnalysis;
  }) => Promise<DocumentRecord>;
  updateDocumentAnalysis: (docId: string, title: string, category: string, analysis: DocumentAnalysis) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;

  saveWorkflowWithTasks: (draft: WorkflowDraftPayload) => Promise<WorkflowRecord>;
  transitionWorkflowStatus: (workflowId: string, newStatus: WorkflowStatus, note: string) => Promise<void>;
  duplicateWorkflow: (workflowId: string) => Promise<WorkflowRecord>;
  deleteWorkflow: (workflowId: string) => Promise<void>;

  createTask: (input: Omit<TaskRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<TaskRecord>;
  updateTask: (taskId: string, patch: Partial<TaskRecord>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  addCalendarEvent: (input: Omit<CalendarEventRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCalendarEvent: (eventId: string, patch: Partial<CalendarEventRecord>) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;

  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  createInAppNotification: (title: string, message: string, type: NotificationRecord['type'], relatedId?: string) => Promise<void>;

  saveIntegrationConfig: (
    provider: IntegrationProvider,
    status: IntegrationRecord['status'],
    webhookUrl: string,
    configNotes: string
  ) => Promise<void>;

  updateUserProfile: (patch: Partial<Pick<UserProfile, 'fullName' | 'role' | 'organization' | 'reminderPreferences'>>) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('procify_active_demo') === 'true';
    } catch {
      return false;
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [pendingDocumentForBuilder, setPendingDocumentForBuilder] = useState<DocumentRecord | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [pendingAssistantPrompt, setPendingAssistantPrompt] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);

  const reminderCheckedRef = useRef<string>('');

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failure
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Load Demo Data helper
  const loadDemoData = useCallback(() => {
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile(parsed.profile);
        setDocuments(parsed.documents || []);
        setWorkflows(parsed.workflows || []);
        setTasks(parsed.tasks || []);
        setCalendarEvents(parsed.calendarEvents || []);
        setNotifications(parsed.notifications || []);
        setActivities(parsed.activities || []);
        setIntegrations(parsed.integrations || []);
        return;
      }
    } catch {
      // fall back to fresh demo
    }
    const seed = createInitialDemoWorkspace();
    setProfile(seed.profile);
    setDocuments(seed.documents);
    setWorkflows(seed.workflows);
    setTasks(seed.tasks);
    setCalendarEvents(seed.calendarEvents);
    setNotifications(seed.notifications);
    setActivities(seed.activities);
    setIntegrations(seed.integrations);
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    } catch {
      // ignore
    }
  }, []);

  // Persist Demo Data whenever mutated in Demo Mode
  useEffect(() => {
    if (!isDemoMode || !profile) return;
    try {
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({
          profile,
          documents,
          workflows,
          tasks,
          calendarEvents,
          notifications,
          activities,
          integrations,
        })
      );
    } catch {
      // ignore
    }
  }, [isDemoMode, profile, documents, workflows, tasks, calendarEvents, notifications, activities, integrations]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        setIsDemoMode(false);
        try {
          localStorage.removeItem('procify_active_demo');
        } catch {
          // ignore
        }
      }
    });
    return () => unsub();
  }, []);

  // Load demo or subscribe to Firestore when auth changes
  useEffect(() => {
    if (isDemoMode && !firebaseUser) {
      loadDemoData();
      return;
    }

    if (!firebaseUser || !firebaseUser.emailVerified) {
      if (!isDemoMode) {
        setProfile(null);
        setDocuments([]);
        setWorkflows([]);
        setTasks([]);
        setCalendarEvents([]);
        setNotifications([]);
        setActivities([]);
        setIntegrations([]);
      }
      return;
    }

    const uid = firebaseUser.uid;

    // Ensure user profile exists
    const userRef = doc(db, 'users', uid);
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: data.uid,
            fullName: data.fullName,
            email: data.email,
            role: data.role || 'operations',
            organization: data.organization || '',
            reminderPreferences: data.reminderPreferences || {
              inAppEnabled: true,
              emailEnabled: false,
              dailyDigestTime: '09:00',
              leadDays: 3,
            },
          });
        } else {
          const defaultProfile: UserProfile = {
            uid,
            fullName: clampStr(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Procify User', 120),
            email: clampStr(firebaseUser.email || 'user@procify.ai', 200),
            role: 'operations',
            organization: '',
            reminderPreferences: {
              inAppEnabled: true,
              emailEnabled: false,
              dailyDigestTime: '09:00',
              leadDays: 3,
            },
          };
          setDoc(userRef, {
            ...defaultProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${uid}`));
          setProfile(defaultProfile);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
    );

    const unsubDocs = onSnapshot(
      query(collection(db, 'documents'), where('userId', '==', uid)),
      (snap) => {
        const list: DocumentRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            title: data.title,
            category: data.category || 'General',
            sourceType: data.sourceType,
            fileName: data.fileName || '',
            fileHash: data.fileHash,
            normalizedHash: data.normalizedHash,
            contentExcerpt: data.contentExcerpt || '',
            analysis: data.analysis,
            isDemo: Boolean(data.isDemo),
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setDocuments(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
    );

    const unsubWorkflows = onSnapshot(
      query(collection(db, 'workflows'), where('userId', '==', uid)),
      (snap) => {
        const list: WorkflowRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            documentId: data.documentId || '',
            documentTitle: data.documentTitle || '',
            title: data.title,
            description: data.description || '',
            category: data.category || 'Operations',
            objective: data.objective || '',
            sourceMethod: data.sourceMethod,
            status: data.status,
            priority: data.priority,
            responsibleRoles: data.responsibleRoles || [],
            completionConditions: data.completionConditions || [],
            requiredApprovals: data.requiredApprovals || [],
            history: data.history || [],
            taskCount: Number(data.taskCount ?? 0),
            completedTaskCount: Number(data.completedTaskCount ?? 0),
            progress: Number(data.progress ?? 0),
            isDemo: Boolean(data.isDemo),
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setWorkflows(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'workflows')
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('userId', '==', uid)),
      (snap) => {
        const list: TaskRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            workflowId: data.workflowId,
            workflowTitle: data.workflowTitle || '',
            title: data.title,
            description: data.description || '',
            assignedUser: data.assignedUser || '',
            priority: data.priority,
            startDate: data.startDate || '',
            dueDate: data.dueDate || '',
            status: data.status,
            dependencies: data.dependencies || [],
            orderIndex: Number(data.orderIndex ?? 0),
            reminderDate: data.reminderDate || '',
            reminderTime: data.reminderTime || '',
            isDemo: Boolean(data.isDemo),
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        list.sort((a, b) => a.orderIndex - b.orderIndex);
        setTasks(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
    );

    const unsubCal = onSnapshot(
      query(collection(db, 'calendarEvents'), where('userId', '==', uid)),
      (snap) => {
        const list: CalendarEventRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            workflowId: data.workflowId || '',
            title: data.title,
            description: data.description || '',
            eventDate: data.eventDate,
            eventTime: data.eventTime || '',
            eventType: data.eventType,
            priority: data.priority,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        list.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        setCalendarEvents(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'calendarEvents')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        const list: NotificationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            relatedId: data.relatedId || '',
            read: Boolean(data.read),
            scheduledFor: data.scheduledFor || '',
            createdAt: toIsoString(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotifications(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    const unsubActs = onSnapshot(
      query(collection(db, 'activities'), where('userId', '==', uid)),
      (snap) => {
        const list: ActivityRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            action: data.action,
            details: data.details || '',
            entityType: data.entityType,
            entityId: data.entityId || '',
            createdAt: toIsoString(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setActivities(list.slice(0, 40));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'activities')
    );

    const unsubIntegrations = onSnapshot(
      query(collection(db, 'integrations'), where('userId', '==', uid)),
      (snap) => {
        const list: IntegrationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            provider: data.provider,
            status: data.status,
            webhookUrl: data.webhookUrl || '',
            configNotes: data.configNotes || '',
            updatedAt: toIsoString(data.updatedAt),
          };
        });
        setIntegrations(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'integrations')
    );

    return () => {
      unsubUser();
      unsubDocs();
      unsubWorkflows();
      unsubTasks();
      unsubCal();
      unsubNotifs();
      unsubActs();
      unsubIntegrations();
    };
  }, [firebaseUser, isDemoMode, loadDemoData]);

  // Activity & Notification helpers
  const activeUserId = firebaseUser?.uid || (isDemoMode ? 'demo-user' : '');

  const logActivity = useCallback(
    async (action: string, details: string, entityType: ActivityRecord['entityType'], entityId: string) => {
      if (!activeUserId) return;
      const id = makeId('act');
      const nowIso = new Date().toISOString();
      if (isDemoMode) {
        setActivities((prev) => [
          { id, userId: activeUserId, action: clampStr(action, 120), details: clampStr(details, 500), entityType, entityId, createdAt: nowIso },
          ...prev.slice(0, 39),
        ]);
        return;
      }
      try {
        await setDoc(doc(db, 'activities', id), {
          id,
          userId: activeUserId,
          action: clampStr(action, 120),
          details: clampStr(details, 500),
          entityType,
          entityId: clampStr(entityId, 128),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `activities/${id}`);
      }
    },
    [activeUserId, isDemoMode]
  );

  const createInAppNotification = useCallback(
    async (title: string, message: string, type: NotificationRecord['type'], relatedId = '') => {
      if (!activeUserId) return;
      const id = makeId('notif');
      const nowIso = new Date().toISOString();
      const today = nowIso.split('T')[0];
      if (isDemoMode) {
        setNotifications((prev) => [
          {
            id,
            userId: activeUserId,
            title: clampStr(title, 200),
            message: clampStr(message, 1000),
            type,
            relatedId: clampStr(relatedId, 128),
            read: false,
            scheduledFor: today,
            createdAt: nowIso,
          },
          ...prev,
        ]);
        return;
      }
      try {
        await setDoc(doc(db, 'notifications', id), {
          id,
          userId: activeUserId,
          title: clampStr(title, 200),
          message: clampStr(message, 1000),
          type,
          relatedId: clampStr(relatedId, 128),
          read: false,
          scheduledFor: today,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`);
      }
    },
    [activeUserId, isDemoMode]
  );

  // Smart Reminder & Overdue Evaluation Engine
  useEffect(() => {
    if (!activeUserId || !profile?.reminderPreferences?.inAppEnabled || tasks.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const checkKey = `${activeUserId}:${todayStr}:${tasks.length}`;
    if (reminderCheckedRef.current === checkKey) return;
    reminderCheckedRef.current = checkKey;

    const leadDays = profile.reminderPreferences.leadDays ?? 3;
    const todayMs = new Date(todayStr).getTime();

    tasks.forEach((task) => {
      if (task.status === 'completed' || !task.dueDate) return;
      const dueMs = new Date(task.dueDate).getTime();
      if (Number.isNaN(dueMs)) return;

      const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
      const alreadyNotified = notifications.some(
        (n) => n.relatedId === task.id && n.scheduledFor === todayStr
      );
      if (alreadyNotified) return;

      if (diffDays < 0) {
        createInAppNotification(
          'Overdue Task Alert',
          `"${task.title}" (${task.workflowTitle}) was due on ${task.dueDate}.`,
          'overdue',
          task.id
        );
      } else if (diffDays <= leadDays) {
        createInAppNotification(
          'Upcoming Deadline Reminder',
          `"${task.title}" is due ${diffDays === 0 ? 'today' : `in ${diffDays} day(s)`} (${task.dueDate}).`,
          'deadline',
          task.id
        );
      }
    });
  }, [activeUserId, profile, tasks, notifications, createInAppNotification]);

  // Auth Actions
  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (fullName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await sendEmailVerification(cred.user);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const refreshUserVerification = useCallback(async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    setFirebaseUser({ ...auth.currentUser } as User);
    return auth.currentUser.emailVerified;
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      try {
        localStorage.removeItem('procify_active_demo');
      } catch {
        // ignore
      }
    }
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, [isDemoMode]);

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    try {
      localStorage.setItem('procify_active_demo', 'true');
    } catch {
      // ignore
    }
    loadDemoData();
    setActiveSection('dashboard');
  }, [loadDemoData]);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem('procify_active_demo');
    } catch {
      // ignore
    }
  }, []);

  const resetDemoWorkspace = useCallback(() => {
    const seed = createInitialDemoWorkspace();
    setProfile(seed.profile);
    setDocuments(seed.documents);
    setWorkflows(seed.workflows);
    setTasks(seed.tasks);
    setCalendarEvents(seed.calendarEvents);
    setNotifications(seed.notifications);
    setActivities(seed.activities);
    setIntegrations(seed.integrations);
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    } catch {
      // ignore
    }
  }, []);

  // Duplicate Detection
  const checkDuplicateDocument = useCallback(
    (fileHash: string, normalizedHash: string, contentExcerpt: string): DuplicateMatch[] => {
      const tokenize = (s: string) =>
        new Set(
          s
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3)
        );

      const newTokens = tokenize(contentExcerpt);
      const matches: DuplicateMatch[] = [];

      for (const d of documents) {
        if (d.fileHash === fileHash) {
          matches.push({ document: d, matchType: 'exact_file', similarityPercent: 100 });
          continue;
        }
        if (d.normalizedHash === normalizedHash) {
          matches.push({ document: d, matchType: 'exact_content', similarityPercent: 98 });
          continue;
        }
        const existingTokens = tokenize(d.contentExcerpt || d.analysis?.summary || '');
        if (newTokens.size > 5 && existingTokens.size > 5) {
          let overlap = 0;
          newTokens.forEach((t) => {
            if (existingTokens.has(t)) overlap++;
          });
          const union = newTokens.size + existingTokens.size - overlap;
          const jaccard = union > 0 ? Math.round((overlap / union) * 100) : 0;
          if (jaccard >= 45) {
            matches.push({ document: d, matchType: 'similar_content', similarityPercent: jaccard });
          }
        }
      }

      return matches.sort((a, b) => b.similarityPercent - a.similarityPercent);
    },
    [documents]
  );

  // Documents CRUD
  const saveDocument = useCallback(
    async (input: {
      title: string;
      category: string;
      sourceType: 'pdf' | 'image' | 'txt' | 'text';
      fileName: string;
      fileHash: string;
      normalizedHash: string;
      contentExcerpt: string;
      analysis: DocumentAnalysis;
    }): Promise<DocumentRecord> => {
      const id = makeId('doc');
      const nowIso = new Date().toISOString();
      const record: DocumentRecord = {
        id,
        userId: activeUserId,
        title: clampStr(input.title, 300) || 'Untitled Document',
        category: clampStr(input.category, 80) || 'General',
        sourceType: input.sourceType,
        fileName: clampStr(input.fileName, 255),
        fileHash: clampStr(input.fileHash, 128),
        normalizedHash: clampStr(input.normalizedHash, 128),
        contentExcerpt: clampStr(input.contentExcerpt, 4000),
        analysis: input.analysis,
        isDemo: isDemoMode,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (isDemoMode) {
        setDocuments((prev) => [record, ...prev]);
      } else {
        try {
          await setDoc(doc(db, 'documents', id), {
            id: record.id,
            userId: record.userId,
            title: record.title,
            category: record.category,
            sourceType: record.sourceType,
            fileName: record.fileName,
            fileHash: record.fileHash,
            normalizedHash: record.normalizedHash,
            contentExcerpt: record.contentExcerpt,
            analysis: record.analysis,
            isDemo: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `documents/${id}`);
        }
      }

      await logActivity('Analyzed Document', `Processed "${record.title}" via Gemini AI.`, 'document', id);
      return record;
    },
    [activeUserId, isDemoMode, logActivity]
  );

  const updateDocumentAnalysis = useCallback(
    async (docId: string, title: string, category: string, analysis: DocumentAnalysis) => {
      const nowIso = new Date().toISOString();
      if (isDemoMode) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, title: clampStr(title, 300), category: clampStr(category, 80), analysis, updatedAt: nowIso } : d
          )
        );
        return;
      }
      try {
        await updateDoc(doc(db, 'documents', docId), {
          title: clampStr(title, 300),
          category: clampStr(category, 80),
          analysis,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `documents/${docId}`);
      }
    },
    [isDemoMode]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      if (isDemoMode) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        return;
      }
      try {
        await deleteDoc(doc(db, 'documents', docId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `documents/${docId}`);
      }
    },
    [isDemoMode]
  );

  // Recalculate workflow task counts & progress
  const syncWorkflowProgress = useCallback(
    async (workflowId: string, nextTasksList: TaskRecord[]) => {
      const wfTasks = nextTasksList.filter((t) => t.workflowId === workflowId);
      const taskCount = wfTasks.length;
      const completedTaskCount = wfTasks.filter((t) => t.status === 'completed').length;
      const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

      const wf = workflows.find((w) => w.id === workflowId);
      if (!wf || wf.status === 'archived') return;

      let nextStatus = wf.status;
      if (wf.status === 'approved' || wf.status === 'in_progress' || wf.status === 'completed') {
        if (taskCount > 0 && completedTaskCount === taskCount) {
          nextStatus = 'completed';
        } else if (wf.status === 'completed' && completedTaskCount < taskCount) {
          nextStatus = 'in_progress';
        } else if (completedTaskCount > 0 && wf.status === 'approved') {
          nextStatus = 'in_progress';
        }
      }

      if (isDemoMode) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflowId
              ? { ...w, taskCount, completedTaskCount, progress, status: nextStatus, updatedAt: new Date().toISOString() }
              : w
          )
        );
        return;
      }

      try {
        await updateDoc(doc(db, 'workflows', workflowId), {
          taskCount,
          completedTaskCount,
          progress,
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `workflows/${workflowId}`);
      }
    },
    [workflows, isDemoMode]
  );

  // Workflow & Tasks Builder Save
  const saveWorkflowWithTasks = useCallback(
    async (draft: WorkflowDraftPayload): Promise<WorkflowRecord> => {
      const wfId = draft.id || makeId('wf');
      const nowIso = new Date().toISOString();
      const existingWf = workflows.find((w) => w.id === wfId);

      const completedCount = draft.tasks.filter((t) => t.status === 'completed').length;
      const progress = draft.tasks.length > 0 ? Math.round((completedCount / draft.tasks.length) * 100) : 0;

      const historyEntry: WorkflowHistoryEntry = {
        stage: draft.status,
        actor: profile?.fullName || 'Workspace Owner',
        note: draft.historyNote || (existingWf ? `Updated workflow (${draft.status})` : `Created workflow (${draft.status})`),
        timestamp: nowIso,
      };
      const nextHistory = [...(existingWf?.history || []), historyEntry].slice(-50);

      const wfRecord: WorkflowRecord = {
        id: wfId,
        userId: activeUserId,
        documentId: clampStr(draft.documentId, 128),
        documentTitle: clampStr(draft.documentTitle, 300),
        title: clampStr(draft.title, 300) || 'Untitled Workflow',
        description: clampStr(draft.description, 2000),
        category: clampStr(draft.category, 80) || 'Operations',
        objective: clampStr(draft.objective, 1000),
        sourceMethod: draft.sourceMethod,
        status: draft.status,
        priority: draft.priority,
        responsibleRoles: draft.responsibleRoles.slice(0, 15).map((r) => clampStr(r, 80)),
        completionConditions: draft.completionConditions.slice(0, 15).map((c) => clampStr(c, 160)),
        requiredApprovals: draft.requiredApprovals.slice(0, 15).map((a) => clampStr(a, 120)),
        history: nextHistory,
        taskCount: draft.tasks.length,
        completedTaskCount: completedCount,
        progress,
        isDemo: isDemoMode,
        createdAt: existingWf?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const normalizedTasks: TaskRecord[] = draft.tasks.map((t, index) => ({
        id: t.id || makeId('task'),
        userId: activeUserId,
        workflowId: wfId,
        workflowTitle: wfRecord.title,
        title: clampStr(t.title, 300) || `Task ${index + 1}`,
        description: clampStr(t.description, 2000),
        assignedUser: clampStr(t.assignedUser, 150),
        priority: t.priority,
        startDate: clampStr(t.startDate, 40),
        dueDate: clampStr(t.dueDate, 40),
        status: t.status,
        dependencies: (t.dependencies || []).slice(0, 20),
        orderIndex: index,
        reminderDate: clampStr(t.reminderDate, 40),
        reminderTime: clampStr(t.reminderTime, 20),
        isDemo: isDemoMode,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));

      if (isDemoMode) {
        setWorkflows((prev) => {
          const exists = prev.some((w) => w.id === wfId);
          return exists ? prev.map((w) => (w.id === wfId ? wfRecord : w)) : [wfRecord, ...prev];
        });
        setTasks((prev) => [...prev.filter((t) => t.workflowId !== wfId), ...normalizedTasks]);
      } else {
        try {
          if (existingWf) {
            await updateDoc(doc(db, 'workflows', wfId), {
              title: wfRecord.title,
              description: wfRecord.description,
              category: wfRecord.category,
              objective: wfRecord.objective,
              status: wfRecord.status,
              priority: wfRecord.priority,
              responsibleRoles: wfRecord.responsibleRoles,
              completionConditions: wfRecord.completionConditions,
              requiredApprovals: wfRecord.requiredApprovals,
              history: wfRecord.history,
              taskCount: wfRecord.taskCount,
              completedTaskCount: wfRecord.completedTaskCount,
              progress: wfRecord.progress,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, 'workflows', wfId), {
              id: wfRecord.id,
              userId: wfRecord.userId,
              documentId: wfRecord.documentId,
              documentTitle: wfRecord.documentTitle,
              title: wfRecord.title,
              description: wfRecord.description,
              category: wfRecord.category,
              objective: wfRecord.objective,
              sourceMethod: wfRecord.sourceMethod,
              status: wfRecord.status,
              priority: wfRecord.priority,
              responsibleRoles: wfRecord.responsibleRoles,
              completionConditions: wfRecord.completionConditions,
              requiredApprovals: wfRecord.requiredApprovals,
              history: wfRecord.history,
              taskCount: wfRecord.taskCount,
              completedTaskCount: wfRecord.completedTaskCount,
              progress: wfRecord.progress,
              isDemo: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          // Sync tasks using batch
          const batch = writeBatch(db);
          const previousTaskIds = tasks.filter((t) => t.workflowId === wfId).map((t) => t.id);
          const nextTaskIds = new Set(normalizedTasks.map((t) => t.id));

          previousTaskIds.forEach((oldId) => {
            if (!nextTaskIds.has(oldId)) {
              batch.delete(doc(db, 'tasks', oldId));
            }
          });

          normalizedTasks.forEach((t) => {
            const existsTask = previousTaskIds.includes(t.id);
            const taskRef = doc(db, 'tasks', t.id);
            if (existsTask) {
              batch.update(taskRef, {
                workflowTitle: t.workflowTitle,
                title: t.title,
                description: t.description,
                assignedUser: t.assignedUser,
                priority: t.priority,
                startDate: t.startDate,
                dueDate: t.dueDate,
                status: t.status,
                dependencies: t.dependencies,
                orderIndex: t.orderIndex,
                reminderDate: t.reminderDate,
                reminderTime: t.reminderTime,
                updatedAt: serverTimestamp(),
              });
            } else {
              batch.set(taskRef, {
                id: t.id,
                userId: t.userId,
                workflowId: t.workflowId,
                workflowTitle: t.workflowTitle,
                title: t.title,
                description: t.description,
                assignedUser: t.assignedUser,
                priority: t.priority,
                startDate: t.startDate,
                dueDate: t.dueDate,
                status: t.status,
                dependencies: t.dependencies,
                orderIndex: t.orderIndex,
                reminderDate: t.reminderDate,
                reminderTime: t.reminderTime,
                isDemo: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          });

          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `workflows/${wfId}`);
        }
      }

      if (draft.status === 'pending_review') {
        await createInAppNotification(
          'Workflow Pending Approval',
          `"${wfRecord.title}" with ${normalizedTasks.length} tasks is awaiting human approval.`,
          'approval',
          wfId
        );
      } else if (draft.status === 'approved' || draft.status === 'in_progress') {
        await createInAppNotification(
          'Workflow Approved & Active',
          `"${wfRecord.title}" was approved and ${normalizedTasks.length} tasks are now tracked.`,
          'approval',
          wfId
        );
      }

      await logActivity(
        existingWf ? 'Updated Workflow' : 'Created Workflow',
        `${wfRecord.title} (${draft.status.replace('_', ' ')})`,
        'workflow',
        wfId
      );

      return wfRecord;
    },
    [workflows, tasks, activeUserId, isDemoMode, profile, createInAppNotification, logActivity]
  );

  const transitionWorkflowStatus = useCallback(
    async (workflowId: string, newStatus: WorkflowStatus, note: string) => {
      const wf = workflows.find((w) => w.id === workflowId);
      if (!wf) return;
      const nowIso = new Date().toISOString();
      const entry: WorkflowHistoryEntry = {
        stage: newStatus,
        actor: profile?.fullName || 'Reviewer',
        note,
        timestamp: nowIso,
      };
      const nextHistory = [...wf.history, entry].slice(-50);

      if (isDemoMode) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflowId ? { ...w, status: newStatus, history: nextHistory, updatedAt: nowIso } : w))
        );
      } else {
        try {
          await updateDoc(doc(db, 'workflows', workflowId), {
            status: newStatus,
            history: nextHistory,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `workflows/${workflowId}`);
        }
      }
      await logActivity(`Workflow ${newStatus.replace('_', ' ')}`, `${wf.title}: ${note}`, 'workflow', workflowId);
    },
    [workflows, profile, isDemoMode, logActivity]
  );

  const duplicateWorkflow = useCallback(
    async (workflowId: string): Promise<WorkflowRecord> => {
      const wf = workflows.find((w) => w.id === workflowId);
      if (!wf) throw new Error('Workflow not found.');
      const wfTasks = tasks.filter((t) => t.workflowId === workflowId).sort((a, b) => a.orderIndex - b.orderIndex);
      return saveWorkflowWithTasks({
        documentId: wf.documentId,
        documentTitle: wf.documentTitle,
        title: `${wf.title} (Copy)`,
        description: wf.description,
        category: wf.category,
        objective: wf.objective,
        sourceMethod: wf.sourceMethod,
        status: 'draft',
        priority: wf.priority,
        responsibleRoles: wf.responsibleRoles,
        completionConditions: wf.completionConditions,
        requiredApprovals: wf.requiredApprovals,
        tasks: wfTasks.map((t, idx) => ({
          title: t.title,
          description: t.description,
          assignedUser: t.assignedUser,
          priority: t.priority,
          startDate: t.startDate,
          dueDate: t.dueDate,
          status: 'todo',
          dependencies: [],
          orderIndex: idx,
          reminderDate: t.reminderDate,
          reminderTime: t.reminderTime,
        })),
        historyNote: `Duplicated from "${wf.title}"`,
      });
    },
    [workflows, tasks, saveWorkflowWithTasks]
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      const wfTasks = tasks.filter((t) => t.workflowId === workflowId);
      if (isDemoMode) {
        setTasks((prev) => prev.filter((t) => t.workflowId !== workflowId));
        setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      } else {
        try {
          const batch = writeBatch(db);
          wfTasks.forEach((t) => batch.delete(doc(db, 'tasks', t.id)));
          batch.delete(doc(db, 'workflows', workflowId));
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `workflows/${workflowId}`);
        }
      }
      await logActivity('Deleted Workflow', `Removed workflow ${workflowId}`, 'workflow', workflowId);
    },
    [tasks, isDemoMode, logActivity]
  );

  // Tasks CRUD
  const createTask = useCallback(
    async (input: Omit<TaskRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TaskRecord> => {
      const id = makeId('task');
      const nowIso = new Date().toISOString();
      const record: TaskRecord = {
        ...input,
        id,
        userId: activeUserId,
        title: clampStr(input.title, 300),
        description: clampStr(input.description, 2000),
        assignedUser: clampStr(input.assignedUser, 150),
        workflowTitle: clampStr(input.workflowTitle, 300),
        isDemo: isDemoMode,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const nextTasks = [...tasks, record];

      if (isDemoMode) {
        setTasks(nextTasks);
      } else {
        try {
          await setDoc(doc(db, 'tasks', id), {
            id: record.id,
            userId: record.userId,
            workflowId: record.workflowId,
            workflowTitle: record.workflowTitle,
            title: record.title,
            description: record.description,
            assignedUser: record.assignedUser,
            priority: record.priority,
            startDate: record.startDate,
            dueDate: record.dueDate,
            status: record.status,
            dependencies: record.dependencies.slice(0, 20),
            orderIndex: record.orderIndex,
            reminderDate: record.reminderDate,
            reminderTime: record.reminderTime,
            isDemo: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `tasks/${id}`);
        }
      }

      await syncWorkflowProgress(record.workflowId, nextTasks);
      await logActivity('Created Task', `"${record.title}" assigned to ${record.assignedUser || 'Unassigned'}`, 'task', id);
      return record;
    },
    [activeUserId, isDemoMode, tasks, syncWorkflowProgress, logActivity]
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<TaskRecord>) => {
      const existingTask = tasks.find((t) => t.id === taskId);
      if (!existingTask) return;

      const updated: TaskRecord = {
        ...existingTask,
        ...patch,
        title: patch.title !== undefined ? clampStr(patch.title, 300) : existingTask.title,
        description: patch.description !== undefined ? clampStr(patch.description, 2000) : existingTask.description,
        assignedUser: patch.assignedUser !== undefined ? clampStr(patch.assignedUser, 150) : existingTask.assignedUser,
        updatedAt: new Date().toISOString(),
      };

      const nextTasks = tasks.map((t) => (t.id === taskId ? updated : t));

      if (isDemoMode) {
        setTasks(nextTasks);
      } else {
        try {
          await updateDoc(doc(db, 'tasks', taskId), {
            workflowTitle: updated.workflowTitle,
            title: updated.title,
            description: updated.description,
            assignedUser: updated.assignedUser,
            priority: updated.priority,
            startDate: updated.startDate,
            dueDate: updated.dueDate,
            status: updated.status,
            dependencies: updated.dependencies.slice(0, 20),
            orderIndex: updated.orderIndex,
            reminderDate: updated.reminderDate,
            reminderTime: updated.reminderTime,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
        }
      }

      await syncWorkflowProgress(updated.workflowId, nextTasks);
      if (patch.status && patch.status !== existingTask.status) {
        await logActivity(
          patch.status === 'completed' ? 'Completed Task' : 'Updated Task Status',
          `"${updated.title}" moved to ${patch.status.replace('_', ' ')}`,
          'task',
          taskId
        );
      }
    },
    [tasks, isDemoMode, syncWorkflowProgress, logActivity]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const existingTask = tasks.find((t) => t.id === taskId);
      if (!existingTask) return;
      const nextTasks = tasks.filter((t) => t.id !== taskId);

      if (isDemoMode) {
        setTasks(nextTasks);
      } else {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
        }
      }
      await syncWorkflowProgress(existingTask.workflowId, nextTasks);
    },
    [tasks, isDemoMode, syncWorkflowProgress]
  );

  // Calendar Events CRUD
  const addCalendarEvent = useCallback(
    async (input: Omit<CalendarEventRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const id = makeId('evt');
      const nowIso = new Date().toISOString();
      const record: CalendarEventRecord = {
        ...input,
        id,
        userId: activeUserId,
        title: clampStr(input.title, 300),
        description: clampStr(input.description, 1000),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      if (isDemoMode) {
        setCalendarEvents((prev) => [...prev, record]);
      } else {
        try {
          await setDoc(doc(db, 'calendarEvents', id), {
            id: record.id,
            userId: record.userId,
            workflowId: clampStr(record.workflowId, 128),
            title: record.title,
            description: record.description,
            eventDate: clampStr(record.eventDate, 40),
            eventTime: clampStr(record.eventTime, 20),
            eventType: record.eventType,
            priority: record.priority,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `calendarEvents/${id}`);
        }
      }
      await logActivity('Added Calendar Event', `${record.title} on ${record.eventDate}`, 'calendar', id);
    },
    [activeUserId, isDemoMode, logActivity]
  );

  const updateCalendarEvent = useCallback(
    async (eventId: string, patch: Partial<CalendarEventRecord>) => {
      const existingEvt = calendarEvents.find((e) => e.id === eventId);
      if (!existingEvt) return;
      const updated = { ...existingEvt, ...patch, updatedAt: new Date().toISOString() };
      if (isDemoMode) {
        setCalendarEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        return;
      }
      try {
        await updateDoc(doc(db, 'calendarEvents', eventId), {
          workflowId: clampStr(updated.workflowId, 128),
          title: clampStr(updated.title, 300),
          description: clampStr(updated.description, 1000),
          eventDate: clampStr(updated.eventDate, 40),
          eventTime: clampStr(updated.eventTime, 20),
          eventType: updated.eventType,
          priority: updated.priority,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `calendarEvents/${eventId}`);
      }
    },
    [calendarEvents, isDemoMode]
  );

  const deleteCalendarEvent = useCallback(
    async (eventId: string) => {
      if (isDemoMode) {
        setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
        return;
      }
      try {
        await deleteDoc(doc(db, 'calendarEvents', eventId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `calendarEvents/${eventId}`);
      }
    },
    [isDemoMode]
  );

  // Notifications
  const markNotificationRead = useCallback(
    async (notifId: string) => {
      if (isDemoMode) {
        setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
        return;
      }
      try {
        await updateDoc(doc(db, 'notifications', notifId), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
      }
    },
    [isDemoMode]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    if (isDemoMode) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return;
    }
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }, [notifications, isDemoMode]);

  // Integrations
  const saveIntegrationConfig = useCallback(
    async (
      provider: IntegrationProvider,
      status: IntegrationRecord['status'],
      webhookUrl: string,
      configNotes: string
    ) => {
      const existingInt = integrations.find((i) => i.provider === provider);
      const id = existingInt?.id || `${activeUserId}_${provider}`.slice(0, 120);
      const nowIso = new Date().toISOString();
      const record: IntegrationRecord = {
        id,
        userId: activeUserId,
        provider,
        status,
        webhookUrl: clampStr(webhookUrl, 500),
        configNotes: clampStr(configNotes, 1000),
        updatedAt: nowIso,
      };
      if (isDemoMode) {
        setIntegrations((prev) => {
          const exists = prev.some((i) => i.provider === provider);
          return exists ? prev.map((i) => (i.provider === provider ? record : i)) : [...prev, record];
        });
      } else {
        try {
          if (existingInt) {
            await updateDoc(doc(db, 'integrations', id), {
              status: record.status,
              webhookUrl: record.webhookUrl,
              configNotes: record.configNotes,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, 'integrations', id), {
              id: record.id,
              userId: record.userId,
              provider: record.provider,
              status: record.status,
              webhookUrl: record.webhookUrl,
              configNotes: record.configNotes,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `integrations/${id}`);
        }
      }
      await logActivity('Updated Integration', `Saved settings for ${provider.replace('_', ' ')}`, 'integration', id);
    },
    [integrations, activeUserId, isDemoMode, logActivity]
  );

  // User Profile Settings
  const updateUserProfile = useCallback(
    async (patch: Partial<Pick<UserProfile, 'fullName' | 'role' | 'organization' | 'reminderPreferences'>>) => {
      if (!profile) return;
      const updated: UserProfile = {
        ...profile,
        ...patch,
        fullName: patch.fullName !== undefined ? clampStr(patch.fullName, 120) : profile.fullName,
        organization: patch.organization !== undefined ? clampStr(patch.organization, 150) : profile.organization,
      };
      setProfile(updated);
      if (isDemoMode || !firebaseUser) return;
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          fullName: updated.fullName,
          role: updated.role,
          organization: updated.organization,
          reminderPreferences: updated.reminderPreferences,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    },
    [profile, isDemoMode, firebaseUser]
  );

  const isAuthenticated = Boolean(firebaseUser) || isDemoMode;
  const emailVerified = Boolean(firebaseUser?.emailVerified) || isDemoMode;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      firebaseUser,
      authLoading,
      isDemoMode,
      isAuthenticated,
      emailVerified,
      profile,
      activeSection,
      setActiveSection,
      theme,
      toggleTheme,
      pendingDocumentForBuilder,
      setPendingDocumentForBuilder,
      editingWorkflowId,
      setEditingWorkflowId,
      pendingAssistantPrompt,
      setPendingAssistantPrompt,
      documents,
      workflows,
      tasks,
      calendarEvents,
      notifications,
      activities,
      integrations,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      resendVerificationEmail,
      refreshUserVerification,
      logout,
      enterDemoMode,
      exitDemoMode,
      resetDemoWorkspace,
      checkDuplicateDocument,
      saveDocument,
      updateDocumentAnalysis,
      deleteDocument,
      saveWorkflowWithTasks,
      transitionWorkflowStatus,
      duplicateWorkflow,
      deleteWorkflow,
      createTask,
      updateTask,
      deleteTask,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      markNotificationRead,
      markAllNotificationsRead,
      createInAppNotification,
      saveIntegrationConfig,
      updateUserProfile,
    }),
    [
      firebaseUser,
      authLoading,
      isDemoMode,
      isAuthenticated,
      emailVerified,
      profile,
      activeSection,
      theme,
      toggleTheme,
      pendingDocumentForBuilder,
      editingWorkflowId,
      pendingAssistantPrompt,
      documents,
      workflows,
      tasks,
      calendarEvents,
      notifications,
      activities,
      integrations,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      resendVerificationEmail,
      refreshUserVerification,
      logout,
      enterDemoMode,
      exitDemoMode,
      resetDemoWorkspace,
      checkDuplicateDocument,
      saveDocument,
      updateDocumentAnalysis,
      deleteDocument,
      saveWorkflowWithTasks,
      transitionWorkflowStatus,
      duplicateWorkflow,
      deleteWorkflow,
      createTask,
      updateTask,
      deleteTask,
      addCalendarEvent,
      updateCalendarEvent,
      deleteCalendarEvent,
      markNotificationRead,
      markAllNotificationsRead,
      createInAppNotification,
      saveIntegrationConfig,
      updateUserProfile,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
