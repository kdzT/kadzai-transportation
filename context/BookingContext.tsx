"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useState,
} from "react";

export interface Seat {
  id: string;
  number: string;
  isAvailable: boolean;
  isSelected: boolean;
  type: "regular" | "premium" | "driver";
  price?: number;
}

export interface BusType {
  id: string;
  name: string;
  seats: number;
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
  seatLayout?: SeatLayoutJson;
  seats: Seat[];
  amenities: string[];
  rating: number;
}

export interface Trip {
  id: string;
  busId: string;
  from: string;
  to: string;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: string;
  isAvailable: boolean;
  createdAt?: string;
  bus?: Bus;
  createdBy: string;
  modifiedBy: string;
}

export interface Passenger {
  name: string;
  seat: string;
  age: number;
  gender: "male" | "female";
}

export interface StorePassenger {
  id: string;
  name: string;
  age: number;
  seat: string;
  gender: "male" | "female";
}

export interface UIPassenger {
  name: string;
  phone: string;
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
  date: string;
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

export interface Contact {
  email: string;
  phone: string;
}

export interface BookingState {
  step: number;
  searchData: {
    from: string;
    to: string;
    date: string;
    passengers: number;
  };
  selectedTrip: Trip | null;
  selectedBus: Bus | null;
  selectedSeats: Seat[];
  passengers: Passenger[];
  totalAmount: number;
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  contact: Contact | null; // Added contact
}

type BookingAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_SEARCH_DATA"; payload: Partial<BookingState["searchData"]> }
  | { type: "SET_SELECTED_TRIP"; payload: Trip }
  | { type: "SET_SELECTED_BUS"; payload: Bus }
  | { type: "TOGGLE_SEAT"; payload: Seat }
  | { type: "SET_PASSENGERS"; payload: Passenger[] }
  | { type: "ADD_BOOKING"; payload: Booking }
  | {
      type: "CANCEL_BOOKING";
      payload: { reference: string; busId: string; seatNumbers: string[] };
    }
  | { type: "RESET_BOOKING" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
  | { type: "SET_CONTACT_INFO"; payload: Contact }; // Added SET_CONTACT_INFO

const initialState: BookingState = {
  step: 1,
  searchData: { from: "", to: "", date: "", passengers: 1 },
  selectedTrip: null,
  selectedBus: null,
  selectedSeats: [],
  passengers: [],
  totalAmount: 0,
  bookings: [],
  isLoading: false,
  error: null,
  contact: null, // Initialize contact as null
};

function bookingReducer(
  state: BookingState,
  action: BookingAction
): BookingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_SEARCH_DATA":
      return {
        ...state,
        searchData: { ...state.searchData, ...action.payload },
      };
    case "SET_SELECTED_TRIP":
      return { ...state, selectedTrip: action.payload, selectedSeats: [] };
    case "SET_SELECTED_BUS":
      return { ...state, selectedBus: action.payload };
    case "TOGGLE_SEAT":
      const seatExists = state.selectedSeats.find(
        (s) => s.id === action.payload.id
      );
      const newSelectedSeats = seatExists
        ? state.selectedSeats.filter((s) => s.id !== action.payload.id)
        : [...state.selectedSeats, action.payload];
      const totalAmount =
        newSelectedSeats.length * (state.selectedTrip?.price || 0);
      return { ...state, selectedSeats: newSelectedSeats, totalAmount };
    case "SET_PASSENGERS":
      return { ...state, passengers: action.payload };
    case "ADD_BOOKING":
      return { ...state, bookings: [...state.bookings, action.payload] };
    case "CANCEL_BOOKING":
      return {
        ...state,
        bookings: state.bookings.map((booking) =>
          booking.reference === action.payload.reference
            ? { ...booking, status: "cancelled" }
            : booking
        ),
        selectedBus:
          state.selectedBus?.id === action.payload.busId
            ? {
                ...state.selectedBus,
                seats: state.selectedBus.seats.map((seat) =>
                  action.payload.seatNumbers.includes(seat.number)
                    ? { ...seat, isAvailable: true }
                    : seat
                ),
              }
            : state.selectedBus,
      };
    case "RESET_BOOKING":
      return { ...initialState, bookings: state.bookings };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.payload };
    case "SET_CONTACT_INFO":
      return { ...state, contact: action.payload }; // Handle SET_CONTACT_INFO
    default:
      return state;
  }
}

interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  fetchTrips: (params: {
    from?: string;
    to?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }) => Promise<Trip[]>;
  fetchTrip: (tripId: string) => Promise<Trip>;
  fetchBooking: (reference: string) => Promise<Booking>;
  createBooking: (data: {
    tripId: string;
    email: string;
    phone: string;
    passengers: Passenger[];
    paymentReference?: string;
  }) => Promise<Booking>;
}

const BookingContext = createContext<BookingContextType | null>(null);

const BusTypeContext = createContext<{
  busTypes: BusType[];
  setBusTypes: React.Dispatch<React.SetStateAction<BusType[]>>;
} | null>(null);

// Helper function for API calls
const apiCall = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(errorData.error?.message || "Request failed");
  }

  return response.json();
};

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const [busTypes, setBusTypes] = useState<BusType[]>([
    { id: "1", name: "Standard", seats: 48 },
    { id: "2", name: "Luxury", seats: 32 },
  ]);

  const fetchTrips = async (params: {
    from?: string;
    to?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Trip[]> => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      const response = await apiCall(
        `/api/trips/user${queryString ? `?${queryString}` : ""}`
      );
      return response.data;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchTrip = async (tripId: string): Promise<Trip> => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const trip = await apiCall(`/api/trips/user/${tripId}`);
      dispatch({ type: "SET_SELECTED_TRIP", payload: trip });
      dispatch({ type: "SET_SELECTED_BUS", payload: trip.bus });
      return trip;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const fetchBooking = async (reference: string): Promise<Booking> => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const booking = await apiCall(`/api/bookings/user/${reference}`);
      dispatch({ type: "SET_BOOKINGS", payload: [booking] });
      return booking;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const createBooking = async (data: {
    tripId: string;
    email: string;
    phone: string;
    passengers: Passenger[];
    paymentReference?: string;
  }): Promise<Booking> => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const booking = await apiCall("/api/bookings/user", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          status: "confirmed",
        }),
      });
      dispatch({ type: "ADD_BOOKING", payload: booking });
      dispatch({ type: "RESET_BOOKING" });
      return booking;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: (error as Error).message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  return (
    <BookingContext.Provider
      value={{
        state,
        dispatch,
        fetchTrips,
        fetchTrip,
        fetchBooking,
        createBooking,
      }}
    >
      <BusTypeContext.Provider value={{ busTypes, setBusTypes }}>
        {children}
      </BusTypeContext.Provider>
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}

export function useBusTypes() {
  const context = useContext(BusTypeContext);
  if (!context) {
    throw new Error("useBusTypes must be used within a BookingProvider");
  }
  return context;
}
