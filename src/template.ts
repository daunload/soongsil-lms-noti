import type { UncompletedItems } from './types.js';

/**
 * Generate email subject line
 * Format: "[LMS 알림] 2026-04-01 — 미완료 12개 / 🚨 마감 임박 2개"
 */
export function buildSubject(items: UncompletedItems, date: Date): string {
  const dateStr = formatDate(date);

  // Count total: assignments + videos + quizzes + discussions (NOT announcements)
  const totalCount =
    items.assignments.length +
    items.videos.length +
    items.quizzes.length +
    items.discussions.length;

  // Count urgent: items with hoursUntilDue !== null && hoursUntilDue <= 24
  const urgentCount = countUrgent(items);

  // If all done daily
  if (totalCount === 0) {
    return `[LMS 알림] ${dateStr} — 모두 완료! 🎉`;
  }

  // If no urgent
  if (urgentCount === 0) {
    return `[LMS 알림] ${dateStr} — 미완료 ${totalCount}개`;
  }

  // If urgent items exist
  return `[LMS 알림] ${dateStr} — 미완료 ${totalCount}개 / 🚨 마감 임박 ${urgentCount}개`;
}

/**
 * Generate full HTML email body
 */
export function buildHtml(items: UncompletedItems, date: Date): string {
  const dateStr = formatDate(date);

  // Count total items
  const totalCount =
    items.assignments.length +
    items.videos.length +
    items.quizzes.length +
    items.discussions.length;

  // If everything is done
  if (totalCount === 0) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; color: #2c3e50; }
    h3 { color: #34495e; margin-top: 20px; border-bottom: 2px solid #3498db; padding-bottom: 8px; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 8px 0; }
    .urgent { color: #e74c3c; font-weight: bold; }
    .warning { color: #f39c12; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>📚 LMS 미완료 항목 — ${dateStr}</h2>
    <p class="urgent">🎉 모든 항목을 완료했습니다!</p>
  </div>
</body>
</html>`;
  }

  // Build HTML with sections
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h2 { margin-top: 0; color: #2c3e50; }
    h3 { color: #34495e; margin-top: 20px; border-bottom: 2px solid #3498db; padding-bottom: 8px; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 8px 0; }
    .urgent { color: #e74c3c; font-weight: bold; }
    .warning { color: #f39c12; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>📚 LMS 미완료 항목 — ${dateStr}</h2>
`;

  // Assignments section
  if (items.assignments.length > 0) {
    html += `    <h3>📚 과제 (${items.assignments.length}개)</h3>\n    <ul>\n`;
    for (const assignment of items.assignments) {
      html += formatAssignmentItem(assignment);
    }
    html += `    </ul>\n`;
  }

  // Videos section
  if (items.videos.length > 0) {
    html += `    <h3>🎬 영상 (${items.videos.length}개)</h3>\n    <ul>\n`;
    for (const video of items.videos) {
      html += formatVideoItem(video);
    }
    html += `    </ul>\n`;
  }

  // Quizzes section
  if (items.quizzes.length > 0) {
    html += `    <h3>❓ 퀴즈 (${items.quizzes.length}개)</h3>\n    <ul>\n`;
    for (const quiz of items.quizzes) {
      html += formatQuizItem(quiz);
    }
    html += `    </ul>\n`;
  }

  // Discussions section
  if (items.discussions.length > 0) {
    html += `    <h3>💬 토론 (${items.discussions.length}개)</h3>\n    <ul>\n`;
    for (const discussion of items.discussions) {
      html += `      <li>[${discussion.courseName}] ${discussion.title}</li>\n`;
    }
    html += `    </ul>\n`;
  }

  // Announcements section
  if (items.announcements.length > 0) {
    html += `    <h3>📢 공지 (${items.announcements.length}개, 최근 7일)</h3>\n    <ul>\n`;
    for (const announcement of items.announcements) {
      const announcementDate = formatDateTime(announcement.postedAt);
      html += `      <li>[${announcement.courseName}] ${announcement.title} — ${announcementDate} ${announcement.author}</li>\n`;
    }
    html += `    </ul>\n`;
  }

  html += `  </div>\n</body>\n</html>`;

  return html;
}

/**
 * Format assignment item HTML
 */
function formatAssignmentItem(assignment: {
  courseName: string;
  name: string;
  dueAt: Date | null;
  hoursUntilDue: number | null;
}): string {
  const courseAndName = `[${assignment.courseName}] ${assignment.name}`;

  // No due date
  if (!assignment.dueAt) {
    return `      <li>${courseAndName} — 마감 없음</li>\n`;
  }

  const dueStr = formatDateTime(assignment.dueAt);
  const hoursUntilDue = assignment.hoursUntilDue;

  // Urgent: <= 24 hours
  if (hoursUntilDue !== null && hoursUntilDue <= 24) {
    const timeStr =
      hoursUntilDue <= 1
        ? '곧'
        : `${Math.ceil(hoursUntilDue)}시간 후`;
    return `      <li><span class="urgent">🚨 ${courseAndName} — 마감 ${dueStr} <strong>(${timeStr === '곧' ? '오늘!' : `${timeStr}`})</strong></span></li>\n`;
  }

  // Warning: <= 72 hours
  if (hoursUntilDue !== null && hoursUntilDue <= 72) {
    const daysUntilDue = Math.ceil(hoursUntilDue / 24);
    return `      <li><span class="warning">⚠️ ${courseAndName} — 마감 ${dueStr} (${daysUntilDue}일 후)</span></li>\n`;
  }

  // Normal
  return `      <li>${courseAndName} — 마감 ${dueStr}</li>\n`;
}

/**
 * Format video item HTML
 */
function formatVideoItem(video: {
  courseName: string;
  title: string;
  durationMinutes?: number;
  completed: boolean | 'unknown';
}): string {
  let content = `[${video.courseName}] ${video.title}`;

  // Add duration if available
  if (video.durationMinutes) {
    content += ` (${video.durationMinutes}분)`;
  }

  // Add completion status if unknown
  if (video.completed === 'unknown') {
    content += ' — 알 수 없음';
  }

  return `      <li>${content}</li>\n`;
}

/**
 * Format quiz item HTML
 */
function formatQuizItem(quiz: {
  courseName: string;
  title: string;
  dueAt: Date | null;
  hoursUntilDue: number | null;
}): string {
  const courseAndName = `[${quiz.courseName}] ${quiz.title}`;

  // No due date
  if (!quiz.dueAt) {
    return `      <li>${courseAndName} — 마감 없음</li>\n`;
  }

  const dueStr = formatDateTime(quiz.dueAt);
  const hoursUntilDue = quiz.hoursUntilDue;

  // Urgent: <= 24 hours
  if (hoursUntilDue !== null && hoursUntilDue <= 24) {
    const timeStr =
      hoursUntilDue <= 1
        ? '곧'
        : `${Math.ceil(hoursUntilDue)}시간 후`;
    return `      <li><span class="urgent">🚨 ${courseAndName} — 마감 ${dueStr} <strong>(${timeStr === '곧' ? '오늘!' : `${timeStr}`})</strong></span></li>\n`;
  }

  // Warning: <= 72 hours
  if (hoursUntilDue !== null && hoursUntilDue <= 72) {
    const daysUntilDue = Math.ceil(hoursUntilDue / 24);
    return `      <li><span class="warning">⚠️ ${courseAndName} — 마감 ${dueStr} (${daysUntilDue}일 후)</span></li>\n`;
  }

  // Normal
  return `      <li>${courseAndName} — 마감 ${dueStr}</li>\n`;
}

/**
 * Format date as YYYY-MM-DD (e.g., "2026-04-01") — used for subject/headers
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date and time as M/D HH:mm (e.g., "4/2 23:59")
 */
function formatDateTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * Count urgent items (hoursUntilDue <= 24)
 */
function countUrgent(items: UncompletedItems): number {
  let count = 0;

  for (const assignment of items.assignments) {
    if (assignment.hoursUntilDue !== null && assignment.hoursUntilDue <= 24) {
      count++;
    }
  }

  for (const quiz of items.quizzes) {
    if (quiz.hoursUntilDue !== null && quiz.hoursUntilDue <= 24) {
      count++;
    }
  }

  return count;
}
