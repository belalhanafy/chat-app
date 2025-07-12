import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { clearUser, setUser } from '../../redux/userSlice';
import { changeChat } from '../../redux/chatSlice';
import { IoIosArrowDropdown } from 'react-icons/io';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { signOut } from 'firebase/auth';

const Detail = () => {
  const [open, setOpen] = useState({
    chatSetting: false,
    privacyHelp: false,
    sharedPhotos: false,
    sharedFiles: false,
  });

  const [currentChatMsg, setCurrentChatMsg] = useState(null);

  const dispatch = useDispatch();
  const { chat, showInfo } = useSelector((state) => state.chat);
  const user = useSelector((state) => state.user.user);

  const isBlocked = user?.blocked?.some(
    (entry) =>
      entry.chatId === chat?.chatId && entry.receiverId === chat?.user?.uid
  );

  const isBlockedByOther = chat?.user?.blocked?.some(
    (entry) =>
      entry.chatId === chat?.chatId &&
      entry.receiverId === user?.uid &&
      entry.senderId === chat?.user?.uid
  );

  useEffect(() => {
    if (!user?.uid || !chat?.user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;

      const updatedBlocked = snap.data().blocked || [];

      dispatch(setUser({ ...user, blocked: updatedBlocked }));

      const chatUserBlocked = updatedBlocked.filter(
        (entry) =>
          (entry.receiverId === chat.user.uid &&
            entry.senderId === user.uid) ||
          (entry.senderId === chat.user.uid &&
            entry.receiverId === user.uid)
      );

      dispatch(
        changeChat({
          ...chat,
          user: {
            ...chat.user,
            blocked: chatUserBlocked,
          },
        })
      );
    });

    return () => unsubscribe();
  }, [user?.uid, chat?.user?.uid]);

  useEffect(() => {
    if (!chat?.chatId) return;

    const unsub = onSnapshot(doc(db, "chats", chat.chatId), async (res) => {
      const chatData = res.data();
      setCurrentChatMsg(chatData.messages);
    });

    return () => unsub();
  }, [chat?.chatId]);


  const toggle = (key) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBlock = async (chatId, receiverId) => {
    try {
      const senderRef = doc(db, 'users', user.uid);
      const receiverRef = doc(db, 'users', receiverId);

      const [senderSnap, receiverSnap] = await Promise.all([
        getDoc(senderRef),
        getDoc(receiverRef),
      ]);

      if (!senderSnap.exists() || !receiverSnap.exists()) return;

      const senderBlocked = senderSnap.data().blocked || [];
      const blockEntry = { chatId, senderId: user.uid, receiverId };

      const isAlreadyBlocked = senderBlocked.some(
        (entry) =>
          entry.chatId === chatId && entry.receiverId === receiverId
      );

      if (isAlreadyBlocked) {
        await Promise.all([
          updateDoc(senderRef, { blocked: arrayRemove(blockEntry) }),
          updateDoc(receiverRef, { blocked: arrayRemove(blockEntry) }),
        ]);

        dispatch(
          changeChat({
            ...chat,
            user: {
              ...chat.user,
              blocked: (chat.user.blocked || []).filter(
                (entry) =>
                  !(
                    entry.chatId === chatId &&
                    entry.senderId === user.uid
                  )
              ),
            },
          })
        );
      } else {
        await Promise.all([
          updateDoc(senderRef, { blocked: arrayUnion(blockEntry) }),
          updateDoc(receiverRef, { blocked: arrayUnion(blockEntry) }),
        ]);

        dispatch(
          changeChat({
            ...chat,
            user: {
              ...chat.user,
              blocked: [...(chat.user.blocked || []), blockEntry],
            },
          })
        );
      }
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  const handleLogout = async () => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      });

      await signOut(auth);

    }
  };

  if (!chat) return <div className="relative"></div>;

  return (<>
    {showInfo && (

      <div className="flex-1 relative border-l border-gray-800">
        <div className='flex flex-col'>
          {/* Header */}
          <div className="flex flex-col items-center gap-3 border-b border-gray-800 px-4 py-3">
            {isBlockedByOther ? (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                {chat.user?.username?.charAt(0)}
              </div>
            ) : (
              chat.user?.avatar ? (
                <img
                  src={chat.user.avatar}
                  alt={chat.user.username}
                  className="w-16 h-16 object-top rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                  {chat.user?.username?.charAt(0)}
                </div>
              )
            )}
            <h2 className="text-lg font-semibold">{chat.user?.username}</h2>
            <p className="text-sm text-gray-300">{chat.user?.status}</p>

            {isBlockedByOther && (
              <div className="text-red-400 text-sm text-center font-medium px-2 mt-1">
                You are blocked by this user.
              </div>
            )}
          </div>

          <div className="h-[calc(100vh-340px)] overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-sky-700 scrollbar-track-sky-300">
            {/* Accordion */}
            <ul className="px-4 py-3 space-y-4 flex-1">
              {['chatSetting', 'privacyHelp', 'sharedPhotos & videos', 'sharedFiles'].map(
                (section) => (
                  <li key={section}>
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggle(section)}
                    >
                      <p>{section.replace(/([A-Z])/g, ' $1')}</p>
                      <IoIosArrowDropdown
                        className={`transition-transform ${open[section] ? 'rotate-180' : ''
                          }`}
                      />
                    </div>
                    {open[section] && section === 'sharedPhotos & videos' && (
                      <ul className="space-y-3 mt-3">
                        {currentChatMsg.map((item, index) => {

                          if (!item.image && !item.video) return null;
                          return (
                            <li
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt="chat-media"
                                    className="w-14 rounded-sm"
                                  />
                                ) : (
                                  <video
                                    src={item.video}
                                    controls
                                    className="w-14 rounded-sm"
                                  />
                                )}
                                <p>{item.image ? 'Photo' : 'Video'}</p>
                              </div>
                              <IoInformationCircleOutline />
                            </li>
                          );
                        })}
                      </ul>

                    )}
                    {open[section] && section === 'sharedFiles' && (
                      <ul className="space-y-3 mt-3">
                        {currentChatMsg.map((item, index) => {

                          if (!item.raw) return null;
                          return (
                            <li
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                {item.raw && (
                                  <p className='hover:underline cursor-pointer'>
                                    <a
                                      href={item.raw}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-300 text-sm break-words hover:text-blue-200"
                                    >
                                      📄 {item.fileName}
                                    </a>
                                  </p>
                                )}
                              </div>
                              <IoInformationCircleOutline />
                            </li>
                          );
                        })}
                      </ul>

                    )}
                    {open[section] && section !== 'sharedPhotos & videos' && section !== 'sharedFiles' && (
                      <div className="mt-2 text-sm text-gray-400 px-2">
                        {section} content...
                      </div>
                    )}
                  </li>
                )
              )}
            </ul>

          </div>
        </div>
        {/* Footer Buttons */}
        <div className="absolute bottom-0 right-0 w-full px-4 py-2 flex flex-col gap-4">
          {user.uid !== chat.user.uid && (

            <button
              onClick={() => handleBlock(chat.chatId, chat.user.uid)}
              className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-800"
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-800"
          >
            Logout
          </button>
        </div>
      </div>
    )}
  </>
  );
};

export default Detail;
