import { PrismaClient, PerfilUsuario } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@sigacon.local" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@sigacon.local",
      senhaHash,
      perfil: PerfilUsuario.ADMIN,
      ativo: true,
    },
  });

  console.log("Seed executado com sucesso.");
  console.log("Usuário admin criado/atualizado:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
