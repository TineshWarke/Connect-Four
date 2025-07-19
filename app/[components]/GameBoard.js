"use client";

import { motion } from "framer-motion";

export default function GameBoard({ board, onColumnClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-rows-6 gap-1 sm:gap-2 w-full h-full max-h-full"
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-7 gap-1 sm:gap-2 w-full h-full">
          {row.map((cell, colIndex) => (
            <motion.div
              key={colIndex}
              onClick={() => onColumnClick(colIndex)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-[80%] aspect-square bg-yellow-200 rounded-full shadow-inner flex justify-center items-center cursor-pointer transition-transform"
            >
              {cell && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-[75%] h-[75%] rounded-full shadow-md ${
                    cell === "X"
                      ? "bg-gradient-to-br from-red-500 to-red-700"
                      : "bg-gradient-to-br from-green-500 to-green-700"
                  }`}
                />
              )}
            </motion.div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
