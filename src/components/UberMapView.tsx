import React, { useState, useEffect, useRef } from 'react';
import { Job } from '../types';
import { MapPin, Navigation, Radio, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface UberMapViewProps {
  isOnline: boolean;
  activeJob: Job | null;
  incomingJob: Job | null;
  suggestedJob?: Job | null;
  onSelectSite?: (job: Job) => void;
  workerTradeName: string;
  hasArrived?: boolean;
  customLocationText?: string;
  onPositionChange?: (locationName: string) => void;
}

export const UberMapView: React.FC<UberMapViewProps> = ({
  isOnline,
  activeJob,
  incomingJob,
  suggestedJob,
  onSelectSite,
  workerTradeName,
  hasArrived = false,
  customLocationText,
  onPositionChange,
}) => {
  const currentTargetJob = activeJob || incomingJob;
  const displayPreviewJob = suggestedJob || null;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => { onPositionChangeRef.current = onPositionChange; }, [onPositionChange]);

  // This is a schematic map, so derive a stable, job-specific destination from its site name.
  const siteHash = Array.from(currentTargetJob?.siteName || 'Work Site').reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  const destination = {
    x: 70 + (siteHash % 250),
    y: 75 + (Math.floor(siteHash / 251) % 165),
  };

  // Route from the worker's schematic origin to this job's distinct site marker.
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>(
    hasArrived ? { x: 260, y: 140 } : { x: 200, y: 310 }
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [liveStreetName, setLiveStreetName] = useState<string>('');

  // Route labels and turns are tied to the selected job's landmark/address.
  const routeWaypoints = [
    { x: 200, y: 310, street: 'Departed Indiranagar Base' },
    { x: 200 + (destination.x - 200) * 0.28, y: 310 + (destination.y - 310) * 0.28, street: currentTargetJob?.locationAddress.split(',')[0] || 'Along the route' },
    { x: 200 + (destination.x - 200) * 0.58, y: 310 + (destination.y - 310) * 0.58, street: currentTargetJob?.landmark || 'Approaching the site' },
    { x: destination.x - 12, y: destination.y + 18, street: currentTargetJob?.landmark || 'Near the job site' },
    { x: destination.x, y: destination.y, street: currentTargetJob?.siteName || 'Work Site Point' },
  ];

  // AUTOMATIC DOT MOVEMENT TO WORK SITE WHEN JOB IS SELECTED
  useEffect(() => {
    if (!activeJob) {
      // No active job: stay at base
      setDotPos({ x: 200, y: 310 });
      setLiveStreetName('');
      setCurrentStepIndex(0);
      return;
    }

    if (hasArrived) {
      // Already arrived on site: lock to site point
      setDotPos(destination);
      setLiveStreetName(activeJob.siteName);
      return;
    }

    setDotPos({ x: 200, y: 310 });
    setCurrentStepIndex(0);
    setLiveStreetName('Departed Indiranagar Base');

    // When job is active and en route: automatically advance dot step-by-step to the work site
    const moveTimer = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        // Keep the worker en route until they explicitly confirm arrival.
        if (prevIndex >= routeWaypoints.length - 2) return prevIndex;
        const nextIndex = Math.min(prevIndex + 1, routeWaypoints.length - 2);
        const nextWp = routeWaypoints[nextIndex];
        setDotPos({ x: nextWp.x, y: nextWp.y });
        setLiveStreetName(nextWp.street);
        onPositionChangeRef.current?.(nextWp.street);
        return nextIndex;
      });
    }, 1400);

    return () => clearInterval(moveTimer);
  }, [activeJob?.id, hasArrived]);

  // Determine current location chip text
  const locationLabel = customLocationText 
    ? customLocationText
    : hasArrived && activeJob
      ? activeJob.siteName
      : liveStreetName
        ? liveStreetName
        : activeJob
          ? `Moving to ${activeJob.siteName}`
          : 'Indiranagar Sector 4';

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden select-none bg-[#f1f1f1]" style={{ backgroundImage: "url('/figma/map_raw_1.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Route, worker position, and destination are drawn over the Figma map asset. */}
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {currentTargetJob && (
          <polyline
            points={routeWaypoints.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 7"
            opacity="0.8"
          />
        )}

        {/* Job-specific destination pin */}
        {currentTargetJob && (
          <g transform={`translate(${destination.x}, ${destination.y})`}>
            <circle cx="0" cy="0" r="16" fill={hasArrived ? "#10b981" : "#2563eb"} opacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="10" fill={hasArrived ? "#10b981" : "#2563eb"} opacity="0.25" />
            <circle cx="0" cy="0" r="5.5" fill={hasArrived ? "#10b981" : "#2563eb"} stroke="#ffffff" strokeWidth="2" />
          </g>
        )}

        {/* AUTOMATIC MOVING WORKER POSITION DOT (Glides along route to site point) */}
        <g 
          transform={`translate(${dotPos.x}, ${dotPos.y})`} 
          className="transition-transform duration-1000 ease-in-out"
        >
          {isOnline ? (
            <>
              <circle cx="0" cy="0" r="26" fill={hasArrived ? "#10b981" : "#3b82f6"} opacity="0.2" className="animate-ping" />
              <circle cx="0" cy="0" r="16" fill={hasArrived ? "#10b981" : "#3b82f6"} opacity="0.3" />
              <circle cx="0" cy="0" r="9" fill={hasArrived ? "#10b981" : "#2563eb"} stroke="#ffffff" strokeWidth="2.5" />
              <polygon points="0,-14 4,-8 -4,-8" fill={hasArrived ? "#10b981" : "#2563eb"} />
            </>
          ) : (
            <circle cx="0" cy="0" r="9" fill="#94a3b8" stroke="#ffffff" strokeWidth="2.5" />
          )}
        </g>
      </svg>

      {/* Floating Dynamic GPS Location Card */}
      {(activeJob || incomingJob) && <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-sm max-w-[270px] truncate animate-in fade-in">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          hasArrived 
            ? 'bg-emerald-500 animate-pulse' 
            : activeJob 
              ? 'bg-blue-600 animate-pulse' 
              : isOnline
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-slate-300'
        }`} />
        <span className="text-[11px] font-bold text-neutral-800 truncate">
          {hasArrived ? `📍 ${locationLabel}` : activeJob ? `🚗 ${locationLabel}` : locationLabel}
        </span>
      </div>}

      {/* Floating Job Match Pin Card */}
      {isOnline && !currentTargetJob && displayPreviewJob && (
        <div 
          onClick={() => onSelectSite?.(displayPreviewJob)}
          className="absolute top-14 right-4 z-10 bg-white shadow-md rounded-2xl p-3 max-w-[170px] animate-in fade-in cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
            <span>{displayPreviewJob.distanceKm} km away</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold">Matched</span>
          </div>
          <span className="text-xs font-black text-neutral-900 block truncate">{displayPreviewJob.title}</span>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="font-black text-blue-900 font-mono">₹{displayPreviewJob.agreedAmount} task pay</span>
            <span className="text-[10px] font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-md">View</span>
          </div>
        </div>
      )}
    </div>
  );
};
