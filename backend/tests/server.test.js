const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  it('GET /api/status should return the simulated dashboard status', async () => {
    const res = await request(app).get('/api/status');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('activeHour');
    expect(res.body).toHaveProperty('systems');
    expect(res.body.systems).toHaveProperty('camdrum');
    expect(res.body.systems).toHaveProperty('mechanical');
    expect(res.body.systems).toHaveProperty('ord');
  });

  it('GET /api/all-data should return the full initial dataset', async () => {
    const res = await request(app).get('/api/all-data');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('dataset');
    // Ensure that '01:00' exists in the default data
    expect(res.body.dataset).toHaveProperty('01:00');
  });

  it('POST /api/reset should reset dataset to simulated default', async () => {
    const res = await request(app).post('/api/reset');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.message).toContain('Dashboard reset to default');
    expect(res.body).toHaveProperty('activeHour', '01:00');
  });

  it('POST /api/playback should allow playback controls to change state', async () => {
    const payload = { playing: true, speed: 'realtime' };
    const res = await request(app).post('/api/playback').send(payload);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('playbackState');
    expect(res.body.playbackState).toHaveProperty('playing', true);
    expect(res.body.playbackState).toHaveProperty('speed', 'realtime');
  });
});
