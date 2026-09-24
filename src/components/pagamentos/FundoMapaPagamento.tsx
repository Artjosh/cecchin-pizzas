"use client";

import { LocationPickerMap } from "../maps/LocationPickerMap";

export function FundoMapaPagamento() {
  return <LocationPickerMap controles={false} onLocationSelect={() => {}} className="absolute inset-0" />;
}
