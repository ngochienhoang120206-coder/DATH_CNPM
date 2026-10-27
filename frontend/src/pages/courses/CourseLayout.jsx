import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './courses.css';
export default function CourseLayout({ children }) {
  const { user } = useAuth();
  return <div className="courses-app"><header className="course-nav"><div className="course-container nav-inner">
    <Link className="course-brand" to="/"><span className="brand-symbol">L</span>learn<span className="brand-dot">.</span></Link>
    <nav aria-label="Điều hướng chính"><NavLink to="/" end>Khám phá</NavLink><NavLink to="/instructor">Góc giảng viên</NavLink></nav>
    <Link className="course-nav-account" to={user ? '/profile' : '/login'}>{user ? user.fullName || user.full_name || 'Hồ sơ' : 'Đăng nhập'} <span aria-hidden="true">↗</span></Link>
  </div></header><main className="course-container course-main">{children}</main><footer className="course-site-footer course-container"><Link className="course-brand" to="/">learn.</Link><span>Học điều mới. Tạo điều hay.</span></footer></div>;
}
export function CourseArt({ course }) {
 return <div className={`course-art ${course.color || 'sky'}`}>{course.thumbnail_url ? <img src={course.thumbnail_url} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} /> : null}<span className="art-orbit" aria-hidden="true" /><span className="art-label">{course.art || 'LEARN'}</span><span className="art-caption">LEARN SOMETHING NEW ↗</span></div>;
}
export function LoadingCards() { return <div role="status" aria-label="Đang tải khóa học" className="course-grid">{[1,2,3,4,5,6].map(n => <div className="course-skeleton" key={n}><div /><p /><p /><p /></div>)}</div>; }
