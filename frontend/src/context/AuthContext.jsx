import React, {createContext,useContext,useEffect,useState} from 'react';
import api from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}) {
 const [user,setUser]=useState(null); const [loading,setLoading]=useState(true);
 const refreshProfile=async()=>{const {data}=await api.get('/users/profile');setUser(data.data);return data.data;};
 useEffect(()=>{let active=true;api.get('/users/profile').then(({data})=>{if(active)setUser(data.data);}).catch(()=>{if(active)setUser(null);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const login=async(email,password)=>{await api.post('/auth/login',{email,password});return refreshProfile();};
 const register=async payload=>(await api.post('/auth/register',payload)).data;
 const logout=async()=>{await api.post('/auth/logout');setUser(null);};
 const updateProfile=async payload=>{const {data}=await api.put('/users/profile',payload);setUser(data.data);return data.data;};
 const forgotPassword=async email=>(await api.post('/auth/forgot-password',{email})).data;
 const resetPassword=async(token,newPassword)=>(await api.post('/auth/reset-password',{token,newPassword})).data;
 return <AuthContext.Provider value={{user,loading,login,register,logout,updateProfile,forgotPassword,resetPassword}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
