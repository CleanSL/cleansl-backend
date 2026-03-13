const supabase = require('../config/supabaseClient');

/**
 * Middleware that verifies the Supabase JWT sent in the Authorization header.
 * 
 * The Flutter app automatically attaches the session token:
 *   headers: { 'Authorization': 'Bearer <supabase_access_token>' }
 * 
 * On success, attaches `req.user` (the Supabase user object) to the request.
 */
async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        req.user = data.user; // e.g. req.user.id, req.user.email
        next();
    } catch (err) {
        console.error('[authMiddleware]', err.message);
        return res.status(500).json({ error: 'Token verification failed.' });
    }
}

module.exports = authMiddleware;
