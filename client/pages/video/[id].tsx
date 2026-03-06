import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import VideoPlayer from "../../components/VideoPlayer";
import CommentSection from "../../components/CommentSection";
import SubscribeButton from "../../components/SubscribeButton";
import { useAuth } from "../../contexts/AuthContext";
import { getAvatarUrl } from "../../utils/avatar";
import { Video } from "../../types";
import SaveToPlaylistButton from "@/components/SaveToPlaylistButton";

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchVideo = async () => {
        try {
          const { data } = await api.get<Video>(`/videos/${id}`);

          setVideo(data);
          setLikes(data.likes?.length || 0);
          setDislikes(data.dislikes?.length || 0);

          if (user) {
            setUserLiked(data.likes?.includes(user._id) || false);
            setUserDisliked(data.dislikes?.includes(user._id) || false);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      fetchVideo();
    }
  }, [id, user]);

  const handleLike = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const { data } = await api.post(`/videos/${video!._id}/like`);

      setLikes(data.likes);
      setDislikes(data.dislikes);

      if (userLiked) {
        setUserLiked(false);
      } else {
        setUserLiked(true);
        setUserDisliked(false);
      }
    } catch (error) {
      console.error("Like failed", error);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const { data } = await api.post(`/videos/${video!._id}/dislike`);

      setLikes(data.likes);
      setDislikes(data.dislikes);

      if (userDisliked) {
        setUserDisliked(false);
      } else {
        setUserDisliked(true);
        setUserLiked(false);
      }
    } catch (error) {
      console.error("Dislike failed", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!video) return <div className="p-8 text-center">Video not found</div>;

  const videoUser = typeof video.userId === "object" ? video.userId : null;
  const subscribersCount = videoUser?.subscribers?.length || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <div className="flex">
        <main className="flex-1 p-4">
          <div className="max-w-full lg:max-w-5xl mx-auto px-2 sm:px-4">
            <VideoPlayer video={video} />

            <div className="mt-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-3">

                {/* CHANNEL INFO */}
                <div className="flex items-center space-x-4">
                  {videoUser && (
                    <>
                      <a
                        href={`/channel/${videoUser._id}`}
                        className="flex items-center space-x-3"
                      >
                        <img
                          src={getAvatarUrl(
                            videoUser.photoURL,
                            videoUser.displayName
                          )}
                          alt={videoUser.displayName}
                          className="w-10 h-10 rounded-full"
                        />

                        <div>
                          <p className="font-semibold text-sm">
                            {videoUser.displayName}
                          </p>

                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {subscribersCount} subscribers
                          </p>
                        </div>
                      </a>

                      <SubscribeButton channelId={videoUser._id} />
                    </>
                  )}
                </div>

                {/* VIDEO ACTIONS */}
                <div className="flex space-x-2">

                  {/* LIKE */}
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm transition ${userLiked
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f]"
                      }`}
                  >
                    <span>👍</span>
                    <span>{likes}</span>
                  </button>

                  {/* DISLIKE */}
                  <button
                    onClick={handleDislike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm transition ${userDisliked
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f]"
                      }`}
                  >
                    <span>👎</span>
                    <span>{dislikes}</span>
                  </button>

                  <SaveToPlaylistButton videoId={video._id} />
                  <button className="bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-sm transition">
                    Share
                  </button>

                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="mt-4 bg-gray-100 dark:bg-[#272727] p-3 rounded-xl text-sm">

                <p className="font-medium">
                  {video.views} views •{" "}
                  {new Date(video.createdAt).toLocaleDateString()}
                </p>

                <p className="mt-2 whitespace-pre-line text-gray-800 dark:text-gray-200">
                  {video.description}
                </p>

              </div>
            </div>

            <CommentSection videoId={video._id} />

          </div>
        </main>
      </div>
    </div>
  );
}