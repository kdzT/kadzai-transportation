import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { reference } = await request.json();
        console.log('Verifying payment reference:', reference);

        if (!reference) {
            return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        console.log('Paystack verify response:', { status: data.status, paymentStatus: data.data?.status });

        if (!response.ok) {
            console.error('Paystack API error:', data);
            return NextResponse.json({
                error: data.message || 'Payment verification failed'
            }, { status: 400 });
        }

        if (!data.status) {
            console.error('Paystack verification failed:', data.message);
            return NextResponse.json({
                error: data.message || 'Payment verification failed'
            }, { status: 400 });
        }

        if (data.data.status !== 'success') {
            console.error('Payment not successful:', data.data.status);
            return NextResponse.json({
                error: `Payment status: ${data.data.status}`
            }, { status: 400 });
        }

        console.log('Payment verification successful');
        return NextResponse.json({
            status: true,
            data: {
                reference: data.data.reference,
                amount: data.data.amount,
                status: data.data.status,
                paid_at: data.data.paid_at,
                created_at: data.data.created_at,
                channel: data.data.channel,
                currency: data.data.currency,
                customer: data.data.customer
            }
        });

    } catch (error) {
        console.error('[VERIFY_PAYSTACK]', error);
        const errorMessage = error instanceof Error ? `Failed to verify payment: ${error.message}` : 'Failed to verify payment';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}