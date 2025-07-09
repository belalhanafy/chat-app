import React from 'react'
import UserInfo from './userInfo/UserInfo'
import ChatList from './chatList/ChatList'

const List = () => {
  return (
    <div className='flex-1 p-4 h-full text-white rounded-lg shadow-lg flex flex-col overflow-hidden'>
        <UserInfo />
        <ChatList />
    </div>
  )
}

export default List