import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyAdmin, disconnectPrisma } from '../../../../lib/auth';
import { TripInput, SeatLayoutJson } from '../../../../lib/types';
import { Prisma } from '@prisma/client';

// Validate time format (HH:MM)
const isValidTime = (time: string): boolean => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time);

// Validate duration format (e.g., "8h 0m")
const isValidDuration = (duration: string): boolean => /^[0-9]+h\s[0-5]?[0-9]m$/.test(duration);

// Validate ISO 8601 date
const isValidDate = (date: string): boolean => {
    const parsed = Date.parse(date);
    return !isNaN(parsed) && new Date(parsed).toISOString() === date;
};

// Check for overlapping trips
const hasOverlappingTrip = async (tripId: string, busId: string, date: string, departureTime: string, duration: string): Promise<boolean> => {
    const [hours, minutes] = duration.match(/(\d+)h\s(\d+)m/)?.slice(1).map(Number) || [0, 0];
    const tripStart = new Date(`${date}T${departureTime}:00Z`);
    const tripEnd = new Date(tripStart.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

    const overlappingTrips = await prisma.trip.findMany({
        where: {
            busId,
            date: { equals: new Date(date) },
            id: { not: tripId }, // Exclude the current trip
        },
    });

    for (const trip of overlappingTrips) {
        const [tripHours, tripMinutes] = trip.duration.match(/(\d+)h\s(\d+)m/)?.slice(1).map(Number) || [0, 0];
        const existingStart = new Date(`${trip.date.toISOString().split('T')[0]}T${trip.departureTime}:00Z`);
        const existingEnd = new Date(existingStart.getTime() + tripHours * 60 * 60 * 1000 + tripMinutes * 60 * 1000);

        if (tripStart < existingEnd && tripEnd > existingStart) {
            return true;
        }
    }
    return false;
};

type TripWithBus = Prisma.TripGetPayload<{
    include: { bus: { include: { seats: true } } };
}>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
    try {
        const { tripId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { bus: { include: { seats: true } } },
        });

        if (!trip) {
            return NextResponse.json(
                { error: { code: 404, message: 'Trip not found' } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: trip.id,
            busId: trip.busId,
            from: trip.from,
            to: trip.to,
            date: trip.date.toISOString(),
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime,
            duration: trip.duration,
            price: trip.price,
            isAvailable: trip.isAvailable,
            createdAt: trip.createdAt.toISOString(),
            bus: {
                id: trip.bus.id,
                operator: trip.bus.operator,
                busType: trip.bus.busType,
                seatLayout: trip.bus.seatLayout as SeatLayoutJson,
                seats: trip.bus.seats.map((seat) => ({
                    id: seat.id,
                    number: seat.number,
                    isAvailable: seat.isAvailable,
                })),
                amenities: trip.bus.amenities,
                rating: trip.bus.rating,
            },
        });
    } catch (error) {
        console.error('Get trips error:', error);

        // --- FIX: Use a type guard to check the error type ---
        let errorMessage = 'An unknown error occurred';
        if (error instanceof Error) {
            // Inside this block, TypeScript knows `error` is an Error object
            errorMessage = `Internal server error: ${error.message}`;
        } else {
            // Handle cases where the thrown value is not an Error object
            errorMessage = `An unexpected error occurred: ${String(error)}`;
        }

        return NextResponse.json(
            { error: { code: 500, message: errorMessage } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
    try {
        const { tripId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }
        const { user } = authResult;

        const body: Partial<TripInput> = await request.json();
        const { busId, from, to, date, departureTime, arrivalTime, duration, price, isAvailable } = body;

        // Validate trip exists
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { bus: { include: { seats: true } } },
        });
        if (!trip) {
            return NextResponse.json(
                { error: { code: 404, message: 'Trip not found' } },
                { status: 404 }
            );
        }

        // Validate busId if provided
        if (busId) {
            const bus = await prisma.bus.findUnique({
                where: { id: busId },
                include: { seats: true },
            });
            if (!bus) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Invalid bus ID' } },
                    { status: 400 }
                );
            }
        }

        // Validate fields if provided
        if (date && !isValidDate(date)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid date format (use ISO 8601)' } },
                { status: 400 }
            );
        }
        if (date && new Date(date) < new Date(new Date().toISOString().split('T')[0])) {
            return NextResponse.json(
                { error: { code: 400, message: 'Trip date cannot be in the past' } },
                { status: 400 }
            );
        }
        if (departureTime && !isValidTime(departureTime)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid departure time format (use HH:MM)' } },
                { status: 400 }
            );
        }
        if (arrivalTime && !isValidTime(arrivalTime)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid arrival time format (use HH:MM)' } },
                { status: 400 }
            );
        }
        if (duration && !isValidDuration(duration)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid duration format (use Xh Ym)' } },
                { status: 400 }
            );
        }
        if (price !== undefined && price < 0) {
            return NextResponse.json(
                { error: { code: 400, message: 'Price must be non-negative' } },
                { status: 400 }
            );
        }

        // Check for overlapping trips if date, departureTime, or duration is updated
        if (busId || date || departureTime || duration) {
            const checkBusId = busId || trip.busId;
            const checkDate = date || trip.date.toISOString().split('T')[0];
            const checkDepartureTime = departureTime || trip.departureTime;
            const checkDuration = duration || trip.duration;
            if (await hasOverlappingTrip(tripId, checkBusId, checkDate, checkDepartureTime, checkDuration)) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Trip overlaps with an existing trip for this bus' } },
                    { status: 400 }
                );
            }
        }

        const updatedTrip: TripWithBus = await prisma.trip.update({
            where: { id: tripId },
            data: {
                busId: busId || undefined,
                from: from || undefined,
                to: to || undefined,
                date: date ? new Date(date) : undefined,
                departureTime: departureTime || undefined,
                arrivalTime: arrivalTime || undefined,
                duration: duration || undefined,
                price: price !== undefined ? price : undefined,
                isAvailable: isAvailable !== undefined ? isAvailable : undefined,
                modifiedBy: user.email,
            },
            include: { bus: { include: { seats: true } } },
        });

        return NextResponse.json({
            id: updatedTrip.id,
            busId: updatedTrip.busId,
            from: updatedTrip.from,
            to: updatedTrip.to,
            date: updatedTrip.date.toISOString(),
            departureTime: updatedTrip.departureTime,
            arrivalTime: updatedTrip.arrivalTime,
            duration: updatedTrip.duration,
            price: updatedTrip.price,
            isAvailable: updatedTrip.isAvailable,
            createdAt: updatedTrip.createdAt.toISOString(),
            bus: {
                id: updatedTrip.bus.id,
                operator: updatedTrip.bus.operator,
                busType: updatedTrip.bus.busType,
                seatLayout: updatedTrip.bus.seatLayout as SeatLayoutJson,
                seats: updatedTrip.bus.seats.map((seat) => ({
                    id: seat.id,
                    number: seat.number,
                    isAvailable: seat.isAvailable,
                })),
                amenities: updatedTrip.bus.amenities,
                rating: updatedTrip.bus.rating,
            },
        });
    } catch (error) {
        console.error('Update trips error:', error);

        // --- FIX: Use a type guard to check the error type ---
        let errorMessage = 'An unknown error occurred';
        if (error instanceof Error) {
            // Inside this block, TypeScript knows `error` is an Error object
            errorMessage = `Internal server error: ${error.message}`;
        } else {
            // Handle cases where the thrown value is not an Error object
            errorMessage = `An unexpected error occurred: ${String(error)}`;
        }

        return NextResponse.json(
            { error: { code: 500, message: errorMessage } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
    try {
        const { tripId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        // Check if trip exists
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            return NextResponse.json(
                { error: { code: 404, message: 'Trip not found' } },
                { status: 404 }
            );
        }

        // Check for active bookings
        const activeBookings = await prisma.booking.count({
            where: { tripId, status: { in: ['confirmed', 'completed'] } },
        });
        if (activeBookings > 0) {
            return NextResponse.json(
                { error: { code: 409, message: 'Cannot delete trip with active bookings' } },
                { status: 409 }
            );
        }

        await prisma.trip.delete({
            where: { id: tripId },
        });

        return NextResponse.json({ message: 'Trip deleted' });
    } catch (error) {
        console.error('Delete trips error:', error);

        // --- FIX: Use a type guard to check the error type ---
        let errorMessage = 'An unknown error occurred';
        if (error instanceof Error) {
            // Inside this block, TypeScript knows `error` is an Error object
            errorMessage = `Internal server error: ${error.message}`;
        } else {
            // Handle cases where the thrown value is not an Error object
            errorMessage = `An unexpected error occurred: ${String(error)}`;
        }

        return NextResponse.json(
            { error: { code: 500, message: errorMessage } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}