import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyAdmin, disconnectPrisma } from '../../../lib/auth';
import { BusTypeInput } from '../../../lib/types';

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) {
            return authResult.error;
        }

        const busTypes = await prisma.busType.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            data: busTypes.map((busType) => ({
                id: busType.id,
                name: busType.name,
                seats: busType.seats,
            })),
        });
    } catch (error) {
        console.error('Get bus types error:', error);
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

        const body: BusTypeInput = await request.json();
        const { name, seats } = body;

        if (!name || seats === undefined || seats <= 0) {
            return NextResponse.json(
                { error: { code: 400, message: 'Name and valid seat count are required' } },
                { status: 400 }
            );
        }

        const existingBusType = await prisma.busType.findUnique({
            where: { name },
        });
        if (existingBusType) {
            return NextResponse.json(
                { error: { code: 409, message: 'Bus type already exists' } },
                { status: 409 }
            );
        }

        const busType = await prisma.busType.create({
            data: {
                name,
                seats,
                createdBy: user.email,
                modifiedBy: user.email,
            },
        });

        return NextResponse.json({
            id: busType.id,
            name: busType.name,
            seats: busType.seats,
        });
    } catch (error) {
        console.error('Create bus type error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await disconnectPrisma();
    }
}