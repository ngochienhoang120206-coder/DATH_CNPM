import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CourseLayout, { CourseArt, LoadingCards } from './CourseLayout';
import { demoCourses, lessonCount, readDrafts } from './courseData';
export default function CourseDetailPage() {
 const {user}=useAuth(); const navigate=useNavigate();
 const [enrolled,setEnrolled]=useState(null); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState('');
 const {courseId}=useParams(); const [params]=useSearchParams(); const demo=params.get('demo')==='1';const draft=params.get('draft')==='1';const instructorDemo=import.meta.env.DEV && params.get('instructorDemo')==='1';
 const [course,setCourse]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setEnrolled(null);setNotice('');
  if(!user || demo || draft)return ()=>controller.abort();
  setSaving(true);
  api.get('/enrollments/me',{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted)setEnrolled(data.data.some(item=>item.course_id===courseId));})
   .catch(err=>{if(!controller.signal.aborted)setNotice(err.response?.data?.message || 'Unable to check enrollment.');})
   .finally(()=>{if(!controller.signal.aborted)setSaving(false);});
  return()=>controller.abort();
 },[courseId,user?.id,demo,draft]);
 const changeEnrollment=async join=>{
  if(!user){navigate('/login');return;}
  setSaving(true);setNotice('');
  try {
   if(join) await api.post(`/courses/${courseId}/enroll`);
   else await api.delete(`/courses/${courseId}/enroll`);
   setEnrolled(join);setNotice(join?'You are enrolled in this course.':'You have left this course.');
  } catch(err){setNotice(err.response?.data?.message || 'Unable to update enrollment. Please try again.');}
  finally{setSaving(false);}
 };
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  (async()=>{try{const data=draft?readDrafts(instructorDemo?'instructor-demo':user?.id).find(c=>c.id===courseId):demo?demoCourses.find(c=>c.id===courseId):(await api.get(`/courses/${courseId}`,{signal:controller.signal})).data.data;if(!data)throw Error();if(!controller.signal.aborted)setCourse(data);}catch(e){if(!controller.signal.aborted)setError('Course not found or the server is unavailable.');}finally{if(!controller.signal.aborted)setLoading(false);}})();return()=>controller.abort();
 },[courseId,demo,draft,user?.id,instructorDemo]);
 return <CourseLayout><Link className="course-breadcrumb" to={draft?(instructorDemo?'/instructor?demo=1':'/instructor'):demo?'/?demo=1':'/'}>← {draft?'My courses':'All courses'}</Link>
 {loading?<LoadingCards/>:error?<div className="course-empty" role="alert">{error}</div>:course&&<>
 {(demo||draft)&&<p className="course-banner">{draft?'Preview of a draft saved in this browser.':'Sample course for preview purposes.'}</p>}
 {!demo&&!draft&&<section className="course-panel" aria-label="Course actions">
  {notice&&<p role="status">{notice}</p>}
  {(!user||user.role==='student')&&<>
   {enrolled!==true&&<button className="course-button dark" disabled={saving} onClick={()=>changeEnrollment(true)}>{saving?'Saving…':'Enroll now'}</button>}
   {user&&enrolled!==false&&<button className="course-button" disabled={saving} onClick={()=>changeEnrollment(false)}>Leave course</button>}
  </>}
  <Link className="course-button" to={`/workspace/${courseId}`}>Open learning workspace</Link>
  <Link className="course-button" to={`/room/${courseId}`}>Join live classroom</Link>
 </section>}
 <section className="detail-hero"><div><span className="course-tag">{course.category?.name || 'Course'}</span><h1>{course.title}</h1><p>{course.description}</p><div className="detail-meta"><span>{lessonCount(course)} lessons</span><span>{course.chapters?.length || 0} chapters</span><span>Instructor: <strong>{course.instructor?.full_name || 'Not provided'}</strong></span></div></div><CourseArt course={course}/></section>
 <div className="detail-grid"><section className="course-panel"><div className="section-heading"><h2>Course curriculum</h2><span>{lessonCount(course)} lessons</span></div>{course.chapters?.length?course.chapters.map((chapter,i)=><details className="curriculum-detail" key={chapter.id} open><summary><span className="chapter-number">{String(i+1).padStart(2,'0')}</span><strong>{chapter.title}</strong><span>{chapter.lessons?.length || 0} lessons</span></summary><ol>{chapter.lessons?.map(lesson=><li key={lesson.id}><span aria-hidden="true">{(lesson.type || lesson.materials?.[0]?.type)==='text'?'▤':'▷'}</span><span>{lesson.title}</span><small>{(lesson.type || lesson.materials?.[0]?.type)==='text'?'Text':'Video'}</small></li>)}</ol></details>):<p>The curriculum is being updated.</p>}</section>
 <aside><section className="course-panel"><h2>Before you start</h2><h3>Prerequisites</h3><p>{course.prerequisites || 'No prerequisites have been specified.'}</p></section><section className="course-panel instructor-info"><span className="course-eyebrow">YOUR INSTRUCTOR</span><h2>{course.instructor?.full_name || 'Instructor'}</h2><p>{course.instructor?.bio || 'Instructor information is being updated.'}</p></section></aside></div>
 </> }</CourseLayout>;
}
