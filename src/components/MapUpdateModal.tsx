"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function MapUpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only show modal if user is logged in
    if (!user) {
      return;
    }

    // Check if user has chosen to not show again
    const hasDontShowAgain = localStorage.getItem("mapUpdateDontShowAgain");
    if (!hasDontShowAgain) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setIsOpen(true);
      }, 500);
    }
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    if (dontShowAgain) {
      localStorage.setItem("mapUpdateDontShowAgain", "true");
      // Dispatch custom event to update MapLink components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mapUpdateSeen"));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-green/20">
            <h2 className="text-2xl font-serif font-bold text-gray-dark">
              Map Update
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-6 h-6 text-gray-medium"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <p className="text-gray-dark leading-relaxed">
                I'm excited to introduce our new <strong>Map</strong> feature! 
                Now you can see where all our members are located around the world. 
                Set your location in your profile settings to appear on the map.
              </p>
              <p className="text-gray-dark leading-relaxed" >Sincerely, The BaRchiver </p>
              
              <div className="relative w-full rounded-lg overflow-hidden border-2 border-green/20">
                <Image
                  src="/assets/map_update.png"
                  alt="Map Update Preview"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>

              <p className="text-sm text-gray-medium">
                Visit the <Link href="/map" className="text-green hover:text-green-dark font-semibold underline" onClick={handleClose}>Map</Link> page to explore member locations, 
                or update your profile to add your location.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-green/20">
            <div className="flex items-center mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 text-green border-gray-300 rounded focus:ring-green focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-medium">
                  Don't show this again
                </span>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <Link
                href="/map"
                onClick={handleClose}
                className="px-6 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300"
              >
                View Map
              </Link>
              <button
                onClick={handleClose}
                className="px-6 py-3 text-gray-medium hover:text-gray-dark transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

