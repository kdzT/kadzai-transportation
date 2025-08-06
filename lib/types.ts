import { JsonValue } from '@prisma/client/runtime/library';

export interface SeatInput {
    number: string;
    isAvailable?: boolean;
}

export interface SeatLayout {
    rows: number;
    columns: number;
    arrangement: string[][];
}

export interface BusInput {
    operator: string;
    busType: string;
    seatLayout: SeatLayout;
    amenities: string[];
    rating: number;
}

export interface BusTypeInput {
    name: string;
    seats: number;
}

export interface TripInput {
    busId: string;
    from: string;
    to: string;
    date: string; // ISO 8601, e.g., "2025-07-30T00:00:00.000Z"
    departureTime: string; // e.g., "07:00"
    arrivalTime: string; // e.g., "15:00"
    duration: string; // e.g., "8h 0m"
    price: number; // In NGN
    isAvailable?: boolean;
}

export interface TripResponse {
    id: string;
    busId: string;
    from: string;
    to: string;
    date: string; // ISO 8601
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    isAvailable: boolean;
    createdAt: string; // ISO 8601
    bus: {
        id: string;
        operator: string;
        busType: string;
        seatLayout: JsonValue;
        seats: { id: string; number: string; isAvailable: boolean }[];
        amenities: string[];
        rating: number;
    };
}

export interface PassengerInput {
    name: string;
    seat: string; // Seat number, e.g., "1A"
    age: number;
    gender: "male" | "female";
}

export interface BookingInput {
    tripId: string;
    email: string;
    phone: string;
    passengers: PassengerInput[];
    paymentReference?: string; // Paystack reference
    reference: string;
}

export interface BookingResponse {
    reference: string;
    status: string;
    tripId: string;
    busId: string;
    from: string;
    to: string;
    date: string; // e.g., "2025-07-30"
    time: string; // e.g., "07:00"
    operator: string;
    passengers: { id: string; name: string; seat: string }[];
    email: string;
    phone: string;
    totalAmount: number;
    bookingDate: string; // e.g., "2025-07-30"
    createdAt: string; // ISO 8601
    paymentReference?: string; // Paystack reference
    trip: TripResponse;
}

// Type for Prisma Json field
export type SeatLayoutJson = JsonValue;