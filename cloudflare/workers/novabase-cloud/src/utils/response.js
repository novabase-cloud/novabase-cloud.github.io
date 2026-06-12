import { corsHeaders } from "./cors.js";

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders()
    },
  });
}
