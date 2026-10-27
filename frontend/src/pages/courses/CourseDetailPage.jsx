import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import CourseLayout, { CourseArt, LoadingCards } from './CourseLayout';
import { demoCourses, lessonCount, readDrafts } from './courseData';
export default function CourseDetailPage() {
 const {courseId}=useParams(); const [params]=useSearchParams(); const demo=params.get('demo')==='1';const draft=params.get('draft')==='1';
 const [course,setCourse]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  (async()=>{try{const data=draft?readDrafts().find(c=>c.id===courseId):demo?demoCourses.find(c=>c.id===courseId):(await api.get(`/courses/${courseId}`,{signal:controller.signal})).data.data;if(!data)throw Error();if(!controller.signal.aborted)setCourse(data);}catch(e){if(!controller.signal.aborted)setError('Không tìm thấy khóa học hoặc không thể kết nối máy chủ.');}finally{if(!controller.signal.aborted)setLoading(false);}})();return()=>controller.abort();
 },[courseId,demo,draft]);
 return <CourseLayout><Link className="course-breadcrumb" to={draft?'/instructor':demo?'/?demo=1':'/'}>← {draft?'Khóa học của tôi':'Tất cả khóa học'}</Link>
 {loading?<LoadingCards/>:error?<div className="course-empty" role="alert">{error}</div>:course&&<>
 {(demo||draft)&&<p className="course-banner">{draft?'Bản xem trước nháp lưu trên trình duyệt.':'Khóa học mẫu dùng để kiểm tra giao diện.'}</p>}
 <section className="detail-hero"><div><span className="course-tag">{course.category?.name || 'Khóa học'}</span><h1>{course.title}</h1><p>{course.description}</p><div className="detail-meta"><span>{lessonCount(course)} bài học</span><span>{course.chapters?.length || 0} chương</span><span>Giảng viên: <strong>{course.instructor?.full_name || 'Chưa có thông tin'}</strong></span></div></div><CourseArt course={course}/></section>
 <div className="detail-grid"><section className="course-panel"><div className="section-heading"><h2>Nội dung khóa học</h2><span>{lessonCount(course)} bài học</span></div>{course.chapters?.length?course.chapters.map((chapter,i)=><details className="curriculum-detail" key={chapter.id} open><summary><span className="chapter-number">{String(i+1).padStart(2,'0')}</span><strong>{chapter.title}</strong><span>{chapter.lessons?.length || 0} bài</span></summary><ol>{chapter.lessons?.map(lesson=><li key={lesson.id}><span aria-hidden="true">{(lesson.type || lesson.materials?.[0]?.type)==='text'?'▤':'▷'}</span><span>{lesson.title}</span><small>{(lesson.type || lesson.materials?.[0]?.type)==='text'?'Văn bản':'Video'}</small></li>)}</ol></details>):<p>Đề cương đang được cập nhật.</p>}</section>
 <aside><section className="course-panel"><h2>Trước khi bắt đầu</h2><h3>Yêu cầu đầu vào</h3><p>{course.prerequisites || 'Không có yêu cầu đầu vào được công bố.'}</p></section><section className="course-panel instructor-info"><span className="course-eyebrow">ĐỒNG HÀNH CÙNG BẠN</span><h2>{course.instructor?.full_name || 'Giảng viên'}</h2><p>{course.instructor?.bio || 'Thông tin giảng viên đang được cập nhật.'}</p></section></aside></div>
 </> }</CourseLayout>;
}
