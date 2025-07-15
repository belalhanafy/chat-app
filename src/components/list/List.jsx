import React from 'react'
import UserInfo from './userInfo/UserInfo'
import ChatList from './chatList/ChatList'
import { useSelector } from 'react-redux';

const List = () => {
  const { showClickableChat, showInfo } = useSelector((state) => state.chat);
  
  return (
    <div
      className={`
        ${showInfo ? 'flex-1' : 'md:flex-2 xl:flex-1'}
        lg:p-4 p-2 h-full text-white rounded-lg shadow-lg flex flex-col overflow-hidden flex-1
        ${showClickableChat ? 'md:block hidden' : 'block'}
      `}
    >
      <UserInfo />
      <ChatList />
    </div>
  )
}

export default List
