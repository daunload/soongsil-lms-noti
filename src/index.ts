import { login } from './auth.js';
import {
  getCourses,
  getModules,
  getAssignments,
  getQuizzes,
  getQuizSubmission,
  getDiscussionTopics,
  getAnnouncements,
} from './api.js';
import {
  filterAssignments,
  filterVideos,
  filterQuizzes,
  filterDiscussions,
  filterAnnouncements,
} from './checker.js';
import { buildSubject, buildHtml } from './template.js';
import { sendEmail } from './email.js';
import type { UncompletedItems, RunMode, QuizSubmission } from './types.js';

function parseMode(): RunMode {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  if (!modeArg) return 'daily';
  const value = modeArg.split('=')[1];
  if (value === 'deadline') return 'deadline';
  return 'daily';
}

async function main(): Promise<void> {
  const mode = parseMode();
  console.log(`[index] Starting in mode: ${mode}`);

  // Step 1: Login
  console.log('[index] Logging in...');
  const cookies = await login();
  console.log('[index] Login successful.');

  // Step 2: Fetch courses
  console.log('[index] Fetching courses...');
  const courses = await getCourses(cookies);
  console.log(`[index] Found ${courses.length} course(s).`);

  // Step 3: Fetch all data per course in parallel
  console.log('[index] Fetching course data in parallel...');
  const courseResults = await Promise.all(
    courses.map(async (course) => {
      const [assignments, modules, quizzes, discussionTopics, announcements] =
        await Promise.all([
          getAssignments(cookies, course.id),
          getModules(cookies, course.id),
          getQuizzes(cookies, course.id),
          getDiscussionTopics(cookies, course.id),
          getAnnouncements(cookies, course.id),
        ]);

      // Fetch quiz submissions for each quiz
      const quizSubmissionEntries = await Promise.all(
        quizzes.map(async (quiz) => {
          const submission = await getQuizSubmission(cookies, course.id, quiz.id);
          return [quiz.id, submission] as [number, QuizSubmission | null];
        }),
      );
      const quizSubmissions = new Map<number, QuizSubmission | null>(quizSubmissionEntries);

      return { course, assignments, modules, quizzes, quizSubmissions, discussionTopics, announcements };
    }),
  );

  // Step 4: Run checker functions and aggregate uncompleted items
  console.log('[index] Checking uncompleted items...');
  const aggregated: UncompletedItems = {
    assignments: [],
    videos: [],
    quizzes: [],
    discussions: [],
    announcements: [],
  };

  for (const { course, assignments, modules, quizzes, quizSubmissions, discussionTopics, announcements } of courseResults) {
    aggregated.assignments.push(...filterAssignments(assignments, course));
    aggregated.videos.push(...filterVideos(modules, course));
    aggregated.quizzes.push(...filterQuizzes(quizzes, quizSubmissions, course));
    aggregated.discussions.push(...filterDiscussions(discussionTopics, course));
    aggregated.announcements.push(...filterAnnouncements(announcements, course));
  }

  console.log(
    `[index] Uncompleted — assignments: ${aggregated.assignments.length}, videos: ${aggregated.videos.length}, quizzes: ${aggregated.quizzes.length}, discussions: ${aggregated.discussions.length}, announcements: ${aggregated.announcements.length}`,
  );

  // Step 5: Decide whether to send email based on mode
  if (mode === 'deadline') {
    const hasDueSoon =
      aggregated.assignments.some((a) => a.hoursUntilDue !== null && a.hoursUntilDue <= 24) ||
      aggregated.quizzes.some((q) => q.hoursUntilDue !== null && q.hoursUntilDue <= 24);

    if (!hasDueSoon) {
      console.log('[index] No items due within 24 hours. Skipping email.');
      return;
    }

    console.log('[index] Found items due within 24 hours. Sending deadline email...');
  } else {
    console.log('[index] Daily mode: always sending email.');
  }

  // Step 6: Build and send email
  const subject = buildSubject(mode, aggregated);
  const html = buildHtml(mode, aggregated);

  console.log('[index] Sending email...');
  await sendEmail(subject, html);
  console.log('[index] Email sent successfully.');
}

main().catch((err) => {
  console.error('[index] Fatal error:', err);
  process.exit(1);
});
