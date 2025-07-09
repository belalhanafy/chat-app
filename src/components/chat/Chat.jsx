import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { CiFaceSmile } from 'react-icons/ci';
import { MdInsertDriveFile } from 'react-icons/md';
import { PiImageSquareDuotone } from 'react-icons/pi';
import { LuSendHorizontal } from 'react-icons/lu';
import { FaLink } from 'react-icons/fa6';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ChatMessages from './ChatMessages';
import { doc, updateDoc, arrayUnion, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { changeShowInfo } from '../../redux/chatSlice';
import ChatMsgLoading from '../../ChatMsgLoading';

const Chat = () => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [chatImage, setChatImage] = useState({ file: null, name: '', url: null, type: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [msgReact, setMsgReact] = useState(null);
  const [editedMsg, setEditedMsg] = useState({
    msgIndex: null
  })
  const { chat, showInfo } = useSelector((state) => state.chat);
  const user = useSelector((state) => state.user.user);

  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);


  const [onlineStatus, setOnlineStatus] = useState('');




  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);
  const maxHeight = 4 * 24;

  const isBlocked = user?.blocked?.some(
    (entry) =>
      (entry.chatId === chat?.chatId && entry.receiverId === chat?.user?.uid) ||
      (entry.chatId === chat?.chatId && entry.senderId === chat?.user?.uid)

  );

  const isBlockedByOther = chat?.user?.blocked?.some(
    (entry) =>
      entry.chatId === chat?.chatId &&
      entry.receiverId === user?.uid &&
      entry.senderId === chatUser?.uid
  );

  function formatTime(date) {
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return isToday
      ? `today at ${time}`
      : `${date.toLocaleDateString()} at ${time}`;
  }

  // Real-time listener for chat user updates
  useEffect(() => {
    if (!chat?.user?.uid) return;

    const unsub = onSnapshot(doc(db, "users", chat.user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setChatUser(docSnap.data());
      }
    });

    return () => unsub();
  }, [chat?.user?.uid]);


  useEffect(() => {
    if (!chat?.user?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', chat.user.uid), (docSnap) => {
      const data = docSnap.data();
      if (data?.online) {
        setOnlineStatus('online');
      } else if (data?.lastSeen) {
        const formatted = formatTime(data.lastSeen.toDate());
        setOnlineStatus(`last seen at ${formatted}`);
      }
    });

    return () => unsub();
  }, [chat?.user?.uid]);

  useEffect(() => {
    if (!chat?.chatId || !chat?.user?.uid) return;

    const typingRef = doc(db, 'typingStatus', chat.chatId);

    const unsub = onSnapshot(typingRef, (docSnap) => {
      const data = docSnap.data();
      if (data?.typing) {
        setOtherUserTyping(data.typing[chat.user.uid] || false);
      }
    });

    return () => unsub();
  }, [chat?.chatId, chat?.user?.uid]);


  // Scroll to bottom on new messages
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages.length]);

  // Adjust textarea height on message change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [message]);



  useEffect(() => {
    const updateReaction = async () => {
      if (msgReact?.index === undefined || msgReact?.index === null) return;

      const chatRef = doc(db, 'chats', chat.chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) return;

      const chatData = chatSnap.data();
      console.log(chatData);

      if (
        msgReact.index !== undefined &&
        Array.isArray(chatData.messages)
      ) {
        const updatedMessages = chatData.messages.map((msg, i) =>
          i === msgReact.index
            ? { ...msg, msgReact: msgReact.reaction || null } // remove if null
            : msg
        );

        try {
          await updateDoc(chatRef, { messages: updatedMessages });
        } catch (err) {
          console.error('Error updating message reaction', err);
        } finally {
          setMsgReact(null);
        }
      }
    };

    updateReaction();
  }, [msgReact, chat?.chatId]);


  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji.emoji);
  };

  const handleFileChange = (e, source) => {
    const file = e.target.files[0];
    if (!file) return;

    const mime = file.type;
    let type = '';

    if (source === 'media') {
      type = mime.startsWith('image') ? 'image' : 'video';
    } else if (source === 'doc') {
      type = 'raw'; // for files like PDF/Word
    }

    setChatImage({
      file,
      type,
      name: file.name,
      url: URL.createObjectURL(file),
    });

    setShowAttachOptions(false);
  };

  const uploadToCloudinary = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'chat app');
    formData.append('folder', 'chat-app/chats');

    try {
      const endpoint = type === 'raw'
        ? `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload`
        : `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${type}/upload`;

      const res = await axios.post(endpoint, formData);
      return res.data.secure_url;
    } catch (err) {
      toast.error(`${type === 'video' ? 'Video' : 'Image'} upload failed`);
      throw err;
    }
  };


  const handleSend = async () => {
    if (!message.trim() && !chatImage.file) return;
    setIsSending(true);

    let mediaUrl = null;
    let mediaType = null;

    if (chatImage.file) {
      try {
        mediaType = chatImage.type;
        mediaUrl = await uploadToCloudinary(chatImage.file, mediaType);
      } catch {
        setIsSending(false);
        return;
      }
    }

    const msg = {
      senderId: user.uid,
      createdAt: new Date(),
      ...(replyTo && {
        replyTo: {
          text: replyTo.text || null,
          senderId: replyTo.senderId,
        }
      })
    };

    if (message.trim()) {
      msg.text = message;
    }

    if (mediaType && mediaUrl) {
      msg[mediaType] = mediaUrl;
    }

    if (mediaType === 'raw' && chatImage.name) {
      msg.fileName = chatImage.name;
    }

    try {
      const chatRef = doc(db, 'chats', chat.chatId);

      if (Number.isInteger(editedMsg?.msgIndex)) {
        // Edit message
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) return;

        const chatData = chatSnap.data();
        const updatedMessages = [...chatData.messages];
        const oldMsg = updatedMessages[editedMsg?.msgIndex];

        updatedMessages[editedMsg?.msgIndex] = {
          ...oldMsg,
          text: message,
          editedAt: new Date(), // Optional: mark as edited
          edited: true
        };

        await updateDoc(chatRef, { messages: updatedMessages });
      } else {
        // New message
        await updateDoc(chatRef, {
          messages: arrayUnion(msg),
        });
      }

      const updateUserChat = async (uid) => {
        const ref = doc(db, 'userChats', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const updated = snap.data().chats.map((c) => {
            if (c.chatId !== chat.chatId) return c;

            // Skip lastMessage update if editing an old message
            if (Number.isInteger(editedMsg?.msgIndex)) {
              return {
                ...c,
                updatedAt: Date.now(),
                isSeen: uid === user.uid,
                unreadMessages: uid === user.uid ? 0 : c.unreadMessages + 1,
                // Optionally: keep replyTo unchanged
              };
            }

            // New message: update lastMessage as usual
            return {
              ...c,
              lastMessage:
                mediaType === 'raw' && message
                  ? `${message} 📎`
                  : mediaType === 'raw'
                    ? '📎 document'
                    : mediaType === 'video' && message
                      ? `${message} 📹`
                      : mediaType === 'image' && message
                        ? `${message} 📷`
                        : mediaType === 'image'
                          ? '📷 image'
                          : mediaType === 'video'
                            ? '📹 video'
                            : message,
              updatedAt: Date.now(),
              isSeen: uid === user.uid,
              unreadMessages: uid === user.uid ? 0 : c.unreadMessages + 1,
              ...(replyTo && {
                replyTo: {
                  text: replyTo.text || null,
                  senderId: replyTo.senderId,
                }
              })
            };
          });

          await updateDoc(ref, { chats: updated });
        }
      };


      await Promise.all([updateUserChat(user.uid), updateUserChat(chat.user.uid)]);
    } catch (err) {
      console.error('Send failed', err);
    } finally {
      setMessage('');
      setEditedMsg(null);
      setReplyTo(null);
      setChatImage({ file: null, name: '', url: null, type: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowEmojiPicker(false);
      setIsSending(false);
    }
  };

  const handleTyping = async (e) => {
    const val = e.target.value;
    setMessage(val);

    if (!chat?.chatId || !user?.uid) return;

    if (!isTyping) {
      setIsTyping(true);
      await setDoc(doc(db, 'typingStatus', chat.chatId), {
        typing: { [user.uid]: true }
      }, { merge: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await setDoc(doc(db, 'typingStatus', chat.chatId), {
        typing: { [user.uid]: false }
      }, { merge: true });
    }, 500);
  };
  return (
    <div
      className={`${chat === null || !showInfo ? 'flex-3' : 'flex-2'
        } border-r border-l border-gray-800 relative`}
    >
      {chat === null ? (
        <div className="flex items-center justify-center h-full text-white text-4xl">
          Select a chat to start messaging
        </div>
      ) : (
        <div className="relative h-full flex flex-col text-white rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-2 border-b px-4 py-3 border-gray-800">
            <div className="flex items-center gap-4">
              {isBlockedByOther ? (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                  {chatUser?.username?.charAt(0)}
                </div>
              ) : (
                chatUser?.avatar ? (
                  <img
                    src={chatUser.avatar}
                    alt={chatUser.username}
                    className="w-10 h-10 object-cover object-top border rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                    {chatUser?.username?.charAt(0)}
                  </div>
                )
              )}
              <div>
                <h2 className="text-lg font-semibold">{chatUser?.username}</h2>
                {otherUserTyping ? (
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <span>Typing</span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0s]"></span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">{chatUser?.status}</p>
                )}
                <p className="text-sm text-gray-300 flex items-center gap-2">
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    {chatUser?.online ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </>
                    ) : chatUser?.lastSeen ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        Last seen at {formatTime(chatUser.lastSeen.toDate())}
                      </>
                    ) : (
                      'Offline'
                    )}
                  </p>

                </p>


              </div>
            </div>
            <div className="flex items-center gap-4 text-xl cursor-pointer">
              <IoInformationCircleOutline onClick={() => dispatch(changeShowInfo(!showInfo))} />
            </div>
          </div>

          <div className="px-4 pb-5 flex-1 overflow-y-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar-thin scrollbar-thumb-sky-700 scrollbar-track-sky-300">
            <ChatMessages setMessage={setMessage} currentChat={currentChat} setCurrentChat={setCurrentChat} setReplyTo={setReplyTo} setMsgReact={setMsgReact} setEditedMsg={setEditedMsg} />
            <div ref={endRef} className="h-0 w-0" />
          </div>

          {isBlocked ? (
            <div className="w-full px-4 py-3 text-center text-sky-400 border-t border-gray-800">
              <p>You cannot send messages to this user as you are blocked.</p>
            </div>
          ) : (
            <div className="w-full px-4 py-3 border-t border-gray-800 relative">
              {chatImage.url && (
                <div className="mb-2 flex justify-end">
                  {chatImage.type === 'image' ? (
                    <img src={chatImage.url} alt="preview" className="w-64 rounded-lg border" />
                  ) : chatImage.type === 'video' ? (
                    <video src={chatImage.url} controls className="w-64 rounded-lg border" />
                  ) : (
                    <div className="w-64 p-3 border rounded-lg bg-gray-900 text-white text-sm flex items-center justify-between">
                      <span className="truncate">{chatImage.name}</span>
                      <span className="ml-2 text-blue-400">📄</span>
                    </div>
                  )}
                </div>
              )}

              {showEmojiPicker && (
                <div className="absolute bottom-20 left-2 z-20">
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
                </div>
              )}

              {showAttachOptions && (
                <div className="absolute bottom-16 left-10 bg-gray-800 text-white rounded-xl p-2 space-y-2 shadow-lg z-10">
                  <div>
                    <label
                      htmlFor="chatImage"
                      className="w-full flex items-center gap-2 hover:text-blue-400 duration-200 cursor-pointer text-white transition"
                    >
                      <PiImageSquareDuotone />
                      <span className="text-sm">Photo & Video</span>
                    </label>
                    <input
                      type="file"
                      id="chatImage"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'media')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="chatFile"
                      className="w-full flex items-center gap-2 hover:text-blue-400 duration-200 cursor-pointer text-white transition"
                    >
                      <MdInsertDriveFile />
                      <span className="text-sm">Document</span>
                    </label>
                    <input
                      type="file"
                      id="chatFile"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'doc')}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3 rounded-full bg-transparent relative z-10">
                <button
                  className="text-2xl hover:text-gray-400 transition duration-200 cursor-pointer"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <CiFaceSmile />
                </button>
                <button
                  className="text-2xl hover:text-gray-400 transition duration-200 cursor-pointer"
                  onClick={() => setShowAttachOptions((prev) => !prev)}
                >
                  <FaLink />
                </button>
                <div className='flex-1 flex gap-2 flex-col'>
                  {replyTo && (
                    <div className="bg-gray-800 p-2 border-l-4 border-blue-500 mb-2">
                      <div className="text-xs text-white">
                        Replying to {replyTo.senderId === user.uid ? "You" : chat.user.username}
                      </div>
                      <div className="text-sm truncate">{replyTo.text || replyTo.fileName || "[Media]"}</div>
                      <button className="text-xs text-red-500" onClick={() => setReplyTo(null)}>Cancel</button>
                    </div>
                  )}
                  {editedMsg?.msgIndex && (
                    <div className="bg-gray-800 p-2 border-l-4 border-blue-500 mb-2">
                      <div className="text-xs text-white">
                        edit message
                      </div>
                      <div className="text-sm truncate">{editedMsg.text}</div>
                      <button className="text-xs text-red-500" onClick={() => setEditedMsg(null)}>Cancel</button>
                    </div>
                  )
                  }


                  <textarea
                    ref={textareaRef}
                    value={message}
                    placeholder="Type a message"
                    onChange={handleTyping}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-sm text-white focus:outline-none resize-none placeholder:text-gray-500 max-h-[144px] overflow-y-auto scrollbar-thin scrollbar-thumb-transparent"
                    rows={1}
                  />

                </div>
                <button onClick={handleSend} disabled={isSending}>
                  {isSending ? (
                    <ChatMsgLoading />
                  ) : (
                    <LuSendHorizontal
                      className="text-xl cursor-pointer hover:text-blue-500 transition duration-200"
                    />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
