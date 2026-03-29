
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, MapPin, ChevronRight, X } from 'lucide-react';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

function LocationMarker({ onLocationSelect, initialLocation, position, setPosition }: MapPickerProps & { position: L.LatLng | null, setPosition: (pos: L.LatLng | null) => void }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (initialLocation && !position) {
      const latlng = L.latLng(initialLocation.lat, initialLocation.lng);
      setPosition(latlng);
      map.setView(latlng, 13);
    } else if (!position) {
      map.locate();
    }
  }, [initialLocation, map, position, setPosition]);

  useMapEvents({
    locationfound(e) {
      if (!position && !initialLocation) {
        setPosition(e.latlng);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

// Component to handle map view updates from search
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

export const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? L.latLng(initialLocation.lat, initialLocation.lng) : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const latlng = L.latLng(lat, lng);
    
    setPosition(latlng);
    setMapCenter([lat, lng]);
    onLocationSelect(lat, lng);
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e as any);
              }
            }}
            placeholder="Search for a location..."
            className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-white placeholder:text-slate-600"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Search size={18} />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 text-slate-500 hover:text-slate-300 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => handleSearch(e as any)}
              disabled={isSearching}
              className="p-2 text-indigo-400 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 rounded-xl shadow-xl border border-white/10 z-[1000] overflow-hidden">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => selectResult(result)}
                className="w-full flex items-start gap-3 p-3 hover:bg-white/5 text-left transition-all border-b border-white/5 last:border-0"
              >
                <MapPin size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-slate-200 line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-white/10 shadow-inner relative z-0">
        <MapContainer
          center={initialLocation ? [initialLocation.lat, initialLocation.lng] : [51.505, -0.09]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            onLocationSelect={onLocationSelect} 
            initialLocation={initialLocation} 
            position={position}
            setPosition={setPosition}
          />
          {mapCenter && <ChangeView center={mapCenter} />}
        </MapContainer>
      </div>
    </div>
  );
};
