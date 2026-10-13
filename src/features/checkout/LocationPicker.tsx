import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

export type Pin = { lat: number; lng: number }

// CSS-drawn markers: no image files to bundle, and nothing for the CSP to block.
const customerIcon = L.divIcon({ className: '', html: '<span class="map-pin"></span>', iconSize: [28, 28], iconAnchor: [14, 28] })
const branchIcon = L.divIcon({ className: '', html: '<span class="map-branch"></span>', iconSize: [20, 20], iconAnchor: [10, 10] })

const tiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function ClickToPlace({ onChange }: { onChange: (pin: Pin) => void }) {
  useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) })
  return null
}

// Moves the map when the pin comes from "use my location", not from a tap on the map.
function FollowPin({ pin, version }: { pin: Pin | null; version: number }) {
  const map = useMap()
  useEffect(() => {
    if (pin && version > 0) map.setView(pin, 16)
  }, [map, pin, version])
  return null
}

function CentreButton({ onChange }: { onChange: (pin: Pin) => void }) {
  const { t } = useTranslation()
  const map = useMap()
  const button = useRef<HTMLButtonElement>(null)
  // Otherwise the tap also reaches the map underneath and drops the pin where the button is.
  useEffect(() => {
    if (button.current) L.DomEvent.disableClickPropagation(button.current)
  }, [])
  return (
    <button
      ref={button}
      type="button"
      onClick={() => {
        const { lat, lng } = map.getCenter()
        onChange({ lat, lng })
      }}
      className="absolute bottom-3 start-3 z-[1000] rounded-control border border-ink-muted bg-raised px-3 py-2 text-sm font-bold"
    >
      {t('checkout.pinAtCentre')}
    </button>
  )
}

export function LocationPicker({
  branch,
  radiusKm,
  pin,
  onChange,
}: {
  branch: Pin
  radiusKm: number
  pin: Pin | null
  onChange: (pin: Pin) => void
}) {
  const { t } = useTranslation()
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState(false)
  const [followVersion, setFollowVersion] = useState(0)

  function locateMe() {
    setLocating(true)
    setLocationError(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude })
        setFollowVersion((v) => v + 1)
      },
      () => {
        setLocating(false)
        setLocationError(true)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className="mb-3 rounded-control bg-brand px-4 py-2 font-bold text-ink hover:bg-peach disabled:opacity-60"
      >
        {locating ? t('checkout.locating') : t('checkout.useMyLocation')}
      </button>
      {locationError && <p role="alert" className="mb-3 text-sm text-danger">{t('checkout.locationError')}</p>}

      {/* Leaflet lays out tiles left-to-right; the map itself never flips in Urdu. */}
      <div dir="ltr" className="relative h-80 overflow-hidden rounded-card border border-line">
        <MapContainer center={pin ?? branch} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer url={tiles} attribution={attribution} />
          <Circle center={branch} radius={radiusKm * 1000} className="map-delivery-area" />
          <Marker position={branch} icon={branchIcon} interactive={false} />
          {pin && (
            <Marker
              position={pin}
              icon={customerIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const { lat, lng } = (event.target as L.Marker).getLatLng()
                  onChange({ lat, lng })
                },
              }}
            />
          )}
          <ClickToPlace onChange={onChange} />
          <FollowPin pin={pin} version={followVersion} />
          <CentreButton onChange={onChange} />
        </MapContainer>
      </div>
      <p className="mt-2 text-sm text-ink-muted">{t('checkout.mapHelp')}</p>
    </div>
  )
}

// Read-only map of the delivery area for the home page.
// radiusKm 0 shows just the restaurant (contact page).
export function DeliveryAreaMap({ branch, radiusKm, zoom = 11 }: { branch: Pin; radiusKm: number; zoom?: number }) {
  return (
    <div dir="ltr" className="h-72 overflow-hidden rounded-card border border-line">
      <MapContainer center={branch} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={tiles} attribution={attribution} />
        {radiusKm > 0 && <Circle center={branch} radius={radiusKm * 1000} className="map-delivery-area" />}
        <Marker position={branch} icon={branchIcon} interactive={false} />
      </MapContainer>
    </div>
  )
}
