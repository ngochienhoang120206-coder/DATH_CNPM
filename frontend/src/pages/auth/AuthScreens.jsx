import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [values, setValues] = useState({ fullName: '', email: '', password: '', confirmPassword: '', avatarUrl: '', bio: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
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

  const submit = e => {
    e.preventDefault();
    const next = {};
    if (['register', 'profile'].includes(mode) && !values.fullName.trim()) next.fullName = 'Enter your full name.';
    if (['login', 'register', 'forgot'].includes(mode) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (['login', 'register', 'reset'].includes(mode) && values.password.length < MIN_PASSWORD_LENGTH) next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (['register', 'reset'].includes(mode) && (!values.confirmPassword || values.password !== values.confirmPassword)) next.confirmPassword = 'The passwords do not match.';
    if (mode === 'register' && !agreed) next.agreed = 'Accept the terms to continue.';
    if (mode === 'profile' && errors.avatar) next.avatar = errors.avatar;
    setErrors(next);
    setError('');
    setMessage('');
    if (Object.keys(next).length) return;
    if (mode === 'reset' && !resetToken) {
      setError('The password reset link is missing or invalid. Open the link from your recovery email.');
      return;
    }

    const pending = {
      login: 'Sign-in is not connected yet.',
      register: 'Account creation is not connected yet.',
      forgot: 'The recovery email has not been sent.',
      reset: 'The password has not been changed.',
      profile: 'Profile changes have not been saved.',
    };
    setMessage(`Your information is valid. ${pending[mode]} API integration is planned for Phase 2.`);
  };

  const signOut = () => {
    setMessage('Sign-out will be connected in Phase 2.');
  };

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
              {avatarFile && <p className="auth-upload-help">Selected: {avatarFile.name}</p>}
              {errors.avatar && <span className="auth-field-error" id="avatar-error" role="alert">{errors.avatar}</span>}
            </div>
            <div className="auth-field"><div className="auth-label"><label htmlFor="profile-email">Email address</label></div><input id="profile-email" type="email" readOnly value={values.email} placeholder="Account email" /></div>
            {field('bio', 'About you', 'Tell us a little about yourself')}
            <div><span className="auth-label">Role</span><span>{({ student: 'Student', instructor: 'Instructor', admin: 'Administrator' })[user?.role] || 'Not provided'}</span></div>
          </>}
          <button className="auth-primary">{button}</button>
          {mode === 'profile' && <button type="button" className="auth-secondary" onClick={signOut}>Sign out</button>}
        </form>
        {mode === 'profile' && <form className="auth-password-panel auth-form" noValidate onSubmit={e => {
          e.preventDefault(); setPasswordError(''); setPasswordNotice('');
          if (!passwordChange.current) { setPasswordError('Enter your current password.'); return; }
          if (passwordChange.next.length < MIN_PASSWORD_LENGTH) { setPasswordError(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
          if (passwordChange.next !== passwordChange.confirm) { setPasswordError('The passwords do not match.'); return; }
          setPasswordNotice('Your information is valid. The password has not been changed; API integration is planned for Phase 2.');
        }}>
          <header><h2>Change password</h2><p>Update your password to help keep your account secure.</p></header>
          {passwordError && <p className="auth-notice auth-error" role="alert">{passwordError}</p>}
          {passwordNotice && <p className="auth-notice" role="status">{passwordNotice}</p>}
          {[['current', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm password']].map(([name, label]) => <div className="auth-field" key={name}>
            <div className="auth-label"><label htmlFor={`change-${name}`}>{label}</label></div>
            <input id={`change-${name}`} type="password" autoComplete={name === 'current' ? 'current-password' : 'new-password'} value={passwordChange[name]} placeholder={label} onChange={e => { setPasswordChange(v => ({ ...v, [name]: e.target.value })); setPasswordError(''); setPasswordNotice(''); }} />
          </div>)}
          <button className="auth-primary">Change password</button>
        </form>}
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
