// src/redux/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    chat : null,
    showInfo : false,
    userChats: [],
    showClickableChat: false
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        changeChat: (state, action) => {
            state.chat = action.payload
        },
        changeShowInfo: (state, action) => {
            state.showInfo = action.payload
        },
        setUserChats: (state, action) => {
            state.userChats = action.payload
        },
        changeShowClickableChat: (state, action) => {
            state.showClickableChat = action.payload
        },
    },
});

export const { changeChat, changeShowInfo, setUserChats, changeShowClickableChat } = chatSlice.actions;
export default chatSlice.reducer;
