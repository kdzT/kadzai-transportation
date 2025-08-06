import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { disconnectPrisma } from '../../../../lib/auth';
import { TripResponse, SeatLayoutJson } from '../../../../lib/types';

// Validate ISO 8601 date
const isValidDate = (date: string): boolean => {
    const parsed = Date.parse(date);
    return !isNaN(parsed) && new Date(parsed).toISOString() === date;
};

export async function GET(request: NextRequest) {
    try {
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