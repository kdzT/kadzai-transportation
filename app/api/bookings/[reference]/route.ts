import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyAdmin, disconnectPrisma } from '../../../../lib/auth';
import { BookingResponse, SeatLayoutJson } from '../../../../lib/types';
// import { Prisma } from '@prisma/client';

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validate phone format (simplified, adjust for your region)
const isValidPhone = (phone: string): boolean => /^\+?\d{10,14}$/.test(phone);

// type BookingWithDetails = Prisma.BookingGetPayload<{
//     include: {
//         trip: { include: { bus: { include: { seats: true } } } };
//         passengers: true;
//     };
// }>;

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
    try {
        const { reference } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }
        const { user } = authResult;

        const body: Partial<Pick<BookingResponse, 'status' | 'email' | 'phone' | 'paymentReference'>> & {
            passengers?: Array<{
                id?: string;
                name: string;
                seat: string;
                age: number;
                gender: 'male' | 'female';
            }>;
            totalAmount?: number;
        } = await request.json();

        const { status, email, phone, paymentReference, passengers, totalAmount } = body;

        // Find the existing booking
        const existingBooking = await prisma.booking.findUnique({
            where: { reference },
            include: {
                trip: {
                    include: {
                        bus: {
                            include: { seats: true }
                        }
                    }
                },
                passengers: true
            },
        });

        if (!existingBooking) {
            return NextResponse.json({ error: { code: 404, message: 'Booking not found' } }, { status: 404 });
        }

        // Validate status
        if (status && !['confirmed', 'cancelled', 'completed'].includes(status)) {
            return NextResponse.json({
                error: { code: 400, message: 'Invalid status. Must be confirmed, cancelled, or completed' }
            }, { status: 400 });
        }

        // Validate email
        if (email && !isValidEmail(email)) {
            return NextResponse.json({ error: { code: 400, message: 'Invalid email format' } }, { status: 400 });
        }

        // Validate phone
        if (phone && !isValidPhone(phone)) {
            return NextResponse.json({ error: { code: 400, message: 'Invalid phone format' } }, { status: 400 });
        }

        // Validate payment reference
        if (paymentReference) {
            const existingPaymentRef = await prisma.booking.findFirst({
                where: {
                    paymentReference,
                    NOT: { reference }
                }
            });
            if (existingPaymentRef) {
                return NextResponse.json({
                    error: { code: 400, message: 'Payment reference already used' }
                }, { status: 400 });
            }
        }

        // Validate passengers if provided
        if (passengers) {
            if (!Array.isArray(passengers) || passengers.length === 0) {
                return NextResponse.json({
                    error: { code: 400, message: 'Passengers must be a non-empty array' }
                }, { status: 400 });
            }

            // Validate each passenger
            for (const passenger of passengers) {
                if (!passenger.name || !passenger.seat || typeof passenger.age !== 'number' || passenger.age <= 0 || !passenger.gender) {
                    return NextResponse.json({
                        error: { code: 400, message: 'Each passenger must have name, seat, age, and gender' }
                    }, { status: 400 });
                }

                if (!['male', 'female'].includes(passenger.gender)) {
                    return NextResponse.json({
                        error: { code: 400, message: 'Gender must be either male or female' }
                    }, { status: 400 });
                }
            }

            // Check for duplicate seat numbers in the request
            const newSeatNumbers = passengers.map(p => p.seat);
            if (new Set(newSeatNumbers).size !== newSeatNumbers.length) {
                return NextResponse.json({
                    error: { code: 400, message: 'Duplicate seat numbers in booking' }
                }, { status: 400 });
            }

            // Get current passenger seats
            const currentSeatNumbers = existingBooking.passengers.map(p => p.seat);

            // Find seats that need to be checked for availability (new seats not in current booking)
            const seatsToCheck = newSeatNumbers.filter(seat => !currentSeatNumbers.includes(seat));

            if (seatsToCheck.length > 0) {
                // Check if new seats are available
                const unavailableSeats = await prisma.seat.findMany({
                    where: {
                        busId: existingBooking.busId,
                        number: { in: seatsToCheck },
                        isAvailable: false
                    }
                });

                if (unavailableSeats.length > 0) {
                    return NextResponse.json({
                        error: {
                            code: 400,
                            message: `Seats ${unavailableSeats.map(s => s.number).join(', ')} are not available`
                        }
                    }, { status: 400 });
                }

                // Validate that seats exist on the bus
                const validSeats = existingBooking.trip.bus.seats.map(s => s.number);
                const invalidSeats = seatsToCheck.filter(seat => !validSeats.includes(seat));

                if (invalidSeats.length > 0) {
                    return NextResponse.json({
                        error: {
                            code: 400,
                            message: `Invalid seat numbers: ${invalidSeats.join(', ')}`
                        }
                    }, { status: 400 });
                }
            }
        }

        // Update booking in transaction
        const updatedBooking = await prisma.$transaction(async (tx) => {
            // Handle seat and passenger updates if passengers are provided
            if (passengers) {
                const currentSeatNumbers = existingBooking.passengers.map(p => p.seat);
                const newSeatNumbers = passengers.map(p => p.seat);

                // Find seats to free up (seats that were booked but no longer needed)
                const seatsToFree = currentSeatNumbers.filter(seat => !newSeatNumbers.includes(seat));

                // Find seats to reserve (new seats that weren't previously booked)
                const seatsToReserve = newSeatNumbers.filter(seat => !currentSeatNumbers.includes(seat));

                // Free up old seats
                if (seatsToFree.length > 0) {
                    await tx.seat.updateMany({
                        where: {
                            busId: existingBooking.busId,
                            number: { in: seatsToFree }
                        },
                        data: { isAvailable: true }
                    });
                }

                // Reserve new seats
                if (seatsToReserve.length > 0) {
                    await tx.seat.updateMany({
                        where: {
                            busId: existingBooking.busId,
                            number: { in: seatsToReserve }
                        },
                        data: { isAvailable: false }
                    });
                }

                // Delete existing passengers
                await tx.passenger.deleteMany({
                    where: { bookingId: reference }
                });

                // Create new passengers
                await tx.passenger.createMany({
                    data: passengers.map(p => ({
                        id: p.id || crypto.randomUUID(),
                        bookingId: reference,
                        name: p.name,
                        seat: p.seat,
                        age: p.age,
                        gender: p.gender,
                    }))
                });
            }

            // Update the booking record
            const booking = await tx.booking.update({
                where: { reference },
                data: {
                    status: status || undefined,
                    email: email || undefined,
                    phone: phone || undefined,
                    paymentReference: paymentReference || undefined,
                    totalAmount: totalAmount || undefined,
                    modifiedBy: user.email,
                },
                include: {
                    trip: { include: { bus: { include: { seats: true } } } },
                    passengers: true,
                },
            });

            return booking;
        });

        // Return the updated booking
        return NextResponse.json({
            reference: updatedBooking.reference,
            status: updatedBooking.status,
            tripId: updatedBooking.tripId,
            busId: updatedBooking.busId,
            from: updatedBooking.from,
            to: updatedBooking.to,
            date: updatedBooking.date,
            time: updatedBooking.time,
            operator: updatedBooking.operator,
            passengers: updatedBooking.passengers.map((p) => ({
                id: p.id,
                name: p.name,
                seat: p.seat,
                age: p.age,
                gender: p.gender,
            })),
            email: updatedBooking.email,
            phone: updatedBooking.phone,
            totalAmount: updatedBooking.totalAmount,
            bookingDate: updatedBooking.bookingDate,
            createdAt: updatedBooking.createdAt.toISOString(),
            paymentReference: updatedBooking.paymentReference,
            trip: {
                id: updatedBooking.trip.id,
                busId: updatedBooking.trip.busId,
                from: updatedBooking.trip.from,
                to: updatedBooking.trip.to,
                date: updatedBooking.trip.date.toISOString(),
                departureTime: updatedBooking.trip.departureTime,
                arrivalTime: updatedBooking.trip.arrivalTime,
                duration: updatedBooking.trip.duration,
                price: updatedBooking.trip.price,
                isAvailable: updatedBooking.trip.isAvailable,
                createdAt: updatedBooking.trip.createdAt.toISOString(),
                bus: {
                    id: updatedBooking.trip.bus.id,
                    operator: updatedBooking.trip.bus.operator,
                    busType: updatedBooking.trip.bus.busType,
                    seatLayout: updatedBooking.trip.bus.seatLayout as SeatLayoutJson,
                    seats: updatedBooking.trip.bus.seats.map((seat) => ({
                        id: seat.id,
                        number: seat.number,
                        isAvailable: seat.isAvailable,
                    })),
                    amenities: updatedBooking.trip.bus.amenities,
                    rating: updatedBooking.trip.bus.rating,
                },
            },
        });
    } catch (error) {
        console.error('Update booking error:', error);
        const errorMessage = error instanceof Error ? `Internal server error: ${error.message}` : 'Internal server error';
        return NextResponse.json({ error: { code: 500, message: errorMessage } }, { status: 500 });
    } finally {
        await disconnectPrisma();
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
    try {
        const { reference } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const booking = await prisma.booking.findUnique({
            where: { reference },
            include: {
                passengers: true // Include passengers to get seat numbers
            }
        });

        if (!booking) {
            return NextResponse.json({ error: { code: 404, message: 'Booking not found' } }, { status: 404 });
        }

        if (booking.status === 'completed') {
            return NextResponse.json({ error: { code: 409, message: 'Cannot delete completed booking' } }, { status: 409 });
        }

        // Get seat numbers BEFORE deleting passengers
        const seatNumbers = booking.passengers.map(p => p.seat);

        await prisma.$transaction(async (tx) => {
            // Delete passengers first
            await tx.passenger.deleteMany({ where: { bookingId: reference } });

            // Free up the seats
            if (seatNumbers.length > 0) {
                await tx.seat.updateMany({
                    where: {
                        busId: booking.busId,
                        number: { in: seatNumbers }
                    },
                    data: { isAvailable: true }
                });
            }

            // Delete the booking
            await tx.booking.delete({ where: { reference } });
        });

        return NextResponse.json({ message: 'Booking deleted' });
    } catch (error) {
        console.error('Delete booking error:', error);
        const errorMessage = error instanceof Error ? `Internal server error: ${error.message}` : 'Internal server error';
        return NextResponse.json({ error: { code: 500, message: errorMessage } }, { status: 500 });
    } finally {
        await disconnectPrisma();
    }
}