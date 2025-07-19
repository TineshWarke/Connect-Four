import { connectToDatabase } from "../../../lib/db";
import Player from "../../../models/Player";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectToDatabase();

  const topPlayers = await Player.find().sort({ wins: -1 }).limit(10);

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  let userData = null;
  let userRank = "-";

  if (username) {
    const allPlayers = await Player.find().sort({ wins: -1 });
    const index = allPlayers.findIndex(p => p.username === username);

    if (index !== -1) {
      userRank = index + 1;
      userData = allPlayers[index];
    } else {
      userData = { username, wins: 0 }; // not found, but show placeholder
    }
  }

  return NextResponse.json({
    topPlayers,
    user: {
      username: userData?.username || username,
      wins: userData?.wins || 0,
      rank: userRank,
    },
  });
}
