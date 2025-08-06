import { NextResponse, NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAdmin, User } from "../../../../lib/auth";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await the params promise
        const authResult = await verifyAdmin(request);
        if (!authResult.success) return authResult.error;

        const user = await prisma.user.findUnique({
            where: { id },
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

        if (!user) {
            return NextResponse.json(
                { error: { message: "User not found" } },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json(
            { error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await the params promise
        const authResult = await verifyAdmin(request);
        if (!authResult.success) return authResult.error;

        const body = await request.json();
        const { firstName, lastName, email, phone, isActive, password } = body;

        const updateData: Partial<User> = { modifiedBy: authResult.user.id };
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        if (password) updateData.password = await bcrypt.hash(password, 10);

        if (Object.keys(updateData).length === 1) {
            return NextResponse.json(
                { error: { message: "No fields provided for update" } },
                { status: 400 }
            );
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
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

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json(
            { error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await the params promise

        const authResult = await verifyAdmin(request);
        if (!authResult.success) return authResult.error;

        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: { message: (error as Error).message } },
            { status: 500 }
        );
    }
}