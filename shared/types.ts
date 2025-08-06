// shared/types.ts
export interface Seat {
    id: string;
    number: string;
    isAvailable: boolean;
    isSelected: boolean; // UI-specific
    type: "regular" | "premium" | "driver"; // UI-specific, optional
    price?: number; // Optional for store, required for UI calculations
}

export interface SeatLayoutJson {
    rows: number;
    columns: number;
    arrangement: string[][];
}

export interface Bus {
    id: string;
    operator: string;
    busType: string;
    seatLayout?: SeatLayoutJson; // Store-specific, optional for UI
    seats: Seat[];
    amenities: string[];
    rating: number;
}

export interface Trip {
    id: string;
    busId: string;
    from: string;
    to: string;
    date: Date; // Unified as Date, convert in API layer
    departureTime: string;
    arrivalTime: string;
    price: number;
    duration: string; // Required field
    isAvailable: boolean;
    createdAt?: string; // Store-specific, optional
    bus?: Bus; // Store-specific, optional
    createdBy: string;
    modifiedBy: string;
}

export interface BusType {
    id: string;
    name: string;
    seats: number;
}

// Passenger types - keep separate as they serve different purposes
export interface StorePassenger {
    id: string;
    name: string;
    seat: string;
    age: number;
    gender: "male" | "female";
}

export interface UIPassenger {
    firstName: string;
    lastName: string;
    age: number;
    gender: "male" | "female";
}

export interface Booking {
    reference: string;
    status: "confirmed" | "cancelled" | "completed" | string;
    tripId: string;
    busId: string;
    from: string;
    to: string;
    date: string; // Keep as string for API compatibility
    time: string;
    operator: string;
    passengers: StorePassenger[];
    email: string;
    phone: string;
    totalAmount: number;
    bookingDate: string;
    createdAt?: string;
    paymentReference?: string;
    trip?: Trip;
}