import React, { useEffect, useState } from 'react';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { FaUpload } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { clearUser, setUser } from '../../../redux/userSlice';
import axios from 'axios';
import ChangeStatus from '../../ChangeStatus';
import { toast } from 'react-toastify';

const UserInfo = () => {
    const user = useSelector((state) => state.user.user);
    const dispatch = useDispatch();

    const [showAttachOptions, setShowAttachOptions] = useState(false);
    const [changeStatusMode, setChangeStatusMode] = useState(false);
    const [changeAvatarMode, setChangeAvatarMode] = useState(false);
    const [avatar, setAvatar] = useState({ file: null, name: '', url: null });
    const [uploading, setUploading] = useState(false);

    // Listen to user doc updates (status, avatar, etc.)
    useEffect(() => {
        if (!user?.uid) return;

        const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                dispatch(setUser(docSnap.data()));
            }
        });

        return () => unsub();
    }, [user?.uid, dispatch]);

    const handleLogout = () => {
        auth
            .signOut()
            .then(() => dispatch(clearUser()))
            .catch((err) => console.error('Logout error:', err));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar({
                file,
                name: file.name,
                url: URL.createObjectURL(file),
            });
            setChangeAvatarMode(true);
            setShowAttachOptions(false);
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

    const handleAvatarUpload = async () => {
        if (!avatar.file || !user?.uid) return;
        setUploading(true);
        try {
            const imageUrl = await uploadToCloudinary(avatar.file);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { avatar: imageUrl });
            toast.success('Avatar updated!');
            setAvatar({ file: null, name: '', url: null });
            setChangeAvatarMode(false);
            dispatch(setUser({ ...user, avatar: imageUrl }));
        } catch (err) {
            // Already handled in uploadToCloudinary
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className='flex justify-between items-center mb-4 relative'>
            <div className='flex items-center gap-4'>
                {user?.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 object-cover object-top border rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                        {user?.username?.charAt(0)}
                    </div>
                )}
                <h2 className="text-lg font-semibold capitalize">{user?.username}</h2>
            </div>

            <div className='flex items-center gap-4 text-xl cursor-pointer relative'>
                <HiOutlineDotsHorizontal onClick={() => setShowAttachOptions(!showAttachOptions)} />

                {showAttachOptions && (
                    <div className="absolute top-6 right-0 w-32 flex flex-col gap-2 bg-gray-800 text-white py-2 px-4 rounded-lg shadow-lg text-sm z-20">
                        <button className='hover:text-blue-500 duration-200 cursor-pointer transition' onClick={() => {
                            setChangeStatusMode(true);
                            setShowAttachOptions(false);
                        }}>
                            Change Status
                        </button>
                        <label htmlFor="avatarUpload" className='hover:text-blue-500 duration-200 cursor-pointer transition'>
                            Change Avatar
                        </label>
                        <input
                            type="file"
                            id="avatarUpload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={handleLogout}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-800"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {/* Change Status Modal */}
            <ChangeStatus
                isOpen={changeStatusMode}
                setShowAttachOptions={setShowAttachOptions}
                onClose={() => setChangeStatusMode(false)}
            />

            {/* Avatar Upload Modal */}
            {changeAvatarMode && (
                <div className="absolute top-10 right-0 w-64 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-30">
                    <div className="flex flex-col items-center">
                        {avatar.url && (
                            <img src={avatar.url} alt="Preview" className="w-16 h-16 object-cover rounded-full mb-2" />
                        )}
                        <p className="text-sm truncate max-w-full text-center">{avatar.name}</p>
                        <div className="flex gap-2 mt-4 w-full">
                            <button
                                onClick={handleAvatarUpload}
                                className="flex-1 bg-blue-500 px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Save'}
                            </button>
                            <button
                                onClick={() => {
                                    setAvatar({ file: null, name: '', url: null });
                                    setChangeAvatarMode(false);
                                }}
                                className="flex-1 bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserInfo;
