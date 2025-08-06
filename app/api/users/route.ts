import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAdmin } from "../../../lib/auth";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = parseInt(searchParams.get("offset") || "0");

        const authResult = await verifyAdmin(request);
        if (!authResult.success) return authResult.error;

        const users = await prisma.user.findMany({
            skip: offset,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                createdAt: true,
                isActive: true,
                createdBy: true,
                modifiedBy: true,
            },
        });

        const total = await prisma.user.count();

        return NextResponse.json({ data: users, total });
    } catch (error) {
        return NextResponse.json(
            { error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const authResult = await verifyAdmin(request);
        if (!authResult.success) return authResult.error;

        const body = await request.json();
        const { firstName, lastName, email, password, phone, isActive = true } = body;

        if (!firstName || !lastName || !email || !password || !phone) {
            return NextResponse.json(
                { error: { message: "Missing required fields" } },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json(
                { error: { message: "User with this email already exists" } },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                phone,
                isActive,
                createdAt: new Date(),
                createdBy: authResult.user.id,
                modifiedBy: authResult.user.id,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                createdAt: true,
                isActive: true,
                createdBy: true,
                modifiedBy: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
}