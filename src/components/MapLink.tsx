"use client";
import Link from "next/link";

interface MapLinkProps {
  className?: string;
}

export default function MapLink({ className = "text-white hover:text-gray-light font-medium text-lg transition-colors duration-300" }: MapLinkProps) {
  return (
    <Link
      href="/map"
      className={`${className} relative`}
    >
      Map
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 animate-pulse">
        New!
      </span>
    </Link>
  );
}

