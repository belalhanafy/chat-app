// src/redux/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    chat : null,
    showInfo : false,
    userChats: [],
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
    },
});

export const { changeChat, changeShowInfo, setUserChats } = chatSlice.actions;
export default chatSlice.reducer;
