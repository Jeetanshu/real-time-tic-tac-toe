import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { X, Circle } from "lucide-react";

import "./App.css";

const socket = io("http://localhost:8000");

function App() {
  const playerX = "X";

  const [gameState, setGameState] = useState({
    board: Array(9).fill(null),
    next: playerX,
    winner: null,
  });

  useEffect(() => {
    socket.on("gameState", (state) => {
      setGameState(state);
    });

    return () => socket.off("gameState");
  }, []);

  const handleClick = (index) => {
    if (gameState.board[index] || gameState.winner) return;
    socket.emit("makeMove", index);
  };

  const renderCell = (index) => (
    <button key={index} onClick={() => handleClick(index)} className="cell">
      {gameState.board[index] === "X" && <X className="icon x-icon" />}
      {gameState.board[index] === "O" && <Circle className="icon o-icon" />}
    </button>
  );

  return (
    <div className="container">
      <div className="header">
        <h1>Multiplayer Tic-tac-toe</h1>
        <p>Current player: {gameState.next}</p>
      </div>

      <div className="board">{[...Array(9)].map((_, i) => renderCell(i))}</div>
      <button
        className="restart-button"
        onClick={() => socket.emit("restartGame")}
      >
        Restart Game
      </button>
    </div>
  );
}

export default App;
