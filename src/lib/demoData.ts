import {
  ActivityRecord,
  CalendarEventRecord,
  DocumentRecord,
  IntegrationRecord,
  NotificationRecord,
  TaskRecord,
  UserProfile,
  WorkflowRecord,
} from '../types/procify';

export interface SampleInputDocument {
  id: string;
  label: string;
  category: string;
  title: string;
  text: string;
}

export const SAMPLE_DOCUMENTS_FOR_UPLOAD: SampleInputDocument[] = [
  {
    id: 'sample-exam',
    label: 'College Examination Announcement',
    category: 'Education',
    title: 'Mid-Semester & Internal Assessment Examination Circular',
    text: `OFFICE OF THE CONTROLLER OF EXAMINATIONS
CIRCULAR: INTERNAL ASSESSMENT & PRACTICAL SCHEDULE (SEMESTER VI)

All Heads of Departments and Semester VI students are informed that the Internal Assessment Examinations will be conducted from 2026-12-10 to 2026-12-15.

Key Milestones & Requirements:
1. Faculty must submit verified question paper sets (2 sets per course) to the Examination Cell by 2026-11-30.
2. Department Coordinators must publish the final room allocation and seating chart by 2026-12-04.
3. Students must clear laboratory attendance logs and collect hall tickets from the Academic Office between 2026-12-05 and 2026-12-08.
4. Invigilation duty rosters will be finalized by the Dean of Academics by 2026-12-06.
5. Internal marks must be uploaded to the Examination Portal within 5 days of the final paper (by 2026-12-20).

Important Notes:
- Students with attendance below 75% require prior condonation approval from the Principal before hall ticket issuance.
- Electronic devices other than non-programmable calculators are strictly prohibited inside exam halls.`,
  },
  {
    id: 'sample-symposium',
    label: 'Technical Symposium Announcement',
    category: 'Events & Operations',
    title: 'TechNova 2026 — Annual National Technical Symposium Plan',
    text: `TECH-NOVA 2026: NATIONAL TECHNICAL SYMPOSIUM BRIEF
Organizing Body: Department of Computer Science & Engineering

We are organizing our annual technical symposium on 2026-12-18 at the Main Auditorium & Innovation Wing. Expected participation: 450 students across 30 colleges.

Operational Scope:
- Open online registration portal and publish event brochure by 2026-11-26.
- Collect participant registrations and verify team eligibility before 2026-12-08.
- Send official confirmation passes and track allocations to shortlisted participants by 2026-12-11.
- Finalize keynote speaker schedule, judging rubrics, and session timeline by 2026-12-12.
- Complete auditorium AV testing, Wi-Fi load verification, and registration desk setup by 2026-12-16.
- Conduct symposium events, hackathon judging, and valedictory awards on 2026-12-18.
- Compile financial reconciliation, attendance metrics, and post-event report by 2026-12-23.

Approval Required: Budget sign-off from Finance Officer and Venue clearance from Campus Facilities.`,
  },
  {
    id: 'sample-assignment',
    label: 'Assignment Submission Notice',
    category: 'Academics',
    title: 'Capstone Software Engineering — Phase II Deliverable Notice',
    text: `DEPARTMENT OF INFORMATION TECHNOLOGY
CAPSTONE PROJECT PHASE II — SUBMISSION & EVALUATION NOTICE

All final-year project teams must complete Phase II architecture and implementation deliverables according to the schedule below:

1. Submit API documentation, system architecture diagrams, and database schema draft for mentor review by 2026-11-28.
2. Address mentor review comments and push final source code repository tag by 2026-12-03.
3. Upload the IEEE-formatted project report PDF (signed by Project Guide) to the Capstone Portal by 2026-12-07.
4. Prepare a 10-slide live demonstration deck and test deployment URL prior to jury evaluation on 2026-12-12.

Penalty Policy: Submissions received after 2026-12-07 17:00 will incur a late-submission review hold unless medical documentation is approved by the Project Coordinator.`,
  },
];

export function createInitialDemoWorkspace(): {
  profile: UserProfile;
  documents: DocumentRecord[];
  workflows: WorkflowRecord[];
  tasks: TaskRecord[];
  calendarEvents: CalendarEventRecord[];
  notifications: NotificationRecord[];
  activities: ActivityRecord[];
  integrations: IntegrationRecord[];
} {
  const now = new Date();
  const isoNow = now.toISOString();
  const addDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const profile: UserProfile = {
    uid: 'demo-user',
    fullName: 'Elena Vance (Demo)',
    email: 'demo@procify.ai',
    role: 'operations',
    organization: 'Northbridge Institute — Operations Demo',
    reminderPreferences: {
      inAppEnabled: true,
      emailEnabled: false,
      dailyDigestTime: '09:00',
      leadDays: 3,
    },
  };

  const doc1Id = 'demo_doc_exam_2026';
  const doc2Id = 'demo_doc_symposium_2026';
  const doc3Id = 'demo_doc_capstone_2026';

  const documents: DocumentRecord[] = [
    {
      id: doc1Id,
      userId: 'demo-user',
      title: 'Semester VI Internal Assessment Examination Circular',
      category: 'Education',
      sourceType: 'pdf',
      fileName: 'semester_vi_exam_circular.pdf',
      fileHash: 'demo_hash_exam_001',
      normalizedHash: 'demo_norm_exam_001',
      contentExcerpt: SAMPLE_DOCUMENTS_FOR_UPLOAD[0].text,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
      analysis: {
        documentTitle: 'Semester VI Internal Assessment Examination Circular',
        category: 'Education',
        mainPurpose: 'Coordinate faculty question paper submission, hall ticket issuance, invigilation rosters, and grade uploads for Semester VI internal exams.',
        summary: 'Official circular outlining pre-exam preparation, hall ticket issuance, exam dates, and post-exam mark entry deadlines.',
        importantInformation: [
          'Minimum 75% attendance required for hall ticket issuance unless condoned by Principal.',
          'Only non-programmable calculators permitted in examination halls.',
        ],
        datesAndDeadlines: [
          { label: 'Question paper submission', date: addDays(5), sourceQuote: 'submit verified question paper sets by deadline' },
          { label: 'Seating chart publication', date: addDays(9), sourceQuote: 'publish the final room allocation and seating chart' },
          { label: 'Exam window start', date: addDays(14), sourceQuote: 'Internal Assessment Examinations will be conducted' },
        ],
        events: [
          { title: 'Internal Assessment Examination Window', date: addDays(14), priority: 'high', sourceQuote: 'Internal Assessment Examinations' },
        ],
        tasks: [
          { title: 'Collect verified question papers from faculty', description: 'Ensure 2 sets per course are sealed and logged.', deadline: addDays(5), priority: 'critical', assignee: 'Examination Cell', sourceQuote: 'submit verified question paper sets' },
          { title: 'Publish room allocation and seating chart', description: 'Assign classrooms and publish student seating matrix.', deadline: addDays(9), priority: 'high', assignee: 'Department Coordinators', sourceQuote: 'publish the final room allocation' },
          { title: 'Issue student hall tickets', description: 'Verify lab logs and 75% attendance eligibility before issuing.', deadline: addDays(12), priority: 'high', assignee: 'Academic Office', sourceQuote: 'collect hall tickets from the Academic Office' },
          { title: 'Upload internal assessment marks', description: 'Collect graded scripts and finalize portal entries.', deadline: addDays(22), priority: 'medium', assignee: 'Course Faculty', sourceQuote: 'Internal marks must be uploaded' },
        ],
        responsibleEntities: ['Examination Cell', 'Department Coordinators', 'Academic Office', 'Dean of Academics'],
        targetAudience: 'Heads of Departments and Semester VI Students',
        priority: 'high',
        dependencies: ['Attendance verification required before hall ticket issuance'],
        instructions: ['Verify 2 sets per course', 'Restrict unauthorized electronics inside halls'],
        potentialRisks: ['Late question paper submission delays printing', 'Unverified attendance holds up hall tickets'],
        suggestedNextSteps: ['Approve workflow and assign department coordinators'],
        uncertainInformation: [],
      },
    },
    {
      id: doc2Id,
      userId: 'demo-user',
      title: 'TechNova 2026 — National Technical Symposium Brief',
      category: 'Events & Operations',
      sourceType: 'text',
      fileName: 'technova_2026_brief.txt',
      fileHash: 'demo_hash_symp_002',
      normalizedHash: 'demo_norm_symp_002',
      contentExcerpt: SAMPLE_DOCUMENTS_FOR_UPLOAD[1].text,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
      analysis: {
        documentTitle: 'TechNova 2026 — National Technical Symposium Brief',
        category: 'Events & Operations',
        mainPurpose: 'Plan and execute the national technical symposium for 450 participants from registration through post-event reporting.',
        summary: 'End-to-end event plan covering registration portal, participant confirmation, keynote schedule, venue AV checks, and financial reporting.',
        importantInformation: [
          'Expected attendance: 450 students across 30 colleges.',
          'Requires budget sign-off from Finance Officer and venue clearance from Facilities.',
        ],
        datesAndDeadlines: [
          { label: 'Registration portal launch', date: addDays(2), sourceQuote: 'Open online registration portal' },
          { label: 'Participant confirmation passes', date: addDays(11), sourceQuote: 'Send official confirmation passes' },
          { label: 'Symposium Event Day', date: addDays(18), sourceQuote: 'Conduct symposium events' },
        ],
        events: [
          { title: 'TechNova 2026 Symposium Day', date: addDays(18), priority: 'critical', sourceQuote: 'Conduct symposium events at Main Auditorium' },
        ],
        tasks: [
          { title: 'Create and launch registration portal', description: 'Set up participant registration form and publish event brochure.', deadline: addDays(2), priority: 'high', assignee: 'Web Team', sourceQuote: 'Open online registration portal' },
          { title: 'Verify team eligibility and confirm passes', description: 'Screen submissions and dispatch official entry passes.', deadline: addDays(11), priority: 'high', assignee: 'Registration Desk Lead', sourceQuote: 'verify team eligibility' },
          { title: 'Complete auditorium AV and Wi-Fi testing', description: 'Run full audio, projection, and network load test.', deadline: addDays(16), priority: 'critical', assignee: 'Facilities & IT', sourceQuote: 'Complete auditorium AV testing' },
        ],
        responsibleEntities: ['CSE Organizing Committee', 'Finance Officer', 'Campus Facilities'],
        targetAudience: 'Organizing Committee and Participating College Teams',
        priority: 'high',
        dependencies: ['Registration portal must open before participant verification'],
        instructions: ['Obtain Finance and Facilities approvals prior to event setup'],
        potentialRisks: ['Wi-Fi bottleneck during live hackathon', 'Delayed participant pass confirmations'],
        suggestedNextSteps: ['Submit symposium workflow for approval'],
        uncertainInformation: [],
      },
    },
    {
      id: doc3Id,
      userId: 'demo-user',
      title: 'Capstone Project Phase II Submission Notice',
      category: 'Academics',
      sourceType: 'txt',
      fileName: 'capstone_phase2_notice.txt',
      fileHash: 'demo_hash_cap_003',
      normalizedHash: 'demo_norm_cap_003',
      contentExcerpt: SAMPLE_DOCUMENTS_FOR_UPLOAD[2].text,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
      analysis: {
        documentTitle: 'Capstone Project Phase II Submission Notice',
        category: 'Academics',
        mainPurpose: 'Track final-year capstone architecture reviews, repository tagging, signed IEEE reports, and live jury demonstrations.',
        summary: 'Submission timeline and compliance checklist for Phase II capstone deliverables.',
        importantInformation: ['Signed IEEE PDF report required before jury demo.'],
        datesAndDeadlines: [
          { label: 'Architecture & schema review', date: addDays(4), sourceQuote: 'Submit API documentation and database schema draft' },
          { label: 'Final IEEE report PDF upload', date: addDays(10), sourceQuote: 'Upload the IEEE-formatted project report PDF' },
        ],
        events: [
          { title: 'Capstone Jury Evaluation', date: addDays(15), priority: 'high', sourceQuote: 'jury evaluation' },
        ],
        tasks: [
          { title: 'Submit API & schema draft for mentor review', description: 'Upload architecture diagrams and REST endpoint specs.', deadline: addDays(4), priority: 'high', assignee: 'Student Teams', sourceQuote: 'Submit API documentation' },
          { title: 'Upload signed IEEE project report PDF', description: 'Obtain guide signature and submit final PDF.', deadline: addDays(10), priority: 'critical', assignee: 'Team Lead', sourceQuote: 'Upload the IEEE-formatted project report PDF' },
        ],
        responsibleEntities: ['Project Coordinator', 'Project Guides', 'Final-Year Teams'],
        targetAudience: 'Final-Year IT Students and Project Mentors',
        priority: 'medium',
        dependencies: ['Mentor review must complete before final code tag'],
        instructions: ['Tag release commit after mentor feedback'],
        potentialRisks: ['Late submissions face review hold'],
        suggestedNextSteps: ['Monitor team milestones in Task Manager'],
        uncertainInformation: [],
      },
    },
  ];

  const wf1Id = 'demo_wf_exam_2026';
  const wf2Id = 'demo_wf_symposium_2026';
  const wf3Id = 'demo_wf_capstone_2026';

  const workflows: WorkflowRecord[] = [
    {
      id: wf1Id,
      userId: 'demo-user',
      documentId: doc1Id,
      documentTitle: documents[0].title,
      title: 'Semester VI Internal Examination Execution',
      description: 'Coordinated workflow covering question paper collection, room seating allocation, hall ticket clearance, exam execution, and portal mark entry.',
      category: 'Education',
      objective: 'Ensure zero-error examination scheduling and timely grade publication.',
      sourceMethod: 'document',
      status: 'in_progress',
      priority: 'high',
      responsibleRoles: ['Examination Cell', 'Department Coordinators', 'Academic Office', 'Course Faculty'],
      completionConditions: ['All question papers logged', 'Hall tickets issued', '100% internal marks uploaded'],
      requiredApprovals: ['Dean of Academics'],
      history: [
        { stage: 'draft', actor: 'Procify AI', note: 'Generated from examination circular', timestamp: isoNow },
        { stage: 'approved', actor: 'Elena Vance (Demo)', note: 'Approved schedule and coordinators', timestamp: isoNow },
        { stage: 'in_progress', actor: 'Elena Vance (Demo)', note: 'Tasks activated for department teams', timestamp: isoNow },
      ],
      taskCount: 5,
      completedTaskCount: 2,
      progress: 40,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: wf2Id,
      userId: 'demo-user',
      documentId: doc2Id,
      documentTitle: documents[1].title,
      title: 'TechNova 2026 Symposium Operations',
      description: 'End-to-end event management workflow from registration portal launch through venue AV setup, live event execution, and post-event reporting.',
      category: 'Events & Operations',
      objective: 'Deliver a seamless national technical symposium for 450 attendees.',
      sourceMethod: 'document',
      status: 'pending_review',
      priority: 'critical',
      responsibleRoles: ['Web Team', 'Registration Lead', 'Facilities & IT', 'Finance Officer'],
      completionConditions: ['450 passes confirmed', 'AV load test passed', 'Post-event report filed'],
      requiredApprovals: ['Finance Officer', 'Campus Facilities'],
      history: [
        { stage: 'draft', actor: 'Procify AI', note: 'Extracted from symposium brief', timestamp: isoNow },
        { stage: 'pending_review', actor: 'Elena Vance (Demo)', note: 'Submitted for human approval review', timestamp: isoNow },
      ],
      taskCount: 4,
      completedTaskCount: 0,
      progress: 0,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: wf3Id,
      userId: 'demo-user',
      documentId: doc3Id,
      documentTitle: documents[2].title,
      title: 'Capstone Phase II Evaluation Pipeline',
      description: 'Structured review and submission tracking for final-year engineering teams.',
      category: 'Academics',
      objective: 'Complete all mentor reviews and IEEE reports ahead of jury evaluations.',
      sourceMethod: 'document',
      status: 'completed',
      priority: 'medium',
      responsibleRoles: ['Project Coordinator', 'Project Guides', 'Student Teams'],
      completionConditions: ['All teams tagged release', 'Signed IEEE reports uploaded'],
      requiredApprovals: ['Project Coordinator'],
      history: [
        { stage: 'draft', actor: 'Procify AI', note: 'Generated from capstone notice', timestamp: isoNow },
        { stage: 'approved', actor: 'Elena Vance (Demo)', note: 'Approved', timestamp: isoNow },
        { stage: 'completed', actor: 'Elena Vance (Demo)', note: 'All phase II milestones completed', timestamp: isoNow },
      ],
      taskCount: 2,
      completedTaskCount: 2,
      progress: 100,
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const tasks: TaskRecord[] = [
    {
      id: 'demo_task_1',
      userId: 'demo-user',
      workflowId: wf1Id,
      workflowTitle: workflows[0].title,
      title: 'Collect verified question papers (2 sets/course)',
      description: 'Receive sealed envelopes from course leads and verify syllabus coverage.',
      assignedUser: 'Examination Cell',
      priority: 'critical',
      startDate: addDays(-3),
      dueDate: addDays(2),
      status: 'completed',
      dependencies: [],
      orderIndex: 0,
      reminderDate: addDays(1),
      reminderTime: '09:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_2',
      userId: 'demo-user',
      workflowId: wf1Id,
      workflowTitle: workflows[0].title,
      title: 'Finalize invigilation duty roster',
      description: 'Assign faculty slots across morning and afternoon exam sessions.',
      assignedUser: 'Dean of Academics',
      priority: 'high',
      startDate: addDays(-2),
      dueDate: addDays(3),
      status: 'completed',
      dependencies: ['demo_task_1'],
      orderIndex: 1,
      reminderDate: addDays(2),
      reminderTime: '10:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_3',
      userId: 'demo-user',
      workflowId: wf1Id,
      workflowTitle: workflows[0].title,
      title: 'Verify 75% attendance & lab logs',
      description: 'Flag students requiring Principal condonation prior to hall ticket print.',
      assignedUser: 'Academic Office',
      priority: 'high',
      startDate: addDays(-5),
      dueDate: addDays(-1),
      status: 'overdue',
      dependencies: [],
      orderIndex: 2,
      reminderDate: addDays(-1),
      reminderTime: '09:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_4',
      userId: 'demo-user',
      workflowId: wf1Id,
      workflowTitle: workflows[0].title,
      title: 'Publish room allocation & seating chart',
      description: 'Release classroom map on department noticeboards and student portal.',
      assignedUser: 'Department Coordinators',
      priority: 'high',
      startDate: addDays(1),
      dueDate: addDays(6),
      status: 'in_progress',
      dependencies: ['demo_task_2'],
      orderIndex: 3,
      reminderDate: addDays(5),
      reminderTime: '09:30',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_5',
      userId: 'demo-user',
      workflowId: wf1Id,
      workflowTitle: workflows[0].title,
      title: 'Upload internal marks to Examination Portal',
      description: 'Verify mark totals and lock portal entries within 5 days of final exam.',
      assignedUser: 'Course Faculty',
      priority: 'medium',
      startDate: addDays(12),
      dueDate: addDays(20),
      status: 'todo',
      dependencies: ['demo_task_4'],
      orderIndex: 4,
      reminderDate: addDays(19),
      reminderTime: '11:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_6',
      userId: 'demo-user',
      workflowId: wf2Id,
      workflowTitle: workflows[1].title,
      title: 'Launch symposium registration form & brochure',
      description: 'Configure team track fields, payment reference check, and confirmation email template.',
      assignedUser: 'Web Team',
      priority: 'high',
      startDate: addDays(0),
      dueDate: addDays(2),
      status: 'todo',
      dependencies: [],
      orderIndex: 0,
      reminderDate: addDays(1),
      reminderTime: '09:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_7',
      userId: 'demo-user',
      workflowId: wf2Id,
      workflowTitle: workflows[1].title,
      title: 'Confirm shortlisted participants & issue passes',
      description: 'Verify college IDs and send QR entry passes to confirmed teams.',
      assignedUser: 'Registration Lead',
      priority: 'high',
      startDate: addDays(3),
      dueDate: addDays(11),
      status: 'todo',
      dependencies: ['demo_task_6'],
      orderIndex: 1,
      reminderDate: addDays(10),
      reminderTime: '09:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_8',
      userId: 'demo-user',
      workflowId: wf2Id,
      workflowTitle: workflows[1].title,
      title: 'Run auditorium AV & Wi-Fi stress test',
      description: 'Test microphones, stage displays, and 450-device Wi-Fi capacity.',
      assignedUser: 'Facilities & IT',
      priority: 'critical',
      startDate: addDays(14),
      dueDate: addDays(16),
      status: 'todo',
      dependencies: ['demo_task_7'],
      orderIndex: 2,
      reminderDate: addDays(15),
      reminderTime: '14:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_9',
      userId: 'demo-user',
      workflowId: wf2Id,
      workflowTitle: workflows[1].title,
      title: 'Compile financial & attendance final report',
      description: 'Reconcile sponsorship receipts, catering invoices, and attendee feedback.',
      assignedUser: 'Finance Officer',
      priority: 'medium',
      startDate: addDays(19),
      dueDate: addDays(23),
      status: 'todo',
      dependencies: ['demo_task_8'],
      orderIndex: 3,
      reminderDate: addDays(22),
      reminderTime: '10:00',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_10',
      userId: 'demo-user',
      workflowId: wf3Id,
      workflowTitle: workflows[2].title,
      title: 'Complete mentor API & architecture review',
      description: 'Reviewed system architecture diagrams and database schemas for all teams.',
      assignedUser: 'Project Guides',
      priority: 'high',
      startDate: addDays(-10),
      dueDate: addDays(-4),
      status: 'completed',
      dependencies: [],
      orderIndex: 0,
      reminderDate: '',
      reminderTime: '',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_task_11',
      userId: 'demo-user',
      workflowId: wf3Id,
      workflowTitle: workflows[2].title,
      title: 'Archive signed IEEE capstone reports',
      description: 'All 18 team reports verified and archived in Capstone Portal.',
      assignedUser: 'Project Coordinator',
      priority: 'medium',
      startDate: addDays(-4),
      dueDate: addDays(-1),
      status: 'completed',
      dependencies: ['demo_task_10'],
      orderIndex: 1,
      reminderDate: '',
      reminderTime: '',
      isDemo: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const calendarEvents: CalendarEventRecord[] = [
    {
      id: 'demo_evt_1',
      userId: 'demo-user',
      workflowId: wf1Id,
      title: 'Internal Assessment Exams Begin',
      description: 'Semester VI examinations commence across Block A and Block B.',
      eventDate: addDays(14),
      eventTime: '09:30',
      eventType: 'milestone',
      priority: 'high',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_evt_2',
      userId: 'demo-user',
      workflowId: wf2Id,
      title: 'TechNova 2026 Symposium Day',
      description: 'Main Auditorium keynote, hackathon judging, and awards.',
      eventDate: addDays(18),
      eventTime: '08:30',
      eventType: 'event',
      priority: 'critical',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo_evt_3',
      userId: 'demo-user',
      workflowId: wf1Id,
      title: 'Seating Chart Publication Deadline',
      description: 'Publish classroom seating allocation on student portal.',
      eventDate: addDays(6),
      eventTime: '17:00',
      eventType: 'deadline',
      priority: 'high',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const notifications: NotificationRecord[] = [
    {
      id: 'demo_notif_1',
      userId: 'demo-user',
      title: 'Overdue Task Alert',
      message: '"Verify 75% attendance & lab logs" (Semester VI Internal Examination Execution) is past due.',
      type: 'overdue',
      relatedId: 'demo_task_3',
      read: false,
      scheduledFor: addDays(0),
      createdAt: isoNow,
    },
    {
      id: 'demo_notif_2',
      userId: 'demo-user',
      title: 'Workflow Pending Human Approval',
      message: '"TechNova 2026 Symposium Operations" (4 tasks) is awaiting your review and approval.',
      type: 'approval',
      relatedId: wf2Id,
      read: false,
      scheduledFor: addDays(0),
      createdAt: isoNow,
    },
    {
      id: 'demo_notif_3',
      userId: 'demo-user',
      title: 'Upcoming Deadline Reminder',
      message: '"Launch symposium registration form & brochure" is due in 2 days.',
      type: 'deadline',
      relatedId: 'demo_task_6',
      read: true,
      scheduledFor: addDays(1),
      createdAt: isoNow,
    },
  ];

  const activities: ActivityRecord[] = [
    {
      id: 'demo_act_1',
      userId: 'demo-user',
      action: 'Analyzed Sample Document',
      details: 'Processed Semester VI Internal Assessment Examination Circular via Gemini AI.',
      entityType: 'document',
      entityId: doc1Id,
      createdAt: isoNow,
    },
    {
      id: 'demo_act_2',
      userId: 'demo-user',
      action: 'Submitted Workflow for Review',
      details: 'TechNova 2026 Symposium Operations queued for Human Approval.',
      entityType: 'workflow',
      entityId: wf2Id,
      createdAt: isoNow,
    },
    {
      id: 'demo_act_3',
      userId: 'demo-user',
      action: 'Completed Workflow',
      details: 'Capstone Phase II Evaluation Pipeline reached 100% completion.',
      entityType: 'workflow',
      entityId: wf3Id,
      createdAt: isoNow,
    },
  ];

  const integrations: IntegrationRecord[] = [
    { id: 'demo_int_gcal', userId: 'demo-user', provider: 'google_calendar', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
    { id: 'demo_int_gmail', userId: 'demo-user', provider: 'gmail', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
    { id: 'demo_int_slack', userId: 'demo-user', provider: 'slack', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
    { id: 'demo_int_teams', userId: 'demo-user', provider: 'microsoft_teams', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
    { id: 'demo_int_webhooks', userId: 'demo-user', provider: 'webhooks', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
    { id: 'demo_int_n8n', userId: 'demo-user', provider: 'n8n', status: 'not_connected', webhookUrl: '', configNotes: '', updatedAt: isoNow },
  ];

  return {
    profile,
    documents,
    workflows,
    tasks,
    calendarEvents,
    notifications,
    activities,
    integrations,
  };
}
