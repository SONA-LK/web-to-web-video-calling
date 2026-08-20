export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  lastSeen?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'ENDED' | 'MISSED' | 'BUSY';
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
}

export interface SignalingOfferPayload {
  to: string;
  from: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingAnswerPayload {
  to: string;
  from: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingIceCandidatePayload {
  to: string;
  from: string;
  candidate: RTCIceCandidateInit;
}

export interface CallRequestPayload {
  toUserId: string;
  callerInfo: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface CallResponsePayload {
  callId: string;
  toUserId: string;
  accepted: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}
