import React, { useEffect, useState } from "react";
import type { Itinerary } from "@shared/schema";

function EventRow({ event }: { event: Itinerary["events"][number] }) {
  return (
    <div className="p-4 border rounded-lg bg-card/80 border-border mb-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{event.title}</h3>
          <p className="text-sm text-muted-foreground">{event.time} • {event.location}</p>
        </div>
        <div className="text-sm text-muted-foreground">{event.duration}</div>
      </div>
      {event.description && (
        <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
      )}
    </div>
  );
}

function TripRow({ trip, onClick }: { trip: Itinerary; onClick: (t: Itinerary) => void }) {
  return (
    <button
      onClick={() => onClick(trip)}
      className="w-full text-left p-4 rounded-lg border border-border bg-card/80 hover:shadow-md transition-shadow mb-3"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{trip.location}</h3>
          <p className="text-sm text-muted-foreground">{trip.startDate} — {trip.endDate}</p>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{trip.events[0]?.title ?? "No events"}</p>
        </div>
        <div className="text-xs text-muted-foreground">{trip.events.length} events</div>
      </div>
    </button>
  );
}

export default function TripRecord() {
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [selected, setSelected] = useState<Itinerary | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("itineraries");
      const arr: Itinerary[] = raw ? JSON.parse(raw) : [];
      setTrips(arr);
    } catch (e) {
      console.error("Failed to read itineraries", e);
    }
  }, []);

  const openTrip = (t: Itinerary) => {
    setSelected(t);
    // small timeout to ensure the selected is set before opening for smoother animation
    requestAnimationFrame(() => setOpen(true));
  };

  const closePanel = () => {
    setOpen(false);
    // clear selected after animation completes
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <div className="h-full min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Saved Trip Plans</h1>
          <p className="text-sm text-muted-foreground">Click a trip to view the itinerary. The itinerary will slide in from the right.</p>
        </header>

        <section>
          {trips.length === 0 ? (
            <div className="p-6 bg-card/80 rounded-md border border-border">
              <p className="text-muted-foreground">No saved trips yet. Generate a trip on the home page to save it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1">
              {trips.map((t) => (
                <TripRow key={t.id} trip={t} onClick={openTrip} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sliding side panel */}
      {/* backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closePanel}
        aria-hidden
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-card/95 shadow-2xl border-l border-border transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-labelledby="itinerary-title"
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 id="itinerary-title" className="text-lg font-semibold">Itinerary</h2>
          <button onClick={closePanel} className="text-sm text-muted-foreground px-2 py-1 hover:bg-muted rounded">
            Close
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {selected ? (
            <div>
              <header className="mb-4">
                <h3 className="text-xl font-bold">{selected.location}</h3>
                <p className="text-sm text-muted-foreground">{selected.startDate} — {selected.endDate}</p>
              </header>

              <div className="space-y-3">
                {selected.events.map((ev) => (
                  <EventRow key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Select a trip to view details</div>
          )}
        </div>
      </aside>
    </div>
  );
}
