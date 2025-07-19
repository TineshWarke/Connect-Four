"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "../../socket";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Navbar from "../[components]/Navbar";

export default function LobbyPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState({ username: "", wins: 0, rank: "-" });

  useEffect(() => {
    if (user?.username) {
      fetch(`/api/leaderboard?username=${user.username}`)
        .then((res) => res.json())
        .then((data) => {
          setLeaderboard(data.topPlayers);
          setUserRank(data.user);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("joinedGame", ({ gameId }) => {
      localStorage.setItem("activeGameId", gameId);
      router.push(`/game/${gameId}`);
    });

    socket.on("waiting", () => console.log("Waiting for opponent..."));

    return () => {
      socket.off("joinedGame");
      socket.off("waiting");
    };
  }, [router]);

  useEffect(() => {
    const storedGameId = localStorage.getItem("activeGameId");

    if (storedGameId && user?.username) {
      socket.emit("joinGame", {
        gameId: storedGameId,
        username: user.username,
      });

      socket.once("gameState", (state) => {
        if (!state.winner) {
          router.push(`/game/${storedGameId}`);
        } else {
          localStorage.removeItem("activeGameId");
        }
      });
    }
  }, [user, router]);

  const handleMatch = () => {
    if (!user?.username) return alert("User not authenticated");

    setIsFindingMatch(true);
    socket.emit("joinQueue", { username: user.username });
  };

  return (
    <div className="min-h-screen bg-primary p-4 relative overflow-hidden">
      <Navbar />
      
      <div className="flex justify-center items-center mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card w-full max-w-5xl bg-white shadow-2xl p-8 rounded-2xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-center mb-4 text-secondary"
          >
            Welcome, {user?.username} 👋
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-base text-gray-600 mb-6"
          >
            Ready to dominate the board? Find your next challenger now!
          </motion.p>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex justify-center mb-6"
          >
            <button
              className="btn btn-outline btn-primary btn-wide text-lg px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border-2"
              onClick={handleMatch}
              disabled={isFindingMatch}
            >
              {isFindingMatch ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2" />
                  Finding Match...
                </>
              ) : (
                "🎮 Play Now 🎮"
              )}
            </button>
          </motion.div>

          {isFindingMatch && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-amber-500 mb-6 animate-pulse"
            >
              Looking for opponent... hang tight 🧠
            </motion.p>
          )}

          <h2 className="text-2xl font-semibold text-center text-amber-500 mb-4">
            🏆 Leaderboard
          </h2>

          <div className="overflow-y-auto max-h-60 border rounded-lg shadow-inner hide-scrollbar">
            <table className="table table-zebra w-full text-sm">
              <thead className="bg-secondary sticky top-0 z-10 text-secondary-content">
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Wins</th>
                </tr>
              </thead>
              <tbody>
                {user && (
                  <tr className="bg-amber-200 font-bold text-purple-900">
                    <td>{userRank.rank}</td>
                    <td>{userRank.username}</td>
                    <td>{userRank.wins}</td>
                  </tr>
                )}
                {leaderboard.map((player, index) => (
                  <tr
                    key={player.username}
                    className={`hover:bg-primary hover:text-black transition-colors duration-100}`}
                  >
                    <td>{index + 1}</td>
                    <td>{player.username}</td>
                    <td>{player.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isFindingMatch &&
            <p className="mt-6 text-center text-sm text-gray-400 italic">
              "Great moves start with a great mindset. Outsmart, outplay, outlast."
            </p>
          }
        </motion.div>
      </div>
    </div>
  );
}
