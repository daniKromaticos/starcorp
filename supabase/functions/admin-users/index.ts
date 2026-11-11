/**
 * Edge Function: admin-users
 *
 * Gestión de usuarios invitados — SOLO para super_admin (se valida el
 * rol del caller desde su JWT). Usa la service role key para el Admin
 * API de GoTrue; nunca exponer estas operaciones al cliente directo.
 *
 * Body: { action: 'list' }
 *     | { action: 'create', email, firstName, lastName, permissions }
 *     | { action: 'update_permissions', userId, permissions }
 *     | { action: 'delete', userId }
 *
 * create: genera una contraseña temporal (el invitado la usa para su
 * primer login y luego la cambia en su perfil). Si existe el secret
 * RESEND_API_KEY se envía la invitación por correo con la contraseña;
 * si no, emailSent=false y el super admin debe compartirla manualmente.
 *
 * Reglas: no se puede eliminar a un super_admin ni a uno mismo; el rol
 * de los invitados siempre es 'usuario'; update preserva el role.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respondJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tempPassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, n: number) => {
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    return Array.from(buf, (x) => set[x % set.length]).join("");
  };
  return `${pick(upper, 2)}${pick(lower, 4)}-${pick(digits, 4)}`;
}

// deno-lint-ignore no-explicit-any
function toManagedUser(u: any) {
  const meta = u.user_metadata ?? {};
  const firstName = meta.first_name ?? "";
  const lastName = meta.last_name ?? "";
  return {
    id: u.id,
    email: u.email ?? "",
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    avatarUrl: meta.avatar_url ?? null,
    role: u.app_metadata?.role === "super_admin" ? "super_admin" : "usuario",
    permissions: Array.isArray(u.app_metadata?.permissions)
      ? u.app_metadata.permissions
      : [],
    pending: !u.last_sign_in_at,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plantilla con el design system de la app (src/theme/tokens.ts y
 * gradients.ts): fondo #F5F5F7, tarjeta blanca radio 14, header navy
 * #1A2B6D → #0F1B4A, tipografía #1A1F36/#4A5568/#8892A4 y credenciales
 * en azul #1938A5. Tablas + inline styles por compatibilidad de clientes
 * de correo; bgcolor es el fallback del gradiente para Outlook.
 * Misma línea visual que el correo de recovery (docs/auth-otp-setup.md).
 */
function invitationEmailHtml(
  email: string,
  firstName: string,
  password: string,
): string {
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const mono = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";
  const name = escapeHtml(firstName);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F5F7; padding: 32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="max-width: 440px; width: 100%; background-color: #FFFFFF; border: 1px solid #EBEBF0; border-radius: 14px; overflow: hidden;">
        <tr>
          <td align="center" bgcolor="#1A2B6D" style="background: linear-gradient(135deg, #1A2B6D 0%, #0F1B4A 100%); padding: 24px;">
            <span style="font-family: ${font}; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #FFFFFF;">STARCORP</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 32px 40px 32px; font-family: ${font};">
            <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; color: #1A1F36;">Bienvenido${name ? ` ${name}` : ""} a Starcorp</h2>
            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 22px; color: #4A5568;">Se creó una cuenta para ti. Ingresa a la app con estas credenciales:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F7" style="background-color: #F5F5F7; border: 1px solid #EBEBF0; border-radius: 10px;">
              <tr>
                <td style="padding: 18px 20px 6px 20px; font-family: ${font}; font-size: 13px; color: #8892A4;">Usuario</td>
              </tr>
              <tr>
                <td style="padding: 0 20px 14px 20px; font-family: ${font}; font-size: 15px; font-weight: 600; color: #1A1F36;">${escapeHtml(email)}</td>
              </tr>
              <tr>
                <td style="padding: 0 20px 6px 20px; border-top: 1px solid #EBEBF0; padding-top: 14px; font-family: ${font}; font-size: 13px; color: #8892A4;">Contraseña temporal</td>
              </tr>
              <tr>
                <td style="padding: 0 20px 18px 20px; font-family: ${mono}; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #1938A5;">${escapeHtml(password)}</td>
              </tr>
            </table>
            <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #8892A4;">Por seguridad, cambia tu contraseña desde tu perfil después del primer ingreso.</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="max-width: 440px; width: 100%;">
        <tr>
          <td align="center" style="padding: 16px; font-family: ${font}; font-size: 12px; color: #8892A4;">© Starcorp — correo automático, no responder.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Devuelve null si el correo salió, o un string con la razón del fallo
 * (se registra en logs y viaja al cliente como emailError para que el
 * super admin sepa que debe compartir la contraseña manualmente).
 */
async function sendInvitationEmail(
  email: string,
  firstName: string,
  password: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("invite email: falta el secret RESEND_API_KEY");
    return "Falta configurar el secret RESEND_API_KEY.";
  }
  const from = Deno.env.get("INVITE_FROM_EMAIL") ??
    "Starcorp <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Has sido invitado a Starcorp",
        html: invitationEmailHtml(email, firstName, password),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`invite email: Resend ${res.status} — ${detail}`);
      return `Resend ${res.status}: ${detail.slice(0, 300)}`;
    }
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`invite email: ${msg}`);
    return msg;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return respondJson({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respondJson({ error: "Missing auth" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user: caller },
      error: uErr,
    } = await supabase.auth.getUser(token);
    if (uErr || !caller) return respondJson({ error: "Invalid JWT" }, 401);
    if (caller.app_metadata?.role !== "super_admin") {
      return respondJson({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === "list") {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) return respondJson({ error: error.message }, 500);
      const users = data.users
        .filter((u) => !u.is_anonymous && u.email)
        .map(toManagedUser);
      return respondJson({ users });
    }

    if (action === "create") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const firstName = String(body?.firstName ?? "").trim();
      const lastName = String(body?.lastName ?? "").trim();
      const permissions = Array.isArray(body?.permissions)
        ? body.permissions.filter((p: unknown) => typeof p === "string")
        : [];
      if (!/\S+@\S+\.\S+/.test(email)) {
        return respondJson({ error: "Email inválido" }, 400);
      }

      const password = tempPassword();
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "usuario", permissions },
        user_metadata: { first_name: firstName, last_name: lastName },
      });
      if (error) {
        const exists = error.code === "email_exists";
        return respondJson(
          { error: exists ? "Ya existe un usuario con ese correo." : error.message },
          exists ? 409 : 500,
        );
      }

      const emailError = await sendInvitationEmail(email, firstName, password);

      return respondJson({
        userId: data.user.id,
        tempPassword: password,
        emailSent: emailError === null,
        emailError,
      });
    }

    if (action === "update_permissions") {
      const userId = String(body?.userId ?? "");
      const permissions = Array.isArray(body?.permissions)
        ? body.permissions.filter((p: unknown) => typeof p === "string")
        : [];
      if (!userId) return respondJson({ error: "userId requerido" }, 400);

      const { data: target, error: gErr } = await supabase.auth.admin
        .getUserById(userId);
      if (gErr || !target?.user) {
        return respondJson({ error: "Usuario no encontrado" }, 404);
      }
      if (target.user.app_metadata?.role === "super_admin") {
        return respondJson(
          { error: "No se pueden editar los permisos de un super admin." },
          400,
        );
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { ...target.user.app_metadata, permissions },
      });
      if (error) return respondJson({ error: error.message }, 500);
      return respondJson({ ok: true });
    }

    if (action === "delete") {
      const userId = String(body?.userId ?? "");
      if (!userId) return respondJson({ error: "userId requerido" }, 400);
      if (userId === caller.id) {
        return respondJson({ error: "No puedes eliminarte a ti mismo." }, 400);
      }
      const { data: target, error: gErr } = await supabase.auth.admin
        .getUserById(userId);
      if (gErr || !target?.user) {
        return respondJson({ error: "Usuario no encontrado" }, 404);
      }
      if (target.user.app_metadata?.role === "super_admin") {
        return respondJson({ error: "No se puede eliminar a un super admin." }, 400);
      }
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) return respondJson({ error: error.message }, 500);
      return respondJson({ ok: true });
    }

    return respondJson({ error: "Acción no soportada" }, 400);
  } catch (e) {
    return respondJson({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
