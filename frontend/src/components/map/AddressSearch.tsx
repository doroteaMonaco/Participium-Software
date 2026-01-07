import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressSearchProps {
  onLocationSelect: (lat: number, lon: number, zoom: number) => void;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  onLocationSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search for addresses using Nominatim API
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search strictly within Turin city bounds
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            limit: "10",
            countrycodes: "it",
            viewbox: "7.5,45.2,7.85,44.9", // Turin area (lon_min,lat_max,lon_max,lat_min)
            bounded: "1", // Strictly enforce Turin boundaries
            addressdetails: "1",
          }),
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching address:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      searchAddress(value);
    }, 300); // Faster response time like Google Maps
  };

  const handleResultClick = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    onLocationSelect(lat, lon, 16); // Fixed zoom level
    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div
      ref={searchRef}
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-2xl px-4"
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              placeholder="Search for an address or location in Turin..."
              className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white border-none focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-start gap-3 group"
              >
                <MapPin className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 flex-shrink-0 mt-0.5 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {result.display_name.split(",")[0]}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {result.display_name.split(",").slice(1).join(",")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showResults &&
          searchResults.length === 0 &&
          searchQuery.length >= 3 &&
          !isSearching && (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                No locations found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try a different search term or landmark
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

