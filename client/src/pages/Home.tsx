import React, { useState, useEffect } from "react";
import { TripForm } from "@/components/TripForm";
import { Timeline } from "@/components/Timeline";
import { TravelMap } from "@/components/TravelMap";
import { EmptyState } from "@/components/EmptyState";
import { generateMockItinerary } from "@/lib/mockData";
import type { Itinerary } from "@shared/schema";

export default function Home() {
  // Initialize by checking localStorage first, then fall back to default
  const [itinerary, setItinerary] = useState<Itinerary | null>(() => {
    try {
      const raw = localStorage.getItem("itineraries");
      const arr: Itinerary[] = raw ? JSON.parse(raw) : [];
      // Return the most recent itinerary if available
      if (arr.length > 0) {
        console.log("📍 Loading most recent itinerary from localStorage:", arr[0]);
        return arr[0];
      }
    } catch (e) {
      console.error("Failed to load itinerary from localStorage:", e);
    }
    // Fall back to default Paris itinerary
    console.log("📍 No saved itinerary, using default Paris trip");
    return generateMockItinerary("Paris", "2025-11-01", "2025-11-05");
  });
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (location: string, startDate: string, endDate: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location, startDate, endDate }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate itinerary: ${response.statusText}`);
      }

      const data = await response.json();
      setItinerary(data);
      // Save to itineraries list in localStorage (most-recent-first)
      try {
        const raw = localStorage.getItem("itineraries");
        const arr: Itinerary[] = raw ? JSON.parse(raw) : [];
        const deduped = arr.filter(a => a.id !== data.id);
        localStorage.setItem("itineraries", JSON.stringify([data, ...deduped]));
      } catch (e) {
        /* ignore */
      }
    } catch (err: any) {
      console.error("Error generating itinerary:", err);
      setError(err.message || "Failed to generate itinerary");
      // Fall back to mock data on error
      const mockItinerary = generateMockItinerary(location, startDate, endDate);
      setItinerary(mockItinerary);
      try {
        const raw = localStorage.getItem("itineraries");
        const arr: Itinerary[] = raw ? JSON.parse(raw) : [];
        const deduped = arr.filter(a => a.id !== mockItinerary.id);
        localStorage.setItem("itineraries", JSON.stringify([mockItinerary, ...deduped]));
      } catch (e) { /* ignore */ }
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure the default itinerary is present in the stored itineraries list on mount
  useEffect(() => {
    // Check localStorage for the most recent itinerary
    const loadLatestItinerary = () => {
      try {
        const raw = localStorage.getItem("itineraries");
        const arr: Itinerary[] = raw ? JSON.parse(raw) : [];
        if (arr.length > 0) {
          console.log("🔄 Loading latest itinerary:", arr[0].location);
          setItinerary(arr[0]);
        } else if (itinerary) {
          // Save current itinerary if none exist
          localStorage.setItem("itineraries", JSON.stringify([itinerary]));
        }
      } catch (e) {
        console.error("Failed to initialize itineraries", e);
      }
    };

    loadLatestItinerary();

    // Listen for storage events (when another tab/component updates localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "itineraries") {
        console.log("🔄 Storage changed, reloading itinerary...");
        loadLatestItinerary();
      }
    };

    // Listen for custom itinerary update event (same tab)
    const handleItineraryUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log("🎉 New itinerary received:", customEvent.detail);
      setItinerary(customEvent.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("itineraryUpdated", handleItineraryUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("itineraryUpdated", handleItineraryUpdate);
    };
  }, []);

  const hoveredEvent = hoveredEventId 
    ? itinerary?.events.find(e => e.id === hoveredEventId) 
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Full screen map background */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {itinerary ? (
          <>
            {/* Map takes full screen - behind all panels */}
            <main className="absolute inset-0 bg-muted overflow-hidden z-0">
              <TravelMap 
                events={itinerary.events}
                hoveredEvent={hoveredEvent}
              />
            </main>

            {/* Floating top search panel with enhanced glassmorphism - right aligned */}
            <div className="absolute top-3 right-4 z-50 w-full max-w-4xl pointer-events-none">
              <div className="bg-card/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-border/50 pointer-events-auto scale-in floating">
                <TripForm onGenerate={handleGenerate} isLoading={isLoading} />
              </div>
            </div>

            {/* Floating left panel with enhanced styling */}
            <div className="absolute left-4 top-20 bottom-4 z-40 w-full max-w-[340px] lg:max-w-[380px] pointer-events-none">
              <div className="h-full bg-card/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden pointer-events-auto scale-in">
                {/* Gradient overlay at top */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-10"></div>
                
                <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                  <Timeline 
                    events={itinerary.events}
                    onEventHover={setHoveredEventId}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <main className="flex-1 overflow-hidden">
            <EmptyState />
          </main>
        )}
      </div>
    </div>
  );
}
