// ── Integration Layer event publisher tests ──
import { EventTopics } from '../src/events/topics';

const mockFetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
global.fetch = mockFetch as unknown as typeof fetch;

describe('integrationLayerPublisher', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    process.env.INTEGRATION_LAYER_URL = 'http://localhost:3010';
  });

  it('POST /events/publish with sales-core source', async () => {
    const { publishIntegrationEvent } = await import('../src/events/integrationLayerPublisher');

    await publishIntegrationEvent(EventTopics.VISIT_COMPLETED, {
      unitId: 'u1',
      outcome: 'sold',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3010/events/publish',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"topic":"visit.completed"'),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.source).toBe('sales-core');
  });
});
