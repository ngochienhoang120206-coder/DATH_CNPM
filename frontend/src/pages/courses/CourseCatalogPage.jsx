import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import CourseLayout, { CourseArt, LoadingCards } from './CourseLayout';
import { demoCourses, lessonCount } from './courseData';

export default function CourseCatalogPage() {
 const [params, setParams] = useSearchParams();
 const demo = params.get('demo') === '1';
 const [offlineDemo, setOfflineDemo] = useState(false);
 const showDemo = demo || offlineDemo;
 const [categoryError,setCategoryError]=useState('');
 const search = params.get('search') || ''; const category = params.get('category') || ''; const page = Math.max(1, Number(params.get('page')) || 1);
 const [query, setQuery] = useState(search); const [courses, setCourses] = useState([]); const [categories, setCategories] = useState([]);
 const [meta, setMeta] = useState({total:0,totalPages:0}); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
 const update = changes => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([k,v]) => v ? next.set(k,v) : next.delete(k)); setParams(next); };
 useEffect(()=>setQuery(search),[search]);
 useEffect(()=>setCategories([]),[demo]);
 useEffect(()=>{
  if(showDemo) return;
  const controller=new AbortController();setCategoryError('');
  api.get('/categories',{signal:controller.signal}).then(response=>{
   if(!controller.signal.aborted) setCategories(response.data.data || []);
  }).catch(()=>{if(!controller.signal.aborted)setCategoryError('Categories are unavailable. Please try again when the category API is ready.');});
  return()=>controller.abort();
 },[showDemo]);
 useEffect(()=>{
  const controller = new AbortController(); setLoading(true); setError('');
  const load = async () => {
   try {
    let data, pagination;
    if(showDemo) {
      await new Promise(resolve=>setTimeout(resolve,250));
      const filtered = demoCourses.filter(c => (!category || c.category.id===category) && `${c.title} ${c.instructor.full_name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
      data=filtered.slice((page-1)*6,page*6); pagination={total:filtered.length,totalPages:Math.ceil(filtered.length/6)};
      if(!controller.signal.aborted) setCategories([...new Map(demoCourses.map(c=>[c.category.id,c.category])).values()]);
    } else {
      const response = await api.get('/courses',{params:{search,page,limit:6,categoryId:category||undefined},signal:controller.signal});
      data=response.data.data || []; pagination=response.data.pagination || response.data.meta || {total:data.length,totalPages:1};
    }
    if(!controller.signal.aborted) {setCourses(data);setMeta(pagination);}
   } catch(err) {
    if(!controller.signal.aborted) {
      setError('Cannot connect to the server. Showing sample courses.');
      setOfflineDemo(true);
    }
   }
   finally {if(!controller.signal.aborted) setLoading(false);}
  };load(); return()=>controller.abort();
 },[showDemo,search,category,page]);
 return <CourseLayout>
  {!showDemo&&categoryError&&<p className="course-banner" role="status">{categoryError}</p>}
  <section className="catalog-hero"><div><span className="course-eyebrow">KEEP EXPLORING</span><h1>New knowledge.<br/><span>New possibilities.</span></h1><p>Find your next course, build practical skills<br className="desktop-break"/> and start your own learning journey.</p><a className="course-button dark" href="#course-results">Explore courses <span>↓</span></a></div><div className="hero-visual" aria-hidden="true"><span className="hero-ring"/><div className="hero-code">&lt;/&gt;</div><span className="hero-note">Learn to create<br/><strong>something different.</strong></span><span className="hero-star">✳</span></div></section>
  <section id="course-results" className="catalog-results"><div className="section-heading"><div><span className="course-eyebrow">FOR YOU</span><h2>Explore courses</h2></div><div className="catalog-tools">{offlineDemo && !demo && <button className="course-button" onClick={()=>{setOfflineDemo(false);setError('');}}>Retry connection ↻</button>}<button hidden={offlineDemo && !demo} className="course-text-button" onClick={()=>{setOfflineDemo(false);update({demo:demo?'':'1',page:'',category:'',search:''});}}>{demo?'Return to live courses':offlineDemo?'':'View sample courses ↗'}</button></div></div>
  {showDemo && <p className="course-banner" role="status">{offlineDemo && !demo ? 'The server is unavailable. These are sample courses, not published content.' : 'You are viewing sample courses for preview purposes.'}</p>}
  <form className="catalog-toolbar" onSubmit={e=>{e.preventDefault();update({search:query.trim(),page:''});}}><div className="course-search"><span aria-hidden="true">⌕</span><input aria-label="Search courses" placeholder="Search courses…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="course-button dark" type="submit">Search</button></div><select aria-label="Filter by category" value={category} onChange={e=>update({category:e.target.value,page:''})}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></form>
  {loading?<LoadingCards/>:error && !showDemo?<div className="course-empty" role="alert"><h3>Unable to connect</h3><p>{error}</p><button className="course-button dark" onClick={()=>setOfflineDemo(true)}>View sample courses</button></div>:<>
   <p className="course-result-count">{meta.total} courses{search && <> for “{search}”</>}</p>
   {courses.length ? <div className="course-grid">{courses.map(c=><article className="course-card" key={c.id}><Link tabIndex={-1} aria-hidden="true" to={`/courses/${c.id}${showDemo?'?demo=1':''}`}><CourseArt course={c}/></Link><div className="course-card-body"><span className="course-tag">{c.category?.name || 'Course'}</span><h3><Link to={`/courses/${c.id}${showDemo?'?demo=1':''}`}>{c.title}</Link></h3><p>{c.description}</p><div className="course-teacher"><span className="teacher-avatar">{(c.instructor?.full_name || 'GV').split(' ').slice(-1)[0][0]}</span>{c.instructor?.full_name || 'Instructor not provided'}</div><div className="course-card-bottom"><span>{c.chapters ? `${lessonCount(c)} lessons` : 'Explore curriculum'}</span><Link to={`/courses/${c.id}${showDemo?'?demo=1':''}`}>View course ↗</Link></div></div></article>)}</div>:<div className="course-empty"><h3>No courses found</h3><p>Try another search or select all categories.</p><button className="course-button" onClick={()=>update({search:'',category:'',page:''})}>Clear filters</button></div>}
   <nav className="course-pagination" aria-label="Course pagination"><span>Page {page} / {Math.max(1,meta.totalPages)}</span><div><button disabled={page<=1} onClick={()=>update({page:String(page-1)})}>← Previous</button>{Array.from({length:Math.min(5,meta.totalPages)},(_,i)=>Math.max(1,Math.min(page-2,meta.totalPages-4))+i).map(n=><button key={n} aria-current={n===page?'page':undefined} onClick={()=>update({page:String(n)})}>{n}</button>)}<button disabled={page>=meta.totalPages} onClick={()=>update({page:String(page+1)})}>Next →</button></div></nav>
  </>}
 </section></CourseLayout>;
}
