export const demoCourses = [
  ['React từ nền tảng đến ứng dụng thực tế', 'Lập trình web', 'Nguyễn Hoàng Minh', 'REACT', 'sky'],
  ['Thiết kế giao diện và trải nghiệm người dùng', 'Thiết kế', 'Vũ Minh Phú', 'DESIGN', 'peach'],
  ['Python: bắt đầu hành trình lập trình', 'Lập trình', 'Nguyễn Lê Duy', 'PYTHON', 'mint'],
  ['Cơ sở dữ liệu và tư duy hệ thống', 'Dữ liệu', 'Hoàng Ngọc Hiển', 'DATA', 'lilac'],
  ['JavaScript hiện đại cho lập trình viên', 'Lập trình web', 'Nguyễn Hoàng Minh', 'JS', 'yellow'],
  ['Git và quy trình làm việc nhóm', 'Công cụ', 'Nguyễn Lê Duy', 'GIT', 'peach'],
  ['Node.js và thiết kế REST API', 'Lập trình web', 'Hoàng Ngọc Hiển', 'NODE', 'mint'],
  ['Tư duy thuật toán qua bài tập thực tế', 'Lập trình', 'Nguyễn Lê Duy', 'LOGIC', 'lilac'],
].map(([title, category, teacher, art, color], i) => ({
  id: `demo-${i + 1}`, title, category: { id: category, name: category }, instructor: { full_name: teacher, bio: 'Đồng hành cùng bạn qua những ví dụ và dự án thực tế.' }, art, color,
  description: 'Xây dựng nền tảng vững chắc, học qua ví dụ trực quan và từng bước hoàn thành dự án của riêng bạn.',
  prerequisites: 'Có máy tính kết nối internet và tinh thần sẵn sàng học hỏi. Không yêu cầu kinh nghiệm chuyên sâu.', is_published: true,
  chapters: [
    { id: `chapter-${i}-1`, title: 'Làm quen và xây dựng nền tảng', lessons: [{ id: 'l1', title: 'Giới thiệu khóa học và lộ trình', type: 'video', minutes: 12 }, { id: 'l2', title: 'Chuẩn bị công cụ và môi trường', type: 'text', minutes: 15 }] },
    { id: `chapter-${i}-2`, title: 'Thực hành với dự án đầu tiên', lessons: [{ id: 'l3', title: 'Từng bước xây dựng dự án', type: 'video', minutes: 25 }, { id: 'l4', title: 'Tổng kết và hướng phát triển', type: 'text', minutes: 10 }] },
  ],
}));
export function lessonCount(course) { return (course.chapters || []).reduce((sum, chapter) => sum + (chapter.lessons || []).length, 0); }
export function readDrafts() { try { const data = JSON.parse(localStorage.getItem('lms-issue7-drafts') || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
