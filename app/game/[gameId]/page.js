"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { socket } from "../../../socket";
import { useUser } from "@clerk/nextjs";
import Navbar from "../../[components]/Navbar";
import GameBoard from "../../[components]/GameBoard";
import { motion } from "framer-motion";

const ROWS = 6;
const COLS = 7;

export default function GamePage() {
  const { gameId } = useParams();
  const { user } = useUser();
  const router = useRouter();

  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [currentTurn, setCurrentTurn] = useState("X");
  const [winnerSymbol, setWinnerSymbol] = useState(null);
  const [winnerUsername, setWinnerUsername] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  useEffect(() => {
    if (!user?.username || !gameId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinGame", {
      gameId,
      username: user.username,
    });

    socket.on("yourSymbol", (symbol) => {
      setPlayerSymbol(symbol);
    });

    socket.on("gameState", (state) => {
      setBoard(state.board);
      setCurrentTurn(state.currentTurn);
      setWinnerSymbol(state.winner);
      setWinnerUsername(state.winnerUsername);

      if (state.opponent !== undefined) {
        setOpponentName(state.opponent);
      }

      if (state.opponentDisconnected !== undefined) {
        setOpponentDisconnected(state.opponentDisconnected);
      }
    });

    // 👇 Listen for real-time disconnection
    socket.on("opponentDisconnected", () => {
      setOpponentDisconnected(true);
    });

    return () => {
      socket.off("yourSymbol");
      socket.off("gameState");
      socket.off("opponentDisconnected");
    };
  }, [gameId, user?.username]);

  useEffect(() => {
    if (winnerSymbol) {
      localStorage.removeItem("activeGameId");
    }
  }, [winnerSymbol]);

  const makeMove = (col) => {
    if (winnerSymbol) return;
    if (playerSymbol !== currentTurn) return;

    socket.emit("makeMove", { gameId, col });
  };

  const handleBackToLobby = () => {
    router.push("/lobby");
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-primary overflow-hidden">
      {/* Navbar */}
      <div className="flex-none">
        <Navbar />
      </div>

      {/* Main Section */}
      <main className="flex flex-col flex-grow overflow-hidden p-2 sm:p-4">
        {winnerSymbol &&
          <button className="btn btn-outline absolute border-2" onClick={handleBackToLobby}>
            Back to Lobby
          </button>
        }

        {/* Game Info Display */}
        <div className="flex-none flex flex-col sm:flex-row sm:justify-center items-center gap-2 sm:gap-6 text-base-content mb-4">
          <div className={`badge ${playerSymbol === 'X' ? 'badge-error' : 'badge-success'} gap-2 px-4 py-2 text-md shadow-md`}>
            You are: <span className="font-bold text-black">{playerSymbol}</span>
          </div>
          <div className={`badge ${currentTurn === 'X' ? 'badge-error' : 'badge-success'} gap-2 px-4 py-2 text-md shadow-md`}>
            Turn: <span className="font-bold text-black">{currentTurn}</span>
          </div>
          {opponentName && (
            <div
              className={`badge badge-warning gap-2 px-4 py-2 text-md shadow-md`}
            >
              Opponent: <span className={`font-bold ${opponentDisconnected ? "text-red-500" : "text-green-700"}`}>{opponentName}</span>
            </div>
          )}
        </div>

        {/* Winner Display */}
        {winnerSymbol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-semibold text-primary-content mb-3 text-center"
          >
            Winner: <span className="text-accent font-bold">{winnerUsername}</span> (
            <span className="text-accent font-bold">{winnerSymbol}</span>)
          </motion.div>
        )}

        {/* Game Board */}
        <div className="flex-grow w-full flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-screen-md h-full bg-primary-content p-4 rounded-xl shadow-xl pr-0">
            <GameBoard board={board} onColumnClick={makeMove} />
          </div>
        </div>
      </main>
    </div>
  );
}
