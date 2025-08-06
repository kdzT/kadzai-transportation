import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
    try {
        const { name, email, phone, message } = await request.json();

        // Basic validation
        if (!name || !phone || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL || process.env.NEXT_PUBLIC_EMAIL,
                pass: process.env.EMAIL_PASSWORD || process.env.NEXT_PUBLIC_EMAIL_PASSWORD,
            },
        });

        // Email content for the site owner
        const mailOptions = {
            from: `"${name}" <${email}>`, // Show the sender's name and email
            to: process.env.EMAIL || process.env.NEXT_PUBLIC_EMAIL, // Send to your own email
            subject: `New Contact Form Message from ${name}`,
            html: `
        <h1>New Message from KADZAI TRANSPORT AND LOGISTICS Contact Form</h1>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <hr />
        <h2>Message:</h2>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}