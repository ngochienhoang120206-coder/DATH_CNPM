import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

const MIN_PASSWORD_LENGTH = 8;

const copy = {
  login: ['Sign in', 'Enter your details to continue.', 'Sign in'],
  register: ['Create an account', 'Create an account to start learning.', 'Create account'],
  forgot: ['Forgot password?', 'Enter your email and we will send a recovery link.', 'Send recovery link'],
  reset: ['Reset your password', 'Choose a new password for your account.', 'Reset password'],
  profile: ['Personal profile', 'Manage your personal information and account security.', 'Save changes'],
};

export default function AuthScreens({ mode = 'login' }) {
  const { user, loading, login, register, logout, updateProfile, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [busy,setBusy] = useState(false);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirmPassword: '', avatarUrl: '', bio: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
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

  useEffect(() => {
    if (mode === 'profile') {
      setValues(v => ({ ...v, fullName: user?.fullName || user?.full_name || '', email: user?.email || '', avatarUrl: user?.avatarUrl || user?.avatar_url || '', bio: user?.bio || '' }));
    }
  }, [mode, user]);

  const selectAvatar = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage('');
    let problem = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) problem = 'Choose a JPG, PNG, or WebP image.';
    else if (file.size > 5 * 1024 * 1024) problem = 'The image must be 5 MB or smaller.';
    setErrors(v => ({ ...v, avatar: problem }));
    if (problem) { e.target.value = ''; return; }
    setAvatarFile(file);
  };

  const change = e => {
    setValues(v => ({ ...v, [e.target.name]: e.target.value }));
    setErrors(v => ({ ...v, [e.target.name]: '' }));
    setError('');
    setMessage('');
  };

  const field = (name, label, placeholder, type = 'text', autoComplete) => <div className="auth-field" key={name}>
    <div className="auth-label">
      <label htmlFor={name}>{label}</label>
      {name === 'password' && mode === 'login' && <Link to="/forgot-password">Forgot password?</Link>}
    </div>
    {name === 'bio'
      ? <textarea id={name} name={name} value={values[name]} onChange={change} placeholder={placeholder} maxLength={2000} />
      : <input id={name} name={name} type={type} autoComplete={autoComplete} value={values[name]} onChange={change} placeholder={placeholder} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />}
    {errors[name] && <span className="auth-field-error" id={`${name}-error`}>{errors[name]}</span>}
  </div>;

  const submit = async e => {
    if(busy) { e.preventDefault(); return; }
    e.preventDefault();
    const next = {};
    if (['register', 'profile'].includes(mode) && values.fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (['login', 'register', 'forgot'].includes(mode) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (['register', 'reset'].includes(mode) && values.password.length < MIN_PASSWORD_LENGTH) next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (['register', 'reset'].includes(mode) && (!values.confirmPassword || values.password !== values.confirmPassword)) next.confirmPassword = 'The passwords do not match.';
    if (mode === 'register' && !agreed) next.agreed = 'Accept the terms to continue.';
    if (mode === 'profile' && errors.avatar) next.avatar = errors.avatar;
    if(mode === 'login' && !values.password) next.password = 'Enter your password.';
    setErrors(next);
    setError('');
    setMessage('');
    if (Object.keys(next).length) return;
    if (mode === 'reset' && !resetToken) {
      setError('The password reset link is missing or invalid. Open the link from your recovery email.');
      return;
    }

    setBusy(true);
    try {
      if(mode==='login') { await login(values.email.trim(),values.password); navigate('/',{replace:true}); }
      if(mode==='register') { await register({fullName:values.fullName.trim(),email:values.email.trim(),password:values.password}); navigate('/login',{replace:true}); }
      if(mode==='forgot') { const result=await forgotPassword(values.email.trim()); setMessage(result.message); }
      if(mode==='reset') { await resetPassword(resetToken,values.password); navigate('/login',{replace:true}); }
      if(mode==='profile') {
        if(avatarFile) { setError('Image upload is not supported by the current API. Remove the selected image to save other changes.'); return; }
        await updateProfile({full_name:values.fullName.trim(),bio:values.bio});setMessage('Profile updated successfully.');
      }
    } catch(err) { setError(err.response?.data?.message || 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true);setError('');
    try { await logout(); navigate('/login',{replace:true}); }
    catch(err) { setError(err.response?.data?.message || 'Unable to sign out.'); }
    finally {setBusy(false);}
  };

  if(mode==='profile' && !loading && !user) return <main className="auth-page"><section className="auth-card"><h1>Sign in required</h1><Link to="/login">Sign in to view your profile</Link></section></main>;
  const [title, subtitle, button] = copy[mode];
  return <main className="auth-page"><section className={`auth-card ${mode === 'profile' ? 'auth-profile-card' : ''}`} aria-labelledby="auth-title">
    <header className="auth-header"><h1 id="auth-title">{title}</h1><p>{subtitle}</p></header>
    {error && <p className="auth-notice auth-error" role="alert">{error}</p>}
    {message && <p className="auth-notice" role="status">{message}</p>}
    {mode === 'profile' && loading ? <p role="status">Loading profile…</p> : <>
      <div className={mode === 'profile' ? 'auth-profile-grid' : undefined}>
        <form className="auth-form" noValidate onSubmit={submit}>
          {mode === 'profile' && <div className="auth-avatar-panel">
            {avatarPreview || values.avatarUrl
              ? <img className="auth-avatar-preview" src={avatarPreview || values.avatarUrl} alt="Profile avatar" />
              : <span className="auth-avatar-placeholder" aria-hidden="true">{values.fullName.trim().split(/\s+/).map(n => n[0]).slice(-2).join('').toUpperCase() || 'U'}</span>}
            <label className="auth-upload-button" htmlFor="avatar">Choose image</label>
          </div>}
          {['register', 'profile'].includes(mode) && field('fullName', 'Full name', 'Enter your full name', 'text', 'name')}
          {['login', 'register', 'forgot'].includes(mode) && field('email', 'Email address', 'Enter your email address', 'email', 'email')}
          {['login', 'register', 'reset'].includes(mode) && field('password', mode === 'reset' ? 'New password' : 'Password', 'Enter your password', 'password', mode === 'login' ? 'current-password' : 'new-password')}
          {['register', 'reset'].includes(mode) && field('confirmPassword', 'Confirm password', 'Enter your password again', 'password', 'new-password')}
          {mode === 'register' && <div>
            <label className="auth-checkbox"><input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(v => ({ ...v, agreed: '' })); setMessage(''); }} aria-invalid={!!errors.agreed} aria-describedby={errors.agreed ? 'agreed-error' : undefined} />I agree to the Terms and Privacy Policy</label>
            {errors.agreed && <span id="agreed-error" className="auth-field-error">{errors.agreed}</span>}
          </div>}
          {mode === 'profile' && <>
            <div className="auth-field">
              <input className="auth-file-hidden" id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} aria-invalid={!!errors.avatar} aria-describedby={errors.avatar ? 'avatar-help avatar-error' : 'avatar-help'} />
              <span id="avatar-help" className="auth-file-hidden">Choose a JPG, PNG, or WebP image up to 5 MB.</span>
              {avatarFile && <p className="auth-upload-help">Selected: {avatarFile.name} (preview only) <button type="button" onClick={()=>{setAvatarFile(null);setErrors(v=>({...v,avatar:''}));}}>Remove</button></p>}
              {errors.avatar && <span className="auth-field-error" id="avatar-error" role="alert">{errors.avatar}</span>}
            </div>
            <div className="auth-field"><div className="auth-label"><label htmlFor="profile-email">Email address</label></div><input id="profile-email" type="email" readOnly value={values.email} placeholder="Account email" /></div>
            {field('bio', 'About you', 'Tell us a little about yourself')}
            <div><span className="auth-label">Role</span><span>{({ student: 'Student', instructor: 'Instructor', admin: 'Administrator' })[user?.role] || 'Not provided'}</span></div>
          </>}
          <button className="auth-primary" disabled={busy}>{busy ? 'Saving…' : button}</button>
          {mode === 'profile' && <button type="button" className="auth-secondary" onClick={signOut} disabled={busy}>Sign out</button>}
        </form>
        {mode === 'profile' && <section className="auth-password-panel auth-form">
          <h2>Change password</h2><p>Request a secure password reset link by email.</p>
          {passwordError && <p role="alert" className="auth-notice auth-error">{passwordError}</p>}
          {passwordNotice && <p role="status" className="auth-notice">{passwordNotice}</p>}
          <button className="auth-primary" disabled={busy || !user?.email} onClick={async()=>{
            setBusy(true);setPasswordError('');setPasswordNotice('');
            try {const result=await forgotPassword(user.email);setPasswordNotice(result.message);}
            catch(err){setPasswordError(err.response?.data?.message || 'Unable to request password reset.');}
            finally{setBusy(false);}
          }}>Send password reset link</button>
        </section>}
      </div>
      <p className="auth-footer">{mode === 'login'
        ? <>New here? <Link to="/register">Create an account</Link></>
        : mode === 'register'
          ? <>Already have an account? <Link to="/login">Sign in</Link></>
          : <Link to={mode === 'profile' ? '/' : '/login'}>{mode === 'profile' ? 'Back to courses' : 'Back to sign in'}</Link>}
      </p>
    </>}
  </section></main>;
}
