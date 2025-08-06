import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { disconnectPrisma } from '../../../../../lib/auth';
import { SeatLayoutJson } from '../../../../../lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
    try {
        const { reference } = await params;

        // First try to find by paymentReference, then fallback to reference
        let booking = await prisma.booking.findFirst({
            where: { paymentReference: reference },
            include: {
                trip: { include: { bus: { include: { seats: true } } } },
                passengers: true,
            },
        });

        // If not found by paymentReference, try by reference (for backwards compatibility)
        if (!booking) {
            booking = await prisma.booking.findUnique({
                where: { reference },
                include: {
                    trip: { include: { bus: { include: { seats: true } } } },
                    passengers: true,
                },
            });
        }

        if (!booking) {
            return NextResponse.json({ error: { code: 404, message: 'Booking not found' } }, { status: 404 });
        }

        return NextResponse.json({
            reference: booking.reference, // This will be the actual booking reference (TE44B6BFB4)
            status: booking.status,
            tripId: booking.tripId,
            busId: booking.busId,
            from: booking.from,
            to: booking.to,
            date: booking.date,
            time: booking.time,
            operator: booking.operator,
            passengers: booking.passengers.map((p) => ({
                id: p.id,
                name: p.name,
                seat: p.seat,
                age: p.age,
                gender: p.gender,
            })),
            email: booking.email,
            phone: booking.phone,
            totalAmount: booking.totalAmount,
            bookingDate: booking.bookingDate,
            createdAt: booking.createdAt.toISOString(),
            paymentReference: booking.paymentReference,
            trip: {
                id: booking.trip.id,
                busId: booking.trip.busId,
                from: booking.trip.from,
                to: booking.trip.to,
                date: booking.trip.date.toISOString(),
                departureTime: booking.trip.departureTime,
                arrivalTime: booking.trip.arrivalTime,
                duration: booking.trip.duration,
                price: booking.trip.price,
                isAvailable: booking.trip.isAvailable,
                createdAt: booking.trip.createdAt.toISOString(),
                bus: {
                    id: booking.trip.bus.id,
                    operator: booking.trip.bus.operator,
                    busType: booking.trip.bus.busType,
                    seatLayout: booking.trip.bus.seatLayout as SeatLayoutJson,
                    seats: booking.trip.bus.seats.map((seat) => ({
                        id: seat.id,
                        number: seat.number,
                        isAvailable: seat.isAvailable,
                    })),
                    amenities: booking.trip.bus.amenities,
                    rating: booking.trip.bus.rating,
                },
            },
        });
    } catch (error) {
        console.error('Get booking error:', error);
        const errorMessage = error instanceof Error ? `Internal server error: ${error.message}` : 'Internal server error';
        return NextResponse.json({ error: { code: 500, message: errorMessage } }, { status: 500 });
    } finally {
        await disconnectPrisma();
    }
}