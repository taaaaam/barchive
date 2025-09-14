"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface ProfileDropdownProps {
  username?: string;
  profilePicture?: string;
  isAdmin?: boolean;
}

export default function ProfileDropdown({
  username,
  profilePicture,
  isAdmin = false,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 group"
      >
        <span className="font-medium text-lg">Profile</span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-green/20 overflow-hidden z-50">
          {/* Profile Info Header */}
          <div className="px-4 py-3 bg-green/5 border-b border-green/10">
            <div className="flex items-center space-x-3">
              {profilePicture ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green/20">
                  <Image
                    src={profilePicture}
                    alt={username || "Profile"}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-green/10 border-2 border-green/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-dark text-sm">
                  {username || "User"}
                </p>
                <p className="text-xs text-gray-medium">BaRchive Member</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/profile"
              className="flex items-center px-4 py-3 text-gray-dark hover:bg-green/5 transition-colors duration-200 group"
              onClick={() => setIsOpen(false)}
            >
              <svg
                className="w-5 h-5 text-green mr-3 group-hover:text-green-dark transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="font-medium">Edit Profile</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center px-4 py-3 text-gray-dark hover:bg-blue-50 transition-colors duration-200 group"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="w-5 h-5 text-blue-600 mr-3 group-hover:text-blue-700 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="font-medium">Admin Dashboard</span>
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-gray-dark hover:bg-red-50 transition-colors duration-200 group"
            >
              <svg
                className="w-5 h-5 text-red-500 mr-3 group-hover:text-red-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
