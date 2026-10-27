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
 const search = params.get('search') || ''; const category = params.get('category') || ''; const page = Math.max(1, Number(params.get('page')) || 1);
 const [query, setQuery] = useState(search); const [courses, setCourses] = useState([]); const [categories, setCategories] = useState([]);
 const [meta, setMeta] = useState({total:0,totalPages:0}); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
 const update = changes => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([k,v]) => v ? next.set(k,v) : next.delete(k)); setParams(next); };
 useEffect(()=>setQuery(search),[search]);
 useEffect(()=>setCategories([]),[demo]);
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
      data=response.data.data || []; pagination=response.data.meta || {total:data.length,totalPages:1};
      if(!controller.signal.aborted) setCategories(previous=>[...new Map([...previous,...data.map(c=>c.category).filter(Boolean)].map(c=>[c.id,c])).values()]);
    }
    if(!controller.signal.aborted) {setCourses(data);setMeta(pagination);}
   } catch(err) {
    if(!controller.signal.aborted) {
      setError('Chưa kết nối được máy chủ. Đang hiển thị khóa học mẫu.');
      setOfflineDemo(true);
    }
   }
   finally {if(!controller.signal.aborted) setLoading(false);}
  };load(); return()=>controller.abort();
 },[showDemo,search,category,page]);
 return <CourseLayout>
  <section className="catalog-hero"><div><span className="course-eyebrow">KHÔNG NGỪNG KHÁM PHÁ</span><h1>Kiến thức mới.<br/><span>Khả năng mới.</span></h1><p>Tìm khóa học phù hợp, xây dựng kỹ năng thực tế<br className="desktop-break"/> và bắt đầu hành trình của riêng bạn.</p><a className="course-button dark" href="#course-results">Khám phá khóa học <span>↓</span></a></div><div className="hero-visual" aria-hidden="true"><span className="hero-ring"/><div className="hero-code">&lt;/&gt;</div><span className="hero-note">Học để tạo nên<br/><strong>điều khác biệt.</strong></span><span className="hero-star">✳</span></div></section>
  <section id="course-results" className="catalog-results"><div className="section-heading"><div><span className="course-eyebrow">DÀNH CHO BẠN</span><h2>Khám phá khóa học</h2></div><div className="catalog-tools">{offlineDemo && !demo && <button className="course-button" onClick={()=>{setOfflineDemo(false);setError('');}}>Thử kết nối lại ↻</button>}<button className="course-text-button" onClick={()=>{setOfflineDemo(false);update({demo:demo?'':'1',page:'',category:'',search:''});}}>{demo?'Trở về dữ liệu API':offlineDemo?'':'Xem dữ liệu mẫu ↗'}</button></div></div>
  {showDemo && <p className="course-banner" role="status">{offlineDemo && !demo ? `${error} Đây là dữ liệu minh họa, không phải khóa học đã xuất bản.` : 'Bạn đang xem dữ liệu mẫu để kiểm tra giao diện, không phải khóa học đã xuất bản.'}</p>}
  <form className="catalog-toolbar" onSubmit={e=>{e.preventDefault();update({search:query.trim(),page:''});}}><div className="course-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm khóa học" placeholder="Tìm kiếm khóa học…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="course-button dark" type="submit">Tìm kiếm</button></div><select aria-label="Lọc danh mục" value={category} onChange={e=>update({category:e.target.value,page:''})}><option value="">Tất cả danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></form>
  {loading?<LoadingCards/>:error && !showDemo?<div className="course-empty" role="alert"><h3>Chưa thể kết nối</h3><p>{error}</p><button className="course-button dark" onClick={()=>setOfflineDemo(true)}>Xem khóa học mẫu</button></div>:<>
   <p className="course-result-count">{meta.total} khóa học{search && <> cho “{search}”</>}</p>
   {courses.length ? <div className="course-grid">{courses.map(c=><article className="course-card" key={c.id}><Link tabIndex={-1} aria-hidden="true" to={`/courses/${c.id}${showDemo?'?demo=1':''}`}><CourseArt course={c}/></Link><div className="course-card-body"><span className="course-tag">{c.category?.name || 'Khóa học'}</span><h3><Link to={`/courses/${c.id}${showDemo?'?demo=1':''}`}>{c.title}</Link></h3><p>{c.description}</p><div className="course-teacher"><span className="teacher-avatar">{(c.instructor?.full_name || 'GV').split(' ').slice(-1)[0][0]}</span>{c.instructor?.full_name || 'Chưa có giảng viên'}</div><div className="course-card-bottom"><span>{c.chapters ? `${lessonCount(c)} bài học` : 'Khám phá đề cương'}</span><Link to={`/courses/${c.id}${showDemo?'?demo=1':''}`}>Xem khóa học ↗</Link></div></div></article>)}</div>:<div className="course-empty"><h3>Chưa tìm thấy khóa học</h3><p>Thử từ khóa khác hoặc chọn tất cả danh mục.</p><button className="course-button" onClick={()=>update({search:'',category:'',page:''})}>Xóa bộ lọc</button></div>}
   <nav className="course-pagination" aria-label="Phân trang khóa học"><span>Trang {page} / {Math.max(1,meta.totalPages)}</span><div><button disabled={page<=1} onClick={()=>update({page:String(page-1)})}>← Trước</button>{Array.from({length:Math.min(5,meta.totalPages)},(_,i)=>Math.max(1,Math.min(page-2,meta.totalPages-4))+i).map(n=><button key={n} aria-current={n===page?'page':undefined} onClick={()=>update({page:String(n)})}>{n}</button>)}<button disabled={page>=meta.totalPages} onClick={()=>update({page:String(page+1)})}>Tiếp →</button></div></nav>
  </>}
 </section></CourseLayout>;
}
