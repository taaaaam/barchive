"use client";
import { useState, useEffect, useRef } from "react";

interface Location {
  displayName: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: string | Location | null;
  onChange: (location: Location | null) => void;
  placeholder?: string;
}

export default function LocationPicker({
  value,
  onChange,
  placeholder = "Search for a location...",
}: LocationPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize search term from value
  useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        setSearchTerm(value);
      } else if (value.displayName) {
        setSearchTerm(value.displayName);
      }
    } else {
      setSearchTerm("");
    }
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchLocation = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Use Nominatim API (OpenStreetMap) for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "BaRchive Location Picker",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    searchLocation(newValue);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const location: Location = {
      displayName: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };
    setSearchTerm(suggestion.display_name);
    setShowSuggestions(false);
    onChange(location);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-1 border border-green/30 rounded focus:ring-2 focus:ring-green focus:border-green bg-white text-gray-dark"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green border-t-transparent"></div>
          </div>
        )}
        {searchTerm && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg
              className="w-4 h-4"
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
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-green/10 transition-colors border-b border-gray-100 last:border-b-0"
              type="button"
            >
              <div className="font-medium text-gray-900">
                {suggestion.display_name.split(",")[0]}
              </div>
              <div className="text-sm text-gray-500">
                {suggestion.display_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length >= 3 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No locations found
        </div>
      )}
    </div>
  );
}

