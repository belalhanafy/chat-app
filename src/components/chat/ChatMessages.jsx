import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useSelector } from 'react-redux';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { Player } from '@lottiefiles/react-lottie-player';
import heartAnimation from '../../lotties/heart.json';
import likeAnimation from '../../lotties/like.json';
import smileAnimation from '../../lotties/smile.json';
import winkAnimation from '../../lotties/wink.json';
import sadAnimation from '../../lotties/sad.json';
import { FaReply } from 'react-icons/fa';
import { MdContentCopy } from 'react-icons/md';
import { MdModeEditOutline } from "react-icons/md";

const ChatMessages = ({ currentChat, setCurrentChat, setReplyTo, setMsgReact, setEditedMsg, setMessage }) => {
  const [usersMap, setUsersMap] = useState({});
  const chat = useSelector((state) => state.chat.chat);
  const user = useSelector((state) => state.user.user);
  const currentUser = useSelector((state) => state.user.user);
  const [selectedMsgIndex, setSelectedMsgIndex] = useState(null);
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, message: null, index: null });

  const emojiMap = {
    heart: '❤️',
    like: '👍',
    smile: '😊',
    wink: '😉',
    sad: '😢',
  };

  const reactionAnimations = [
    { name: 'heart', anim: heartAnimation },
    { name: 'like', anim: likeAnimation },
    { name: 'smile', anim: smileAnimation },
    { name: 'wink', anim: winkAnimation },
    { name: 'sad', anim: sadAnimation },
  ];

  useEffect(() => {
    if (!chat?.chatId) return;

    const unsub = onSnapshot(doc(db, 'chats', chat.chatId), async (res) => {
      const chatData = res.data();
      setCurrentChat(chatData);

      const senderIds = [...new Set(chatData.messages?.map((msg) => msg.senderId))];
      if (senderIds.length === 0) return;

      const unsubscribers = [];
      senderIds.slice(0, 10).forEach((uid) => {
        const userDocRef = doc(db, 'users', uid);
        const userUnsub = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            setUsersMap((prev) => ({ ...prev, [uid]: userSnap.data() }));
          }
        });
        unsubscribers.push(userUnsub);
      });

      return () => unsubscribers.forEach((unsub) => unsub());
    });

    return () => unsub();
  }, [chat?.chatId]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp?.seconds) return '';
    const now = new Date();
    const msgDate = new Date(timestamp.seconds * 1000);
    const diff = Math.floor((now - msgDate) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;

    return msgDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) setContextMenu({ visible: false, message: null, index: null });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  return (
    <div className="flex flex-col gap-4 relative">
      {currentChat?.messages?.map((msg, index) => {
        const isMe = msg.senderId === currentUser.uid;
        const sender = usersMap[msg.senderId];

        return (
          <div
            key={index}
            onMouseEnter={() => setHoveredMsgIndex(index)}
            onMouseLeave={() => setHoveredMsgIndex(null)}
            className={`flex items-start gap-2 ${isMe ? 'justify-end' : 'justify-start'} relative group`}
          >
            {!isMe && (
              sender?.avatar ? (
                <img src={sender.avatar} alt={sender.username} className="w-10 h-10 object-cover border rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                  {sender?.username?.charAt(0)}
                </div>
              )
            )}

            <div className="flex flex-col max-w-[70%] relative">
              <span className={`text-xs mb-1 ${isMe ? 'text-blue-400 text-right' : 'text-gray-400 text-left'}`}>
                {isMe ? 'You' : sender?.username || 'Unknown'}
              </span>

              {msg.replyTo && (
                <div className="text-xs text-gray-400 mb-1 border-l-2 pl-2 border-blue-500">
                  Reply to {msg.replyTo.senderId === currentUser.uid ? 'You' : usersMap[msg.replyTo.senderId]?.username || 'Unknown'}:
                  <div className="truncate">{msg.replyTo.text || '[Media]'}</div>
                </div>
              )}

              <div className="relative">
                {msg.text && (
                  <div
                    onClick={() => setSelectedMsgIndex((prev) => (prev === index ? null : index))}
                    className={`px-4 py-2 rounded-lg text-sm break-words ${isMe ? 'bg-blue-600 text-white self-end' : 'bg-gray-700 text-white self-start'}`}
                  >
                    {msg.text}
                  </div>
                )}

                {hoveredMsgIndex === index && (
                  <button
                    className={`absolute top-2.5 text-white hover:text-gray-300 ${isMe ? '-left-6' : '-right-6'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ visible: true, message: msg, index });
                    }}
                  >
                    <HiOutlineDotsVertical size={18} />
                  </button>
                )}

                {contextMenu.visible && contextMenu.index === index && (
                  <ul className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-1 w-56 bg-gray-800 text-white border border-gray-700 rounded-md shadow-lg z-50`}>
                    <li
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyTo(contextMenu.message);
                        setContextMenu({ visible: false, message: null, index: null });
                      }}
                    >
                      <FaReply />
                      Reply
                    </li>
                    {(() => {
                      const createdAt = contextMenu.message?.createdAt?.toDate?.();
                      const now = new Date();
                      const diff = createdAt ? now - createdAt : Infinity;
                      const isSender = contextMenu.message?.senderId === user?.uid;

                      if (isSender && diff <= 5 * 60 * 1000 && contextMenu.message?.text) {
                        return (
                          <li
                            className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditedMsg({ ...contextMenu.message, msgIndex: index });
                              setMessage(contextMenu.message.text);
                              setContextMenu({ visible: false, message: null, index: null });
                            }}
                          >
                            <MdModeEditOutline />
                            Edit
                          </li>
                        );
                      }

                      return null;
                    })()}


                    {contextMenu.message?.text && (
                      <li
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(contextMenu.message.text);
                          setContextMenu({ visible: false, message: null, index: null });
                        }}
                      >
                        <MdContentCopy />
                        Copy
                      </li>
                    )}
                    <li className="flex items-center justify-around px-2 py-1">
                      {reactionAnimations.map(({ name, anim }, i) => (
                        <div
                          key={i}
                          className={`cursor-pointer ${msg.msgReact === name ? 'bg-gray-700 rounded-full' : ''}`}
                          onClick={() => {
                            // If the clicked reaction is the same as the current one, remove it
                            const currentReaction = currentChat?.messages?.[index]?.msgReact;
                            setMsgReact({
                              reaction: currentReaction === name ? null : name,
                              index,
                            });
                            setContextMenu({ visible: false, message: null, index: null });
                          }}

                        >
                          <Player
                            autoplay
                            loop
                            src={anim}
                            style={anim === sadAnimation ? { width: '30px', height: '30px' } : { width: '40px', height: '40px' }}
                          />
                        </div>
                      ))}
                    </li>

                  </ul>
                )}
                {msg.msgReact && emojiMap[msg.msgReact] && (
                  <div className={`absolute -bottom-4 ${isMe ? '-left-2' : '-right-2'} w-6 h-6 text-sm bg-gray-500 rounded-full flex items-center justify-center`}>
                    {emojiMap[msg.msgReact]}
                  </div>
                )}


              </div>

              {msg.image && <img src={msg.image} alt="chat" className="w-40 mt-2 rounded-lg" />}
              {msg.video && <video controls src={msg.video} className="w-60 mt-2 rounded-lg" />}
              {msg.raw && (
                <a
                  href={msg.raw}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline text-sm break-words hover:text-blue-300"
                >
                  📄 {msg.fileName}
                </a>
              )}

              {selectedMsgIndex === index && (
                <div className={`flex gap-2 mt-1 text-xs ${isMe ? 'justify-end text-right text-gray-400' : 'justify-start text-left text-gray-400'}`}>
                  <span>{getTimeAgo(msg.createdAt)}</span>
                  {msg.text && msg.edited && <span className="italic opacity-70">(edited)</span>}
                </div>
              )}
            </div>

            {isMe && (
              sender?.avatar ? (
                <img src={sender.avatar} alt={sender.username} className="w-10 h-10 object-cover border rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold uppercase">
                  {sender?.username?.charAt(0)}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChatMessages;
