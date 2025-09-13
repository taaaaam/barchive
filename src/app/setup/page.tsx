"use client";
import { useState } from "react";
import { setupAdmin, createSampleMembers } from "@/lib/setupAdmin";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSetupAdmin = async () => {
    setLoading(true);
    setMessage("");

    try {
      await setupAdmin();
      setMessage(
        "Admin account created successfully! Check console for credentials."
      );
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleMembers = async () => {
    setLoading(true);
    setMessage("");

    try {
      await createSampleMembers();
      setMessage("Sample members created successfully!");
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto p-10 bg-white rounded-2xl shadow-2xl border-2 border-green/20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent rounded-2xl"></div>
        <div className="relative">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-green/5 rounded-full border-2 border-green/30 mb-6">
              <svg
                className="w-10 h-10 text-green"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-dark mb-2">
              BaR Setup
            </h1>
            <p className="text-gray-medium font-light">
              Initial setup for the society blog
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-gray-light rounded-lg border-2 border-green/20">
              <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
                Create Admin Account
              </h3>
              <p className="text-gray-medium mb-4">
                This will create an admin account with email:
                tamvu2104@gmail.com
              </p>
              <button
                onClick={handleSetupAdmin}
                disabled={loading}
                className="w-full py-3 px-6 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </button>
            </div>

            <div className="p-6 bg-gray-light rounded-lg border-2 border-green/20">
              <h3 className="text-xl font-serif font-bold text-gray-dark mb-4">
                Create Sample Members
              </h3>
              <p className="text-gray-medium mb-4">
                This will create sample member accounts for testing
              </p>
              <button
                onClick={handleCreateSampleMembers}
                disabled={loading}
                className="w-full py-3 px-6 bg-green text-white font-semibold rounded-lg hover:bg-green-dark transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Sample Members"}
              </button>
            </div>

            {message && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  message.includes("Error")
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                <p className="font-medium">{message}</p>
              </div>
            )}

            <div className="text-center">
              <a
                href="/login"
                className="inline-flex items-center px-6 py-3 bg-gray-dark text-white font-semibold rounded-lg hover:bg-gray-medium transition-all duration-300"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
