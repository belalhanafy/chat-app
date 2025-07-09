import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import chatReducer from "./chatSlice";

export let store = configureStore({
    reducer: {
        // waiting for reducer
        user: userReducer,
        chat: chatReducer,
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
            serializableCheck: false, // ❗ disables warnings
        }),
});