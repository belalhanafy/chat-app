import React from 'react';
import './index.css';
import { ToastContainer, Slide } from 'react-toastify';
import ChatWindow from './components/chatWindow';


function App() {
  
  return (
    <>
      <div className="bg-[url('../src/assets/images/bg.jpg')] min-h-screen flex justify-center items-center">
        <ChatWindow />
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          transition={Slide}
        />
      </div>
    </>
  );
}

export default App
