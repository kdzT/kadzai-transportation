// /api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAdmin, disconnectPrisma } from '../../../lib/auth';
import { BookingInput, BookingResponse, SeatLayoutJson } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string): boolean => /^\+?\d{10,14}$/.test(phone);

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: Prisma.BookingWhereInput = {};
        if (email) {
            if (!isValidEmail(email)) {
                return NextResponse.json({ error: { code: 400, message: 'Invalid email format' } }, { status: 400 });
            }
            where.email = email;
        }
        if (status) where.status = status;

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                trip: { include: { bus: { include: { seats: true } } } },
                passengers: true,
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.booking.count({ where });

        return NextResponse.json({
            data: bookings.map((booking): BookingResponse => ({
                reference: booking.reference,
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
                paymentReference: booking.paymentReference ?? undefined,
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
            })),
            total,
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        const errorMessage = error instanceof Error ? `Internal server error: ${error.message}` : 'Internal server error';
        return NextResponse.json({ error: { code: 500, message: errorMessage } }, { status: 500 });
    } finally {
        await disconnectPrisma();
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: BookingInput = await request.json();
        const { tripId, email, phone, passengers, paymentReference } = body;

        console.log('Creating booking with data:', { tripId, email, phone, passengers: passengers.length, paymentReference });

        // Validate required fields
        if (!tripId || !email || !phone || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
            return NextResponse.json({
                error: { code: 400, message: 'All fields are required, and passengers must be a non-empty array' }
            }, { status: 400 });
        }

        if (!isValidEmail(email)) {
            return NextResponse.json({ error: { code: 400, message: 'Invalid email format' } }, { status: 400 });
        }

        if (!isValidPhone(phone)) {
            return NextResponse.json({ error: { code: 400, message: 'Invalid phone format' } }, { status: 400 });
        }

        // Check if paymentReference already exists (prevent duplicate bookings)
        if (paymentReference) {
            const existingBooking = await prisma.booking.findFirst({
                where: { paymentReference },
                select: { reference: true, paymentReference: true }
            });

            if (existingBooking) {
                console.log('Booking already exists for payment reference:', paymentReference);
                return NextResponse.json({
                    error: { code: 400, message: 'Payment reference already used' }
                }, { status: 400 });
            }
        }

        // Validate trip exists and is available
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { bus: { include: { seats: true } } },
        });

        if (!trip || !trip.isAvailable) {
            return NextResponse.json({
                error: { code: 400, message: 'Invalid or unavailable trip' }
            }, { status: 400 });
        }

        // Validate passengers and seats
        const seatNumbers = passengers.map((p) => p.seat);
        if (new Set(seatNumbers).size !== seatNumbers.length) {
            return NextResponse.json({
                error: { code: 400, message: 'Duplicate seat numbers in booking' }
            }, { status: 400 });
        }

        const availableSeats = trip.bus.seats.filter((seat) => seat.isAvailable).map((seat) => seat.number);

        for (const passenger of passengers) {
            if (!passenger.name || !passenger.seat || typeof passenger.age !== 'number' || passenger.age <= 0 || !passenger.gender) {
                return NextResponse.json({
                    error: { code: 400, message: 'Each passenger must have name, seat, age, and gender' }
                }, { status: 400 });
            }

            if (!availableSeats.includes(passenger.seat)) {
                return NextResponse.json({
                    error: { code: 400, message: `Seat ${passenger.seat} is unavailable or invalid` }
                }, { status: 400 });
            }
        }

        // Calculate total amount
        const totalAmount = passengers.length * trip.price;

        // Generate unique booking reference (not the payment reference)
        const bookingReference = `TE${uuidv4().slice(0, 8).toUpperCase()}`;

        // Create booking and update seat availability in a transaction
        const booking = await prisma.$transaction(async (tx) => {
            const createdBooking = await tx.booking.create({
                data: {
                    reference: bookingReference,
                    status: 'confirmed',
                    tripId,
                    busId: trip.busId,
                    from: trip.from,
                    to: trip.to,
                    date: trip.date.toISOString().split('T')[0],
                    time: trip.departureTime,
                    operator: trip.bus.operator,
                    passengers: {
                        create: passengers.map((p) => ({
                            name: p.name,
                            seat: p.seat,
                            age: p.age,
                            gender: p.gender,
                        })),
                    },
                    email,
                    phone,
                    totalAmount,
                    bookingDate: new Date().toISOString().split('T')[0],
                    createdBy: email,
                    paymentReference, // Store the Paystack payment reference
                },
                include: {
                    trip: { include: { bus: { include: { seats: true } } } },
                    passengers: true,
                },
            });

            // Update seat availability
            await tx.seat.updateMany({
                where: { busId: trip.busId, number: { in: seatNumbers } },
                data: { isAvailable: false },
            });

            return createdBooking;
        });

        console.log('Booking created successfully:', booking.reference);

        // Return the booking data
        const response: BookingResponse = {
            reference: booking.reference,
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
            paymentReference: booking.paymentReference ?? undefined,
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
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Create booking error:', error);
        const errorMessage = error instanceof Error ? `Internal server error: ${error.message}` : 'Internal server error';
        return NextResponse.json({ error: { code: 500, message: errorMessage } }, { status: 500 });
    } finally {
        await disconnectPrisma();
    }
}