import dotenv from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";

dotenv.config(); // Load environment variables from .env file

const channelName = "game-moves",
  playerX = "X",
  playerO = "O";

let gameState = {
  board: Array(9).fill(null),
  next: playerX,
};

function resetGame() {
  gameState = {
    board: Array(9).fill(null),
    next: playerX,
  };
}

function calculateWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const pubClient = createClient(); // Redis Publisher Client
const subClient = createClient(); // Redis Subscriber Client
await pubClient.connect();
await subClient.connect();

await subClient.subscribe(channelName, (message) => {
  gameState = JSON.parse(message);
  io.emit("gameState", gameState);
});

io.on("connection", (socket) => {
  console.log("New player connected:", socket.id);

  // Send the current game state to the newly connected client
  socket.emit("gameState", gameState);

  socket.on("makeMove", (index) => {
    // Prevent making a move if cell is already taken or game is over
    if (gameState.board[index] || calculateWinner(gameState.board)) return;

    // Update the board and switch turns
    gameState.board[index] = gameState.next === playerX ? playerX : playerO;
    gameState.next = gameState.next === playerX ? playerO : playerX;

    // Publish the updated game state to Redis
    pubClient.publish("game-moves", JSON.stringify(gameState));
    io.emit("gameState", gameState);
  });

  socket.on("restartGame", () => {
    resetGame();
    io.emit("gameState", gameState);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on ${process.env.PORT}`);
});
