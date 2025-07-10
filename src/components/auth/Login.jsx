import React, { useState } from 'react';
import axios from 'axios';
import { FaUpload } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { FaEye } from "react-icons/fa6";
import { FaEyeSlash } from "react-icons/fa6";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { db } from '../../lib/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const Login = () => {
    const [activeTab, setActiveTab] = useState('login');
    const [avatar, setAvatar] = useState({ file: null, name: '', url: null });
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState({
        login: false,
        register: false,
    });
    const [loading, setLoading] = useState({
        login: false,
        register: false,
        google: false,
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar({
                file,
                name: file.name,
                url: URL.createObjectURL(file),
            });
        }
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'chat app');
        formData.append('folder', 'chat-app/avatars');

        try {
            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
                formData
            );
            return res.data.secure_url;

        } catch (error) {
            toast.error('Upload failed!');
            throw error;
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading((prev) => ({ ...prev, login: true }));
        try {
            await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
            toast.success('Login successful!');
            setLoginData({ email: '', password: '' });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading((prev) => ({ ...prev, login: false }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading((prev) => ({ ...prev, register: true }));
        try {
            let photoURL = null;
            if (avatar.file) {
                photoURL = await uploadToCloudinary(avatar.file);
            }

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                registerData.email,
                registerData.password
            );

            const user = userCredential.user;

            await updateProfile(user, {
                displayName: registerData.username,
                photoURL,
            });

            // ✅ Add user to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: registerData.username,
                email: registerData.email,
                avatar: photoURL,
                blocked: [],
                pinned: [],
                status: 'Hey there! I am using Chat App',
                createdAt: serverTimestamp(),
            });

            await setDoc(doc(db, "userChats", user.uid), {
                chats: [],
            });

            setRegisterData({ username: '', email: '', password: '' });
            setAvatar({ file: null, name: '', url: null });

            toast.success('Registration successful');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading((prev) => ({ ...prev, register: false }));
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        setLoading((prev) => ({ ...prev, google: true }));
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // Create Firestore user document if first time
                await setDoc(userRef, {
                    uid: user.uid,
                    username: user.displayName || "Unnamed",
                    email: user.email,
                    avatar: user.photoURL || null,
                    blocked: [],
                    pinned: [],
                    status: "Hey there! I am using Chat App",
                    createdAt: serverTimestamp(),
                });

                await setDoc(doc(db, "userChats", user.uid), {
                    chats: [],
                });
            }

            toast.success('Google sign-in successful!');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading((prev) => ({ ...prev, google: false }));
        }
    };

    return (
        <div className="flex items-center justify-center w-full">
            <div className="w-full max-w-md p-6 text-white">
                {/* Tabs */}
                <div className="flex bg-gray-700 rounded-lg overflow-hidden mb-6">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-2 text-center transition-colors duration-200 ${activeTab === 'login' ? 'bg-blue-600 text-white' : 'text-gray-300'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`flex-1 py-2 text-center transition-colors duration-200 ${activeTab === 'register' ? 'bg-blue-600 text-white' : 'text-gray-300'
                            }`}
                    >
                        Register
                    </button>
                </div>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <>
                        <h2 className="text-2xl font-semibold text-center mb-4">Welcome back 👋</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none"
                            />
                            <div className='relative w-full'>

                                <input
                                    type={showPassword.login ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none"
                                />
                                {showPassword.login ? (
                                    <FaEyeSlash onClick={() => setShowPassword({ ...showPassword, login: false })} className='absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer' />
                                ) : (
                                    <FaEye onClick={() => setShowPassword({ ...showPassword, login: true })} className='absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer' />
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading.login}
                                className={`w-full py-2 rounded transition ${loading.login ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                    }`}
                            >
                                {loading.login ? 'Logging in...' : 'Login'}
                            </button>
                        </form>

                        <div className="mt-4">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading.google}
                                className="w-full py-2 bg-white text-black border border-gray-300 rounded hover:bg-gray-100 transition flex items-center justify-center gap-2"
                            >
                                <FcGoogle className="text-xl" />
                                {loading.google ? 'Please wait...' : 'Sign in with Google'}
                            </button>
                        </div>
                    </>
                )}

                {/* Register Form */}
                {activeTab === 'register' && (
                    <>
                        <h2 className="text-2xl font-semibold text-center mb-4">Create an account 📝</h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Avatar Upload */}
                            <div className="w-full text-center">
                                <label
                                    htmlFor="avatar"
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-700 rounded-lg cursor-pointer text-white hover:bg-gray-600 transition"
                                >
                                    <FaUpload className="text-lg" />
                                    <span>{avatar.name ? 'Change Avatar' : 'Upload Avatar'}</span>
                                </label>
                                <input
                                    type="file"
                                    id="avatar"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {avatar.name && (
                                    <div className="mt-3 flex items-center justify-center gap-3">
                                        <img
                                            src={avatar.url}
                                            alt="User Avatar"
                                            className="w-10 h-10 object-cover object-top  border rounded-full"
                                        />
                                        <p className="text-sm text-gray-400 truncate max-w-[150px]">{avatar.name}</p>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Username"
                                value={registerData.username}
                                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none"
                            />
                            <div className='relative w-full'>
                                <input
                                    type={showPassword.register ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={registerData.password}
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none"
                                />
                                {showPassword.register ? (
                                    <FaEyeSlash onClick={() => setShowPassword({ ...showPassword, register: false })} className='absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer' />
                                ) : (
                                    <FaEye onClick={() => setShowPassword({ ...showPassword, register: true })} className='absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer' />
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading.register}
                                className={`w-full py-2 rounded transition ${loading.register
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                    }`}
                            >
                                {loading.register ? 'Registering...' : 'Register'}
                            </button>
                        </form>

                        <div className="mt-4">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading.google}
                                className="w-full py-2 bg-white text-black border border-gray-300 rounded hover:bg-gray-100 transition flex items-center justify-center gap-2"
                            >
                                <FcGoogle className="text-xl" />
                                {loading.google ? 'Please wait...' : 'Sign Up with Google'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
