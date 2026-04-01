import type {
  CanvasCookie,
  Course,
  Assignment,
  Module,
  Quiz,
  QuizSubmission,
  DiscussionTopic,
  Announcement
} from './types.js';

const BASE = 'https://canvas.ssu.ac.kr';

// Convert CanvasCookie[] to Cookie header string
function cookieHeader(cookies: CanvasCookie[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

// Extract xn_api_token value for learningx Bearer auth
function xnApiToken(cookies: CanvasCookie[]): string | null {
  return cookies.find(c => c.name === 'xn_api_token')?.value ?? null;
}

// Generic fetch helper — throws on non-2xx
// Strips Canvas's while(1); CSRF prefix before parsing JSON
async function apiFetch<T>(url: string, cookies: CanvasCookie[]): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Cookie: cookieHeader(cookies),
      Accept: 'application/json',
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  const text = await res.text();
  const json = text.startsWith('while(1);') ? text.slice('while(1);'.length) : text;
  return JSON.parse(json) as T;
}

// GET /api/v1/dashboard/dashboard_cards → Course[]
export async function getCourses(cookies: CanvasCookie[]): Promise<Course[]> {
  const url = `${BASE}/api/v1/dashboard/dashboard_cards`;
  return apiFetch<Course[]>(url, cookies);
}

// GET /learningx/api/v1/courses/{id}/modules?include_detail=true → Module[]
// Requires Authorization: Bearer <xn_api_token>
export async function getModules(
  cookies: CanvasCookie[],
  courseId: number
): Promise<Module[]> {
  const token = xnApiToken(cookies);
  if (!token) throw new Error('xn_api_token cookie not found');
  const url = `${BASE}/learningx/api/v1/courses/${courseId}/modules?include_detail=true`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  const text = await res.text();
  const json = text.startsWith('while(1);') ? text.slice('while(1);'.length) : text;
  return JSON.parse(json) as Module[];
}

// GET /api/v1/courses/{id}/assignments?include[]=submission&per_page=100 → Assignment[]
export async function getAssignments(
  cookies: CanvasCookie[],
  courseId: number
): Promise<Assignment[]> {
  const url = `${BASE}/api/v1/courses/${courseId}/assignments?include[]=submission&per_page=100`;
  return apiFetch<Assignment[]>(url, cookies);
}

// GET /api/v1/courses/{id}/quizzes?per_page=100 → Quiz[]
export async function getQuizzes(
  cookies: CanvasCookie[],
  courseId: number
): Promise<Quiz[]> {
  const url = `${BASE}/api/v1/courses/${courseId}/quizzes?per_page=100`;
  return apiFetch<Quiz[]>(url, cookies);
}

// GET /api/v1/courses/{id}/quizzes/{quizId}/submission → { quiz_submissions: QuizSubmission[] }
// Return first submission or null
export async function getQuizSubmission(
  cookies: CanvasCookie[],
  courseId: number,
  quizId: number
): Promise<QuizSubmission | null> {
  const url = `${BASE}/api/v1/courses/${courseId}/quizzes/${quizId}/submission`;
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader(cookies), Accept: 'application/json' }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`API error ${res.status}: ${url}`);
  }
  const text = await res.text();
  const json = text.startsWith('while(1);') ? text.slice('while(1);'.length) : text;
  const data = JSON.parse(json) as { quiz_submissions: QuizSubmission[] };
  return data.quiz_submissions?.[0] ?? null;
}

// GET /api/v1/courses/{id}/discussion_topics?per_page=100 → DiscussionTopic[]
export async function getDiscussionTopics(
  cookies: CanvasCookie[],
  courseId: number
): Promise<DiscussionTopic[]> {
  const url = `${BASE}/api/v1/courses/${courseId}/discussion_topics?per_page=100`;
  return apiFetch<DiscussionTopic[]>(url, cookies);
}

// GET /api/v1/announcements?context_codes[]=course_{id}&start_date=...&end_date=... → Announcement[]
export async function getAnnouncements(
  cookies: CanvasCookie[],
  courseId: number
): Promise<Announcement[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = encodeURIComponent(sevenDaysAgo.toISOString());
  const endDate = encodeURIComponent(new Date().toISOString());

  const url = `${BASE}/api/v1/announcements?context_codes[]=course_${courseId}&per_page=50&start_date=${startDate}&end_date=${endDate}&active_only=true`;
  return apiFetch<Announcement[]>(url, cookies);
}
