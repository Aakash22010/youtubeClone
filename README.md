# YouTube Clone

A full-stack YouTube clone built with modern technologies. Users can upload, watch, like, comment, and subscribe to channels. Features include a custom video player, dark mode, playlists, watch history, and more.

![YouTube Clone Screenshot](https://via.placeholder.com/800x400.png?text=YouTube+Clone+Screenshot)

## 🚀 Features

### ✅ Frontend
- **Homepage** – Video grid with thumbnails, views, author info.
- **Video Player** – Custom controls: play/pause, volume, progress bar, fullscreen, picture-in-picture, playback speed, keyboard shortcuts.
- **Sidebar** – Collapsible with navigation: Home, Explore, Subscriptions, Library (History, Playlists, Liked Videos), Categories.
- **Header** – Logo, search bar, upload button, notifications, user menu.
- **Video Card** – Thumbnail, duration, title, author, views, timestamp.
- **Video Info** – Title, views, like/dislike, share, save, subscribe button.
- **Comments** – Add, reply, like/dislike comments.
- **Channel Page** – Banner, avatar, subscriber count, videos, playlists, about.
- **Upload Modal** – Drag & drop video upload with thumbnail, title, description, category.
- **Search** – Search videos and channels.
- **Dark Mode** – Full theme support.
- **Responsive Design** – Mobile-first, works on all devices.

### ✅ Backend
- **Authentication** – Firebase Auth with email/password.
- **Video API** – CRUD operations, view tracking, like/dislike.
- **Comments API** – Create, read, reply, like/dislike.
- **Subscriptions API** – Subscribe/unsubscribe.
- **Search API** – Search videos and channels.
- **Playlists API** – Create, manage, add/remove videos, watch later.
- **Users API** – Profile updates (avatar, banner, description).
- **Watch History** – Track watched videos.
- **Categories API** – Filter videos by category.

## 🛠️ Tech Stack

### Frontend
- [Next.js](https://nextjs.org/) (React framework)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) (styling)
- [Firebase Auth](https://firebase.google.com/docs/auth) (authentication)
- [Axios](https://axios-http.com/) (HTTP client)
- [React Icons](https://react-icons.github.io/react-icons/)
- [React Dropzone](https://react-dropzone.js.org/) (file upload)

### Backend
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) + [Mongoose](https://mongoosejs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloudinary](https://cloudinary.com/) (media storage)

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account
- Firebase project
- Cloudinary account

### Clone the repository
```bash
git clone https://github.com/yourusername/youtube-clone.git
cd youtube-clone
```

### Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in the `server` folder:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run the backend:
```bash
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
```

Create a `.env.local` file in the `client` folder:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

Run the frontend:
```bash
npm run dev
```

Visit `http://localhost:3000`

## 📁 Project Structure

```
youtube-clone/
├── client/                # Next.js frontend
│   ├── components/        # Reusable UI components
│   ├── pages/             # Next.js pages
│   ├── contexts/          # React contexts (Auth)
│   ├── lib/               # Firebase, API helpers
│   ├── hooks/             # Custom hooks
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
└── server/                # Node.js backend
    ├── src
        ├── controllers/       # Route controllers
        ├── models/            # Mongoose models
        ├── routes/            # Express routes
        ├── middleware/        # Auth, error handling
        └── utils/             # DB, Firebase, Cloudinary
```

## 📚 API Endpoints

| Method | Endpoint                     | Description                          | Auth |
|--------|------------------------------|--------------------------------------|------|
| POST   | /api/auth/login              | Sync Firebase user                   | ✓    |
| GET    | /api/videos                  | Get all videos (with filters)        |      |
| GET    | /api/videos/:id              | Get single video (increment views)   |      |
| POST   | /api/videos                  | Upload video metadata                | ✓    |
| POST   | /api/videos/:id/like         | Like/unlike video                    | ✓    |
| POST   | /api/videos/:id/dislike      | Dislike video                        | ✓    |
| GET    | /api/videos/trending         | Get trending videos                  |      |
| GET    | /api/videos/subscriptions    | Get videos from subscribed channels  | ✓    |
| GET    | /api/videos/liked            | Get user's liked videos               | ✓    |
| POST   | /api/comments                | Add comment                          | ✓    |
| GET    | /api/comments/video/:videoId | Get comments for a video              |      |
| POST   | /api/comments/:id/like       | Like comment                         | ✓    |
| POST   | /api/comments/:id/dislike    | Dislike comment                      | ✓    |
| POST   | /api/subscriptions/:channelId | Subscribe/unsubscribe                | ✓    |
| GET    | /api/subscriptions/status/:channelId | Get subscription status        |      |
| GET    | /api/users/:id               | Get user profile                     |      |
| PUT    | /api/users/:id               | Update user profile                   | ✓    |
| GET    | /api/users/subscriptions     | Get subscribed channels               | ✓    |
| GET    | /api/search?q=...            | Search videos and channels            |      |
| POST   | /api/playlists               | Create playlist                      | ✓    |
| GET    | /api/playlists/user          | Get user playlists                    | ✓    |
| GET    | /api/playlists/:id           | Get single playlist                  |      |
| PUT    | /api/playlists/:id           | Update playlist                      | ✓    |
| DELETE | /api/playlists/:id           | Delete playlist                      | ✓    |
| POST   | /api/playlists/:id/videos    | Add video to playlist                 | ✓    |
| DELETE | /api/playlists/:id/videos/:videoId | Remove video from playlist        | ✓    |
| POST   | /api/history/:videoId        | Add to watch history                  | ✓    |
| GET    | /api/history                 | Get watch history                     | ✓    |
| DELETE | /api/history/:videoId        | Remove from history                   | ✓    |
| DELETE | /api/history                 | Clear all history                     | ✓    |
| POST   | /api/upload/video            | Upload video to Cloudinary            | ✓    |
| POST   | /api/upload/thumbnail        | Upload thumbnail                      | ✓    |
| POST   | /api/upload/avatar           | Upload avatar                         | ✓    |
| POST   | /api/upload/banner           | Upload banner                         | ✓    |

## 🧪 Testing

No automated tests yet. Manual testing is recommended.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [YouTube](https://youtube.com) for design inspiration.
- [Firebase](https://firebase.google.com) for authentication.
- [Cloudinary](https://cloudinary.com) for media storage.
- [Tailwind CSS](https://tailwindcss.com) for styling.

---

**Happy coding!** 🚀