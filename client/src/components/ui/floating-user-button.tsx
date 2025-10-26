import React from "react";
import { useLocation } from "wouter";

type Props = {
  onClick?: () => void;
};

export default function FloatingUserButton({ onClick }: Props) {
  const [location, setLocation] = useLocation();

  const isTripPage = location === "/trip";
  const isVoicePage = location === "/";

  // Don't show on voice agent page
  if (isVoicePage) return null;

  const handleClick = onClick ?? (() => setLocation(isTripPage ? "/home" : "/trip"));

  return (
    <button
      aria-label={isTripPage ? "Back to map" : "Open trips"}
      title={isTripPage ? "Back" : "Trips"}
      onClick={handleClick}
      className={
        "fixed right-6 bottom-6 w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg flex items-center justify-center hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 z-50"
      }
    >
      {isTripPage ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" aria-hidden>
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7"
          aria-hidden
        >
          <path d="M12 12c2.7614 0 5-2.2386 5-5s-2.2386-5-5-5-5 2.2386-5 5 2.2386 5 5 5z" />
          <path d="M4 20c0-3.3137 4.6863-6 8-6s8 2.6863 8 6v1H4v-1z" />
        </svg>
      )}
    </button>
  );
}
