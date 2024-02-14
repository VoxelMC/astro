import assert from 'node:assert/strict';
import { describe, before, it } from 'node:test';
import * as cheerio from 'cheerio';
import { loadFixture } from './test-utils.js';

describe('Slots: React', () => {
	let fixture;

	before(async () => {
		fixture = await loadFixture({ root: './fixtures/slots-react/' });
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

	it('Converts dash-case slot to camelCase', async () => {
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

	describe('Slots.render() API', async () => {
		it('Simple imperative slot render', async () => {
			const html = await fixture.readFile('/slottedapi-render/index.html');
			const $ = cheerio.load(html);

			assert.strictEqual($('#render').length, 1);
			assert.strictEqual($('#render').text(), 'render');
		});

		it('Child function render without args', async () => {
			const html = await fixture.readFile('/slottedapi-render/index.html');
			const $ = cheerio.load(html);

			assert.strictEqual($('#render-fn').length, 1);
			assert.strictEqual($('#render-fn').text(), 'render-fn');
		});

		it('Child function render with args', async () => {
			const html = await fixture.readFile('/slottedapi-render/index.html');
			const $ = cheerio.load(html);

			assert.strictEqual($('#render-args').length, 1);
			assert.strictEqual($('#render-args span').length, 1);
			assert.strictEqual($('#render-args').text(), 'render-args');
		});
	});
});
