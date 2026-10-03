"use client";
import Link from "next/link";

interface MapLinkProps {
  className?: string;
}

export default function MapLink({ className = "text-white hover:text-gray-light font-medium text-lg transition-colors duration-300" }: MapLinkProps) {
  return (
    <Link href="/map" className={className}>
      Map
    </Link>
  );
}

