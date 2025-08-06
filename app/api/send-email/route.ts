import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
    const { to, booking } = await request.json();

    // Configure email service (example using Gmail)
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL || process.env.NEXT_PUBLIC_EMAIL,
            pass: process.env.EMAIL_PASSWORD || process.env.NEXT_PUBLIC_EMAIL_PASSWORD,
        },
    });

    // Format HTML email with booking details
    const htmlContent = `
    <h1>Your KADZAI TRANSPORT AND LOGISTICS Booking Confirmation: ${booking.reference}</h1>
    <h2>Trip Details</h2>
    <p><strong>Route:</strong> ${booking.from} → ${booking.to}</p>
    <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
    <p><strong>Time:</strong> ${booking.time}</p>
    <h3>Passengers (${booking.passengers.length})</h3>
    <ul>
      ${booking.passengers.map((p: { name: string; seat: string }) => `
  <li>${p.name} - Seat ${p.seat}</li>
`).join('')}
    </ul>
    <p>Total Paid: ₦${booking.totalAmount.toLocaleString()}</p>
    <p>Need help? Contact our support team at kdztransportation@gmail.com</p>
  `;

    try {
        await transporter.sendMail({
            from: `"KADZAI TRANSPORT AND LOGISTICS" <${process.env.NEXT_PUBLIC_EMAIL}>`,
            to,
            subject: `Your Travel Ticket Confirmation: ${booking.reference}`,
            html: htmlContent
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email send error:", error);
        return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
        );
    }
}