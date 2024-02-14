import assert from 'node:assert/strict';
import { describe, before, it } from 'node:test';
import * as cheerio from 'cheerio';
import { loadFixture } from './test-utils.js';

describe('Slots: Vue', () => {
	let fixture;

	before(async () => {
		fixture = await loadFixture({ root: './fixtures/slots-vue/' });
		await fixture.build();
	});

	it('Renders default slot', async () => {
		const html = await fixture.readFile('/index.html');
		const $ = cheerio.load(html);

		assert.strictEqual($('#default-self-closing').text().trim(), 'Fallback');
		assert.strictEqual($('#default-empty').text().trim(), 'Fallback');
		assert.strictEqual($('#zero').text().trim(), '0');
		assert.strictEqual($('#false').text().trim(), '');
		assert.strictEqual($('#string').text().trim(), '');
		assert.strictEqual($('#content').text().trim(), 'Hello world!');
	});

	it('Renders named slot', async () => {
		const html = await fixture.readFile('/index.html');
		const $ = cheerio.load(html);
		assert.strictEqual($('#named').text().trim(), 'Fallback / Named');
	});

	it('Preserves dash-case slot', async () => {
		const html = await fixture.readFile('/index.html');
		const $ = cheerio.load(html);
		assert.strictEqual($('#dash-case').text().trim(), 'Fallback / Dash Case');
	});

	describe('For MDX Pages', () => {
		it('Renders default slot', async () => {
			const html = await fixture.readFile('/mdx/index.html');
			const $ = cheerio.load(html);
			assert.strictEqual($('#content').text().trim(), 'Hello world!');
		});

		it('Renders named slot', async () => {
			const html = await fixture.readFile('/mdx/index.html');
			const $ = cheerio.load(html);
			assert.strictEqual($('#named').text().trim(), 'Fallback / Named');
		});

		it('Converts dash-case slot to camelCase', async () => {
			const html = await fixture.readFile('/mdx/index.html');
			const $ = cheerio.load(html);
			assert.strictEqual($('#dash-case').text().trim(), 'Fallback / Dash Case');
		});
	});
});
