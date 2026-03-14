import { PrismaClient, PerfilUsuario } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@sigacon.local";
const ADMIN_SENHA = "admin123";

async function main() {
  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { senhaHash, ativo: true },
    create: {
      nome: "Administrador",
      email: ADMIN_EMAIL,
      senhaHash,
      perfil: PerfilUsuario.ADMIN,
      ativo: true,
    },
  });

  console.log("Seed executado com sucesso.");
  console.log("Usuário admin:", admin.email, "| Use a senha:", ADMIN_SENHA);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
