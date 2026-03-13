const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/notify/pickup
 *
 * Sends a push notification to ALL residents in a given zone
 * informing them of their pickup ETA window for today.
 *
 * Called by the CMC admin/scheduler, NOT the Flutter resident app.
 *
 * ⚠️  PREREQUISITE: Add fcm_token column to resident_profiles:
 *     ALTER TABLE resident_profiles ADD COLUMN fcm_token text;
 *
 * The Flutter app should save the FCM token to this column after login:
 *     await supabase.from('resident_profiles')
 *         .update({'fcm_token': token})
 *         .eq('user_id', userId);
 *
 * Body:
 * {
 *   zoneOrWard: "Colombo 7",  ← matches addresses.zone_or_ward
 *   etaStart: "09:00",
 *   etaEnd: "11:00"
 * }
 *
 * Response: { sent: 12, message: "Notifications dispatched." }
 */
router.post('/pickup', authMiddleware, async (req, res) => {
    try {
        const { zoneOrWard, etaStart, etaEnd } = req.body;

        if (!zoneOrWard || !etaStart || !etaEnd) {
            return res.status(400).json({ error: 'zoneOrWard, etaStart, and etaEnd are required.' });
        }

        // 1. Find all resident_ids who have an address in this zone
        const { data: addresses, error: addrError } = await supabase
            .from('addresses')
            .select('resident_id')
            .eq('zone_or_ward', zoneOrWard);

        if (addrError) throw addrError;
        if (!addresses || addresses.length === 0) {
            return res.json({ sent: 0, message: 'No residents found in this zone.' });
        }

        const residentIds = [...new Set(addresses.map((a) => a.resident_id))];

        // 2. Get FCM tokens from resident_profiles for those residents
        //    (requires fcm_token column — see prerequisite above)
        const { data: profiles, error: profileError } = await supabase
            .from('resident_profiles')
            .select('fcm_token')
            .in('user_id', residentIds)
            .not('fcm_token', 'is', null);

        if (profileError) throw profileError;
        if (!profiles || profiles.length === 0) {
            return res.json({ sent: 0, message: 'No residents with FCM tokens found in this zone.' });
        }

        const tokens = profiles.map((p) => p.fcm_token);

        // 3. Send FCM push notification to each token
        const fcmPayload = {
            registration_ids: tokens,
            notification: {
                title: '🗑️ Pickup Today!',
                body: `Your garbage will be collected between ${etaStart} – ${etaEnd}. Please place your bins out.`,
                sound: 'default',
            },
            data: {
                type: 'PICKUP_ETA',
                etaStart,
                etaEnd,
                zoneOrWard,
            },
        };

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                Authorization: `key=${process.env.FCM_SERVER_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
        });

        if (!fcmResponse.ok) {
            const errText = await fcmResponse.text();
            throw new Error(`FCM error: ${errText}`);
        }

        return res.json({
            sent: tokens.length,
            message: `Notifications dispatched to ${tokens.length} resident(s) in ${zoneOrWard}.`,
        });
    } catch (err) {
        console.error('[POST /notify/pickup]', err.message);
        return res.status(500).json({ error: 'Failed to send pickup notifications.' });
    }
});

module.exports = router;
