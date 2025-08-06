import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAdmin, disconnectPrisma } from '../../../lib/auth';
import { TripInput, TripResponse, SeatLayoutJson } from '../../../lib/types';

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
const hasOverlappingTrip = async (busId: string, date: string, departureTime: string, duration: string): Promise<boolean> => {
    const [hours, minutes] = duration.match(/(\d+)h\s(\d+)m/)?.slice(1).map(Number) || [0, 0];
    const tripStart = new Date(`${date}T${departureTime}:00Z`);
    const tripEnd = new Date(tripStart.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

    const overlappingTrips = await prisma.trip.findMany({
        where: {
            busId,
            date: { equals: new Date(date) },
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

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const date = searchParams.get('date'); // ISO 8601
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: Prisma.TripWhereInput = {};
        if (from) where.from = { contains: from, mode: 'insensitive' };
        if (to) where.to = { contains: to, mode: 'insensitive' };
        if (date) {
            if (!isValidDate(date)) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Invalid date format' } },
                    { status: 400 }
                );
            }
            where.date = { equals: new Date(date) };
        }

        const trips = await prisma.trip.findMany({
            where,
            include: { bus: { include: { seats: true } } },
            take: limit,
            skip: offset,
            orderBy: { date: 'asc' },
        });

        const total = await prisma.trip.count({ where });

        return NextResponse.json({
            data: trips.map((trip): TripResponse => ({
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
            })),
            total,
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

export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }
        const { user } = authResult;

        const body: TripInput = await request.json();
        const { busId, from, to, date, departureTime, arrivalTime, duration, price, isAvailable } = body;

        if (!busId || !from || !to || !date || !departureTime || !arrivalTime || !duration || price === undefined) {
            return NextResponse.json(
                { error: { code: 400, message: 'All fields are required' } },
                { status: 400 }
            );
        }

        // Validate busId
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

        // Validate date and times
        if (!isValidDate(date)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid date format (use ISO 8601)' } },
                { status: 400 }
            );
        }
        if (new Date(date) < new Date(new Date().toISOString().split('T')[0])) {
            return NextResponse.json(
                { error: { code: 400, message: 'Trip date cannot be in the past' } },
                { status: 400 }
            );
        }
        if (!isValidTime(departureTime) || !isValidTime(arrivalTime)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid time format (use HH:MM)' } },
                { status: 400 }
            );
        }
        if (!isValidDuration(duration)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid duration format (use Xh Ym)' } },
                { status: 400 }
            );
        }
        if (price < 0) {
            return NextResponse.json(
                { error: { code: 400, message: 'Price must be non-negative' } },
                { status: 400 }
            );
        }

        // Check for overlapping trips
        if (await hasOverlappingTrip(busId, date, departureTime, duration)) {
            return NextResponse.json(
                { error: { code: 400, message: 'Trip overlaps with an existing trip for this bus' } },
                { status: 400 }
            );
        }

        const trip = await prisma.trip.create({
            data: {
                busId,
                from,
                to,
                date: new Date(date),
                departureTime,
                arrivalTime,
                duration,
                price,
                isAvailable: isAvailable ?? true,
                createdBy: user.email,
                modifiedBy: user.email,
            },
            include: { bus: { include: { seats: true } } },
        });

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
        console.error('Create trip error:', error);

        // --- FIX: Use a type guard to check the error type ---
        let errorMessage = 'An unknown error occurred while creating the trip.';
        if (error instanceof Error) {
            // Now TypeScript knows `error` is an Error object
            errorMessage = `Internal server error: ${error.message}`;
        }

        return NextResponse.json(
            { error: { code: 500, message: errorMessage } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}