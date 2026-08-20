# Web to Web Video Calling Application

A full-stack, real-time WebRTC peer-to-peer video calling web application with Node.js/Express/Socket.IO backend and React + TypeScript + Vite frontend.

## Architecture Overview
- **Frontend**: React, TypeScript, Vite, WebRTC, Socket.IO Client, Glassmorphism CSS UI
- **Backend**: Node.js, Express, Socket.IO, JWT Authentication, SQLite database
- **P2P Video/Audio**: WebRTC (`RTCPeerConnection`, `MediaStream`) with STUN/TURN fallback
- **Features**: 1-to-1 Video/Audio Calls, Screen Sharing, Media Controls (Mute/Camera toggle)

## Project Roadmap & Commits
- [x] **Phase 0**: Project Setup & Repository Initialization (`8537e7b`, `9f27c1a`)
- [x] **Phase 1**: Folder Structure & Shared Types (`9907d6b`)
- [x] **Phase 2**: Express Server & Socket.IO Signaling Server (`9907d6b`)
- [x] **Phase 3**: React Frontend Setup & Glassmorphism Design System (`e6254d7`)
- [x] **Phase 5**: WebRTC P2P Video/Audio Connection, Screen Sharing & Controls (`e6254d7`)
- [ ] **Phase 4**: User Authentication & Database Integration (SQLite/Argon2/JWT)
- [ ] **Phase 6**: In-call DataChannel Chat & Call History
