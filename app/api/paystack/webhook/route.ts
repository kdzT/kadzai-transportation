import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from 'redis';
import { BookingInput } from '../../../../lib/types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_default_key';

// Create Redis client
const redis = createClient({
    url: process.env.REDIS_URL,
});

// Global connection state
let isConnected = false;

async function ensureRedisConnection() {
    if (!isConnected) {
        try {
            await redis.connect();
            isConnected = true;
            console.log('Redis connected successfully');
        } catch (error) {
            console.error('Redis connection failed:', error);
            throw error;
        }
    }
}

export async function GET() {
    console.log('Webhook endpoint GET request received');
    return NextResponse.json({
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString(),
        methods: ['GET', 'POST'],
    });
}

export async function POST(request: NextRequest) {
    console.log('=== PAYSTACK WEBHOOK RECEIVED ===', new Date().toISOString());
    try {
        // Ensure Redis connection
        await ensureRedisConnection();

        const rawBody = await request.text();
        console.log('Webhook raw body:', rawBody);

        // Verify webhook signature
        const signature = request.headers.get('x-paystack-signature');
        if (!signature) {
            console.error('Missing Paystack signature');
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
        if (hash !== signature) {
            console.error('Invalid Paystack signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(rawBody);
        console.log('Parsed webhook event:', JSON.stringify(event, null, 2));

        if (event.event === 'charge.success') {
            console.log('Processing charge.success event');
            const { metadata, reference, amount, status } = event.data;

            if (status !== 'success') {
                console.error('Payment not successful:', status);
                return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
            }

            const paystackReference = reference;
            const bookingReference = metadata?.bookingReference;

            // Create unique identifiers for this webhook
            const webhookKeys = [
                `webhook:paystack:${paystackReference}`,
                `webhook:booking:${bookingReference}`,
                `webhook:combined:${paystackReference}-${bookingReference}`,
            ];

            // Check if any identifier has been processed
            const processedChecks = await Promise.all(
                webhookKeys.map(key => redis.get(key))
            );
            const alreadyProcessed = processedChecks.some(result => result !== null);

            if (alreadyProcessed) {
                console.log('Webhook already processed, keys:', webhookKeys);
                return NextResponse.json({
                    message: 'Webhook already processed (duplicate prevention)',
                    bookingReference,
                    paystackReference,
                    processed: true
                }, { status: 200 });
            }

            // Mark all identifiers as processed immediately (expire after 24 hours)
            await Promise.all(
                webhookKeys.map(key =>
                    redis.setEx(key, 86400, JSON.stringify({
                        processed: true,
                        timestamp: new Date().toISOString(),
                        paystackReference,
                        bookingReference
                    }))
                )
            );

            console.log('Marked webhook as processed, proceeding with validation');

            if (!metadata) {
                console.error('No metadata found in webhook data');
                return NextResponse.json({ error: 'No metadata' }, { status: 400 });
            }

            const requiredFields = ['customer', 'passengers', 'tripId', 'totalAmount', 'bookingReference'];
            const missingFields = requiredFields.filter((field) => !metadata[field]);
            if (missingFields.length > 0) {
                console.error('Missing required metadata fields:', missingFields);
                return NextResponse.json({ error: `Missing metadata fields: ${missingFields.join(', ')}` }, { status: 400 });
            }

            const customerRequiredFields = ['email', 'phone'];
            const missingCustomerFields = customerRequiredFields.filter((field) => !metadata.customer[field]);
            if (missingCustomerFields.length > 0) {
                console.error('Missing customer fields:', missingCustomerFields);
                return NextResponse.json({ error: `Missing customer fields: ${missingCustomerFields.join(', ')}` }, { status: 400 });
            }

            if (!Array.isArray(metadata.passengers) || metadata.passengers.length === 0) {
                console.error('Invalid passengers array:', metadata.passengers);
                return NextResponse.json({ error: 'Invalid passengers array' }, { status: 400 });
            }

            // Validate passenger fields
            const passengerRequiredFields = ['name', 'seat', 'age', 'gender'];
            for (const passenger of metadata.passengers) {
                const missingPassengerFields = passengerRequiredFields.filter((field) => !passenger[field]);
                if (missingPassengerFields.length > 0) {
                    console.error('Missing passenger fields:', missingPassengerFields);
                    return NextResponse.json({ error: `Missing passenger fields: ${missingPassengerFields.join(', ')}` }, { status: 400 });
                }
                const parsedAge = Number(passenger.age);
                if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
                    console.error('Invalid passenger age:', passenger.age);
                    return NextResponse.json({ error: `Invalid passenger age: ${passenger.age}` }, { status: 400 });
                }
                if (!['male', 'female'].includes(passenger.gender)) {
                    console.error('Invalid passenger gender:', passenger.gender);
                    return NextResponse.json({ error: 'Invalid passenger gender' }, { status: 400 });
                }
            }

            const parsedTotalAmount = Number(metadata.totalAmount);
            if (isNaN(parsedTotalAmount) || parsedTotalAmount !== amount / 100) {
                console.error('Amount mismatch:', { metadata: metadata.totalAmount, parsed: parsedTotalAmount, paystack: amount / 100 });
                return NextResponse.json({ error: `Amount mismatch: expected ${amount / 100}, got ${metadata.totalAmount}` }, { status: 400 });
            }

            console.log('Using booking reference for lookup:', bookingReference, 'Paystack reference:', paystackReference);

            // Check for existing booking using our booking reference
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            const checkPaymentUrl = `${baseUrl}/api/bookings/check-payment?reference=${bookingReference}`;
            console.log('Checking for existing booking:', checkPaymentUrl);
            console.log('Base URL being used:', baseUrl);

            const checkResponse = await fetch(checkPaymentUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            console.log('Check payment response status:', checkResponse.status);
            console.log('Check payment response headers:', Object.fromEntries(checkResponse.headers.entries()));

            const responseText = await checkResponse.text();
            console.log('Check payment raw response:', responseText);

            let checkData;
            try {
                checkData = JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse check payment response:', error);
                console.error('Response was HTML/non-JSON:', responseText.substring(0, 200));

                // If we can't parse the response, assume no booking exists and continue
                console.log('Assuming no existing booking due to parse error, continuing...');
                checkData = { exists: false };
            }
            console.log('Check payment parsed data:', checkData);

            // If booking exists, return success to prevent duplicate
            if (checkResponse.ok && checkData.exists) {
                console.log(`Booking already exists for booking reference ${bookingReference}:`, checkData.booking);
                return NextResponse.json({
                    message: 'Booking already processed',
                    bookingReference: checkData.booking?.reference || bookingReference
                }, { status: 200 });
            }

            // If 404 or parse error, no booking exists, proceed to create
            if (checkResponse.status === 404 || !checkData.exists) {
                console.log(`No booking found for booking reference ${bookingReference}, proceeding to create`);
            } else if (!checkResponse.ok && checkData.error) {
                // Handle unexpected errors from check-payment
                console.error('Unexpected error checking payment:', checkData);
                return NextResponse.json({ error: `Unexpected error checking payment: ${checkData.error?.message || 'Unknown error'}` }, { status: 500 });
            }

            const bookingData: BookingInput = {
                tripId: metadata.tripId,
                email: metadata.customer.email,
                phone: metadata.customer.phone,
                passengers: metadata.passengers.map((p: { name: string; seat: string; age: string | number; gender: 'male' | 'female' }) => ({
                    name: p.name,
                    seat: p.seat,
                    age: Number(p.age),
                    gender: p.gender,
                })),
                paymentReference: paystackReference, // This is the Paystack transaction reference
                reference: bookingReference, // This is our booking reference (what user sees and uses to navigate)
            };

            const apiUrl = `${baseUrl}/api/bookings`;
            console.log('Making request to bookings API:', apiUrl);
            console.log('Booking data:', JSON.stringify(bookingData, null, 2));

            const bookingRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Paystack-Webhook/1.0' },
                body: JSON.stringify(bookingData),
            });

            console.log('Booking API response status:', bookingRes.status);
            // const responseText = await bookingRes.text();
            console.log('Booking API response body:', responseText);

            if (!bookingRes.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { message: responseText };
                }
                console.error('Failed to create booking:', { status: bookingRes.status, error: errorData });
                return NextResponse.json({ error: `Failed to create booking: ${errorData.message || responseText}` }, { status: 500 });
            }

            // Parse the booking response to get the actual reference created
            let bookingResponse;
            try {
                bookingResponse = JSON.parse(responseText);
            } catch {
                bookingResponse = { reference: bookingData.reference };
            }

            console.log('Booking created successfully via webhook');
            console.log('Actual booking reference from API:', bookingResponse.reference);

            return NextResponse.json({
                message: 'Webhook processed successfully',
                bookingReference: bookingResponse.reference // Return the actual reference from the booking API
            }, { status: 200 });
        }

        console.log('Event not handled:', event.event);
        return NextResponse.json({ message: 'Event not handled' }, { status: 200 });
    } catch (error) {
        console.error('Webhook processing error:', error);
        const errorMessage = error instanceof Error ? `Webhook error: ${error.message}` : 'Webhook error';
        return NextResponse.json({ error: errorMessage }, { status: error instanceof SyntaxError ? 400 : 500 });
    }
}