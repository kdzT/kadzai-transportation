// /api/paystack/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email, amount, reference } = await request.json();
        console.log('Paystack initialize request:', { email, amount, reference });

        if (!email || !amount || !reference) {
            return NextResponse.json({ error: 'Missing required fields: email, amount, reference' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                amount, // Amount should already be in kobo from frontend
                reference,
            }),
        });

        const data = await response.json();
        console.log('Paystack initialize response:', data);

        if (!response.ok || !data.status) {
            console.error('Paystack initialization failed:', data);
            return NextResponse.json({
                error: data.message || 'Failed to initialize payment'
            }, { status: 400 });
        }

        return NextResponse.json({
            status: true,
            data: data.data,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            reference: data.data.reference
        });
    } catch (error) {
        console.error('Initialize payment error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}