import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAdmin, disconnectPrisma } from '../../../lib/auth';
import { BusInput, SeatLayout, SeatLayoutJson } from '../../../lib/types';

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const { searchParams } = new URL(request.url);
        const operator = searchParams.get('operator');
        const busType = searchParams.get('busType');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: Prisma.BusWhereInput = {};
        if (operator) where.operator = { contains: operator, mode: 'insensitive' };
        if (busType) where.busType = busType;

        const buses = await prisma.bus.findMany({
            where,
            include: { seats: true },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });

        const total = await prisma.bus.count({ where });

        return NextResponse.json({
            data: buses.map((bus) => ({
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
            })),
            total,
        });
    } catch (error) {
        console.error('Get buses error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
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

        const body: BusInput = await request.json();
        const { operator, busType, seatLayout, amenities, rating } = body;

        if (!operator || !busType || !seatLayout || !Array.isArray(amenities) || rating === undefined) {
            return NextResponse.json(
                { error: { code: 400, message: 'All fields are required' } },
                { status: 400 }
            );
        }

        // Validate busType exists
        const busTypeRecord = await prisma.busType.findUnique({
            where: { name: busType },
        });
        if (!busTypeRecord) {
            return NextResponse.json(
                { error: { code: 400, message: 'Invalid bus type' } },
                { status: 400 }
            );
        }

        // Validate seatLayout
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

        // Count non-empty seats and validate against busType.seats
        const seatNumbers = arrangement.flat().filter(seat => seat !== '');
        if (seatNumbers.length !== busTypeRecord.seats) {
            return NextResponse.json(
                { error: { code: 400, message: `Seat count (${seatNumbers.length}) does not match bus type (${busTypeRecord.seats})` } },
                { status: 400 }
            );
        }

        // Validate unique seat numbers
        if (new Set(seatNumbers).size !== seatNumbers.length) {
            return NextResponse.json(
                { error: { code: 400, message: 'Duplicate seat numbers' } },
                { status: 400 }
            );
        }

        // Ensure seatLayout is compatible with JsonValue
        const seatLayoutJson: SeatLayoutJson = {
            rows,
            columns,
            arrangement,
        };

        const bus = await prisma.bus.create({
            data: {
                operator,
                busType,
                seatLayout: seatLayoutJson,
                amenities,
                rating,
                createdBy: user.email,
                modifiedBy: user.email,
                seats: {
                    create: seatNumbers.map(number => ({
                        number,
                        isAvailable: true,
                    })),
                },
            },
            include: { seats: true },
        });

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
        console.error('Create bus error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}