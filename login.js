const demoAccess = {
  email: "demo@raizesesaberes.com.br",
  password: "Raizes2026",
  curatorEmail: "curadoria@raizesesaberes.com.br",
  curatorPassword: "Curadoria2026",
  key: "raizes:demo-authenticated",
  curatorKey: "raizes:demo-curator",
};

const supabaseSessionKey = "raizes:supabase-auth-session";
const loginParams = new URLSearchParams(window.location.search);
const requiresSupabaseAuth = loginParams.get("auth") === "supabase";

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return {};
    return JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
  } catch (error) {
    return {};
  }
};

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

const getStoredSupabaseContext = () => {
  try {
    const session = JSON.parse(localStorage.getItem(supabaseSessionKey) || "null");
    const payload = decodeJwtPayload(session?.access_token);
    const appMetadata = payload.app_metadata || {};
    return {
      userId: payload.sub || session?.user?.id || null,
      role:
        appMetadata.question_bank_role ||
        appMetadata.app_role ||
        appMetadata.role ||
        payload.question_bank_role ||
        payload.app_role ||
        null,
      expiresAt: payload.exp || session?.expires_at || 0,
    };
  } catch (error) {
    return { userId: null, role: null, expiresAt: 0 };
  }
};

if (requiresSupabaseAuth) {
  const context = getStoredSupabaseContext();
  if (context.userId && context.role && Number(context.expiresAt || 0) > Math.floor(Date.now() / 1000) + 60) {
    window.location.replace(getNextPage());
  }
}

if (
  !requiresSupabaseAuth &&
  localStorage.getItem(demoAccess.key) === "true" &&
  (!needsCuratorAccess || localStorage.getItem(demoAccess.curatorKey) === "true")
) {
  window.location.replace(getNextPage());
}

const form = document.querySelector("[data-login-form]");
const errorMessage = document.querySelector("[data-login-error]");

if (requiresSupabaseAuth) {
  const copy = document.querySelector(".login-copy span");
  if (copy) {
    copy.textContent = "Entre com o usuario Supabase Auth do professor para salvar e liberar a pre-visualizacao oficial.";
  }
}

const saveSupabaseSession = (authData) => {
  if (!authData?.access_token) {
    return null;
  }
  const payload = decodeJwtPayload(authData.access_token);
  const appMetadata = payload.app_metadata || {};
  const questionBankRole =
    appMetadata.question_bank_role ||
    appMetadata.app_role ||
    appMetadata.role ||
    payload.question_bank_role ||
    payload.app_role ||
    null;
  localStorage.setItem(
    supabaseSessionKey,
    JSON.stringify({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token || "",
      expires_at: authData.expires_at || Math.floor(Date.now() / 1000) + Number(authData.expires_in || 3600),
      token_type: authData.token_type || "bearer",
      user: authData.user || null,
      question_bank_role: questionBankRole,
    })
  );
  localStorage.setItem("raizes:supabase-access-token", authData.access_token);
  return { userId: payload.sub || authData.user?.id || null, questionBankRole };
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
  const context = saveSupabaseSession(await response.json());
  return Boolean(context?.userId && context?.questionBankRole);
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

  if (requiresSupabaseAuth) {
    if (errorMessage) {
      errorMessage.hidden = false;
      errorMessage.textContent = "Entre com um usuario Supabase Auth valido e com perfil question_bank_role para salvar a avaliacao.";
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Acessar Plataforma";
    }
    return;
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
