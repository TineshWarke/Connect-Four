// socket.js
"use client";
import { io } from "socket.io-client";

// Automatically connects to server at same origin
export const socket = io();
