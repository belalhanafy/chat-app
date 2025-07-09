import React from 'react';
import './index.css';
import { ToastContainer, Slide } from 'react-toastify';
import ChatMainWindow from './components/ChatMainWindow';


function App() {
  
  return (
    <>
      <div className="bg-[url('../src/assets/images/bg.jpg')] min-h-screen flex justify-center items-center">
        <ChatMainWindow />
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
