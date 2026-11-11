/**
 * Edge Function: nexiatask-proxy
 *
 * Proxy autenticado a la API externa NexiaTask
 * (https://nexiatask-api.onrender.com/api/integration/*).
 *
 * Razón de existir: la API key de NexiaTask no puede vivir en el bundle
 * del cliente. Esta función valida el JWT del usuario (sesión Supabase),
 * inyecta la API key desde Deno.env y proxea el GET solicitado.
 *
 * Body esperado:
 *   { endpoint: "avance" | "tareas" | "kpis" | "historial", params?: Record<string,string> }
 *
 * Secret requerido:
 *   NEXIATASK_API_KEY  (ver: supabase secrets set NEXIATASK_API_KEY=...)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const NEXIATASK_BASE = "https://nexiatask-api.onrender.com/api/integration";

// /seguimiento fue reemplazado por /avance en la API de NexiaTask
// (campos extra: responsabilidad, seguimiento, bloqueo, apoyo_requerido).
// /historial (2026-06) devuelve el histórico de avances por tarea; admite
// el param opcional `tarea_id` para filtrar una sola tarea.
const ALLOWED_ENDPOINTS = new Set(["avance", "tareas", "kpis", "historial"]);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(
  body: BodyInit | null,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: { ...corsHeaders, ...(init.headers ?? {}) },
  });
}

function respondJson(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ProxyRequest {
  endpoint?: string;
  params?: Record<string, string | number | boolean>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respond("ok");
  if (req.method !== "POST") {
    return respond("Method not allowed", { status: 405 });
  }

  try {
    // 1. Validar JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond("Missing auth", { status: 401 });
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
      error: uErr,
    } = await supabase.auth.getUser(token);
    if (uErr || !user) return respond("Invalid JWT", { status: 401 });

    // 2. Parsear y validar body
    const body = (await req.json().catch(() => ({}))) as ProxyRequest;
    const endpoint = body.endpoint ?? "";
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return respondJson(
        {
          error: "Invalid endpoint",
          allowed: [...ALLOWED_ENDPOINTS],
          received: endpoint,
        },
        { status: 400 },
      );
    }

    // 3. Construir URL con query params
    const url = new URL(`${NEXIATASK_BASE}/${endpoint}`);
    if (body.params) {
      for (const [k, v] of Object.entries(body.params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    // 4. Llamar a NexiaTask con la API key
    const apiKey = Deno.env.get("NEXIATASK_API_KEY");
    if (!apiKey) {
      console.error("NEXIATASK_API_KEY secret not set");
      return respondJson(
        { error: "Proxy misconfigured: missing API key" },
        { status: 500 },
      );
    }

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(
        `[nexiatask-proxy] upstream ${endpoint} ${upstream.status}: ${text.slice(0, 200)}`,
      );
      return respondJson(
        { error: "Upstream error", status: upstream.status, body: text },
        { status: 502 },
      );
    }

    // 5. Forward raw JSON
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[nexiatask-proxy] internal error", err);
    return respond("Internal error", { status: 500 });
  }
});
