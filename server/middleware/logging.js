// server/middleware/logging.js

// Безопасное логирование запросов (маскируем пароли)
const safeLogging = (req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.url}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        
        const sensitiveFields = [
            'password', 'newPassword', 'currentPassword',
            'new_password', 'current_password', 'oldPassword',
            'confirmPassword'
        ];
        
        sensitiveFields.forEach(field => {
            if (safeBody[field]) {
                safeBody[field] = '***';
            }
        });
        
        console.log('📦 Body:', safeBody);
    }
    
    next();
};

module.exports = safeLogging;