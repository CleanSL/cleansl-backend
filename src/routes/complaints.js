const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/complaints
 *
 * Receives a missed-collection complaint from a resident.
 * Applies triage logic to auto-set priority_level based on ai_sorted_percentage.
 *
 * NOTE: Marked as non-urgent — photo upload + TFLite integration
 * will be implemented later. The route skeleton is here for when you're ready.
 *
 * Body (JSON):
 * {
 *   photoUrl: string,          ← Supabase Storage URL (Flutter uploads directly)
 *   addressId: string,         ← UUID from resident's row in the addresses table
 *   aiSortedPercentage: number ← 0–100, computed by TFLite on-device
 *   complaintText: string      ← Optional free-text from resident
 * }
 *
 * Response:
 * {
 *   complaintId: "uuid",
 *   priorityLevel: "high" | "medium" | "low"
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { photoUrl, addressId, aiSortedPercentage, complaintText } = req.body;
        const residentId = req.user.id;

        if (!photoUrl || !addressId || aiSortedPercentage == null) {
            return res.status(400).json({
                error: 'photoUrl, addressId, and aiSortedPercentage are all required.',
            });
        }

        // ── Triage Logic ─────────────────────────────────────────────────────────
        // Residents who properly sorted their waste deserve a faster response.
        const percentage = Number(aiSortedPercentage);
        let priorityLevel;
        if (percentage >= 70) {
            priorityLevel = 'high';    // → top of CMC dashboard, dispatch backup truck
        } else if (percentage >= 40) {
            priorityLevel = 'medium';  // → standard queue
        } else {
            priorityLevel = 'low';     // → waste not well sorted, lower priority
        }
        // ─────────────────────────────────────────────────────────────────────────

        const { data: complaint, error: insertError } = await supabase
            .from('complaints')
            .insert({
                resident_id: residentId,          // ← matches schema: complaints.resident_id
                address_id: addressId,            // ← matches schema: complaints.address_id
                photo_url: photoUrl,
                ai_sorted_percentage: percentage,
                priority_level: priorityLevel,    // ← matches schema: complaints.priority_level
                complaint_text: complaintText ?? null,
                status: 'pending',                // ← schema default is 'pending'
            })
            .select('id')
            .single();

        if (insertError) throw insertError;

        return res.status(201).json({
            complaintId: complaint.id,
            priorityLevel,
        });
    } catch (err) {
        console.error('[POST /complaints]', err.message);
        return res.status(500).json({ error: 'Failed to submit complaint.' });
    }
});

/**
 * GET /api/complaints
 * Returns all complaints for the logged-in resident (for "Recent Activity" list).
 * Joins addresses to get street_address and zone info.
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .select(`
        id,
        photo_url,
        ai_sorted_percentage,
        priority_level,
        status,
        complaint_text,
        created_at,
        addresses ( street_address, latitude, longitude, zone_or_ward )
      `)
            .eq('resident_id', req.user.id)   // ← matches schema: complaints.resident_id
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json({ complaints: data });
    } catch (err) {
        console.error('[GET /complaints]', err.message);
        return res.status(500).json({ error: 'Failed to fetch complaints.' });
    }
});

module.exports = router;
