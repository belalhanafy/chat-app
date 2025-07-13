import React, { useEffect, useState } from 'react';
import { MdOutlineGroupAdd, MdOutlinePushPin, MdDeleteOutline, MdArchive } from "react-icons/md";
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import AddUserModal from '../../AddUserModal';
import { useDispatch, useSelector } from 'react-redux';
import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { changeChat, changeShowClickableChat, setUserChats } from '../../../redux/chatSlice';
import { updateDoc } from 'firebase/firestore';
import { setUser } from '../../../redux/userSlice';
import { getMsgTime } from '../../../utils/time';
import { MdOutlineArchive } from "react-icons/md";


const ChatList = () => {
  const [addMode, setAddMode] = useState(false);
  const user = useSelector((state) => state.user.user);
  const { chat, userChats } = useSelector((state) => state.chat);
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState('');

  const filteredChats = userChats
    ?.filter((chat) =>
      chat?.user?.username?.toLowerCase().includes(search.trim().toLowerCase())
    )
    ?.filter((chat) => !chat.archived); // 👈 exclude archived

  const archivedChats = userChats?.filter((chat) => chat.archived);


  const ChatItem = ({ isFirst, isLast, currentChat, onClick }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleClearChat = async () => {
      try {
        const chatRef = doc(db, "chats", currentChat.chatId);

        // 1. Clear messages and lastMessage
        await updateDoc(chatRef, {
          messages: [],
        });

        // 2. Update userChats for both sender and receiver
        const userIds = [user.uid, currentChat.receiverId];

        await Promise.all(
          userIds.map(async (uid) => {
            const userChatsRef = doc(db, "userChats", uid);
            const userChatsSnap = await getDoc(userChatsRef);
            if (userChatsSnap.exists()) {
              const updatedChats = userChatsSnap.data().chats.map((c) =>
                c.chatId === currentChat.chatId
                  ? { ...c, lastMessage: "", isSeen: true }
                  : c
              );
              await updateDoc(userChatsRef, { chats: updatedChats });
            }
          })
        );
      } catch (err) {
        console.error("Failed to clear chat messages:", err);
      }

      setMenuOpen(false);
    };


    const handleArchiveChat = async (chatId) => {
      try {
        const userChatsRef = doc(db, "userChats", user.uid);
        const userChatsSnap = await getDoc(userChatsRef);

        if (userChatsSnap.exists()) {
          const chats = userChatsSnap.data().chats || [];

          const updatedChats = chats.map((chat) =>
            chat.chatId === chatId
              ? { ...chat, archived: !chat.archived } // toggle archive
              : chat
          );

          await updateDoc(userChatsRef, {
            chats: updatedChats,
          });

          setMenuOpen(false);
        }
      } catch (err) {
        console.error("Failed to archive chat:", err);
      }
    };



    const handlePin = async (chatId) => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        const userChatsRef = doc(db, "userChats", user.uid);
        const userChatsSnap = await getDoc(userChatsRef);

        if (userSnap.exists() && userChatsSnap.exists()) {
          const currentPinned = userSnap.data().pinned || [];
          const isAlreadyPinned = currentPinned.includes(chatId);

          // Update pinned array
          await updateDoc(userDocRef, {
            pinned: isAlreadyPinned
              ? arrayRemove(chatId)
              : arrayUnion(chatId),
          });

          const chats = userChatsSnap.data().chats || [];

          const updatedChats = chats.map((chat) => {
            if (chat.chatId !== chatId) return chat;

            if (!isAlreadyPinned) {
              return {
                ...chat,
                originalUpdatedAt: chat.updatedAt,
                updatedAt: Date.now(),
              };
            } else {
              return {
                ...chat,
                updatedAt: chat.originalUpdatedAt || chat.updatedAt,
                originalUpdatedAt: null,
              };
            }
          });

          await updateDoc(userChatsRef, {
            chats: updatedChats,
          });

          const updatedSnap = await getDoc(userDocRef);
          dispatch(setUser(updatedSnap.data()));
        }
      } catch (error) {
        console.error("Failed to pin/unpin chat:", error);
      }

      setMenuOpen(false);
    };


    const isUnread = currentChat.isSeen === false && user.uid !== currentChat.receiverId;

    return (
      <div className={`transition cursor-pointer duration-300 ${currentChat?.chatId === chat?.chatId ? 'bg-gray-600' : ' hover:bg-gray-400'}`}>
        <div
          className={`relative flex items-center gap-4 py-4 px-2 transition cursor-pointer duration-300
        ${isFirst ? 'border-b' : isLast ? '' : 'border-b'} border-gray-400`}
          onClick={onClick}
        >
          {currentChat?.user?.avatar ? (
            <img src={currentChat?.user?.avatar} alt={currentChat?.user?.username} className="w-10 h-10 object-cover border rounded-full object-top" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
              {currentChat?.user?.username?.charAt(0)}
            </div>
          )}

          <div className='flex items-center justify-between w-full'>
            <div className='flex items-start flex-col gap-1'>
              <div className="flex items-center gap-2">
                <h2 className={`text-md font-bold ${isUnread ? 'text-blue-400' : 'text-white'}`}>
                  {currentChat?.user?.username}
                  {user.uid === currentChat.receiverId && (
                    <span className="text-xs text-gray-400 ml-1">(You)</span>
                  )}
                </h2>
                {isUnread && <span className="w-2 h-2 bg-blue-400 rounded-full" />}
              </div>

              <p className={`text-sm truncate max-w-[160px] ${isUnread ? 'text-blue-400 font-semibold' : 'text-gray-300'}`}>
                {currentChat.lastMessage}
              </p>
            </div>

            {/* Options Menu */}
            <div className="relative flex flex-col items-center">
              <div className={`text-[10px] text-gray-400 `}>
                {getMsgTime(currentChat?.updatedAt)}
              </div>
              <div className='flex items-center space-x-2'>
                {user.pinned.includes(currentChat?.chatId) && (
                  <MdOutlinePushPin className="text-blue-400 text-lg" />
                )}
                <HiOutlineDotsHorizontal
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="text-xl cursor-pointer hover:text-gray-300"
                />
                {currentChat?.unreadMessages > 0 && currentChat?.isSeen === false && user.uid !== currentChat?.receiverId && (
                  <div className='text-xs text-white bg-blue-400 rounded-full w-4 h-4 flex items-center justify-center p-2.5'>{currentChat?.unreadMessages}</div>
                )}
              </div>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-gray-700 border border-gray-600 rounded-md shadow-md z-10 text-sm">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePin(currentChat.chatId);
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-gray-600 rounded-t-md"
                  >
                    <MdOutlinePushPin className="text-blue-400" />
                    {user.pinned.includes(currentChat?.chatId) ? "Unpin Chat" : "Pin Chat"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearChat();
                    }}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-red-600 text-red-300"
                  >
                    <MdDeleteOutline className="text-red-400" />
                    <span>Clear Chat</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveChat(currentChat.chatId);
                    }}
                    className="w-full flex items-center gap-2 rounded-b-md text-left px-4 py-2 hover:bg-yellow-600 text-yellow-300"
                  >
                    <MdArchive className="text-yellow-400" />
                    {currentChat.archived ? "Unarchive Chat" : "Archive Chat"}
                  </button>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleChatClick = async (selectedChat) => {
    dispatch(changeShowClickableChat(true));
    const userChatsRef = doc(db, "userChats", user.uid);
    const userChatsSnap = await getDoc(userChatsRef);

    if (userChatsSnap.exists()) {
      const userChats = userChatsSnap.data().chats || [];

      const updatedChats = userChats.map((c) =>
        c.chatId === selectedChat.chatId
          ? { ...c, isSeen: true, unreadMessages: 0 }
          : c
      );

      await updateDoc(userChatsRef, {
        chats: updatedChats,
      });
    }

    dispatch(changeChat(selectedChat));
  };

  useEffect(() => {
    if (!user?.uid) return;

    const userChatsRef = doc(db, "userChats", user.uid);
    const unsubUsersMap = new Map();
    const chatMap = new Map(); // 🧠 persist chat items by chatId

    const unsubMain = onSnapshot(userChatsRef, (res) => {
      const docData = res.data();
      if (!docData || !docData.chats) {
        dispatch(setUserChats([]));
        return;
      }

      const chats = docData.chats;
      const pinnedChatIds = user?.pinned || [];

      chats.forEach((chatItem) => {
        const receiverId = chatItem.receiverId;

        // Preserve previous user info if exists
        const existing = chatMap.get(chatItem.chatId);
        chatMap.set(chatItem.chatId, {
          ...chatItem,
          user: existing?.user || null,
        });

        if (unsubUsersMap.has(receiverId)) return;

        const userDocRef = doc(db, "users", receiverId);

        const unsubUser = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();

            // Update chatMap with new user data
            chatMap.forEach((chat, chatId) => {
              if (chat.receiverId === receiverId) {
                chatMap.set(chatId, { ...chat, user: userData });
              }
            });

            const allChats = Array.from(chatMap.values());

            const pinned = allChats
              .filter(c => pinnedChatIds.includes(c.chatId))
              .sort((a, b) => b.updatedAt - a.updatedAt);

            const unpinned = allChats
              .filter(c => !pinnedChatIds.includes(c.chatId))
              .sort((a, b) => b.updatedAt - a.updatedAt);

            dispatch(setUserChats([...pinned, ...unpinned]));
          }
        });

        unsubUsersMap.set(receiverId, unsubUser);
      });

      // Update list immediately for new chats (even before user data loads)
      const allChats = Array.from(chatMap.values());

      const pinned = allChats
        .filter(c => pinnedChatIds.includes(c.chatId))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      const unpinned = allChats
        .filter(c => !pinnedChatIds.includes(c.chatId))
        .sort((a, b) => b.updatedAt - a.updatedAt);

      dispatch(setUserChats([...pinned, ...unpinned]));
    });

    return () => {
      unsubMain();
      unsubUsersMap.forEach(unsub => unsub());
    };
  }, [user.uid]);






  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  return (
    <div className='flex flex-col w-full h-full bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden px-4 py-3'>
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl'>Chats</h2>
          <div className="text-white hover:text-gray-400 transition duration-200 xl:hidden block">
            <MdOutlineGroupAdd
              onClick={() => setAddMode(true)}
              className="text-2xl cursor-pointer w-fit"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="relative w-full xl:w-fit rounded-md border border-gray-300 focus-within:border-blue-500 transition">
            <input
              type="search"
              name="search"
              value={search}
              onChange={handleSearch}
              placeholder="Search..."
              className="w-full xl:w-56 px-5 py-2 pr-10 rounded-md text-sm outline-none transition-all duration-300 xl:focus:w-[16.5rem] focus:ring-2 focus:ring-blue-500"
            />

            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none size-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6z"
              />
            </svg>
          </div>

          <div className="text-white hover:text-gray-400 transition duration-200 xl:block hidden">
            <MdOutlineGroupAdd
              onClick={() => setAddMode(true)}
              className="text-2xl cursor-pointer w-fit"
            />
          </div>
        </div>


        <div
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-4 pb-2 mb-2 text-lg border-b-gray-600 border-b cursor-pointer transition-all duration-200 group"
        >
          <MdOutlineArchive />
          <p className='text-blue-500 group-hover:text-white transition-all duration-200'>
            {showArchived ? "Back to Chats" : "Archived"}
          </p>
        </div>

        {/* Modal */}
        <AddUserModal isOpen={addMode} onClose={() => setAddMode(false)} />
      </div>

      {/* Chat list scrollable container */}
      <div className="flex-1 overflow-y-auto rounded-md scrollbar-thin scrollbar-thumb-sky-700 scrollbar-track-sky-300">
        {showArchived ? (
          <p className='text-gray-400 mb-2 capitalize'>Archiver chats</p>

        ) : (

          <p className='text-gray-400 mb-2 capitalize'>all chats</p>
        )}
        {userChats?.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full rounded-md text-gray-400 py-30">
            <MdOutlineGroupAdd className="text-5xl mb-4" />
            <p className="text-lg font-semibold">No chats yet</p>
            <p className="text-sm text-center max-w-xs mt-1 px-4">
              You haven't started any conversations. Click the <span className="text-blue-400 font-medium cursor-pointer hover:underline" onClick={() => setAddMode(true)}>add user</span> icon above to connect with someone!
            </p>
          </div>
        ) : (<>
          {
            filteredChats.length === 0 && !showArchived ? (
              <div className="flex flex-col items-center justify-center flex-1 w-full rounded-md text-gray-400 py-30">
                <MdOutlineGroupAdd className="text-5xl mb-4" />
                <p className="text-lg font-semibold">No chats found</p>
                {search && (
                  <p className="text-sm text-center max-w-xs mt-1 px-4">
                    Try searching for a different username.
                  </p>
                )}

              </div>
            ) : (
              showArchived ? (
                archivedChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 w-full rounded-md text-gray-400 py-30">
                    <MdOutlineArchive className="text-5xl mb-4" />
                    <p className="text-lg font-semibold">No archived chats found</p>
                  </div>
                ) : (
                  archivedChats.map((chat, index) => (
                    <ChatItem
                      key={chat.chatId}
                      currentChat={chat}
                      isFirst={index === 0}
                      isLast={index === archivedChats.length - 1}
                      onClick={() => handleChatClick(chat)}
                    />
                  ))
                )) : (
                filteredChats.map((chat, index) => (
                  <ChatItem
                    key={chat.chatId}
                    currentChat={chat}
                    isFirst={index === 0}
                    isLast={index === filteredChats.length - 1}
                    onClick={() => handleChatClick(chat)}
                  />
                ))
              )
            )
          }
        </>
        )}
      </div>
    </div>
  );
};

export default ChatList;
