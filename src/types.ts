// Canvas cookie from Playwright
export interface CanvasCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

// Course from /api/v1/dashboard/dashboard_cards
export interface Course {
  id: number;
  shortName: string;
  originalName: string;
  courseCode: string;
  href: string;
  term?: { name: string };
}

// Assignment from /api/v1/courses/{id}/assignments?include[]=submission
export interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  submission?: {
    workflow_state: string; // 'submitted', 'unsubmitted', 'graded', etc.
  };
}

// Module item from /learningx/api/v1/courses/{id}/modules?include_detail=true
export interface ModuleItem {
  module_item_id: number;
  title: string;
  content_type: string; // 'attendance_item', etc.
  completed: boolean | null;
  content_data?: {
    duration?: number;           // seconds
    item_content_type?: string;  // 'commons' for video
    unlock_at?: string | null;   // viewing available from
    due_at?: string | null;      // must complete by
    lock_at?: string | null;     // locked after
    omit_progress?: boolean;
  };
}

export interface Module {
  module_id: number;
  title: string;
  module_items: ModuleItem[];
}

// Video item (uncompleted)
export interface VideoItem {
  courseId: number;
  courseName: string;
  moduleId: number;
  moduleName: string;
  itemId: number;
  title: string;
  durationMinutes?: number;
  completed: false;
}

// Quiz from /api/v1/courses/{id}/quizzes
export interface Quiz {
  id: number;
  title: string;
  due_at: string | null;
  course_id: number;
  quiz_submissions_zip_url?: string;
}

// Quiz submission
export interface QuizSubmission {
  quiz_id: number;
  workflow_state: string; // 'complete', 'pending_review', 'untaken'
}

// Discussion topic from /api/v1/courses/{id}/discussion_topics
export interface DiscussionTopic {
  id: number;
  title: string;
  require_initial_post: boolean;
  user_name?: string;
  posted_at?: string;
  discussion_subentry_count: number;
}

// Announcement from /api/v1/courses/{id}/announcements
export interface Announcement {
  id: number;
  title: string;
  posted_at: string;
  message?: string;
  author?: { display_name: string };
}

// Uncompleted assignment (after filtering)
export interface UncompletedAssignment {
  courseId: number;
  courseName: string;
  assignmentId: number;
  name: string;
  dueAt: Date | null;
  hoursUntilDue: number | null; // null if no due date
}

// Uncompleted quiz
export interface UncompletedQuiz {
  courseId: number;
  courseName: string;
  quizId: number;
  title: string;
  dueAt: Date | null;
  hoursUntilDue: number | null;
}

// Uncompleted discussion
export interface UncompletedDiscussion {
  courseId: number;
  courseName: string;
  topicId: number;
  title: string;
}

// Recent announcement (for summary)
export interface RecentAnnouncement {
  courseId: number;
  courseName: string;
  announcementId: number;
  title: string;
  postedAt: Date;
  author: string;
}

// All uncompleted items for a run
export interface UncompletedItems {
  assignments: UncompletedAssignment[];
  videos: VideoItem[];
  quizzes: UncompletedQuiz[];
  discussions: UncompletedDiscussion[];
  announcements: RecentAnnouncement[];
}

// Run mode
export type RunMode = 'daily' | 'deadline';
