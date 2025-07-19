import { UserButton, useUser } from "@clerk/nextjs";
import React from "react";
import { useSocketStatus } from "../../hooks/useSocketStatus";

const Navbar = () => {
    const { isConnected } = useSocketStatus();
    const { user } = useUser();

    return (
        <nav className="navbar bg-white shadow-md px-6 py-3 rounded-xl">
            {/* Left: User Info + Status */}
            <div className="navbar-start flex items-center gap-3">
                {user?.username && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                            {user.username}
                        </span>
                        <span
                            className={`relative w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"
                                }`}
                            title={isConnected ? "Connected" : "Disconnected"}
                        >
                            {isConnected && (
                                <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Center: Game Branding */}
            <div className="navbar-center">
                <a
                    href="/lobby"
                    className="text-xl font-extrabold text-accent tracking-tight hover:text-secondary transition-colors"
                >
                    🎯 Connect Four
                </a>
            </div>

            {/* Right: Clerk User Button */}
            <div className="navbar-end">
                <UserButton afterSignOutUrl="/" />
            </div>
        </nav>
    );
};

export default Navbar;
