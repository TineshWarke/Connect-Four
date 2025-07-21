# 🎯 Connect-Four

A real-time multiplayer **Connect Four** game built using **Next.js App Router**, **Socket.IO**, **MongoDB**, and **Clerk Auth**. Features include live 1v1 gameplay, bot mode, leaderboard, persistent stats, animations, and a responsive design.

---

## 🚀 Live Demo

🔗 [Play Now](https://connect-four-ql2d.onrender.com/lobby)

---

## 🧠 Features

- 🔐 **Authentication via Clerk**
- 🌐 **Real-time multiplayer gameplay** with Socket.IO
- 🎮 **Turn-based game logic** with persistent board state
- 🧠 **Winner detection** (horizontal, vertical, diagonal)
- 📡 **Socket connection status tracking**
- 💾 **MongoDB persistence** for player statistics
- 🔁 Handles **opponent disconnection gracefully**
- 🧍‍♂️ **Play vs Bot (AI Mode)** for solo gameplay
- 🏆 **Global Leaderboard** (Top players by wins)
- 🎨 **Animations** with Framer Motion
- 📱 **Fully responsive UI** (Tailwind CSS + DaisyUI)

---

## 🧱 Tech Stack

| Layer      | Technologies                                                   |
| ---------- | -------------------------------------------------------------- |
| Frontend   | Next.js (App Router), React, Tailwind CSS, DaisyUI, Clerk Auth |
| Backend    | Node.js, Express, Socket.IO                                    |
| Realtime   | WebSockets using Socket.IO                                     |
| Database   | MongoDB with Mongoose ORM                                      |
| Animations | Framer Motion                                                  |

---

## 🔄 Game Flow

1. User signs in via Clerk.
2. User enters the lobby and:
   - Creates or joins a multiplayer game **OR**
   - Starts a match against the **Bot**
3. Server assigns symbol (X / O) and starts game.
4. Real-time updates via Socket.IO:
   - `makeMove`, `gameState`, `opponentDisconnected`
5. Winner is calculated and stats are updated in MongoDB.
6. Leaderboard updates automatically.

---

## 🏆 Game Logic Overview 

- ✅ Validates move legality and turn order
- 🎯 Calculates win condition:
  - Horizontal
  - Vertical
  - Diagonal
- 🔄 Emits updated game state:
  ```js
  socket.emit("gameState", { board, currentPlayer });
  ```
- 🧠 Bot logic triggered on solo play
- 💡 Handles disconnections and resets

---

## 🏅 Leaderboard

- Live leaderboard showing top players (by win count)
- Data is fetched from MongoDB
- Displayed in `/leaderboard` route

---

## 🤖 Play vs Bot

- Smart Bot takes random valid moves
- Great for practice or offline fun
- Accessible directly from the lobby

---

## 🔧 Installation

### 1. Clone the Repo

```bash
git clone https://github.com/yourusername/connect-four-multiplayer.git
cd connect-four-multiplayer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file:

```env
CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_key
NEXT_PUBLIC_CLERK_FRONTEND_API=your_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key

MONGODB_URI=mongodb+srv://your-mongo-uri
```

### 4. Run the App

```bash
# Start frontend in dev mode
npm run dev
```

Visit [http://localhost:3000/lobby](http://localhost:3000/lobby)

---

## 🧪 Testing Guide

- ✅ Open in two browsers or incognito tabs
- 🆚 Create a room and join using same ID
- 🎮 Play turn by turn, verify sync
- 🧠 Confirm win logic works (4 in a row)
- 📉 Close a tab to test disconnection logic
- 🤖 Try Bot Mode
- 🏆 Visit `/leaderboard` to view rankings

---

## 📌 Future Enhancements

- 💬 In-game Chat
- 🧠 Smarter Bot (Minimax AI)
- ⏳ Session expiration for idle games
- 📊 Detailed player match history
- 🔁 Rematch & Replay system

---

## 👨‍💻 Author

**Tinesh Warke**  
📧 tineshwarke2000@gmail.com  
🔗 [LinkedIn](https://www.linkedin.com/in/tinesh-warke)

---