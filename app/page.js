// app/page.js
"use client";

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/lobby");
}
