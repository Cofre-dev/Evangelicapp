"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CambiarPasswordForm } from "@/components/perfil/cambiar-password-form";
import { EditarDatosForm } from "@/components/perfil/editar-datos-form";
import { FotoPerfilUploader } from "@/components/perfil/foto-perfil-uploader";
import { PreferenciasNotificaciones } from "@/components/perfil/preferencias-notificaciones";
import { tieneAccesoRed } from "@/components/red/permisos";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function PerfilPage() {
  const { usuario, ready } = useRequireAuth();

  if (!ready || !usuario) {
    return null;
  }

  return (
    <main className="h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mi perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{usuario.username}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Foto de perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <FotoPerfilUploader />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos personales</CardTitle>
            <CardDescription>El usuario, correo y rol no se pueden cambiar desde aquí.</CardDescription>
          </CardHeader>
          <CardContent>
            <EditarDatosForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <CambiarPasswordForm />
          </CardContent>
        </Card>

        {tieneAccesoRed(usuario) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notificaciones de la red</CardTitle>
              <CardDescription>Siempre las verás en la campana de arriba.</CardDescription>
            </CardHeader>
            <CardContent>
              <PreferenciasNotificaciones />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
