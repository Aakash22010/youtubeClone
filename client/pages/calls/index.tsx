import { useRouter } from 'next/router';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiVideo, FiUsers } from 'react-icons/fi';
import Head from 'next/head';
import { generateNextSeo } from 'next-seo/pages';

export default function CallsIndex() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const startNewCall = () => {
    const newRoomId = uuidv4();
    router.push(`/calls/${newRoomId}`);
  };

  const joinCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/calls/${roomId.trim()}`);
    }
  };

  return (
    <>
      <Head>
        {generateNextSeo({
          title: 'VoIP Video Calls',
          description: 'Start or join a real-time secure video call with your friends on YouTube Clone.',
        })}
      </Head>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <h1 className="text-4xl font-bold mb-6 flex items-center gap-3">
          <FiVideo className="text-red-600" />
          Real-Time Video Calls
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-2xl">
          Connect with your friends instantly. Start a new meeting or join an existing one using a room ID.
        </p>

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl justify-center">
          {/* Start a new call */}
          <div className="bg-white dark:bg-[#1f1f1f] p-8 rounded-2xl shadow-lg flex-1 border border-gray-100 dark:border-[#272727]">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiVideo className="text-red-600 text-2xl" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Start a Meeting</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Create a new secure room and share the link with participants.
            </p>
            <button
              onClick={startNewCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              New Call
            </button>
          </div>

          {/* Join existing call */}
          <div className="bg-white dark:bg-[#1f1f1f] p-8 rounded-2xl shadow-lg flex-1 border border-gray-100 dark:border-[#272727]">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiUsers className="text-blue-600 text-2xl" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Join a Meeting</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Got an invite? Enter your room ID here to join the call.
            </p>
            <form onSubmit={joinCall} className="w-full">
              <input
                type="text"
                placeholder="Enter room ID..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#3f3f3f] bg-transparent focus:outline-none focus:border-blue-500 mb-4"
                required
              />
              <button
                type="submit"
                className="w-full bg-transparent border-2 border-gray-300 dark:border-[#3f3f3f] hover:border-gray-400 dark:hover:border-gray-500 font-medium py-2.5 px-6 rounded-lg transition-colors"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
