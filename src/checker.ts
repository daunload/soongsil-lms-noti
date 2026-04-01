import type {
  Course,
  Assignment,
  VideoItem,
  Module,
  Quiz,
  QuizSubmission,
  DiscussionTopic,
  Announcement,
  UncompletedAssignment,
  UncompletedQuiz,
  UncompletedDiscussion,
  RecentAnnouncement,
} from './types.js';

/**
 * Filter assignments: not submitted AND due date not past (or no due date).
 */
export function filterAssignments(
  assignments: Assignment[],
  course: Course,
): UncompletedAssignment[] {
  const now = Date.now();
  const result: UncompletedAssignment[] = [];

  for (const assignment of assignments) {
    const state = assignment.submission?.workflow_state;
    if (state === 'submitted' || state === 'graded') {
      continue;
    }

    let dueAt: Date | null = null;
    let hoursUntilDue: number | null = null;

    if (assignment.due_at !== null) {
      dueAt = new Date(assignment.due_at);
      const diffMs = dueAt.getTime() - now;
      if (diffMs < 0) {
        // Due date already past — skip
        continue;
      }
      hoursUntilDue = diffMs / 3_600_000;
    }

    result.push({
      courseId: course.id,
      courseName: course.shortName,
      assignmentId: assignment.id,
      name: assignment.name,
      dueAt,
      hoursUntilDue,
    });
  }

  return result;
}

/**
 * Filter videos from modules: items where completion_requirement exists
 * AND completion_requirement.completed !== true.
 * If completion_requirement exists but completed is undefined → treat as 'unknown'.
 */
export function filterVideos(modules: Module[], course: Course): VideoItem[] {
  const result: VideoItem[] = [];

  const now = new Date();

  for (const mod of modules) {
    for (const item of mod.module_items) {
      // Skip items with omit_progress — not tracked
      if (item.content_data?.omit_progress) continue;

      // Skip if viewing period hasn't started yet
      const unlockAt = item.content_data?.unlock_at ? new Date(item.content_data.unlock_at) : null;
      if (unlockAt && now < unlockAt) continue;

      // Skip if deadline has already passed
      const dueAt = item.content_data?.due_at ? new Date(item.content_data.due_at) : null;
      if (dueAt && now > dueAt) continue;

      // Only include videos confirmed as not watched
      if (item.completed !== false) continue;

      // Duration: content_data.duration is in seconds → convert to minutes
      const durationMinutes = item.content_data?.duration
        ? Math.ceil(item.content_data.duration / 60)
        : undefined;

      result.push({
        courseId: course.id,
        courseName: course.shortName,
        moduleId: mod.module_id,
        moduleName: mod.title,
        itemId: item.module_item_id,
        title: item.title,
        durationMinutes,
        completed: false,
      });
    }
  }

  return result;
}

/**
 * Filter quizzes: submission is null OR workflow_state !== 'complete'
 * AND due date not past (or no due date).
 */
export function filterQuizzes(
  quizzes: Quiz[],
  quizSubmissions: Map<number, QuizSubmission | null>,
  course: Course,
): UncompletedQuiz[] {
  const now = Date.now();
  const result: UncompletedQuiz[] = [];

  for (const quiz of quizzes) {
    let dueAt: Date | null = null;
    let hoursUntilDue: number | null = null;

    if (quiz.due_at !== null) {
      dueAt = new Date(quiz.due_at);
      const diffMs = dueAt.getTime() - now;
      if (diffMs < 0) {
        // Due date already past — skip
        continue;
      }
      hoursUntilDue = diffMs / 3_600_000;
    }

    const submission = quizSubmissions.get(quiz.id);
    const isCompleted =
      submission !== null &&
      submission !== undefined &&
      submission.workflow_state === 'complete';

    if (isCompleted) {
      continue;
    }

    result.push({
      courseId: course.id,
      courseName: course.shortName,
      quizId: quiz.id,
      title: quiz.title,
      dueAt,
      hoursUntilDue,
    });
  }

  return result;
}

/**
 * Filter discussions: require_initial_post === true AND discussion_subentry_count === 0.
 */
export function filterDiscussions(
  topics: DiscussionTopic[],
  course: Course,
): UncompletedDiscussion[] {
  const result: UncompletedDiscussion[] = [];

  for (const topic of topics) {
    if (topic.require_initial_post === true && topic.discussion_subentry_count === 0) {
      result.push({
        courseId: course.id,
        courseName: course.shortName,
        topicId: topic.id,
        title: topic.title,
      });
    }
  }

  return result;
}

/**
 * Filter announcements: map all to RecentAnnouncement (no additional filtering).
 */
export function filterAnnouncements(
  announcements: Announcement[],
  course: Course,
): RecentAnnouncement[] {
  return announcements.map((announcement) => ({
    courseId: course.id,
    courseName: course.shortName,
    announcementId: announcement.id,
    title: announcement.title,
    postedAt: new Date(announcement.posted_at),
    author: announcement.author?.display_name ?? 'Unknown',
  }));
}
