export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type WorkflowStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'archived';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'overdue';

export type SourceMethod = 'document' | 'text' | 'manual';

export interface ReminderPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  dailyDigestTime: string;
  leadDays: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: 'student' | 'educator' | 'manager' | 'operations' | 'admin';
  organization: string;
  reminderPreferences: ReminderPreferences;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DocumentAnalysis {
  documentTitle: string;
  category: string;
  mainPurpose: string;
  summary: string;
  importantInformation: string[];
  datesAndDeadlines: Array<{
    label: string;
    date: string | null;
    sourceQuote: string | null;
  }>;
  events: Array<{
    title: string;
    date: string | null;
    priority: PriorityLevel;
    sourceQuote: string | null;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    deadline: string | null;
    priority: PriorityLevel;
    assignee: string | null;
    sourceQuote: string | null;
  }>;
  responsibleEntities: string[];
  targetAudience: string;
  priority: PriorityLevel;
  dependencies: string[];
  instructions: string[];
  potentialRisks: string[];
  suggestedNextSteps: string[];
  uncertainInformation: string[];
  extractedPlainText?: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  category: string;
  sourceType: 'pdf' | 'image' | 'txt' | 'text';
  fileName: string;
  fileHash: string;
  normalizedHash: string;
  contentExcerpt: string;
  analysis: DocumentAnalysis;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowHistoryEntry {
  stage: WorkflowStatus;
  actor: string;
  note: string;
  timestamp: string;
}

export interface WorkflowRecord {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
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
  history: WorkflowHistoryEntry[];
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  userId: string;
  workflowId: string;
  workflowTitle: string;
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
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventRecord {
  id: string;
  userId: string;
  workflowId: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  eventType: 'deadline' | 'milestone' | 'event' | 'reminder';
  priority: PriorityLevel;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deadline' | 'overdue' | 'approval' | 'assignment' | 'summary' | 'system';
  relatedId: string;
  read: boolean;
  scheduledFor: string;
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  action: string;
  details: string;
  entityType: 'document' | 'workflow' | 'task' | 'calendar' | 'integration';
  entityId: string;
  createdAt: string;
}

export type IntegrationProvider =
  | 'google_calendar'
  | 'gmail'
  | 'slack'
  | 'microsoft_teams'
  | 'webhooks'
  | 'n8n';

export interface IntegrationRecord {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  status: 'not_connected' | 'configured' | 'connected';
  webhookUrl: string;
  configNotes: string;
  updatedAt: string;
}

export type NavSection =
  | 'dashboard'
  | 'create-workflow'
  | 'document-analyzer'
  | 'my-workflows'
  | 'task-manager'
  | 'calendar'
  | 'notifications'
  | 'analytics'
  | 'integrations'
  | 'settings';
