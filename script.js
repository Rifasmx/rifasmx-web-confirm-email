// ===== CONFIG =====
const SUPABASE_URL = 'https://ncggoklzrhetahayazct.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvOFNe6Zmo_bMu6oC6Z1bQ_3Hzls07d';
const APP_DEEP_LINK = 'rifasmx://login';
// ===== UI HELPERS =====
function showState(stateId) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  document.getElementById(stateId).classList.remove('hidden');
}

function showError(message) {
  document.getElementById('error-message').textContent = message;
  showState('error-state');
}

// ===== PARSE URL =====
// Supabase puede mandar params en query (?code=X) o en hash (#access_token=X)
function parseParams() {
  const params = {};
  
  // Query string
  const queryParams = new URLSearchParams(window.location.search);
  for (const [key, value] of queryParams) {
    params[key] = value;
  }
  
  // Hash (después del #)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    for (const [key, value] of hashParams) {
      params[key] = value;
    }
  }
  
  return params;
}

// ===== MAIN =====
async function init() {
  const params = parseParams();
  
  console.log('Params recibidos:', params);
  
// Caso 1: Error explícito de Supabase
  if (params.error || params.error_description) {
    const errMsg = (params.error_description || params.error || '').toLowerCase();
    let userMsg;
    
    if (errMsg.includes('expired') || errMsg.includes('invalid')) {
      userMsg = 'Este enlace ya fue usado o expiró. Si tu correo ya está confirmado, abre la app e inicia sesión.';
    } else if (errMsg.includes('not found')) {
      userMsg = 'No encontramos esta solicitud. Por favor solicita un nuevo enlace desde la app.';
    } else if (errMsg.includes('rate limit')) {
      userMsg = 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.';
    } else {
      userMsg = 'Algo salió mal. Por favor solicita un nuevo enlace desde la app.';
    }
    
    showError(userMsg);
    return;
  }
  
  // Caso 2: Tipo recovery (cambio de contraseña)
  if (params.type === 'recovery') {
    setupRecoveryForm(params);
    return;
  }
  
  // Caso 3: Tipo signup (confirmación de email)
  // Supabase manda type=signup o type=email_change
  if (params.type === 'signup' || params.type === 'email_change' || params.type === 'email') {
    showState('signup-success');
    
    // Intento automático de abrir la app (opcional)
    setTimeout(() => {
      // Solo intenta deep link si el usuario está en móvil
      if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        window.location.href = APP_DEEP_LINK;
      }
    }, 1500);
    
    return;
  }
  
  // Caso 4: Tiene token de acceso (link de confirmación viejo formato)
  if (params.access_token || params.code) {
    showState('signup-success');
    return;
  }
  
  // Caso 5: No vino ningún parámetro útil
  showError('Este enlace no tiene la información necesaria. Por favor solicita uno nuevo desde la app.');
}

// ===== RECOVERY FLOW =====
function setupRecoveryForm(params) {
  showState('recovery-form');
  
  const submitBtn = document.getElementById('submit-recovery');
  const passwordInput = document.getElementById('new-password');
  const confirmInput = document.getElementById('confirm-password');
  const errorBox = document.getElementById('recovery-error');
  
  submitBtn.addEventListener('click', async () => {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    // Validaciones
    errorBox.classList.add('hidden');
    
    if (password.length < 6) {
      errorBox.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorBox.classList.remove('hidden');
      return;
    }
    
    if (password !== confirm) {
      errorBox.textContent = 'Las contraseñas no coinciden.';
      errorBox.classList.remove('hidden');
      return;
    }
    
    // Cambiar el botón a "Cambiando..."
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cambiando...';
    
    try {
      const accessToken = params.access_token;
      
      if (!accessToken) {
        throw new Error('No se encontró el token de acceso en el enlace.');
      }
      
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.msg || data.message || 'Error al cambiar la contraseña.');
      }
      
      // Éxito
      showState('recovery-success');
      
    } catch (err) {
      errorBox.textContent = err.message || 'Ocurrió un error. Intenta de nuevo.';
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cambiar contraseña';
    }
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);
