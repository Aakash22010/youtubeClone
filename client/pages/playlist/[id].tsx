import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import VideoCard from "../../components/VideoCard";
import { Playlist } from "../../types";
import { FiTrash2, FiEdit2 } from "react-icons/fi";

export default function PlaylistPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    fetchPlaylist();
  }, [router.isReady]);

  const fetchPlaylist = async () => {
    try {
      const { data } = await api.get(`/playlists/${id}`);

      setPlaylist(data);
      setName(data.name);
      setDescription(data.description || "");
      setIsPublic(data.isPublic);
    } catch (error) {
      console.error("Failed to fetch playlist", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put(`/playlists/${id}`, {
        name,
        description,
        isPublic,
      });

      setPlaylist(data);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update playlist", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this playlist?")) return;

    try {
      await api.delete(`/playlists/${id}`);
      router.push("/playlists");
    } catch (error) {
      console.error("Failed to delete playlist", error);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      await api.delete(`/playlists/${id}/videos/${videoId}`);

      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              videos: prev.videos.filter((v) => v._id !== videoId),
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to remove video", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!playlist) return <div className="p-8 text-center">Playlist not found</div>;

  // Handle both populated and non-populated userId
  const ownerId =
    typeof playlist.userId === "object"
      ? playlist.userId._id
      : playlist.userId;

  const isOwner = user && ownerId === user._id;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {editMode ? (
        <form onSubmit={handleUpdate} className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Edit playlist</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isPublic">Public</label>
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{playlist.name}</h1>

            {isOwner && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <FiEdit2 size={20} />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-gray-100 rounded text-red-600"
                >
                  <FiTrash2 size={20} />
                </button>
              </div>
            )}
          </div>

          {playlist.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {playlist.description}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-2">
            {playlist.videos.length} videos •{" "}
            {playlist.isPublic ? "Public" : "Private"}
          </p>
        </div>
      )}

      {playlist.videos.length === 0 ? (
        <p className="text-center py-12 text-gray-500">
          No videos in this playlist.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlist.videos.map((video) => (
            <div key={video._id} className="relative group">
              <VideoCard video={video} />

              {isOwner && (
                <button
                  onClick={() => handleRemoveVideo(video._id)}
                  className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                  title="Remove from playlist"
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}