export const demoCourses = [
  ['React from fundamentals to real applications', 'Web development', 'Nguyễn Hoàng Minh', 'REACT', 'sky'],
  ['User interface and experience design', 'Design', 'Vũ Minh Phú', 'DESIGN', 'peach'],
  ['Python: start your programming journey', 'Programming', 'Nguyễn Lê Duy', 'PYTHON', 'mint'],
  ['Databases and systems thinking', 'Data', 'Hoàng Ngọc Hiển', 'DATA', 'lilac'],
  ['Modern JavaScript for developers', 'Web development', 'Nguyễn Hoàng Minh', 'JS', 'yellow'],
  ['Git and team workflows', 'Tools', 'Nguyễn Lê Duy', 'GIT', 'peach'],
  ['Node.js and REST API design', 'Web development', 'Hoàng Ngọc Hiển', 'NODE', 'mint'],
  ['Algorithms through practical exercises', 'Programming', 'Nguyễn Lê Duy', 'LOGIC', 'lilac'],
].map(([title, category, teacher, art, color], i) => ({
  id: `demo-${i + 1}`, title, category: { id: category, name: category }, instructor: { full_name: teacher, bio: 'Learn through practical examples and projects.' }, art, color,
  description: 'Build strong foundations through practical examples and create your own project step by step.',
  prerequisites: 'A computer with internet access and a willingness to learn. No advanced experience required.', is_published: true,
  chapters: [
    { id: `chapter-${i}-1`, title: 'Getting started and building foundations', lessons: [{ id: 'l1', title: 'Course introduction and roadmap', type: 'video', minutes: 12 }, { id: 'l2', title: 'Preparing tools and environment', type: 'text', minutes: 15 }] },
    { id: `chapter-${i}-2`, title: 'Your first practical project', lessons: [{ id: 'l3', title: 'Building a project step by step', type: 'video', minutes: 25 }, { id: 'l4', title: 'Review and next steps', type: 'text', minutes: 10 }] },
  ],
}));
export function lessonCount(course) { return (course.chapters || []).reduce((sum, chapter) => sum + (chapter.lessons || []).length, 0); }
export function readDrafts(userId) { try { const data = JSON.parse(localStorage.getItem(userId ? `lms-issue7-drafts-${userId}` : 'lms-issue7-drafts') || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
