import { create } from 'zustand';

// Types
type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    createdAt: string;
    isActive: boolean;
    createdBy: string | null;
    modifiedBy: string | null;
};

type SeatLayoutJson = {
    rows: number;
    columns: number;
    arrangement: string[][];
};

type Seat = {
    id: string;
    number: string;
    isAvailable: boolean;
    isSelected: boolean;
    type: "regular" | "premium" | "driver";
    price?: number;
};

type Bus = {
    id: string;
    operator: string;
    busType: string;
    seatLayout: SeatLayoutJson;
    seats: Seat[];
    amenities: string[];
    rating: number;
};

type Trip = {
    id: string;
    busId: string;
    from: string;
    to: string;
    date: Date;
    departureTime: string;
    arrivalTime: string;
    price: number;
    isAvailable: boolean;
    createdAt: string;
    bus: Bus;
    createdBy: string;
    modifiedBy: string;
    duration: string;
};

type Passenger = {
    id: string;
    name: string;
    seat: string;
    age: number;
    gender: "male" | "female";
};

type Booking = {
    reference: string;
    status: string;
    tripId: string;
    busId: string;
    from: string;
    to: string;
    date: string;
    time: string;
    operator: string;
    passengers: Passenger[];
    email: string;
    phone: string;
    totalAmount: number;
    bookingDate: string;
    createdAt: string;
    paymentReference?: string;
    trip: Trip;
};

type BusType = {
    id: string;
    name: string;
    seats: number;
};

// Input types
type UserInput = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    isActive?: boolean;
};

type BusInput = {
    operator: string;
    busType: string;
    seatLayout: SeatLayoutJson;
    amenities: string[];
    rating: number;
};

type TripInput = {
    busId: string;
    from: string;
    to: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    isAvailable?: boolean;
    duration: string;
    createdBy: string;
    modifiedBy: string;
};

type BookingInput = {
    tripId: string;
    email: string;
    phone: string;
    passengers: { name: string; seat: string }[];
    paymentReference?: string;
    status: string;
};

type BusTypeInput = {
    name: string;
    seats: number;
};

// Store interfaces
interface UserState {
    users: User[];
    currentUser: User | null;
    isLoading: boolean;
    error: string | null;
    total: number;
    fetchUsers: (params?: { limit?: number; offset?: number }) => Promise<void>;
    fetchUser: (userId: string) => Promise<void>;
    createUser: (data: UserInput) => Promise<User>;
    updateUser: (userId: string, data: Partial<UserInput>) => Promise<User>;
    deleteUser: (userId: string) => Promise<void>;
    clearError: () => void;
}

interface BusState {
    buses: Bus[];
    currentBus: Bus | null;
    isLoading: boolean;
    error: string | null;
    total: number;
    fetchBuses: (params?: { operator?: string; busType?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchBus: (busId: string) => Promise<void>;
    createBus: (data: BusInput) => Promise<Bus>;
    updateBus: (busId: string, data: Partial<BusInput>) => Promise<Bus>;
    deleteBuss: (busId: string) => Promise<void>;
    clearCurrentBus: () => void;
    clearError: () => void;
}

interface TripState {
    trips: Trip[];
    currentTrip: Trip | null;
    isLoading: boolean;
    error: string | null;
    total: number;
    fetchTrips: (params?: { from?: string; to?: string; date?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchTrip: (tripId: string) => Promise<void>;
    createTrip: (data: TripInput) => Promise<Trip>;
    updateTrip: (tripId: string, data: Partial<TripInput>) => Promise<Trip>;
    deleteTrip: (tripId: string) => Promise<void>;
    clearError: () => void;
}

interface BookingState {
    bookings: Booking[];
    currentBooking: Booking | null;
    isLoading: boolean;
    error: string | null;
    total: number;
    fetchBookings: (params?: { email?: string; status?: string; limit?: number; offset?: number }) => Promise<void>;
    fetchBooking: (reference: string) => Promise<void>;
    createBooking: (data: BookingInput) => Promise<Booking>;
    updateBooking: (reference: string, data: {
        status?: string;
        email?: string;
        phone?: string;
        paymentReference?: string;
        passengers?: Array<{
            id?: string;
            name: string;
            seat: string;
            age: number;
            gender: 'male' | 'female';
        }>;
        totalAmount?: number;
    }) => Promise<Booking>;
    deleteBooking: (reference: string) => Promise<void>;
    clearError: () => void;
}

interface BusTypeState {
    busTypes: BusType[];
    isLoading: boolean;
    error: string | null;
    fetchBusTypes: () => Promise<void>;
    createBusType: (data: BusTypeInput) => Promise<BusType>;
    updateBusType: (busTypeId: string, data: Partial<BusTypeInput>) => Promise<BusType>;
    deleteBusType: (busTypeId: string) => Promise<void>;
    clearError: () => void;
}

// Helper function for API calls
const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || 'Request failed');
    }

    return response.json();
};

// User Store
export const useUserStore = create<UserState>((set) => ({
    users: [],
    currentUser: null,
    isLoading: false,
    error: null,
    total: 0,

    fetchUsers: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(
                Object.entries(params).reduce((acc, [key, value]) => {
                    if (value !== undefined) acc[key] = String(value);
                    return acc;
                }, {} as Record<string, string>)
            ).toString();

            const response = await apiCall(`/api/users${queryString ? `?${queryString}` : ''}`);
            set({ users: response.data, total: response.total, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    fetchUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const user = await apiCall(`/api/users/${userId}`);
            set({ currentUser: user, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createUser: async (data: UserInput) => {
        set({ isLoading: true, error: null });
        try {
            const user = await apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            set(state => ({
                users: [user, ...state.users],
                isLoading: false
            }));
            return user;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateUser: async (userId: string, data: Partial<UserInput>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedUser = await apiCall(`/api/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            set(state => ({
                users: state.users.map(user => user.id === userId ? updatedUser : user),
                currentUser: state.currentUser?.id === userId ? updatedUser : state.currentUser,
                isLoading: false
            }));
            return updatedUser;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deleteUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            await apiCall(`/api/users/${userId}`, { method: 'DELETE' });
            set(state => ({
                users: state.users.filter(user => user.id !== userId),
                currentUser: state.currentUser?.id === userId ? null : state.currentUser,
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));

// Bus Store
export const useBusStore = create<BusState>((set) => ({
    buses: [],
    currentBus: null,
    isLoading: false,
    error: null,
    total: 0,

    fetchBuses: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(
                Object.entries(params).reduce((acc, [key, value]) => {
                    if (value !== undefined) acc[key] = String(value);
                    return acc;
                }, {} as Record<string, string>)
            ).toString();

            const response = await apiCall(`/api/buses${queryString ? `?${queryString}` : ''}`);
            set({ buses: response.data, total: response.total, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    fetchBus: async (busId: string) => {
        set({ isLoading: true, error: null });
        try {
            const bus = await apiCall(`/api/buses/${busId}`);
            set({ currentBus: bus, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createBus: async (data: BusInput) => {
        set({ isLoading: true, error: null });
        try {
            const bus = await apiCall('/api/buses', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            set(state => ({
                buses: [bus, ...state.buses],
                isLoading: false
            }));
            return bus;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateBus: async (busId: string, data: Partial<BusInput>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedBus = await apiCall(`/api/buses/${busId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            set(state => ({
                buses: state.buses.map(bus => bus.id === busId ? updatedBus : bus),
                currentBus: state.currentBus?.id === busId ? updatedBus : state.currentBus,
                isLoading: false
            }));
            return updatedBus;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deleteBuss: async (busId: string) => {
        set({ isLoading: true, error: null });
        try {
            await apiCall(`/api/buses/${busId}`, { method: 'DELETE' });
            set(state => ({
                buses: state.buses.filter(bus => bus.id !== busId),
                currentBus: state.currentBus?.id === busId ? null : state.currentBus,
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    clearCurrentBus: () => set({ currentBus: null }),
    clearError: () => set({ error: null }),
}));

// Trip Store
export const useTripStore = create<TripState>((set) => ({
    trips: [],
    currentTrip: null,
    isLoading: false,
    error: null,
    total: 0,

    fetchTrips: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(
                Object.entries(params).reduce((acc, [key, value]) => {
                    if (value !== undefined) acc[key] = String(value);
                    return acc;
                }, {} as Record<string, string>)
            ).toString();

            const response = await apiCall(`/api/trips${queryString ? `?${queryString}` : ''}`);
            set({ trips: response.data, total: response.total, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    fetchTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });
        try {
            const trip = await apiCall(`/api/trips/${tripId}`);
            set({ currentTrip: trip, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createTrip: async (data: TripInput) => {
        set({ isLoading: true, error: null });
        try {
            const trip = await apiCall('/api/trips', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            set(state => ({
                trips: [trip, ...state.trips],
                isLoading: false
            }));
            return trip;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateTrip: async (tripId: string, data: Partial<TripInput>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedTrip = await apiCall(`/api/trips/${tripId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            set(state => ({
                trips: state.trips.map(trip => trip.id === tripId ? updatedTrip : trip),
                currentTrip: state.currentTrip?.id === tripId ? updatedTrip : state.currentTrip,
                isLoading: false
            }));
            return updatedTrip;
        }
        catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deleteTrip: async (tripId: string) => {
        set({ isLoading: true, error: null });
        try {
            await apiCall(`/api/trips/${tripId}`, { method: 'DELETE' });
            set(state => ({
                trips: state.trips.filter(trip => trip.id !== tripId),
                currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));

// Booking Store
export const useBookingStore = create<BookingState>((set) => ({
    bookings: [],
    currentBooking: null,
    isLoading: false,
    error: null,
    total: 0,

    fetchBookings: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const queryString = new URLSearchParams(
                Object.entries(params).reduce((acc, [key, value]) => {
                    if (value !== undefined) acc[key] = String(value);
                    return acc;
                }, {} as Record<string, string>)
            ).toString();

            const response = await apiCall(`/api/bookings${queryString ? `?${queryString}` : ''}`);
            set({ bookings: response.data, total: response.total, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    fetchBooking: async (reference: string) => {
        set({ isLoading: true, error: null });
        try {
            const booking = await apiCall(`/api/bookings/${reference}`);
            set({ currentBooking: booking, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createBooking: async (data: BookingInput) => {
        set({ isLoading: true, error: null });
        try {
            const booking = await apiCall('/api/bookings', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            set(state => ({
                bookings: [booking, ...state.bookings],
                isLoading: false
            }));
            return booking;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateBooking: async (reference: string, data: {
        status?: string;
        email?: string;
        phone?: string;
        paymentReference?: string;
        passengers?: Array<{
            id?: string;
            name: string;
            seat: string;
            age: number;
            gender: 'male' | 'female';
        }>;
        totalAmount?: number;
    }) => {
        set({ isLoading: true, error: null });
        try {
            const updatedBooking = await apiCall(`/api/bookings/${reference}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            set(state => ({
                bookings: state.bookings.map(booking => booking.reference === reference ? updatedBooking : booking),
                currentBooking: state.currentBooking?.reference === reference ? updatedBooking : state.currentBooking,
                isLoading: false
            }));
            return updatedBooking;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deleteBooking: async (reference: string) => {
        set({ isLoading: true, error: null });
        try {
            await apiCall(`/api/bookings/${reference}`, { method: 'DELETE' });
            set(state => ({
                bookings: state.bookings.filter(booking => booking.reference !== reference),
                currentBooking: state.currentBooking?.reference === reference ? null : state.currentBooking,
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));

// Bus Type Store
export const useBusTypeStore = create<BusTypeState>((set) => ({
    busTypes: [],
    isLoading: false,
    error: null,

    fetchBusTypes: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiCall('/api/bus-types');
            set({ busTypes: response.data, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createBusType: async (data: BusTypeInput) => {
        set({ isLoading: true, error: null });
        try {
            const busType = await apiCall('/api/bus-types', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            set(state => ({
                busTypes: [busType, ...state.busTypes],
                isLoading: false
            }));
            return busType;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateBusType: async (busTypeId: string, data: Partial<BusTypeInput>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedBusType = await apiCall(`/api/bus-types/${busTypeId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            set(state => ({
                busTypes: state.busTypes.map(busType => busType.id === busTypeId ? updatedBusType : busType),
                isLoading: false
            }));
            return updatedBusType;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deleteBusType: async (busTypeId: string) => {
        set({ isLoading: true, error: null });
        try {
            await apiCall(`/api/bus-types/${busTypeId}`, { method: 'DELETE' });
            set(state => ({
                busTypes: state.busTypes.filter(busType => busType.id !== busTypeId),
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));