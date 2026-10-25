import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const copy = {
  login: ['Đăng nhập', 'Vui lòng nhập thông tin của bạn để tiếp tục', 'Đăng nhập'],
  register: ['Đăng ký', 'Tạo tài khoản để bắt đầu sử dụng', 'Đăng ký'],
  forgot: ['Quên mật khẩu?', 'Nhập email để nhận liên kết khôi phục mật khẩu', 'Gửi liên kết khôi phục'],
  reset: ['Đặt lại mật khẩu', 'Chọn mật khẩu mới để bảo vệ tài khoản của bạn', 'Đặt lại mật khẩu'],
  profile: ['Hồ sơ cá nhân', 'Quản lý thông tin và bảo mật tài khoản của bạn', 'Lưu thay đổi'],
};

export default function AuthScreens({ mode = 'login' }) {
  const { user, loading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirmPassword: '', avatarUrl: '', bio: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordChange, setPasswordChange] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(''); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);
  const selectAvatar = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage('');
    let problem = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) problem = 'Vui lòng chọn ảnh JPG, PNG hoặc WebP.';
    else if (file.size > 5 * 1024 * 1024) problem = 'Ảnh không được lớn hơn 5 MB.';
    setErrors(v => ({ ...v, avatar: problem }));
    if (problem) { e.target.value = ''; return; }
    setAvatarFile(file);
  };
  useEffect(() => {
    if (mode === 'profile') setValues(v => ({ ...v, fullName: user?.fullName || '', avatarUrl: user?.avatarUrl || '', bio: user?.bio || '' }));
  }, [mode, user]);
  const change = e => {
    setValues(v => ({ ...v, [e.target.name]: e.target.value }));
    setErrors(v => ({ ...v, [e.target.name]: '' }));
    setError(''); setMessage('');
  };
  const field = (name, label, placeholder, type = 'text', autoComplete) => <div className="auth-field" key={name}>
    <div className="auth-label"><label htmlFor={name}>{label}</label>{name === 'password' && mode === 'login' && <Link to="/forgot-password">Quên mật khẩu?</Link>}</div>
    {name === 'bio' ? <textarea id={name} name={name} value={values[name]} onChange={change} placeholder={placeholder} maxLength={2000} /> :
      <input id={name} name={name} type={type} autoComplete={autoComplete} value={values[name]} onChange={change} placeholder={placeholder} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />}
    {errors[name] && <span className="auth-field-error" id={`${name}-error`}>{errors[name]}</span>}
  </div>;
  const submit = async e => {
    e.preventDefault();
    const next = {};
    if (['register', 'profile'].includes(mode) && !values.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.';
    if (['login', 'register', 'forgot'].includes(mode) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (['login', 'register', 'reset'].includes(mode) && values.password.length < 7) next.password = 'Mật khẩu phải có ít nhất 7 ký tự.';
    if (['register', 'reset'].includes(mode) && (!values.confirmPassword || values.password !== values.confirmPassword)) next.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    if (mode === 'register' && !agreed) next.agreed = 'Bạn cần đồng ý để tiếp tục.';
    if (mode === 'profile' && errors.avatar) next.avatar = errors.avatar;
    setErrors(next); setError(''); setMessage('');
    if (Object.keys(next).length) return;
    if (mode !== 'login') {
      const pending = { register: 'Tài khoản chưa được tạo.', forgot: 'Email khôi phục chưa được gửi.', reset: 'Mật khẩu chưa được thay đổi.', profile: 'Thông tin chưa được lưu.' };
      setMessage(`Thông tin hợp lệ. ${pending[mode]} API sẽ được kết nối ở giai đoạn 2.`);
      return;
    }
    setBusy(true);
    try { await login(values.email.trim(), values.password); navigate('/', { replace: true }); }
    catch (err) {
      const text = err.response?.data?.message;
      setError(text === 'Invalid email or password' ? 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin đăng nhập.' : text || 'Không thể kết nối máy chủ. Vui lòng thử lại sau.');
    } finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true); setError('');
    try { await logout(); navigate('/login', { replace: true }); }
    catch (err) { setError(err.response?.data?.message || 'Không thể đăng xuất. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  const [title, subtitle, button] = copy[mode];
  return <main className="auth-page"><section className={`auth-card ${mode === 'profile' ? 'auth-profile-card' : ''}`} aria-labelledby="auth-title">
    <header className="auth-header"><h1 id="auth-title">{title}</h1><p>{subtitle}</p></header>
    {error && <p className="auth-notice auth-error" role="alert">{error}</p>}
    {message && <p className="auth-notice" role="status">{message}</p>}
    {mode === 'profile' && loading ? <p role="status">Đang tải hồ sơ…</p> : <>
      <div className={mode === 'profile' ? 'auth-profile-grid' : undefined}>
      <form className="auth-form" noValidate onSubmit={submit}>
        {mode === 'profile' && <div className="auth-avatar-panel">
          {avatarPreview || values.avatarUrl ? <img className="auth-avatar-preview" src={avatarPreview || values.avatarUrl} alt="Ảnh đại diện" /> : <span className="auth-avatar-placeholder" aria-hidden="true">{values.fullName.trim().split(/\s+/).map(n => n[0]).slice(-2).join('').toUpperCase() || 'ND'}</span>}
          <label className="auth-upload-button" htmlFor="avatar">Chọn ảnh</label>
        </div>}
        {['register', 'profile'].includes(mode) && field('fullName', 'Họ và tên', 'Nhập họ và tên của bạn', 'text', 'name')}
        {['login', 'register', 'forgot'].includes(mode) && field('email', 'Địa chỉ email', 'Nhập email của bạn', 'email', 'email')}
        {['login', 'register', 'reset'].includes(mode) && field('password', mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu', 'Nhập mật khẩu của bạn', 'password', mode === 'login' ? 'current-password' : 'new-password')}
        {['register', 'reset'].includes(mode) && field('confirmPassword', 'Xác nhận mật khẩu', 'Nhập lại mật khẩu', 'password', 'new-password')}
        {mode === 'register' && <div><label className="auth-checkbox"><input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(v => ({ ...v, agreed: '' })); setMessage(''); }} aria-invalid={!!errors.agreed} aria-describedby={errors.agreed ? 'agreed-error' : undefined} />Tôi đồng ý với Điều khoản và Chính sách bảo mật</label>{errors.agreed && <span id="agreed-error" className="auth-field-error">{errors.agreed}</span>}</div>}
        {mode === 'profile' && <>
          <div className="auth-field">
            <input className="auth-file-hidden" id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} aria-invalid={!!errors.avatar} aria-describedby={errors.avatar ? 'avatar-help avatar-error' : 'avatar-help'} />
            <span id="avatar-help" className="auth-file-hidden">Chọn ảnh JPG, PNG hoặc WebP từ máy, tối đa 5 MB.</span>
            {avatarFile && <p className="auth-upload-help">Đã chọn: {avatarFile.name}</p>}
            {errors.avatar && <span className="auth-field-error" id="avatar-error" role="alert">{errors.avatar}</span>}
          </div>
          <div className="auth-field"><div className="auth-label"><label htmlFor="profile-email">Địa chỉ email</label></div><input id="profile-email" type="email" readOnly value={user?.email || ''} placeholder="Email tài khoản" /></div>
          {field('bio', 'Giới thiệu', 'Chia sẻ đôi điều về bạn')}
          <div><span className="auth-label">Vai trò</span><span>{({ student: 'Học viên', instructor: 'Giảng viên', admin: 'Quản trị viên' })[user?.role] || 'Chưa có thông tin'}</span></div>
        </>}
        <button className="auth-primary" disabled={busy}>{busy ? 'Đang xử lý…' : button}</button>
        {mode === 'profile' && user && <button type="button" className="auth-secondary" onClick={signOut} disabled={busy}>Đăng xuất</button>}
      </form>
      {mode === 'profile' && <form className="auth-password-panel auth-form" noValidate onSubmit={e => {
        e.preventDefault(); setPasswordError(''); setPasswordNotice('');
        if (!passwordChange.current) { setPasswordError('Vui lòng nhập mật khẩu hiện tại.'); return; }
        if (passwordChange.next.length < 7) { setPasswordError('Mật khẩu mới phải có ít nhất 7 ký tự.'); return; }
        if (passwordChange.next !== passwordChange.confirm) { setPasswordError('Mật khẩu xác nhận không khớp.'); return; }
        setPasswordNotice('Thông tin hợp lệ. Mật khẩu chưa được thay đổi; chức năng sẽ được kết nối ở giai đoạn 2.');
      }}>
        <header><h2>Đổi mật khẩu</h2><p>Thay đổi mật khẩu nếu cần để tăng cường bảo mật</p></header>
        {passwordError && <p className="auth-notice auth-error" role="alert">{passwordError}</p>}
        {passwordNotice && <p className="auth-notice" role="status">{passwordNotice}</p>}
        {[['current', 'Mật khẩu hiện tại'], ['next', 'Mật khẩu mới'], ['confirm', 'Xác nhận mật khẩu']].map(([name, label]) => <div className="auth-field" key={name}>
          <div className="auth-label"><label htmlFor={`change-${name}`}>{label}</label></div>
          <input id={`change-${name}`} type="password" autoComplete={name === 'current' ? 'current-password' : 'new-password'} value={passwordChange[name]} placeholder={label} onChange={e => { setPasswordChange(v => ({ ...v, [name]: e.target.value })); setPasswordError(''); setPasswordNotice(''); }} />
        </div>)}
        <button className="auth-primary">Đổi mật khẩu</button>
      </form>}
      </div>
      <p className="auth-footer">{mode === 'login' ? <>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></> : mode === 'register' ? <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></> : <Link to={mode === 'profile' ? '/' : '/login'}>{mode === 'profile' ? 'Về trang khóa học' : 'Quay lại đăng nhập'}</Link>}</p>
    </>}
  </section></main>;
}
