import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const users = [
        {
            id: "1",
            firstName: "Admin",
            lastName: "User",
            email: "admin@kadzai.com",
            password: "admin",
            phone: "+2348012345678",
            createdAt: new Date("2024-01-01T10:00:00Z"),
            isActive: true,
        },
        {
            id: "2",
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
            password: "admin",
            phone: "+2348098765432",
            createdAt: new Date("2024-02-15T12:30:00Z"),
            isActive: true,
        },
    ];

    const busTypes = [
        { id: "1", name: "48 Seater", seats: 48 },
        { id: "2", name: "32 Seater", seats: 32 },
    ];

    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                ...user,
                password: hashedPassword,
            },
        });
    }


    for (const busType of busTypes) {
        await prisma.busType.upsert({
            where: { name: busType.name },
            update: {},
            create: busType,
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });