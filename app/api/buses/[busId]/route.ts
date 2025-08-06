import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyAdmin, disconnectPrisma } from '../../../../lib/auth';
import { BusInput, SeatLayout, SeatLayoutJson } from '../../../../lib/types';
import { JsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

type BusWithSeats = Prisma.BusGetPayload<{
    include: { seats: true };
}>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ busId: string }> }) {
    try {
        const { busId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const bus = await prisma.bus.findUnique({
            where: { id: busId },
            include: { seats: true },
        });

        if (!bus) {
            return NextResponse.json(
                { error: { code: 404, message: 'Bus not found' } },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: bus.id,
            operator: bus.operator,
            busType: bus.busType,
            seatLayout: bus.seatLayout as SeatLayoutJson,
            seats: bus.seats.map((seat) => ({
                id: seat.id,
                number: seat.number,
                isAvailable: seat.isAvailable,
            })),
            amenities: bus.amenities,
            rating: bus.rating,
        });
    } catch (error) {
        console.error('Get bus error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ busId: string }> }) {
    try {
        const { busId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }
        const { user } = authResult;

        const body: Partial<BusInput> = await request.json();
        const { operator, busType, seatLayout, amenities, rating } = body;


        const bus = await prisma.bus.findUnique({
            where: { id: busId },
            include: { seats: true },
        });
        if (!bus) {
            return NextResponse.json(
                { error: { code: 404, message: 'Bus not found' } },
                { status: 404 }
            );
        }

        if (busType) {
            const busTypeExists = await prisma.busType.findUnique({
                where: { name: busType },
            });
            if (!busTypeExists) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Invalid bus type' } },
                    { status: 400 }
                );
            }
        }

        let seatNumbers: string[] = [];
        let seatLayoutJson: JsonValue | undefined;
        if (seatLayout) {
            const { rows, columns, arrangement } = seatLayout as SeatLayout;
            if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Invalid rows or columns' } },
                    { status: 400 }
                );
            }
            if (!Array.isArray(arrangement) || arrangement.length !== rows || arrangement.some(row => !Array.isArray(row) || row.length !== columns)) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Invalid seat layout arrangement' } },
                    { status: 400 }
                );
            }

            const busTypeRecord = await prisma.busType.findUnique({
                where: { name: busType || bus.busType },
            });
            if (!busTypeRecord) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Bus type not found' } },
                    { status: 400 }
                );
            }
            seatNumbers = arrangement.flat().filter(seat => seat !== '');
            if (seatNumbers.length !== busTypeRecord.seats) {
                return NextResponse.json(
                    { error: { code: 400, message: `Seat count (${seatNumbers.length}) does not match bus type (${busTypeRecord.seats})` } },
                    { status: 400 }
                );
            }
            if (new Set(seatNumbers).size !== seatNumbers.length) {
                return NextResponse.json(
                    { error: { code: 400, message: 'Duplicate seat numbers' } },
                    { status: 400 }
                );
            }

            seatLayoutJson = { rows, columns, arrangement };
        }

        const dataToUpdate: Prisma.BusUpdateInput = {
            operator: operator || undefined,
            busType: busType || undefined,
            amenities: amenities || undefined,
            rating: rating !== undefined ? rating : undefined,
            user: {
                connect: {
                    email: user.email,
                },
            },
        };
        if (seatLayoutJson) {
            dataToUpdate.seatLayout = seatLayoutJson;
            dataToUpdate.seats = {
                deleteMany: {},
                create: seatNumbers.map(number => ({
                    number,
                    isAvailable: true,
                })),
            };
        }

        const updatedBus: BusWithSeats = await prisma.bus.update({
            where: { id: busId },
            data: dataToUpdate,
            include: { seats: true },
        });

        return NextResponse.json({
            id: updatedBus.id,
            operator: updatedBus.operator,
            busType: updatedBus.busType,
            seatLayout: updatedBus.seatLayout as SeatLayoutJson,
            seats: updatedBus.seats.map((seat) => ({
                id: seat.id,
                number: seat.number,
                isAvailable: seat.isAvailable,
            })),
            amenities: updatedBus.amenities,
            rating: updatedBus.rating,
        });
    } catch (error) {
        console.error('Update bus error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ busId: string }> }) {
    try {
        const { busId } = await params;

        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const bus = await prisma.bus.findUnique({
            where: { id: busId },
        });
        if (!bus) {
            return NextResponse.json(
                { error: { code: 404, message: 'Bus not found' } },
                { status: 404 }
            );
        }

        const activeTrips = await prisma.trip.count({
            where: { busId, isAvailable: true },
        });
        const activeBookings = await prisma.booking.count({
            where: { busId, status: { in: ['confirmed', 'completed'] } },
        });

        if (activeTrips > 0 || activeBookings > 0) {
            return NextResponse.json(
                { error: { code: 409, message: 'Cannot delete bus with active trips or bookings' } },
                { status: 409 }
            );
        }

        await prisma.bus.delete({
            where: { id: busId },
        });

        return NextResponse.json({ message: 'Bus deleted' });
    } catch (error) {
        console.error('Delete bus error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}