import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const x = await prisma.user.delete({
        where: {
            email: "disicheri@gmail.com"
        }
    })
    return x
}

main()
    .then(async (data) => {
        console.log(data);
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });