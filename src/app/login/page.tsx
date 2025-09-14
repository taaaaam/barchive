import Auth from "@/components/Auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-light to-white">
      {/* Header */}
      <header className="bg-green shadow-2xl border-b-4 border-green-light relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-90"></div>
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
          <div className="text-center">
            <h1 className="text-5xl font-serif font-bold text-white mb-4">
              The BaRchive
            </h1>
            <p className="text-white/80 text-xl font-light">
              Enter the distinguished realm of knowledge
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-20">
        <Auth />
      </main>

      {/* Footer */}
      <footer className="bg-green text-white mt-32 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green via-green-dark to-green opacity-95"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-16">
          <div className="text-center">
            <h3 className="text-3xl font-serif font-bold mb-6">The BaRchive</h3>
            <p className="text-gold/80 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
              Preserving the wisdom of Yale's coolest society
            </p>

            <p className="text-gold/60 font-serif">
              &copy; 2025 BaR. Est. 2011. Built with Next.js, Tailwind CSS &
              Firebase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
