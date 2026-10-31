import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CourseLayout, {LoadingCards} from './CourseLayout';
import api from '../../services/api';
import { lessonCount, demoCourses } from './courseData';
const emptyCourse = { title:'', description:'', prerequisites:'', category:'' };
const emptyLesson = { title:'', type:'video', minutes:10, url:'', content:'' };
function Dialog({ title, onClose, children }) {
 const ref=useRef(null);
 useEffect(()=>{const node=ref.current;node.showModal();return()=>node.close();},[]);
 return <dialog ref={ref} className="course-dialog" aria-labelledby="dialog-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><header><h2 id="dialog-title">{title}</h2><button className="dialog-close" onClick={onClose} aria-label="Close">×</button></header>{children}</dialog>;
}
export default function InstructorDashboardPage() {
 const auth=useAuth();const [params]=useSearchParams();
 const demo=import.meta.env.DEV && params.get('demo')==='1';
 const user=demo?{id:'instructor-demo',role:'instructor',full_name:'Demo Instructor'}:auth.user;
 const authLoading=demo?false:auth.loading; const [courses,setCourses]=useState([]); const [selected,setSelected]=useState(null); const [chapterId,setChapterId]=useState(null);
 const [search,setSearch]=useState('');const [filter,setFilter]=useState('all');const [modal,setModal]=useState(null);const [form,setForm]=useState(emptyCourse);
 const [lesson,setLesson]=useState(emptyLesson);const [chapterTitle,setChapterTitle]=useState('');const [error,setError]=useState('');const [storageError,setStorageError]=useState('');
 const active=courses.find(c=>c.id===selected);const chapter=active?.chapters.find(c=>c.id===chapterId);
 const [categories,setCategories]=useState([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [offline,setOffline]=useState(false);
 const cacheKey=`lms-issue7-drafts-${user?.id || 'guest'}`;
 useEffect(()=>{
  let active=true;setCourses([]);setSelected(null);setLoading(true);setStorageError('');setOffline(false);
  if(demo){
   const sample=JSON.parse(JSON.stringify(demoCourses.slice(0,1))).map(c=>({...c,id:'instructor-demo-course',instructor_id:'instructor-demo',is_published:false}));
   let saved=sample;try{const raw=localStorage.getItem(cacheKey);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))saved=parsed;}}catch{}
   setCategories([...new Map(demoCourses.map(c=>[c.category.id,c.category])).values()]);setCourses(saved);setOffline(true);setLoading(false);return;
  }
  if(!user || !['instructor','admin'].includes(user.role)){setLoading(false);return;}
  (async()=>{try{
   const cats=await api.get('/categories'); let all=[];let page=1;let pages=1;
   do{const res=await api.get('/courses',{params:{includeUnpublished:true,limit:50,page}});all.push(...res.data.data);pages=res.data.pagination.totalPages;page++;}while(page<=pages);
   const owned=all.filter(c=>user.role==='admin'||c.instructor_id===user.id);
   const details=await Promise.all(owned.map(c=>api.get(`/courses/${c.id}`).then(r=>r.data.data)));
   if(active){setCategories(cats.data.data);setCourses(details.map(c=>({...c,chapters:c.chapters.map(ch=>({...ch,lessons:ch.lessons.map(l=>({...l,type:l.materials[0]?.type||'video',url:l.materials[0]?.url||'',content:l.materials[0]?.content||'',minutes:Math.max(1,Math.ceil((l.materials[0]?.duration_seconds||60)/60))}))}))})));}
  }catch(err){if(active){setStorageError(err.response?.data?.message || 'Server unavailable. Offline drafts are stored only in this browser.');
   if(!err.response){setOffline(true);try{setCourses(JSON.parse(localStorage.getItem(cacheKey)||'[]'));}catch{setCourses([]);}}
  }}finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[user?.id,user?.role,demo]);
 useEffect(()=>{if(!offline||!user)return;try{localStorage.setItem(cacheKey,JSON.stringify(courses));}catch{setStorageError('Unable to save offline drafts.');}},[courses,offline,cacheKey]);
 const perform=async action=>{if(busy)return;setBusy(true);setError('');try{await action();}catch(err){setError(err.response?.data?.message || err.message || 'Unable to save. Please try again.');}finally{setBusy(false);}};
 const patch = changes=>setCourses(list=>list.map(c=>c.id===selected?{...c,...changes}:c));
 const open=kind=>{setError('');setModal(kind);};
 const newCourse=()=>{setForm({...emptyCourse,category:categories[0]?.id || ''});open({kind:'course'});};
 const saveCourse=e=>{e.preventDefault();if(!form.title.trim()||!form.description.trim()){setError('Enter a course title and description.');return;}
 perform(async()=>{
  const payload={title:form.title.trim(),description:form.description,prerequisites:form.prerequisites,category_id:form.category || null,is_published:false};
  const category=categories.find(c=>c.id===form.category)||{id:'',name:'Uncategorized'};
  if(modal.id){const result=offline?{}:(await api.put(`/courses/${modal.id}`,{title:payload.title,description:payload.description,prerequisites:payload.prerequisites,category_id:payload.category_id})).data.data;setCourses(list=>list.map(c=>c.id===modal.id?{...c,...result,...form,category}:c));}
  else{const result=offline?{id:crypto.randomUUID()}:(await api.post('/courses',payload)).data.data;
   const record={...payload,...result,category,instructor:{full_name:user.full_name||user.fullName},chapters:[]};setCourses(list=>[...list,record]);setSelected(record.id);setChapterId(null);}
  setModal(null);
 });};
 const addChapter=e=>{e.preventDefault();if(!chapterTitle.trim())return;perform(async()=>{
  const record=offline?{id:crypto.randomUUID(),title:chapterTitle.trim()}:(await api.post(`/courses/${selected}/chapters`,{title:chapterTitle.trim()})).data.data;
  patch({chapters:[...active.chapters,{...record,lessons:[]}]});setChapterId(record.id);setChapterTitle('');
 });};
 const saveLesson=e=>{e.preventDefault();
  if(!lesson.title.trim()){setError('Enter a lesson title.');return;}
  if(!Number.isFinite(Number(lesson.minutes))||Number(lesson.minutes)<1){setError('Duration must be greater than zero minutes.');return;}
  if(lesson.type==='video'){try{if(!['http:','https:'].includes(new URL(lesson.url).protocol))throw Error();}catch{setError('Enter a valid video URL.');return;}}
  if(lesson.type==='text'&&!lesson.content.trim()){setError('Enter the lesson text.');return;}
  perform(async()=>{
   let record;
   if(offline){record={...lesson,id:lesson.id||crypto.randomUUID(),minutes:Number(lesson.minutes)};}
   else {
    record=lesson.id?{id:lesson.id,title:lesson.title}:(await api.post(`/chapters/${chapterId}/lessons`,{title:lesson.title.trim()})).data.data;
    if(!lesson.id){setLesson(l=>({...l,id:record.id}));patch({chapters:active.chapters.map(c=>c.id!==chapterId?c:{...c,lessons:[...c.lessons,{...record,materials:[]}]})});}
    const material=(await api.post(`/lessons/${record.id}/materials`,{type:lesson.type,title:lesson.title,url:lesson.type==='video'?lesson.url:null,content:lesson.type==='text'?lesson.content:null,duration_seconds:Number(lesson.minutes)*60})).data.data;
    record={...record,...lesson,id:record.id,materials:[material]};
   }
   setCourses(list=>list.map(c=>c.id!==selected?c:{...c,chapters:c.chapters.map(ch=>ch.id!==chapterId?ch:{...ch,lessons:ch.lessons.some(l=>l.id===record.id)?ch.lessons.map(l=>l.id===record.id?record:l):[...ch.lessons,record]})}));setModal(null);
  });
 };
 const changePublished=()=>perform(async()=>{const c=modal.course;if(!offline)await api.put(`/courses/${c.id}`,{is_published:!c.is_published});setCourses(list=>list.map(item=>item.id===c.id?{...item,is_published:!item.is_published}:item));setModal(null);});
 const deleteCourse=c=>{if(!window.confirm(`Delete ${c.title}?`))return;perform(async()=>{if(!offline)await api.delete(`/courses/${c.id}`);setCourses(list=>list.filter(item=>item.id!==c.id));if(selected===c.id)setSelected(null);});};
 const visible=courses.filter(c=>c.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))&&(filter==='all'||(filter==='published'?c.is_published:!c.is_published)));
 const publish=c=>{if(!c.is_published&&(!c.chapters.length||c.chapters.some(ch=>!ch.lessons.length))){setError('Add at least one chapter and one lesson per chapter before publishing.');setModal({kind:'invalid'});return;}open({kind:'publish',course:c});};
 if(loading||authLoading)return <CourseLayout><LoadingCards/></CourseLayout>;
 if(!user)return <CourseLayout><p>Please <Link to="/login">sign in</Link> to manage courses.</p></CourseLayout>;
 if(!['instructor','admin'].includes(user.role))return <CourseLayout><p role="alert">Instructor access is required.</p></CourseLayout>;
 return <CourseLayout><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="section-heading dashboard-heading"><div><span className="course-eyebrow">INSTRUCTOR DASHBOARD</span><h1>Create and share<br/><span>your own courses.</span></h1><p>Turn your ideas into a meaningful learning experience.</p></div><button className="course-button dark" onClick={newCourse}>＋ Create course</button></div>
 <p className="course-banner">{demo?'Instructor demo: no sign-in required. Changes stay in this browser and do not update the server.':offline?'Offline drafts: changes are saved in this browser only.':'Changes are saved to the course server.'}</p>
 {busy&&<p role="status">Saving…</p>}{error&&!modal&&<p role="alert" className="course-error">{error}</p>}{storageError&&<p role="alert" className="course-error">{storageError}</p>}
 <div className="dashboard-stats"><div><span>Total courses</span><strong>{courses.length.toString().padStart(2,'0')}</strong></div><div><span>Drafts</span><strong>{courses.filter(c=>!c.is_published).length.toString().padStart(2,'0')}</strong></div><div><span>Lessons created</span><strong>{courses.reduce((s,c)=>s+lessonCount(c),0).toString().padStart(2,'0')}</strong></div></div>
 <div className="catalog-toolbar"><div className="course-search"><span aria-hidden="true">⌕</span><input aria-label="Search my courses" placeholder="Search your courses…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option></select></div>
 <div className="instructor-course-list">{visible.length?visible.map(c=><article className={`instructor-course ${selected===c.id?'selected':''}`} key={c.id}><div className="instructor-course-title"><span className="course-book" aria-hidden="true">▤</span><div><span className="course-tag">{c.category?.name}</span><h2>{c.title}</h2><p>{c.chapters.length} chapters · {lessonCount(c)} lessons</p></div></div><div className="instructor-actions"><button role="switch" aria-checked={c.is_published} aria-label={`Publish ${c.title}`} className="course-switch" onClick={()=>publish(c)}><span/>{c.is_published?'Published':'Hidden / Draft'}</button><div><Link className="course-button" to={`/courses/${c.id}${demo?'?draft=1&instructorDemo=1':offline?'?draft=1':''}`}>Preview</Link><button className="course-button dark" onClick={()=>{setSelected(c.id);setChapterId(c.chapters[0]?.id||null);}}>Edit curriculum ↗</button><button className="course-text-button" onClick={()=>{setForm({title:c.title,description:c.description,prerequisites:c.prerequisites,category:c.category?.id||''});open({kind:'course',id:c.id});}}>Edit details</button><button className="course-button" disabled={busy} onClick={()=>deleteCourse(c)}>Delete</button></div></div></article>):<div className="course-empty"><span className="empty-icon" aria-hidden="true">＋</span><h2>{courses.length?'No courses found':'Create your first course'}</h2><p>{courses.length?'Try another search or filter.':'Create a course, add chapters, and build your lessons.'}</p><button className="course-button dark" onClick={newCourse}>Create course</button></div>}</div>
 {active&&<section className="curriculum-builder"><div className="section-heading"><div><span className="course-eyebrow">EDIT CURRICULUM</span><h2>{active.title}</h2></div><button className="course-text-button" onClick={()=>setSelected(null)}>Close editor ×</button></div><div className="builder-grid"><aside className="course-panel"><h3>Chapters</h3><form className="chapter-form" onSubmit={addChapter}><label htmlFor="chapter-title">New chapter title</label><input id="chapter-title" required value={chapterTitle} onChange={e=>setChapterTitle(e.target.value)} placeholder="For example: Getting started with React"/><button className="course-button" disabled={busy||!chapterTitle.trim()}>＋ Add chapter</button></form><div className="chapter-list">{active.chapters.map((c,i)=><button key={c.id} className={chapterId===c.id?'active':''} onClick={()=>setChapterId(c.id)}><span>{String(i+1).padStart(2,'0')}</span><strong>{c.title}</strong><small>{c.lessons.length} lessons</small></button>)}</div></aside><section className="course-panel"><div className="section-heading"><h3>{chapter?.title || 'Chapter lessons'}</h3>{chapter&&<button className="course-button dark" onClick={()=>{setLesson({...emptyLesson});open({kind:'lesson'});}}>＋ Add lesson</button>}</div>{!chapter?<div className="course-empty"><p>Add or select a chapter to start editing lessons.</p></div>:chapter.lessons.length?chapter.lessons.map((l,i)=><article className="lesson-row" key={l.id}><div><span className="course-tag">{l.type==='video'?'▷ Video':'▤ Text'} · {l.minutes} minutes</span><h4>{i+1}. {l.title}</h4></div><button className="course-button" disabled={!offline && !!l.materials?.length} title="Editing existing learning materials requires an update API" onClick={()=>{setLesson({...emptyLesson,...l});open({kind:'lesson'});}}>Edit</button></article>):<div className="course-empty"><p>This chapter has no lessons yet. Add your first lesson.</p></div>}</section></div></section>}
 {modal&&<Dialog title={modal.kind==='course'?(modal.id?'Edit course':'Create course'):modal.kind==='lesson'?(lesson.id?'Edit lesson':'Add lesson'):modal.kind==='invalid'?'Cannot publish yet':'Confirm status'} onClose={()=>{if(!busy)setModal(null);}}>
 {error&&<p role="alert" className="course-error">{error}</p>}
 {modal.kind==='course'&&<form aria-busy={busy} className="course-editor-form" onSubmit={saveCourse} noValidate><p>Enter the basic details, then build your curriculum.</p>{[['title','Course title'],['description','Course description'],['prerequisites','Prerequisites']].map(([name,label])=><label key={name}>{label}{name==='title'?<input value={form[name]} maxLength={255} onChange={e=>setForm({...form,[name]:e.target.value})} placeholder="For example: React for beginners"/>:<textarea value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} rows={3}/>}</label>)}<label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="dialog-actions"><button type="button" className="course-button" onClick={()=>setModal(null)}>Cancel</button><button disabled={busy} className="course-button dark">Save and continue →</button></div></form>}
 {modal.kind==='lesson'&&<form aria-busy={busy} className="course-editor-form" onSubmit={saveLesson} noValidate><label>Lesson title<input value={lesson.title} maxLength={255} onChange={e=>setLesson({...lesson,title:e.target.value})}/></label><fieldset className="lesson-type"><legend>Material type</legend>{[['video','▷ Video','Video lesson'],['text','▤ Text','Notes and instructions']].map(([type,title,help])=><label key={type} className={lesson.type===type?'checked':''}><input type="radio" name="material-type" value={type} checked={lesson.type===type} onChange={()=>setLesson({...lesson,type})}/><span><strong>{title}</strong><small>{help}</small></span></label>)}</fieldset><label>Duration (minutes)<input type="number" min="1" value={lesson.minutes} onChange={e=>setLesson({...lesson,minutes:e.target.value})}/></label>{lesson.type==='video'?<label>Video URL<input type="url" value={lesson.url} placeholder="https://www.youtube.com/…" onChange={e=>setLesson({...lesson,url:e.target.value})}/></label>:<label>Lesson text<textarea rows={7} value={lesson.content} placeholder="Write the lesson content or Markdown…" onChange={e=>setLesson({...lesson,content:e.target.value})}/></label>}<div className="dialog-actions"><button type="button" className="course-button" onClick={()=>setModal(null)}>Cancel</button><button disabled={busy} className="course-button dark">Save lesson</button></div></form>}
 {modal.kind==='publish'&&<><p>Would you like to {modal.course.is_published?'hide':'publish'} courses <strong>{modal.course.title}</strong>?</p><p>{offline?'This changes an offline draft only.':'This updates the course visibility on the server.'}</p><div className="dialog-actions"><button className="course-button" onClick={()=>setModal(null)}>Cancel</button><button className="course-button dark" disabled={busy} onClick={changePublished}>Confirm</button></div></>}
 {modal.kind==='invalid'&&<button className="course-button" onClick={()=>setModal(null)}>Got it</button>}
 </Dialog>}
 </fieldset></CourseLayout>;
}
