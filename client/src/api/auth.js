// src/api/auth.js
const API_URL = import.meta.env.VITE_API_URL || "/api";

console.log('🔌 API URL:', API_URL);

// Вход в систему
export async function login(email, password) {
  try {
    console.log('📤 Отправка запроса на:', `${API_URL}/auth/login`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('📥 Статус ответа:', response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка входа');
    }

    return data;
  } catch (error) {
    console.error('❌ Login error:', error);
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 5000');
    }
    
    throw error;
  }
}

// Регистрация
export async function register(userData) {
  try {
    console.log('📤 Sending registration data:', userData);
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name || '',
        last_name: userData.last_name || ''
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Ошибка соединения с сервером');
  }
}

// Проверка токена
export async function verifyToken(token) {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Недействительный токен');
    }

    return data.user;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error(error.message || 'Ошибка проверки токена');
  }
}

// Сброс пароля - только email и новый пароль
export async function resetPassword(email, newPassword) {
  try {
    console.log('📤 Сброс пароля для:', email);
    
    const response = await fetch(`${API_URL}/auth/simple-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });
    
    const data = await response.json();
    console.log('📥 Ответ сервера:', data);
    
    return {
      success: response.ok,
      message: data.message,
      error: response.ok ? null : (data.error || 'Ошибка сброса пароля')
    };
  } catch (error) {
    console.error('❌ resetPassword error:', error);
    return { 
      success: false, 
      error: error.message === 'Failed to fetch' 
        ? 'Не удалось подключиться к серверу.'
        : error.message 
    };
  }
}