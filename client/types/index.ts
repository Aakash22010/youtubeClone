export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  banner?: string;
  description?: string;
  subscribers: string[];
  subscribedTo: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  likes: string[];
  dislikes: string[];
  userId: User | string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  userId: User;
  videoId: string;
  parentComment: string | null;
  likes: string[];
  dislikes: string[];
  createdAt: string;
  updatedAt: string;
  replies?: Comment[]; // for nested
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  videos: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}