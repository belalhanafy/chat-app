import React, { useEffect, useState } from 'react';
import { IoCloseCircleOutline } from "react-icons/io5";
import { collection, getDocs, query, setDoc, where, arrayUnion, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // Adjust if needed
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const AddUserModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const user = useSelector((state) => state.user.user);
  const [chatExist, setChatExist] = useState(false)


  useEffect(() => {
  if (chatExist) {
    const timeout = setTimeout(() => {
      setChatExist(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timeout);
  }
}, [chatExist]);


  const handleSearch = async () => {
    if (!username.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setNotFound(false);

    try {
      const userRef = collection(db, "users");
      const q = query(
        userRef,
        where("username", "==", username.trim())
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setSearchResult(querySnapshot.docs[0].data());
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Search error:", err);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = async () => {
    if (!searchResult) return;

    const userChatsRef = collection(db, "userChats");
    const chatRef = collection(db, "chats");

    try {
      // Step 1: Check if chat already exists
      const userChatDoc = doc(db, "userChats", user.uid);
      const userChatSnap = await getDoc(userChatDoc);

      const existingChats = userChatSnap.exists() ? userChatSnap.data().chats || [] : [];

      const alreadyExists = existingChats.some(
        (chat) => chat.receiverId === searchResult.uid
      );
      if (alreadyExists) {
        setChatExist(true);
        return;
      }

      // Step 2: Create chat document in "chats" collection
      const newChatRef = doc(chatRef); // generates random chatId
      await setDoc(newChatRef, {
        messages: [],
        createdAt: serverTimestamp(),
      });

      const newChatForCurrentUser = {
        chatId: newChatRef.id,
        receiverId: searchResult.uid,
        lastMessage: "",
        updatedAt: Date.now(),
        isSeen : true,
        unreadMessages: 0
      };

      const newChatForReceiver = {
        chatId: newChatRef.id,
        receiverId: user.uid,
        lastMessage: "",
        updatedAt: Date.now(),
        isSeen : true,
        unreadMessages: 0
      };

      // Step 3: Add to current user's chats
      await setDoc(doc(userChatsRef, user.uid), {
        chats: arrayUnion(newChatForCurrentUser),
      }, { merge: true });

      // Step 4: Add to receiver user's chats
      await setDoc(doc(userChatsRef, searchResult.uid), {
        chats: arrayUnion(newChatForReceiver),
      }, { merge: true });

      onClose();
      toast.success("Chat added successfully!");
    } catch (error) {
      console.error("Error adding chat:", error);
      toast.error("Something went wrong while adding the chat.");
    }
  };


  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setSearchResult(null);
      setNotFound(false);
      setSearching(false);
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
          <h2 className="text-xl font-bold">Add New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-2xl cursor-pointer transition duration-200"
          >
            <IoCloseCircleOutline />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="flex-1 border border-gray-700 p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring focus:ring-blue-600"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 px-4 rounded text-white hover:bg-blue-700 transition duration-200 cursor-pointer"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {/* Result or Message */}
        {searchResult && (
          <div className="bg-gray-800 py-2 px-4 rounded-lg shadow flex items-center gap-4">
            {searchResult?.avatar ? (
              <img
                src={searchResult.avatar}
                alt={searchResult.username}
                className="w-10 h-10 object-cover object-top border rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                {searchResult?.username?.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-bold text-lg">{searchResult.username}</p>
            </div>
          </div>
        )}

        {notFound && (
          <div className="text-center text-sm text-red-400 mt-3 bg-red-900/30 py-2 rounded">
            No user found.
          </div>
        )}

        {/* Add Button */}

        
        {chatExist && (
          <div className="text-center text-sm text-yellow-400 mt-3 bg-yellow-900/30 py-2 rounded">
            Chat already exists with this user.
          </div>
        )}
        {searchResult && (
          <button
            onClick={handleAddUser}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition duration-200 cursor-pointer"
          >
            Add User
          </button>
        )}
      </div>
    </div>
  );
};

export default AddUserModal;
