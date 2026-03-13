const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * GET /api/schedule/:userId
 *
 * Returns the next scheduled pickup window for a resident.
 * Zone info lives in the addresses table (zone_or_ward column).
 *
 * NOTE: Your schema doesn't have a pickup_schedules table yet.
 * This route is built ready for when you create it:
 *
 *   CREATE TABLE pickup_schedules (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     zone_or_ward text NOT NULL,
 *     pickup_date date NOT NULL,
 *     eta_start time NOT NULL,
 *     eta_end time NOT NULL,
 *     waste_types text[] DEFAULT '{}'
 *   );
 *
 * Used by: Flutter home page "Next Scheduled Pickup" card
 * Auth: Required (resident must be logged in)
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        // Security: a resident can only query their own schedule
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Forbidden: cannot query another user\'s schedule.' });
        }

        // 1. Get the resident's zone from their address record
        //    addresses.zone_or_ward is the zone field in your schema
        const { data: address, error: addressError } = await supabase
            .from('addresses')
            .select('zone_or_ward')
            .eq('resident_id', userId)
            .limit(1)
            .maybeSingle();

        if (addressError) throw addressError;
        if (!address?.zone_or_ward) {
            return res.json({ hasPickup: false, message: 'No address/zone assigned to this resident yet.' });
        }

        // 2. Get today's or next upcoming schedule for that zone
        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

        const { data: schedule, error: scheduleError } = await supabase
            .from('pickup_schedules')
            .select('id, pickup_date, eta_start, eta_end, waste_types')
            .eq('zone_or_ward', address.zone_or_ward)
            .gte('pickup_date', today)
            .order('pickup_date', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (scheduleError) throw scheduleError;

        if (!schedule) {
            return res.json({ hasPickup: false, message: 'No upcoming pickup scheduled for your zone.' });
        }

        return res.json({
            hasPickup: true,
            date: schedule.pickup_date,
            etaStart: schedule.eta_start,
            etaEnd: schedule.eta_end,
            wasteTypes: schedule.waste_types ?? [],
        });
    } catch (err) {
        console.error('[GET /schedule/:userId]', err.message);
        return res.status(500).json({ error: 'Failed to fetch schedule.' });
    }
});

module.exports = router;
