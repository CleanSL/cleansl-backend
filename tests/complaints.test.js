const request = require('supertest');
const app = require('../src/index');

// ── Mock the Supabase client so tests never hit the real DB ──────────────────
jest.mock('../src/config/supabaseClient', () => ({
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
}));

const supabase = require('../src/config/supabaseClient');

// Helper: set up auth middleware to pass for a given userId
function mockAuth(userId = 'test-user-id') {
    supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, email: 'test@cleansl.lk' } },
        error: null,
    });
}

// ── Complaint Triage Tests ────────────────────────────────────────────────────
describe('POST /api/complaints — Triage Logic', () => {
    beforeEach(() => {
        mockAuth();
        // Mock the Supabase .from().insert().select().single() chain
        supabase.from.mockReturnValue({
            insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'complaint-uuid-123' },
                        error: null,
                    }),
                }),
            }),
        });
    });

    test('ai_sorted_percentage >= 70 should produce priority: high', async () => {
        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', 'Bearer fake-token')
            .send({
                photoUrl: 'https://example.com/photo.jpg',
                gpsLat: 6.9271,
                gpsLng: 79.8612,
                aiSortedPercentage: 88,
            });

        expect(res.status).toBe(201);
        expect(res.body.priority).toBe('high');
    });

    test('ai_sorted_percentage between 40-69 should produce priority: medium', async () => {
        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', 'Bearer fake-token')
            .send({
                photoUrl: 'https://example.com/photo.jpg',
                gpsLat: 6.9271,
                gpsLng: 79.8612,
                aiSortedPercentage: 55,
            });

        expect(res.status).toBe(201);
        expect(res.body.priority).toBe('medium');
    });

    test('ai_sorted_percentage < 40 should produce priority: low', async () => {
        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', 'Bearer fake-token')
            .send({
                photoUrl: 'https://example.com/photo.jpg',
                gpsLat: 6.9271,
                gpsLng: 79.8612,
                aiSortedPercentage: 20,
            });

        expect(res.status).toBe(201);
        expect(res.body.priority).toBe('low');
    });

    test('missing fields should return 400', async () => {
        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', 'Bearer fake-token')
            .send({ gpsLat: 6.9271 }); // missing photoUrl, gpsLng, aiSortedPercentage

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});

// ── Auth Middleware Tests ─────────────────────────────────────────────────────
describe('Auth Middleware', () => {
    test('request without Authorization header returns 401', async () => {
        const res = await request(app).get('/api/schedule/some-user-id');
        expect(res.status).toBe(401);
    });

    test('request with invalid token returns 401', async () => {
        supabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
        });
        const res = await request(app)
            .get('/api/schedule/some-user-id')
            .set('Authorization', 'Bearer bad-token');
        expect(res.status).toBe(401);
    });
});

// ── Health Check ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
    test('returns 200 with status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
