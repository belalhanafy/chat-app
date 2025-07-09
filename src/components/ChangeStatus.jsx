import React, { useEffect, useState } from 'react';
import { IoCloseCircleOutline } from "react-icons/io5";
import { collection, getDocs, query, setDoc, where, arrayUnion, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // Adjust if needed
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { setUser } from '../redux/userSlice';
import { setUserChats } from '../redux/chatSlice';
import { useDispatch } from 'react-redux';

const ChangeStatus = ({ isOpen, onClose, setShowAttachOptions }) => {
    const [status, setStatus] = useState("");
    const user = useSelector((state) => state.user.user);
    const userChats = useSelector((state) => state.chat.chat);
    const [chatExist, setChatExist] = useState(false)
    const dispatch = useDispatch();

    useEffect(() => {
        if (chatExist) {
            const timeout = setTimeout(() => {
                setChatExist(false);
            }, 3000); // 3 seconds

            return () => clearTimeout(timeout);
        }
    }, [chatExist]);


    const handleChangeStatus = async () => {
        if (!status.trim()) return;

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                status: status,
            });


            dispatch(setUser({
                ...user,
                status: status
            }));

            

            onClose();
            setShowAttachOptions(false);
            toast.success("status changed successfully!");
        } catch (error) {
            toast.error("Something went wrong while changing status.");
        }
    };

    

    useEffect(() => {
        if (!isOpen) {
            setStatus("");
        }
    }, [isOpen]);

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'
                } bg-black/70`}
        >
            <div
                className={`bg-gray-900 text-white p-6 rounded-xl w-[90%] max-w-md shadow-2xl relative transform transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-0'
                    }`}
            >
                {/* Header */}
                <div className='flex items-center justify-between mb-5'>
                    <h2 className="text-xl font-bold">change Status</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 text-2xl cursor-pointer transition duration-200"
                    >
                        <IoCloseCircleOutline />
                    </button>
                </div>

                {/* Search Input */}
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        placeholder="Enter status"
                        className="flex-1 border border-gray-700 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring focus:ring-blue-600"
                    />
                </div>



                <button
                    onClick={handleChangeStatus}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition duration-200 cursor-pointer"
                >
                    change
                </button>



            </div>
        </div>
    );
};

export default ChangeStatus;
