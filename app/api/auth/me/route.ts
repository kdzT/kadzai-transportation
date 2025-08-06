import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: { code: 401, message: 'Authentication token required' } },
                { status: 401 }
            );
        }

        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
            return NextResponse.json(
                { error: { code: 401, message: 'Invalid or expired session' } },
                { status: 401 }
            );
        }

        const user = session.user;
        return NextResponse.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            createdAt: user.createdAt.toISOString(),
            isActive: user.isActive,
        });
    } catch (error) {
        console.error('Get current user error:', error);
        return NextResponse.json(
            { error: { code: 500, message: 'Internal server error' } },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}