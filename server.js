// /server.js
require("dotenv").config();
const mongoose = require("mongoose");
const PlayerModel = require("./models/Player");
const { connectToDatabase } = require("./lib/db");

connectToDatabase().then(() => console.log("MongoDB connected"));

const { createServer } = require("http");
const { Server } = require("socket.io");
const { parse } = require("url");
const next = require("next");
const { v4: uuidv4 } = require("uuid");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

// In-memory data
const queue = [];
const games = {};
const disconnectTimers = {};

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(server);

    // Handle WebSocket connections
    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on("joinQueue", ({ username }) => {
            if (!username) return;

            const existingQueued = queue.find((p) => p.username === username);
            if (existingQueued) return; // Prevent duplicate queuing

            queue.push({ socket, username });

            if (queue.length >= 2) {
                // Match two players
                const player1 = queue.shift();
                const player2 = queue.shift();

                const gameId = uuidv4();
                games[gameId] = {
                    players: {
                        [player1.username]: { symbol: "X", socket: player1.socket },
                        [player2.username]: { symbol: "O", socket: player2.socket },
                    },
                    board: Array(6).fill(null).map(() => Array(7).fill(null)),
                    currentTurn: "X",
                    winner: null,
                };

                player1.socket.emit("joinedGame", { gameId });
                player2.socket.emit("joinedGame", { gameId });
            } else {
                // Wait 10s then start with bot
                socket.emit("waiting");

                setTimeout(() => {
                    // Ensure still in queue
                    const index = queue.findIndex((p) => p.username === username);
                    if (index !== -1) {
                        queue.splice(index, 1); // remove from queue

                        const gameId = uuidv4();
                        const botUsername = "BOT_" + gameId.slice(0, 5);

                        games[gameId] = {
                            players: {
                                [username]: { symbol: "X", socket },
                                [botUsername]: { symbol: "O", socket: null },
                            },
                            board: Array(6).fill(null).map(() => Array(7).fill(null)),
                            currentTurn: "X",
                            winner: null,
                            botActive: true,
                        };

                        socket.emit("joinedGame", { gameId });
                    }
                }, 10000);
            }
        });

        socket.on("joinGame", ({ gameId, username }) => {
            const game = games[gameId];
            if (!game) return;

            const player = game.players[username];
            if (!player) return;

            player.socket = socket;

            // Clear pending forfeit timer
            if (disconnectTimers[username]) {
                clearTimeout(disconnectTimers[username]);
                delete disconnectTimers[username];
            }

            // Emit to the rejoining player
            socket.emit("yourSymbol", player.symbol);
            socket.emit("gameState", {
                board: game.board,
                currentTurn: game.currentTurn,
                winner: game.winner,
                winnerUsername: game.winnerUsername,
                opponent: Object.entries(game.players).find(([uname]) => uname !== username)?.[0],
                opponentDisconnected: !Object.entries(game.players)
                    .find(([uname]) => uname !== username)?.[1]?.socket
            });

            // ✅ Emit to the opponent that the player has reconnected
            const opponentEntry = Object.entries(game.players).find(
                ([uname]) => uname !== username
            );

            if (opponentEntry && opponentEntry[1].socket) {
                opponentEntry[1].socket.emit("gameState", {
                    board: game.board,
                    currentTurn: game.currentTurn,
                    winner: game.winner,
                    winnerUsername: game.winnerUsername,
                    opponent: username,
                    opponentDisconnected: false, // ✅ mark opponent as reconnected
                });
            }
        });

        socket.on("makeMove", ({ gameId, col }) => {
            const game = games[gameId];
            if (!game || game.winner) return;

            const board = game.board;
            const turn = game.currentTurn;

            // Find current player by socket
            const currentPlayer = Object.entries(game.players).find(
                ([, p]) => p.symbol === turn && p.socket === socket
            );
            if (!currentPlayer) return;

            // Find row to drop piece
            let row = -1;
            for (let r = 5; r >= 0; r--) {
                if (!board[r][col]) {
                    row = r;
                    break;
                }
            }
            if (row === -1) return;

            board[row][col] = turn;

            // Check win
            const winner = checkWinner(board, row, col, turn);
            if (winner) {
                game.winner = turn;
                const winnerUsername = Object.entries(game.players).find(
                    ([, p]) => p.symbol === turn
                )[0];

                game.winnerUsername = winnerUsername;

                if (!winnerUsername.startsWith("BOT_")) {
                    PlayerModel.findOneAndUpdate(
                        { username: winnerUsername },
                        { $inc: { wins: 1 } },
                        { upsert: true, new: true }
                    ).catch((err) => console.error("Failed to update leaderboard:", err));
                }
            }

            game.currentTurn = turn === "X" ? "O" : "X";

            // Broadcast game state
            for (const p of Object.values(game.players)) {
                if (p.socket) {
                    p.socket.emit("gameState", {
                        board: game.board,
                        currentTurn: game.currentTurn,
                        winner: game.winner,
                        winnerUsername: game.winnerUsername,
                    });
                }
            }

            // If bot's turn
            if (
                game.botActive &&
                !game.winner &&
                game.currentTurn === "O" &&
                game.players["BOT_" + gameId.slice(0, 5)]
            ) {
                setTimeout(() => {
                    botMove(gameId);
                }, 500);
            }
        });

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);

            for (const [gameId, game] of Object.entries(games)) {
                const username = Object.entries(game.players).find(
                    ([, p]) => p.socket?.id === socket.id
                )?.[0];

                if (!username) continue;

                // Remove socket reference temporarily
                game.players[username].socket = null;

                // 🔥 Emit to opponent immediately
                const opponentEntry = Object.entries(game.players).find(
                    ([uname, p]) => uname !== username && p.socket
                );
                if (opponentEntry) {
                    const [, opponentPlayer] = opponentEntry;
                    opponentPlayer.socket.emit("opponentDisconnected");
                }

                // Start 30-second reconnection window
                disconnectTimers[username] = setTimeout(() => {
                    if (!game.players[username].socket && !game.winner) {
                        // Forfeit the game
                        game.winner = game.players[username].symbol === "X" ? "O" : "X";
                        game.winnerUsername = Object.entries(game.players).find(
                            ([uname, p]) => uname !== username
                        )?.[0];

                        if (!game.winnerUsername.startsWith("BOT_")) {
                            PlayerModel.findOneAndUpdate(
                                { username: game.winnerUsername },
                                { $inc: { wins: 1 } },
                                { upsert: true, new: true }
                            ).catch((err) => console.error("Failed to update leaderboard:", err));
                        }

                        // Notify opponent
                        for (const p of Object.values(game.players)) {
                            if (p.socket) {
                                p.socket.emit("gameState", {
                                    board: game.board,
                                    currentTurn: game.currentTurn,
                                    winner: game.winner,
                                    winnerUsername: game.winnerUsername,
                                });
                            }
                        }
                        console.log(`Game ${gameId}: ${username} forfeited.`);
                    }
                }, 30000);
            }
        });
    });

    server.listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});

// Win check logic
function checkWinner(board, row, col, symbol) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1],
    ];

    for (let [dr, dc] of directions) {
        let count = 1;
        for (let d = 1; d <= 3; d++) {
            const r = row + dr * d;
            const c = col + dc * d;
            if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== symbol) break;
            count++;
        }
        for (let d = 1; d <= 3; d++) {
            const r = row - dr * d;
            const c = col - dc * d;
            if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== symbol) break;
            count++;
        }
        if (count >= 4) return true;
    }
    return false;
}

// Bot move logic
function botMove(gameId) {
    const game = games[gameId];
    if (!game || game.winner || !game.botActive) return;

    const board = game.board.map(row => row.slice()); // deep copy
    const bestMove = getBestMove(board, 6); // depth increased to 6

    if (bestMove !== -1) {
        makeMove(game.board, bestMove, "O", game);
    }
}

function getBestMove(board, depth) {
    let bestScore = -Infinity;
    let move = -1;

    const validMoves = getValidMoves(board);
    // Sort to prioritize center first
    validMoves.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

    for (let col of validMoves) {
        const tempBoard = board.map(row => row.slice());
        const row = dropPiece(tempBoard, col, "O");
        if (row === -1) continue;

        const score = minimax(tempBoard, depth - 1, false, -Infinity, Infinity);
        if (score > bestScore) {
            bestScore = score;
            move = col;
        }
    }

    return move;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
    const winner = getWinnerState(board);
    if (winner === "O") return 100000;
    if (winner === "X") return -100000;
    if (depth === 0 || isBoardFull(board)) return evaluateBoard(board);

    const symbol = isMaximizing ? "O" : "X";
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (let col of getValidMoves(board)) {
        const tempBoard = board.map(row => row.slice());
        const row = dropPiece(tempBoard, col, symbol);
        if (row === -1) continue;

        const score = minimax(tempBoard, depth - 1, !isMaximizing, alpha, beta);

        if (isMaximizing) {
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, bestScore);
        } else {
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, bestScore);
        }

        if (beta <= alpha) break; // alpha-beta pruning
    }

    return bestScore;
}

function evaluateBoard(board) {
    let score = 0;

    function evaluateLine(line) {
        const lineStr = line.join("");
        if (lineStr === "OOOO") return 100000;
        if (lineStr === "XXX") return -100000;

        const count = (str, sub) => (str.match(new RegExp(sub, "g")) || []).length;

        let s = 0;
        s += count(lineStr, "OOO") * 100;
        s += count(lineStr, "OO") * 10;
        s -= count(lineStr, "XXX") * 100;
        s -= count(lineStr, "XX") * 20;
        return s;
    }

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            if (c <= 3) score += evaluateLine([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
            if (r <= 2) score += evaluateLine([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
            if (r <= 2 && c <= 3) score += evaluateLine([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]]);
            if (r <= 2 && c >= 3) score += evaluateLine([board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]]);
        }
    }

    return score;
}

function makeMove(board, col, symbol, game) {
    for (let r = 5; r >= 0; r--) {
        if (!board[r][col]) {
            board[r][col] = symbol;
            if (checkWinner(board, r, col, symbol)) {
                game.winner = symbol;
                const winnerUsername = Object.entries(game.players).find(
                    ([, p]) => p.symbol === symbol
                )?.[0];
                game.winnerUsername = winnerUsername;

                if (!winnerUsername.startsWith("BOT_")) {
                    PlayerModel.findOneAndUpdate(
                        { username: winnerUsername },
                        { $inc: { wins: 1 } },
                        { upsert: true, new: true }
                    ).catch((err) => console.error("Failed to update leaderboard:", err));
                }
            }

            game.currentTurn = symbol === "X" ? "O" : "X";

            for (const p of Object.values(game.players)) {
                if (p.socket) {
                    p.socket.emit("gameState", {
                        board: game.board,
                        currentTurn: game.currentTurn,
                        winner: game.winner,
                        winnerUsername: game.winnerUsername,
                    });
                }
            }
            return;
        }
    }
}

function dropPiece(board, col, symbol) {
    for (let r = 5; r >= 0; r--) {
        if (!board[r][col]) {
            board[r][col] = symbol;
            return r;
        }
    }
    return -1;
}

function getValidMoves(board) {
    const moves = [];
    for (let c = 0; c < 7; c++) {
        if (!board[0][c]) moves.push(c);
    }
    return moves;
}

function isBoardFull(board) {
    return getValidMoves(board).length === 0;
}

function getWinnerState(board) {
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const symbol = board[r][c];
            if (!symbol) continue;

            if (c + 3 < 7 &&
                symbol === board[r][c + 1] &&
                symbol === board[r][c + 2] &&
                symbol === board[r][c + 3]) return symbol;

            if (r + 3 < 6 &&
                symbol === board[r + 1][c] &&
                symbol === board[r + 2][c] &&
                symbol === board[r + 3][c]) return symbol;

            if (c + 3 < 7 && r + 3 < 6 &&
                symbol === board[r + 1][c + 1] &&
                symbol === board[r + 2][c + 2] &&
                symbol === board[r + 3][c + 3]) return symbol;

            if (c - 3 >= 0 && r + 3 < 6 &&
                symbol === board[r + 1][c - 1] &&
                symbol === board[r + 2][c - 2] &&
                symbol === board[r + 3][c - 3]) return symbol;
        }
    }
    return null;
}

function checkWinner(board, row, col, symbol) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            const r = row + dr * i, c = col + dc * i;
            if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== symbol) break;
            count++;
        }
        for (let i = 1; i < 4; i++) {
            const r = row - dr * i, c = col - dc * i;
            if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== symbol) break;
            count++;
        }
        if (count >= 4) return true;
    }
    return false;
}
