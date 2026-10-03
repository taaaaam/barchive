import Auth from "@/components/Auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-green">
      {/* Header */}
      <header className="page-header-enter bg-green relative">
        <div className="relative max-w-7xl mx-auto px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-gray-light font-serif font-semibold text-lg transition-all duration-300 mb-6 group"
          >
            <svg
              className="mr-3 w-6 h-6 transition-transform group-hover:-translate-x-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Go Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-main-enter max-w-4xl mx-auto px-8 py-20">
        <Auth />
      </main>
    </div>
  );
}
