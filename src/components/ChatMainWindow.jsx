import React, { useEffect, useState } from 'react';
import List from './list/List';
import Chat from './chat/Chat';
import Detail from './detail/Detail';
import AddUser from './AddUserModal';
import Login from './auth/Login';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, setUser } from '../redux/userSlice';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../Loader';
import Presence from './Presence';

const ChatMainWindow = () => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.user);
    const chat = useSelector((state) => state.chat.chat);

    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setLoadingUser(true);

                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);

                    // Retry loop to wait for the user document
                    let retries = 5;
                    let userDocSnap = await getDoc(userDocRef);

                    while (!userDocSnap.exists() && retries > 0) {
                        console.warn("User doc not found. Retrying...");
                        await new Promise((res) => setTimeout(res, 300)); // Wait 300ms
                        userDocSnap = await getDoc(userDocRef);
                        retries--;
                    }

                    if (userDocSnap.exists()) {
                        dispatch(setUser(userDocSnap.data()));
                    } else {
                        console.error("User document still not found after retry.");
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                } finally {
                    setLoadingUser(false);
                }
            } else {
                dispatch(clearUser());
                setLoadingUser(false);
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    return (
        <div className="w-[95vw] h-[90vh] bg-black/50 backdrop-blur-lg backdrop-saturate-150 rounded-lg shadow-lg flex border border-white/20 text-white">
            {loadingUser ? (
                <div className="flex justify-center items-center w-full h-full">
                    <Loader />
                </div>
            ) :
                !user ? (
                    <Login />
                ) : (
                    <>
                        <Presence />
                        <List />
                        <Chat />
                        <Detail />
                        <AddUser />
                    </>
                )
            }
        </div>
    );
};

export default ChatMainWindow;
