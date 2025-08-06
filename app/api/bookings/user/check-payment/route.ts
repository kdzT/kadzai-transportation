// /api/bookings/check-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const reference = searchParams.get('reference');
        const paymentReference = searchParams.get('paymentReference');

        if (!reference && !paymentReference) {
            return NextResponse.json({ error: 'Reference or paymentReference is required' }, { status: 400 });
        }

        console.log(`Checking if booking exists for reference: ${reference} or paymentReference: ${paymentReference}`);

        // Check if a booking exists by either booking reference OR payment reference
        const existingBooking = await prisma.booking.findFirst({
            where: {
                OR: [
                    reference ? { reference: reference } : {},
                    reference ? { paymentReference: reference } : {},
                    paymentReference ? { paymentReference: paymentReference } : {},
                    paymentReference ? { reference: paymentReference } : {}
                ].filter(condition => Object.keys(condition).length > 0)
            },
            select: {
                reference: true,
                paymentReference: true,
                email: true,
                phone: true,
                status: true
            }
        });

        const exists = !!existingBooking;
        console.log(`Booking exists: ${exists}`);
        if (existingBooking) {
            console.log(`Found booking - Reference: ${existingBooking.reference}, PaymentReference: ${existingBooking.paymentReference}`);
        }

        return NextResponse.json({
            exists,
            booking: existingBooking ? {
                reference: existingBooking.reference,
                paymentReference: existingBooking.paymentReference,
                email: existingBooking.email,
                phone: existingBooking.phone,
                status: existingBooking.status
            } : null
        });

    } catch (error) {
        console.error('[CHECK_PAYMENT_REFERENCE]', error);
        const errorMessage = error instanceof Error ? `Failed to check payment reference: ${error.message}` : 'Failed to check payment reference';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}