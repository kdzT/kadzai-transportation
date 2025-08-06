import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    createdAt: Date;
    isActive: boolean;
    createdBy: string | null;
    modifiedBy: string | null;
};

type VerifyAdminResult =
    | { success: true; user: User }
    | { success: false; error: NextResponse };

export async function verifyAdmin(request: Request): Promise<VerifyAdminResult> {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return {
            success: false,
            error: NextResponse.json(
                { error: { code: 401, message: 'Authentication token required' } },
                { status: 401 }
            ),
        };
    }

    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
        return {
            success: false,
            error: NextResponse.json(
                { error: { code: 401, message: 'Invalid or expired session' } },
                { status: 401 }
            ),
        };
    }

    return {
        success: true,
        user: {
            id: session.user.id,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            email: session.user.email,
            password: session.user.password,
            phone: session.user.phone,
            createdAt: session.user.createdAt,
            isActive: session.user.isActive,
            createdBy: session.user.createdBy,
            modifiedBy: session.user.modifiedBy,
        },
    };
}

export async function disconnectPrisma() {
    await prisma.$disconnect();
}