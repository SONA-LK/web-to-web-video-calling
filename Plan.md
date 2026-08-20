Yes. For **web-to-web video calling**, I would build it as a **WebRTC P2P application** with a very small Node.js backend. That gives you the lowest possible operating cost and avoids paying for services such as Twilio/Agora.

## 1. Target architecture

```text
                         ┌──────────────────────┐
                         │   Node.js Backend    │
                         │                      │
                         │ REST API             │
                         │ WebSocket Signaling  │
                         │ Authentication       │
                         │ User Presence        │
                         └──────────┬───────────┘
                                    │
                         Signaling only
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
          ┌──────▼──────┐                       ┌──────▼──────┐
          │   Browser A │                       │   Browser B │
          │             │                       │             │
          │ Camera      │                       │ Camera      │
          │ Microphone  │                       │ Microphone  │
          │ WebRTC      │◄──── P2P MEDIA ─────►│ WebRTC      │
          └─────────────┘                       └─────────────┘
```

The important design decision is:

**Your Node.js server should NOT carry the video/audio in normal operation.**

It only helps A and B find each other and exchange WebRTC information.

---

# 2. Technology stack

I'd use this:

### Frontend

**React + TypeScript**

```text
React
TypeScript
Vite
WebRTC API
WebSocket / Socket.IO
CSS / Tailwind
```

You could also use plain HTML/JS, but React + TypeScript will make the project easier to expand.

### Backend

```text
Node.js
TypeScript
Express
Socket.IO
JWT
```

### P2P

```text
WebRTC
RTCPeerConnection
MediaStream
getUserMedia()
getDisplayMedia()
```

### NAT traversal

```text
STUN
coturn TURN server
```

### Database

Initially:

```text
SQLite
```

Later:

```text
PostgreSQL
```

You don't actually need a database to make the first prototype.

---

# 3. Build it in phases

Don't try to build everything simultaneously.

I'd use these phases:

```text
Phase 1 → Basic video call
Phase 2 → Signaling
Phase 3 → P2P connection
Phase 4 → Authentication
Phase 5 → Calling system
Phase 6 → TURN
Phase 7 → UI
Phase 8 → Chat
Phase 9 → Screen sharing
Phase 10 → Production deployment
```

---

# 4. Phase 1 — Create the project

Recommended structure:

```text
video-call/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── webrtc/
│   │   ├── types/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── sockets/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── database/
│   │   └── server.ts
│   │
│   └── package.json
│
├── shared/
│   └── types/
│
├── .env
├── package.json
└── README.md
```

Keep frontend and backend separate.

---

# 5. Phase 2 — Signaling server

WebRTC doesn't tell the other browser how to initially connect.

That's what your signaling server does.

For example:

```text
Browser A
   │
   │ "I want to call B"
   ▼
Node.js
   │
   │ "A wants to call you"
   ▼
Browser B
```

Then they exchange:

```text
SDP Offer
SDP Answer
ICE Candidates
```

Your server simply forwards these messages.

---

# 6. Signaling events

I'd define events like:

```text
user:register
user:online
user:offline

call:request
call:accepted
call:rejected
call:cancelled
call:ended

webrtc:offer
webrtc:answer
webrtc:ice-candidate
```

Example:

```text
A → Server

call:request
{
    "to": "userB"
}
```

Server:

```text
Server → B

call:request
{
    "from": "userA"
}
```

---

# 7. Phase 3 — WebRTC

This is the core.

Browser asks permission:

```javascript
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
});
```

You receive:

```text
MediaStream
 ├── Video Track
 └── Audio Track
```

Then create:

```javascript
const peerConnection = new RTCPeerConnection(...)
```

Add the tracks:

```text
Camera
   ↓
MediaStreamTrack
   ↓
RTCPeerConnection
   ↓
Internet
   ↓
RTCPeerConnection
   ↓
Remote video
```

---

# 8. ICE + STUN

You should configure STUN.

Example conceptually:

```text
STUN Server
     │
     ├── Public address of A
     │
     └── Public address of B
```

Then WebRTC tries different connection candidates.

The browser automatically attempts to find the best route.

---

# 9. TURN server

This is extremely important.

Don't assume STUN alone will always work.

Some users will be behind restrictive NAT/firewalls.

Therefore:

```text
                 WebRTC
                   │
          ┌────────┴────────┐
          │                 │
       Direct             TURN
        P2P              fallback
          │                 │
          ▼                 ▼
       Browser A         TURN Server
          │                 │
          └──── Browser B ──┘
```

Install:

**coturn**

on your own VPS.

Then configure:

```text
STUN/TURN
     ↓
turn.yourdomain.com
```

This lets you remain independent of paid WebRTC providers.

---

# 10. Phase 4 — User accounts

Once basic calling works, add authentication.

Database:

```text
users
-----------------------
id
username
email
password_hash
avatar
created_at
last_seen
```

Never store plain passwords.

Use:

```text
Argon2
```

or:

```text
bcrypt
```

for password hashing.

Authentication flow:

```text
Register
   ↓
Login
   ↓
JWT
   ↓
WebSocket authentication
   ↓
Online
```

---

# 11. Online users

The server maintains a temporary mapping:

```text
userId → socketId
```

For example:

```text
user123 → socketABC
user456 → socketXYZ
```

When the browser disconnects:

```text
socketXYZ disconnected
        ↓
user456 offline
```

This doesn't necessarily need to be stored permanently in the database.

---

# 12. Calling flow

Your complete 1-to-1 call should work like this:

```text
A
│
│ Click "Call B"
▼
Server
│
│ call:request
▼
B
│
│ Accept
▼
Server
│
│ call:accepted
▼
A
│
│ Create SDP Offer
▼
Server
│
│ offer
▼
B
│
│ Create SDP Answer
▼
Server
│
│ answer
▼
A
│
├──────── ICE candidates ────────┐
│                                │
└──────────── WebRTC ────────────┘
                 │
                 ▼
              CONNECTED
```

---

# 13. Call UI

Initially keep it simple.

```text
┌──────────────────────────────────────────────┐
│                  Video Call                  │
│                                              │
│       ┌──────────────────────────┐           │
│       │                          │           │
│       │       Remote Video       │           │
│       │                          │           │
│       └──────────────────────────┘           │
│                                              │
│                    ┌──────────┐              │
│                    │   YOU    │              │
│                    │          │              │
│                    └──────────┘              │
│                                              │
│       🎤       📹       🖥       ☎            │
│      Mute     Camera   Screen     End        │
└──────────────────────────────────────────────┘
```

---

# 14. Controls

Implement these independently:

### Microphone

```text
Mute
Unmute
```

Technically:

```javascript
audioTrack.enabled = false;
```

### Camera

```text
Camera ON
Camera OFF
```

### Camera switching

For laptop/browser:

```text
Front/Rear
```

is mainly relevant on mobile browsers.

### End call

Close:

```text
RTCPeerConnection
MediaStream
Socket call state
```

and notify the other user.

---

# 15. Screen sharing

Later add:

```javascript
navigator.mediaDevices.getDisplayMedia()
```

Architecture:

```text
Screen
 ↓
MediaStream
 ↓
RTCPeerConnection
 ↓
Remote browser
```

You can allow:

```text
Entire screen
Window
Browser tab
```

depending on browser support.

---

# 16. Chat

Once the call works, add real-time chat.

You can actually send chat through WebRTC:

```text
WebRTC DataChannel
       │
       ├── Text
       ├── Small files
       └── Call metadata
```

For example:

```text
A ─────── WebRTC DataChannel ─────── B
              │
              ├── "Hello"
              ├── "Are you there?"
              └── emoji
```

This means your server doesn't have to carry ordinary call chat either.

---

# 17. Call history

This is one thing that should use your database.

```text
calls
--------------------------------
id
caller_id
receiver_id
started_at
answered_at
ended_at
duration
status
```

Statuses:

```text
RINGING
ACCEPTED
REJECTED
MISSED
ENDED
FAILED
```

---

# 18. Notifications

For the first version:

```text
Socket.IO
```

is enough while the website is open.

Later, add:

```text
Web Push API
```

so a user can receive:

> Isuru is calling you...

even when the application isn't actively being viewed.

For reliable background notifications, you'll need to handle browser service workers and push subscriptions correctly.

---

# 19. Security

This is extremely important.

### HTTPS

Production must use:

```text
https://
```

not:

```text
http://
```

because browser camera/microphone access requires a secure context in normal deployments.

Local development can use:

```text
localhost
```

without HTTPS.

### WebSocket security

Use:

```text
WSS
```

in production.

### Authentication

Use:

```text
JWT / secure session
```

### Passwords

Never:

```text
password = "123456"
```

Store only:

```text
password_hash
```

### Call authorization

A user shouldn't be able to send:

```text
call:request
to=userXYZ
```

and impersonate another user.

The server should verify the authenticated identity.

---

# 20. Database design

I'd start with these tables:

```text
users
contacts
calls
call_participants
messages
```

### users

```text
id
username
email
password_hash
avatar_url
created_at
last_seen
```

### contacts

```text
id
user_id
contact_user_id
created_at
```

### calls

```text
id
caller_id
receiver_id
status
started_at
answered_at
ended_at
duration
```

### messages

```text
id
sender_id
receiver_id
call_id
message
created_at
```

---

# 21. Deployment

You don't need a huge server.

For a small application:

```text
             Internet
                 │
                 ▼
        ┌─────────────────┐
        │      VPS        │
        │                 │
        │ Nginx           │
        │ Node.js         │
        │ coturn          │
        │ PostgreSQL      │
        └─────────────────┘
```

However, I'd actually separate things eventually:

```text
VPS 1
├── Nginx
├── React
└── Node.js

VPS 2
└── coturn

Database
└── PostgreSQL
```

For development, one machine is completely fine.

---

# 22. Domain

You'll want something like:

```text
yourdomain.com
```

Then:

```text
yourdomain.com
       ↓
React application

api.yourdomain.com
       ↓
Node.js

turn.yourdomain.com
       ↓
coturn
```

---

# 23. SSL

Use Let's Encrypt.

Then:

```text
https://yourdomain.com
https://api.yourdomain.com
turns:turn.yourdomain.com:5349
```

The browser will trust your website because of the valid certificate.

---

# 24. Development stages

I'd build it in exactly this order.

### Stage 1

```text
React
   ↓
Camera
   ↓
Local video
```

Goal:

**See yourself on the screen.**

---

### Stage 2

```text
Browser A
     │
     │ WebRTC
     ▼
Browser B
```

No accounts.

Use two browser tabs.

Goal:

**Two browsers can see/hear each other.**

---

### Stage 3

Add Node.js signaling:

```text
A ←→ Node.js ←→ B
```

Goal:

**WebRTC connection works through signaling.**

---

### Stage 4

Add:

```text
STUN
```

Goal:

**Remote users can connect over the Internet.**

---

### Stage 5

Install:

```text
coturn
```

Goal:

**Connections work even when direct P2P fails.**

---

### Stage 6

Add:

```text
Register
Login
Logout
```

---

### Stage 7

Add:

```text
User search
Contacts
Online status
```

---

### Stage 8

Add:

```text
Call
Accept
Reject
Cancel
End
Missed call
```

---

### Stage 9

Add:

```text
Mute
Camera
Screen sharing
```

---

### Stage 10

Add:

```text
Chat
File transfer
Call history
Notifications
```

---

# 25. Testing matrix

Don't only test Chrome → Chrome.

Test:

```text
Chrome → Chrome
Chrome → Edge
Chrome → Firefox
Edge → Chrome
Firefox → Chrome
```

And:

```text
Laptop → Laptop
Laptop → Phone
Phone → Laptop
Phone → Phone
```

Then networks:

```text
Wi-Fi → Wi-Fi
Wi-Fi → Mobile data
Mobile data → Wi-Fi
Mobile → Mobile
Different ISPs
```

Especially test:

```text
Sri Lanka ISP A → Sri Lanka ISP B
Sri Lanka → another country
```

because NAT behavior can vary.

---

# 26. Monitoring

Eventually add WebRTC statistics.

The browser gives you:

```text
RTCPeerConnection.getStats()
```

You can monitor:

```text
Latency
Packet loss
Jitter
Bitrate
Codec
Frames dropped
Resolution
Connection type
```

Then your UI could show:

```text
Connection: Excellent
Latency: 42 ms
Video: 720p
Audio: Opus
```

This becomes very useful for debugging.

---

# 27. Video quality

Don't force maximum quality.

Start with:

```text
Video: 1280 × 720
FPS: 30
```

and let WebRTC adapt.

For example:

```text
Good network
    ↓
720p / 30fps

Poor network
    ↓
480p / 24fps
```

This is one of the advantages of WebRTC.

---

# 28. Bandwidth cost

This is where the "free" part needs clarification.

With direct P2P:

```text
A ←──────────────→ B
```

your server isn't paying for the video bandwidth.

The users' Internet connections carry the traffic.

With TURN:

```text
A → TURN → B
```

your TURN server carries the traffic.

Therefore:

**P2P = extremely cheap**

**TURN = bandwidth cost**

You can minimize TURN usage by configuring STUN/P2P correctly.

---

# 29. Don't use Firebase initially

You don't need:

```text
Firebase
Twilio
Agora
Daily
Vonage
100ms
```

for the core video calling.

Your stack can be:

```text
React
   +
WebRTC
   +
Node.js
   +
Socket.IO
   +
coturn
   +
PostgreSQL/SQLite
```

That's enough.

---

# 30. Final architecture

The production version I'd aim for is:

```text
                         ┌─────────────────────┐
                         │      NGINX          │
                         │ HTTPS / WSS         │
                         └──────────┬──────────┘
                                    │
                       ┌────────────▼────────────┐
                       │       Node.js API       │
                       │                         │
                       │ Authentication          │
                       │ Signaling               │
                       │ Presence                │
                       │ Calls                   │
                       └────────────┬────────────┘
                                    │
                              PostgreSQL
                                    │
                                    │
        ┌───────────────────────────┴──────────────────────────┐
        │                                                      │
   ┌────▼─────┐                                          ┌─────▼────┐
   │ Browser A│                                          │ Browser B│
   │          │                                          │          │
   │ WebRTC   │◄──────────── Direct P2P ────────────────►│ WebRTC   │
   │ Camera   │                                          │ Camera   │
   │ Mic      │                                          │ Mic      │
   └──────────┘                                          └──────────┘
        │                                                      │
        └───────────────────┐                  ┌───────────────┘
                            │                  │
                            ▼                  ▼
                         ┌────────────────────────┐
                         │       coturn           │
                         │   TURN fallback        │
                         └────────────────────────┘
```

## My recommendation

**Don't start with authentication, database, chat, contacts, etc.**

The first milestone should be extremely small:

> **Open two browsers on two computers, enter a room ID, click "Join", and get a working audio/video call.**

Once that works, everything else becomes layers around the WebRTC core.

If you're building this yourself, I'd use **TypeScript + React + Node.js + Socket.IO + WebRTC + coturn**. It's a very good fit for a completely self-controlled web-to-web calling system.
