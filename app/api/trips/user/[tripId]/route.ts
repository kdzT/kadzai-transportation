import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { disconnectPrisma } from '../../../../../lib/auth';
import { SeatLayoutJson } from '../../../../../lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
    try {
        const { tripId } = await params;

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