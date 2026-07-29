const demoAccess = {
  email: "demo@raizesesaberes.com.br",
  password: "Raizes2026",
  curatorEmail: "curadoria@raizesesaberes.com.br",
  curatorPassword: "Curadoria2026",
  key: "raizes:demo-authenticated",
  curatorKey: "raizes:demo-curator",
};

const supabaseSessionKey = "raizes:supabase-auth-session";

const getNextPage = () => {
  const requestedPage = new URLSearchParams(window.location.search).get("next");
  if (!requestedPage) {
    return "plataforma.html";
  }

  try {
    const decodedPage = decodeURIComponent(requestedPage);
    return decodedPage.startsWith("http") ? "plataforma.html" : decodedPage;
  } catch (error) {
    return "plataforma.html";
  }
};

const nextPage = getNextPage();
const needsCuratorAccess = nextPage.startsWith("curadoria.html");

if (
  localStorage.getItem(demoAccess.key) === "true" &&
  (!needsCuratorAccess || localStorage.getItem(demoAccess.curatorKey) === "true")
) {
  window.location.replace(getNextPage());
}

const form = document.querySelector("[data-login-form]");
const errorMessage = document.querySelector("[data-login-error]");

const saveSupabaseSession = (authData) => {
  if (!authData?.access_token) {
    return;
  }
  localStorage.setItem(
    supabaseSessionKey,
    JSON.stringify({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || "",
      expires_at: authData.expires_at || Math.floor(Date.now() / 1000) + Number(authData.expires_in || 3600),
      token_type: authData.token_type || "bearer",
      user: authData.user || null,
    })
  );
  localStorage.setItem("raizes:supabase-access-token", authData.access_token);
};

const authenticateWithSupabase = async (email, password) => {
  const config = window.RAIZES_SUPABASE || {};
  const baseUrl = config.url?.replace(/\/$/, "");
  if (!baseUrl || !config.anonKey) {
    return false;
  }
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    return false;
  }
  saveSupabaseSession(await response.json());
  return true;
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const submitButton = form.querySelector("button[type='submit']");

  if (errorMessage) {
    errorMessage.hidden = true;
  }
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";
  }

  try {
    if (await authenticateWithSupabase(email, password)) {
      localStorage.setItem(demoAccess.key, "true");
      window.location.replace(getNextPage());
      return;
    }
  } catch (error) {
    // Mantem o fallback demonstrativo sem expor detalhes sensiveis.
  }

  const isDemo = email === demoAccess.email && password === demoAccess.password;
  const isCurator = email === demoAccess.curatorEmail && password === demoAccess.curatorPassword;
  const isValid = isDemo || isCurator;

  if (!isValid || (needsCuratorAccess && !isCurator)) {
    if (errorMessage) {
      errorMessage.hidden = false;
      errorMessage.textContent = needsCuratorAccess
        ? "Use as credenciais demonstrativas de curadoria para acessar esta area."
        : "Credenciais invalidas para este ambiente.";
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Acessar Plataforma";
    }
    return;
  }

  localStorage.setItem(demoAccess.key, "true");
  if (isCurator) {
    localStorage.setItem(demoAccess.curatorKey, "true");
  }
  window.location.replace(getNextPage());
});
