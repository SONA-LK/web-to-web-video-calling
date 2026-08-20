# Web to Web Video Calling Application

A full-stack, real-time WebRTC peer-to-peer video calling web application with Node.js/Express/Socket.IO backend and React + TypeScript + Vite frontend.

## Architecture Overview
- **Frontend**: React, TypeScript, Vite, WebRTC, Socket.IO Client, Vanilla CSS / Modern UI
- **Backend**: Node.js, Express, Socket.IO, JWT Authentication, SQLite database
- **P2P Video/Audio**: WebRTC (`RTCPeerConnection`, `MediaStream`) with STUN/TURN fallback
- **Features**: 1-to-1 Video/Audio Calls, Screen Sharing, In-call Chat via DataChannel, Contact Management, Call History

## Project Phases & Roadmap
- [x] **Phase 0**: Project Setup & Repository Initialization
- [ ] **Phase 1**: Folder Structure & Shared Types
- [ ] **Phase 2**: Express Server & Socket.IO Signaling Server
- [ ] **Phase 3**: React Frontend Setup & Design System
- [ ] **Phase 4**: User Authentication & Database Integration (SQLite/Argon2/JWT)
- [ ] **Phase 5**: WebRTC P2P Video/Audio Connection & Call Controls
- [ ] **Phase 6**: Screen Sharing & In-call DataChannel Chat
- [ ] **Phase 7**: Call History, Contact Management & Ringing Notifications
